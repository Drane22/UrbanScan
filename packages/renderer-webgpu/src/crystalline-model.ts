import { createDioramaLayout } from "./diorama-layout.js";
import type { SeedModel } from "./seed-model.js";

export const CRYSTAL_CLUSTERS = 64;
export type CrystalCluster = {
  readonly position: readonly [number, number];
  readonly scale: number;
  readonly rotation: number;
};
export function createCrystallineLayout(model: SeedModel) {
  const crystalData = createDioramaLayout(model, "crystalline");
  const clusters: CrystalCluster[] = [];
  for (let i = 0; i < CRYSTAL_CLUSTERS; i++) {
    const o = i * 4;
    crystalData[o] = ((i % 8) + 0.5 + crystalData[o]! * 0.65) / 8 - 0.5;
    crystalData[o + 1] = (Math.floor(i / 8) + 0.5 + crystalData[o + 1]! * 0.65) / 8 - 0.5;
    crystalData[o + 2] = Math.fround(crystalData[o + 2]! ** 2 * (i % 13 === 0 ? 1.9 : 0.9));
    clusters.push({
      position: [crystalData[o]!, crystalData[o + 1]!],
      scale: crystalData[o + 2]!,
      rotation: crystalData[o + 3]! * Math.PI * 2,
    });
  }
  return { crystalData, clusters };
}
