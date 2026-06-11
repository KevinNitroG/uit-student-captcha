// Smoke test proving the jsdom environment and mocking are wired up.
// Replace with real Model/ViewModel/View tests as the userscript grows.
import { describe, expect, it, vi } from "vitest";

describe("test harness", () => {
  it("provides a jsdom DOM", () => {
    document.body.innerHTML = `<input id="captcha" />`;
    const input = document.querySelector<HTMLInputElement>("#captcha");

    expect(input).not.toBeNull();
    input!.value = "ABC123";
    expect(input!.value).toBe("ABC123");
  });

  it("can mock an external resolver", async () => {
    const resolve = vi.fn().mockResolvedValue("SOLVED");

    await expect(resolve("image-data")).resolves.toBe("SOLVED");
    expect(resolve).toHaveBeenCalledWith("image-data");
  });
});
