import { createDioramaLayout } from "./diorama-layout.js";
import type { SeedModel } from "./seed-model.js";

export const WAVE_RIBBONS = 12;
export type WaveRibbon = {
  readonly offset: readonly [number, number];
  readonly scale: number;
  readonly phase: number;
};
export function createWavesLayout(model: SeedModel) {
  const waveData = createDioramaLayout(model, "waves");
  const ribbons: WaveRibbon[] = [];
  for (let i = 0; i < WAVE_RIBBONS; i++) {
    const o = i * 4;
    waveData[o] = waveData[o]! * 0.14;
    waveData[o + 1] = (i + 0.5) / WAVE_RIBBONS - 0.5 + waveData[o + 1]! * 0.026;
    waveData[o + 2] = 0.7 + waveData[o + 2]! * 0.65;
    ribbons.push({
      offset: [waveData[o]!, waveData[o + 1]!],
      scale: waveData[o + 2]!,
      phase: waveData[o + 3]!,
    });
  }
  return { waveData, ribbons };
}
