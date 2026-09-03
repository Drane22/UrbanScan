import { createEveryQRCodeIdentity } from "@every-qrcode/core";
import { describe, expect, it } from "vitest";

import { COLONY_MODULE_TYPES, createColonyDNA, createColonyLayout } from "./colony-model";
import { createSeedModel } from "./seed-model";

describe("colony-model", () => {
  const url1 = "https://example.com/lunar-base";
  const url2 = "https://example.com/mars-outpost";

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
  });

  it("varies across different URLs", async () => {
    const id1 = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const id2 = await createEveryQRCodeIdentity(url2, { identityScope: "url" });

    const model1 = await createSeedModel(id1);
    const model2 = await createSeedModel(id2);

    const dna1 = createColonyDNA(model1);
    const dna2 = createColonyDNA(model2);
    expect(dna1.seed).not.toBe(dna2.seed);
  });

  it("designates finder centers as command citadel hubs", async () => {
    const id = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const model = await createSeedModel(id);
    const layout = createColonyLayout(model);

    // Top-left finder center
    const centerIndex = 3 * model.qrSize + 3;
    expect(layout.units[centerIndex]!.type).toBe(COLONY_MODULE_TYPES.commandCenter);
  });
});
