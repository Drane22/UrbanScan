import { analyzeQRTopology, type QRTopologyAnalysis } from "@every-qrcode/core";
import type { SeedModel } from "./seed-model.js";
import { createBaseWorldDNA, seededRandom, type WorldDNA } from "./world-dna.js";

export const CONSTELLATION_NODE_TYPES = {
  constellationHub: 5,
  majorSystem: 4,
  planet: 3,
  pulsar: 2,
  star: 1,
  void: 0,
} as const;

export type ConstellationNodeType =
  (typeof CONSTELLATION_NODE_TYPES)[keyof typeof CONSTELLATION_NODE_TYPES];

export interface ConstellationDNA extends WorldDNA {
  readonly depthSpread: number;
  readonly lineGlow: number;
  readonly nebulaHue: number;
  readonly planetaryRate: number;
  readonly starColorTemp: number;
}

export interface ConstellationStar {
  readonly column: number;
  readonly connections: number;
  readonly depth: number;
  readonly index: number;
  readonly row: number;
  readonly seed: number;
  readonly size: number;
  readonly type: ConstellationNodeType;
}

export interface ConstellationLayout {
  readonly dna: ConstellationDNA;
  /** vec4 per cell: type, depth, connections, packedSizeSeed */
  readonly starData: Float32Array;
  readonly stars: readonly ConstellationStar[];
  readonly qrSize: number;
  readonly topology: QRTopologyAnalysis;
}

export function createConstellationDNA(model: SeedModel): ConstellationDNA {
  const seed = model.morphSeed;
  const base = createBaseWorldDNA(seed);
  return {
    ...base,
    depthSpread: 0.6 + seededRandom(seed, 31, 0, 100) * 0.8,
    lineGlow: 0.5 + seededRandom(seed, 32, 0, 200) * 0.5,
    nebulaHue: seededRandom(seed, 33, 0, 300),
    planetaryRate: 0.15 + seededRandom(seed, 34, 0, 400) * 0.25,
    starColorTemp: seededRandom(seed, 35, 0, 500),
  };
}

export function createConstellationLayout(model: SeedModel): ConstellationLayout {
  const size = model.qrSize;
  const activeCells = new Uint8Array(size * size);
  for (const module of model.modules) {
    activeCells[module.index] = 1;
  }

  const topology = analyzeQRTopology({ cells: activeCells, size });
  const dna = createConstellationDNA(model);
  const stars: ConstellationStar[] = [];
  const starData = new Float32Array(size * size * 4);

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const index = row * size + col;
      const isDark = activeCells[index] === 1;
      const ring = topology.finderRing[index]!;
      const conn = topology.connections[index]!;
      const cellSeed = seededRandom(model.morphSeed, col, row, 888);

      let type: ConstellationNodeType = CONSTELLATION_NODE_TYPES.void;
      let depth = (cellSeed - 0.5) * dna.depthSpread * 2.0;
      let starSize = 0.5;

      if (ring >= 0) {
        // Finder pattern major celestial landmark
        if (ring === 0) {
          type = CONSTELLATION_NODE_TYPES.majorSystem;
          depth = 0.2 * (cellSeed - 0.5);
          starSize = 1.2;
        } else if (ring === 1) {
          type = CONSTELLATION_NODE_TYPES.void;
          depth = 0.0;
          starSize = 0.0;
        } else {
          type = CONSTELLATION_NODE_TYPES.constellationHub;
          depth = ring === 3 ? 0.6 : 0.4;
          starSize = ring === 3 ? 1.6 : 1.3;
        }
      } else if (isDark) {
        if (cellSeed < dna.planetaryRate) {
          type = CONSTELLATION_NODE_TYPES.planet;
          starSize = 0.8 + cellSeed * 0.4;
        } else if (topology.neighbors4[index]! <= 1 && cellSeed > 0.5) {
          type = CONSTELLATION_NODE_TYPES.pulsar;
          starSize = 0.9 + cellSeed * 0.5;
        } else {
          type = CONSTELLATION_NODE_TYPES.star;
          starSize = 0.4 + cellSeed * 0.5;
        }
      }

      stars.push({
        column: col,
        connections: conn,
        depth,
        index,
        row,
        seed: cellSeed,
        size: starSize,
        type,
      });

      const offset = index * 4;
      starData[offset] = type;
      starData[offset + 1] = depth;
      starData[offset + 2] = conn;
      starData[offset + 3] = starSize + Math.floor(cellSeed * 1000) * 256;
    }
  }

  return { dna, qrSize: size, starData, stars, topology };
}
