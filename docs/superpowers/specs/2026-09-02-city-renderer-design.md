# City Renderer Design

## Objective

Complete the existing partial City renderer as a first-class `model="city"` option without
changing URL normalization, identity derivation, canonical QR generation, the default Tree model,
or the frozen deterministic behavior of Tree and Terrain.

The canonical QR matrix determines which city lots are occupied. Existing deterministic identity
data determines architectural variation. The City view must reversibly transform into the exact
canonical QR endpoint rather than cross-fading to a separately generated QR image.

## Chosen Approach

Finish the existing `city-model.ts` and `city-shaders.ts` draft through the renderer's native model
architecture. Reuse the shared WebGPU runtime, transition state, scene configuration, camera and
zoom controls, QR block field, fallback rendering, and disposal lifecycle. Do not create a second
renderer runtime or approximate City through the Terrain pipeline.

## Deterministic City Model

`city-model.ts` is the City CPU layer. It derives `CityDNA` exclusively from the existing
`SeedModel` and classifies every canonical QR cell as one city lot.

- Dark QR cells become occupied lots.
- Light QR cells become roads, plazas, courtyards, or empty lots.
- Four-neighbor connectivity, local density, component size, and center distance influence height
  and archetype.
- Seeded genes vary height bias, density, tower frequency, roofs, windows, plazas, antennas, and
  lighting without `Math.random()`.
- The three finder patterns become landmark podium, courtyard, and tower compositions while
  retaining their exact dark/light cell occupancy.

The generated layout is a compact, row-major `Float32Array` with one `vec4` per QR cell: floors,
archetype code, deterministic lot seed, and flags. Repeated generation with the same seed model must
be byte-identical. Different identities must produce meaningfully different DNA or lot details.

## GPU Integration

`renderer.ts` gains a City shader-source variant, City pipeline type, lazy City loader, City lot
buffer, and City render-pass branch. The City shader module is dynamically imported only for the
City form. Shared post-processing and weather shaders retain their current loading behavior.

The existing block bind-group layout already exposes five bindings. For City, binding 4 points to
the City lot-data buffer; Tree and Terrain continue using their existing binding-4 data. Buffer
creation and binding must make that model-specific choice explicit without modifying existing
Tree/Terrain buffer contents.

City rendering uses one procedural pipeline and instanced draw submission. Each lot can render up
to four parts—body, upper setback, roof cap, and rooftop prop—without individual JavaScript scene
objects or external assets. Light lots render as thin ground elements. All resources are owned by
the existing GPU resource object and destroyed by the existing renderer disposal path.

## Transition and Camera

The shared transition progress remains the source of truth. The City shader interprets it as a
staged, reversible transformation:

1. Rooftop props retract or disappear.
2. Roof caps and upper sections collapse.
3. Building heights descend.
4. Footprints become uniform QR squares.
5. The camera rotates from an elevated three-quarter view to the canonical plan view.
6. Dark and light lots converge to the exact block-type occupancy of the canonical QR matrix.

Reversing progress performs the inverse transformation. The endpoint uses the existing block types,
positions, and canonical QR field; City DNA never changes endpoint occupancy. The City camera is
implemented in its shader projection and does not introduce a separate interaction architecture.

## Public Integration

Add `"city"` to the model unions exported by React and the Web Component. React retains `"tree"`
as its default. The Web Component accepts `model="city"`; unknown model values continue falling
back to Tree. Add City to the existing Studio selector without redesigning the interface or adding
City-specific controls.

Model changes continue to trigger the existing mount cleanup and canvas replacement paths, ensuring
the previous renderer is disposed before the replacement is used.

## Error Handling and Fallback

City follows the current renderer initialization and error callback behavior. Unsupported WebGPU,
adapter/device failures, shader compilation failures, or runtime initialization errors show the
same exact canonical SVG QR fallback used by the other models. No network resources or hidden
fallback QR generation are introduced.

## Compatibility

No generator-version increment is required because City is additive. Tree and Terrain code paths,
seed salts, fingerprints, shader sources, and default selection must remain unchanged. Existing
golden tests must continue to pass.

## Tests

Add or extend tests for:

- byte-identical City DNA and lot data for the same seed model;
- meaningful City DNA or lot variation for different identities;
- finder-pattern landmark and courtyard classification;
- exact City QR endpoint occupancy from the canonical QR block field;
- City shader-source lazy selection without loading Tree or Terrain sources;
- City shader structure and staged reversible morph behavior;
- React and Web Component acceptance of `city`;
- Tree remaining the default and invalid Web Component values resolving to Tree;
- clean renderer disposal/model canvas replacement behavior;
- unchanged Tree and Terrain golden fingerprints;
- a separate City chunk in production build output.

## Verification

Run and repair City-related failures from:

```text
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

Completion requires all checks to pass and the production build to preserve City lazy loading.
