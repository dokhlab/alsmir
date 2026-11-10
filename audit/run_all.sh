#!/bin/sh
# Re-run the full independent audit: Excel truth -> browser collection -> comparison.
# Usage: sh run_all.sh   (env: XLSX_DIR, BASE)
set -e
V="$(cd "$(dirname "$0")" && pwd)"
XLSX_DIR="${XLSX_DIR:-/home/html/sites/alsmir}"
BASE="${BASE:-http://confs-alsmir_site-1:3100}"
mkdir -p "$V/out"
echo "[1/3] truth from Excel (openpyxl)"
docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp -e XLSX="${XLSX:-/data/2026_TABLE_DATABASE_V08.xlsx}" -v "$XLSX_DIR":/data:ro -v "$V":/work -w /work python:3.12-slim sh -c \
  "[ -d /work/pylib/openpyxl ] || pip install -q --target /work/pylib openpyxl; PYTHONPATH=/work/pylib python truth.py" > "$V/out/truth.log"
tail -n +1 "$V/out/truth.log" | head -20
echo "[2/3] collect site via headless Chromium (takes ~10-20 min)"
docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp --network dokhlab-net -e BASE="$BASE" -v "$V":/work -w /work mcr.microsoft.com/playwright:v1.55.0-noble sh run_collect.sh
echo "[3/3] compare"
docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp -v "$V":/work -w /work python:3.12-slim python compare.py | tee "$V/out/report.txt"

echo "[4/5] Tissue Explorer: every cell vs Excel"
docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp --network dokhlab-net -e BASE="$BASE" -v "$V":/work -w /work mcr.microsoft.com/playwright:v1.55.0-noble node explorer_collect.mjs
(cd "$V" && python3 explorer_compare.py) | tee "$V/out/explorer_report.txt"
echo "[5/5] miRBase links: exact-name rule on every miRNA page"
python3 -c "import json; t=json.load(open('$V/out/truth.json')); json.dump(sorted({r['v'][1] for r in t['results']}), open('$V/out/mir_names.json','w'))"
docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp --network dokhlab-net -e BASE="$BASE" -v "$V":/work -w /work mcr.microsoft.com/playwright:v1.55.0-noble node mirbase_collect.mjs
docker run --rm --user "$(id -u):$(id -g)" -v "$V":/work -v "$XLSX_DIR":/data:ro -w /work python:3.12-slim python mirbase_compare.py | tee "$V/out/mirbase_report.txt"
