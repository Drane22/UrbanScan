import type { SeedForm, SeedModel } from "../seed-model.js";
// Retain the phase 4 address ceiling independently of historical population code.
const MAX_LEGACY_AMBIENT_INSTANCES = 384 * 4;

export type CandidateWorld = "waves" | "crystalline" | "mechanical";
export function isCandidateWorld(form: SeedForm): form is CandidateWorld {
  return form === "waves" || form === "crystalline" || form === "mechanical";
}
export type WorldDraw = {
  readonly role: "surface" | "foundation" | "ambient";
  readonly verticesPerInstance: number;
  readonly instanceCount: number;
  readonly firstInstance: number;
  /** Number of float32 values this batch requires in the world storage buffer. */
  readonly requiredDataLength: number;
};
export type WorldDrawPlan = {
  readonly form: CandidateWorld;
  readonly batches: readonly WorldDraw[];
  readonly requiredDataLength: number;
  readonly qr: {
    readonly verticesPerInstance: 6;
    readonly instanceCount: number;
    readonly firstInstance: number;
  };
};
/** Per canvas: max eight batches, 256 KiB world upload, and the finite budgets below.
 * Limits leave room for sampled crests/facets/gears without unlimited GPU work.
 */
export const WORLD_DRAW_LIMITS = {
  waves: { verticesPerInstance: 24576, instances: 1024, totalVertices: 2000000 },
  crystalline: { verticesPerInstance: 3072, instances: 1024, totalVertices: 1000000 },
  mechanical: { verticesPerInstance: 12288, instances: 1024, totalVertices: 2000000 },
} as const;
export const MAX_WORLD_DATA_FLOATS = 65536;
const MAX_QR_OWNERS = 177 * 177;
const MAX_FIRST_INSTANCE = MAX_QR_OWNERS * 4 + 1 + MAX_LEGACY_AMBIENT_INSTANCES;
function integer(value: number, min: number, max: number): boolean {
  return Number.isSafeInteger(value) && value >= min && value <= max;
}

export function validateWorldDrawPlan(
  plan: WorldDrawPlan,
  data: Float32Array,
  qrOwners: number,
): void {
  if (!Object.hasOwn(WORLD_DRAW_LIMITS, plan.form)) throw new RangeError("Unknown candidate world");
  if (
    !integer(qrOwners, 1, MAX_QR_OWNERS) ||
    plan.qr.verticesPerInstance !== 6 ||
    plan.qr.instanceCount !== qrOwners ||
    !integer(plan.qr.firstInstance, 0, MAX_FIRST_INSTANCE)
  )
    throw new RangeError("Invalid canonical QR draw");
  if (
    !integer(data.length, 4, MAX_WORLD_DATA_FLOATS) ||
    data.length % 4 ||
    plan.requiredDataLength !== data.length ||
    !data.every(Number.isFinite)
  )
    throw new RangeError("Invalid world upload data");
  if (!integer(plan.batches.length, 1, 8)) throw new RangeError("Invalid world batch count");
  const limit = WORLD_DRAW_LIMITS[plan.form];
  let total = 0;
  const intervals: [number, number][] = [];
  for (const batch of plan.batches) {
    if (
      !["surface", "foundation", "ambient"].includes(batch.role) ||
      !integer(batch.verticesPerInstance, 3, limit.verticesPerInstance) ||
      batch.verticesPerInstance % 3 ||
      !integer(batch.instanceCount, 1, limit.instances) ||
      !integer(batch.firstInstance, 0, MAX_FIRST_INSTANCE) ||
      batch.firstInstance + batch.instanceCount > MAX_FIRST_INSTANCE ||
      !integer(batch.requiredDataLength, 4, data.length) ||
      batch.requiredDataLength % 4
    )
      throw new RangeError("Invalid world draw range");
    const end = batch.firstInstance + batch.instanceCount;
    if (
      intervals.some(([start, stop]) => batch.firstInstance < stop && end > start) ||
      (batch.firstInstance < plan.qr.firstInstance + qrOwners && end > plan.qr.firstInstance)
    )
      throw new RangeError("Overlapping world/QR draw ranges");
    intervals.push([batch.firstInstance, end]);
    total += batch.verticesPerInstance * batch.instanceCount;
  }
  if (total > limit.totalVertices) throw new RangeError("World vertex budget exceeded");
}

/** Candidate remakes stay inside v3 only. */
export async function prepareCandidateWorld(model: SeedModel, form: CandidateWorld) {
  if (model.generatorVersion !== 3)
    throw new RangeError("Candidate worlds require generator version 3");
  if (form === "waves") {
    const ocean = (await import("./waves-model.js")).createOceanLayout(model);
    validateWorldDrawPlan(ocean.drawPlan, ocean.modelData, model.qrSize ** 2);
    return { modelData: ocean.modelData, drawPlan: ocean.drawPlan };
  }
  if (form === "crystalline") {
    const crystal = (await import("./crystalline-model.js")).createCrystallineLayout(model);
    validateWorldDrawPlan(crystal.drawPlan, crystal.modelData, model.qrSize ** 2);
    return { modelData: crystal.modelData, drawPlan: crystal.drawPlan };
  }
  const machine = (await import("./mechanical-model.js")).createMechanicalLayout(model);
  validateWorldDrawPlan(machine.drawPlan, machine.modelData, model.qrSize ** 2);
  return { modelData: machine.modelData, drawPlan: machine.drawPlan };
}

export function describeWorldDraw(plan: WorldDrawPlan) {
  return {
    batches: plan.batches,
    vertices: plan.batches.reduce(
      (sum, batch) => sum + batch.verticesPerInstance * batch.instanceCount,
      0,
    ),
    instances: plan.batches.reduce((sum, batch) => sum + batch.instanceCount, 0),
    uploadBytes: plan.requiredDataLength * Float32Array.BYTES_PER_ELEMENT,
  };
}
