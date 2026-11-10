// Calculations behind the miRNA × Tissue Explorer. All values derive from the curated results;
// tissues are grouped by trimmed text, exactly as reported.
// Rule (curators, 6 Oct 2026): a cell shows ONE number for ONE direction — the number of results
// (rows) with that direction — so it always equals the rows listed when the cell is opened.
// Directions are never combined or summarised ("Mixed" no longer exists).
import { ALL_EVIDENCE, uniqueBiospecimens } from "@/data/queries";
import type { EvidenceRecord } from "@/data/types";

export type Dir = "up" | "down" | "none";
export const DIRS: Dir[] = ["up", "down", "none"];

export const DIR_META: Record<Dir, { label: string; symbol: string; explain: string; cell: string; button: string }> = {
  up:   { label: "Up",   symbol: "↑", explain: "showing higher miRNA expression in ALS than in healthy controls", cell: "bg-success/15 text-success border-success/40",             button: "bg-success text-white border-success" },
  down: { label: "Down", symbol: "↓", explain: "showing lower miRNA expression in ALS than in healthy controls",  cell: "bg-destructive/15 text-destructive border-destructive/40", button: "bg-destructive text-white border-destructive" },
  none: { label: "NC",   symbol: "=", explain: "showing no significant difference in miRNA expression between ALS and healthy controls", cell: "bg-muted text-foreground border-border",                   button: "bg-foreground/80 text-background border-foreground/80" },
};

/** The results of one miRNA in one biospecimen (or in all), split by direction. */
export interface Cell {
  records: EvidenceRecord[];
  byDir: Record<Dir, EvidenceRecord[]>;
}

function cellOf(records: EvidenceRecord[]): Cell {
  const byDir: Record<Dir, EvidenceRecord[]> = { up: [], down: [], none: [] };
  records.forEach((r) => byDir[r.direction as Dir].push(r));
  return { records, byDir };
}

export const TISSUES = uniqueBiospecimens();

export interface MirnaRow {
  mirna: string;
  all: Cell;
  cells: Map<string, Cell>; // tissue -> cell (only tissues with results)
}

/** One row per miRNA, with a cell per tissue and one for all tissues. */
export const MIRNA_ROWS: MirnaRow[] = (() => {
  const byMirna = new Map<string, EvidenceRecord[]>();
  ALL_EVIDENCE.forEach((r) => {
    if (!byMirna.has(r.mirna)) byMirna.set(r.mirna, []);
    byMirna.get(r.mirna)!.push(r);
  });
  return Array.from(byMirna.entries()).map(([mirna, recs]) => {
    const byTissue = new Map<string, EvidenceRecord[]>();
    recs.forEach((r) => {
      if (!byTissue.has(r.biospecimenKey)) byTissue.set(r.biospecimenKey, []);
      byTissue.get(r.biospecimenKey)!.push(r);
    });
    return { mirna, all: cellOf(recs), cells: new Map(Array.from(byTissue.entries()).map(([t, rs]) => [t, cellOf(rs)])) };
  });
})();

/** Results with direction `dir` for a miRNA in `tissue` ("all" = every tissue). */
export function resultsFor(row: MirnaRow, dir: Dir, tissue: string): EvidenceRecord[] {
  const cell = tissue === "all" ? row.all : row.cells.get(tissue);
  return cell ? cell.byDir[dir] : [];
}

/** Per tissue: results and distinct miRNAs measured in it. */
export const TISSUE_TOTALS = new Map(
  TISSUES.map((t) => {
    const recs = ALL_EVIDENCE.filter((r) => r.biospecimenKey === t);
    return [t, { results: recs.length, mirnas: new Set(recs.map((r) => r.mirna)).size }];
  }),
);

export interface Combination {
  key: string;
  tissues: string[];          // in TISSUES order
  rows: MirnaRow[];
}

/** miRNAs grouped by the exact set of tissues they were measured in (UpSet intersections). */
export function tissueCombinations(rows: MirnaRow[]): Combination[] {
  const map = new Map<string, Combination>();
  rows.forEach((row) => {
    const tissues = TISSUES.filter((t) => row.cells.has(t));
    const key = tissues.join(" + ");
    const c = map.get(key) ?? { key, tissues, rows: [] };
    c.rows.push(row);
    map.set(key, c);
  });
  return Array.from(map.values()).sort(
    (a, b) => b.rows.length - a.rows.length || b.tissues.length - a.tissues.length || a.key.localeCompare(b.key),
  );
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
