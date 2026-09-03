import { createEveryQRCodeIdentity } from "@every-qrcode/core";
import { describe, expect, it } from "vitest";

import {
  createReefDNA,
  createReefLayout,
  REEF_CORAL_STRIDE,
  REEF_FISH_PATH_STRIDE,
} from "./reef-model";
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
    expect(layout1a.shelf.shelfData).toEqual(layout1b.shelf.shelfData);
    expect(layout1a.coralData).toEqual(layout1b.coralData);
    expect(layout1a.fishData).toEqual(layout1b.fishData);
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

  it("composes an integrated shelf with diverse colonies away from channels", async () => {
    const id = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const layout = createReefLayout(await createSeedModel(id));
    expect(layout.shelf.channels).toHaveLength(2);
    expect(layout.colonies.length).toBeGreaterThan(8);
    expect(new Set(layout.colonies.map((colony) => colony.family)).size).toBeGreaterThanOrEqual(4);
    for (const colony of layout.colonies) {
      const index = Math.round(colony.row) * layout.qrSize + Math.round(colony.column);
      expect(layout.shelf.channelMask[index]).toBe(0);
    }
  });

  it("uses the finder regions only as integrated substrate", async () => {
    const id = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const model = await createSeedModel(id);
    const layout = createReefLayout(model);
    const finderCenters = [
      [3, 3],
      [model.qrSize - 4, 3],
      [3, model.qrSize - 4],
    ];
    for (const [column, row] of finderCenters) {
      expect(
        layout.colonies.some(
          (colony) => Math.abs(colony.column - column!) < 1 && Math.abs(colony.row - row!) < 1,
        ),
      ).toBe(false);
    }
  });

  it("packs stable coral and fish GPU records", async () => {
    const id = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const layout = createReefLayout(await createSeedModel(id));
    expect(layout.coralData).toHaveLength(layout.colonies.length * REEF_CORAL_STRIDE);
    expect(layout.fishData).toHaveLength(layout.fishPaths.length * REEF_FISH_PATH_STRIDE);
    expect(layout.fishPaths).toHaveLength(2);
  });
});
