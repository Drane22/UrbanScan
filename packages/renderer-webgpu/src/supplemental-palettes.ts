import type { SeedForm } from "./seed-model.js";
import type { WorldPalettePreset } from "./world-palettes.js";

type Row = readonly [
  id: string,
  name: string,
  colors: readonly [string, string, string, string, string],
  direction: number,
  description: string,
];
function presets(rows: readonly Row[]): readonly WorldPalettePreset[] {
  return rows.map(([id, name, colors, artDirection, description]) => ({
    id,
    name,
    artDirection,
    description,
    palette: colors.map((hex) => {
      const value = Number.parseInt(hex.slice(1), 16);
      return [(value >> 16) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255] as const;
    }) as unknown as WorldPalettePreset["palette"],
    swatches: [colors[1], colors[2], colors[3]],
  }));
}

/** Additional palettes reuse an explicit material style, never an array index. */
export const SUPPLEMENTAL_PALETTES: Partial<Record<SeedForm, readonly WorldPalettePreset[]>> = {
  tree: presets([
    [
      "moonflower",
      "Moonflower",
      ["#20283d", "#b8c8e5", "#759d87", "#9573b8", "#f5f7fc"],
      3,
      "Silver foliage, violet moonflowers and deep indigo bark",
    ],
    [
      "rosewood-moss",
      "Rosewood & Moss",
      ["#3b2029", "#9ac977", "#e2cf94", "#4f8875", "#fff7eb"],
      0,
      "Rosewood branches, chartreuse leaves and ivory blossoms",
    ],
  ]),
  terrain: presets([
    [
      "amber-dunes",
      "Terracotta Canyon",
      ["#30231c", "#e7c297", "#ba684c", "#5fb4b5", "#fff9ec"],
      1,
      "Terracotta ridges, sand-colored blossoms and turquoise valleys",
    ],
    [
      "arctic-bloom",
      "Arctic Bloom",
      ["#182a3d", "#9daed8", "#b3d7c8", "#82bcd5", "#f4fbff"],
      3,
      "Pale mint slopes, periwinkle flowers and glacier-blue water",
    ],
  ]),
  city: presets([
    [
      "jade-district",
      "Jade District",
      ["#163129", "#d29562", "#70a58f", "#e5cd7a", "#f7f8ee"],
      0,
      "Jade towers, copper rooftops and warm golden windows",
    ],
    [
      "rose-quartz-city",
      "Rose Quartz",
      ["#352338", "#d889a0", "#9c8cc8", "#dda971", "#fff5f8"],
      1,
      "Rose facades, lilac glass and soft copper rooftops",
    ],
  ]),
  circuit: presets([
    [
      "porcelain-circuit",
      "Porcelain Circuit",
      ["#203044", "#ec897e", "#68b7c1", "#8d9fbd", "#f9fbf9"],
      1,
      "Pale ceramic, coral contacts and teal signal routes",
    ],
    [
      "ultraviolet-lab",
      "Ultraviolet Lab",
      ["#2d193d", "#53c4bf", "#b579d1", "#ead074", "#fbf5ff"],
      2,
      "Violet boards, mint channels and citrus test pads",
    ],
  ]),
  reef: presets([
    [
      "pearl-lagoon",
      "Pearl Lagoon",
      ["#302536", "#b6d9e0", "#d7afc2", "#a7d7be", "#f7fbef"],
      0,
      "Ice-blue coral, rose shallows and pale jade seagrass",
    ],
    [
      "midnight-tide",
      "Midnight Tide",
      ["#1c2545", "#69c4d6", "#c76f95", "#e6ac65", "#f5f7ff"],
      2,
      "Indigo water, berry corals and luminous turquoise life",
    ],
  ]),
  colony: presets([
    [
      "cobalt-burrow",
      "Cobalt Burrow",
      ["#1b2b40", "#9bd5e5", "#456fd1", "#b6b4e4", "#f9f7ed"],
      2,
      "Cobalt mineral chambers, cyan stores and periwinkle roots",
    ],
    [
      "berry-garden",
      "Berry Garden",
      ["#35202e", "#e8b1d1", "#bc5488", "#8abcb4", "#fff6ef"],
      3,
      "Berry earth, orchid resources and mint-colored roots",
    ],
  ]),
  dungeon: presets([
    [
      "copper-vault",
      "Copper Vault",
      ["#32271f", "#57b3ba", "#bd8863", "#d4df72", "#fff9ec"],
      0,
      "Copper masonry, cyan runes and lime-colored relics",
    ],
    [
      "jade-citadel",
      "Jade Citadel",
      ["#17332c", "#8cabdd", "#43b4a1", "#d5e9de", "#f5fbef"],
      1,
      "Polished jade walls, blue crystals and pale celadon archways",
    ],
  ]),
  origami: presets([
    [
      "peach-atelier",
      "Peach Atelier",
      ["#3a2926", "#f3d49c", "#eea66f", "#cf7456", "#fff8ee"],
      0,
      "Apricot paper, cream folds and burnt-sienna edges",
    ],
    [
      "midnight-washi",
      "Midnight Washi",
      ["#24263e", "#b492d0", "#789bbf", "#e69cac", "#f7f7ff"],
      2,
      "Indigo paper, orchid creases and rose cranes",
    ],
  ]),
  "stained-glass": presets([
    [
      "ocean-prism",
      "Ocean Prism",
      ["#192e43", "#63bec5", "#bc6e9e", "#e8be70", "#f6fbff"],
      0,
      "Aqua panes, rose prisms and fine golden seams",
    ],
    [
      "amber-chapel",
      "Amber Chapel",
      ["#30251b", "#f2d48b", "#dca03b", "#b95d3c", "#fff9ec"],
      1,
      "Honey glass, amber jewels and copper reflections",
    ],
  ]),
  mycelium: presets([
    [
      "bluebell-grove",
      "Bluebell Grove",
      ["#202b3e", "#c6a7eb", "#6752c9", "#97bce5", "#f7f9f0"],
      2,
      "Indigo bluebell caps, lilac spores and powder-blue roots",
    ],
    [
      "apricot-spores",
      "Apricot Spores",
      ["#35271e", "#e7ad79", "#cd8196", "#6eaea0", "#fff9ed"],
      0,
      "Apricot mushrooms, rose gills and mint moss",
    ],
  ]),
  constellation: presets([
    [
      "copper-cosmos",
      "Copper Cosmos",
      ["#1b2a3a", "#dd9a6b", "#70bacb", "#be739c", "#f8f8ff"],
      0,
      "Copper planets, icy rings and rose-colored satellites",
    ],
    [
      "violet-nebula",
      "Orchid Aurora",
      ["#2e213e", "#f2a4d1", "#bc4cad", "#747bdb", "#faf5ff"],
      2,
      "Orchid worlds, rose trails and periwinkle stars",
    ],
  ]),
  "toy-block": presets([
    [
      "retro-arcade",
      "Retro Arcade",
      ["#20263d", "#ee53b4", "#8452d5", "#43dccf", "#fcf8f2"],
      2,
      "Violet bricks, hot-pink studs and electric turquoise tracks",
    ],
    [
      "pistachio-play",
      "Pistachio Play",
      ["#2b3327", "#ecd6a0", "#a4c76d", "#508965", "#fbfaee"],
      1,
      "Pistachio bricks, vanilla flags and forest-green bridges",
    ],
  ]),
};
