import { createDioramaLayout } from "./diorama-layout.js";
import type { SeedModel } from "./seed-model.js";

export const MECHANICAL_STATIONS = 64;
export type MechanicalStation = {
  readonly position: readonly [number, number];
  readonly stroke: number;
  readonly phase: number;
};
export function createMechanicalLayout(model: SeedModel) {
  const machineData = createDioramaLayout(model, "mechanical");
  const stations: MechanicalStation[] = [];
  for (let i = 0; i < MECHANICAL_STATIONS; i++) {
    const o = i * 4;
    machineData[o] = ((i % 8) + 0.5 + machineData[o]! * 0.2) / 8 - 0.5;
    machineData[o + 1] = (Math.floor(i / 8) + 0.5 + machineData[o + 1]! * 0.2) / 8 - 0.5;
    machineData[o + 2] = 0.65 + machineData[o + 2]! * 0.52;
    stations.push({
      position: [machineData[o]!, machineData[o + 1]!],
      stroke: machineData[o + 2]!,
      phase: machineData[o + 3]!,
    });
  }
  return { machineData, stations };
}
