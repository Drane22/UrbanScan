import { analyzeQRTopology, type QRTopologyAnalysis } from "@every-qrcode/core";
import type { SeedModel } from "./seed-model.js";
import { createBaseWorldDNA, seededRandom, type WorldDNA } from "./world-dna.js";

export const TOY_BLOCK_TYPES = {
  blockCastle: 5,
  blockTower: 3,
  castleApex: 6,
  flatPlate: 0,
  studBrick: 1,
  tallBrick: 2,
  toyProp: 7,
  toyVehicle: 4,
} as const;

export type ToyBlockType = (typeof TOY_BLOCK_TYPES)[keyof typeof TOY_BLOCK_TYPES];

export interface ToyBlockDNA extends WorldDNA {
  readonly blockHeightBias: number;
  readonly colorTheme: number;
  readonly studGrip: number;
  readonly vehicleRate: number;
}

export interface ToyBlockPiece {
  readonly colorIndex: number;
  readonly column: number;
  readonly height: number;
  readonly index: number;
  readonly row: number;
  readonly seed: number;
  readonly type: ToyBlockType;
}

export interface ToyBlockLayout {
  /** vec4 per cell: type, height, connections, packedSeedColor */
  readonly blockData: Float32Array;
  readonly dna: ToyBlockDNA;
  readonly pieces: readonly ToyBlockPiece[];
  readonly qrSize: number;
  readonly topology: QRTopologyAnalysis;
}

export function createToyBlockDNA(model: SeedModel): ToyBlockDNA {
  const seed = model.morphSeed;
  const base = createBaseWorldDNA(seed);
  return {
    ...base,
    blockHeightBias: 0.6 + seededRandom(seed, 81, 0, 100) * 0.6,
    colorTheme: Math.floor(seededRandom(seed, 82, 0, 200) * 4),
    studGrip: 0.5 + seededRandom(seed, 83, 0, 300) * 0.5,
    vehicleRate: 0.15 + seededRandom(seed, 84, 0, 400) * 0.25,
  };
}

export function createToyBlockLayout(model: SeedModel): ToyBlockLayout {
  const size = model.qrSize;
  const activeCells = new Uint8Array(size * size);
  for (const module of model.modules) {
    activeCells[module.index] = 1;
  }

  const topology = analyzeQRTopology({ cells: activeCells, size });
  const dna = createToyBlockDNA(model);
  const pieces: ToyBlockPiece[] = [];
  const blockData = new Float32Array(size * size * 4);

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const index = row * size + col;
      const isDark = activeCells[index] === 1;
      const ring = topology.finderRing[index]!;
      const conn = topology.connections[index]!;
      const cellSeed = seededRandom(model.morphSeed, col, row, 888);

      let type: ToyBlockType = TOY_BLOCK_TYPES.flatPlate;
      let height = 0.05;
      const colorIndex = Math.floor(cellSeed * 5); // 5 classic block colors

      if (ring >= 0) {
        if (ring === 0) {
          type = TOY_BLOCK_TYPES.blockCastle;
          height = 6.0;
        } else if (ring === 1) {
          type = TOY_BLOCK_TYPES.flatPlate;
          height = 0.15;
        } else {
          type = TOY_BLOCK_TYPES.castleApex;
          height = ring === 3 ? 11.0 : 8.0;
        }
      } else if (isDark) {
        if (topology.clusterSize[index]! >= 6 && cellSeed > 0.5) {
          type = TOY_BLOCK_TYPES.blockTower;
          height = 6.0 + cellSeed * 3.5;
        } else if (cellSeed < dna.vehicleRate && topology.neighbors4[index]! <= 2) {
          type = TOY_BLOCK_TYPES.toyVehicle;
          height = 2.5;
        } else if (cellSeed > 0.75) {
          type = TOY_BLOCK_TYPES.tallBrick;
          height = 5.0;
        } else {
          type = TOY_BLOCK_TYPES.studBrick;
          height = 3.2;
        }
      }

      pieces.push({
        colorIndex,
        column: col,
        height,
        index,
        row,
        seed: cellSeed,
        type,
      });

      const offset = index * 4;
      blockData[offset] = type;
      blockData[offset + 1] = height;
      blockData[offset + 2] = conn;
      // Low 4 digits hold the quantized seed; upper digits hold the seeded
      // brick color family so the shader can unpack both deterministically.
      blockData[offset + 3] = Math.floor(cellSeed * 1000) + colorIndex * 10000;
    }
  }

  return { blockData, dna, pieces, qrSize: size, topology };
}
