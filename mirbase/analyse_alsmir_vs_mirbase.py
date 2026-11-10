"""Match ALSmiR miRNA names against miRBase 23.1 and extract only what ALSmiR uses.

Read-only on the website: reads ../src/data/dataset.json.
Uses only official miRBase 23.1 files in ./23.1/ (mature.fa, hairpin.fa, hsa.gff3, miRNA.diff).
Writes ./analysis/: mapping table, extracted subset files, and a report.

Matching rules (nothing is linked unless the name matches miRBase exactly):
  exact        ALSmiR name == a human mature miRNA name in miRBase 23.1
  combined     a '##' name ("a_b_c"): every part matches exactly
  everything else -> NOT linked; listed with suggestions for curator review
"""
import collections
import difflib
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
REL = os.path.join(HERE, "23.1")
OUT = os.path.join(HERE, "analysis")
DATASET = os.path.join(HERE, "..", "src", "data", "dataset.json")
os.makedirs(os.path.join(OUT, "subset"), exist_ok=True)


def read_fasta(path, prefix="hsa-"):
    recs, name = {}, None
    for line in open(path, encoding="ascii"):
        line = line.rstrip("\n")
        if line.startswith(">"):
            parts = line[1:].split()
            name = parts[0] if parts[0].startswith(prefix) else None
            if name:
                recs[name] = {"name": name, "acc": parts[1], "desc": " ".join(parts[2:]), "seq": ""}
        elif name:
            recs[name]["seq"] += line.strip()
    return recs


mature = read_fasta(os.path.join(REL, "mature.fa"))
hairpin = read_fasta(os.path.join(REL, "hairpin.fa"))
hairpin_by_acc = {r["acc"]: r for r in hairpin.values()}

# Genome coordinates and mature -> precursor links from hsa.gff3 (GRCh38).
mature_loci = collections.defaultdict(list)   # MIMAT -> [(chr, start, end, strand, MI)]
hairpin_loci = collections.defaultdict(list)  # MI -> [(chr, start, end, strand)]
gff_header = [l.strip() for l in open(os.path.join(REL, "hsa.gff3")) if l.startswith("#")]
for line in open(os.path.join(REL, "hsa.gff3")):
    if line.startswith("#") or not line.strip():
        continue
    chrom, _, kind, start, end, _, strand, _, attrs = line.rstrip("\n").split("\t")
    a = dict(kv.split("=", 1) for kv in attrs.split(";") if "=" in kv)
    if kind == "miRNA_primary_transcript":
        hairpin_loci[a["ID"]].append((chrom, int(start), int(end), strand))
    elif kind == "miRNA":
        mature_loci[a["ID"].split("_")[0]].append((chrom, int(start), int(end), strand, a.get("Derives_from")))

diff = collections.defaultdict(list)
for line in open(os.path.join(REL, "miRNA.diff")):
    if line.startswith("#") or not line.strip():
        continue
    acc, name, tag = line.split()[:3]
    if name.startswith("hsa-"):
        diff[name].append(tag)

mature_names = sorted(mature)
mature_by_acc = {r["acc"]: r["name"] for r in mature.values()}

# Cross-check only: old (v22) name -> accession, to prove renames by accession.
V22 = os.path.join(HERE, "reference_v22", "mature_hsa_v22.fa")
v22 = read_fasta(V22) if os.path.exists(V22) else {}
lower_index = {n.lower(): n for n in mature_names}

# ALSmiR usage per reported name.
data = json.load(open(DATASET))
use = collections.defaultdict(lambda: {"results": 0, "pubs": set(), "tissues": set()})
for r in data["results"]["rows"]:
    u = use[r["microRNA"]]
    u["results"] += 1
    u["pubs"].add(r["publicationId"])
    u["tissues"].add(r["tissue"].strip())


def describe_mature(n):
    m = mature[n]
    loci = mature_loci.get(m["acc"], [])
    precursors = []
    for chrom, s, e, st, mi in loci:
        hp = hairpin_by_acc.get(mi)
        precursors.append({"MI": mi, "name": hp["name"] if hp else None, "locus": f"{chrom}:{s}-{e}({st})"})
    return {"name": n, "MIMAT": m["acc"], "sequence": m["seq"], "length": len(m["seq"]), "precursors": precursors}


def classify(name):
    """(category, linked mature names, suggestions, note)."""
    if name in mature:
        return "exact", [name], [], ""
    if "_" in name:
        parts = name.split("_")
        if all(p in mature for p in parts):
            seqs = {mature[p]["seq"] for p in parts}
            if len(seqs) == 1:
                note = "all parts have identical mature sequences"
            else:
                groups = collections.defaultdict(list)
                for p in parts: groups[mature[p]["seq"]].append(p)
                note = "WARNING: parts differ in miRBase 23.1: " + " | ".join(f"{', '.join(v)} = {k}" for k, v in groups.items())
            return "combined", parts, [], note
        missing = [p for p in parts if p not in mature]
        return "unmatched", [], [], f"combined name; not in miRBase: {', '.join(missing)}"
    sugg, note = [], ""
    has_arm = bool(re.search(r"-[35]p$", name))
    base = re.sub(r"-[35]p$", "", name)
    arm = name[len(base):] if has_arm else ""
    # Locus-specific mature names introduced in miRBase 23, e.g. hsa-miR-1-3p -> hsa-miR-1-2-3p.
    locus = sorted(n for n in mature_names if re.fullmatch(re.escape(base) + r"-\d+" + re.escape(arm), n)) if has_arm else []
    if name.lower() in lower_index:
        return "case_only", [], [lower_index[name.lower()]], "differs only in upper/lower case"
    if not has_arm:
        arms = [a for a in (f"{name}-5p", f"{name}-3p") if a in mature]
        # Arms may also exist under locus-specific names (e.g. hsa-miR-1 -> hsa-miR-1-2-3p).
        loc_arms = sorted(n for n in mature_names if re.fullmatch(re.escape(name) + r"-\d+-[35]p", n))
        if loc_arms:
            return "arm_ambiguous", [], arms + loc_arms, "no -3p/-5p in ALSmiR; miRBase 23.1 has " + ", ".join(arms + loc_arms) + " (check which strand the paper measured)"
        if len(arms) == 1:
            return "renamed_arm_added", [], arms, f"miRBase 23 added an arm: only {arms[0]} exists, so this is very likely the same miRNA (check accession)"
        if len(arms) == 2:
            return "arm_ambiguous", [], arms, "no -3p/-5p in ALSmiR and miRBase has both arms: the paper must say which"
    else:
        if base in mature:
            return "needs_review", [], [base], "miRBase has this miRNA without an arm (single mature product)"
        if locus:
            kind = "renamed_locus" if len(locus) == 1 else "renamed_locus_ambiguous"
            return kind, [], locus, ("miRBase 23 uses a locus-specific name: " + " or ".join(locus))
        no_locus = re.sub(r"-\d+(-[35]p)$", r"\1", name)
        if no_locus != name and no_locus in mature:
            return "needs_review", [], [no_locus], "locus-specific name in ALSmiR; miRBase names the mature miRNA without the locus number"
    hp_base = re.sub(r"^hsa-miR-", "hsa-mir-", base)
    if not any(h == hp_base or h.startswith(hp_base + "-") for h in hairpin):
        note = "not in miRBase 23.1, and neither is its hairpin: probably removed from miRBase (release 23 deleted 361 mature sequences)"
        return "removed", [], [], note
    if name in diff:
        note = (note + "; " if note else "") + f"miRNA.diff 23->23.1: {', '.join(diff[name])}"
    if not sugg:
        close = difflib.get_close_matches(name, mature_names, n=3, cutoff=0.85)
        if close:
            sugg = close
            note = (note + "; " if note else "") + "closest miRBase names (suggestion only)"
        else:
            note = (note + "; " if note else "") + "no similar name in miRBase 23.1"
    return "needs_review", [], sugg, note


rows = []
needed_mature, needed_hairpin = set(), set()
for name in sorted(use):
    cat, linked, sugg, note = classify(name)
    u = use[name]
    linked_info = [describe_mature(n) for n in linked]
    for li in linked_info:
        needed_mature.add(li["name"])
        needed_hairpin.update(p["MI"] for p in li["precursors"] if p["MI"])
    for s in sugg:  # keep suggested entries in the subset too, so curators can see them
        if s in mature:
            needed_mature.add(s)
            needed_hairpin.update(l[4] for l in mature_loci.get(mature[s]["acc"], []) if l[4])
    # Accession check: if the name existed in v22, where is that accession in 23.1?
    acc22 = v22[name]["acc"] if name in v22 else None
    now = mature_by_acc.get(acc22) if acc22 else None
    if acc22 is None:
        acc_check = "not in v22"
    elif now is None:
        acc_check = f"v22 {acc22} not in 23.1 (removed)"
    elif now == name:
        acc_check = f"same name and accession {acc22}"
    else:
        acc_check = f"v22 {acc22} is now {now}"
    rows.append({
        "alsmir_name": name, "v22_accession_check": acc_check, "v22_accession": acc22, "accession_now_named": now, "results": u["results"], "publications": len(u["pubs"]), "tissues": sorted(u["tissues"]),
        "category": cat, "linked": linked_info, "suggestions": sugg, "note": note,
    })

# ── Outputs ───────────────────────────────────────────────────────────────────
json.dump({"mirbase_release": "23.1", "genome": "GRCh38", "rows": rows}, open(os.path.join(OUT, "alsmir_mirbase_mapping.json"), "w"), indent=1)

with open(os.path.join(OUT, "alsmir_mirbase_mapping.tsv"), "w") as f:
    f.write("alsmir_name\tresults\tpublications\tcategory\tmirbase_mature\tMIMAT\tmature_sequence\tprecursors (MI name locus)\tsuggestions\tnote\tv22_accession_check\n")
    for r in rows:
        f.write("\t".join([
            r["alsmir_name"], str(r["results"]), str(r["publications"]), r["category"],
            "; ".join(l["name"] for l in r["linked"]), "; ".join(l["MIMAT"] for l in r["linked"]),
            "; ".join(l["sequence"] for l in r["linked"]),
            "; ".join(f'{p["MI"]} {p["name"]} {p["locus"]}' for l in r["linked"] for p in l["precursors"]),
            "; ".join(r["suggestions"]), r["note"], r["v22_accession_check"],
        ]) + "\n")

with open(os.path.join(OUT, "subset", "mature_subset.fa"), "w") as f:
    for n in sorted(needed_mature):
        m = mature[n]; f.write(f">{n} {m['acc']} {m['desc']}\n{m['seq']}\n")
with open(os.path.join(OUT, "subset", "hairpin_subset.fa"), "w") as f:
    for acc in sorted(needed_hairpin):
        h = hairpin_by_acc[acc]; f.write(f">{h['name']} {acc} {h['desc']}\n{h['seq']}\n")
needed_mature_acc = {mature[n]["acc"] for n in needed_mature}
with open(os.path.join(OUT, "subset", "hsa_subset.gff3"), "w") as f:
    f.write("\n".join(gff_header) + "\n# Subset: only entries used by ALSmiR (and suggested matches)\n")
    for line in open(os.path.join(REL, "hsa.gff3")):
        if line.startswith("#") or not line.strip():
            continue
        a = dict(kv.split("=", 1) for kv in line.rstrip("\n").split("\t")[8].split(";") if "=" in kv)
        if a["ID"] in needed_hairpin or a["ID"].split("_")[0] in needed_mature_acc:
            f.write(line)

cats = collections.Counter(r["category"] for r in rows)
res_by_cat = collections.Counter()
for r in rows:
    res_by_cat[r["category"]] += r["results"]
summary = {
    "mirbase_human": {"mature": len(mature), "hairpin": len(hairpin), "gff_mature_loci": sum(len(v) for v in mature_loci.values()), "gff_hairpin_loci": sum(len(v) for v in hairpin_loci.values())},
    "alsmir_names": len(rows), "alsmir_results": sum(r["results"] for r in rows),
    "categories": dict(cats), "results_by_category": dict(res_by_cat),
    "subset": {"mature": len(needed_mature), "hairpin": len(needed_hairpin)},
    "multi_locus_linked": sum(1 for r in rows for l in r["linked"] if len({p["MI"] for p in l["precursors"]}) > 1),
    "linked_without_locus": [l["name"] for r in rows for l in r["linked"] if not l["precursors"]],
}
# Final category: the accession (stable across releases) is the strongest evidence.
for r in rows:
    now, cat = r["accession_now_named"], r["category"]
    if cat == "exact":
        r["final_category"] = "exact"
    elif cat == "combined":
        r["final_category"] = "combined"
    elif now and now != r["alsmir_name"]:
        r["final_category"] = "renamed_confirmed"       # same accession, new name in 23.1
        r["suggestions"] = [now]
        r["linked"] = [describe_mature(now)]            # the current miRBase entry (same accession)
    elif cat in ("renamed_arm_added", "renamed_locus"):
        r["final_category"] = "renamed_unconfirmed"     # name rule only, no v22 record to prove it
    elif cat == "removed" and not r["v22_accession"]:
        r["final_category"] = "not_a_mirbase_name"         # in neither v22 nor 23.1: naming error to check
        r["note"] = "not found in miRBase v22 or 23.1: probably a naming error in the paper or the workbook (check the original name)"
    elif cat == "removed" or (r["v22_accession"] and not now):
        r["final_category"] = "removed"
        r["note"] = f"removed from miRBase in release 23 (v22 accession {r['v22_accession']} no longer exists)" if r["v22_accession"] else r["note"]
    else:
        r["final_category"] = cat                        # arm_ambiguous, needs_review, unmatched, ...
    # Sequence changes between v22 and 23.1 for the miRNA we would link or suggest.
    target = r["linked"][0]["name"] if r["final_category"] == "exact" else (now if r["final_category"] == "renamed_confirmed" else None)
    if target and r["alsmir_name"] in v22:
        old, new = v22[r["alsmir_name"]]["seq"], mature[target]["seq"]
        r["sequence_v22_vs_23_1"] = "same" if old == new else f"changed: v22 {old} -> 23.1 {new}"
    else:
        r["sequence_v22_vs_23_1"] = None

# How the name-based categories agree with the accession cross-check.
agree = collections.Counter()
for r in rows:
    if r["category"] in ("renamed_arm_added", "renamed_locus") and r["accession_now_named"]:
        agree[(r["category"], "accession confirms" if r["accession_now_named"] in r["suggestions"] else "ACCESSION DISAGREES")] += 1
    elif r["category"] in ("renamed_arm_added", "renamed_locus"):
        agree[(r["category"], "no v22 entry to check")] += 1
    elif r["category"] == "removed":
        agree[("removed", "v22 accession also gone" if r["v22_accession"] and not r["accession_now_named"] else "not in v22 either" if not r["v22_accession"] else "ACCESSION STILL EXISTS")] += 1
    elif r["category"] == "arm_ambiguous" and r["accession_now_named"]:
        agree[("arm_ambiguous", "v22 had it without arm -> accession now " + ("an arm" if re.search(r"-[35]p$", r["accession_now_named"]) else "other"))] += 1
summary["accession_cross_check"] = {f"{k[0]}: {k[1]}": v for k, v in sorted(agree.items())}
summary["final_categories"] = dict(collections.Counter(r["final_category"] for r in rows))
fr = collections.Counter()
for r in rows: fr[r["final_category"]] += r["results"]
summary["final_results_by_category"] = dict(fr)
summary["sequence_changes_v22_to_23_1"] = sorted(r["alsmir_name"] for r in rows if (r["sequence_v22_vs_23_1"] or "").startswith("changed"))
json.dump(summary, open(os.path.join(OUT, "summary.json"), "w"), indent=1)
json.dump({"mirbase_release": "23.1", "genome": "GRCh38", "rows": rows}, open(os.path.join(OUT, "alsmir_mirbase_mapping.json"), "w"), indent=1)
with open(os.path.join(OUT, "alsmir_mirbase_mapping.tsv"), "w") as f:
    cols = ["alsmir_name", "results", "publications", "final_category", "mirbase_23_1_name", "MIMAT", "mature_sequence_23_1",
            "precursors (MI name locus GRCh38)", "v22_accession_check", "sequence_v22_vs_23_1", "note"]
    f.write("\t".join(cols) + "\n")
    for r in rows:
        tgt = [l for l in r["linked"]] or ([describe_mature(r["suggestions"][0])] if r["final_category"] == "renamed_confirmed" else [])
        f.write("\t".join([
            r["alsmir_name"], str(r["results"]), str(r["publications"]), r["final_category"],
            "; ".join(t["name"] for t in tgt) or "; ".join(r["suggestions"]), "; ".join(t["MIMAT"] for t in tgt),
            "; ".join(t["sequence"] for t in tgt),
            "; ".join(f'{p["MI"]} {p["name"]} {p["locus"]}' for t in tgt for p in t["precursors"]),
            r["v22_accession_check"], r["sequence_v22_vs_23_1"] or "", r["note"],
        ]) + "\n")
print(json.dumps(summary, indent=1))
