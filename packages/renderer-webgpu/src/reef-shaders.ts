const REEF_COMMON = /* wgsl */ `
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

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> blockTypes: array<u32>;
@group(0) @binding(2) var<storage, read> blockPositions: array<vec4f>;
@group(0) @binding(3) var<storage, read> shelfData: array<vec4f>;
@group(0) @binding(4) var<storage, read> coralData: array<vec4f>;
@group(0) @binding(5) var<storage, read> fishData: array<vec4f>;
@group(0) @binding(6) var reefAtlas: texture_2d<f32>;
@group(0) @binding(7) var reefSampler: sampler;

fn reefStage(start: f32, end: f32) -> f32 {
  return smoothstep(start, end, uniforms.progress);
}

fn reefMotionStage(forwardStart: f32, forwardEnd: f32, reverseStart: f32, reverseEnd: f32) -> f32 {
  let forward = smoothstep(forwardStart, forwardEnd, uniforms.progress);
  let reverse = smoothstep(reverseStart, reverseEnd, uniforms.progress);
  return select(reverse, forward, uniforms.camera.y > 0.5);
}

fn reefProject(localPos: vec3f) -> vec4f {
  let cameraStage = smoothstep(0.58, 0.98, uniforms.progress);
  let angleY = mix(0.72, 0.0, cameraStage);
  let angleX = mix(-0.48, -1.570796, cameraStage);
  let cy = cos(angleY);
  let sy = sin(angleY);
  let cx = cos(angleX);
  let sx = sin(angleX);
  let rotX = localPos.x * cy - localPos.z * sy;
  let rotZ = localPos.x * sy + localPos.z * cy;
  let rotY = localPos.y * cx - rotZ * sx;
  let depth = localPos.y * sx + rotZ * cx;
  let portrait = select(1.0, 1.16, uniforms.aspectRatio < 0.8);
  let scale = mix(40.0, 46.2, cameraStage) / uniforms.gridSize * portrait * uniforms.camera.x;
  let scaleX = scale / max(uniforms.aspectRatio, 1.0);
  let scaleY = scale / max(1.0 / uniforms.aspectRatio, 1.0);
  return vec4f(rotX * scaleX, (rotY + mix(-0.15, 0.07, cameraStage)) * scaleY, depth * 0.01 + 0.5, 1.0);
}

fn reefPoint(column: f32, row: f32, height: f32) -> vec3f {
  let halfGrid = uniforms.gridSize * uniforms.blockSize * 0.5;
  return vec3f(
    (column + 0.5) * uniforms.blockSize - halfGrid,
    height * uniforms.blockSize,
    (row + 0.5) * uniforms.blockSize - halfGrid
  );
}

fn quadUv(index: u32) -> vec2f {
  let quad = array<vec2f, 6>(
    vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(0.0, 1.0),
    vec2f(0.0, 1.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0)
  );
  return quad[index % 6u];
}

fn boxGeometry(faceIndex: u32, uv: vec2f, size: vec3f) -> array<vec3f, 2> {
  let halfX = size.x * 0.5;
  let halfZ = size.z * 0.5;
  var pos = vec3f(0.0);
  var norm = vec3f(0.0, 1.0, 0.0);
  if (faceIndex == 0u) { pos = vec3f((uv.x - 0.5) * size.x, size.y, (uv.y - 0.5) * size.z); }
  else if (faceIndex == 1u) { pos = vec3f((uv.x - 0.5) * size.x, 0.0, (0.5 - uv.y) * size.z); norm = vec3f(0.0, -1.0, 0.0); }
  else if (faceIndex == 2u) { pos = vec3f((uv.x - 0.5) * size.x, uv.y * size.y, halfZ); norm = vec3f(0.0, 0.0, 1.0); }
  else if (faceIndex == 3u) { pos = vec3f((0.5 - uv.x) * size.x, uv.y * size.y, -halfZ); norm = vec3f(0.0, 0.0, -1.0); }
  else if (faceIndex == 4u) { pos = vec3f(halfX, uv.y * size.y, (uv.x - 0.5) * size.z); norm = vec3f(1.0, 0.0, 0.0); }
  else { pos = vec3f(-halfX, uv.y * size.y, (0.5 - uv.x) * size.z); norm = vec3f(-1.0, 0.0, 0.0); }
  return array<vec3f, 2>(pos, norm);
}

fn atlasUv(tile: f32, uv: vec2f, repeat: f32) -> vec2f {
  let tileColumn = tile % 4.0;
  let tileRow = floor(tile / 4.0);
  return (vec2f(tileColumn, tileRow) + fract(uv * repeat)) * 0.25 + vec2f(0.002);
}

fn reefLight(normal: vec3f, world: vec3f) -> f32 {
  let key = max(dot(normal, normalize(vec3f(-0.32, 0.9, -0.24))), 0.0);
  let fill = max(dot(normal, normalize(vec3f(0.55, 0.42, 0.66))), 0.0);
  let caustic = sin(world.x * 180.0 + uniforms.time * 0.55) * sin(world.z * 155.0 - uniforms.time * 0.42);
  return 0.3 + pow(key, 0.78) * 0.62 + fill * 0.12 + max(caustic, 0.0) * 0.08 * (1.0 - reefStage(0.18, 0.38));
}

fn coralPrimary() -> vec3f { return uniforms.themePrimary.rgb; }
fn coralSecondary() -> vec3f { return uniforms.themeSecondary.rgb; }
fn coralAccent() -> vec3f { return uniforms.themeThird.rgb; }
fn waterColor() -> vec3f { return uniforms.themeFourth.rgb; }
fn limestoneColor() -> vec3f { return uniforms.themeFifth.rgb; }
`;

export const REEF_SHELF_SHADER = /* wgsl */ `
${REEF_COMMON}

struct Output {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) world: vec3f,
  @location(2) height: f32,
  @location(3) channel: f32,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> Output {
  var output: Output;
  let uv = quadUv(vertexIndex);
  let position = blockPositions[instanceIndex];
  let shelf = shelfData[instanceIndex];
  let flatten = reefStage(0.62, 0.88);
  let relief = mix(shelf.x * 2.35 + 0.08, 0.035, flatten);
  let world = reefPoint(position.x + uv.x - 0.5, position.y + uv.y - 0.5, relief);
  output.position = reefProject(world);
  output.uv = uv;
  output.world = world;
  output.height = shelf.x;
  output.channel = shelf.z;
  return output;
}

@fragment
fn fragmentMain(input: Output) -> @location(0) vec4f {
  let sandDetail = textureSampleLevel(reefAtlas, reefSampler, atlasUv(4.0, input.uv, 2.5), 0.0);
  let rockDetail = textureSampleLevel(reefAtlas, reefSampler, atlasUv(3.0, input.uv, 2.1), 0.0);
  let sand = mix(limestoneColor(), vec3f(0.74, 0.61, 0.39), 0.34) * (0.83 + sandDetail.r * 0.28);
  let limestone = limestoneColor() * (0.76 + rockDetail.r * 0.36);
  let shelfMix = smoothstep(0.2, 0.42, input.height) * (1.0 - input.channel * 0.82);
  let color = mix(sand, limestone, shelfMix);
  let scan = reefStage(0.84, 1.0);
  return vec4f(mix(color * reefLight(vec3f(0.0, 1.0, 0.0), input.world), vec3f(0.965), scan), 1.0);
}
`;

export const REEF_CORAL_SHADER = /* wgsl */ `
${REEF_COMMON}

const CORAL_PARTS: u32 = 12u;

struct Part {
  offset: vec3f,
  size: vec3f,
  visible: bool,
}

struct Output {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) uv: vec2f,
  @location(2) world: vec3f,
  @location(3) seed: f32,
  @location(4) @interpolate(flat) family: u32,
  @location(5) @interpolate(flat) part: u32,
  @location(6) @interpolate(flat) visible: u32,
}

fn makePart(part: u32, family: u32, scale: f32, height: f32, seed: f32) -> Part {
  var result: Part;
  result.offset = vec3f(0.0);
  result.size = vec3f(scale, height, scale);
  result.visible = part == 0u;
  if (family == 0u || family == 1u) {
    result.visible = part < select(8u, 11u, family == 1u);
    let tier = f32(part / 3u);
    let spoke = f32(part % 3u) - 1.0;
    result.size = vec3f(scale * (0.17 - tier * 0.018), height * (0.34 - tier * 0.045), scale * 0.17);
    result.offset = vec3f(spoke * scale * (0.24 + tier * 0.09), tier * height * 0.22, sin(seed * 19.0 + f32(part)) * scale * 0.24);
  } else if (family == 2u) {
    result.visible = part < 5u;
    let layer = f32(part);
    result.size = vec3f(scale * (1.0 - layer * 0.1), height * 0.11, scale * (0.72 - layer * 0.06));
    result.offset = vec3f((layer - 2.0) * scale * 0.08, layer * height * 0.17, sin(seed * 8.0 + layer) * scale * 0.08);
  } else if (family == 3u || family == 4u) {
    result.visible = part < select(7u, 4u, family == 4u);
    let ridge = f32(part) - 3.0;
    result.size = vec3f(scale * select(0.18, 0.48, family == 4u), height * (0.48 + seed * 0.12), scale * (0.78 - abs(ridge) * 0.05));
    result.offset = vec3f(ridge * scale * 0.12, 0.0, sin(ridge * 1.7) * scale * 0.06);
  } else if (family == 5u) {
    result.visible = part < 7u;
    let ring = f32(part);
    result.size = vec3f(scale * 0.24, height * (0.52 + fract(seed * 9.0 + ring) * 0.42), scale * 0.24);
    result.offset = vec3f(cos(ring * 2.4) * scale * 0.3, 0.0, sin(ring * 2.4) * scale * 0.3);
  } else if (family == 6u || family == 8u || family == 9u) {
    result.visible = part < select(9u, 6u, family == 9u);
    let strand = f32(part);
    result.size = vec3f(scale * 0.1, height * (0.5 + fract(seed * 13.0 + strand) * 0.46), scale * 0.1);
    result.offset = vec3f(cos(strand * 2.1) * scale * 0.35, 0.0, sin(strand * 2.1) * scale * 0.35);
  } else if (family == 7u) {
    result.visible = part < 10u;
    let branch = f32(part);
    result.size = vec3f(scale * 0.09, height * (0.35 + branch * 0.045), scale * 0.07);
    result.offset = vec3f((branch - 4.5) * scale * 0.095, branch * height * 0.035, sin(branch * 1.8) * scale * 0.06);
  }
  return result;
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> Output {
  var output: Output;
  let colonyIndex = instanceIndex / CORAL_PARTS;
  let partIndex = instanceIndex % CORAL_PARTS;
  let a = coralData[colonyIndex * 3u];
  let b = coralData[colonyIndex * 3u + 1u];
  let c = coralData[colonyIndex * 3u + 2u];
  let family = u32(b.x);
  let partData = makePart(partIndex, family, a.z, a.w, c.x);
  let flexible = select(0.0, 1.0 - b.w, family == 6u || family == 7u || family == 8u || family == 9u);
  let current = sin(uniforms.time * 0.52 + a.x * 0.31 + a.y * 0.19) * flexible * 0.12;
  let contract = 1.0 - reefMotionStage(0.38, 0.68, 0.48, 0.78) * select(0.78, 0.96, flexible > 0.0);
  let face = vertexIndex / 6u;
  let uv = quadUv(vertexIndex);
  let geometry = boxGeometry(face, uv, partData.size * uniforms.blockSize * vec3f(contract, contract, contract));
  var local = geometry[0] + partData.offset * uniforms.blockSize * contract;
  local.x += current * local.y;
  let rotation = b.z;
  let rotated = vec3f(local.x * cos(rotation) - local.z * sin(rotation), local.y, local.x * sin(rotation) + local.z * cos(rotation));
  let world = reefPoint(a.x, a.y, c.y * 2.35 + 0.08) + rotated;
  output.position = reefProject(world);
  output.normal = geometry[1];
  output.uv = uv;
  output.world = world;
  output.seed = c.x;
  output.family = family;
  output.part = partIndex;
  output.visible = select(0u, 1u, partData.visible && contract > 0.01);
  if (output.visible == 0u) { output.position = vec4f(2.0, 2.0, 2.0, 1.0); }
  return output;
}

@fragment
fn fragmentMain(input: Output) -> @location(0) vec4f {
  if (input.visible == 0u) { discard; }
  var tile = 0.0;
  var color = coralPrimary();
  if (input.family == 2u) { tile = 1.0; color = coralSecondary(); }
  else if (input.family == 3u) { tile = 2.0; color = mix(coralPrimary(), coralAccent(), 0.48); }
  else if (input.family == 4u) { tile = 3.0; color = coralSecondary(); }
  else if (input.family == 5u) { tile = 6.0; color = coralAccent(); }
  else if (input.family >= 6u) { tile = 5.0; color = mix(coralSecondary(), coralAccent(), 0.58); }
  let detail = textureSampleLevel(reefAtlas, reefSampler, atlasUv(tile, input.uv, 2.0 + input.seed * 2.0), 0.0);
  let lit = color * (0.76 + detail.r * 0.38) * reefLight(normalize(input.normal), input.world);
  let fade = 1.0 - reefStage(0.64, 0.84);
  return vec4f(lit, fade);
}
`;

export const REEF_WATER_SHADER = /* wgsl */ `
${REEF_COMMON}

struct Output {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) wave: f32,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> Output {
  var output: Output;
  let uv = quadUv(vertexIndex);
  let width = uniforms.gridSize * uniforms.blockSize * 1.02;
  let wave = sin(uv.x * 7.0 + uniforms.time * 0.42) * 0.08 + sin(uv.y * 5.0 - uniforms.time * 0.31) * 0.06;
  let withdraw = reefMotionStage(0.18, 0.38, 0.12, 0.28);
  let world = vec3f((uv.x - 0.5) * width, (7.4 + wave + withdraw * 3.5) * uniforms.blockSize, (uv.y - 0.5) * width);
  output.position = reefProject(world);
  output.uv = uv;
  output.wave = wave;
  return output;
}

@fragment
fn fragmentMain(input: Output) -> @location(0) vec4f {
  let withdraw = reefMotionStage(0.18, 0.38, 0.12, 0.28);
  let rim = pow(abs(input.wave) * 5.0, 1.4);
  let color = mix(waterColor(), vec3f(0.05, 0.48, 0.55), 0.38);
  return vec4f(color * (0.72 + rim * 0.28), (0.19 + rim * 0.08) * (1.0 - withdraw));
}
`;

export const REEF_FISH_SHADER = /* wgsl */ `
${REEF_COMMON}

struct Output {
  @builtin(position) position: vec4f,
  @location(0) body: f32,
  @location(1) shade: f32,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> Output {
  var output: Output;
  let a = fishData[instanceIndex * 3u];
  let b = fishData[instanceIndex * 3u + 1u];
  let c = fishData[instanceIndex * 3u + 2u];
  let retreat = reefMotionStage(0.0, 0.18, 0.0, 0.12);
  let t = fract(uniforms.time * b.w * 0.035 + c.x + retreat * 0.7);
  let inverse = 1.0 - t;
  let column = inverse * inverse * a.x + 2.0 * inverse * t * a.z + t * t * b.x;
  let row = inverse * inverse * a.y + 2.0 * inverse * t * a.w + t * t * b.y;
  let bodyVertex = vertexIndex % 6u;
  let triangle = array<vec2f, 6>(
    vec2f(-0.55, 0.0), vec2f(0.0, 0.26), vec2f(0.55, 0.0),
    vec2f(-0.55, 0.0), vec2f(0.55, 0.0), vec2f(0.0, -0.26)
  );
  let tail = array<vec2f, 6>(
    vec2f(-0.48, 0.0), vec2f(-0.78, 0.24), vec2f(-0.78, -0.24),
    vec2f(-0.48, 0.0), vec2f(-0.78, -0.24), vec2f(-0.78, 0.24)
  );
  let local = select(triangle[bodyVertex], tail[bodyVertex], vertexIndex >= 6u) * uniforms.blockSize;
  let world = reefPoint(column, row, b.z + 1.6) + vec3f(local.x, local.y, 0.0);
  output.position = reefProject(world);
  output.body = select(1.0, 0.7, vertexIndex >= 6u);
  output.shade = t;
  return output;
}

@fragment
fn fragmentMain(input: Output) -> @location(0) vec4f {
  let retreat = reefMotionStage(0.0, 0.18, 0.0, 0.12);
  let color = mix(coralAccent(), coralSecondary(), input.shade) * input.body;
  return vec4f(color, (1.0 - retreat) * 0.86);
}
`;

export const REEF_QR_SHADER = /* wgsl */ `
${REEF_COMMON}

struct Output {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) @interpolate(flat) visible: u32,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> Output {
  var output: Output;
  let position = blockPositions[instanceIndex];
  let reveal = reefStage(0.8, 0.97);
  let uv = quadUv(vertexIndex);
  let geometry = boxGeometry(vertexIndex / 6u, uv, vec3f(uniforms.blockSize * 0.91, uniforms.blockSize * 0.045, uniforms.blockSize * 0.91));
  let world = reefPoint(position.x, position.y, 0.08) + geometry[0];
  output.position = reefProject(world);
  output.normal = geometry[1];
  output.visible = select(0u, 1u, blockTypes[instanceIndex] != 0u && reveal > 0.001);
  if (output.visible == 0u) { output.position = vec4f(2.0, 2.0, 2.0, 1.0); }
  return output;
}

@fragment
fn fragmentMain(input: Output) -> @location(0) vec4f {
  if (input.visible == 0u) { discard; }
  let lock = reefStage(0.9, 1.0);
  return vec4f(mix(vec3f(0.035, 0.09, 0.08), vec3f(0.012), lock), 1.0);
}
`;
