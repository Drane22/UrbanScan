import { createEveryQRCodeIdentity } from "@every-qrcode/core";
import { describe, expect, it } from "vitest";
import { createColonyLayout } from "./colony-model.js";
import { COLONY_PALETTES, colonyMaterials, selectColonyPalette } from "./colony-palette.js";
import { createSeedModel } from "./seed-model.js";

describe("Colony ownership", () => {
  it.each([
    "https://a.co",
    "https://nasa.gov",
    "https://example.com/chambers",
    `https://example.org/${"network/".repeat(10)}`,
  ])("preserves every canonical cell and reciprocal tunnel for %s", async (url) => {
    const identity = await createEveryQRCodeIdentity(url, { identityScope: "url" });
    const model = await createSeedModel(identity);
    const layout = createColonyLayout(model);
    const size = model.qrSize;
    for (const unit of layout.units) {
      expect(unit.type > 0).toBe(identity.qr.cells[unit.index] === 1);
      expect(unit.qr).toEqual([unit.column, unit.row]);
      expect(Number.isFinite(unit.height)).toBe(true);
      expect(unit.buildDelay).toBeGreaterThanOrEqual(0);
      if (unit.connections & 2) {
        expect(unit.column).toBeLessThan(size - 1);
        expect(layout.units[unit.index + 1]!.connections & 8).toBe(8);
      }
      if (unit.connections & 4) {
        expect(unit.row).toBeLessThan(size - 1);
        expect(layout.units[unit.index + size]!.connections & 1).toBe(1);
      }
    }
    expect(createColonyLayout(model).moduleData).toEqual(layout.moduleData);
  });

  it("handles sparse and dense ownership without inventing a fallback payload", async () => {
    const model = await createSeedModel(await createEveryQRCodeIdentity("https://a.co"));
    for (const indices of [[], [17], Array.from({ length: model.qrSize ** 2 }, (_, i) => i)]) {
      const modules = indices.map((index) => ({ ...model.modules[0]!, index }));
      const layout = createColonyLayout({ ...model, modules });
      expect(layout.units.filter((unit) => unit.type > 0).map((unit) => unit.index)).toEqual(
        indices,
      );
    }
    expect(() => createColonyLayout({ ...model, qrSize: 0 })).toThrow(RangeError);
  });

  it("selects every family deterministically and keeps final ink contrast above 7:1", () => {
    const luminance = (rgb: readonly number[]) =>
      rgb
        .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
        .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i]!, 0);
    const families = new Set<string>();
    for (let seed = 0; seed < 32; seed++) {
      const palette = selectColonyPalette(seed / 32);
      expect(selectColonyPalette(seed / 32)).toEqual(palette);
      families.add(palette.id);
    }
    expect(families.size).toBe(COLONY_PALETTES.length);
    for (const { palette } of COLONY_PALETTES) {
      const { background, qrForeground } = colonyMaterials(palette);
      expect((luminance(background) + 0.05) / (luminance(qrForeground) + 0.05)).toBeGreaterThan(7);
    }
  });
});
