import { describe, expect, it, vi } from "vitest";
import type { ProviderConfiguration } from "uit-student-captcha-config-core";
import { OcrError, type OcrErrorCode } from "../model/ocr/errors.ts";
import type { OcrResolver, OcrResult } from "../model/ocr/OcrResolver.ts";
import { CaptchaViewModel } from "./CaptchaViewModel.ts";
import { fakeHttpClient, jsonResponse } from "../../test/helpers/mocks.ts";

const http = fakeHttpClient(() => jsonResponse(200, {}));

function succeeds(id: string, text: string): OcrResolver {
  const result: OcrResult = { provider: id, rawText: text, text, confidence: null };
  return { id, resolve: vi.fn(() => Promise.resolve(result)) };
}

function fails(id: string, code: OcrErrorCode): OcrResolver {
  return { id, resolve: vi.fn(() => Promise.reject(new OcrError(code, `${id} failed`, { provider: id }))) };
}

/** Build a VM whose chain is exactly the given resolvers, in order. */
function vmWith(resolvers: OcrResolver[]): CaptchaViewModel {
  let next = 0;
  const config: ProviderConfiguration = {
    version: 1,
    timeoutMs: 15000,
    providers: resolvers.map((_, i) => ({
      id: `p${i}`,
      provider: "easyocr",
      variant: "free",
      endpoint: "https://x",
      enabled: true,
    })),
  };
  const vm = new CaptchaViewModel(config, http, () => resolvers[next++]!);
  vm.setImage("https://x/captcha.png", new Blob(["x"]), "image/png");
  return vm;
}

describe("CaptchaViewModel (US2 fallback chain)", () => {
  it("falls back to the next provider when the primary fails", async () => {
    const status = await vmWith([fails("a", "RATE_LIMIT"), succeeds("b", "OK")]).solve();
    expect(status.kind).toBe("solved");
    expect(status.kind === "solved" && status.result.text).toBe("OK");
  });

  it("reports failed with the last error and all attempts when every provider fails", async () => {
    const status = await vmWith([fails("a", "RATE_LIMIT"), fails("b", "AUTH")]).solve();
    expect(status.kind).toBe("failed");
    if (status.kind === "failed") {
      expect(status.attempts).toEqual(["a", "b"]);
      expect(status.lastError.code).toBe("AUTH");
    }
  });

  it("reports missing-config when the chain is empty", async () => {
    const status = await vmWith([]).solve();
    expect(status.kind).toBe("missing-config");
  });

  it("treats a TIMEOUT from the primary as a normal failure and falls back", async () => {
    const status = await vmWith([fails("a", "TIMEOUT"), succeeds("b", "OK")]).solve();
    expect(status.kind).toBe("solved");
  });

  it("solved-guard: a second solve of the same image does not re-invoke the resolver", async () => {
    const resolver = succeeds("a", "OK");
    const vm = vmWith([resolver]);

    await vm.solve();
    await vm.solve();

    expect(resolver.resolve).toHaveBeenCalledTimes(1);
  });

  it("a reset clears the guard so Retry re-runs the chain", async () => {
    const resolver = succeeds("a", "OK");
    const vm = vmWith([resolver]);

    await vm.solve();
    vm.reset();
    await vm.solve();

    expect(resolver.resolve).toHaveBeenCalledTimes(2);
  });
});
