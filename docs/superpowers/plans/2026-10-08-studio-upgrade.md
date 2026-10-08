# urbanscan Studio Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Deliver the approved efficiency, responsive design, palette and world expansion.
**Architecture:** Keep the canonical URL/QR protocol in Core. Keep GPU lifetime ownership in the shared renderer, lightweight control metadata outside shader imports, and new visual worlds in lazy bundles. Application preferences are separate from world identity.
**Tech Stack:** TypeScript, React 19, CSS, Vite, pnpm, WebGPU/WGSL, Vitest, local Playwright/QR decoding.

## Task 1: reliability and baseline compatibility
Files: renderer.ts, core generator-version.ts if versioning is required, shader loader snapshots, lifecycle tests, package.json and apps/web/package.json.
- [ ] Reproduce existing nine failures; inspect original released v1 source and retain golden fingerprints.
- [ ] Make initialization own its resources as soon as allocated and clean them on error; frame failures invoke onError once after stopping animation and releasing resources.
- [ ] Cache depthView in RenderTargets; use it in both passes.
- [ ] Root build compiles packages once; standalone demo build still compiles dependencies.
- [ ] Run lifecycle and full tests, typecheck and lint; review spec compliance and code quality.

Allocation rollback pattern:
```ts
const allocated = new Set<{ destroy(): void }>();
try {
  // Register resources immediately after creation in the allocation implementation.
  return resources;
} catch (error) {
  for (const resource of allocated) resource.destroy();
  releaseGpuDevice(device);
  throw error;
}
```
Commands: `pnpm exec vitest run`, `pnpm exec tsc --noEmit`, `pnpm lint`.
Acceptance: no new failures, and preserved v1 shader hashes.

## Task 2: studio shell and state
Files: apps/web/src/app.tsx, styles.css, new studio controls/catalog/preferences files, packages/react/src/every-qr-code.tsx and tests.
- [ ] Separate draft URL from submitted URL; validate before committing.
- [ ] Implement token themes and persisted appearance; previous output remains while editing.
- [ ] Desktop preview/editor split; mobile preview/scrollable editing controls; categorized world cards.
- [ ] Expose actual renderer loading, retry, zoom and reveal state, replay only when supported.
- [ ] Verify touch targets, keyboard focus, no clipping, valid-submit behavior, all appearance themes.

State transition:
```ts
const [draftUrl, setDraftUrl] = useState(DEFAULT_LINK);
const [url, setUrl] = useState(DEFAULT_LINK);
const [view, setView] = useState<EveryQRCodeView>("model");
```
Commands: `pnpm exec tsc --noEmit`, `pnpm lint`, browser layout checks at 1440x900, 390x844, 320x568 and 844x390.

## Task 3: palette expansion
Files: world-palettes.ts, new supplemental palette data, staged-world.ts, world-palettes.test.ts (preserve existing edits).
- [ ] Add 24 palettes with explicit existing material directions.
- [ ] Keep existing first-four palette defaults and seeded selection stable.
- [ ] Test identifiers, count, color bounds, and legacy seeded choices.

Seed selection compatibility:
```ts
const families = getPalettesForModel(form).slice(0, 4);
```
Command: `pnpm exec vitest run packages/renderer-webgpu/src/world-palettes.test.ts`.

## Task 4: new worlds
Files: waves/crystalline/mechanical model and shader bundles/tests, seed-model.ts, renderer registry/passes, prepared-scene.ts, palettes, catalog, React/Web Component types.
- [ ] Implement deterministic bounded layouts and expressive geometry/motion for each approved world.
- [ ] Register three lazy bundles and add four named palettes for each.
- [ ] Expose all worlds consistently in React, custom element and app.
- [ ] Confirm world restoration, interrupted transitions, deterministic geometry, and exact scan endpoints.

New selector values:
```ts
type NewWorld = "waves" | "crystalline" | "mechanical";
```
Commands: targeted model tests, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`.
Browser acceptance: decode all 12 new palette endpoints and representative long URLs.

## Task 5: review and delivery
- [ ] Complete spec compliance review, then code quality review; fix findings and recheck.
- [ ] Update architecture/model docs and record actual verification evidence.
- [ ] Preserve unrelated changes; report completed functionality and remaining material limitations.

