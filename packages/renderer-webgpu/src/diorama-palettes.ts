import type { SeedForm } from "./seed-model.js";
import type { WorldPalettePreset } from "./world-palettes.js";

type DioramaForm = Extract<
  SeedForm,
  | "colony"
  | "dungeon"
  | "origami"
  | "stained-glass"
  | "mycelium"
  | "constellation"
  | "toy-block"
  | "reef"
>;
type Color = readonly [number, number, number];

const rgb = (hex: string): Color => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
};

/** Structural shadow, bright accent, main material, foliage/decor, pale substrate. */
function family(
  id: string,
  name: string,
  colors: readonly [string, string, string, string, string],
): WorldPalettePreset {
  return {
    id,
    name,
    palette: [rgb(colors[0]), rgb(colors[1]), rgb(colors[2]), rgb(colors[3]), rgb(colors[4])],
    swatches: [colors[2], colors[1], colors[3]],
  };
}

// Preserve preset IDs and order so stored overrides and seeded choices retain their families.
export const DIORAMA_PALETTES: Readonly<Record<DioramaForm, readonly WorldPalettePreset[]>> = {
  colony: [
    family("earth-hive", "Terracotta Mint", [
      "#362433",
      "#ffc15d",
      "#ce755b",
      "#67d6bb",
      "#fff4dc",
    ]),
    family("red-clay", "Plum Lime", ["#32203f", "#d4ec52", "#9256bd", "#f3aa81", "#fff2df"]),
    family("pale-nest", "Cobalt Coral", ["#142944", "#ff766d", "#587bcc", "#ddbd63", "#faf2db"]),
    family("fungal-colony", "Berry Lagoon", [
      "#361d36",
      "#f1d657",
      "#b25089",
      "#54ceca",
      "#fff8dd",
    ]),
  ],
  dungeon: [
    family("crypt-granite", "Slate Amber", ["#202b3c", "#ffbe52", "#6879a1", "#45d2cf", "#f4f6ef"]),
    family("obsidian-abyss", "Indigo Rose", [
      "#25203f",
      "#ed749d",
      "#5966b7",
      "#e4bb62",
      "#fff1e6",
    ]),
    family("catacomb-sandstone", "Violet Lime", [
      "#30233e",
      "#d6e956",
      "#9570ba",
      "#4ebac8",
      "#fff8e5",
    ]),
    family("bloodstone-keep", "Petrol Coral", [
      "#152f37",
      "#ff8572",
      "#438d98",
      "#b29bdc",
      "#f2faf5",
    ]),
  ],
  origami: [
    family("washi-indigo", "Cobalt Tangerine", [
      "#192e50",
      "#ffab55",
      "#5585d7",
      "#74cdbb",
      "#fff8e9",
    ]),
    family("mulberry-crimson", "Raspberry Sage", [
      "#402439",
      "#f2d75e",
      "#bd548f",
      "#83b57c",
      "#fff8df",
    ]),
    family("bamboo-sage", "Violet Aqua", ["#322446", "#ffc290", "#a07acd", "#66d4cb", "#fff4eb"]),
    family("gold-leaf-lacquer", "Cherry Mint", [
      "#3a2430",
      "#e7bb57",
      "#dc6673",
      "#76cbb4",
      "#fff7e6",
    ]),
  ],
  "stained-glass": [
    family("gothic-rose", "Sapphire Ruby", ["#1b263f", "#df4864", "#4973cf", "#efc15c", "#fcf5df"]),
    family("tiffany-emerald", "Emerald Violet", [
      "#203831",
      "#c67be5",
      "#42a884",
      "#f7b77d",
      "#f3fae9",
    ]),
    family("art-nouveau-violet", "Turquoise Rose", [
      "#183841",
      "#ed7caa",
      "#45b7c6",
      "#c88b50",
      "#fff4e9",
    ]),
    family("golden-cathedral", "Indigo Citrus", [
      "#292543",
      "#d1e759",
      "#7266c6",
      "#f18470",
      "#fff7e3",
    ]),
  ],
  mycelium: [
    family("bioluminescent-neon", "Lavender Chartreuse", [
      "#302841",
      "#d4e859",
      "#a18aca",
      "#50ada2",
      "#fff8e6",
    ]),
    family("spore-twilight", "Coral Petrol", [
      "#19363b",
      "#fac398",
      "#df7e79",
      "#409da8",
      "#fff1e7",
    ]),
    family("amber-bracket", "Cobalt Bubblegum", [
      "#20304e",
      "#ef85b4",
      "#5686d2",
      "#e7d35f",
      "#fffae0",
    ]),
    family("ghost-fungus", "Plum Mint", ["#36253d", "#efb858", "#a06baf", "#73cdae", "#f5f9e9"]),
  ],
  constellation: [
    family("deep-nebula", "Midnight Ice", ["#18233e", "#95d4ef", "#5d72b3", "#d58c63", "#f3f8fd"]),
    family("stellar-cyan", "Aubergine Mint", [
      "#32233f",
      "#85e0bb",
      "#8e63ac",
      "#ee8cae",
      "#fff1f7",
    ]),
    family("solar-pulsar", "Teal Amber", ["#12373a", "#f9bd5a", "#429aa3", "#ad84dc", "#f2faf5"]),
    family("aurora-borealis", "Burgundy Cyan", [
      "#3e2333",
      "#64d6e3",
      "#b65a7d",
      "#e6bf64",
      "#fff5e8",
    ]),
  ],
  "toy-block": [
    family("classic-primary", "Cherry Cobalt", [
      "#32253f",
      "#f6ca48",
      "#e86778",
      "#518bd4",
      "#fff9e7",
    ]),
    family("space-explorer", "Turquoise Tangerine", [
      "#17363e",
      "#ffa555",
      "#4cbbc0",
      "#a67bd1",
      "#f5fbf5",
    ]),
    family("castle-fantasy", "Raspberry Lime", [
      "#38223c",
      "#cfe365",
      "#be559e",
      "#6bb5de",
      "#fff7e6",
    ]),
    family("neon-arcade-blocks", "Coral Mint", [
      "#34283e",
      "#a792d9",
      "#ed897a",
      "#75ccac",
      "#fff7ef",
    ]),
  ],
  reef: [
    family("tropical-coral", "Lagoon Coral", [
      "#153b49",
      "#f88288",
      "#4cbcc7",
      "#e4bd63",
      "#fff6df",
    ]),
    family("bioluminescent-trench", "Violet Lime Reef", [
      "#2b2648",
      "#d9e966",
      "#9c80cf",
      "#61d0c2",
      "#f2faf1",
    ]),
    family("azure-lagoon", "Cobalt Peach", ["#192e50", "#ffb599", "#6382d4", "#e6c359", "#fff7e6"]),
    family("sunken-gold", "Petrol Rose", ["#16383c", "#ed88ae", "#569da9", "#87d7ac", "#f8fae8"]),
  ],
};
