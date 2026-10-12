/* =====================================================================
   editor.js  -  Upgrades the existing Online Code Lab textarea
   (experiment.html #codeEditor) into a CodeMirror editor with syntax
   highlighting and line numbers.

   The upgrade is optional: when the CodeMirror CDN is unreachable the
   plain textarea keeps working exactly as it did before.

   compiler.js only ever reads/writes codeEditor.value, so the textarea
   value is proxied to the CodeMirror document to keep it in sync.
   ===================================================================== */

(function () {
  "use strict";

  const textarea = document.getElementById("codeEditor");
  if (!textarea || !window.CodeMirror) return;

  /* languageSelect is declared in compiler.js (loaded before this file) */
  const modeFor = {
    python: "python",
    java: "text/x-java",
    cpp: "text/x-c++src",
    c: "text/x-csrc",
    r: "r",
    sql: "sql"
  };

  let editor;
  try {
    editor = CodeMirror.fromTextArea(textarea, {
      lineNumbers: true,
      mode: "python",
      theme: "material-darker",
      tabSize: 4,
      indentUnit: 4,
      matchBrackets: true,
      autoCloseBrackets: true,
      extraKeys: {
        "Ctrl-Enter": function () {
          const run = document.getElementById("runCodeBtn");
          if (run) run.click();
        },
        "Cmd-Enter": function () {
          const run = document.getElementById("runCodeBtn");
          if (run) run.click();
        }
      }
    });
  } catch (e) {
    return; /* keep the plain textarea */
  }

  /* Keep .value reads/writes (used by compiler.js) working. */
  Object.defineProperty(textarea, "value", {
    configurable: true,
    get: function () { return editor.getValue(); },
    set: function (next) { editor.setValue(next == null ? "" : String(next)); }
  });

  function syncMode() {
    const language = typeof languageSelect !== "undefined" ? languageSelect.value : "python";
    editor.setOption("mode", modeFor[language] || "python");
  }

  if (typeof languageSelect !== "undefined") {
    languageSelect.addEventListener("change", syncMode);
    syncMode();
  }

  editor.refresh();
})();
