"""Build the ALSmiR website dataset from the curated Excel workbook.

Every cell is copied exactly as Excel displays it. Nothing is defaulted,
guessed, regrouped or renamed; anything unexpected stops the build.

Outputs:
  src/data/dataset.json  - read by the React site
  alsmir.db              - SQLite copy of the same three tables

Usage: python3 build_dataset.py [workbook.xlsx]
Uses only the Python standard library (openpyxl is not installed on this host).
"""
import hashlib
import json
import os
import re
import sqlite3
import sys
import xml.etree.ElementTree as ET
import zipfile
from decimal import ROUND_HALF_UP, Decimal

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_XLSX = os.path.join(BASE_DIR, "2026_TABLE_DATABASE_V08.xlsx")
JSON_OUT = os.path.join(BASE_DIR, "src", "data", "dataset.json")
DB_OUT = os.path.join(BASE_DIR, "alsmir.db")

M = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"

# Each table: sheet name, first data row (1-based), and the expected header of
# every column as (group, name, sub). The build fails if the workbook's headers
# differ, so a shifted or renamed column can never be loaded silently.
TABLES = {
    "publications": {
        "sheet": "1.PUB",
        "first_row": 5,
        "columns": [
            ("id", ("ID", None, None)),
            ("title", ("ARTICLE'S IDENTIFICATION", "Title", None)),
            ("doi", ("ARTICLE'S IDENTIFICATION", "DOI", None)),
            ("authors", ("ARTICLE'S IDENTIFICATION", "Authors", None)),
            ("year", ("ARTICLE'S IDENTIFICATION", "Year", None)),
            ("location", ("ARTICLE'S IDENTIFICATION", "Location of Study", None)),
        ],
    },
    "cohorts": {
        "sheet": "2.Cohort",
        "first_row": 4,
        "columns": [
            ("id", ("ID", None, None)),
            ("form", ("ALS PATIENTS", "Form of ALS  (Population level)", None)),
            ("diagnosis", ("ALS PATIENTS", "Diagnosis criteria", None)),
            ("mutations", ("ALS PATIENTS", "Mutations", None)),
            ("n", ("ALS PATIENTS", "Number", None)),
            ("sexFemale", ("ALS PATIENTS", "SEX", "Female")),
            ("sexMale", ("ALS PATIENTS", "SEX", "Male")),
            ("onsetBoth", ("ALS PATIENTS", "ONSET", "Both")),
            ("onsetUpperLimb", ("ALS PATIENTS", "ONSET", "Upper-limb")),
            ("onsetLowerLimb", ("ALS PATIENTS", "ONSET", "Lower-limb")),
            ("onsetSpinalLimb", ("ALS PATIENTS", "ONSET", "Spinal/Limb")),
            ("onsetBulbar", ("ALS PATIENTS", "ONSET", "Bulbar")),
            ("ageOnset", ("ALS PATIENTS", "Age at onset\n(Mean±SD, years)", None)),
            ("ageStudy", ("ALS PATIENTS", "Age at the time of the study (mean±SD, years)", None)),
            ("onsetToEndpoint", ("ALS PATIENTS", "Disease onset to end point\n(mean±SD, months)", None)),
            ("alsfrs", ("ALS PATIENTS", "ALS-FRS \n(mean±SD)", None)),
            ("treatment", ("ALS PATIENTS", "Therapeutic treatment", None)),
            ("controlType", ("CONTROL PATIENTS", "Type control", None)),
            ("controlN", ("CONTROL PATIENTS", "Number", None)),
            ("controlSexFemale", ("CONTROL PATIENTS", "SEX", "Female")),
            ("controlSexMale", ("CONTROL PATIENTS", "SEX", "Male")),
            ("controlAgeStudy", ("CONTROL PATIENTS", "Age at the time of the study\n(mean±SD, years)", None)),
        ],
    },
    "results": {
        "sheet": "3.miRNA",
        "first_row": 2,
        "columns": [
            ("id", ("ID", None, None)),
            ("microRNA", ("microRNA", None, None)),
            ("axis", ("AXIS", None, None)),
            ("typeOfAls", ("Type of ALS (Analytical level)", None, None)),
            ("alsN", ("ALS (N)", None, None)),
            ("kResidentN", ("K-residenC (N)", None, None)),
            ("hcN", ("HC (N)", None, None)),
            ("method", ("Method", None, None)),
            ("tissue", ("Tissue", None, None)),
            ("authorYear", ("Author (Year)", None, None)),
            ("doi", ("DOI", None, None)),
        ],
    },
}

# Number of header rows per sheet: (group row, name row, sub row) or fewer.
HEADER_ROWS = {"1.PUB": 2, "2.Cohort": 3, "3.miRNA": 1}

# ISO-3166 alpha-3 codes, used only to place countries on the map. The country
# text itself is always shown exactly as written in the workbook.
COUNTRY_ISO = {
    "Brazil": "BRA", "Canada": "CAN", "Chile": "CHL", "China": "CHN",
    "Egypt": "EGY", "Germany": "DEU", "India": "IND", "Iran": "IRN", "Israel": "ISR",
    "Italy": "ITA", "Belgium": "BEL", "Japan": "JPN", "Portugal": "PRT",
    "Republic of Korea": "KOR", "Slovenia": "SVN", "Spain": "ESP",
    "UK": "GBR", "USA": "USA",
}

AXIS_DIRECTION = {"↑": "up", "↓": "down", "=": "none"}


class BuildError(Exception):
    pass


def col_index(ref):
    n = 0
    for ch in re.match(r"[A-Z]+", ref).group():
        n = n * 26 + ord(ch) - 64
    return n - 1


def text_of(node):
    """Visible text of a shared/inline string, excluding phonetic (rPh) runs."""
    direct = node.find(M + "t")
    if direct is not None:
        return direct.text or ""
    return "".join((r.find(M + "t").text or "") for r in node.findall(M + "r") if r.find(M + "t") is not None)


def format_number(raw, fmt_id, ref):
    """Render a numeric cell the way Excel displays it."""
    d = Decimal(raw)
    if fmt_id == 0:  # General
        f = float(raw)
        return str(int(f)) if f.is_integer() else repr(f)
    if fmt_id == 9:  # 0%
        return f"{(d * 100).quantize(Decimal('1'), ROUND_HALF_UP)}%"
    if fmt_id == 10:  # 0.00%
        return f"{(d * 100).quantize(Decimal('0.01'), ROUND_HALF_UP)}%"
    raise BuildError(f"Cell {ref}: unsupported number format id {fmt_id}")


def read_workbook(path):
    z = zipfile.ZipFile(path)
    names = z.namelist()
    shared = []
    if "xl/sharedStrings.xml" in names:
        shared = [text_of(si) for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall(M + "si")]
    styles = ET.fromstring(z.read("xl/styles.xml"))
    if styles.find(M + "numFmts") is not None and len(styles.find(M + "numFmts")):
        raise BuildError("Workbook defines custom number formats; extend format_number first")
    xf_fmt = [int(x.get("numFmtId", 0)) for x in styles.find(M + "cellXfs")]

    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = {r.get("Id"): r.get("Target") for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))}
    sheets = {}
    for s in wb.find(M + "sheets"):
        target = rels[s.get(R + "id")].lstrip("/")
        target = target if target.startswith("xl/") else "xl/" + target
        root = ET.fromstring(z.read(target))
        cells = {}
        for row in root.iter(M + "row"):
            for c in row.findall(M + "c"):
                ref = c.get("r")
                rnum = int(re.search(r"\d+", ref).group())
                if c.find(M + "f") is not None:
                    raise BuildError(f"{s.get('name')}!{ref}: formulas are not supported")
                t = c.get("t", "n")
                v = c.find(M + "v")
                if t == "inlineStr":
                    val = text_of(c.find(M + "is"))
                elif v is None:
                    continue
                elif t == "s":
                    val = shared[int(v.text)]
                elif t == "str":
                    val = v.text or ""
                elif t == "n":
                    val = format_number(v.text, xf_fmt[int(c.get("s", 0))], f"{s.get('name')}!{ref}")
                else:
                    raise BuildError(f"{s.get('name')}!{ref}: unsupported cell type {t!r}")
                cells[(rnum, col_index(ref))] = val
        merges = []
        for m in root.iter(M + "mergeCell"):
            a, b = m.get("ref").split(":")
            merges.append((int(re.search(r"\d+", a).group()), col_index(a), int(re.search(r"\d+", b).group()), col_index(b)))
        sheets[s.get("name")] = (cells, merges)
    return sheets


def header_labels(cells, merges, n_header_rows, n_cols):
    """(group, name, sub) for every column, expanding merged header cells."""
    def value(r, c):
        for r1, c1, r2, c2 in merges:
            if r1 <= r <= r2 and c1 <= c <= c2:
                return cells.get((r1, c1))
        return cells.get((r, c))

    labels = []
    for c in range(n_cols):
        parts = [value(r, c) for r in range(1, n_header_rows + 1)]
        # A cell merged vertically repeats the same text; keep it once.
        dedup = []
        for p in parts:
            if p is not None and (not dedup or dedup[-1] != p):
                dedup.append(p)
        dedup += [None] * (3 - len(dedup))
        labels.append(tuple(dedup[:3]))
    return labels


def load_table(sheets, key):
    spec = TABLES[key]
    cells, merges = sheets[spec["sheet"]]
    cols = spec["columns"]
    found = header_labels(cells, merges, HEADER_ROWS[spec["sheet"]], len(cols))
    for (ckey, expected), got in zip(cols, found):
        if expected != got:
            raise BuildError(f"{spec['sheet']} column {ckey}: header is {got!r}, expected {expected!r}")
    extra = sorted({c for (r, c) in cells if c >= len(cols) and r >= spec["first_row"]})
    if extra:
        raise BuildError(f"{spec['sheet']}: data found in unexpected columns {extra}")

    rows = []
    last = max(r for (r, _) in cells)
    for r in range(spec["first_row"], last + 1):
        vals = [cells.get((r, c)) for c in range(len(cols))]
        if all(v is None for v in vals):
            continue
        if vals[0] is None or not vals[0].strip():
            raise BuildError(f"{spec['sheet']} row {r}: data without an ID")
        row = {"excelRow": r}
        row.update({ckey: v for (ckey, _), v in zip(cols, vals)})
        rows.append(row)

    ids = [r["id"] for r in rows]
    dups = sorted({i for i in ids if ids.count(i) > 1})
    if dups:
        raise BuildError(f"{spec['sheet']}: duplicate IDs {dups}")
    # A single-level header (e.g. "ID", "microRNA") is its own label, with no group.
    columns = [
        {"key": ckey, "group": g, "label": n, "sub": s} if n is not None else {"key": ckey, "group": None, "label": g, "sub": None}
        for (ckey, (g, n, s)) in cols
    ]
    return {"sheet": spec["sheet"], "columns": columns, "rows": rows}


# Documented cohort aliases (curators, 8 Oct 2026). PUB0005_C01 and PUB0005_PUB0007_C01 are ONE shared
# cohort (13 fALS patients) used in PUB0005 and PUB0007; each publication reports different miRNA results.
# Results of the alias keep their own IDs and their own publication (by DOI); for linking and aggregation
# they resolve to the canonical cohort, which is counted once. Applies to these exact IDs only.
# Fields that differ between the two rows are reported as conflicts (not as an unresolved duplicate).
COHORT_ALIASES = {"PUB0005_C01": "PUB0005_PUB0007_C01"}


def norm_doi(doi):
    s = re.sub(r"\s+", "", (doi or "").replace("−", "-")).lower()
    return re.sub(r"^https?://(dx\.)?doi\.org/", "", s)


def link(data):
    """Attach IDs that connect results -> cohorts -> publications. Values are untouched."""
    pubs = {p["id"]: p for p in data["publications"]["rows"]}
    cohorts = {c["id"]: c for c in data["cohorts"]["rows"]}
    warnings = []

    for p in data["publications"]["rows"]:
        loc = p["location"]
        if loc is None:
            raise BuildError(f"{p['id']}: no Location of Study")
        isos = []
        for part in loc.split(";"):
            name = part.strip()
            if name not in COUNTRY_ISO:
                raise BuildError(f"{p['id']}: country {name!r} has no ISO code; add it to COUNTRY_ISO")
            isos.append(COUNTRY_ISO[name])
        p["countryIso"] = isos

    for c in data["cohorts"]["rows"]:
        c["publicationIds"] = re.findall(r"PUB\d{4}", c["id"])
        missing = [pid for pid in c["publicationIds"] if pid not in pubs]
        if not c["publicationIds"] or missing:
            raise BuildError(f"Cohort {c['id']}: unknown publication(s) {missing or c['id']}")

    data["cohortAliases"] = []
    for alias, canonical in COHORT_ALIASES.items():
        if alias not in cohorts:
            continue  # the curators may merge the rows in a later workbook
        if canonical not in cohorts:
            raise BuildError(f"Cohort alias {alias} points to {canonical}, which is not in 2.Cohort")
        cohorts[alias]["aliasOf"] = canonical
        conflicts = []
        for col in data["cohorts"]["columns"]:
            k = col["key"]
            if k != "id" and cohorts[alias][k] != cohorts[canonical][k]:
                conflicts.append({"field": k, "alias": cohorts[alias][k], "canonical": cohorts[canonical][k]})
                warnings.append(f"Cohort alias {alias} -> {canonical}: field {k} differs ({cohorts[alias][k]!r} vs {cohorts[canonical][k]!r})")
        data["cohortAliases"].append({"alias": alias, "canonical": canonical, "conflicts": conflicts})

    for r in data["results"]["rows"]:
        m = re.fullmatch(r"(.+_C\d{2})_R\d{5}", r["id"])
        if not m:
            raise BuildError(f"Result {r['id']}: ID is not <cohort>_R#####")
        cid = COHORT_ALIASES.get(m.group(1), m.group(1))
        r["cohortId"] = cid if cid in cohorts else None
        if r["cohortId"] is None:
            warnings.append(f"Result {r['id']} (Excel row {r['excelRow']}): cohort {m.group(1)} does not exist in 2.Cohort")
        pub_ids = re.findall(r"PUB\d{4}", m.group(1))
        missing = [pid for pid in pub_ids if pid not in pubs]
        if not pub_ids or missing:
            raise BuildError(f"Result {r['id']}: unknown publication(s) {missing or m.group(1)}")
        r["publicationIds"] = pub_ids
        # The publication this result is cited from: the one whose DOI matches,
        # or the only one. A shared cohort (e.g. PUB0005_PUB0007) has two.
        matches = [pid for pid in pub_ids if norm_doi(pubs[pid]["doi"]) == norm_doi(r["doi"])]
        if len(matches) == 1:
            r["publicationId"] = matches[0]
        elif len(pub_ids) == 1:
            r["publicationId"] = pub_ids[0]
            warnings.append(f"Result {r['id']}: DOI {r['doi']!r} differs from {pub_ids[0]} DOI {pubs[pub_ids[0]]['doi']!r}")
        else:
            raise BuildError(f"Result {r['id']}: cannot tell which of {pub_ids} it belongs to")
        if r["axis"] not in AXIS_DIRECTION:
            raise BuildError(f"Result {r['id']}: AXIS {r['axis']!r} is not one of {list(AXIS_DIRECTION)}")
        r["direction"] = AXIS_DIRECTION[r["axis"]]
    return warnings


def write_db(data):
    tmp = DB_OUT + ".tmp"
    if os.path.exists(tmp):
        os.remove(tmp)
    conn = sqlite3.connect(tmp)
    for key, table in data.items():
        if key in ("source", "cohortAliases"):
            continue
        cols = ["excelRow"] + [c["key"] for c in table["columns"]]
        links = [k for k in ("cohortId", "publicationId", "publicationIds", "countryIso", "direction", "aliasOf")
                 if any(k in row for row in table["rows"])]
        all_cols = cols + links
        conn.execute(f'CREATE TABLE {key} ({", ".join(f"{c} TEXT" for c in all_cols)}, PRIMARY KEY (id))')
        for row in table["rows"]:
            vals = [json.dumps(row.get(c)) if isinstance(row.get(c), list) else (None if row.get(c) is None else str(row.get(c))) for c in all_cols]
            conn.execute(f'INSERT INTO {key} VALUES ({", ".join("?" * len(all_cols))})', vals)
    conn.execute("CREATE TABLE source (file TEXT, sha256 TEXT, version TEXT, savedDate TEXT)")
    src = data["source"]
    conn.execute("INSERT INTO source VALUES (?, ?, ?, ?)", (src["file"], src["sha256"], src["version"], src["savedDate"]))
    conn.commit()
    conn.close()
    os.replace(tmp, DB_OUT)


def workbook_info(path):
    """Dataset version from the file name (e.g. V05) and the date Excel last saved the workbook."""
    m = re.search(r"V(\d+)", os.path.basename(path), re.I)
    core = zipfile.ZipFile(path).read("docProps/core.xml").decode("utf-8")
    saved = re.search(r"<dcterms:modified[^>]*>(\d{4}-\d{2}-\d{2})", core)
    return {"version": f"V{m.group(1)}" if m else None, "savedDate": saved.group(1) if saved else None}


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_XLSX
    sheets = read_workbook(path)
    data = {"source": {"file": os.path.basename(path), "sha256": hashlib.sha256(open(path, "rb").read()).hexdigest(), **workbook_info(path)}}
    for key in TABLES:
        data[key] = load_table(sheets, key)
    warnings = link(data)

    os.makedirs(os.path.dirname(JSON_OUT), exist_ok=True)
    with open(JSON_OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    write_db(data)

    print(f"Read {data['source']['file']} ({data['source']['version']}, saved {data['source']['savedDate']}, sha256 {data['source']['sha256'][:12]}...)")
    for key in TABLES:
        print(f"  {key}: {len(data[key]['rows'])} rows")
    for w in warnings:
        print(f"  WARNING: {w}")
    print(f"Wrote {os.path.relpath(JSON_OUT, BASE_DIR)} and {os.path.relpath(DB_OUT, BASE_DIR)}")


if __name__ == "__main__":
    try:
        main()
    except BuildError as e:
        sys.exit(f"BUILD FAILED: {e}")
