import type { SeedModel } from "../seed-model.js";
import type { WorldDrawPlan } from "./world-draw.js";

import {
  oceanCrestPoint,
  oceanFieldPoint,
  sampleOceanMesh,
  type OceanCrest,
  type Point,
} from "./waves-surface.js";
export { oceanCrestPoint, oceanFieldPoint, type OceanCrest } from "./waves-surface.js";

export const OCEAN_FIELD_SEGMENTS = 40;
export const OCEAN_CREST_LENGTH_SEGMENTS = 44;
export const OCEAN_CREST_PROFILE_SEGMENTS = 32;
export const OCEAN_HEADER_FLOATS = 64;
export const OCEAN_QR_FIRST_INSTANCE = 64;
function randomStream(model: SeedModel) {
  let state = (0x57415633 ^ model.qrSize ^ Math.floor(model.morphSeed * 0xffffffff)) >>> 0;
  for (const module of model.modules) state = Math.imul(state ^ module.index, 16777619) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
export function createOceanLayout(model: SeedModel) {
  if (model.generatorVersion !== 3)
    throw new RangeError("Ocean layout requires generator version 3");
  const next = randomStream(model);
  const side = next() < 0.5 ? -1 : 1;
  const crests: OceanCrest[] = [
    {
      center: [side * 0.1 + (next() - 0.5) * 0.09, 0.015 + next() * 0.095],
      length: 0.5 + next() * 0.18,
      height: 0.25 + next() * 0.1,
      width: 0.21 + next() * 0.065,
      angle: Math.PI - 0.96 + next() * 0.7,
      bow: -0.02 + next() * 0.13,
      curl: 0.85 + next() * 0.25,
      phase: next() * Math.PI * 2,
    },
    {
      center: [-side * 0.25 + (next() - 0.5) * 0.035, -0.235 + (next() - 0.5) * 0.045],
      length: 0.28 + next() * 0.07,
      height: 0.055 + next() * 0.025,
      width: 0.075 + next() * 0.025,
      angle: side > 0 ? 3.3 + next() * 0.4 : 1.7 + next() * 0.4,
      bow: 0.025 + next() * 0.03,
      curl: 0.7 + next() * 0.15,
      phase: next() * Math.PI * 2,
    },
  ];
  crests[1] = {
    ...crests[1]!,
    angle:
      side > 0
        ? Math.max(crests[1]!.angle, crests[0]!.angle + 0.5)
        : Math.min(crests[1]!.angle, crests[0]!.angle - 0.5),
  };
  if (next() > 0.42)
    crests.push({
      center: [-side * 0.24 + (next() - 0.5) * 0.035, 0.21 + (next() - 0.5) * 0.035],
      length: 0.28 + next() * 0.04,
      height: 0.045 + next() * 0.015,
      width: 0.06 + next() * 0.025,
      angle: -0.6 + next() * 0.2,
      bow: 0.025,
      curl: 0.72,
      phase: next() * Math.PI * 2,
    });
  const baseHeight = (p: Point) => oceanFieldPoint(crests, p[0], p[2])[1];
  const pieces = [
    sampleOceanMesh(
      (u, v) => oceanFieldPoint(crests, u - 0.5, v - 0.5),
      OCEAN_FIELD_SEGMENTS,
      OCEAN_FIELD_SEGMENTS,
      baseHeight,
    ),
    ...crests.map((_, i) =>
      sampleOceanMesh(
        (u, v) => oceanCrestPoint(crests, i, u, v),
        OCEAN_CREST_LENGTH_SEGMENTS,
        OCEAN_CREST_PROFILE_SEGMENTS,
        baseHeight,
      ),
    ),
  ];
  const sprayCount = 12 + (crests.length - 1) * 6;
  const spray = new Float32Array(sprayCount * 8);
  for (let i = 0; i < sprayCount; i++) {
    const index = i < 12 ? 0 : 1 + Math.floor((i - 12) / 6);
    const origin = oceanCrestPoint(crests, index, 0.15 + next() * 0.7, 0.82 + next() * 0.08);
    const crest = crests[index]!;
    spray.set(
      [
        ...origin,
        baseHeight(origin),
        -Math.sin(crest.angle),
        Math.cos(crest.angle),
        index,
        0.002 + next() * 0.0025,
      ],
      i * 8,
    );
  }
  const modelData = new Float32Array(
    OCEAN_HEADER_FLOATS + pieces.reduce((sum, data) => sum + data.length, 0) + spray.length,
  );
  let offset = OCEAN_HEADER_FLOATS;
  modelData.set([offset / 4, OCEAN_FIELD_SEGMENTS, OCEAN_FIELD_SEGMENTS, crests.length], 0);
  modelData.set(pieces[0]!, offset);
  offset += pieces[0]!.length;
  crests.forEach((crest, i) => {
    modelData.set(
      [
        ...crest.center,
        crest.length,
        crest.angle,
        crest.height,
        crest.width,
        crest.bow,
        crest.phase,
        offset / 4,
        OCEAN_CREST_LENGTH_SEGMENTS,
        OCEAN_CREST_PROFILE_SEGMENTS,
        crest.curl,
      ],
      (4 + i * 3) * 4,
    );
    modelData.set(pieces[i + 1]!, offset);
    offset += pieces[i + 1]!.length;
  });
  modelData.set([offset / 4, sprayCount, OCEAN_QR_FIRST_INSTANCE, 0], 4);
  modelData.set(spray, offset);
  const batch = (
    role: "foundation" | "surface" | "ambient",
    verticesPerInstance: number,
    instanceCount: number,
    firstInstance: number,
  ) => ({
    role,
    verticesPerInstance,
    instanceCount,
    firstInstance,
    requiredDataLength: modelData.length,
  });
  const drawPlan: WorldDrawPlan = {
    form: "waves",
    requiredDataLength: modelData.length,
    batches: [
      batch("foundation", 30, 1, 0),
      batch("surface", OCEAN_FIELD_SEGMENTS ** 2 * 6, 1, 1),
      batch(
        "surface",
        OCEAN_CREST_LENGTH_SEGMENTS * OCEAN_CREST_PROFILE_SEGMENTS * 6,
        crests.length,
        2,
      ),
      batch("ambient", 24, sprayCount, 8),
    ],
    qr: {
      verticesPerInstance: 6,
      instanceCount: model.qrSize ** 2,
      firstInstance: OCEAN_QR_FIRST_INSTANCE,
    },
  };
  return { modelData, drawPlan, crests };
}
