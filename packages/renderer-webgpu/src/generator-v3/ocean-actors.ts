import { box, face, triangle, type Mesh, type Vec3 } from "./faceted-mesh.js";

function spar(mesh: Mesh, a: Vec3, b: Vec3, radius: number, material: number) {
  const d = b.map((n, i) => n - a[i]!) as unknown as Vec3;
  const length = Math.hypot(...d);
  const axis = d.map((n) => n / length) as unknown as Vec3;
  const cross = (u: Vec3, v: Vec3): Vec3 => [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ];
  const side = cross(axis, Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]);
  const size = Math.hypot(...side);
  const u = side.map((n) => n / size) as unknown as Vec3;
  const v = cross(axis, u);
  const point = (p: Vec3, i: number): Vec3 =>
    p.map(
      (n, k) =>
        n + radius * (u[k]! * Math.cos((i * Math.PI) / 3) + v[k]! * Math.sin((i * Math.PI) / 3)),
    ) as unknown as Vec3;
  for (let i = 0; i < 6; i++) {
    face(mesh, point(a, i), point(a, i + 1), point(b, i + 1), point(b, i), material);
    triangle(mesh, a, point(a, i + 1), point(a, i), material);
    triangle(mesh, b, point(b, i), point(b, i + 1), material);
  }
}

/** Small modeled silhouettes, uploaded once and animated with the water in WGSL. */
export function createOceanActors(): readonly Mesh[] {
  const boat: Mesh = [];
  const outline: Vec3[] = [
    [-0.095, 0.015, 0],
    [-0.056, 0.015, -0.037],
    [0.061, 0.015, -0.034],
    [0.092, 0.015, 0],
    [0.061, 0.015, 0.034],
    [-0.056, 0.015, 0.037],
  ];
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i]!,
      b = outline[(i + 1) % outline.length]!;
    triangle(boat, [0, 0.015, 0], a, b, 6);
    face(boat, a, [a[0] * 0.78, -0.021, a[2] * 0.55], [b[0] * 0.78, -0.021, b[2] * 0.55], b, 7);
  }
  box(boat, [0.035, 0.026, 0], [0.044, 0.018, 0.038], 7);
  spar(boat, [-0.019, 0.015, 0], [-0.019, 0.245, 0], 0.003, 8);
  spar(boat, [-0.019, 0.045, 0], [0.082, 0.045, 0], 0.0025, 8);
  // Two billowed sail panels, with a bright contrasting jib.
  face(boat, [-0.017, 0.23, 0], [0.014, 0.12, 0.012], [0.079, 0.05, 0], [-0.017, 0.05, 0], 6);
  triangle(boat, [-0.025, 0.205, 0], [-0.086, 0.034, 0], [-0.027, 0.045, 0.008], 9);
  const surfer: Mesh = [];
  for (let i = 0; i < 16; i++) {
    const p = (k: number, y: number): Vec3 => [
      Math.cos((k * Math.PI) / 8) * 0.077,
      y,
      Math.sin((k * Math.PI) / 8) * 0.024,
    ];
    triangle(surfer, [0, 0.007, 0], p(i, 0.007), p(i + 1, 0.007), 9);
    face(surfer, p(i, 0.007), p(i, -0.004), p(i + 1, -0.004), p(i + 1, 0.007), 6);
  }
  box(surfer, [-0.017, 0.063, 0], [0.024, 0.033, 0.021], 8);
  // Bent knees and outstretched arms read as a rider, rather than a standing post.
  spar(surfer, [-0.019, 0.048, 0], [-0.041, 0.028, 0.002], 0.008, 8);
  spar(surfer, [-0.041, 0.028, 0.002], [-0.029, 0.012, 0.003], 0.006, 10);
  spar(surfer, [-0.005, 0.048, 0], [0.02, 0.033, 0], 0.008, 8);
  spar(surfer, [0.02, 0.033, 0], [0.036, 0.012, 0.001], 0.006, 10);
  spar(surfer, [-0.02, 0.075, -0.008], [-0.045, 0.07, -0.018], 0.005, 10);
  spar(surfer, [-0.045, 0.07, -0.018], [-0.052, 0.055, -0.02], 0.004, 10);
  spar(surfer, [-0.011, 0.075, 0.008], [0.016, 0.074, 0.018], 0.005, 10);
  spar(surfer, [0.016, 0.074, 0.018], [0.031, 0.087, 0.021], 0.004, 10);
  spar(surfer, [-0.024, 0.084, 0], [-0.025, 0.102, 0], 0.01, 10);
  return [boat, surfer];
}
