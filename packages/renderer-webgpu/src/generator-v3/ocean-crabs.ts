import { box, face, triangle, type Mesh, type Vec3 } from "./faceted-mesh.js";

export type CrabTrack = {
  center: readonly [number, number];
  travel: number;
  phase: number;
  scale: number;
  speed: number;
};

/** Disjoint beach lanes keep the entire gait on dry sand, including each turnaround. */
export function createCrabTracks(next: () => number): CrabTrack[] {
  const count = 3 + Math.floor(next() * 3);
  return Array.from({ length: count }, (_, i) => ({
    center: [-0.3 + (i / (count - 1)) * 0.6, -0.385 - next() * 0.045],
    travel: 0.016 + next() * 0.011,
    phase: next() * Math.PI * 2,
    scale: 0.72 + next() * 0.35,
    speed: 0.65 + next() * 0.5,
  }));
}

/** Vertex phase tags identify rigid shell, claws, and the alternating leg pairs. */
export function createCrabMesh(): Mesh {
  const mesh: Mesh = [];
  const limb = (a: Vec3, b: Vec3, width: number, tag: number) => {
    const start = mesh.length;
    const dx = b[0] - a[0],
      dz = b[2] - a[2];
    const length = Math.hypot(dx, dz);
    const side: Vec3 = [(-dz / length) * width, 0, (dx / length) * width];
    const ring = (p: Vec3, i: number): Vec3 => [
      p[0] + side[0] * Math.cos((i * Math.PI) / 2),
      p[1] + width * Math.sin((i * Math.PI) / 2),
      p[2] + side[2] * Math.cos((i * Math.PI) / 2),
    ];
    for (let i = 0; i < 4; i++)
      face(mesh, ring(a, i), ring(b, i), ring(b, i + 1), ring(a, i + 1), 11);
    for (let i = start + 7; i < mesh.length; i += 8) mesh[i] = tag;
  };
  const ring = (i: number): Vec3 => [
    Math.cos((i * Math.PI) / 4) * 0.022,
    0.012,
    Math.sin((i * Math.PI) / 4) * 0.016,
  ];
  for (let i = 0; i < 8; i++) {
    triangle(mesh, ring(i), [0, 0.024, 0], ring(i + 1), 11);
    triangle(mesh, ring(i + 1), [0, 0.007, 0], ring(i), 11);
  }
  for (const side of [-1, 1]) {
    for (let leg = 0; leg < 4; leg++) {
      const z = -0.01 + leg * 0.007;
      const tag = 1 + leg + (side > 0 ? 4 : 0);
      const knee: Vec3 = [side * (0.03 + Math.sin(leg) * 0.004), 0.015, z * 1.7];
      limb([side * 0.014, 0.013, z], knee, 0.0023, tag);
      limb(knee, [side * 0.042, 0.002, z * 2.1 + 0.006], 0.0017, tag);
    }
    limb([side * 0.014, 0.015, -0.008], [side * 0.027, 0.027, -0.024], 0.003, 9);
    limb([side * 0.027, 0.027, -0.024], [side * 0.02, 0.031, -0.035], 0.005, 9);
    limb([side * 0.02, 0.031, -0.035], [side * 0.011, 0.033, -0.038], 0.0025, 9);
    limb([side * 0.02, 0.031, -0.035], [side * 0.017, 0.033, -0.044], 0.0025, 9);
    box(mesh, [side * 0.008, 0.024, -0.013], [0.0025, 0.011, 0.0025], 11);
    box(mesh, [side * 0.008, 0.031, -0.014], [0.005, 0.005, 0.005], 12);
  }
  return mesh;
}
