// Cross-boundary contract for the config page <-> userscript bridge.
// See specs/001-captcha-ocr-autofill/contracts/config-bridge.contract.md and data-model.md §5.

import type { ProviderConfiguration } from "./schema.ts";

/** GM storage key holding the JSON-serialized ProviderConfiguration (the portal reads this). */
export const STORAGE_KEY = "provider-configuration:v1";

/** Messages exchanged over window.postMessage between the SPA and the userscript bridge. */
export type BridgeMessage =
  | { readonly type: "uoc:get" }
  | { readonly type: "uoc:value"; readonly payload: ProviderConfiguration; readonly scriptVersion?: string }
  | { readonly type: "uoc:set"; readonly payload: ProviderConfiguration }
  | { readonly type: "uoc:ack"; readonly ok: true }
  | { readonly type: "uoc:error"; readonly message: string };

/** Narrow an unknown postMessage payload to a BridgeMessage (shape check only). */
export function isBridgeMessage(value: unknown): value is BridgeMessage {
  if (typeof value !== "object" || value === null) return false;
  const type = (value as { type?: unknown }).type;
  return (
    type === "uoc:get" ||
    type === "uoc:value" ||
    type === "uoc:set" ||
    type === "uoc:ack" ||
    type === "uoc:error"
  );
}
