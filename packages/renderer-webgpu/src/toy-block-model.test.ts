import { createEveryQRCodeIdentity } from "@every-qrcode/core";
import { describe, expect, it } from "vitest";

import { createSeedModel } from "./seed-model";
import { createToyBlockDNA, createToyBlockLayout, TOY_BLOCK_TYPES } from "./toy-block-model";

describe("toy-block-model", () => {
  const url1 = "https://example.com/toy-diorama";
  const url2 = "https://example.com/brick-world";

  it("is deterministic for identical URLs", async () => {
    const id1a = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const id1b = await createEveryQRCodeIdentity(url1, { identityScope: "url" });

    const model1a = await createSeedModel(id1a);
    const model1b = await createSeedModel(id1b);

    const dna1a = createToyBlockDNA(model1a);
    const dna1b = createToyBlockDNA(model1b);
    expect(dna1a).toEqual(dna1b);

    const layout1a = createToyBlockLayout(model1a);
    const layout1b = createToyBlockLayout(model1b);
    expect(layout1a.blockData).toEqual(layout1b.blockData);
  });

  it("varies across different URLs", async () => {
    const id1 = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const id2 = await createEveryQRCodeIdentity(url2, { identityScope: "url" });

    const model1 = await createSeedModel(id1);
    const model2 = await createSeedModel(id2);

    const dna1 = createToyBlockDNA(model1);
    const dna2 = createToyBlockDNA(model2);
    expect(dna1.seed).not.toBe(dna2.seed);
  });

  it("creates block castles at finder patterns", async () => {
    const id = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const model = await createSeedModel(id);
    const layout = createToyBlockLayout(model);

    // Top-left finder center
    const centerIndex = 3 * model.qrSize + 3;
    expect(layout.pieces[centerIndex]!.type).toBe(TOY_BLOCK_TYPES.castleApex);
  });
});
