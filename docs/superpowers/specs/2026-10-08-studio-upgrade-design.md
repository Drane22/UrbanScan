# urbanscan studio upgrade
Date: 2026-10-08 (Asia/Manila).
Status: approved by the user's "continue" following the review report and proposed direction.

## Approved scope
Complete the staged upgrade: reliability and efficiency fixes, a desktop/mobile studio redesign, three application appearances, twenty-four curated palettes for the twelve existing worlds, and Waves, Crystalline, and Mechanical geometry worlds. Feature suggestions remain a roadmap, not implied implementation of accounts, analytics, batch exports, or offline caching.

## Stage 1: renderer reliability
Make allocations exception-safe, roll back partial buffers/textures, and send resize/render/submission failures through the existing onError callback and fallback. Cache the depth view with each render target. Preserve shared GPU leases, lazy pipelines, scene caching, offscreen pausing, and QR idle stopping. Remove duplicate package compilation in root builds while maintaining standalone demo builds.
Baseline: 219/228 tests pass; Tree/Terrain shader fingerprints and seven renderer-source assertions fail. Investigate the released shader snapshots and preserve generator v1 fingerprints. Preserve current desired visuals under a newer generator version if needed. Do not replace golden values to hide regressions.

## Stage 2: responsive studio
Keep a prominent world preview next to a narrower desktop editing panel. On mobile, stack the preview and controls and permit document scrolling in landscape and with the keyboard open. Destination editing commits only on Generate. Retain valid output during draft editing; inline validation prevents invalid submission. Put samples, grouped world cards, palettes, replay, zoom, and explicit QR reveal within accessible controls. Keep technical data in QR details.
Use Paper, Midnight, and Lavender token themes with local preference persistence and accessible text/focus contrast. Target 44px controls. Use Plus Jakarta Sans when available, geometric/system fallbacks, precise SVG line icons, nested surface enclosures, and restrained transform/opacity feedback respecting reduced motion. No expensive scrolling blur.
Concentrate lightweight name/category/capability metadata without importing shader bundles. Add adapter readiness feedback where necessary so loading/retry communicates actual renderer readiness.

## Stage 3: expanded worlds
Add two palettes per existing world with explicit material direction 0-3, rather than deriving new direction from array position. Keep the first four palettes as the legacy seeded selection pool. Four palettes per new world.
Waves: a tile with seeded curling wave ribbons, layered water and foam, gently moving surface details. No fluid simulation.
Crystalline: varied faceted mineral clusters, small crystals, distinct highlights and drifting sparkles. Begin with opaque faceted materials.
Mechanical: miniature plates, rails, rotating gears, pistons, vents and moving ambient mechanisms with bounded paths.
Each world has deterministic model/layout preparation, its own lazy shader entry, React and Web Component selection support, and a reversible transition to the same exact canonical QR. Reuse neutral geometry/renderer infrastructure; do not copy an existing world's appearance and label it a new model.

## Verification
Meaningful tests cover failed initialization cleanup with another live renderer, frame errors and adapter fallback, resized targets/view reuse, palette/catalog/version consistency, deterministic new layouts, and submitted versus draft URL behavior. Run full tests, TypeScript, lint, formatting and production builds. Inspect desktop/mobile/landscape layouts, all appearance themes, rapid model switches, interrupted QR reversal and reduced motion. Decode browser-rendered QR endpoints for all new palettes and representative payload lengths. Report any remaining failures precisely.

## Preservation
Retain the user's pre-existing modified world-palettes.test.ts and untracked prior specs, tests and QA scripts. Add review documentation and stage only our changes for any commits. No deployment or push is authorized.

