/* =====================================================================
   index.js  -  Dashboard only: student ID card, hero stats and the
   "Suggestions to learn this subject" tiles. Search, experiment
   cards and the Add Experiment modal live in experiments.js.
   ===================================================================== */
(function () {
  initCommon("dashboard");

  /* ---------- Profile (ID card) ---------- */
  function renderProfile() {
    const stored = (window.MBUData && window.MBUData.getState) ? window.MBUData.getState().profile : null;
    const p = (stored && Object.keys(stored).length) ? stored
      : (typeof profile !== "undefined" && profile ? profile : {});
    const val = (v) => (String(v || "").trim() ? v : "—");
    $("#subjectCode").textContent = "Subject Code: " + val(p.subjectCode);
    $("#pName").textContent = val(p.name);
    $("#pNameFull").textContent = val(p.name);
    $("#pRoll").textContent = val(p.roll);
    $("#pBranch").textContent = val(p.branch);
    $("#pFaculty").textContent = val(p.faculty);
    $("#pDegree").textContent = val(p.degree);
    fillAvatar($("#avatar"), p.name, p.photo);
  }

  /* ---------- Hero stats ---------- */
  function updateStats() {
    const all = getAllExperiments();
    $("#statExp").textContent = all.length;
    $("#statSub").textContent = all.reduce((n, e) => n + e.subExperiments.length, 0);
  }

  /* ---------- Suggestions to learn the subject ---------- */
  function renderSuggestions() {
    const grid = $("#sugGrid");
    const empty = $("#sugEmpty");
    const stored = (window.MBUData && window.MBUData.getState().learningSuggestions);
    const list = Array.isArray(stored) ? stored : ((typeof learningSuggestions !== "undefined") ? learningSuggestions : []);

    if (!grid) return;

    if (!list.length) {
      grid.innerHTML = "";
      if (empty) empty.hidden = false;
      return;
    }

    grid.innerHTML = list.map((s) => `
      <a class="res-tile" href="${esc(s.url)}" target="_blank" rel="noopener"
         aria-label="${esc(s.platform)} — opens in a new tab">
        <span aria-hidden="true">${esc(s.icon || "★")}</span>
        <strong>${esc(s.platform)}</strong>
        <small>${esc(s.note || "")}</small>
      </a>`).join("");
  }

  renderProfile();
  updateStats();
  renderSuggestions();
})();
