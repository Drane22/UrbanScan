import { describe, expect, it } from "vitest";

import {
  CIRCUIT_MATERIAL_ATLAS_SIZE,
  CIRCUIT_MATERIAL_TILES,
  CIRCUIT_MATERIAL_TILE_SIZE,
  createCircuitMaterialAtlas,
} from "./circuit-material-atlas";

describe("circuit-material-atlas", () => {
  it("creates a stable 64px RGBA atlas with aligned upload rows", () => {
    const atlas = createCircuitMaterialAtlas();
    expect(atlas).toHaveLength(CIRCUIT_MATERIAL_ATLAS_SIZE ** 2 * 4);
    expect(CIRCUIT_MATERIAL_ATLAS_SIZE * 4).toBe(256);
    expect(createCircuitMaterialAtlas()).toEqual(atlas);
  });

  it("keeps every declared tile inside the atlas", () => {
    const tileCapacity = (CIRCUIT_MATERIAL_ATLAS_SIZE / CIRCUIT_MATERIAL_TILE_SIZE) ** 2;
    for (const tile of Object.values(CIRCUIT_MATERIAL_TILES)) {
      expect(tile).toBeGreaterThanOrEqual(0);
      expect(tile).toBeLessThan(tileCapacity);
    }
  });

  it("authors textured tiles rather than flat colors", () => {
    const atlas = createCircuitMaterialAtlas();
    const colors = new Set<string>();
    for (let index = 0; index < CIRCUIT_MATERIAL_TILE_SIZE ** 2; index += 1) {
      const column = index % CIRCUIT_MATERIAL_TILE_SIZE;
      const row = Math.floor(index / CIRCUIT_MATERIAL_TILE_SIZE);
      const offset = (row * CIRCUIT_MATERIAL_ATLAS_SIZE + column) * 4;
      colors.add(Array.from(atlas.slice(offset, offset + 4)).join(","));
    }
    expect(colors.size).toBeGreaterThan(8);
  });
});
