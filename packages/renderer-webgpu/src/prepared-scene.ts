import { createSeedBlockField, type SeedForm, type SeedModel } from "./seed-model.js";
import { createSeedGpuScene } from "./gpu-scene.js";
import { isStagedWorld } from "./staged-world.js";
import { resolveGeneratorVersion } from "@every-qrcode/core";
import {
  isCandidateWorld,
  prepareCandidateWorld,
  type WorldDrawPlan,
} from "./generator-v3/world-draw.js";

// A model owns its prepared worlds. When the caller evicts a model, all its
// scene arrays are collectible; palette changes never duplicate geometry.
const scenes = new WeakMap<SeedModel, Map<string, Promise<PreparedScene>>>();
type PreparedScene = Awaited<ReturnType<typeof buildScene>>;
export function prepareScene(model: SeedModel, form: SeedForm): Promise<PreparedScene> {
  const key = `${resolveGeneratorVersion(model.generatorVersion)}:${form}`;
  let forms = scenes.get(model);
  if (!forms) {
    forms = new Map();
    scenes.set(model, forms);
  }
  let result = forms.get(key);
  if (!result) {
    result = Promise.resolve().then(() => buildScene(model, form));
    forms.set(key, result);
    const pending = result;
    void result.catch(() => {
      if (forms!.get(key) === pending) forms!.delete(key);
    });
  }
  return result;
}
async function buildScene(model: SeedModel, form: SeedForm) {
  let worldDrawPlan: WorldDrawPlan | undefined;
  const blockField = createSeedBlockField(model, form);
  const scene = createSeedGpuScene(model, form);
  let modelData: Float32Array<ArrayBufferLike> = new Float32Array();
  let cityPartCount = 0;
  let circuitComponentCount = 0;
  let circuitTraceCount = 0;
  let circuitTraceData: Float32Array<ArrayBufferLike> = new Float32Array();
  let reefCoralCount = 0;
  let reefFishCount = 0;
  let reefShelfData: Float32Array<ArrayBufferLike> = new Float32Array();
  let reefCoralData: Float32Array<ArrayBufferLike> = new Float32Array();
  let reefFishData: Float32Array<ArrayBufferLike> = new Float32Array();

  if (model.generatorVersion === 1) {
    if (form === "waves" || form === "crystalline" || form === "mechanical") {
      throw new RangeError(`World ${form} requires generator version 2`);
    }
    const legacy = await import("./generator-v1/prepared-layout.js");
    ({ modelData, cityPartCount } = await legacy.prepareVersionOneLayout(model, form));
  } else if (model.generatorVersion === 3 && isCandidateWorld(form)) {
    const candidate = await prepareCandidateWorld(model, form);
    modelData = candidate.modelData;
    worldDrawPlan = candidate.drawPlan;
  } else if (form === "city") {
    const cityModule = await import("./city-model.js");
    modelData = cityModule.createCityLayout(model).lotData;
    cityPartCount = cityModule.CITY_PARTS_PER_LOT;
  } else if (form === "circuit") {
    const m = await import("./circuit-model.js");
    const circuit = m.createCircuitLayout(model);
    modelData = circuit.componentData;
    circuitTraceData = circuit.traceData;
    circuitComponentCount = circuit.components.length;
    circuitTraceCount = circuit.traces.length;
  } else if (form === "waves") {
    const m = await import("./waves-model.js");
    modelData = m.createWavesLayout(model).waveData;
  } else if (form === "crystalline") {
    const m = await import("./crystalline-model.js");
    modelData = m.createCrystallineLayout(model).crystalData;
  } else if (form === "mechanical") {
    const m = await import("./mechanical-model.js");
    modelData = m.createMechanicalLayout(model).machineData;
  } else if (isStagedWorld(form) || form === "terrain") {
    const { createDioramaLayout } = await import("./diorama-layout.js");
    modelData = createDioramaLayout(model, form);
  } else if (form === "reef") {
    const m = await import("./reef-model.js");
    const reef = m.createReefLayout(model);
    reefShelfData = reef.shelf.shelfData;
    reefCoralData = reef.coralData;
    reefFishData = reef.fishData;
    reefCoralCount = reef.colonies.length;
    reefFishCount = reef.fishPaths.length;
  }

  return {
    ...(worldDrawPlan ? { worldDrawPlan } : {}),
    blockField,
    scene,
    modelData,
    cityPartCount,
    circuitComponentCount,
    circuitTraceCount,
    circuitTraceData,
    reefCoralCount,
    reefFishCount,
    reefShelfData,
    reefCoralData,
    reefFishData,
  };
}
