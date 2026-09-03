import { analyzeQRTopology, type QRTopologyAnalysis } from "@every-qrcode/core";
import type { SeedModel } from "./seed-model.js";
import { createBaseWorldDNA, seededRandom, type WorldDNA } from "./world-dna.js";

export const COLONY_MODULE_TYPES = {
  commandCenter: 5,
  commDish: 3,
  habDome: 1,
  landingPad: 6,
  lunarTerrain: 0,
  researchStation: 4,
  solarArray: 2,
  storageSilo: 7,
} as const;

export type ColonyModuleType = (typeof COLONY_MODULE_TYPES)[keyof typeof COLONY_MODULE_TYPES];

export interface ColonyDNA extends WorldDNA {
  readonly domeHue: number;
  readonly lightingColor: number;
  readonly solarAngle: number;
  readonly surfaceRoughness: number;
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

export function createColonyDNA(model: SeedModel): ColonyDNA {
  const seed = model.morphSeed;
  const base = createBaseWorldDNA(seed);
  return {
    ...base,
    domeHue: seededRandom(seed, 61, 0, 100),
    lightingColor: Math.floor(seededRandom(seed, 62, 0, 200) * 3),
    solarAngle: seededRandom(seed, 63, 0, 300) * 3.14159,
    surfaceRoughness: 0.3 + seededRandom(seed, 64, 0, 400) * 0.5,
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
      const cellSeed = seededRandom(model.morphSeed, col, row, 666);

      let type: ColonyModuleType = COLONY_MODULE_TYPES.lunarTerrain;
      let height = 0.05;

      if (ring >= 0) {
        if (ring === 0) {
          type = COLONY_MODULE_TYPES.commandCenter;
          height = 5.5;
        } else if (ring === 1) {
          type = COLONY_MODULE_TYPES.lunarTerrain;
          height = 0.15;
        } else {
          type = COLONY_MODULE_TYPES.commandCenter;
          height = ring === 3 ? 10.0 : 7.5;
        }
      } else if (isDark) {
        if (topology.clusterSize[index]! >= 6 && cellSeed > 0.5) {
          type = COLONY_MODULE_TYPES.habDome;
          height = 5.5 + cellSeed * 3.5;
        } else if (topology.neighbors4[index]! <= 1 && cellSeed > 0.6) {
          type = COLONY_MODULE_TYPES.commDish;
          height = 6.5;
        } else if (topology.neighbors4[index]! <= 2 && cellSeed < 0.35) {
          type = COLONY_MODULE_TYPES.solarArray;
          height = 2.5;
        } else if (cellSeed > 0.8) {
          type = COLONY_MODULE_TYPES.landingPad;
          height = 0.6;
        } else {
          type = COLONY_MODULE_TYPES.researchStation;
          height = 3.2 + cellSeed * 2.0;
        }
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
