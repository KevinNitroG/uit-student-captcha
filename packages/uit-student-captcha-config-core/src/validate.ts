// validateConfig() — the trust-boundary normalizer. The userscript bridge runs raw,
// SPA-supplied JSON through this before GM_setValue, and the portal runs GM-stored
// JSON through it before building the resolver chain. It fills defaults, clamps
// numeric ranges, drops unknown providers, and keeps disabled/keyless entries (so the
// SPA can round-trip them and the runtime layer decides what to skip). See
// data-model.md §3 "Validation rules" and research.md Decision 9.

import {
  DEFAULT_CONFIG,
  TIMEOUT_MS_MAX,
  TIMEOUT_MS_MIN,
  type EasyOcrEntry,
  type OcrSpaceEntry,
  type ProviderConfiguration,
  type ProviderEntry,
} from "./schema.ts";

function clampTimeout(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_CONFIG.timeoutMs;
  return Math.min(TIMEOUT_MS_MAX, Math.max(TIMEOUT_MS_MIN, Math.round(value)));
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

const EASYOCR_ENDPOINT = "https://console.easyocr.org/api/ocr";

function validateEasyOcr(raw: Record<string, unknown>, index: number): EasyOcrEntry {
  // Heal the retired keyless hosts (api.easyocr.org / cn-api.easyocr.org never
  // resolved); EasyOCR is key-only via the console endpoint.
  let endpoint = asString(raw["endpoint"], EASYOCR_ENDPOINT);
  if (endpoint.includes("api.easyocr.org")) endpoint = EASYOCR_ENDPOINT;

  const base: EasyOcrEntry = {
    id: asString(raw["id"], `easyocr-${index}`),
    provider: "easyocr",
    enabled: asBoolean(raw["enabled"], true),
    endpoint,
  };
  const accessKey = raw["accessKey"];
  return typeof accessKey === "string" && accessKey.length > 0
    ? { ...base, accessKey }
    : base;
}

function validateOcrSpace(raw: Record<string, unknown>, index: number): OcrSpaceEntry {
  // Engine 2 is the default: engine 1 fails on the portal's small distorted captchas
  // (verified — engine 1 returns empty, engine 2 reads them).
  const engine = raw["ocrEngine"];
  const ocrEngine: 1 | 2 | 3 = engine === 1 ? 1 : engine === 3 ? 3 : 2;
  const inputRaw = raw["inputMode"];
  const inputMode: OcrSpaceEntry["inputMode"] =
    inputRaw === "base64" ? "base64" : inputRaw === "file" ? "file" : "url";

  let entry: OcrSpaceEntry = {
    id: asString(raw["id"], `ocrspace-${index}`),
    provider: "ocrspace",
    enabled: asBoolean(raw["enabled"], false),
    apiKey: asString(raw["apiKey"], ""),
    scheme: raw["scheme"] === "http" ? "http" : "https",
    httpMethod: raw["httpMethod"] === "GET" ? "GET" : "POST",
    inputMode,
    ocrEngine,
    language: asString(raw["language"], "eng"),
  };

  const endpoint = raw["endpoint"];
  if (typeof endpoint === "string" && endpoint.length > 0) entry = { ...entry, endpoint };

  const overlay = raw["isOverlayRequired"];
  if (typeof overlay === "boolean") entry = { ...entry, isOverlayRequired: overlay };
  const orient = raw["detectOrientation"];
  if (typeof orient === "boolean") entry = { ...entry, detectOrientation: orient };
  const scale = raw["scale"];
  if (typeof scale === "boolean") entry = { ...entry, scale };
  const isTable = raw["isTable"];
  if (typeof isTable === "boolean") entry = { ...entry, isTable };

  return entry;
}

/** Coerce arbitrary input into a valid ProviderConfiguration (never throws). */
export function validateConfig(raw: unknown): ProviderConfiguration {
  if (typeof raw !== "object" || raw === null) return DEFAULT_CONFIG;
  const obj = raw as Record<string, unknown>;
  const timeoutMs = clampTimeout(obj["timeoutMs"]);

  const rawProviders = obj["providers"];
  if (!Array.isArray(rawProviders)) {
    return { version: 1, timeoutMs, providers: DEFAULT_CONFIG.providers };
  }

  const providers: ProviderEntry[] = [];
  rawProviders.forEach((item, index) => {
    if (typeof item !== "object" || item === null) return;
    const entry = item as Record<string, unknown>;
    if (entry["provider"] === "easyocr") providers.push(validateEasyOcr(entry, index));
    else if (entry["provider"] === "ocrspace") providers.push(validateOcrSpace(entry, index));
  });

  return { version: 1, timeoutMs, providers };
}
