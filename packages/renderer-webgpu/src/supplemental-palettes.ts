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
      ["#3b2029", "#d79a83", "#d4c791", "#7caa92", "#fff7eb"],
      0,
      "Rosewood branches, sage leaves and soft peach blossoms",
    ],
  ]),
  terrain: presets([
    [
      "amber-dunes",
      "Amber Dunes",
      ["#30231c", "#ec9c59", "#ceb173", "#59a49d", "#fff9ec"],
      1,
      "Ochre dunes, copper ridges and turquoise river valleys",
    ],
    [
      "arctic-bloom",
      "Arctic Bloom",
      ["#182a3d", "#a68cdd", "#6aa9bb", "#e7b885", "#f4fbff"],
      3,
      "Glacier-blue ridges with lavender slopes and amber shores",
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
      ["#173b3d", "#e9a0b0", "#65b5ab", "#e4bd69", "#f7fbef"],
      0,
      "Pearl sand, rose coral and jade shallows",
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
      ["#1b2b40", "#e8a557", "#709cba", "#90ba78", "#f9f7ed"],
      2,
      "Blue mineral chambers, amber stores and fresh green roots",
    ],
    [
      "berry-garden",
      "Berry Garden",
      ["#35202e", "#d785d0", "#b97185", "#75b3a0", "#fff6ef"],
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
      ["#17332c", "#8cabdd", "#69a98b", "#e7b977", "#f5fbef"],
      1,
      "Jade walls, cool blue crystals and brass archways",
    ],
  ]),
  origami: presets([
    [
      "peach-atelier",
      "Peach Atelier",
      ["#3a2926", "#ecad88", "#d8858a", "#75aa95", "#fff8ee"],
      0,
      "Peach paper, rose folds and sage leaves",
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
      ["#302236", "#e9b461", "#a48bc8", "#79b497", "#fff9ec"],
      1,
      "Honey glass, violet jewels and emerald reflections",
    ],
  ]),
  mycelium: presets([
    [
      "bluebell-grove",
      "Bluebell Grove",
      ["#202b3e", "#aa88d7", "#729dbd", "#d4b86c", "#f7f9f0"],
      2,
      "Bluebell caps, lilac spores and ochre roots",
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
      "Violet Nebula",
      ["#2e213e", "#8dcbb0", "#b184c7", "#e7bd76", "#faf5ff"],
      2,
      "Violet worlds, mint trails and amber stars",
    ],
  ]),
  "toy-block": presets([
    [
      "retro-arcade",
      "Retro Arcade",
      ["#20263d", "#e876a7", "#5ebac6", "#e8c15f", "#fcf8f2"],
      2,
      "Rose bricks, turquoise tracks and golden arcade details",
    ],
    [
      "pistachio-play",
      "Pistachio Play",
      ["#2b3327", "#d38caa", "#92b977", "#72a9bc", "#fbfaee"],
      1,
      "Pistachio bricks, rose flags and sky-blue bridges",
    ],
  ]),
};
