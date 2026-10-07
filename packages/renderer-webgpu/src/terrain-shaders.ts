import { STAGED_PROJECTION_WGSL } from "./staged-world-shaders.js";
import { DIORAMA_MATERIALS_WGSL } from "./diorama-materials.js";

export const TERRAIN_UNIFORMS_WGSL = /* wgsl */ `
struct Uniforms {
  aspectRatio: f32,
  time: f32,
  itemCount: f32,
  progress: f32,
  gridSize: f32,
  cameraBobX: f32,
  cameraBobY: f32,
  blockSize: f32,
  toggleAge: f32,
  flowerHue: f32,
  leafHue: f32,
  fruitHue: f32,
  fruitfulness: f32,
  flowerHueSpread: f32,
  leafHueSpread: f32,
  sceneEffect: f32,
  themePrimary: vec4f,
  themeSecondary: vec4f,
  themeThird: vec4f,
  themeFourth: vec4f,
  themeFifth: vec4f,
  terrainWater: vec4f,
  terrainShore: vec4f,
  terrainMeadow: vec4f,
  terrainRidge: vec4f,
  terrainSummit: vec4f,
  camera: vec4f,
}

fn terrainInk() -> vec3f {
  let first = uniforms.themePrimary.rgb;
  let second = uniforms.themeSecondary.rgb;
  let fourth = uniforms.themeFourth.rgb;
  let firstLuma = dot(first, vec3f(0.2126, 0.7152, 0.0722));
  let secondLuma = dot(second, vec3f(0.2126, 0.7152, 0.0722));
  let fourthLuma = dot(fourth, vec3f(0.2126, 0.7152, 0.0722));
  var ink = select(first, second, secondLuma < firstLuma);
  let inkLuma = min(firstLuma, secondLuma);
  ink = select(ink, fourth, fourthLuma < inkLuma);
  return mix(ink, vec3f(0.015), 0.22);
}

fn terrainPaper() -> vec3f {
  return mix(uniforms.themeFifth.rgb, vec3f(1.0), 0.68);
}

fn sceneSnow() -> f32 {
  return 1.0 - step(0.51, abs(uniforms.sceneEffect - 2.0));
}

fn terrainReliefProfile(heightValue: f32) -> f32 {
  return 0.1 + pow(heightValue, 0.72) * 12.6;
}

${STAGED_PROJECTION_WGSL}
${DIORAMA_MATERIALS_WGSL}
fn terrainProject(localPos: vec3f) -> vec4f {
 return worldProject(localPos,1.68,uniforms.gridSize*uniforms.blockSize*0.045);
}

`;

export const TERRAIN_RELIEF_WGSL = /* wgsl */ `
@group(0) @binding(4) var<storage, read> worldData: array<vec4f>;
fn terrainGene(i:u32)->vec4f {return worldData[i%arrayLength(&worldData)];}
fn terrainSample(p:vec2f)->f32 {
 let n=i32(uniforms.gridSize);let q=clamp(p+vec2f(uniforms.gridSize*0.5-0.5),vec2f(0),vec2f(f32(n-1)));
 let c=vec2i(floor(q));let next=min(c+vec2i(1),vec2i(n-1));let f=fract(q);
 return mix(mix(blockHeights[u32(c.y*n+c.x)],blockHeights[u32(c.y*n+next.x)],f.x),
 mix(blockHeights[u32(next.y*n+c.x)],blockHeights[u32(next.y*n+next.x)],f.x),f.y);
}
fn terrainRiver(p:vec2f)->f32 {
 let n=uniforms.gridSize;let g=terrainGene(705u);let axis=select(p,p.yx,g.w>0.5);
 let bend=sin(axis.y/n*7.0+g.x*6.28)*n*(0.12+g.z*0.035)+g.y*n*0.35;
 return 1.0-smoothstep(n*0.027,n*0.051,abs(axis.x-bend));
}
fn terrainElevation(p:vec2f)->f32 {
 let value=terrainSample(p);let raw=terrainReliefProfile(value)*uniforms.gridSize/25.0;
 return mix(raw,0.30*uniforms.gridSize/25.0,terrainRiver(p));
}
`;

export const TERRAIN_SHADER = /* wgsl */ `
${TERRAIN_UNIFORMS_WGSL}

struct TerrainOutput {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) uv: vec2f,
  @location(2) heightValue: f32,
  @location(3) heightFraction: f32,
  @location(4) shade: f32,
  @location(5) castShadow: f32,
  @location(6) valleyOcclusion: f32,
  @location(7) rimLight: f32,
  @location(8) fresnel: f32,
  @location(9) @interpolate(flat) blockType: u32,
  @location(10) @interpolate(flat) neighborMask: u32,
  @location(11) @interpolate(flat) faceIndex: u32,
  @location(12) world: vec3f,
  @location(13) @interpolate(flat) foundation: u32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> blockTypes: array<u32>;
@group(0) @binding(2) var<storage, read> blockPositions: array<vec4f>;
@group(0) @binding(3) var<storage, read> blockHeights: array<f32>;
${TERRAIN_RELIEF_WGSL}

fn terrainHeightAt(column: i32, row: i32) -> f32 {
  let size = i32(uniforms.gridSize);
  if (column < 0 || column >= size || row < 0 || row >= size) {
    return 0.0;
  }
  return blockHeights[u32(row * size + column)];
}

fn terrainValley(height: f32, column: i32, row: i32) -> f32 {
  var highest = 0.0;
  for (var rowOffset: i32 = -1; rowOffset <= 1; rowOffset = rowOffset + 1) {
    for (var columnOffset: i32 = -1; columnOffset <= 1; columnOffset = columnOffset + 1) {
      if (columnOffset == 0 && rowOffset == 0) { continue; }
      let neighbor = terrainHeightAt(column + columnOffset, row + rowOffset);
      highest = max(highest, neighbor);
    }
  }
  return smoothstep(0.02, 0.34, max(0.0, highest - height));
}

fn terrainShadow(height: f32, column: i32, row: i32) -> f32 {
  if (height < 0.02) { return 1.0; }
  let direction = normalize(vec2f(0.42, 0.76));
  var shadow = 1.0;
  for (var stepIndex: i32 = 1; stepIndex < 7; stepIndex = stepIndex + 1) {
    let offset = vec2f(f32(stepIndex)) * direction;
    let sampleColumn = column + i32(round(offset.x));
    let sampleRow = row + i32(round(offset.y));
    let neighbor = terrainHeightAt(sampleColumn, sampleRow);
    let occlusion = smoothstep(height + 0.06, height + 0.36, neighbor);
    let distanceFade = 1.0 - f32(stepIndex) * 0.075;
    shadow *= mix(1.0, 0.78, occlusion * max(distanceFade, 0.45));
  }
  return max(shadow, 0.74);
}

fn terrainGeometry(
  faceIndex: u32,
  uv: vec2f,
  footprint: f32,
  height: f32,
  topNormal: vec3f,
) -> array<vec3f, 2> {
  let halfWidth = footprint * 0.5;
  var position = vec3f(0.0);
  var normal = vec3f(0.0, 1.0, 0.0);
  if (faceIndex == 0u) {
    let summit = 1.0 - length(uv - vec2f(0.5)) * 0.2 * (1.0 - uniforms.progress);
    position = vec3f((uv.x - 0.5) * footprint, height * summit, (uv.y - 0.5) * footprint);
    normal = topNormal;
  } else if (faceIndex == 1u) {
    position = vec3f((uv.x - 0.5) * footprint, 0.0, (0.5 - uv.y) * footprint);
    normal = vec3f(0.0, -1.0, 0.0);
  } else if (faceIndex == 2u) {
    position = vec3f((uv.x - 0.5) * footprint, uv.y * height, halfWidth);
    normal = vec3f(0.0, 0.0, 1.0);
  } else if (faceIndex == 3u) {
    position = vec3f((0.5 - uv.x) * footprint, uv.y * height, -halfWidth);
    normal = vec3f(0.0, 0.0, -1.0);
  } else if (faceIndex == 4u) {
    position = vec3f(halfWidth, uv.y * height, (uv.x - 0.5) * footprint);
    normal = vec3f(1.0, 0.0, 0.0);
  } else {
    position = vec3f(-halfWidth, uv.y * height, (0.5 - uv.x) * footprint);
    normal = vec3f(-1.0, 0.0, 0.0);
  }
  return array<vec3f, 2>(position, normal);
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32,
) -> TerrainOutput {
  var output: TerrainOutput;
  let faceIndex = vertexIndex / 6u;
  let quadIndex = vertexIndex % 6u;
  let quad = array<vec2f, 6>(
    vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(0.0, 1.0),
    vec2f(0.0, 1.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0),
  );
  let uv = quad[quadIndex];
  if(instanceIndex==u32(uniforms.gridSize*uniforms.gridSize)){
    let n=uniforms.gridSize;let base=2.4*n/25.0*(1.0-uniforms.progress);
    let extent=mix(n,n+8.0,uniforms.progress)*uniforms.blockSize;
    let g=terrainGeometry(faceIndex,uv,extent,base*uniforms.blockSize,vec3f(0,1,0));
    output.world=g[0]-vec3f(0,(base+0.045)*uniforms.blockSize,0);
    output.position=terrainProject(output.world);output.normal=g[1];output.uv=uv;
    output.shade=0.65+max(dot(g[1],normalize(vec3f(-0.4,0.85,-0.3))),0.0)*0.35;
    output.faceIndex=faceIndex;output.foundation=1u;return output;
  }
  let positionData = blockPositions[instanceIndex];
  let column = i32(positionData.x);
  let row = i32(positionData.y);
  let heightValue = clamp(blockHeights[instanceIndex], 0.0, 1.0);
  let blockSize = uniforms.blockSize;
  let cell=positionData.xy+vec2f(0.5)-vec2f(uniforms.gridSize*0.5);
  let terrainHeight = blockSize * terrainElevation(cell);
  let flatHeight = blockSize * 0.11;
  let height = mix(terrainHeight, flatHeight, uniforms.progress);
  let footprint = blockSize;
  let topNormal = vec3f(0.0, 1.0, 0.0);
  var geometry = terrainGeometry(faceIndex, uv, footprint, height, topNormal);
  var local=geometry[0];
  if(faceIndex!=1u){
    let corner=cell+local.xz/blockSize;
    let top=mix(terrainElevation(corner)*blockSize,flatHeight,uniforms.progress);
    local.y=select(top*uv.y,top,faceIndex==0u);
    geometry[0]=local;
    if(faceIndex==0u){
      let dx=terrainElevation(corner+vec2f(0.35,0))-terrainElevation(corner-vec2f(0.35,0));
      let dz=terrainElevation(corner+vec2f(0,0.35))-terrainElevation(corner-vec2f(0,0.35));
      geometry[1]=normalize(mix(vec3f(-dx,0.70,-dz),vec3f(0,1,0),uniforms.progress));
    }
  }
  let halfGrid = uniforms.gridSize * blockSize * 0.5;
  let center = vec3f(
    (positionData.x + 0.5) * blockSize - halfGrid,
    0.0,
    (positionData.y + 0.5) * blockSize - halfGrid,
  );
  let worldPosition = center + geometry[0];
  let normal = normalize(geometry[1]);
  let lightDirection = normalize(vec3f(-0.41, 0.86, -0.3));
  let diffuse = max(dot(normal, lightDirection), 0.0);
  var shade = 0.3 + pow(diffuse, 0.62) * 0.7;
  if (normal.y > 0.45) { shade = min(1.0, shade * 1.08 + 0.06); }
  if (abs(normal.y) < 0.12) { shade *= 0.68; }
  let viewDirection = normalize(vec3f(sin(0.79), 0.58, cos(0.79)));
  let viewDot = abs(dot(normal, viewDirection));
  output.world=worldPosition;output.foundation=0u;
  output.position = terrainProject(worldPosition);
  output.normal = normal;
  output.uv = uv;
  output.heightValue = heightValue;
  output.heightFraction = clamp(geometry[0].y / max(height, 0.00001), 0.0, 1.0);
  output.shade = mix(shade, 1.0, uniforms.progress);
  output.castShadow = terrainShadow(heightValue, column, row);
  output.valleyOcclusion = terrainValley(heightValue, column, row);
  output.rimLight = pow(1.0 - viewDot, 3.8);
  output.fresnel = pow(1.0 - viewDot, 2.4);
  output.blockType = blockTypes[instanceIndex];
  output.neighborMask = u32(positionData.w);
  output.faceIndex = faceIndex;
  return output;
}

fn terrainBandColor(height: f32) -> vec3f {
  let water = uniforms.terrainWater.rgb;
  let shore = uniforms.terrainShore.rgb;
  let meadow = uniforms.terrainMeadow.rgb;
  let ridge = uniforms.terrainRidge.rgb;
  let summit = uniforms.terrainSummit.rgb;
  if (height < 0.055) {
    return mix(uniforms.themeThird.rgb,uniforms.themeFourth.rgb,0.25);
  }
  if (height < 0.22) {
    return water;
  }
  if (height < 0.34) {
    return mix(water, shore, smoothstep(0.22, 0.34, height));
  }
  if (height < 0.62) {
    return mix(shore, meadow, smoothstep(0.34, 0.62, height));
  }
  if (height < 0.84) {
    return mix(meadow, ridge, smoothstep(0.62, 0.84, height));
  }
  return mix(ridge, summit, smoothstep(0.84, 1.0, height));
}

fn terrainQrMask(uv: vec2f, neighborMask: u32) -> f32 {
  let up = (neighborMask & 1u) != 0u;
  let right = (neighborMask & 2u) != 0u;
  let down = (neighborMask & 4u) != 0u;
  let left = (neighborMask & 8u) != 0u;
  let radius = 0.46;
  var mask = 1.0;
  if (!left && !up && uv.x < radius && uv.y < radius) {
    mask *= 1.0 - step(radius, distance(uv, vec2f(radius)));
  }
  if (!right && !up && uv.x > 1.0 - radius && uv.y < radius) {
    mask *= 1.0 - step(radius, distance(uv, vec2f(1.0 - radius, radius)));
  }
  if (!left && !down && uv.x < radius && uv.y > 1.0 - radius) {
    mask *= 1.0 - step(radius, distance(uv, vec2f(radius, 1.0 - radius)));
  }
  if (!right && !down && uv.x > 1.0 - radius && uv.y > 1.0 - radius) {
    mask *= 1.0 - step(radius, distance(uv, vec2f(1.0 - radius)));
  }
  return mask;
}

fn terrainHash(position: vec2f) -> f32 {
  let scaled = fract(position * vec2f(0.1031, 0.103));
  let folded = scaled + dot(scaled, scaled.yx + 19.19);
  return fract((folded.x + folded.y) * folded.x);
}

@fragment
fn fragmentMain(input: TerrainOutput) -> @location(0) vec4f {
  let progress = uniforms.progress;
  let noise = terrainHash(input.position.xy + vec2f(uniforms.time * 0.13));
  let paper = qrPaper();
  let coord=input.world/uniforms.blockSize;
  if(input.foundation==1u){
    let layers=sin(coord.y*14.0+sin(coord.x*0.7)*1.3)*0.5+0.5;
    let pores=terrainHash(floor(coord.xz*18.0)+vec2f(floor(coord.y*21.0)));
    let stone=mix(uniforms.themePrimary.rgb,uniforms.themeThird.rgb,0.10+layers*0.25)*(0.84+pores*0.22)*input.shade;
    return vec4f(mix(stone,paper,smoothstep(0.50,0.98,progress)),1);
  }
  var terrainColor = terrainBandColor(input.heightValue);
  // Stable mineral bands use world coordinates, so faces share the same rock layers.
  let h=input.heightValue;let river=terrainRiver(coord.xz);let style=u32(uniforms.camera.w);
  let mineral=mix(uniforms.themeThird.rgb,uniforms.themeFourth.rgb,smoothstep(0.22,0.75,h)*0.55);
  terrainColor=mix(terrainColor,mineral,0.86);
  terrainColor=mix(terrainColor,uniforms.themeFifth.rgb,smoothstep(0.66,1.0,h)*0.5);
  let veins=pow(0.5+0.5*sin(coord.x*2.2+coord.z*1.9+sin(coord.z*0.7)*2.0),15.0);
  let strata=0.5+0.5*sin(coord.y*9.0+sin(coord.x*0.5)*2.0);
  terrainColor=mix(terrainColor,uniforms.themePrimary.rgb,strata*select(0.12,0.30,input.faceIndex>1u));
  terrainColor=mix(terrainColor,uniforms.themeSecondary.rgb,veins*0.30);
  let flow=0.5+0.5*sin(coord.z*2.2+coord.x*1.3-uniforms.time*2.3);
  let water=mix(uniforms.themeFourth.rgb,uniforms.themeSecondary.rgb,0.20+flow*0.20);
  terrainColor=mix(terrainColor,water,river*0.88);
  if(style==1u){terrainColor=mix(terrainColor,uniforms.themeSecondary.rgb,river*(0.7+flow*0.25));}
  if(style==3u){terrainColor+=uniforms.themeSecondary.rgb*veins*pow(max(sin(coord.x*0.20-uniforms.time*0.9),0.0),12.0)*0.24;}
  let grit=terrainHash(floor(coord.xz*15.0)+vec2f(floor(coord.y*19.0)));
  let fissure=pow(max(sin(coord.x*2.7+sin(coord.z*2.2)*3.0+coord.y*0.8),0.0),40.0);
  terrainColor*=0.94+grit*0.12;
  terrainColor=mix(terrainColor,uniforms.themePrimary.rgb,fissure*0.12);
  terrainColor *= mix(0.72, 1.06, input.shade);
  let contact = mix(0.82, 1.0, smoothstep(0.0, 0.72, input.heightFraction));
  terrainColor *= mix(contact, 1.0, progress);
  terrainColor *= mix(input.castShadow, 1.0, progress * 0.92);
  terrainColor *= 1.0 - input.valleyOcclusion * 0.18 * (1.0 - progress);
  terrainColor *= 1.0 + input.rimLight * 0.18 * (1.0 - progress);
  terrainColor *= 1.0 + input.fresnel * 0.09 * (1.0 - progress);
  let peak = smoothstep(0.62, 0.96, input.heightValue);
  let peakTint = uniforms.terrainSummit.rgb;
  terrainColor = mix(terrainColor, peakTint, peak * 0.16 * (1.0 - progress));
  let snowNoise = terrainHash(input.uv * 5.7 + vec2f(input.heightValue * 13.0));
  let topFace = select(0.0, 1.0, input.faceIndex == 0u);
  let snowCover = sceneSnow() * topFace * (1.0 - progress)
    * smoothstep(0.42 + snowNoise * 0.1, 0.72, input.heightValue);
  terrainColor = mix(terrainColor, terrainPaper(), snowCover * 0.88);
  let qrNoise = terrainHash(input.uv + vec2f(input.heightValue * 17.0));
  let qrUv=select(input.uv,vec2f(input.uv.x,1.0-input.uv.y),input.faceIndex==1u);
  let qrMask = terrainQrMask(qrUv, input.neighborMask);
  let isActive = select(0.0, 1.0, input.blockType != 0u);
  var qrColor = mix(paper, qrModuleMaterial(input.blockType,input.world.xz/uniforms.blockSize), isActive * qrMask);
  if (input.faceIndex != 0u && input.faceIndex != 1u) {
    qrColor = mix(qrColor, terrainInk(), 0.18);
  }
  var color = mix(terrainColor, qrColor, smoothstep(0.58, 0.98, progress));
  color += (noise - 0.5) * 0.022 * (1.0 - progress);
  return vec4f(clamp(color, vec3f(0.0), vec3f(1.0)), 1.0);
}
`;
