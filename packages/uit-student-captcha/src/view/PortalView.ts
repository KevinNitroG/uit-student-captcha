// Portal View (Constitution I/V): the ONLY layer that touches the portal DOM. It
// detects the signin form, reads the captcha image (bytes via an untainted same-origin
// canvas; public src as the URL), drives the ViewModel, and writes ONLY the answer
// field. Every DOM access is guarded; it never touches username/password/submit.
// Verified selectors: research.md Decision 7.

import type { CaptchaStatus, CaptchaViewModel } from "../viewmodel/CaptchaViewModel.ts";

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

  constructor(
    private readonly viewModel: CaptchaViewModel,
    options: PortalViewOptions = {},
  ) {
    this.extractBytes = options.extractBytes ?? canvasExtractBytes;
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
    return this.solveInto(context);
  }

  /** Read the current image into the ViewModel, solve, and render (also used by Retry). */
  async solveInto(context: SigninFormContext): Promise<CaptchaStatus> {
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
    this.render(context, status);
    return status;
  }

  private render(context: SigninFormContext, status: CaptchaStatus): void {
    if (status.kind === "solved") {
      this.fillAnswer(context, status.result.text);
    }
    // Status badge + Retry control are rendered in User Story 2 (T025/T027).
  }

  /** Write ONLY the answer field and notify Drupal via input/change events (FR-008). */
  private fillAnswer(context: SigninFormContext, text: string): void {
    const input = context.answerInput;
    input.value = text;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }
}
