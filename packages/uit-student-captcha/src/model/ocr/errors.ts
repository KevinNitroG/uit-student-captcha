// OCR error taxonomy (data-model.md §2, contracts/ocr-resolver.contract.md).
// Every resolver maps its provider's HTTP/in-body failure into one OcrErrorCode and
// throws OcrError; the ViewModel treats any OcrError uniformly as "provider failed".

export type OcrErrorCode =
  | "BAD_REQUEST"
  | "AUTH"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA"
  | "RATE_LIMIT"
  | "TIMEOUT"
  | "NETWORK"
  | "PROVIDER_ERROR"
  | "EMPTY_RESULT"
  | "MISSING_CONFIG";

export interface OcrErrorMeta {
  readonly provider: string;
  readonly httpStatus?: number;
  readonly raw?: unknown;
  readonly cause?: unknown;
}

export class OcrError extends Error {
  readonly code: OcrErrorCode;
  readonly provider: string;
  readonly httpStatus?: number;
  readonly raw?: unknown;
  readonly cause?: unknown;

  constructor(code: OcrErrorCode, message: string, meta: OcrErrorMeta) {
    super(message);
    this.name = "OcrError";
    this.code = code;
    this.provider = meta.provider;
    if (meta.httpStatus !== undefined) this.httpStatus = meta.httpStatus;
    if (meta.raw !== undefined) this.raw = meta.raw;
    if (meta.cause !== undefined) this.cause = meta.cause;
  }
}
