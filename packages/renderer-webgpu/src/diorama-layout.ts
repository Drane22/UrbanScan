import type { SeedForm, SeedModel } from "./seed-model.js";

export const DIORAMA_RECORDS = 768;

/** Scene-only genes, derived from the actual QR payload rather than the site's family seed. */
export function createDioramaLayout(model: SeedModel, form: SeedForm): Float32Array {
  const salt = Array.from(form).reduce((value, c) => (value * 31 + c.charCodeAt(0)) >>> 0, 73);
  // morphSeed deliberately groups pages from one site. The ordered active-cell
  // indices retain the complete encoded link, including its path and query.
  let state = (salt ^ model.qrSize) >>> 0;
  for (const module of model.modules) state = Math.imul(state ^ module.index, 16777619) >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const data = new Float32Array(DIORAMA_RECORDS * 4);
  for (let i = 0; i < DIORAMA_RECORDS; i++) {
    data.set(
      [
        (next() - 0.5) * 0.82,
        (next() - 0.5) * 0.82,
        0.65 + next() * 0.6,
        next(),
      ],
      i * 4,
    );
  }
  return data;
}
