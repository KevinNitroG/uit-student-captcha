// SPA side of the config bridge (contracts/config-bridge.contract.md). Posts uoc:get /
// uoc:set to the userscript with an explicit targetOrigin (never "*") and delivers
// origin-filtered, shape-validated replies to a listener. The userscript runs the
// matching ConfigBridge on this same page and reads/writes GM storage.

import {
  isBridgeMessage,
  type BridgeMessage,
  type ProviderConfiguration,
} from "uit-student-captcha-config-core";

export type BridgeListener = (message: BridgeMessage) => void;

export interface BridgeClient {
  onMessage(listener: BridgeListener): () => void;
  requestConfig(): void;
  saveConfig(payload: ProviderConfiguration): void;
}

export class PostMessageClient implements BridgeClient {
  private readonly origin: string;
  private readonly win: Window;

  constructor(origin: string = window.location.origin, win: Window = window) {
    this.origin = origin;
    this.win = win;
  }

  /** Subscribe to validated, same-origin bridge replies. Returns an unsubscribe fn. */
  onMessage(listener: BridgeListener): () => void {
    const handler = (event: MessageEvent): void => {
      if (event.origin !== this.origin) return;
      if (!isBridgeMessage(event.data)) return;
      listener(event.data);
    };
    this.win.addEventListener("message", handler);
    return () => this.win.removeEventListener("message", handler);
  }

  requestConfig(): void {
    const message: BridgeMessage = { type: "uoc:get" };
    this.win.postMessage(message, this.origin);
  }

  saveConfig(payload: ProviderConfiguration): void {
    const message: BridgeMessage = { type: "uoc:set", payload };
    this.win.postMessage(message, this.origin);
  }
}
