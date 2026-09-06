import { analyzeQRTopology, type QRTopologyAnalysis } from "@every-qrcode/core";
import type { SeedModel } from "./seed-model.js";
import { createBaseWorldDNA, seededRandom, type WorldDNA } from "./world-dna.js";

/** Zero always denotes a light module; primary surfaces retain QR ownership. */
export const COLONY_MODULE_TYPES = {
  substrate: 0,
  tunnel: 1,
  chamber: 2,
  resource: 3,
  junction: 4,
  queenHub: 5,
  nurseryHub: 6,
  storeHub: 7,
} as const;

export type ColonyModuleType = (typeof COLONY_MODULE_TYPES)[keyof typeof COLONY_MODULE_TYPES];

// Persistent chamber, east tunnel, south tunnel, resource mound, worker.
export const COLONY_INSTANCES_PER_CELL = 5;
export const COLONY_VERTICES_PER_PART = 192;

export interface ColonyDNA extends WorldDNA {
  readonly rimVariation: number;
  readonly activity: number;
  readonly reliefBias: number;
  readonly winding: number;
}

export interface ColonyUnit {
  readonly column: number;
  readonly connections: number;
  readonly height: number;
  readonly index: number;
  readonly row: number;
  readonly seed: number;
  readonly type: ColonyModuleType;
  readonly buildDelay: number;
  readonly qr: readonly [number, number];
}

export interface ColonyLayout {
  readonly dna: ColonyDNA;
  /** Two vec4s per owner: type/height/connectivity/seed, delay/hub/rim/winding. */
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
    rimVariation: seededRandom(seed, 62, 0, 200),
    winding: seededRandom(seed, 64, 0, 400),
    activity: 0.3 + seededRandom(seed, 66, 0, 600) * 0.55,
    reliefBias: 0.82 + seededRandom(seed, 68, 0, 800) * 0.28,
  };
}

export function createColonyLayout(model: SeedModel): ColonyLayout {
  const size = model.qrSize;
  if (!Number.isInteger(size) || size < 21 || size > 41 || (size - 17) % 4 !== 0) {
    throw new RangeError("Colony requires a supported canonical QR size");
  }
  const activeCells = new Uint8Array(size * size);
  for (const module of model.modules) {
    if (!Number.isInteger(module.index) || module.index < 0 || module.index >= size * size) {
      throw new RangeError("Colony module lies outside its QR matrix");
    }
    activeCells[module.index] = 1;
  }

  const topology = analyzeQRTopology({ cells: activeCells, size });
  const dna = createColonyDNA(model);
  const units: ColonyUnit[] = [];
  const moduleData = new Float32Array(size * size * 8);

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const index = row * size + col;
      const isDark = activeCells[index] === 1;
      const ring = topology.finderRing[index]!;
      const conn = isDark ? topology.connections[index]! : 0;
      const cluster = topology.clusterSize[index]!;
      const neighbors = topology.neighbors4[index]!;
      const cellSeed = colonyCellRandom(model.morphSeed, col, row, 666);

      let type: ColonyModuleType = COLONY_MODULE_TYPES.substrate;
      let height = 0.0;

      if (ring >= 0) {
        const finderIndex = topology.finderIndex[index]!;
        if (finderIndex === 0) {
          type = COLONY_MODULE_TYPES.queenHub;
        } else if (finderIndex === 1) {
          type = COLONY_MODULE_TYPES.nurseryHub;
        } else {
          type = COLONY_MODULE_TYPES.storeHub;
        }
        height = (ring === 0 ? 1.9 : ring === 1 ? 0 : ring === 2 ? 2.4 : 2.8) * dna.reliefBias;
        if (!isDark) {
          type = COLONY_MODULE_TYPES.substrate;
          height = 0.04;
        }
      } else if (isDark) {
        if (cluster >= 8 && cellSeed > 0.68) {
          type = COLONY_MODULE_TYPES.chamber;
        } else if (neighbors <= 1) {
          type = COLONY_MODULE_TYPES.resource;
        } else if (neighbors >= 3) {
          type = COLONY_MODULE_TYPES.junction;
        } else {
          type = COLONY_MODULE_TYPES.tunnel;
        }
        height = (0.35 + cellSeed * 0.4 + Math.min(cluster, 12) * 0.025) * dna.reliefBias;
        if (type === COLONY_MODULE_TYPES.chamber) height += 0.24;
      } else {
        type = COLONY_MODULE_TYPES.substrate;
        height = 0.0;
      }

      const hubDistance =
        Math.min(
          Math.hypot(col - 3, row - 3),
          Math.hypot(col - (size - 4), row - 3),
          Math.hypot(col - 3, row - (size - 4)),
        ) / size;
      const buildDelay =
        ring >= 0 ? 0.18 + cellSeed * 0.12 : 0.5 + hubDistance * 0.65 + cellSeed * 0.22;
      units.push({
        buildDelay,
        qr: [col, row],
        column: col,
        connections: conn,
        height,
        index,
        row,
        seed: cellSeed,
        type,
      });

      const offset = index * 8;
      moduleData[offset] = type;
      moduleData[offset + 1] = height;
      moduleData[offset + 2] = conn;
      moduleData[offset + 3] = cellSeed;
      moduleData[offset + 4] = buildDelay;
      moduleData[offset + 5] = topology.finderIndex[index]!;
      moduleData[offset + 6] = dna.rimVariation;
      moduleData[offset + 7] = dna.winding;
    }
  }

  return { dna, moduleData, qrSize: size, topology, units };
}
