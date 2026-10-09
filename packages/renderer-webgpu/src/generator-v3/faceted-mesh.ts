import type { SeedModel } from "../seed-model.js";
import type { CandidateWorld, WorldDrawPlan } from "./world-draw.js";

export type Vec3 = readonly [number, number, number];
export type Mesh = number[];
export const FACET_QR_FIRST_INSTANCE = 128;
export const FACET_HEADER_FLOATS = FACET_QR_FIRST_INSTANCE * 12;

/** Candidate-only stream; QR modules contribute variation without changing identity. */
export function worldRandom(model: SeedModel, salt: number) {
  let state = (salt ^ model.qrSize ^ Math.floor(model.morphSeed * 0xffffffff)) >>> 0;
  for (const module of model.modules) state = Math.imul(state ^ module.index, 16777619) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function triangle(mesh: Mesh, a: Vec3, b: Vec3, c: Vec3, material = 0, phase = 0) {
  const u = b.map((v, i) => v - a[i]!) as unknown as Vec3;
  const v = c.map((v, i) => v - a[i]!) as unknown as Vec3;
  const n: Vec3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const length = Math.hypot(...n);
  if (length < 1e-10) throw new RangeError("Degenerate candidate triangle");
  for (const p of [a, b, c]) mesh.push(...p, material, ...n.map((v) => v / length), phase);
}
export function face(mesh: Mesh, a: Vec3, b: Vec3, c: Vec3, d: Vec3, material = 0, phase = 0) {
  triangle(mesh, a, b, c, material, phase);
  triangle(mesh, a, c, d, material, phase);
}
export function box(mesh: Mesh, center: Vec3, size: Vec3, material = 0) {
  const p = (x: number, y: number, z: number): Vec3 => [
    center[0] + (x * size[0]) / 2,
    center[1] + (y * size[1]) / 2,
    center[2] + (z * size[2]) / 2,
  ];
  face(mesh, p(-1, 1, -1), p(-1, 1, 1), p(1, 1, 1), p(1, 1, -1), material);
  face(mesh, p(-1, -1, -1), p(1, -1, -1), p(1, -1, 1), p(-1, -1, 1), material);
  face(mesh, p(-1, -1, 1), p(1, -1, 1), p(1, 1, 1), p(-1, 1, 1), material);
  face(mesh, p(1, -1, -1), p(-1, -1, -1), p(-1, 1, -1), p(1, 1, -1), material);
  face(mesh, p(1, -1, 1), p(1, -1, -1), p(1, 1, -1), p(1, 1, 1), material);
  face(mesh, p(-1, -1, -1), p(-1, -1, 1), p(-1, 1, 1), p(-1, 1, -1), material);
}
export type FacetedPart = {
  mesh: Mesh;
  motion?: number;
  phase?: number;
  pivot?: Vec3;
  ratio?: number;
  parameters?: readonly [number, number, number, number];
};

/** Three vec4 descriptors per part, followed by eight floats per flat-shaded vertex. */
export function packFacetedWorld(model: SeedModel, form: CandidateWorld, parts: FacetedPart[]) {
  if (model.generatorVersion !== 3)
    throw new RangeError("Faceted worlds require generator version 3");
  if (parts.length < 2 || parts.length >= FACET_QR_FIRST_INSTANCE)
    throw new RangeError("Invalid part count");
  const modelData = new Float32Array(
    FACET_HEADER_FLOATS + parts.reduce((n, p) => n + p.mesh.length, 0),
  );
  let offset = FACET_HEADER_FLOATS;
  parts.forEach((part, i) => {
    modelData.set(
      [
        offset / 4,
        part.mesh.length / 8,
        part.motion ?? 0,
        part.phase ?? 0,
        ...(part.pivot ?? [0, 0, 0]),
        part.ratio ?? 1,
        ...(part.parameters ?? [0, 0, 0, 0]),
      ],
      i * 12,
    );
    modelData.set(part.mesh, offset);
    offset += part.mesh.length;
  });
  const drawPlan: WorldDrawPlan = {
    form,
    requiredDataLength: modelData.length,
    batches: [
      {
        role: "foundation",
        verticesPerInstance: parts[0]!.mesh.length / 8,
        instanceCount: 1,
        firstInstance: 0,
        requiredDataLength: modelData.length,
      },
      {
        role: "surface",
        verticesPerInstance: Math.max(...parts.slice(1).map((p) => p.mesh.length / 8)),
        instanceCount: parts.length - 1,
        firstInstance: 1,
        requiredDataLength: modelData.length,
      },
    ],
    qr: {
      verticesPerInstance: 6,
      instanceCount: model.qrSize ** 2,
      firstInstance: FACET_QR_FIRST_INSTANCE,
    },
  };
  return { modelData, drawPlan };
}
