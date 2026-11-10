// Types for the ALSmiR dataset. Every value comes verbatim from the curated
// workbook (see build_dataset.py); null means the Excel cell is empty.

export type Direction = "up" | "down" | "none";
export type Biospecimen = string;
export type Cell = string | null;

export interface Column {
  key: string;
  group: string | null;
  label: string;
  sub: string | null;
}

export interface Publication {
  excelRow: number;
  id: string;
  title: Cell;
  doi: Cell;
  authors: Cell;
  year: Cell;
  location: Cell;
  /** Map codes for each country in "Location of Study" (derived, for the map only). */
  countryIso: string[];
}

export interface Cohort {
  excelRow: number;
  id: string;
  /** Set on a documented alias row: the canonical cohort it stands for (counted once, under the canonical ID). */
  aliasOf?: string;
  form: Cell;
  diagnosis: Cell;
  mutations: Cell;
  n: Cell;
  sexFemale: Cell;
  sexMale: Cell;
  onsetBoth: Cell;
  onsetUpperLimb: Cell;
  onsetLowerLimb: Cell;
  onsetSpinalLimb: Cell;
  onsetBulbar: Cell;
  ageOnset: Cell;
  ageStudy: Cell;
  onsetToEndpoint: Cell;
  alsfrs: Cell;
  treatment: Cell;
  controlType: Cell;
  controlN: Cell;
  controlSexFemale: Cell;
  controlSexMale: Cell;
  controlAgeStudy: Cell;
  publicationIds: string[];
}

export interface Result {
  excelRow: number;
  id: string;
  microRNA: string;
  axis: string;
  typeOfAls: Cell;
  alsN: Cell;
  kResidentN: Cell;
  hcN: Cell;
  method: Cell;
  tissue: string;
  authorYear: Cell;
  doi: Cell;
  /** null when the cohort part of the ID has no row in 2.Cohort. */
  cohortId: string | null;
  publicationIds: string[];
  /** The publication whose DOI matches this result's DOI. */
  publicationId: string;
  direction: Direction;
}

/** One result joined with its cohort and publication, as the pages use it. */
export interface EvidenceRecord {
  id: string;
  result: Result;
  cohort: Cohort | null;
  publication: Publication;
  /** Shorthand for result fields used throughout the UI. */
  mirna: string;
  direction: Direction;
  biospecimen: string;
  /** Tissue with surrounding whitespace removed; used only for grouping and filters. */
  biospecimenKey: string;
  /** Publication ID (e.g. PUB0012); one per study. */
  studyId: string;
  /** Publication year as a number, for sorting and charts. */
  year: number;
  country: Cell;
  countryIso: string[];
  /** Calculated: the miRNA is reported by two or more publications. */
  replicated: boolean;
}
