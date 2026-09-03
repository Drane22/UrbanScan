import { createEveryQRCodeIdentity } from "@every-qrcode/core";
import { describe, expect, it } from "vitest";

import { CIRCUIT_COMPONENT_TYPES, createCircuitDNA, createCircuitLayout } from "./circuit-model";
import { createSeedModel } from "./seed-model";

describe("circuit-model", () => {
  const url1 = "https://example.com/circuit-world";
  const url2 = "https://example.com/other-circuit";

  it("produces deterministic DNA and layout for the same URL", async () => {
    const id1a = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const id1b = await createEveryQRCodeIdentity(url1, { identityScope: "url" });

    const model1a = await createSeedModel(id1a);
    const model1b = await createSeedModel(id1b);

    const dna1a = createCircuitDNA(model1a);
    const dna1b = createCircuitDNA(model1b);
    expect(dna1a).toEqual(dna1b);

    const layout1a = createCircuitLayout(model1a);
    const layout1b = createCircuitLayout(model1b);
    expect(layout1a.cellData).toEqual(layout1b.cellData);
    expect(layout1a.cells.length).toBe(layout1b.cells.length);
  });

  it("produces distinct DNA for different URLs", async () => {
    const id1 = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const id2 = await createEveryQRCodeIdentity(url2, { identityScope: "url" });

    const model1 = await createSeedModel(id1);
    const model2 = await createSeedModel(id2);

    const dna1 = createCircuitDNA(model1);
    const dna2 = createCircuitDNA(model2);
    expect(dna1.seed).not.toBe(dna2.seed);
  });

  it("maps finder patterns into processor packages and dies", async () => {
    const id = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const model = await createSeedModel(id);
    const layout = createCircuitLayout(model);

    // Top-left finder outer ring (0,0) should be processorPackage
    const cornerCell = layout.cells[0]!;
    expect(cornerCell.type).toBe(CIRCUIT_COMPONENT_TYPES.processorPackage);

    // Top-left finder center (3,3) should be processorDie
    const centerIndex = 3 * model.qrSize + 3;
    const centerCell = layout.cells[centerIndex]!;
    expect(centerCell.type).toBe(CIRCUIT_COMPONENT_TYPES.processorDie);
  });

  it("maintains positive heights and valid connection bitmasks", async () => {
    const id = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const model = await createSeedModel(id);
    const layout = createCircuitLayout(model);

    expect(layout.cells.length).toBe(model.qrSize * model.qrSize);
    for (const cell of layout.cells) {
      expect(cell.height).toBeGreaterThan(0);
      expect(cell.connections).toBeGreaterThanOrEqual(0);
      expect(cell.connections).toBeLessThanOrEqual(15);
    }
  });
});
