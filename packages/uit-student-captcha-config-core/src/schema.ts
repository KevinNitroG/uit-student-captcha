// Canonical OCR-provider configuration contract — the single source of truth shared
// by the userscript (which reads it from GM storage to drive recognition) and the
// hosted config page (which edits it). See specs/001-captcha-ocr-autofill/data-model.md §3.

/** Persisted user settings. The ordered `providers` array IS the fallback chain. */
export interface ProviderConfiguration {
  readonly version: 1;
  /** providers[0] = primary, [1] = first fallback, ... Order is the chain. */
  readonly providers: readonly ProviderEntry[];
  /** Per-attempt timeout in ms. */
  readonly timeoutMs: number;
}

/** Discriminated union keyed by `provider`. The discriminant is switched in exactly
 *  one place per consumer (the resolver registry / the SPA's ProviderCard). */
export type ProviderEntry = EasyOcrEntry | OcrSpaceEntry;

export interface ProviderEntryBase {
  /** Stable instance id (lets the user keep two entries of the same kind). */
  readonly id: string;
  /** Toggle out of the runtime chain without deleting the entry. */
  readonly enabled: boolean;
}

export interface EasyOcrEntry extends ProviderEntryBase {
  readonly provider: "easyocr";
  readonly variant: "free" | "keyed";
  readonly endpoint: string;
  /** Required when variant === "keyed" (sent as the X-Access-Key header). */
  readonly accessKey?: string;
}

export interface OcrSpaceEntry extends ProviderEntryBase {
  readonly provider: "ocrspace";
  /** The only field the user must supply by default. */
  readonly apiKey: string;
  readonly scheme: "https" | "http";
  readonly httpMethod: "POST" | "GET";
  readonly inputMode: "url" | "base64" | "file";
  readonly ocrEngine: 1 | 2 | 3;
  readonly language: string;
  /** Override; otherwise derived from scheme + httpMethod. */
  readonly endpoint?: string;
  readonly isOverlayRequired?: boolean;
  readonly detectOrientation?: boolean;
  readonly scale?: boolean;
  readonly isTable?: boolean;
}

/** Typed defaults so a first-time user (no saved config) gets a working attempt with
 *  the no-key EasyOCR provider; OCR.space is present but disabled until a key is set. */
export const DEFAULT_CONFIG: ProviderConfiguration = {
  version: 1,
  timeoutMs: 15_000,
  providers: [
    {
      id: "easyocr-free",
      provider: "easyocr",
      variant: "free",
      endpoint: "https://api.easyocr.org/ocr",
      enabled: true,
    },
    {
      id: "ocrspace-1",
      provider: "ocrspace",
      apiKey: "",
      scheme: "https",
      httpMethod: "POST",
      inputMode: "url",
      ocrEngine: 1,
      language: "eng",
      enabled: false,
    },
  ],
};

/** Bounds used by validateConfig() when clamping user input. */
export const TIMEOUT_MS_MIN = 2_000;
export const TIMEOUT_MS_MAX = 120_000;
