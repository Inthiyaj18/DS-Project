/* =====================================================================
   modules.js  -  Modules list page (modules.html)

   Renders one card per module of the SELECTED subject.  The subject
   selection travels in ?subject=<id> and localStorage (see common.js),
   so switching subjects (or refreshing) never mixes modules from two
   subjects.  Adding Module 6 later only needs new data.
   ===================================================================== */
(function () {
  initCommon("modules");

  const app = $("#app");
  document.title = "Modules | Mohan Babu University";

  const subjectId = resolveSubjectId();
  const subject = getSubjectById(subjectId);
  const subjectLabel = subject ? subject.name : "this subject";
  const moduleList = getModules(subjectId);

  /* ---------------- subject header (indicator + switcher) ---------- */
  function heroMarkup(lead) {
    return `
    <section class="page-hero" aria-labelledby="modulesTitle">
      <span class="exp-tag">COURSE STRUCTURE</span>
      <h1 id="modulesTitle">Modules</h1>
      <p class="hero-lead">${lead}</p>
      <div class="subject-holder" id="subjectHolder"></div>
    </section>`;
  }

  if (!moduleList || !moduleList.length) {
    app.innerHTML =
      heroMarkup(`Modules are organised by subject. <strong>${esc(subjectLabel)}</strong> has no modules yet.`) +
      `
      <div class="empty">
        <div class="empty-icon" aria-hidden="true">❏</div>
        <h3>No modules yet</h3>
        <p>No modules have been added to <strong>${esc(subjectLabel)}</strong> yet.
           Turn on Edit Mode and use “+ Add module” to create the first one.</p>
      </div>`;
    mountSubjectSwitcher(document.getElementById("subjectHolder"), { href: "modules.html", id: "subjectSwitcher" });
    return;
  }

  const cards = moduleList.map((m, i) => {
    const materials = Array.isArray(m.materials) ? m.materials : [];
    const types = Array.from(new Set(materials
      .map((x) => (x.type || "").toLowerCase())
      .filter(Boolean))).slice(0, 4);
    const materialBadge = materials.length
      ? `<span class="badge">${materials.length} Material${materials.length === 1 ? "" : "s"}${
          types.length ? " · " + esc(types.join("/")) : ""}</span>`
      : "";
    return `
      <article class="card" style="--i:${i}" data-id="${esc(m.id)}">
        <div class="card-top">
          <span class="exp-tag">MODULE ${pad2(m.id)}</span>
          <span class="badge">${m.topics.length} Topic${m.topics.length === 1 ? "" : "s"}</span>
        </div>
        <h3>${esc(m.title)}</h3>
        <p class="desc">${esc(m.summary)}</p>
        ${materialBadge ? `<div class="card-meta">${materialBadge}</div>` : ""}
        <div class="card-actions">
          <a class="btn btn-primary" data-nav href="${withSubject("module.html?id=" + encodeURIComponent(m.id), subjectId)}">View Module →</a>
        </div>
      </article>`;
  }).join("");

  app.innerHTML =
    heroMarkup(`Study material is organised into ${moduleList.length} module${moduleList.length === 1 ? "" : "s"} under
        <strong>${esc(subjectLabel)}</strong>. Open a module to read its topics, notes and concepts,
        and to view or download its study material.`) +
    `<div class="grid" aria-label="Modules list">${cards}</div>`;

  mountSubjectSwitcher(document.getElementById("subjectHolder"), { href: "modules.html", id: "subjectSwitcher" });
})();
