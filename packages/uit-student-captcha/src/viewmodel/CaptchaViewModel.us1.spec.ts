import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, type ProviderConfiguration } from "uit-student-captcha-config-core";
import type { OcrResolver } from "../model/ocr/OcrResolver.ts";
import { CaptchaViewModel } from "./CaptchaViewModel.ts";
import { fakeHttpClient, jsonResponse } from "../../test/helpers/mocks.ts";

const http = fakeHttpClient(() => jsonResponse(200, {}));

const oneProvider: ProviderConfiguration = {
  version: 2,
  timeoutMs: 15000,
  lowercaseResult: true,
  providers: [
    { id: "p", provider: "easyocr", endpoint: "https://x", enabled: true, accessKey: "k" },
  ],
};

const stub: OcrResolver = {
  id: "stub",
  resolve: () =>
    Promise.resolve({ provider: "stub", rawText: "Old", text: "Old", confidence: null }),
};

describe("CaptchaViewModel (US1 happy path)", () => {
  it("solves with the normalized text from the single configured resolver", async () => {
    const vm = new CaptchaViewModel(oneProvider, http, () => stub);
    vm.setImage("https://x/captcha.png", new Blob(["x"]), "image/png");

    const status = await vm.solve();

    expect(status.kind).toBe("solved");
    expect(status.kind === "solved" && status.result.text).toBe("Old");
  });

  it("reports missing-config when the chain is empty (default config)", async () => {
    const vm = new CaptchaViewModel(DEFAULT_CONFIG, http, () => stub);

    const status = await vm.solve();

    expect(status.kind).toBe("missing-config");
  });
});
