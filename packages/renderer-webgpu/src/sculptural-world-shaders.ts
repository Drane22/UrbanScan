import { SCULPTURAL_POPULATION_WGSL } from "./diorama-population.js";
import { SEED_UNIFORMS_WGSL } from "./shared-shaders.js";
import { STAGED_PROJECTION_WGSL } from "./staged-world-shaders.js";
import { DIORAMA_PRIMITIVES_WGSL } from "./diorama-primitives.js";
import { DIORAMA_MATERIALS_WGSL } from "./diorama-materials.js";
import { DIORAMA_TEXTURES_WGSL } from "./diorama-textures.js";

export {
  SCULPTURE_VERTICES,
  SCULPTURE_PARTS,
  SCULPTURE_AMBIENT_INSTANCES,
} from "./diorama-population.js";

/** Canonical owners, one solid foundation, then a bounded scene-only actor batch. */
export function createSculpturalWorldShader(
  scene: string,
  materialKind = 0,
  cutaway = false,
  transformLayout = false,
): string {
  return /* wgsl */ `
${SEED_UNIFORMS_WGSL}
${STAGED_PROJECTION_WGSL}
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage,read> blockTypes: array<u32>;
@group(0) @binding(2) var<storage,read> blockPositions: array<vec4f>;
@group(0) @binding(3) var<storage,read> blockHeights: array<f32>;
@group(0) @binding(4) var<storage,read> worldData: array<vec4f>;
const PI:f32=3.14159265359;
const MATERIAL_KIND:u32=${materialKind}u;
struct Surface {p:vec3f,color:vec3f,emission:f32,}
struct WorldOutput {
  @builtin(position) position:vec4f,
  @location(0) world:vec3f,
  @location(1) color:vec3f,
  @location(2) uv:vec2f,
  @location(3) emission:f32,
  @location(4) @interpolate(flat) owner:u32,
  @location(5) @interpolate(flat) part:u32,
}
${DIORAMA_PRIMITIVES_WGSL}
${DIORAMA_MATERIALS_WGSL}
${DIORAMA_TEXTURES_WGSL}
${SCULPTURAL_POPULATION_WGSL[materialKind]}
${scene}
fn darkAt(x:i32,y:i32)->bool {
  let n=i32(uniforms.gridSize);
  if(x<0 || y<0 || x>=n || y>=n){return false;}
  return blockTypes[u32(y*n+x)]!=0u;
}
// City/Terrain's exposed-corner rule; connected modules have no gaps.
fn roundedModule(uv:vec2f,owner:u32)->f32 {
  let cell=blockPositions[owner].xy;let x=i32(cell.x);let y=i32(cell.y);
  let neighbors=select(0u,1u,darkAt(x,y-1))|select(0u,2u,darkAt(x+1,y))
    |select(0u,4u,darkAt(x,y+1))|select(0u,8u,darkAt(x-1,y));
  return qrModuleMask(uv,neighbors);
}
@vertex
fn vertexMain(@builtin(vertex_index) v:u32,@builtin(instance_index) instance:u32)->WorldOutput {
  var o:WorldOutput;o.position=vec4f(2,2,2,1);
  let count=u32(uniforms.gridSize*uniforms.gridSize);
  let size=uniforms.blockSize;let scan=phase(0.28,0.96);
  let ambientStart=count*4u+1u;
  if(uniforms.progress>=1.0){
    if(instance>count){return o;}
    let q=quad(v)-vec2f(0.5);o.owner=instance;
    if(instance==count){o.world=vec3f(q.x*(uniforms.gridSize+8.0),-0.045,q.y*(uniforms.gridSize+8.0))*size;o.part=9u;}
    else{let cell=blockPositions[instance].xy+vec2f(0.5)-vec2f(uniforms.gridSize*0.5);o.world=vec3f(cell.x+q.x,0,cell.y+q.y)*size;o.part=0u;}
    o.position=worldProject(o.world,1.68,uniforms.gridSize*size*0.045);o.uv=q+vec2f(0.5);return o;
  }
  if(instance>=ambientStart) {
    let slot=instance-ambientStart;let i=slot/4u;let part=slot%4u;
    if(i>=worldAmbientCount() || uniforms.progress>=0.62){return o;}
    let settled=worldAmbient(v,i,part);
    let build=smoothstep(0.70+gene(i).w*0.35,2.5,uniforms.camera.z);
    let visibility=(1.0-phase(0.05,0.62))*mix(build,1.0,phase(0.0,0.15));
    let anchor=worldAmbient(v,i,4u).p;
    var p=mix(anchor,settled.p,visibility);
    ${transformLayout ? "p=seededFrame(p);" : ""}
    p.x=clamp(p.x,-uniforms.gridSize*0.5,uniforms.gridSize*0.5);
    p.z=clamp(p.z,-uniforms.gridSize*0.5,uniforms.gridSize*0.5);
    o.world=p*size;o.position=worldProject(o.world,1.68,uniforms.gridSize*size*0.045);
    o.color=settled.color;o.emission=settled.emission;o.owner=0u;o.part=8u;
    o.uv=squarePoint(v)+vec2f(0.5);return o;
  }
  if(instance==count*4u) {
    // The opaque quiet-zone slab grows from the world's own square foundation.
    let foundation=worldFoundation(v);let q=squarePoint(v)*2.0;
    let edge=box(v,vec3f(uniforms.gridSize+8.0,0.0,uniforms.gridSize+8.0));
    let destination=edge-vec3f(0,0.045,0);
    let build=smoothstep(0.0,0.5,uniforms.camera.z);
    let p=mix(foundation.p*mix(build,1.0,phase(0.0,0.15)),destination,scan);
    o.world=p*size;o.position=worldProject(o.world,1.68,uniforms.gridSize*size*0.045);
    o.color=foundation.color;o.emission=foundation.emission;o.owner=count;o.part=9u;
    o.uv=q;return o;
  }
  let owner=instance/4u;let part=instance%4u;
  let population=min(worldCount(),count);let sceneOwner=owner%population;
  let g=gene(sceneOwner);let detail=1.0-phase(0.12+f32(part)*0.02,0.55+f32(part)*0.025);
  if(part>0u && (owner>=population || detail<=0.0)){return o;}
  if(part==0u && owner>=population && scan<=0.0){return o;}
  let settled=worldSurface(v,sceneOwner,part);let anchor=worldAnchor(sceneOwner);
  let delay=0.18+g.w*0.6+f32(part)*0.12;
  let build=mix(smoothstep(delay,delay+1.15,uniforms.camera.z),1.0,phase(0.0,0.22));
  let presence=select(scan,1.0,owner<population);
  let scale=build*presence*select(1.0,detail,part>0u);
  var p=mix(anchor,settled.p,scale);let q=squarePoint(v);
  ${transformLayout ? "p=seededFrame(p);" : ""}
  if(part==0u){
    let cell=blockPositions[owner].xy+vec2f(0.5)-vec2f(uniforms.gridSize*0.5);
    p=mix(p,vec3f(cell.x+q.x,0.0,cell.y+q.y),scan);
  }
  p.x=clamp(p.x,-uniforms.gridSize*0.5,uniforms.gridSize*0.5);
  p.z=clamp(p.z,-uniforms.gridSize*0.5,uniforms.gridSize*0.5);
  o.world=p*size;o.position=worldProject(o.world,1.68,uniforms.gridSize*size*0.045);
  o.color=settled.color;o.emission=settled.emission;
  o.uv=q+vec2f(0.5);o.owner=owner;o.part=part;return o;
}
@fragment
fn fragmentMain(o:WorldOutput)->@location(0) vec4f {
  let scan=phase(0.58,0.98);let paper=qrPaper();
  if(uniforms.progress>=1.0){
    if(o.part==9u){return vec4f(paper,1);}
    let coverage=f32(blockTypes[o.owner]!=0u)*roundedModule(o.uv,o.owner);
    return vec4f(mix(paper,qrModuleMaterial(blockTypes[o.owner],blockPositions[o.owner].xy),coverage),1);
  } else {
  let n=normalize(cross(dpdx(o.world),dpdy(o.world))+vec3f(0.000001));
  let light=0.55+abs(dot(n,normalize(vec3f(-0.45,0.85,-0.35))))*0.45;
  let coord=o.world/uniforms.blockSize;
  let grain=fract(sin(dot(coord.xz,vec2f(37.1,61.7)))*43758.5);
  let texture=0.96+grain*0.08;
  let material=dioramaTexture(o.color,coord,n,o.uv,o.part);
  ${
    cutaway
      ? `// Recessed chambers cut through the foundation top, then close during reveal.
  if(o.part==9u && abs(n.y)>0.9 && uniforms.progress<0.4){
    if(worldCutout(coord)>phase(0.05,0.4)){discard;}
  }`
      : ""
  }
  var color=material*mix(light*texture,1.10,clamp(o.emission,0.0,1.0));
  color+=vec3f(pow(max(abs(n.y),0.0),12.0)*o.emission*0.06);
  if(o.part==9u){color=mix(color,paper,scan);}
  else if(o.part==0u){
    let coverage=f32(blockTypes[o.owner]!=0u)*roundedModule(o.uv,o.owner);
    let cell=blockPositions[o.owner].xy;
    let ink=qrModuleMaterial(blockTypes[o.owner],cell);
    color=mix(color,mix(paper,ink,coverage),scan);
  }
  return vec4f(clamp(color,vec3f(0),vec3f(1)),1.0);
  }
}
`;
}
