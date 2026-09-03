import { createEveryQRCodeIdentity } from "@every-qrcode/core";
import { describe, expect, it } from "vitest";

import { createMyceliumDNA, createMyceliumLayout, FUNGAL_NODE_TYPES } from "./mycelium-model";
import { createSeedModel } from "./seed-model";

describe("mycelium-model", () => {
  const url1 = "https://example.com/fungal-groove";
  const url2 = "https://example.com/spores";

  it("is deterministic for identical URLs", async () => {
    const id1a = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const id1b = await createEveryQRCodeIdentity(url1, { identityScope: "url" });

    const model1a = await createSeedModel(id1a);
    const model1b = await createSeedModel(id1b);

    const dna1a = createMyceliumDNA(model1a);
    const dna1b = createMyceliumDNA(model1b);
    expect(dna1a).toEqual(dna1b);

    const layout1a = createMyceliumLayout(model1a);
    const layout1b = createMyceliumLayout(model1b);
    expect(layout1a.fungalData).toEqual(layout1b.fungalData);
  });

  it("varies across different URLs", async () => {
    const id1 = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const id2 = await createEveryQRCodeIdentity(url2, { identityScope: "url" });

    const model1 = await createSeedModel(id1);
    const model2 = await createSeedModel(id2);

    const dna1 = createMyceliumDNA(model1);
    const dna2 = createMyceliumDNA(model2);
    expect(dna1.seed).not.toBe(dna2.seed);
  });

  it("grows giant fungal towers at finder patterns", async () => {
    const id = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const model = await createSeedModel(id);
    const layout = createMyceliumLayout(model);

    // Top-left finder center
    const centerIndex = 3 * model.qrSize + 3;
    expect(layout.nodes[centerIndex]!.type).toBe(FUNGAL_NODE_TYPES.fungalSporeCore);
  });
});
