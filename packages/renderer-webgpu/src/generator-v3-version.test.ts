import { createEveryQRCodeIdentity } from "@every-qrcode/core";
import { expect, it } from "vitest";
import { prepareScene } from "./prepared-scene";
import { loadSeedShaderSources } from "./renderer";
import { createSeedModel, type SeedForm } from "./seed-model";
import { selectWorldPalette } from "./staged-world";

const forms = [
  "city",
  "circuit",
  "colony",
  "constellation",
  "dungeon",
  "mycelium",
  "origami",
  "reef",
  "stained-glass",
  "terrain",
  "toy-block",
  "tree",
  "waves",
  "crystalline",
  "mechanical",
] satisfies SeedForm[];
it.each(forms)(
  "dispatches candidate %s and restores version 2 without palette or geometry mutation",
  async (form) => {
    const identity = await createEveryQRCodeIdentity("https://example.com/versioned-world");
    const old = await createSeedModel(identity, { generatorVersion: 2 });
    const next = await createSeedModel(identity, { generatorVersion: 3 });
    expect(next).toEqual({ ...old, generatorVersion: 3 });
    const before = await prepareScene(old, form);
    const shader = await loadSeedShaderSources(form, 2);
    const candidate = await prepareScene(next, form);
    if (["waves", "crystalline", "mechanical"].includes(form))
      expect(candidate.modelData).not.toEqual(before.modelData);
    else expect(candidate.modelData).toEqual(before.modelData);
    expect(candidate.modelData).not.toBe(before.modelData);
    const changed = ["waves", "crystalline", "mechanical"].includes(form);
    if (changed) {
      expect(candidate.worldDrawPlan?.form).toBe(form);
      expect(await loadSeedShaderSources(form, 3)).not.toEqual(shader);
      await expect(loadSeedShaderSources(form, 1)).rejects.toThrow("requires generator version 2");
      await expect(
        prepareScene(await createSeedModel(identity, { generatorVersion: 1 }), form),
      ).rejects.toThrow("requires generator version 2");
    } else {
      expect(candidate.worldDrawPlan).toBeUndefined();
      expect(await loadSeedShaderSources(form, 3)).toEqual(shader);
    }
    expect(selectWorldPalette(form, next.morphSeed)).toEqual(
      selectWorldPalette(form, old.morphSeed),
    );
    expect(await prepareScene(next, form)).toBe(candidate);
    expect(await prepareScene(old, form)).toBe(before);
    expect(await loadSeedShaderSources(form)).toEqual(shader);
  },
);
it("rejects unknown versions at seed, layout, and shader boundaries", async () => {
  const identity = await createEveryQRCodeIdentity("example.com");
  // Exercise JavaScript callers bypassing the compile-time union.
  await expect(createSeedModel(identity, { generatorVersion: 4 as never })).rejects.toThrow(
    "Unsupported generator version",
  );
  await expect(loadSeedShaderSources("waves", 4 as never)).rejects.toThrow(
    "Unsupported generator version",
  );
  const model = await createSeedModel(identity);
  expect(() => prepareScene({ ...model, generatorVersion: 4 as never }, "waves")).toThrow(
    "Unsupported generator version",
  );
});
