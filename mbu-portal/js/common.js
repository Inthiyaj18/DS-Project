/* =====================================================================
   common.js  -  Shared helpers used by all pages:
   theme, sidebar, localStorage, experiment lookup, copy, toast.
   Load order in every page: data.js -> common.js -> page script.
   ===================================================================== */

const STORE = { theme: "mbu-theme", custom: "mbu-custom-experiments", subject: "mbu-selected-subject" };

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function storageGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* storage blocked */ }
}

function pad2(n) { return String(n).padStart(2, "0"); }
/* "6A" -> "06A" */
function subLabel(sub) { return sub.id.replace(/^\d+/, (d) => pad2(d)); }

/* ---------------- Subjects ----------------------------------------
   A subject owns its own modules, materials, experiments and
   sub-experiments.  The selection is shared across navigation through
   a ?subject=<id> query parameter and the "mbu-selected-subject"
   localStorage key, so a direct refresh always loads the right
   content.                                                          */
function getSubjects() {
  if (window.MBUData && typeof window.MBUData.getState === "function") {
    const stored = window.MBUData.getState().subjects;
    if (Array.isArray(stored) && stored.length) return stored;
  }
  if (typeof subjectConfigs !== "undefined" && Array.isArray(subjectConfigs) && subjectConfigs.length) {
    return subjectConfigs;
  }
  return [];
}

function getSubjectById(id) {
  if (!id) return undefined;
  return getSubjects().find((s) => s.id === id);
}

function getSubjectName(id) {
  const s = getSubjectById(id);
  return s ? s.name : "";
}

function setSelectedSubject(id) {
  if (id) storageSet(STORE.subject, id);
}

function subjectFromUrl() {
  try { return new URLSearchParams(window.location.search).get("subject"); }
  catch (e) { return null; }
}

/* The subject a page should show: a valid ?subject= wins, then the
   last stored choice, then the very first subject.  An unknown id is
   ignored so a deleted subject can never blank the page. */
function resolveSubjectId() {
  const list = getSubjects();
  if (!list.length) return "";
  const urlId = subjectFromUrl();
  if (urlId && getSubjectById(urlId)) { setSelectedSubject(urlId); return urlId; }
  const stored = storageGet(STORE.subject);
  if (stored && getSubjectById(stored)) return stored;
  return list[0].id;
}

/* Adds ?subject=<id> to a page URL (the routing convention used by
   every link so subjects are never mixed). */
function withSubject(url, subjectId) {
  const sid = subjectId === undefined ? resolveSubjectId() : subjectId;
  if (!sid) return url;
  return url + (url.indexOf("?") >= 0 ? "&" : "?") + "subject=" + encodeURIComponent(sid);
}

/* True when item belongs to subjectId ("" = no scoping / no subjects). */
function subjectMatch(item, subjectId) {
  if (!subjectId) return true;
  return Boolean(item) && item.subjectId === subjectId;
}

/* ---------------- Custom (user-added) experiments ---------------- */
function loadCustom() {
  try { return JSON.parse(storageGet(STORE.custom) || "[]"); } catch (e) { return []; }
}
function saveCustom(list) {
  storageSet(STORE.custom, JSON.stringify(list));
}

/* Turns the small object saved from the modal into a full experiment */
function normalizeCustom(c) {
  const num = Number(c.id);
  const id = pad2(num);
  const names = c.subNames && c.subNames.length ? c.subNames : ["Main Task"];
  const subs = names.map((name, i) => {
    const letter = String.fromCharCode(65 + i);
    return {
      id: num + letter,
      letter: letter,
      name: name,
      youtube: c.youtube || YT(name),
      github: c.github || GH,
      aim: 'To complete the task "' + name + '" as part of ' + c.name + ".",
      problemStatement:
        'This sub-experiment covers "' + name + '". Describe the problem you are solving, the data you use and the result you expect before running the code.',
      tools: ["Python 3", "Jupyter Notebook"],
      explanation:
        'This part of the experiment deals with "' + name + '". Add a short explanation of the concept here so that another student can follow your work.',
      procedure: [
        "Read the aim and problem statement",
        "Prepare the dataset or input",
        "Write the code",
        "Run the code and capture the output",
        "Record observations and the conclusion"
      ],
      code: "# Experiment " + id + letter + ": " + name + "\n# Add your code here\nprint(\"Experiment " + id + letter + " - " + name + "\")",
      input: "Describe the dataset or values required for this task.",
      result: "Experiment " + id + letter + " - " + name,
      analysis: "Explain what the output shows and whether it matches your expectation.",
      conclusion: "Summarise what you learned from " + id + letter + ".",
      files: []
    };
  });
  return {
    id: id,
    name: c.name,
    topic: c.name,
    tools: ["Python 3", "Jupyter Notebook"],
    description: c.description,
    youtube: c.youtube || YT(c.name + " tutorial"),
    github: c.github || GH,
    overview: c.description,
    aim: "To complete the experiment \"" + c.name + "\" and record the results.",
    problemStatement: "Describe the problem that this experiment solves.",
    dataset: {
      name: "To be specified",
      source: "To be specified",
      records: "To be specified",
      features: "To be specified",
      types: "To be specified"
    },
    methodology: [
      "Understand the aim and the problem statement.",
      "Collect or load the dataset.",
      "Perform each sub-experiment in order.",
      "Record the outputs and observations.",
      "Write the analysis and conclusion."
    ],
    analysis: "Add the analysis of this experiment here.",
    results: "Add the results of this experiment here.",
    architecture: ["Dataset", "Data Collection", "Cleaning", "Preprocessing", "Analysis", "Results"],
    subExperiments: subs,
    subjectId: c.subjectId || (typeof SUBJECT_DEFAULT_ID !== "undefined" ? SUBJECT_DEFAULT_ID : "data-science"),
    custom: true
  };
}

/* Experiments come from the editable store (MBUData, localStorage key
   "mbu-portal-data-v1") when it has been initialised, otherwise from the
   built-in data.js defaults.  Edit Mode edits show up automatically.
   Pass a subjectId (or rely on the selected subject) to scope the list. */
function getExperimentSource(subjectId) {
  const sid = subjectId === undefined ? resolveSubjectId() : subjectId;
  let all;
  if (window.MBUData && typeof window.MBUData.getState === "function") {
    const stored = window.MBUData.getState().experimentConfigs;
    all = Array.isArray(stored) ? stored.map(buildExperiment) : experiments;
  } else {
    all = experiments;
  }
  if (!sid) return all;
  return all.filter((e) => subjectMatch(e, sid));
}

function getAllExperiments(subjectId) {
  const sid = subjectId === undefined ? resolveSubjectId() : subjectId;
  const defaults = typeof SUBJECT_DEFAULT_ID !== "undefined" ? SUBJECT_DEFAULT_ID : "data-science";
  return getExperimentSource(sid)
    .concat(loadCustom()
      .filter((c) => !sid || (c.subjectId || defaults) === sid)
      .map(normalizeCustom))
    .sort((a, b) => Number(a.id) - Number(b.id));
}

/* Accepts "06", "6" or 6.  Scoped to the subject when one is known,
   with a fallback to any subject so old links still resolve. */
function findExperiment(id, subjectId) {
  const n = Number(id);
  if (!id || Number.isNaN(n)) return undefined;
  const explicitSubject = subjectId !== undefined;
  const sid = subjectId === undefined ? resolveSubjectId() : subjectId;
  const hit = getAllExperiments(sid).find((e) => Number(e.id) === n);
  if (hit) return hit;
  if (sid && !explicitSubject) return getAllExperiments("").find((e) => Number(e.id) === n);
  return undefined;
}

/* ---------------- Modules (editable store aware) ---------------- */
function getModules(subjectId) {
  const sid = subjectId === undefined ? resolveSubjectId() : subjectId;
  let all;
  if (window.MBUData && typeof window.MBUData.getState === "function") {
    const stored = window.MBUData.getState().moduleConfigs;
    all = Array.isArray(stored) ? stored.map(buildModule) : modules;
  } else {
    all = modules;
  }
  if (!sid) return all;
  return all.filter((m) => subjectMatch(m, sid));
}

/* ---------------- Theme ---------------- */
function initTheme() {
  const btn = $("#themeToggle");
  const saved = storageGet(STORE.theme);
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  let theme = saved || (prefersDark ? "dark" : "light");

  const apply = (t) => {
    document.documentElement.setAttribute("data-theme", t);
    if (btn) {
      btn.textContent = t === "dark" ? "☀" : "☾";
      btn.setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
      btn.setAttribute("title", t === "dark" ? "Light mode" : "Dark mode");
    }
  };
  apply(theme);

  if (btn) {
    btn.addEventListener("click", () => {
      theme = theme === "dark" ? "light" : "dark";
      storageSet(STORE.theme, theme);
      apply(theme);
    });
  }
}

/* ---------------- Sidebar (hamburger on mobile) ---------------- */
function initSidebar() {
  const sidebar = $("#sidebar");
  const overlay = $("#overlay");
  const menuBtn = $("#menuBtn");
  if (!sidebar || !menuBtn) return;

  const setOpen = (open) => {
    sidebar.classList.toggle("open", open);
    overlay.classList.toggle("show", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.textContent = open ? "✕" : "☰";
  };

  menuBtn.addEventListener("click", () => setOpen(!sidebar.classList.contains("open")));
  overlay.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
  $$("a", sidebar).forEach((a) => a.addEventListener("click", () => setOpen(false)));
}

/* ---------------- Active navigation state ---------------- */
function setActiveNav(id) {
  $$(".nav a").forEach((a) => {
    const active = a.dataset.navId === id;
    a.classList.toggle("active", active);
    if (active) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

/* Scroll-spy for the dashboard page */
function initScrollSpy(sectionIds) {
  const update = () => {
    let current = sectionIds[0];
    const line = window.scrollY + 140;
    sectionIds.forEach((sid) => {
      const el = document.getElementById(sid);
      if (el && el.offsetTop <= line) current = sid;
    });
    setActiveNav(current);
  };
  window.addEventListener("scroll", update, { passive: true });
  $$(".nav a").forEach((a) => a.addEventListener("click", () => setActiveNav(a.dataset.navId)));
  update();
  if (location.hash === "#profile") setActiveNav("profile");
}

/* ---------------- Page transitions (fade out, then navigate) ---------------- */
function initPageTransitions() {
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-nav]");
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey || a.target === "_blank") return;
    e.preventDefault();
    document.body.classList.add("leaving");
    setTimeout(() => { window.location.href = a.href; }, 180);
  });
  window.addEventListener("pageshow", () => document.body.classList.remove("leaving"));
}

/* ---------------- Toast ---------------- */
function showToast(message) {
  let toast = $("#toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

/* ---------------- Clipboard ---------------- */
function fallbackCopy(text) {
  return new Promise((resolve, reject) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    ta.remove();
    ok ? resolve() : reject(new Error("copy failed"));
  });
}
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  }
  return fallbackCopy(text);
}

/* ---------------- Avatars (top bar + profile cards) ---------------- */
/* Shows the profile photo, falling back to the first letter of the
   name when no photo is configured or the image cannot be loaded.  */
function fillAvatar(host, name, photo) {
  if (!host) return;
  const letter = esc(String(name || "?").trim().charAt(0).toUpperCase() || "?");
  host.textContent = letter;
  if (!photo) return;
  const img = document.createElement("img");
  img.className = "profile-avatar";
  img.alt = "";
  img.src = photo;
  img.addEventListener("error", () => { host.textContent = letter; });
  host.textContent = "";
  host.appendChild(img);
}

/* Top-right avatar, present on every page -> opens profile.html */
function initTopAvatar() {
  const host = $("#topAvatar");
  if (!host) return;
  const stored = (window.MBUData && window.MBUData.getState) ? window.MBUData.getState().profile : null;
  const p = (stored && Object.keys(stored).length) ? stored
    : (typeof profile !== "undefined" && profile ? profile : {});
  fillAvatar(host, p.name, p.photo);
}

/* ---------------- Subject indicator + switcher (shared UI) ---------- */
function subjectIndicatorHtml(subjectId) {
  const sid = subjectId === undefined ? resolveSubjectId() : subjectId;
  const s = getSubjectById(sid);
  if (!s) return "";
  return '<span class="subject-indicator" title="Selected subject">' +
    '<span aria-hidden="true">◈</span> ' + esc(s.name) + "</span>";
}

/* Appends a compact subject selector to `host`.  When the site has more
   than one subject it renders a dropdown that navigates to `opts.href`
   (default: the current page) for the chosen subject; with a single
   subject it renders a plain indicator so nothing looks different. */
function mountSubjectSwitcher(host, opts) {
  if (!host) return;
  opts = opts || {};
  const list = getSubjects();
  if (!list.length) return;
  const current = resolveSubjectId();
  const cur = getSubjectById(current);

  const wrap = document.createElement("div");
  wrap.className = "subject-bar";

  const label = document.createElement("span");
  label.className = "subject-bar-label";
  label.innerHTML = '<span aria-hidden="true">◈</span> Subject';
  wrap.appendChild(label);

  if (list.length > 1) {
    const sel = document.createElement("select");
    sel.className = "subject-select";
    if (opts.id) sel.id = opts.id;
    sel.setAttribute("aria-label", "Selected subject");
    list.forEach((s) => {
      const o = document.createElement("option");
      o.value = s.id;
      o.textContent = s.name;
      if (s.id === current) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", () => {
      setSelectedSubject(sel.value);
      const base = opts.href || (window.location.pathname.split("/").pop() || "index.html");
      window.location.href = base + "?subject=" + encodeURIComponent(sel.value);
    });
    wrap.appendChild(sel);
  } else if (cur) {
    const span = document.createElement("span");
    span.className = "subject-current";
    span.textContent = cur.name;
    wrap.appendChild(span);
  }
  host.appendChild(wrap);
}

/* ---------------- Start-up for every page ---------------- */
function initCommon(activeNavId) {
  initTheme();
  initSidebar();
  initPageTransitions();
  initTopAvatar();
  if (activeNavId) setActiveNav(activeNavId);
}
