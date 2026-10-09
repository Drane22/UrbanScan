import type { CandidateWorld } from "./world-draw.js";

/** Candidate dispatch never changes historical shader generation. */
export async function loadCandidateWorldShader(form: CandidateWorld): Promise<string> {
  if (form === "waves") return (await import("./waves-shaders.js")).WAVES_SHADER;
  if (form === "crystalline") return (await import("./crystalline-shaders.js")).CRYSTALLINE_SHADER;
  return (await import("./mechanical-shaders.js")).MECHANICAL_SHADER;
}
