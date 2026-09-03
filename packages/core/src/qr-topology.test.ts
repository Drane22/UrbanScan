import { describe, expect, it } from "vitest";

import { createQRMatrix } from "./qr";
import { analyzeQRTopology, getFinderPatternInfo, isFinderSeparatorCell } from "./qr-topology";

describe("qr-topology", () => {
  const qr = createQRMatrix("https://example.com");

  it("analyzes finder pattern concentric rings correctly", () => {
    const info00 = getFinderPatternInfo(0, 0, qr.size);
    expect(info00.finderIndex).toBe(0); // Top-left
    expect(info00.finderRing).toBe(0); // Outer border

    const info11 = getFinderPatternInfo(1, 1, qr.size);
    expect(info11.finderIndex).toBe(0);
    expect(info11.finderRing).toBe(1); // Light ring

    const info22 = getFinderPatternInfo(2, 2, qr.size);
    expect(info22.finderIndex).toBe(0);
    expect(info22.finderRing).toBe(2); // Core ring

    const info33 = getFinderPatternInfo(3, 3, qr.size);
    expect(info33.finderIndex).toBe(0);
    expect(info33.finderRing).toBe(3); // Center

    const infoOutside = getFinderPatternInfo(10, 10, qr.size);
    expect(infoOutside.finderRing).toBe(-1);
    expect(infoOutside.finderIndex).toBe(-1);
  });

  it("identifies finder separator cells", () => {
    expect(isFinderSeparatorCell(7, 0, qr.size)).toBe(true);
    expect(isFinderSeparatorCell(0, 7, qr.size)).toBe(true);
    expect(isFinderSeparatorCell(0, 0, qr.size)).toBe(false); // inside finder
    expect(isFinderSeparatorCell(10, 10, qr.size)).toBe(false);
  });

  it("computes topology analysis with connectivity, density, and cluster sizes", () => {
    const topo = analyzeQRTopology(qr);

    expect(topo.size).toBe(qr.size);
    expect(topo.cells.length).toBe(qr.size * qr.size);
    expect(topo.neighbors4.length).toBe(qr.size * qr.size);
    expect(topo.clusterSize.length).toBe(qr.size * qr.size);
    expect(topo.connections.length).toBe(qr.size * qr.size);
    expect(topo.centerDistance.length).toBe(qr.size * qr.size);

    // Center distance at center should be near 0
    const center = Math.floor(qr.size / 2);
    expect(topo.centerDistance[center * qr.size + center]).toBeLessThan(0.15);

    // Finder corners should be identified
    expect(topo.finderIndex[0]).toBe(0);
    expect(topo.finderRing[0]).toBe(0);

    // Top-right finder outer corner
    const topRightIndex = qr.size - 7;
    expect(topo.finderIndex[topRightIndex]).toBe(1);
    expect(topo.finderRing[topRightIndex]).toBe(0);

    // Verify cluster sizes are positive for dark cells
    for (let i = 0; i < qr.cells.length; i += 1) {
      if (qr.cells[i]) {
        expect(topo.clusterSize[i]).toBeGreaterThan(0);
      } else {
        expect(topo.clusterSize[i]).toBe(0);
      }
    }
  });
});
