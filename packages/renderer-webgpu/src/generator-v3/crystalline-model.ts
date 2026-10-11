import type { SeedModel } from "../seed-model.js";
import {
  face,
  triangle,
  packFacetedWorld,
  worldRandom,
  type Mesh,
  type Vec3,
  type FacetedPart,
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
    const count = cluster === 0 ? 16 : 10;
    for (let i = 0; i < count; i++) {
      const angle = next() * Math.PI * 2;
      const reach = i === 0 ? 0 : 0.045 + Math.sqrt(next()) * 0.12;
      const hero = i === 0;
      crystals.push({
        center: [center[0] + Math.cos(angle) * reach, 0.013, center[1] + Math.sin(angle) * reach],
        radius: hero ? 0.054 + next() * 0.023 : 0.022 + next() * 0.018,
        height: hero ? (cluster === 0 ? 0.4 : 0.26) + next() * 0.07 : 0.055 + next() * 0.19,
        sides: next() > 0.25 ? 6 : 5,
        angle: next() * Math.PI,
        lean: [(next() - 0.5) * 0.4, (next() - 0.5) * 0.4],
        phase: next() * Math.PI * 2,
        cluster,
      });
    }
  });
  const base: Mesh = [];
  const rim = Array.from({ length: 14 }, (_, i): Vec3 => {
    const a = (i * Math.PI * 2) / 14;
    const radius = 0.43 + next() * 0.045;
    return [Math.cos(a) * radius, 0.006 + next() * 0.014, Math.sin(a) * radius];
  });
  for (let i = 0; i < rim.length; i++) {
    const a = rim[i]!,
      b = rim[(i + 1) % rim.length]!;
    const innerA: Vec3 = [a[0] * 0.83, 0.034, a[2] * 0.83];
    const innerB: Vec3 = [b[0] * 0.83, 0.034, b[2] * 0.83];
    face(base, a, innerA, innerB, b, 3, i);
    triangle(base, innerA, [0, 0.005, 0], innerB, 0, i);
    face(base, a, b, [b[0] * 0.88, -0.09, b[2] * 0.88], [a[0] * 0.88, -0.09, a[2] * 0.88], 0, i);
  }
  // The fractured stone rim and three interlocking clusters form a single mineral island.
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
  const parts: FacetedPart[] = [
    { mesh: base },
    ...hosts.map((mesh) => ({ mesh })),
    ...crystals.map((c) => ({ mesh: crystalMesh(c) })),
  ];
  for (let i = 0; i < 24; i++) {
    const angle = (i * Math.PI * 2) / 24 + next() * 0.12;
    const reach = 0.32 + next() * 0.08;
    const chip: Crystal = {
      center: [Math.cos(angle) * reach, 0.02, Math.sin(angle) * reach],
      radius: 0.015 + next() * 0.014,
      height: 0.025 + next() * 0.045,
      sides: 5,
      angle,
      lean: [Math.cos(angle) * 0.4, Math.sin(angle) * 0.4],
      phase: next() * 6,
      cluster: 3,
    };
    parts.push({ mesh: crystalMesh(chip) });
  }
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI * 2) / 8;
    const center: Vec3 = [Math.cos(angle) * 0.32, 0.24 + (i % 3) * 0.07, Math.sin(angle) * 0.28];
    const shard: Crystal = {
      center,
      radius: 0.018 + next() * 0.013,
      height: 0.085 + next() * 0.055,
      sides: 6,
      angle,
      lean: [(next() - 0.5) * 0.7, (next() - 0.5) * 0.7],
      phase: next() * 6,
      cluster: 4,
    };
    parts.push({
      mesh: crystalMesh(shard),
      motion: 1,
      pivot: center,
      phase: angle,
      ratio: 0.7 + next() * 0.5,
    });
  }
  return {
    ...packFacetedWorld(model, "crystalline", parts),
    crystals,
    centers,
  };
}
