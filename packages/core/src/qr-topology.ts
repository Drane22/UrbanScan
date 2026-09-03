import type { QRMatrix } from "./qr.js";

export const FINDER_PATTERN_SIZE = 7;

export interface QRTopologyAnalysis {
  readonly size: number;
  readonly cells: Uint8Array;
  readonly neighbors4: Uint8Array;
  readonly neighbors8: Uint8Array;
  readonly connections: Uint8Array;
  readonly density3x3: Float32Array;
  readonly density5x5: Float32Array;
  readonly clusterSize: Uint16Array;
  readonly centerDistance: Float32Array;
  readonly finderRing: Int8Array;
  readonly finderIndex: Int8Array;
  readonly isSeparator: Uint8Array;
  readonly isTiming: Uint8Array;
  readonly isAlignment: Uint8Array;
  readonly runHorizontal: Uint8Array;
  readonly runVertical: Uint8Array;
}

/**
 * Returns the finder pattern index (0 = top-left, 1 = top-right, 2 = bottom-left)
 * and the concentric ring index (0 = outer dark border, 1 = light ring, 2 = dark core ring, 3 = center)
 * or -1 if the cell is outside any finder pattern.
 */
export function getFinderPatternInfo(
  column: number,
  row: number,
  size: number,
): { readonly finderIndex: number; readonly finderRing: number } {
  const origins: readonly (readonly [number, number])[] = [
    [0, 0],
    [size - FINDER_PATTERN_SIZE, 0],
    [0, size - FINDER_PATTERN_SIZE],
  ];
  for (let index = 0; index < origins.length; index += 1) {
    const origin = origins[index]!;
    const localCol = column - origin[0];
    const localRow = row - origin[1];
    if (localCol >= 0 && localCol < 7 && localRow >= 0 && localRow < 7) {
      const ring = Math.min(localCol, localRow, 6 - localCol, 6 - localRow);
      return { finderIndex: index, finderRing: ring };
    }
  }
  return { finderIndex: -1, finderRing: -1 };
}

export function isFinderSeparatorCell(column: number, row: number, size: number): boolean {
  const inTopLeft = column <= 7 && row <= 7;
  const inTopRight = column >= size - 8 && row <= 7;
  const inBottomLeft = column <= 7 && row >= size - 8;
  if (!inTopLeft && !inTopRight && !inBottomLeft) return false;
  return getFinderPatternInfo(column, row, size).finderRing === -1;
}

function computeClusterSizes(cells: Uint8Array, size: number): Uint16Array {
  const clusterSize = new Uint16Array(cells.length);
  const visited = new Uint8Array(cells.length);
  const stack: number[] = [];

  for (let start = 0; start < cells.length; start += 1) {
    if (!cells[start] || visited[start]) continue;
    const members: number[] = [];
    stack.push(start);
    visited[start] = 1;

    while (stack.length > 0) {
      const index = stack.pop()!;
      members.push(index);
      const col = index % size;
      const row = Math.floor(index / size);

      const neighbors = [
        col > 0 ? index - 1 : -1,
        col < size - 1 ? index + 1 : -1,
        row > 0 ? index - size : -1,
        row < size - 1 ? index + size : -1,
      ];

      for (const next of neighbors) {
        if (next >= 0 && cells[next] && !visited[next]) {
          visited[next] = 1;
          stack.push(next);
        }
      }
    }

    const count = Math.min(65_535, members.length);
    for (const member of members) {
      clusterSize[member] = count;
    }
  }

  return clusterSize;
}

export function analyzeQRTopology(
  matrix: QRMatrix | { readonly cells: Uint8Array; readonly size: number },
): QRTopologyAnalysis {
  const size = matrix.size;
  const cells = matrix.cells;
  const total = size * size;

  const neighbors4 = new Uint8Array(total);
  const neighbors8 = new Uint8Array(total);
  const connections = new Uint8Array(total);
  const density3x3 = new Float32Array(total);
  const density5x5 = new Float32Array(total);
  const centerDistance = new Float32Array(total);
  const finderRing = new Int8Array(total);
  const finderIndex = new Int8Array(total);
  const isSeparator = new Uint8Array(total);
  const isTiming = new Uint8Array(total);
  const isAlignment = new Uint8Array(total);
  const runHorizontal = new Uint8Array(total);
  const runVertical = new Uint8Array(total);

  const center = (size - 1) * 0.5;
  const maxDist = Math.hypot(center, center) || 1;

  // 1. Finder info, timing, distance, separators
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const index = row * size + col;
      centerDistance[index] = Math.hypot(col - center, row - center) / maxDist;

      const finderInfo = getFinderPatternInfo(col, row, size);
      finderRing[index] = finderInfo.finderRing;
      finderIndex[index] = finderInfo.finderIndex;
      isSeparator[index] = isFinderSeparatorCell(col, row, size) ? 1 : 0;

      // Timing patterns are along row 6 and column 6 between finder patterns
      const isRowTiming = row === 6 && col >= 8 && col <= size - 9;
      const isColTiming = col === 6 && row >= 8 && row <= size - 9;
      isTiming[index] = isRowTiming || isColTiming ? 1 : 0;

      // Alignment pattern for standard QR (typically at size - 9, size - 9 for version 2+)
      if (size >= 25) {
        const alignCenter = size - 7;
        const dCol = Math.abs(col - alignCenter);
        const dRow = Math.abs(row - alignCenter);
        if (dCol <= 2 && dRow <= 2 && finderRing[index] === -1) {
          isAlignment[index] = 1;
        }
      }
    }
  }

  // 2. Neighborhood, connections, and densities
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const index = row * size + col;
      let count3 = 0;
      let dark3 = 0;
      let n4 = 0;
      let n8 = 0;
      let conn = 0;

      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          const r = row + dr;
          const c = col + dc;
          if (r < 0 || r >= size || c < 0 || c >= size) continue;
          count3 += 1;
          const isDark = cells[r * size + c] ?? 0;
          dark3 += isDark;

          if (dr === 0 && dc === 0) continue;
          if (isDark) {
            n8 += 1;
            if (dr === 0 || dc === 0) {
              n4 += 1;
              if (dr === -1)
                conn |= 1; // up
              else if (dc === 1)
                conn |= 2; // right
              else if (dr === 1)
                conn |= 4; // down
              else if (dc === -1) conn |= 8; // left
            }
          }
        }
      }

      neighbors4[index] = n4;
      neighbors8[index] = n8;
      connections[index] = conn;
      density3x3[index] = dark3 / count3;

      // 5x5 density
      let count5 = 0;
      let dark5 = 0;
      for (let dr = -2; dr <= 2; dr += 1) {
        for (let dc = -2; dc <= 2; dc += 1) {
          const r = row + dr;
          const c = col + dc;
          if (r < 0 || r >= size || c < 0 || c >= size) continue;
          count5 += 1;
          dark5 += cells[r * size + c] ?? 0;
        }
      }
      density5x5[index] = dark5 / count5;
    }
  }

  // 3. Horizontal runs
  for (let row = 0; row < size; row += 1) {
    let col = 0;
    while (col < size) {
      const isDark = cells[row * size + col];
      let runLength = 1;
      while (col + runLength < size && cells[row * size + col + runLength] === isDark) {
        runLength += 1;
      }
      for (let i = 0; i < runLength; i += 1) {
        runHorizontal[row * size + col + i] = Math.min(255, runLength);
      }
      col += runLength;
    }
  }

  // 4. Vertical runs
  for (let col = 0; col < size; col += 1) {
    let row = 0;
    while (row < size) {
      const isDark = cells[row * size + col];
      let runLength = 1;
      while (row + runLength < size && cells[(row + runLength) * size + col] === isDark) {
        runLength += 1;
      }
      for (let i = 0; i < runLength; i += 1) {
        runVertical[(row + i) * size + col] = Math.min(255, runLength);
      }
      row += runLength;
    }
  }

  // 5. Cluster sizes (flood fill on active cells)
  const clusterSize = computeClusterSizes(cells, size);

  return {
    centerDistance,
    clusterSize,
    connections,
    cells,
    density3x3,
    density5x5,
    finderIndex,
    finderRing,
    isAlignment,
    isSeparator,
    isTiming,
    neighbors4,
    neighbors8,
    runHorizontal,
    runVertical,
    size,
  };
}
