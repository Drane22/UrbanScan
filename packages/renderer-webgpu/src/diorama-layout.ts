import type { SeedForm, SeedModel } from "./seed-model.js";
import { seededRandom } from "./world-dna.js";

export const DIORAMA_RECORDS = 768;

/** Scene-only genes: normalized X/Z placement, size, and motion phase. */
export function createDioramaLayout(model: SeedModel, form: SeedForm): Float32Array {
  const salt = Array.from(form).reduce((value, c) => (value * 31 + c.charCodeAt(0)) >>> 0, 73);
  const data = new Float32Array(DIORAMA_RECORDS * 4);
  for (let i = 0; i < DIORAMA_RECORDS; i++) {
    data.set(
      [
        (seededRandom(model.morphSeed, i, 0, salt) - 0.5) * 0.82,
        (seededRandom(model.morphSeed, i, 1, salt) - 0.5) * 0.82,
        0.65 + seededRandom(model.morphSeed, i, 2, salt) * 0.6,
        seededRandom(model.morphSeed, i, 3, salt),
      ],
      i * 4,
    );
  }
  return data;
}
