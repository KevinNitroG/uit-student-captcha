<!--
SYNC IMPACT REPORT
==================
Version change: 1.1.0 → 1.2.0
Bump rationale: Restructured into a pnpm + Nx monorepo (userscript package + hosted
React config-page package); replaced semantic-release with Nx Release (fixed group,
git-tag versioning); typecheck via the @nx/js/typescript plugin (tsgo compiler).
Materially expanded platform & workflow guidance → MINOR.

Modified principles:
  - III. Strict Type Safety — rationale updated; type safety is no longer the *only* safety
    net now that a unit-test harness exists.

Added sections:
  - Testing Discipline (new top-level section)

Removed sections: none

Templates requiring updates:
  - ✅ .specify/templates/plan-template.md (Constitution Check is generic; aligns)
  - ✅ .specify/templates/spec-template.md (no constitution-specific edits required)
  - ✅ .specify/templates/tasks-template.md (task categories compatible)

Follow-up TODOs: none

(History: 1.0.0 — initial ratification, template placeholders → concrete principles.)
-->

# UIT Student Captcha Constitution

## Core Principles

### I. MVVM Architecture & Separation of Concerns

The userscript MUST follow the Model-View-ViewModel pattern with strict layer boundaries:

- **Model**: Captcha-resolution providers, configuration, and data contracts. Models MUST be
  free of DOM access and framework/userscript-host concerns.
- **ViewModel**: Orchestrates the workflow (detect form → fetch captcha → resolve → autofill).
  It exposes state and intent, and MUST NOT manipulate the DOM directly.
- **View**: Thin adapter that binds to the target page DOM (`https://student.uit.edu.vn/*`),
  reads inputs, and applies outputs. The View MUST contain no resolution or business logic.

Rationale: A signin/captcha flow touches fragile, third-party DOM. Isolating volatile DOM
selectors in the View keeps resolution logic stable and testable when the page changes.

### II. Provider Abstraction & Extensibility (NON-NEGOTIABLE)

Captcha resolution MUST be expressed behind a single stable interface (e.g. a
`CaptchaResolver` contract). Concrete resolvers — external APIs today, OCR/ML or other
backends tomorrow — MUST be interchangeable implementations selected via configuration.

- Adding a new resolver MUST NOT require editing the ViewModel, View, or existing resolvers.
- No resolver-specific branching (`if provider === 'x'`) is permitted outside a single
  registry/factory boundary.
- Each resolver MUST declare its own configuration shape and fail loudly on missing config.

Rationale: The project's explicit purpose is extensibility across resolution backends; an
open/closed boundary is the mechanism that guarantees it.

### III. Strict Type Safety

The codebase MUST be TypeScript under `strict` mode. Public contracts between MVVM layers and
resolvers MUST be explicitly typed. `any` is prohibited except at clearly annotated external
boundaries (untyped DOM/host APIs), where it MUST be narrowed immediately. `pnpm tsc` (or the
equivalent `tsc --noEmit`) MUST pass with zero errors before any change is considered done.

Rationale: Type contracts are the first safety net — alongside the unit-test harness (see
Testing Discipline) — for a project that integrates with shifting external APIs and DOM.

### IV. Configurability

User-tunable behavior MUST be data, not hardcoded constants. Resolver selection, API
endpoints, credentials/keys, retry counts, and timeouts MUST be configurable. Configuration
MUST have typed defaults and validation, and secrets MUST NOT be committed to the repository.

Rationale: Different users will use different captcha backends and credentials; configuration
is the seam that makes one codebase serve all of them.

### V. Minimal Footprint & Safe DOM Interaction

The script MUST be a good citizen on the host page:

- Run at the documented lifecycle point (`run-at` per `vite.config.ts`) and avoid blocking the
  page.
- Guard every DOM access; missing/changed selectors MUST degrade gracefully, never throw
  uncaught into the host page.
- Request only the `grant` privileges actually required; new privileges MUST be justified.
- Never autosubmit credentials without the behavior being explicit and configurable.

Rationale: A userscript injected into a live student portal must fail safe and avoid
disrupting or compromising the user's session.

## Technology & Platform Constraints

- **Repository**: pnpm + Nx monorepo. `packages/uit-student-captcha` is the userscript;
  `packages/uit-student-captcha-config-page` is a React + Vite SPA deployed to GitHub Pages
  that configures the userscript. Tasks run through Nx (`nx run-many -t typecheck test build`)
  with inference plugins: `@nx/js/typescript` (typecheck, tsgo), `@nx/vite` (build/serve),
  `@nx/vitest` (test).
- **Language**: TypeScript, compiled via Vite with `vite-plugin-monkey` (userscript) and
  `@vitejs/plugin-react` (config page).
- **Build**: The userscript bundle is produced by `vite build` (orchestrated by Nx); the
  script header is declared in the package's `vite.config.ts` (`monkey({ userscript: { ... } })`)
  — header/match/grant/connect changes live there, not scattered in source.
- **Target**: Tampermonkey/Violentmonkey-compatible userscript matching
  `https://student.uit.edu.vn/*` and the hosted config page
  `https://kevinnitrog.github.io/uit-student-captcha/*`.
- **Dependencies**: Keep runtime dependencies minimal; prefer the platform/host APIs. New
  runtime dependencies MUST be justified against bundle size and userscript constraints.
- **Versioning**: Releases are driven by **Nx Release** with Conventional Commits — a single
  fixed release group versions both packages together under one `v{version}` git tag. The
  current version is resolved from git tags (disk fallback); Nx writes it into `package.json`
  at release time, from which the userscript `version` header derives.

## Testing Discipline

Unit tests run on Node with **Vitest** using the **jsdom** environment to simulate the browser.

- The View's DOM interactions and the ViewModel's orchestration MUST be unit-testable against a
  jsdom-simulated DOM; tests MUST NOT depend on a live browser or the real student portal.
- External captcha resolvers and host/userscript APIs MUST be **mocked** (`vi.mock` / fakes) so
  resolution logic is tested deterministically without network calls.
- New resolvers MUST ship with unit tests covering success, failure, and missing-config paths.
- Tests live alongside or under a dedicated test path and MUST pass before a change is done.

Rationale: jsdom on Node gives fast, deterministic coverage of DOM-bound and orchestration
logic that would otherwise only be exercisable by hand in a real browser session.

## Development Workflow

- Commits MUST follow Conventional Commits (feat/fix/chore/docs/refactor…) so Nx Release
  can version correctly.
- Every change MUST pass `pnpm exec nx run-many -t typecheck test build` (tsgo typecheck,
  the Vitest suite, and a successful Vite build) across all affected packages.
- Changes touching DOM selectors MUST be isolated to the View layer and noted in the commit.
- Adding a resolver MUST include its config schema and registration in the resolver
  registry/factory — and nothing in the ViewModel/View.

## Governance

This constitution supersedes ad-hoc practices for this repository. All changes — including
PRs and reviews — MUST verify compliance with the principles above; any deviation MUST be
justified in writing (and, for plans, recorded in the plan's Complexity Tracking table).

Amendments MUST be made by editing this file with an updated Sync Impact Report and a version
bump per semantic versioning:

- **MAJOR**: Backward-incompatible governance/principle removal or redefinition.
- **MINOR**: New principle or materially expanded guidance.
- **PATCH**: Clarifications and non-semantic refinements.

Compliance is reviewed at every plan and PR. When guidance here conflicts with convenience,
this document wins.

**Version**: 1.2.0 | **Ratified**: 2026-06-11 | **Last Amended**: 2026-06-12
