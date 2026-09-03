import { analyzeQRTopology, type QRTopologyAnalysis } from "@every-qrcode/core";
import type { SeedModel } from "./seed-model.js";
import { createBaseWorldDNA, seededRandom, type WorldDNA } from "./world-dna.js";

export const DUNGEON_TILE_TYPES = {
  // Rich dungeon tile/feature types
  bedrockFloor: 0, // negative void [light cells, height: 0.0]
  stoneWall: 1, // corridor walls / boundary masonry
  vaultedChamber: 2, // dense cluster rooms / great halls
  archwayCorridor: 3, // linear colonnade paths / hallway archways
  pillarSanctum: 4, // structural columns & support pillars
  bossSanctum: 5, // finder patterns: 7x7 outer curtain wall, 5x5 portcullis moat, 3x3 dais, 1x1 boss altar
  treasureAlcove: 6, // isolated rooms & dead-ends
  torchBrazier: 7, // illuminated braziers & torch sconces

  // Semantic synonyms & aliases
  keep: 5,
  negativeVoid: 0,

  // Backward compatibility aliases for existing tests
  flagstoneFloor: 0,
  fortressKeep: 5,
  pillar: 4,
  raisedPlatform: 2,
  ritualAltar: 5,
} as const;

export type DungeonTileType = (typeof DUNGEON_TILE_TYPES)[keyof typeof DUNGEON_TILE_TYPES];

export interface DungeonDNA extends WorldDNA {
  readonly archFrequency: number;
  readonly masonryStyle: number; // 0: Cyclopean Ashlar, 1: Rusticated Granite, 2: Royal Vaulting, 3: Abyssal Basalt
  readonly ringMoatDepth: number; // Portcullis moat clearance
  readonly roomOrnamentation: number; // Density of banners, sconces, and carved reliefs
  readonly ruinPitting: number; // Weathering / chisel pitting texture parameter
  readonly stoneHue: number;
  readonly torchFrequency: number;
  readonly torchHue: number; // Flame chromatic temperature / amber variation
  readonly wallHeightBias: number;
}

export interface DungeonTile {
  readonly column: number;
  readonly connections: number;
  readonly height: number;
  readonly index: number;
  readonly row: number;
  readonly seed: number;
  readonly type: DungeonTileType;
}

export interface DungeonLayout {
  readonly dna: DungeonDNA;
  readonly qrSize: number;
  /** vec4 per cell: type, height, connections, packedSeedFlags */
  readonly tileData: Float32Array;
  readonly tiles: readonly DungeonTile[];
  readonly topology: QRTopologyAnalysis;
}

/**
 * 32-bit bitwise SFC32 cell PRNG for byte-identical determinism across world redesigns.
 * Seeded from morphSeed, col, row, and salt without floating-point precision drift.
 */
export function dungeonCellRandom(
  morphSeed: number,
  col: number,
  row: number,
  salt: number,
): number {
  let a = (Math.floor(morphSeed * 1_000_003) ^ (col * 31_337) ^ (salt * 65_537)) | 0;
  let b = ((row * 49_157) ^ Math.floor(morphSeed * 257) ^ (salt * 1_009)) | 0;
  let c = ((col * 17_471) ^ (row * 98_245) ^ Math.floor(morphSeed * 65_521)) | 0;
  let d = ((salt * 131_071) ^ (col * 1_048_573) ^ 0x9e3779b9) | 0;

  for (let i = 0; i < 4; i++) {
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
  }
  const result = (((a + b) | 0) + d) >>> 0;
  return result / 4_294_967_296;
}

export function createDungeonDNA(model: SeedModel): DungeonDNA {
  const seed = model.morphSeed;
  const base = createBaseWorldDNA(seed);
  return {
    ...base,
    archFrequency: 0.3 + seededRandom(seed, 71, 0, 100) * 0.5,
    masonryStyle: Math.floor(seededRandom(seed, 76, 0, 600) * 4),
    ringMoatDepth: 0.15,
    roomOrnamentation: seededRandom(seed, 77, 0, 700),
    ruinPitting: seededRandom(seed, 78, 0, 800),
    stoneHue: Math.floor(seededRandom(seed, 72, 0, 200) * 4),
    torchFrequency: 0.2 + seededRandom(seed, 73, 0, 300) * 0.4,
    torchHue: seededRandom(seed, 75, 0, 500),
    wallHeightBias: 0.7 + seededRandom(seed, 74, 0, 400) * 0.5,
  };
}

export function createDungeonLayout(model: SeedModel): DungeonLayout {
  const size = model.qrSize;
  const activeCells = new Uint8Array(size * size);
  for (const module of model.modules) {
    activeCells[module.index] = 1;
  }

  const topology = analyzeQRTopology({ cells: activeCells, size });
  const dna = createDungeonDNA(model);
  const tiles: DungeonTile[] = [];
  const tileData = new Float32Array(size * size * 4);

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const index = row * size + col;
      const isDark = activeCells[index] === 1;
      const ring = topology.finderRing[index]!;
      const conn = topology.connections[index]!;
      const cluster = topology.clusterSize[index]!;
      const neighbors = topology.neighbors4[index]!;
      const cellSeed = dungeonCellRandom(model.morphSeed, col, row, 777);

      let type: DungeonTileType = DUNGEON_TILE_TYPES.bedrockFloor;
      let height = 0.0;

      if (ring >= 0) {
        // Finder patterns: bossSanctum / fortressKeep
        // 7x7 outer curtain wall (6.5), 5x5 portcullis moat (0.15), 3x3 dais (8.5), 1x1 boss altar (11.0)
        if (ring === 0) {
          type = DUNGEON_TILE_TYPES.bossSanctum;
          height = 6.5;
        } else if (ring === 1) {
          type = DUNGEON_TILE_TYPES.bedrockFloor;
          height = 0.15;
        } else if (ring === 2) {
          type = DUNGEON_TILE_TYPES.bossSanctum;
          height = 8.5;
        } else {
          type = DUNGEON_TILE_TYPES.bossSanctum;
          height = 11.0;
        }
      } else if (isDark) {
        if (cluster >= 6) {
          // High cluster size (>= 6) -> vaultedChamber / great hall with high vaulted ceilings
          type = DUNGEON_TILE_TYPES.vaultedChamber;
          height = (5.5 + cellSeed * 3.5) * dna.wallHeightBias;
        } else if (neighbors === 0) {
          // Isolated columns -> structural columns & support pillars
          type = DUNGEON_TILE_TYPES.pillarSanctum;
          height = (4.5 + cellSeed * 2.0) * dna.wallHeightBias;
        } else if (neighbors <= 1) {
          // Isolated endpoints (neighbors <= 1) -> treasureAlcoves or torchBraziers
          if (cellSeed > 0.45) {
            type = DUNGEON_TILE_TYPES.torchBrazier;
            height = (3.0 + cellSeed * 1.5) * dna.wallHeightBias;
          } else {
            type = DUNGEON_TILE_TYPES.treasureAlcove;
            height = (2.4 + cellSeed * 1.6) * dna.wallHeightBias;
          }
        } else if (conn > 2 || neighbors === 2) {
          // Linear connections (conn > 2 or neighbors == 2) -> archwayCorridor / colonnades
          type = DUNGEON_TILE_TYPES.archwayCorridor;
          height = (4.0 + cellSeed * 1.8) * dna.wallHeightBias;
        } else {
          // Corridor walls / boundary masonry
          type = DUNGEON_TILE_TYPES.stoneWall;
          height = (3.5 + cellSeed * 2.0) * dna.wallHeightBias;
        }
      } else {
        // Light cells map to bedrockFloor (height 0.0)
        type = DUNGEON_TILE_TYPES.bedrockFloor;
        height = 0.0;
      }

      tiles.push({
        column: col,
        connections: conn,
        height,
        index,
        row,
        seed: cellSeed,
        type,
      });

      const offset = index * 4;
      tileData[offset] = type;
      tileData[offset + 1] = height;
      tileData[offset + 2] = conn;
      tileData[offset + 3] = Math.floor(cellSeed * 1000);
    }
  }

  return { dna, qrSize: size, tileData, tiles, topology };
}
