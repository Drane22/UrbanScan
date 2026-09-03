import { createEveryQRCodeIdentity } from "@every-qrcode/core";
import { describe, expect, it } from "vitest";

import { createOrigamiDNA, createOrigamiLayout, ORIGAMI_FOLD_TYPES } from "./origami-model";
import { createSeedModel } from "./seed-model";
import { WORLD_PALETTES } from "./world-palettes";

describe("origami-model", () => {
  const url1 = "https://example.com/origami-world";
  const url2 = "https://example.com/other-origami";

  it("is deterministic for identical URLs (byte-identical panelData and DNA)", async () => {
    const id1a = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const id1b = await createEveryQRCodeIdentity(url1, { identityScope: "url" });

    const model1a = await createSeedModel(id1a);
    const model1b = await createSeedModel(id1b);

    const dna1a = createOrigamiDNA(model1a);
    const dna1b = createOrigamiDNA(model1b);
    expect(dna1a).toEqual(dna1b);

    const layout1a = createOrigamiLayout(model1a);
    const layout1b = createOrigamiLayout(model1b);

    // Byte-identical panelData Float32Array
    expect(layout1a.panelData.length).toBe(layout1b.panelData.length);
    expect(layout1a.panelData).toEqual(layout1b.panelData);
    for (let i = 0; i < layout1a.panelData.length; i++) {
      expect(layout1a.panelData[i]).toBe(layout1b.panelData[i]);
    }
    expect(layout1a.panels.length).toBe(layout1b.panels.length);
  });

  it("varies across different URLs (phenotypic variation)", async () => {
    const id1 = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const id2 = await createEveryQRCodeIdentity(url2, { identityScope: "url" });

    const model1 = await createSeedModel(id1);
    const model2 = await createSeedModel(id2);

    const dna1 = createOrigamiDNA(model1);
    const dna2 = createOrigamiDNA(model2);
    expect(dna1.seed).not.toBe(dna2.seed);
    expect(model1.morphSeed).not.toBe(model2.morphSeed);
    expect(dna1.foldComplexity).not.toBe(dna2.foldComplexity);
    expect(dna1.paperGrain).not.toBe(dna2.paperGrain);
    expect(dna1.creaseSharpness).not.toBe(dna2.creaseSharpness);
    expect(dna1.elevationBias).not.toBe(dna2.elevationBias);
    expect(dna1.flutterIntensity).not.toBe(dna2.flutterIntensity);

    const layout1 = createOrigamiLayout(model1);
    const layout2 = createOrigamiLayout(model2);
    expect(layout1.panelData).not.toEqual(layout2.panelData);
  });

  it("maps finder landmarks to origamiRosette structures with multi-tier elevations", async () => {
    const id = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const model = await createSeedModel(id);
    const layout = createOrigamiLayout(model);
    const size = model.qrSize;

    // Top-left finder center (1x1 rosette crest: ring 3)
    const tlCenterIndex = 3 * size + 3;
    expect(layout.panels[tlCenterIndex]!.type).toBe(ORIGAMI_FOLD_TYPES.origamiRosette);
    expect(layout.panels[tlCenterIndex]!.type).toBe(ORIGAMI_FOLD_TYPES.rosetteCore); // backward compatibility alias
    expect(layout.panels[tlCenterIndex]!.elevation).toBe(11.0);

    // Top-right finder center (3, size - 4)
    const trCenterIndex = 3 * size + (size - 4);
    expect(layout.panels[trCenterIndex]!.type).toBe(ORIGAMI_FOLD_TYPES.origamiRosette);
    expect(layout.panels[trCenterIndex]!.elevation).toBe(11.0);

    // Bottom-left finder center (size - 4, 3)
    const blCenterIndex = (size - 4) * size + 3;
    expect(layout.panels[blCenterIndex]!.type).toBe(ORIGAMI_FOLD_TYPES.origamiRosette);
    expect(layout.panels[blCenterIndex]!.elevation).toBe(11.0);

    // Finder ring 0: outer folded collar (7x7)
    const outerCollarIndex = 0;
    expect(layout.panels[outerCollarIndex]!.type).toBe(ORIGAMI_FOLD_TYPES.origamiRosette);
    expect(layout.panels[outerCollarIndex]!.type).toBe(ORIGAMI_FOLD_TYPES.rosette); // backward compatibility alias
    expect(layout.panels[outerCollarIndex]!.elevation).toBe(5.8);

    // Finder ring 1: 5x5 moat
    const moatIndex = 1 * size + 1;
    expect(layout.panels[moatIndex]!.type).toBe(ORIGAMI_FOLD_TYPES.flatSheet);
    expect(layout.panels[moatIndex]!.type).toBe(ORIGAMI_FOLD_TYPES.flat); // backward compatibility alias
    expect(layout.panels[moatIndex]!.elevation).toBe(0.15);

    // Finder ring 2: 3x3 petal dais
    const daisIndex = 2 * size + 2;
    expect(layout.panels[daisIndex]!.type).toBe(ORIGAMI_FOLD_TYPES.origamiRosette);
    expect(layout.panels[daisIndex]!.elevation).toBe(8.0);
  });

  it("enforces paper sheet invariants: all light cells map to flatSheet with elevation 0.0 (finder moat 0.15)", async () => {
    const id = await createEveryQRCodeIdentity(url1, { identityScope: "url" });
    const model = await createSeedModel(id);
    const layout = createOrigamiLayout(model);

    const activeSet = new Set(model.modules.map((m) => m.index));
    let lightCount = 0;
    let darkCount = 0;
    let miuraOrCreaseCount = 0;

    for (let r = 0; r < model.qrSize; r++) {
      for (let c = 0; c < model.qrSize; c++) {
        const idx = r * model.qrSize + c;
        const panel = layout.panels[idx]!;
        const ring = layout.topology.finderRing[idx]!;
        const isDark = activeSet.has(idx);

        if (!isDark) {
          lightCount++;
          expect(panel.type).toBe(ORIGAMI_FOLD_TYPES.flatSheet);
          expect(panel.type).toBe(ORIGAMI_FOLD_TYPES.flat); // backward compatibility alias
          if (ring === 1) {
            // Finder moat
            expect(panel.elevation).toBe(0.15);
          } else {
            // Unfolded flat paper substrate
            expect(panel.elevation).toBe(0.0);
          }
        } else {
          darkCount++;
          expect(panel.elevation).toBeGreaterThan(0.0);
          expect(panel.type).toBeGreaterThanOrEqual(1);
          expect(panel.type).toBeLessThanOrEqual(7);
          if (
            panel.type === ORIGAMI_FOLD_TYPES.miuraTessellation ||
            panel.type === ORIGAMI_FOLD_TYPES.mountainFold ||
            panel.type === ORIGAMI_FOLD_TYPES.valleyFold ||
            panel.type === ORIGAMI_FOLD_TYPES.paperCraneSculpture ||
            panel.type === ORIGAMI_FOLD_TYPES.origamiRosette ||
            panel.type === ORIGAMI_FOLD_TYPES.foldedFlap ||
            panel.type === ORIGAMI_FOLD_TYPES.pleatCorner
          ) {
            miuraOrCreaseCount++;
          }
        }
      }
    }

    expect(lightCount).toBeGreaterThan(0);
    expect(darkCount).toBeGreaterThan(0);
    expect(miuraOrCreaseCount).toBe(darkCount);
  });

  it("guarantees Rec. 709 luminance contrast >= 0.75 for all origami presets", () => {
    const origamiPalettes = WORLD_PALETTES.origami;
    expect(origamiPalettes.length).toBeGreaterThanOrEqual(4);

    const expectedIds = [
      "washi-indigo",
      "mulberry-crimson",
      "bamboo-sage",
      "gold-leaf-lacquer",
    ];
    for (const expectedId of expectedIds) {
      const p = origamiPalettes.find((palette) => palette.id === expectedId);
      expect(p).toBeDefined();

      const [r1, g1, b1] = p!.palette[0]!; // Dark primary ink
      const [r5, g5, b5] = p!.palette[4]!; // Paper substrate

      const darkLuma = 0.2126 * r1 + 0.7152 * g1 + 0.0722 * b1;
      const paperLuma = 0.2126 * r5 + 0.7152 * g5 + 0.0722 * b5;
      const contrast = paperLuma - darkLuma;

      expect(contrast).toBeGreaterThanOrEqual(0.75);
    }
  });
});

