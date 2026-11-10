"""Write ../src/data/mirbase_links.json: the miRBase links shown on the ALSmiR website.

Curator rule (2 Oct 2026), applied literally:
  * Link only when the ALSmiR name exactly matches ONE miRBase name, character for character
    (capitalisation, punctuation, species prefix and all suffixes). Use that entry's accession.
  * Leading/trailing whitespace is ignored for the comparison ("disregard trailings").
  * No link when the names differ, the name is blank, or the entry is a combined name.
  * Never rename, normalise, infer arms, substitute historical names or match approximately.
  * The ALSmiR name itself is always shown unchanged; this file only decides the link.

Inputs: ../src/data/dataset.json (ALSmiR names) and 23.1/mature.fa (official miRBase file).
Run after build_dataset.py whenever the workbook or the miRBase release changes.
"""
import collections
import hashlib
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
RELEASE = "23.1"
MATURE = os.path.join(HERE, RELEASE, "mature.fa")
DATASET = os.path.join(HERE, "..", "src", "data", "dataset.json")
OUT = os.path.join(HERE, "..", "src", "data", "mirbase_links.json")

# Every mature entry in the release, all species: name -> [accessions].
entries = collections.defaultdict(list)
for line in open(MATURE, encoding="ascii"):
    if line.startswith(">"):
        name, acc = line[1:].split()[:2]
        entries[name].append(acc)

COMBINED = re.compile(r"[_;,/+&]|\s")  # '##' names are joined with '_'; any separator or inner space = combined

names = sorted({r["microRNA"] for r in json.load(open(DATASET))["results"]["rows"]})
links, reasons = {}, collections.Counter()
for original in names:
    key = (original or "").strip()               # ignore surrounding whitespace only
    if not key:
        reasons["blank name"] += 1
    elif COMBINED.search(key):
        reasons["combined name"] += 1
    elif len(entries.get(key, [])) == 1:
        links[original] = entries[key][0]          # keyed by the name exactly as stored in ALSmiR
        reasons["linked (exact match)"] += 1
    elif len(entries.get(key, [])) > 1:
        reasons["matches more than one miRBase entry"] += 1
    else:
        reasons["no identical miRBase name"] += 1

json.dump({
    "release": RELEASE,
    "source": "https://www.mirbase.org/download/mature.fa",
    "sourceSha256": hashlib.sha256(open(MATURE, "rb").read()).hexdigest(),
    "rule": "Linked only when the ALSmiR name (ignoring leading/trailing spaces) is identical, character for character, "
            "to exactly one miRBase 23.1 mature name; no link for blank, combined or non-identical names.",
    "urlTemplate": "https://www.mirbase.org/mature/{accession}",
    "links": links,
}, open(OUT, "w"), indent=1)
print(f"{len(names)} ALSmiR names -> " + ", ".join(f"{k}: {v}" for k, v in sorted(reasons.items())))
print(f"wrote {os.path.relpath(OUT, HERE)} ({len(links)} links, miRBase {RELEASE})")
