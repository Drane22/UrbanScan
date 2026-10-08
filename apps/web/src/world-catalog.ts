import type { EveryQRCodeModel } from "@every-qrcode/react";

export const WORLD_CATEGORIES = ["All", "Nature", "Architecture", "Craft", "Sci-fi"] as const;
export type WorldCategory = (typeof WORLD_CATEGORIES)[number];
export type WorldOption = {
  id: EveryQRCodeModel;
  name: string;
  category: Exclude<WorldCategory, "All">;
  description: string;
  replay: boolean;
  seededPalette: boolean;
  mark: string;
};
/** Lightweight controls metadata; never import shaders here. */
export const WORLD_CATALOG: readonly WorldOption[] = [
  {
    id: "waves",
    name: "Waves",
    category: "Nature",
    description: "Curling sea ribbons, foam crests and drifting spray.",
    replay: true,
    seededPalette: true,
    mark: "waves",
  },
  {
    id: "crystalline",
    name: "Crystalline",
    category: "Nature",
    description: "Faceted mineral spires and floating glints of light.",
    replay: true,
    seededPalette: true,
    mark: "crystal",
  },
  {
    id: "mechanical",
    name: "Mechanical",
    category: "Sci-fi",
    description: "Working gears, pistons and tiny maintenance crawlers.",
    replay: true,
    seededPalette: true,
    mark: "mechanical",
  },
  {
    id: "tree",
    name: "Tree",
    category: "Nature",
    description: "A living canopy, shaped by your link.",
    replay: false,
    seededPalette: false,
    mark: "tree",
  },
  {
    id: "terrain",
    name: "Terrain",
    category: "Nature",
    description: "Crystal ridges and rivers in a miniature landscape.",
    replay: true,
    seededPalette: true,
    mark: "mountain",
  },
  {
    id: "city",
    name: "City",
    category: "Architecture",
    description: "A small skyline with a destination of its own.",
    replay: false,
    seededPalette: false,
    mark: "city",
  },
  {
    id: "circuit",
    name: "Circuit",
    category: "Sci-fi",
    description: "Tiny connections. A whole world of possibilities.",
    replay: false,
    seededPalette: false,
    mark: "circuit",
  },
  {
    id: "reef",
    name: "Reef",
    category: "Nature",
    description: "Colorful corals and life beneath the surface.",
    replay: false,
    seededPalette: false,
    mark: "reef",
  },
  {
    id: "colony",
    name: "Colony",
    category: "Nature",
    description: "An earth cutaway with busy chambers and trails.",
    replay: true,
    seededPalette: true,
    mark: "colony",
  },
  {
    id: "dungeon",
    name: "Dungeon",
    category: "Architecture",
    description: "Torchlit passages, stone arches and hidden treasures.",
    replay: true,
    seededPalette: true,
    mark: "dungeon",
  },
  {
    id: "origami",
    name: "Origami",
    category: "Craft",
    description: "Folded gardens and paper birds taking flight.",
    replay: true,
    seededPalette: true,
    mark: "origami",
  },
  {
    id: "stained-glass",
    name: "Stained Glass",
    category: "Craft",
    description: "Jewel-colored panes and a little light in motion.",
    replay: true,
    seededPalette: true,
    mark: "glass",
  },
  {
    id: "mycelium",
    name: "Mycelium",
    category: "Nature",
    description: "A playful fungal forest with drifting spores.",
    replay: true,
    seededPalette: true,
    mark: "mushroom",
  },
  {
    id: "constellation",
    name: "Solar System",
    category: "Sci-fi",
    description: "Planets, rings and cosmic flybys in a tiny observatory.",
    replay: true,
    seededPalette: true,
    mark: "orbit",
  },
  {
    id: "toy-block",
    name: "Toy Block",
    category: "Craft",
    description: "Colorful towers, bridges and busy little vehicles.",
    replay: true,
    seededPalette: true,
    mark: "blocks",
  },
];
export function getWorldOption(id: EveryQRCodeModel): WorldOption {
  return WORLD_CATALOG.find((world) => world.id === id)!;
}
