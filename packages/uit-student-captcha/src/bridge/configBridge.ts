// Userscript side of the config bridge (contracts/config-bridge.contract.md). Runs on
// the hosted config page. It is a trust boundary: it accepts messages ONLY from the
// config-page origin and the page window, validates every payload with validateConfig
// before GM_setValue, and replies over postMessage. GM storage is the single source of
// truth the portal reads.

import {
  isBridgeMessage,
  STORAGE_KEY,
  validateConfig,
  type BridgeMessage,
  type ProviderConfiguration,
} from "uit-student-captcha-config-core";
import { gmGetValue, gmSetValue } from "../platform/gm.ts";

export interface ConfigBridgeOptions {
  /** The exact origin (scheme://host[:port]) the SPA is served from. */
  readonly allowedOrigin: string;
  /** Window used to receive/post messages (defaults to the global window). */
  readonly target?: Window;
}

export class ConfigBridge {
  private readonly allowedOrigin: string;
  private readonly target: Window;

  constructor(options: ConfigBridgeOptions) {
    this.allowedOrigin = options.allowedOrigin;
    this.target = options.target ?? window;
  }

  start(): void {
    this.target.addEventListener("message", (event) => this.handle(event as MessageEvent));
  }

  private reply(message: BridgeMessage): void {
    this.target.postMessage(message, this.allowedOrigin);
  }

  private loadConfig(): ProviderConfiguration {
    const stored = gmGetValue(STORAGE_KEY, "");
    if (!stored) return validateConfig(null);
    try {
      return validateConfig(JSON.parse(stored));
    } catch {
      return validateConfig(null);
    }
  }

  handle(event: MessageEvent): void {
    // Trust boundary: reject anything not from the config-page origin/window.
    if (event.origin !== this.allowedOrigin) return;
    if (event.source !== this.target) return;
    if (!isBridgeMessage(event.data)) return;

    const message = event.data;
    switch (message.type) {
      case "uoc:get":
        this.reply({ type: "uoc:value", payload: this.loadConfig() });
        return;
      case "uoc:set": {
        const payload: unknown = message.payload;
        if (typeof payload !== "object" || payload === null) {
          this.reply({ type: "uoc:error", message: "Invalid configuration payload" });
          return;
        }
        const validated = validateConfig(payload);
        gmSetValue(STORAGE_KEY, JSON.stringify(validated));
        this.reply({ type: "uoc:ack", ok: true });
        return;
      }
      default:
        // uoc:value / uoc:ack / uoc:error are bridge→SPA; ignore if echoed back.
        return;
    }
  }
}
