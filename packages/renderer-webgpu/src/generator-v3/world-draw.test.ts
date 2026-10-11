import { createEveryQRCodeIdentity } from "@every-qrcode/core";
import { expect, it } from "vitest";
import { createSeedModel } from "../seed-model";
import {
  describeWorldDraw,
  prepareCandidateWorld,
  validateWorldDrawPlan,
  type WorldDrawPlan,
} from "./world-draw";

async function fixture() {
  const model = await createSeedModel(await createEveryQRCodeIdentity("https://example.com/draw"), {
    generatorVersion: 3,
  });
  return { model, ...(await prepareCandidateWorld(model, "waves")) };
}
it.each(["waves", "crystalline", "mechanical"] as const)(
  "prepares bounded %s batches separately from the canonical QR",
  async (form) => {
    const { model } = await fixture();
    const { drawPlan, modelData } = await prepareCandidateWorld(model, form);
    expect(() => validateWorldDrawPlan(drawPlan, modelData, model.qrSize ** 2)).not.toThrow();
    expect(describeWorldDraw(drawPlan).uploadBytes).toBe(modelData.byteLength);
    expect(drawPlan.qr.instanceCount).toBe(model.qrSize ** 2);
    expect(drawPlan.qr.verticesPerInstance).toBe(6);
  },
);
it("accepts a higher-resolution candidate mesh without changing QR descriptors", async () => {
  const { model, drawPlan, modelData } = await fixture();
  const plan = {
    ...drawPlan,
    batches: drawPlan.batches.map((batch) =>
      batch.role === "surface" ? { ...batch, verticesPerInstance: 12288 } : batch,
    ),
  };
  validateWorldDrawPlan(plan, modelData, model.qrSize ** 2);
  expect(plan.qr).toBe(drawPlan.qr);
});
it.each([
  { verticesPerInstance: NaN },
  { verticesPerInstance: Infinity },
  { verticesPerInstance: 385 },
  { verticesPerInstance: 24579 },
  { instanceCount: 1025 },
  { instanceCount: -1 },
  { instanceCount: 1.5 },
  { firstInstance: -1 },
  { firstInstance: 999999 },
  { requiredDataLength: Infinity },
  { requiredDataLength: 3 },
  { role: "qr" },
])("rejects malformed draw metadata %j before upload", async (patch) => {
  const { model, drawPlan, modelData } = await fixture();
  const plan = { ...drawPlan, batches: [{ ...drawPlan.batches[0], ...patch }] } as WorldDrawPlan;
  expect(() => validateWorldDrawPlan(plan, modelData, model.qrSize ** 2)).toThrow(RangeError);
});
it("rejects nonfinite/truncated/oversized data, overlapping ranges, wrong QR and excessive total vertices", async () => {
  const { model, drawPlan, modelData } = await fixture();
  const validate = (plan: WorldDrawPlan, data = modelData) =>
    validateWorldDrawPlan(plan, data, model.qrSize ** 2);
  const bad = modelData.slice();
  bad[2] = Infinity;
  expect(() => validate(drawPlan, bad)).toThrow();
  expect(() => validate(drawPlan, modelData.subarray(4))).toThrow();
  expect(() =>
    validate({ ...drawPlan, requiredDataLength: 131076 }, new Float32Array(131076)),
  ).toThrow();
  expect(() =>
    validate({ ...drawPlan, batches: [drawPlan.batches[0]!, drawPlan.batches[0]!] }),
  ).toThrow();
  expect(() => validate({ ...drawPlan, qr: { ...drawPlan.qr, instanceCount: 1 } })).toThrow();
  expect(() =>
    validate({
      ...drawPlan,
      batches: [
        {
          ...drawPlan.batches[1]!,
          firstInstance: drawPlan.qr.firstInstance + drawPlan.qr.instanceCount + 1,
          instanceCount: 100,
          verticesPerInstance: 24576,
        },
      ],
    }),
  ).toThrow("vertex budget");
});
