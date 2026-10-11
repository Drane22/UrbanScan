import { createEveryQRCodeIdentity } from "@every-qrcode/core";
import { expect, it } from "vitest";
import { createSeedModel } from "../seed-model";
import { prepareScene } from "../prepared-scene";
import { validateWorldDrawPlan } from "./world-draw";
import {
  createOceanLayout,
  oceanCrestPoint,
  oceanFieldPoint,
  OCEAN_HEADER_FLOATS,
} from "./waves-model";

async function ocean(url: string) {
  const model = await createSeedModel(await createEveryQRCodeIdentity(url), {
    generatorVersion: 3,
  });
  return { model, ...createOceanLayout(model) };
}
it("retains deterministic preparation and produces distinct URL compositions", async () => {
  const a = await ocean("https://example.com/waves/a");
  const b = await ocean("https://example.com/waves/b");
  expect(createOceanLayout(a.model).modelData).toEqual(a.modelData);
  expect(a.crests).not.toEqual(b.crests);
  expect(await prepareScene(a.model, "waves")).toBe(await prepareScene(a.model, "waves"));
  expect(a.crests.length).toBeGreaterThanOrEqual(2);
  expect(a.crests.length).toBeLessThanOrEqual(3);
  expect(a.crests[1]!.height).toBeLessThan(a.crests[0]!.height * 0.5);
  expect(Math.abs(a.crests[0]!.angle - a.crests[1]!.angle)).toBeLessThan(0.25);
  expect(a.crests[0]!.length / a.crests[0]!.height).toBeGreaterThan(2.5);
  expect(a.crests[1]!.center[1]).toBeGreaterThan(a.crests[0]!.center[1]);
});
it.each([
  "https://example.com/versioned-world",
  "https://nasa.gov/",
  "https://github.com/",
  "https://example.com/" + "bounded-world-".repeat(6),
])("keeps %s samples, normals, uploads and triangles bounded", async (url) => {
  const { model, modelData, drawPlan } = await ocean(url);
  validateWorldDrawPlan(drawPlan, modelData, model.qrSize ** 2);
  expect(modelData.byteLength).toBeLessThanOrEqual(256 * 1024);
  const sprayOffset = modelData[4]! * 4;
  for (let i = OCEAN_HEADER_FLOATS; i < sprayOffset; i += 8) {
    expect(Math.abs(modelData[i]!)).toBeLessThanOrEqual(0.50001);
    expect(Math.abs(modelData[i + 2]!)).toBeLessThanOrEqual(0.50001);
    expect(modelData[i + 1]!).toBeGreaterThan(-0.05);
    expect(modelData[i + 1]!).toBeLessThan(0.4);
    expect(Math.hypot(modelData[i + 4]!, modelData[i + 5]!, modelData[i + 6]!)).toBeCloseTo(1, 5);
  }
  for (const batch of drawPlan.batches) expect(batch.verticesPerInstance % 3).toBe(0);
  expect(
    drawPlan.batches
      .filter((batch) => batch.role === "surface")
      .every((batch) => batch.verticesPerInstance > 384),
  ).toBe(true);
});
it("has a true inward-turning lip above a trough and tapers into the shared field", async () => {
  const { crests } = await ocean("https://example.com/versioned-world");
  const crest = crests[0]!;
  const front = [-Math.sin(crest.angle), Math.cos(crest.angle)] as const;
  const crown = oceanCrestPoint(crests, 0, 0.5, 0.8);
  const lip = oceanCrestPoint(crests, 0, 0.5, 1);
  const trough = oceanCrestPoint(crests, 0, 0.5, 0);
  const face = oceanCrestPoint(crests, 0, 0.5, 1 / 3);
  // The trough must sit in front of the rising face: a convex ridge fails this.
  expect((trough[0] - face[0]) * front[0] + (trough[2] - face[2]) * front[1]).toBeGreaterThan(0.15);
  expect((lip[0] - face[0]) * front[0] + (lip[2] - face[2]) * front[1]).toBeGreaterThan(0.1);
  expect((crown[0] - lip[0]) * front[0] + (crown[2] - lip[2]) * front[1]).toBeGreaterThan(0.04);
  expect(lip[1]).toBeGreaterThan(oceanFieldPoint(crests, lip[0], lip[2])[1] + 0.1);
  expect(oceanFieldPoint(crests, crown[0], crown[2])[1]).toBeLessThan(0);
  for (const u of [0, 0.2, 0.5, 0.8, 1]) {
    const back = oceanCrestPoint(crests, 0, u, 0);
    expect(back[1]).toBe(oceanFieldPoint(crests, back[0], back[2])[1]);
  }
  for (const u of [0])
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const end = oceanCrestPoint(crests, 0, u, t);
      expect(end[1]).toBeCloseTo(oceanFieldPoint(crests, end[0], end[2])[1], 10);
    }
  expect(oceanCrestPoint(crests, 0, 1, 0.55)[1]).toBeGreaterThan(crest.height * 0.65);
});
it("anchors sparse spray to actual breaking-edge samples", async () => {
  const { crests, modelData, drawPlan } = await ocean("https://example.com/versioned-world");
  const offset = modelData[4]! * 4;
  const count = modelData[5]!;
  expect(count).toBeLessThanOrEqual(32);
  expect(drawPlan.batches.find((batch) => batch.role === "ambient")?.instanceCount).toBe(
    count + 10,
  );
  for (let i = 0; i < count; i++) {
    const record = offset + i * 8;
    const crest = crests[modelData[record + 6]!]!;
    expect(modelData[record + 1]!).toBeGreaterThan(crest.height * 0.2);
    expect(Math.hypot(modelData[record + 4]!, modelData[record + 5]!)).toBeCloseTo(1, 5);
    expect(modelData[record + 7]!).toBeLessThanOrEqual(0.0061);
  }
});
it("packs a separate sailboat and rider without overlapping spray or QR instances", async () => {
  const { modelData, drawPlan } = await ocean("https://example.com/versioned-world");
  for (const [header, instance] of [
    [2, 50],
    [3, 51],
  ]) {
    const offset = modelData[header! * 4]! * 4;
    const count = modelData[header! * 4 + 1]!;
    expect(count).toBeGreaterThan(200);
    expect(offset + count * 8).toBeLessThanOrEqual(modelData.length);
    expect(
      drawPlan.batches.find((batch) => batch.firstInstance === instance)?.verticesPerInstance,
    ).toBe(count);
    for (let i = offset; i < offset + count * 8; i += 8) {
      expect(modelData[i + 3]).toBeGreaterThanOrEqual(6);
      expect(Math.hypot(...modelData.slice(i + 4, i + 7))).toBeCloseTo(1, 5);
    }
  }
});
it("keeps varied seed compositions inside the water tile", async () => {
  const { model } = await ocean("https://example.com/versioned-world");
  for (let seed = 0; seed < 32; seed++) {
    const { crests } = createOceanLayout({ ...model, morphSeed: seed / 32 });
    let extent = 0;
    for (let index = 0; index < crests.length; index++)
      for (let u = 0; u <= 24; u++)
        for (let t = 0; t <= 24; t++) {
          const p = oceanCrestPoint(crests, index, u / 24, t / 24);
          expect(p.every(Number.isFinite)).toBe(true);
          extent = Math.max(extent, Math.abs(p[0]), Math.abs(p[2]));
        }
    expect(extent).toBeLessThanOrEqual(0.5);
  }
});
