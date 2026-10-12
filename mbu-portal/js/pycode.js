/* =====================================================================
   pycode.js  -  Python bootstrap shared by the sandbox worker
   (js/pyworker.js) and by the main-thread fallback in js/pylab.js.

   It defines the Python function __mbu_run__(code, stdin_text) which:
     - runs one student program,
     - captures stdout and stderr,
     - prints the value of the last expression (Jupyter style),
     - reads stdin / input() from the program input box,
     - builds an ORDERED list of structured outputs:
         { type: "text",      text }
         { type: "error",     text }
         { type: "dataframe", ... }   -> interactive table in the page
         { type: "image",     ... }   -> matplotlib / seaborn PNG
         { type: "plotly" | "altair" | "bokeh", ... }
     - saves every matplotlib figure as a PNG (base64) for the page,
     - reports exceptions as a normal traceback.

   `stdout` / `figures` / `plotly` / `altair` / `bokeh` are still filled
   in for backwards compatibility; new front-ends read `outputs`.
   ===================================================================== */

self.PY_RUNNER_SOURCE = String.raw`
import ast
import base64
import builtins
import contextlib
import io
import json
import math
import os
import sys
import traceback
import warnings

os.environ["MPLBACKEND"] = "Agg"
warnings.filterwarnings("ignore", message="Matplotlib is currently using")


# ---------------------------------------------------------------------
# HTTPS / external-data bridge
#
# This sandbox runs Pyodide (CPython on WebAssembly).  Pyodide has no
# ssl module, so the standard urllib.request cannot open https:// URLs at
# all - it raises "URLError: <urlopen error unknown url type: https>".
# That breaks seaborn's load_dataset() (and any package that reads a
# remote CSV) because seaborn uses urllib.request.urlopen / urlretrieve
# internally.
#
# Fix: route urllib.request through Pyodide's own HTTP client, which uses
# the browser's secure fetch (real TLS, real certificate checking).  No
# certificate verification is disabled anywhere.
#
# Additionally, example datasets that ship with the site are read from a
# local, on-disk copy first (zero network).  A dataset is only fetched
# remotely when a local copy is not available, and if nothing works the
# user gets a clear error instead of fabricated data.
# ---------------------------------------------------------------------

# seaborn example datasets live under this prefix; matching URLs let the
# bridge answer from the bundled copy without touching the network.
_MBU_DATASET_PREFIXES = (
    "https://raw.githubusercontent.com/mwaskom/seaborn-data/master/",
    "https://raw.githubusercontent.com/mwaskom/seaborn-data/main/",
    "https://github.com/mwaskom/seaborn-data/raw/master/",
    "https://github.com/mwaskom/seaborn-data/raw/main/",
)


def _mbu_dataset_name(url):
    text = str(url)
    for prefix in _MBU_DATASET_PREFIXES:
        if text.startswith(prefix):
            rest = text[len(prefix):]
            if rest.startswith("raw/"):
                rest = rest[len("raw/"):]
            if rest.endswith(".csv"):
                return rest[:-len(".csv")]
    return None


def _mbu_read_text(relative):
    """Read a bundled dataset/support file.

    Looks in the Pyodide in-memory FS first (datasets embedded in
    js/datasets.js, no network at all), then at the site's own
    assets/datasets/ directory (same-origin request).  Returns None when
    the file is not bundled.
    """
    directory = globals().get("MBU_DATA_DIR")
    if directory:
        path = os.path.join(directory, relative)
        try:
            if os.path.exists(path):
                with open(path, "r", encoding="utf-8") as handle:
                    return handle.read()
        except Exception:
            pass
    base = globals().get("MBU_DATA_BASE")
    if base:
        try:
            from pyodide.http import open_url
            return open_url(base + relative).read()
        except Exception:
            return None
    return None


def _mbu_bundled_names():
    directory = globals().get("MBU_DATA_DIR")
    names = []
    if directory:
        try:
            names = sorted(
                entry[:-4] for entry in os.listdir(directory)
                if entry.endswith(".csv")
            )
        except Exception:
            names = []
    return names


def _mbu_install_http_fix():
    """Make urllib.request work over HTTPS inside Pyodide, preferring the
    bundled datasets.  Safe to call many times."""
    import urllib.request as urllib

    if getattr(urllib, "_mbu_http_fixed", False):
        return
    try:
        from pyodide.http import open_url as _py_open_url
    except Exception:
        # Not Pyodide (e.g. the online compiler): native urllib works.
        return

    class _MbuHeaders(dict):
        """Case-insensitive header map, like http.client.HTTPMessage.get."""

        def get(self, key, default=None):
            wanted = str(key).lower()
            for name, value in self.items():
                if str(name).lower() == wanted:
                    return value
            return default

    class _MbuResponse(io.BytesIO):
        """Minimal stand-in for http.client.HTTPResponse.

        BytesIO alone is not enough: pandas inspects
        response.headers.get("Content-Encoding") and some code calls
        geturl / info / getcode.
        """

        def __init__(self, data, url="", headers=None):
            super().__init__(data)
            self.url = url
            self.status = 200
            self.headers = _MbuHeaders(headers or {})
            self.headers.setdefault("Content-Type", "text/plain; charset=utf-8")

        def geturl(self):
            return self.url

        def getcode(self):
            return self.status

        def info(self):
            return self.headers

        def getheaders(self):
            return list(self.headers.items())

    def _open_url(url, *args, **kwargs):
        request_headers = {}
        if isinstance(url, urllib.Request):
            request_headers = dict(getattr(url, "headers", {}) or {})
            text = str(url.full_url)
        else:
            text = str(url)

        name = _mbu_dataset_name(text)
        if name is not None:
            local = _mbu_read_text(name + ".csv")
            if local is not None:
                return _MbuResponse(local.encode("utf-8"), text,
                                    {"Content-Type": "text/csv; charset=utf-8"})

        if text.endswith("dataset_names.txt"):
            local = _mbu_read_text("dataset_names.txt")
            if local is not None:
                return _MbuResponse(local.encode("utf-8"), text,
                                    {"Content-Type": "text/plain; charset=utf-8"})

        try:
            if request_headers:
                try:
                    response = _py_open_url(text, headers=request_headers)
                except Exception:
                    response = _py_open_url(text)
            else:
                response = _py_open_url(text, *args, **kwargs)
            body = response.read()
            if not isinstance(body, (bytes, bytearray)):
                body = str(body).encode("utf-8")
            return _MbuResponse(bytes(body), text)
        except Exception as error:
            available = _mbu_bundled_names()
            hint = ("Bundled (offline) datasets: " + ", ".join(available)
                    if available else
                    "No datasets are bundled in this session.")
            raise OSError(
                "Could not load '%s'.\n"
                "This browser sandbox fetches data with the browser's own "
                "secure HTTPS client; the request failed (offline, blocked, "
                "or CORS).\n%s" % (text, hint)
            ) from error

    def _urlretrieve(url, filename=None, *args, **kwargs):
        payload = _open_url(url, *args, **kwargs).read()
        if isinstance(payload, str):
            payload = payload.encode("utf-8")
        if filename is None:
            import tempfile
            handle, path = tempfile.mkstemp()
            with os.fdopen(handle, "wb") as stream:
                stream.write(payload)
            return path, None
        if hasattr(filename, "write"):
            filename.write(payload)
            return filename, None
        filename = os.fspath(filename)
        parent = os.path.dirname(filename)
        if parent:
            try:
                os.makedirs(parent, exist_ok=True)
            except Exception:
                pass
        with open(filename, "wb") as stream:
            stream.write(payload)
        return filename, None

    urllib.urlopen = _open_url
    urllib.urlretrieve = _urlretrieve
    urllib._mbu_http_fixed = True


def _mbu_patch_dataset_modules():
    """If a library already imported urlopen/urlretrieve into its own
    namespace before the bridge was installed, point those names at the
    bridge too (seaborn and pandas do this)."""
    import urllib.request as urllib
    if not getattr(urllib, "_mbu_http_fixed", False):
        return
    targets = {
        "seaborn.utils": ("urlopen", "urlretrieve"),
        "seaborn._core": ("urlopen", "urlretrieve"),
        "pandas.io.common": ("urlopen",),
    }
    for module_name, attributes in targets.items():
        module = sys.modules.get(module_name)
        if module is None:
            continue
        for attribute in attributes:
            source = getattr(urllib, attribute, None)
            if source is not None:
                try:
                    setattr(module, attribute, source)
                except Exception:
                    pass


# ---------------------------------------------------------------------
# small helpers used while a program runs
# ---------------------------------------------------------------------

def _mbu_is_table(obj):
    try:
        import pandas as pd
        return isinstance(obj, (pd.DataFrame, pd.Series))
    except Exception:
        return False


def _mbu_is_figure(obj):
    module = type(obj).__module__ or ""
    return module.startswith("matplotlib") and hasattr(obj, "savefig")


def _mbu_cell(value):
    """Turn one cell value into something JSON can carry (numbers stay
    numbers, missing values become None, everything else becomes text)."""
    if value is None:
        return None
    try:
        import numpy as np
        if isinstance(value, np.generic):
            value = value.item()
    except Exception:
        pass
    if isinstance(value, float):
        if math.isnan(value):
            return None
        if math.isinf(value):
            return "Infinity" if value > 0 else "-Infinity"
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float, str)):
        return value
    try:
        import pandas as pd
        if value is pd.NaT:
            return None
        na = getattr(pd, "NA", None)
        if na is not None and value is na:
            return None
    except Exception:
        pass
    try:
        return str(value)
    except Exception:
        return repr(value)


def _mbu_table_payload(obj, max_rows=500):
    """Serialise a pandas DataFrame / Series for the interactive table."""
    import pandas as pd
    if isinstance(obj, pd.Series):
        frame = obj.to_frame(name=(obj.name if obj.name is not None else "value"))
        kind = "Series"
    else:
        frame = obj
        kind = "DataFrame"

    total_rows = int(frame.shape[0])
    total_cols = int(frame.shape[1])
    head = frame.head(max_rows)

    columns = []
    for position, column in enumerate(head.columns):
        try:
            dtype = str(frame.dtypes.iloc[position])
        except Exception:
            dtype = ""
        columns.append({"name": str(column), "dtype": dtype})

    index = []
    rows = []
    for label, row in head.iterrows():
        index.append(_mbu_cell(label))
        rows.append([_mbu_cell(item) for item in list(row)])

    index_name = str(frame.index.name) if frame.index.name is not None else "(index)"

    csv_text = ""
    try:
        source = frame if total_rows <= 5000 else head
        csv_text = source.to_csv()
    except Exception:
        csv_text = ""
    if len(csv_text) > 300000:
        csv_text = csv_text[:300000]

    return {
        "type": "dataframe",
        "name": kind,
        "columns": columns,
        "index_name": index_name,
        "index": index,
        "rows": rows,
        "shape": [total_rows, total_cols],
        "shown": int(head.shape[0]),
        "truncated": total_rows > max_rows,
        "csv": csv_text
    }


def _mbu_image_payload(figure, title="Figure"):
    buffer = io.BytesIO()
    try:
        dpi = getattr(figure, "dpi", None) or 100
        figure.savefig(buffer, format="png", bbox_inches="tight", dpi=dpi)
    except Exception:
        try:
            figure.savefig(buffer, format="png")
        except Exception:
            return None
    return {
        "type": "image",
        "format": "png",
        "title": title,
        "data": base64.b64encode(buffer.getvalue()).decode("ascii")
    }


def _mbu_flush_matplotlib(outputs, figures, close=True):
    try:
        import matplotlib.pyplot as plt
    except Exception:
        return
    try:
        numbers = list(plt.get_fignums())
    except Exception:
        return
    for number in numbers:
        try:
            figure = plt.figure(number)
        except Exception:
            continue
        payload = _mbu_image_payload(figure, "Figure %d" % number)
        if payload:
            outputs.append(payload)
            figures.append(payload["data"])
    if close:
        try:
            plt.close("all")
        except Exception:
            pass


def _mbu_capture_object(obj, outputs, figures, result, shown_alt, shown_bokeh):
    """Append the right kind of output for an arbitrary Python object."""
    if _mbu_is_table(obj):
        outputs.append(_mbu_table_payload(obj))
        return
    if _mbu_is_figure(obj):
        payload = _mbu_image_payload(obj, "Figure")
        if payload:
            outputs.append(payload)
            figures.append(payload["data"])
        try:
            import matplotlib.pyplot as plt
            plt.close(obj)
        except Exception:
            pass
        return

    module = type(obj).__module__ or ""
    name = type(obj).__name__

    if module.startswith("altair"):
        try:
            if id(obj) in shown_alt:
                return
            spec = obj.to_dict()
            if isinstance(spec, dict) and "vega-lite" in str(spec.get("$schema", "")):
                shown_alt.add(id(obj))
                result["altair"].append(spec)
                outputs.append({"type": "altair", "spec": spec})
        except Exception:
            pass
        return

    if module.startswith("bokeh") and name == "figure":
        try:
            if id(obj) in shown_bokeh:
                return
            shown_bokeh.add(id(obj))
            try:
                from bokeh.embed import components
                script, div = components(obj, wrap_script=False)
                item = {"script": script, "div": div}
            except Exception as error:
                from bokeh.embed import json_item
                item = json_item(obj)
                if isinstance(item, dict):
                    item["_err"] = str(error)
            result["bokeh"].append(item)
            outputs.append({"type": "bokeh", "item": item})
            return
        except Exception:
            pass

    text = repr(obj)
    if outputs and outputs[-1].get("type") == "text":
        outputs[-1]["text"] += text
    else:
        outputs.append({"type": "text", "text": text})


# ---------------------------------------------------------------------
# run one program
# ---------------------------------------------------------------------

def __mbu_run__(code, stdin_text):
    """Execute one program and return the result as a JSON string."""
    out = io.StringIO()
    err = io.StringIO()
    stdin_text = stdin_text if stdin_text is not None else ""
    answer_stream = io.StringIO(stdin_text)

    _mbu_patch_dataset_modules()

    outputs = []
    figures = []
    result = {"stdout": "", "stderr": "", "figures": figures,
              "plotly": [], "altair": [], "bokeh": [],
              "outputs": outputs, "error": None}

    def emit_text(text):
        if not text:
            return
        if outputs and outputs[-1].get("type") == "text":
            outputs[-1]["text"] += text
        else:
            outputs.append({"type": "text", "text": text})

    def read_input(prompt=""):
        if prompt:
            print(prompt, end="")
        line = answer_stream.readline()
        if line == "":
            raise EOFError("EOF when reading a line")
        line = line.rstrip("\n")
        print(line)
        return line

    old_input = builtins.input
    old_print = builtins.print
    old_display = getattr(builtins, "display", None)
    old_stdin = sys.stdin
    builtins.input = read_input
    sys.stdin = io.StringIO(stdin_text)

    shown_alt = set()
    shown_bokeh = set()

    # ---- capture interactive charts shown with fig.show() ------------
    if "plotly" in code:
        try:
            import plotly.graph_objects as go
            import plotly.io as pio

            def _mbu_plotly_show(figure, *args, **kwargs):
                try:
                    spec = json.loads(figure.to_json())
                except Exception:
                    return
                result["plotly"].append(spec)
                outputs.append({"type": "plotly", "spec": spec})

            go.Figure.show = _mbu_plotly_show
            pio.show = _mbu_plotly_show
        except Exception:
            pass

    if "altair" in code:
        try:
            import altair as alt

            def _mbu_alt_show(chart, *args, **kwargs):
                try:
                    if id(chart) in shown_alt:
                        return
                    spec = chart.to_dict()
                    if not (isinstance(spec, dict) and
                            "vega-lite" in str(spec.get("$schema", ""))):
                        return
                    shown_alt.add(id(chart))
                    result["altair"].append(spec)
                    outputs.append({"type": "altair", "spec": spec})
                except Exception:
                    pass

            for name in dir(alt):
                cls = getattr(alt, name, None)
                if isinstance(cls, type) and hasattr(cls, "show"):
                    try:
                        cls.show = _mbu_alt_show
                    except Exception:
                        pass
        except Exception:
            pass

    if "bokeh" in code:
        try:
            import bokeh.io as bio
            import bokeh.plotting as bplot

            def _mbu_bokeh_show(model, *args, **kwargs):
                try:
                    if id(model) in shown_bokeh:
                        return
                    shown_bokeh.add(id(model))
                    try:
                        from bokeh.embed import components
                        script, div = components(model, wrap_script=False)
                        item = {"script": script, "div": div}
                    except Exception as error:
                        from bokeh.embed import json_item
                        item = json_item(model)
                        if isinstance(item, dict):
                            item["_err"] = str(error)
                    result["bokeh"].append(item)
                    outputs.append({"type": "bokeh", "item": item})
                except Exception:
                    pass

            bio.show = _mbu_bokeh_show
            bplot.show = _mbu_bokeh_show
        except Exception:
            pass

    # ---- matplotlib: plt.show() renders instead of doing nothing -----
    if ("matplotlib" in code) or ("seaborn" in code) or ("plt" in code):
        try:
            import matplotlib.pyplot as plt

            def _mbu_plt_show(*args, **kwargs):
                _mbu_flush_matplotlib(outputs, figures, close=True)

            plt.show = _mbu_plt_show
        except Exception:
            pass

    # ---- print(): text stays text, DataFrames become tables ----------
    def _mbu_print(*args, **kwargs):
        sep = kwargs.get("sep", " ")
        end = kwargs.get("end", "\n")
        file = kwargs.get("file", None)
        if file is not None and file is not sys.stdout and file is not out:
            return old_print(*args, **kwargs)

        try:
            out.write(sep.join(str(item) for item in args) + end)
        except Exception:
            pass

        bucket = []
        for item in args:
            if _mbu_is_table(item):
                if bucket:
                    emit_text(sep.join(str(part) for part in bucket))
                    bucket = []
                outputs.append(_mbu_table_payload(item))
            else:
                bucket.append(item)
        if bucket:
            emit_text(sep.join(str(part) for part in bucket) + end)
        elif not args:
            emit_text(end)

    def _mbu_display(*objects):
        for obj in objects:
            _mbu_capture_object(obj, outputs, figures, result, shown_alt, shown_bokeh)

    builtins.print = _mbu_print
    builtins.display = _mbu_display

    # ---- execute -----------------------------------------------------
    namespace = {"__name__": "__main__"}
    try:
        tree = ast.parse(code, filename="<experiment>", mode="exec")
        body = list(tree.body)
        last_expr = None
        if body and isinstance(body[-1], ast.Expr):
            last_expr = ast.Expression(body[-1].value)
            body = body[:-1]

        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            exec(compile(ast.Module(body=body, type_ignores=[]),
                         "<experiment>", "exec"), namespace)
            if last_expr is not None:
                value = eval(compile(last_expr, "<experiment>", "eval"),
                             namespace)
                if value is not None:
                    _mbu_capture_object(value, outputs, figures, result,
                                        shown_alt, shown_bokeh)
    except SystemExit:
        pass
    except BaseException:
        text = traceback.format_exc()
        if "ModuleNotFoundError" in text or "ImportError" in text:
            text += ("\n\nAvailable in this sandbox: numpy, pandas, matplotlib, "
                     "seaborn, plotly, altair, bokeh, scipy, scikit-learn, "
                     "scikit-image, statsmodels, sympy, networkx, pillow, "
                     "pyarrow, xgboost, requests, openpyxl and more.")
        err.write(text)
        exc_type = sys.exc_info()[0]
        result["error"] = exc_type.__name__ if exc_type else "Error"
        outputs.append({"type": "error", "text": text})
    finally:
        builtins.input = old_input
        builtins.print = old_print
        if old_display is None:
            try:
                del builtins.display
            except Exception:
                pass
        else:
            builtins.display = old_display
        sys.stdin = old_stdin

    # Charts still living in the namespace are displayed too (Jupyter
    # style), so a chart left without an explicit .show() still appears.
    try:
        if "altair" in code:
            for obj in list(namespace.values()):
                if (type(obj).__module__ or "").startswith("altair"):
                    _mbu_capture_object(obj, outputs, figures, result,
                                        shown_alt, shown_bokeh)
        if "bokeh" in code:
            for obj in list(namespace.values()):
                if (type(obj).__name__ == "figure" and
                        (type(obj).__module__ or "").startswith("bokeh")):
                    _mbu_capture_object(obj, outputs, figures, result,
                                        shown_alt, shown_bokeh)
    except Exception:
        pass

    # Remaining matplotlib figures (never shown explicitly).
    if ("matplotlib" in code) or ("seaborn" in code) or ("plt" in code):
        _mbu_flush_matplotlib(outputs, figures, close=True)

    result["stdout"] = out.getvalue()
    result["stderr"] = err.getvalue()
    return json.dumps(result)


_mbu_install_http_fix()
`;
