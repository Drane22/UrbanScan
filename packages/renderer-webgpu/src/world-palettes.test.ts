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

const luminance = (color: readonly number[]): number =>
  color[0]! * 0.2126 + color[1]! * 0.7152 + color[2]! * 0.0722;

const mixColor = (left: readonly number[], right: readonly number[], amount: number): number[] =>
  left.map((channel, index) => channel * (1 - amount) + right[index]! * amount);

it("keeps Circuit and Reef scan materials high-contrast across every palette", () => {
  for (const { palette } of WORLD_PALETTES.circuit) {
    const [primary, secondary, third, fourth, fifth] = palette;
    const ink = mixColor(primary, third, 0.16).map((channel) => channel * 0.52);
    const paperTone = mixColor(fifth, third, 0.16);
    const substrate = mixColor(paperTone, fourth, 0.08);

    expect(luminance(substrate) - luminance(ink)).toBeGreaterThan(0.35);
    expect(luminance(secondary)).toBeGreaterThan(luminance(ink));
  }

  for (const { palette } of WORLD_PALETTES.reef) {
    const [primary, secondary, third, _fourth, fifth] = palette;
    const ink = mixColor(primary, secondary, 0.12).map((channel) => channel * 0.56);
    const water = mixColor(primary, third, 0.62);
    const limestone = mixColor(fifth, third, 0.18);
    const sand = mixColor(limestone, water, 0.22);
    const sandTone = mixColor(sand, third, 0.1);
    const substrate = mixColor(sandTone, water, 0.14);

    expect(luminance(substrate) - luminance(ink)).toBeGreaterThan(0.35);
  }
});
