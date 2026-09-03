# Colony Renderer Redesign

**Date:** 2026-09-03  
**Status:** Approved design, pending implementation plan

## Objective

Redesign Colony as a microscopic cell culture whose living structure is generated from the
canonical QR matrix. The world should read as a premium scientific illustration inside a square
microfluidic slide, then physically settle into a themed, exact, and scannable QR code.

This specification covers Colony only. Circuit and Reef retain their separately approved designs.
Dungeon and the remaining worlds will be designed and implemented as later sequential
subprojects. Existing uncommitted renderer work is the implementation baseline and must be
preserved.

## Visual Identity

Colony is a shallow-relief microscopic specimen rather than an insect nest, space settlement, or
generic collection of decorated QR squares. Its defining visual vocabulary is:

- a square glass microfluidic slide with a thin transparent rim;
- warm ivory culture medium and a clean sterile margin;
- deep burgundy cell colonies with coral membranes;
- restrained violet reagent accents;
- translucent biological surfaces rendered as clean scientific illustration;
- raised organoids, recessed nutrient channels, and limited visible organelles;
- slow membrane pulses, occasional division, drifting vesicles, and nutrient flow.

The style is deliberately cleaner than photoreal microscopy. Optical noise, uncontrolled fluid
debris, grotesque biological detail, and cartoon character treatment are excluded. The composition
must remain legible at small sizes through cluster silhouettes, three dominant organoids, and clear
contrast rather than micro-detail.

## QR-Derived Composition

The canonical QR matrix remains the source of truth. Colony uses a deterministic cluster-and-vein
interpretation of that matrix:

1. Connected dark-module regions are analyzed as candidate tissue colonies.
2. Finder regions become the three dominant organoids and primary growth anchors.
3. Larger or strategically placed dark clusters become major tissue masses.
4. Smaller dark clusters become supporting cell groups or resource sites.
5. Seeded nutrient vessels connect meaningful clusters using bounded topology rules.
6. Empty QR regions remain culture medium, channels, or designed negative space.
7. Decorative vesicles and internal organelles are added only after the primary QR-derived
   structure is established.

The world state may soften, merge, or expand cluster silhouettes, but every structure must retain
a deterministic assignment to canonical module coordinates. At final reveal, all geometry returns
exactly to the real matrix.

## Finder Organoids

The three finder patterns become differentiated organoids with distinct biological roles:

- the top-left finder is the growth nucleus;
- the top-right finder is the nutrient-processing organoid;
- the bottom-left finder is the signaling organoid.

All three belong to one material and shape family. Their outer membrane, inner cytoplasm ring, and
central nucleus preserve the nested finder geometry. Role-specific details may alter organelles,
surface folds, pulses, and nearby vessels, but must not distort the 7-by-7 footprint or weaken the
dark-light-dark finder relationship at scan lock.

## Cell and Vessel System

Ordinary dark modules resolve into flattened cell plaques. In the world state, neighboring plaques
may participate in a larger tissue silhouette. In the final QR state, each active module has a
crisp square footprint with gently rounded membrane treatment, deep burgundy cytoplasm, and a
restrained highlight.

Visible nuclei, vesicles, and internal structures are limited to finder organoids and selected
large cells. Smaller cells remain materially rich but geometrically simple. Nutrient vessels use
controlled curves or short linked segments, remain inside the specimen, and connect only valid
cluster endpoints. They must not appear as arbitrary lines drawn over the QR.

Explicit caps bound the number of large cells, organelles, vessel segments, vesicles, and active
division events. Dense QR matrices reduce secondary detail before they reduce landmark clarity.

## Deterministic Variation

The same normalized identity and generator version must always produce the same colony. Seed
variation primarily changes structure rather than color, including:

- tissue-cluster silhouettes and local expansion;
- vessel topology and branching;
- major cell sizes and membrane profiles;
- division sites and growth order;
- finder-organoid surface details;
- selected organelles and vesicle distribution;
- pulse phases, nutrient-flow offsets, and division timing.

Palette selection may vary only among curated histology-compatible families that preserve the
approved warm-light substrate and dark cellular foreground relationship. Unseeded `Math.random()`
is prohibited.

## Presentation and Depth

The specimen uses a top-down-biased camera with enough angle to reveal shallow relief while keeping
the complete square footprint visible. The glass slide is thin and visually secondary. Raised
organoids and membranes establish depth; nutrient channels sit slightly below the culture surface.

Lighting is soft and clinical. Translucency and subsurface color should imply living material
without obscuring boundaries. Specular highlights are narrow and controlled. Bloom is restricted
to faint reagent or signaling accents and disappears as a structural influence before scan lock.

The sterile margin inside the glass frame becomes the functional QR quiet zone. World-state
decoration may approach but may not cross the slide boundary. As reveal progress increases, all
cells, vessels, vesicles, glow, and markings clear the final quiet-zone footprint completely.

## Growth Animation

Colony builds through seeded cell division:

1. The glass slide and culture medium settle into view.
2. The three finder organoids appear as primary growth anchors.
3. Major cells divide outward along QR-derived cluster topology.
4. Supporting cells fill approved cluster regions.
5. Nutrient vessels grow between mature regions.
6. Selected organelles appear and a small number of division events complete.
7. Restrained ambient activity begins: membrane pulses, nutrient flow, and drifting vesicles.

Growth timing is hierarchical and deterministic. Cells do not all scale in identically, and random
particle noise is not a substitute for visible biological development.

## World-to-QR Transformation

The transformation is a cellular-fixation sequence rather than a crossfade or generic QR overlay:

1. **Reagent arrival:** violet accents pass through the culture and division events stop.
2. **Activity reduction:** drifting vesicles settle; nutrient flow and membrane movement slow.
3. **Internal simplification:** secondary organelles retract and vessel branches shorten.
4. **Tissue separation:** merged cluster silhouettes resolve toward their assigned module cells.
5. **Membrane tightening:** cells flatten and their footprints align precisely to the QR grid.
6. **Finder resolution:** the three organoids simplify into exact nested finder geometry.
7. **Scan lock:** depth, translucency, glow bleed, shadows, and decorative detail settle; the quiet
   zone becomes completely clean.

At scan lock, module positions, sizes, edges, finder geometry, and quiet zone are static. A faint
internal biological pulse remains, but it may affect only subtle color or brightness within dark
module interiors. It must not change silhouettes, contrast at module edges, opacity, scale,
position, or encoded geometry.

## Reverse Transformation

The reverse sequence is choreographed independently. The fixed QR first regains shallow membrane
depth. Tissue boundaries soften into approved cluster silhouettes, finder organoids recover their
role-specific details, nutrient vessels regrow, and selected organelles return. Drifting vesicles,
division events, and full membrane activity resume only after the colony structure is stable.

## Technical Boundaries

Core identity, QR generation, error correction, role metadata, and canonical matrix representation
remain unchanged. The shared renderer continues to own canvas lifecycle, click-to-toggle behavior,
transition progress, camera interpolation, resize, replay, and disposal.

Colony owns independently testable responsibilities:

- **Topology composer:** groups matrix regions and selects major tissue colonies.
- **Organoid system:** creates the three finder landmarks and their differentiated details.
- **Cell system:** creates bounded cell plaques, cluster silhouettes, and selected organelles.
- **Vessel system:** connects approved colony regions with deterministic nutrient routes.
- **Motion sequencer:** stages growth, ambient activity, fixation, scan lock, and reverse growth.
- **Material treatment:** maps the semantic histology palette to culture medium, membranes,
  cytoplasm, reagent accents, highlights, shadows, and QR foreground.

Shared additions must remain structural and small: finder metadata, quiet-zone handling, exact
module coordinates, reveal easing, or final-state stabilization. Colony-specific biological
geometry and styling must not be folded into a universal themed-QR renderer.

## Failure and Fallback Behavior

- If cluster expansion would overcrowd the specimen, preserve finder organoids and major tissue
  silhouettes, then reduce supporting cells and organelles.
- If a preferred vessel route cannot connect valid endpoints without crossing protected regions,
  use a simpler bounded route or omit that secondary connection.
- If a performance tier disables secondary effects, retain the organoids, tissue topology, major
  vessels, cellular-fixation transition, exact QR endpoint, and faint scan-safe pulse.
- If WebGPU rendering fails, the existing canonical SVG fallback remains available.
- No fallback may alter the payload, QR matrix, deterministic identity, public interaction, or
  quiet-zone requirements.

## Verification and Acceptance Criteria

Automated verification must cover:

- identical colony data for identical identity and generator version;
- meaningful structural differences across representative seeds;
- exactly three finder organoids with valid roles and footprints;
- bounded cell, organelle, vessel, vesicle, and division-event counts;
- valid vessel endpoints and in-bounds specimen geometry;
- exact convergence of every dark module to the canonical QR matrix;
- complete quiet-zone clearing before scan lock;
- a final pulse that changes only permitted interior color or brightness;
- correct forward and reverse phase behavior;
- replay, resize, cleanup, and renderer lifecycle behavior.

Visual and functional QA must inspect sparse, medium, and dense matrices across multiple URLs,
palette seeds, and viewport sizes. It must cover the complete growth sequence, ambient microscopic
activity, every fixation stage, the reverse sequence, finder readability, and final QR stability.
The final QR must be decode-tested from rendered captures at representative desktop and mobile
sizes.

Colony is accepted only when it reads first as a coherent living microscopic culture, derives its
architecture visibly from QR topology, varies structurally by seed, transforms physically through
cellular fixation, preserves its histology identity at the endpoint, and scans reliably.

## Out of Scope

- Insect, termite, or ant-colony imagery.
- Lunar or science-fiction settlement imagery.
- Photoreal optical noise, contamination, or uncontrolled fluid simulation.
- Per-cell complex organelles or unbounded particle systems.
- New public interaction modes beyond the existing click-to-toggle behavior.
- Redesigning Circuit, Reef, Dungeon, or another world within the Colony implementation pass.
