import { analyzeQRTopology, type QRTopologyAnalysis } from "@every-qrcode/core";
import type { SeedModel } from "./seed-model.js";
import { createBaseWorldDNA, seededRandom, type WorldDNA } from "./world-dna.js";

/**
 * Microscopic culture module types. `cultureMedium` stays zero because the
 * reveal path treats zero as a light QR cell.
 */
export const COLONY_MODULE_TYPES = {
  cultureMedium: 0,
  tissueCell: 1,
  dividingCell: 2,
  nutrientCell: 3,
  signalingCell: 4,
  growthOrganoid: 5,
  nutrientOrganoid: 6,
  signalingOrganoid: 7,
} as const;

export type ColonyModuleType = (typeof COLONY_MODULE_TYPES)[keyof typeof COLONY_MODULE_TYPES];

export interface ColonyDNA extends WorldDNA {
  readonly cultureArchetype: number;
  readonly membraneVariation: number;
  readonly reagentStrength: number;
  readonly vesselWinding: number;
  readonly cultureActivity: number;
  readonly reliefBias: number;
  readonly cellScale: number;
  readonly pulseRate: number;
}

export interface ColonyUnit {
  readonly column: number;
  readonly connections: number;
  readonly height: number;
  readonly index: number;
  readonly row: number;
  readonly seed: number;
  readonly type: ColonyModuleType;
}

export interface ColonyLayout {
  readonly dna: ColonyDNA;
  /** vec4 per cell: type, height, connections, packedSeedFlags */
  readonly moduleData: Float32Array;
  readonly qrSize: number;
  readonly topology: QRTopologyAnalysis;
  readonly units: readonly ColonyUnit[];
}

/**
 * 32-bit integer-based deterministic PRNG seeded from Link DNA morphSeed, cell coords, and salt.
 * Uses integer multiplication and bit-shifts to eliminate floating-point precision drift.
 */
export function colonyCellRandom(
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

export function createColonyDNA(model: SeedModel): ColonyDNA {
  const seed = model.morphSeed;
  const base = createBaseWorldDNA(seed);
  return {
    ...base,
    cultureArchetype: Math.floor(seededRandom(seed, 61, 0, 100) * 4),
    membraneVariation: seededRandom(seed, 62, 0, 200),
    reagentStrength: 0.35 + seededRandom(seed, 63, 0, 300) * 0.55,
    vesselWinding: 0.15 + seededRandom(seed, 64, 0, 400) * 0.65,
    cultureActivity: 0.3 + seededRandom(seed, 66, 0, 600) * 0.55,
    reliefBias: 0.82 + seededRandom(seed, 68, 0, 800) * 0.28,
    cellScale: 0.82 + seededRandom(seed, 65, 0, 500) * 0.32,
    pulseRate: 0.7 + seededRandom(seed, 67, 0, 700) * 0.8,
  };
}

export function createColonyLayout(model: SeedModel): ColonyLayout {
  const size = model.qrSize;
  const activeCells = new Uint8Array(size * size);
  for (const module of model.modules) {
    activeCells[module.index] = 1;
  }

  const topology = analyzeQRTopology({ cells: activeCells, size });
  const dna = createColonyDNA(model);
  const units: ColonyUnit[] = [];
  const moduleData = new Float32Array(size * size * 4);

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const index = row * size + col;
      const isDark = activeCells[index] === 1;
      const ring = topology.finderRing[index]!;
      const conn = topology.connections[index]!;
      const cluster = topology.clusterSize[index]!;
      const neighbors = topology.neighbors4[index]!;
      const cellSeed = colonyCellRandom(model.morphSeed, col, row, 666);

      let type: ColonyModuleType = COLONY_MODULE_TYPES.cultureMedium;
      let height = 0.0;

      if (ring >= 0) {
        const finderIndex = topology.finderIndex[index]!;
        if (finderIndex === 0) {
          type = COLONY_MODULE_TYPES.growthOrganoid;
        } else if (finderIndex === 1) {
          type = COLONY_MODULE_TYPES.nutrientOrganoid;
        } else {
          type = COLONY_MODULE_TYPES.signalingOrganoid;
        }
        height = ring === 0 ? 1.35 : ring === 1 ? 0.04 : ring === 2 ? 1.8 : 2.15;
        if (!isDark) {
          type = COLONY_MODULE_TYPES.cultureMedium;
          height = 0.04;
        }
      } else if (isDark) {
        if (cluster >= 8 && cellSeed > 0.68) {
          type = COLONY_MODULE_TYPES.dividingCell;
        } else if (neighbors <= 1) {
          type = COLONY_MODULE_TYPES.nutrientCell;
        } else if (neighbors >= 3) {
          type = COLONY_MODULE_TYPES.signalingCell;
        } else {
          type = COLONY_MODULE_TYPES.tissueCell;
        }
        height = 0.68 + cellSeed * 0.62 + Math.min(cluster, 12) * 0.025;
        if (type === COLONY_MODULE_TYPES.dividingCell) height += 0.24;
      } else {
        type = COLONY_MODULE_TYPES.cultureMedium;
        height = 0.0;
      }

      units.push({
        column: col,
        connections: conn,
        height,
        index,
        row,
        seed: cellSeed,
        type,
      });

      const offset = index * 4;
      moduleData[offset] = type;
      moduleData[offset + 1] = height;
      moduleData[offset + 2] = conn;
      moduleData[offset + 3] = Math.floor(cellSeed * 1000);
    }
  }

  return { dna, moduleData, qrSize: size, topology, units };
}
