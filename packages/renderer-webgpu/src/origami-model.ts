import { analyzeQRTopology, type QRTopologyAnalysis } from "@every-qrcode/core";
import type { SeedModel } from "./seed-model.js";
import { createBaseWorldDNA, seededRandom, type WorldDNA } from "./world-dna.js";

export const ORIGAMI_FOLD_TYPES = {
  // Paper fold / facet types
  flatSheet: 0, // Unfolded paper substrate [light cells, elevation: 0.0]
  mountainFold: 1, // Ridged crease / elevated peak fold
  valleyFold: 2, // Depressed crease channel / valley pleat
  miuraTessellation: 3, // Dense cluster herringbone / geometric tessellation
  paperCraneSculpture: 4, // Sculptural origami figure / perched crane
  origamiRosette: 5, // Finder patterns: 7x7 outer folded collar, 5x5 moat, 3x3 petal dais, 1x1 rosette crest
  foldedFlap: 6, // Triangular paper flap / corner fold
  pleatCorner: 7, // Creased corner tab / diagonal fold

  // Backward compatibility aliases
  flat: 0,
  mountain: 1,
  valley: 2,
  facet: 3,
  rosette: 5,
  rosetteCore: 5,
} as const;

export type OrigamiFoldType = (typeof ORIGAMI_FOLD_TYPES)[keyof typeof ORIGAMI_FOLD_TYPES];

export interface OrigamiDNA extends WorldDNA {
  readonly foldComplexity: number;
  readonly paperGrain: number;
  readonly creaseSharpness: number;
  readonly elevationBias: number;
  readonly flutterIntensity: number;

  // Backward compatibility aliases
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

/**
 * 32-bit bitwise SFC32 cell PRNG for byte-identical determinism across world redesigns.
 * Seeded from morphSeed, col, row, and salt without floating-point precision drift.
 */
export function origamiCellRandom(
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

export function createOrigamiDNA(model: SeedModel): OrigamiDNA {
  const seed = model.morphSeed;
  const base = createBaseWorldDNA(seed);
  const foldComplexity = 0.35 + seededRandom(seed, 41, 0, 100) * 0.55;
  const paperGrain = 0.25 + seededRandom(seed, 42, 0, 200) * 0.65;
  const creaseSharpness = 0.4 + seededRandom(seed, 43, 0, 300) * 0.5;
  const elevationBias = 0.85 + seededRandom(seed, 44, 0, 400) * 0.35;
  const flutterIntensity = 0.2 + seededRandom(seed, 45, 0, 500) * 0.6;
  return {
    ...base,
    foldComplexity,
    paperGrain,
    creaseSharpness,
    elevationBias,
    flutterIntensity,

    // Backward compatibility aliases
    creaseIntensity: creaseSharpness,
    foldAmplitude: elevationBias,
    foldAngleBias: seededRandom(seed, 46, 0, 600),
    paperColorIndex: Math.floor(seededRandom(seed, 47, 0, 700) * 4),
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
      const cluster = topology.clusterSize[index]!;
      const neighbors = topology.neighbors4[index]!;
      const conn = topology.connections[index]!;
      const cellSeed = origamiCellRandom(model.morphSeed, col, row, 444);

      let type: OrigamiFoldType = ORIGAMI_FOLD_TYPES.flatSheet;
      let elevation = 0.0;
      let angle = 0.0;

      if (ring >= 0) {
        // Finder patterns map to origamiRosette / rosetteCore (outer rosette 5.8, moat 0.15, inner petals 8.0, central crest 11.0)
        if (ring === 0) {
          // 7x7 outer folded collar
          type = ORIGAMI_FOLD_TYPES.origamiRosette;
          elevation = 5.8;
          angle = col % 2 === 0 ? 0.7854 : -0.7854;
        } else if (ring === 1) {
          // 5x5 moat
          type = ORIGAMI_FOLD_TYPES.flatSheet;
          elevation = 0.15;
          angle = 0.0;
        } else if (ring === 2) {
          // 3x3 petal dais
          type = ORIGAMI_FOLD_TYPES.origamiRosette;
          elevation = 8.0;
          angle = (col + row) % 2 === 0 ? 0.7854 : -0.7854;
        } else {
          // 1x1 rosette crest (ring === 3)
          type = ORIGAMI_FOLD_TYPES.origamiRosette;
          elevation = 11.0;
          angle = 0.7854;
        }
      } else if (isDark) {
        if (cluster >= 6) {
          // High cluster size (>= 6) becomes miuraTessellation with alternating angled facets
          type = ORIGAMI_FOLD_TYPES.miuraTessellation;
          elevation = 5.2 + cellSeed * 2.6;
          angle = (col + row) % 2 === 0 ? 0.7854 : -0.7854;
        } else if (neighbors === 2) {
          // Linear connections (neighbors == 2) become mountainFold or valleyFold crease lines
          if (cellSeed > 0.45) {
            type = ORIGAMI_FOLD_TYPES.mountainFold;
            elevation = 4.2 + cellSeed * 2.2;
            angle = col % 2 === 0 ? 0.7854 : -0.7854;
          } else {
            type = ORIGAMI_FOLD_TYPES.valleyFold;
            elevation = 2.4 + cellSeed * 1.4;
            angle = row % 2 === 0 ? 0.7854 : -0.7854;
          }
        } else if (neighbors <= 1) {
          // Isolated endpoints (neighbors <= 1) become paperCraneSculpture or foldedFlap
          if (cellSeed > 0.45) {
            type = ORIGAMI_FOLD_TYPES.paperCraneSculpture;
            elevation = 6.0 + cellSeed * 3.0;
            angle = cellSeed * 3.14159;
          } else {
            type = ORIGAMI_FOLD_TYPES.foldedFlap;
            elevation = 3.6 + cellSeed * 1.8;
            angle = col % 2 === 0 ? 0.7854 : -0.7854;
          }
        } else if (cellSeed > 0.5) {
          // Multi-connected junction / corner pleat
          type = ORIGAMI_FOLD_TYPES.pleatCorner;
          elevation = 4.5 + cellSeed * 2.0;
          angle = (col + row) % 2 === 0 ? 0.7854 : -0.7854;
        } else {
          // Ridge peak fold
          type = ORIGAMI_FOLD_TYPES.mountainFold;
          elevation = 4.8 + cellSeed * 2.4;
          angle = row % 2 === 0 ? 0.7854 : -0.7854;
        }
      } else {
        // Light cells map to flatSheet (elevation 0.0)
        type = ORIGAMI_FOLD_TYPES.flatSheet;
        elevation = 0.0;
        angle = 0.0;
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
      panelData[offset + 3] = Math.floor(cellSeed * 1000) + conn * 10000;
    }
  }

  return { dna, panelData, panels, qrSize: size, topology };
}
