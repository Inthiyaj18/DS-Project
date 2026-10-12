import json
import os
import re
import shutil
from pathlib import Path

import nbformat

ROOT = Path(r"C:\Users\DELL\Desktop\MBU-DS-pro\mbu-portal")
SRC = Path(r"C:\Users\DELL\Desktop\data science exps")
DATA = ROOT / "js" / "data.js"
DEST = ROOT / "assets" / "files" / "imported"
MARKER = "Imported from Desktop notebooks"

FILES = [p for p in sorted(SRC.iterdir()) if p.suffix.lower() == ".ipynb"]
DEST.mkdir(parents=True, exist_ok=True)

EXP_FOR_FILE = {
    "1-Case-1 (1).ipynb": "01",
    "1-a-case-3 (1).ipynb": "01",
    "2nd-exp-ds (1).ipynb": "02",
    "3rd-exp-ds (1).ipynb": "03",
    "DS-ex-4.ipynb": "04",
    "matplotlib1.ipynb": "04",
}

TITLE_FOR_FILE = {
    "1-Case-1 (1).ipynb": "Diabetes CSV inspection",
    "1-a-case-3 (1).ipynb": "Student marks CSV loading",
    "2nd-exp-ds (1).ipynb": "Database and SQL data handling",
    "3rd-exp-ds (1).ipynb": "Cleaning, encoding and outlier handling",
    "DS-ex-4.ipynb": "Hierarchical indexing and combining data",
    "matplotlib1.ipynb": "NumPy and Matplotlib practice notebook",
}


def clean_name(name: str) -> str:
    stem = Path(name).stem.replace(" (1)", "")
    return re.sub(r"[-_]+", " ", stem).strip().title()


def join_code(cells):
    return "\n\n".join(c.source.rstrip() for c in cells if c.source.strip()).strip()


def split_heading_blocks(nb, fallback_exp, file_name):
    """Return blocks: {exp, ref, title, markdown, code}."""
    blocks = []
    cur = None

    for cell in nb.cells:
        src = cell.source or ""
        heading = None
        heading_text = ""
        if cell.cell_type == "markdown":
            for line in src.splitlines():
                # Match sub refs such as # 2A, # 3C, # 4a.1; do not match # 4th
                m = re.match(r"^\s*#+\s*(\d+)\s*([A-Ga-g])(?:\b|\.|\s|$)(.*)$", line.strip())
                if m:
                    heading = (m.group(1).zfill(2), m.group(2).upper())
                    heading_text = line.strip("# ").strip() or f"{heading[0]}{heading[1]}"
            if heading:
                cur = {"exp": heading[0], "ref": heading[0] + heading[1], "title": heading_text,
                       "markdown": [], "code_cells": []}
                blocks.append(cur)
        if cur:
            if cell.cell_type == "markdown" and src.strip():
                cur["markdown"].append(src.strip())
            elif cell.cell_type == "code" and src.strip():
                cur["code_cells"].append(cell)

    if not blocks:
        code_cells = [c for c in nb.cells if c.cell_type == "code" and (c.source or "").strip()]
        md = [c.source.strip() for c in nb.cells if c.cell_type == "markdown" and (c.source or "").strip()]
        blocks.append({
            "exp": fallback_exp,
            "ref": fallback_exp + " Imported",
            "title": TITLE_FOR_FILE.get(file_name, clean_name(file_name)),
            "markdown": md,
            "code_cells": code_cells,
        })

    # Keep the blocks that belong to the mapped experiment number. This also
    # drops duplicate practice headings such as 4a.1 when they are intentionally
    # separate but still imports them under the same experiment.
    out = []
    for i, b in enumerate(blocks, start=1):
        if b["exp"] != fallback_exp:
            continue
        code = join_code(b["code_cells"])
        if not code:
            continue
        suffix = "" if i == 1 else f" ({i})"
        out.append({
            "exp": b["exp"],
            "ref": b["ref"],
            "title": b["title"] + suffix,
            "markdown": "\n\n".join(b["markdown"]),
            "code": code,
        })
    return out


def js_string(value):
    return json.dumps(value or "", ensure_ascii=False)


def js_array(value):
    return json.dumps(value or [], ensure_ascii=False, indent=8)


def make_sub_entry(block, file_name):
    name = f"Imported Notebook {block['ref']}: {block['title']}"
    aim = f"To run, inspect and understand the imported notebook '{file_name}' for experiment {block['exp']}."
    explanation = (block["markdown"] or
                   f"This sub-experiment was imported from the notebook file {file_name}. Review the code, run it in the Online Code Lab and record the observations.")
    procedure = "Open the imported notebook material|Read the notebook headings and code|Run the code in the Online Code Lab|Inspect outputs and visualizations|Update dataset paths if needed|Record observations and conclusions"
    result = "The imported notebook code runs and produces the expected printed output, tables or visualizations."
    insight = "This imported activity preserves the source notebook code inside the portal so it can be edited, replaced or extended by the user."
    return "      [\n        " + ",\n        ".join([
        js_string(name), js_string(aim), js_string(explanation), js_string(procedure),
        js_string(block["code"]), js_string(result), js_string(insight)
    ]) + "\n      ]"


def find_matching(text, open_index):
    pairs = {"[": "]", "{": "}", "(": ")"}
    opener = text[open_index]
    closer = pairs[opener]
    depth = 0
    quote = None
    escape = False
    i = open_index
    while i < len(text):
        ch = text[i]
        if quote:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == quote:
                quote = None
        else:
            if ch in ('"', "'", "`"):
                quote = ch
            elif ch == opener:
                depth += 1
            elif ch == closer:
                depth -= 1
                if depth == 0:
                    return i
        i += 1
    raise ValueError("No matching bracket")


def find_exp_block(text, exp_id):
    m = re.search(r'id:\s*"' + re.escape(exp_id) + r'"', text)
    if not m:
        raise ValueError(f"Experiment {exp_id} not found")
    start = text.rfind("{", 0, m.start())
    end = find_matching(text, start)
    return start, end + 1


def insert_into_array(text, arr_start, entries_text, label):
    close = find_matching(text, arr_start)
    inside = text[arr_start + 1:close]
    if MARKER in inside and label in inside:
        return text, False
    prefix = "\n      /* " + MARKER + " - " + label + " */\n"
    insertion = prefix + entries_text + ",\n    "
    return text[:close] + insertion + text[close:], True


def add_files_to_block(text, block_start, block_end, files):
    block = text[block_start:block_end]
    entries = []
    for f in files:
        entry = ("      { name: " + js_string(f["name"]) + ", type: \"ipynb\", url: " +
                 js_string(f["url"]) + ", size: " + js_string(f["size"]) + ", date: " +
                 js_string(f["date"]) + " }")
        entries.append(entry)
    entries_text = ",\n".join(entries)

    files_m = re.search(r'files:\s*\[', block)
    if files_m:
        arr_start = block_start + files_m.end() - 1
        return insert_into_array(text, arr_start, entries_text, "materials")

    subs_m = re.search(r'subs:\s*\[', block)
    if not subs_m:
        return text, False
    insert_pos = block_start + subs_m.start()
    insertion = "    files: [\n      /* " + MARKER + " - materials */\n" + entries_text + "\n    ],\n"
    return text[:insert_pos] + insertion + text[insert_pos:], True


def add_subs_to_block(text, block_start, block_end, sub_entries, exp_id):
    block = text[block_start:block_end]
    subs_m = re.search(r'subs:\s*\[', block)
    if not subs_m:
        return text, False
    arr_start = block_start + subs_m.end() - 1
    entries_text = ",\n".join(sub_entries)
    return insert_into_array(text, arr_start, entries_text, f"sub-experiments {exp_id}")


def human_size(path):
    size = path.stat().st_size
    if size < 1024:
        return f"{size} B"
    if size < 1024 * 1024:
        return f"{size / 1024:.1f} KB"
    return f"{size / (1024 * 1024):.1f} MB"

# Build imports grouped by experiment
imports = {}
for src_file in FILES:
    mapped = EXP_FOR_FILE.get(src_file.name)
    if not mapped:
        continue
    dest_file = DEST / src_file.name
    shutil.copy2(src_file, dest_file)
    nb = nbformat.read(src_file, as_version=4)
    blocks = split_heading_blocks(nb, mapped, src_file.name)
    material = {
        "name": src_file.name,
        "url": "assets/files/imported/" + src_file.name,
        "size": human_size(dest_file),
        "date": "2026-10-08",
    }
    imports.setdefault(mapped, {"files": [], "subs": []})
    imports[mapped]["files"].append(material)
    for b in blocks:
        imports[mapped]["subs"].append(make_sub_entry(b, src_file.name))

text = DATA.read_text(encoding="utf-8")
# Allow more than seven sub-experiments after imports.
text = text.replace('const LETTERS = ["A", "B", "C", "D", "E", "F", "G"];',
                    'const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];')

changed = []
for exp_id in sorted(imports):
    start, end = find_exp_block(text, exp_id)
    text, did_files = add_files_to_block(text, start, end, imports[exp_id]["files"])
    if did_files:
        changed.append(f"{exp_id}: materials")
    # Recalculate after text changed
    start, end = find_exp_block(text, exp_id)
    text, did_subs = add_subs_to_block(text, start, end, imports[exp_id]["subs"], exp_id)
    if did_subs:
        changed.append(f"{exp_id}: sub-experiments")

DATA.write_text(text, encoding="utf-8")
print("Imported notebooks:", len(FILES))
print("Changed:", ", ".join(changed) if changed else "already imported")
print("Copied to:", DEST)
for exp_id, payload in sorted(imports.items()):
    print(exp_id, "materials", len(payload["files"]), "subs", len(payload["subs"]))
