# Contract: Config bridge (React SPA ↔ userscript GM storage)

The userscript `@match`es the config page and runs a bridge there. GM storage is the
source of truth read on the portal (FR-011, SC-005).

## Storage key

`GM_setValue("provider-configuration:v1", JSON.stringify(ProviderConfiguration))`.
On the portal, config is read with `GM_getValue` and validated; absent → `DEFAULT_CONFIG`.

## Dynamic origin (bundle-time)

Single env var `VITE_CONFIG_PAGE_ORIGIN`, **default `http://localhost:3000`** (dev);
production passes the deployed origin at build time. Consumed two ways:

- **Source** (bridge, SPA client): `import.meta.env.VITE_CONFIG_PAGE_ORIGIN` — Vite
  inlines the literal at bundle time.
- **`vite.config.ts`** (userscript `@match`/`@connect`/`homepage`, SPA `base`): cannot
  use `import.meta.env`; reads via `loadEnv(mode, process.cwd(), "VITE_")` with the same
  `?? "http://localhost:3000"` default, then injects the origin into `@match`/`@connect`.

The bridge accepts messages ONLY from `VITE_CONFIG_PAGE_ORIGIN`. The config-page URL is
`${VITE_CONFIG_PAGE_ORIGIN}${BASE}configure.html` (`BASE` = `/` dev, `/uit-student-captcha/` Pages).

## Message protocol (`window.postMessage`)

```ts
type BridgeMessage =
  | { type: "uoc:get" }
  | { type: "uoc:value"; payload: ProviderConfiguration }
  | { type: "uoc:set";   payload: ProviderConfiguration }
  | { type: "uoc:ack";   ok: true }
  | { type: "uoc:error"; message: string };
```

### Flow
1. SPA mounts → posts `{type:"uoc:get"}` to `window` (targetOrigin = own origin).
2. Bridge (userscript) receives, reads GM storage, replies `{type:"uoc:value", payload}`.
3. SPA edits + Save → posts `{type:"uoc:set", payload}`.
4. Bridge validates (`config-core/src/validate.ts`); on success `GM_setValue` + reply
   `{type:"uoc:ack", ok:true}`; on failure `{type:"uoc:error", message}`.

### Security requirements (mandatory)
- Bridge MUST verify `event.origin === VITE_CONFIG_PAGE_ORIGIN` and `event.source === window`.
- Bridge MUST validate payload against the schema before persisting; reject otherwise.
- SPA MUST post with an explicit `targetOrigin` (never `"*"`) and ignore messages from other origins.

## Portal menu command (FR-020)

`GM_registerMenuCommand("Configure OCR providers", () => GM_openInTab(CONFIG_PAGE_URL))`
where `CONFIG_PAGE_URL = VITE_CONFIG_PAGE_ORIGIN + BASE + "configure.html"` (`BASE` = `/`
dev, `/uit-student-captcha/` on Pages — must match the SPA's Vite `base`).
The SPA build MUST actually emit `configure.html` (Vite's default entry is `index.html`,
so configure the input/rename accordingly). `GM_registerMenuCommand` and `GM_openInTab`
MUST be in the userscript `@grant` list (`window.open` is the fallback for the latter).

## Tests
- jsdom: bridge ignores message from a foreign origin (no `GM_setValue`).
- bridge persists a valid `uoc:set` and replies `uoc:ack`.
- bridge replies `uoc:error` on an invalid payload.
- SPA round-trip: `uoc:get` → renders returned config into the form.
