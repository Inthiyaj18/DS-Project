/* =====================================================================
   module.js  -  Module details page (module.html?id=1)

   One reusable renderer: every module is described by data in
   data.js (moduleConfigs) and rendered by this component, including
   topics, concepts, notes, diagrams, PDF study material and links.
   ===================================================================== */
(function () {
  initCommon("modules");

  const app = $("#app");
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const explicitSubjectId = params.get("subject");
  const hasExplicitValidSubject = Boolean(explicitSubjectId && getSubjectById(explicitSubjectId));
  let subjectId = resolveSubjectId();

  let MODULES = getModules(subjectId);
  let moduleIndex = MODULES.findIndex((m) => String(m.id) === String(id));

  /* Legacy links without ?subject: fall back to any subject that owns
     this module id, then remember that subject. */
  if (moduleIndex < 0 && !hasExplicitValidSubject) {
    const all = getModules("");
    const hit = all.find((m) => String(m.id) === String(id));
    if (hit) {
      subjectId = hit.subjectId;
      setSelectedSubject(subjectId);
      MODULES = getModules(subjectId);
      moduleIndex = MODULES.findIndex((m) => String(m.id) === String(id));
    }
  }

  const subject = getSubjectById(subjectId);
  const subjectLabel = subject ? subject.name : "";
  const listHref = withSubject("modules.html", subjectId);

  /* ---------------- invalid module id ---------------- */
  if (moduleIndex < 0) {
    document.title = "Module not found | Mohan Babu University";
    app.innerHTML = `
      <div class="empty">
        <div class="empty-icon" aria-hidden="true">⚠</div>
        <h3>Module not found</h3>
        <p>The module you opened does not exist${subjectLabel ? " in " + esc(subjectLabel) : ""}.
           It may have been renamed or the link is incomplete.</p>
        <p style="margin-top:16px"><a class="btn btn-primary" data-nav href="${esc(listHref)}">Back to modules</a></p>
      </div>`;
    return;
  }

  const mod = MODULES[moduleIndex];
  const label = "MODULE " + pad2(mod.id);
  document.title = "Module " + pad2(mod.id) + " | " + mod.title;

  /* ---------------- sections (numbered like the experiment page) ---------------- */
  let sectionNo = 0;
  const nextNo = () => ++sectionNo;

  const overviewPanel = `
    <section class="panel" id="overview">
      <h2><span class="num">${nextNo()}</span>Overview</h2>
      <p>${esc(mod.overview)}</p>
    </section>`;

  const topicsPanel = mod.topics.length
    ? `
    <section class="panel" id="topics">
      <h2><span class="num">${nextNo()}</span>Topics</h2>
      <ol class="proc">
        ${mod.topics
          .map((topic, i) => `<li><span class="step-no">${pad2(i + 1)}</span><span>${esc(topic)}</span></li>`)
          .join("")}
      </ol>
    </section>`
    : "";

  const conceptsPanel = mod.concepts.length
    ? `
    <section class="panel" id="concepts">
      <h2><span class="num">${nextNo()}</span>Important Concepts</h2>
      <div class="sub-grid">
        ${mod.concepts
          .map((concept) => `<div class="sub-card"><strong>${esc(concept.title)}</strong><span>${esc(concept.text)}</span></div>`)
          .join("")}
      </div>
    </section>`
    : "";

  const imagesPanel = mod.images.length
    ? `
    <section class="panel" id="diagrams">
      <h2><span class="num">${nextNo()}</span>Diagrams</h2>
      ${mod.images
        .map(
          (image) => `
        <figure class="module-figure">
          <img src="${esc(image.src)}" alt="${esc(image.caption || mod.title)}" loading="lazy"
               onerror="this.closest('figure').classList.add('missing')">
          <figcaption>${esc(image.caption || "")}</figcaption>
        </figure>`
        )
        .join("")}
    </section>`
    : "";

  const notesPanel = mod.notes.length
    ? `
    <section class="panel" id="notes">
      <h2><span class="num">${nextNo()}</span>Notes</h2>
      <ul class="note-list">
        ${mod.notes.map((note) => `<li>${esc(note)}</li>`).join("")}
      </ul>
    </section>`
    : "";

  /* ---------------- PDF study material ---------------- */
  const pdfNo = nextNo();
  const pdfPanel = mod.pdf
    ? `
    <section class="panel" id="study-material">
      <h2><span class="num">${pdfNo}</span>Study Material</h2>
      <div class="pdf-wrap" id="pdfWrap">
        <iframe class="pdf-frame" id="pdfFrame" src="${esc(mod.pdf)}"
                title="${esc(mod.pdfName || mod.title + " study material")}" loading="lazy"></iframe>
      </div>
      <div class="pdf-actions">
        <a class="btn btn-primary" href="${esc(mod.pdf)}" target="_blank" rel="noopener">Open PDF</a>
        <a class="btn btn-ghost" href="${esc(mod.pdf)}" download="${esc(mod.pdfName || "module-" + mod.id + ".pdf")}">Download PDF</a>
      </div>
    </section>`
    : `
    <section class="panel" id="study-material">
      <h2><span class="num">${pdfNo}</span>Study Material</h2>
      <div class="empty">
        <div class="empty-icon" aria-hidden="true">📄</div>
        <h3>No study material yet</h3>
        <p>The PDF for this module has not been added. Add it at <code>assets/pdfs/</code> and set <code>pdf</code> in js/data.js.</p>
      </div>
    </section>`;

  const resourcesPanel = mod.resources.length
    ? `
    <section class="panel" id="resources">
      <h2><span class="num">${nextNo()}</span>Additional Resources</h2>
      <div class="res-grid">
        ${mod.resources
          .map(
            (resource) => `
          <a class="res-tile" href="${esc(resource.url)}" target="_blank" rel="noopener">
            <span aria-hidden="true">🔗</span><strong>${esc(resource.label)}</strong><small>${esc(resource.desc)}</small>
          </a>`
          )
          .join("")}
      </div>
    </section>`
    : "";

  /* ---------------- previous / next module ---------------- */
  function moduleNav(position) {
    const previous = MODULES[moduleIndex - 1];
    const next = MODULES[moduleIndex + 1];
    return `
      <div class="subnav" role="navigation" aria-label="Module navigation ${position}">
        ${
          previous
            ? `<a class="btn btn-ghost" data-nav href="${withSubject("module.html?id=" + encodeURIComponent(previous.id), subjectId)}">← Module ${pad2(previous.id)}</a>`
            : `<a class="btn btn-ghost" data-nav href="${esc(listHref)}">← All modules</a>`
        }
        <span class="subnav-label">${label}</span>
        ${
          next
            ? `<a class="btn btn-ghost" data-nav href="${withSubject("module.html?id=" + encodeURIComponent(next.id), subjectId)}">Module ${pad2(next.id)} →</a>`
            : `<a class="btn btn-ghost" data-nav href="${esc(listHref)}">All modules →</a>`
        }
      </div>`;
  }

  /* ---------------- render ---------------- */
  app.innerHTML = `
    <a class="back-link" data-nav href="${esc(listHref)}">← All modules</a>

    <section class="page-hero" aria-labelledby="moduleTitle">
      <span class="exp-tag">${label}${subjectLabel ? " · " + esc(subjectLabel) : ""}</span>
      <h1 id="moduleTitle">${esc(mod.title)}</h1>
      <p class="hero-lead">${esc(mod.summary)}</p>
      <div class="subject-holder" id="subjectHolder"></div>
    </section>

    ${moduleNav("top")}

    ${overviewPanel}
    ${topicsPanel}
    ${conceptsPanel}
    ${imagesPanel}
    ${notesPanel}
    ${pdfPanel}
    ${resourcesPanel}

    ${moduleNav("bottom")}`;

  /* Report a missing PDF without hiding the Open / Download buttons.
     (The check is skipped when the page is opened straight from disk,
     where the browser cannot answer HEAD requests.) */
  if (mod.pdf && /^https?:/i.test(location.protocol)) {
    fetch(mod.pdf, { method: "HEAD", cache: "no-store" })
      .then((response) => {
        if (response.ok) return;
        document.getElementById("pdfWrap").innerHTML = `
          <div class="empty">
            <div class="empty-icon" aria-hidden="true">⚠</div>
            <h3>PDF not found</h3>
            <p>The study material for this module could not be loaded. It may have been moved or renamed.</p>
          </div>`;
      })
      .catch(() => { /* cannot verify - keep the preview */ });
  }

  /* subject indicator / switcher (switching goes to the modules list) */
  mountSubjectSwitcher(document.getElementById("subjectHolder"), { href: "modules.html" });
})();
