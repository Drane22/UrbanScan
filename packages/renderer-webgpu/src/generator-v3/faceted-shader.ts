import { SEED_UNIFORMS_WGSL } from "../shared-shaders.js";
import { DIORAMA_MATERIALS_WGSL } from "../diorama-materials.js";
import { FACET_QR_FIRST_INSTANCE } from "./faceted-mesh.js";

/** Candidate facet worlds share only upload decoding, projection and the clean QR endpoint. */
export function facetedShader(motion: string, material: string): string {
  return /* wgsl */ `
${SEED_UNIFORMS_WGSL}
@group(0) @binding(0) var<uniform> uniforms:Uniforms;
@group(0) @binding(1) var<storage,read> blockTypes:array<u32>;
@group(0) @binding(2) var<storage,read> blockPositions:array<vec4f>;
@group(0) @binding(3) var<storage,read> blockHeights:array<f32>;
@group(0) @binding(4) var<storage,read> worldData:array<vec4f>;
${DIORAMA_MATERIALS_WGSL}
struct FacetOutput {
 @builtin(position) position:vec4f,
 @location(0) world:vec3f,
 @location(1) normal:vec3f,
 @location(2) uv:vec2f,
 @location(3) @interpolate(flat) material:u32,
 @location(4) @interpolate(flat) phase:f32,
 @location(5) @interpolate(flat) owner:u32,
}
${motion}
@vertex fn vertexMain(@builtin(vertex_index) v:u32,@builtin(instance_index) instance:u32)->FacetOutput {
 var o:FacetOutput;o.position=vec4f(2,2,2,1);o.owner=instance;
 let grid=uniforms.gridSize;let size=uniforms.blockSize;
 if(instance>=${FACET_QR_FIRST_INSTANCE}u){
  let owner=instance-${FACET_QR_FIRST_INSTANCE}u;let n=u32(grid);if(owner>=n*n){return o;}
  let corners=array<vec2f,6>(vec2f(0,0),vec2f(0,1),vec2f(1,0),vec2f(1,0),vec2f(0,1),vec2f(1,1));
  let cell=vec2f(f32(owner%n),f32(owner/n));
  let low=select(vec2f(0),vec2f(-4),cell==vec2f(0));
  let high=select(vec2f(1),vec2f(5),cell==vec2f(grid-1.0));
  let local=mix(low,high,corners[v%6u]);
  o.world=vec3f(cell.x+local.x-grid*0.5,0,cell.y+local.y-grid*0.5)*size;
  o.position=worldProject(o.world,1.68,grid*size*0.045);o.uv=local;o.material=99u;o.owner=owner;return o;
 }
 if(uniforms.progress>=0.92){return o;}
 let descriptor=worldData[instance*3u];if(v>=u32(descriptor.y)){return o;}
 let record=u32(descriptor.x)+v*2u;let point=worldData[record];let normal=worldData[record+1u];
 let moved=movePart(point.xyz,normal.xyz,instance);
 var p=moved[0];p.y*=smoothstep(0.05,1.8,uniforms.camera.z)*(1.0-smoothstep(0.08,0.88,uniforms.progress));
 o.world=p*grid*size;o.normal=moved[1];o.phase=normal.w;o.material=u32(point.w);
 o.position=worldProject(o.world,1.68,grid*size*0.045);return o;
}
${material}
@fragment fn fragmentMain(o:FacetOutput)->@location(0) vec4f {
 // Derivatives in faceMaterial are evaluated before the QR branch.
 let color=faceMaterial(o);
 if(o.material==99u){
  if(any(o.uv<vec2f(0))||any(o.uv>vec2f(1))||blockTypes[o.owner]==0u){return vec4f(1);}
  return vec4f(qrModuleMaterial(blockTypes[o.owner],blockPositions[o.owner].xy),1);
 }
 return vec4f(color,1.0-smoothstep(0.60,0.88,uniforms.progress));
}
`;
}
