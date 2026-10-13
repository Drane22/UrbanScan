import { SCULPTURAL_POPULATION_WGSL, SCULPTURE_AMBIENT_INSTANCES } from "./diorama-population.js";
import { SEED_UNIFORMS_WGSL } from "./shared-shaders.js";
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
  let size=uniforms.blockSize;
  let ambientStart=count*4u+1u;
  let qrStart=ambientStart+${SCULPTURE_AMBIENT_INSTANCES}u;
  if(instance>=qrStart){
    let owner=instance-qrStart;if(owner>=count || blockTypes[owner]==0u){return o;}
    let q=quad(v)-vec2f(0.5);o.owner=owner;
    let cell=blockPositions[owner].xy+vec2f(0.5)-vec2f(uniforms.gridSize*0.5);
    o.world=vec3f(cell.x+q.x,0,cell.y+q.y)*size;o.part=10u;
    o.position=worldProject(o.world,1.68,uniforms.gridSize*size*0.045);o.uv=q+vec2f(0.5);return o;
  }
  if(instance>=ambientStart) {
    let slot=instance-ambientStart;let i=slot/4u;let part=slot%4u;
    if(i>=worldAmbientCount() || treeFoliageVisibility()<0.001){return o;}
    ${materialKind === 3 ? "if(v>=glassVertexCount(i,part,true)){return o;}" : ""}
    let settled=worldAmbient(v,i,part);
    let build=smoothstep(0.70+gene(i).w*0.35,2.5,uniforms.camera.z);
    let visibility=mix(build,1.0,phase(0.0,0.15));
    let anchor=worldAmbient(v,i,4u).p;
    var p=mix(anchor,settled.p,visibility);
    ${transformLayout ? "p=seededFrame(p);" : ""}
    p.x=clamp(p.x,-uniforms.gridSize*0.5,uniforms.gridSize*0.5);
    p.z=clamp(p.z,-uniforms.gridSize*0.5,uniforms.gridSize*0.5);
    p.y*=1.0-phase(0.08,1.0);
  o.world=p*size;o.position=worldProject(o.world,1.68,uniforms.gridSize*size*0.045);
    o.color=settled.color;o.emission=settled.emission;o.owner=0u;o.part=8u;
    o.uv=squarePoint(v)+vec2f(0.5);return o;
  }
  if(instance==count*4u) {
    let foundation=worldFoundation(v);
    let build=smoothstep(0.0,0.5,uniforms.camera.z);
    var p=foundation.p*mix(build,1.0,phase(0.0,0.15));
    p.y*=1.0-phase(0.08,1.0);
  o.world=p*size;o.position=worldProject(o.world,1.68,uniforms.gridSize*size*0.045);
    o.color=foundation.color;o.emission=foundation.emission;o.owner=count;o.part=9u;
    o.uv=squarePoint(v)*2.0;return o;
  }
  let owner=instance/4u;let part=instance%4u;
  let population=min(worldCount(),count);if(owner>=population){return o;}
  let g=gene(owner);let visibility=1.0;
  if(visibility<0.001){return o;}
  ${materialKind === 3 ? "if(v>=glassVertexCount(owner,part,false)){return o;}" : ""}
  let settled=worldSurface(v,owner,part);let anchor=worldAnchor(owner);
  let delay=0.18+g.w*0.6+f32(part)*0.12;
  let build=mix(smoothstep(delay,delay+1.15,uniforms.camera.z),1.0,phase(0.0,0.22));
  // Living surfaces stay at their own anchors, as Tree's leaves and branches do.
  var p=mix(anchor,settled.p,build*visibility);let q=squarePoint(v);
  ${transformLayout ? "p=seededFrame(p);" : ""}
  p.x=clamp(p.x,-uniforms.gridSize*0.5,uniforms.gridSize*0.5);
  p.z=clamp(p.z,-uniforms.gridSize*0.5,uniforms.gridSize*0.5);
  p.y*=1.0-phase(0.08,1.0);
  o.world=p*size;o.position=worldProject(o.world,1.68,uniforms.gridSize*size*0.045);
  o.color=settled.color;o.emission=settled.emission;
  o.uv=${materialKind === 3 ? "glassUv(v,owner)" : "q+vec2f(0.5)"};o.owner=owner;o.part=part;return o;
}
@fragment
fn fragmentMain(o:WorldOutput)->@location(0) vec4f {
  let n=normalize(cross(dpdx(o.world),dpdy(o.world))+vec3f(0.000001));
  let coord=o.world/uniforms.blockSize;
  let material=dioramaTexture(o.color,coord,n,o.uv,o.part);
  if(o.part==10u){
    let coverage=f32(blockTypes[o.owner]!=0u)*roundedModule(o.uv,o.owner);
    if(coverage<0.5){discard;}
    return vec4f(qrModuleMaterial(blockTypes[o.owner],blockPositions[o.owner].xy),1);
  } else {
  let grain=fract(sin(dot(coord.xz,vec2f(37.1,61.7)))*43758.5);
  let texture=0.96+grain*0.08;
  ${
    cutaway
      ? `// Recessed chambers cut through the foundation top, then close during reveal.
  if(o.part==9u && abs(n.y)>0.9 && uniforms.progress<0.4){
    if(worldCutout(coord)>phase(0.05,0.4)){discard;}
  }`
      : ""
  }
  let key=${materialKind === 5 ? "normalize(solarCenter()+vec3f(0,5.0*uniforms.gridSize/25.0,0)-coord+vec3f(0.0001))" : "normalize(vec3f(-0.45,0.85,-0.35))"};
  let lit=dioramaLighting(material,coord,n,o.part,key)*texture;
  var color=mix(lit,material*1.10,clamp(o.emission,0.0,1.0));
  color+=vec3f(pow(max(abs(n.y),0.0),12.0)*o.emission*0.06);
  if(uniforms.appearance.x>0.5){
    let peak=max(max(material.r,material.g),max(material.b,0.001));
    let luminous=mix(material/peak,vec3f(0.85,0.91,1),0.22);
    let rim=pow(1.0-abs(dot(n,treeViewDirection())),3.0);
    if(MATERIAL_KIND==1u){
      // Cold stone, warm torch pools and bright enchanted crystals.
      color=mix(vec3f(0.045,0.052,0.075),lit,0.45);
      let torch=pow(max(0.0,sin(coord.x*0.49)*cos(coord.z*0.49)),8.0);
      color+=vec3f(0.40,0.17,0.045)*torch*max(n.y,0.0);
      color=mix(color,luminous*1.15,smoothstep(0.3,0.85,o.emission));
    }else if(MATERIAL_KIND==2u){
      // Folded lantern paper; the garden bed remains charcoal.
      let raised=smoothstep(0.3,2.0,coord.y);
      color=lit*0.38+luminous*(raised*0.40+rim*raised*0.48);
      color+=vec3f(0.65,0.55,1.0)*smoothstep(0.2,0.32,o.emission)*0.30;
    }else if(MATERIAL_KIND==3u){
      // Colored panes emit light; lead and masonry stay dark.
      let pane=smoothstep(0.10,0.22,o.emission)*mix(0.18,1.0,smoothstep(0.2,1.0,coord.y));
      color=lit*0.38+luminous*pane*(0.68+rim*0.22);
    }else if(MATERIAL_KIND==5u){
      // A black observatory with self-lit stars, sun and orbital tracks.
      color=lit*0.48+luminous*(0.12+pow(o.emission,2.0)*0.95+rim*0.28);
      if(o.part==9u){color=vec3f(0.018,0.022,0.035);}
    }else if(MATERIAL_KIND==6u){
      // Translucent glow bricks: colored bodies and luminous raised studs.
      let raised=smoothstep(0.25,1.2,coord.y);
      let stud=select(0.0,0.68,o.part==1u || o.part==2u);
      color=lit*0.48+luminous*raised*(0.24+stud+rim*0.38);
    }
    if(o.part==9u && MATERIAL_KIND!=5u){color=mix(vec3f(0.035,0.038,0.052),color,0.35);}
  }
  return vec4f(clamp(color,vec3f(0),vec3f(1)),1);

  }
}
`;
}
