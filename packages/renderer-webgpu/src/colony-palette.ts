import type { SeedScenePalette } from "./renderer.js";
import type { WorldPalettePreset } from "./world-palettes.js";
import { seededRandom } from "./world-dna.js";

type Color = readonly [number, number, number];
const rgb = (hex: string): Color => {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

// Uniform roles: cavity/QR ink, resource, substrate, rim, background.
function family(
  id: string,
  name: string,
  colors: readonly [string, string, string, string, string],
): WorldPalettePreset {
  return {
    id,
    name,
    palette: colors.map(rgb) as unknown as SeedScenePalette,
    swatches: [colors[0], colors[1], colors[3]],
  };
}

export const COLONY_PALETTES: readonly WorldPalettePreset[] = [
  family("earth-hive", "Earth Hive", ["#352318", "#deb35c", "#987452", "#ba8e54", "#f6eedb"]),
  family("red-clay", "Red Clay", ["#3b1e1c", "#e8b681", "#98584a", "#c77e60", "#fbefe2"]),
  family("pale-nest", "Pale Nest", ["#33291d", "#cca256", "#b7a58a", "#e0ceb0", "#faf5e9"]),
  family("fungal-colony", "Fungal Colony", ["#272c1d", "#d4c16c", "#777956", "#a7ae78", "#f3f3e0"]),
];

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
