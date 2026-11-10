import { describe, it, expect } from "vitest";
import { RESULTS } from "../data/dataset";
import { mirbaseLink } from "../data/mirbase";
import raw from "../data/mirbase_links.json";

describe("miRBase links (curator rule: exact names only)", () => {
  const names = new Set(RESULTS.map((r) => r.microRNA));

  it("links only names that exist in ALSmiR", () => {
    Object.keys(raw.links).forEach((n) => expect(names.has(n)).toBe(true));
  });

  it("links an exact match to its accession page", () => {
    expect(mirbaseLink("hsa-let-7a-5p")).toEqual({ accession: "MIMAT0000062", url: "https://www.mirbase.org/mature/MIMAT0000062" });
  });

  it("does not link renamed, arm-less, removed or combined names", () => {
    for (const n of ["hsa-miR-206", "hsa-miR-1", "hsa-miR-663a", "hsa-miR-199a-3p_hsa-miR-199b-3p", "hsa-miR-7a-5p"]) {
      expect(mirbaseLink(n)).toBeNull();
    }
  });
});
