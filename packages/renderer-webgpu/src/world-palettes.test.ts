import { describe, expect, it } from "vitest";

import { getDefaultPaletteForModel, getPalettesForModel, WORLD_PALETTES } from "./world-palettes";

describe("world-palettes", () => {
  const models = [
    "tree",
    "terrain",
    "city",
    "circuit",
    "reef",
    "colony",
    "dungeon",
    "origami",
    "stained-glass",
    "mycelium",
    "constellation",
    "toy-block",
  ] as const;

  it("provides at least 4 curated palettes for every model", () => {
    for (const model of models) {
      const palettes = getPalettesForModel(model);
      expect(palettes.length).toBeGreaterThanOrEqual(4);
      for (const p of palettes) {
        expect(p.palette.length).toBe(5);
        expect(p.swatches.length).toBe(3);
        // Each color channel in 0..1
        for (const rgb of p.palette) {
          expect(rgb.length).toBe(3);
          for (const c of rgb) {
            expect(c).toBeGreaterThanOrEqual(0);
            expect(c).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it("provides a valid default palette for every model", () => {
    for (const model of models) {
      const def = getDefaultPaletteForModel(model);
      expect(def).toBeDefined();
      expect(def.id).toBe(WORLD_PALETTES[model][0]!.id);
    }
  });
});
