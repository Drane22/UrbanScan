import { createEveryQRCodeIdentity } from "@every-qrcode/core";
import { describe, expect, it } from "vitest";

import { createOrigamiDNA, createOrigamiLayout, ORIGAMI_FOLD_TYPES } from "./origami-model";
import { createSeedModel } from "./seed-model";

describe("origami-model", () => {
  const url1 = "https://example.com/origami-world";
  const url2 = "https://example.com/other-origami";

  it("produces deterministic DNA and folds for identical URLs", async () => {
    const id1a = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const id1b = await createEveryQRCodeIdentity(url1, { identityScope: "url" });

    const model1a = await createSeedModel(id1a);
    const model1b = await createSeedModel(id1b);

    const dna1a = createOrigamiDNA(model1a);
    const dna1b = createOrigamiDNA(model1b);
    expect(dna1a).toEqual(dna1b);

    const layout1a = createOrigamiLayout(model1a);
    const layout1b = createOrigamiLayout(model1b);
    expect(layout1a.panelData).toEqual(layout1b.panelData);
  });

  it("varies across different URLs", async () => {
    const id1 = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const id2 = await createEveryQRCodeIdentity(url2, { identityScope: "url" });

    const model1 = await createSeedModel(id1);
    const model2 = await createSeedModel(id2);

    const dna1 = createOrigamiDNA(model1);
    const dna2 = createOrigamiDNA(model2);
    expect(dna1.seed).not.toBe(dna2.seed);
  });

  it("turns finder patterns into origami rosettes", async () => {
    const id = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const model = await createSeedModel(id);
    const layout = createOrigamiLayout(model);

    // Top-left finder center
    const centerIndex = 3 * model.qrSize + 3;
    expect(layout.panels[centerIndex]!.type).toBe(ORIGAMI_FOLD_TYPES.rosetteCore);
  });
});
