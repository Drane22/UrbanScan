import { SEED_UNIFORMS_WGSL } from "./shared-shaders.js";
import { STAGED_PROJECTION_WGSL } from "./staged-world-shaders.js";

export const SCULPTURE_VERTICES = 192;
export const SCULPTURE_PARTS = 4;

/** Shared mesh primitives and reveal ownership; each world supplies its own scene. */
export function createSculpturalWorldShader(scene: string): string {
  return /* wgsl */ `
${SEED_UNIFORMS_WGSL}
${STAGED_PROJECTION_WGSL}
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> blockTypes: array<u32>;
@group(0) @binding(2) var<storage, read> blockPositions: array<vec4f>;
@group(0) @binding(3) var<storage, read> blockHeights: array<f32>;
@group(0) @binding(4) var<storage, read> worldData: array<vec4f>;

const PI: f32 = 3.14159265359;
struct Surface {
  p: vec3f,
  color: vec3f,
  emission: f32,
}
struct WorldOutput {
  @builtin(position) position: vec4f,
  @location(0) world: vec3f,
  @location(1) color: vec3f,
  @location(2) uv: vec2f,
  @location(3) emission: f32,
  @location(4) @interpolate(flat) owner: u32,
  @location(5) @interpolate(flat) part: u32,
}
fn phase(a: f32, b: f32) -> f32 { return smoothstep(a,b,uniforms.progress); }
fn random(n: f32) -> f32 {
  let salt = worldData[0].w * 0.013 + worldData[min(17u,arrayLength(&worldData)-1u)].w * 0.007;
  return fract(sin(n*127.1+salt)*43758.5453);
}
fn palette(n: f32) -> vec3f {
  let index = u32(n) % 4u;
  if (index == 0u) { return uniforms.themePrimary.rgb; }
  if (index == 1u) { return uniforms.themeSecondary.rgb; }
  if (index == 2u) { return uniforms.themeThird.rgb; }
  return uniforms.themeFourth.rgb;
}
fn surface(p: vec3f, color: vec3f, emission: f32) -> Surface {
  return Surface(p,color,emission);
}
fn rotate(p: vec3f, a: f32) -> vec3f {
  return vec3f(p.x*cos(a)-p.z*sin(a),p.y,p.x*sin(a)+p.z*cos(a));
}
fn quad(vertex: u32) -> vec2f {
  let q = array<vec2f,6>(vec2f(0,0),vec2f(1,0),vec2f(0,1),vec2f(0,1),vec2f(1,0),vec2f(1,1));
  return q[vertex%6u];
}
// Eight sectors, four profile bands: a continuous surface with a stable UV map.
fn disk(vertex: u32) -> vec2f {
  let uv = quad(vertex);
  let angle = (f32((vertex/6u)%8u)+uv.x)*PI*0.25;
  let radius = (f32(vertex/48u)+uv.y)*0.25;
  return vec2f(cos(angle),sin(angle))*radius;
}
fn squarePoint(vertex: u32) -> vec2f {
  let d = disk(vertex);
  let radius = length(d);
  return d / max(max(abs(d.x),abs(d.y)),0.00001) * radius * 0.5;
}
fn sphere(vertex: u32, size: vec3f) -> vec3f {
  let uv = quad(vertex);
  let angle = (f32((vertex/6u)%8u)+uv.x)*PI*0.25;
  let latitude = (f32(vertex/48u)+uv.y)*PI*0.25;
  return vec3f(cos(angle)*sin(latitude),cos(latitude),sin(angle)*sin(latitude))*size;
}
fn ring(vertex: u32, radius: f32, tube: f32) -> vec3f {
  let uv = quad(vertex);
  let angle = (f32((vertex/6u)%8u)+uv.x)*PI*0.25;
  let crossAngle = (f32(vertex/48u)+uv.y)*PI*0.5;
  let r = radius+cos(crossAngle)*tube;
  return vec3f(cos(angle)*r,sin(crossAngle)*tube,sin(angle)*r);
}
fn cylinder(vertex: u32, radius: f32, height: f32) -> vec3f {
  let uv = quad(vertex);
  let angle = (f32((vertex/6u)%8u)+uv.x)*PI*0.25;
  let band = vertex/48u;
  let radii = array<f32,5>(0.0,1.0,1.0,0.0,0.0);
  let ys = array<f32,5>(1.0,1.0,0.0,0.0,0.0);
  let r = mix(radii[band],radii[band+1u],uv.y)*radius;
  return vec3f(cos(angle)*r,mix(ys[band],ys[band+1u],uv.y)*height,sin(angle)*r);
}
fn box(vertex: u32, size: vec3f) -> vec3f {
  // Subdivide the top into a radial fan; the outer profile supplies four sides.
  let uv = quad(vertex);
  let band = vertex/48u;
  let q = squarePoint(vertex);
  let y = select(size.y,size.y*(1.0-uv.y),band==3u);
  let edge = q/max(max(abs(q.x),abs(q.y)),0.00001)*0.5;
  let footprint = select(q/0.75,edge,band==3u);
  return vec3f(footprint.x*size.x,y,footprint.y*size.z);
}
fn bridge(vertex: u32, a: vec3f, b: vec3f, width: f32) -> vec3f {
  let p = cylinder(vertex,width,length(b-a));
  let direction = normalize(b-a+vec3f(0.000001));
  let side = normalize(cross(direction,vec3f(0.01,1.0,0.0)));
  return a+side*p.x+direction*p.y+cross(side,direction)*p.z;
}
fn spiral(index: u32, count: f32, radius: f32) -> vec3f {
  let a = f32(index)*2.39996323;
  let r = sqrt((f32(index)+0.5)/count)*radius;
  return vec3f(cos(a)*r,0.0,sin(a)*r);
}
${scene}

fn darkAt(x: i32, y: i32) -> bool {
  let n=i32(uniforms.gridSize);
  if(x<0 || y<0 || x>=n || y>=n) { return false; }
  return blockTypes[u32(y*n+x)]!=0u;
}
// Same exposed-corner rule and radius as City, retained at the exact endpoint.
fn roundedModule(uv: vec2f, owner: u32) -> f32 {
  let cell=blockPositions[owner].xy;
  let x=i32(cell.x); let y=i32(cell.y);
  let up=darkAt(x,y-1); let right=darkAt(x+1,y);
  let down=darkAt(x,y+1); let left=darkAt(x-1,y);
  let radius=0.46;
  var center=uv;
  if(!left && !up && uv.x<radius && uv.y<radius) {center=vec2f(radius);}
  if(!right && !up && uv.x>1.0-radius && uv.y<radius) {center=vec2f(1.0-radius,radius);}
  if(!left && !down && uv.x<radius && uv.y>1.0-radius) {center=vec2f(radius,1.0-radius);}
  if(!right && !down && uv.x>1.0-radius && uv.y>1.0-radius) {center=vec2f(1.0-radius);}
  return 1.0-step(radius,distance(uv,center));
}
@vertex
fn vertexMain(@builtin(vertex_index) vertex: u32,@builtin(instance_index) instance: u32) -> WorldOutput {
  var o: WorldOutput;
  o.position=vec4f(2,2,2,1);
  let count=u32(uniforms.gridSize*uniforms.gridSize);
  let owner=instance/4u; let part=instance%4u;
  let size=uniforms.blockSize;
  let scan=phase(0.34,0.96);
  if(owner==count) {
    if(part!=0u) {return o;}
    // The opaque quiet-zone slab grows from the world's own rounded foundation.
    let d=disk(vertex);
    let q=squarePoint(vertex)*2.0;
    let foundation=worldFoundation(vertex);
    let flat=vec3f(q.x*(uniforms.gridSize+8.0)*0.5,-0.04,q.y*(uniforms.gridSize+8.0)*0.5);
    let p=mix(foundation.p,flat,scan);
    o.world=p*size; o.position=worldProject(o.world,1.92,0.0);
    o.color=foundation.color; o.emission=foundation.emission;
    o.owner=count; o.part=9u; o.uv=d;
    return o;
  }
  let population=min(worldCount(),count);
  let sceneOwner=owner%population;
  let seed=random(f32(sceneOwner)+1.0);
  let detail=(1.0-phase(0.06+f32(part)*0.035,0.40+f32(part)*0.04));
  if(part>0u && (owner>=population || detail<=0.0)) {return o;}
  let settled=worldSurface(vertex,sceneOwner,part);
  let anchor=worldAnchor(sceneOwner);
  let delay=0.12+seed*0.65+f32(part)*0.15;
  let build=mix(smoothstep(delay,delay+0.95,uniforms.camera.z),1.0,phase(0.0,0.30));
  let presence=select(scan,1.0,owner<population);
  let scale=build*presence*select(1.0,detail,part>0u);
  var p=mix(anchor,settled.p,scale);
  let q=squarePoint(vertex);
  if(part==0u) {
    let cell=blockPositions[owner].xy+vec2f(0.5)-vec2f(uniforms.gridSize*0.5);
    let qrPosition=vec3f(cell.x+q.x,0.0,cell.y+q.y);
    p=mix(p,qrPosition,scan);
  }
  o.world=p*size; o.position=worldProject(o.world,1.92,0.0);
  o.color=settled.color; o.emission=settled.emission;
  o.uv=q+vec2f(0.5); o.owner=owner; o.part=part;
  return o;
}
@fragment
fn fragmentMain(o: WorldOutput) -> @location(0) vec4f {
  let scan=phase(0.62,0.98);
  let paper=mix(uniforms.themeFifth.rgb,vec3f(0.98),0.65);
  let n=normalize(cross(dpdx(o.world),dpdy(o.world))+vec3f(0.000001));
  let light=0.58+abs(dot(n,normalize(vec3f(-0.45,0.85,-0.35))))*0.42;
  var color=o.color*mix(light,1.15,o.emission);
  if(o.part==9u) {
    color=mix(color,paper,scan);
  } else if(o.part==0u) {
    let coverage=f32(blockTypes[o.owner]!=0u)*roundedModule(o.uv,o.owner);
    let ink=themeInk()*0.65;
    color=mix(color,mix(paper,ink,coverage),scan);
  }
  return vec4f(clamp(color,vec3f(0),vec3f(1)),1.0);
}
`;
}
