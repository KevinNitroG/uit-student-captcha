import { describe, expect, it } from "vitest";
import { asciiBytes, blobToUint8Array, buildMultipartBody, encodeUrlForm } from "./multipart.ts";

describe("asciiBytes", () => {
  it("encodes ASCII characters to their code points", () => {
    const result = asciiBytes("AB");
    expect(result).toEqual(new Uint8Array([65, 66]));
  });

  it("encodes an empty string to an empty array", () => {
    expect(asciiBytes("")).toEqual(new Uint8Array([]));
  });

  it("masks non-ASCII bytes to the low byte", () => {
    // charCodeAt & 0xff — ensure it doesn't throw
    const result = asciiBytes("ñ"); // code point 241 → 0xf1
    expect(result[0]).toBe(0xf1);
  });
});

describe("blobToUint8Array", () => {
  it("resolves to the bytes of a text blob", async () => {
    const blob = new Blob(["bytes"]);
    const result = await blobToUint8Array(blob);
    // "bytes" in UTF-8 is [98, 121, 116, 101, 115]
    expect(result).toBeInstanceOf(Uint8Array);
    expect(Array.from(result)).toEqual([98, 121, 116, 101, 115]);
  });

  it("resolves to empty array for an empty blob", async () => {
    const blob = new Blob([]);
    const result = await blobToUint8Array(blob);
    expect(result.byteLength).toBe(0);
  });
});

describe("buildMultipartBody", () => {
  const imageBytes = new Uint8Array([1, 2, 3]);
  const file = {
    name: "file",
    filename: "captcha.png",
    contentType: "image/png",
    bytes: imageBytes,
  };

  it("returns an ArrayBuffer body", () => {
    const { body } = buildMultipartBody({}, file);
    expect(body).toBeInstanceOf(ArrayBuffer);
  });

  it("contentType contains the boundary and the body contains the same boundary", () => {
    const { body, contentType } = buildMultipartBody({}, file);
    const boundaryMatch = contentType.match(/boundary=(.+)$/);
    expect(boundaryMatch).not.toBeNull();
    const boundary = boundaryMatch![1];
    const decoded = String.fromCharCode(...new Uint8Array(body));
    expect(decoded).toContain(`--${boundary}`);
    expect(contentType).toBe(`multipart/form-data; boundary=${boundary}`);
  });

  it("includes text fields with their names and values", () => {
    const { body } = buildMultipartBody({ apikey: "k", language: "eng" }, file);
    const decoded = String.fromCharCode(...new Uint8Array(body));
    expect(decoded).toContain('name="apikey"');
    expect(decoded).toContain("\r\nk\r\n");
    expect(decoded).toContain('name="language"');
    expect(decoded).toContain("\r\neng\r\n");
  });

  it("includes filename and Content-Type in the file part header", () => {
    const { body } = buildMultipartBody({}, file);
    const decoded = String.fromCharCode(...new Uint8Array(body));
    expect(decoded).toContain('filename="captcha.png"');
    expect(decoded).toContain("Content-Type: image/png");
  });

  it("embeds the raw image bytes verbatim", () => {
    const { body } = buildMultipartBody({}, file);
    const arr = new Uint8Array(body);
    // Find the sequence [1, 2, 3] in the buffer
    let found = false;
    for (let i = 0; i <= arr.length - 3; i++) {
      if (arr[i] === 1 && arr[i + 1] === 2 && arr[i + 2] === 3) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it("places text fields before the file part", () => {
    const { body } = buildMultipartBody({ apikey: "k" }, file);
    const decoded = String.fromCharCode(...new Uint8Array(body));
    expect(decoded.indexOf('name="apikey"')).toBeLessThan(decoded.indexOf('filename="captcha.png"'));
  });

  it("ends with the closing delimiter", () => {
    const { body, contentType } = buildMultipartBody({}, file);
    const boundary = contentType.match(/boundary=(.+)$/)![1];
    const decoded = String.fromCharCode(...new Uint8Array(body));
    expect(decoded).toContain(`--${boundary}--\r\n`);
    // The closing delimiter must appear after the file bytes
    expect(decoded.lastIndexOf(`--${boundary}--`)).toBeGreaterThan(
      decoded.lastIndexOf(`--${boundary}\r\n`),
    );
  });
});

describe("encodeUrlForm", () => {
  it("encodes a simple key=value pair", () => {
    expect(encodeUrlForm({ a: "1" })).toBe("a=1");
  });

  it("encodes multiple pairs joined by &", () => {
    const result = encodeUrlForm({ a: "1", b: "x y" });
    expect(result).toBe("a=1&b=x%20y");
  });

  it("percent-encodes special characters in keys and values", () => {
    expect(encodeUrlForm({ "a b": "c&d" })).toBe("a%20b=c%26d");
  });

  it("returns empty string for empty input", () => {
    expect(encodeUrlForm({})).toBe("");
  });
});
