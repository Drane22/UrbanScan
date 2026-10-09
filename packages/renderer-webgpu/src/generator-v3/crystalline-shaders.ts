import { facetedShader } from "./faceted-shader.js";
import { CRYSTALLINE_MATERIALS_WGSL } from "./crystalline-materials.js";

export const CRYSTALLINE_SHADER = facetedShader(
  `fn movePart(p:vec3f,n:vec3f,instance:u32)->mat2x3f {return mat2x3f(p,n);}`,
  CRYSTALLINE_MATERIALS_WGSL,
);
