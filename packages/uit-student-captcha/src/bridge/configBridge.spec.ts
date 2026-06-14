import { describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG, STORAGE_KEY } from "uit-student-captcha-config-core";
import { ConfigBridge } from "./configBridge.ts";
import { installFakeGm } from "../../test/helpers/mocks.ts";

const ALLOWED = "https://config.example";

function setup() {
  const gm = installFakeGm();
  const postMessage = vi.fn();
  const target = { postMessage, addEventListener: vi.fn() } as unknown as Window;
  const bridge = new ConfigBridge({ allowedOrigin: ALLOWED, target });
  return { bridge, target, postMessage, gm };
}

function event(data: unknown, origin: string, source: unknown): MessageEvent {
  return { data, origin, source } as unknown as MessageEvent;
}

describe("ConfigBridge", () => {
  it("ignores messages from a foreign origin (no GM write, no reply)", () => {
    const { bridge, target, postMessage, gm } = setup();
    bridge.handle(event({ type: "uoc:set", payload: DEFAULT_CONFIG }, "https://evil.example", target));
    expect(gm.store[STORAGE_KEY]).toBeUndefined();
    expect(postMessage).not.toHaveBeenCalled();
  });

  it("persists a valid uoc:set and replies uoc:ack", () => {
    const { bridge, target, postMessage, gm } = setup();
    bridge.handle(event({ type: "uoc:set", payload: DEFAULT_CONFIG }, ALLOWED, target));
    expect(gm.store[STORAGE_KEY]).toBeDefined();
    expect(postMessage).toHaveBeenCalledWith({ type: "uoc:ack", ok: true }, ALLOWED);
  });

  it("replies uoc:error on an invalid payload without writing", () => {
    const { bridge, target, postMessage, gm } = setup();
    bridge.handle(event({ type: "uoc:set", payload: "not-an-object" }, ALLOWED, target));
    expect(gm.store[STORAGE_KEY]).toBeUndefined();
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "uoc:error" }),
      ALLOWED,
    );
  });

  it("answers uoc:get with the stored configuration and scriptVersion", () => {
    const { bridge, target, postMessage } = setup();
    bridge.handle(event({ type: "uoc:get" }, ALLOWED, target));
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "uoc:value", scriptVersion: "test-version" }),
      ALLOWED,
    );
  });
});
