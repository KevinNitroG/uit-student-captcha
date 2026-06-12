import { describe, expect, it, vi } from "vitest";
import { OcrError } from "../model/ocr/errors.ts";
import { StatusBadge } from "./statusBadge.ts";

function renderCaptcha(): HTMLImageElement {
  document.body.innerHTML = `
    <div class="captcha">
      <div class="english-captcha-image"><img src="https://x/captcha_1.png" /></div>
    </div>`;
  return document.querySelector(".english-captcha-image img") as HTMLImageElement;
}

describe("StatusBadge", () => {
  it("renders a failed badge with a Retry button that re-invokes the chain", () => {
    const img = renderCaptcha();
    const onRetry = vi.fn();
    const badge = new StatusBadge({ onRetry, configUrl: "https://config/configure.html" });

    badge.render(img, {
      kind: "failed",
      lastError: new OcrError("AUTH", "invalid key", { provider: "ocrspace" }),
      attempts: ["easyocr", "ocrspace"],
    });

    const button = document.querySelector("#uit-captcha-badge button") as HTMLButtonElement;
    expect(button).not.toBeNull();
    button.click();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("renders the missing-config notice with a link to the config page", () => {
    const img = renderCaptcha();
    const badge = new StatusBadge({ onRetry: vi.fn(), configUrl: "https://config/configure.html" });

    badge.render(img, { kind: "missing-config" });

    const link = document.querySelector("#uit-captcha-badge a") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("https://config/configure.html");
  });

  it("mounts a single badge even when rendered repeatedly", () => {
    const img = renderCaptcha();
    const badge = new StatusBadge({ onRetry: vi.fn(), configUrl: "#" });

    badge.render(img, { kind: "loading", provider: "easyocr" });
    badge.render(img, { kind: "failed", lastError: new OcrError("NETWORK", "x", { provider: "easyocr" }), attempts: ["easyocr"] });

    expect(document.querySelectorAll("#uit-captcha-badge")).toHaveLength(1);
  });
});
