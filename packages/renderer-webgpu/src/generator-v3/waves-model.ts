import type { SeedModel } from "../seed-model.js";
import type { WorldDrawPlan } from "./world-draw.js";
import { createOceanActors } from "./ocean-actors.js";
import { worldRandom } from "./faceted-mesh.js";
import { createCrabMesh, createCrabTracks } from "./ocean-crabs.js";

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
export function createOceanLayout(model: SeedModel) {
  if (model.generatorVersion !== 3)
    throw new RangeError("Ocean layout requires generator version 3");
  const next = worldRandom(model, 0x57415633);
  // A broad breaker moves toward the near shoreline; a low offshore swell follows it.
  const phase = next() * Math.PI * 2;
  const angle = Math.PI - 0.48 + (next() - 0.5) * 0.5;
  const crests: OceanCrest[] = [
    {
      center: [(next() - 0.5) * 0.07, 0.035 + next() * 0.07],
      length: 0.66 + next() * 0.18,
      height: 0.23 + next() * 0.08,
      width: 0.125 + next() * 0.05,
      angle,
      bow: 0.015 + next() * 0.065,
      curl: 1.05 + next() * 0.3,
      phase,
    },
    {
      center: [(next() - 0.5) * 0.12, 0.29],
      length: 0.32 + next() * 0.18,
      height: 0.035 + next() * 0.055,
      width: 0.06,
      angle: angle + (next() - 0.5) * 0.2,
      bow: 0.04,
      curl: 0.55,
      phase: phase + 1,
    },
  ];
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
  const sprayCount = 32;
  const rockCount = 10;
  const spray = new Float32Array((sprayCount + rockCount) * 8);
  for (let i = 0; i < sprayCount; i++) {
    const index = i < 24 ? 0 : 1;
    const origin = oceanCrestPoint(crests, index, 0.15 + next() * 0.62, 0.58 + next() * 0.14);
    const crest = crests[index]!;
    spray.set(
      [
        ...origin,
        baseHeight(origin),
        -Math.sin(crest.angle),
        Math.cos(crest.angle),
        index,
        0.0025 + next() * 0.0035,
      ],
      i * 8,
    );
  }
  for (let i = 0; i < rockCount; i++) {
    const side = i % 2 ? 1 : -1;
    spray.set(
      [
        side * (0.3 + next() * 0.14),
        0.009 + next() * 0.008,
        -0.31 - next() * 0.025,
        0,
        0.012 + next() * 0.02,
        0.01 + next() * 0.02,
        99,
        next() * 6,
      ],
      (sprayCount + i) * 8,
    );
  }
  const actors = [...createOceanActors(), createCrabMesh()];
  const crabs = createCrabTracks(next);
  const crabData = crabs.flatMap((crab) => [
    ...crab.center,
    crab.travel,
    crab.phase,
    crab.scale,
    crab.speed,
    0,
    0,
  ]);
  const modelData = new Float32Array(
    OCEAN_HEADER_FLOATS +
      pieces.reduce((sum, data) => sum + data.length, 0) +
      spray.length +
      actors.reduce((sum, mesh) => sum + mesh.length, 0) +
      crabData.length,
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
  offset += spray.length;
  actors.forEach((mesh, i) => {
    modelData.set([offset / 4, mesh.length / 8, 0, 0], (i < 2 ? 2 + i : 13) * 4);
    modelData.set(mesh, offset);
    offset += mesh.length;
  });
  modelData.set([offset / 4, crabs.length, 0, 0], 14 * 4);
  modelData.set(crabData, offset);
  const facePoint = oceanCrestPoint(crests, 0, 0.68, 0.2);
  const rider: Point = [
    facePoint[0] - Math.sin(angle) * 0.1,
    facePoint[1],
    facePoint[2] + Math.cos(angle) * 0.1,
  ];
  modelData.set([...rider, baseHeight(rider)], 12 * 4);
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
      batch("ambient", 24, sprayCount + rockCount, 8),
      ...actors.map((mesh, i) =>
        batch("ambient", mesh.length / 8, i === 2 ? crabs.length : 1, 50 + i),
      ),
    ],
    qr: {
      verticesPerInstance: 6,
      instanceCount: model.qrSize ** 2,
      firstInstance: OCEAN_QR_FIRST_INSTANCE,
    },
  };
  return { modelData, drawPlan, crests, crabs };
}
