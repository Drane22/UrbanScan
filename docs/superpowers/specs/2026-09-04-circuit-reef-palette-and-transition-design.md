# Circuit and Reef Palette-First QR and Transition Design

**Date:** 2026-09-04  
**Status:** Approved direction; ready for implementation planning

## Objective

Make Circuit and Reef visually consistent with the renderer collection by keeping their active
palette visible in the world state, during the morph, and at the locked QR endpoint. Neither
world may fade to a generic off-white substrate or generic black ink. The locked code remains
exact, high-contrast, and scannable.

## Chosen approach

Use a palette-first material system rather than a fixed dark foundation or a fully multicolor QR.
For every active five-color world palette, shaders derive the dark QR ink, substrate, world
materials, shadows, and accents from palette entries. The system may darken or desaturate a
palette value to establish hierarchy, but never replaces its identity with hard-coded neutral
white, gray, or black.

## Material roles

### Circuit

- The PCB becomes the palette's deepest primary/tertiary-derived tone, preserving the composed
  electronics silhouette without a universal black board.
- Copper, solder, signal, and contact accents derive from the contrasting secondary/fourth tones.
- The scan QR uses a concentrated primary/tertiary dark ink with restrained local tint variation.
  Its substrate is a low-saturation, palette-derived light value; it is not an off-white card.
- Finder patterns use the palette's strongest dark/light pair and remain solid at scan lock.

### Reef

- The seabed/water base becomes a deep, desaturated value derived from the palette's water-side
  colors, with shallow value variation for depth rather than an external pale background.
- Coral, fish, caustic, and polyp accents draw from the more chromatic palette entries while
  preserving reef depth hierarchy.
- The scan QR uses concentrated coral/reef ink over a muted palette-derived substrate. Organic
  module variation remains subtle enough to preserve QR contrast.
- Finder patterns use the strongest palette contrast and become solid squares at lock.

## Transition behavior

Circuit's solder bumps and Reef's polyps retain their palette-native material during their
seeded rise and settling choreography. Material convergence begins during the geometry morph,
rather than appearing only after the geometry has already flattened. In the final third, each
world resolves into its high-contrast palette-specific scan ink and substrate; it never flashes
or fades through a white/gray intermediate state.

The existing continuous camera motion, per-object stagger, reversal-safe progress functions, and
exact QR matrix are retained. Finder regions rise first and receive their contrast lock early
enough to remain legible throughout the final approach.

## Implementation boundaries

- Change only `circuit-shaders.ts` and `reef-shaders.ts`, plus focused tests where necessary.
- Do not change QR data, palette definitions, model/layout generation, texture atlases, public
  API, or the Tree/Terrain shader bundles.
- Treat the current uncommitted Circuit and Reef shader changes as in-progress work to refine;
  do not discard unrelated edits.

## Verification

- Add or update automated coverage that every Circuit and Reef palette produces a high-contrast
  scan ink/substrate pair and that palette response is not washed out by fixed light-neutral mixes.
- Run formatting, lint, typecheck, test, and build.
- Visually inspect multiple palettes for both worlds at idle, early/mid/late forward morph,
  reversal from mid-morph, and locked QR. Confirm palette identity, continuous material behavior,
  quiet zone, and QR scan clarity.
