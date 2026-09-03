import { describe, expect, it } from "vitest";

import { circuitSegmentLength, routeCircuitTrace } from "./circuit-routing";

describe("circuit-routing", () => {
  it("routes deterministically inside bounds and compresses straight runs", () => {
    const request = {
      bounds: 12,
      end: { column: 10, row: 8 },
      keepOuts: [{ maxColumn: 7, maxRow: 7, minColumn: 4, minRow: 4 }],
      start: { column: 1, row: 1 },
    } as const;
    const first = routeCircuitTrace(request);
    expect(routeCircuitTrace(request)).toEqual(first);
    expect(first.length).toBeGreaterThan(0);
    expect(first[0]).toMatchObject({ startColumn: 1, startRow: 1 });
    expect(first.at(-1)).toMatchObject({ endColumn: 10, endRow: 8 });
    for (const segment of first) {
      expect(circuitSegmentLength(segment)).toBeGreaterThan(0);
      expect(segment.startColumn).toBeGreaterThanOrEqual(0);
      expect(segment.startRow).toBeGreaterThanOrEqual(0);
      expect(segment.endColumn).toBeLessThan(12);
      expect(segment.endRow).toBeLessThan(12);
      expect(segment.startColumn === segment.endColumn || segment.startRow === segment.endRow).toBe(
        true,
      );
    }
  });

  it("avoids keep-out areas", () => {
    const route = routeCircuitTrace({
      bounds: 10,
      end: { column: 8, row: 5 },
      keepOuts: [{ maxColumn: 6, maxRow: 6, minColumn: 3, minRow: 3 }],
      start: { column: 1, row: 5 },
    });
    expect(route.length).toBeGreaterThan(1);
    for (const segment of route) {
      const steps = circuitSegmentLength(segment);
      for (let step = 0; step <= steps; step += 1) {
        const t = steps === 0 ? 0 : step / steps;
        const column = Math.round(
          segment.startColumn + (segment.endColumn - segment.startColumn) * t,
        );
        const row = Math.round(segment.startRow + (segment.endRow - segment.startRow) * t);
        expect(column >= 3 && column <= 6 && row >= 3 && row <= 6).toBe(false);
      }
    }
  });

  it("returns an empty route when the destination is sealed", () => {
    const blocked = new Set(["3:2", "4:3", "3:4", "2:3"]);
    expect(
      routeCircuitTrace({
        blocked,
        bounds: 7,
        end: { column: 3, row: 3 },
        keepOuts: [],
        start: { column: 0, row: 0 },
      }),
    ).toEqual([]);
  });
});
