/* =====================================================================
   experiments.js  -  Experiments page: search, experiment cards,
   Add Experiment modal, localStorage (moved from the dashboard).
   ===================================================================== */
(function () {
  initCommon("experiments");

  const grid = $("#grid");
  const empty = $("#empty");
  const input = $("#searchInput");
  const clearBtn = $("#clearSearch");
  const countEl = $("#resultCount");

  const subjectId = resolveSubjectId();
  const subject = getSubjectById(subjectId);
  const subjectLabel = subject ? subject.name : "";

  /* ---------- Search ---------- */
  function searchText(e) {
    return [
      e.id, Number(e.id), "experiment " + Number(e.id), e.name, e.description,
      e.dataset ? e.dataset.name : "", (e.tools || []).join(" "), e.topic || "",
      e.subExperiments.map((s) => s.id + " " + s.name).join(" ")
    ].join(" ").toLowerCase();
  }

  function filterExperiments(query) {
    const all = (window.MBUData && window.MBUData.getState().experimentConfigs) ? (function(){
      const LETTERS = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];
      function buildSub(cfg,s,i){ const letter=LETTERS[i]; const num=Number(cfg.id); const [name,aim,concept,steps,code,result,insight]=s; const aimRest=aim.replace(/^To /,""); const YT=(q)=>"https://www.youtube.com/results?search_query="+encodeURIComponent(q); const GH="https://github.com/"; return {id:num+letter,letter,name,youtube:YT(name+" "+cfg.topic+" tutorial"),github:GH,aim,problemStatement:'Every data science workflow depends on getting "'+name+'" right. Without it, later steps such as modelling and reporting rest on unreliable inputs. This sub-experiment practises the technique on the '+cfg.dataset.name+' so the student can apply it confidently to new data.',tools:cfg.tools,explanation:concept,procedure:steps.split("|"),code,input:cfg.dataset.name+" ("+cfg.dataset.records+"). Make sure the data file or library dataset is available in your working folder or Python environment before running the code.",result,analysis:insight,conclusion:"In "+num+letter+", the student learned how to "+(aimRest.charAt(0).toLowerCase()+aimRest.slice(1))+" The same approach can now be reused on any similar dataset, and the output can be checked against the expected result shown above."}; }
      function buildExperiment(cfg){ const YT=(q)=>"https://www.youtube.com/results?search_query="+encodeURIComponent(q); const GH="https://github.com/"; return {id:cfg.id,subjectId:cfg.subjectId||SUBJECT_DEFAULT_ID,name:cfg.name,topic:cfg.topic,tools:cfg.tools,description:cfg.description,youtube:YT(cfg.name+" tutorial"),github:GH,overview:cfg.overview,aim:cfg.aim,problemStatement:cfg.problem,dataset:cfg.dataset,methodology:cfg.methodology,analysis:cfg.analysis,results:cfg.results,architecture:cfg.architecture,subExperiments:(cfg.subs||[]).map((s,i)=>buildSub(cfg,s,i)),files:Array.isArray(cfg.files)?cfg.files:[]}; }
      return (window.MBUData.getState().experimentConfigs).map(buildExperiment)
        .filter((e)=>!subjectId||e.subjectId===subjectId);
    })() : getAllExperiments(subjectId);
    const q = query.trim().toLowerCase();
    if (!q) return all;

    /* "6", "06", "experiment 6", "6a" -> match by number */
    const m = q.match(/^(?:exp(?:eriment)?\s*)?0*(\d+)\s*([a-g])?$/);
    if (m) return all.filter((e) => Number(e.id) === Number(m[1]));

    const tokens = q.split(/\s+/);
    return all.filter((e) => {
      const text = searchText(e);
      return tokens.every((t) => text.includes(t));
    });
  }

  /* ---------- Cards ---------- */
  function cardHtml(e, i, animClass) {
    const num = Number(e.id);
    const perma = subjectId ? "&subject=" + encodeURIComponent(subjectId) : "";
    const chips = e.subExperiments.map((s) =>
      `<a class="chip" data-nav href="subexperiment.html?experiment=${encodeURIComponent(e.id)}&sub=${encodeURIComponent(s.id)}${perma}"
          aria-label="Sub-experiment ${esc(subLabel(s))}: ${esc(s.name)}" title="${esc(subLabel(s))}: ${esc(s.name)}">${esc(s.letter)}</a>`
    ).join("");
    const extra = e.custom
      ? `<span class="badge">Custom</span><button class="remove-btn" type="button" data-remove="${esc(e.id)}" aria-label="Remove experiment ${esc(e.id)}">Remove</button>`
      : "";
    return `
      <article class="card ${animClass}" style="--i:${i}" data-id="${esc(e.id)}">
        <div class="card-top"><span class="exp-tag">EXPERIMENT ${pad2(num)}</span><span>${extra}</span></div>
        <h3>${esc(e.name)}</h3>
        <p class="desc">${esc(e.description)}</p>
        <div class="chips" role="group" aria-label="Sub-experiments">${chips}</div>
        <div class="card-actions">
          <a class="btn btn-primary" data-nav href="experiment.html?id=${encodeURIComponent(e.id)}${perma}">Overview</a>
          <a class="btn btn-ghost" data-nav href="experiment.html?id=${encodeURIComponent(e.id)}${perma}#subexperiments">Sub Experiments</a>
        </div>
      </article>`;
  }

  let firstRender = true;
  function render() {
    const query = input.value;
    const list = filterExperiments(query);
    const total = getAllExperiments(subjectId).length;
    const animClass = firstRender ? "" : "pop";
    firstRender = false;

    grid.innerHTML = list.map((e, i) => cardHtml(e, i, animClass)).join("");
    empty.hidden = list.length > 0;
    clearBtn.hidden = !query;
    countEl.textContent = query.trim()
      ? `Showing ${list.length} of ${total} experiments`
      : `${total} experiment${total === 1 ? "" : "s"}${subjectLabel ? " in " + subjectLabel : ""}`;
  }

  input.addEventListener("input", render);
  clearBtn.addEventListener("click", () => { input.value = ""; render(); input.focus(); });

  /* Remove custom experiment */
  grid.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-remove]");
    if (!btn) return;
    const id = btn.dataset.remove;
    if (!confirm("Remove experiment " + id + " from this browser?")) return;
    saveCustom(loadCustom().filter((c) => pad2(Number(c.id)) !== id));
    render();
    showToast("Experiment removed");
  });

  /* ---------- Modal ---------- */
  const backdrop = $("#modalBackdrop");
  const form = $("#addForm");
  const errorEl = $("#formError");
  let lastFocus = null;

  function openModal() {
    lastFocus = document.activeElement;
    backdrop.classList.add("open");
    backdrop.setAttribute("aria-hidden", "false");
    errorEl.hidden = true;
    setTimeout(() => $("#fNumber").focus(), 50);
  }
  function closeModal() {
    backdrop.classList.remove("open");
    backdrop.setAttribute("aria-hidden", "true");
    if (lastFocus) lastFocus.focus();
  }

  $("#addBtn").addEventListener("click", openModal);
  $("#closeModal").addEventListener("click", closeModal);
  $("#cancelModal").addEventListener("click", closeModal);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeModal(); });

  document.addEventListener("keydown", (e) => {
    if (!backdrop.classList.contains("open")) return;
    if (e.key === "Escape") { closeModal(); return; }
    if (e.key === "Tab") {            /* keep focus inside the dialog */
      const items = $$("input, textarea, button", backdrop).filter((el) => !el.disabled && el.offsetParent !== null);
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  function showError(msg) { errorEl.textContent = msg; errorEl.hidden = false; }
  function validUrl(value) {
    try { const u = new URL(value); return u.protocol === "http:" || u.protocol === "https:"; } catch (e) { return false; }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const num = parseInt($("#fNumber").value, 10);
    const name = $("#fName").value.trim();
    const description = $("#fDesc").value.trim();
    const youtube = $("#fYoutube").value.trim();
    const github = $("#fGithub").value.trim();
    const subNames = $("#fSubs").value.split(",").map((s) => s.trim()).filter(Boolean);

    if (!num || num < 1 || num > 99) return showError("Enter an experiment number between 1 and 99.");
    if (getAllExperiments(subjectId).some((x) => Number(x.id) === num)) return showError("Experiment " + pad2(num) + " already exists" + (subjectLabel ? " in " + subjectLabel : "") + ". Choose another number.");
    if (!name) return showError("Please enter the experiment name.");
    if (!description) return showError("Please enter a description.");
    if (youtube && !validUrl(youtube)) return showError("The YouTube URL must start with http:// or https://");
    if (github && !validUrl(github)) return showError("The GitHub URL must start with http:// or https://");
    if (subNames.length > 7) return showError("Please enter at most 7 sub-experiment names.");

    const list = loadCustom();
    list.push({ id: pad2(num), name, description, youtube, github, subNames, subjectId: subjectId });
    saveCustom(list);

    form.reset();
    closeModal();
    input.value = "";
    render();
    showToast("✓ Experiment " + pad2(num) + " added");
    const card = $(`.card[data-id="${pad2(num)}"]`);
    if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  /* ---------- Subject indicator + switcher in the page hero ---------- */
  (function mountHero() {
    const hero = document.querySelector(".page-hero");
    if (!hero) return;
    const holder = document.createElement("div");
    holder.className = "subject-holder";
    holder.id = "subjectHolder";
    hero.appendChild(holder);
    const eyebrow = hero.querySelector(".exp-tag");
    if (eyebrow && subjectLabel) eyebrow.textContent = "DATA SCIENCE LABORATORY";
    mountSubjectSwitcher(holder, { href: "experiments.html", id: "subjectSwitcher" });
  })();

  render();
})();
