// Test doubles shared across the userscript suite: a fake GM storage / menu API, a
// fake GM_xmlhttpRequest, and a fake HttpClient. Resolvers and DOM code are tested
// against these so no live network or browser is touched (Testing Discipline).

import { vi } from "vitest";
import type { HttpClient, HttpRequest, HttpResponse } from "../../src/model/http/HttpClient.ts";

/** Install fake GM_getValue/GM_setValue/GM_registerMenuCommand/GM_openInTab globals. */
export function installFakeGm(initial: Record<string, string> = {}): {
  store: Record<string, string>;
  registered: Array<{ caption: string; onClick: () => void }>;
} {
  const store: Record<string, string> = { ...initial };
  const registered: Array<{ caption: string; onClick: () => void }> = [];
  const g = globalThis as Record<string, unknown>;
  g["GM_getValue"] = vi.fn((key: string, fallback?: string) =>
    key in store ? store[key] : fallback,
  );
  g["GM_setValue"] = vi.fn((key: string, value: string) => {
    store[key] = value;
  });
  g["GM_registerMenuCommand"] = vi.fn((caption: string, onClick: () => void) => {
    registered.push({ caption, onClick });
  });
  g["GM_openInTab"] = vi.fn();
  return { store, registered };
}

export interface FakeXhrResult {
  status?: number;
  responseText?: string;
  response?: unknown;
  responseHeaders?: string;
}

interface FakeXhrDetails {
  onload: (r: Required<FakeXhrResult>) => void;
  onerror: () => void;
  ontimeout: () => void;
}

/** Install a fake GM_xmlhttpRequest. The handler decides the outcome per call. */
export function installFakeXhr(
  handler: (details: FakeXhrDetails) => FakeXhrResult | "timeout" | "error",
): ReturnType<typeof vi.fn> {
  const fn = vi.fn((details: FakeXhrDetails) => {
    const outcome = handler(details);
    if (outcome === "timeout") return details.ontimeout();
    if (outcome === "error") return details.onerror();
    return details.onload({
      status: 200,
      responseText: "",
      response: undefined,
      responseHeaders: "",
      ...outcome,
    });
  });
  (globalThis as Record<string, unknown>)["GM_xmlhttpRequest"] = fn;
  return fn;
}

/** A fake HttpClient driven by a per-request implementation. */
export function fakeHttpClient(
  impl: (req: HttpRequest) => HttpResponse | Promise<HttpResponse>,
): HttpClient {
  return { request: vi.fn((req: HttpRequest) => Promise.resolve(impl(req))) };
}

/** Build an HttpResponse carrying a JSON body. */
export function jsonResponse(status: number, body: unknown): HttpResponse {
  const text = JSON.stringify(body);
  return { status, headers: {}, text, json: () => JSON.parse(text) as unknown };
}
