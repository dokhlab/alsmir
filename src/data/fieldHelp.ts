// Plain-language explanations shown next to each workbook field in the evidence details.
// Field names themselves stay exactly as in the curated workbook.

// Curators' revision (5 Oct 2026): fewer explanations; the Publication Level section has none.
export const RESULT_HELP: Record<string, string> = {
  id: "Record ID: publication (PUB), cohort within it (C) and miRNA result within the cohort (R).",
  microRNA: "miRNA name exactly as reported in the publication.",
  axis: "Direction in ALS compared with controls: ↑ higher in ALS, ↓ lower in ALS, = no significant change.",
  typeOfAls: "The ALS subgroup in which this miRNA was analysed (analytical level).",
  alsN: "Number of participants with ALS analyzed for this specific result (analytical level)",
  kResidentN: "Number of K-resident controls (residents of the Kii peninsula region, Japan) used instead of healthy controls in this analysis.",
  hcN: "Number of healthy control participants analyzed for this specific result (analytical level)",
};

export const COHORT_HELP: Record<string, string> = {
  id: "Cohort ID: publication (PUB) and cohort or subgroup within it (C). A cohort published in two papers carries both publication IDs.",
  form: "The ALS population the study recruited",
  mutations: "ALS-related gene mutations reported in the cohort, with the number of carriers in brackets.",
  n: "Number of ALS patients recruited in the study",
  sexFemale: "Number (or percentage) of female ALS patients.",
  sexMale: "Number (or percentage) of male ALS patients.",
  onsetBoth: "Patients whose first symptoms started in both the bulbar and the spinal (limb) region.",
  onsetUpperLimb: "Patients whose first symptoms started in the arms.",
  onsetLowerLimb: "Patients whose first symptoms started in the legs.",
  onsetSpinalLimb: "Patients whose first symptoms started in the limbs (spinal onset).",
  onsetBulbar: "Patients whose first symptoms affected speech or swallowing (bulbar onset).",
  onsetToEndpoint: "Average time from the first symptoms to the study end point (mean ± standard deviation, in months).",
  alsfrs: "ALS Functional Rating Scale score (mean ± standard deviation): 48 = normal function, lower = more disability.",
  treatment: "Treatment the patients were receiving, e.g. riluzole (number of patients in brackets).",
  controlType: "Type of control group, e.g. HC = healthy controls.",
};
