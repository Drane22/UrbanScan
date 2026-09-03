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
});
