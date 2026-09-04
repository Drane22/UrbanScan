import { createEveryQRCodeIdentity } from "@every-qrcode/core";
import { describe, expect, it } from "vitest";

import { createSeedModel } from "./seed-model";
import { createToyBlockDNA, createToyBlockLayout, TOY_BLOCK_TYPES } from "./toy-block-model";

describe("toy-block-model", () => {
  const url1 = "https://example.com/toy-diorama";
  const url2 = "https://example.com/brick-world";

  it("is deterministic for identical URLs", async () => {
    const id1a = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const id1b = await createEveryQRCodeIdentity(url1, { identityScope: "url" });

    const model1a = await createSeedModel(id1a);
    const model1b = await createSeedModel(id1b);

    const dna1a = createToyBlockDNA(model1a);
    const dna1b = createToyBlockDNA(model1b);
    expect(dna1a).toEqual(dna1b);

    const layout1a = createToyBlockLayout(model1a);
    const layout1b = createToyBlockLayout(model1b);
    expect(layout1a.blockData).toEqual(layout1b.blockData);
  });

  it("varies across different URLs", async () => {
    const id1 = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const id2 = await createEveryQRCodeIdentity(url2, { identityScope: "url" });

    const model1 = await createSeedModel(id1);
    const model2 = await createSeedModel(id2);

    const dna1 = createToyBlockDNA(model1);
    const dna2 = createToyBlockDNA(model2);
    expect(dna1.seed).not.toBe(dna2.seed);
  });

  it("creates block castles at finder patterns", async () => {
    const id = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const model = await createSeedModel(id);
    const layout = createToyBlockLayout(model);

    // Top-left finder center
    const centerIndex = 3 * model.qrSize + 3;
    expect(layout.pieces[centerIndex]!.type).toBe(TOY_BLOCK_TYPES.castleApex);
  });

  it("maps every finder ring to its landmark tier", async () => {
    const id = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const model = await createSeedModel(id);
    const layout = createToyBlockLayout(model);
    const size = model.qrSize;

    // 7x7 outer castle wall
    expect(layout.pieces[0]!.type).toBe(TOY_BLOCK_TYPES.blockCastle);
    expect(layout.pieces[0]!.height).toBe(6.0);
    // 5x5separator moat plate
    expect(layout.pieces[size + 1]!.type).toBe(TOY_BLOCK_TYPES.flatPlate);
    expect(layout.pieces[size + 1]!.height).toBe(0.15);
    // 3x3 inner apex court
    expect(layout.pieces[2 * size + 2]!.type).toBe(TOY_BLOCK_TYPES.castleApex);
    expect(layout.pieces[2 * size + 2]!.height).toBe(8.0);
    // 1x1 castle apex
    expect(layout.pieces[3 * size + 3]!.type).toBe(TOY_BLOCK_TYPES.castleApex);
    expect(layout.pieces[3 * size + 3]!.height).toBe(11.0);
  });

  it("keeps light cells flat and packs connections plus seed/color deterministically", async () => {
    const id = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const model = await createSeedModel(id);
    const layout = createToyBlockLayout(model);
    const activeSet = new Set(model.modules.map((m) => m.index));
    let lightCount = 0;

    for (const piece of layout.pieces) {
      const offset = piece.index * 4;
      // blockData vec4 is (type, height, connections, packedSeedColor).
      // Integer slots compare exactly; float slots allow Float32 rounding.
      expect(layout.blockData[offset]).toBe(piece.type);
      expect(layout.blockData[offset + 1]).toBeCloseTo(piece.height, 6);
      expect(layout.blockData[offset + 2]).toBe(layout.topology.connections[piece.index]);
      expect(layout.blockData[offset + 3]).toBe(
        Math.floor(piece.seed * 1000) + piece.colorIndex * 10000,
      );
      expect(piece.colorIndex).toBeGreaterThanOrEqual(0);
      expect(piece.colorIndex).toBeLessThanOrEqual(4);

      if (!activeSet.has(piece.index)) {
        lightCount += 1;
        expect(piece.type).toBe(TOY_BLOCK_TYPES.flatPlate);
      }
    }
    expect(lightCount).toBeGreaterThan(0);
  });
});
