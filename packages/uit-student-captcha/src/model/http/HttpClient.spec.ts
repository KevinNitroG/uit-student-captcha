import { describe, expect, it } from "vitest";
import { GmHttpClient } from "./HttpClient.ts";
import { OcrError } from "../ocr/errors.ts";
import { installFakeXhr } from "../../../test/helpers/mocks.ts";

describe("GmHttpClient", () => {
  it("resolves a successful response with parsed headers and JSON body", async () => {
    installFakeXhr(() => ({
      status: 200,
      responseText: '{"ok":true}',
      responseHeaders: "Content-Type: application/json\r\nX-Trace: 1",
    }));

    const res = await new GmHttpClient().request({
      method: "GET",
      url: "https://example.test",
      timeoutMs: 1000,
      responseType: "json",
    });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/json");
    expect(res.json()).toEqual({ ok: true });
  });

  it("maps a timeout to OcrError(TIMEOUT)", async () => {
    installFakeXhr(() => "timeout");
    await expect(
      new GmHttpClient().request({ method: "GET", url: "https://x", timeoutMs: 5 }),
    ).rejects.toMatchObject({ code: "TIMEOUT" });
  });

  it("maps a transport failure to OcrError(NETWORK)", async () => {
    installFakeXhr(() => "error");
    const err = await new GmHttpClient()
      .request({ method: "POST", url: "https://x", timeoutMs: 5 })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(OcrError);
    expect((err as OcrError).code).toBe("NETWORK");
  });

  it("passes an ArrayBuffer body as-is to GM_xmlhttpRequest data", async () => {
    let capturedData: unknown;
    const fn = installFakeXhr((details) => {
      capturedData = (details as unknown as Record<string, unknown>)["data"];
      return { status: 200, responseText: "{}", responseHeaders: "" };
    });
    const buf = new Uint8Array([1, 2, 3]).buffer;
    await new GmHttpClient().request({
      method: "POST",
      url: "https://example.test",
      body: buf,
      timeoutMs: 1000,
    });
    expect(fn).toHaveBeenCalledOnce();
    expect(capturedData).toBe(buf); // exact same ArrayBuffer reference
  });
});
