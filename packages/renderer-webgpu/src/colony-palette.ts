import type { SeedScenePalette } from "./renderer.js";
import type { WorldPalettePreset } from "./world-palettes.js";
import { seededRandom } from "./world-dna.js";
import { DIORAMA_PALETTES } from "./diorama-palettes.js";

type Color = readonly [number, number, number];
export const COLONY_PALETTES: readonly WorldPalettePreset[] = DIORAMA_PALETTES.colony;

export function selectColonyPalette(seed: number): WorldPalettePreset {
  return COLONY_PALETTES[Math.floor(seededRandom(seed, 91, 0, 1601) * COLONY_PALETTES.length)]!;
}

export function colonyMaterials(palette: SeedScenePalette) {
  const [cavity, resource, substrate, rim, background] = palette;
  // Bounded even for a caller-supplied bright palette; preserves its hue.
  const qrForeground = cavity.map((channel) => channel * 0.6) as unknown as Color;
  return {
    background,
    substrate,
    cavity,
    rim,
    resource,
    highlight: background,
    shadow: qrForeground,
    qrForeground,
  };
}
