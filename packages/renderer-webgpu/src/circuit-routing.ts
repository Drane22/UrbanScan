export interface CircuitRoutePoint {
  readonly column: number;
  readonly row: number;
}

export interface CircuitKeepOut {
  readonly maxColumn: number;
  readonly maxRow: number;
  readonly minColumn: number;
  readonly minRow: number;
}

export interface CircuitRouteSegment {
  readonly endColumn: number;
  readonly endRow: number;
  readonly startColumn: number;
  readonly startRow: number;
}

export interface CircuitRouteRequest {
  readonly blocked?: ReadonlySet<string>;
  readonly bounds: number;
  readonly end: CircuitRoutePoint;
  readonly keepOuts: readonly CircuitKeepOut[];
  readonly start: CircuitRoutePoint;
}

const pointKey = (column: number, row: number): string => `${column}:${row}`;

function isBlocked(column: number, row: number, request: CircuitRouteRequest): boolean {
  if (column < 0 || row < 0 || column >= request.bounds || row >= request.bounds) return true;
  if (
    (column === request.start.column && row === request.start.row) ||
    (column === request.end.column && row === request.end.row)
  ) {
    return false;
  }
  if (request.blocked?.has(pointKey(column, row))) return true;
  return request.keepOuts.some(
    (area) =>
      column >= area.minColumn &&
      column <= area.maxColumn &&
      row >= area.minRow &&
      row <= area.maxRow,
  );
}

function reconstructPath(
  parents: ReadonlyMap<string, string>,
  end: CircuitRoutePoint,
): CircuitRoutePoint[] {
  const points: CircuitRoutePoint[] = [];
  let cursor = pointKey(end.column, end.row);
  while (true) {
    const [column, row] = cursor.split(":").map(Number);
    points.push({ column: column!, row: row! });
    const parent = parents.get(cursor);
    if (!parent) break;
    cursor = parent;
  }
  return points.reverse();
}

function compressPath(points: readonly CircuitRoutePoint[]): CircuitRouteSegment[] {
  if (points.length < 2) return [];
  const segments: CircuitRouteSegment[] = [];
  let start = points[0]!;
  let previous = points[1]!;
  let directionColumn = points[1]!.column - start.column;
  let directionRow = points[1]!.row - start.row;
  for (let index = 2; index < points.length; index += 1) {
    const point = points[index]!;
    const nextColumn = point.column - previous.column;
    const nextRow = point.row - previous.row;
    if (nextColumn !== directionColumn || nextRow !== directionRow) {
      segments.push({
        endColumn: previous.column,
        endRow: previous.row,
        startColumn: start.column,
        startRow: start.row,
      });
      start = previous;
      directionColumn = nextColumn;
      directionRow = nextRow;
    }
    previous = point;
  }
  segments.push({
    endColumn: previous.column,
    endRow: previous.row,
    startColumn: start.column,
    startRow: start.row,
  });
  return segments;
}

/** Deterministic bounded Manhattan router with bend compression. */
export function routeCircuitTrace(request: CircuitRouteRequest): readonly CircuitRouteSegment[] {
  if (request.bounds <= 0) return [];
  const startKey = pointKey(request.start.column, request.start.row);
  const endKey = pointKey(request.end.column, request.end.row);
  const queue: CircuitRoutePoint[] = [request.start];
  const visited = new Set<string>([startKey]);
  const parents = new Map<string, string>();
  const directions = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ] as const;
  let cursor = 0;

  while (cursor < queue.length && queue.length <= request.bounds * request.bounds) {
    const point = queue[cursor++]!;
    const currentKey = pointKey(point.column, point.row);
    if (currentKey === endKey) return compressPath(reconstructPath(parents, point));
    for (const [columnDelta, rowDelta] of directions) {
      const column = point.column + columnDelta;
      const row = point.row + rowDelta;
      const key = pointKey(column, row);
      if (visited.has(key) || isBlocked(column, row, request)) continue;
      visited.add(key);
      parents.set(key, currentKey);
      queue.push({ column, row });
    }
  }
  return [];
}

export function circuitSegmentLength(segment: CircuitRouteSegment): number {
  return (
    Math.abs(segment.endColumn - segment.startColumn) + Math.abs(segment.endRow - segment.startRow)
  );
}
