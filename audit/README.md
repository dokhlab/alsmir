# ALSmiR independent audit

Checks that the website shows exactly what the curated workbook contains. It was written without looking at the
site's own loader (`build_dataset.py`) or source code: it reads the Excel with **openpyxl** and looks at the
**running site** through a headless browser (Playwright), then compares the two.

| Step | Script | What it checks |
|---|---|---|
| 1 | `truth.py` | Reads the workbook (as Excel displays each cell) and works out every number the site should show |
| 2 | `run_collect.sh` → `collect.mjs` | Downloads the CSV, expands all evidence rows, reads all numbers, charts, miRNA pages |
| 3 | `compare.py` | A: CSV, B: every expanded field, B-labels, C: all numbers and charts, D: no made-up content |
| 4 | `explorer_collect.mjs` / `explorer_compare.py` | Every Tissue Explorer cell and overlap group |
| 5 | `mirbase_collect.mjs` / `mirbase_compare.py` | miRBase links on all miRNA pages follow the exact-name rule (`../mirbase/README.md`) |

## Run

```sh
sh audit/run_all.sh                                   # against the live container
BASE=http://<preview-host>:<port> sh audit/run_all.sh # against a preview copy
XLSX=/data/<new workbook>.xlsx sh audit/run_all.sh    # after a new workbook version
```

Needs Docker (images `python:3.12-slim` and `mcr.microsoft.com/playwright:v1.55.0-noble`) on network `dokhlab-net`.
Results go to `audit/out/` (`report.txt`, `report.json`, `mismatches_*.txt`, `explorer_report.txt`, `mirbase_report.txt`).

Expected result: 0 mismatches everywhere, except 2 known hits in D ("fold change" and "p-value" in the
Reporting Practices guideline text, which is advice to authors, not data).

When a rule on the site changes on purpose (e.g. the Statistics ranking), update the matching rule here
(`truth.py` / `compare.py`) so the audit keeps checking it exactly.
