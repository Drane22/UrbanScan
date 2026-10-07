import { QR_RELIEF_WGSL } from "./tree-morph.js";
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
fn terrainRiverDistance(p:vec2f)->f32 {
 let n=uniforms.gridSize;let g=terrainGene(705u);let axis=select(p,p.yx,g.w>0.5);
 let bend=sin(axis.y/n*7.0+g.x*6.28)*n*(0.12+g.z*0.035)+g.y*n*0.35;
 return abs(axis.x-bend);
}
fn terrainRiver(p:vec2f)->f32 {
 return 1.0-smoothstep(uniforms.gridSize*0.027,uniforms.gridSize*0.051,terrainRiverDistance(p));
}
// Smooth, link-seeded hills replace peaks copied from individual QR cells.
fn terrainElevation(p:vec2f)->f32 {
 let n=uniforms.gridSize;let q=p/n;var hills=0.0;
 for(var i=0u;i<5u;i++){
  let g=terrainGene(710u+i);let center=g.xy*0.90;
  let d=(q-center)*vec2f(1.0,0.72+g.z*0.30);
  hills+=exp(-dot(d,d)*(15.0+g.w*15.0))*(1.4+g.z*1.2);
 }
 let edge=1.0-smoothstep(0.32,0.53,max(abs(q.x),abs(q.y)));
 let raw=(0.40+hills*(0.55+edge*0.45)+terrainReliefProfile(terrainSample(p))*0.010)*n/25.0;
 // Wide, eased banks give the stream a rounded valley instead of a sheer trench.
 let valley=1.0-smoothstep(n*0.030,n*0.145,terrainRiverDistance(p));
 return mix(raw,0.24*n/25.0,valley);
}
// Both the ground and its attached foliage collapse vertically in place.
fn terrainTransitionElevation(p:vec2f)->f32 {
 return terrainElevation(p)*treeFoliageVisibility();
}
fn terrainGrassColor()->vec3f {
 let style=u32(uniforms.camera.w);
 var grass=vec3f(0.29,0.49,0.25);
 if(style==1u){grass=vec3f(0.69,0.49,0.20);}
 if(style==2u){grass=vec3f(0.63,0.35,0.48);}
 if(style==3u){grass=vec3f(0.23,0.48,0.48);}
 return mix(grass,uniforms.terrainMeadow.rgb,0.18);
}
fn terrainStreamColor()->vec3f {
 let style=u32(uniforms.camera.w);
 var water=uniforms.themeFourth.rgb;
 if(style==2u){water=uniforms.themeSecondary.rgb;}
 if(style==3u){water=uniforms.themeThird.rgb;}
 return mix(water,uniforms.terrainWater.rgb,0.10);
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
${QR_RELIEF_WGSL}

fn terrainHeightAt(column: i32, row: i32) -> f32 {
  let size = i32(uniforms.gridSize);
  if (column < 0 || column >= size || row < 0 || row >= size) {
    return 0.0;
  }
  return terrainElevation(vec2f(f32(column),f32(row))+vec2f(0.5-f32(size)*0.5))/10.0;
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
  let count=u32(uniforms.gridSize*uniforms.gridSize);
  if(instanceIndex>count){
    let slot=instanceIndex-count-1u;let owner=slot%count;let layer=slot/count;
    let cell=blockPositions[owner].xy+vec2f(0.5)-vec2f(uniforms.gridSize*0.5);
    let cap=select(1u,1u+u32(clamp(blockHeights[owner]*10.0,1.0,11.0)),blockTypes[owner]!=0u);
    if(layer>=cap || treeSemanticAbsorb()<0.001 || (layer>0u && treeLayerRise(f32(layer))<0.001)){
      output.position=vec4f(2,2,2,1);return output;
    }
    output.world=qrReliefPoint(vertexIndex,cell,layer)*uniforms.blockSize;
    output.position=terrainProject(output.world);output.uv=qrReliefUv(vertexIndex);
    output.blockType=blockTypes[owner];output.neighborMask=u32(blockPositions[owner].w);
    output.foundation=2u;output.faceIndex=faceIndex;output.normal=qrReliefNormal(vertexIndex);
    output.shade=1.0;return output;
  }
  if(instanceIndex==u32(uniforms.gridSize*uniforms.gridSize)){
    let n=uniforms.gridSize;let base=1.05*n/25.0*treeFoliageVisibility();
    let extent=n*uniforms.blockSize;
    let g=terrainGeometry(faceIndex,uv,extent,base*uniforms.blockSize,vec3f(0,1,0));
    output.world=g[0]-vec3f(0,(base+0.045)*uniforms.blockSize,0);
    output.position=terrainProject(output.world);output.normal=g[1];output.uv=uv;
    output.shade=0.65+max(dot(g[1],normalize(vec3f(-0.4,0.85,-0.3))),0.0)*0.35;
    output.faceIndex=faceIndex;output.foundation=1u;return output;
  }
  let positionData = blockPositions[instanceIndex];
  let column = i32(positionData.x);
  let row = i32(positionData.y);
  let blockSize = uniforms.blockSize;
  let cell=positionData.xy+vec2f(0.5)-vec2f(uniforms.gridSize*0.5);
  let terrainHeight = blockSize * terrainElevation(cell);
  let scan=1.0-treeFoliageVisibility();
  let height=terrainHeight*(1.0-scan);
  let footprint = blockSize;
  let topNormal = vec3f(0.0, 1.0, 0.0);
  var geometry = terrainGeometry(faceIndex, uv, footprint, height, topNormal);
  var local=geometry[0];
  if(faceIndex!=1u){
    let corner=cell+local.xz/blockSize;
    let top=terrainTransitionElevation(corner)*blockSize;
    local.y=select(top*uv.y,top,faceIndex==0u);
    geometry[0]=local;
    if(faceIndex==0u){
      let dx=terrainElevation(corner+vec2f(0.35,0))-terrainElevation(corner-vec2f(0.35,0));
      let dz=terrainElevation(corner+vec2f(0,0.35))-terrainElevation(corner-vec2f(0,0.35));
      geometry[1]=normalize(mix(vec3f(-dx,0.70,-dz),vec3f(0,1,0),scan));
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
  let viewDirection = treeViewDirection();
  let viewDot = abs(dot(normal, viewDirection));
  output.world=worldPosition;output.foundation=0u;
  output.position = terrainProject(worldPosition);
  output.normal = normal;
  output.uv = uv;
  output.heightValue = clamp(terrainElevation(cell)/6.0,0.0,1.0);
  output.heightFraction = clamp(geometry[0].y / max(height, 0.00001), 0.0, 1.0);
  output.shade = mix(shade, 1.0, uniforms.progress);
  output.castShadow = terrainShadow(terrainElevation(cell)/10.0, column, row);
  output.valleyOcclusion = terrainValley(terrainElevation(cell)/10.0, column, row);
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
    let alpha=1.0-smoothstep(0.64,0.96,progress);
    if(alpha<0.001){discard;}
    return vec4f(stone,alpha);
  }
  if(input.foundation==2u){
    let coverage=f32(input.blockType!=0u)*terrainQrMask(input.uv,input.neighborMask);
    let reveal=smoothstep(0.64,0.96,progress);
    let light=0.48+max(dot(input.normal,normalize(vec3f(-0.41,0.86,-0.30))),0.0)*0.52;
    let pigment=mix(terrainGrassColor(),uniforms.themeThird.rgb,f32(input.blockType%3u)*0.13);
    let material=mix(uniforms.themeFifth.rgb*0.86,pigment*light,select(0.38,1.0,input.blockType!=0u));
    let ink=qrModuleMaterial(input.blockType,input.world.xz/uniforms.blockSize);
    let alpha=mix(1.0,coverage,reveal)*treeSemanticAbsorb();
    if(alpha<0.001){discard;}
    return vec4f(mix(material,ink,reveal),alpha);
  }
  var terrainColor = terrainBandColor(input.heightValue);
  // Ground cover spans the whole square, including corners and river banks.
  let river=terrainRiver(coord.xz);
  let grain=terrainHash(floor(coord.xz*19.0));
  let patches=0.5+0.5*sin(coord.x*0.67+sin(coord.z*0.54)*1.7);
  let leafMarks=pow(max(sin(coord.x*24.0+sin(coord.z*21.0)*2.0),0.0),7.0);
  let moss=mix(terrainGrassColor(),terrainColor,0.10);
  terrainColor=mix(moss*0.79,mix(moss,uniforms.terrainShore.rgb,0.32),patches*0.65+grain*0.25);
  terrainColor*=0.94+grain*0.12+leafMarks*0.10;
  let bank=smoothstep(0.02,0.25,river)*(1.0-smoothstep(0.60,0.95,river));
  terrainColor=mix(terrainColor,uniforms.terrainShore.rgb,bank*0.70);
  let flow=0.5+0.5*sin(coord.z*5.0+coord.x*3.3-uniforms.time*2.1);
  let crossFlow=pow(max(sin(coord.z*11.0-coord.x*3.0-uniforms.time*2.7),0.0),16.0);
  let water=mix(terrainStreamColor()*0.68,terrainStreamColor(),flow*0.45+0.35);
  let waterNormal=normalize(vec3f(sin(coord.x*3.1+coord.z*1.3-uniforms.time)*0.12,1.0,cos(coord.z*4.2-uniforms.time*1.4)*0.10));
  let view=treeViewDirection();let halfVector=normalize(view+normalize(vec3f(-0.41,0.86,-0.30)));
  let reflection=pow(max(dot(waterNormal,halfVector),0.0),42.0)*0.30;
  let fresnel=pow(1.0-max(dot(waterNormal,view),0.0),4.0)*0.15;
  let reflectedSky=mix(uniforms.themeFifth.rgb,vec3f(1.0),0.45)*(reflection+fresnel);
  terrainColor=mix(terrainColor,water+vec3f(crossFlow*0.12)+reflectedSky,river);
  if(input.faceIndex>1u){
    let strata=0.5+0.5*sin(coord.y*13.0+sin(coord.x*0.75+coord.z)*1.3);
    let soil=mix(uniforms.themePrimary.rgb,uniforms.themeThird.rgb,0.20+strata*0.32);
    terrainColor=mix(soil,terrainColor,smoothstep(0.82,0.98,input.heightFraction));
  }
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
  let alpha=1.0-smoothstep(0.64,0.96,progress);
  if(alpha<0.001){discard;}
  var color=terrainColor+(noise-0.5)*0.022*(1.0-progress);
  return vec4f(clamp(color,vec3f(0),vec3f(1)),alpha);

}
`;
