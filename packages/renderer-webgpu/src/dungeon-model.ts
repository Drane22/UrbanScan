import { analyzeQRTopology, type QRTopologyAnalysis } from "@every-qrcode/core";
import type { SeedModel } from "./seed-model.js";
import { createBaseWorldDNA, seededRandom, type WorldDNA } from "./world-dna.js";

export const DUNGEON_TILE_TYPES = {
  archwayCorridor: 2,
  flagstoneFloor: 0,
  fortressKeep: 5,
  pillar: 4,
  raisedPlatform: 3,
  ritualAltar: 6,
  stoneWall: 1,
  torchBrazier: 7,
} as const;

export type DungeonTileType = (typeof DUNGEON_TILE_TYPES)[keyof typeof DUNGEON_TILE_TYPES];

export interface DungeonDNA extends WorldDNA {
  readonly archFrequency: number;
  readonly stoneHue: number;
  readonly torchFrequency: number;
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

export function createDungeonDNA(model: SeedModel): DungeonDNA {
  const seed = model.morphSeed;
  const base = createBaseWorldDNA(seed);
  return {
    ...base,
    archFrequency: 0.3 + seededRandom(seed, 71, 0, 100) * 0.5,
    stoneHue: Math.floor(seededRandom(seed, 72, 0, 200) * 4),
    torchFrequency: 0.2 + seededRandom(seed, 73, 0, 300) * 0.4,
    wallHeightBias: 0.6 + seededRandom(seed, 74, 0, 400) * 0.6,
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
      const cellSeed = seededRandom(model.morphSeed, col, row, 777);

      let type: DungeonTileType = DUNGEON_TILE_TYPES.flagstoneFloor;
      let height = 0.05;

      if (ring >= 0) {
        if (ring === 0) {
          type = DUNGEON_TILE_TYPES.fortressKeep;
          height = 6.5;
        } else if (ring === 1) {
          type = DUNGEON_TILE_TYPES.flagstoneFloor;
          height = 0.15;
        } else {
          type = DUNGEON_TILE_TYPES.ritualAltar;
          height = ring === 3 ? 11.0 : 8.0;
        }
      } else if (isDark) {
        if (topology.clusterSize[index]! >= 6 && cellSeed > 0.5) {
          type = DUNGEON_TILE_TYPES.raisedPlatform;
          height = 5.5 + cellSeed * 3.0;
        } else if (topology.neighbors4[index]! === 2 && cellSeed < dna.archFrequency) {
          type = DUNGEON_TILE_TYPES.archwayCorridor;
          height = 4.5;
        } else if (topology.neighbors4[index]! <= 1 && cellSeed > 0.6) {
          type = DUNGEON_TILE_TYPES.torchBrazier;
          height = 3.0;
        } else if (topology.neighbors4[index]! === 0) {
          type = DUNGEON_TILE_TYPES.pillar;
          height = 5.0;
        } else {
          type = DUNGEON_TILE_TYPES.stoneWall;
          height = 3.5 + cellSeed * 2.0;
        }
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
