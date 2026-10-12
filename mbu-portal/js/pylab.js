/* =====================================================================
   pylab.js  -  Local Python sandbox used by the Online Code Lab.

   Runs Python with Pyodide (CPython -> WebAssembly) in a Web Worker so
   that pandas / numpy / matplotlib / seaborn / scipy / scikit-learn
   work inside the browser, plots are captured as images, and programs
   are stopped after a time limit.

   Fallbacks:
     - no Worker (page opened straight from disk) -> run on the main
       thread, without a hard time limit,
     - sandbox unavailable (no internet, CDN blocked) -> run() reports
       { unavailable: true } so the existing online compiler (Judge0)
       keeps working exactly as before.

   Public API:
     PyLab.run({ code, stdin, onProgress }) -> Promise<result>
   ===================================================================== */

window.PyLab = (function () {
  "use strict";

  const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.29.5/full/";
  const PREPARE_LIMIT = 90000;  // downloading Python + libraries
  const EXECUTE_LIMIT = 30000;  // running the program
  const OUTPUT_LIMIT = 200000;  // keep the output box usable
  const WORKER_READY_LIMIT = 8000;

  /* Where each imported module comes from:
     - a string   -> package ships with the Pyodide build (loadPackage)
     - { pypi }   -> pure Python wheel installed from PyPI with micropip,
                     `needs` are the Pyodide packages that must be loaded
                     first so the wheel's requirements are satisfied.
     Modules that are neither are left alone: they are either part of the
     Python standard library or unavailable (reported by the runner). */
  const PACKAGES = {
    numpy: "numpy",
    pandas: "pandas",
    matplotlib: "matplotlib",
    scipy: "scipy",
    sklearn: "scikit-learn",
    skimage: "scikit-image",
    statsmodels: "statsmodels",
    sympy: "sympy",
    networkx: "networkx",
    PIL: "pillow",
    pyarrow: "pyarrow",
    xgboost: "xgboost",
    requests: "requests",
    bs4: "beautifulsoup4",
    lxml: "lxml",
    yaml: "pyyaml",
    bokeh: "bokeh",
    altair: "altair",
    seaborn: { pypi: "seaborn", needs: ["numpy", "pandas", "matplotlib"] },
    openpyxl: { pypi: "openpyxl", needs: [] },
    plotly: { pypi: "plotly", needs: [] }
  };

  const LIBRARY_HINT =
    "\n\nAvailable in this sandbox: numpy, pandas, matplotlib, seaborn, plotly," +
    " altair, bokeh, scipy, scikit-learn, scikit-image, statsmodels, sympy," +
    " networkx, pillow, pyarrow, xgboost, requests, openpyxl and more.";

  let worker = null;
  let workerReady = null;    // Promise resolving to "worker" | "thread" | null
  let threadRuntime = null;  // Promise for the main-thread fallback
  let datasetsScriptPromise = null;  // js/datasets.js loaded for the fallback
  let threadDatasetsSeeded = false;
  let pending = null;        // current run handled by the worker
  let sequence = 0;

  /* ---------------- package detection ---------------- */
  function detectPackages(code) {
    const build = new Set();
    const pypi = new Set();
    const needs = new Set();

    const remember = (moduleName) => {
      // "matplotlib.pyplot" / "sklearn.linear_model" -> top-level module
      const top = String(moduleName).split(".")[0];
      const spec = PACKAGES[top];
      if (!spec) return;
      if (typeof spec === "string") {
        build.add(spec);
      } else {
        pypi.add(spec.pypi);
        (spec.needs || []).forEach((dependency) => needs.add(dependency));
      }
    };

    const importLine = /^[ \t]*(?:import[ \t]+([^#\n]+)|from[ \t]+([A-Za-z_][A-Za-z0-9_.]*)[ \t]+import)/gm;
    let match;
    while ((match = importLine.exec(code)) !== null) {
      if (match[2]) {
        remember(match[2]);
      } else if (match[1]) {
        match[1].split(",").forEach((part) => {
          const name = part.trim().split(/[ \t]/)[0];
          if (name) remember(name);
        });
      }
    }
    return {
      build: Array.from(build),
      pypi: Array.from(pypi),
      needs: Array.from(needs)
    };
  }

  /* ---------------- worker ---------------- */
  function resetWorker() {
    if (worker) {
      try { worker.terminate(); } catch (e) { /* already gone */ }
    }
    worker = null;
    workerReady = null;
    pending = null;
  }

  function prepareWorker() {
    if (workerReady) return workerReady;

    workerReady = new Promise((resolve) => {
      let settled = false;

      const useThread = () => {
        if (settled) return;
        settled = true;
        if (worker) { try { worker.terminate(); } catch (e) {} }
        worker = null;
        threadReady()
          .then(() => resolve("thread"))
          .catch(() => resolve(null));
      };

      const useWorker = (created) => {
        if (settled) return;
        settled = true;
        worker = created;
        worker.onmessage = onWorkerMessage;
        worker.onerror = onWorkerError;
        resolve("worker");
      };

      let created;
      try {
        created = new Worker("js/pyworker.js");
      } catch (e) {
        useThread();
        return;
      }

      const guard = setTimeout(useThread, WORKER_READY_LIMIT);
      created.onmessage = (event) => {
        if (event.data && event.data.type === "ready") {
          clearTimeout(guard);
          useWorker(created);
        }
      };
      created.onerror = () => {
        clearTimeout(guard);
        useThread();
      };
    });

    return workerReady;
  }

  function onWorkerMessage(event) {
    const message = event.data;
    if (!message || !pending || pending.id !== message.id) return;

    if (message.type === "progress") {
      pending.onProgress(message.text);
      pending.armLimit(/running/i.test(message.text) ? EXECUTE_LIMIT : PREPARE_LIMIT);
      return;
    }

    if (message.type === "result") {
      const finish = pending.finish;
      finish(normalise(message.data));
    }
  }

  function onWorkerError() {
    const current = pending;
    resetWorker();
    if (current) {
      current.finish({
        error: "SandboxError",
        errorLabel: "Sandbox Error",
        stdout: "",
        stderr: "The Python sandbox stopped unexpectedly. Please run the code again.",
        figures: [],
        outputs: []
      });
    }
  }

  function runInWorker(code, stdin, packages, onProgress) {
    return new Promise((resolve) => {
      if (!worker) {
        resolve({ unavailable: true });
        return;
      }

      const id = ++sequence;
      let timer = null;

      const finish = (payload) => {
        if (timer) clearTimeout(timer);
        if (pending && pending.id === id) pending = null;
        resolve(payload);
      };

      const armLimit = (milliseconds) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          resetWorker();
          resolve({
            error: "Timeout",
            errorLabel: "Timeout",
            stdout: "",
            stderr:
              "The program took longer than " +
              Math.round(milliseconds / 1000) +
              " seconds and was stopped.\n" +
              "Try processing less data or simplifying the program.",
            figures: [],
            outputs: []
          });
        }, milliseconds);
      };

      pending = { id, onProgress, armLimit, finish };
      armLimit(PREPARE_LIMIT);

      try {
        worker.postMessage({ type: "run", id, code, stdin, packages });
      } catch (e) {
        finish({ unavailable: true });
      }
    });
  }

  /* ---------------- main-thread fallback ---------------- */
  function threadReady() {
    if (threadRuntime) return threadRuntime;

    threadRuntime = new Promise((resolve, reject) => {
      const start = () => {
        if (typeof window.loadPyodide !== "function") {
          reject(new Error("Python runtime unavailable"));
          return;
        }
        window.loadPyodide({ indexURL: PYODIDE_URL }).then(resolve, reject);
      };

      if (typeof window.loadPyodide === "function") {
        start();
        return;
      }

      const script = document.createElement("script");
      script.src = PYODIDE_URL + "pyodide.js";
      script.onload = start;
      script.onerror = () => reject(new Error("Python runtime unreachable"));
      document.head.appendChild(script);
    });

    threadRuntime.catch(() => { threadRuntime = null; });
    return threadRuntime;
  }

  function dedupe(list) {
    return Array.from(new Set(list));
  }

  /* Shared by both sandbox paths: load what ships with Pyodide, then
     install the pure-Python extras from PyPI. */
  async function installPackages(runtime, packages, onProgress) {
    const toLoad = dedupe(
      (packages.build || [])
        .concat(packages.needs || [])
        .concat((packages.pypi || []).length ? ["micropip"] : [])
    );

    if (toLoad.length) {
      onProgress("Loading " + toLoad.join(", ") + "…");
      await runtime.loadPackage(toLoad);
    }

    if (packages.pypi && packages.pypi.length) {
      onProgress("Installing " + packages.pypi.join(", ") + "…");
      await runtime.runPythonAsync(
        "import micropip\nawait micropip.install(" +
          JSON.stringify(packages.pypi) +
          ")"
      );
    }
  }

  /* The main-thread fallback has to pull in the bundled datasets script
     (the worker gets it through importScripts). */
  function loadDatasetsScript() {
    if (window.MBU_EMBEDDED_DATASETS) return Promise.resolve();
    if (datasetsScriptPromise) return datasetsScriptPromise;
    datasetsScriptPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "js/datasets.js";
      script.onload = () => resolve();
      script.onerror = () => resolve();  // datasets are optional
      document.head.appendChild(script);
    });
    return datasetsScriptPromise;
  }

  function seedDatasetsThread(pyodide) {
    if (threadDatasetsSeeded) return;
    try {
      const files = window.MBU_EMBEDDED_DATASETS || {};
      const dir = "/mbu-datasets";
      try { pyodide.FS.mkdirTree(dir); } catch (e) { /* exists */ }
      Object.keys(files).forEach((name) => {
        try {
          pyodide.FS.writeFile(dir + "/" + name + ".csv", files[name],
            { encoding: "utf8" });
        } catch (e) { /* skip */ }
      });
      if (window.MBU_DATASET_NAMES) {
        try {
          pyodide.FS.writeFile(dir + "/dataset_names.txt",
            window.MBU_DATASET_NAMES, { encoding: "utf8" });
        } catch (e) { /* optional */ }
      }
      pyodide.globals.set("MBU_DATA_DIR", dir);
      let base = "";
      try { base = new URL("assets/datasets/", document.baseURI).href; } catch (e) { base = ""; }
      pyodide.globals.set("MBU_DATA_BASE", base);
      threadDatasetsSeeded = true;
    } catch (e) { /* optional */ }
  }

  async function runInThread(code, stdin, packages, onProgress) {
    try {
      onProgress("Preparing Python runtime…");
      const pyodide = await threadReady();

      if (!window.PY_RUNNER_SOURCE) return { unavailable: true };

      await installPackages(pyodide, packages, onProgress);
      await loadDatasetsScript();
      seedDatasetsThread(pyodide);

      pyodide.runPython(window.PY_RUNNER_SOURCE);
      pyodide.globals.set("MBU_CODE", code);
      pyodide.globals.set("MBU_STDIN", stdin);

      onProgress("Running…");
      const json = await pyodide.runPythonAsync("__mbu_run__(MBU_CODE, MBU_STDIN)");
      return normalise(JSON.parse(json));
    } catch (error) {
      const message = String((error && error.message) || error);
      if (/unreachable|failed to fetch|networkerror|python runtime/i.test(message)) {
        return { unavailable: true };
      }
      return {
        error: "SandboxError",
        errorLabel: "Sandbox Error",
        stdout: "",
        stderr: message,
        figures: [],
        outputs: []
      };
    }
  }

  /* ---------------- result clean-up ---------------- */
  function normalise(data) {
    const result = {
      stdout: (data && data.stdout) || "",
      stderr: (data && data.stderr) || "",
      figures: (data && data.figures) || [],
      plotly: (data && data.plotly) || [],
      altair: (data && data.altair) || [],
      bokeh: (data && data.bokeh) || [],
      outputs: (data && data.outputs) || [],
      error: (data && data.error) || null
    };

    if (result.stdout.length > OUTPUT_LIMIT) {
      result.stdout = result.stdout.slice(0, OUTPUT_LIMIT) + "\n… (output truncated)";
    }
    if (result.stderr.length > OUTPUT_LIMIT) {
      result.stderr = result.stderr.slice(0, OUTPUT_LIMIT) + "\n… (output truncated)";
    }
    if (result.error && /ModuleNotFoundError/i.test(result.stderr)) {
      result.stderr += LIBRARY_HINT;
    }
    if (result.error && result.error !== "Timeout" && result.error !== "SandboxError") {
      result.errorLabel = "Runtime Error";
    }
    return result;
  }

  /* ---------------- public API ---------------- */
  async function run(options) {
    const code = (options && options.code) || "";
    const stdin = (options && options.stdin) || "";
    const onProgress = (options && options.onProgress) || function () {};
    const packages = detectPackages(code);

    let target = null;
    try {
      target = await prepareWorker();
    } catch (e) {
      target = null;
    }

    if (!target) return { unavailable: true };

    const result =
      target === "worker"
        ? await runInWorker(code, stdin, packages, onProgress)
        : await runInThread(code, stdin, packages, onProgress);

    return result;
  }

  /* Stop the program that is currently running (terminates the worker,
     which is then recreated lazily on the next run). */
  function stop() {
    const current = pending;
    resetWorker();
    if (current) {
      current.finish({
        error: "Stopped",
        errorLabel: "Stopped",
        stdout: "",
        stderr: "Execution stopped.",
        figures: [],
        outputs: []
      });
    }
  }

  /* Restart the Python runtime from scratch (fresh worker / kernel). */
  function restart() {
    stop();
    worker = null;
    workerReady = null;
    pending = null;
    return prepareWorker();
  }

  return {
    run: run,
    detectPackages: detectPackages,
    stop: stop,
    restart: restart
  };
})();
