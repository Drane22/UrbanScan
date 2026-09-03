import { analyzeQRTopology, type QRTopologyAnalysis } from "@every-qrcode/core";
import type { SeedModel } from "./seed-model.js";
import { createBaseWorldDNA, seededRandom, type WorldDNA } from "./world-dna.js";

export const FUNGAL_NODE_TYPES = {
  fungalSporeCore: 5,
  giantFungalTower: 4,
  glowingPuffball: 3,
  hyphaeStrand: 6,
  shelfFungus: 2,
  sporeSoil: 0,
  stalkCluster: 1,
} as const;

export type FungalNodeType = (typeof FUNGAL_NODE_TYPES)[keyof typeof FUNGAL_NODE_TYPES];

export interface MyceliumDNA extends WorldDNA {
  readonly bioluminescenceHue: number;
  readonly pulseFrequency: number;
  readonly stalkHeightBias: number;
  readonly strandDensity: number;
}

export interface FungalNode {
  readonly column: number;
  readonly connections: number;
  readonly height: number;
  readonly index: number;
  readonly row: number;
  readonly seed: number;
  readonly type: FungalNodeType;
}

export interface MyceliumLayout {
  readonly dna: MyceliumDNA;
  /** vec4 per cell: type, height, connections, packedSeed */
  readonly fungalData: Float32Array;
  readonly nodes: readonly FungalNode[];
  readonly qrSize: number;
  readonly topology: QRTopologyAnalysis;
}

export function createMyceliumDNA(model: SeedModel): MyceliumDNA {
  const seed = model.morphSeed;
  const base = createBaseWorldDNA(seed);
  return {
    ...base,
    bioluminescenceHue: Math.floor(seededRandom(seed, 91, 0, 100) * 4),
    pulseFrequency: 1.5 + seededRandom(seed, 92, 0, 200) * 2.5,
    stalkHeightBias: 0.6 + seededRandom(seed, 93, 0, 300) * 0.6,
    strandDensity: 0.4 + seededRandom(seed, 94, 0, 400) * 0.5,
  };
}

export function createMyceliumLayout(model: SeedModel): MyceliumLayout {
  const size = model.qrSize;
  const activeCells = new Uint8Array(size * size);
  for (const module of model.modules) {
    activeCells[module.index] = 1;
  }

  const topology = analyzeQRTopology({ cells: activeCells, size });
  const dna = createMyceliumDNA(model);
  const nodes: FungalNode[] = [];
  const fungalData = new Float32Array(size * size * 4);

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const index = row * size + col;
      const isDark = activeCells[index] === 1;
      const ring = topology.finderRing[index]!;
      const conn = topology.connections[index]!;
      const cellSeed = seededRandom(model.morphSeed, col, row, 999);

      let type: FungalNodeType = FUNGAL_NODE_TYPES.sporeSoil;
      let height = 0.05;

      if (ring >= 0) {
        if (ring === 0) {
          type = FUNGAL_NODE_TYPES.giantFungalTower;
          height = dna.stalkHeightBias * 1.5;
        } else if (ring === 1) {
          type = FUNGAL_NODE_TYPES.sporeSoil;
          height = 0.08;
        } else {
          type = FUNGAL_NODE_TYPES.fungalSporeCore;
          height = ring === 3 ? dna.stalkHeightBias * 2.0 : dna.stalkHeightBias * 1.3;
        }
      } else if (isDark) {
        if (topology.clusterSize[index]! >= 6 && cellSeed > 0.5) {
          type = FUNGAL_NODE_TYPES.glowingPuffball;
          height = dna.stalkHeightBias * 0.9;
        } else if (topology.neighbors4[index]! <= 1 && cellSeed > 0.6) {
          type = FUNGAL_NODE_TYPES.shelfFungus;
          height = dna.stalkHeightBias * 0.7;
        } else if (cellSeed < dna.strandDensity && conn !== 0) {
          type = FUNGAL_NODE_TYPES.hyphaeStrand;
          height = 0.25;
        } else {
          type = FUNGAL_NODE_TYPES.stalkCluster;
          height = dna.stalkHeightBias * (0.6 + cellSeed * 0.4);
        }
      }

      nodes.push({
        column: col,
        connections: conn,
        height,
        index,
        row,
        seed: cellSeed,
        type,
      });

      const offset = index * 4;
      fungalData[offset] = type;
      fungalData[offset + 1] = height;
      fungalData[offset + 2] = conn;
      fungalData[offset + 3] = Math.floor(cellSeed * 1000);
    }
  }

  return { dna, fungalData, nodes, qrSize: size, topology };
}
