# URL compositions and surf verification

Changes are confined to the version 3 mechanical, crystalline and waves renderers used by the studio. URL-derived geometry remains deterministic. The ocean adds one shared crab mesh and three to five instance tracks, a concave open breaker, a lower viewing angle, and foam concentrated around the crest and lip.

`node scripts/verify-url-worlds.mjs` exercises two paths on example.com, nasa.gov, and github.com using the same palette and controlled animation time. Browser verification uses Chrome with software WebGPU, at 768 and 320 pixels.

The final browser run passed all three worlds:

| World | Changed pixels versus first URL (768 px) | Animated pixels | Reduced motion | QR decode |
| --- | --- | --- | --- | --- |
| Waves | 52,163 / 65,033 / 75,091 | 44,062 | Stable | 768 and 320 |
| Mechanical | 81,201 / 88,729 / 85,883 | 26,624 | Stable | 768 and 320 |
| Crystalline | 67,697 / 67,677 / 66,676 | 26,953 | Stable | 768 and 320 |

The ocean additionally changed 1,114 pixels selected by its crab material color during the motion check. No browser or renderer errors were reported. Screenshots and raw results are in `.qa/url-compositions/final/`.

Model tests cover 16 distinct same-host URLs, deterministic regeneration, visible composition parameters, open/concave wave geometry, bounded meshes and normals, mechanical coupling, upload limits, and crab instance ranges. Version 3 visual checkpoints are refreshed for the requested redesign; earlier renderer versions remain separate.

Final focused regression run: **9 files, 115 tests passed**, covering `generator-v3/`, version 3 fidelity/version dispatch, prepared scenes and renderer tests. Formatting and lint passed for the changed implementation files.

Final `pnpm build` passed, including all package builds, TypeScript checks, Vite production bundling, and studio prerendering. A separate focused fidelity run passed all three saved checkpoints without further updates.

A snapshot-refresh invocation also selected unrelated tests and reported failures in `seed-model.test.ts` (tree archetypes) and `renderer-lifetime.test.ts` (version 1 tree/terrain scan endpoints). That broad invocation was stopped. Those implementations are outside this change. Only the version 3 snapshot was updated; the version 2 snapshot retained its previous timestamp.

The browser checks verify behavior and software-rendered appearance, not hardware GPU performance.
