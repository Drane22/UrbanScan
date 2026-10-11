import type { EveryQRCodeModel } from "@every-qrcode/react";
import {
  getDefaultPaletteForModel,
  getPalettesForModel,
} from "@every-qrcode/renderer-webgpu/world-options";
import { WORLD_CATALOG } from "./world-catalog";
import { PUBLIC_SITE_ORIGIN } from "./site-metadata";

export type Experience = { url: string; model: EveryQRCodeModel; paletteId: string };

function destination(value: string): string {
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol) || !url.hostname || url.username || url.password)
    throw new Error("Use a public http or https destination without a username or password.");
  return url.href;
}

/** The fragment carries the destination and design without a database or redirect service. */
export function createExperienceURL(experience: Experience): string {
  const parameters = new URLSearchParams({
    u: destination(experience.url),
    w: experience.model,
    p: experience.paletteId,
    v: "3",
  });
  return PUBLIC_SITE_ORIGIN + "/go.html#" + parameters.toString();
}

export function readExperience(hash: string): Experience {
  const parameters = new URLSearchParams(hash.replace(/^#/, ""));
  const world = WORLD_CATALOG.find((item) => item.id === parameters.get("w"));
  if (!world || parameters.get("v") !== "3") throw new Error("This world link is incomplete.");
  const palette = getPalettesForModel(world.id).find((item) => item.id === parameters.get("p"));
  return {
    url: destination(parameters.get("u") ?? ""),
    model: world.id,
    paletteId: (palette ?? getDefaultPaletteForModel(world.id)).id,
  };
}
