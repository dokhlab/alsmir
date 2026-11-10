import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AboutPage from "../pages/AboutPage";

describe("AboutPage", () => {
  it("renders without crashing", () => {
    const { getByText } = render(
      <MemoryRouter>
        <AboutPage />
      </MemoryRouter>
    );
    expect(getByText(/About ALSmiR/i)).toBeInTheDocument();
  });
});
