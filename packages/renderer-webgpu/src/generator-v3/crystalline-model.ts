import type { SeedModel } from "../seed-model.js";
import {
  box,
  face,
  triangle,
  packFacetedWorld,
  worldRandom,
  type Mesh,
  type Vec3,
} from "./faceted-mesh.js";

export type Crystal = {
  center: Vec3;
  radius: number;
  height: number;
  sides: number;
  angle: number;
  lean: readonly [number, number];
  phase: number;
  cluster: number;
};

/** Body quads share a translated ring, so both triangles occupy exactly one plane. */
export function crystalMesh(crystal: Crystal): Mesh {
  const mesh: Mesh = [];
  const { center, radius, height, sides, angle, lean, phase } = crystal;
  const shoulder = height * 0.69;
  const ring = (i: number, top: boolean): Vec3 => {
    const a = angle + (i * Math.PI * 2) / sides;
    return [
      center[0] + Math.cos(a) * radius + (top ? lean[0] * shoulder : 0),
      center[1] + (top ? shoulder : 0),
      center[2] + Math.sin(a) * radius + (top ? lean[1] * shoulder : 0),
    ];
  };
  const tip: Vec3 = [
    center[0] + lean[0] * height,
    center[1] + height,
    center[2] + lean[1] * height,
  ];
  for (let i = 0; i < sides; i++) {
    const a = ring(i, false),
      b = ring(i + 1, false),
      c = ring(i + 1, true),
      d = ring(i, true);
    const facetPhase = phase + i * 0.73;
    face(mesh, a, d, c, b, 1, facetPhase);
    triangle(mesh, d, tip, c, 2, facetPhase + 0.31);
    triangle(mesh, a, b, center, 0, facetPhase);
  }
  return mesh;
}

export function createCrystallineLayout(model: SeedModel) {
  const next = worldRandom(model, 0x43525933);
  const turn = (next() - 0.5) * 0.8;
  const rotate = (x: number, z: number): readonly [number, number] => [
    x * Math.cos(turn) - z * Math.sin(turn),
    x * Math.sin(turn) + z * Math.cos(turn),
  ];
  const centers = [rotate(-0.13, 0.12), rotate(0.25, 0.03), rotate(-0.19, -0.25)];
  const crystals: Crystal[] = [];
  centers.forEach((center, cluster) => {
    const count = cluster === 0 ? 8 : 5;
    for (let i = 0; i < count; i++) {
      const angle = next() * Math.PI * 2;
      const reach = i === 0 ? 0 : 0.075 + next() * 0.08;
      const hero = i === 0;
      crystals.push({
        center: [center[0] + Math.cos(angle) * reach, 0.013, center[1] + Math.sin(angle) * reach],
        radius: hero ? 0.054 + next() * 0.023 : 0.022 + next() * 0.018,
        height: hero ? (cluster === 0 ? 0.36 : 0.22) + next() * 0.1 : 0.07 + next() * 0.15,
        sides: next() > 0.25 ? 6 : 5,
        angle: next() * Math.PI,
        lean: [(next() - 0.5) * 0.4, (next() - 0.5) * 0.4],
        phase: next() * Math.PI * 2,
        cluster,
      });
    }
  });
  const base: Mesh = [];
  box(base, [0, -0.035, 0], [0.98, 0.075, 0.98]);
  // Low mineral hosts follow the three clusters, leaving the spaces between them open.
  const hosts = centers.map((center, cluster) =>
    crystalMesh({
      center: [center[0], 0, center[1]],
      radius: cluster === 0 ? 0.21 : 0.16,
      height: 0.03,
      sides: 7,
      angle: next(),
      lean: [0, 0],
      phase: next() * 6,
      cluster,
    }),
  );
  return {
    ...packFacetedWorld(model, "crystalline", [
      { mesh: base },
      ...hosts.map((mesh) => ({ mesh })),
      ...crystals.map((c) => ({ mesh: crystalMesh(c) })),
    ]),
    crystals,
    centers,
  };
}
