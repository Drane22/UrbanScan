import { analyzeQRTopology, type QRTopologyAnalysis } from "@every-qrcode/core";
import type { SeedModel } from "./seed-model.js";
import { createBaseWorldDNA, seededRandom, type WorldDNA } from "./world-dna.js";

export const CIRCUIT_COMPONENT_TYPES = {
  busPad: 8,
  capacitor: 3,
  heatsink: 4,
  ledIndicator: 7,
  microchip: 1,
  processorDie: 6,
  processorPackage: 5,
  resistor: 2,
  substrate: 0,
} as const;

export type CircuitComponentType =
  (typeof CIRCUIT_COMPONENT_TYPES)[keyof typeof CIRCUIT_COMPONENT_TYPES];

export const CIRCUIT_FLAGS = {
  dualInLine: 1,
  goldFlashes: 32,
  hasFins: 8,
  ledActive: 4,
  quadFlat: 2,
  surfaceMount: 16,
} as const;

export interface CircuitDNA extends WorldDNA {
  readonly boardColorIndex: number;
  readonly busRoutingBias: number;
  readonly componentStyle: number;
  readonly heatsinkFrequency: number;
  readonly ledBlinkRate: number;
  readonly traceDensity: number;
  readonly traceGlow: number;
}

export interface CircuitCell {
  readonly column: number;
  readonly connections: number;
  readonly flags: number;
  readonly height: number;
  readonly index: number;
  readonly row: number;
  readonly seed: number;
  readonly type: CircuitComponentType;
}

export interface CircuitLayout {
  readonly dna: CircuitDNA;
  readonly cells: readonly CircuitCell[];
  /** vec4 per cell: type, height, connections, packedFlags (flags + seed) */
  readonly cellData: Float32Array;
  readonly qrSize: number;
  readonly topology: QRTopologyAnalysis;
}

export function createCircuitDNA(model: SeedModel): CircuitDNA {
  const seed = model.morphSeed;
  const base = createBaseWorldDNA(seed);
  return {
    ...base,
    boardColorIndex: Math.floor(seededRandom(seed, 21, 0, 100) * 5),
    busRoutingBias: seededRandom(seed, 22, 0, 200),
    componentStyle: seededRandom(seed, 23, 0, 300),
    heatsinkFrequency: 0.2 + seededRandom(seed, 24, 0, 400) * 0.5,
    ledBlinkRate: 1.0 + seededRandom(seed, 25, 0, 500) * 3.0,
    traceDensity: 0.4 + seededRandom(seed, 26, 0, 600) * 0.5,
    traceGlow: 0.5 + seededRandom(seed, 27, 0, 700) * 0.5,
  };
}

export function createCircuitLayout(model: SeedModel): CircuitLayout {
  const size = model.qrSize;
  const activeCells = new Uint8Array(size * size);
  for (const module of model.modules) {
    activeCells[module.index] = 1;
  }

  const topology = analyzeQRTopology({ cells: activeCells, size });
  const dna = createCircuitDNA(model);
  const cells: CircuitCell[] = [];
  const cellData = new Float32Array(size * size * 4);

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const index = row * size + col;
      const isDark = activeCells[index] === 1;
      const ring = topology.finderRing[index]!;
      const cluster = topology.clusterSize[index]!;
      const conn = topology.connections[index]!;
      const density = topology.density3x3[index]!;
      const cellSeed = seededRandom(model.morphSeed, col, row, 777);

      let type: CircuitComponentType = CIRCUIT_COMPONENT_TYPES.substrate;
      let height = 0.05;
      let flags = 0;

      if (ring >= 0) {
        // Finder pattern processor module
        if (ring === 0) {
          // Outer package rim
          type = CIRCUIT_COMPONENT_TYPES.processorPackage;
          height = 0.55;
          flags |= CIRCUIT_FLAGS.quadFlat | CIRCUIT_FLAGS.goldFlashes;
        } else if (ring === 1) {
          // Recessed socket moat
          type = CIRCUIT_COMPONENT_TYPES.substrate;
          height = 0.1;
        } else if (ring >= 2) {
          // Core die
          type = CIRCUIT_COMPONENT_TYPES.processorDie;
          height = ring === 3 ? 0.8 : 0.65;
          flags |= CIRCUIT_FLAGS.goldFlashes;
        }
      } else if (isDark) {
        // Standard data / alignment / timing cells
        if (cluster >= 7 && cellSeed < dna.heatsinkFrequency) {
          type = CIRCUIT_COMPONENT_TYPES.heatsink;
          height = 0.9 + cellSeed * 0.6;
          flags |= CIRCUIT_FLAGS.hasFins;
        } else if (density > 0.65 || cluster >= 4) {
          type = CIRCUIT_COMPONENT_TYPES.microchip;
          height = 0.35 + cellSeed * 0.25;
          flags |= cellSeed > 0.5 ? CIRCUIT_FLAGS.dualInLine : CIRCUIT_FLAGS.quadFlat;
        } else if (topology.neighbors4[index]! <= 1 && cellSeed > 0.6) {
          type = CIRCUIT_COMPONENT_TYPES.capacitor;
          height = 0.7 + cellSeed * 0.5;
        } else if (topology.neighbors4[index]! <= 2 && cellSeed > 0.3) {
          type = CIRCUIT_COMPONENT_TYPES.resistor;
          height = 0.25;
          flags |= CIRCUIT_FLAGS.surfaceMount;
        } else if (topology.neighbors4[index]! === 1 && cellSeed > 0.4) {
          type = CIRCUIT_COMPONENT_TYPES.ledIndicator;
          height = 0.4;
          flags |= CIRCUIT_FLAGS.ledActive;
        } else {
          type = CIRCUIT_COMPONENT_TYPES.busPad;
          height = 0.15;
          flags |= CIRCUIT_FLAGS.goldFlashes;
        }
      } else {
        // Light cells = substrate with traces
        type = CIRCUIT_COMPONENT_TYPES.substrate;
        height = 0.04;
      }

      cells.push({
        column: col,
        connections: conn,
        flags,
        height,
        index,
        row,
        seed: cellSeed,
        type,
      });

      const offset = index * 4;
      cellData[offset] = type;
      cellData[offset + 1] = height;
      cellData[offset + 2] = conn;
      // Pack flags (low 8 bits) and 24-bit quantized seed into 32-bit float
      cellData[offset + 3] = flags + Math.floor(cellSeed * 1000) * 256;
    }
  }

  return { cellData, cells, dna, qrSize: size, topology };
}
