/* =====================================================================
   admin-pages.js  -  Page-specific Edit Mode enhancers + always-on
   additive panels (module materials list, blob hydration).

   ADDITIVE ONLY:
     - registers per-page enhancers with MBUAdmin (they run ONLY while
       Edit Mode is ON and are re-run whenever the page re-renders)
     - two always-on enhancements that normal users benefit from:
         1) "Additional Materials" panel on module.html (empty + hidden
            while no materials exist and Edit Mode is off)
         2) mbu-blob: URL hydration after every render
   Nothing existing is replaced; every injected control carries .adm-ui
   and is hidden by css/admin.css while Edit Mode is off.
   ===================================================================== */
(function () {
  "use strict";

  const LETTERS = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const escv = (v) => window.esc(String(v == null ? "" : v));
  const page = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  const param = (k) => new URLSearchParams(window.location.search).get(k);

  /* ---------------- editable data access (subject scoped) ----------------
     A page always works inside ONE subject, so every list / find / edit
     operation below is scoped to the currently selected subject (see
     resolveSubjectId in common.js).  This keeps modules and experiments
     from two different subjects from ever mixing, while the storage stays
     a single flat array (no schema change, nothing else moves). */
  function currentSubjectId() {
    return (typeof window.resolveSubjectId === "function") ? window.resolveSubjectId() : "";
  }

  function allExpConfigs() {
    const s = window.MBUData ? window.MBUData.getState() : {};
    return Array.isArray(s.experimentConfigs) ? s.experimentConfigs : [];
  }
  function expConfigs() {
    const sid = currentSubjectId();
    const all = allExpConfigs();
    return sid ? all.filter((c) => c.subjectId === sid) : all;
  }
  function findExpCfg(id) {
    const sid = currentSubjectId();
    const all = allExpConfigs();
    const hit = all.find((c) => Number(c.id) === Number(id) && (!sid || c.subjectId === sid));
    if (hit) return hit;
    if (param("subject") && window.getSubjectById && window.getSubjectById(param("subject"))) return undefined;
    return all.find((c) => Number(c.id) === Number(id));
  }

  /* Runs `fn` over a subject-scoped copy and writes the result back in
     place, so a subject's entries stay together and every other subject
     is left completely untouched. */
  function scopedUpdate(kind, fn) {
    return window.MBUAdmin.updateConfigs(kind, (full) => {
      const sid = currentSubjectId();
      if (!sid) { fn(full); return; }
      const indices = [];
      const scoped = [];
      full.forEach((c, i) => { if (c.subjectId === sid) { indices.push(i); scoped.push(c); } });
      fn(scoped);
      for (let k = full.length - 1; k >= 0; k--) {
        if (full[k].subjectId === sid) full.splice(k, 1);
      }
      const at = indices.length ? Math.min(indices[0], full.length) : full.length;
      const merged = scoped.map((c) => { if (!c.subjectId) c.subjectId = sid; return c; });
      full.splice.apply(full, [at, 0].concat(merged));
    });
  }
  function updateExp(fn) { return scopedUpdate("experimentConfigs", fn); }

  function allModConfigs() {
    const s = window.MBUData ? window.MBUData.getState() : {};
    return Array.isArray(s.moduleConfigs) ? s.moduleConfigs : [];
  }
  function modConfigs() {
    const sid = currentSubjectId();
    const all = allModConfigs();
    return sid ? all.filter((c) => c.subjectId === sid) : all;
  }
  function findModCfg(id) {
    const sid = currentSubjectId();
    const all = allModConfigs();
    const hit = all.find((c) => Number(c.id) === Number(id) && (!sid || c.subjectId === sid));
    if (hit) return hit;
    if (param("subject") && window.getSubjectById && window.getSubjectById(param("subject"))) return undefined;
    return all.find((c) => Number(c.id) === Number(id));
  }
  function updateMod(fn) { return scopedUpdate("moduleConfigs", fn); }

  /* Move an item up/down inside a nested array (materials / files) and
     refresh the page.  `findFn` is findModCfg or findExpCfg. */
  function reorderList(updateFn, findFn, cfgId, key, index, dir) {
    const cfg = findFn(cfgId);
    const arr = (cfg && Array.isArray(cfg[key])) ? cfg[key] : [];
    const j = index + dir;
    if (j < 0 || j >= arr.length) {
      window.MBUAdmin.toast("Already at the " + (dir < 0 ? "top" : "bottom"));
      return;
    }
    updateFn((list) => {
      const c = list.find((x) => Number(x.id) === Number(cfgId));
      if (!c || !Array.isArray(c[key])) return;
      const t = c[key][index]; c[key][index] = c[key][j]; c[key][j] = t;
    });
    window.MBUAdmin.reloadKeepScroll();
  }

  /* Same reorder for files nested at sub-tuple index 7. */
  function reorderSubFiles(expId, idx, index, dir) {
    const cfg = findExpCfg(expId);
    const arr = (cfg && Array.isArray(cfg.subs) && cfg.subs[idx] && Array.isArray(cfg.subs[idx][7]))
      ? cfg.subs[idx][7] : [];
    const j = index + dir;
    if (j < 0 || j >= arr.length) {
      window.MBUAdmin.toast("Already at the " + (dir < 0 ? "top" : "bottom"));
      return;
    }
    updateSubFiles(expId, idx, (a) => { const t = a[index]; a[index] = a[j]; a[j] = t; });
    window.MBUAdmin.reloadKeepScroll();
  }

  /* ---------------- tiny UI factories ---------------- */
  function mini(label, title, onClick, danger) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "adm-mini adm-ui" + (danger ? " danger" : "");
    b.textContent = label;
    b.title = title;
    b.setAttribute("aria-label", title);
    b.addEventListener("click", onClick);
    return b;
  }

  function barBtn(label, title, onClick, danger) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = danger ? "btn btn-adm-danger adm-ui" : "btn btn-ghost adm-ui";
    b.textContent = label;
    b.title = title || label;
    b.addEventListener("click", onClick);
    return b;
  }

  function makeBar(id, labelText) {
    const bar = document.createElement("div");
    bar.className = "adm-bar adm-ui";
    bar.id = id;
    if (labelText) {
      const span = document.createElement("span");
      span.className = "adm-bar-label";
      span.textContent = labelText;
      bar.appendChild(span);
    }
    return bar;
  }

  function pickFile(accept) {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      /* No default filter: the OS file explorer shows every file type so
         any file (PDF, PPT/PPTX, DOC, XLS, ZIP, notebook, image, …) can be
         picked directly. Callers may still pass a narrower `accept`. */
      input.accept = accept || "";
      input.style.display = "none";
      document.body.appendChild(input); /* detached inputs are unreliable in Chrome */
      input.addEventListener("change", () => {
        const file = input.files && input.files[0] ? input.files[0] : null;
        if (input.parentNode) input.parentNode.removeChild(input);
        resolve(file);
      });
      input.click();
    });
  }

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  function extOf(name) {
    const m = String(name || "").match(/\.([a-z0-9]+)$/i);
    return m ? m[1].toLowerCase() : "";
  }

  function stepsToLines(s) {
    return Array.isArray(s)
      ? s.slice()
      : String(s || "").split("|").map((t) => t.trim()).filter(Boolean);
  }

  /* ---------------- default content for new entries ---------------- */
  function defaultSubTuple(cfgId, name) {
    return [
      name,
      'To understand and practise "' + name + '" and record the output.',
      'Explain the concept behind "' + name + '" so another student can follow your work.',
      [
        "Read the aim and the problem statement",
        "Prepare the dataset or input values",
        "Write the code for this sub-experiment",
        "Run the code and capture the output",
        "Record the observations and the conclusion"
      ].join("|"),
      "# " + name + "\n# Add your code here\nprint(\"" + name + "\")",
      name + " - output recorded successfully.",
      'Explain what the result of "' + name + '" shows and whether it matched the expectation.'
    ];
  }

  function newExperimentCfg(id, name, description) {
    return {
      id: id,
      name: name,
      topic: name,
      tools: ["Python 3", "Jupyter Notebook"],
      description: description,
      overview: description,
      aim: 'To complete the experiment "' + name + '" and record the results.',
      problem: "Describe the problem that this experiment solves.",
      dataset: {
        name: "To be specified", source: "To be specified", records: "To be specified",
        features: "To be specified", types: "To be specified"
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
      subs: [defaultSubTuple(id, name + " - Main Task")],
      files: []
    };
  }

  function nextExpId() {
    let max = 0;
    expConfigs().forEach((c) => {
      const n = Number(c.id);
      if (!Number.isNaN(n) && n > max) max = n;
    });
    return String(max + 1).padStart(2, "0");
  }

  /* ---------------- generic field helpers ---------------- */
  function textSpec(id, key, label) {
    return {
      label: label,
      kind: "text",
      get: () => {
        const c = findExpCfg(id);
        return c ? String(c[key] == null ? "" : c[key]) : "";
      },
      set: (v) => updateExp((list) => {
        const c = list.find((x) => Number(x.id) === Number(id));
        if (c) c[key] = v;
      }),
      render: (v) => escv(v)
    };
  }

  function modTextSpec(id, key, label) {
    return {
      label: label,
      kind: "text",
      get: () => {
        const c = findModCfg(id);
        return c ? String(c[key] == null ? "" : c[key]) : "";
      },
      set: (v) => updateMod((list) => {
        const c = list.find((x) => Number(x.id) === Number(id));
        if (c) c[key] = v;
      }),
      render: (v) => escv(v)
    };
  }

  function lineSpec(id, key, label, getLines, renderLines) {
    return {
      label: label,
      kind: "lines",
      get: getLines,
      set: (lines) => updateExp((list) => {
        const c = list.find((x) => Number(x.id) === Number(id));
        if (c) c[key] = lines;
      }),
      render: renderLines
    };
  }

  function modLineSpec(id, key, label, getLines, parseLines, renderLines) {
    return {
      label: label,
      kind: "lines",
      get: getLines,
      set: (lines) => updateMod((list) => {
        const c = list.find((x) => Number(x.id) === Number(id));
        if (c) c[key] = parseLines(lines);
      }),
      render: renderLines
    };
  }

  /* =================================================================
     ALWAYS-ON enhancement 1: blob URL hydration (runs on every page
     that loads this file, after each render)
     ================================================================= */
  function hydrateBlobs() {
    if (window.MBUFiles && typeof window.MBUFiles.hydrate === "function") {
      window.MBUFiles.hydrate(document);
    }
  }

  /* =================================================================
     ALWAYS-ON enhancement 2: "Additional Materials" panel on
     module.html (uses fileviewer.js fileRowHtml for the same look as
     Experiment Files; hidden for normal users while empty)
     ================================================================= */
  function materialRowSig(list) {
    return list.map((m) => m.name + "\u0001" + m.url).join("\u0001");
  }

  function enhanceModuleMaterials() {
    if (page !== "module.html") return;
    if (!window.MBUFiles || typeof window.fileRowHtml !== "function") return;
    const app = document.getElementById("app");
    if (!app) return;
    const cfg = findModCfg(param("id"));
    if (!cfg) return;
    const materials = Array.isArray(cfg.materials) ? cfg.materials : [];
    const isAdmin = Boolean(window.MBUAdmin && window.MBUAdmin.isActive());
    const sig = materialRowSig(materials);

    let section = document.getElementById("materials");
    /* normal users: never show an empty panel (site must look untouched) */
    if (!isAdmin && !materials.length) {
      if (section) section.remove();
      return;
    }
    if (!section) {
      section = document.createElement("section");
      section.className = "panel";
      section.id = "materials";
      /* number it after the last numbered panel */
      let lastNo = 0;
      $$("#app section.panel .num").forEach((n) => {
        const v = Number(n.textContent);
        if (!Number.isNaN(v) && v > lastNo) lastNo = v;
      });
      section.innerHTML =
        '<h2><span class="num">' + (lastNo + 1) + '</span>Additional Materials</h2>' +
        '<p class="muted" style="margin-bottom:14px">Extra handouts, slides and links for this module.</p>' +
        '<div class="file-list"></div>';
      const study = document.getElementById("study-material");
      if (study && study.nextSibling) app.insertBefore(section, study.nextSibling);
      else app.appendChild(section);
    }

    const list = section.querySelector(".file-list");
    if (!list) return;

    if (list.dataset.sig !== sig) {
      list.dataset.sig = sig;
      list.innerHTML = materials.length
        ? materials.map((m, i) => window.fileRowHtml(m, i)).join("")
        : '<p class="muted">No extra materials yet for this module.</p>';
      /* wire the shared viewer buttons (same as experiment.js does) */
      $$("[data-view-file]", list).forEach((button) => {
        button.addEventListener("click", () => {
          const i = Number(button.dataset.viewFile);
          if (window.openFileViewer) window.openFileViewer(materials[i]);
        });
      });
      hydrateBlobs();
    }

    /* Edit Mode: manage bar + per-row edit/remove */
    if (isAdmin) {
      if (!document.getElementById("admMatBar")) {
        const bar = makeBar("admMatBar", "Materials");
        bar.appendChild(barBtn("+ Upload file", "Upload a file as module material", () => {
          pickFile().then((file) => {
            if (!file) return;
            if (!window.MBUFiles) { window.MBUAdmin.toast("Uploads need the local server (http://)."); return; }
            window.MBUFiles.put(file).then((rec) => {
              updateMod((list2) => {
                const c = list2.find((x) => Number(x.id) === Number(cfg.id));
                if (!c) return;
                if (!Array.isArray(c.materials)) c.materials = [];
                c.materials.push({
                  name: rec.name,
                  type: extOf(rec.name),
                  url: rec.url,
                  size: window.MBUFiles.humanSize(rec.size),
                  date: todayStr()
                });
              });
              window.MBUAdmin.toast("File added to module materials");
              window.MBUAdmin.reloadKeepScroll();
            }).catch(() => window.MBUAdmin.toast("Upload failed (browser storage unavailable)."));
          });
        }));
        bar.appendChild(barBtn("+ Add link", "Add a URL as module material", () => {
          window.MBUAdmin.prompt("Add material link", [
            { key: "name", label: "Display name", required: true, placeholder: "Lecture slides" },
            { key: "url", label: "URL", required: true, placeholder: "https://..." }
          ]).then((vals) => {
            if (!vals) return;
            updateMod((list2) => {
              const c = list2.find((x) => Number(x.id) === Number(cfg.id));
              if (!c) return;
              if (!Array.isArray(c.materials)) c.materials = [];
              c.materials.push({
                name: vals.name, type: extOf(vals.url), url: vals.url,
                size: "", date: todayStr()
              });
            });
            window.MBUAdmin.toast("Link added to module materials");
            window.MBUAdmin.reloadKeepScroll();
          });
        }));
        section.insertBefore(bar, list);
      }
      $$(".file-row", list).forEach((row, i) => {
        if (row.dataset.admRow) return;
        row.dataset.admRow = "1";
        const actions = row.querySelector(".file-actions");
        if (!actions) return;
        actions.appendChild(mini("\u2191", "Move material up", () => reorderList(updateMod, findModCfg, cfg.id, "materials", i, -1)));
        actions.appendChild(mini("\u2193", "Move material down", () => reorderList(updateMod, findModCfg, cfg.id, "materials", i, 1)));
        actions.appendChild(mini("\u270E", "Edit material details", () => {
          const m = materials[i];
          if (!m) return;
          window.MBUAdmin.prompt("Edit material", [
            { key: "name", label: "File name", value: m.name },
            { key: "url", label: "Address (file path or URL)", value: m.url },
            { key: "size", label: "Size", value: m.size },
            { key: "date", label: "Date", value: m.date }
          ]).then((vals) => {
            if (!vals) return;
            updateMod((list2) => {
              const c = list2.find((x) => Number(x.id) === Number(cfg.id));
              if (c && c.materials && c.materials[i]) Object.assign(c.materials[i], vals);
            });
            window.MBUAdmin.reloadKeepScroll();
          });
        }));
        actions.appendChild(mini("\u2715", "Remove this material", () => {
          const m = materials[i];
          if (!m) return;
          window.MBUAdmin.confirm(
            'Are you sure you want to remove "' + m.name + '" from this module? This cannot be undone.',
            { okLabel: "Delete" }
          ).then((ok) => {
            if (!ok) return;
            updateMod((list2) => {
              const c = list2.find((x) => Number(x.id) === Number(cfg.id));
              if (c && Array.isArray(c.materials)) c.materials.splice(i, 1);
            });
            if (window.MBUFiles && window.MBUFiles.isBlobUrl(m.url)) {
              window.MBUFiles.remove(m.url.slice(window.MBUFiles.PREFIX.length));
            }
            window.MBUAdmin.toast("Material removed");
            window.MBUAdmin.reloadKeepScroll();
          });
        }, true));
      });
    }
  }

  /* =================================================================
     ADMIN ENHANCER: experiments.html (list page)
     ================================================================= */
  function admExperimentsPage() {
    const grid = document.getElementById("grid");
    if (!grid) return;

    /* top action bar */
    if (!document.getElementById("admExpBar")) {
      const bar = makeBar("admExpBar", "Edit Mode");
      bar.appendChild(barBtn("+ Add experiment", "Add a new experiment", addExperiment));
      grid.parentNode.insertBefore(bar, grid);
    }

    /* per-card controls */
    $$("#grid .card[data-id]").forEach((card) => {
      if (card.dataset.admCard) return;
      const id = card.dataset.id;
      const cfg = findExpCfg(id);
      if (!cfg) return; /* custom experiments keep their existing Remove button */
      card.dataset.admCard = "1";
      const row = document.createElement("div");
      row.className = "adm-actions adm-ui";
      row.appendChild(mini("\u2191", "Move experiment up", () => moveExperiment(id, -1)));
      row.appendChild(mini("\u2193", "Move experiment down", () => moveExperiment(id, 1)));
      row.appendChild(mini("\u270E Edit", "Edit experiment details", () => editExperimentCard(id, card)));
      row.appendChild(mini("\u2715 Delete", "Delete experiment", () => deleteExperiment(id), true));
      const actions = card.querySelector(".card-actions");
      if (actions) actions.parentNode.insertBefore(row, actions);
      else card.appendChild(row);
    });
  }

  function addExperiment() {
    window.MBUAdmin.prompt("Add experiment", [
      { key: "name", label: "Experiment name", required: true, placeholder: "Machine Learning Basics" },
      { key: "description", label: "Short description", type: "textarea", required: true,
        placeholder: "What this experiment teaches..." }
    ], { okLabel: "Add experiment" }).then((vals) => {
      if (!vals) return;
      const id = nextExpId();
      updateExp((list) => list.push(newExperimentCfg(id, vals.name.trim(), vals.description.trim())));
      window.MBUAdmin.toast("Experiment " + id + " added");
      window.MBUAdmin.reloadKeepScroll();
    });
  }

  function editExperimentCard(id, card) {
    const cfg = findExpCfg(id);
    if (!cfg) return;
    window.MBUAdmin.prompt("Edit experiment " + pad2(Number(id)), [
      { key: "name", label: "Experiment name", value: cfg.name, required: true },
      { key: "description", label: "Short description", type: "textarea", value: cfg.description },
      { key: "topic", label: "Topic / keywords", value: cfg.topic },
      { key: "tools", label: "Tools (comma separated)", value: (cfg.tools || []).join(", ") }
    ]).then((vals) => {
      if (!vals) return;
      updateExp((list) => {
        const c = list.find((x) => Number(x.id) === Number(id));
        if (!c) return;
        c.name = vals.name.trim() || c.name;
        c.description = vals.description;
        c.topic = vals.topic;
        c.tools = vals.tools.split(",").map((t) => t.trim()).filter(Boolean);
      });
      const h3 = card.querySelector("h3");
      const desc = card.querySelector("p.desc");
      if (h3) h3.textContent = findExpCfg(id).name;
      if (desc) desc.textContent = findExpCfg(id).description;
      window.MBUAdmin.toast("\u2713 Experiment details saved");
    });
  }

  function deleteExperiment(id) {
    const cfg = findExpCfg(id);
    if (!cfg) return;
    window.MBUAdmin.confirm(
      'Are you sure you want to delete experiment ' + pad2(Number(id)) + ' "' + cfg.name +
      '" and all of its sub-experiments? This cannot be undone.',
      { okLabel: "Delete", title: "Delete experiment" }
    ).then((ok) => {
      if (!ok) return;
      updateExp((list) => {
        const i = list.findIndex((x) => Number(x.id) === Number(id));
        if (i >= 0) list.splice(i, 1);
      });
      window.MBUAdmin.toast("Experiment deleted");
      window.MBUAdmin.reloadKeepScroll();
    });
  }

  function moveExperiment(id, dir) {
    const cfgs = expConfigs();
    const i = cfgs.findIndex((c) => Number(c.id) === Number(id));
    const j = i + dir;
    if (i < 0 || j < 0 || j >= cfgs.length) {
      window.MBUAdmin.toast("Already at the " + (dir < 0 ? "top" : "bottom"));
      return;
    }
    window.MBUAdmin.confirm(
      "Move experiment " + pad2(Number(id)) + " " + (dir < 0 ? "up" : "down") +
      "? Experiment IDs are renumbered so the new order is kept; all content stays untouched.",
      { okLabel: "Reorder", title: "Reorder experiments" }
    ).then((ok) => {
      if (!ok) return;
      updateExp((list) => {
        const a = list.findIndex((x) => Number(x.id) === Number(id));
        const b = a + dir;
        if (a < 0 || b < 0 || b >= list.length) return;
        const tmp = list[a]; list[a] = list[b]; list[b] = tmp;
        list.forEach((c, idx) => { c.id = String(idx + 1).padStart(2, "0"); });
      });
      window.MBUAdmin.toast("Order updated");
      window.MBUAdmin.reloadKeepScroll();
    });
  }

  /* =================================================================
     ADMIN ENHANCER: experiment.html (detail page)
     ================================================================= */
  function admExperimentPage() {
    const app = document.getElementById("app");
    if (!app) return;
    const id = param("id");
    const cfg = findExpCfg(id);
    if (!cfg) return; /* not an editable config entry */

    /* top bar: delete this experiment */
    if (!document.getElementById("admExpTop")) {
      const bar = makeBar("admExpTop", "Edit Mode");
      bar.appendChild(barBtn("\u2715 Delete experiment",
        "Delete this experiment permanently", () => deleteExperiment(id), true));
      const back = app.querySelector(".back-link");
      if (back && back.nextSibling) app.insertBefore(bar, back.nextSibling);
      else app.insertBefore(app.firstChild);
    }

    /* title + plain text sections */
    const hero = app.querySelector(".page-hero");
    const title = document.getElementById("expTitle");
    if (hero && title) window.MBUAdmin.bindEdit(hero, title, textSpec(id, "name", "Experiment title"));

    [["overview", "Experiment overview"], ["aim", "Aim"], ["problem", "Problem statement"],
     ["analysis", "Analysis"], ["results", "Results"]].forEach(([panelId, label]) => {
      const panel = document.getElementById(panelId);
      if (!panel) return;
      window.MBUAdmin.bindEdit(panel.querySelector("h2"), panel.querySelector("p"),
        textSpec(id, panelId === "problem" ? "problem" : panelId, label));
    });

    /* dataset: form dialog + in-place table update */
    const dsPanel = document.getElementById("dataset");
    if (dsPanel && !dsPanel.dataset.admBound) {
      dsPanel.dataset.admBound = "1";
      const h2 = dsPanel.querySelector("h2");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "adm-edit-btn adm-ui";
      btn.textContent = "\u270E Edit";
      btn.setAttribute("aria-label", "Edit dataset");
      btn.addEventListener("click", () => {
        const c = findExpCfg(id);
        const d = (c && c.dataset) || {};
        window.MBUAdmin.prompt("Edit dataset", [
          { key: "name", label: "Dataset name", value: d.name },
          { key: "source", label: "Dataset source", value: d.source },
          { key: "records", label: "Number of records", value: d.records },
          { key: "features", label: "Features", value: d.features },
          { key: "types", label: "Data types", value: d.types }
        ]).then((vals) => {
          if (!vals) return;
          updateExp((list) => {
            const cc = list.find((x) => Number(x.id) === Number(id));
            if (cc) cc.dataset = {
              name: vals.name, source: vals.source, records: vals.records,
              features: vals.features, types: vals.types
            };
          });
          const tds = dsPanel.querySelectorAll("tbody td");
          [vals.name, vals.source, vals.records, vals.features, vals.types]
            .forEach((v, i) => { if (tds[i]) tds[i].textContent = v; });
          window.MBUAdmin.toast("\u2713 Dataset saved");
        });
      });
      if (h2) h2.appendChild(btn);
    }

    /* methodology (list) */
    const methodPanel = document.getElementById("methodology");
    if (methodPanel) {
      window.MBUAdmin.bindEdit(methodPanel.querySelector("h2"), methodPanel.querySelector("ol"),
        lineSpec(id, "methodology", "Methodology",
          () => {
            const c = findExpCfg(id);
            return Array.isArray(c && c.methodology) ? c.methodology.slice() : [];
          },
          (v) => v.map((m) => "<li><span>" + escv(m) + "</span></li>").join("")));
    }

    /* architecture (list) */
    const archPanel = document.getElementById("architecture");
    if (archPanel) {
      window.MBUAdmin.bindEdit(archPanel.querySelector("h2"), archPanel.querySelector(".arch"),
        lineSpec(id, "architecture", "Architecture",
          () => {
            const c = findExpCfg(id);
            return Array.isArray(c && c.architecture) ? c.architecture.slice() : [];
          },
          (v) => v.map((step, i) => {
            const arrow = i < v.length - 1 ? '<div class="arch-arrow" aria-hidden="true"></div>' : "";
            return '<div class="arch-node" style="--i:' + i + '"><small>STEP ' + (i + 1) +
              "</small>" + escv(step) + "</div>" + arrow;
          }).join("")));
    }

    /* sub-experiment management list */
    const subPanel = document.getElementById("subexperiments");
    if (subPanel) {
      const grid = subPanel.querySelector(".sub-grid");
      if (grid && !document.getElementById("admSubBar")) {
        const bar = makeBar("admSubBar", "Sub-experiments");
        bar.appendChild(barBtn("+ Add sub-experiment", "Add a sub-experiment", () => addSub(id)));
        const list = document.createElement("div");
        list.className = "adm-list";
        list.id = "admSubList";
        grid.parentNode.insertBefore(bar, grid.nextSibling);
        bar.parentNode.insertBefore(list, bar.nextSibling);
      }
      const listEl = document.getElementById("admSubList");
      if (listEl) {
        const c = findExpCfg(id);
        const subs = (c && Array.isArray(c.subs)) ? c.subs : [];
        const sig = subs.map((s, i) => pad2(Number(c.id)) + LETTERS[i] + s[0]).join("\u0001");
        if (listEl.dataset.sig !== sig) {
          listEl.dataset.sig = sig;
          listEl.innerHTML = "";
          subs.forEach((s, i) => {
            const row = document.createElement("div");
            row.className = "adm-list-row";
            row.innerHTML = '<span class="adm-row-id">' + escv(pad2(Number(c.id)) + LETTERS[i]) +
              '</span><span class="adm-row-name">' + escv(s[0]) + "</span>";
            row.appendChild(mini("\u2191", "Move sub-experiment up", () => moveSub(id, i, -1)));
            row.appendChild(mini("\u2193", "Move sub-experiment down", () => moveSub(id, i, 1)));
            row.appendChild(mini("\u270E Rename", "Rename sub-experiment", () => renameSub(id, i)));
            row.appendChild(mini("\u2715", "Delete sub-experiment", () => deleteSub(id, i), true));
            listEl.appendChild(row);
          });
        }
      }
    }

    /* experiment files / materials */
    enhanceExperimentFiles(id);
  }

  function enhanceExperimentFiles(id) {
    const app = document.getElementById("app");
    const cfg = findExpCfg(id);
    if (!cfg) return;
    const files = Array.isArray(cfg.files) ? cfg.files : [];
    let panel = document.getElementById("files");

    if (!panel) {
      if (files.length) return; /* experiment.js renders it when files exist */
      /* admin-only empty panel so materials can be added */
      panel = document.createElement("section");
      panel.className = "panel adm-ui";
      panel.id = "files";
      panel.innerHTML =
        '<h2><span class="num">10</span>Experiment Files</h2>' +
        '<p class="muted" style="margin-bottom:14px">Notes, presentations and other material for this experiment.</p>' +
        '<div class="file-list"></div>';
      app.appendChild(panel);
    }

    const list = panel.querySelector(".file-list");
    if (list && !document.getElementById("admFileBar")) {
      const bar = makeBar("admFileBar", "Materials");
      bar.appendChild(barBtn("+ Upload file", "Upload a file for this experiment", () => {
        pickFile().then((file) => {
          if (!file) return;
          if (!window.MBUFiles) { window.MBUAdmin.toast("Uploads need the local server (http://)."); return; }
          window.MBUFiles.put(file).then((rec) => {
            updateExp((list2) => {
              const c = list2.find((x) => Number(x.id) === Number(id));
              if (!c) return;
              if (!Array.isArray(c.files)) c.files = [];
              c.files.push({
                name: rec.name, type: extOf(rec.name), url: rec.url,
                size: window.MBUFiles.humanSize(rec.size), date: todayStr()
              });
            });
            window.MBUAdmin.toast("File added to experiment materials");
            window.MBUAdmin.reloadKeepScroll();
          }).catch(() => window.MBUAdmin.toast("Upload failed (browser storage unavailable)."));
        });
      }));
      bar.appendChild(barBtn("+ Add link", "Add a URL as a material", () => {
        window.MBUAdmin.prompt("Add material link", [
          { key: "name", label: "Display name", required: true, placeholder: "Dataset CSV" },
          { key: "url", label: "URL", required: true, placeholder: "https://..." }
        ]).then((vals) => {
          if (!vals) return;
          updateExp((list2) => {
            const c = list2.find((x) => Number(x.id) === Number(id));
            if (!c) return;
            if (!Array.isArray(c.files)) c.files = [];
            c.files.push({ name: vals.name, type: extOf(vals.url), url: vals.url, size: "", date: todayStr() });
          });
          window.MBUAdmin.toast("Link added");
          window.MBUAdmin.reloadKeepScroll();
        });
      }));
      panel.insertBefore(bar, list);
    }

    if (list) {
      $$(".file-row", list).forEach((row, i) => {
        if (row.dataset.admRow) return;
        row.dataset.admRow = "1";
        const actions = row.querySelector(".file-actions");
        if (!actions) return;
        actions.appendChild(mini("\u2191", "Move file up", () => reorderList(updateExp, findExpCfg, id, "files", i, -1)));
        actions.appendChild(mini("\u2193", "Move file down", () => reorderList(updateExp, findExpCfg, id, "files", i, 1)));
        actions.appendChild(mini("\u270E", "Edit file details", () => {
          const f = files[i];
          if (!f) return;
          window.MBUAdmin.prompt("Edit material", [
            { key: "name", label: "File name", value: f.name },
            { key: "url", label: "Address (file path or URL)", value: f.url },
            { key: "size", label: "Size", value: f.size },
            { key: "date", label: "Date", value: f.date }
          ]).then((vals) => {
            if (!vals) return;
            updateExp((list2) => {
              const c = list2.find((x) => Number(x.id) === Number(id));
              if (c && Array.isArray(c.files) && c.files[i]) Object.assign(c.files[i], vals);
            });
            window.MBUAdmin.reloadKeepScroll();
          });
        }));
        actions.appendChild(mini("\u2715", "Remove this file", () => {
          const f = files[i];
          if (!f) return;
          window.MBUAdmin.confirm(
            'Are you sure you want to remove "' + f.name + '" from this experiment? This cannot be undone.',
            { okLabel: "Delete" }
          ).then((ok) => {
            if (!ok) return;
            updateExp((list2) => {
              const c = list2.find((x) => Number(x.id) === Number(id));
              if (c && Array.isArray(c.files)) c.files.splice(i, 1);
            });
            if (window.MBUFiles && window.MBUFiles.isBlobUrl(f.url)) {
              window.MBUFiles.remove(f.url.slice(window.MBUFiles.PREFIX.length));
            }
            window.MBUAdmin.toast("File removed");
            window.MBUAdmin.reloadKeepScroll();
          });
        }, true));
      });
    }
  }

  /* =================================================================
     ADMIN ENHANCER: per-sub-experiment "Experiment Files" panel
     (works on subexperiment.html; files live at index 7 of the sub
     tuple so they survive renames / reorders / edits)
     ================================================================= */
  function updateSubFiles(expId, idx, fn) {
    updateExp((list) => {
      const c = list.find((x) => Number(x.id) === Number(expId));
      if (!c || !Array.isArray(c.subs) || !c.subs[idx]) return;
      if (!Array.isArray(c.subs[idx][7])) c.subs[idx][7] = [];
      fn(c.subs[idx][7]);
    });
  }

  function enhanceSubFiles(expId, idx) {
    const app = document.getElementById("app");
    const cfg = findExpCfg(expId);
    if (!app || !cfg || !Array.isArray(cfg.subs) || !cfg.subs[idx]) return;
    if (!window.MBUFiles || typeof window.fileRowHtml !== "function") return;

    const files = Array.isArray(cfg.subs[idx][7]) ? cfg.subs[idx][7] : [];
    let panel = document.getElementById("files");

    if (!panel) {
      if (files.length) return; /* subexperiment.js renders it when files exist */
      panel = document.createElement("section");
      panel.className = "panel adm-ui";
      panel.id = "files";
      panel.innerHTML =
        '<h2>Experiment Files</h2>' +
        '<p class="muted" style="margin-bottom:14px">Notes, presentations and other material for this sub-experiment.</p>' +
        '<div class="file-list"></div>';
      /* place it right after the Problem Statement (matches the public page) */
      const anchor = document.getElementById("problemStatement");
      const wrap = app.firstElementChild || app;
      if (anchor && anchor.parentNode) {
        anchor.parentNode.insertBefore(panel, anchor.nextSibling);
      } else {
        const navs = wrap.querySelectorAll(".subnav");
        const bottom = navs[navs.length - 1];
        if (bottom && bottom.parentNode) bottom.parentNode.insertBefore(panel, bottom);
        else wrap.appendChild(panel);
      }
    }

    const list = panel.querySelector(".file-list");
    if (!list) return;
    const sig = files.map((f) => f.name + "\u0001" + f.url).join("\u0001");
    if (list.dataset.sig !== sig) {
      list.dataset.sig = sig;
      list.innerHTML = files.length
        ? files.map((f, i) => window.fileRowHtml(f, i)).join("")
        : '<p class="muted">No files added yet for this sub-experiment.</p>';
      $$("[data-view-file]", list).forEach((button) => {
        button.addEventListener("click", () => {
          if (window.openFileViewer) window.openFileViewer(files[Number(button.dataset.viewFile)]);
        });
      });
      hydrateBlobs();
    }

    if (!document.getElementById("admSubFileBar")) {
      const bar = makeBar("admSubFileBar", "Files");
      bar.appendChild(barBtn("+ Upload file", "Upload a file for this sub-experiment", () => {
        pickFile().then((file) => {
          if (!file) return;
          if (!window.MBUFiles) { window.MBUAdmin.toast("Uploads need the local server (http://)."); return; }
          window.MBUFiles.put(file).then((rec) => {
            updateSubFiles(expId, idx, (arr) => arr.push({
              name: rec.name, type: extOf(rec.name), url: rec.url,
              size: window.MBUFiles.humanSize(rec.size), date: todayStr()
            }));
            window.MBUAdmin.toast("File added to sub-experiment");
            window.MBUAdmin.reloadKeepScroll();
          }).catch(() => window.MBUAdmin.toast("Upload failed (browser storage unavailable)."));
        });
      }));
      bar.appendChild(barBtn("+ Add link", "Add a URL as a file", () => {
        window.MBUAdmin.prompt("Add file link", [
          { key: "name", label: "Display name", required: true, placeholder: "Notes PDF" },
          { key: "url", label: "URL", required: true, placeholder: "https://..." }
        ]).then((vals) => {
          if (!vals) return;
          updateSubFiles(expId, idx, (arr) => arr.push({
            name: vals.name, type: extOf(vals.url), url: vals.url, size: "", date: todayStr()
          }));
          window.MBUAdmin.toast("Link added to sub-experiment");
          window.MBUAdmin.reloadKeepScroll();
        });
      }));
      panel.insertBefore(bar, list);
    }

    $$(".file-row", list).forEach((row, i) => {
      if (row.dataset.admRow) return;
      row.dataset.admRow = "1";
      const actions = row.querySelector(".file-actions");
      if (!actions) return;
      actions.appendChild(mini("\u2191", "Move file up", () => reorderSubFiles(expId, idx, i, -1)));
      actions.appendChild(mini("\u2193", "Move file down", () => reorderSubFiles(expId, idx, i, 1)));
      actions.appendChild(mini("\u270E", "Edit file details", () => {
        const f = files[i];
        if (!f) return;
        window.MBUAdmin.prompt("Edit file", [
          { key: "name", label: "File name", value: f.name },
          { key: "url", label: "Address (file path or URL)", value: f.url },
          { key: "size", label: "Size", value: f.size },
          { key: "date", label: "Date", value: f.date }
        ]).then((vals) => {
          if (!vals) return;
          updateSubFiles(expId, idx, (arr) => { if (arr[i]) Object.assign(arr[i], vals); });
          window.MBUAdmin.reloadKeepScroll();
        });
      }));
      actions.appendChild(mini("\u2715", "Remove this file", () => {
        const f = files[i];
        if (!f) return;
        window.MBUAdmin.confirm(
          'Are you sure you want to remove "' + f.name + '" from this sub-experiment? This cannot be undone.',
          { okLabel: "Delete" }
        ).then((ok) => {
          if (!ok) return;
          updateSubFiles(expId, idx, (arr) => arr.splice(i, 1));
          if (window.MBUFiles && window.MBUFiles.isBlobUrl(f.url)) {
            window.MBUFiles.remove(f.url.slice(window.MBUFiles.PREFIX.length));
          }
          window.MBUAdmin.toast("File removed");
          window.MBUAdmin.reloadKeepScroll();
        });
      }, true));
    });
  }

  /* ---------------- sub-experiment ops (shared) ---------------- */
  function addSub(expId) {
    const cfg = findExpCfg(expId);
    if (!cfg) return;
    window.MBUAdmin.prompt("Add sub-experiment to experiment " + pad2(Number(expId)), [
      { key: "name", label: "Sub-experiment name", required: true, placeholder: "Data Cleaning" }
    ], { okLabel: "Add sub-experiment" }).then((vals) => {
      if (!vals) return;
      updateExp((list) => {
        const c = list.find((x) => Number(x.id) === Number(expId));
        if (!c) return;
        if (!Array.isArray(c.subs)) c.subs = [];
        c.subs.push(defaultSubTuple(c.id, vals.name.trim()));
      });
      window.MBUAdmin.toast("Sub-experiment added");
      window.MBUAdmin.reloadKeepScroll();
    });
  }

  function deleteSub(expId, index) {
    const cfg = findExpCfg(expId);
    if (!cfg || !Array.isArray(cfg.subs)) return;
    if (cfg.subs.length <= 1) {
      window.MBUAdmin.toast("An experiment must keep at least one sub-experiment.");
      return;
    }
    const label = pad2(Number(expId)) + LETTERS[index];
    window.MBUAdmin.confirm(
      'Are you sure you want to delete sub-experiment ' + label + ' "' + cfg.subs[index][0] +
      '"? This cannot be undone.',
      { okLabel: "Delete", title: "Delete sub-experiment" }
    ).then((ok) => {
      if (!ok) return;
      updateExp((list) => {
        const c = list.find((x) => Number(x.id) === Number(expId));
        if (c && Array.isArray(c.subs)) c.subs.splice(index, 1);
      });
      window.MBUAdmin.toast("Sub-experiment deleted");
      window.MBUAdmin.reloadKeepScroll();
    });
  }

  function moveSub(expId, index, dir) {
    const cfg = findExpCfg(expId);
    if (!cfg || !Array.isArray(cfg.subs)) return;
    const j = index + dir;
    if (j < 0 || j >= cfg.subs.length) {
      window.MBUAdmin.toast("Already at the " + (dir < 0 ? "top" : "bottom"));
      return;
    }
    updateExp((list) => {
      const c = list.find((x) => Number(x.id) === Number(expId));
      if (!c || !Array.isArray(c.subs)) return;
      const a = index;
      const b = a + dir;
      if (a < 0 || b < 0 || b >= c.subs.length) return;
      const tmp = c.subs[a]; c.subs[a] = c.subs[b]; c.subs[b] = tmp;
    });
    /* keep the URL pointing at the sub-experiment that was moved
       (sub ids derive from their position: 1A, 1B, ...) */
    if (page === "subexperiment.html") {
      try {
        history.replaceState({},
          "",
          "?experiment=" + encodeURIComponent(expId) +
          "&sub=" + encodeURIComponent(Number(cfg.id) + LETTERS[j]));
      } catch (e) { /* some browsers block replaceState on file:// */ }
    }
    window.MBUAdmin.toast("Order updated");
    window.MBUAdmin.reloadKeepScroll();
  }

  function renameSub(expId, index) {
    const cfg = findExpCfg(expId);
    if (!cfg || !cfg.subs || !cfg.subs[index]) return;
    window.MBUAdmin.prompt("Rename sub-experiment " + pad2(Number(expId)) + LETTERS[index], [
      { key: "name", label: "Sub-experiment name", value: cfg.subs[index][0], required: true }
    ]).then((vals) => {
      if (!vals) return;
      updateExp((list) => {
        const c = list.find((x) => Number(x.id) === Number(expId));
        if (c && c.subs && c.subs[index]) c.subs[index][0] = vals.name.trim() || c.subs[index][0];
      });
      window.MBUAdmin.toast("\u2713 Renamed");
      window.MBUAdmin.reloadKeepScroll();
    });
  }

  /* =================================================================
     ADMIN ENHANCER: subexperiment.html
     ================================================================= */
  function admSubPage() {
    const app = document.getElementById("app");
    if (!app) return;
    const expId = param("experiment");
    const cfg = findExpCfg(expId);
    if (!cfg || !Array.isArray(cfg.subs) || !cfg.subs.length) return;

    const v = String(param("sub") || "").toUpperCase();
    let idx = cfg.subs.findIndex((s, i) => {
      const nid = String(Number(cfg.id) + LETTERS[i]).toUpperCase();
      const padded = pad2(Number(cfg.id)) + LETTERS[i];
      return nid === v || LETTERS[i] === v || padded.toUpperCase() === v;
    });
    if (idx < 0) idx = 0;
    const subs = cfg.subs;
    const subLabelStr = pad2(Number(cfg.id)) + LETTERS[idx];

    const saveSub = (pos, value) => updateExp((list) => {
      const c = list.find((x) => Number(x.id) === Number(expId));
      if (c && c.subs && c.subs[idx]) c.subs[idx][pos] = value;
    });

    /* hero title */
    const hero = app.querySelector(".page-hero");
    const title = document.getElementById("subTitle");
    if (hero && title) {
      window.MBUAdmin.bindEdit(hero, title, {
        label: "Sub-experiment name",
        kind: "text",
        get: () => String(subs[idx][0]),
        set: (val) => { saveSub(0, val); },
        render: (val) => escv(val)
      });
    }

    /* panel 6: code editor (separate modal) */
    $$("#app section.panel", app).forEach((panel) => {
      const numEl = panel.querySelector("h2 .num");
      if (!numEl) return;
      const n = Number(numEl.textContent);
      const h2 = panel.querySelector("h2");
      if (n === 1) {
        window.MBUAdmin.bindEdit(h2, panel.querySelector("p"),
          { label: "Experiment aim", kind: "text",
            get: () => String(subs[idx][1]), set: (val) => saveSub(1, val), render: (val) => escv(val) });
      } else if (n === 4) {
        window.MBUAdmin.bindEdit(h2, panel.querySelector("p"),
          { label: "Concept explanation", kind: "text",
            get: () => String(subs[idx][2]), set: (val) => saveSub(2, val), render: (val) => escv(val) });
      } else if (n === 5) {
        window.MBUAdmin.bindEdit(h2, panel.querySelector("ol.proc"),
          { label: "Procedure", kind: "lines",
            get: () => stepsToLines(subs[idx][3]),
            set: (lines) => saveSub(3, lines.join("|")),
            render: (lines) => lines.map((p, i) =>
              '<li><span class="step-no">' + pad2(i + 1) +
              '</span><span class="step-arrow" aria-hidden="true">\u2192</span><span>' +
              escv(p) + "</span></li>").join("") });
      } else if (n === 6) {
        const actions = panel.querySelector(".code-actions");
        if (actions && !actions.dataset.admBound) {
          actions.dataset.admBound = "1";
          const b = document.createElement("button");
          b.type = "button";
          b.className = "copy-btn adm-ui";
          b.textContent = "\u270E Edit Code";
          b.setAttribute("aria-label", "Edit this sub-experiment's code");
          b.addEventListener("click", () => {
            window.MBUAdmin.editCode(
              "Edit code \u2013 Experiment " + subLabelStr + ": " + subs[idx][0],
              String(subs[idx][4] == null ? "" : subs[idx][4])
            ).then((code) => {
              if (code === null || code === undefined) return;
              saveSub(4, code);
              window.MBUAdmin.toast("\u2713 Code saved");
              window.MBUAdmin.reloadKeepScroll();
            });
          });
          actions.appendChild(b);
        }
      } else if (n === 8) {
        window.MBUAdmin.bindEdit(h2, panel.querySelector(".out-wrap pre"),
          { label: "Result", kind: "text",
            get: () => String(subs[idx][5]), set: (val) => saveSub(5, val), render: (val) => escv(val) });
      } else if (n === 9) {
        window.MBUAdmin.bindEdit(h2, panel.querySelector("p"),
          { label: "Analysis", kind: "text",
            get: () => String(subs[idx][6]), set: (val) => saveSub(6, val), render: (val) => escv(val) });
      }
    });

    /* tab bar management strip */
    const tabs = app.querySelector(".tabs");
    if (tabs && !document.getElementById("admSubBar")) {
      const bar = makeBar("admSubBar", "Sub-experiments " + subLabelStr);
      bar.appendChild(barBtn("+ Add", "Add a sub-experiment", () => addSub(expId)));
      bar.appendChild(barBtn("\u2191 Move up", "Move this sub-experiment earlier", () => moveSub(expId, idx, -1)));
      bar.appendChild(barBtn("\u2193 Move down", "Move this sub-experiment later", () => moveSub(expId, idx, 1)));
      bar.appendChild(barBtn("\u270E Rename", "Rename this sub-experiment", () => renameSub(expId, idx)));
      bar.appendChild(barBtn("\u2715 Delete", "Delete this sub-experiment",
        () => deleteSub(expId, idx), true));
      tabs.parentNode.insertBefore(bar, tabs.nextSibling);
    }

    /* this sub-experiment's files / materials */
    enhanceSubFiles(expId, idx);
  }

  /* =================================================================
     ADMIN ENHANCER: modules.html (list page)
     ================================================================= */
  function admModulesPage() {
    const app = document.getElementById("app");
    if (!app) return;
    const grid = app.querySelector(".grid") || document.getElementById("subjectGrid");

    /* The bar is added even when the subject has no modules yet, so the
       empty state can still offer "+ Add module". */
    if (!document.getElementById("admModBar")) {
      const bar = makeBar("admModBar", "Edit Mode");
      bar.appendChild(barBtn("+ Add module", "Add a new module to this subject", addModule));
      if (grid && grid.parentNode) grid.parentNode.insertBefore(bar, grid);
      else {
        const hero = app.querySelector(".page-hero");
        if (hero && hero.parentNode) hero.parentNode.insertBefore(bar, hero.nextSibling);
        else app.insertBefore(bar, app.firstChild);
      }
    }

    if (!grid) return;
    $$(".card[data-id]", grid).forEach((card) => {
      if (card.dataset.admCard) return;
      const id = card.dataset.id;
      const cfg = findModCfg(id);
      if (!cfg) return;
      card.dataset.admCard = "1";
      const row = document.createElement("div");
      row.className = "adm-actions adm-ui";
      row.appendChild(mini("\u2191", "Move module up", () => moveModule(id, -1)));
      row.appendChild(mini("\u2193", "Move module down", () => moveModule(id, 1)));
      row.appendChild(mini("\u270E Edit", "Edit module title and summary", () => editModuleCard(id, card)));
      row.appendChild(mini("\u2715 Delete", "Delete module", () => deleteModule(id), true));
      const actions = card.querySelector(".card-actions");
      if (actions) actions.parentNode.insertBefore(row, actions);
      else card.appendChild(row);
    });
  }

  function addModule() {
    window.MBUAdmin.prompt("Add module", [
      { key: "title", label: "Module title", required: true, placeholder: "Data Visualisation" },
      { key: "summary", label: "One-line summary", type: "textarea", required: true,
        placeholder: "What this module covers..." }
    ], { okLabel: "Add module" }).then((vals) => {
      if (!vals) return;
      const sid = currentSubjectId();
      let next = 0;
      modConfigs().forEach((c) => { const n = Number(c.id); if (n > next) next = n; });
      updateMod((list) => list.push({
        id: next + 1,
        subjectId: sid,
        title: vals.title.trim(),
        summary: vals.summary.trim(),
        overview: vals.summary.trim(),
        topics: [], concepts: [], images: [], notes: [],
        pdf: "", pdfName: "", resources: [], materials: []
      }));
      const subjectName = (typeof window.getSubjectName === "function") ? window.getSubjectName(sid) : "";
      window.MBUAdmin.toast("Module " + (next + 1) + (subjectName ? " added to " + subjectName : " added"));
      window.MBUAdmin.reloadKeepScroll();
    });
  }

  function editModuleCard(id, card) {
    const cfg = findModCfg(id);
    if (!cfg) return;
    window.MBUAdmin.prompt("Edit module " + pad2(Number(id)), [
      { key: "title", label: "Module title", value: cfg.title, required: true },
      { key: "summary", label: "One-line summary", type: "textarea", value: cfg.summary }
    ]).then((vals) => {
      if (!vals) return;
      updateMod((list) => {
        const c = list.find((x) => Number(x.id) === Number(id));
        if (!c) return;
        c.title = vals.title.trim() || c.title;
        c.summary = vals.summary;
      });
      const h3 = card.querySelector("h3");
      const desc = card.querySelector("p.desc");
      if (h3) h3.textContent = findModCfg(id).title;
      if (desc) desc.textContent = findModCfg(id).summary;
      window.MBUAdmin.toast("\u2713 Module saved");
    });
  }

  function deleteModule(id) {
    const cfg = findModCfg(id);
    if (!cfg) return;
    window.MBUAdmin.confirm(
      'Are you sure you want to delete module ' + pad2(Number(id)) + ' "' + cfg.title +
      '"? This cannot be undone.',
      { okLabel: "Delete", title: "Delete module" }
    ).then((ok) => {
      if (!ok) return;
      updateMod((list) => {
        const i = list.findIndex((x) => Number(x.id) === Number(id));
        if (i >= 0) list.splice(i, 1);
      });
      window.MBUAdmin.toast("Module deleted");
      window.MBUAdmin.reloadKeepScroll();
    });
  }

  function moveModule(id, dir) {
    const cfgs = modConfigs();
    const i = cfgs.findIndex((c) => Number(c.id) === Number(id));
    const j = i + dir;
    if (i < 0 || j < 0 || j >= cfgs.length) {
      window.MBUAdmin.toast("Already at the " + (dir < 0 ? "top" : "bottom"));
      return;
    }
    window.MBUAdmin.confirm(
      "Move module " + pad2(Number(id)) + " " + (dir < 0 ? "up" : "down") +
      "? Module IDs are renumbered so the new order is kept; all content stays untouched.",
      { okLabel: "Reorder", title: "Reorder modules" }
    ).then((ok) => {
      if (!ok) return;
      updateMod((list) => {
        const a = list.findIndex((x) => Number(x.id) === Number(id));
        const b = a + dir;
        if (a < 0 || b < 0 || b >= list.length) return;
        const tmp = list[a]; list[a] = list[b]; list[b] = tmp;
        list.forEach((c, idx) => { c.id = idx + 1; });
      });
      window.MBUAdmin.toast("Order updated");
      window.MBUAdmin.reloadKeepScroll();
    });
  }

  /* =================================================================
     ADMIN ENHANCER: module.html (detail page)
     ================================================================= */
  function admModulePage() {
    const app = document.getElementById("app");
    if (!app) return;
    const id = param("id");
    const cfg = findModCfg(id);
    if (!cfg) return;

    /* top bar: delete + adds for sections that do not exist yet */
    if (!document.getElementById("admModTop")) {
      const bar = makeBar("admModTop", "Edit Mode");
      const fresh = (key) => !Array.isArray(cfg[key]) || cfg[key].length === 0;
      if (fresh("topics")) bar.appendChild(barBtn("+ Add topics", "Add topics", () => addLines(id, "topics", "Add topics")));
      if (fresh("concepts")) bar.appendChild(barBtn("+ Add concepts", "Add concepts", () => addConcepts(id)));
      if (fresh("images")) bar.appendChild(barBtn("+ Add diagrams", "Add diagrams", () => addImages(id)));
      if (fresh("notes")) bar.appendChild(barBtn("+ Add notes", "Add notes", () => addNotes(id)));
      if (fresh("resources")) bar.appendChild(barBtn("+ Add resources", "Add resources", () => addResources(id)));
      bar.appendChild(barBtn("\u2715 Delete module", "Delete this module permanently",
        () => deleteModule(id), true));
      const back = app.querySelector(".back-link");
      if (back && back.nextSibling) app.insertBefore(bar, back.nextSibling);
      else app.insertBefore(app.firstChild);
    }

    /* title + summary + overview */
    const hero = app.querySelector(".page-hero");
    const title = document.getElementById("moduleTitle");
    if (hero && title) window.MBUAdmin.bindEdit(hero, title, modTextSpec(id, "title", "Module title"));
    const lead = hero && hero.querySelector(".hero-lead");
    if (hero && lead) window.MBUAdmin.bindEdit(hero, lead, modTextSpec(id, "summary", "Module summary"));

    const overview = document.getElementById("overview");
    if (overview) {
      window.MBUAdmin.bindEdit(overview.querySelector("h2"), overview.querySelector("p"),
        modTextSpec(id, "overview", "Module overview"));
    }

    /* topics (list) */
    const topics = document.getElementById("topics");
    if (topics) {
      window.MBUAdmin.bindEdit(topics.querySelector("h2"), topics.querySelector("ol"),
        modLineSpec(id, "topics", "Topics",
          () => {
            const c = findModCfg(id);
            return Array.isArray(c && c.topics) ? c.topics.slice() : [];
          },
          (lines) => lines,
          (lines) => lines.map((t, i) =>
            '<li><span class="step-no">' + pad2(i + 1) + "</span><span>" + escv(t) + "</span></li>").join("")));
    }

    /* concepts (title :: text) */
    const concepts = document.getElementById("concepts");
    if (concepts) {
      window.MBUAdmin.bindEdit(concepts.querySelector("h2"), concepts.querySelector(".sub-grid"),
        modLineSpec(id, "concepts", "Concepts",
          () => {
            const c = findModCfg(id);
            return Array.isArray(c && c.concepts)
              ? c.concepts.map((x) => (x.title || "") + " :: " + (x.text || ""))
              : [];
          },
          (lines) => lines.map((l) => {
            const i = l.indexOf("::");
            return i < 0 ? { title: l, text: "" }
                         : { title: l.slice(0, i).trim(), text: l.slice(i + 2).trim() };
          }),
          (lines) => lines.map((l) => {
            const i = l.indexOf("::");
            const t = i < 0 ? l : l.slice(0, i).trim();
            const x = i < 0 ? "" : l.slice(i + 2).trim();
            return '<div class="sub-card"><strong>' + escv(t) + "</strong><span>" + escv(x) + "</span></div>";
          }).join("")));
    }

    /* notes */
    const notes = document.getElementById("notes");
    if (notes) {
      window.MBUAdmin.bindEdit(notes.querySelector("h2"), notes.querySelector("ul"),
        modLineSpec(id, "notes", "Notes",
          () => {
            const c = findModCfg(id);
            return Array.isArray(c && c.notes) ? c.notes.slice() : [];
          },
          (lines) => lines,
          (lines) => lines.map((t) => "<li>" + escv(t) + "</li>").join("")));
    }

    /* diagrams (src :: caption) - wrap the figures once so the editor
       never replaces the section (heading) itself */
    const diagrams = document.getElementById("diagrams");
    if (diagrams) {
      let figs = document.getElementById("diagramFigs");
      if (!figs) {
        figs = document.createElement("div");
        figs.id = "diagramFigs";
        const figures = Array.from(diagrams.querySelectorAll("figure.module-figure"));
        if (figures.length) {
          diagrams.insertBefore(figs, figures[0]);
          figures.forEach((f) => figs.appendChild(f));
        } else {
          diagrams.appendChild(figs);
        }
      }
      window.MBUAdmin.bindEdit(diagrams.querySelector("h2"), figs, {
          label: "Diagrams",
          kind: "lines",
          get: () => {
            const c = findModCfg(id);
            return Array.isArray(c && c.images)
              ? c.images.map((x) => (x.src || "") + " :: " + (x.caption || ""))
              : [];
          },
          set: (lines) => updateMod((list) => {
            const c = list.find((x) => Number(x.id) === Number(id));
            if (c) c.images = lines.map((l) => {
              const i = l.indexOf("::");
              return i < 0 ? { src: l, caption: "" }
                           : { src: l.slice(0, i).trim(), caption: l.slice(i + 2).trim() };
            });
          }),
          render: (lines) => lines.map((l) => {
            const i = l.indexOf("::");
            const src = i < 0 ? l : l.slice(0, i).trim();
            const cap = i < 0 ? "" : l.slice(i + 2).trim();
            return '<figure class="module-figure"><img src="' + escv(src) + '" alt="' + escv(cap || cfg.title) +
              '" loading="lazy" onerror="this.closest(\'figure\').classList.add(\'missing\')"><figcaption>' +
              escv(cap) + "</figcaption></figure>";
          }).join("")
        });
    }

    /* resources (label | url | desc) */
    const resources = document.getElementById("resources");
    if (resources) {
      window.MBUAdmin.bindEdit(resources.querySelector("h2"), resources.querySelector(".res-grid"),
        modLineSpec(id, "resources", "Resources",
          () => {
            const c = findModCfg(id);
            return Array.isArray(c && c.resources)
              ? c.resources.map((r) => [r.label, r.url, r.desc].filter((x) => x != null).join(" | "))
              : [];
          },
          (lines) => lines.map((l) => {
            const parts = l.split("|").map((s) => s.trim());
            return { label: parts[0] || "", url: parts[1] || "", desc: parts.slice(2).join("|").trim() };
          }),
          (lines) => lines.map((l) => {
            const parts = l.split("|").map((s) => s.trim());
            return '<a class="res-tile" href="' + escv(parts[1] || "#") + '" target="_blank" rel="noopener">' +
              '<span aria-hidden="true">\uD83D\uDD17</span><strong>' + escv(parts[0] || "") +
              "</strong><small>" + escv(parts.slice(2).join("|").trim()) + "</small></a>";
          }).join("")));
    }

    /* study material PDF: replace / URL / remove */
    const study = document.getElementById("study-material");
    if (study && !document.getElementById("admPdfBar")) {
      const bar = makeBar("admPdfBar", "Study material PDF");
      bar.appendChild(barBtn("+ Upload / Replace PDF", "Upload a PDF (or pick another file)", () => {
        pickFile(".pdf").then((file) => {
          if (!file) return;
          if (!window.MBUFiles) { window.MBUAdmin.toast("Uploads need the local server (http://)."); return; }
          window.MBUFiles.put(file).then((rec) => {
            updateMod((list) => {
              const c = list.find((x) => Number(x.id) === Number(id));
              if (c) { c.pdf = rec.url; c.pdfName = rec.name; }
            });
            window.MBUAdmin.toast("PDF replaced");
            window.MBUAdmin.reloadKeepScroll();
          }).catch(() => window.MBUAdmin.toast("Upload failed (browser storage unavailable)."));
        });
      }));
      bar.appendChild(barBtn("+ Use URL", "Use a PDF address instead of uploading", () => {
        const c = findModCfg(id);
        window.MBUAdmin.prompt("Set study material PDF", [
          { key: "url", label: "PDF address", value: c && c.pdf, required: true,
            placeholder: "assets/pdfs/module-1.pdf or https://..." },
          { key: "pdfName", label: "Download file name", value: c && c.pdfName, placeholder: "module-1.pdf" }
        ]).then((vals) => {
          if (!vals) return;
          updateMod((list) => {
            const cc = list.find((x) => Number(x.id) === Number(id));
            if (cc) { cc.pdf = vals.url.trim(); cc.pdfName = vals.pdfName.trim() || vals.url.split("/").pop(); }
          });
          window.MBUAdmin.toast("PDF updated");
          window.MBUAdmin.reloadKeepScroll();
        });
      }));
      const c2 = findModCfg(id);
      if (c2 && c2.pdf) {
        bar.appendChild(barBtn("\u2715 Remove PDF", "Remove the study material PDF", () => {
          window.MBUAdmin.confirm(
            "Are you sure you want to remove the study material PDF from this module? This cannot be undone.",
            { okLabel: "Delete" }
          ).then((ok) => {
            if (!ok) return;
            updateMod((list) => {
              const c = list.find((x) => Number(x.id) === Number(id));
              if (c) { c.pdf = ""; c.pdfName = ""; }
            });
            window.MBUAdmin.toast("PDF removed");
            window.MBUAdmin.reloadKeepScroll();
          });
        }, true));
      }
      const h2 = study.querySelector("h2");
      if (h2 && h2.nextSibling) study.insertBefore(bar, h2.nextSibling);
      else study.insertBefore(bar, study.firstChild);
    }
  }

  /* ---------------- add helpers for missing module sections -------- */
  function addLines(id, key, title) {
    window.MBUAdmin.prompt(title, [
      { key: "lines", label: "One item per line", type: "textarea", required: true }
    ], { okLabel: "Add" }).then((vals) => {
      if (!vals) return;
      const lines = vals.lines.split("\n").map((s) => s.trim()).filter(Boolean);
      if (!lines.length) return;
      updateMod((list) => {
        const c = list.find((x) => Number(x.id) === Number(id));
        if (!c) return;
        if (!Array.isArray(c[key])) c[key] = [];
        c[key] = c[key].concat(lines);
      });
      window.MBUAdmin.toast("Added");
      window.MBUAdmin.reloadKeepScroll();
    });
  }

  function addConcepts(id) {
    window.MBUAdmin.prompt("Add concepts", [
      { key: "lines", label: 'One concept per line as "Title :: explanation"', type: "textarea", required: true }
    ], { okLabel: "Add" }).then((vals) => {
      if (!vals) return;
      const lines = vals.lines.split("\n").map((s) => s.trim()).filter(Boolean);
      if (!lines.length) return;
      updateMod((list) => {
        const c = list.find((x) => Number(x.id) === Number(id));
        if (!c) return;
        if (!Array.isArray(c.concepts)) c.concepts = [];
        lines.forEach((l) => {
          const i = l.indexOf("::");
          c.concepts.push(i < 0 ? { title: l, text: "" }
                                : { title: l.slice(0, i).trim(), text: l.slice(i + 2).trim() });
        });
      });
      window.MBUAdmin.toast("Concepts added");
      window.MBUAdmin.reloadKeepScroll();
    });
  }

  function addImages(id) {
    window.MBUAdmin.prompt("Add diagrams", [
      { key: "lines", label: 'One diagram per line as "assets/images/file.png :: caption"',
        type: "textarea", required: true }
    ], { okLabel: "Add" }).then((vals) => {
      if (!vals) return;
      const lines = vals.lines.split("\n").map((s) => s.trim()).filter(Boolean);
      if (!lines.length) return;
      updateMod((list) => {
        const c = list.find((x) => Number(x.id) === Number(id));
        if (!c) return;
        if (!Array.isArray(c.images)) c.images = [];
        lines.forEach((l) => {
          const i = l.indexOf("::");
          c.images.push(i < 0 ? { src: l, caption: "" }
                              : { src: l.slice(0, i).trim(), caption: l.slice(i + 2).trim() });
        });
      });
      window.MBUAdmin.toast("Diagrams added");
      window.MBUAdmin.reloadKeepScroll();
    });
  }

  function addNotes(id) {
    addLines(id, "notes", "Add notes");
  }

  function addResources(id) {
    window.MBUAdmin.prompt("Add resources", [
      { key: "lines", label: 'One resource per line as "Label | URL | description"',
        type: "textarea", required: true }
    ], { okLabel: "Add" }).then((vals) => {
      if (!vals) return;
      const lines = vals.lines.split("\n").map((s) => s.trim()).filter(Boolean);
      if (!lines.length) return;
      updateMod((list) => {
        const c = list.find((x) => Number(x.id) === Number(id));
        if (!c) return;
        if (!Array.isArray(c.resources)) c.resources = [];
        lines.forEach((l) => {
          const parts = l.split("|").map((s) => s.trim());
          c.resources.push({ label: parts[0] || "", url: parts[1] || "", desc: parts.slice(2).join("|").trim() });
        });
      });
      window.MBUAdmin.toast("Resources added");
      window.MBUAdmin.reloadKeepScroll();
    });
  }

  /* =================================================================
     ADMIN ENHANCER: shared profile editor (used by index.html and
     profile.html) + index.html learning tiles
     ================================================================= */
  function editProfileDetails() {
    const s = (window.MBUData && window.MBUData.getState().profile) || {};
    window.MBUAdmin.prompt("Edit profile details", [
      { key: "name", label: "Full name", value: s.name, required: true },
      { key: "photo", label: "Photo (path or URL)", value: s.photo, placeholder: "pro.png" },
      { key: "roll", label: "Roll number", value: s.roll },
      { key: "branch", label: "Branch", value: s.branch },
      { key: "faculty", label: "Faculty", value: s.faculty },
      { key: "degree", label: "Degree", value: s.degree },
      { key: "subjectCode", label: "Subject code", value: s.subjectCode }
    ]).then((vals) => {
      if (!vals) return;
      window.MBUAdmin.updateConfigs("profile", (p) => {
        Object.keys(vals).forEach((k) => { p[k] = String(vals[k] == null ? "" : vals[k]); });
      });
      window.MBUAdmin.toast("\u2713 Profile saved");
      window.MBUAdmin.reloadKeepScroll();
    });
  }

  function editSuggestions() {
    const s = (window.MBUData && window.MBUData.getState().learningSuggestions) || [];
    const lines = s.map((x) =>
      [x.icon || "\u2605", x.platform || "", x.url || "", x.note || ""].join(" | "));
    window.MBUAdmin.prompt("Edit learning suggestions", [
      { key: "lines", label: "One tile per line:  icon | Platform | URL | note",
        type: "textarea", value: lines.join("\n"), required: true,
        placeholder: "\u2605 | Kaggle Learn | https://www.kaggle.com/learn | Free micro-courses" }
    ], { okLabel: "Save tiles" }).then((vals) => {
      if (!vals) return;
      const parsed = vals.lines.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
        const parts = l.split("|").map((t) => t.trim());
        return {
          icon: parts[0] || "\u2605",
          platform: parts[1] || parts[0] || "",
          url: parts[2] || "",
          note: parts[3] || ""
        };
      }).filter((x) => x.platform || x.url);
      window.MBUAdmin.updateConfigs("learningSuggestions", (arr) => {
        arr.length = 0;
        parsed.forEach((x) => arr.push(x));
      });
      window.MBUAdmin.toast("\u2713 Suggestions saved");
      window.MBUAdmin.reloadKeepScroll();
    });
  }

  function admIndexPage() {
    const main = document.getElementById("main");
    if (!main) return;
    if (!document.getElementById("admDashBar")) {
      const bar = makeBar("admDashBar", "Edit Mode");
      bar.appendChild(barBtn("\u270E Edit ID card / profile",
        "Edit the student profile shown on this page", editProfileDetails));
      bar.appendChild(barBtn("\u270E Edit learning tiles",
        "Edit the Suggestions to learn tiles", editSuggestions));
      const hero = document.getElementById("dashboard") || main.firstElementChild;
      if (hero && hero.parentNode) hero.parentNode.insertBefore(bar, hero.nextSibling);
      else main.insertBefore(bar, main.firstChild);
    }
  }

  /* =================================================================
     ADMIN ENHANCER: profile.html - ID card details + contact links
     ================================================================= */
  function editSocialLinks() {
    const s = (window.MBUData && window.MBUData.getState().socialLinks) || {};
    const FIELDS = [
      ["linkedin", "LinkedIn URL"], ["github", "GitHub URL"], ["instagram", "Instagram URL"],
      ["twitter", "X (Twitter) URL"], ["youtube", "YouTube URL"],
      ["email", "Email (mailto: or address)"], ["website", "Website URL"]
    ];
    window.MBUAdmin.prompt("Edit contact links (leave a field empty to hide it)",
      FIELDS.map(([k, label]) => ({ key: k, label: label, value: s[k] || "" })),
      { okLabel: "Save links" }).then((vals) => {
        if (!vals) return;
        window.MBUAdmin.updateConfigs("socialLinks", (obj) => {
          Object.keys(obj).forEach((k) => delete obj[k]);
          FIELDS.forEach(([k]) => {
            const v = String(vals[k] == null ? "" : vals[k]).trim();
            if (v) obj[k] = v;
          });
        });
        window.MBUAdmin.toast("\u2713 Contact links saved");
        window.MBUAdmin.reloadKeepScroll();
      });
  }

  function admProfilePage() {
    const app = document.getElementById("pfApp");
    if (!app) return;
    if (!document.getElementById("admProfileBar")) {
      const bar = makeBar("admProfileBar", "Edit Mode");
      bar.appendChild(barBtn("\u270E Edit ID card / profile",
        "Edit the student profile details", editProfileDetails));
      bar.appendChild(barBtn("\u270E Edit contact links",
        "Edit the social / contact links", editSocialLinks));
      const hero = app.querySelector(".page-hero");
      if (hero && hero.parentNode) hero.parentNode.insertBefore(bar, hero.nextSibling);
      else app.insertBefore(bar, app.firstChild);
    }
  }

  /* =================================================================
     ADMIN ENHANCER: subjects.html - Subject Management System
     (create / rename / delete subjects; every subject owns its own
     modules, materials, experiments and sub-experiments)
     ================================================================= */
  function subjectId() {
    return "subj-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function subjectCounts(sid) {
    const mods = allModConfigs().filter((c) => c.subjectId === sid).length;
    const exps = allExpConfigs().filter((c) => c.subjectId === sid);
    const custom = (typeof window.loadCustom === "function" ? window.loadCustom() : [])
      .filter((c) => (c.subjectId || "") === sid);
    const subs = exps.reduce((n, e) => n + (Array.isArray(e.subs) ? e.subs.length : 0), 0) +
      custom.reduce((n, e) => n + (Array.isArray(e.subNames) ? e.subNames.length : 0), 0);
    return { modules: mods, experiments: exps.length + custom.length, subs: subs };
  }

  function addSubject() {
    window.MBUAdmin.prompt("Add subject", [
      { key: "name", label: "Subject name", required: true, placeholder: "Machine Learning" },
      { key: "description", label: "Description (optional)", type: "textarea",
        placeholder: "What this subject covers..." }
    ], { okLabel: "Add subject" }).then((vals) => {
      if (!vals) return;
      const name = String(vals.name || "").trim();
      if (!name) return;
      const exists = window.getSubjects().some((s) => s.name.trim().toLowerCase() === name.toLowerCase());
      if (exists) { window.MBUAdmin.toast("A subject named \u201C" + name + "\u201D already exists."); return; }
      const now = new Date().toISOString();
      const id = subjectId();
      window.MBUAdmin.updateConfigs("subjects", (list) => list.push({
        id: id, name: name, description: String(vals.description || "").trim(),
        createdAt: now, updatedAt: now
      }));
      window.setSelectedSubject(id);
      window.MBUAdmin.toast("\u2713 Subject \u201C" + name + "\u201D added");
      window.MBUAdmin.reloadKeepScroll();
    });
  }

  function editSubject(id) {
    const s = window.getSubjectById(id);
    if (!s) return;
    window.MBUAdmin.prompt("Edit subject", [
      { key: "name", label: "Subject name", value: s.name, required: true },
      { key: "description", label: "Description (optional)", type: "textarea", value: s.description || "" }
    ]).then((vals) => {
      if (!vals) return;
      const name = String(vals.name || "").trim();
      if (!name) return;
      const clash = window.getSubjects().some(
        (x) => x.id !== id && x.name.trim().toLowerCase() === name.toLowerCase());
      if (clash) { window.MBUAdmin.toast("Another subject is already named \u201C" + name + "\u201D."); return; }
      window.MBUAdmin.updateConfigs("subjects", (list) => {
        const c = list.find((x) => x.id === id);
        if (!c) return;
        c.name = name;
        c.description = String(vals.description || "").trim();
        c.updatedAt = new Date().toISOString();
      });
      window.MBUAdmin.toast("\u2713 Subject saved");
      window.MBUAdmin.reloadKeepScroll();
    });
  }

  function makeSubjectActive(id) {
    window.setSelectedSubject(id);
    window.MBUAdmin.toast("Now working in " + (window.getSubjectName(id) || "subject"));
    window.MBUAdmin.reloadKeepScroll();
  }

  function deleteSubject(id) {
    const s = window.getSubjectById(id);
    if (!s) return;
    if (window.getSubjects().length <= 1) {
      window.MBUAdmin.toast("At least one subject must remain.");
      return;
    }
    const counts = subjectCounts(id);
    window.MBUAdmin.confirm(
      'Delete "' + s.name + '"? This also permanently deletes its ' + counts.modules +
      " module(s), " + counts.experiments + " experiment(s) and all their materials. " +
      "This cannot be undone.",
      { okLabel: "Delete subject", title: "Delete subject" }
    ).then((ok) => {
      if (!ok) return;
      window.MBUAdmin.updateConfigs("moduleConfigs", (arr) => {
        for (let k = arr.length - 1; k >= 0; k--) if (arr[k].subjectId === id) arr.splice(k, 1);
      });
      window.MBUAdmin.updateConfigs("experimentConfigs", (arr) => {
        for (let k = arr.length - 1; k >= 0; k--) if (arr[k].subjectId === id) arr.splice(k, 1);
      });
      window.MBUAdmin.updateConfigs("subjects", (subs) => {
        const i = subs.findIndex((x) => x.id === id);
        if (i >= 0) subs.splice(i, 1);
      });
      if (typeof window.loadCustom === "function" && typeof window.saveCustom === "function") {
        window.saveCustom(window.loadCustom().filter((c) => (c.subjectId || "") !== id));
      }
      if (window.resolveSubjectId() === id) {
        const remaining = window.getSubjects();
        if (remaining.length) window.setSelectedSubject(remaining[0].id);
      }
      window.MBUAdmin.toast("Subject deleted");
      window.MBUAdmin.reloadKeepScroll();
    });
  }

  function admSubjectsPage() {
    const app = document.getElementById("app");
    if (!app) return;
    const grid = document.getElementById("subjectGrid");

    if (!document.getElementById("admSubjectBar")) {
      const bar = makeBar("admSubjectBar", "Edit Mode");
      bar.appendChild(barBtn("+ Add subject", "Create a new subject", addSubject));
      if (grid && grid.parentNode) grid.parentNode.insertBefore(bar, grid);
      else {
        const hero = app.querySelector(".page-hero");
        if (hero && hero.parentNode) hero.parentNode.insertBefore(bar, hero.nextSibling);
        else app.insertBefore(bar, app.firstChild);
      }
    }

    if (!grid) return;
    $$(".card[data-id]", grid).forEach((card) => {
      if (card.dataset.admCard) return;
      card.dataset.admCard = "1";
      const id = card.dataset.id;
      const row = document.createElement("div");
      row.className = "adm-actions adm-ui";
      row.appendChild(mini("\u2713", "Set as the active subject", () => makeSubjectActive(id)));
      row.appendChild(mini("\u270E Edit", "Rename / edit this subject", () => editSubject(id)));
      row.appendChild(mini("\u2715 Delete", "Delete this subject and its content", () => deleteSubject(id), true));
      const actions = card.querySelector(".card-actions");
      if (actions) actions.parentNode.insertBefore(row, actions);
      else card.appendChild(row);
    });
  }

  /* =================================================================
     registration
     ================================================================= */
  if (window.MBUAdmin) {
    if (page === "index.html") window.MBUAdmin.register(admIndexPage);
    if (page === "profile.html") window.MBUAdmin.register(admProfilePage);
    if (page === "experiments.html") window.MBUAdmin.register(admExperimentsPage);
    if (page === "experiment.html") window.MBUAdmin.register(admExperimentPage);
    if (page === "subexperiment.html") window.MBUAdmin.register(admSubPage);
    if (page === "modules.html") window.MBUAdmin.register(admModulesPage);
    if (page === "module.html") window.MBUAdmin.register(admModulePage);
    if (page === "subjects.html") window.MBUAdmin.register(admSubjectsPage);
  }

  /* always-on enhancements (normal users + Edit Mode) */
  function alwaysOn() {
    try { enhanceModuleMaterials(); }
    catch (e) { if (window.console) console.warn("admin-pages alwaysOn:", e); }
    hydrateBlobs();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", alwaysOn);
  } else {
    alwaysOn();
    setTimeout(alwaysOn, 350);
  }
})();
