// The config page consumes the canonical config/bridge contract from the shared
// package rather than mirroring it (see specs/001-captcha-ocr-autofill/research.md
// Decision 9). Re-exported here so SPA components import from a single local module.

export type {
  ProviderConfiguration,
  ProviderEntry,
  EasyOcrEntry,
  OcrSpaceEntry,
  BridgeMessage,
} from "uit-student-captcha-config-core";
export {
  DEFAULT_CONFIG,
  STORAGE_KEY,
  isBridgeMessage,
} from "uit-student-captcha-config-core";
