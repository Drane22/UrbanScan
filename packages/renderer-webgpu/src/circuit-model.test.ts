import { createEveryQRCodeIdentity } from "@every-qrcode/core";
import { describe, expect, it } from "vitest";

import {
  CIRCUIT_COMPONENT_STRIDE,
  CIRCUIT_COMPONENT_TYPES,
  CIRCUIT_TRACE_STRIDE,
  createCircuitDNA,
  createCircuitLayout,
  type CircuitComponent,
} from "./circuit-model";
import { createSeedModel } from "./seed-model";

const overlap = (left: CircuitComponent, right: CircuitComponent): boolean =>
  Math.abs(left.column - right.column) < (left.width + right.width) * 0.5 &&
  Math.abs(left.row - right.row) < (left.depth + right.depth) * 0.5;

describe("circuit-model", () => {
  const url1 = "https://example.com/circuit-world";
  const url2 = "https://example.com/other-circuit";

  it("produces a deterministic composed scene for the same URL", async () => {
    const identity = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const first = createCircuitLayout(await createSeedModel(identity));
    const second = createCircuitLayout(await createSeedModel(identity));
    expect(second.dna).toEqual(first.dna);
    expect(second.components).toEqual(first.components);
    expect(second.traces).toEqual(first.traces);
    expect(second.signalRoutes).toEqual(first.signalRoutes);
    expect(second.componentData).toEqual(first.componentData);
    expect(second.traceData).toEqual(first.traceData);
  });

  it("produces distinct composition DNA for different URLs", async () => {
    const first = await createSeedModel(
      await createEveryQRCodeIdentity(url1, { identityScope: "url" }),
    );
    const second = await createSeedModel(
      await createEveryQRCodeIdentity(url2, { identityScope: "url" }),
    );
    expect(createCircuitDNA(first).seed).not.toBe(createCircuitDNA(second).seed);
  });

  it("creates exactly three non-overlapping hero processors at finder regions", async () => {
    const model = await createSeedModel(
      await createEveryQRCodeIdentity(url1, { identityScope: "url" }),
    );
    const layout = createCircuitLayout(model);
    expect(layout.processors).toHaveLength(3);
    expect(layout.processors.map((processor) => processor.type)).toEqual([
      CIRCUIT_COMPONENT_TYPES.processor,
      CIRCUIT_COMPONENT_TYPES.processor,
      CIRCUIT_COMPONENT_TYPES.processor,
    ]);
    expect(layout.processors.map((processor) => [processor.column, processor.row])).toEqual([
      [3, 3],
      [model.qrSize - 4, 3],
      [3, model.qrSize - 4],
    ]);
    for (let left = 0; left < layout.processors.length; left += 1) {
      for (let right = left + 1; right < layout.processors.length; right += 1) {
        expect(overlap(layout.processors[left]!, layout.processors[right]!)).toBe(false);
      }
    }
  });

  it("keeps components bounded, curated, and below density caps", async () => {
    const model = await createSeedModel(
      await createEveryQRCodeIdentity(url1, { identityScope: "url" }),
    );
    const layout = createCircuitLayout(model);
    expect(layout.components.length).toBeLessThanOrEqual(35);
    for (const component of layout.components) {
      expect(component.column - component.width * 0.5).toBeGreaterThanOrEqual(-0.6);
      expect(component.row - component.depth * 0.5).toBeGreaterThanOrEqual(-0.6);
      expect(component.column + component.width * 0.5).toBeLessThanOrEqual(model.qrSize + 0.6);
      expect(component.row + component.depth * 0.5).toBeLessThanOrEqual(model.qrSize + 0.6);
      expect(component.rotation).toBeGreaterThanOrEqual(0);
      expect(component.rotation).toBeLessThanOrEqual(3);
    }
  });

  it("creates bounded routes and signal metadata", async () => {
    const model = await createSeedModel(
      await createEveryQRCodeIdentity(url1, { identityScope: "url" }),
    );
    const layout = createCircuitLayout(model);
    expect(layout.signalRoutes.length).toBeGreaterThanOrEqual(3);
    expect(layout.traces.length).toBeGreaterThan(layout.signalRoutes.length);
    for (const trace of layout.traces) {
      for (const coordinate of [trace.startColumn, trace.startRow, trace.endColumn, trace.endRow]) {
        expect(coordinate).toBeGreaterThanOrEqual(0);
        expect(coordinate).toBeLessThan(model.qrSize);
      }
      expect(layout.signalRoutes.some((route) => route.id === trace.routeId)).toBe(true);
      expect(trace.routeLength).toBeGreaterThan(0);
    }
  });

  it("packs stable documented GPU record strides", async () => {
    const model = await createSeedModel(
      await createEveryQRCodeIdentity(url1, { identityScope: "url" }),
    );
    const layout = createCircuitLayout(model);
    expect(layout.componentData).toHaveLength(layout.components.length * CIRCUIT_COMPONENT_STRIDE);
    expect(layout.traceData).toHaveLength(layout.traces.length * CIRCUIT_TRACE_STRIDE);
  });

  it("falls back to a reduced composition when the placement budget is exhausted", async () => {
    const model = await createSeedModel(
      await createEveryQRCodeIdentity(url1, { identityScope: "url" }),
    );
    const layout = createCircuitLayout(model, { maxPlacementAttempts: 0 });
    expect(layout.fallbackUsed).toBe(true);
    expect(layout.components).toHaveLength(4);
    expect(layout.processors).toHaveLength(3);
  });
});
