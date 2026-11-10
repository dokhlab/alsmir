import { describe, it, expect } from "vitest";
import { COHORTS, COHORT_ROWS, COHORT_ALIASES, RESULTS } from "../data/dataset";
import { STATS, studiesByCountry } from "../data/queries";

// Curators (8 Oct 2026): PUB0005_C01 and PUB0005_PUB0007_C01 are one shared cohort.
describe("documented cohort alias PUB0005_C01 -> PUB0005_PUB0007_C01", () => {
  it("counts the shared cohort once", () => {
    expect(COHORT_ROWS.some((c) => c.id === "PUB0005_C01" && c.aliasOf === "PUB0005_PUB0007_C01")).toBe(true);
    expect(COHORTS.some((c) => c.id === "PUB0005_C01")).toBe(false);
    expect(COHORTS.length).toBe(COHORT_ROWS.length - 1);
    expect(STATS.cohorts).toBe(COHORTS.length);
  });

  it("keeps result IDs and publication attribution, linking to the canonical cohort", () => {
    const rs = RESULTS.filter((r) => r.id.startsWith("PUB0005_C01_"));
    expect(rs.length).toBeGreaterThan(0);
    rs.forEach((r) => { expect(r.cohortId).toBe("PUB0005_PUB0007_C01"); expect(r.publicationId).toBe("PUB0005"); });
    RESULTS.filter((r) => r.id.startsWith("PUB0005_PUB0007_C01_")).forEach((r) => expect(r.publicationId).toBe("PUB0007"));
    // Other cohorts of either publication stay separate.
    RESULTS.filter((r) => /^PUB0005_C02_|^PUB0007_C01_/.test(r.id)).forEach((r) => expect(r.cohortId).toBe(r.id.replace(/_R\d+$/, "")));
  });

  it("counts the 13 patients once in participant totals", () => {
    const germany = studiesByCountry().find((c) => c.iso === "DEU")!;
    const expected = COHORTS.filter((c) => c.publicationIds.some((p) => ["PUB0002", "PUB0005", "PUB0007"].includes(p)))
      .reduce((n, c) => n + Number(c.n), 0);
    expect(germany.patients).toBe(expected);
  });

  it("records conflicting metadata between the two rows", () => {
    const a = COHORT_ALIASES.find((x) => x.alias === "PUB0005_C01")!;
    expect(a.canonical).toBe("PUB0005_PUB0007_C01");
    expect(a.conflicts.map((c) => c.field)).toEqual(["form"]);
  });
});
