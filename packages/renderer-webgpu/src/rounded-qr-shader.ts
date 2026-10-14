import { SEED_UNIFORMS_WGSL } from "./shared-shaders.js";
import { DIORAMA_MATERIALS_WGSL } from "./diorama-materials.js";

/** One upright, connected, exposed-corner QR field for every current world. */
export const ROUNDED_QR_SHADER = /* wgsl */ `
${SEED_UNIFORMS_WGSL}
${DIORAMA_MATERIALS_WGSL}
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage,read> blockTypes: array<u32>;
@group(0) @binding(2) var<storage,read> blockPositions: array<vec4f>;
@group(0) @binding(4) var<storage,read> baseY: array<f32>;
struct Output {
 @builtin(position) position: vec4f,
 @location(0) uv: vec2f,
 @location(1) cell: vec2f,
 @location(2) @interpolate(flat) neighbors: u32,
}
@vertex fn vertexMain(@builtin(vertex_index) v:u32,@builtin(instance_index) owner:u32)->Output {
 var o:Output;o.position=vec4f(2,2,2,1);
 if(blockTypes[owner]==0u || baseY[owner]!=0.0){return o;}
 let corners=array<vec2f,6>(vec2f(0,0),vec2f(1,0),vec2f(0,1),vec2f(0,1),vec2f(1,0),vec2f(1,1));
 o.uv=corners[v];o.cell=blockPositions[owner].xy;o.neighbors=u32(blockPositions[owner].w);
 let point=o.cell+o.uv-vec2f(uniforms.gridSize*0.5);
 let flat=vec4f(point.x/max(uniforms.aspectRatio,1.0),-point.y/max(1.0/uniforms.aspectRatio,1.0),0,1);
 let scale=uniforms.appearance.z/(uniforms.gridSize+8.0);
 let posed=worldProject(vec3f(point.x,0,-point.y)*uniforms.blockSize,1.68,0.0);
 o.position=mix(posed,vec4f(flat.xy*scale,0,1),smoothstep(0.58,1.0,uniforms.progress));
 return o;
}
@fragment fn fragmentMain(o:Output)->@location(0) vec4f {
 if(qrModuleMask(o.uv,o.neighbors)<0.5){discard;}
 // Coordinates choose the same mosaic in every world; semantic block roles do not.
 return vec4f(qrModuleMaterial(1u,o.cell),1);
}
`;
