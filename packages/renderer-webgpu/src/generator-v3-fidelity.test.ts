import { createHash } from "node:crypto";
import { createEveryQRCodeIdentity } from "@every-qrcode/core";
import { expect, it } from "vitest";
import { createSeedModel } from "./seed-model";
import { prepareScene } from "./prepared-scene";
import { loadSeedShaderSources } from "./renderer";

it("freezes the phase 7 Mechanical geometry and shader checkpoint", async () => {
  const identity = await createEveryQRCodeIdentity("https://example.com/versioned-world");
  const model = await createSeedModel(identity, { generatorVersion: 3 });
  const prepared = await prepareScene(model, "mechanical");
  const sha = (data: string | Uint8Array) => createHash("sha256").update(data).digest("hex");
  expect({
    shader: sha(JSON.stringify(await loadSeedShaderSources("mechanical", 3))),
    layout: sha(new Uint8Array(prepared.modelData.buffer)),
    plan: prepared.worldDrawPlan,
  }).toMatchSnapshot();
});

it("freezes the phase 5 Waves ocean geometry and shader checkpoint", async () => {
  const identity = await createEveryQRCodeIdentity("https://example.com/versioned-world");
  const model = await createSeedModel(identity, { generatorVersion: 3 });
  const prepared = await prepareScene(model, "waves");
  const sha = (data: string | Uint8Array) => createHash("sha256").update(data).digest("hex");
  expect({
    shader: sha(JSON.stringify(await loadSeedShaderSources("waves", 3))),
    layout: sha(new Uint8Array(prepared.modelData.buffer)),
    plan: prepared.worldDrawPlan,
  }).toMatchSnapshot();
});

it("freezes the phase 6 Crystalline facet geometry and shader checkpoint", async () => {
  const identity = await createEveryQRCodeIdentity("https://example.com/versioned-world");
  const model = await createSeedModel(identity, { generatorVersion: 3 });
  const prepared = await prepareScene(model, "crystalline");
  const sha = (data: string | Uint8Array) => createHash("sha256").update(data).digest("hex");
  expect({
    shader: sha(JSON.stringify(await loadSeedShaderSources("crystalline", 3))),
    layout: sha(new Uint8Array(prepared.modelData.buffer)),
    plan: prepared.worldDrawPlan,
  }).toMatchSnapshot();
});
