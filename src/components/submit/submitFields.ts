// Submit Data form structure (curators' revision, 5 Oct 2026):
// Publication -> Cohort -> Biospecimen/sample -> Comparison/subgroup -> miRNA result.
// Values are free text so authors can keep the format their publication reports.

export const MAX_COHORTS = 20;

/** Fields of one cohort section, in the order the curators listed them. */
export const COHORT_FIELDS: { key: string; label: string; placeholder?: string; wide?: boolean }[] = [
  { key: "tissue", label: "Biospecimen/tissue (as reported)", placeholder: "e.g. Serum, Plasma exosomes, CSF" },
  { key: "method", label: "Method", placeholder: "e.g. RT-qPCR, ddPCR, TaqMan TLDA RT-qPCR" },
  { key: "form", label: "Form of ALS at population level", placeholder: "e.g. sALS, fALS, fALS / sALS" },
  { key: "diagnosis", label: "Diagnosis criteria", placeholder: "e.g. El-Escorial-R" },
  { key: "mutations", label: "Mutations reported", placeholder: "e.g. SOD1 (5); C9orf72 (8)", wide: true },
  { key: "alsN", label: "ALS patients (total)" },
  { key: "sexFemale", label: "ALS patients — female" },
  { key: "sexMale", label: "ALS patients — male" },
  { key: "onset", label: "Site of onset", placeholder: "e.g. Spinal/Limb 20, Bulbar 5, Both 1", wide: true },
  { key: "ageOnset", label: "Age at onset", placeholder: "as reported, e.g. 58 ± 11 or median 60 (IQR 52–67)" },
  { key: "ageStudy", label: "Age at study", placeholder: "as reported" },
  { key: "diseaseDuration", label: "Disease duration", placeholder: "as reported, with units" },
  { key: "alsfrs", label: "ALSFRS / ALSFRS-R", placeholder: "as reported" },
  { key: "treatment", label: "Therapeutic treatment", placeholder: "e.g. Riluzole (10)" },
  { key: "controlType", label: "Type of control", placeholder: "e.g. HC" },
  { key: "controlN", label: "Controls (total)" },
  { key: "controlSexFemale", label: "Controls — female" },
  { key: "controlSexMale", label: "Controls — male" },
  { key: "controlAgeStudy", label: "Controls — age at study", placeholder: "as reported" },
];

export const DIRECTIONS = ["Upregulated", "Downregulated", "No significant change"] as const;

export interface ResultRow {
  cohort: string;        // "1".."n": the cohort section that produced this result
  microRNA: string;
  direction: string;     // one of DIRECTIONS
  alsGroup: string;      // ALS group/subgroup represented by this result
  comparison: string;    // e.g. "sALS vs HC"
  foldChange: string;
  statistic: string;     // statistical result, as reported
  notes: string;
}

export const emptyRow = (cohort = ""): ResultRow => ({
  cohort, microRNA: "", direction: "", alsGroup: "", comparison: "", foldChange: "", statistic: "", notes: "",
});

/** A row the author has started (any field typed). Untouched rows are ignored. */
export const isStarted = (r: ResultRow) =>
  [r.microRNA, r.direction, r.alsGroup, r.comparison, r.foldChange, r.statistic, r.notes].some((v) => v.trim());
