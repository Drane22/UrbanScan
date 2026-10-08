# UrbanScan

A local link-to-world studio: choose one of 15 procedural worlds, customize its colors, and reveal a QR code for the same URL.

The studio includes Paper, Midnight, and Lavender appearances; grouped world cards; draft-and-Generate URL editing; sample destinations; zoom; replay for staged worlds; and QR details. Its layout supports desktop, mobile, and landscape screens.

Worlds: Tree, Terrain, City, Circuit, Reef, Colony, Dungeon, Origami, Stained Glass, Mycelium, Solar System, Toy Block, Waves, Crystalline, and Mechanical. The twelve original worlds offer six palettes each; the three new worlds offer four each (84 total).

```sh
pnpm install
pnpm dev
```

WebGPU powers the 3D preview. Framework adapters provide a canonical SVG QR fallback when renderer initialization fails after identity preparation. Generator version 2 is the default; persist a version when storing a world. Explicit version 1 requests retain the original layouts and shaders for the original twelve forms.

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

See [architecture](docs/technical-architecture.md), [adding a model](docs/adding-renderer-model.md), and [feature roadmap](docs/model-roadmap.md).
