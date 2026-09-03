# Circuit Renderer Redesign

**Date:** 2026-09-03  
**Status:** Approved design, pending implementation plan

## Objective

Redesign Circuit as a premium miniature electronics assembly with its own geometry, materials,
composition, and motion language. It must look like a deliberately manufactured black PCB rather
than a QR grid decorated with generic blocks. The QR matrix should remain visually concealed until
the reveal animation while always converging to the exact canonical, scannable endpoint.

This specification covers Circuit only. The remaining renderer redesigns will be art-directed and
approved individually after Circuit establishes the required quality bar.

## Visual Identity

Circuit is a layered, stylized-but-materially-convincing printed circuit board presented as a
collectible product sculpture. Its identity is established by:

- a thin, subtly beveled black fiberglass PCB on a recessed charcoal pedestal;
- three dominant ceramic-white processor packages at the QR finder regions;
- clean copper buses, traces, contacts, vias, and solder points;
- a shallow hierarchy of recessed channels, raised components, and sparse daughterboards;
- warm pale-gray studio surroundings and restrained amber electrical activity.

The renderer must remain recognizable in grayscale through its flat technical base, three hero
processor landmarks, shallow component layers, routed line work, and precise manufactured edges.
Color cannot be the primary differentiator.

## Composition and QR Mapping

The board composer derives a small number of coherent functional zones from QR topology and the
normalized URL seed. Typical zones represent processing, power, memory, and connectivity. They are
art-directed regions rather than literal one-object-per-cell representations.

The QR matrix controls valid placement, routing opportunities, density, and eventual convergence,
but it is not plainly readable in the world state. Empty QR regions provide designed negative
space. Dense regions may support more components or routing, subject to explicit density caps.

The three finder regions become the largest visual anchors. Each is a ceramic processor package
from the same family, but its internal die, cooling detail, pin arrangement, and nearby power
routing differ deterministically. They must remain visually dominant at 256x256.

The result retains a strong square footprint. Geometry may rise above the board but must not spill
far enough beyond its perimeter to weaken the square silhouette or obscure the QR origin.

## Component Kit

The renderer uses a deliberately limited kit whose variations come from curated parameters:

- hero processor packages with inset dies, pins, molded seams, and optional cooling details;
- low charcoal IC packages with metallic contacts;
- brushed-metal heat sinks with readable fins;
- compact capacitor and resistor groupings;
- copper via clusters, contacts, and controlled solder joints;
- shielded modules and small board-edge connectors;
- sparse raised daughterboards;
- recessed channels beneath major routing buses.

Each component family has recognizable proportions and placement rules. Rotation is limited to
valid board-aligned orientations. Unsupported overlaps, arbitrary rotations, unconstrained height,
and random component scattering are prohibited.

Vertical variation remains shallow and precise. Large components establish hierarchy; small parts
support scale and tactility without becoming noise. At small view sizes, the processors, major
buses, and layered board silhouette must remain legible when micro-components disappear.

## Trace Routing

Traces are constructed as intentional routes between functional zones and components. Routing
supports parallel buses, consistent width classes, controlled junctions, and 45-degree or
90-degree turns. It must not resemble random spaghetti wiring.

At least one deterministic signal route connects each hero processor to another major zone. These
routes also drive idle electrical animation. Routing remains within the board boundary, respects
component keep-out areas, and cannot cross through a hero processor unless terminating there.

If a dense QR matrix cannot support the preferred layout without crowding, the composer selects a
simpler approved routing template and reduces secondary components. It must never resolve layout
failure by accepting overlaps or adding unbounded detail.

## Materials and Texture

Circuit uses a hybrid material system: physical response is shader-driven, while compact reusable
maps provide manufactured micro-detail.

The dominant board material is black fiberglass with fine woven grain, subtle micro-roughness, and
faint layered edge coloration. Copper is metallic rather than emissive. Contact surfaces may be
cleaner and brighter; recessed traces may be slightly warmer and softer. Solder points use small,
controlled specular highlights.

Hero processors use warm ceramic white with shallow seams, engraved technical markings, dark inset
dies, and restrained metal hardware. Supporting ICs use charcoal molded plastic with subtle grain.
Heat sinks and shields use directional brushed-metal response.

One compact atlas should cover:

- fiberglass weave and micro-roughness;
- brushed-metal directionality;
- molded-plastic grain;
- etched markings and board silkscreen;
- subtle solder irregularity.

Markings are graphic texture detail, not dense readable copy. Scratches, dust, grunge, and dramatic
wear are excluded. Texture detail must enrich close views without breaking the clean miniature
presentation.

## Lighting and Presentation

The default presentation uses a technical three-quarter camera with a shallower pitch than City.
The entire square board remains visible with comfortable negative space.

Lighting follows a neutral product-studio setup:

- one broad soft key that reveals component height and material differences;
- a weaker rim that separates the black board from the background;
- restrained ambient occlusion around pins, channels, and stacked layers;
- very limited bloom applied only to tiny signal lights when enabled.

The background is warm pale gray. The base is recessed charcoal and visually secondary. Copper,
ceramic, plastic, and metal must remain distinguishable without saturated colored lighting.

## Idle Motion

The board is predominantly still. At deterministic, irregular intervals, one amber signal leaves a
hero processor and travels along a valid routed path. It may branch once or twice through supporting
components and terminates at another major zone or processor. Nearby status LEDs answer with a
faint pulse.

Only one purposeful signal event is normally active. The full board never flashes simultaneously,
and idle motion must not alter geometry, distract from inspection, or compromise screenshot
readability.

## World-to-QR Transformation

The defining transformation is staged electrical resolution rather than a generic per-cell morph:

1. **Power-down, 0-20%:** the active signal finishes; LEDs dim; silkscreen and micro-detail recede;
   lighting begins to flatten.
2. **Signal mapping, 20-45%:** amber current propagates from the hero processors through meaningful
   routed paths, briefly revealing the concealed QR-derived organization.
3. **Electrical conversion, 45-70%:** energized routes broaden into clean module boundaries while
   chips lose height and component detail collapses into assigned matrix regions.
4. **Grid resolution, 70-88%:** daughterboards settle; traces straighten; all layered structures
   compress toward a precise planar matrix.
5. **Scan lock, 88-100%:** emissive light disappears; material colors neutralize; shadows soften;
   the camera stabilizes overhead; canonical black modules become perfectly crisp.

Timing uses smooth eased propagation and controlled dimensional collapse. Bouncing, spinning,
random delays, and identical simultaneous cell tweens are prohibited.

## Reverse Transformation

The reverse is choreographed independently. Signal paths branch outward from the flat QR before
the board gains depth. Copper traces resolve next, followed by supporting components and
daughterboards. The three hero processors rise and activate near the end. Rare idle signals resume
only after the full manufactured composition is stable.

## Technical Boundaries

Circuit owns a dedicated rendering path divided into five independently testable responsibilities:

- **Board composer:** maps topology and seed to approved functional-zone layouts.
- **Routing system:** creates traces, buses, junctions, vias, keep-out regions, and signal routes.
- **Component kit:** supplies instanced component families and curated variants.
- **Material system:** binds the compact atlas and component-specific physical properties.
- **Motion sequencer:** drives idle signals, staged simplification, canonical convergence, and the
  independently timed reverse sequence.

The renderer receives the existing normalized identity, QR matrix/topology, visual DNA, generator
version, camera state, and transition progress through existing package contracts. Circuit-specific
assets and shaders remain lazy-loaded. The same identity and generator version must always generate
the same layout and animation routes.

The implementation should favor instancing, shared geometry, atlas sampling, capped light counts,
and bounded routing work. Quality scaling may reduce texture resolution, ambient occlusion,
micro-components, and secondary traces. It must preserve the three hero processors, square layered
silhouette, major copper routes, meaningful electrical signal, and full QR transformation.

## Failure and Fallback Behavior

- If a preferred composition is overcrowded, select a simpler approved layout template.
- If routing cannot connect all desired zones, preserve hero-to-hero or hero-to-major-zone routes
  first and omit secondary routes.
- If optional textures fail to load, use clean procedural material fallbacks with the same color,
  roughness, and metallic hierarchy.
- If a performance tier disables secondary effects, retain scan-lock correctness and primary
  electrical propagation.
- No fallback may change the encoded QR data, canonical endpoint, deterministic identity, or public
  renderer selection behavior.

## Verification and Acceptance Criteria

Automated verification must cover:

- deterministic geometry, component selection, routing, and signal paths;
- stable generator-version fingerprints unless an intentional version change is approved;
- all major components remaining within bounds and free of prohibited overlap;
- traces respecting board boundaries and processor keep-out rules;
- exact convergence to the canonical QR module matrix;
- correct forward and reverse phase boundaries;
- lazy loading of Circuit-only shaders and texture assets;
- graceful use of the simpler composition and procedural-material fallbacks.

Visual QA must inspect representative sparse, medium, and dense QR matrices at 256x256, 512x512,
and 1024x1024. It must cover the three-quarter world view, camera rotation, idle signaling, every
forward transformation phase, the independent reverse transformation, and the final scannable QR
state on modern desktop and representative mobile hardware.

Circuit is accepted only when it reads first as a deliberately composed premium PCB miniature,
remains distinctive in grayscale, retains tactile material separation without visual noise, moves
with a recognizably electrical personality, and ends as an exact scannable QR code.

## Out of Scope

- Redesigning any other renderer.
- Photoreal macro grime, dust, scratches, or dense readable labeling.
- Physics simulation, free-running electrical simulation, or unrestricted procedural routing.
- Multiple simultaneously active signal systems.
- A generic shared block treatment used to visually unify Circuit with other worlds.
