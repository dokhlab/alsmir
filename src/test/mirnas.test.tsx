import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MirnasPage from "../pages/MirnasPage";

describe("MirnasPage", () => {
  it("renders without crashing", () => {
    const { getByText } = render(
      <MemoryRouter>
        <MirnasPage />
      </MemoryRouter>
    );
    expect(getByText(/Browse miRNAs/i)).toBeInTheDocument();
  });
});
