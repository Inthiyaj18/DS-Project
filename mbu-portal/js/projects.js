/* =====================================================================
   projects.js  -  Projects page.

   The list starts EMPTY by design: projects are added in Edit Mode by
   uploading a whole project folder.  Storage reuses the existing
   MBUData store (localStorage key "mbu-portal-data-v1", key "projects"),
   so projects travel with the normal Export / Import / Reset controls and
   nothing new is introduced into the persistence layer.

   A folder is picked with <input webkitdirectory>.  Text-like files are
   stored inline so the portal keeps working fully offline; binary or very
   large files keep only their metadata, which keeps the page inside the
   browser storage quota.
   ===================================================================== */
(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const esc = (v) => window.esc(String(v == null ? "" : v));

  /* Storage guards - keep a folder of real code inside the localStorage quota. */
  const MAX_TEXT_FILE = 180 * 1024;   /* per file */
  const MAX_TEXT_TOTAL = 3 * 1024 * 1024; /* per project */
  const TEXT_EXT = /\.(py|ipynb|txt|md|csv|tsv|json|js|mjs|cjs|ts|tsx|jsx|html|htm|css|scss|xml|yml|yaml|toml|ini|cfg|conf|sql|sh|bash|zsh|r|jl|java|c|cpp|h|hpp|cs|php|rb|go|rs|kt|swift|env|gitignore|dockerfile)$/i;
  const TEXT_MIME = /^(text\/|application\/(json|xml|javascript|x-sh|x-httpd-php))/i;

  /* ---------------- storage helpers ---------------- */
  function readProjects() {
    if (!window.MBUData) return [];
    const list = window.MBUData.getState().projects;
    return Array.isArray(list) ? list : [];
  }
  function writeProjects(list) {
    if (!window.MBUData) return false;
    window.MBUData.setState({ projects: list });
    /* MBUData.setState always returns state, so confirm the write really
       landed in localStorage and report a full / blocked storage clearly. */
    try {
      const raw = localStorage.getItem(window.MBUData.storageKey);
      const saved = raw ? JSON.parse(raw).projects : null;
      return Array.isArray(saved) && saved.length === list.length;
    } catch (e) {
      return false;
    }
  }
  function subjectId() {
    return typeof window.resolveSubjectId === "function" ? window.resolveSubjectId() : "";
  }

  /* ---------------- formatting ---------------- */
  function fmtSize(bytes) {
    const n = Number(bytes) || 0;
    if (n < 1024) return n + " B";
    const units = ["KB", "MB", "GB"];
    let v = n / 1024, i = 0;
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return v.toFixed(1) + " " + units[i];
  }
  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric", month: "short", day: "numeric"
      });
    } catch (e) { return ""; }
  }
  function newId() {
    return "prj-" + Date.now().toString(36) + "-" +
      Math.random().toString(36).slice(2, 7);
  }

  /* ---------------- folder upload ---------------- */
  function isTexty(file) {
    if (TEXT_MIME.test(file.type || "")) return true;
    return TEXT_EXT.test(file.name || "");
  }
  function relPath(file) {
    const raw = file.webkitRelativePath || file.name || "";
    const parts = String(raw).split("/");
    return parts.length > 1 ? parts.slice(1).join("/") : raw;
  }
  function readEntry(file) {
    return new Promise((resolve) => {
      const meta = {
        path: relPath(file),
        name: file.name,
        size: file.size || 0,
        type: file.type || "",
        text: "",
        binary: true
      };
      if (!isTexty(file) || meta.size > MAX_TEXT_FILE) { resolve(meta); return; }
      const reader = new FileReader();
      reader.onload = () => { meta.text = String(reader.result || ""); meta.binary = false; resolve(meta); };
      reader.onerror = () => resolve(meta);
      reader.readAsText(file);
    });
  }

  /* Opens the OS file explorer in FOLDER-SELECT mode so the user can pick
     a whole project directory (including its sub-folders).
     The input is attached to the document before .click() - some browsers
     ignore a click on a detached element - and is removed once the
     dialog settles.  Resolves with the selected File entries, or null when
     the user cancels (Chrome fires "cancel"; the timeout is the fallback
     for browsers that do not). */
  function pickFolder() {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = true;
      input.setAttribute("webkitdirectory", "");
      input.setAttribute("directory", "");
      input.webkitdirectory = true;
      input.dir = "";
      input.setAttribute("aria-hidden", "true");
      input.style.cssText =
        "position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;";
      document.body.appendChild(input);

      let settled = false;
      const done = (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        input.remove();
        resolve(value);
      };
      input.addEventListener("change", () => done(Array.from(input.files || [])));
      input.addEventListener("cancel", () => done(null));
      const timer = setTimeout(() => done(null), 5 * 60 * 1000);
      input.click();
    });
  }

  /* Reads a picked folder and shapes it into the stored file list. */
  async function readFolder(files) {
    const entries = [];
    for (const file of files) entries.push(await readEntry(file));
    entries.sort((a, b) => a.path.localeCompare(b.path));

    /* Keep the whole project comfortably inside the storage quota: once
       the inline text budget is spent the remaining text files are listed
       by name only, never dropped. */
    let budget = MAX_TEXT_TOTAL;
    let trimmed = 0;
    entries.forEach((e) => {
      if (e.binary || !e.text) return;
      const bytes = e.text.length * 2;
      if (bytes > budget) {
        e.text = "";
        e.binary = true;
        e.trimmed = true;
        trimmed++;
      } else {
        budget -= bytes;
      }
    });
    return { entries, trimmed };
  }

  function folderNameFrom(files) {
    const first = files[0];
    const raw = (first && (first.webkitRelativePath || "")) || "";
    const top = String(raw).split("/")[0];
    return top || "Project folder";
  }

  /* ---------------- add / edit actions (Edit Mode only) ---------------- */
  async function addProject() {
    const files = await pickFolder();
    if (!files || !files.length) { window.MBUAdmin.toast("No folder selected."); return; }

    const folder = folderNameFrom(files);
    const { entries, trimmed } = await readFolder(files);
    const total = entries.reduce((sum, e) => sum + e.size, 0);

    const values = await window.MBUAdmin.prompt("Add project", [
      {
        key: "name", label: "Project name", required: true,
        value: folder, placeholder: "e.g. Sales Forecasting"
      },
      {
        key: "description", label: "Description", type: "textarea",
        value: "", placeholder: "What does this project do?"
      }
    ], { okLabel: "Save project" });
    if (!values) return;

    const list = readProjects();
    list.unshift({
      id: newId(),
      name: String(values.name || folder).trim() || folder,
      description: String(values.description || "").trim(),
      folder: folder,
      subjectId: subjectId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fileCount: entries.length,
      totalSize: total,
      files: entries
    });

    if (!writeProjects(list)) {
      window.MBUAdmin.toast("Could not save: browser storage is full or blocked.");
      return;
    }
    render();
    window.MBUAdmin.toast("✓ " + entries.length + " file(s) added");
    if (trimmed) {
      window.MBUAdmin.toast(trimmed + " large file(s) listed by name only (storage limit).");
    }
  }

  async function editProject(id) {
    const list = readProjects();
    const idx = list.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const project = list[idx];

    const values = await window.MBUAdmin.prompt("Edit project", [
      {
        key: "name", label: "Project name", required: true,
        value: project.name, placeholder: "e.g. Sales Forecasting"
      },
      {
        key: "description", label: "Description", type: "textarea",
        value: project.description || "", placeholder: "What does this project do?"
      }
    ], { okLabel: "Save changes" });
    if (!values) return;

    project.name = String(values.name || project.name).trim() || project.name;
    project.description = String(values.description || "").trim();
    project.updatedAt = new Date().toISOString();
    list[idx] = project;
    if (!writeProjects(list)) { window.MBUAdmin.toast("Could not save: storage is full or blocked."); return; }
    render();
    window.MBUAdmin.toast("✓ Project updated");
  }

  async function replaceFolder(id) {
    const list = readProjects();
    const idx = list.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const files = await pickFolder();
    if (!files || !files.length) { window.MBUAdmin.toast("No folder selected."); return; }

    const { entries, trimmed } = await readFolder(files);
    list[idx].folder = folderNameFrom(files);
    list[idx].files = entries;
    list[idx].fileCount = entries.length;
    list[idx].totalSize = entries.reduce((sum, e) => sum + e.size, 0);
    list[idx].updatedAt = new Date().toISOString();
    if (!writeProjects(list)) { window.MBUAdmin.toast("Could not save: storage is full or blocked."); return; }
    render();
    window.MBUAdmin.toast("✓ Folder replaced (" + entries.length + " files)");
    if (trimmed) window.MBUAdmin.toast(trimmed + " large file(s) listed by name only (storage limit).");
  }

  async function deleteProject(id) {
    const list = readProjects();
    const project = list.find((p) => p.id === id);
    if (!project) return;
    const ok = await window.MBUAdmin.confirm(
      'Delete "' + project.name + '" and its ' + (project.fileCount || 0) +
      " file(s)? This cannot be undone.",
      { okLabel: "Delete project", title: "Delete project" }
    );
    if (!ok) return;
    const next = list.filter((p) => p.id !== id);
    if (!writeProjects(next)) { window.MBUAdmin.toast("Could not save: storage is full or blocked."); return; }
    render();
    window.MBUAdmin.toast("Project deleted");
  }

  /* ---------------- rendering ---------------- */
  function fileListHtml(project) {
    const files = Array.isArray(project.files) ? project.files : [];
    if (!files.length) return "";
    const items = files.map((f) =>
      '<li class="proj-file"><span class="proj-file-name">' + esc(f.path || f.name) + "</span>" +
      '<span class="proj-file-meta">' + (f.binary ? "not stored" : esc(fmtSize(f.size))) + "</span></li>"
    ).join("");
    return '<details class="proj-files"><summary>Browse ' +
      files.length + " file" + (files.length === 1 ? "" : "s") + "</summary>" +
      '<ul class="proj-file-list">' + items + "</ul></details>";
  }

  function cardHtml(project, index) {
    const count = project.fileCount || (project.files || []).length || 0;
    const size = project.totalSize || (project.files || []).reduce((s, f) => s + (f.size || 0), 0);
    const meta = [];
    if (project.folder) meta.push('<span class="badge">📁 ' + esc(project.folder) + "</span>");
    meta.push('<span class="badge">' + count + " file" + (count === 1 ? "" : "s") + "</span>");
    meta.push('<span class="badge">' + esc(fmtSize(size)) + "</span>");
    if (project.createdAt) meta.push('<span class="badge">Added ' + esc(fmtDate(project.createdAt)) + "</span>");
    const subject = project.subjectId && typeof window.getSubjectName === "function"
      ? window.getSubjectName(project.subjectId) : "";
    if (subject) meta.push('<span class="badge">◈ ' + esc(subject) + "</span>");

    return '<article class="card proj-card" role="listitem" style="--i:' + index + '">' +
      '<div class="card-top"><span class="exp-tag">PROJECT</span>' +
      '<span class="badge">' + esc(project.folder || "Project") + "</span></div>" +
      "<h3>" + esc(project.name) + "</h3>" +
      (project.description ? '<p class="desc">' + esc(project.description) + "</p>" : "") +
      '<div class="card-meta">' + meta.join("") + "</div>" +
      fileListHtml(project) +
      '<div class="card-actions adm-ui">' +
      '<button class="btn btn-ghost" type="button" data-prj-edit="' + esc(project.id) + '">✎ Edit</button>' +
      '<button class="btn btn-ghost" type="button" data-prj-folder="' + esc(project.id) + '">⇪ Replace folder</button>' +
      '<button class="btn btn-adm-danger" type="button" data-prj-del="' + esc(project.id) + '">🗑 Delete</button>' +
      "</div></article>";
  }

  function render() {
    const grid = $("#projGrid");
    const empty = $("#projEmpty");
    if (!grid) return;
    const list = readProjects();

    grid.innerHTML = list.map(cardHtml).join("");
    if (empty) empty.style.display = list.length ? "none" : "";
    grid.style.display = list.length ? "" : "none";

    /* Edit Mode controls are rebuilt with the cards so the two never drift. */
    const tools = $("#projTools");
    if (tools) {
      tools.innerHTML =
        '<button class="btn btn-primary adm-ui" type="button" id="projAddBtn">＋ Add project</button>';
      const addBtn = $("#projAddBtn");
      if (addBtn) addBtn.addEventListener("click", addProject);
    }

    grid.querySelectorAll("[data-prj-edit]").forEach((btn) => {
      btn.addEventListener("click", () => editProject(btn.dataset.prjEdit));
    });
    grid.querySelectorAll("[data-prj-folder]").forEach((btn) => {
      btn.addEventListener("click", () => replaceFolder(btn.dataset.prjFolder));
    });
    grid.querySelectorAll("[data-prj-del]").forEach((btn) => {
      btn.addEventListener("click", () => deleteProject(btn.dataset.prjDel));
    });
  }

  /* ---------------- start ---------------- */
  function start() {
    initCommon("projects");
    render();
    if (window.MBUAdmin) {
      /* Runs on activate and again whenever the page re-renders. */
      window.MBUAdmin.register(render);
    }
    window.addEventListener("mbu:data-changed", render);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();