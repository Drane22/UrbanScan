import { describe, expect, it } from "vitest";

import { WORLD_PALETTES, type WorldPalettePreset } from "./world-palettes";

/**
 * Scan-reliability gate for the refactored worlds.
 *
 * Each entry mirrors its WGSL shader's QR-ink selection and contrast
 * correction in plain TypeScript: the dark-module candidates a world can emit
 * at scan lock must retain the palette's hue identity while keeping adequate
 * Rec. 709 luminance separation from the paper substrate.
 *
 * Thresholds match the project's Tree baseline (worst accepted Tree case is
 * roughly 0.58 dark luminance against a ~0.95 paper).
 */
type RGB = readonly [number, number, number];

const luma = ([r, g, b]: RGB): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;

const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const smoothstep = (e0: number, e1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** Mirrors each shader's darkest-of (primary/secondary/fourth) ink picker. */
const themeInk = (palette: WorldPalettePreset["palette"], black: RGB, amount: number): RGB => {
  const [primary, secondary, , fourth] = palette;
  let ink: RGB = luma(secondary!) < luma(primary!) ? secondary! : primary!;
  const inkLuma = Math.min(luma(primary!), luma(secondary!));
  ink = luma(fourth!) < inkLuma ? fourth! : ink;
  return mix(ink, black, amount);
};

const paper = (palette: WorldPalettePreset["palette"], white: RGB, blend: number): RGB =>
  mix(palette[4]!, white, blend);

const NEAR_BLACK: RGB = [0.015, 0.015, 0.015];
const PAPER_WHITE: RGB = [0.98, 0.98, 0.98];

function expectScannable(
  world: string,
  preset: WorldPalettePreset,
  darks: readonly RGB[],
  paperColor: RGB,
): void {
  const paperLuma = luma(paperColor);
  for (const dark of darks) {
    const darkLuma = luma(dark);
    expect(
      darkLuma,
      `${world}/${preset.id} dark module luma ${darkLuma.toFixed(3)} exceeds scan-safe ceiling`,
    ).toBeLessThanOrEqual(0.62);
    expect(
      paperLuma - darkLuma,
      `${world}/${preset.id} paper-to-ink separation ${(paperLuma - darkLuma).toFixed(3)} is too low to scan`,
    ).toBeGreaterThanOrEqual(0.3);
  }
}

describe("refactored world QR contrast", () => {
  it("keeps every toy-block brick family scannable (white bricks resolve to ink)", () => {
    for (const preset of WORLD_PALETTES["toy-block"]) {
      const pal = preset.palette;
      const ink = themeInk(pal, NEAR_BLACK, 0.15);
      const brick = (i: number): RGB => {
        if (i === 0) return pal[0]!;
        if (i === 1) return pal[1]!;
        if (i === 2) return pal[2]!;
        if (i === 3) return pal[3]!;
        return mix(pal[4]!, [1, 1, 1], 0.35);
      };
      const darks = [0, 1, 2, 3, 4].map((i) => {
        let color = brick(i);
        if (i === 4) color = ink;
        return mix(color, ink, smoothstep(0.42, 0.72, luma(color)) * 0.55);
      });
      expectScannable("toy-block", preset, darks, paper(pal, PAPER_WHITE, 0.55));
    }
  });

  it("keeps every stained-glass jewel and medallion tone scannable", () => {
    for (const preset of WORLD_PALETTES["stained-glass"]) {
      const pal = preset.palette;
      const ink = themeInk(pal, NEAR_BLACK, 0.15);
      const darks: RGB[] = [];
      for (let colorIdx = 0; colorIdx < 6; colorIdx += 1) {
        for (const paneType of [1, 2, 3, 4]) {
          let color: RGB = [...pal[0]!];
          if (colorIdx % 3 === 1) color = mix(pal[0]!, pal[1]!, 0.3);
          else if (colorIdx % 3 === 2) color = mix(pal[0]!, pal[2]!, 0.3);
          if (paneType === 3 || paneType === 2) color = mix(color, pal[3]!, 0.25);
          else if (paneType === 4) color = mix(color, pal[1]!, 0.3);
          darks.push(mix(color, ink, smoothstep(0.55, 0.85, luma(color)) * 0.35));
        }
      }
      expectScannable("stained-glass", preset, darks, paper(pal, PAPER_WHITE, 0.55));
    }
  });

  it("resolves bright mycelium bioluminescence to dark ink at scan lock", () => {
    for (const preset of WORLD_PALETTES.mycelium) {
      const pal = preset.palette;
      const ink = themeInk(pal, NEAR_BLACK, 0.15);
      const darks = [1, 2, 3, 4].map((blockType) => {
        let color: RGB = [...pal[0]!];
        if (blockType === 3) color = [...pal[1]!];
        else if (blockType === 4) color = mix(pal[2]!, pal[3]!, 0.55);
        else if (blockType === 2) color = [...pal[3]!];
        return mix(color, ink, smoothstep(0.35, 0.65, luma(color)) * 0.85);
      });
      expectScannable("mycelium", preset, darks, paper(pal, PAPER_WHITE, 0.55));
    }
  });

  it("resolves bright constellation stellar tones to dark ink at scan lock", () => {
    for (const preset of WORLD_PALETTES.constellation) {
      const pal = preset.palette;
      const ink = themeInk(pal, NEAR_BLACK, 0.15);
      const darks = [1, 2, 3, 4].map((blockType) => {
        let color: RGB = [...pal[0]!];
        if (blockType === 3) color = [...pal[1]!];
        else if (blockType === 4) color = mix(pal[2]!, pal[3]!, 0.55);
        else if (blockType === 2) color = [...pal[3]!];
        return mix(color, ink, smoothstep(0.35, 0.65, luma(color)) * 0.85);
      });
      expectScannable("constellation", preset, darks, paper(pal, PAPER_WHITE, 0.55));
    }
  });

  it("keeps every dungeon masonry and torch tone scannable", () => {
    for (const preset of WORLD_PALETTES.dungeon) {
      const pal = preset.palette;
      const ink = themeInk(pal, [0.012, 0.012, 0.012], 0.18);
      const darks = [1, 2, 3, 4, 5, 7].map((featType) => {
        let color: RGB;
        if (featType === 5) color = [...pal[0]!];
        else if (featType === 2) color = mix(pal[0]!, pal[3]!, 0.4);
        else if (featType === 3) color = mix(pal[0]!, pal[2]!, 0.35);
        else if (featType === 7) color = mix(pal[1]!, pal[3]!, 0.5);
        else color = mix(pal[0]!, pal[2]!, 0.25);
        return mix(color, ink, smoothstep(0.38, 0.68, luma(color)) * 0.8);
      });
      expectScannable("dungeon", preset, darks, paper(pal, PAPER_WHITE, 0.58));
    }
  });

  it("keeps every origami fold tone, including gold leaf, scannable", () => {
    for (const preset of WORLD_PALETTES.origami) {
      const pal = preset.palette;
      const ink = themeInk(pal, NEAR_BLACK, 0.15);
      const darks = [1, 2, 3, 4, 5, 6, 7].map((foldType) => {
        let color: RGB = [...pal[0]!];
        if (foldType === 5) color = mix(pal[0]!, pal[1]!, 0.22);
        else if (foldType === 4) color = mix(pal[0]!, pal[3]!, 0.25);
        else if (foldType === 3) color = mix(pal[0]!, pal[2]!, 0.18);
        return mix(color, ink, smoothstep(0.38, 0.68, luma(color)) * 0.8);
      });
      expectScannable("origami", preset, darks, paper(pal, [0.97, 0.96, 0.93], 0.6));
    }
  });
});
