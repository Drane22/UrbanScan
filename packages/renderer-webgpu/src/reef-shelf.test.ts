import { describe, expect, it } from "vitest";

import { createReefShelf } from "./reef-shelf";

describe("reef-shelf", () => {
  const size = 29;
  const active = Uint8Array.from({ length: size * size }, (_, index) => Number(index % 3 === 0));

  it("creates a deterministic normalized shelf", () => {
    const first = createReefShelf(active, size, 0.314);
    const second = createReefShelf(active, size, 0.314);
    expect(second.shelfData).toEqual(first.shelfData);
    expect(Math.max(...first.heights)).toBeLessThanOrEqual(1);
    expect(Math.max(...first.heights)).toBeGreaterThan(0.85);
    expect(first.shelfData).toHaveLength(size * size * 4);
  });

  it("cuts two continuous edge-to-edge channels", () => {
    const shelf = createReefShelf(active, size, 0.728);
    expect(shelf.channels).toHaveLength(2);
    expect(shelf.channels[0]!.points).toHaveLength(size);
    expect(shelf.channels[1]!.points).toHaveLength(size);
    expect(shelf.channels[0]!.points[0]!.column).toBe(0);
    expect(shelf.channels[0]!.points.at(-1)!.column).toBe(size - 1);
    expect(shelf.channels[1]!.points[0]!.row).toBe(0);
    expect(shelf.channels[1]!.points.at(-1)!.row).toBe(size - 1);
    expect(Array.from(shelf.channelMask).filter(Boolean).length).toBeGreaterThan(size * 3);
  });
});
