/* =====================================================================
   data-store.js  -  Editable data layer with localStorage persistence
   Falls back to built-in defaults from data.js. Supports export/import/reset.
   ===================================================================== */
(function () {
  const STORAGE_KEY = "mbu-portal-data-v1";

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj || null));
  }

  function loadDefaults() {
    const defaults = {
      profile: (typeof profile !== "undefined") ? clone(profile) : {},
      socialLinks: (typeof socialLinks !== "undefined") ? clone(socialLinks) : {},
      learningSuggestions: (typeof learningSuggestions !== "undefined") ? clone(learningSuggestions) : [],
      subjects: (typeof subjectConfigs !== "undefined") ? clone(subjectConfigs) : [],
      experimentConfigs: (typeof experimentConfigs !== "undefined") ? clone(experimentConfigs) : [],
      moduleConfigs: (typeof moduleConfigs !== "undefined") ? clone(moduleConfigs) : []
    };
    return defaults;
  }

  /* Guarantees a valid `subjects` array and that every module /
     experiment points at an existing subject.  Old exports (saved
     before subjects existed) are migrated automatically, so nothing is
     ever lost and no content is orphaned. */
  function ensureSubjects(data) {
    if (!Array.isArray(data.subjects) || !data.subjects.length) {
      data.subjects = (typeof subjectConfigs !== "undefined") ? clone(subjectConfigs) : [];
    }
    const known = {};
    data.subjects.forEach(function (s) { if (s && s.id) known[s.id] = true; });
    const fallback = data.subjects[0] ? data.subjects[0].id
      : ((typeof SUBJECT_DEFAULT_ID !== "undefined") ? SUBJECT_DEFAULT_ID : "data-science");
    if (Array.isArray(data.experimentConfigs)) {
      data.experimentConfigs.forEach(function (c) {
        if (!c.subjectId || !known[c.subjectId]) c.subjectId = fallback;
      });
    }
    if (Array.isArray(data.moduleConfigs)) {
      data.moduleConfigs.forEach(function (c) {
        if (!c.subjectId || !known[c.subjectId]) c.subjectId = fallback;
      });
    }
    return data;
  }

  function loadStored() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function saveStored(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data, null, 2));
      return true;
    } catch (e) {
      return false;
    }
  }

  function buildMerged() {
    const def = loadDefaults();
    const stored = loadStored();
    if (!stored) return def;
    const merged = {
      profile: Object.assign({}, def.profile, stored.profile || {}),
      socialLinks: Object.assign({}, def.socialLinks, stored.socialLinks || {}),
      learningSuggestions: Array.isArray(stored.learningSuggestions) ? stored.learningSuggestions : def.learningSuggestions,
      subjects: Array.isArray(stored.subjects) && stored.subjects.length ? stored.subjects : def.subjects,
      experimentConfigs: Array.isArray(stored.experimentConfigs) ? stored.experimentConfigs : def.experimentConfigs,
      moduleConfigs: Array.isArray(stored.moduleConfigs) ? stored.moduleConfigs : def.moduleConfigs
    };
    return ensureSubjects(merged);
  }

  let state = buildMerged();

  function getState() {
    return clone(state);
  }

  function setState(next) {
    state = ensureSubjects({
      profile: next.profile || state.profile,
      socialLinks: next.socialLinks || state.socialLinks,
      learningSuggestions: next.learningSuggestions || state.learningSuggestions,
      subjects: next.subjects || state.subjects,
      experimentConfigs: next.experimentConfigs || state.experimentConfigs,
      moduleConfigs: next.moduleConfigs || state.moduleConfigs
    });
    saveStored(state);
    window.dispatchEvent(new CustomEvent("mbu:data-changed"));
    return state;
  }

  function resetToDefaults() {
    state = loadDefaults();
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { }
    window.dispatchEvent(new CustomEvent("mbu:data-changed"));
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mbu-portal-data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          if (!parsed || typeof parsed !== "object") throw new Error("Invalid JSON");
          if (!Array.isArray(parsed.experimentConfigs)) throw new Error("Missing experimentConfigs");
          setState(parsed);
          resolve(true);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  window.MBUData = {
    getState,
    setState,
    resetToDefaults,
    exportJSON,
    importJSON,
    storageKey: STORAGE_KEY
  };
})();
