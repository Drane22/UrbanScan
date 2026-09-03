import { createEveryQRCodeIdentity } from "@every-qrcode/core";
import { describe, expect, it } from "vitest";

import { COLONY_MODULE_TYPES, createColonyDNA, createColonyLayout } from "./colony-model";
import { createSeedModel } from "./seed-model";
import { WORLD_PALETTES } from "./world-palettes";

describe("colony-model", () => {
  const url1 = "https://example.com/cell-culture-alpha";
  const url2 = "https://example.com/cell-culture-beta";

  it("is deterministic for identical URLs", async () => {
    const id1a = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const id1b = await createEveryQRCodeIdentity(url1, { identityScope: "url" });

    const model1a = await createSeedModel(id1a);
    const model1b = await createSeedModel(id1b);

    const dna1a = createColonyDNA(model1a);
    const dna1b = createColonyDNA(model1b);
    expect(dna1a).toEqual(dna1b);

    const layout1a = createColonyLayout(model1a);
    const layout1b = createColonyLayout(model1b);
    expect(layout1a.moduleData).toEqual(layout1b.moduleData);
    expect(layout1a.units.length).toBe(layout1b.units.length);
  });

  it("varies across different URLs", async () => {
    const id1 = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const id2 = await createEveryQRCodeIdentity(url2, { identityScope: "url" });

    const model1 = await createSeedModel(id1);
    const model2 = await createSeedModel(id2);

    const dna1 = createColonyDNA(model1);
    const dna2 = createColonyDNA(model2);
    expect(dna1.seed).not.toBe(dna2.seed);
    expect(dna1.membraneVariation).not.toBe(dna2.membraneVariation);
  });

  it("turns the three finder centers into differentiated organoids", async () => {
    const id = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const model = await createSeedModel(id);
    const layout = createColonyLayout(model);
    const size = model.qrSize;

    const tlCenterIndex = 3 * size + 3;
    const trCenterIndex = 3 * size + (size - 4);
    const blCenterIndex = (size - 4) * size + 3;

    expect(layout.units[tlCenterIndex]!.type).toBe(COLONY_MODULE_TYPES.growthOrganoid);
    expect(layout.units[trCenterIndex]!.type).toBe(COLONY_MODULE_TYPES.nutrientOrganoid);
    expect(layout.units[blCenterIndex]!.type).toBe(COLONY_MODULE_TYPES.signalingOrganoid);
    for (const index of [tlCenterIndex, trCenterIndex, blCenterIndex]) {
      expect(layout.units[index]!.height).toBeGreaterThanOrEqual(2);
      expect(layout.units[index]!.height).toBeLessThanOrEqual(2.2);
    }
  });

  it("maps the canonical matrix to shallow, diverse microscopic cells", async () => {
    const id = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const model = await createSeedModel(id);
    const layout = createColonyLayout(model);
    const activeSet = new Set(model.modules.map((m) => m.index));

    expect(layout.moduleData.length).toBe(model.qrSize * model.qrSize * 4);
    let lightCount = 0;
    const darkTypes = new Set<number>();

    for (const unit of layout.units) {
      expect(unit.height).toBeGreaterThanOrEqual(0);
      expect(unit.height).toBeLessThanOrEqual(2.2);
      expect(unit.type).toBeGreaterThanOrEqual(0);
      expect(unit.type).toBeLessThanOrEqual(7);

      const isActive = activeSet.has(unit.index);
      if (!isActive) {
        expect(unit.type).toBe(COLONY_MODULE_TYPES.cultureMedium);
        expect(unit.height).toBeLessThanOrEqual(0.04);
        lightCount += 1;
      } else {
        expect(unit.type).not.toBe(COLONY_MODULE_TYPES.cultureMedium);
        darkTypes.add(unit.type);
      }
    }

    expect(lightCount).toBeGreaterThan(0);
    expect(darkTypes).toContain(COLONY_MODULE_TYPES.tissueCell);
    expect(darkTypes).toContain(COLONY_MODULE_TYPES.growthOrganoid);
    expect(darkTypes.size).toBeGreaterThanOrEqual(4);
  });

  it("guarantees Rec. 709 luminance contrast >= 0.75 for all biological colony palettes", () => {
    const colonyPalettes = WORLD_PALETTES.colony;
    expect(colonyPalettes.length).toBeGreaterThanOrEqual(4);

    const expectedIds = ["crimson-histology", "violet-stain", "eosin-rose", "cultured-plum"];
    for (const expectedId of expectedIds) {
      const p = colonyPalettes.find((palette) => palette.id === expectedId);
      expect(p).toBeDefined();

      const [r1, g1, b1] = p!.palette[0]!; // Dark primary ink
      const [r5, g5, b5] = p!.palette[4]!; // Paper substrate

      const darkLuma = 0.2126 * r1 + 0.7152 * g1 + 0.0722 * b1;
      const paperLuma = 0.2126 * r5 + 0.7152 * g5 + 0.0722 * b5;
      const contrast = paperLuma - darkLuma;

      expect(contrast).toBeGreaterThanOrEqual(0.75);
    }
  });
});
