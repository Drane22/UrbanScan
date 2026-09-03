import { createEveryQRCodeIdentity } from "@every-qrcode/core";
import { describe, expect, it } from "vitest";

import { createReefDNA, createReefLayout, REEF_FORMATION_TYPES } from "./reef-model";
import { createSeedModel } from "./seed-model";

describe("reef-model", () => {
  const url1 = "https://example.com/coral-reef";
  const url2 = "https://example.com/great-barrier";

  it("is deterministic for identical URLs", async () => {
    const id1a = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const id1b = await createEveryQRCodeIdentity(url1, { identityScope: "url" });

    const model1a = await createSeedModel(id1a);
    const model1b = await createSeedModel(id1b);

    const dna1a = createReefDNA(model1a);
    const dna1b = createReefDNA(model1b);
    expect(dna1a).toEqual(dna1b);

    const layout1a = createReefLayout(model1a);
    const layout1b = createReefLayout(model1b);
    expect(layout1a.reefData).toEqual(layout1b.reefData);
  });

  it("varies across different URLs", async () => {
    const id1 = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const id2 = await createEveryQRCodeIdentity(url2, { identityScope: "url" });

    const model1 = await createSeedModel(id1);
    const model2 = await createSeedModel(id2);

    const dna1 = createReefDNA(model1);
    const dna2 = createReefDNA(model2);
    expect(dna1.seed).not.toBe(dna2.seed);
  });

  it("builds coral crowns at finder patterns", async () => {
    const id = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const model = await createSeedModel(id);
    const layout = createReefLayout(model);

    // Top-left finder center
    const centerIndex = 3 * model.qrSize + 3;
    expect(layout.formations[centerIndex]!.type).toBe(REEF_FORMATION_TYPES.crownApex);
  });
});
