/* =====================================================================
   pdf-book.js  -  Second viewing mode for PDFs: "Book / Flip View".

   ADDITIVE: the existing scroll view (inline <iframe>) is untouched and
   stays the default ("Normal View").  This module only adds:
     - a [ Normal View | Book View ] toggle to the shared file viewer
       modal (for PDFs) and to the module Study Material panel
     - a full-screen book overlay rendered with pdf.js (CDN) with
       previous / next page controls, click-to-turn, arrow keys,
       zoom, and a page-flip animation
   Switching back to Normal View keeps the reader's page number, and
   because the original iframe is never unmounted the browser keeps its
   scroll position too.

   Dependencies added (CDN, loaded on demand only when Book View is
   used): pdf.js 3.11.174 (pdf.min.js + pdf.worker.min.js).
   ===================================================================== */
window.MBUPdfBook = (function () {
  "use strict";

  const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  let pdfjsPromise = null;
  let doc = null;              /* current PDFDocumentProxy */
  let currentPage = 1;
  let pageCount = 0;
  let scale = 1.25;
  let lastUrl = null;
  const pageMemory = {};       /* url -> last page (position kept between views) */
  let overlay = null;
  let rendering = false;
  let pendingPage = null;

  /* ------------------------------------------------------------------ */
  function loadPdfjs() {
    if (pdfjsPromise) return pdfjsPromise;
    pdfjsPromise = new Promise((resolve, reject) => {
      if (window.pdfjsLib) { resolve(window.pdfjsLib); return; }
      const script = document.createElement("script");
      script.src = PDFJS_URL;
      script.onload = () => {
        if (!window.pdfjsLib) { reject(new Error("pdf.js loaded but unavailable")); return; }
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        resolve(window.pdfjsLib);
      };
      script.onerror = () => reject(new Error("pdf.js could not be loaded (check the internet connection)"));
      document.head.appendChild(script);
    });
    return pdfjsPromise;
  }

  /* ------------------------------------------------------------------ */
  function buildOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.className = "pdf-book";
    overlay.id = "pdfBookOverlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "PDF book view");
    overlay.innerHTML = `
      <div class="pdf-book-bar">
        <strong class="pb-title" id="pbTitle">Document</strong>
        <span class="pb-ind" id="pbInd">Page 1 / 1</span>
        <div class="pb-tools">
          <button class="btn btn-ghost" type="button" id="pbZoomOut" aria-label="Zoom out">−</button>
          <span class="pb-zoom" id="pbZoom">125%</span>
          <button class="btn btn-ghost" type="button" id="pbZoomIn" aria-label="Zoom in">+</button>
          <button class="btn btn-ghost" type="button" id="pbPrev">← Previous Page</button>
          <button class="btn btn-primary" type="button" id="pbNext">Next Page →</button>
          <button class="btn btn-ghost" type="button" id="pbClose">Normal View</button>
          <button class="icon-btn" type="button" id="pbX" aria-label="Close book view">✕</button>
        </div>
      </div>
      <div class="pdf-book-stage" id="pbStage">
        <button class="pdf-book-nav prev" type="button" id="pbNavPrev" aria-label="Previous page">←</button>
        <div class="pdf-book-page" id="pbPage"><canvas id="pbCanvas"></canvas></div>
        <button class="pdf-book-nav next" type="button" id="pbNavNext" aria-label="Next page">→</button>
        <div class="pdf-book-status" id="pbStatus" hidden>Loading…</div>
      </div>`;
    document.body.appendChild(overlay);

    const $ = (id) => document.getElementById(id);

    $("pbPrev").addEventListener("click", () => turn(currentPage - 1, "prev"));
    $("pbNext").addEventListener("click", () => turn(currentPage + 1, "next"));
    $("pbNavPrev").addEventListener("click", () => turn(currentPage - 1, "prev"));
    $("pbNavNext").addEventListener("click", () => turn(currentPage + 1, "next"));
    $("pbClose").addEventListener("click", close);
    $("pbX").addEventListener("click", close);
    $("pbZoomIn").addEventListener("click", () => setScale(scale + 0.25));
    $("pbZoomOut").addEventListener("click", () => setScale(scale - 0.25));

    /* click the left / right half of the stage to turn pages */
    $("pbStage").addEventListener("click", (ev) => {
      if (ev.target.closest(".pdf-book-nav")) return; /* nav buttons handle themselves */
      if (ev.target.id === "pbStage" || ev.target.id === "pbPage" || ev.target.tagName === "CANVAS") {
        const rect = $("pbStage").getBoundingClientRect();
        if (ev.clientX - rect.left < rect.width / 2) turn(currentPage - 1, "prev");
        else turn(currentPage + 1, "next");
      }
    });

    document.addEventListener("keydown", (ev) => {
      if (!overlay.classList.contains("open")) return;
      if (ev.key === "Escape") { close(); return; }
      if (ev.key === "ArrowRight" || ev.key === "PageDown") turn(currentPage + 1, "next");
      if (ev.key === "ArrowLeft" || ev.key === "PageUp") turn(currentPage - 1, "prev");
    });

    return overlay;
  }

  function status(message) {
    const el = document.getElementById("pbStatus");
    if (!el) return;
    if (!message) { el.hidden = true; return; }
    el.hidden = false;
    el.textContent = message;
  }

  function updateChrome() {
    const ind = document.getElementById("pbInd");
    const zoom = document.getElementById("pbZoom");
    const title = document.getElementById("pbTitle");
    if (ind) ind.textContent = "Page " + currentPage + " / " + (pageCount || "?");
    if (zoom) zoom.textContent = Math.round(scale * 100) + "%";
    const prevDisabled = currentPage <= 1;
    const nextDisabled = currentPage >= pageCount;
    ["pbPrev", "pbNavPrev"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.disabled = prevDisabled;
    });
    ["pbNext", "pbNavNext"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.disabled = nextDisabled;
    });
    return title;
  }

  function renderPage(direction) {
    if (!doc) return;
    if (rendering) { pendingPage = { page: currentPage, direction: direction }; return; }
    rendering = true;
    doc.getPage(currentPage).then((page) => {
      const viewport = page.getViewport({ scale: scale });
      const canvas = document.getElementById("pbCanvas");
      const pageBox = document.getElementById("pbPage");
      if (!canvas || !pageBox) { rendering = false; return; }
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      pageBox.style.width = Math.floor(viewport.width) + "px";
      pageBox.style.height = Math.floor(viewport.height) + "px";
      return page.render({ canvasContext: canvas.getContext("2d"), viewport: viewport }).promise.then(() => {
        pageBox.classList.remove("flip-next", "flip-prev");
        if (direction === "next") pageBox.classList.add("flip-next");
        if (direction === "prev") pageBox.classList.add("flip-prev");
      });
    }).catch((err) => {
      status("Could not render page " + currentPage + ": " + (err && err.message ? err.message : err));
    }).then(() => {
      rendering = false;
      if (pendingPage) {
        const next = pendingPage;
        pendingPage = null;
        if (next.page !== currentPage) turn(next.page, next.direction);
      }
    });
  }

  function turn(page, direction) {
    if (!doc) return;
    const target = Math.min(Math.max(1, page), pageCount || 1);
    if (target === currentPage) return;
    currentPage = target;
    if (lastUrl) pageMemory[lastUrl] = currentPage;
    updateChrome();
    renderPage(direction);
  }

  function setScale(next) {
    scale = Math.min(3, Math.max(0.6, next));
    updateChrome();
    renderPage(null);
  }

  function close() {
    if (!overlay) return;
    if (lastUrl) pageMemory[lastUrl] = currentPage;
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    announce();
  }

  /* let the page know book view closed (used by the toggle UI) */
  function announce() {
    document.dispatchEvent(new CustomEvent("pdfbook:closed"));
  }

  function isOpen() {
    return Boolean(overlay && overlay.classList.contains("open"));
  }

  /* open(url, title) - url may be an mbu-blob: URL (resolved via MBUFiles) */
  function open(url, title) {
    if (!url) return Promise.reject(new Error("No PDF address"));
    buildOverlay();
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    document.getElementById("pbTitle").textContent = title || "Document";
    status("Loading…");

    const realUrl = (window.MBUFiles && window.MBUFiles.isBlobUrl(url))
      ? window.MBUFiles.resolve(url)
      : Promise.resolve(url);

    return realUrl.then((resolved) => {
      lastUrl = url;
      return loadPdfjs().then((pdfjs) => pdfjs.getDocument(resolved).promise);
    }).then((loaded) => {
      doc = loaded;
      pageCount = doc.numPages;
      currentPage = Math.min(Math.max(1, pageMemory[url] || 1), pageCount);
      updateChrome();
      status(null);
      renderPage(null);
      const closeBtn = document.getElementById("pbClose");
      if (closeBtn) closeBtn.focus();
    }).catch((err) => {
      status("Book view unavailable: " + (err && err.message ? err.message : err));
    });
  }

  return { open, close, isOpen };
})();

/* ---------------------------------------------------------------------
   View-mode toggle: [ Normal View | Book View ]

   1) Shared file viewer modal (PDFs opened from Experiment Files)
   2) Module Study Material panel (module.html)
   Both are injected after the existing markup renders; nothing existing
   is replaced, and Normal View remains the default.
   --------------------------------------------------------------------- */
(function () {
  "use strict";

  function segControl(idPrefix) {
    const seg = document.createElement("div");
    seg.className = "adm-seg";
    seg.setAttribute("role", "group");
    seg.setAttribute("aria-label", "PDF viewing mode");
    seg.innerHTML = `
      <button class="btn active" type="button" data-mode="normal">Normal View</button>
      <button class="btn" type="button" data-mode="book">Book View</button>`;
    seg.id = idPrefix + "Seg";
    return seg;
  }

  function wireSeg(seg, getUrl, getName) {
    seg.querySelector('[data-mode="normal"]').addEventListener("click", () => {
      if (window.MBUPdfBook) window.MBUPdfBook.close();
    });
    seg.querySelector('[data-mode="book"]').addEventListener("click", () => {
      const url = getUrl();
      if (!url) return;
      if (window.MBUPdfBook) window.MBUPdfBook.open(url, getName());
    });
  }

  /* --- 1) file viewer modal ----------------------------------------- */
  const originalOpen = window.openFileViewer;
  if (typeof originalOpen === "function") {
    window.openFileViewer = function (file) {
      const result = originalOpen(file);
      try {
        const isPdf = file && /(^|\/|\.)pdf($|\?)/i.test(String(file.type || file.url || file.name || ""));
        const body = document.getElementById("fileViewerBody");
        const backdrop = document.getElementById("fileViewerBackdrop");
        if (isPdf && body && backdrop && backdrop.classList.contains("open")) {
          const existing = document.getElementById("fileViewerSeg");
          if (existing) existing.remove();
          const seg = segControl("fileViewer");
          body.insertBefore(seg, body.firstChild);
          wireSeg(seg, () => file.url, () => file.name);
        }
      } catch (e) { /* never break the existing viewer */ }
      return result;
    };
  }

  /* --- 2) module Study Material panel -------------------------------- */
  function enhanceModulePdf() {
    const panel = document.getElementById("study-material");
    const frame = document.getElementById("pdfFrame");
    if (!panel || !frame) return;
    if (document.getElementById("modulePdfSeg")) return;

    const seg = segControl("modulePdf");
    panel.insertBefore(seg, panel.querySelector(".pdf-wrap") || panel.firstChild);
    wireSeg(seg,
      () => frame.getAttribute("src") || frame.src,
      () => frame.getAttribute("title") || "Study material");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhanceModulePdf);
  } else {
    enhanceModulePdf();
  }

  /* the module page renders once, but observe anyway (cheap, idempotent) */
  const observer = new MutationObserver(() => {
    if (!document.getElementById("modulePdfSeg")) enhanceModulePdf();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
