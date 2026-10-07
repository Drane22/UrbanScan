import { TREE_MORPH_WGSL } from "./tree-morph.js";

export const STAGED_PROJECTION_WGSL = /* wgsl */ `
${TREE_MORPH_WGSL}
fn worldProject(p:vec3f,worldScale:f32,lift:f32)->vec4f {
 let denominator=(uniforms.gridSize+10.0)*uniforms.blockSize;
 let portrait=mix(select(1.0,1.2,uniforms.aspectRatio<0.8),1.0,uniforms.progress);
 let zoom=mix(uniforms.camera.x,min(uniforms.camera.x,1.0),uniforms.progress);
 return treeCameraView(p,worldScale/denominator,1.90/denominator,
  vec2f(0,-lift),vec2f(0),portrait,zoom);
}
`;
