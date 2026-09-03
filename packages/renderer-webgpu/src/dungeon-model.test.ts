import { createEveryQRCodeIdentity } from "@every-qrcode/core";
import { describe, expect, it } from "vitest";

import { createDungeonDNA, createDungeonLayout, DUNGEON_TILE_TYPES } from "./dungeon-model";
import { createSeedModel } from "./seed-model";

describe("dungeon-model", () => {
  const url1 = "https://example.com/dungeon-crawl";
  const url2 = "https://example.com/crypt";

  it("is deterministic for identical URLs", async () => {
    const id1a = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const id1b = await createEveryQRCodeIdentity(url1, { identityScope: "url" });

    const model1a = await createSeedModel(id1a);
    const model1b = await createSeedModel(id1b);

    const dna1a = createDungeonDNA(model1a);
    const dna1b = createDungeonDNA(model1b);
    expect(dna1a).toEqual(dna1b);

    const layout1a = createDungeonLayout(model1a);
    const layout1b = createDungeonLayout(model1b);
    expect(layout1a.tileData).toEqual(layout1b.tileData);
  });

  it("varies across different URLs", async () => {
    const id1 = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const id2 = await createEveryQRCodeIdentity(url2, { identityScope: "url" });

    const model1 = await createSeedModel(id1);
    const model2 = await createSeedModel(id2);

    const dna1 = createDungeonDNA(model1);
    const dna2 = createDungeonDNA(model2);
    expect(dna1.seed).not.toBe(dna2.seed);
  });

  it("builds fortress keeps and ritual altars at finder landmarks", async () => {
    const id = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const model = await createSeedModel(id);
    const layout = createDungeonLayout(model);

    // Top-left finder center
    const centerIndex = 3 * model.qrSize + 3;
    expect(layout.tiles[centerIndex]!.type).toBe(DUNGEON_TILE_TYPES.ritualAltar);
  });
});
