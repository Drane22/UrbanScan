import { analyzeQRTopology, type QRTopologyAnalysis } from "@every-qrcode/core";
import type { SeedModel } from "./seed-model.js";
import { createReefShelf, type ReefShelf } from "./reef-shelf.js";
import { createBaseWorldDNA, seededRandom, type WorldDNA } from "./world-dna.js";

export const REEF_CORAL_FAMILIES = {
  anemone: 6,
  boulder: 4,
  brain: 3,
  branching: 0,
  bush: 1,
  plate: 2,
  seaFan: 7,
  seagrass: 9,
  softCoral: 8,
  tube: 5,
} as const;

export type ReefCoralFamily = (typeof REEF_CORAL_FAMILIES)[keyof typeof REEF_CORAL_FAMILIES];
export const REEF_CORAL_STRIDE = 12;
export const REEF_FISH_PATH_STRIDE = 12;

export interface ReefDNA extends WorldDNA {
  readonly anemoneHue: number;
  readonly coralHeightBias: number;
  readonly fishSpeed: number;
  readonly waterTint: number;
}

export interface ReefCoralColony {
  readonly column: number;
  readonly family: ReefCoralFamily;
  readonly height: number;
  readonly id: number;
  readonly rotation: number;
  readonly row: number;
  readonly scale: number;
  readonly seed: number;
  readonly shelfHeight: number;
  readonly stiffness: number;
  readonly targetColumn: number;
  readonly targetRow: number;
  readonly variant: number;
}

export interface ReefFishPath {
  readonly controlColumn: number;
  readonly controlRow: number;
  readonly depth: number;
  readonly endColumn: number;
  readonly endRow: number;
  readonly id: number;
  readonly phase: number;
  readonly speed: number;
  readonly startColumn: number;
  readonly startRow: number;
}

export interface ReefLayout {
  readonly coralData: Float32Array;
  readonly colonies: readonly ReefCoralColony[];
  readonly dna: ReefDNA;
  readonly fishData: Float32Array;
  readonly fishPaths: readonly ReefFishPath[];
  readonly qrSize: number;
  readonly shelf: ReefShelf;
  readonly topology: QRTopologyAnalysis;
}

function coralDimensions(family: ReefCoralFamily): readonly [number, number, number] {
  if (family === REEF_CORAL_FAMILIES.branching) return [2.4, 3.8, 0.82];
  if (family === REEF_CORAL_FAMILIES.bush) return [2.7, 2.5, 0.66];
  if (family === REEF_CORAL_FAMILIES.plate) return [3.2, 1.6, 0.9];
  if (family === REEF_CORAL_FAMILIES.brain) return [2.5, 1.8, 0.9];
  if (family === REEF_CORAL_FAMILIES.boulder) return [2.8, 1.7, 0.92];
  if (family === REEF_CORAL_FAMILIES.tube) return [1.8, 2.8, 0.75];
  if (family === REEF_CORAL_FAMILIES.anemone) return [2.1, 1.9, 0.25];
  if (family === REEF_CORAL_FAMILIES.seaFan) return [2.4, 3.1, 0.18];
  if (family === REEF_CORAL_FAMILIES.softCoral) return [2.0, 2.5, 0.2];
  return [1.2, 1.4, 0.12];
}

function preferredFamily(height: number, exposure: number, seed: number): ReefCoralFamily {
  if (height > 0.68) return seed > 0.42 ? REEF_CORAL_FAMILIES.branching : REEF_CORAL_FAMILIES.bush;
  if (exposure > 0.72) return seed > 0.5 ? REEF_CORAL_FAMILIES.plate : REEF_CORAL_FAMILIES.seaFan;
  if (height > 0.44) return seed > 0.52 ? REEF_CORAL_FAMILIES.brain : REEF_CORAL_FAMILIES.boulder;
  if (seed > 0.78) return REEF_CORAL_FAMILIES.anemone;
  if (seed > 0.58) return REEF_CORAL_FAMILIES.softCoral;
  if (seed > 0.34) return REEF_CORAL_FAMILIES.tube;
  return REEF_CORAL_FAMILIES.seagrass;
}

function coloniesOverlap(left: ReefCoralColony, right: ReefCoralColony): boolean {
  return (
    Math.hypot(left.column - right.column, left.row - right.row) < (left.scale + right.scale) * 0.72
  );
}

function createColonies(model: SeedModel, shelf: ReefShelf): readonly ReefCoralColony[] {
  const colonies: ReefCoralColony[] = [];
  const targetCount = Math.min(32, 20 + Math.floor(model.qrSize / 6));
  for (let row = 2; row < model.qrSize - 2 && colonies.length < targetCount; row += 2) {
    for (let column = 2; column < model.qrSize - 2 && colonies.length < targetCount; column += 2) {
      const index = row * model.qrSize + column;
      if (shelf.channelMask[index] === 1) continue;
      const shelfHeight = shelf.heights[index] ?? 0;
      if (shelfHeight < 0.18) continue;
      const seed = seededRandom(model.morphSeed, column, row, 3100);
      if (seed < 0.34) continue;
      const exposure = Math.min(1, shelfHeight + Math.min(column, row) / model.qrSize);
      const family = preferredFamily(shelfHeight, exposure, seed);
      const [scale, height, stiffness] = coralDimensions(family);
      const colony: ReefCoralColony = {
        column,
        family,
        height: height * (0.84 + seed * 0.28),
        id: colonies.length,
        rotation: seededRandom(model.morphSeed, column, row, 3200) * Math.PI * 2,
        row,
        scale: scale * (0.82 + seed * 0.22),
        seed,
        shelfHeight,
        stiffness,
        targetColumn: column,
        targetRow: row,
        variant: Math.floor(seededRandom(model.morphSeed, column, row, 3300) * 3),
      };
      if (colonies.some((other) => coloniesOverlap(colony, other))) continue;
      colonies.push(colony);
    }
  }
  return colonies;
}

function createFishPaths(
  model: SeedModel,
  shelf: ReefShelf,
  dna: ReefDNA,
): readonly ReefFishPath[] {
  return shelf.channels.slice(0, 2).map((channel, id) => {
    const start = channel.points[0]!;
    const end = channel.points.at(-1)!;
    const control = channel.points[Math.floor(channel.points.length * (0.42 + id * 0.12))]!;
    return {
      controlColumn: control.column,
      controlRow: control.row,
      depth: 1.5 + id * 0.55,
      endColumn: end.column,
      endRow: end.row,
      id,
      phase: seededRandom(model.morphSeed, id, 0, 3500),
      speed: dna.fishSpeed * (0.7 + id * 0.16),
      startColumn: start.column,
      startRow: start.row,
    };
  });
}

function packColonies(colonies: readonly ReefCoralColony[]): Float32Array {
  const data = new Float32Array(colonies.length * REEF_CORAL_STRIDE);
  colonies.forEach((colony, index) => {
    data.set(
      [
        colony.column,
        colony.row,
        colony.scale,
        colony.height,
        colony.family,
        colony.variant,
        colony.rotation,
        colony.stiffness,
        colony.seed,
        colony.shelfHeight,
        colony.targetColumn,
        colony.targetRow,
      ],
      index * REEF_CORAL_STRIDE,
    );
  });
  return data;
}

function packFishPaths(paths: readonly ReefFishPath[]): Float32Array {
  const data = new Float32Array(paths.length * REEF_FISH_PATH_STRIDE);
  paths.forEach((path, index) => {
    data.set(
      [
        path.startColumn,
        path.startRow,
        path.controlColumn,
        path.controlRow,
        path.endColumn,
        path.endRow,
        path.depth,
        path.speed,
        path.phase,
        path.id,
        0,
        0,
      ],
      index * REEF_FISH_PATH_STRIDE,
    );
  });
  return data;
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
  const shelf = createReefShelf(activeCells, size, model.morphSeed);
  const colonies = createColonies(model, shelf);
  const fishPaths = createFishPaths(model, shelf, dna);
  return {
    coralData: packColonies(colonies),
    colonies,
    dna,
    fishData: packFishPaths(fishPaths),
    fishPaths,
    qrSize: size,
    shelf,
    topology,
  };
}
