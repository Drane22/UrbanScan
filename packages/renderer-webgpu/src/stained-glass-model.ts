import { analyzeQRTopology, type QRTopologyAnalysis } from "@every-qrcode/core";
import type { SeedModel } from "./seed-model.js";
import { createBaseWorldDNA, seededRandom, type WorldDNA } from "./world-dna.js";

export const GLASS_PANE_TYPES = {
  borderCame: 5,
  clearField: 0,
  coloredPane: 1,
  jewelAccent: 4,
  roseCenter: 3,
  roseMedallion: 2,
} as const;

export type GlassPaneType = (typeof GLASS_PANE_TYPES)[keyof typeof GLASS_PANE_TYPES];

export interface GlassDNA extends WorldDNA {
  readonly glassRoughness: number;
  readonly iridescence: number;
  readonly leadThickness: number;
  readonly paletteChoice: number;
  readonly paneSubdivision: number;
}

export interface GlassPane {
  readonly colorIndex: number;
  readonly column: number;
  readonly connections: number;
  readonly index: number;
  readonly row: number;
  readonly seed: number;
  readonly type: GlassPaneType;
}

export interface GlassLayout {
  readonly dna: GlassDNA;
  /** vec4 per cell: type, colorIndex, connections, packedSeedLead */
  readonly paneData: Float32Array;
  readonly panes: readonly GlassPane[];
  readonly qrSize: number;
  readonly topology: QRTopologyAnalysis;
}

export function createGlassDNA(model: SeedModel): GlassDNA {
  const seed = model.morphSeed;
  const base = createBaseWorldDNA(seed);
  return {
    ...base,
    glassRoughness: 0.1 + seededRandom(seed, 51, 0, 100) * 0.3,
    iridescence: 0.3 + seededRandom(seed, 52, 0, 200) * 0.5,
    leadThickness: 0.08 + seededRandom(seed, 53, 0, 300) * 0.06,
    paletteChoice: Math.floor(seededRandom(seed, 54, 0, 400) * 4),
    paneSubdivision: Math.floor(seededRandom(seed, 55, 0, 500) * 3),
  };
}

export function createGlassLayout(model: SeedModel): GlassLayout {
  const size = model.qrSize;
  const activeCells = new Uint8Array(size * size);
  for (const module of model.modules) {
    activeCells[module.index] = 1;
  }

  const topology = analyzeQRTopology({ cells: activeCells, size });
  const dna = createGlassDNA(model);
  const panes: GlassPane[] = [];
  const paneData = new Float32Array(size * size * 4);

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const index = row * size + col;
      const isDark = activeCells[index] === 1;
      const ring = topology.finderRing[index]!;
      const conn = topology.connections[index]!;
      const cellSeed = seededRandom(model.morphSeed, col, row, 555);

      let type: GlassPaneType = GLASS_PANE_TYPES.clearField;
      const colorIndex = Math.floor(cellSeed * 6);

      if (ring >= 0) {
        if (ring === 0) {
          type = GLASS_PANE_TYPES.roseMedallion;
        } else if (ring === 1) {
          type = GLASS_PANE_TYPES.clearField;
        } else {
          type = GLASS_PANE_TYPES.roseCenter;
        }
      } else if (isDark) {
        if (topology.clusterSize[index]! >= 6 && cellSeed > 0.6) {
          type = GLASS_PANE_TYPES.jewelAccent;
        } else {
          type = GLASS_PANE_TYPES.coloredPane;
        }
      }

      panes.push({
        colorIndex,
        column: col,
        connections: conn,
        index,
        row,
        seed: cellSeed,
        type,
      });

      const offset = index * 4;
      paneData[offset] = type;
      paneData[offset + 1] = colorIndex;
      paneData[offset + 2] = conn;
      paneData[offset + 3] = Math.floor(cellSeed * 1000);
    }
  }

  return { dna, paneData, panes, qrSize: size, topology };
}
