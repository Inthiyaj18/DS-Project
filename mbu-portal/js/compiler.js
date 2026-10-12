// ============================================================
// MBU DATA SCIENCE LAB - ONLINE CODE COMPILER
// Supports: Python, Java, C++, C, R, SQL
// ============================================================

const languageSelect = document.getElementById("languageSelect");
const codeEditor = document.getElementById("codeEditor");
const fileName = document.getElementById("fileName");

const runCodeBtn = document.getElementById("runCodeBtn");
const resetCodeBtn = document.getElementById("resetCode");
const copyCodeBtn = document.getElementById("copyCode");

const programInput = document.getElementById("programInput");
const programOutput = document.getElementById("programOutput");

const clearInput = document.getElementById("clearInput");
const clearOutput = document.getElementById("clearOutput");

const compilerStatus = document.getElementById("compilerStatus");
const executionTime = document.getElementById("executionTime");

/* Last stdin typed in the terminal - echoed back into the output
   scrollback when a run finishes, like a real terminal. */
let lastInput = "";

function echoInput() {
    if (!lastInput || !lastInput.trim()) return "";
    return lastInput.replace(/\n+$/, "").split("\n").map(function (line, index) {
        return (index === 0 ? "› " : "  ") + line;
    }).join("\n") + "\n\n";
}


// ============================================================
// JUDGE0 CONFIGURATION
// ============================================================

// Public Judge0 CE endpoint.
// For production, use your own Judge0 instance or API provider.
const JUDGE0_URL = "https://ce.judge0.com";


// ============================================================
// LANGUAGE IDS
// ============================================================

const languages = {

    python: {
        id: 71,
        name: "Python",
        file: "main.py"
    },

    java: {
        id: 62,
        name: "Java",
        file: "Main.java"
    },

    cpp: {
        id: 54,
        name: "C++",
        file: "main.cpp"
    },

    c: {
        id: 50,
        name: "C",
        file: "main.c"
    },

    r: {
        id: 80,
        name: "R",
        file: "main.r"
    },

    sql: {
        id: 82,
        name: "SQL",
        file: "query.sql"
    }

};


// ============================================================
// DEFAULT PROGRAMS
// ============================================================

const templates = {

    python: `# Python Experiment

name = input("Enter your name: ")

print("Hello,", name)`,

    java: `import java.util.Scanner;

public class Main {

    public static void main(String[] args) {

        Scanner sc = new Scanner(System.in);

        System.out.print("Enter your name: ");

        String name = sc.nextLine();

        System.out.println("Hello, " + name);

    }
}`,

    cpp: `#include <iostream>
#include <string>

using namespace std;

int main() {

    string name;

    cout << "Enter your name: ";

    cin >> name;

    cout << "Hello, " << name << endl;

    return 0;
}`,

    c: `#include <stdio.h>

int main() {

    char name[50];

    printf("Enter your name: ");

    scanf("%49s", name);

    printf("Hello, %s\\n", name);

    return 0;
}`,

    r: `# R Experiment

name <- readline("Enter your name: ")

cat("Hello,", name, "\\n")`,

    sql: `-- SQL Experiment

CREATE TABLE students (
    id INTEGER,
    name VARCHAR(50),
    marks INTEGER
);

INSERT INTO students VALUES
(1, 'Inthiyaj', 85),
(2, 'Rahul', 78),
(3, 'Anu', 92);

SELECT * FROM students;`

};


// ============================================================
// LOAD TEMPLATE
// ============================================================

function loadTemplate(language) {

    const config = languages[language];

    if (!config) return;

    fileName.textContent = config.file;

    codeEditor.value = templates[language];

    programOutput.textContent =
        "Run your program to see the output...";

    compilerStatus.textContent =
        "● Ready";

    executionTime.textContent =
        "Execution time: —";
}


// Code editor now auto-detects visualizations (matplotlib, seaborn,
// plotly, altair, bokeh) from the student's code - no manual
// example selector is required. The dropdown was removed so charts
// always render whenever plotting libraries or plots appear.


// ============================================================
// LANGUAGE CHANGE
// ============================================================

languageSelect.addEventListener("change", function () {

    loadTemplate(this.value);

});


// ============================================================
// RESET CODE
// ============================================================

resetCodeBtn.addEventListener("click", function () {

    const language = languageSelect.value;

    loadTemplate(language);

});


// ============================================================
// COPY CODE
// ============================================================

copyCodeBtn.addEventListener("click", async function () {

    try {

        await navigator.clipboard.writeText(
            codeEditor.value
        );

        copyCodeBtn.textContent = "Copied!";

        setTimeout(() => {

            copyCodeBtn.textContent = "Copy";

        }, 1500);

    } catch (error) {

        console.error(error);

        alert("Unable to copy code.");

    }

});


// ============================================================
// CLEAR INPUT
// ============================================================

clearInput.addEventListener("click", function () {

    programInput.value = "";

});


// ============================================================
// CLEAR OUTPUT
// ============================================================

clearOutput.addEventListener("click", function () {

    programOutput.textContent =
        "Run your program to see the output...";

    programOutput.style.display = "";

    const plots = document.getElementById("plotOutput");
    if (plots) {
        plots.innerHTML = "";
        plots.hidden = true;
    }

    compilerStatus.textContent =
        "● Ready";

    executionTime.textContent =
        "Execution time: —";

});


// ============================================================
// RUN CODE
// ============================================================

runCodeBtn.addEventListener("click", async function () {

    const language = languageSelect.value;

    const code = codeEditor.value;

    const input = programInput.value;

    lastInput = input;

    const config = languages[language];


    // ------------------------------------------
    // Basic validation
    // ------------------------------------------

    if (!code.trim()) {

        programOutput.textContent =
            "Please write some code first.";

        compilerStatus.textContent =
            "● Error";

        return;
    }


    // ------------------------------------------
    // Disable button
    // ------------------------------------------

    runCodeBtn.disabled = true;

    runCodeBtn.innerHTML =
        "⏳ Running...";


    compilerStatus.textContent =
        "● Compiling...";

    programOutput.textContent =
        "Executing your program...";

    executionTime.textContent =
        "Execution time: —";


    const startTime = performance.now();


    try {

        // ------------------------------------------
        // Python runs in the local sandbox (Pyodide)
        // so pandas / numpy / matplotlib / seaborn
        // and plots work. If the sandbox cannot be
        // used we simply continue with the online
        // compiler below - behaviour is unchanged.
        // ------------------------------------------

        if (language === "python" && window.PyLab) {

            programOutput.textContent =
                "Starting the Python sandbox…\n\n" +
                "The first run downloads Python and the required libraries, " +
                "so it can take up to a minute. Later runs start instantly.";

            let local = null;

            try {
                local = await PyLab.run({
                    code: code,
                    stdin: input,
                    onProgress: function (text) {
                        compilerStatus.textContent = "● " + text;
                    }
                });
            } catch (e) {
                local = null;
            }

            if (local && !local.unavailable) {
                displayPyResult(local, performance.now() - startTime);
                return;
            }

            compilerStatus.textContent =
                "● Compiling...";

            programOutput.textContent =
                "Executing your program...";
        }


        // ------------------------------------------
        // Submit code to Judge0
        // ------------------------------------------

        const response = await fetch(
            `${JUDGE0_URL}/submissions?base64_encoded=false&wait=false`,
            {

                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    language_id: config.id,

                    source_code: code,

                    stdin: input,

                    cpu_time_limit: 5,

                    memory_limit: 128000

                })

            }
        );


        if (!response.ok) {

            throw new Error(
                `Compiler server returned ${response.status}`
            );

        }


        const submission = await response.json();

        const token = submission.token;


        if (!token) {

            throw new Error(
                "No submission token received."
            );

        }


        // ------------------------------------------
        // Wait for result
        // ------------------------------------------

        const result =
            await waitForResult(token);


        // ------------------------------------------
        // Display result
        // ------------------------------------------

        displayResult(result);


        const endTime = performance.now();

        executionTime.textContent =
            `Execution time: ${((endTime - startTime) / 1000).toFixed(2)}s`;


    } catch (error) {

        console.error(error);

        programOutput.textContent =
            "Compiler Error\n\n" +
            error.message +
            "\n\nPlease check your internet connection or compiler server.";

        compilerStatus.textContent =
            "● Error";


    } finally {

        runCodeBtn.disabled = false;

        runCodeBtn.innerHTML =
            "▶ Run Code";

    }

});


// ============================================================
// WAIT FOR JUDGE0 RESULT
// ============================================================

async function waitForResult(token) {

    const maxAttempts = 30;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {

        const response = await fetch(
            `${JUDGE0_URL}/submissions/${token}?base64_encoded=false`
        );


        if (!response.ok) {

            throw new Error(
                `Unable to retrieve execution result.`
            );

        }


        const result = await response.json();


        /*
          Judge0 statuses:

          1 = In Queue
          2 = Processing
          3 = Accepted
          4 = Wrong Answer
          5 = Time Limit Exceeded
          6 = Compilation Error
          7+ = Runtime/System Errors
        */


        if (
            result.status &&
            result.status.id > 2
        ) {

            return result;

        }


        await new Promise(resolve =>
            setTimeout(resolve, 1000)
        );

    }


    throw new Error(
        "Execution timed out."
    );

}


// ============================================================
// DISPLAY RESULT
// ============================================================

function displayResult(result) {

    let output = "";


    // ------------------------------------------
    // Compilation error
    // ------------------------------------------

    if (result.compile_output) {

        output +=
            "COMPILATION ERROR\n\n";

        output +=
            result.compile_output;

    }


    // ------------------------------------------
    // Runtime error
    // ------------------------------------------

    else if (result.stderr) {

        output +=
            "ERROR\n\n";

        output +=
            result.stderr;

    }


    // ------------------------------------------
    // Normal output
    // ------------------------------------------

    else if (result.stdout) {

        output +=
            result.stdout;

    }


    // ------------------------------------------
    // No output
    // ------------------------------------------

    else {

        output =
            "Program executed successfully.\n\n" +
            "No output was produced.";

    }


    programOutput.textContent =
        echoInput() + output;


    // ------------------------------------------
    // Status
    // ------------------------------------------

    if (
        result.status &&
        result.status.id === 3
    ) {

        compilerStatus.textContent =
            "● Execution successful";

    } else {

        compilerStatus.textContent =
            `● ${result.status?.description || "Execution finished"}`;

    }

}


// ============================================================
// ON-DEMAND CDN SCRIPTS (vega / bokeh are loaded only when a
// chart from those libraries actually has to be rendered)
// ============================================================

const dynamicScripts = {};

function loadScriptOnce(src) {
    if (!dynamicScripts[src]) {
        dynamicScripts[src] = new Promise(function (resolve, reject) {
            const script = document.createElement("script");
            script.src = src;
            script.onload = function () { resolve(true); };
            script.onerror = function () {
                delete dynamicScripts[src];
                reject(new Error("Failed to load " + src));
            };
            document.head.appendChild(script);
        });
    }
    return dynamicScripts[src];
}


// ============================================================
// DISPLAY PYTHON (SANDBOX) RESULT
// Text / tables come back as plain text, matplotlib charts as
// PNG images rendered under the output.
// ============================================================

/* ============================================================
   RICH OUTPUT RENDERING
   The Python sandbox returns an ordered `outputs` list; each entry
   becomes a node in the output panel:
     text      -> monospace block
     error     -> error block (traceback)
     dataframe -> interactive table (search / sort / pages / CSV)
     image     -> chart PNG (with a download button)
     plotly    -> interactive plotly chart
     altair    -> Vega-Lite chart (rendered with vega-embed)
     bokeh     -> Bokeh chart
   ============================================================ */

function mbuNode(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
}

function mbuTextBlock(text) {
    if (text === undefined || text === null) return null;
    const value = String(text);
    if (!value) return null;
    return mbuNode("pre", "mbu-block mbu-text", value);
}

function mbuErrorBlock(text) {
    const block = mbuNode("div", "mbu-block mbu-error");
    block.appendChild(mbuNode("strong", "mbu-error-title", "Error"));
    block.appendChild(mbuNode("pre", null, String(text || "The program failed.")));
    return block;
}

/* ---- interactive DataFrame / Series table ---- */
function mbuTableBlock(payload) {
    const shape = payload.shape || [0, 0];
    const columns = payload.columns || [];
    const indexName = payload.index_name || "(index)";
    const indexValues = payload.index || [];
    const cellRows = payload.rows || [];
    const rawRows = [];
    for (let i = 0; i < cellRows.length; i++) {
        rawRows.push([indexValues[i]].concat(cellRows[i]));
    }

    const wrap = mbuNode("div", "mbu-block mbu-table");

    /* toolbar */
    const bar = mbuNode("div", "mbu-table-bar");
    const title = mbuNode("span", "mbu-table-title");
    title.textContent = (payload.name || "DataFrame") + " · " +
        shape[0] + " rows × " + shape[1] + " cols" +
        (payload.truncated ? " · showing first " + payload.shown : "");
    bar.appendChild(title);

    const search = document.createElement("input");
    search.type = "search";
    search.className = "mbu-search";
    search.placeholder = "Search rows…";
    search.setAttribute("aria-label", "Search table rows");
    bar.appendChild(search);

    const download = mbuNode("button", "mbu-download");
    download.type = "button";
    download.textContent = "Download CSV";
    bar.appendChild(download);

    wrap.appendChild(bar);

    const scroll = mbuNode("div", "mbu-table-scroll");
    const table = mbuNode("table", "mbu-grid");
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    table.appendChild(thead);
    thead.appendChild(headRow);

    const defs = [{ name: indexName, dtype: "" }].concat(columns);
    defs.forEach(function (def, position) {
        const th = document.createElement("th");
        th.setAttribute("scope", "col");
        th.appendChild(mbuNode("span", "mbu-col-name", def.name));
        if (def.dtype) th.appendChild(mbuNode("span", "mbu-col-type", def.dtype));
        th.title = "Click to sort by " + def.name;
        th.addEventListener("click", function () {
            if (state.sort === position) state.dir = -state.dir;
            else { state.sort = position; state.dir = 1; }
            state.page = 0;
            paint();
        });
        headRow.appendChild(th);
    });

    const tbody = document.createElement("tbody");
    table.appendChild(tbody);
    scroll.appendChild(table);
    wrap.appendChild(scroll);

    const footer = mbuNode("div", "mbu-table-foot");
    const count = mbuNode("span", "mbu-count");
    const pager = mbuNode("span", "mbu-pager");
    const prev = mbuNode("button", "mbu-page-btn");
    prev.type = "button"; prev.textContent = "‹ Prev";
    const next = mbuNode("button", "mbu-page-btn");
    next.type = "button"; next.textContent = "Next ›";
    const pageLabel = mbuNode("span", "mbu-page-label");
    pager.appendChild(prev);
    pager.appendChild(pageLabel);
    pager.appendChild(next);
    footer.appendChild(count);
    footer.appendChild(pager);
    wrap.appendChild(footer);

    const state = { query: "", sort: -1, dir: 1, page: 0 };
    const pageSize = 50;

    function compare(a, b) {
        if (a === null && b === null) return 0;
        if (a === null) return 1;
        if (b === null) return -1;
        if (typeof a === "number" && typeof b === "number") return a - b;
        return String(a).localeCompare(String(b));
    }

    function filtered() {
        let list = rawRows;
        if (state.query) {
            const query = state.query.toLowerCase();
            list = list.filter(function (row) {
                return row.some(function (cell) {
                    return cell !== null &&
                        String(cell).toLowerCase().indexOf(query) >= 0;
                });
            });
        }
        if (state.sort >= 0) {
            const position = state.sort;
            const dir = state.dir;
            list = list.slice().sort(function (a, b) {
                return compare(a[position], b[position]) * dir;
            });
        }
        return list;
    }

    function paint() {
        const list = filtered();
        const pages = Math.max(1, Math.ceil(list.length / pageSize));
        if (state.page >= pages) state.page = pages - 1;
        if (state.page < 0) state.page = 0;
        const start = state.page * pageSize;
        const view = list.slice(start, start + pageSize);

        tbody.textContent = "";
        view.forEach(function (row) {
            const tr = document.createElement("tr");
            row.forEach(function (cell, position) {
                const td = document.createElement("td");
                if (position === 0) td.className = "mbu-row-index";
                if (cell === null) {
                    td.appendChild(mbuNode("span", "mbu-null", "—"));
                } else {
                    td.textContent = String(cell);
                    if (typeof cell === "number") td.classList.add("mbu-num");
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        count.textContent = (state.query ? list.length + " of " : "") +
            rawRows.length + " rows";
        pageLabel.textContent = "Page " + (state.page + 1) + " / " + pages;
        prev.disabled = state.page <= 0;
        next.disabled = state.page >= pages - 1;
    }

    search.addEventListener("input", function () {
        state.query = search.value.trim();
        state.page = 0;
        paint();
    });
    prev.addEventListener("click", function () { state.page--; paint(); });
    next.addEventListener("click", function () { state.page++; paint(); });
    download.addEventListener("click", function () {
        let csv = payload.csv;
        if (!csv) {
            csv = [indexName].concat(columns.map(function (c) { return c.name; })).join(",") + "\n";
            csv += rawRows.map(function (row) {
                return row.map(function (cell) {
                    if (cell === null) return "";
                    const text = String(cell);
                    return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
                }).join(",");
            }).join("\n");
        }
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = (payload.name === "Series" ? "series" : "dataframe") + ".csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });

    paint();
    return wrap;
}

/* ---- charts ---- */
function mbuImageBlock(output) {
    const figure = mbuNode("figure", "mbu-block mbu-figure");
    const image = document.createElement("img");
    image.className = "plot-img";
    image.src = "data:image/" + (output.format || "png") + ";base64," + output.data;
    image.alt = output.title || "Chart produced by your program";
    figure.appendChild(image);

    const caption = mbuNode("figcaption", "mbu-figcap");
    const download = document.createElement("a");
    download.className = "mbu-download";
    download.href = image.src;
    download.download = (output.title || "chart").replace(/\s+/g, "-").toLowerCase() + ".png";
    download.textContent = "Download PNG";
    caption.appendChild(download);
    figure.appendChild(caption);
    return figure;
}

function mbuPlotlyBlock(spec) {
    const box = mbuNode("div", "plotly-chart");
    if (window.Plotly) {
        try {
            window.Plotly.newPlot(box, spec.data || [], spec.layout || {},
                { responsive: true, displaylogo: false });
        } catch (e) {
            box.textContent = "Could not render the interactive chart.";
        }
    } else {
        box.textContent = "Interactive chart unavailable: plotly.js did not load (check the internet connection).";
    }
    return box;
}

function mbuVegaBlock(spec) {
    const box = mbuNode("div", "plot-img vega-chart");
    loadScriptOnce("https://cdn.jsdelivr.net/npm/vega@5/build/vega.min.js")
        .then(function () {
            return loadScriptOnce("https://cdn.jsdelivr.net/npm/vega-lite@6/build/vega-lite.min.js");
        })
        .then(function () {
            return loadScriptOnce("https://cdn.jsdelivr.net/npm/vega-embed@6/build/vega-embed.min.js");
        })
        .then(function () {
            return window.vegaEmbed(box, spec, { actions: false, renderer: "svg" });
        })
        .catch(function () {
            box.textContent = "Interactive chart unavailable: the vega CDN could not be loaded (check the internet connection).";
        });
    return box;
}

let mbuBokehSeq = 0;
function mbuBokehBlock(item) {
    const box = mbuNode("div", "plot-img bokeh-chart");
    box.id = "mbu-bokeh-" + (++mbuBokehSeq);
    loadScriptOnce("https://cdn.jsdelivr.net/npm/@bokeh/bokehjs@3.6.3/build/js/bokeh.min.js")
        .then(function () {
            if (!window.Bokeh || !window.Bokeh.embed) {
                throw new Error("bokehJS did not initialise");
            }
            if (item && item.div && item.script) {
                box.innerHTML = item.div;
                const src = String(item.script)
                    .replace(/^\s*<script[^>]*>/i, "")
                    .replace(/<\/script>\s*$/i, "");
                new Function(src)();
                return;
            }
            const embed = (window.Bokeh && (window.Bokeh.embed || window.Bokeh.Embed)) ||
                (window.Bokeh && window.Bokeh.Document && window.Bokeh.Document.embed_item) ||
                (window.Bokeh && window.Bokeh._bokeh_embed);
            if (embed && embed.embed_item) { embed.embed_item(item, box.id); return; }
            if (window.Bokeh && window.Bokeh.Document && window.Bokeh.Document._embed_item) {
                window.Bokeh.Document._embed_item(item, box.id);
                return;
            }
            if (window.Bokeh && typeof window.Bokeh.embed_item === "function") {
                window.Bokeh.embed_item(item, box.id);
                return;
            }
            throw new Error("bokeh embed API not found");
        })
        .catch(function (err) {
            const msg = String((err && err.message) || err || "");
            box.textContent = /Failed to load/.test(msg)
                ? "Interactive chart unavailable: bokeh.js could not be loaded (check the internet connection)."
                : "Interactive chart unavailable: " + (msg || "bokeh rendering failed");
        });
    return box;
}

/* Build the ordered output panel. Returns true when at least one
   rich (non-text) output was rendered. */
function renderRichOutputs(container, result) {
    container.textContent = "";
    let outputs = Array.isArray(result.outputs) ? result.outputs.slice() : [];

    /* Backwards compatibility: older payloads have no `outputs`. */
    if (!outputs.length) {
        (result.figures || []).forEach(function (data) {
            outputs.push({ type: "image", format: "png", data: data });
        });
        (result.plotly || []).forEach(function (spec) {
            outputs.push({ type: "plotly", spec: spec });
        });
        (result.altair || []).forEach(function (spec) {
            outputs.push({ type: "altair", spec: spec });
        });
        (result.bokeh || []).forEach(function (item) {
            outputs.push({ type: "bokeh", item: item });
        });
    }

    let rich = false;
    outputs.forEach(function (output) {
        if (!output || !output.type) return;
        let node = null;
        switch (output.type) {
            case "text":
                node = mbuTextBlock(output.text);
                break;
            case "error":
                rich = true;
                node = mbuErrorBlock(output.text);
                break;
            case "dataframe":
                rich = true;
                node = mbuTableBlock(output);
                break;
            case "image":
                rich = true;
                node = mbuImageBlock(output);
                break;
            case "plotly":
                rich = true;
                node = mbuPlotlyBlock(output.spec || {});
                break;
            case "altair":
                rich = true;
                node = mbuVegaBlock(output.spec || {});
                break;
            case "bokeh":
                rich = true;
                node = mbuBokehBlock(output.item || output);
                break;
            case "html":
                rich = true;
                node = mbuNode("div", "mbu-block mbu-html");
                node.innerHTML = output.html || "";
                break;
            case "json":
                rich = true;
                node = mbuNode("pre", "mbu-block mbu-text",
                    JSON.stringify(output.json, null, 2));
                break;
            default:
                break;
        }
        if (node) container.appendChild(node);
    });
    return rich;
}

function displayPyResult(result, elapsedMs) {

    /* ---- plain-text mirror (accessibility / fallback; also what
       non-rich consumers read) ---- */
    let output = result.stdout || "";

    if (result.error) {
        output += (output ? "\n\n" : "") +
            "ERROR\n\n" +
            (result.stderr || "The program failed.");
    } else if (result.stderr) {
        // warnings (seaborn / pandas) - shown after the output
        output += (output ? "\n\n" : "") + result.stderr;
    }

    if (!output.trim()) {
        output =
            "Program executed successfully.\n\n" +
            "No output was produced.";
    }

    programOutput.textContent = echoInput() + output;

    /* ---- ordered rich output panel ---- */
    const plots = document.getElementById("plotOutput");
    let rich = false;
    if (plots) {
        rich = renderRichOutputs(plots, result);
        plots.hidden = !rich;
    }
    /* Hide the monospace mirror when rich output exists so the same text
       is not shown twice; it stays in the DOM as a fallback. */
    programOutput.style.display = rich ? "none" : "";

    executionTime.textContent =
        `Execution time: ${(elapsedMs / 1000).toFixed(2)}s`;

    if (result.error) {
        compilerStatus.textContent =
            `● ${result.errorLabel || "Runtime Error"}`;
    } else {
        compilerStatus.textContent =
            "● Execution successful";
    }
}


// ============================================================
// KEYBOARD SHORTCUT
// Ctrl + Enter = Run
// ============================================================

codeEditor.addEventListener(
    "keydown",
    function (event) {

        if (
            event.ctrlKey &&
            event.key === "Enter"
        ) {

            event.preventDefault();

            runCodeBtn.click();

        }

    }
);


// ============================================================
// STOP / RESTART THE PYTHON RUNTIME
// ============================================================

const stopCodeBtn = document.getElementById("stopCode");
const restartCodeBtn = document.getElementById("restartCode");

if (stopCodeBtn) {
    stopCodeBtn.addEventListener("click", function () {
        if (window.PyLab && window.PyLab.stop) {
            compilerStatus.textContent = "● Stopping…";
            window.PyLab.stop();
        }
    });
}

if (restartCodeBtn) {
    restartCodeBtn.addEventListener("click", function () {
        if (window.PyLab && window.PyLab.restart) {
            compilerStatus.textContent = "● Restarting runtime…";
            window.PyLab.restart().then(function () {
                compilerStatus.textContent = "● Runtime restarted";
            }, function () {
                compilerStatus.textContent = "● Ready";
            });
        }
    });
}


// ============================================================
// INITIAL LOAD
// ============================================================

loadTemplate("python");