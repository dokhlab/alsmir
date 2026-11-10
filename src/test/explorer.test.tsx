import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TissueExplorerPage from "../pages/TissueExplorerPage";
import { RESULTS } from "../data/dataset";
import { DIRS, MIRNA_ROWS, TISSUES, resultsFor, tissueCombinations } from "../components/explorer/explorerData";

const AXIS = { up: "↑", down: "↓", none: "=" } as const;

describe("miRNA × Tissue Explorer data", () => {
  it("has one row per distinct microRNA and covers every result", () => {
    expect(MIRNA_ROWS.length).toBe(new Set(RESULTS.map((r) => r.microRNA)).size);
    expect(MIRNA_ROWS.reduce((n, r) => n + r.all.records.length, 0)).toBe(RESULTS.length);
  });

  it("counts result rows per direction for every cell (one number per direction)", () => {
    for (const row of MIRNA_ROWS) {
      for (const t of [...TISSUES, "all"]) {
        for (const d of DIRS) {
          const rows = RESULTS.filter((r) => r.microRNA === row.mirna && r.axis === AXIS[d] && (t === "all" || r.tissue.trim() === t));
          expect(resultsFor(row, d, t).length).toBe(rows.length);
        }
      }
    }
  });

  it("matches the curators' examples (6 Oct 2026)", () => {
    const row = (m: string) => MIRNA_ROWS.find((r) => r.mirna === m)!;
    const n = (m: string, t: string) => DIRS.map((d) => resultsFor(row(m), d, t).length);
    expect(n("hsa-miR-21-5p", "Serum")).toEqual([1, 2, 5]);
    expect(n("hsa-miR-21-5p", "CSF")).toEqual([0, 1, 3]);
    expect(n("hsa-miR-423-3p", "Serum")).toEqual([0, 4, 2]);
    expect(n("hsa-miR-1", "Serum")).toEqual([1, 0, 4]);
  });

  it("puts every miRNA in exactly one tissue combination", () => {
    const combos = tissueCombinations(MIRNA_ROWS);
    expect(combos.reduce((n, c) => n + c.rows.length, 0)).toBe(MIRNA_ROWS.length);
    combos.forEach((c) => c.rows.forEach((r) => expect(TISSUES.filter((t) => r.cells.has(t))).toEqual(c.tissues)));
  });
});

describe("TissueExplorerPage", () => {
  it("renders the matrix with the Up / Down / NC switch and no Mixed category", () => {
    render(<MemoryRouter><TissueExplorerPage /></MemoryRouter>);
    expect(screen.getByTestId("tissue-matrix")).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Direction" })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Mixed/);
  });

  it('keeps "Shared across tissues" hidden, even from the old URL', () => {
    render(<MemoryRouter initialEntries={["/database/network?view=overlap"]}><TissueExplorerPage /></MemoryRouter>);
    expect(screen.queryByTestId("tissue-overlap")).not.toBeInTheDocument();
    expect(screen.getByTestId("tissue-matrix")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Shared across tissues|A missing record/);
  });
});
