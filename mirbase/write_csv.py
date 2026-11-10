"""Write analysis/ALSmiR_miRNA_vs_miRBase_23.1.csv (and .xlsx via make_xlsx.py): one row per ALSmiR miRNA name,
with its miRBase 23.1 information and plain-language status, issue and action columns.
Built from analysis/alsmir_mirbase_mapping.json (run analyse_alsmir_vs_mirbase.py first)."""
import csv, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(HERE, "analysis")
rows = json.load(open(os.path.join(A, "alsmir_mirbase_mapping.json")))["rows"]

# Re-read miRBase 23.1 so candidates also get accessions and sequences.
def read_fasta(path):
    recs, name = {}, None
    for line in open(path):
        line = line.rstrip("\n")
        if line.startswith(">"):
            p = line[1:].split()
            name = p[0] if p[0].startswith("hsa-") else None
            if name: recs[name] = {"acc": p[1], "seq": ""}
        elif name:
            recs[name]["seq"] += line.strip()
    return recs
mature = read_fasta(os.path.join(HERE, "23.1", "mature.fa"))
# "Linked on ALSmiR website" comes from the same file the website uses (built by build_mirbase_links.py).
SITE_LINKS = json.load(open(os.path.join(HERE, "..", "src", "data", "mirbase_links.json")))["links"]

STATUS = {
    "exact": ("Linked", "", "None"),
    "renamed_confirmed": ("Not linked – renamed in miRBase", "Name used in ALSmiR is outdated: miRBase 23 renamed this miRNA (same accession number), so the names are not identical", "None required (curator rule: link exact names only). Optional: update the name in the workbook"),
    "combined": ("Not linked – combined (##)", "Combined name of identical-sequence miRNAs; not a single miRBase name", "None required"),
    "arm_ambiguous": ("Check – arm not reported", "Name has no -3p/-5p, but miRBase has more than one strand for it", "Curator: check in the paper which strand was measured"),
    "removed": ("Check – removed from miRBase", "This miRNA was removed from miRBase in release 23 (misannotated)", "Curator: keep as reported with a note 'removed from miRBase', or exclude"),
    "not_a_mirbase_name": ("Check – not a miRBase name", "Name not found in miRBase v22 or 23.1: probably a naming error", "Curator: check the original name in the paper"),
    "needs_review": ("Check – naming", "Locus-specific name; miRBase names the mature miRNA without the locus number", "Curator: confirm the miRBase name (see candidates)"),
    "renamed_locus_ambiguous": ("Check – several candidates", "miRBase 23 uses locus-specific names and there is more than one candidate", "Curator: pick the right one from the candidates"),
    "unmatched": ("Check – combined name incomplete", "A part of this '##' name is not in miRBase 23.1", "Curator: check the combined name"),
    "renamed_unconfirmed": ("Check – likely renamed", "Looks renamed, but no old record proves it", "Curator: confirm"),
}

def seq_change(r):
    s = r.get("sequence_v22_vs_23_1")
    if not s: return "", ""
    if s == "same": return "Same as v22", ""
    old, new = s.replace("changed: v22 ", "").split(" -> 23.1 ")
    if old in new or new in old:
        return f"Ends refined ({len(new) - len(old):+d} nt)", old
    return "REDEFINED – may not be what the study measured", old

out_path = os.path.join(A, "ALSmiR_miRNA_vs_miRBase_23.1.csv")
cols = [
    "ALSmiR miRNA name (as reported)", "Results", "Publications", "Tissues",
    "Linked on ALSmiR website", "Status", "Issue", "Action needed",
    "miRBase 23.1 name", "miRBase accession (MIMAT)", "miRBase link",
    "Mature sequence (23.1)", "Length (nt)", "Sequence vs miRBase v22", "v22 sequence (if changed)",
    "Precursor hairpin(s)", "Precursor accession(s) (MI)", "Genome location(s) GRCh38",
    "Accession in v22", "Candidates (for 'Check' rows)",
]
with open(out_path, "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f)
    w.writerow(cols)
    order = list(STATUS)
    for r in sorted(rows, key=lambda r: (order.index(r["final_category"]), -r["results"], r["alsmir_name"])):
        cat = r["final_category"]
        status, issue, action = STATUS[cat]
        if cat == "renamed_confirmed":
            targets = [r["suggestions"][0]]
        elif cat in ("exact", "combined"):
            targets = [l["name"] for l in r["linked"]]
        else:
            targets = []
        # Extra issue for exact/renamed rows whose sequence was redefined.
        change, old = seq_change(r)
        if change.startswith("REDEFINED"):
            status = "Linked – sequence redefined (check)" if cat == "exact" else status
            issue = (issue + "; " if issue else "") + "miRBase 23 redefined the mature sequence"
            action = "Curator: confirm the sequence the study's assay targeted"
        if cat == "combined" and "WARNING" in r["note"]:
            status, issue = "Not linked – combined (##), check", r["note"].replace("WARNING: ", "")
            action = "Curator: confirm these are still identical-sequence miRNAs"
        accs = [mature[t]["acc"] for t in targets]
        seqs = [mature[t]["seq"] for t in targets]
        precs = [p for l in r["linked"] for p in l["precursors"]] if targets else []
        cands = "" if targets else "; ".join(f"{c} ({mature[c]['acc']})" if c in mature else c for c in r["suggestions"])
        w.writerow([
            r["alsmir_name"], r["results"], r["publications"], "; ".join(r["tissues"]),
            "Yes" if r["alsmir_name"] in SITE_LINKS else "No", status, issue, action,
            "; ".join(targets), "; ".join(accs),
            "; ".join(f"https://www.mirbase.org/mature/{a}" for a in accs),
            "; ".join(seqs), "; ".join(str(len(s)) for s in seqs), change, old,
            "; ".join(sorted({p["name"] for p in precs if p["name"]})), "; ".join(sorted({p["MI"] for p in precs if p["MI"]})),
            "; ".join(p["locus"] for p in precs),
            r.get("v22_accession") or "", cands,
        ])
print("wrote", out_path)
