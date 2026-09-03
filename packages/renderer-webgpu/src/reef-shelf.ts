import { seededRandom } from "./world-dna.js";

export interface ReefChannelPoint {
  readonly column: number;
  readonly row: number;
}

export interface ReefChannel {
  readonly id: number;
  readonly points: readonly ReefChannelPoint[];
}

export interface ReefShelf {
  readonly channelMask: Uint8Array;
  readonly channels: readonly ReefChannel[];
  readonly heights: Float32Array;
  readonly shelfData: Float32Array;
  readonly size: number;
}

function smooth(source: Float32Array, size: number): Float32Array {
  const output = new Float32Array(source.length);
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      let total = 0;
      let weight = 0;
      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
          const sampleColumn = column + columnOffset;
          const sampleRow = row + rowOffset;
          if (sampleColumn < 0 || sampleRow < 0 || sampleColumn >= size || sampleRow >= size)
            continue;
          const sampleWeight = columnOffset === 0 && rowOffset === 0 ? 4 : 1;
          total += (source[sampleRow * size + sampleColumn] ?? 0) * sampleWeight;
          weight += sampleWeight;
        }
      }
      output[row * size + column] = total / weight;
    }
  }
  return output;
}

function createChannels(size: number, seed: number): readonly ReefChannel[] {
  const amplitude = Math.max(1.5, size * 0.085);
  const horizontalOffset = (seededRandom(seed, 1, 0, 2100) - 0.5) * size * 0.16;
  const verticalOffset = (seededRandom(seed, 2, 0, 2100) - 0.5) * size * 0.16;
  const horizontal: ReefChannel = {
    id: 0,
    points: Array.from({ length: size }, (_, column) => ({
      column,
      row: Math.max(
        1,
        Math.min(
          size - 2,
          Math.round(
            size * 0.54 + horizontalOffset + Math.sin(column * 0.31 + seed * 3) * amplitude,
          ),
        ),
      ),
    })),
  };
  const vertical: ReefChannel = {
    id: 1,
    points: Array.from({ length: size }, (_, row) => ({
      column: Math.max(
        1,
        Math.min(
          size - 2,
          Math.round(size * 0.64 + verticalOffset + Math.sin(row * 0.27 + seed * 5) * amplitude),
        ),
      ),
      row,
    })),
  };
  return [horizontal, vertical];
}

export function createReefShelf(activeCells: Uint8Array, size: number, seed: number): ReefShelf {
  const raw = new Float32Array(size * size);
  const crestColumn = size * (0.42 + seededRandom(seed, 4, 0, 2200) * 0.18);
  const crestRow = size * (0.34 + seededRandom(seed, 5, 0, 2200) * 0.2);
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const index = row * size + column;
      const dx = (column - crestColumn) / (size * 0.46);
      const dz = (row - crestRow) / (size * 0.44);
      const crest = Math.max(0, 1 - Math.sqrt(dx * dx + dz * dz));
      const edge =
        Math.min(column, row, size - 1 - column, size - 1 - row) / Math.max(1, size * 0.16);
      const qrLift = activeCells[index] === 1 ? 0.16 : 0;
      const variation = seededRandom(seed, column, row, 2300) * 0.08;
      raw[index] = Math.max(0, crest * 0.88 + Math.min(1, edge) * 0.08 + qrLift + variation);
    }
  }
  let heights = smooth(raw, size);
  heights = smooth(heights, size);
  const maximum = Math.max(...heights, Number.EPSILON);
  const channels = createChannels(size, seed);
  const channelMask = new Uint8Array(size * size);
  for (const channel of channels) {
    for (const point of channel.points) {
      for (let offset = -1; offset <= 1; offset += 1) {
        const column = channel.id === 0 ? point.column : point.column + offset;
        const row = channel.id === 0 ? point.row + offset : point.row;
        if (column < 0 || row < 0 || column >= size || row >= size) continue;
        channelMask[row * size + column] = 1;
      }
    }
  }
  const shelfData = new Float32Array(size * size * 4);
  for (let index = 0; index < heights.length; index += 1) {
    const channel = channelMask[index] === 1;
    const normalized = channel ? (heights[index] ?? 0) * 0.18 : (heights[index] ?? 0) / maximum;
    heights[index] = normalized;
    shelfData[index * 4] = normalized;
    shelfData[index * 4 + 1] = normalized > 0.24 ? 1 : 0;
    shelfData[index * 4 + 2] = channel ? 1 : 0;
    shelfData[index * 4 + 3] = seededRandom(seed, index % size, Math.floor(index / size), 2400);
  }
  return { channelMask, channels, heights, shelfData, size };
}
