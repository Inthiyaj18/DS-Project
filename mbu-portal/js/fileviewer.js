/* =====================================================================
   fileviewer.js  -  Reusable file cards + file viewer used by the
   "Experiment Files" panel (js/experiment.js) and available to any
   other page.

   A file is plain metadata stored with the experiment / module:

     { name: "Notes.pdf", type: "pdf", url: "assets/files/notes.pdf",
       size: "24 KB", date: "2026-10-07" }

   `type` may be an extension ("pdf"), a file name ("notes.pdf") or a
   mime type ("application/pdf").  When omitted it is taken from `url`.
   ===================================================================== */

const FILE_KINDS = {
  pdf:  { icon: "📄", label: "PDF document",         view: "View",     viewer: "frame" },
  txt:  { icon: "📄", label: "Text file",            view: "View",     viewer: "frame" },
  md:   { icon: "📄", label: "Markdown file",        view: "View",     viewer: "frame" },
  csv:  { icon: "📄", label: "CSV file",             view: "View",     viewer: "frame" },
  png:  { icon: "🖼", label: "Image",                view: "View",     viewer: "image" },
  jpg:  { icon: "🖼", label: "Image",                view: "View",     viewer: "image" },
  jpeg: { icon: "🖼", label: "Image",                view: "View",     viewer: "image" },
  gif:  { icon: "🖼", label: "Image",                view: "View",     viewer: "image" },
  svg:  { icon: "🖼", label: "Image",                view: "View",     viewer: "image" },
  webp: { icon: "🖼", label: "Image",                view: "View",     viewer: "image" },
  bmp:  { icon: "🖼", label: "Image",                view: "View",     viewer: "image" },
  ppt:  { icon: "📊", label: "PowerPoint presentation", view: null,     viewer: "open" },
  pptx: { icon: "📊", label: "PowerPoint presentation", view: null,     viewer: "open" },
  xls:  { icon: "📊", label: "Spreadsheet",          view: null,        viewer: "open" },
  xlsx: { icon: "📊", label: "Spreadsheet",          view: null,        viewer: "open" },
  doc:  { icon: "📝", label: "Word document",        view: null,        viewer: "open" },
  docx: { icon: "📝", label: "Word document",        view: null,        viewer: "open" },
  ipynb: { icon: "🧪", label: "Jupyter notebook",     view: null,        viewer: "open" },
  zip:  { icon: "📦", label: "Archive",              view: null,        viewer: "open" },
  rar:  { icon: "📦", label: "Archive",              view: null,        viewer: "open" },
  "7z": { icon: "📦", label: "Archive",              view: null,        viewer: "open" }
};

function fileExtension(file) {
  let raw = String((file && (file.type || file.url || file.name)) || "");
  const semi = raw.indexOf(";");
  if (semi > -1) raw = raw.slice(0, semi);
  const slash = raw.lastIndexOf("/");
  if (slash > -1) raw = raw.slice(slash + 1);
  const dot = raw.lastIndexOf(".");
  if (dot > -1) raw = raw.slice(dot + 1);
  return raw.trim().toLowerCase();
}

function fileKind(file) {
  const extension = fileExtension(file);
  const known = FILE_KINDS[extension];
  if (known) return Object.assign({ extension: extension }, known);
  return { extension: extension, icon: "📎", label: "File", view: null, viewer: "open" };
}

/* ---------------- file card ---------------- */
function fileRowHtml(file, index) {
  const kind = fileKind(file);
  const meta = [kind.label, file.size, file.date]
    .filter(Boolean)
    .map((part) => String(part))
    .join(" · ");
  const canView = Boolean(kind.view) && (kind.viewer === "frame" || kind.viewer === "image");
  const thumbnail =
    kind.viewer === "image"
      ? `<img class="file-thumb" src="${esc(file.url)}" alt="${esc(file.name)}" loading="lazy" onerror="this.style.display='none'">`
      : "";

  return `
    <div class="file-row">
      <span class="file-ico" aria-hidden="true">${kind.icon}</span>
      <div class="file-meta">
        <strong>${esc(file.name)}</strong>
        <small>${esc(meta)}</small>
        ${thumbnail}
      </div>
      <div class="file-actions">
        ${canView ? `<button class="btn btn-ghost" type="button" data-view-file="${index}">${esc(kind.view)}</button>` : ""}
        <a class="btn btn-ghost" href="${esc(file.url)}" target="_blank" rel="noopener">Open</a>
        <a class="btn btn-primary" href="${esc(file.url)}" download="${esc(file.name)}">Download</a>
      </div>
    </div>`;
}

/* ---------------- viewer modal ---------------- */
let fileViewerBuilt = false;
let fileViewerLastFocus = null;

function buildFileViewer() {
  if (fileViewerBuilt) return;
  fileViewerBuilt = true;

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "fileViewerBackdrop";
  backdrop.setAttribute("aria-hidden", "true");
  backdrop.innerHTML = `
    <div class="modal file-modal" role="dialog" aria-modal="true" aria-labelledby="fileViewerTitle">
      <div class="modal-head">
        <h2 id="fileViewerTitle">File</h2>
        <button class="icon-btn" id="fileViewerClose" type="button" aria-label="Close file viewer">✕</button>
      </div>
      <div class="file-modal-body" id="fileViewerBody"></div>
      <div class="modal-actions">
        <a class="btn btn-ghost" id="fileViewerOpen" href="#" target="_blank" rel="noopener">Open in new tab</a>
        <a class="btn btn-primary" id="fileViewerDownload" href="#" download>Download</a>
      </div>
    </div>`;
  document.body.appendChild(backdrop);

  const close = () => {
    backdrop.classList.remove("open");
    backdrop.setAttribute("aria-hidden", "true");
    document.getElementById("fileViewerBody").innerHTML = "";
    if (fileViewerLastFocus && fileViewerLastFocus.focus) fileViewerLastFocus.focus();
  };

  document.getElementById("fileViewerClose").addEventListener("click", close);
  backdrop.addEventListener("click", (event) => { if (event.target === backdrop) close(); });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && backdrop.classList.contains("open")) close();
  });
}

function fileMissingHtml(name) {
  return `
    <div class="empty">
      <div class="empty-icon" aria-hidden="true">⚠</div>
      <h3>File not found</h3>
      <p>${esc(name)} could not be loaded. It may have been moved or not uploaded yet.</p>
    </div>`;
}

function showFileMissing(name) {
  const body = document.getElementById("fileViewerBody");
  if (body) body.innerHTML = fileMissingHtml(name);
}

function openFileViewer(file) {
  if (!file || !file.url) return;

  const kind = fileKind(file);

  /* Types browsers cannot preview: hand them straight to the browser. */
  if (kind.viewer !== "frame" && kind.viewer !== "image") {
    window.open(file.url, "_blank", "noopener");
    return;
  }

  buildFileViewer();
  fileViewerLastFocus = document.activeElement;

  const backdrop = document.getElementById("fileViewerBackdrop");
  const body = document.getElementById("fileViewerBody");
  const title = document.getElementById("fileViewerTitle");
  const openLink = document.getElementById("fileViewerOpen");
  const downloadLink = document.getElementById("fileViewerDownload");

  title.textContent = file.name;
  openLink.href = file.url;
  downloadLink.href = file.url;
  downloadLink.setAttribute("download", file.name);
  body.innerHTML = "";

  if (kind.viewer === "image") {
    const image = document.createElement("img");
    image.src = file.url;
    image.alt = file.name;
    image.addEventListener("error", () => showFileMissing(file.name));
    body.appendChild(image);
  } else {
    const frame = document.createElement("iframe");
    frame.src = file.url;
    frame.title = file.name;
    frame.className = "file-frame";
    body.appendChild(frame);
    /* Only report a missing file when the server can tell us (http/https). */
    if (/^https?:/i.test(location.protocol)) {
      fetch(file.url, { method: "HEAD", cache: "no-store" })
        .then((response) => { if (!response.ok) showFileMissing(file.name); })
        .catch(() => { /* cannot verify - keep the preview */ });
    }
  }

  backdrop.classList.add("open");
  backdrop.setAttribute("aria-hidden", "false");
  document.getElementById("fileViewerClose").focus();
}
