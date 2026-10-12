/* =====================================================================
   experiment.js  -  Experiment overview page (experiment.html?id=06)
   ===================================================================== */
(function () {
  initCommon("experiments");

  const app = $("#app");
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const explicitSubjectId = params.get("subject");
  const hasExplicitValidSubject = Boolean(explicitSubjectId && getSubjectById(explicitSubjectId));
  let subjectId = resolveSubjectId();
  let exp = findExperiment(id, subjectId);
  if (!exp && window.MBUData && !hasExplicitValidSubject) {
    const LETTERS = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];
    const state = window.MBUData.getState();
    function buildSub(cfg,s,i){ const letter=LETTERS[i]; const num=Number(cfg.id); const [name,aim,concept,steps,code,result,insight]=s; const aimRest=aim.replace(/^To /,""); const YT=(q)=>"https://www.youtube.com/results?search_query="+encodeURIComponent(q); const GH="https://github.com/"; return {id:num+letter,letter,name,youtube:YT(name+" "+cfg.topic+" tutorial"),github:GH,aim,problemStatement:'Every data science workflow depends on getting "'+name+'" right. Without it, later steps such as modelling and reporting rest on unreliable inputs. This sub-experiment practises the technique on the '+cfg.dataset.name+' so the student can apply it confidently to new data.',tools:cfg.tools,explanation:concept,procedure:Array.isArray(steps)?steps:(steps||"").split("|"),code,input:cfg.dataset.name+" ("+cfg.dataset.records+"). Make sure the data file or library dataset is available in your working folder or Python environment before running the code.",result,analysis:insight,conclusion:"In "+num+letter+", the student learned how to "+(aimRest.charAt(0).toLowerCase()+aimRest.slice(1))+" The same approach can now be reused on any similar dataset, and the output can be checked against the expected result shown above."}; }
    function buildExperiment(cfg){ const YT=(q)=>"https://www.youtube.com/results?search_query="+encodeURIComponent(q); const GH="https://github.com/"; return {id:cfg.id,subjectId:cfg.subjectId||SUBJECT_DEFAULT_ID,name:cfg.name,topic:cfg.topic,tools:cfg.tools,description:cfg.description,youtube:YT(cfg.name+" tutorial"),github:GH,overview:cfg.overview,aim:cfg.aim,problemStatement:cfg.problem,dataset:cfg.dataset,methodology:cfg.methodology,analysis:cfg.analysis,results:cfg.results,architecture:cfg.architecture,subExperiments:(cfg.subs||[]).map((s,i)=>buildSub(cfg,s,i)),files:Array.isArray(cfg.files)?cfg.files:[]}; }
    /* match within the selected subject first, then anywhere (legacy) */
    const built = (state.experimentConfigs||[]).map(buildExperiment);
    exp = built.find((e)=>e.id===id && (!subjectId || e.subjectId===subjectId)) ||
          built.find((e)=>e.id===id);
  }
  if (exp && exp.subjectId) subjectId = exp.subjectId;
  const subjectLabel = getSubjectName(subjectId);
  const backHref = withSubject("experiments.html", subjectId);
  const perma = subjectId ? "&subject=" + encodeURIComponent(subjectId) : "";

  if (!exp) {
    app.innerHTML = `
      <div class="empty">
        <div class="empty-icon" aria-hidden="true">⚠</div>
        <h3>Experiment not found</h3>
        <p>The experiment you opened does not exist${subjectLabel ? " in " + esc(subjectLabel) : ""}.</p>
        <p style="margin-top:16px"><a class="btn btn-primary" data-nav href="${esc(backHref)}">Back to experiments</a></p>
      </div>`;
    return;
  }

  const num = pad2(Number(exp.id));
  document.title = "Experiment " + num + " | " + exp.name;

  const d = exp.dataset;
  const datasetRows = [
    ["Dataset name", d.name], ["Dataset source", d.source], ["Number of records", d.records],
    ["Features", d.features], ["Data types", d.types]
  ].map(([k, v]) => `<tr><th scope="row">${k}</th><td>${esc(v)}</td></tr>`).join("");

  const methodology = exp.methodology.map((m) => `<li><span>${esc(m)}</span></li>`).join("");

  const subCards = exp.subExperiments.map((s) => `
    <a class="sub-card" data-nav href="subexperiment.html?experiment=${encodeURIComponent(exp.id)}&sub=${encodeURIComponent(s.id)}${perma}">
      <strong>${esc(subLabel(s))}</strong><span>${esc(s.name)}</span>
    </a>`).join("");

  const arch = exp.architecture.map((step, i) => {
    const arrow = i < exp.architecture.length - 1 ? '<div class="arch-arrow" aria-hidden="true"></div>' : "";
    return `<div class="arch-node" style="--i:${i}"><small>STEP ${i + 1}</small>${esc(step)}</div>${arrow}`;
  }).join("");

  /* Supporting files (PDF, PPT, DOC, images, ZIP, ...) - fileRowHtml()
     comes from js/fileviewer.js and is shared by every page. */
  const files = Array.isArray(exp.files) ? exp.files : [];
  const filesPanel = files.length
    ? `
    <section class="panel" id="files"><h2><span class="num">10</span>Experiment Files</h2>
      <p class="muted" style="margin-bottom:14px">Notes, presentations and other material for this experiment.</p>
      <div class="file-list">${files.map((file, i) => fileRowHtml(file, i)).join("")}</div>
    </section>`
    : "";

  app.innerHTML = `
    <a class="back-link" data-nav href="${esc(backHref)}">← All experiments</a>

    <section class="page-hero" aria-labelledby="expTitle">
      <span class="exp-tag">EXPERIMENT ${num}${subjectLabel ? " · " + esc(subjectLabel) : ""}</span>
      <h1 id="expTitle">${esc(exp.name)}</h1>
      <p class="res-label">Experiment resources</p>
      <div class="res-links">
        <a class="res-link" href="${esc(exp.youtube)}" target="_blank" rel="noopener"><span aria-hidden="true">▶</span> YouTube Tutorial</a>
        <a class="res-link" href="${esc(exp.github)}" target="_blank" rel="noopener"><span aria-hidden="true">⌘</span> GitHub Repository</a>
      </div>
      <div class="subject-holder" id="subjectHolder"></div>
    </section>

    <section class="panel" id="overview"><h2><span class="num">1</span>Experiment Overview</h2><p>${esc(exp.overview)}</p></section>
    <section class="panel" id="aim"><h2><span class="num">2</span>Aim</h2><p>${esc(exp.aim)}</p></section>
    <section class="panel" id="problem"><h2><span class="num">3</span>Problem Statement</h2><p>${esc(exp.problemStatement)}</p></section>
    <section class="panel" id="dataset"><h2><span class="num">4</span>Dataset</h2><table class="data-table"><tbody>${datasetRows}</tbody></table></section>
    <section class="panel" id="methodology"><h2><span class="num">5</span>Methodology</h2><ol class="steps">${methodology}</ol></section>
    <section class="panel" id="subexperiments"><h2><span class="num">6</span>Sub Experiments</h2><div class="sub-grid">${subCards}</div></section>
    <section class="panel" id="analysis"><h2><span class="num">7</span>Analysis</h2><p>${esc(exp.analysis)}</p></section>
    <section class="panel" id="results"><h2><span class="num">8</span>Results</h2><p>${esc(exp.results)}</p></section>
    <section class="panel" id="architecture"><h2><span class="num">9</span>Architecture</h2><div class="arch" role="img" aria-label="Architecture flow: ${esc(exp.architecture.join(", then "))}">${arch}</div></section>
    ${filesPanel}
  `;

  /* [View] buttons open the shared file viewer */
  $$("[data-view-file]", app).forEach((button) => {
    button.addEventListener("click", () => {
      openFileViewer(files[Number(button.dataset.viewFile)]);
    });
  });

  /* Jump to the Sub Experiments section when the card button was used */
  if (location.hash) {
    const target = document.getElementById(location.hash.slice(1));
    if (target) setTimeout(() => target.scrollIntoView({ behavior: "smooth" }), 300);
  }

  /* subject indicator / switcher (switching goes to the experiments list) */
  mountSubjectSwitcher(document.getElementById("subjectHolder"), { href: "experiments.html" });
})();
