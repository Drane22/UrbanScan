import { createEveryQRCodeIdentity } from "@every-qrcode/core";
import { describe, expect, it } from "vitest";

import {
  CITY_FINDER_SIZE,
  CITY_LOT_FLAGS,
  CITY_LOT_TYPES,
  cityFinderRing,
  createCityLayout,
} from "./city-model";
import { createSeedBlockField, createSeedModel, SEED_BLOCK_TYPES } from "./seed-model";

describe("createCityLayout", () => {
  it("is byte-identical for the same deterministic identity", async () => {
    const identity = await createEveryQRCodeIdentity("https://example.com/city?a=1", {
      identityScope: "url",
    });
    const model = await createSeedModel(identity);
    const first = createCityLayout(model);
    const second = createCityLayout(model);

    expect(first.dna).toEqual(second.dna);
    expect(first.lots).toEqual(second.lots);
    expect(new Uint8Array(first.lotData.buffer)).toEqual(new Uint8Array(second.lotData.buffer));
  });

  it("derives meaningfully different city DNA and lot details for different identities", async () => {
    const firstModel = await createSeedModel(
      await createEveryQRCodeIdentity("https://first.example.com/city", {
        identityScope: "url",
      }),
    );
    const secondModel = await createSeedModel(
      await createEveryQRCodeIdentity("https://second.example.com/city", {
        identityScope: "url",
      }),
    );
    const first = createCityLayout(firstModel);
    const second = createCityLayout(secondModel);

    expect(first.dna).not.toEqual(second.dna);
    expect(Array.from(first.lotData)).not.toEqual(Array.from(second.lotData));
  });

  it("uses the canonical QR matrix as the occupied-lot blueprint", async () => {
    const model = await createSeedModel(
      await createEveryQRCodeIdentity("https://example.com/canonical-city"),
    );
    const layout = createCityLayout(model);
    const darkIndices = new Set(model.modules.map((module) => module.index));

    expect(layout.lots).toHaveLength(model.qrSize * model.qrSize);
    for (const lot of layout.lots) {
      expect(lot.type !== CITY_LOT_TYPES.road).toBe(darkIndices.has(lot.index));
      expect(lot.floors > 0).toBe(darkIndices.has(lot.index));
    }
  });

  it("turns all three finder patterns into landmark towers, podiums, and courtyards", async () => {
    const model = await createSeedModel(
      await createEveryQRCodeIdentity("https://example.com/city-landmarks"),
    );
    const layout = createCityLayout(model);
    const origins = [
      [0, 0],
      [model.qrSize - CITY_FINDER_SIZE, 0],
      [0, model.qrSize - CITY_FINDER_SIZE],
    ] as const;

    for (const [originColumn, originRow] of origins) {
      for (let row = originRow; row < originRow + CITY_FINDER_SIZE; row += 1) {
        for (let column = originColumn; column < originColumn + CITY_FINDER_SIZE; column += 1) {
          const lot = layout.lots[row * model.qrSize + column];
          const ring = cityFinderRing(column, row, model.qrSize);
          expect(lot).toBeDefined();
          if (!lot) continue;
          if (ring === 1) {
            expect(lot.type).toBe(CITY_LOT_TYPES.road);
            expect(lot.flags & CITY_LOT_FLAGS.courtyard).toBeTruthy();
          } else if (ring >= 2) {
            expect(lot.type).toBe(CITY_LOT_TYPES.landmarkTower);
            expect(lot.archetype).toBe("landmark");
          } else {
            expect(lot.type).toBe(CITY_LOT_TYPES.landmarkPodium);
            expect(lot.archetype).toBe("podium");
          }
        }
      }
    }
  });

  it("converges to the same canonical QR occupancy as Tree and Terrain", async () => {
    const model = await createSeedModel(
      await createEveryQRCodeIdentity("https://example.com/shared-city-endpoint"),
    );
    const city = createSeedBlockField(model, "city");
    const terrain = createSeedBlockField(model, "terrain");
    const tree = createSeedBlockField(model, "tree");
    const occupancy = (types: Uint32Array): boolean[] =>
      Array.from(types, (type) => type !== SEED_BLOCK_TYPES.dirt);
    const treeBaseTypes = new Uint32Array(
      tree.blocks.filter((block) => block.layer === 0).map((block) => block.type),
    );

    expect(city.blocks).toHaveLength(model.qrSize * model.qrSize);
    expect(occupancy(city.types)).toEqual(occupancy(terrain.types));
    expect(occupancy(city.types)).toEqual(occupancy(treeBaseTypes));
  });
});
