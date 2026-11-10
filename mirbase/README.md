# miRBase for ALSmiR

Everything about linking ALSmiR miRNAs to miRBase: the official downloads, the scripts, and the results.

## Curator rule (2 October 2026)

> Generate a miRBase hyperlink only when the ALSmiR name exactly matches one miRBase name, character for character, including capitalization, punctuation, species prefix and all suffixes. Use the accession belonging to that exact entry.
> If the names differ, either field is blank, or the entry contains combined miRNA names, display the original ALSmiR name as plain text without a hyperlink.
> Do not rename, normalize, infer missing arms, substitute historical names or use approximate matches. Preserve the original data. Remove any existing hyperlinks that fail this rule. (Disregard trailing spaces.)

How `build_mirbase_links.py` applies it: leading/trailing whitespace is ignored for the comparison only; the comparison is case-sensitive and exact against every mature name in `23.1/mature.fa`; a name must match exactly one entry; names that are blank or contain a separator (`_ ; , / + &` or an inner space) are never linked. The ALSmiR name is always displayed unchanged. With dataset V05: **585 of 816 names are linked**; 8 combined names and 223 non-identical names are not.

## Folder contents

| Path | What it is |
|---|---|
| `23.1/` | Official miRBase release 23.1 files, unchanged, from https://www.mirbase.org/download/: `mature.fa`, `hairpin.fa`, `hsa.gff3` (GRCh38), `miRNA.diff`, `README`, `LICENSE` |
| `reference_v22/` | Human mature miRNAs from miRBase v22 (nf-core mirror). Used **only** to prove renames by accession number; never shown on the site |
| `build_mirbase_links.py` | Writes `../src/data/mirbase_links.json`, the links the website shows (exact names only) |
| `analyse_alsmir_vs_mirbase.py` | Full analysis of every ALSmiR name against miRBase 23.1 (exact, renamed, removed, …) |
| `write_report.py` | Writes `analysis/REPORT.md` |
| `write_csv.py` | Writes `analysis/ALSmiR_miRNA_vs_miRBase_23.1.csv` |
| `make_xlsx.py` | Writes the Excel copy `analysis/ALSmiR_miRNA_vs_miRBase_23.1.xlsx` |
| `analysis/REPORT.md` | Findings: categories, renames, sequence changes, names for curator review |
| `analysis/ALSmiR_miRNA_vs_miRBase_23.1.csv` / `.xlsx` | One row per ALSmiR name with status, issue, action, miRBase name, accession, link, sequence, precursors and genome locations |
| `analysis/alsmir_mirbase_mapping.json` / `.tsv`, `summary.json` | Machine-readable results |
| `analysis/subset/` | Only the miRBase entries ALSmiR uses: `mature_subset.fa`, `hairpin_subset.fa`, `hsa_subset.gff3` |

## Rebuild (after a new workbook or a new miRBase release)

```sh
cd /home/html/sites/alsmir
python3 build_dataset.py                 # workbook -> src/data/dataset.json
cd mirbase
python3 build_mirbase_links.py           # exact-name links for the website
python3 analyse_alsmir_vs_mirbase.py     # full analysis
python3 write_report.py && python3 write_csv.py
docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp -v "$PWD":/w -w /w python:3.12-slim \
  sh -c "pip install -q --target /tmp/pkg openpyxl && PYTHONPATH=/tmp/pkg python make_xlsx.py"
```

Then rebuild and audit the website as described in `../README.md`.

For a new miRBase release: download the files into a new folder (e.g. `24.0/`) and change `RELEASE` in `build_mirbase_links.py` and the `23.1` path in `analyse_alsmir_vs_mirbase.py`.

## Licence and citation

miRBase is in the public domain (see `23.1/LICENSE`). Cite: Kozomara A, Birgaoanu M, Griffiths-Jones S. miRBase: from microRNA sequences to function. *Nucleic Acids Res.* 2019;47:D155-D162. https://doi.org/10.1093/nar/gky1141

## Notes

- Release 23.1 has no secondary-structure, family or alias files; the archive of older releases was not reachable on 2 Oct 2026.
- 11 of the 585 linked names keep the same name, but miRBase 23 redefined their mature sequence (marked "Linked – sequence redefined (check)" in the CSV).
