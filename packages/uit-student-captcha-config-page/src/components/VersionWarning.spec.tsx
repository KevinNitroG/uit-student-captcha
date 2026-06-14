import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VersionWarning } from "./VersionWarning";

const PROPS = {
  scriptVersion: "1.0.0",
  pageVersion: "1.2.0",
  updateUrl: "https://example.com/update",
};

describe("VersionWarning", () => {
  it("renders both version strings and the update link", () => {
    render(<VersionWarning {...PROPS} />);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/1\.0\.0/)).toBeTruthy();
    expect(screen.getByText(/1\.2\.0/)).toBeTruthy();
    const link = screen.getByRole("link", { name: /update now/i });
    expect((link as HTMLAnchorElement).href).toBe("https://example.com/update");
  });

  it("hides the banner after clicking dismiss", () => {
    render(<VersionWarning {...PROPS} />);
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the banner again after remounting (no persistence)", () => {
    const { unmount } = render(<VersionWarning {...PROPS} />);
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    unmount();
    render(<VersionWarning {...PROPS} />);
    expect(screen.getByRole("alert")).toBeTruthy();
  });
});
