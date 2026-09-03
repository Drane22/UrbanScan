import type { SeedScenePalette } from "./renderer.js";
import type { SeedForm } from "./seed-model.js";

export type WorldPalettePreset = {
  readonly id: string;
  readonly name: string;
  readonly palette: SeedScenePalette;
  readonly swatches: readonly [string, string, string];
};

export const WORLD_PALETTES: Readonly<Record<SeedForm, readonly WorldPalettePreset[]>> = {
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
  colony: [
    {
      id: "crimson-histology",
      name: "Crimson Histology",
      palette: [
        [0.24, 0.03, 0.08], // Deep burgundy cell ink
        [0.86, 0.22, 0.32], // Coral membrane stain
        [0.56, 0.08, 0.18], // Dense tissue rose
        [0.46, 0.2, 0.7], // Violet reagent
        [0.98, 0.95, 0.88], // Warm ivory culture medium
      ],
      swatches: ["#3d0814", "#db3852", "#7533b3"],
    },
    {
      id: "violet-stain",
      name: "Violet Stain",
      palette: [
        [0.13, 0.03, 0.2], // Dark nuclear violet
        [0.74, 0.24, 0.48], // Magenta membrane stain
        [0.38, 0.12, 0.5], // Purple tissue body
        [0.9, 0.36, 0.5], // Eosin reagent accent
        [0.97, 0.95, 0.91], // Pale glass-slide medium
      ],
      swatches: ["#210833", "#bd3d7a", "#e65c80"],
    },
    {
      id: "eosin-rose",
      name: "Eosin Rose",
      palette: [
        [0.26, 0.04, 0.12], // Dark carmine nuclei
        [0.92, 0.36, 0.48], // Eosin membrane pink
        [0.62, 0.14, 0.3], // Cultured tissue crimson
        [0.5, 0.26, 0.72], // Hematoxylin accent
        [0.99, 0.95, 0.92], // Blushed ivory medium
      ],
      swatches: ["#420a1f", "#eb5c7a", "#8042b8"],
    },
    {
      id: "cultured-plum",
      name: "Cultured Plum",
      palette: [
        [0.16, 0.025, 0.1], // Plum-black cell ink
        [0.78, 0.18, 0.4], // Raspberry membrane
        [0.44, 0.08, 0.3], // Mature tissue plum
        [0.36, 0.34, 0.76], // Cool reagent violet
        [0.96, 0.95, 0.9], // Sterile cream medium
      ],
      swatches: ["#29061a", "#c72e66", "#5c57c2"],
    },
  ],
  constellation: [
    {
      id: "deep-nebula",
      name: "Deep Nebula",
      palette: [
        [0.06, 0.05, 0.18], // Interstellar medium
        [0.25, 0.78, 0.98], // Sirius blue star
        [0.75, 0.28, 0.88], // Emission nebula violet
        [0.98, 0.85, 0.35], // Golden giant
        [0.95, 0.95, 0.98], // Cosmic microwave background
      ],
      swatches: ["#0f0d2e", "#40c7fa", "#bf47e0"],
    },
    {
      id: "stellar-cyan",
      name: "Pleiades Blue",
      palette: [
        [0.04, 0.1, 0.22], // Dark void
        [0.32, 0.82, 0.98], // O-type blue giant
        [0.15, 0.48, 0.75], // Reflection dust
        [0.78, 0.92, 1.0], // Stellar diffraction
        [0.93, 0.96, 0.98], // Starlight paper
      ],
      swatches: ["#0a1a38", "#52d1fa", "#c7e8ff"],
    },
    {
      id: "solar-pulsar",
      name: "Supernova Flare",
      palette: [
        [0.18, 0.06, 0.08], // Dense core
        [0.98, 0.45, 0.15], // Solar prominence
        [0.98, 0.82, 0.25], // Photosphere gold
        [0.75, 0.15, 0.22], // Corona red
        [0.98, 0.95, 0.92], // Warm stellar wind
      ],
      swatches: ["#2e0f14", "#fa7326", "#fad140"],
    },
    {
      id: "aurora-borealis",
      name: "Aurora Cosmos",
      palette: [
        [0.05, 0.12, 0.14], // Polar night
        [0.18, 0.92, 0.55], // Green auroral curtain
        [0.65, 0.18, 0.75], // High altitude violet
        [0.22, 0.75, 0.92], // Magnetic cyan
        [0.94, 0.98, 0.96], // Snow plateau
      ],
      swatches: ["#0d1f24", "#2eeb8c", "#a62ebf"],
    },
  ],
  dungeon: [
    {
      id: "crypt-granite",
      name: "Crypt Granite",
      palette: [
        [0.08, 0.09, 0.11], // Deep granite basalt
        [0.98, 0.62, 0.15], // Torch fire amber
        [0.42, 0.45, 0.5], // Ashlar stone
        [0.75, 0.15, 0.2], // Crimson dungeon banner
        [0.96, 0.95, 0.92], // Pale limestone flagstone
      ],
      swatches: ["#14171c", "#fa9e26", "#bf2633"],
    },
    {
      id: "obsidian-abyss",
      name: "Obsidian Abyss",
      palette: [
        [0.05, 0.04, 0.06], // Abyssal volcanic obsidian
        [0.98, 0.38, 0.08], // Molten lava core
        [0.48, 0.25, 0.22], // Cooled magma rock
        [0.85, 0.65, 0.18], // Scorched basalt bronze
        [0.95, 0.94, 0.92], // Ash-white pavement
      ],
      swatches: ["#0d0a0f", "#fa6114", "#d9a62e"],
    },
    {
      id: "catacomb-sandstone",
      name: "Catacomb Sandstone",
      palette: [
        [0.1, 0.08, 0.06], // Ancient catacomb shadow
        [0.96, 0.72, 0.18], // Torch flame gold
        [0.55, 0.46, 0.35], // Weathered sandstone
        [0.72, 0.42, 0.18], // Bronze ironwork
        [0.97, 0.95, 0.89], // Warm sandstone parchment
      ],
      swatches: ["#1a140f", "#f5b82e", "#b86b2e"],
    },
    {
      id: "bloodstone-keep",
      name: "Bloodstone Keep",
      palette: [
        [0.09, 0.05, 0.07], // Sanguine keep shadow
        [0.95, 0.75, 0.2], // Imperial gold
        [0.65, 0.14, 0.2], // Bloodstone crimson
        [0.45, 0.38, 0.42], // Dungeon iron
        [0.96, 0.94, 0.95], // Alabaster stone
      ],
      swatches: ["#170d12", "#f2bf33", "#a62433"],
    },
  ],
  mycelium: [
    {
      id: "bioluminescent-neon",
      name: "Bioluminescent Spore",
      palette: [
        [0.05, 0.15, 0.1], // Deep forest peat
        [0.15, 0.95, 0.45], // Electric emerald cap
        [0.22, 0.85, 0.92], // Glowing hyphae cyan
        [0.85, 0.92, 0.25], // Spore cloud lime
        [0.94, 0.97, 0.94], // Pale mycorrhizal mat
      ],
      swatches: ["#0d261a", "#26f273", "#38d9eb"],
    },
    {
      id: "spore-twilight",
      name: "Twilight Fungus",
      palette: [
        [0.12, 0.08, 0.2], // Midnight soil
        [0.72, 0.25, 0.88], // Amethyst mushroom
        [0.35, 0.75, 0.95], // Phosphor gills
        [0.92, 0.35, 0.65], // Spore veil
        [0.96, 0.94, 0.98], // Pale lichen
      ],
      swatches: ["#1f1433", "#b840e0", "#59bfe6"],
    },
    {
      id: "amber-bracket",
      name: "Chanterelle Amber",
      palette: [
        [0.18, 0.12, 0.08], // Rich humus
        [0.95, 0.62, 0.18], // Chanterelle gold
        [0.85, 0.38, 0.15], // Russet bracket
        [0.98, 0.82, 0.35], // Luminous spore
        [0.97, 0.95, 0.9], // Birch bark
      ],
      swatches: ["#2e1f14", "#f29e2e", "#fad159"],
    },
    {
      id: "ghost-fungus",
      name: "Ghost Mycelium",
      palette: [
        [0.08, 0.12, 0.14], // Damp bog
        [0.45, 0.88, 0.75], // Ghostly pale green
        [0.25, 0.55, 0.5], // Shadow stalk
        [0.75, 0.95, 0.88], // Moonlight glow
        [0.94, 0.97, 0.96], // Spore parchment
      ],
      swatches: ["#141f24", "#73e0bf", "#408c80"],
    },
  ],
  origami: [
    {
      id: "washi-indigo",
      name: "Washi Indigo",
      palette: [
        [0.06, 0.08, 0.2], // Deep vat aizome ink
        [0.25, 0.48, 0.82], // Japanese indigo blue
        [0.16, 0.28, 0.52], // Crease fold shadow
        [0.86, 0.72, 0.32], // Gilded leaf highlight
        [0.96, 0.97, 0.98], // Bleached hemp washi paper
      ],
      swatches: ["#0f1433", "#407ad1", "#dbc352"],
    },
    {
      id: "mulberry-crimson",
      name: "Mulberry Crimson",
      palette: [
        [0.1, 0.04, 0.07], // Sumi black mulberry ink
        [0.86, 0.16, 0.22], // Torii vermilion fold
        [0.48, 0.16, 0.24], // Mulberry crease shadow
        [0.92, 0.76, 0.28], // Imperial gold crane crest
        [0.98, 0.95, 0.92], // Handmade mulberry paper
      ],
      swatches: ["#1a0a12", "#db2938", "#ebc247"],
    },
    {
      id: "bamboo-sage",
      name: "Bamboo Sage",
      palette: [
        [0.05, 0.1, 0.07], // Deep pine kurogane ink
        [0.32, 0.68, 0.36], // Fresh bamboo sage fold
        [0.18, 0.36, 0.22], // Bamboo crease shadow
        [0.88, 0.8, 0.4], // Bamboo cane gold crest
        [0.96, 0.98, 0.93], // Bamboo washi parchment
      ],
      swatches: ["#0d1a12", "#52ad5c", "#e0cc66"],
    },
    {
      id: "gold-leaf-lacquer",
      name: "Gold Leaf Lacquer",
      palette: [
        [0.07, 0.05, 0.05], // Urushi black lacquer ink
        [0.9, 0.74, 0.22], // Gilded gold leaf fold
        [0.32, 0.22, 0.16], // Lacquer crease shadow
        [0.96, 0.88, 0.62], // Platinum luster crest
        [0.98, 0.96, 0.92], // Imperial cream vellum
      ],
      swatches: ["#120d0d", "#e6bd38", "#f5e09e"],
    },
  ],
  reef: [
    {
      id: "tropical-coral",
      name: "Tropical Coral",
      palette: [
        [0.08, 0.18, 0.32], // Deep lagoon water
        [0.95, 0.42, 0.48], // Living brain coral
        [0.25, 0.82, 0.88], // Shallow lagoon turquoise
        [0.98, 0.68, 0.25], // Sunlit anemone
        [0.94, 0.96, 0.97], // Bleached sea sand
      ],
      swatches: ["#142e52", "#f26b7a", "#40d1e0"],
    },
    {
      id: "bioluminescent-trench",
      name: "Abyssal Trench",
      palette: [
        [0.04, 0.08, 0.18], // Midnight bathyal
        [0.12, 0.88, 0.95], // Hydrothermal cyan
        [0.65, 0.22, 0.85], // Deep sea siphonophore
        [0.18, 0.95, 0.55], // Green fluorescent protein
        [0.92, 0.95, 0.98], // Marine snow
      ],
      swatches: ["#0a142e", "#1fe0f2", "#a638d9"],
    },
    {
      id: "azure-lagoon",
      name: "Atoll Azure",
      palette: [
        [0.05, 0.22, 0.38], // Barrier reef dropoff
        [0.22, 0.72, 0.92], // Tropical azure
        [0.35, 0.88, 0.75], // Reef flat aqua
        [0.92, 0.78, 0.35], // Sea fan yellow
        [0.96, 0.97, 0.95], // Coral sand
      ],
      swatches: ["#0d3861", "#38b8eb", "#59e0bf"],
    },
    {
      id: "sunken-gold",
      name: "Gilded Galleon",
      palette: [
        [0.12, 0.15, 0.22], // Shipwreck oak
        [0.88, 0.72, 0.22], // Sunken doubloon
        [0.25, 0.58, 0.55], // Verdigris bronze
        [0.95, 0.55, 0.22], // Fire coral
        [0.96, 0.94, 0.9], // Sea floor silt
      ],
      swatches: ["#1f2638", "#e0b838", "#40948c"],
    },
  ],
  "stained-glass": [
    {
      id: "gothic-rose",
      name: "Chartres Rose",
      palette: [
        [0.1, 0.12, 0.15], // Dark lead came
        [0.15, 0.32, 0.85], // Sapphire cobalt glass
        [0.85, 0.12, 0.25], // Ruby crimson glass
        [0.95, 0.75, 0.18], // Amber gold medallion
        [0.96, 0.95, 0.92], // Frosted clear light
      ],
      swatches: ["#1a1f26", "#2652d9", "#d91f40"],
    },
    {
      id: "tiffany-emerald",
      name: "Tiffany Garden",
      palette: [
        [0.12, 0.14, 0.12], // Oxidized zinc came
        [0.12, 0.65, 0.38], // Favrile emerald glass
        [0.18, 0.55, 0.85], // Water lily blue
        [0.88, 0.65, 0.18], // Iridescent amber
        [0.95, 0.96, 0.93], // Opalescent white
      ],
      swatches: ["#1f241f", "#1fa661", "#2e8cd9"],
    },
    {
      id: "art-nouveau-violet",
      name: "Art Nouveau Iris",
      palette: [
        [0.12, 0.1, 0.18], // Lead boundary
        [0.58, 0.18, 0.75], // Imperial amethyst
        [0.22, 0.68, 0.82], // Peacock turquoise
        [0.92, 0.42, 0.65], // Plum blossom
        [0.96, 0.94, 0.98], // Frosted morning light
      ],
      swatches: ["#1f1a2e", "#942ebf", "#38aed1"],
    },
    {
      id: "golden-cathedral",
      name: "Sienna Cathedral",
      palette: [
        [0.15, 0.12, 0.1], // Iron framework
        [0.92, 0.68, 0.18], // Sienna gold
        [0.78, 0.32, 0.15], // Spiced cinnamon glass
        [0.98, 0.85, 0.38], // Divine light halo
        [0.97, 0.95, 0.91], // Alabaster pane
      ],
      swatches: ["#261f1a", "#ebad2e", "#c75226"],
    },
  ],
  terrain: [
    {
      id: "alpine-glacier",
      name: "Alpine Glacier",
      palette: [
        [0.1, 0.18, 0.28], // Glacial lake
        [0.28, 0.62, 0.85], // Turquoise ice
        [0.35, 0.55, 0.32], // Alpine meadow
        [0.65, 0.68, 0.72], // Granite ridge
        [0.95, 0.97, 0.99], // Summit snowcap
      ],
      swatches: ["#1a2e47", "#479ed9", "#598c52"],
    },
    {
      id: "desert-dunes",
      name: "Sahara Dunes",
      palette: [
        [0.25, 0.12, 0.08], // Desert canyon
        [0.85, 0.52, 0.22], // Sand dune crest
        [0.95, 0.75, 0.35], // Sunlit slope
        [0.68, 0.32, 0.15], // Oasis shadow
        [0.98, 0.95, 0.88], // Salt flat
      ],
      swatches: ["#401f14", "#d98538", "#f2bf59"],
    },
    {
      id: "volcanic-rift",
      name: "Volcanic Caldera",
      palette: [
        [0.12, 0.08, 0.08], // Basalt crater
        [0.88, 0.22, 0.12], // Lava lake
        [0.95, 0.62, 0.18], // Sulfur vent
        [0.45, 0.18, 0.12], // Obsidian ridge
        [0.95, 0.92, 0.88], // Volcanic ash
      ],
      swatches: ["#1f1414", "#e0381f", "#f29e2e"],
    },
    {
      id: "lush-highlands",
      name: "Scottish Highlands",
      palette: [
        [0.08, 0.18, 0.14], // Loch water
        [0.28, 0.58, 0.32], // Emerald glen
        [0.55, 0.28, 0.58], // Heather moor
        [0.48, 0.52, 0.48], // Mist ridge
        [0.94, 0.96, 0.92], // Overcast sky
      ],
      swatches: ["#142e24", "#479452", "#8c4794"],
    },
  ],
  "toy-block": [
    {
      id: "classic-primary",
      name: "Classic Primary",
      palette: [
        [0.85, 0.12, 0.15], // Ferrari Red
        [0.08, 0.38, 0.85], // Classic Blue
        [0.95, 0.78, 0.12], // Sunshine Yellow
        [0.12, 0.65, 0.25], // Grass Green
        [0.96, 0.96, 0.96], // Pure White Plate
      ],
      swatches: ["#d91f26", "#1461d9", "#f2c71f"],
    },
    {
      id: "space-explorer",
      name: "Space Cruiser",
      palette: [
        [0.15, 0.16, 0.22], // Classic Space Gray
        [0.08, 0.42, 0.88], // Spacecraft Blue
        [0.98, 0.78, 0.12], // Trans-Yellow canopy
        [0.85, 0.18, 0.22], // Thruster red
        [0.96, 0.96, 0.98], // Launch pad white
      ],
      swatches: ["#262938", "#146be0", "#fac71f"],
    },
    {
      id: "castle-fantasy",
      name: "Castle Knight",
      palette: [
        [0.35, 0.38, 0.42], // Castle Stone Gray
        [0.78, 0.15, 0.2], // Knight Lion Red
        [0.18, 0.35, 0.72], // Royal Blue
        [0.88, 0.68, 0.18], // Crown Gold
        [0.92, 0.92, 0.9], // Castle Courtyard
      ],
      swatches: ["#59616b", "#c72633", "#2e59b8"],
    },
    {
      id: "neon-arcade-blocks",
      name: "Neon Arcade",
      palette: [
        [0.1, 0.08, 0.15], // Dark arcade cabinet
        [0.98, 0.15, 0.65], // Neon Pink Brick
        [0.15, 0.88, 0.92], // Cyan Stud
        [0.65, 0.95, 0.15], // Toxic Green Block
        [0.97, 0.95, 0.98], // Glow Plate
      ],
      swatches: ["#1a1426", "#fa26a6", "#26e0eb"],
    },
  ],
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

export function getPalettesForModel(model: SeedForm): readonly WorldPalettePreset[] {
  return WORLD_PALETTES[model] ?? WORLD_PALETTES.tree;
}

export function getDefaultPaletteForModel(model: SeedForm): WorldPalettePreset {
  return getPalettesForModel(model)[0]!;
}
