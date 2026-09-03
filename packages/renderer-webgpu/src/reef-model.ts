import { analyzeQRTopology, type QRTopologyAnalysis } from "@every-qrcode/core";
import type { SeedModel } from "./seed-model.js";
import { createBaseWorldDNA, seededRandom, type WorldDNA } from "./world-dna.js";

export const REEF_FORMATION_TYPES = {
  branchingCoral: 7,
  coralCrown: 4,
  coralTower: 1,
  crownApex: 5,
  sandLagoon: 0,
  seaAnemone: 3,
  seaGrass: 6,
  tubeCoral: 2,
} as const;

export type ReefFormationType = (typeof REEF_FORMATION_TYPES)[keyof typeof REEF_FORMATION_TYPES];

export interface ReefDNA extends WorldDNA {
  readonly anemoneHue: number;
  readonly coralHeightBias: number;
  readonly fishSpeed: number;
  readonly waterTint: number;
}

export interface ReefFormation {
  readonly column: number;
  readonly connections: number;
  readonly height: number;
  readonly index: number;
  readonly row: number;
  readonly seed: number;
  readonly type: ReefFormationType;
}

export interface ReefLayout {
  readonly dna: ReefDNA;
  readonly formations: readonly ReefFormation[];
  readonly qrSize: number;
  /** vec4 per cell: type, height, connections, packedSeed */
  readonly reefData: Float32Array;
  readonly topology: QRTopologyAnalysis;
}

export function createReefDNA(model: SeedModel): ReefDNA {
  const seed = model.morphSeed;
  const base = createBaseWorldDNA(seed);
  return {
    ...base,
    anemoneHue: seededRandom(seed, 101, 0, 100),
    coralHeightBias: 0.6 + seededRandom(seed, 102, 0, 200) * 0.6,
    fishSpeed: 1.0 + seededRandom(seed, 103, 0, 300) * 2.0,
    waterTint: Math.floor(seededRandom(seed, 104, 0, 400) * 4),
  };
}

export function createReefLayout(model: SeedModel): ReefLayout {
  const size = model.qrSize;
  const activeCells = new Uint8Array(size * size);
  for (const module of model.modules) {
    activeCells[module.index] = 1;
  }

  const topology = analyzeQRTopology({ cells: activeCells, size });
  const dna = createReefDNA(model);
  const formations: ReefFormation[] = [];
  const reefData = new Float32Array(size * size * 4);

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const index = row * size + col;
      const isDark = activeCells[index] === 1;
      const ring = topology.finderRing[index]!;
      const conn = topology.connections[index]!;
      const cellSeed = seededRandom(model.morphSeed, col, row, 1111);

      let type: ReefFormationType = REEF_FORMATION_TYPES.sandLagoon;
      let height = 0.05;

      if (ring >= 0) {
        if (ring === 0) {
          type = REEF_FORMATION_TYPES.coralCrown;
          height = dna.coralHeightBias * 1.4;
        } else if (ring === 1) {
          type = REEF_FORMATION_TYPES.sandLagoon;
          height = 0.08;
        } else {
          type = REEF_FORMATION_TYPES.crownApex;
          height = ring === 3 ? dna.coralHeightBias * 1.9 : dna.coralHeightBias * 1.3;
        }
      } else if (isDark) {
        if (topology.clusterSize[index]! >= 6 && cellSeed > 0.6) {
          type = REEF_FORMATION_TYPES.branchingCoral;
          height = dna.coralHeightBias * 0.9;
        } else if (topology.neighbors4[index]! <= 1 && cellSeed > 0.7) {
          type = REEF_FORMATION_TYPES.seaAnemone;
          height = dna.coralHeightBias * 0.5;
        } else if (topology.neighbors4[index]! <= 2 && cellSeed < 0.35) {
          type = REEF_FORMATION_TYPES.tubeCoral;
          height = dna.coralHeightBias * 0.7;
        } else if (cellSeed > 0.8) {
          type = REEF_FORMATION_TYPES.seaGrass;
          height = dna.coralHeightBias * 0.4;
        } else {
          type = REEF_FORMATION_TYPES.coralTower;
          height = dna.coralHeightBias * (0.6 + cellSeed * 0.4);
        }
      }

      formations.push({
        column: col,
        connections: conn,
        height,
        index,
        row,
        seed: cellSeed,
        type,
      });

      const offset = index * 4;
      reefData[offset] = type;
      reefData[offset + 1] = height;
      reefData[offset + 2] = conn;
      reefData[offset + 3] = Math.floor(cellSeed * 1000);
    }
  }

  return { dna, formations, qrSize: size, reefData, topology };
}
