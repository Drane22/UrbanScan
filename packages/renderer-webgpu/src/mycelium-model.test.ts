import { createEveryQRCodeIdentity } from "@every-qrcode/core";
import { describe, expect, it } from "vitest";

import { createMyceliumDNA, createMyceliumLayout, FUNGAL_NODE_TYPES } from "./mycelium-model";
import { createSeedModel } from "./seed-model";

describe("mycelium-model", () => {
  const url1 = "https://example.com/fungal-groove";
  const url2 = "https://example.com/spores";

  it("is deterministic for identical URLs", async () => {
    const id1a = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const id1b = await createEveryQRCodeIdentity(url1, { identityScope: "url" });

    const model1a = await createSeedModel(id1a);
    const model1b = await createSeedModel(id1b);

    const dna1a = createMyceliumDNA(model1a);
    const dna1b = createMyceliumDNA(model1b);
    expect(dna1a).toEqual(dna1b);

    const layout1a = createMyceliumLayout(model1a);
    const layout1b = createMyceliumLayout(model1b);
    expect(layout1a.fungalData).toEqual(layout1b.fungalData);
  });

  it("varies across different URLs", async () => {
    const id1 = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const id2 = await createEveryQRCodeIdentity(url2, { identityScope: "url" });

    const model1 = await createSeedModel(id1);
    const model2 = await createSeedModel(id2);

    const dna1 = createMyceliumDNA(model1);
    const dna2 = createMyceliumDNA(model2);
    expect(dna1.seed).not.toBe(dna2.seed);
  });

  it("grows giant fungal towers at finder patterns", async () => {
    const id = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const model = await createSeedModel(id);
    const layout = createMyceliumLayout(model);

    // Top-left finder center
    const centerIndex = 3 * model.qrSize + 3;
    expect(layout.nodes[centerIndex]!.type).toBe(FUNGAL_NODE_TYPES.fungalSporeCore);
  });

  it("maps every finder ring to its fungal colony tier", async () => {
    const id = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const model = await createSeedModel(id);
    const layout = createMyceliumLayout(model);
    const size = model.qrSize;

    // 7x7 outer colony rim
    expect(layout.nodes[0]!.type).toBe(FUNGAL_NODE_TYPES.giantFungalTower);
    expect(layout.nodes[0]!.height).toBe(6.0);
    // Separator soil
    expect(layout.nodes[size + 1]!.type).toBe(FUNGAL_NODE_TYPES.sporeSoil);
    expect(layout.nodes[size + 1]!.height).toBe(0.15);
    // Inner spore ring
    expect(layout.nodes[2 * size + 2]!.type).toBe(FUNGAL_NODE_TYPES.fungalSporeCore);
    expect(layout.nodes[2 * size + 2]!.height).toBe(8.0);
    // Central spore core: the tallest colony anchor
    expect(layout.nodes[3 * size + 3]!.type).toBe(FUNGAL_NODE_TYPES.fungalSporeCore);
    expect(layout.nodes[3 * size + 3]!.height).toBe(11.5);
  });

  it("keeps light cells as bare spore soil", async () => {
    const id = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const model = await createSeedModel(id);
    const layout = createMyceliumLayout(model);
    const activeSet = new Set(model.modules.map((m) => m.index));
    let lightCount = 0;
    let darkCount = 0;

    for (const node of layout.nodes) {
      const ring = layout.topology.finderRing[node.index]!;
      if (!activeSet.has(node.index)) {
        lightCount += 1;
        expect(node.type).toBe(FUNGAL_NODE_TYPES.sporeSoil);
        if (ring === 1) expect(node.height).toBe(0.15);
        else expect(node.height).toBe(0.05);
      } else {
        darkCount += 1;
        expect(node.type).not.toBe(FUNGAL_NODE_TYPES.sporeSoil);
      }
    }
    expect(lightCount).toBeGreaterThan(0);
    expect(darkCount).toBeGreaterThan(0);
  });
});
