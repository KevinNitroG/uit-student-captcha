// Structured-clone-safe multipart/form-data and urlencoded body encoder.
// All ASCII framing is done via charCodeAt (no TextEncoder — FR-005, Decision 3).
// Blob→bytes conversion uses FileReader.readAsArrayBuffer (not Blob.arrayBuffer() —
// FR-006, Decision 4). The output types (ArrayBuffer, string) are accepted by every
// XHR implementation and pass the GM bridge's structured-clone check on old WebKit.

/** Encode a pure-ASCII string to a Uint8Array using charCodeAt (no TextEncoder). */
export function asciiBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    out[i] = s.charCodeAt(i) & 0xff;
  }
  return out;
}

/** Read a Blob's bytes via FileReader.readAsArrayBuffer (universally available). */
export function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        reject(new Error("Failed to read image bytes as ArrayBuffer"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image bytes"));
    reader.readAsArrayBuffer(blob);
  });
}

/** Descriptor for the binary file part of a multipart body. */
export interface MultipartFile {
  readonly name: string;        // form field name, e.g. "file"
  readonly filename: string;    // e.g. "captcha.png"
  readonly contentType: string; // e.g. "image/png"
  readonly bytes: Uint8Array;   // raw image bytes, inserted verbatim
}

/**
 * Build a multipart/form-data body as a single ArrayBuffer.
 * Text fields are emitted first (in Object.entries order), then the file part.
 * All ASCII framing uses asciiBytes (charCodeAt, no TextEncoder).
 */
export function buildMultipartBody(
  textFields: Record<string, string>,
  file: MultipartFile,
): { body: ArrayBuffer; contentType: string } {
  const boundary =
    "----uocFormBoundary" +
    Math.random().toString(16).slice(2) +
    Math.random().toString(16).slice(2);

  // Collect all byte segments in order
  const segments: Uint8Array[] = [];

  // Text field parts
  for (const [name, value] of Object.entries(textFields)) {
    segments.push(
      asciiBytes(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
      ),
    );
  }

  // File part header
  segments.push(
    asciiBytes(
      `--${boundary}\r\nContent-Disposition: form-data; name="${file.name}"; filename="${file.filename}"\r\nContent-Type: ${file.contentType}\r\n\r\n`,
    ),
  );

  // Raw image bytes (verbatim, never re-encoded)
  segments.push(file.bytes);

  // CRLF after file bytes + closing delimiter
  segments.push(asciiBytes(`\r\n--${boundary}--\r\n`));

  // Single allocation: compute total length and copy all segments
  let totalLength = 0;
  for (const seg of segments) totalLength += seg.byteLength;

  const buf = new Uint8Array(totalLength);
  let offset = 0;
  for (const seg of segments) {
    buf.set(seg, offset);
    offset += seg.byteLength;
  }

  return {
    body: buf.buffer,
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

/**
 * Encode a flat record to an application/x-www-form-urlencoded string.
 * Used for OCR.space url and base64 POST modes (no binary, trivially cloneable).
 */
export function encodeUrlForm(fields: Record<string, string>): string {
  return Object.entries(fields)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}
