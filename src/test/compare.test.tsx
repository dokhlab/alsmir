import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ComparePage from "../pages/ComparePage";

describe("ComparePage", () => {
  it("asks for two subgroups and a biospecimen before showing results", () => {
    render(<MemoryRouter><ComparePage /></MemoryRouter>);
    expect(screen.getByText("Compare ALS subgroups")).toBeInTheDocument();
    expect(screen.getByTestId("compare-note")).toHaveTextContent("does not establish a statistically significant difference");
    expect(screen.queryByTestId("compare-table")).not.toBeInTheDocument();
  });
});
