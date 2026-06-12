// The ONLY place a provider id is switched to a concrete resolver (Constitution II,
// FR-019). Adding a provider = a new resolver file + one case here + a config-union
// member — ViewModel/View stay untouched. See contracts/ocr-resolver.contract.md.

import type { ProviderEntry } from "uit-student-captcha-config-core";
import type { HttpClient } from "../http/HttpClient.ts";
import { EasyOcrResolver } from "./EasyOcrResolver.ts";
import { OcrSpaceResolver } from "./OcrSpaceResolver.ts";
import type { OcrResolver } from "./OcrResolver.ts";

export type ResolverFactory = (
  entry: ProviderEntry,
  http: HttpClient,
  timeoutMs: number,
) => OcrResolver;

export const createResolver: ResolverFactory = (entry, http, timeoutMs) => {
  switch (entry.provider) {
    case "easyocr":
      return new EasyOcrResolver(entry, http, timeoutMs);
    case "ocrspace":
      return new OcrSpaceResolver(entry, http, timeoutMs);
  }
};
