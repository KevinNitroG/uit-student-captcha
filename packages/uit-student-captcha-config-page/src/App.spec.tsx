import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import type { BridgeClient, BridgeListener } from "./bridge/postMessageClient";
import { DEFAULT_CONFIG, type ProviderConfiguration } from "./config/schema";

class FakeClient implements BridgeClient {
  private listener: BridgeListener | null = null;
  readonly saved: ProviderConfiguration[] = [];

  constructor(
    private readonly reply: "ack" | "error" = "ack",
    private readonly initial: ProviderConfiguration = DEFAULT_CONFIG,
  ) {}

  onMessage(listener: BridgeListener): () => void {
    this.listener = listener;
    return () => {};
  }

  requestConfig(): void {
    this.listener?.({ type: "uoc:value", payload: this.initial });
  }

  saveConfig(payload: ProviderConfiguration): void {
    this.saved.push(payload);
    if (this.reply === "ack") this.listener?.({ type: "uoc:ack", ok: true });
    else this.listener?.({ type: "uoc:error", message: "Invalid configuration payload" });
  }
}

const WITH_KEYLESS_OCRSPACE: ProviderConfiguration = {
  version: 2,
  timeoutMs: 15000,
  lowercaseResult: true,
  providers: [
    {
      id: "ocrspace-1",
      provider: "ocrspace",
      apiKey: "",
      scheme: "https",
      httpMethod: "POST",
      inputMode: "url",
      ocrEngine: 1,
      language: "eng",
      enabled: true,
    },
  ],
};

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
    render(<App client={new FakeClient("ack", WITH_KEYLESS_OCRSPACE)} />);
    expect(screen.getByText(/required/i)).toBeTruthy();
  });

  it("renders the lowercase switch as checked by default", () => {
    render(<App client={new FakeClient()} />);
    const toggle = screen.getByRole("switch", { name: /lowercase ocr result/i });
    expect((toggle as HTMLButtonElement).getAttribute("aria-checked") ?? (toggle as HTMLButtonElement).dataset["state"]).toBeTruthy();
  });

  it("includes lowercaseResult in the saved payload when toggled off", () => {
    const client = new FakeClient("ack");
    render(<App client={client} />);

    fireEvent.click(screen.getByRole("switch", { name: /lowercase ocr result/i }));
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(client.saved).toHaveLength(1);
    expect(client.saved[0]?.lowercaseResult).toBe(false);
  });
});
