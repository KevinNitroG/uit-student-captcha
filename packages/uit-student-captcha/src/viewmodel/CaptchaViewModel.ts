// Orchestrates recognition (data-model.md §4). It holds the image + an ordered
// resolver chain built from configuration, runs the chain (one attempt per provider,
// in order, normalize), and exposes a CaptchaStatus. It NEVER touches the DOM or GM_*
// (Constitution I) — the View injects the image and renders the status.

import type { ProviderConfiguration } from "uit-student-captcha-config-core";
import type { HttpClient } from "../model/http/HttpClient.ts";
import { OcrError } from "../model/ocr/errors.ts";
import type { OcrInput, OcrResolver, OcrResult } from "../model/ocr/OcrResolver.ts";
import { createResolver, type ResolverFactory } from "../model/ocr/registry.ts";

export type CaptchaStatus =
  | { readonly kind: "idle" }
  | { readonly kind: "loading"; readonly provider: string }
  | { readonly kind: "solved"; readonly result: OcrResult }
  | { readonly kind: "missing-config" }
  | { readonly kind: "failed"; readonly lastError: OcrError; readonly attempts: string[] };

export class CaptchaViewModel {
  imageUrl: string | null = null;
  imageBytes: Blob | null = null;
  mimeType = "image/png";
  readonly ocrResolvers: OcrResolver[] = [];
  status: CaptchaStatus = { kind: "idle" };

  /** Optional observer the View subscribes to so the badge re-renders on transitions. */
  onStatusChange: ((status: CaptchaStatus) => void) | null = null;

  constructor(
    config: ProviderConfiguration,
    http: HttpClient,
    factory: ResolverFactory = createResolver,
  ) {
    for (const entry of config.providers) {
      if (!entry.enabled) continue;
      try {
        this.ocrResolvers.push(factory(entry, http, config.timeoutMs));
      } catch (err) {
        // Misconfigured (e.g. missing key) or not-yet-registered → skip it. The
        // chain simply has one fewer provider; an empty chain → missing-config.
        console.info(`[uit-captcha] skipping provider "${entry.id}":`, err);
      }
    }
  }

  setImage(imageUrl: string | null, imageBytes: Blob | null, mimeType = "image/png"): void {
    this.imageUrl = imageUrl;
    this.imageBytes = imageBytes;
    this.mimeType = mimeType;
  }

  private setStatus(status: CaptchaStatus): CaptchaStatus {
    this.status = status;
    this.onStatusChange?.(status);
    return status;
  }

  /** Run the provider chain once each, in order, until one succeeds. */
  async solve(): Promise<CaptchaStatus> {
    if (this.ocrResolvers.length === 0) {
      return this.setStatus({ kind: "missing-config" });
    }

    const input: OcrInput = {
      imageUrl: this.imageUrl,
      imageBytes: this.imageBytes,
      mimeType: this.mimeType,
    };
    const attempts: string[] = [];
    let lastError: OcrError = new OcrError("PROVIDER_ERROR", "No provider attempted", {
      provider: "none",
    });

    for (const resolver of this.ocrResolvers) {
      this.setStatus({ kind: "loading", provider: resolver.id });
      try {
        const result = await resolver.resolve(input);
        return this.setStatus({ kind: "solved", result });
      } catch (err) {
        attempts.push(resolver.id);
        lastError =
          err instanceof OcrError
            ? err
            : new OcrError("PROVIDER_ERROR", String(err), {
                provider: resolver.id,
                cause: err,
              });
      }
    }

    return this.setStatus({ kind: "failed", lastError, attempts });
  }

  /** Reset to idle so a manual retry re-runs the chain (FR-015/FR-016). */
  reset(): void {
    this.setStatus({ kind: "idle" });
  }
}
