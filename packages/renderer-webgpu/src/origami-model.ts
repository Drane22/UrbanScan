import { analyzeQRTopology, type QRTopologyAnalysis } from "@every-qrcode/core";
import type { SeedModel } from "./seed-model.js";
import { createBaseWorldDNA, seededRandom, type WorldDNA } from "./world-dna.js";

export const ORIGAMI_FOLD_TYPES = {
  facet: 3,
  flat: 0,
  mountain: 1,
  rosette: 4,
  rosetteCore: 5,
  valley: 2,
} as const;

export type OrigamiFoldType = (typeof ORIGAMI_FOLD_TYPES)[keyof typeof ORIGAMI_FOLD_TYPES];

export interface OrigamiDNA extends WorldDNA {
  readonly creaseIntensity: number;
  readonly foldAmplitude: number;
  readonly foldAngleBias: number;
  readonly paperColorIndex: number;
}

export interface OrigamiPanel {
  readonly angle: number;
  readonly column: number;
  readonly elevation: number;
  readonly index: number;
  readonly row: number;
  readonly seed: number;
  readonly type: OrigamiFoldType;
}

export interface OrigamiLayout {
  readonly dna: OrigamiDNA;
  /** vec4 per cell: type, elevation, angle, packedSeedFlags */
  readonly panelData: Float32Array;
  readonly panels: readonly OrigamiPanel[];
  readonly qrSize: number;
  readonly topology: QRTopologyAnalysis;
}

export function createOrigamiDNA(model: SeedModel): OrigamiDNA {
  const seed = model.morphSeed;
  const base = createBaseWorldDNA(seed);
  return {
    ...base,
    creaseIntensity: 0.4 + seededRandom(seed, 41, 0, 100) * 0.5,
    foldAmplitude: 0.5 + seededRandom(seed, 42, 0, 200) * 0.6,
    foldAngleBias: seededRandom(seed, 43, 0, 300),
    paperColorIndex: Math.floor(seededRandom(seed, 44, 0, 400) * 4),
  };
}

export function createOrigamiLayout(model: SeedModel): OrigamiLayout {
  const size = model.qrSize;
  const activeCells = new Uint8Array(size * size);
  for (const module of model.modules) {
    activeCells[module.index] = 1;
  }

  const topology = analyzeQRTopology({ cells: activeCells, size });
  const dna = createOrigamiDNA(model);
  const panels: OrigamiPanel[] = [];
  const panelData = new Float32Array(size * size * 4);

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const index = row * size + col;
      const isDark = activeCells[index] === 1;
      const ring = topology.finderRing[index]!;
      const cellSeed = seededRandom(model.morphSeed, col, row, 444);

      let type: OrigamiFoldType = ORIGAMI_FOLD_TYPES.flat;
      let elevation = 0.02;
      let angle = 0.0;

      if (ring >= 0) {
        // Finder pattern folded rosette / pyramid
        if (ring === 0) {
          type = ORIGAMI_FOLD_TYPES.rosette;
          elevation = 5.0;
          angle = col % 2 === 0 ? 0.7854 : -0.7854;
        } else if (ring === 1) {
          type = ORIGAMI_FOLD_TYPES.flat;
          elevation = 0.15;
        } else {
          type = ORIGAMI_FOLD_TYPES.rosetteCore;
          elevation = ring === 3 ? 9.5 : 7.0;
          angle = 0.7854;
        }
      } else if (isDark) {
        if (topology.neighbors4[index]! >= 3) {
          type = ORIGAMI_FOLD_TYPES.mountain;
          elevation = 5.5 + cellSeed * 3.0;
          angle = (col + row) % 2 === 0 ? 0.7854 : -0.7854;
        } else if (topology.neighbors4[index]! <= 1) {
          type = ORIGAMI_FOLD_TYPES.facet;
          elevation = 4.0 + cellSeed * 2.0;
          angle = cellSeed * 3.14159;
        } else {
          type = ORIGAMI_FOLD_TYPES.valley;
          elevation = 2.5;
          angle = 0.0;
        }
      }

      panels.push({
        angle,
        column: col,
        elevation,
        index,
        row,
        seed: cellSeed,
        type,
      });

      const offset = index * 4;
      panelData[offset] = type;
      panelData[offset + 1] = elevation;
      panelData[offset + 2] = angle;
      panelData[offset + 3] = Math.floor(cellSeed * 1000);
    }
  }

  return { dna, panelData, panels, qrSize: size, topology };
}
