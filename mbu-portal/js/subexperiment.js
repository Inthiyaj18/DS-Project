/* =====================================================================
   subexperiment.js  -  Sub-experiment page
   URL: subexperiment.html?experiment=06&sub=6A
   Tabs and Previous/Next load other sub-experiments without reloading.
   ===================================================================== */
(function () {
  /* Sub-experiments belong to the Experiments section (no separate
     sidebar item) - keep "Experiments" active while browsing 1A, 1B, ... */
  initCommon("experiments");

  const app = $("#app");
  const params = new URLSearchParams(window.location.search);
  const expParam = params.get("experiment");
  const explicitSubjectId = params.get("subject");
  const hasExplicitValidSubject = Boolean(explicitSubjectId && getSubjectById(explicitSubjectId));
  let subjectId = resolveSubjectId();
  let exp = findExperiment(expParam, subjectId);
  if (!exp && window.MBUData && !hasExplicitValidSubject) {
    const LETTERS = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];
    const state = window.MBUData.getState();
    function buildSub(cfg,s,i){ const letter=LETTERS[i]; const num=Number(cfg.id); const [name,aim,concept,steps,code,result,insight]=s; const aimRest=aim.replace(/^To /,""); const YT=(q)=>"https://www.youtube.com/results?search_query="+encodeURIComponent(q); const GH="https://github.com/"; return {id:num+letter,letter,name,youtube:YT(name+" "+cfg.topic+" tutorial"),github:GH,aim,problemStatement:'Every data science workflow depends on getting "'+name+'" right. Without it, later steps such as modelling and reporting rest on unreliable inputs. This sub-experiment practises the technique on the '+cfg.dataset.name+' so the student can apply it confidently to new data.',tools:cfg.tools,explanation:concept,procedure:Array.isArray(steps)?steps:(steps||"").split("|"),code,input:cfg.dataset.name+" ("+cfg.dataset.records+"). Make sure the data file or library dataset is available in your working folder or Python environment before running the code.",result,analysis:insight,conclusion:"In "+num+letter+", the student learned how to "+(aimRest.charAt(0).toLowerCase()+aimRest.slice(1))+" The same approach can now be reused on any similar dataset, and the output can be checked against the expected result shown above.",files:Array.isArray(s[7])?s[7]:[]}; }
    function buildExperiment(cfg){ const YT=(q)=>"https://www.youtube.com/results?search_query="+encodeURIComponent(q); const GH="https://github.com/"; return {id:cfg.id,subjectId:cfg.subjectId||SUBJECT_DEFAULT_ID,name:cfg.name,topic:cfg.topic,tools:cfg.tools,description:cfg.description,youtube:YT(cfg.name+" tutorial"),github:GH,overview:cfg.overview,aim:cfg.aim,problemStatement:cfg.problem,dataset:cfg.dataset,methodology:cfg.methodology,analysis:cfg.analysis,results:cfg.results,architecture:cfg.architecture,subExperiments:(cfg.subs||[]).map((s,i)=>buildSub(cfg,s,i)),files:Array.isArray(cfg.files)?cfg.files:[]}; }
    const built = (state.experimentConfigs||[]).map(buildExperiment);
    exp = built.find((e)=>e.id===expParam && (!subjectId || e.subjectId===subjectId)) ||
          built.find((e)=>e.id===expParam);
  }
  if (exp && exp.subjectId) subjectId = exp.subjectId;
  const subjectLabel = getSubjectName(subjectId);
  const backHref = withSubject("experiment.html?id=" + encodeURIComponent(expParam || (exp && exp.id) || ""), subjectId);
  const perma = subjectId ? "&subject=" + encodeURIComponent(subjectId) : "";

  if (!exp) {
    app.innerHTML = `
      <div class="empty">
        <div class="empty-icon" aria-hidden="true">⚠</div>
        <h3>Experiment not found</h3>
        <p>The sub-experiment you opened does not exist${subjectLabel ? " in " + esc(subjectLabel) : ""}.</p>
        <p style="margin-top:16px"><a class="btn btn-primary" data-nav href="${esc(withSubject("experiments.html", subjectId))}">Back to experiments</a></p>
      </div>`;
    return;
  }

  const subs = exp.subExperiments;
  const expNum = pad2(Number(exp.id));

  function indexFromParam(value) {
    const v = String(value || "").toUpperCase();
    const i = subs.findIndex((s) => s.id.toUpperCase() === v || s.letter === v || subLabel(s).toUpperCase() === v);
    return i >= 0 ? i : 0;
  }
  let current = indexFromParam(params.get("sub"));

  /* Online Code Lab (embedded at the bottom of subexperiment.html).
     Tracks the last sub-experiment code pushed into the editor so tab
     switches never overwrite edits the student has made. */
  let lastLoaded = null;

  /* ---------- Tiny syntax highlighter (Python style) ---------- */
  function highlight(code) {
    const re = /(#.*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|\b(import|from|as|def|return|for|in|if|else|elif|with|print|True|False|None|class)\b|\b(\d+(?:\.\d+)?)\b/g;
    let out = "", last = 0, m;
    while ((m = re.exec(code)) !== null) {
      out += esc(code.slice(last, m.index));
      const cls = m[1] ? "c" : m[2] ? "s" : m[3] ? "k" : "n";
      out += `<span class="tok-${cls}">${esc(m[0])}</span>`;
      last = re.lastIndex;
    }
    return out + esc(code.slice(last));
  }

  function navBlock(position) {
    const s = subs[current];
    return `
      <div class="subnav" role="navigation" aria-label="Sub-experiment navigation ${position}">
        <button class="btn btn-ghost" type="button" data-go="prev" ${current === 0 ? "disabled" : ""}>← Previous</button>
        <span class="subnav-label">Experiment ${esc(subLabel(s))}</span>
        <button class="btn btn-ghost" type="button" data-go="next" ${current === subs.length - 1 ? "disabled" : ""}>Next →</button>
      </div>`;
  }

  /* ---------- Online Code Lab helpers ---------- */
  function loadCodeIntoLab() {
    const editor = document.getElementById("codeEditor");
    if (!editor) return;
    /* Keep the student's edits: only swap the code when the editor still
       holds whatever was loaded last (or nothing yet). */
    if (lastLoaded !== null && editor.value !== lastLoaded) return;
    const s = subs[current];
    lastLoaded = s.code;
    editor.value = s.code;
    const fn = document.getElementById("fileName");
    if (fn) fn.textContent = "experiment_" + subLabel(s).toLowerCase() + ".py";
  }

  function openLab() {
    loadCodeIntoLab();
    const section = document.getElementById("compiler");
    if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function render(animate) {
    const s = subs[current];
    const label = subLabel(s);
    document.title = "Experiment " + label + " | " + s.name;

    const tabs = subs.map((t, i) =>
      `<button class="tab" type="button" data-index="${i}" ${i === current ? 'aria-current="true"' : ""}
        aria-label="Experiment ${esc(subLabel(t))}: ${esc(t.name)}" title="${esc(t.name)}">${esc(t.letter)}</button>`
    ).join("");

    const tools = s.tools.map((t) => `<span class="tool">${esc(t)}</span>`).join("");
    const procedure = s.procedure.map((p, i) =>
      `<li><span class="step-no">${pad2(i + 1)}</span><span class="step-arrow" aria-hidden="true">→</span><span>${esc(p)}</span></li>`
    ).join("");

    /* Per-sub-experiment files (added in Edit Mode, same card look as the
       experiment page).  Hidden entirely while no files exist. */
    const subFiles = Array.isArray(s.files) ? s.files : [];
    const filesPanel = subFiles.length
      ? `
        <section class="panel" id="files"><h2>Experiment Files</h2>
          <p class="muted" style="margin-bottom:14px">Notes, presentations and other material for this sub-experiment.</p>
          <div class="file-list">${subFiles.map((file, i) =>
            (typeof fileRowHtml === "function" ? fileRowHtml(file, i) : "")).join("")}</div>
        </section>`
      : "";

    app.innerHTML = `
      <div class="${animate ? "swap" : ""}">
        <a class="back-link" data-nav href="${esc(backHref)}">← Back to Experiment ${expNum}: ${esc(exp.name)}</a>

        <section class="page-hero" aria-labelledby="subTitle">
          <span class="exp-tag">EXPERIMENT ${esc(label)}${subjectLabel ? " · " + esc(subjectLabel) : ""}</span>
          <h1 id="subTitle">${esc(s.name)}</h1>
          <div class="res-links">
            <a class="res-link" href="${esc(s.youtube)}" target="_blank" rel="noopener"><span aria-hidden="true">▶</span> YouTube Tutorial</a>
            <a class="res-link" href="${esc(s.github)}" target="_blank" rel="noopener"><span aria-hidden="true">⌘</span> GitHub Repository</a>
            <button class="res-link lab-link" type="button" data-open-lab><span aria-hidden="true">⌨</span> Online Code Lab</button>
          </div>
          <div class="subject-holder" id="subjectHolder"></div>
        </section>

        ${navBlock("top")}
        <div class="tabs" role="group" aria-label="All sub-experiments of Experiment ${expNum}">${tabs}</div>

        <section class="panel"><h2><span class="num">1</span>Experiment Aim</h2><p>${esc(s.aim)}</p></section>
        <section class="panel" id="problemStatement"><h2><span class="num">2</span>Problem Statement</h2><p>${esc(s.problemStatement)}</p></section>

        ${filesPanel}

        <section class="panel"><h2><span class="num">3</span>Required Tools</h2><div class="tools">${tools}</div></section>
        <section class="panel"><h2><span class="num">4</span>Concept Explanation</h2><p>${esc(s.explanation)}</p></section>
        <section class="panel"><h2><span class="num">5</span>Step-by-Step Procedure</h2><ol class="proc">${procedure}</ol></section>

        <section class="panel">
          <h2><span class="num">6</span>Code</h2>
          <div class="code-wrap">
            <div class="code-head">
              <span><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>experiment_${esc(label.toLowerCase())}.py</span>
              <div class="code-actions">
                <button class="copy-btn" type="button" data-open-lab>⌨ Open in Code Lab</button>
                <button class="copy-btn" id="copyBtn" type="button">Copy Code</button>
              </div>
            </div>
            <pre><code>${highlight(s.code)}</code></pre>
          </div>
        </section>

        <section class="panel"><h2><span class="num">7</span>Expected Input</h2><p>${esc(s.input)}</p></section>
        <section class="panel">
          <h2><span class="num">8</span>Result</h2>
          <div class="out-wrap">
            <div class="out-head"><span class="live">Output</span><span>console</span></div>
            <pre>${esc(s.result)}</pre>
          </div>
        </section>
        <section class="panel"><h2><span class="num">9</span>Analysis</h2><p>${esc(s.analysis)}</p></section>
        <section class="panel"><h2><span class="num">10</span>Conclusion</h2><p>${esc(s.conclusion)}</p></section>

        ${navBlock("bottom")}
      </div>`;

    wire();
    mountSubjectSwitcher(document.getElementById("subjectHolder"), { href: "experiments.html" });
  }

  function wire() {
    $$(".tab").forEach((b) => b.addEventListener("click", () => go(Number(b.dataset.index))));
    $$("[data-go]").forEach((b) => b.addEventListener("click", () => go(current + (b.dataset.go === "next" ? 1 : -1))));
    $$("[data-open-lab]", app).forEach((b) => b.addEventListener("click", openLab));

    /* [View] buttons on the sub-experiment's files panel */
    $$("[data-view-file]", app).forEach((button) => {
      button.addEventListener("click", () => {
        const list = subs[current].files || [];
        const file = list[Number(button.dataset.viewFile)];
        if (file && typeof openFileViewer === "function") openFileViewer(file);
      });
    });

    const copyBtn = $("#copyBtn");
    copyBtn.addEventListener("click", () => {
      copyText(subs[current].code).then(() => {
        copyBtn.textContent = "✓ Code copied";
        copyBtn.classList.add("done");
        showToast("✓ Code copied");
        setTimeout(() => { copyBtn.textContent = "Copy Code"; copyBtn.classList.remove("done"); }, 2000);
      }).catch(() => showToast("Could not copy. Select the code and press Ctrl+C."));
    });
  }

  function go(index) {
    if (index < 0 || index >= subs.length || index === current) return;
    current = index;
    try {
      history.pushState({ index }, "", "?experiment=" + encodeURIComponent(exp.id) +
        "&sub=" + encodeURIComponent(subs[index].id) + perma);
    } catch (e) { /* some browsers block pushState on file:// - page still works */ }
    render(true);
    loadCodeIntoLab();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  window.addEventListener("popstate", () => {
    current = indexFromParam(new URLSearchParams(window.location.search).get("sub"));
    render(true);
  });

  render(false);

  /* compiler.js/editor.js fill the editor with a generic starter template
     while the page is still parsing. Wait until EVERY script has run
     (window load - a setTimeout can fire between script downloads), then
     swap in this sub-experiment's code; make Reset bring it back too. */
  function afterLabReady(fn) {
    if (document.readyState === "complete") fn();
    else window.addEventListener("load", fn);
  }

  afterLabReady(function () {
    loadCodeIntoLab();
    const reset = document.getElementById("resetCode");
    const lang = document.getElementById("languageSelect");
    if (reset) reset.addEventListener("click", function () {
      /* compiler.js already reset to its template first (registered
         earlier); restore the sub-experiment code for Python only. */
      if (!lang || lang.value === "python") {
        lastLoaded = null;
        loadCodeIntoLab();
      }
    });
  });

  /* Deep links such as subexperiment.html?experiment=01&sub=1A#compiler */
  if (location.hash) {
    const target = document.getElementById(location.hash.slice(1));
    if (target) setTimeout(() => target.scrollIntoView({ behavior: "smooth" }), 300);
  }
})();
