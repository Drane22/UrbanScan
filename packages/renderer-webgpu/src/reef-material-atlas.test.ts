import { describe, expect, it } from "vitest";

import {
  createReefMaterialAtlas,
  REEF_MATERIAL_ATLAS_SIZE,
  REEF_MATERIAL_TILES,
  REEF_MATERIAL_TILE_SIZE,
} from "./reef-material-atlas";

describe("reef-material-atlas", () => {
  it("creates a stable aligned RGBA atlas", () => {
    const atlas = createReefMaterialAtlas();
    expect(atlas).toHaveLength(REEF_MATERIAL_ATLAS_SIZE ** 2 * 4);
    expect(REEF_MATERIAL_ATLAS_SIZE * 4).toBe(256);
    expect(createReefMaterialAtlas()).toEqual(atlas);
  });

  it("keeps textured material tiles in bounds", () => {
    const capacity = (REEF_MATERIAL_ATLAS_SIZE / REEF_MATERIAL_TILE_SIZE) ** 2;
    for (const tile of Object.values(REEF_MATERIAL_TILES)) {
      expect(tile).toBeGreaterThanOrEqual(0);
      expect(tile).toBeLessThan(capacity);
    }
    const atlas = createReefMaterialAtlas();
    expect(new Set(atlas).size).toBeGreaterThan(24);
  });
});
