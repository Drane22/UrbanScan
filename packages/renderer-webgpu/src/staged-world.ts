import type { SeedForm } from "./seed-model.js";
import { getPalettesForModel, type WorldPalettePreset } from "./world-palettes.js";
import { selectColonyPalette } from "./colony-palette.js";
import { seededRandom } from "./world-dna.js";

/** Only completed opt-in worlds use scene-age construction; reference worlds are unchanged. */
export function isStagedWorld(form: SeedForm): boolean {
  return (
    form === "colony" ||
    form === "dungeon" ||
    form === "origami" ||
    form === "stained-glass" ||
    form === "mycelium" ||
    form === "constellation" ||
    form === "toy-block" ||
    form === "waves" ||
    form === "crystalline" ||
    form === "mechanical"
  );
}
export function selectWorldPalette(form: SeedForm, seed: number): WorldPalettePreset {
  if (form === "colony") return selectColonyPalette(seed);
  // The original four families remain the deterministic default pool.
  // Supplemental palettes are manual choices, so existing links keep their look.
  const families = getPalettesForModel(form).slice(0, 4);
  // Each form has its own curated material families and independent selection salt.
  const salt =
    Array.from(form).reduce((value, letter) => value * 31 + letter.charCodeAt(0), 17) >>> 0;
  return families[Math.floor(seededRandom(seed, 97, 0, salt) * families.length)]!;
}
