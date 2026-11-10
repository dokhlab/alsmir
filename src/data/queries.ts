import { COHORTS, EVIDENCE, PUBLICATIONS } from "./dataset";
import type { EvidenceRecord } from "./types";

export const ALL_EVIDENCE = EVIDENCE;

const toNumber = (v: string | null) => (v === null || v.trim() === "" ? NaN : Number(v));
const sum = (values: (string | null)[]) => values.map(toNumber).filter(Number.isFinite).reduce((a, b) => a + b, 0);

export function uniqueMirnas(): string[] {
  return Array.from(new Set(EVIDENCE.map((e) => e.mirna))).sort();
}

/** Distinct tissues, grouped by trimmed text (the exact text is kept on each record). */
export function uniqueBiospecimens(): string[] {
  return Array.from(new Set(EVIDENCE.map((e) => e.biospecimenKey))).sort();
}

export function recordsForMirna(name: string): EvidenceRecord[] {
  return EVIDENCE.filter((e) => e.mirna === name);
}

/** Publications (1.PUB rows) per publication year. */
export function publicationsByYear(): { year: number; Publications: number }[] {
  const map = new Map<number, number>();
  PUBLICATIONS.forEach((p) => {
    const y = Number(p.year);
    map.set(y, (map.get(y) ?? 0) + 1);
  });
  const years = Array.from(map.keys()).sort((a, b) => a - b);
  if (years.length === 0) return [];
  const result: { year: number; Publications: number }[] = [];
  for (let y = years[0]; y <= years[years.length - 1]; y++) {
    result.push({ year: y, Publications: map.get(y) ?? 0 });
  }
  return result;
}

export function topMirnasByEvidenceCount(n: number) {
  const map = new Map<string, number>();
  EVIDENCE.forEach((e) => map.set(e.mirna, (map.get(e.mirna) ?? 0) + 1));
  return Array.from(map.entries())
    .map(([mirna, count]) => ({ mirna, count }))
    .sort((a, b) => b.count - a.count || a.mirna.localeCompare(b.mirna))
    .slice(0, n);
}

/**
 * Per country: publications whose "Location of Study" names it, and ALS patients
 * summed over those publications' cohorts (2.Cohort "Number", each cohort once).
 */
export function studiesByCountry() {
  const map = new Map<string, { country: string; iso: string; studies: Set<string>; cohorts: Set<string> }>();
  PUBLICATIONS.forEach((p) => {
    const names = (p.location ?? "").split(";").map((s) => s.trim());
    p.countryIso.forEach((iso, i) => {
      const cur = map.get(iso) ?? { country: names[i], iso, studies: new Set(), cohorts: new Set() };
      cur.studies.add(p.id);
      COHORTS.filter((c) => c.publicationIds.includes(p.id)).forEach((c) => cur.cohorts.add(c.id));
      map.set(iso, cur);
    });
  });
  return Array.from(map.values()).map((v) => ({
    country: v.country,
    iso: v.iso,
    studies: v.studies.size,
    patients: sum(COHORTS.filter((c) => v.cohorts.has(c.id)).map((c) => c.n)),
  }));
}

/** Outcome columns of the "Reported miRNA expression outcomes" heatmap. */
export type OutcomeKey = "up" | "down" | "none" | "total";
export interface OutcomeRow { mirna: string; up: number; down: number; none: number; total: number }

/**
 * Per miRNA, distinct SOURCE publications (the publication each result is cited from, matched by
 * DOI — never inferred from shared-cohort links) for each outcome, and the total number of distinct
 * publications counted independently (not the sum of the outcome counts). Repeated results within
 * one publication count once per outcome. Results without a source publication or with an outcome
 * other than ↑ / ↓ / = are left out and flagged; a missing outcome is never counted as "=".
 * Calculated from whatever dataset is loaded, so nothing is hard-coded.
 */
export function expressionOutcomes(): { rows: OutcomeRow[]; flagged: { id: string; reason: string }[] } {
  const flagged: { id: string; reason: string }[] = [];
  const map = new Map<string, { up: Set<string>; down: Set<string>; none: Set<string>; all: Set<string> }>();
  EVIDENCE.forEach((e) => {
    if (!e.studyId) { flagged.push({ id: e.id, reason: "no source publication" }); return; }
    if (e.direction !== "up" && e.direction !== "down" && e.direction !== "none") {
      flagged.push({ id: e.id, reason: "no recognised expression outcome" }); return;
    }
    const cur = map.get(e.mirna) ?? { up: new Set<string>(), down: new Set<string>(), none: new Set<string>(), all: new Set<string>() };
    cur[e.direction].add(e.studyId);
    cur.all.add(e.studyId);
    map.set(e.mirna, cur);
  });
  const rows = Array.from(map.entries()).map(([mirna, v]) => ({ mirna, up: v.up.size, down: v.down.size, none: v.none.size, total: v.all.size }));
  return { rows, flagged };
}

/** Ranking: chosen column descending, then total publications descending, then miRNA name. */
export function rankOutcomes(rows: OutcomeRow[], key: OutcomeKey): OutcomeRow[] {
  return [...rows].sort((a, b) => b[key] - a[key] || b.total - a.total || a.mirna.localeCompare(b.mirna));
}

export const STATS = {
  /** Rows in 3.miRNA. */
  results: EVIDENCE.length,
  uniqueMirnas: uniqueMirnas().length,
  /** Rows in 1.PUB. */
  studies: PUBLICATIONS.length,
  /** Rows in 2.Cohort. */
  cohorts: COHORTS.length,
  biospecimens: uniqueBiospecimens().length,
  countries: new Set(PUBLICATIONS.flatMap((p) => p.countryIso)).size,
  /** Sum of 2.Cohort ALS "Number". */
  patients: sum(COHORTS.map((c) => c.n)),
  /** Sum of 2.Cohort control "Number". */
  controls: sum(COHORTS.map((c) => c.controlN)),
};

/** "1,620" -> "1,600+": a count rounded down to the hundred, for prose. */
export function roundedCount(n: number): string {
  return `${(Math.floor(n / 100) * 100).toLocaleString("en-US")}+`;
}
