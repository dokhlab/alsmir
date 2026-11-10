"""Excel copy of analysis/ALSmiR_miRNA_vs_miRBase_23.1.csv (needs openpyxl; run in Docker on this host:
docker run --rm -v "$PWD":/w -w /w python:3.12-slim sh -c "pip install -q openpyxl && python make_xlsx.py")."""
import csv
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

SRC = "analysis/ALSmiR_miRNA_vs_miRBase_23.1.csv"
rows = list(csv.reader(open(SRC, encoding="utf-8-sig")))
wb = Workbook(); ws = wb.active; ws.title = "ALSmiR vs miRBase 23.1"
head = rows[0]
fills = {"Linked": "E2F0D9", "Not linked": "F2F2F2", "Check": "FCE4D6"}
widths = {"ALSmiR miRNA name (as reported)": 30, "Tissues": 24, "Linked on ALSmiR website": 10, "Status": 30, "Issue": 50, "Action needed": 44,
          "miRBase 23.1 name": 24, "miRBase link": 42, "Mature sequence (23.1)": 30, "Sequence vs miRBase v22": 30, "v22 sequence (if changed)": 28,
          "Precursor hairpin(s)": 28, "Genome location(s) GRCh38": 40, "Candidates (for 'Check' rows)": 50}
for j, h in enumerate(head, 1):
    c = ws.cell(row=1, column=j, value=h)
    c.font = Font(name="Arial", bold=True, color="FFFFFF", size=10); c.fill = PatternFill("solid", fgColor="1F4E5A"); c.alignment = Alignment(wrap_text=True, vertical="top")
    ws.column_dimensions[get_column_letter(j)].width = widths.get(h, 14)
si = head.index("Status")
for i, r in enumerate(rows[1:], 2):
    key = next((k for k in fills if r[si].startswith(k)), "Check")
    if r[si].startswith("Linked –"): key = "Check"
    for j, v in enumerate(r, 1):
        val = int(v) if head[j - 1] in ("Results", "Publications") and v.isdigit() else v
        c = ws.cell(row=i, column=j, value=val)
        c.font = Font(name="Arial", size=10); c.alignment = Alignment(vertical="top", wrap_text=head[j - 1] in ("Issue", "Action needed", "Candidates (for 'Check' rows)"))
        c.fill = PatternFill("solid", fgColor=fills[key])
        if head[j - 1] == "miRBase link" and v and ";" not in v:
            c.hyperlink = v; c.font = Font(name="Arial", size=10, color="0563C1", underline="single")
ws.freeze_panes = "B2"; ws.auto_filter.ref = ws.dimensions
n = wb.create_sheet("Read me")
for i, t in enumerate([
    "ALSmiR miRNA names vs miRBase 23.1", "",
    "One row per miRNA name in ALSmiR (dataset V05). miRBase data from the official release 23.1 files (public domain).",
    "Curator rule (2 Oct 2026): the website links a miRNA to miRBase only when the ALSmiR name is identical to the miRBase 23.1 name.",
    "Green = linked. Grey = not linked (renamed or combined name). Orange = needs a curator check.",
    "Sequence vs miRBase v22: 'Ends refined' = same molecule with adjusted ends; 'REDEFINED' = the 23.1 sequence may not be what the study measured.",
    "Rebuild: python3 analyse_alsmir_vs_mirbase.py && python3 write_report.py && python3 write_csv.py && make_xlsx.py (see README.md).",
], 1):
    c = n.cell(row=i, column=1, value=t); c.font = Font(name="Arial", size=14 if i == 1 else 10, bold=(i == 1))
n.column_dimensions["A"].width = 140
wb.move_sheet("Read me", offset=-1)
wb.save("analysis/ALSmiR_miRNA_vs_miRBase_23.1.xlsx")
print("wrote analysis/ALSmiR_miRNA_vs_miRBase_23.1.xlsx", len(rows) - 1, "rows")
