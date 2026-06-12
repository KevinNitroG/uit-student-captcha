// Inline status/error badge mounted beneath the captcha image (contracts/config-ui.md
// §B; research.md Decision 7). Plain DOM (no React on the portal). Non-blocking: it
// never overlays or disables the form. One instance only — guarded against duplicate
// injection (FR-015/FR-017).

import type { CaptchaStatus } from "../viewmodel/CaptchaViewModel.ts";

const BADGE_ID = "uit-captcha-badge";

export interface StatusBadgeOptions {
  /** Invoked when the user clicks "Retry OCR". */
  readonly onRetry: () => void;
  /** Config-page URL surfaced by the missing-config notice. */
  readonly configUrl: string;
}

function textNode(value: string): Text {
  return document.createTextNode(value);
}

function configLink(label: string, href: string): HTMLAnchorElement {
  const a = document.createElement("a");
  a.textContent = label;
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener";
  return a;
}

function retryButton(onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "↻ Retry OCR";
  button.style.marginLeft = "6px";
  button.addEventListener("click", onClick);
  return button;
}

export class StatusBadge {
  constructor(private readonly options: StatusBadgeOptions) {}

  /** Reuse the existing badge element or create one beneath the captcha image. */
  private ensureRoot(image: HTMLImageElement): HTMLElement | null {
    const existing = document.getElementById(BADGE_ID);
    if (existing) return existing;

    const root = document.createElement("div");
    root.id = BADGE_ID;
    root.style.marginTop = "6px";
    root.style.fontSize = "13px";

    const anchor = image.closest(".english-captcha-image") ?? image;
    if (anchor.insertAdjacentElement("afterend", root)) return root;

    const host = image.closest(".captcha") ?? image.parentElement;
    if (!host) return null;
    host.appendChild(root);
    return root;
  }

  render(image: HTMLImageElement, status: CaptchaStatus): void {
    const root = this.ensureRoot(image);
    if (!root) {
      console.info("[uit-captcha] no mount point for the status badge");
      return;
    }
    root.replaceChildren();
    root.style.display = "";

    switch (status.kind) {
      case "idle":
        root.style.display = "none";
        return;
      case "loading":
        root.style.color = "";
        root.textContent = `Reading captcha… (${status.provider})`;
        return;
      case "solved":
        root.style.color = "#15803d";
        root.textContent = "✓ Captcha read";
        return;
      case "missing-config":
        root.style.color = "#b45309";
        root.append(
          textNode("No OCR provider configured. "),
          configLink("⚙ Open configuration", this.options.configUrl),
        );
        return;
      case "failed":
        root.style.color = "#b91c1c";
        root.append(
          textNode(
            `Couldn't read the captcha (${status.attempts.join(", ") || "no provider"}: ${status.lastError.message}). `,
          ),
          retryButton(this.options.onRetry),
        );
        return;
    }
  }
}
