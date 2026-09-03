# Reef Renderer Redesign

**Date:** 2026-09-03  
**Status:** Approved design, pending implementation plan

## Objective

Redesign Reef as a museum-quality miniature coral diorama with stylized naturalism, layered
ecological composition, family-specific geometry and materials, a visible lightweight water
surface, quiet marine life, and a staged tidal-withdrawal QR transformation.

Reef must not resemble a QR grid populated with generic blocks, cones, or interchangeable props.
The QR matrix remains visually concealed in the world state and resolves exactly at the canonical,
scannable endpoint.

This specification covers Reef only. It does not authorize changes to Circuit or any other world.

## Visual Identity

Reef is one continuous living sculpture presented like a premium aquarium exhibit or marine-museum
miniature. Its identity comes from:

- a thin square seabed of warm sand and eroded limestone;
- overlapping reef shelves rising toward an off-center crest;
- open channels that create negative space and believable fish paths;
- a deliberately unequal mix of branching, plated, ridged, tubular, and soft coral silhouettes;
- a visible turquoise water surface, restrained caustics, and gentle depth tint;
- tactile biological materials and quiet coordinated motion.

The Reef must remain identifiable in grayscale through its shelf profile, coral silhouettes,
layered ecology, and water boundary. Color alone cannot distinguish it from other worlds.

## Composition and QR Mapping

The shelf composer maps QR topology and the normalized URL seed into continuous substrate regions.
QR clusters influence limestone strength, shelf boundaries, coral density, open channels, and
eventual module ownership. Individual modules must not be apparent before the reveal.

The base remains a strong square. A low sandy perimeter rises through overlapping limestone
terraces toward one off-center crest. Two or three continuous channels cross the composition. These
channels provide visual breathing room, prevent uniform density, and define deterministic paths for
fish.

Finder regions contribute structurally stable rock beneath the reef but do not receive matching
landmarks. No repeated coral crowns, identical pinnacles, specimen pedestals, or exposed 7x7 forms
may reveal their locations. The world should read as one integrated ecosystem.

The silhouette stays within the square footprint. A few coral tips may break the upper profile, but
horizontal geometry cannot spill far enough outside the base to obscure the QR origin.

## Shelf and Substrate Geometry

The seabed contains three coordinated layers:

- a thin sand base with gentle directional ripples and shallow depressions;
- eroded limestone masses that provide the primary weight and support;
- overlapping shelves and ledges that create ecological niches and the off-center crest.

Shelf geometry is continuous and art-directed rather than a collection of raised square modules.
Use clean low-poly curvature, controlled erosion cavities, softened fracture planes, and readable
terrace edges. Avoid noisy displacement, vertical perimeter walls, uniform voxel steps, and
terrain-like mountain profiles.

## Coral Geometry Kit

Coral families have unequal compositional roles and genuinely different construction rules:

- **Branching staghorn:** forked tapered limbs create the tallest accents on exposed upper shelves.
- **Compact bush coral:** dense short forks create medium-height clustered masses.
- **Plate and table coral:** layered discs or broad irregular plates extend terrace edges
  horizontally.
- **Brain coral:** weighty rounded masses carry continuous geometry-following ridge systems.
- **Boulder coral:** quiet solid anchors balance more intricate neighboring silhouettes.
- **Tube coral:** grouped vertical openings provide small-scale punctuation and dark cavities.
- **Anemones:** compact bodies and a controlled number of flexible tentacles occupy sheltered
  pockets.
- **Sea fans:** thin branching frames with semi-translucent tissue sit on current-facing margins.
- **Soft coral:** flexible lobes and stalks fill selected mid-level zones without dominating the
  shelf.
- **Seagrass and shells:** sparse scale cues, never general-purpose gap fillers.

Forms grow as colonies with shared orientation, scale family, and local rhythm. Procedural variation
selects from curated branching depth, plate count, ridge pattern, cluster size, and lean classes.
Unrestricted random rotation, height, or family selection is prohibited.

## Ecological Placement

The ecological placer evaluates shelf height, exposure, current direction, shelter, nearby family,
and channel clearance:

- branching and bush coral favor exposed upper shelves;
- plate coral grows outward from terrace edges;
- brain and boulder coral anchor middle levels;
- tube coral and anemones occupy protected pockets;
- fans and soft coral favor current-facing margins;
- seagrass collects sparingly near sand and sheltered channels.

Major coral footprints cannot overlap. Channel clearance is mandatory. Density budgets are defined
per composition template and QR size. When space is constrained, remove shells, grass, and small
colonies first, followed by secondary coral. Never resolve overcrowding by shrinking everything
into uniform interchangeable props.

## Materials and Texture

Reef uses a hybrid material system: geometry establishes biological structure, authored atlas tiles
provide family-specific micro-detail, and shaders supply light response, restrained variation, and
depth behavior.

The atlas contains:

- fine branching-coral pores;
- continuous brain-coral ridges and valleys;
- plate-coral growth bands;
- limestone pores and layered erosion;
- sand grain and directional ripple detail;
- translucent soft-tissue variation;
- dark tube and anemone cavity detail.

Branching coral is mostly matte with lightly calcified tips. Brain coral texture follows its ridge
geometry. Plate coral uses layered bands and subtly lighter edges. Tube coral has darker interiors
and slightly translucent rims. Anemones, sea fans, and soft coral use waxy controlled translucency.
Limestone remains porous and warm; sand remains fine and softly varied.

Texture scale must remain physically consistent across differently sized colonies. At 256x256,
micro-detail should consolidate into material richness rather than high-frequency noise.

## Palette

The default material family is turquoise water, coral red, and sand limestone. Supporting coral
colors may include restrained warm orange, shell cream, muted rose, and small cool green notes.

Palette selection assigns stable roles:

- water surface and depth tint;
- primary hard coral;
- secondary hard coral;
- soft-tissue accent;
- sand and limestone base.

The URL seed may choose variations only within approved Reef palettes. It cannot assign unrelated
random colors per colony. Neighboring colonies require enough tonal separation to retain their
silhouettes without becoming a rainbow field.

## Water and Atmosphere

A thin translucent water surface sits visibly above the reef. It uses two or three broad,
slow-moving wave components. Fine noisy ripples, ocean-scale waves, expensive fluid simulation, and
ray-traced refraction are outside scope.

The water system provides:

- restrained surface transmission and edge highlights;
- projected caustic bands moving more slowly than the water surface;
- a turquoise-to-blue depth tint that preserves material separation;
- sparse suspended particles with occasional light response;
- gentle distance attenuation without opaque blue fog.

The surface must clearly establish an aquarium volume while leaving the reef readable in
screenshots and during interaction.

## Lighting

Lighting resembles a premium aquarium exhibit:

- one broad overhead key filtered through the water;
- soft lateral fill that separates overlapping coral silhouettes;
- subtle contact shadows anchoring colonies to shelves;
- restrained moving caustics across upward-facing surfaces;
- limited highlights on translucent tissue and the water surface.

Hard coral, limestone, sand, soft tissue, and water must remain materially distinct. Bloom,
saturated fog, aggressive volumetrics, and uniformly blue lighting are prohibited.

## Idle Motion

The Reef is quietly alive:

- the water surface moves in broad overlapping waves;
- caustics drift at a slower independent rate;
- sea fans, soft coral, anemones, and seagrass share one gentle current field;
- organism stiffness determines motion amplitude and lag;
- hard coral and rock remain fixed;
- sparse particles follow depth-dependent current;
- two or three tiny stylized fish follow deterministic channel paths.

Fish never wander through solid geometry. Each path includes a shelf occlusion or hidden segment so
fish are not constantly visible. No schooling simulation, bubble field, or continuous high-energy
motion is required.

## World-to-QR Transformation

The defining motion is a staged tidal withdrawal:

1. **Retreat, 0-18%:** fish leave through reef channels, particles thin, and soft organisms begin
   contracting.
2. **Water withdrawal, 18-38%:** the water surface lifts and recedes; caustics weaken; depth tint
   clears.
3. **Ecological contraction, 38-62%:** anemones close, fans fold, soft coral retracts, and decorative
   colonies settle into the substrate.
4. **Reef compression, 62-82%:** branching coral folds through controlled joints, plates nest
   downward, and limestone terraces descend into assigned matrix regions.
5. **Seabed resolution, 82-100%:** sand texture quiets, realistic shadows fade, the camera stabilizes
   overhead, and exposed dark/light seabed regions become the canonical QR.

Every family has specific contraction behavior. Dissolving coral, simultaneous equal-speed motion,
generic vertical scaling, random delays, and bouncing are prohibited.

## Reverse Transformation

The reverse is independently choreographed:

1. QR modules gain shallow seabed relief.
2. Limestone shelves rise and connect.
3. Hard coral grows from assigned joints and plate layers unfold.
4. Anemones, fans, soft coral, and seagrass expand.
5. The water surface returns and caustics appear.
6. Fish enter the established channels last.

Both endpoints must be perfectly still. Reverse timing cannot be implemented solely by blindly
playing every forward parameter backward.

## Technical Boundaries

Reef owns a dedicated rendering path with independently testable responsibilities:

- **Shelf composer:** builds sand, limestone, terraces, crest, and channels from topology and seed.
- **Ecological placer:** assigns approved families by exposure, height, current, shelter, and
  clearance.
- **Coral geometry kit:** generates family-specific low-poly geometry and curated variants.
- **Material system:** supplies atlas tiles and family-specific surface properties.
- **Water system:** renders the surface, caustics, depth tint, and particles.
- **Life system:** creates fish paths and stiffness-aware organism motion.
- **Motion sequencer:** coordinates forward tidal withdrawal, canonical convergence, and reverse
  regrowth.

The renderer consumes the existing normalized identity, QR topology, visual DNA, generator version,
camera state, scene palette, and transition state. Reef-only shaders and material data remain lazy
loaded. The same identity and generator version always generate the same composition and paths.

Performance relies on instanced coral parts, shared low-poly geometry, bounded colony counts, one
compact atlas, one lightweight water surface, capped particles, and deterministic path data.
Quality scaling may reduce polyp detail, particles, small secondary colonies, and caustic resolution.
It must preserve the shelf silhouette, family distinctions, visible water surface, fish scale cues,
and full tidal transformation.

## Failure and Fallback Behavior

- If the preferred shelf layout blocks channel continuity, select a simpler approved shelf
  template.
- If coral placement becomes overcrowded, remove minor props and secondary colonies in priority
  order.
- If a fish route intersects geometry, omit that fish rather than allowing visible clipping.
- If optional texture upload fails, use family-specific procedural material fallbacks.
- If a low performance tier disables secondary effects, preserve the water boundary, primary
  caustics, soft-organism motion, and transformation stages.
- No fallback may alter the encoded data, canonical endpoint, deterministic identity, or public
  renderer selection behavior.

## Verification and Acceptance Criteria

Automated tests must cover:

- deterministic shelf, coral, material, fish, and animation data;
- channel continuity and mandatory clearance;
- family placement rules and major-footprint non-overlap;
- curated density and geometry-count caps;
- materially different family geometry records;
- fish paths staying within navigable water regions;
- exact forward and reverse phase boundaries;
- stable generator fingerprints unless intentionally versioned;
- lazy loading of Reef-only resources;
- exact convergence to the canonical QR matrix;
- all documented fallback paths.

Visual QA must inspect representative sparse, medium, and dense QR matrices at 256x256, 512x512,
and 1024x1024. It must cover the full three-quarter silhouette, close material separation, visible
water surface, caustics, idle organism motion, fish channel movement, every forward phase,
independent reverse growth, camera interaction, representative mobile and desktop profiles, and a
successfully scanned final QR.

Reef is accepted only when it reads first as one intentionally composed living reef shelf, remains
distinctive in grayscale, shows convincing family-specific texture and motion, avoids revealing the
finder regions, and transforms through an unmistakable tidal withdrawal into an exact QR code.

## Out of Scope

- Redesigning Circuit or any other renderer.
- Photoreal fluid simulation, ray-traced water, or dense volumetric fog.
- Full ecological, schooling, or collision simulation.
- Unbounded coral growth or per-cell coral placement.
- Three repeated finder landmarks.
- Generic block, cone, or cylinder substitution for distinct coral families.
