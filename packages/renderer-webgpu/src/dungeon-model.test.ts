import { createEveryQRCodeIdentity } from "@every-qrcode/core";
import { describe, expect, it } from "vitest";

import { createDungeonDNA, createDungeonLayout, DUNGEON_TILE_TYPES } from "./dungeon-model";
import { createSeedModel } from "./seed-model";
import { WORLD_PALETTES } from "./world-palettes";

describe("dungeon-model", () => {
  const url1 = "https://example.com/dungeon-crawl";
  const url2 = "https://example.com/crypt";

  it("is deterministic for identical URLs (byte-identical tileData and DNA)", async () => {
    const id1a = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const id1b = await createEveryQRCodeIdentity(url1, { identityScope: "url" });

    const model1a = await createSeedModel(id1a);
    const model1b = await createSeedModel(id1b);

    const dna1a = createDungeonDNA(model1a);
    const dna1b = createDungeonDNA(model1b);
    expect(dna1a).toEqual(dna1b);

    const layout1a = createDungeonLayout(model1a);
    const layout1b = createDungeonLayout(model1b);

    // Byte-identical tileData Float32Array
    expect(layout1a.tileData.length).toBe(layout1b.tileData.length);
    expect(layout1a.tileData).toEqual(layout1b.tileData);
    for (let i = 0; i < layout1a.tileData.length; i++) {
      expect(layout1a.tileData[i]).toBe(layout1b.tileData[i]);
    }
  });

  it("varies across different URLs (phenotypic variation)", async () => {
    const id1 = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const id2 = await createEveryQRCodeIdentity(url2, { identityScope: "url" });

    const model1 = await createSeedModel(id1);
    const model2 = await createSeedModel(id2);

    const dna1 = createDungeonDNA(model1);
    const dna2 = createDungeonDNA(model2);
    expect(dna1.seed).not.toBe(dna2.seed);
    expect(model1.morphSeed).not.toBe(model2.morphSeed);
    expect(dna1.torchHue).not.toBe(dna2.torchHue);
    expect(dna1.ruinPitting).not.toBe(dna2.ruinPitting);

    const layout1 = createDungeonLayout(model1);
    const layout2 = createDungeonLayout(model2);
    expect(layout1.tileData).not.toEqual(layout2.tileData);
  });

  it("maps finder landmarks to bossSanctum / fortressKeep structures with multi-tier heights", async () => {
    const id = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const model = await createSeedModel(id);
    const layout = createDungeonLayout(model);

    // Top-left finder center (1x1 boss altar: ring 3)
    const centerIndex = 3 * model.qrSize + 3;
    expect(layout.tiles[centerIndex]!.type).toBe(DUNGEON_TILE_TYPES.bossSanctum);
    expect(layout.tiles[centerIndex]!.type).toBe(DUNGEON_TILE_TYPES.ritualAltar); // backward compatibility alias
    expect(layout.tiles[centerIndex]!.height).toBe(11.0);

    // Finder ring 0: outer curtain wall (7x7)
    const outerWallIndex = 0;
    expect(layout.tiles[outerWallIndex]!.type).toBe(DUNGEON_TILE_TYPES.bossSanctum);
    expect(layout.tiles[outerWallIndex]!.height).toBe(6.5);

    // Finder ring 1: portcullis moat (5x5)
    const moatIndex = 1 * model.qrSize + 1;
    expect(layout.tiles[moatIndex]!.type).toBe(DUNGEON_TILE_TYPES.bedrockFloor);
    expect(layout.tiles[moatIndex]!.height).toBe(0.15);

    // Finder ring 2: inner sanctum dais (3x3)
    const daisIndex = 2 * model.qrSize + 2;
    expect(layout.tiles[daisIndex]!.type).toBe(DUNGEON_TILE_TYPES.bossSanctum);
    expect(layout.tiles[daisIndex]!.height).toBe(8.5);
  });

  it("enforces floor invariants: all light cells map to bedrockFloor with height 0.0 (except finder moat 0.15)", async () => {
    const id = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const model = await createSeedModel(id);
    const layout = createDungeonLayout(model);

    const activeSet = new Set(model.modules.map((m) => m.index));
    let lightCount = 0;
    let darkCount = 0;
    let vaultedOrCorridorCount = 0;

    for (let r = 0; r < model.qrSize; r++) {
      for (let c = 0; c < model.qrSize; c++) {
        const idx = r * model.qrSize + c;
        const tile = layout.tiles[idx]!;
        const ring = layout.topology.finderRing[idx]!;
        const isDark = activeSet.has(idx);

        if (!isDark) {
          lightCount++;
          if (ring === 1) {
            // Finder moat
            expect(tile.height).toBe(0.15);
            expect(tile.type).toBe(DUNGEON_TILE_TYPES.bedrockFloor);
          } else {
            // Bedrock floor / negative void
            expect(tile.height).toBe(0.0);
            expect(tile.type).toBe(DUNGEON_TILE_TYPES.bedrockFloor);
          }
        } else {
          darkCount++;
          expect(tile.height).toBeGreaterThan(0.0);
          if (
            tile.type === DUNGEON_TILE_TYPES.vaultedChamber ||
            tile.type === DUNGEON_TILE_TYPES.archwayCorridor ||
            tile.type === DUNGEON_TILE_TYPES.stoneWall ||
            tile.type === DUNGEON_TILE_TYPES.bossSanctum
          ) {
            vaultedOrCorridorCount++;
          }
        }
      }
    }

    expect(lightCount).toBeGreaterThan(0);
    expect(darkCount).toBeGreaterThan(0);
    expect(vaultedOrCorridorCount).toBeGreaterThan(0);
  });

  it("guarantees Rec. 709 luminance contrast >= 0.75 for all dungeon presets", () => {
    const dungeonPalettes = WORLD_PALETTES.dungeon;
    expect(dungeonPalettes.length).toBeGreaterThanOrEqual(4);

    const expectedIds = [
      "crypt-granite",
      "obsidian-abyss",
      "catacomb-sandstone",
      "bloodstone-keep",
    ];
    for (const expectedId of expectedIds) {
      const p = dungeonPalettes.find((palette) => palette.id === expectedId);
      expect(p).toBeDefined();

      const [r1, g1, b1] = p!.palette[0]!; // Dark primary ink
      const [r5, g5, b5] = p!.palette[4]!; // Paper substrate

      const darkLuma = 0.2126 * r1 + 0.7152 * g1 + 0.0722 * b1;
      const paperLuma = 0.2126 * r5 + 0.7152 * g5 + 0.0722 * b5;
      const contrast = paperLuma - darkLuma;

      expect(contrast).toBeGreaterThanOrEqual(0.75);
    }
  });
});
