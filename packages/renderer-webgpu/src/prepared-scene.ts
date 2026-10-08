import { createSeedBlockField, type SeedForm, type SeedModel } from "./seed-model.js";
import { createSeedGpuScene } from "./gpu-scene.js";
import { isStagedWorld } from "./staged-world.js";

// A model owns its prepared worlds. When the caller evicts a model, all its
// scene arrays are collectible; palette changes never duplicate geometry.
const scenes = new WeakMap<SeedModel, Map<SeedForm, Promise<PreparedScene>>>();
type PreparedScene = Awaited<ReturnType<typeof buildScene>>;
export function prepareScene(model: SeedModel, form: SeedForm): Promise<PreparedScene> {
  let forms = scenes.get(model);
  if (!forms) {
    forms = new Map();
    scenes.set(model, forms);
  }
  let result = forms.get(form);
  if (!result) {
    result = Promise.resolve().then(() => buildScene(model, form));
    forms.set(form, result);
    const pending = result;
    void result.catch(() => {
      if (forms!.get(form) === pending) forms!.delete(form);
    });
  }
  return result;
}
async function buildScene(model: SeedModel, form: SeedForm) {
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

  if (form === "city") {
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
