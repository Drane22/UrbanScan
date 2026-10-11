import { createEveryQRCodeIdentity } from "@every-qrcode/core";
import { expect, it } from "vitest";
import { createSeedModel } from "../seed-model";
import { createMechanicalLayout } from "./mechanical-model";
import { createCrystallineLayout } from "./crystalline-model";
import { createOceanLayout } from "./waves-model";

it("changes composition, including same-host paths, without relying on palette or animation", async () => {
  const models = await Promise.all(
    Array.from({ length: 16 }, async (_, i) =>
      createSeedModel(
        await createEveryQRCodeIdentity(`https://example.com/custom/${i}?design=${i}`),
        { generatorVersion: 3 },
      ),
    ),
  );
  const machines = models.map(createMechanicalLayout);
  const minerals = models.map(createCrystallineLayout);
  const oceans = models.map(createOceanLayout);
  expect(
    new Set(machines.map((m) => `${m.pair.driverTeeth}/${m.pair.followerTeeth}`)).size,
  ).toBeGreaterThanOrEqual(4);
  expect(new Set(machines.map((m) => m.composition.pumpCount)).size).toBe(3);
  expect(new Set(machines.map((m) => m.composition.vessel)).size).toBe(2);
  expect(new Set(minerals.map((m) => m.centers.length)).size).toBeGreaterThanOrEqual(3);
  expect(new Set(minerals.map((m) => m.crystals.length)).size).toBeGreaterThanOrEqual(8);
  const range = (values: number[]) => Math.max(...values) - Math.min(...values);
  expect(range(oceans.map((m) => m.crests[0]!.angle))).toBeGreaterThan(0.35);
  expect(range(oceans.map((m) => m.crests[0]!.length))).toBeGreaterThan(0.1);
  expect(range(oceans.map((m) => m.crests[0]!.height))).toBeGreaterThan(0.05);
  for (const [i, model] of models.entries()) {
    expect(createOceanLayout(model).crests).toEqual(oceans[i]!.crests);
    expect(createMechanicalLayout(model).composition).toEqual(machines[i]!.composition);
    expect(createCrystallineLayout(model).crystals).toEqual(minerals[i]!.crystals);
  }
});

it("shares crab geometry while packing independent tracks safely before the QR instances", async () => {
  const model = await createSeedModel(
    await createEveryQRCodeIdentity("https://example.com/beach"),
    { generatorVersion: 3 },
  );
  const { modelData, crabs, drawPlan } = createOceanLayout(model);
  const batch = drawPlan.batches.find((b) => b.firstInstance === 52)!;
  expect(crabs.length).toBeGreaterThanOrEqual(3);
  expect(batch.instanceCount).toBe(crabs.length);
  expect(batch.firstInstance + batch.instanceCount).toBeLessThan(drawPlan.qr.firstInstance);
  const meshStart = modelData[13 * 4]! * 4;
  const tracksStart = modelData[14 * 4]! * 4;
  expect(meshStart + batch.verticesPerInstance * 8).toBe(tracksStart);
  expect(tracksStart + crabs.length * 8).toBe(modelData.length);
  for (const crab of crabs) {
    const radius = 0.05 * crab.scale;
    expect(Math.abs(crab.center[0]) + crab.travel + radius).toBeLessThan(0.5);
    expect(crab.center[1] - radius - 0.006).toBeGreaterThan(-0.5);
    expect(crab.center[1] + radius + 0.006).toBeLessThan(-0.31);
  }
});
