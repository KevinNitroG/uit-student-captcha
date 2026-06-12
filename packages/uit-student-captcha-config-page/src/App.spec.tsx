import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import type { BridgeClient, BridgeListener } from "./bridge/postMessageClient";
import { DEFAULT_CONFIG, type ProviderConfiguration } from "./config/schema";

class FakeClient implements BridgeClient {
  private listener: BridgeListener | null = null;
  readonly saved: ProviderConfiguration[] = [];

  constructor(private readonly reply: "ack" | "error" = "ack") {}

  onMessage(listener: BridgeListener): () => void {
    this.listener = listener;
    return () => {};
  }

  requestConfig(): void {
    this.listener?.({ type: "uoc:value", payload: DEFAULT_CONFIG });
  }

  saveConfig(payload: ProviderConfiguration): void {
    this.saved.push(payload);
    if (this.reply === "ack") this.listener?.({ type: "uoc:ack", ok: true });
    else this.listener?.({ type: "uoc:error", message: "Invalid configuration payload" });
  }
}

describe("App", () => {
  it("hydrates from uoc:get and renders the returned config", () => {
    render(<App client={new FakeClient()} />);
    expect(screen.getByRole("heading", { name: /configuration/i })).toBeTruthy();
    expect((screen.getByLabelText(/timeout/i) as HTMLInputElement).value).toBe("15000");
    expect(screen.getByText(/connected to userscript/i)).toBeTruthy();
  });

  it("posts uoc:set on Save and shows the ack", () => {
    const client = new FakeClient("ack");
    render(<App client={client} />);

    fireEvent.change(screen.getByLabelText(/timeout/i), { target: { value: "20000" } });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(client.saved).toHaveLength(1);
    expect(client.saved[0]?.timeoutMs).toBe(20000);
    expect(screen.getByText("✓ Saved")).toBeTruthy();
  });

  it("surfaces a uoc:error reply", () => {
    const client = new FakeClient("error");
    render(<App client={client} />);

    fireEvent.change(screen.getByLabelText(/timeout/i), { target: { value: "20000" } });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(screen.getByText(/invalid configuration/i)).toBeTruthy();
  });

  it("flags an empty required key with a ⚠ warning", () => {
    render(<App client={new FakeClient()} />);
    expect(screen.getByText(/required/i)).toBeTruthy();
  });
});
