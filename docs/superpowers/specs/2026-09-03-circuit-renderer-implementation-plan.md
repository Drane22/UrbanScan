# Circuit Renderer Redesign Implementation Plan

**Design source:** `docs/superpowers/specs/2026-09-03-circuit-renderer-redesign.md`  
**Scope:** Circuit only  
**Working-tree constraint:** Preserve all existing uncommitted renderer edits. Replace Circuit files
deliberately; do not stage or rewrite unrelated renderer changes.

## Outcome

Replace Circuit's current one-cell/four-box renderer with a dedicated, deterministic PCB scene:

- one beveled board and recessed pedestal;
- three composed processor landmarks;
- curated supporting component instances;
- bounded copper routes and purposeful signal paths;
- a compact manufactured-material atlas;
- separate board, trace, component, and signal rendering passes;
- a staged electrical world-to-QR transition with independently choreographed reverse timing.

The final QR endpoint, public renderer API, deterministic identity, and lazy-loading behavior remain
compatible with the existing package.

## Task 1: Lock the New Circuit Data Contract with Tests

**Files:**

- Modify: `packages/renderer-webgpu/src/circuit-model.test.ts`
- Modify: `packages/renderer-webgpu/src/circuit-model.ts`

### Tests first

Replace cell-centric assertions with scene-level requirements:

1. The same seed returns deeply equal board, zone, processor, component, trace, and signal data.
2. Different URLs produce a different composition seed or curated layout selection.
3. Exactly three hero processors occupy the three finder regions.
4. All major components stay within the board boundary and outside other major footprints.
5. Every trace stays within the board and avoids processor keep-out regions except at valid
   endpoints.
6. Every signal route references an existing routed path and connects a hero processor to another
   processor or major functional zone.
7. Sparse and dense QR inputs remain under explicit component and trace-count caps.
8. Packed GPU arrays have documented strides and lengths matching their item counts.
9. A deliberately overcrowded composition selects the simpler approved fallback template.

### Model contract

Define explicit scene types:

- `CircuitBoard`
- `CircuitZone`
- `CircuitProcessor`
- `CircuitComponent`
- `CircuitTraceSegment`
- `CircuitSignalRoute`
- `CircuitLayout`

`CircuitLayout` exposes typed CPU descriptions plus packed GPU arrays and counts for processors,
components, traces, and signals. Export stride constants so tests and shaders share a documented
packing contract.

Do not preserve `CircuitCell` or `cellData` merely for compatibility; they are internal and embody
the rejected architecture. Preserve only public exports that are used outside this package, as
verified with `rg` before removal.

## Task 2: Implement Deterministic Board Composition

**Files:**

- Modify: `packages/renderer-webgpu/src/circuit-model.ts`
- Modify: `packages/renderer-webgpu/src/circuit-model.test.ts`

### Composition templates

Implement a small curated set of board templates, such as balanced, diagonal-flow, and
split-power. Each template defines functional-zone anchors, preferred bus corridors, density caps,
and connector edges. The URL seed selects a template and valid component variants; it never creates
unbounded coordinates, colors, rotations, or heights.

### Hero processors

Map finder regions to three coherent processor records rather than 7x7 collections of tall cells.
Give each processor a package footprint, inset die, pin style, cooling-detail variant, and nearby
power-routing anchor. Use valid quarter-turn rotations only.

### Supporting component placement

Add deterministic placement for approved families:

- low IC packages;
- heat sinks;
- capacitor and resistor clusters;
- shields;
- board-edge connectors;
- sparse daughterboards;
- via and solder clusters.

Use occupancy and keep-out grids to prevent major overlap. Apply tiered density budgets based on QR
size, not a random per-cell decision. If placement attempts exceed a strict limit, omit secondary
detail or choose the simpler layout; never loop without a bound.

### QR ownership

Every component and route receives a deterministic target module region used by the morph. The
world state can span multiple modules, but the scan-lock state must be derived directly from the
existing canonical block types and positions rather than reconstructed from the decorative scene.

## Task 3: Build and Verify the Routing System

**Files:**

- Add: `packages/renderer-webgpu/src/circuit-routing.ts`
- Add: `packages/renderer-webgpu/src/circuit-routing.test.ts`
- Modify: `packages/renderer-webgpu/src/circuit-model.ts`

Implement an isolated grid router with explicit inputs: board bounds, route endpoints, keep-out
rectangles, preferred corridors, seed, width class, and bend policy. Its output is a list of
axis-aligned or 45-degree trace segments and via/junction records.

Routing priorities are:

1. connect each hero processor to at least one major zone;
2. connect at least one hero processor pair;
3. connect supporting ICs and daughterboards;
4. add decorative secondary buses only while under the density cap.

Unit tests cover bounds, deterministic output, legal bends, keep-out avoidance, endpoint
termination, no zero-length segments, density caps, and fallback behavior when no preferred route
exists.

## Task 4: Add a Compact Authored Material Atlas

**Files:**

- Add: `packages/renderer-webgpu/src/circuit-material-atlas.ts`
- Add: `packages/renderer-webgpu/src/circuit-material-atlas.test.ts`
- Modify: `packages/renderer-webgpu/src/renderer.ts`

Create a small, code-owned RGBA atlas whose tiles are intentionally authored for:

- black fiberglass weave and roughness variation;
- molded charcoal plastic grain;
- horizontal and vertical brushed metal;
- ceramic micro-variation;
- solder irregularity and etched/silkscreen markings.

Keep the atlas compact and deterministic. Generate its byte buffer from fixed authored tile rules so
the package does not require a network fetch or bundler-specific asset loader. Tests verify atlas
dimensions, tile bounds, byte stability, channel ranges, and that tiles are not flat colors.

In `renderer.ts`, create and upload the GPU texture only for Circuit initialization. Add a sampler
with repeat addressing and linear filtering. Track and destroy the texture with the rest of the GPU
resources. If texture creation or upload is unavailable, bind a valid 1x1 fallback texture; material
hierarchy must still be supplied by shader constants.

## Task 5: Introduce Circuit-Specific GPU Resources and Pipelines

**Files:**

- Modify: `packages/renderer-webgpu/src/renderer.ts`
- Modify: `packages/renderer-webgpu/src/renderer.test.ts`
- Modify: `packages/renderer-webgpu/src/circuit-shaders.ts`

Add a dedicated Circuit bind-group layout rather than forcing the new scene through the generic
five-buffer block layout. Bind:

- global uniforms;
- canonical QR block types and positions;
- packed processor/component records;
- packed trace/signal records;
- material atlas texture;
- material sampler.

Replace the single `circuit` pipeline with named Circuit passes:

- `circuitBoard`
- `circuitTraces`
- `circuitComponents`
- `circuitSignals`

Keep all shader sources in the existing lazy `import("./circuit-shaders.js")` path. Add explicit
Circuit counts to GPU resources instead of overloading `cityPartCount`. Update render encoding so
each pass draws only its own bounded instance count.

Renderer tests should verify lazy imports, bind-group creation, atlas upload/fallback, correct draw
counts, cleanup, and that other forms continue using their existing layouts and passes unchanged.

## Task 6: Render the Board and Pedestal

**Files:**

- Modify: `packages/renderer-webgpu/src/circuit-shaders.ts`

Implement a board shader pass with a thin square board, restrained bevel/chamfer treatment, layered
PCB edge coloration, and a recessed charcoal pedestal. Use the atlas for fiberglass micro-detail,
combined with shader-scale roughness and edge response.

The world camera starts in a shallow technical three-quarter view and retains the full square
silhouette. The scan-lock camera ends overhead. Maintain comfortable negative space at portrait,
square, and landscape aspect ratios.

Add product-studio shading: broad soft key, weak rim, controlled fill, and contact darkening. Avoid
the current hard per-face contrast, palette-derived rainbow materials, and emissive copper.

## Task 7: Render Routed Copper and Electrical Signals

**Files:**

- Modify: `packages/renderer-webgpu/src/circuit-shaders.ts`
- Modify: `packages/renderer-webgpu/src/renderer.ts`

Render trace segments as shallow copper geometry with consistent width classes, clean 45/90-degree
bends, vias, and junctions. Copper uses metallic light response with subtle finish variation from
the atlas. Recessed routes are slightly warmer and darker; contacts are cleaner and brighter.

The signal pass reads the approved signal-route records. At deterministic irregular intervals,
activate one route, advance a compact amber pulse along segment distance, optionally branch once or
twice, and briefly answer with nearby LED intensity. Ensure only one primary idle event is active
and that its schedule is derived from seed plus time buckets, avoiding frame-dependent randomness.

## Task 8: Render the Curated Component Kit

**Files:**

- Modify: `packages/renderer-webgpu/src/circuit-shaders.ts`
- Modify: `packages/renderer-webgpu/src/circuit-model.test.ts`

Implement procedural geometry functions for each approved family rather than scaling one box:

- ceramic processor body, inset die, edge pins/pads, seams, and optional cooling detail;
- molded IC body with gull-wing or compact contacts;
- repeated heat-sink fins;
- cylindrical or chamfered capacitor silhouettes;
- low resistor packages with contact caps;
- shield cans, edge connectors, daughterboards, vias, and solder points.

Use subtle chamfers and component-specific proportions. Apply atlas regions and fixed black-PCB,
copper, ceramic-white, charcoal-plastic, brushed-metal, solder, and amber-signal material constants.
The application theme may influence background tone slightly but must not replace this identity
palette.

Add geometry-count assertions where feasible so a future edit cannot silently collapse every
family back into equivalent boxes.

## Task 9: Implement the Staged Forward and Reverse Transformation

**Files:**

- Modify: `packages/renderer-webgpu/src/circuit-shaders.ts`
- Modify: `packages/renderer-webgpu/src/renderer.ts`
- Modify: `packages/renderer-webgpu/src/renderer.test.ts`

Expose animation direction to the Circuit shaders. Do not infer reverse choreography solely from a
decreasing progress value. Reuse an unused uniform slot or extend the uniform contract explicitly,
then test its forward and reverse values.

Implement the approved forward phases:

1. power-down at 0-20%;
2. signal mapping at 20-45%;
3. electrical conversion at 45-70%;
4. grid resolution at 70-88%;
5. scan lock at 88-100%.

During the final phase, remove atlas micro-detail and emissive light, flatten realistic shadows,
stabilize the overhead camera, neutralize materials, and draw canonical modules directly from block
types and positions.

Implement the reverse sequence independently: signal paths branch from QR first, board depth
returns, traces resolve, supporting components rise, hero processors activate, then idle signals
resume. Keep both endpoints exact and visually still.

## Task 10: Regression, Performance, and Visual QA

**Files:**

- Modify: `packages/renderer-webgpu/src/generator-fidelity.test.ts` only if the expected intentional
  Circuit fingerprint must change
- Modify: `design-qa.md`

Run focused tests after each task, then the full repository checks:

```text
pnpm vitest packages/renderer-webgpu/src/circuit-model.test.ts
pnpm vitest packages/renderer-webgpu/src/circuit-routing.test.ts
pnpm vitest packages/renderer-webgpu/src/circuit-material-atlas.test.ts
pnpm vitest packages/renderer-webgpu/src/renderer.test.ts
pnpm test
pnpm lint
pnpm --filter @every-qrcode/renderer-webgpu build
pnpm build
```

Start the local web app and inspect Circuit with sparse, medium, and dense payloads at 256x256,
512x512, and 1024x1024. Capture at minimum:

- default three-quarter world view;
- a close view of each hero processor family;
- traces, vias, solder, fiberglass, and brushed-metal material separation;
- a purposeful idle signal;
- each forward phase boundary;
- reverse deployment;
- the final top-down QR endpoint;
- representative mobile and desktop layouts.

Confirm smooth interaction on a modern laptop and representative mobile hardware. If a lower tier
is necessary, reduce micro-components, secondary traces, atlas resolution, and ambient occlusion in
that order. Never remove the hero processors, primary routes, signal personality, or canonical
endpoint.

Record visual evidence and remaining limitations in `design-qa.md`. Circuit is not complete on test
results alone; rendered comparison and successful QR scanning are release gates.

## Commit Sequence

Keep reviewable commits isolated from unrelated dirty-worktree changes:

1. `test: define circuit scene composition contract`
2. `feat: compose deterministic circuit boards and routes`
3. `feat: add circuit material atlas and gpu resources`
4. `feat: render circuit board routes and component kit`
5. `feat: choreograph circuit electrical qr transition`
6. `test: verify circuit renderer fidelity and fallbacks`

Before each commit, inspect `git diff --cached` and ensure no pre-existing edits from other
renderers are staged.
