import type { SeedModel } from "./seed-model.js";

/**
 * City lot codes stored in the shared block-type buffer. `road` MUST stay `0` because every
 * renderer treats a zero block type as a light (paper) QR cell at the morph endpoint.
 */
export const CITY_LOT_TYPES = {
  highRise: 3,
  landmarkPodium: 5,
  landmarkTower: 4,
  lowRise: 1,
  midRise: 2,
  road: 0,
} as const;

export type CityLotType = (typeof CITY_LOT_TYPES)[keyof typeof CITY_LOT_TYPES];

export const CITY_ARCHETYPES = ["slab", "stepped", "tower", "podium", "landmark"] as const;

export type CityArchetype = (typeof CITY_ARCHETYPES)[number];

export const CITY_ARCHETYPE_CODES: Readonly<Record<CityArchetype, number>> = {
  landmark: 4,
  podium: 3,
  slab: 0,
  stepped: 1,
  tower: 2,
};

/** Bit flags packed into the `w` component of each city lot. */
export const CITY_LOT_FLAGS = {
  antenna: 1,
  courtyard: 16,
  equipment: 2,
  plaza: 8,
  ribbonWindows: 64,
  streetlight: 4,
  stripWindows: 128,
  landmarkCore: 256,
  landmarkCorner: 512,
} as const;

export const CITY_MAX_FLOORS = 28;
export const CITY_LOT_STRIDE = 4;
/** Instanced draw parts per lot: body, upper section, roof cap, rooftop prop. */
export const CITY_PARTS_PER_LOT = 4;
export const CITY_FINDER_SIZE = 7;

export type CityDNA = {
  readonly accentShift: number;
  readonly antennaFrequency: number;
  readonly buildingVariation: number;
  readonly densityBias: number;
  readonly heightBias: number;
  readonly lightingVariation: number;
  readonly plazaFrequency: number;
  readonly roofStyleBias: number;
  readonly towerFrequency: number;
  readonly windowPattern: number;
};

export type CityLot = {
  readonly archetype: CityArchetype;
  readonly column: number;
  readonly flags: number;
  readonly floors: number;
  readonly index: number;
  readonly row: number;
  readonly seed: number;
  readonly type: CityLotType;
};

export type CityLayout = {
  readonly dna: CityDNA;
  readonly lots: readonly CityLot[];
  /** vec4 per QR cell: floors, archetype code, seed, flags. */
  readonly lotData: Float32Array;
  readonly maxFloors: number;
  readonly qrSize: number;
};

type CellAnalysis = {
  readonly active: Uint8Array;
  readonly componentSize: Uint16Array;
  readonly density3x3: Float32Array;
  readonly finderRing: Int8Array;
  readonly neighbors4: Uint8Array;
  readonly separator: Uint8Array;
  readonly size: number;
};

function cityRandom(seed: number, first: number, second = 0, salt = 0): number {
  const angle = first * 127.1 + second * 311.7 + salt * 43.7 + seed * 7_919;
  const value = Math.sin(angle) * 43_758.5;
  return value - Math.floor(value);
}

export function createCityDNA(model: SeedModel): CityDNA {
  const seed = model.morphSeed;
  return {
    accentShift: cityRandom(seed, 31, 0, 9_100),
    antennaFrequency: 0.18 + cityRandom(seed, 32, 0, 9_200) * 0.32,
    buildingVariation: 0.35 + cityRandom(seed, 33, 0, 9_300) * 0.65,
    densityBias: 0.7 + cityRandom(seed, 34, 0, 9_400) * 0.6,
    heightBias: 0.78 + cityRandom(seed, 35, 0, 9_500) * 0.5,
    lightingVariation: 0.3 + cityRandom(seed, 36, 0, 9_600) * 0.55,
    plazaFrequency: 0.12 + cityRandom(seed, 37, 0, 9_700) * 0.3,
    roofStyleBias: cityRandom(seed, 38, 0, 9_800),
    towerFrequency: 0.22 + cityRandom(seed, 39, 0, 9_900) * 0.5,
    windowPattern: cityRandom(seed, 40, 0, 10_000),
  };
}

/**
 * Returns the finder ring index for a cell (0 = outer dark ring, 1 = light ring, 2 = dark core
 * ring, 3 = center) or -1 when the cell is not inside one of the three finder patterns.
 */
export function cityFinderRing(column: number, row: number, size: number): number {
  const origins: readonly (readonly [number, number])[] = [
    [0, 0],
    [size - CITY_FINDER_SIZE, 0],
    [0, size - CITY_FINDER_SIZE],
  ];
  for (const [originColumn, originRow] of origins) {
    const localColumn = column - originColumn;
    const localRow = row - originRow;
    if (localColumn < 0 || localColumn > 6 || localRow < 0 || localRow > 6) continue;
    return Math.min(localColumn, localRow, 6 - localColumn, 6 - localRow);
  }
  return -1;
}

function isSeparatorCell(column: number, row: number, size: number): boolean {
  const inTopLeft = column <= 7 && row <= 7;
  const inTopRight = column >= size - 8 && row <= 7;
  const inBottomLeft = column <= 7 && row >= size - 8;
  return (inTopLeft || inTopRight || inBottomLeft) && cityFinderRing(column, row, size) === -1;
}

function labelComponents(active: Uint8Array, size: number): Uint16Array {
  const componentSize = new Uint16Array(active.length);
  const label = new Int32Array(active.length).fill(-1);
  const stack: number[] = [];
  let nextLabel = 0;
  for (let start = 0; start < active.length; start += 1) {
    if (!active[start] || label[start] !== -1) continue;
    const members: number[] = [];
    stack.push(start);
    label[start] = nextLabel;
    while (stack.length > 0) {
      const index = stack.pop()!;
      members.push(index);
      const column = index % size;
      const row = Math.floor(index / size);
      const candidates = [
        column > 0 ? index - 1 : -1,
        column < size - 1 ? index + 1 : -1,
        row > 0 ? index - size : -1,
        row < size - 1 ? index + size : -1,
      ];
      for (const candidate of candidates) {
        if (candidate < 0 || !active[candidate] || label[candidate] !== -1) continue;
        label[candidate] = nextLabel;
        stack.push(candidate);
      }
    }
    const count = Math.min(65_535, members.length);
    for (const member of members) componentSize[member] = count;
    nextLabel += 1;
  }
  return componentSize;
}

function analyzeCells(model: SeedModel): CellAnalysis {
  const size = model.qrSize;
  const active = new Uint8Array(size * size);
  for (const module of model.modules) active[module.index] = 1;
  const density3x3 = new Float32Array(active.length);
  const neighbors4 = new Uint8Array(active.length);
  const finderRing = new Int8Array(active.length);
  const separator = new Uint8Array(active.length);
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const index = row * size + column;
      let dark = 0;
      let count = 0;
      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
          const sampleRow = row + rowOffset;
          const sampleColumn = column + columnOffset;
          if (sampleRow < 0 || sampleRow >= size || sampleColumn < 0 || sampleColumn >= size) {
            continue;
          }
          const sample = active[sampleRow * size + sampleColumn] ?? 0;
          dark += sample;
          count += 1;
          if (sample && Math.abs(rowOffset) + Math.abs(columnOffset) === 1) {
            neighbors4[index] = (neighbors4[index] ?? 0) + 1;
          }
        }
      }
      density3x3[index] = dark / count;
      finderRing[index] = cityFinderRing(column, row, size);
      separator[index] = isSeparatorCell(column, row, size) ? 1 : 0;
    }
  }
  return {
    active,
    componentSize: labelComponents(active, size),
    density3x3,
    finderRing,
    neighbors4,
    separator,
    size,
  };
}

function floorRange(componentSize: number): readonly [number, number] {
  if (componentSize <= 1) return [1, 3];
  if (componentSize <= 4) return [2, 6];
  if (componentSize <= 12) return [4, 12];
  return [8, 20];
}

function clampFloors(value: number): number {
  return Math.max(1, Math.min(CITY_MAX_FLOORS, Math.round(value)));
}

function selectFloors(
  dna: CityDNA,
  analysis: CellAnalysis,
  index: number,
  seed: number,
  centerCloseness: number,
): number {
  const [minimum, maximum] = floorRange(analysis.componentSize[index] ?? 1);
  const density = analysis.density3x3[index] ?? 0;
  const gene = seed * 0.55 + density * 0.45;
  const downtown = 1 + centerCloseness * 0.42 * dna.densityBias;
  return clampFloors((minimum + (maximum - minimum) * gene) * dna.heightBias * downtown);
}

function selectArchetype(
  dna: CityDNA,
  floors: number,
  componentSize: number,
  seed: number,
): CityArchetype {
  if (floors >= 11) return seed < dna.towerFrequency ? "tower" : "slab";
  if (floors >= 6) return seed < 0.48 + dna.roofStyleBias * 0.2 ? "stepped" : "slab";
  return componentSize > 3 && seed < 0.62 ? "podium" : "slab";
}

function windowFlags(dna: CityDNA, seed: number): number {
  const pattern = (dna.windowPattern + seed * dna.buildingVariation) % 1;
  if (pattern < 0.34) return 0;
  if (pattern < 0.67) return CITY_LOT_FLAGS.ribbonWindows;
  return CITY_LOT_FLAGS.stripWindows;
}

function landmarkLot(
  ring: number,
  column: number,
  row: number,
  size: number,
  seed: number,
): Pick<CityLot, "archetype" | "flags" | "floors" | "type"> {
  if (ring >= 2) {
    const core = ring === 3;
    return {
      archetype: "landmark",
      flags:
        CITY_LOT_FLAGS.landmarkCore | (core ? CITY_LOT_FLAGS.antenna : CITY_LOT_FLAGS.equipment),
      floors: core ? CITY_MAX_FLOORS : 15 + Math.floor(seed * 3),
      type: CITY_LOT_TYPES.landmarkTower,
    };
  }
  const local = cityFinderLocal(column, row, size);
  const corner = (local[0] === 0 || local[0] === 6) && (local[1] === 0 || local[1] === 6);
  return {
    archetype: "podium",
    flags: corner ? CITY_LOT_FLAGS.landmarkCorner | CITY_LOT_FLAGS.antenna : 0,
    floors: corner ? 7 : 4,
    type: CITY_LOT_TYPES.landmarkPodium,
  };
}

function cityFinderLocal(column: number, row: number, size: number): readonly [number, number] {
  const originColumn = column >= size - CITY_FINDER_SIZE ? size - CITY_FINDER_SIZE : 0;
  const originRow = row >= size - CITY_FINDER_SIZE ? size - CITY_FINDER_SIZE : 0;
  return [column - originColumn, row - originRow];
}

function lightLot(
  dna: CityDNA,
  analysis: CellAnalysis,
  index: number,
  seed: number,
): Pick<CityLot, "archetype" | "flags" | "floors" | "type"> {
  const ring = analysis.finderRing[index] ?? -1;
  let flags = 0;
  if (ring === 1) flags |= CITY_LOT_FLAGS.courtyard;
  else if (analysis.separator[index]) flags |= CITY_LOT_FLAGS.plaza;
  else if ((analysis.density3x3[index] ?? 0) < 0.25 && seed < dna.plazaFrequency) {
    flags |= CITY_LOT_FLAGS.plaza;
  }
  const lonelyRoad = flags === 0 && (analysis.neighbors4[index] ?? 0) >= 2;
  if (lonelyRoad && cityRandom(seed, index, 3, 11_000) < 0.16) flags |= CITY_LOT_FLAGS.streetlight;
  return { archetype: "slab", flags, floors: 0, type: CITY_LOT_TYPES.road };
}

function darkLot(
  dna: CityDNA,
  analysis: CellAnalysis,
  index: number,
  column: number,
  row: number,
  seed: number,
): Pick<CityLot, "archetype" | "flags" | "floors" | "type"> {
  const ring = analysis.finderRing[index] ?? -1;
  if (ring >= 0) return landmarkLot(ring, column, row, analysis.size, seed);
  const center = (analysis.size - 1) / 2;
  const distance = Math.hypot(column - center, row - center) / center;
  const closeness = Math.max(0, 1 - distance);
  const floors = selectFloors(dna, analysis, index, seed, closeness);
  const componentSize = analysis.componentSize[index] ?? 1;
  const archetype = selectArchetype(dna, floors, componentSize, cityRandom(seed, index, 1, 11_100));
  let flags = windowFlags(dna, cityRandom(seed, index, 2, 11_200));
  const propGene = cityRandom(seed, index, 4, 11_300);
  if (archetype === "tower" || (floors >= 8 && propGene < dna.antennaFrequency)) {
    flags |= CITY_LOT_FLAGS.antenna;
  } else if (floors >= 3 && propGene < dna.antennaFrequency + 0.3) {
    flags |= CITY_LOT_FLAGS.equipment;
  }
  const type =
    floors >= 11
      ? CITY_LOT_TYPES.highRise
      : floors >= 5
        ? CITY_LOT_TYPES.midRise
        : CITY_LOT_TYPES.lowRise;
  return { archetype, flags, floors, type };
}

export function createCityLayout(model: SeedModel): CityLayout {
  const dna = createCityDNA(model);
  const analysis = analyzeCells(model);
  const size = analysis.size;
  const lots: CityLot[] = [];
  const lotData = new Float32Array(size * size * CITY_LOT_STRIDE);
  let maxFloors = 0;
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const index = row * size + column;
      const seed = cityRandom(model.morphSeed, column, row, 12_000);
      const shape = analysis.active[index]
        ? darkLot(dna, analysis, index, column, row, seed)
        : lightLot(dna, analysis, index, seed);
      const lot: CityLot = { ...shape, column, index, row, seed };
      lots.push(lot);
      maxFloors = Math.max(maxFloors, lot.floors);
      const offset = index * CITY_LOT_STRIDE;
      lotData[offset] = lot.floors;
      lotData[offset + 1] = CITY_ARCHETYPE_CODES[lot.archetype];
      lotData[offset + 2] = lot.seed;
      lotData[offset + 3] = lot.flags;
    }
  }
  return { dna, lots, lotData, maxFloors, qrSize: size };
}
