# ALSmiR miRNA names vs miRBase 23.1

Analysis date: 2 October 2026. Read-only: the website, the database and the Excel were not changed.

## Sources

- **miRBase release 23.1** (September 2026), downloaded from https://www.mirbase.org/download/ into `23.1/`: `mature.fa`, `hairpin.fa`, `hsa.gff3` (GRCh38 coordinates), `miRNA.diff`, `README`, `LICENSE`.
  - miRBase is in the **public domain**: free to use and redistribute. Cite Kozomara A, Birgaoanu M, Griffiths-Jones S. *Nucleic Acids Res.* 2019;47:D155-D162.
  - Release 23.1 does **not** include the structure (`miRNA.str`), family (`miFam.dat`) or alias (`aliases.txt`) files that older releases had, and the archive of older releases is not reachable.
- **Cross-check only:** the human mature list from miRBase v22 (nf-core mirror, `reference_v22/`) was used to prove renames by accession number. It is never used as a data source.
- **ALSmiR:** 816 distinct miRNA names in 1620 results (dataset V05).

Human miRBase 23.1: 2789 mature miRNAs, 1861 hairpins.

## Summary

| Category | What it means | Names | Results |
|---|---|---|---|
| exact | Name exists unchanged in miRBase 23.1 → can be linked directly | 585 | 1299 (80.2%) |
| renamed_confirmed | Name changed in miRBase 23; same accession number proves it is the same miRNA | 191 | 270 (16.7%) |
| combined | '##' name; every part exists in 23.1 | 6 | 6 (0.4%) |
| arm_ambiguous | ALSmiR name has no -3p/-5p and miRBase has both arms; the paper must say which | 11 | 15 (0.9%) |
| removed | Was in miRBase v22, removed in release 23 (misannotated) | 14 | 17 (1.0%) |
| not_a_mirbase_name | In neither v22 nor 23.1: probably a naming error to check in the paper | 3 | 7 (0.4%) |
| needs_review | Name doesn't fit miRBase naming | 3 | 3 (0.2%) |
| renamed_locus_ambiguous | Now has locus-specific names; more than one candidate | 1 | 1 (0.1%) |
| unmatched | '##' name with a part not in 23.1 | 2 | 2 (0.1%) |

**97.2% of all results (1575 of 1620) can be linked to miRBase with certainty** (exact, confirmed renames and combined names). The remaining 45 results (34 names) need a curator decision; they are listed below.

57 of the linked miRNAs come from more than one genomic locus (e.g. let-7a-5p from 3 hairpins). Every linked miRNA has genome coordinates.

## Important: miRBase 23 renamed many miRNAs

Release 23 renamed 20,514 mature sequences. Many names in the papers (and in ALSmiR) are now outdated, for example:

- `hsa-miR-206` → **`hsa-miR-206-3p`** (accession MIMAT0000462, 9 results)
- `hsa-miR-451a` → **`hsa-miR-451a-5p`** (accession MIMAT0001631, 11 results)
- `hsa-miR-1-3p` → **`hsa-miR-1-2-3p`** (accession MIMAT0000416, 1 result)
- `hsa-miR-194-5p` → **`hsa-miR-194-1-5p`** (accession MIMAT0000460, 3 results)
- `hsa-miR-153-3p` → **`hsa-miR-153-1-3p`** (accession MIMAT0000439, 1 result)
- `hsa-miR-4454` → **`hsa-miR-4454-5p`** (accession MIMAT0018976, 9 results)

Recommendation: keep the names **as reported** in ALSmiR (the curation rule), and show the current miRBase name and accession next to them.

## Sequences changed between v22 and 23.1

146 of the miRNAs that can be linked have a different mature sequence in 23.1. The papers' assays were designed against the older sequences.

- **129 have refined ends** (1–4 nucleotides added or trimmed at an end, based on sequencing data). These are the same molecule.
- **17 were redefined** (the 23.1 sequence is shifted, not just extended). For these, the 23.1 sequence may **not** be what the study measured. Show the sequence with a warning, or show both:

| ALSmiR name | Results | v22 sequence | 23.1 sequence |
|---|---|---|---|
| hsa-miR-10b-3p | 2 | `ACAGAUUCGAUUCUAGGGGAAU` | `CAGAUUCGAUUCUAGGGGAAUA` |
| hsa-miR-1282 | 1 | `UCGUUUGCCUUUUUCUGCUU` | `CUGCUGCAUGAUCUCCGAGUCCCU` |
| hsa-miR-1303 | 1 | `UUUAGAGACGGGGUCUUGCUCU` | `GUCUUGCUCUGUUGCCAGGCU` |
| hsa-miR-130a-5p | 1 | `UUCACAUUGUGCUACUGUCUGC` | `GCUCUUUUCACAUUGUGCUACU` |
| hsa-miR-146b-3p | 1 | `UGCCCUGUGGACUCAGUUCUGG` | `GCCCUGUGGACUCAGUUCUGGU` |
| hsa-miR-203b-5p | 1 | `UAGUGGUCCUAAACAUUUCACA` | `CUAGUGGUCCUAAACAUUUCAC` |
| hsa-miR-218-1-3p | 1 | `AUGGUUCCGUCAAGCACCAUGG` | `CAUGGUUCCGUCAAGCACCAUG` |
| hsa-miR-296-3p | 1 | `GAGGGUUGGGUGGAGGCUCUCC` | `AGGGUUGGGUGGAGGCUCUCCU` |
| hsa-miR-3665 | 2 | `AGCAGGUGCGGGGCGGCG` | `CUCCAGCUUGCGCACCAGCUCC` |
| hsa-miR-412-3p | 1 | `ACUUCACCUGGUCCACUAGCCGU` | `GUACUUCACCUGGUCCACUAGC` |
| hsa-miR-4497 | 3 | `CUCCGGGACGGCUGGGC` | `GACGGCUGGGCGCCGGCG` |
| hsa-miR-452-3p | 1 | `CUCAUCUGCAAAGAAGUAAGUG` | `UCAGUCUCAUCUGCAAAGAAGU` |
| hsa-miR-483-3p | 1 | `UCACUCCUCUCCUCCCGUCUU` | `CACUCCUCUCCUCCCGUCUUCU` |
| hsa-miR-548c-3p | 1 | `CAAAAAUCUCAAUUACUUUUGC` | `CAAUUACUUUUGCACCAAC` |
| hsa-miR-600 | 1 | `ACUUACAGACAAGAGCCUUGCUC` | `UACUUACAGACAAGAGCCUUGCU` |
| hsa-miR-653-5p | 1 | `GUGUUGAAACAAUCUCUACUG` | `UUGAAACAAUCUCUACUGAACC` |
| hsa-miR-657 | 1 | `GGCAGGUUCUCACCCUCUCUAGG` | `CUAGGAGGAGAGGGUCC` |

## Names that need a curator decision

### arm_ambiguous (11)
ALSmiR name has no -3p/-5p and miRBase has both arms; the paper must say which.

| ALSmiR name | Results | Publications | miRBase 23.1 candidates | Note |
|---|---|---|---|---|
| hsa-miR-1 | 5 | 5 | hsa-miR-1-5p, hsa-miR-1-2-3p, hsa-miR-1-2-5p | no -3p/-5p in ALSmiR; miRBase 23.1 has hsa-miR-1-5p, hsa-miR-1-2-3p, hsa-miR-1-2-5p (check which strand the paper measured) |
| hsa-miR-100 | 1 | 1 | hsa-miR-100-5p, hsa-miR-100-3p | no -3p/-5p in ALSmiR and miRBase has both arms: the paper must say which |
| hsa-miR-149 | 1 | 1 | hsa-miR-149-5p, hsa-miR-149-3p | no -3p/-5p in ALSmiR and miRBase has both arms: the paper must say which |
| hsa-miR-181b | 1 | 1 | hsa-miR-181b-5p, hsa-miR-181b-3p, hsa-miR-181b-2-3p | no -3p/-5p in ALSmiR; miRBase 23.1 has hsa-miR-181b-5p, hsa-miR-181b-3p, hsa-miR-181b-2-3p (check which strand the paper measured) |
| hsa-miR-193b | 1 | 1 | hsa-miR-193b-5p, hsa-miR-193b-3p | no -3p/-5p in ALSmiR and miRBase has both arms: the paper must say which |
| hsa-miR-200c | 1 | 1 | hsa-miR-200c-5p, hsa-miR-200c-3p | no -3p/-5p in ALSmiR and miRBase has both arms: the paper must say which |
| hsa-miR-223 | 1 | 1 | hsa-miR-223-5p, hsa-miR-223-3p | no -3p/-5p in ALSmiR and miRBase has both arms: the paper must say which |
| hsa-miR-301b | 1 | 1 | hsa-miR-301b-5p, hsa-miR-301b-3p | no -3p/-5p in ALSmiR and miRBase has both arms: the paper must say which |
| hsa-miR-424 | 1 | 1 | hsa-miR-424-5p, hsa-miR-424-3p | no -3p/-5p in ALSmiR and miRBase has both arms: the paper must say which |
| hsa-miR-4485 | 1 | 1 | hsa-miR-4485-5p, hsa-miR-4485-3p | no -3p/-5p in ALSmiR and miRBase has both arms: the paper must say which |
| hsa-miR-4701 | 1 | 1 | hsa-miR-4701-5p, hsa-miR-4701-3p | no -3p/-5p in ALSmiR and miRBase has both arms: the paper must say which |

### removed (14)
Was in miRBase v22, removed in release 23 (misannotated).

| ALSmiR name | Results | Publications | miRBase 23.1 candidates | Note |
|---|---|---|---|---|
| hsa-miR-663a | 3 | 2 | — | removed from miRBase in release 23 (v22 accession MIMAT0003326 no longer exists) |
| hsa-miR-663b | 2 | 2 | — | removed from miRBase in release 23 (v22 accession MIMAT0005867 no longer exists) |
| hsa-miR-1225-3p | 1 | 1 | — | removed from miRBase in release 23 (v22 accession MIMAT0005573 no longer exists) |
| hsa-miR-1244 | 1 | 1 | — | removed from miRBase in release 23 (v22 accession MIMAT0005896 no longer exists) |
| hsa-miR-1248 | 1 | 1 | — | removed from miRBase in release 23 (v22 accession MIMAT0005900 no longer exists) |
| hsa-miR-1254 | 1 | 1 | — | removed from miRBase in release 23 (v22 accession MIMAT0005905 no longer exists) |
| hsa-miR-1285-3p | 1 | 1 | — | removed from miRBase in release 23 (v22 accession MIMAT0005876 no longer exists) |
| hsa-miR-1290 | 1 | 1 | — | removed from miRBase in release 23 (v22 accession MIMAT0005880 no longer exists) |
| hsa-miR-1291 | 1 | 1 | — | removed from miRBase in release 23 (v22 accession MIMAT0005881 no longer exists) |
| hsa-miR-558 | 1 | 1 | — | removed from miRBase in release 23 (v22 accession MIMAT0003222 no longer exists) |
| hsa-miR-566 | 1 | 1 | — | removed from miRBase in release 23 (v22 accession MIMAT0003230 no longer exists) |
| hsa-miR-567 | 1 | 1 | — | removed from miRBase in release 23 (v22 accession MIMAT0003231 no longer exists) |
| hsa-miR-607 | 1 | 1 | — | removed from miRBase in release 23 (v22 accession MIMAT0003275 no longer exists) |
| hsa-miR-620 | 1 | 1 | — | removed from miRBase in release 23 (v22 accession MIMAT0003289 no longer exists) |

### not_a_mirbase_name (3)
In neither v22 nor 23.1: probably a naming error to check in the paper.

| ALSmiR name | Results | Publications | miRBase 23.1 candidates | Note |
|---|---|---|---|---|
| hsa-miR-558-3p | 4 | 2 | — | not found in miRBase v22 or 23.1: probably a naming error in the paper or the workbook (check the original name) |
| hsa-miR-7a-5p | 2 | 1 | — | not found in miRBase v22 or 23.1: probably a naming error in the paper or the workbook (check the original name) |
| hsa-miR-4583 | 1 | 1 | — | not found in miRBase v22 or 23.1: probably a naming error in the paper or the workbook (check the original name) |

### needs_review (3)
Name doesn't fit miRBase naming.

| ALSmiR name | Results | Publications | miRBase 23.1 candidates | Note |
|---|---|---|---|---|
| hsa-miR-125b-1-5p | 1 | 1 | hsa-miR-125b-5p | locus-specific name in ALSmiR; miRBase names the mature miRNA without the locus number |
| hsa-miR-125b-2-5p | 1 | 1 | hsa-miR-125b-5p | locus-specific name in ALSmiR; miRBase names the mature miRNA without the locus number |
| hsa-miR-181b-1-5p | 1 | 1 | hsa-miR-181b-5p | locus-specific name in ALSmiR; miRBase names the mature miRNA without the locus number |

### renamed_locus_ambiguous (1)
Now has locus-specific names; more than one candidate.

| ALSmiR name | Results | Publications | miRBase 23.1 candidates | Note |
|---|---|---|---|---|
| hsa-miR-92a-5p | 1 | 1 | hsa-miR-92a-1-5p, hsa-miR-92a-2-5p | miRBase 23 uses a locus-specific name: hsa-miR-92a-1-5p or hsa-miR-92a-2-5p |

### unmatched (2)
'##' name with a part not in 23.1.

| ALSmiR name | Results | Publications | miRBase 23.1 candidates | Note |
|---|---|---|---|---|
| hsa-miR-518a-5p_hsa-miR-527 | 1 | 1 | — | combined name; not in miRBase: hsa-miR-527 |
| hsa-miR-518d-5p_hsa-miR-520c-5p_hsa-miR-526a | 1 | 1 | — | combined name; not in miRBase: hsa-miR-526a |

## '##' combined names

- `hsa-miR-199a-3p_hsa-miR-199b-3p`: all parts have identical mature sequences
- `hsa-miR-365a-3p_hsa-miR-365b-3p`: all parts have identical mature sequences
- `hsa-miR-516a-3p_hsa-miR-516b-3p`: all parts have identical mature sequences
- `hsa-miR-517a-3p_hsa-miR-517b-3p`: all parts have identical mature sequences
- `hsa-miR-518e-5p_hsa-miR-519a-5p_hsa-miR-519b-5p_hsa-miR-519c-5p_hsa-miR-522-5p_hsa-miR-523-5p`: WARNING: parts differ in miRBase 23.1: hsa-miR-518e-5p, hsa-miR-519b-5p, hsa-miR-519c-5p, hsa-miR-522-5p, hsa-miR-523-5p = CUCUAGAGGGAAGCGCUUUCUG | hsa-miR-519a-5p = ACUCUAGAGGGAAGCGCUUUCU
- `hsa-miR-548am-5p_hsa-miR-548c-5p_hsa-miR-548o-5p`: all parts have identical mature sequences
- `hsa-miR-518a-5p_hsa-miR-527`: combined name; not in miRBase: hsa-miR-527
- `hsa-miR-518d-5p_hsa-miR-520c-5p_hsa-miR-526a`: combined name; not in miRBase: hsa-miR-526a

## What can be shown on the site (for the integration discussion)

For each linked miRNA, from the official 23.1 files:

- current miRBase name and **accession** (MIMAT…), linked to `https://www.mirbase.org/mature/MIMAT…`;
- **mature sequence** and length;
- **precursor hairpin(s)** (MI…): name, full stem-loop sequence, and the position of the mature sequence inside it;
- **genome location** (GRCh38 chromosome, start–end, strand) for every locus.

Not in 23.1, so it must be computed or left out:
- **Secondary structure:** can be predicted from the hairpin sequence with RNAfold (ViennaRNA), the same method miRBase used. It must be labelled as a prediction.
- **miRNA families:** not available in 23.1.

## Files

- `analysis/alsmir_mirbase_mapping.tsv` / `.json`: one row per ALSmiR name, with category, 23.1 name, accession, sequence, precursors, loci, v22 cross-check and notes.
- `analysis/subset/`: only the miRBase entries ALSmiR uses (and suggested matches): `mature_subset.fa` (858 mature), `hairpin_subset.fa` (641 hairpins), `hsa_subset.gff3` (their GRCh38 coordinates).
- `analyse_alsmir_vs_mirbase.py`, `write_report.py`: rerun to reproduce, e.g. after the V06 workbook.
