// Portal View (Constitution I/V): the ONLY layer that touches the portal DOM. It
// detects the signin form, reads the captcha image (bytes via an untainted same-origin
// canvas; public src as the URL), drives the ViewModel, renders the status badge, and
// writes ONLY the answer field. Every DOM access is guarded; it never touches
// username/password/submit. Verified selectors: research.md Decision 7.

import type { CaptchaStatus, CaptchaViewModel } from "../viewmodel/CaptchaViewModel.ts";
import { StatusBadge } from "./statusBadge.ts";

/** Detected DOM context (the ViewModel never reads the DOM). */
export interface SigninFormContext {
  readonly form: HTMLFormElement;
  readonly captchaImage: HTMLImageElement;
  readonly answerInput: HTMLInputElement;
}

export type ByteExtractor = (img: HTMLImageElement) => Promise<Blob | null>;

export interface PortalViewOptions {
  /** Override the canvas-based byte extraction (used in tests). */
  readonly extractBytes?: ByteExtractor;
  /** Config-page URL used by the missing-config notice. */
  readonly configUrl?: string;
}

const LOG_PREFIX = "[uit-captcha]";

/** Draw the already-loaded same-origin image to a canvas and read PNG bytes. */
async function canvasExtractBytes(img: HTMLImageElement): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

export class PortalView {
  private readonly extractBytes: ByteExtractor;
  private readonly badge: StatusBadge;
  private context: SigninFormContext | null = null;

  constructor(
    private readonly viewModel: CaptchaViewModel,
    options: PortalViewOptions = {},
  ) {
    this.extractBytes = options.extractBytes ?? canvasExtractBytes;
    this.badge = new StatusBadge({
      onRetry: () => this.retry(),
      configUrl: options.configUrl ?? "#",
    });
  }

  /** Locate the signin form + captcha elements, or null when absent. */
  detect(): SigninFormContext | null {
    const form = document.querySelector<HTMLFormElement>("#user-login-form");
    if (!form) return null;
    const captchaImage = document.querySelector<HTMLImageElement>(".english-captcha-image img");
    const answerInput = document.querySelector<HTMLInputElement>("#edit-english-captcha-answer");
    if (!captchaImage || !answerInput) return null;
    return { form, captchaImage, answerInput };
  }

  /** Detect, read the image, run the chain once, and render the result. */
  async run(): Promise<CaptchaStatus | null> {
    const context = this.detect();
    if (!context) {
      console.info(`${LOG_PREFIX} no signin form on this page; nothing to do.`);
      return null;
    }
    // If the user already typed a captcha, leave it alone — don't read or overwrite
    // (FR-008): only an explicit Retry overrides a pre-filled answer.
    if (context.answerInput.value.trim() !== "") {
      console.info(`${LOG_PREFIX} captcha answer already filled by the user; skipping OCR.`);
      return null;
    }
    return this.solveInto(context);
  }

  /** Read the current image into the ViewModel, solve, and render (also used by Retry). */
  async solveInto(context: SigninFormContext, options: { force?: boolean } = {}): Promise<CaptchaStatus> {
    this.context = context;
    // Re-render the badge on each transition so "Reading…" shows during the chain.
    this.viewModel.onStatusChange = (status) => this.badge.render(context.captchaImage, status);

    const img = context.captchaImage;
    const imageUrl = img.currentSrc || img.src || null;
    let bytes: Blob | null = null;
    try {
      bytes = await this.extractBytes(img);
    } catch (err) {
      console.info(`${LOG_PREFIX} could not read captcha image bytes:`, err);
    }

    this.viewModel.setImage(imageUrl, bytes, "image/png");
    const status = await this.viewModel.solve();

    // Final render (covers the solved-guard short-circuit, which fires no transition).
    this.badge.render(context.captchaImage, status);
    if (status.kind === "solved") this.fillAnswer(context, status.result.text, options.force ?? false);
    return status;
  }

  /** Retry re-reads the current image and re-runs the chain from idle (FR-015/FR-016). */
  private retry(): void {
    if (!this.context) return;
    this.viewModel.reset();
    // Retry is an explicit user action, so it overwrites whatever is in the field.
    void this.solveInto(this.context, { force: true });
  }

  /** Write ONLY the answer field and notify Drupal via input/change events (FR-008). */
  private fillAnswer(context: SigninFormContext, text: string, force: boolean): void {
    const input = context.answerInput;
    // Guard against text typed during the (async) solve: don't clobber the user's input
    // unless this is an explicit Retry.
    if (!force && input.value.trim() !== "") {
      console.info(`${LOG_PREFIX} captcha answer typed during OCR; keeping the user's value.`);
      return;
    }
    input.value = text;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }
}
