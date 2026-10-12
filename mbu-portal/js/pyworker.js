/* =====================================================================
   pyworker.js  -  Sandbox web worker for the Online Code Lab.

   Loads Pyodide (CPython compiled to WebAssembly) and executes the
   student's Python code inside this worker, so a long or infinite
   program can never freeze the page and never touches the visitor's
   file system.  The worker is started lazily by js/pylab.js.

   Message in : { type: "run", id, code, stdin, packages }
   Messages out: { type: "ready" }
                 { type: "progress", id, text }
                 { type: "result", id, data }
   ===================================================================== */

importScripts("pycode.js");
importScripts("datasets.js");

const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.29.5/full/";

let pyodidePromise = null;
let runnerInstalled = false;
let datasetsSeeded = false;

const DATASETS_DIR = "/mbu-datasets";

function loadRuntime() {
  if (!pyodidePromise) {
    importScripts(PYODIDE_URL + "pyodide.js");
    pyodidePromise = loadPyodide({ indexURL: PYODIDE_URL });
  }
  return pyodidePromise;
}

/* Write the embedded datasets into Pyodide's in-memory file system so
   sns.load_dataset() works with no network at all. */
function seedDatasets(pyodide) {
  if (datasetsSeeded) return;
  try {
    const files = self.MBU_EMBEDDED_DATASETS || {};
    try { pyodide.FS.mkdirTree(DATASETS_DIR); } catch (e) { /* exists */ }
    Object.keys(files).forEach(function (name) {
      try {
        pyodide.FS.writeFile(DATASETS_DIR + "/" + name + ".csv", files[name],
          { encoding: "utf8" });
      } catch (e) { /* skip a single bad file */ }
    });
    if (self.MBU_DATASET_NAMES) {
      try {
        pyodide.FS.writeFile(DATASETS_DIR + "/dataset_names.txt",
          self.MBU_DATASET_NAMES, { encoding: "utf8" });
      } catch (e) { /* optional */ }
    }
    datasetsSeeded = true;
  } catch (e) { /* datasets stay optional */ }
}

/* Tell the Python bridge where to find bundled datasets. */
function publishDataPaths(pyodide) {
  try {
    pyodide.globals.set("MBU_DATA_DIR", DATASETS_DIR);
    let base = "";
    try {
      base = new URL("../assets/datasets/", self.location.href).href;
    } catch (e) { base = ""; }
    pyodide.globals.set("MBU_DATA_BASE", base);
  } catch (e) { /* optional */ }
}

function describeError(error) {
  const message = String((error && error.message) || error);
  if (/requested package|Can't load|not exist|failed to load/i.test(message)) {
    return "A required Python library could not be loaded.\n" + message;
  }
  return message;
}

self.onmessage = async function (event) {
  const message = event.data;
  if (!message || message.type !== "run") return;

  try {
    self.postMessage({ type: "progress", id: message.id, text: "Loading Python runtime…" });

    const pyodide = await loadRuntime();

    seedDatasets(pyodide);
    publishDataPaths(pyodide);

    /* msg.packages = { build: [...], pypi: [...], needs: [...] }
       build/needs ship with the Pyodide download; pypi entries are pure
       Python wheels installed with micropip (seaborn, openpyxl, ...). */
    const build = (message.packages && message.packages.build) || [];
    const needs = (message.packages && message.packages.needs) || [];
    const pypi = (message.packages && message.packages.pypi) || [];

    const toLoad = Array.from(
      new Set(build.concat(needs).concat(pypi.length ? ["micropip"] : []))
    );

    if (toLoad.length) {
      self.postMessage({
        type: "progress",
        id: message.id,
        text: "Loading " + toLoad.join(", ") + "…"
      });
      await pyodide.loadPackage(toLoad);
    }

    if (pypi.length) {
      self.postMessage({
        type: "progress",
        id: message.id,
        text: "Installing " + pypi.join(", ") + "…"
      });
      await pyodide.runPythonAsync(
        "import micropip\nawait micropip.install(" + JSON.stringify(pypi) + ")"
      );
    }

    if (!runnerInstalled) {
      pyodide.runPython(self.PY_RUNNER_SOURCE);
      runnerInstalled = true;
    }

    pyodide.globals.set("MBU_CODE", message.code);
    pyodide.globals.set("MBU_STDIN", message.stdin || "");

    self.postMessage({ type: "progress", id: message.id, text: "Running…" });

    const json = await pyodide.runPythonAsync("__mbu_run__(MBU_CODE, MBU_STDIN)");
    self.postMessage({ type: "result", id: message.id, data: JSON.parse(json) });
  } catch (error) {
    self.postMessage({
      type: "result",
      id: message.id,
      data: {
        stdout: "",
        stderr: describeError(error),
        figures: [],
        error: "SandboxError"
      }
    });
  }
};

self.postMessage({ type: "ready" });
