// Public surface of the shared config-core package. Both the userscript and the
// config page import the config schema, defaults, and bridge contract from here.
// `validateConfig()` (Phase 2 foundational task) will be exported from ./validate.ts.

export type {
  ProviderConfiguration,
  ProviderEntry,
  ProviderEntryBase,
  EasyOcrEntry,
  OcrSpaceEntry,
} from "./schema.ts";
export { CONFIG_VERSION, DEFAULT_CONFIG, TIMEOUT_MS_MIN, TIMEOUT_MS_MAX } from "./schema.ts";
export { validateConfig } from "./validate.ts";
export type { BridgeMessage } from "./bridge.ts";
export { STORAGE_KEY, isBridgeMessage } from "./bridge.ts";
