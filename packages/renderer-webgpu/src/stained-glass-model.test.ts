import { createEveryQRCodeIdentity } from "@every-qrcode/core";
import { describe, expect, it } from "vitest";

import { createGlassDNA, createGlassLayout, GLASS_PANE_TYPES } from "./stained-glass-model";
import { createSeedModel } from "./seed-model";

describe("stained-glass-model", () => {
  const url1 = "https://example.com/stained-glass";
  const url2 = "https://example.com/cathedral";

  it("is deterministic for identical URLs", async () => {
    const id1a = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const id1b = await createEveryQRCodeIdentity(url1, { identityScope: "url" });

    const model1a = await createSeedModel(id1a);
    const model1b = await createSeedModel(id1b);

    const dna1a = createGlassDNA(model1a);
    const dna1b = createGlassDNA(model1b);
    expect(dna1a).toEqual(dna1b);

    const layout1a = createGlassLayout(model1a);
    const layout1b = createGlassLayout(model1b);
    expect(layout1a.paneData).toEqual(layout1b.paneData);
  });

  it("varies across different URLs", async () => {
    const id1 = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const id2 = await createEveryQRCodeIdentity(url2, { identityScope: "url" });

    const model1 = await createSeedModel(id1);
    const model2 = await createSeedModel(id2);

    const dna1 = createGlassDNA(model1);
    const dna2 = createGlassDNA(model2);
    expect(dna1.seed).not.toBe(dna2.seed);
  });

  it("creates rose window medallion landmarks for finders", async () => {
    const id = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const model = await createSeedModel(id);
    const layout = createGlassLayout(model);

    // Top-left finder center
    const centerIndex = 3 * model.qrSize + 3;
    expect(layout.panes[centerIndex]!.type).toBe(GLASS_PANE_TYPES.roseCenter);
  });
});
