/* =====================================================================
   data-store.js  -  Editable data layer with localStorage persistence
   Falls back to built-in defaults from data.js. Supports export/import/reset.
   ===================================================================== */
(function () {
  const STORAGE_KEY = "mbu-portal-data-v1";

  /* Bump this whenever new built-in experiments / modules are added.
     A browser that saved data with an older version gets the missing
     built-in entries appended once, so new content is never hidden by
     an old localStorage snapshot (saved edits are kept). */
  const CONTENT_VERSION = 2;

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj || null));
  }

  function loadDefaults() {
    const defaults = {
      contentVersion: CONTENT_VERSION,
      profile: (typeof profile !== "undefined") ? clone(profile) : {},
      socialLinks: (typeof socialLinks !== "undefined") ? clone(socialLinks) : {},
      learningSuggestions: (typeof learningSuggestions !== "undefined") ? clone(learningSuggestions) : [],
      subjects: (typeof subjectConfigs !== "undefined") ? clone(subjectConfigs) : [],
      experimentConfigs: (typeof experimentConfigs !== "undefined") ? clone(experimentConfigs) : [],
      moduleConfigs: (typeof moduleConfigs !== "undefined") ? clone(moduleConfigs) : [],
      /* Uploaded project folders. Intentionally empty by default: the portal
         ships with no sample projects, they are added in Edit Mode. */
      projects: []
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

  /* Appends built-in experiments / modules that an older saved snapshot
     does not know about. Stored entries win, so every edit is preserved;
     only missing ids are added. Once the snapshot is stamped with the
     current CONTENT_VERSION it is left alone, which means experiments
     deleted later through Edit Mode stay deleted. */
  function upgradeContent(merged, def, stored) {
    const savedVersion = stored ? Number(stored.contentVersion) || 0 : CONTENT_VERSION;
    merged.contentVersion = savedVersion;
    if (savedVersion === CONTENT_VERSION) return merged;

    const experiments = Array.isArray(merged.experimentConfigs) ? merged.experimentConfigs : [];
    const knownExp = {};
    experiments.forEach(function (e) { if (e && e.id != null) knownExp[e.id] = true; });
    (def.experimentConfigs || []).forEach(function (e) {
      if (e && !knownExp[e.id]) experiments.push(clone(e));
    });
    merged.experimentConfigs = experiments;

    const modules = Array.isArray(merged.moduleConfigs) ? merged.moduleConfigs : [];
    const knownMod = {};
    modules.forEach(function (m) { if (m && m.id != null) knownMod[m.id] = true; });
    (def.moduleConfigs || []).forEach(function (m) {
      if (m && !knownMod[m.id]) modules.push(clone(m));
    });
    merged.moduleConfigs = modules;

    merged.contentVersion = CONTENT_VERSION;
    return merged;
  }

  function buildMerged() {
    const def = loadDefaults();
    const stored = loadStored();
    if (!stored) return def;
    const merged = {
      contentVersion: Number(stored.contentVersion) || 0,
      profile: Object.assign({}, def.profile, stored.profile || {}),
      socialLinks: Object.assign({}, def.socialLinks, stored.socialLinks || {}),
      learningSuggestions: Array.isArray(stored.learningSuggestions) ? stored.learningSuggestions : def.learningSuggestions,
      subjects: Array.isArray(stored.subjects) && stored.subjects.length ? stored.subjects : def.subjects,
      experimentConfigs: Array.isArray(stored.experimentConfigs) ? stored.experimentConfigs : def.experimentConfigs,
      moduleConfigs: Array.isArray(stored.moduleConfigs) ? stored.moduleConfigs : def.moduleConfigs,
      projects: Array.isArray(stored.projects) ? stored.projects : def.projects
    };
    upgradeContent(merged, def, stored);
    const result = ensureSubjects(merged);
    /* Persist the upgrade immediately so it happens only once. */
    if ((Number(stored.contentVersion) || 0) !== CONTENT_VERSION) saveStored(result);
    return result;
  }

  let state = buildMerged();

  function getState() {
    return clone(state);
  }

  function setState(next) {
    const def = loadDefaults();
    const merged = {
      contentVersion: next.contentVersion != null
        ? (Number(next.contentVersion) || 0)
        : (state.contentVersion || CONTENT_VERSION),
      profile: next.profile || state.profile,
      socialLinks: next.socialLinks || state.socialLinks,
      learningSuggestions: next.learningSuggestions || state.learningSuggestions,
      subjects: next.subjects || state.subjects,
      experimentConfigs: next.experimentConfigs || state.experimentConfigs,
      moduleConfigs: next.moduleConfigs || state.moduleConfigs,
      projects: next.projects || state.projects
    };
    /* Imports of pre-version backups get the new built-in entries too. */
    upgradeContent(merged, def, { contentVersion: merged.contentVersion });
    state = ensureSubjects(merged);
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
          /* A backup made before content versioning is treated as version 0,
             so setState appends any built-in experiments/modules it lacks. */
          if (parsed.contentVersion == null) parsed.contentVersion = 0;
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
