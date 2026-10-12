/* =====================================================================
   admin.js  -  Edit / Admin Mode engine (ADDITIVE - nothing existing
   is modified).

   Provides:
     - an Edit Mode entry button in the topbar (visible on every page)
       and a Ctrl+Shift+E shortcut, both gated by a password the admin
       chooses on first use (localStorage key "mbu-admin-pass")
     - a floating toolbar (Export / Import / Password / Reset / Exit) while active
     - confirm + form + code-editor dialogs that reuse the site's
       existing .modal / .btn design language
     - inline Save / Cancel editors for text and list fields
     - persistence helpers on top of MBUData (localStorage, existing
       "mbu-portal-data-v1" key - no new storage system)
     - a MutationObserver that re-runs page enhancers registered by
       admin-pages.js whenever the page re-renders (e.g. tab switches
       on the sub-experiment page)

   When Edit Mode is OFF nothing editing-related is visible: the entry
   button is hidden (CSS body:not(.adm-on) .adm-entry), so only
   Ctrl+Shift+E or ?admin=1 can open the sign-in dialog; every other
   admin control is hidden by CSS (body:not(.adm-on) .adm-ui) and is
   not even generated until the mode is switched on.
   ===================================================================== */
window.MBUAdmin = (function () {
  "use strict";

  /* ---- Password-less switch ----------------------------------------
     TEMPORARY: Edit Mode is open to everyone, no password required.
     Flip REQUIRE_PASSWORD back to true to restore the password gate;
     the password code below is kept intact for that.                 */
  const REQUIRE_PASSWORD = false;
  /* When true the ✎ Edit button is shown in the top bar to normal
     visitors (so anyone can enter Edit Mode without a shortcut). */
  const SHOW_ENTRY_ALWAYS = true;

  /* Password that gated Edit Mode - chosen by the admin on first use. */
  const PASS_KEY = "mbu-admin-pass"; /* password chosen by the admin on first use */
  function getPass() {
    try { return localStorage.getItem(PASS_KEY) || ""; } catch (e) { return ""; }
  }
  function setPass(value) {
    try { localStorage.setItem(PASS_KEY, value); return true; } catch (e) { return false; }
  }
  const SESSION_KEY = "mbu-admin-session";
  const SCROLL_KEY = "mbu-adm-scroll";

  const enhancers = [];
  let active = false;
  let observer = null;
  let observerTimer = null;
  let runningEnhancers = false;

  /* ------------------------------------------------------------------ */
  /* small helpers                                                       */
  /* ------------------------------------------------------------------ */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function toast(message) {
    if (typeof window.showToast === "function") window.showToast(message);
  }

  function sessionGet(key) {
    try { return sessionStorage.getItem(key); } catch (e) { return null; }
  }
  function sessionSet(key, value) {
    try { sessionStorage.setItem(key, value); } catch (e) { /* blocked */ }
  }
  function sessionRemove(key) {
    try { sessionStorage.removeItem(key); } catch (e) { /* blocked */ }
  }

  /* esc() comes from common.js (loaded before this file). */
  function escText(value) {
    return window.esc(String(value == null ? "" : value));
  }

  /* ------------------------------------------------------------------ */
  /* dialogs (confirm / form / code editor)                              */
  /* ------------------------------------------------------------------ */
  function buildBackdrop(id, innerHtml) {
    const backdrop = document.createElement("div");
    /* .adm-backdrop: admin.css makes the dialog fully inert the moment it
       closes (the shared style.css visibility fade would otherwise leave an
       invisible panel hit-testable for 0.25s, stealing page clicks) */
    backdrop.className = "modal-backdrop adm-backdrop";
    backdrop.id = id;
    backdrop.setAttribute("aria-hidden", "true");
    backdrop.innerHTML = innerHtml;
    document.body.appendChild(backdrop);
    backdrop.addEventListener("click", (ev) => {
      if (ev.target === backdrop) backdrop.dispatchEvent(new CustomEvent("adm:dismiss"));
    });
    return backdrop;
  }

  /* Confirm dialog: resolves true when the dangerous action is confirmed */
  function confirmAction(message, options) {
    options = options || {};
    return new Promise((resolve) => {
      let backdrop = $("#admConfirmBackdrop");
      if (!backdrop) {
        backdrop = buildBackdrop("admConfirmBackdrop", `
          <div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="admConfirmMsg">
            <div class="modal-head">
              <h2 id="admConfirmTitle">Please confirm</h2>
              <button class="icon-btn" type="button" data-adm-cancel aria-label="Close dialog">✕</button>
            </div>
            <p id="admConfirmMsg" style="margin:4px 0 18px;line-height:1.6"></p>
            <div class="modal-actions">
              <button class="btn btn-ghost" type="button" data-adm-cancel>Cancel</button>
              <button class="btn btn-adm-danger" type="button" data-adm-ok>Delete</button>
            </div>
          </div>`);
      }
      $("#admConfirmTitle", backdrop).textContent = options.title || "Please confirm";
      $("#admConfirmMsg", backdrop).textContent = message;
      $("[data-adm-ok]", backdrop).textContent = options.okLabel || "Delete";

      function finish(ok) {
        cleanup();
        backdrop.classList.remove("open");
        backdrop.setAttribute("aria-hidden", "true");
        resolve(ok);
      }
      function onOk() { finish(true); }
      function onCancel() { finish(false); }
      function onKey(ev) { if (ev.key === "Escape") finish(false); }
      function cleanup() {
        $("[data-adm-ok]", backdrop).removeEventListener("click", onOk);
        $$("[data-adm-cancel]", backdrop).forEach((b) => b.removeEventListener("click", onCancel));
        backdrop.removeEventListener("adm:dismiss", onCancel);
        document.removeEventListener("keydown", onKey);
      }

      $("[data-adm-ok]", backdrop).addEventListener("click", onOk);
      $$("[data-adm-cancel]", backdrop).forEach((b) => b.addEventListener("click", onCancel));
      backdrop.addEventListener("adm:dismiss", onCancel);
      document.addEventListener("keydown", onKey);
      backdrop.classList.add("open");
      backdrop.setAttribute("aria-hidden", "false");
      setTimeout(() => {
        const ok = $("[data-adm-ok]", backdrop);
        if (ok) ok.focus();
      }, 60);
    });
  }

  /* Form dialog: fields = [{key,label,value,type,placeholder,required}]
     Resolves {key: value} or null when cancelled. */
  function promptForm(title, fields, options) {
    options = options || {};
    return new Promise((resolve) => {
      let backdrop = $("#admFormBackdrop");
      if (!backdrop) {
        backdrop = buildBackdrop("admFormBackdrop", `
          <div class="modal" role="dialog" aria-modal="true" aria-labelledby="admFormTitle">
            <div class="modal-head">
              <h2 id="admFormTitle">Edit</h2>
              <button class="icon-btn" type="button" data-adm-cancel aria-label="Close dialog">✕</button>
            </div>
            <form id="admFormBody" novalidate></form>
            <p class="adm-dialog-error" id="admFormError" hidden></p>
            <div class="modal-actions">
              <button class="btn btn-ghost" type="button" data-adm-cancel>Cancel</button>
              <button class="btn btn-primary" type="submit" form="admFormBody"
                id="admFormOk">${escText(options.okLabel || "Save")}</button>
            </div>
          </div>`);
      }

      $("#admFormTitle", backdrop).textContent = title;
      $("#admFormOk", backdrop).textContent = options.okLabel || "Save";
      const form = $("#admFormBody", backdrop);
      const errorEl = $("#admFormError", backdrop);
      errorEl.hidden = true;
      form.innerHTML = fields.map((f) => {
        const id = "admF_" + f.key;
        const value = f.value == null ? "" : String(f.value);
        if (f.type === "textarea") {
          const rows = Math.min(12, Math.max(3, value.split("\n").length + 1));
          return `<div class="adm-form-field">
            <label for="${id}">${escText(f.label)}</label>
            <textarea id="${id}" data-key="${escText(f.key)}" rows="${rows}"
              placeholder="${escText(f.placeholder || "")}">${escText(value)}</textarea>
          </div>`;
        }
        return `<div class="adm-form-field">
          <label for="${id}">${escText(f.label)}</label>
          <input id="${id}" data-key="${escText(f.key)}" type="${escText(f.type || "text")}"
            value="${escText(value)}" placeholder="${escText(f.placeholder || "")}">
        </div>`;
      }).join("");

      function values() {
        const out = {};
        $$("[data-key]", form).forEach((el) => { out[el.dataset.key] = el.value; });
        return out;
      }
      function finish(result) {
        cleanup();
        backdrop.classList.remove("open");
        backdrop.setAttribute("aria-hidden", "true");
        resolve(result);
      }
      function onSubmit(ev) {
        ev.preventDefault();
        const vals = values();
        const missing = fields.find((f) => f.required && !String(vals[f.key] || "").trim());
        if (missing) {
          errorEl.textContent = missing.label + " is required.";
          errorEl.hidden = false;
          return;
        }
        finish(vals);
      }
      function onCancel() { finish(null); }
      function onKey(ev) { if (ev.key === "Escape") finish(null); }
      function cleanup() {
        form.removeEventListener("submit", onSubmit);
        $$("[data-adm-cancel]", backdrop).forEach((b) => b.removeEventListener("click", onCancel));
        backdrop.removeEventListener("adm:dismiss", onCancel);
        document.removeEventListener("keydown", onKey);
      }

      form.addEventListener("submit", onSubmit);
      $$("[data-adm-cancel]", backdrop).forEach((b) => b.addEventListener("click", onCancel));
      backdrop.addEventListener("adm:dismiss", onCancel);
      document.addEventListener("keydown", onKey);
      backdrop.classList.add("open");
      backdrop.setAttribute("aria-hidden", "false");
      setTimeout(() => {
        const first = $("input, textarea", form);
        if (first) { first.focus(); if (first.select) first.select(); }
      }, 60);
    });
  }

  /* Code editor dialog: edit / replace / copy / save / cancel / reset.
     Resolves the new code, or null when cancelled. */
  function editCode(title, value) {
    return new Promise((resolve) => {
      let backdrop = $("#admCodeBackdrop");
      if (!backdrop) {
        backdrop = buildBackdrop("admCodeBackdrop", `
          <div class="modal" role="dialog" aria-modal="true" aria-labelledby="admCodeTitle">
            <div class="modal-head">
              <h2 id="admCodeTitle">Edit code</h2>
              <button class="icon-btn" type="button" data-adm-cancel aria-label="Close code editor">✕</button>
            </div>
            <div class="adm-code-toolbar">
              <button class="btn btn-ghost" type="button" data-adm-copy>Copy</button>
              <button class="btn btn-ghost" type="button" data-adm-reset>Reset</button>
              <span class="adm-hint">Tab inserts 4 spaces · Esc cancels · Ctrl+Enter saves</span>
            </div>
            <textarea id="admCodeText" spellcheck="false" wrap="off"
              aria-label="Code editor"></textarea>
            <div class="modal-actions">
              <button class="btn btn-ghost" type="button" data-adm-cancel>Cancel</button>
              <button class="btn btn-primary" type="button" data-adm-save>Save changes</button>
            </div>
          </div>`);
      }

      const area = $("#admCodeText", backdrop);
      const original = String(value == null ? "" : value);
      area.value = original;
      $("#admCodeTitle", backdrop).textContent = title || "Edit code";

      function finish(result) {
        cleanup();
        backdrop.classList.remove("open");
        backdrop.setAttribute("aria-hidden", "true");
        resolve(result);
      }
      function onSave() { finish(area.value); }
      function onCancel() { finish(null); }
      function onReset() {
        area.value = original;
        area.focus();
        toast("Reset to the last saved version");
      }
      function onCopy() {
        const done = () => toast("✓ Code copied");
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(area.value).then(done)
            .catch(() => { area.select(); document.execCommand("copy"); done(); });
        } else {
          area.select();
          document.execCommand("copy");
          done();
        }
      }
      function onKey(ev) {
        if (ev.key === "Escape") { finish(null); return; }
        if (ev.key === "Tab") {
          ev.preventDefault();
          const s = area.selectionStart, e = area.selectionEnd;
          area.value = area.value.slice(0, s) + "    " + area.value.slice(e);
          area.selectionStart = area.selectionEnd = s + 4;
        }
        if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter") finish(area.value);
      }
      function cleanup() {
        $("[data-adm-save]", backdrop).removeEventListener("click", onSave);
        $("[data-adm-copy]", backdrop).removeEventListener("click", onCopy);
        $("[data-adm-reset]", backdrop).removeEventListener("click", onReset);
        $$("[data-adm-cancel]", backdrop).forEach((b) => b.removeEventListener("click", onCancel));
        backdrop.removeEventListener("adm:dismiss", onCancel);
        document.removeEventListener("keydown", onKey);
      }

      $("[data-adm-save]", backdrop).addEventListener("click", onSave);
      $("[data-adm-copy]", backdrop).addEventListener("click", onCopy);
      $("[data-adm-reset]", backdrop).addEventListener("click", onReset);
      $$("[data-adm-cancel]", backdrop).forEach((b) => b.addEventListener("click", onCancel));
      backdrop.addEventListener("adm:dismiss", onCancel);
      document.addEventListener("keydown", onKey);
      backdrop.classList.add("open");
      backdrop.setAttribute("aria-hidden", "false");
      setTimeout(() => area.focus(), 60);
    });
  }

  /* ------------------------------------------------------------------ */
  /* persistence on top of MBUData (existing localStorage architecture)  */
  /* ------------------------------------------------------------------ */
  function state() {
    return (window.MBUData && window.MBUData.getState()) || {};
  }

  /* kind: "experimentConfigs" | "moduleConfigs" | "learningSuggestions"
     (arrays) or "profile" | "socialLinks" (objects).
     mutator(workingCopy) edits the clone; the result is persisted. */
  function updateConfigs(kind, mutator) {
    if (!window.MBUData) return false;
    const listKinds = { experimentConfigs: 1, moduleConfigs: 1, learningSuggestions: 1, subjects: 1 };
    const current = state()[kind];
    const base = Array.isArray(current) ? current
      : (current && typeof current === "object" ? current
        : (listKinds[kind] ? [] : {}));
    const copy = JSON.parse(JSON.stringify(base));
    mutator(copy);
    const patch = {};
    patch[kind] = copy;
    return window.MBUData.setState(patch) !== false;
  }

  function reloadKeepScroll() {
    sessionSet(SCROLL_KEY, String(window.scrollY || 0));
    location.reload();
  }

  function restoreScroll() {
    const saved = sessionGet(SCROLL_KEY);
    if (saved == null) return;
    sessionRemove(SCROLL_KEY);
    requestAnimationFrame(() => window.scrollTo(0, Number(saved) || 0));
  }

  /* ------------------------------------------------------------------ */
  /* inline Save / Cancel editor                                         */
  /* ------------------------------------------------------------------ */
  /* spec = { label, kind: "text"|"lines", get(), set(value),
             render(value) -> html, hint, confirmRemovals } */
  function openInlineEditor(target, spec) {
    /* only one editor at a time per target */
    if (target.nextElementSibling &&
        target.nextElementSibling.classList &&
        target.nextElementSibling.classList.contains("adm-editor")) return;

    const isLines = spec.kind === "lines";
    const current = spec.get();
    const originalValue = isLines
      ? (Array.isArray(current) ? current.slice() : [])
      : String(current == null ? "" : current);
    const text = isLines ? originalValue.join("\n") : originalValue;

    const editor = document.createElement("div");
    editor.className = "adm-editor";
    editor.innerHTML = `
      <textarea aria-label="${escText(spec.label || "Edit")}"></textarea>
      <span class="adm-hint">${escText(spec.hint || (isLines
        ? "One item per line. Remove a line to delete that entry."
        : "The saved formatting is preserved exactly as typed."))}</span>
      <div class="adm-editor-actions">
        <button class="btn btn-ghost" type="button" data-adm-cancel>Cancel</button>
        <button class="btn btn-primary" type="button" data-adm-save>Save</button>
      </div>`;

    const area = $("textarea", editor);
    area.value = text;
    target.style.display = "none";
    target.parentNode.insertBefore(editor, target.nextSibling);
    area.focus();

    let removed = false;
    if (isLines) {
      const originalCount = originalValue.filter((l) => String(l).trim().length).length;
      area.addEventListener("input", () => {
        const lines = area.value.split("\n").map((l) => l.trim()).filter((l) => l.length);
        removed = lines.length < originalCount;
      });
    }

    function close() {
      editor.remove();
      target.style.display = "";
    }

    function doSave() {
      const value = isLines
        ? area.value.split("\n").map((l) => l.trim()).filter((l) => l.length)
        : area.value;
      const proceed = () => {
        let saved;
        try {
          saved = spec.set(value);
        } catch (e) {
          toast("Could not save: " + (e && e.message ? e.message : e));
          return;
        }
        if (saved === false) {
          toast("Could not save: browser storage is full or blocked.");
          return;
        }
        target.innerHTML = spec.render ? spec.render(value) : window.esc(value);
        close();
        toast("✓ " + (spec.label || "Content") + " saved");
      };
      if (removed && spec.confirmRemovals !== false) {
        confirmAction(
          "Saving will remove " +
          (originalValue.filter((l) => String(l).trim().length).length - value.length) +
          " item(s) from " + (spec.label || "this list") + ". Continue?",
          { okLabel: "Save anyway", title: "Remove items?" }
        ).then((ok) => { if (ok) proceed(); });
      } else {
        proceed();
      }
    }

    $("[data-adm-save]", editor).addEventListener("click", doSave);
    $("[data-adm-cancel]", editor).addEventListener("click", close);
    area.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") { ev.stopPropagation(); close(); }
      if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter") doSave();
    });
  }

  /* Inject a "✎ Edit" button into btnHost that edits target in place.
     The guard is per TARGET so a host element (e.g. the page hero) can
     carry more than one edit button (title + summary). */
  function bindEdit(btnHost, target, spec) {
    if (!btnHost || !target) return;
    if (target.dataset.admBound) return;
    target.dataset.admBound = "1";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "adm-edit-btn adm-ui";
    btn.textContent = "✎ Edit";
    btn.setAttribute("aria-label", "Edit " + (spec.label || "content"));
    btn.addEventListener("click", () => openInlineEditor(target, spec));
    btnHost.appendChild(btn);
  }

  /* ------------------------------------------------------------------ */
  /* mode switch                                                         */
  /* ------------------------------------------------------------------ */
  function buildToolbar() {
    if ($("#admToolbar")) return;
    const bar = document.createElement("div");
    bar.className = "adm-toolbar adm-ui";
    bar.id = "admToolbar";
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", "Edit mode controls");
    bar.innerHTML = `
      <span class="adm-badge"><span aria-hidden="true">✎</span> Edit Mode</span>
      <button class="btn btn-ghost" type="button" id="admExportBtn">Export</button>
      <button class="btn btn-ghost" type="button" id="admImportBtn">Import</button>
      ${REQUIRE_PASSWORD ? '<button class="btn btn-ghost" type="button" id="admPassBtn">Password</button>' : ""}
      <button class="btn btn-ghost" type="button" id="admResetBtn">Reset all</button>
      <button class="btn btn-primary" type="button" id="admExitBtn">Exit</button>`;
    document.body.appendChild(bar);

    const passBtn = $("#admPassBtn");
    if (passBtn) passBtn.addEventListener("click", () => {
      promptForm("Change admin password", [
        { key: "pass", label: "New password", type: "password", required: true,
          placeholder: "Choose a new password (min 4 characters)" },
        { key: "pass2", label: "Confirm password", type: "password", required: true,
          placeholder: "Type the same password again" }
      ], { okLabel: "Save password" }).then((values) => {
        if (!values) return;
        if (values.pass.length < 4) { toast("Use at least 4 characters for the password."); return; }
        if (values.pass !== values.pass2) { toast("Passwords do not match. Nothing changed."); return; }
        setPass(values.pass);
        toast("Password changed");
      });
    });

    $("#admExportBtn").addEventListener("click", () => {
      if (window.MBUData) { window.MBUData.exportJSON(); toast("Data exported"); }
    });

    $("#admImportBtn").addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json,.json";
      input.addEventListener("change", () => {
        const file = input.files && input.files[0];
        if (!file || !window.MBUData) return;
        window.MBUData.importJSON(file)
          .then(() => { toast("✓ Data imported"); reloadKeepScroll(); })
          .catch(() => toast("Import failed: the file is not a valid portal export."));
      });
      input.click();
    });

    $("#admResetBtn").addEventListener("click", () => {
      confirmAction(
        "Reset ALL edited content (experiments, sub-experiments, modules, materials) " +
        "back to the built-in defaults? Export a backup first if you may need these edits.",
        { okLabel: "Reset everything", title: "Reset all content" }
      ).then((ok) => {
        if (!ok || !window.MBUData) return;
        window.MBUData.resetToDefaults();
        toast("All content reset to defaults");
        reloadKeepScroll();
      });
    });

    $("#admExitBtn").addEventListener("click", () => deactivate(true));
  }

  function runEnhancers() {
    if (!active || runningEnhancers) return;
    runningEnhancers = true;
    try {
      enhancers.forEach((fn) => {
        try { fn(); } catch (e) {
          if (window.console) console.warn("admin enhancer failed:", e);
        }
      });
    } finally {
      runningEnhancers = false;
    }
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(() => {
      if (!active || runningEnhancers) return;
      clearTimeout(observerTimer);
      observerTimer = setTimeout(runEnhancers, 180);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function activate() {
    if (active) return;
    active = true;
    sessionSet(SESSION_KEY, "1");
    document.body.classList.add("adm-on");
    const entry = $("#admEntryBtn");
    if (entry) entry.title = "Exit Edit Mode (Ctrl+Shift+E)";
    buildToolbar();
    startObserver();
    runEnhancers();
    restoreScroll();
    toast("✎ Edit Mode ON - editing controls are now visible");
  }

  function deactivate(reload) {
    active = false;
    sessionRemove(SESSION_KEY);
    if (reload !== false) {
      location.reload();
      return;
    }
    document.body.classList.remove("adm-on");
    const entry = $("#admEntryBtn");
    if (entry) entry.title = "Admin / Edit Mode (Ctrl+Shift+E)";
    const bar = $("#admToolbar");
    if (bar) bar.remove();
    if (observer) { observer.disconnect(); observer = null; }
  }

  /* ------------------------------------------------------------------ */
  /* entry button + passcode gate                                        */
  /* ------------------------------------------------------------------ */
  function buildEntry() {
    const host = $(".topbar-actions");
    if (!host || $("#admEntryBtn")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "icon-btn adm-entry" + (SHOW_ENTRY_ALWAYS ? " adm-entry-visible" : "");
    btn.id = "admEntryBtn";
    btn.title = "Admin / Edit Mode";
    btn.setAttribute("aria-label", "Toggle Admin Edit Mode");
    btn.textContent = "✎";
    host.insertBefore(btn, host.firstChild);
    btn.addEventListener("click", () => {
      if (active) { deactivate(true); return; }
      askPasscode();
    });
  }

  function askPasscode() {
    /* password-less mode: enter Edit Mode straight away */
    if (!REQUIRE_PASSWORD) { activate(); return; }
    /* first run: the admin creates their own password */
    if (!getPass()) {
      promptForm("Create admin password", [
        { key: "pass", label: "Password", type: "password", required: true,
          placeholder: "Choose a password (min 4 characters)" },
        { key: "pass2", label: "Confirm password", type: "password", required: true,
          placeholder: "Type the same password again" }
      ], { okLabel: "Create password" }).then((values) => {
        if (!values) return;
        if (values.pass.length < 4) {
          toast("Use at least 4 characters for the password.");
          askPasscode();
          return;
        }
        if (values.pass !== values.pass2) {
          toast("Passwords do not match. Try again.");
          askPasscode();
          return;
        }
        setPass(values.pass);
        toast("Password saved - Edit Mode ON");
        activate();
      });
      return;
    }
    promptForm("Admin sign-in", [
      { key: "pass", label: "Password", type: "password", required: true,
        placeholder: "Enter your admin password" }
    ], { okLabel: "Enter" }).then((values) => {
      if (!values) return;
      if (values.pass === getPass()) activate();
      else toast("Wrong password. Edit Mode stays off.");
    });
  }

  /* ------------------------------------------------------------------ */
  /* public API                                                          */
  /* ------------------------------------------------------------------ */
  function register(fn) {
    if (typeof fn === "function") enhancers.push(fn);
    if (active) { try { fn(); } catch (e) { /* page-specific */ } }
  }

  return {
    isActive: () => active,
    activate,
    deactivate,
    register,
    runEnhancers,
    buildEntry,
    confirm: confirmAction,
    prompt: promptForm,
    editCode,
    bindEdit,
    openInlineEditor,
    updateConfigs,
    state,
    reloadKeepScroll,
    toast
  };
})();

/* boot: entry button, keyboard shortcut, session + scroll restore */
(function () {
  function start() {
    if (window.MBUAdmin) {
      MBUAdmin.buildEntry();
      try {
        /* ?admin=1 skips the passcode once (documented shortcut) */
        if (new URLSearchParams(window.location.search).get("admin") === "1") {
          sessionStorage.setItem("mbu-admin-session", "1");
        }
        if (sessionStorage.getItem("mbu-admin-session") === "1") MBUAdmin.activate();
        else {
          const saved = sessionStorage.getItem("mbu-adm-scroll");
          if (saved != null) {
            sessionStorage.removeItem("mbu-adm-scroll");
            requestAnimationFrame(() => window.scrollTo(0, Number(saved) || 0));
          }
        }
      } catch (e) { /* storage blocked */ }
    }
  }

  document.addEventListener("keydown", (ev) => {
    if (ev.ctrlKey && ev.shiftKey && (ev.key === "E" || ev.key === "e") && window.MBUAdmin) {
      ev.preventDefault();
      if (MBUAdmin.isActive()) MBUAdmin.deactivate(true);
      else {
        const entry = document.getElementById("admEntryBtn");
        if (entry) entry.click();
        else MBUAdmin.activate();
      }
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
