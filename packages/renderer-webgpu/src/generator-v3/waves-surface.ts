export type Point = readonly [number, number, number];
export type OceanCrest = {
  readonly center: readonly [number, number];
  readonly length: number;
  readonly height: number;
  readonly width: number;
  readonly angle: number;
  readonly bow: number;
  readonly curl: number;
  readonly phase: number;
};
// An open breaking sheet: rising back, rounded crown, descending overhang,
// then an inward-turning lip. This is a curl, not a closed tube or repeated ridge.
const PROFILE = [
  [-1, 0],
  [-0.78, 0.015],
  [-0.4, 0.23],
  [-0.18, 0.66],
  [0, 0.96],
  [0.28, 1],
  [0.62, 0.92],
  [0.78, 0.73],
  [0.68, 0.55],
  [0.38, 0.56],
] as const;

function profile(t: number): readonly [number, number] {
  const f = Math.min(1, Math.max(0, t)) * (PROFILE.length - 1);
  const i = Math.min(PROFILE.length - 2, Math.floor(f));
  const v = f - i;
  const interpolate = (axis: 0 | 1) => {
    const a = PROFILE[Math.max(0, i - 1)]![axis];
    const b = PROFILE[i]![axis];
    const c = PROFILE[i + 1]![axis];
    const d = PROFILE[Math.min(PROFILE.length - 1, i + 2)]![axis];
    return (
      0.5 *
      (2 * b +
        (c - a) * v +
        (2 * a - 5 * b + 4 * c - d) * v * v +
        (-a + 3 * b - 3 * c + d) * v * v * v)
    );
  };
  return [interpolate(0), Math.max(0, interpolate(1))];
}
export function oceanFieldPoint(crests: readonly OceanCrest[], x: number, z: number): Point {
  const edge = Math.max(0, (1 - (2 * x) ** 8) * (1 - (2 * z) ** 8));
  let y = 0.0025 * Math.sin(x * 13 + z * 8) * Math.cos(z * 12 - x * 4);
  for (const crest of crests) {
    const dx = x - crest.center[0],
      dz = z - crest.center[1];
    const along = dx * Math.cos(crest.angle) + dz * Math.sin(crest.angle);
    const across = -dx * Math.sin(crest.angle) + dz * Math.cos(crest.angle);
    const taper = Math.exp(-((along / (crest.length * 0.45)) ** 4));
    y -=
      crest.height *
      0.12 *
      taper *
      Math.exp(-(((across - crest.width * 0.8) / (crest.width * 0.4)) ** 2));
  }
  return [x, y * edge, z];
}
export function oceanCrestPoint(
  crests: readonly OceanCrest[],
  index: number,
  u: number,
  t: number,
): Point {
  const crest = crests[index]!;
  const smooth = (value: number) => {
    const v = Math.max(0, Math.min(1, value));
    return v * v * (3 - 2 * v);
  };
  const envelope = smooth(u / 0.17) * (1 - smooth((u - 0.8) / 0.2));
  const [cross, rise] = profile(t);
  const along = (u - 0.5) * crest.length;
  const irregular = 1 + Math.sin(u * 7 + crest.phase) * 0.045;
  const across =
    cross * crest.width * (0.4 + envelope * 0.6) * (1 + (crest.curl - 1) * Math.max(0, t - 0.4)) +
    crest.bow * ((u * 2 - 1) ** 2 - 0.35);
  const x = crest.center[0] + along * Math.cos(crest.angle) - across * Math.sin(crest.angle);
  const z = crest.center[1] + along * Math.sin(crest.angle) + across * Math.cos(crest.angle);
  const base = oceanFieldPoint(crests, x, z)[1];
  return [x, base + rise * crest.height * envelope * irregular, z];
}
function unitNormal(a: Point, b: Point): Point {
  const n: Point = [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const length = Math.hypot(...n);
  return length > 1e-10 ? [n[0] / length, n[1] / length, n[2] / length] : [0, 1, 0];
}
export function sampleOceanMesh(
  point: (u: number, v: number) => Point,
  along: number,
  across: number,
  baseHeight: (p: Point) => number,
): Float32Array {
  const data = new Float32Array((along + 1) * (across + 1) * 8);
  const difference = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  for (let row = 0; row <= across; row++)
    for (let column = 0; column <= along; column++) {
      const u = column / along,
        v = row / across;
      const du = difference(point(clamp(u + 0.0001), v), point(clamp(u - 0.0001), v));
      const dv = difference(point(u, clamp(v + 0.0001)), point(u, clamp(v - 0.0001)));
      const position = point(u, v);
      data.set(
        [...position, baseHeight(position), ...unitNormal(dv, du), u],
        (row * (along + 1) + column) * 8,
      );
    }
  return data;
}
