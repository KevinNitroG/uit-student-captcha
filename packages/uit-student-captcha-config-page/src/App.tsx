// Configuration SPA shell. Hydrates the ProviderConfiguration from the userscript via
// the postMessage bridge (uoc:get → uoc:value), edits it locally, and persists with
// uoc:set (→ uoc:ack / uoc:error). See contracts/config-ui.contract.md §A and
// config-bridge.contract.md.

import { useEffect, useMemo, useState } from "react";
import { AddProviderMenu } from "@/components/AddProviderMenu";
import { GlobalSettings } from "@/components/GlobalSettings";
import { ProviderList } from "@/components/ProviderList";
import { SaveBar, type SaveState } from "@/components/SaveBar";
import { VersionWarning } from "@/components/VersionWarning";
import { DEFAULT_CONFIG, validateConfig, type ProviderConfiguration, type ProviderEntry } from "@/config/schema";
import { PostMessageClient, type BridgeClient } from "@/bridge/postMessageClient";

type VersionStatus = "match" | "outdated" | "newer" | "unknown";

function parseVersion(v: string): [number, number, number] | null {
  const parts = v.split(".").map(Number);
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return null;
  return [parts[0]!, parts[1]!, parts[2]!];
}

function compareVersions(script: string | undefined, page: string): VersionStatus {
  if (!script) return "unknown";
  const sv = parseVersion(script);
  const pv = parseVersion(page);
  if (!sv || !pv) return "unknown";
  for (let i = 0; i < 3; i++) {
    if (sv[i]! < pv[i]!) return "outdated";
    if (sv[i]! > pv[i]!) return "newer";
  }
  return "match";
}

export interface AppProps {
  /** Injectable for tests; defaults to the real postMessage bridge client. */
  client?: BridgeClient;
}

export function App({ client }: AppProps = {}) {
  const bridge = useMemo<BridgeClient>(() => client ?? new PostMessageClient(), [client]);
  const [config, setConfig] = useState<ProviderConfiguration | null>(null);
  const [connected, setConnected] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [scriptVersion, setScriptVersion] = useState<string | undefined>(undefined);

  useEffect(() => {
    let settled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const unsubscribe = bridge.onMessage((message) => {
      if (message.type === "uoc:value") {
        settled = true;
        if (timer) clearInterval(timer);
        setConfig(validateConfig(message.payload));
        setConnected(true);
        setDirty(false);
        setSave({ kind: "idle" });
        setScriptVersion(message.scriptVersion);
      } else if (message.type === "uoc:ack") {
        setSave({ kind: "saved" });
        setDirty(false);
      } else if (message.type === "uoc:error") {
        setSave({ kind: "error", message: message.message });
      }
    });

    // The userscript bridge attaches at document-idle, which can race the SPA's first
    // request. Re-ask until the bridge answers (or we give up and show "not detected").
    bridge.requestConfig();
    let attempts = 0;
    timer = setInterval(() => {
      if (settled || attempts >= 15) {
        clearInterval(timer);
        return;
      }
      attempts += 1;
      bridge.requestConfig();
    }, 400);

    return () => {
      if (timer) clearInterval(timer);
      unsubscribe();
    };
  }, [bridge]);

  const current = config ?? DEFAULT_CONFIG;
  const versionStatus = compareVersions(scriptVersion, __PAGE_VERSION__);

  function update(next: ProviderConfiguration): void {
    setConfig(next);
    setDirty(true);
    setSave({ kind: "idle" });
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          UIT Student Captcha — Configuration
        </h1>
        <p className="text-sm text-muted-foreground">
          Settings are saved to your userscript manager. Keep this tab open while saving.{" "}
          {connected ? (
            <span className="text-green-700">● Connected to userscript</span>
          ) : (
            <span className="text-amber-600">
              ○ Userscript not detected — install/enable it, then reload this page.
            </span>
          )}
        </p>
      </header>

      {versionStatus === "outdated" && scriptVersion && (
        <VersionWarning
          scriptVersion={scriptVersion}
          pageVersion={__PAGE_VERSION__}
          updateUrl={__UPDATE_URL__}
        />
      )}

      <GlobalSettings
        timeoutMs={current.timeoutMs}
        onChange={(timeoutMs) => update({ ...current, timeoutMs })}
        lowercaseResult={current.lowercaseResult}
        onLowercaseChange={(lowercaseResult) => update({ ...current, lowercaseResult })}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-medium">
          Providers (top = primary, then the fallback chain)
        </h2>
        <ProviderList
          providers={current.providers}
          onChange={(providers: ProviderEntry[]) => update({ ...current, providers })}
        />
        <AddProviderMenu
          onAdd={(entry) => update({ ...current, providers: [...current.providers, entry] })}
        />
      </section>

      <SaveBar
        dirty={dirty}
        state={save}
        onSave={() => bridge.saveConfig(current)}
        onReset={() => update(DEFAULT_CONFIG)}
      />
    </main>
  );
}
