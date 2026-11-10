import { describe, it, expect } from "vitest";
import { RESULTS } from "../data/dataset";
import { expressionOutcomes, rankOutcomes, type OutcomeKey } from "../data/queries";

const AXIS = { up: "↑", down: "↓", none: "=" } as const;

describe("Reported miRNA expression outcomes", () => {
  const { rows, flagged } = expressionOutcomes();

  it("counts distinct source publications per outcome and the total independently", () => {
    expect(flagged).toEqual([]);
    expect(rows.length).toBe(new Set(RESULTS.map((r) => r.microRNA)).size);
    for (const row of rows) {
      const rs = RESULTS.filter((r) => r.microRNA === row.mirna);
      for (const d of ["up", "down", "none"] as const) {
        expect(row[d]).toBe(new Set(rs.filter((r) => r.axis === AXIS[d]).map((r) => r.publicationId)).size);
      }
      expect(row.total).toBe(new Set(rs.map((r) => r.publicationId)).size);
    }
  });

  it("ranks the full dataset by the chosen column, then total, then name", () => {
    for (const key of ["up", "down", "none", "total"] as OutcomeKey[]) {
      const ranked = rankOutcomes(rows, key);
      expect(ranked.length).toBe(rows.length);
      for (let i = 1; i < ranked.length; i++) {
        const a = ranked[i - 1], b = ranked[i];
        expect(a[key] > b[key] || (a[key] === b[key] && (a.total > b.total || (a.total === b.total && a.mirna.localeCompare(b.mirna) <= 0)))).toBe(true);
      }
    }
  });
});
