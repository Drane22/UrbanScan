import { createEveryQRCodeIdentity } from "@every-qrcode/core";
import { describe, expect, it } from "vitest";

import {
  CONSTELLATION_NODE_TYPES,
  createConstellationDNA,
  createConstellationLayout,
} from "./constellation-model";
import { createSeedModel } from "./seed-model";

describe("constellation-model", () => {
  const url1 = "https://example.com/stars";
  const url2 = "https://example.com/other-stars";

  it("is deterministic for identical URL input", async () => {
    const id1a = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const id1b = await createEveryQRCodeIdentity(url1, { identityScope: "url" });

    const model1a = await createSeedModel(id1a);
    const model1b = await createSeedModel(id1b);

    const dna1a = createConstellationDNA(model1a);
    const dna1b = createConstellationDNA(model1b);
    expect(dna1a).toEqual(dna1b);

    const layout1a = createConstellationLayout(model1a);
    const layout1b = createConstellationLayout(model1b);
    expect(layout1a.starData).toEqual(layout1b.starData);
  });

  it("varies across different URLs", async () => {
    const id1 = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const id2 = await createEveryQRCodeIdentity(url2, { identityScope: "url" });

    const model1 = await createSeedModel(id1);
    const model2 = await createSeedModel(id2);

    const dna1 = createConstellationDNA(model1);
    const dna2 = createConstellationDNA(model2);
    expect(dna1.seed).not.toBe(dna2.seed);
  });

  it("designates finder centers as major celestial systems", async () => {
    const id = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const model = await createSeedModel(id);
    const layout = createConstellationLayout(model);

    // Center of top-left finder pattern
    const centerIndex = 3 * model.qrSize + 3;
    expect(layout.stars[centerIndex]!.type).toBe(CONSTELLATION_NODE_TYPES.constellationHub);
  });

  it("maps every finder ring to its celestial tier with mass hierarchy", async () => {
    const id = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const model = await createSeedModel(id);
    const layout = createConstellationLayout(model);
    const size = model.qrSize;

    // 7x7 outer system ring: major systems outweigh ordinary stars
    expect(layout.stars[0]!.type).toBe(CONSTELLATION_NODE_TYPES.majorSystem);
    expect(layout.stars[0]!.size).toBe(1.2);
    // Separator void
    expect(layout.stars[size + 1]!.type).toBe(CONSTELLATION_NODE_TYPES.void);
    expect(layout.stars[size + 1]!.size).toBe(0.0);
    // Inner hub ring
    expect(layout.stars[2 * size + 2]!.type).toBe(CONSTELLATION_NODE_TYPES.constellationHub);
    expect(layout.stars[2 * size + 2]!.size).toBe(1.3);
    // Central hub: the most massive body on the plate
    expect(layout.stars[3 * size + 3]!.type).toBe(CONSTELLATION_NODE_TYPES.constellationHub);
    expect(layout.stars[3 * size + 3]!.size).toBe(1.6);
  });

  it("leaves light cells empty and round-trips seed plus size through starData", async () => {
    const id = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const model = await createSeedModel(id);
    const layout = createConstellationLayout(model);
    const activeSet = new Set(model.modules.map((m) => m.index));
    let lightCount = 0;

    for (const star of layout.stars) {
      const offset = star.index * 4;
      expect(layout.starData[offset]).toBe(star.type);
      expect(layout.starData[offset! + 1]).toBeCloseTo(star.depth, 6);
      expect(layout.starData[offset! + 2]).toBe(star.connections);
      // starData.w packs size + floor(seed * 1000) * 256; both must survive
      // the round trip so the shader recovers true per-cell variation.
      const packed = layout.starData[offset! + 3]!;
      const seedCell = Math.floor(packed / 256);
      // Packing quantizes the seed to thousandths by design.
      expect(seedCell / 1000).toBeCloseTo(star.seed, 2);
      expect(packed - seedCell * 256).toBeCloseTo(star.size, 1);

      if (!activeSet.has(star.index)) {
        lightCount += 1;
        expect(star.type).toBe(CONSTELLATION_NODE_TYPES.void);
      }
    }
    expect(lightCount).toBeGreaterThan(0);
  });
});
