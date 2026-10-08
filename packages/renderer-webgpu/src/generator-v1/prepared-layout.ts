import type { SeedModel, SeedForm } from "../seed-model.js";
export async function prepareVersionOneLayout(model: SeedModel, form: SeedForm) {
  let modelData: Float32Array<ArrayBufferLike> = new Float32Array();
  let cityPartCount = 0;
  if (form === "city") {
    const cityModule = await import("./city-model.js");
    modelData = cityModule.createCityLayout(model).lotData;
    cityPartCount = cityModule.CITY_PARTS_PER_LOT;
  } else if (form === "circuit") {
    const m = await import("./circuit-model.js");
    modelData = m.createCircuitLayout(model).cellData;
    cityPartCount = 2;
  } else if (form === "constellation") {
    const m = await import("./constellation-model.js");
    modelData = m.createConstellationLayout(model).starData;
    cityPartCount = 2;
  } else if (form === "origami") {
    const m = await import("./origami-model.js");
    modelData = m.createOrigamiLayout(model).panelData;
    cityPartCount = 1;
  } else if (form === "stained-glass") {
    const m = await import("./stained-glass-model.js");
    modelData = m.createGlassLayout(model).paneData;
    cityPartCount = 1;
  } else if (form === "colony") {
    const m = await import("./colony-model.js");
    modelData = m.createColonyLayout(model).moduleData;
    cityPartCount = 2;
  } else if (form === "dungeon") {
    const m = await import("./dungeon-model.js");
    modelData = m.createDungeonLayout(model).tileData;
    cityPartCount = 2;
  } else if (form === "toy-block") {
    const m = await import("./toy-block-model.js");
    modelData = m.createToyBlockLayout(model).blockData;
    cityPartCount = 2;
  } else if (form === "mycelium") {
    const m = await import("./mycelium-model.js");
    modelData = m.createMyceliumLayout(model).fungalData;
    cityPartCount = 2;
  } else if (form === "reef") {
    const m = await import("./reef-model.js");
    modelData = m.createReefLayout(model).reefData;
    cityPartCount = 2;
  }

  return { modelData, cityPartCount };
}
