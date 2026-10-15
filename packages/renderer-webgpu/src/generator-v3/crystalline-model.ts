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
  const turn = next() * Math.PI * 2;
  const clusterCount = 2 + Math.floor(next() * 4);
  const habit = next();
  const growth = habit < 1 / 3 ? "ridge" : habit < 2 / 3 ? "crown" : "spires";
  const centers = Array.from({ length: clusterCount }, (_, i): readonly [number, number] => {
    const angle = turn + (i * Math.PI * 2) / clusterCount + (next() - 0.5) * 0.55;
    const reach = (i === 0 ? 0.08 : 0.18) + next() * 0.075;
    if (growth === "ridge") {
      const along = (i / (clusterCount - 1) - 0.5) * 0.42;
      return [Math.cos(turn) * along, Math.sin(turn) * along];
    }
    return [Math.cos(angle) * reach, Math.sin(angle) * reach];
  });
  const crystals: Crystal[] = [];
  centers.forEach((center, cluster) => {
    const count = (cluster === 0 ? 13 : 7) + Math.floor(next() * 7);
    const spread = (growth === "spires" ? 0.045 : 0.075) + next() * 0.05;
    const stature = cluster === 0 ? 0.33 + next() * 0.17 : 0.17 + next() * 0.19;
    for (let i = 0; i < count; i++) {
      const angle = next() * Math.PI * 2;
      const reach = i === 0 ? 0 : 0.025 + Math.sqrt(next()) * spread;
      const hero = i === 0;
      crystals.push({
        center: [center[0] + Math.cos(angle) * reach, 0.013, center[1] + Math.sin(angle) * reach],
        radius: hero
          ? 0.032 + (growth === "spires" ? 0.012 : habit * 0.065)
          : 0.013 + habit * 0.014 + next() * 0.014,
        height: hero ? stature : 0.045 + next() * stature * 0.67,
        sides: habit > 0.65 ? 5 : 6,
        angle: next() * Math.PI,
        lean: [Math.cos(angle) * (hero ? 0.12 : 0.36), Math.sin(angle) * (hero ? 0.12 : 0.36)],
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
  // Cluster count, mineral habit and growth directions all belong to the URL's composition.
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
  const chipCount = 12 + Math.floor(next() * 13);
  for (let i = 0; i < chipCount; i++) {
    const angle = (i * Math.PI * 2) / chipCount + next() * 0.12;
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
  const shardCount = 3 + Math.floor(next() * 7);
  for (let i = 0; i < shardCount; i++) {
    const angle = turn + (i * Math.PI * 2) / shardCount;
    const center: Vec3 = [Math.cos(angle) * 0.32, 0.17 + next() * 0.21, Math.sin(angle) * 0.28];
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
    growth,
  };
}
