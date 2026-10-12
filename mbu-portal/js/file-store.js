/* =====================================================================
   file-store.js  -  IndexedDB blob store for user-uploaded materials
   (PDF / PPT / PPTX / images / anything).

   ADDITIVE: the existing localStorage architecture (mbu-portal-data-v1)
   keeps holding the small metadata records; only the actual file bytes
   live in IndexedDB, because localStorage is limited to ~5 MB and a
   single PPT can exceed that.  A stored material points at its blob
   with a "mbu-blob:<id>" URL; this module resolves those URLs back to
   object URLs at render time.

   Loaded after fileviewer.js so it can also wrap openFileViewer() and
   transparently resolve blob URLs for the shared file viewer.
   ===================================================================== */
window.MBUFiles = (function () {
  "use strict";

  const DB_NAME = "mbu-portal-files";
  const STORE = "uploads";
  const PREFIX = "mbu-blob:";
  let dbPromise = null;
  const urlCache = {}; /* id -> objectURL for this session */

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      try {
        if (!window.indexedDB) throw new Error("IndexedDB unavailable");
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error("IndexedDB open failed"));
      } catch (e) {
        reject(e);
      }
    });
    return dbPromise;
  }

  function tx(mode, work) {
    return openDB().then((db) => new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const store = transaction.objectStore(STORE);
      let request;
      try { request = work(store); } catch (e) { reject(e); return; }
      transaction.oncomplete = () => resolve(request ? request.result : undefined);
      transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed"));
      transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction aborted"));
    }));
  }

  /* Store a File/Blob; returns the metadata record with its id/url. */
  function put(file) {
    const id = "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const record = {
      blob: file,
      name: file.name || "file",
      type: file.type || "",
      size: file.size || 0,
      at: Date.now()
    };
    return tx("readwrite", (store) => store.put(record, id)).then(() => ({
      id: id,
      url: PREFIX + id,
      name: record.name,
      size: record.size
    }));
  }

  function get(id) {
    return tx("readonly", (store) => store.get(id));
  }

  function remove(id) {
    return tx("readwrite", (store) => store.delete(id)).catch(() => {});
  }

  function isBlobUrl(url) {
    return typeof url === "string" && url.indexOf(PREFIX) === 0;
  }

  /* "mbu-blob:<id>" -> object URL (cached).  Other URLs pass through. */
  function resolve(url) {
    if (!isBlobUrl(url)) return Promise.resolve(url);
    const id = url.slice(PREFIX.length);
    if (urlCache[id]) return Promise.resolve(urlCache[id]);
    return get(id).then((record) => {
      if (!record || !record.blob) throw new Error("uploaded file not found");
      urlCache[id] = URL.createObjectURL(record.blob);
      return urlCache[id];
    });
  }

  /* Replace every mbu-blob: src/href under root with a real object URL.
     Runs after every page render (async, idempotent). */
  function hydrate(root) {
    const scope = root || document;
    const nodes = scope.querySelectorAll("[src], [href]");
    nodes.forEach((el) => {
      ["src", "href"].forEach((attr) => {
        const value = el.getAttribute(attr);
        if (isBlobUrl(value)) {
          resolve(value).then((real) => {
            if (real !== value) el.setAttribute(attr, real);
          }).catch(() => { /* blob missing - keep the URL */ });
        }
      });
    });
  }

  function humanSize(bytes) {
    if (!bytes && bytes !== 0) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  /* Wrap the shared file viewer so mbu-blob: files open transparently. */
  (function wrapFileViewer() {
    const original = window.openFileViewer;
    if (typeof original !== "function") return;
    window.openFileViewer = function (file) {
      if (file && isBlobUrl(file.url)) {
        resolve(file.url)
          .then((real) => original(Object.assign({}, file, { url: real })))
          .catch(() => window.showToast && window.showToast("That upload is no longer stored in this browser."));
        return;
      }
      return original(file);
    };
  })();

  return {
    put,
    get,
    remove,
    resolve,
    hydrate,
    isBlobUrl,
    humanSize,
    PREFIX
  };
})();
