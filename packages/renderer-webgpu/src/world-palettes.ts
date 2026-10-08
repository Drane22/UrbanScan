import { COLONY_PALETTES } from "./colony-palette.js";
import { WAVES_PALETTES } from "./waves-palettes.js";
import { CRYSTALLINE_PALETTES } from "./crystalline-palettes.js";
import { MECHANICAL_PALETTES } from "./mechanical-palettes.js";
import { DIORAMA_PALETTES } from "./diorama-palettes.js";
import { SUPPLEMENTAL_PALETTES } from "./supplemental-palettes.js";
import type { SeedScenePalette } from "./renderer.js";
import type { SeedForm } from "./seed-model.js";

export type WorldPalettePreset = {
  readonly artDirection?: number;
  readonly description?: string;
  readonly id: string;
  readonly name: string;
  readonly palette: SeedScenePalette;
  readonly swatches: readonly [string, string, string];
};

const BASE_PALETTES: Readonly<Record<SeedForm, readonly WorldPalettePreset[]>> = {
  waves: WAVES_PALETTES,
  crystalline: CRYSTALLINE_PALETTES,
  mechanical: MECHANICAL_PALETTES,
  circuit: [
    {
      id: "emerald-pcb",
      name: "Emerald PCB",
      palette: [
        [0.02, 0.22, 0.1], // Primary IC/Trace (deep emerald)
        [0.85, 0.72, 0.25], // Secondary/Alignment (gold test pads)
        [0.1, 0.55, 0.25], // Third (trace green)
        [0.92, 0.8, 0.35], // Fourth/Finder (bright gold contacts)
        [0.92, 0.96, 0.93], // Fifth/Paper (clean pale laminate)
      ],
      swatches: ["#05381a", "#d9b840", "#ebcc59"],
    },
    {
      id: "midnight-cobalt",
      name: "Cobalt Board",
      palette: [
        [0.05, 0.12, 0.32], // Deep cobalt substrate
        [0.22, 0.75, 0.95], // Cyan vias
        [0.12, 0.35, 0.65], // Blue trace
        [0.45, 0.9, 1.0], // Bright LED cyan
        [0.92, 0.95, 0.98], // Pale blue-white
      ],
      swatches: ["#0d1f52", "#38bfe6", "#73e6ff"],
    },
    {
      id: "cyber-neon",
      name: "Cyberpunk Neon",
      palette: [
        [0.12, 0.05, 0.22], // Deep purple substrate
        [0.98, 0.12, 0.55], // Hot neon pink
        [0.15, 0.88, 0.95], // Electric cyan
        [0.98, 0.82, 0.15], // Neon amber
        [0.96, 0.93, 0.98], // Soft lilac paper
      ],
      swatches: ["#1f0d38", "#fa1f8c", "#26e0f2"],
    },
    {
      id: "industrial-gold",
      name: "Industrial Gold",
      palette: [
        [0.14, 0.12, 0.1], // Matte black substrate
        [0.85, 0.65, 0.18], // Burnished copper
        [0.55, 0.42, 0.15], // Dark gold
        [0.98, 0.82, 0.28], // Mirror gold
        [0.96, 0.95, 0.91], // Warm silica
      ],
      swatches: ["#241f1a", "#d9a62e", "#fad147"],
    },
  ],
  city: [
    {
      id: "slate-metropolis",
      name: "Slate Metropolis",
      palette: [
        [0.16, 0.18, 0.22], // Charcoal granite
        [0.35, 0.52, 0.68], // Reflective window glass
        [0.55, 0.62, 0.68], // Steel girder
        [0.85, 0.45, 0.22], // Rooftop terracotta
        [0.95, 0.95, 0.96], // Limestone sidewalk
      ],
      swatches: ["#292e38", "#5985ad", "#d97338"],
    },
    {
      id: "sunset-brick",
      name: "Sunset Brick",
      palette: [
        [0.28, 0.12, 0.14], // Brownstone brick
        [0.92, 0.42, 0.25], // Terracotta orange
        [0.72, 0.25, 0.18], // Crimson facade
        [0.98, 0.72, 0.32], // Golden hour window
        [0.98, 0.94, 0.9], // Cream sandstone
      ],
      swatches: ["#471f24", "#eb6b40", "#f8b852"],
    },
    {
      id: "cyber-skyline",
      name: "Tokyo Neo-Night",
      palette: [
        [0.08, 0.09, 0.15], // Obsidian skyscraper
        [0.95, 0.15, 0.58], // Neon magenta billboard
        [0.18, 0.78, 0.95], // Cyan holo-sign
        [0.95, 0.85, 0.25], // Sodium streetlamp
        [0.95, 0.94, 0.98], // Frosted glass
      ],
      swatches: ["#141726", "#f22694", "#2ec7f2"],
    },
    {
      id: "monochrome-steel",
      name: "Monochrome Steel",
      palette: [
        [0.12, 0.13, 0.15], // Dark alloy
        [0.45, 0.48, 0.52], // Brushed nickel
        [0.65, 0.68, 0.72], // Polished chrome
        [0.28, 0.3, 0.35], // Titanium pillar
        [0.97, 0.97, 0.98], // Clean pearl
      ],
      swatches: ["#1f2126", "#737a85", "#a6adb8"],
    },
  ],
  colony: COLONY_PALETTES,
  constellation: DIORAMA_PALETTES["constellation"],
  dungeon: DIORAMA_PALETTES["dungeon"],
  mycelium: DIORAMA_PALETTES["mycelium"],
  origami: DIORAMA_PALETTES["origami"],
  reef: DIORAMA_PALETTES["reef"],
  "stained-glass": DIORAMA_PALETTES["stained-glass"],
  terrain: DIORAMA_PALETTES.terrain,
  "toy-block": DIORAMA_PALETTES["toy-block"],
  tree: [
    {
      id: "natural-forest",
      name: "Natural Forest",
      palette: [
        [0.14, 0.24, 0.16], // Deep bark
        [0.82, 0.58, 0.38], // Oak timber
        [0.93, 0.77, 0.52], // Sunlit canopy
        [0.31, 0.43, 0.18], // Moss green
        [0.965, 0.945, 0.906], // Paper parchment
      ],
      swatches: ["#243d29", "#d19461", "#4f6e2e"],
    },
    {
      id: "sakura-spring",
      name: "Sakura Spring",
      palette: [
        [0.28, 0.12, 0.18], // Cherry wood
        [0.92, 0.45, 0.62], // Cherry bloom
        [0.98, 0.78, 0.85], // Falling petals
        [0.65, 0.22, 0.38], // Deep blossom
        [0.98, 0.95, 0.96], // Silk washi
      ],
      swatches: ["#471f2e", "#eb739e", "#fbc7d9"],
    },
    {
      id: "golden-autumn",
      name: "Golden Autumn",
      palette: [
        [0.22, 0.12, 0.08], // Autumn trunk
        [0.92, 0.45, 0.18], // Maple scarlet
        [0.98, 0.75, 0.22], // Ginkgo gold
        [0.72, 0.25, 0.15], // Fallen leaves
        [0.98, 0.95, 0.9], // Amber parchment
      ],
      swatches: ["#381f14", "#eb732e", "#fabf38"],
    },
    {
      id: "winter-pine",
      name: "Winter Pine",
      palette: [
        [0.08, 0.18, 0.12], // Deep pine needle
        [0.45, 0.65, 0.52], // Frosted evergreen
        [0.25, 0.38, 0.28], // Cedar branch
        [0.75, 0.85, 0.88], // Morning hoarfrost
        [0.96, 0.98, 0.98], // Clean snow
      ],
      swatches: ["#142e1f", "#73a685", "#bfd9e0"],
    },
  ],
};

const LEGACY_MATERIALS: Partial<Record<SeedForm, readonly string[]>> = {
  tree: [
    "Oak bark, leaf-green canopy and drifting forest pollen",
    "Cherry blossoms, pink petals and silk-like leaves",
    "Copper foliage, gold leaves and an autumn breeze",
    "Frosted needles, icy branches and slower winter motion",
  ],
  city: [
    "Granite towers, reflective glass and terracotta rooftops",
    "Warm brownstones, copper windows and sandstone plazas",
    "Dark towers, magenta signs and chasing cyan window lights",
    "Brushed alloy buildings with polished chrome glints",
  ],
  circuit: [
    "Emerald laminate, gold contacts and measured signal pulses",
    "Cobalt boards, cyan vias and rapid LED activity",
    "Purple circuits, neon contacts and chasing signals",
    "Etched industrial copper, gold plating and slow charge pulses",
  ],
};
export const WORLD_PALETTES = Object.fromEntries(
  Object.entries(BASE_PALETTES).map(([form, presets]) => [
    form,
    [
      ...presets.map((preset, artDirection) =>
        preset.artDirection === undefined
          ? {
              ...preset,
              artDirection,
              description: LEGACY_MATERIALS[form as SeedForm]?.[artDirection],
            }
          : preset,
      ),
      ...(SUPPLEMENTAL_PALETTES[form as SeedForm] ?? []),
    ],
  ]),
) as unknown as Readonly<Record<SeedForm, readonly WorldPalettePreset[]>>;

export function getPalettesForModel(model: SeedForm): readonly WorldPalettePreset[] {
  return WORLD_PALETTES[model] ?? WORLD_PALETTES.tree;
}

export function getDefaultPaletteForModel(model: SeedForm): WorldPalettePreset {
  return getPalettesForModel(model)[0]!;
}
