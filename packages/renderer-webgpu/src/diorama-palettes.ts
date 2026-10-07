import type { SeedForm } from "./seed-model.js";
import type { WorldPalettePreset } from "./world-palettes.js";
type DioramaForm = Exclude<SeedForm, "tree" | "city" | "circuit">;
type Family = readonly [string, string, readonly [string, string, string, string, string], string];
const rgb = (hex: string): readonly [number, number, number] => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
};
// Structural shadow, accent, main surface, environment and pale highlight.
// The main material owns the scene; accents are used for recognizable details.
function families(rows: readonly Family[]): readonly WorldPalettePreset[] {
  return rows.map(([id, name, colors, description], artDirection) => ({
    id,
    name,
    description,
    artDirection,
    palette: colors.map(rgb) as unknown as WorldPalettePreset["palette"],
    swatches: [colors[1], colors[2], colors[3]],
  }));
}
export const DIORAMA_PALETTES: Readonly<Record<DioramaForm, readonly WorldPalettePreset[]>> = {
  colony: families([
    [
      "earth-hive",
      "Amber Burrow",
      ["#251910", "#f3ce4b", "#bf7951", "#82b35b", "#fff7e7"],
      "Copper soil, moss chambers and amber resources",
    ],
    [
      "pale-nest",
      "Chalk & Nectar",
      ["#172934", "#f2af38", "#8cb7c8", "#d76a59", "#f8fbef"],
      "Porous chalk, honey deposits and terracotta nests",
    ],
    [
      "red-clay",
      "Red Clay Bloom",
      ["#30201b", "#efcb61", "#d26b55", "#739fd0", "#fff6e9"],
      "Layered red earth with cool mineral pockets",
    ],
    [
      "fungal-colony",
      "Root Sanctuary",
      ["#1a2927", "#c98cdb", "#57a292", "#e9b956", "#f5fae8"],
      "Living root seams, turquoise earth and violet nutrients",
    ],
  ]),
  dungeon: families([
    [
      "crypt-granite",
      "Torchlit Basalt",
      ["#1e2635", "#ffaf3a", "#7184ac", "#c87962", "#fff7ea"],
      "Chiseled basalt, warm torches and rusted relics",
    ],
    [
      "obsidian-abyss",
      "Mossbound Ruins",
      ["#122c27", "#d5d879", "#55948a", "#76ae69", "#f3fae9"],
      "Weathered teal stone with luminous moss in the joints",
    ],
    [
      "bloodstone-keep",
      "Amethyst Keep",
      ["#2c1838", "#e8b749", "#9c68bf", "#cf577e", "#fff4ec"],
      "Amethyst stone, brass fixtures and ruby relics",
    ],
    [
      "catacomb-sandstone",
      "Frozen Crypt",
      ["#182b39", "#ffc585", "#61accc", "#bfd972", "#f2fbff"],
      "Ice-glazed masonry and amber lights in frozen chambers",
    ],
  ]),
  origami: families([
    [
      "washi-indigo",
      "Washi & Vermilion",
      ["#172b43", "#ef654a", "#3f6cab", "#c9ab56", "#fff8e9"],
      "Indigo washi, vermilion folds and ochre paper fibres",
    ],
    [
      "mulberry-crimson",
      "Pressed Lotus",
      ["#362136", "#e9ba60", "#cf77a7", "#669ba3", "#fff8ef"],
      "Rose paper with pressed petals and lagoon-blue edges",
    ],
    [
      "bamboo-sage",
      "Bamboo Rice Paper",
      ["#1c3029", "#dc9859", "#67a478", "#69b4bf", "#f8fae9"],
      "Woven bamboo fibres, jade folds and copper pinwheels",
    ],
    [
      "gold-leaf-lacquer",
      "Lacquer Festival",
      ["#302037", "#edbd50", "#e0525d", "#7159b5", "#fff7e9"],
      "Crimson folds, violet ribbons and shifting gold flecks",
    ],
  ]),
  "stained-glass": families([
    [
      "gothic-rose",
      "Cathedral Jewels",
      ["#1b263f", "#efc15c", "#df4864", "#4973cf", "#fcf7e9"],
      "Ruby and sapphire panes with amber leadwork glints",
    ],
    [
      "tiffany-emerald",
      "Tiffany Garden",
      ["#19372d", "#f1bd62", "#46a88c", "#ac78b9", "#f4faec"],
      "Hammered emerald glass, violet jewels and honey light",
    ],
    [
      "sea-mosaic",
      "Sea Mosaic",
      ["#17333e", "#d7a948", "#2daab5", "#4169bb", "#f5fbef"],
      "Turquoise mosaic glass and cobalt ripples of light",
    ],
    [
      "rose-quartz",
      "Rose Quartz",
      ["#342136", "#c38848", "#d68aaf", "#72b5ad", "#fff6ee"],
      "Opalescent rose panes, copper seams and mint refractions",
    ],
  ]),
  mycelium: families([
    [
      "bioluminescent-neon",
      "Foxfire Grove",
      ["#142b29", "#a8e761", "#3cb6a9", "#b584d1", "#f5faea"],
      "Glowing teal fungi, luminous moss and mint spore clouds",
    ],
    [
      "amber-bracket",
      "Amber Shelf",
      ["#282016", "#efe57f", "#da8a4c", "#6ba78f", "#fff8e8"],
      "Velvet amber brackets, weathered logs and golden nutrients",
    ],
    [
      "ghost-fungus",
      "Moonmilk Cavern",
      ["#1c283b", "#e3bf7b", "#7c9cce", "#c189c8", "#f3faff"],
      "Milk-white stems, blue mineral soil and pearl-like spores",
    ],
    [
      "spore-twilight",
      "Velvet Bloom",
      ["#321b30", "#a8d95c", "#cc5982", "#7283c7", "#fff6e8"],
      "Wine-colored caps, leafy undergrowth and bursts of pollen",
    ],
  ]),
  constellation: families([
    [
      "solar-pulsar",
      "Solar Furnace",
      ["#171325", "#ffcd59", "#e46135", "#617dcc", "#fff8ee"],
      "Hot stellar flares, copper worlds and cool planetary oceans",
    ],
    [
      "stellar-cyan",
      "Ice Giants",
      ["#102a39", "#b5e37a", "#4fbed4", "#9568c9", "#f2fbff"],
      "Icy gas bands, violet rings and green auroral particles",
    ],
    [
      "deep-nebula",
      "Violet Nebula",
      ["#281635", "#f3b886", "#9664bc", "#64cbbb", "#fff6fb"],
      "Violet dust clouds, pale solar winds and mint moons",
    ],
    [
      "aurora-borealis",
      "Ringed Copper",
      ["#241b24", "#e6ce77", "#b96543", "#69bdb8", "#fff7e9"],
      "Copper crusts, icy rings and gold meteor trails",
    ],
  ]),
  "toy-block": families([
    [
      "classic-primary",
      "Classic Brick Box",
      ["#17283c", "#ffd345", "#397ccc", "#ec5555", "#fff9eb"],
      "Glossy primary bricks, red cars and yellow playground parts",
    ],
    [
      "retro-toyshop",
      "Retro Toyshop",
      ["#1d3336", "#f49c42", "#42aea8", "#bb6cc3", "#fff8e9"],
      "Satin turquoise bricks with tangerine and plum fittings",
    ],
    [
      "space-explorer",
      "Space Bricks",
      ["#20223c", "#dd823c", "#8088cc", "#93cf53", "#f6f9ef"],
      "Metallic space toys, lime signal studs and copper vehicles",
    ],
    [
      "candy-workshop",
      "Candy Workshop",
      ["#352337", "#ddaf44", "#d279a0", "#74b5cb", "#fff8ee"],
      "Sugar-colored molded bricks with blue trim and honey gears",
    ],
  ]),
  reef: families([
    [
      "tropical-coral",
      "Living Coral",
      ["#143746", "#f5767e", "#4db9c2", "#92c77f", "#fff8e6"],
      "Clear lagoon water, coral pink and leafy seagrass",
    ],
    [
      "bioluminescent-trench",
      "Abyssal Lanterns",
      ["#211d3b", "#55dbe5", "#7358b5", "#d7c354", "#f7faee"],
      "Deep violet water and luminous cyan colonies",
    ],
    [
      "azure-lagoon",
      "Kelp & Pearls",
      ["#18362d", "#ab71c1", "#5b9d8c", "#d9b760", "#fafbea"],
      "Green kelp currents, violet corals and pearl sand",
    ],
    [
      "sunken-gold",
      "Sunken Copper",
      ["#1b3039", "#d9925f", "#556aaf", "#8bbc6c", "#fff8e6"],
      "Copper corals, cool sea glass and olive seagrass",
    ],
  ]),
  terrain: families([
    [
      "alpine-glacier",
      "Jade Wildflower Valley",
      ["#273039", "#b6a0e4", "#c58064", "#65b6ae", "#fff8eb"],
      "Fern-green hills, lavender wildflowers and jade streams",
    ],
    [
      "volcanic-rift",
      "Amber Autumn Meadow",
      ["#291b27", "#ffc35a", "#cd5f40", "#745eae", "#fff7e9"],
      "Golden grasses, copper soil and lilac creeks",
    ],
    [
      "desert-dunes",
      "Rosewater Gardens",
      ["#342333", "#79ccbc", "#d68fa2", "#d9b454", "#fff8e9"],
      "Rose meadows, mint water and honey-colored flowers",
    ],
    [
      "lush-highlands",
      "Moonlit Alpine Garden",
      ["#17253a", "#d9dc79", "#5e9ecd", "#b977c9", "#f6faff"],
      "Teal foliage, blue streams and violet alpine blossoms",
    ],
  ]),
};
