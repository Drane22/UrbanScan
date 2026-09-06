import { SEED_UNIFORMS_WGSL } from "./shared-shaders.js";
import { COLONY_INSTANCES_PER_CELL, COLONY_VERTICES_PER_PART } from "./colony-model.js";

/** Each dark owner is one continuous cavity/rim mesh, including at scan lock. */
export const COLONY_SHADER = /* wgsl */ `
${SEED_UNIFORMS_WGSL}
const PARTS: u32 = ${COLONY_INSTANCES_PER_CELL}u;
const VERTICES: u32 = ${COLONY_VERTICES_PER_PART}u;
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> blockTypes: array<u32>;
@group(0) @binding(2) var<storage, read> blockPositions: array<vec4f>;
@group(0) @binding(3) var<storage, read> blockHeights: array<f32>;
@group(0) @binding(4) var<storage, read> colony: array<vec4f>;

struct Output {
  @builtin(position) position: vec4f,
  @location(0) world: vec3f,
  @location(1) uv: vec2f,
  @location(2) @interpolate(flat) kind: u32,
  @location(3) @interpolate(flat) part: u32,
  @location(4) seed: f32,
  @location(5) radius: f32,
}
fn stage(a: f32, b: f32) -> f32 { return smoothstep(a, b, uniforms.progress); }
fn grow(a: f32, b: f32) -> f32 { return smoothstep(a, b, uniforms.camera.z); }
fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5); }
fn project(p: vec3f) -> vec4f {
  let t = uniforms.progress;
  let yaw = mix(0.78, 0.0, t);
  let tilt = mix(-0.64, -1.57079632679, t);
  let x = p.x * cos(yaw) - p.z * sin(yaw);
  let z = p.x * sin(yaw) + p.z * cos(yaw);
  let y = p.y * cos(tilt) - z * sin(tilt);
  let depth = p.y * sin(tilt) + z * cos(tilt);
  // Fit the complete symbol AND its four-module quiet zone at every aspect.
  let side = (uniforms.gridSize + 10.0) * uniforms.blockSize;
  let zoom = mix(uniforms.camera.x, min(uniforms.camera.x, 1.0), t);
  let scale = mix(1.42, 1.90, t) / side * zoom;
  return vec4f(x * scale / max(uniforms.aspectRatio, 1.0),
    (y - (1.0-t) * uniforms.blockSize * 0.5) * scale / max(1.0/uniforms.aspectRatio, 1.0),
    depth * 0.02 + 0.5, 1.0);
}
fn hubWarp(p: vec2f, hub: f32, life: f32) -> vec2f {
  if (hub < 0.0) { return p; }
  let far = uniforms.gridSize - 3.5;
  let center = vec2f(select(3.5, far, hub == 1.0), select(3.5, far, hub == 2.0));
  let d = p - center;
  let q = clamp(d / 3.5, vec2f(-1.0), vec2f(1.0));
  let circular = d * sqrt(vec2f(1.0) - 0.5 * q.yx * q.yx);
  return center + mix(d, circular, life * 0.94);
}
fn box(face: u32, uv: vec2f, size: vec3f) -> vec3f {
  var p = vec3f((uv.x-0.5)*size.x, size.y, (uv.y-0.5)*size.z);
  if (face == 1u) { p.y = 0.0; }
  if (face == 2u) { p = vec3f((uv.x-0.5)*size.x, uv.y*size.y, size.z*0.5); }
  if (face == 3u) { p = vec3f((uv.x-0.5)*size.x, uv.y*size.y, -size.z*0.5); }
  if (face == 4u) { p = vec3f(size.x*0.5, uv.y*size.y, (uv.x-0.5)*size.z); }
  if (face == 5u) { p = vec3f(-size.x*0.5, uv.y*size.y, (uv.x-0.5)*size.z); }
  return p;
}
@vertex
fn vertexMain(@builtin(vertex_index) vertex: u32, @builtin(instance_index) instance: u32) -> Output {
  var o: Output;
  o.position = vec4f(2.0, 2.0, 2.0, 1.0);
  let owner = instance / PARTS;
  let part = instance % PARTS;
  let count = u32(uniforms.gridSize * uniforms.gridSize);
  let quad = array<vec2f,6>(vec2f(0,0),vec2f(1,0),vec2f(0,1),vec2f(0,1),vec2f(1,0),vec2f(1,1));
  let uv = quad[vertex % 6u];
  let t = uniforms.progress;
  let size = uniforms.blockSize;
  if (owner == count) {
    if (vertex >= 36u || part != 0u) { return o; }
    // An opaque quiet-zone slab, independent of page color and scene background.
    let side = (uniforms.gridSize + 8.0) * size;
    let p = box(vertex/6u,uv,vec3f(side, size*0.65*(1.0-t), side)) - vec3f(0.0,size*mix(1.13,0.02,t),0.0);
    o.position = project(p); o.world = p; o.part = 9u; o.uv = uv;
    return o;
  }
  let data = colony[owner*2u];
  let traits = colony[owner*2u+1u];
  let kind = u32(data.x);
  let seed = data.w;
  let hub = traits.y;
  let coord = blockPositions[owner].xy + vec2f(0.5);
  let life = 1.0 - stage(0.40 + seed*0.08, 0.94);
  let build = grow(traits.x, traits.x + 0.65);
  let rise = mix(build, 1.0, stage(0.0,0.35));
  let align = stage(0.30 + seed*0.06,0.86);
  var center = coord;
  if (hub < 0.0 && kind > 0u) {
    center += vec2f(seed-0.5, fract(seed*7.31)-0.5) * 0.28 * (1.0-align);
  }
  var p = vec3f(0.0);
  var radius = 0.0;
  if (part == 0u) {
    // Eight sectors, four profile bands: floor, inner rim, crest, outer earth wall.
    let sector = (vertex / 6u) % 8u;
    let band = vertex / 48u;
    let radial = array<f32,5>(0.0, 0.42, 0.70, 1.0, 1.0);
    let profiles = array<f32,5>(0.10, 0.14, 1.0, 0.80, -0.25);
    let angle = (f32(sector)+uv.x) * 0.78539816339;
    let dir = vec2f(cos(angle), sin(angle));
    radius = mix(radial[band],radial[band+1u],uv.y);
    let square = dir / max(abs(dir.x),abs(dir.y));
    let edgeNoise = 0.91 + (0.04+traits.z*0.05)*sin(angle*3.0+seed*6.28);
    let organic = mix(dir*edgeNoise, square, select(0.12,1.0,hub>=0.0 || kind==0u));
    let footprint = mix(organic, square, align) * radius * 0.5;
    let scale = mix(0.38 + rise*0.62,1.0,t);
    var xz = center + footprint * scale;
    xz = hubWarp(xz,hub,1.0-align);
    var h = mix(profiles[band],profiles[band+1u],uv.y) * data.y;
    if (hub >= 0.0 && kind > 0u && band < 3u) {
      // Adjacent finder owners share one continuous hub roof rather than tiny bowls.
      h = data.y * (0.90 + 0.10 * sin((xz.x+xz.y)*0.9));
    }
    if (hub < 0.0 && kind > 0u) {
      let eastWest = abs(dir.x) > abs(dir.y);
      let bit = select(select(1u,4u,dir.y>0.0), select(8u,2u,dir.x>0.0), eastWest);
      let opening = f32((u32(data.z)&bit)!=0u);
      h *= (1.0-opening*smoothstep(0.42,0.70,radius)*0.65)*0.72;
    }
    var y = h * life * rise;
    if (kind == 0u) { y = -0.28 * life * grow(0.0,0.4); }
    p = vec3f(xz.x,y,xz.y);
  } else {
    if (kind == 0u || vertex >= 36u) { return o; }
    let face = vertex/6u;
    if (part == 1u || part == 2u) {
      let east = part == 1u;
      let mask = select(4u,2u,east);
      if ((u32(data.z)&mask)==0u || hub>=0.0) { return o; }
      let reach = (1.0-stage(0.20+seed*0.10,0.64)) * grow(traits.x+0.35,traits.x+0.95);
      if (reach <= 0.0) { return o; }
      let next = owner + select(u32(uniforms.gridSize),1u,east);
      let neighborHeight = colony[next*2u].y;
      let length = 0.65*reach;
      let shape = vec3f(select(0.18,length,east),0.18*reach,select(length,0.18,east));
      p = box(face,uv,shape);
      let along = select(p.z,p.x,east);
      p.y += min(data.y,neighborHeight)*0.12*life*rise;
      let winding = sin((along+0.5)*3.14159)*0.08*traits.w*reach;
      p.x += center.x + select(winding,0.5,east);
      p.z += center.y + select(0.5,winding,east);
    } else if (part == 3u) {
      if (kind != 3u && kind < 5u && seed < 0.86) { return o; }
      let detail = (1.0-stage(0.10,0.40)) * grow(traits.x+1.0,traits.x+1.5);
      if (detail <= 0.0) { return o; }
      p = box(face,uv,vec3f(0.22,0.26,0.22)*detail);
      let xz = hubWarp(center,hub,1.0-align);
      p += vec3f(xz.x,data.y*0.12*life*rise,xz.y);
    } else {
      if (seed < 0.91 || hub>=0.0 || data.z==0.0) { return o; }
      let detail = (1.0-stage(0.0,0.24)) * grow(2.2,2.8);
      if (detail <= 0.0) { return o; }
      let east = (u32(data.z)&2u)!=0u;
      let south = (u32(data.z)&4u)!=0u;
      if (!east && !south) { return o; }
      let travel = (0.5+0.5*sin(uniforms.time*0.9+seed*93.0))*detail;
      p = box(face,uv,vec3f(0.09,0.08,0.16)*detail);
      p += vec3f(center.x+select(0.0,travel,east), data.y*0.13*life*rise+0.20, center.y+select(travel,0.0,east));
    }
  }
  p = vec3f((p.x-uniforms.gridSize*0.5)*size,p.y*size,(p.z-uniforms.gridSize*0.5)*size);
  o.position = project(p); o.world=p; o.uv=uv; o.part=part;
  o.kind=kind; o.seed=seed; o.radius=radius;
  return o;
}
@fragment
fn fragmentMain(o: Output) -> @location(0) vec4f {
  let normal = normalize(cross(dpdx(o.world),dpdy(o.world)) + vec3f(0.000001));
  let scan = stage(0.64,0.98);
  let ink = uniforms.themePrimary.rgb * 0.6;
  let paper = uniforms.themeFifth.rgb;
  if (o.part == 9u) {
    let earth = mix(uniforms.themePrimary.rgb,uniforms.themeThird.rgb,0.64);
    let strata = 0.88 + sin(o.world.y/uniforms.blockSize*22.0)*0.06;
    return vec4f(mix(earth*strata,paper,stage(0.35,0.98)),1.0);
  }
  var color = uniforms.themeThird.rgb;
  if (o.kind>0u) {
    color = mix(uniforms.themePrimary.rgb,uniforms.themeFourth.rgb,smoothstep(0.42,0.74,o.radius));
    if (o.kind>=5u) { color=mix(uniforms.themeFourth.rgb,uniforms.themeSecondary.rgb,0.10); }
    if (o.part==1u || o.part==2u) { color=uniforms.themePrimary.rgb; }
    if (o.part==3u) { color=uniforms.themeSecondary.rgb; }
    if (o.part==4u) { color=uniforms.themePrimary.rgb*0.45; }
  }
  let light = 0.60 + abs(dot(normal,normalize(vec3f(-0.45,0.85,-0.35))))*0.40;
  let grain = hash(floor(o.world.xz/uniforms.blockSize*17.0));
  let strata = sin(o.world.y/uniforms.blockSize*24.0)*0.025;
  color *= light * (0.94+grain*0.10+strata);
  let qr = select(paper,ink*(0.98+o.seed*0.02),o.kind>0u);
  return vec4f(mix(color,qr,scan),1.0);
}
`;
