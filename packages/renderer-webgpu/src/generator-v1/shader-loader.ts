import type { SeedShaderSources, SharedShaderSources } from "../renderer.js";

// Frozen source bundles from commit 7684773; changes belong in the current generator.
async function loadVersionOneSharedShaders(): Promise<SharedShaderSources> {
  const shared = await import("./shared-shaders.js");
  return { post: shared.SEED_POST_SHADER, weather: shared.SEED_WEATHER_SHADER };
}

const loaders = {
  circuit: async (): Promise<SeedShaderSources> => {
    const [shared, m] = await Promise.all([
      loadVersionOneSharedShaders(),
      import("./circuit-shaders.js"),
    ]);
    return { ...shared, circuit: m.CIRCUIT_SHADER, form: "circuit" };
  },
  city: async (): Promise<SeedShaderSources> => {
    const [shared, city] = await Promise.all([
      loadVersionOneSharedShaders(),
      import("./city-shaders.js"),
    ]);
    return { ...shared, city: city.CITY_SHADER, form: "city" };
  },
  colony: async (): Promise<SeedShaderSources> => {
    const [shared, m] = await Promise.all([
      loadVersionOneSharedShaders(),
      import("./colony-shaders.js"),
    ]);
    return { ...shared, colony: m.COLONY_SHADER, form: "colony" };
  },
  constellation: async (): Promise<SeedShaderSources> => {
    const [shared, m] = await Promise.all([
      loadVersionOneSharedShaders(),
      import("./constellation-shaders.js"),
    ]);
    return { ...shared, constellation: m.CONSTELLATION_SHADER, form: "constellation" };
  },
  dungeon: async (): Promise<SeedShaderSources> => {
    const [shared, m] = await Promise.all([
      loadVersionOneSharedShaders(),
      import("./dungeon-shaders.js"),
    ]);
    return { ...shared, dungeon: m.DUNGEON_SHADER, form: "dungeon" };
  },
  mycelium: async (): Promise<SeedShaderSources> => {
    const [shared, m] = await Promise.all([
      loadVersionOneSharedShaders(),
      import("./mycelium-shaders.js"),
    ]);
    return { ...shared, form: "mycelium", mycelium: m.MYCELIUM_SHADER };
  },
  origami: async (): Promise<SeedShaderSources> => {
    const [shared, m] = await Promise.all([
      loadVersionOneSharedShaders(),
      import("./origami-shaders.js"),
    ]);
    return { ...shared, form: "origami", origami: m.ORIGAMI_SHADER };
  },
  reef: async (): Promise<SeedShaderSources> => {
    const [shared, m] = await Promise.all([
      loadVersionOneSharedShaders(),
      import("./reef-shaders.js"),
    ]);
    return { ...shared, form: "reef", reef: m.REEF_SHADER };
  },
  "stained-glass": async (): Promise<SeedShaderSources> => {
    const [shared, m] = await Promise.all([
      loadVersionOneSharedShaders(),
      import("./stained-glass-shaders.js"),
    ]);
    return { ...shared, form: "stained-glass", "stained-glass": m.STAINED_GLASS_SHADER };
  },
  terrain: async (): Promise<SeedShaderSources> => {
    const [shared, terrain] = await Promise.all([
      loadVersionOneSharedShaders(),
      import("./terrain-shaders.js"),
    ]);
    return { ...shared, form: "terrain", terrain: terrain.TERRAIN_SHADER };
  },
  "toy-block": async (): Promise<SeedShaderSources> => {
    const [shared, m] = await Promise.all([
      loadVersionOneSharedShaders(),
      import("./toy-block-shaders.js"),
    ]);
    return { ...shared, form: "toy-block", "toy-block": m.TOY_BLOCK_SHADER };
  },
  tree: async (): Promise<SeedShaderSources> => {
    const [shared, tree] = await Promise.all([
      loadVersionOneSharedShaders(),
      import("./tree-shaders.js"),
    ]);
    return {
      ...shared,
      blocks: tree.TREE_BLOCK_SHADER,
      branches: tree.TREE_BRANCH_SHADER,
      butterflies: tree.TREE_BUTTERFLY_SHADER,
      fallingPetals: tree.TREE_FALLING_PETAL_SHADER,
      flowers: tree.TREE_FLOWER_SHADER,
      form: "tree",
      grass: tree.TREE_GRASS_SHADER,
      shadow: tree.TREE_SHADOW_SHADER,
    };
  },
};

export const versionOneShaderLoaders = loaders;
