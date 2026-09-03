# Reef Renderer Redesign Implementation Plan

**Design source:** `docs/superpowers/specs/2026-09-03-reef-renderer-redesign.md`  
**Scope:** Reef only  
**Working-tree constraint:** Preserve existing Circuit work and unrelated renderer edits. Replace
Reef files deliberately and stage no unrelated changes.

## Outcome

Replace Reef's one-cell/four-box renderer with a deterministic ecological scene containing a
continuous shelf, integrated finder substrate, distinct coral families, authored biological
materials, a visible animated water surface, bounded fish paths, and a staged tidal QR reveal.

## Task 1: Define the Reef Scene Contract

**Files:**

- Modify `packages/renderer-webgpu/src/reef-model.ts`
- Modify `packages/renderer-webgpu/src/reef-model.test.ts`

Replace `ReefFormation`/`reefData` with typed shelf, coral colony, channel, and fish-path records.
Publish packed GPU arrays with explicit strides and counts. Tests require deterministic output,
three continuous channels, no finder-specific coral landmarks, family diversity, bounded density,
major-footprint separation, and stable packing.

## Task 2: Compose the Shelf and Channels

**Files:**

- Add `packages/renderer-webgpu/src/reef-shelf.ts`
- Add `packages/renderer-webgpu/src/reef-shelf.test.ts`
- Modify `packages/renderer-webgpu/src/reef-model.ts`

Create a smooth topology-derived height field with a sandy perimeter, overlapping limestone shelf
bands, an off-center crest, and two or three seeded channels. Finder regions may strengthen the
substrate but cannot create visible 7x7 plateaus. Validate channel continuity from one board edge to
another and fall back to a simpler approved channel template if necessary.

## Task 3: Place a Curated Coral Ecology

**Files:**

- Modify `packages/renderer-webgpu/src/reef-model.ts`
- Modify `packages/renderer-webgpu/src/reef-model.test.ts`

Use exposure, height, current direction, shelter, occupancy, and channel clearance to place unequal
families: branching and bush coral, plates, brain and boulder coral, tubes, anemones, sea fans, soft
coral, and sparse seagrass. Cap attempts and counts. Remove minor details first when crowded.

## Task 4: Add Biological Material Atlas

**Files:**

- Add `packages/renderer-webgpu/src/reef-material-atlas.ts`
- Add `packages/renderer-webgpu/src/reef-material-atlas.test.ts`

Create a compact 64px authored atlas with coral pores, brain ridges, plate growth bands, limestone
erosion, sand grain, and translucent tissue variation. Use 256-byte-aligned rows for direct WebGPU
upload. Verify deterministic non-flat tiles and declared bounds.

## Task 5: Add Reef-Specific GPU Resources

**Files:**

- Modify `packages/renderer-webgpu/src/renderer.ts`
- Modify `packages/renderer-webgpu/src/renderer.test.ts`
- Modify `packages/renderer-webgpu/src/reef-shaders.ts`

Create a Reef bind-group layout for canonical QR data, shelf data, coral data, path data, the atlas,
and sampler. Replace the generic `reef` pipeline with shelf, coral, water, fish, and QR passes.
Track Reef-specific counts and texture lifetime without changing other model paths.

## Task 6: Render Family-Specific Geometry

**Files:**

- Modify `packages/renderer-webgpu/src/reef-shaders.ts`

Render the shelf as continuous sand and limestone relief. Give every coral family its own procedural
construction: tapered forks, layered plates, ridged masses, grouped tubes, flexible tentacles,
branching fan tissue, and soft lobes. Use family-specific atlas tiles and palette roles. Do not reuse
one scaled box primitive as every organism.

## Task 7: Render Water, Caustics, and Life

**Files:**

- Modify `packages/renderer-webgpu/src/reef-shaders.ts`
- Modify `packages/renderer-webgpu/src/renderer.ts`

Add one translucent broad-wave water surface, projected caustics, depth tint, capped particles, and
two or three fish following valid channel paths. Drive flexible organisms from one current field
with family-specific stiffness. Keep hard coral and rock static.

## Task 8: Choreograph the Tidal Transformation

**Files:**

- Modify `packages/renderer-webgpu/src/reef-shaders.ts`
- Modify `packages/renderer-webgpu/src/renderer.ts`
- Modify `packages/renderer-webgpu/src/renderer.test.ts`

Implement retreat at 0-18%, water withdrawal at 18-38%, ecological contraction at 38-62%, reef
compression at 62-82%, and canonical seabed resolution at 82-100%. Use explicit animation direction
for independent reverse growth, water return, and fish entry.

## Task 9: Verification

Run focused model, shelf, atlas, and renderer tests; package build; full tests; lint; and formatting.
Rendered QA must cover 256/512/1024px, sparse and dense inputs, idle water and fish, all forward and
reverse phases, mobile/desktop performance, and final QR scanning. Record any unavailable visual
gate honestly in `design-qa.md`.
