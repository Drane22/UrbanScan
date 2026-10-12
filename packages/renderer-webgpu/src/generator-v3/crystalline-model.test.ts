import { createEveryQRCodeIdentity } from "@every-qrcode/core";
import { expect, it } from "vitest";
import { createSeedModel } from "../seed-model";
import { createCrystallineLayout, crystalMesh } from "./crystalline-model";
import { FACET_HEADER_FLOATS } from "./faceted-mesh";
import { validateWorldDrawPlan } from "./world-draw";

async function fixture(url = "https://example.com/crystals") {
  return createSeedModel(await createEveryQRCodeIdentity(url), { generatorVersion: 3 });
}
it("builds deterministic irregular clusters with distinct hero silhouettes", async () => {
  const model = await fixture();
  const a = createCrystallineLayout(model);
  expect(createCrystallineLayout(model)).toEqual(a);
  expect(createCrystallineLayout(await fixture("https://nasa.gov/")).modelData).not.toEqual(
    a.modelData,
  );
  expect(a.centers.length).toBeGreaterThanOrEqual(2);
  expect(a.centers.length).toBeLessThanOrEqual(5);
  expect(a.crystals.length).toBeGreaterThanOrEqual(20);
  expect(a.crystals.filter((c) => c.height > 0.3).length).toBeGreaterThanOrEqual(1);
  expect(new Set(a.crystals.map((c) => c.height)).size).toBe(a.crystals.length);
  expect(a.drawPlan.batches.some((b) => b.role === "ambient")).toBe(false);
});
it("keeps paired side triangles exactly planar with shared normals", async () => {
  for (const crystal of createCrystallineLayout(await fixture()).crystals) {
    const mesh = crystalMesh(crystal);
    for (let side = 0; side < crystal.sides; side++) {
      const start = side * 12 * 8;
      const n = mesh.slice(start + 4, start + 7);
      for (let vertex = 0; vertex < 6; vertex++) {
        const offset = start + vertex * 8;
        mesh
          .slice(offset + 4, offset + 7)
          .forEach((value, axis) => expect(value).toBeCloseTo(n[axis]!, 10));
        expect(
          n.reduce(
            (sum, value, axis) => sum + value * (mesh[offset + axis]! - mesh[start + axis]!),
            0,
          ),
        ).toBeCloseTo(0, 10);
      }
    }
  }
});
it.each(["https://a.co", "https://example.com/" + "bounded-world-".repeat(6)])(
  "bounds geometry, normals and draw ranges for %s",
  async (url) => {
    const model = await fixture(url);
    for (let seed = 0; seed < 32; seed++) {
      const { modelData, drawPlan } = createCrystallineLayout({ ...model, morphSeed: seed / 32 });
      validateWorldDrawPlan(drawPlan, modelData, model.qrSize ** 2);
      let extent = 0,
        low = Infinity,
        high = -Infinity,
        normalError = 0;
      for (let i = FACET_HEADER_FLOATS; i < modelData.length; i += 8) {
        extent = Math.max(extent, Math.abs(modelData[i]!), Math.abs(modelData[i + 2]!));
        low = Math.min(low, modelData[i + 1]!);
        high = Math.max(high, modelData[i + 1]!);
        normalError = Math.max(
          normalError,
          Math.abs(Math.hypot(...modelData.slice(i + 4, i + 7)) - 1),
        );
      }
      expect(extent).toBeLessThanOrEqual(0.51);
      expect(low).toBeGreaterThan(-0.1);
      expect(high).toBeLessThan(0.56);
      expect(normalError).toBeLessThan(1e-6);
    }
  },
);
