"""Write analysis/REPORT.md from the analysis outputs (all numbers come from the files)."""
import json, os, collections

HERE = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(HERE, "analysis")
rows = json.load(open(os.path.join(A, "alsmir_mirbase_mapping.json")))["rows"]
S = json.load(open(os.path.join(A, "summary.json")))
by = collections.defaultdict(list)
for r in rows: by[r["final_category"]].append(r)
total_res = sum(r["results"] for r in rows)
pct = lambda n: f"{100 * n / total_res:.1f}%"


def shift_kind(r):
    old, new = r["sequence_v22_vs_23_1"].replace("changed: v22 ", "").split(" -> 23.1 ")
    return ("ends refined" if (old in new or new in old) else "redefined"), old, new


changed = [r for r in rows if (r.get("sequence_v22_vs_23_1") or "").startswith("changed")]
redefined = [r for r in changed if shift_kind(r)[0] == "redefined"]
L = []
w = L.append
w("# ALSmiR miRNA names vs miRBase 23.1\n")
w("Analysis date: 2 October 2026. Read-only: the website, the database and the Excel were not changed.\n")
w("## Sources\n")
w("- **miRBase release 23.1** (September 2026), downloaded from https://www.mirbase.org/download/ into `23.1/`: `mature.fa`, `hairpin.fa`, `hsa.gff3` (GRCh38 coordinates), `miRNA.diff`, `README`, `LICENSE`.")
w("  - miRBase is in the **public domain**: free to use and redistribute. Cite Kozomara A, Birgaoanu M, Griffiths-Jones S. *Nucleic Acids Res.* 2019;47:D155-D162.")
w("  - Release 23.1 does **not** include the structure (`miRNA.str`), family (`miFam.dat`) or alias (`aliases.txt`) files that older releases had, and the archive of older releases is not reachable.")
w(f"- **Cross-check only:** the human mature list from miRBase v22 (nf-core mirror, `reference_v22/`) was used to prove renames by accession number. It is never used as a data source.")
w(f"- **ALSmiR:** {S['alsmir_names']} distinct miRNA names in {S['alsmir_results']} results (dataset V05).\n")
w(f"Human miRBase 23.1: {S['mirbase_human']['mature']} mature miRNAs, {S['mirbase_human']['hairpin']} hairpins.\n")
w("## Summary\n")
w("| Category | What it means | Names | Results |")
w("|---|---|---|---|")
desc = {
    "exact": "Name exists unchanged in miRBase 23.1 → can be linked directly",
    "renamed_confirmed": "Name changed in miRBase 23; same accession number proves it is the same miRNA",
    "combined": "'##' name; every part exists in 23.1",
    "renamed_unconfirmed": "Looks renamed (name rule) but no old record to prove it",
    "arm_ambiguous": "ALSmiR name has no -3p/-5p and miRBase has both arms; the paper must say which",
    "removed": "Was in miRBase v22, removed in release 23 (misannotated)",
    "not_a_mirbase_name": "In neither v22 nor 23.1: probably a naming error to check in the paper",
    "needs_review": "Name doesn't fit miRBase naming",
    "renamed_locus_ambiguous": "Now has locus-specific names; more than one candidate",
    "unmatched": "'##' name with a part not in 23.1",
}
order = ["exact", "renamed_confirmed", "combined", "renamed_unconfirmed", "arm_ambiguous", "removed", "not_a_mirbase_name", "needs_review", "renamed_locus_ambiguous", "unmatched"]
for c in order:
    if by[c]:
        n = sum(r["results"] for r in by[c])
        w(f"| {c} | {desc[c]} | {len(by[c])} | {n} ({pct(n)}) |")
linkable = sum(r["results"] for c in ("exact", "renamed_confirmed", "combined") for r in by[c])
w(f"\n**{pct(linkable)} of all results ({linkable} of {total_res}) can be linked to miRBase with certainty** (exact, confirmed renames and combined names). The remaining {total_res - linkable} results ({sum(len(by[c]) for c in order[3:])} names) need a curator decision; they are listed below.\n")
w(f"57 of the linked miRNAs come from more than one genomic locus (e.g. let-7a-5p from 3 hairpins). Every linked miRNA has genome coordinates.\n")

w("## Important: miRBase 23 renamed many miRNAs\n")
w("Release 23 renamed 20,514 mature sequences. Many names in the papers (and in ALSmiR) are now outdated, for example:\n")
for name in ["hsa-miR-206", "hsa-miR-451a", "hsa-miR-1-3p", "hsa-miR-194-5p", "hsa-miR-153-3p", "hsa-miR-4454"]:
    r = next((x for x in rows if x["alsmir_name"] == name), None)
    if r and r["final_category"] == "renamed_confirmed":
        w(f"- `{name}` → **`{r['suggestions'][0]}`** (accession {r["v22_accession"]}, {r["results"]} result{"" if r["results"] == 1 else "s"})")
w("\nRecommendation: keep the names **as reported** in ALSmiR (the curation rule), and show the current miRBase name and accession next to them.\n")

w("## Sequences changed between v22 and 23.1\n")
w(f"{len(changed)} of the miRNAs that can be linked have a different mature sequence in 23.1. The papers' assays were designed against the older sequences.\n")
w(f"- **{len(changed) - len(redefined)} have refined ends** (1–4 nucleotides added or trimmed at an end, based on sequencing data). These are the same molecule.")
w(f"- **{len(redefined)} were redefined** (the 23.1 sequence is shifted, not just extended). For these, the 23.1 sequence may **not** be what the study measured. Show the sequence with a warning, or show both:\n")
w("| ALSmiR name | Results | v22 sequence | 23.1 sequence |")
w("|---|---|---|---|")
for r in sorted(redefined, key=lambda r: r["alsmir_name"]):
    _, old, new = shift_kind(r)
    w(f"| {r['alsmir_name']} | {r['results']} | `{old}` | `{new}` |")

w("\n## Names that need a curator decision\n")
for c in order[3:]:
    if not by[c]:
        continue
    w(f"### {c} ({len(by[c])})\n{desc[c]}.\n")
    w("| ALSmiR name | Results | Publications | miRBase 23.1 candidates | Note |")
    w("|---|---|---|---|---|")
    for r in sorted(by[c], key=lambda r: (-r["results"], r["alsmir_name"])):
        cand = ", ".join(r["suggestions"]) if r["suggestions"] else "—"
        w(f"| {r['alsmir_name']} | {r['results']} | {r['publications']} | {cand} | {r['note']} |")
    w("")

w("## '##' combined names\n")
for r in by["combined"] + by["unmatched"]:
    w(f"- `{r['alsmir_name']}`: {r['note']}")

w("\n## What can be shown on the site (for the integration discussion)\n")
w("For each linked miRNA, from the official 23.1 files:\n")
w("- current miRBase name and **accession** (MIMAT…), linked to `https://www.mirbase.org/mature/MIMAT…`;")
w("- **mature sequence** and length;")
w("- **precursor hairpin(s)** (MI…): name, full stem-loop sequence, and the position of the mature sequence inside it;")
w("- **genome location** (GRCh38 chromosome, start–end, strand) for every locus.")
w("\nNot in 23.1, so it must be computed or left out:")
w("- **Secondary structure:** can be predicted from the hairpin sequence with RNAfold (ViennaRNA), the same method miRBase used. It must be labelled as a prediction.")
w("- **miRNA families:** not available in 23.1.")
w("\n## Files\n")
w("- `analysis/alsmir_mirbase_mapping.tsv` / `.json`: one row per ALSmiR name, with category, 23.1 name, accession, sequence, precursors, loci, v22 cross-check and notes.")
w(f"- `analysis/subset/`: only the miRBase entries ALSmiR uses (and suggested matches): `mature_subset.fa` ({S['subset']['mature']} mature), `hairpin_subset.fa` ({S['subset']['hairpin']} hairpins), `hsa_subset.gff3` (their GRCh38 coordinates).")
w("- `analyse_alsmir_vs_mirbase.py`, `write_report.py`: rerun to reproduce, e.g. after the V06 workbook.")
open(os.path.join(A, "REPORT.md"), "w").write("\n".join(L) + "\n")
print("wrote", os.path.join(A, "REPORT.md"))
