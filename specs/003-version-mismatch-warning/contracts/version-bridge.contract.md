# Contract: Version Exchange via Config Bridge

**Feature**: `003-version-mismatch-warning` | **Date**: 2026-06-14

This contract extends the existing config bridge contract defined in
`specs/001-captcha-ocr-autofill/contracts/config-bridge.contract.md`. Only the delta is
documented here.

---

## §A — Extended Message Type

### `uoc:value` (userscript → SPA) — extended

The `uoc:value` message gains one optional field:

```typescript
{ type: "uoc:value"; payload: ProviderConfiguration; scriptVersion?: string }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"uoc:value"` | yes | Unchanged discriminant |
| `payload` | `ProviderConfiguration` | yes | Unchanged config payload |
| `scriptVersion` | `string` | **no** | Semver string of the running userscript, e.g. `"1.3.0"`. Absent on old builds. |

**Backward compatibility**: Old userscript builds that do not set `scriptVersion` send
`{ type: "uoc:value", payload: ... }` — the SPA treats the absent field as `"unknown"` status
and shows no version warning.

---

## §B — Message Flow (unchanged sequence, enriched payload)

```
SPA                       Userscript
 |                            |
 |----  uoc:get  ------------>|
 |<--- uoc:value + scriptVersion (if new build) ---|
 |                            |
```

No additional round-trip. The version piggybacks on the existing handshake.

---

## §C — `isBridgeMessage` Type Guard

The guard in `config-core/src/bridge.ts` must continue to accept `uoc:value` messages with
or without `scriptVersion`. The shape check already tests only for `type === "uoc:value"`;
the optional extra field does not break the guard — no change needed to the guard's logic,
only to the TypeScript type.

---

## §D — SPA Version Comparison Contract

The SPA MUST compute `VersionStatus` from `scriptVersion` and `__PAGE_VERSION__` using the
following rules (in order):

1. If `scriptVersion` is `undefined` or not parseable as `M.N.P` → `"unknown"`
2. If `parse(scriptVersion) === parse(__PAGE_VERSION__)` → `"match"`
3. If `parse(scriptVersion) < parse(__PAGE_VERSION__)` → `"outdated"`
4. Otherwise → `"newer"`

Parse: split on `"."`, take first three segments, convert to integer. Non-integer segments
produce `NaN`, which the comparison MUST treat as `"unknown"`.

---

## §E — Build-time Constants (config page)

The config page Vite build MUST inject two global constants:

| Constant | Value |
|----------|-------|
| `__PAGE_VERSION__` | The `version` field from the root `package.json` at build time |
| `__UPDATE_URL__` | `"https://github.com/KevinNitroG/uit-student-captcha/releases/latest/download/uit-student-captcha.user.js"` |

Both MUST be declared in `src/vite-env.d.ts` as `declare const`.

The userscript Vite build MUST inject:

| Constant | Value |
|----------|-------|
| `__SCRIPT_VERSION__` | The `version` field from `./package.json` at build time |

This MUST be declared in the userscript's `src/vite-env.d.ts` as `declare const`.

---

## §F — Warning Banner Contract (UI)

When `versionStatus === "outdated"` the config page MUST render a warning element with:
- The detected userscript version (`scriptVersion`)
- The expected page version (`__PAGE_VERSION__`)
- A hyperlink whose `href` is `__UPDATE_URL__` and whose text conveys "update/install"
- A dismiss control that hides the banner for the remainder of the page session

The banner MUST NOT disable any configuration control. All settings remain editable and saveable regardless of `versionStatus`.
