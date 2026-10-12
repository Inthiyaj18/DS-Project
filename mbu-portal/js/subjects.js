/* =====================================================================
   subjects.js  -  Subject Management System (subjects.html)

   Lists every subject with its module / experiment / sub-experiment
   counts, lets the reader open one (which becomes the selected subject
   across the site) and - in Edit Mode - add, rename or delete subjects.

   The selected subject travels in ?subject=<id> and localStorage so it
   survives navigation and a direct refresh (see common.js).
   ===================================================================== */
(function () {
  "use strict";

  initCommon("subjects");

  const app = document.getElementById("app") || document.querySelector("#app");
  if (!app) return;
  document.title = "Subjects | Mohan Babu University";

  const subjectId = resolveSubjectId();
  const subjects = getSubjects();

  function counts(sid) {
    const mods = getModules(sid);
    const exps = getAllExperiments(sid);
    const subs = exps.reduce((n, e) => n + (Array.isArray(e.subExperiments) ? e.subExperiments.length : 0), 0);
    return { modules: mods.length, experiments: exps.length, subs: subs };
  }

  const hero = (lead) => `
    <section class="page-hero" aria-labelledby="subjectsTitle">
      <span class="exp-tag">SUBJECT MANAGEMENT</span>
      <h1 id="subjectsTitle">Subjects</h1>
      <p class="hero-lead">${lead}</p>
      <div class="subject-holder" id="subjectHolder"></div>
    </section>`;

  /* ---------------- empty state (no subjects at all) ---------------- */
  if (!subjects.length) {
    app.innerHTML = hero("No subjects have been created yet.") + `
      <div class="empty">
        <div class="empty-icon" aria-hidden="true">◈</div>
        <h3>No subjects yet</h3>
        <p>Turn on Edit Mode and use “+ Add subject” to create the first subject.</p>
      </div>`;
    return;
  }

  /* ---------------- subject cards ---------------- */
  const cards = subjects.map((s, i) => {
    const c = counts(s.id);
    const active = s.id === subjectId;
    const desc = s.description && s.description.trim()
      ? esc(s.description)
      : '<span class="muted">No description yet.</span>';
    return `
      <article class="card subject-card${active ? " active" : ""}" style="--i:${i}" data-id="${esc(s.id)}">
        <div class="card-top">
          <span class="exp-tag">${active ? "◈ ACTIVE SUBJECT" : "SUBJECT"}</span>
          <span class="badge">${c.modules} Module${c.modules === 1 ? "" : "s"}</span>
        </div>
        <h3>${esc(s.name)}</h3>
        <p class="desc">${desc}</p>
        <div class="card-meta">
          <span class="badge">${c.experiments} Experiment${c.experiments === 1 ? "" : "s"}</span>
          <span class="badge">${c.subs} Sub-experiment${c.subs === 1 ? "" : "s"}</span>
        </div>
        <div class="card-actions">
          <a class="btn btn-primary" data-nav data-open-subject="${esc(s.id)}"
             href="${esc(withSubject("modules.html", s.id))}">Open modules</a>
          <a class="btn btn-ghost" data-nav data-open-subject="${esc(s.id)}"
             href="${esc(withSubject("experiments.html", s.id))}">Experiments</a>
        </div>
      </article>`;
  }).join("");

  app.innerHTML = hero(
    `Each subject has its own modules, learning materials and experiments — ` +
    `they are never mixed together. Open a subject to study it, or turn on ` +
    `Edit Mode to add and manage subjects.`) +
    `<div class="grid" id="subjectGrid" aria-label="Subjects list">${cards}</div>`;

  /* ---------------- selection + switcher ---------------- */
  Array.prototype.forEach.call(app.querySelectorAll("[data-open-subject]"), (a) => {
    a.addEventListener("click", () => setSelectedSubject(a.getAttribute("data-open-subject")));
  });
  mountSubjectSwitcher(document.getElementById("subjectHolder"), { href: "subjects.html", id: "subjectSwitcher" });
})();
