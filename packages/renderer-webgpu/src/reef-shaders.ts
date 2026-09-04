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

// Tree-contract camera: continuous swing with a breathing pulse instead of a
// late jump to top-down.
fn reefProject(localPos: vec3f) -> vec4f {
  let cy = cos(mix(0.72, 0.0, uniforms.progress) + uniforms.cameraBobX);
  let sy = sin(mix(0.72, 0.0, uniforms.progress) + uniforms.cameraBobX);
  let cx = cos(mix(-0.48, -1.570796, uniforms.progress) + uniforms.cameraBobY);
  let sx = sin(mix(-0.48, -1.570796, uniforms.progress) + uniforms.cameraBobY);
  let rotX = localPos.x * cy - localPos.z * sy;
  let rotZ = localPos.x * sy + localPos.z * cy;
  let rotY = localPos.y * cx - rotZ * sx;
  let depth = localPos.y * sx + rotZ * cx;
  let portrait = select(1.0, 1.16, uniforms.aspectRatio < 0.8);
  let morphPulse = 1.0 + sin(uniforms.progress * 3.14159265) * 0.035;
  let scale = mix(40.0, 46.2, uniforms.progress) / uniforms.gridSize * portrait * morphPulse * uniforms.camera.x;
  let scaleX = scale / max(uniforms.aspectRatio, 1.0);
  let scaleY = scale / max(1.0 / uniforms.aspectRatio, 1.0);
  return vec4f((rotX + mix(0.0, 0.015, uniforms.progress)) * scaleX, (rotY + mix(-0.15, 0.07, uniforms.progress)) * scaleY, depth * 0.01 + 0.5, 1.0);
}

// Seeded per-colony delay so the reef contracts as a traveling wave.
fn reefDelay(column: f32, row: f32, seed: f32) -> f32 {
  let center = uniforms.gridSize * 0.5;
  let radial = distance(vec2f(column, row), vec2f(center, center)) / max(uniforms.gridSize * 0.71, 1.0);
  let jitter = fract(sin((column * 12.9898 + row * 78.233 + seed * 37.7) * 43.7585) * 43758.5453);
  return clamp((1.0 - radial) * 0.16 + jitter * 0.10, 0.0, 0.28);
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

fn acesToneMap(color: vec3f) -> vec3f {
  let x = color;
  let mapped = clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), vec3f(0.0), vec3f(1.0));
  var out = pow(mapped, vec3f(1.0 / 2.2));
  let gray = dot(out, vec3f(0.299, 0.587, 0.114));
  return mix(vec3f(gray), out, 1.28);
}

fn underwaterLighting(normal: vec3f, worldPos: vec3f, albedo: vec3f, roughness: f32, sssColor: vec3f, sssAmount: f32) -> vec3f {
  let sunDir = normalize(vec3f(-0.35, 0.88, -0.30));
  let key = max(dot(normal, sunDir), 0.0);
  let backLight = max(dot(-normal, sunDir), 0.0);
  let up = max(normal.y, 0.0);

  // Dual-harmonic animated caustics
  let time = uniforms.time;
  let c1 = sin(worldPos.x * 46.0 + time * 1.8 + sin(worldPos.z * 34.0 + time * 0.95));
  let c2 = sin(worldPos.z * 52.0 - time * 1.5 + sin(worldPos.x * 38.0 - time * 1.15));
  let caustics = pow(max(c1 * c2, 0.0), 1.6) * 0.55 * (1.0 - reefStage(0.65, 0.95));

  // Underwater light scattering
  let waterAmbient = mix(vec3f(0.08, 0.32, 0.45), vec3f(0.18, 0.55, 0.62), up * 0.5);
  let direct = key * 0.95 + caustics;
  let sss = backLight * sssAmount * sssColor * 0.65;

  let lit = albedo * (waterAmbient + direct) + sss;
  return lit;
}

fn coralPrimary() -> vec3f { return uniforms.themeSecondary.rgb; }
fn coralSecondary() -> vec3f { return uniforms.themeThird.rgb; }
fn coralAccent() -> vec3f { return uniforms.themeFourth.rgb; }
fn waterColor() -> vec3f { return mix(uniforms.themeThird.rgb, vec3f(0.08, 0.68, 0.78), 0.35); }
fn limestoneColor() -> vec3f { return uniforms.themeFifth.rgb; }

fn reefQrSubstrate() -> vec3f {
  let paleSand = mix(limestoneColor(), vec3f(0.96, 0.95, 0.91), 0.22);
  return mix(paleSand, waterColor(), 0.055);
}

fn reefQrInk() -> vec3f {
  let reefTint = mix(uniforms.themePrimary.rgb, coralPrimary(), 0.12);
  return mix(reefTint, vec3f(0.025, 0.055, 0.060), 0.36);
}

fn reefFinderInk(role: u32) -> vec3f {
  let base = reefQrInk();
  let colonyRing = mix(base, coralPrimary(), 0.09);
  return select(colonyRing, base * 0.70, role == 2u);
}

fn finderRole(column: f32, row: f32) -> u32 {
  let farOrigin = uniforms.gridSize - 7.0;
  var local = vec2f(-1.0);
  if (column < 7.0 && row < 7.0) {
    local = vec2f(column, row);
  } else if (column >= farOrigin && row < 7.0) {
    local = vec2f(column - farOrigin, row);
  } else if (column < 7.0 && row >= farOrigin) {
    local = vec2f(column, row - farOrigin);
  }
  if (local.x < 0.0) { return 0u; }
  let ring = min(min(local.x, local.y), min(6.0 - local.x, 6.0 - local.y));
  if (ring < 0.5) { return 1u; }
  if (ring > 1.5) { return 2u; }
  return 0u;
}

fn qrModuleMask(uv: vec2f, neighborMask: u32) -> f32 {
  let up = (neighborMask & 1u) != 0u;
  let right = (neighborMask & 2u) != 0u;
  let down = (neighborMask & 4u) != 0u;
  let left = (neighborMask & 8u) != 0u;
  let radius = 0.44;
  var mask = 1.0;
  if (!left && !up && uv.x < radius && uv.y < radius) {
    mask *= 1.0 - step(radius, distance(uv, vec2f(radius, radius)));
  }
  if (!right && !up && uv.x > 1.0 - radius && uv.y < radius) {
    mask *= 1.0 - step(radius, distance(uv, vec2f(1.0 - radius, radius)));
  }
  if (!left && !down && uv.x < radius && uv.y > 1.0 - radius) {
    mask *= 1.0 - step(radius, distance(uv, vec2f(radius, 1.0 - radius)));
  }
  if (!right && !down && uv.x > 1.0 - radius && uv.y > 1.0 - radius) {
    mask *= 1.0 - step(radius, distance(uv, vec2f(1.0 - radius, 1.0 - radius)));
  }
  return mask;
}
`;

export const REEF_SHELF_SHADER = /* wgsl */ `
${REEF_COMMON}

struct Output {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) world: vec3f,
  @location(2) normal: vec3f,
  @location(3) height: f32,
  @location(4) channel: f32,
  @location(5) seed: f32,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> Output {
  var output: Output;
  let uv = quadUv(vertexIndex);
  let position = blockPositions[instanceIndex];
  let shelf = shelfData[instanceIndex];

  let gridX = position.x + uv.x - 0.5;
  let gridZ = position.y + uv.y - 0.5;

  // Gentle undulating natural seabed relief
  let sandWave = sin(gridX * 0.38 + gridZ * 0.28) * 0.12 + sin(gridX * 0.82 - gridZ * 0.65) * 0.06;
  let ripple = sin(gridX * 3.6 + gridZ * 2.4) * 0.018;
  let baseRelief = shelf.x * 0.95 + 0.10 + sandWave + ripple;
  let flatten = reefStage(0.34, 0.86);
  let relief = mix(baseRelief, 0.035, flatten);

  let world = reefPoint(gridX, gridZ, relief);
  output.position = reefProject(world);
  output.uv = uv;
  output.world = world;
  output.height = shelf.x;
  output.channel = shelf.z;
  output.seed = shelf.w;

  let dHdx = (cos(gridX * 0.38 + gridZ * 0.28) * 0.045 + cos(gridX * 0.82 - gridZ * 0.65) * 0.049) * 1.5;
  let dHdz = (cos(gridX * 0.38 + gridZ * 0.28) * 0.033 - cos(gridX * 0.82 - gridZ * 0.65) * 0.039) * 1.5;
  output.normal = normalize(vec3f(-dHdx, 1.0, -dHdz));
  return output;
}

@fragment
fn fragmentMain(input: Output) -> @location(0) vec4f {
  let sandDetail = textureSampleLevel(reefAtlas, reefSampler, atlasUv(4.0, input.uv, 3.2), 0.0);
  let rockDetail = textureSampleLevel(reefAtlas, reefSampler, atlasUv(3.0, input.uv, 2.5), 0.0);
  let biolum = textureSampleLevel(reefAtlas, reefSampler, atlasUv(7.0, input.uv, 1.8), 0.0);

  // Warm golden lagoon sand with subtle turquoise water depth absorption
  let warmSand = vec3f(0.76, 0.68, 0.52);
  let lagoonSand = mix(warmSand, waterColor(), 0.18) * (0.86 + sandDetail.r * 0.24);

  // Rich coralline limestone with purple/pink crustose algae
  let corallineAlgae = mix(coralPrimary() * 0.65, vec3f(0.48, 0.25, 0.38), 0.45);
  let reefRock = mix(limestoneColor() * 0.62, corallineAlgae, 0.55) * (0.80 + rockDetail.r * 0.35);

  let shelfMix = smoothstep(0.15, 0.42, input.height) * (1.0 - input.channel * 0.85);
  var color = mix(lagoonSand, reefRock, shelfMix);

  // Glowing bioluminescent flecks in deeper crevices
  if (input.height < 0.22 && biolum.g > 0.62) {
    color = mix(color, coralSecondary() * 1.8, (biolum.g - 0.62) * 1.2);
  }

  let normal = normalize(input.normal);
  let lit = underwaterLighting(normal, input.world, color, 0.40, color, 0.12);
  let scan = reefStage(0.84, 1.0);
  let finalColor = mix(lit, reefQrSubstrate(), scan);
  return vec4f(acesToneMap(finalColor), 1.0);
}
`;

export const REEF_CORAL_SHADER = /* wgsl */ `
${REEF_COMMON}

const CORAL_PARTS: u32 = 12u;

struct Part {
  offset: vec3f,
  size: vec3f,
  visible: bool,
  isBranch: bool,
  isTentacle: bool,
  isPlate: bool,
  isDome: bool,
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
  @location(7) paramT: f32,
  @location(8) delay: f32,
}

fn makePart(part: u32, family: u32, scale: f32, height: f32, seed: f32) -> Part {
  var result: Part;
  result.offset = vec3f(0.0);
  result.size = vec3f(scale, height, scale);
  result.visible = part == 0u;
  result.isBranch = false;
  result.isTentacle = false;
  result.isPlate = false;
  result.isDome = false;

  if (family == 0u || family == 1u) {
    // Staghorn / Branching Coral: thick branching antlers with natural spread
    result.isBranch = true;
    result.visible = part < select(9u, 12u, family == 1u);
    if (part == 0u) {
      result.size = vec3f(scale * 0.42, height * 0.45, scale * 0.42);
      result.offset = vec3f(0.0, 0.0, 0.0);
    } else {
      let branchIdx = f32(part - 1u);
      let tier = f32(part / 4u);
      let angle = branchIdx * 1.570796 + seed * 3.14;
      let branchDist = scale * (0.28 + tier * 0.16);
      let branchY = height * (0.22 + tier * 0.26);
      let taper = 1.0 - tier * 0.20;
      result.size = vec3f(scale * 0.28 * taper, height * (0.42 - tier * 0.05), scale * 0.28 * taper);
      result.offset = vec3f(cos(angle) * branchDist, branchY, sin(angle) * branchDist);
    }
  } else if (family == 2u) {
    // Table / Plate Coral: tiered graceful horizontal shelves
    result.isPlate = true;
    result.visible = part < 6u;
    let layer = f32(part);
    let layerScale = scale * (1.1 - layer * 0.14);
    let layerY = layer * height * 0.19;
    result.size = vec3f(layerScale, height * 0.09, layerScale * 0.94);
    result.offset = vec3f(sin(seed * 6.0 + layer) * scale * 0.09, layerY, cos(seed * 6.0 + layer) * scale * 0.09);
  } else if (family == 3u || family == 4u) {
    // Brain Coral & Boulder Coral: hemispherical sculpted dome
    result.isDome = true;
    result.visible = part < select(6u, 4u, family == 4u);
    let tier = f32(part);
    let domeR = scale * (1.15 - tier * 0.16);
    result.size = vec3f(domeR, height * 0.28, domeR);
    result.offset = vec3f(0.0, tier * height * 0.20, 0.0);
  } else if (family == 5u) {
    // Tube / Chimney Sponges: cluster of vertical hollow cylinders
    result.visible = part < 8u;
    let tubeIdx = f32(part);
    let angle = tubeIdx * 1.2566 + seed * 2.0;
    let tubeDist = select(0.0, scale * (0.30 + fract(seed * 7.0 + tubeIdx) * 0.18), part > 0u);
    let tubeH = height * (0.62 + fract(seed * 11.0 + tubeIdx) * 0.45);
    result.size = vec3f(scale * 0.28, tubeH, scale * 0.28);
    result.offset = vec3f(cos(angle) * tubeDist, 0.0, sin(angle) * tubeDist);
  } else if (family == 6u || family == 8u) {
    // Sea Anemone & Soft Coral: crown of fluid flexible tentacles
    result.isTentacle = true;
    result.visible = part < select(10u, 8u, family == 8u);
    if (part == 0u) {
      result.size = vec3f(scale * 0.45, height * 0.48, scale * 0.45);
      result.offset = vec3f(0.0);
    } else {
      let tentacleIdx = f32(part - 1u);
      let angle = tentacleIdx * 0.785398 + seed * 3.14;
      let tentacleDist = scale * 0.36;
      result.size = vec3f(scale * 0.15, height * (0.72 + fract(seed * 13.0 + tentacleIdx) * 0.38), scale * 0.15);
      result.offset = vec3f(cos(angle) * tentacleDist, height * 0.32, sin(angle) * tentacleDist);
    }
  } else if (family == 7u) {
    // Sea Fan: planar filigree fan
    result.visible = part < 10u;
    let branch = f32(part);
    result.size = vec3f(scale * 0.11, height * (0.46 + branch * 0.05), scale * 0.05);
    result.offset = vec3f((branch - 4.5) * scale * 0.10, branch * height * 0.042, sin(branch * 1.5) * scale * 0.04);
  } else {
    // Seagrass / Kelp
    result.isTentacle = true;
    result.visible = part < 8u;
    let strand = f32(part);
    let angle = strand * 1.57 + seed * 4.0;
    result.size = vec3f(scale * 0.11, height * (0.70 + fract(seed * 17.0 + strand) * 0.42), scale * 0.05);
    result.offset = vec3f(cos(angle) * scale * 0.28, 0.0, sin(angle) * scale * 0.28);
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

  // Fluid multi-harmonic ocean surge
  let time = uniforms.time;
  let flexible = select(0.0, 1.0 - b.w * 0.7, family == 6u || family == 7u || family == 8u || family == 9u);
  let waveSurge = sin(time * 1.4 + a.x * 0.28 + a.y * 0.19) * 0.16 + sin(time * 2.8 + a.x * 0.5) * 0.05;
  let current = waveSurge * (flexible + select(0.02, 0.12, partData.isTentacle));

  // Staggered contraction wave: soft colonies fold first, rigid heads last,
  // each within its own seeded window instead of one global pop.
  let delay = reefDelay(a.x, a.y, c.x) + select(0.0, 0.10, flexible < 0.5);
  let contract = 1.0 - reefStage(0.30 + delay, 0.72 + delay) * select(0.78, 0.96, flexible > 0.0);
  let face = vertexIndex / 6u;
  let uv = quadUv(vertexIndex);
  let geometry = boxGeometry(face, uv, partData.size * uniforms.blockSize * vec3f(contract, contract, contract));

  var local = geometry[0] + partData.offset * uniforms.blockSize * contract;

  // Organic geometry deformation based on coral family
  if (partData.isBranch) {
    let t = clamp(local.y / max(partData.size.y * uniforms.blockSize, 0.001), 0.0, 1.0);
    local.x *= mix(1.15, 0.65, t);
    local.z *= mix(1.15, 0.65, t);
  } else if (partData.isPlate) {
    let polarR = length(local.xz);
    let polarAngle = atan2(local.z, local.x);
    let ruffle = 1.0 + sin(polarAngle * 8.0 + c.x * 12.0) * 0.12;
    local.x *= ruffle;
    local.z *= ruffle;
  } else if (partData.isTentacle) {
    let t = clamp(local.y / max(partData.size.y * uniforms.blockSize, 0.001), 0.0, 1.0);
    let tentacleSway = sin(time * 2.2 + f32(partIndex) * 1.2 + t * 3.5) * t * t * uniforms.blockSize * 0.8;
    local.x += tentacleSway;
  }

  local.x += current * local.y * 1.5;

  let rotation = b.z;
  let rotated = vec3f(
    local.x * cos(rotation) - local.z * sin(rotation),
    local.y,
    local.x * sin(rotation) + local.z * cos(rotation)
  );
  let world = reefPoint(a.x, a.y, c.y * 0.95 + 0.12) + rotated;
  output.position = reefProject(world);
  output.normal = geometry[1];
  output.uv = uv;
  output.world = world;
  output.seed = c.x;
  output.family = family;
  output.part = partIndex;
  output.paramT = uv.y;
  output.delay = delay;
  output.visible = select(0u, 1u, partData.visible && contract > 0.01);
  if (output.visible == 0u) { output.position = vec4f(2.0, 2.0, 2.0, 1.0); }
  return output;
}

@fragment
fn fragmentMain(input: Output) -> @location(0) vec4f {
  if (input.visible == 0u) { discard; }
  var tile = 0.0;
  var color = coralPrimary();
  var sssAmount = 0.25;
  var sssTint = coralPrimary();

  if (input.family == 0u || input.family == 1u) {
    // Branching / Bush: Rich coral red/pink with golden glowing growing tips
    tile = 0.0;
    let branchBody = coralPrimary();
    let branchTip = coralAccent() * 1.2;
    color = mix(branchBody, branchTip, pow(input.paramT, 1.8));
    sssAmount = 0.42;
    sssTint = branchTip;
  } else if (input.family == 2u) {
    // Table coral: Tiered turquoise plate with vibrant pink/coral ruffled rim
    tile = 1.0;
    let plateCenter = coralSecondary();
    let plateRim = coralPrimary();
    let rimFactor = smoothstep(0.35, 0.48, distance(input.uv, vec2f(0.5, 0.5)));
    color = mix(plateCenter, plateRim, rimFactor);
    sssAmount = 0.32;
    sssTint = plateRim;
  } else if (input.family == 3u) {
    // Brain coral: Deep velvet coral with lavender/cyan meandering convolutions
    tile = 2.0;
    color = mix(coralPrimary() * 0.95, coralSecondary() * 1.1, 0.42);
    sssAmount = 0.35;
    sssTint = coralPrimary();
  } else if (input.family == 4u) {
    // Boulder coral: Massive porous coral head
    tile = 3.0;
    color = mix(coralPrimary() * 0.75, limestoneColor(), 0.35);
    sssAmount = 0.22;
  } else if (input.family == 5u) {
    // Tube sponges: Vibrant golden amber tubes with hollow dark osculum
    tile = 6.0;
    color = coralAccent() * 1.25;
    sssAmount = 0.48;
    sssTint = vec3f(1.0, 0.85, 0.42);
    if (input.normal.y > 0.6 && distance(input.uv, vec2f(0.5, 0.5)) < 0.32) {
      color = vec3f(0.03, 0.04, 0.06);
    }
  } else if (input.family == 6u || input.family == 8u) {
    // Sea Anemone & Soft Coral: Glowing translucent tentacles
    tile = 5.0;
    let tentacleBase = coralPrimary();
    let tentacleTip = mix(coralAccent(), vec3f(1.0, 0.98, 0.88), 0.55);
    color = mix(tentacleBase, tentacleTip, input.paramT);
    sssAmount = 0.85;
    sssTint = tentacleTip;
  } else if (input.family == 7u) {
    // Sea fan: Rich magenta/gold filigree lace
    tile = 5.0;
    color = mix(coralAccent(), coralPrimary(), 0.65);
    sssAmount = 0.58;
    sssTint = coralAccent();
  } else {
    // Seagrass: Emerald ribbon
    tile = 4.0;
    color = mix(vec3f(0.12, 0.78, 0.48), coralSecondary(), 0.30);
    sssAmount = 0.48;
  }

  let detail = textureSampleLevel(reefAtlas, reefSampler, atlasUv(tile, input.uv, 2.0 + input.seed * 2.0), 0.0);
  let albedo = color * (0.80 + detail.r * 0.32);
  let normal = normalize(input.normal);
  let lit = underwaterLighting(normal, input.world, albedo, 0.42, sssTint, sssAmount);
  let fade = 1.0 - reefStage(0.60 + input.delay, 0.86 + input.delay);
  return vec4f(acesToneMap(lit), fade);
}
`;

export const REEF_WATER_SHADER = /* wgsl */ `
${REEF_COMMON}

struct Output {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) wave: f32,
  @location(2) edgeFade: f32,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> Output {
  var output: Output;
  let uv = quadUv(vertexIndex);
  let width = uniforms.gridSize * uniforms.blockSize * 1.65;
  let wave = sin(uv.x * 6.5 + uniforms.time * 0.65) * 0.08 + sin(uv.y * 5.2 - uniforms.time * 0.52) * 0.06;
  let withdraw = reefStage(0.10, 0.44);
  let world = vec3f((uv.x - 0.5) * width, (12.0 + wave + withdraw * 4.0) * uniforms.blockSize, (uv.y - 0.5) * width);
  output.position = reefProject(world);
  output.uv = uv;
  output.wave = wave;

  // Soft edge dissolve into water atmosphere so no hard box borders appear
  let edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  output.edgeFade = smoothstep(0.02, 0.32, edgeDist);
  return output;
}

@fragment
fn fragmentMain(input: Output) -> @location(0) vec4f {
  let withdraw = reefStage(0.10, 0.44);
  let rim = pow(abs(input.wave) * 4.5, 1.3);
  let sunGlint = pow(max(sin((input.uv.x + input.uv.y) * 14.0 + uniforms.time * 1.6), 0.0), 5.0) * 0.35;
  let surfaceAqua = mix(waterColor(), vec3f(0.18, 0.78, 0.90), 0.5);
  let finalColor = surfaceAqua * (0.90 + rim * 0.30 + sunGlint);
  let alpha = (0.07 + rim * 0.05) * input.edgeFade * (1.0 - withdraw);
  return vec4f(acesToneMap(finalColor), alpha);
}
`;

export const REEF_FISH_SHADER = /* wgsl */ `
${REEF_COMMON}

struct Output {
  @builtin(position) position: vec4f,
  @location(0) bodyPart: f32,
  @location(1) shade: f32,
  @location(2) normal: vec3f,
  @location(3) finAlpha: f32,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> Output {
  var output: Output;
  let a = fishData[instanceIndex * 3u];
  let b = fishData[instanceIndex * 3u + 1u];
  let c = fishData[instanceIndex * 3u + 2u];
  let retreat = reefStage(0.0, 0.26);
  // Fish dart away and dive under the shelf as fixation begins.
  let diveDepth = b.z + 1.8 - retreat * 16.0;

  let speed = b.w * 0.045;
  let t = fract(uniforms.time * speed + c.x + retreat * 0.7);
  let invT = 1.0 - t;

  // Bezier curve trajectory
  let col = invT * invT * a.x + 2.0 * invT * t * a.z + t * t * b.x;
  let row = invT * invT * a.y + 2.0 * invT * t * a.w + t * t * b.y;

  // Tangent for fish orientation
  let dt = 0.015;
  let t2 = fract(t + dt);
  let invT2 = 1.0 - t2;
  let col2 = invT2 * invT2 * a.x + 2.0 * invT2 * t2 * a.z + t2 * t2 * b.x;
  let row2 = invT2 * invT2 * a.y + 2.0 * invT2 * t2 * a.w + t2 * t2 * b.y;
  let dir = normalize(vec2f(col2 - col, row2 - row));
  let side = vec2f(-dir.y, dir.x);

  // Rapid undulating tail swish synced to swimming speed
  let wiggle = sin(uniforms.time * 16.0 + c.x * 20.0);

  let localVertex = vertexIndex % 36u;
  let bSize = uniforms.blockSize * 1.25;
  var local = vec3f(0.0);
  var normal = vec3f(0.0, 1.0, 0.0);
  var partId = 0.0;
  var alpha = 1.0;

  if (localVertex < 18u) {
    // 3D Contoured Fish Body (Head, Torso, Caudal peduncle)
    partId = 1.0;
    let tri = localVertex % 6u;
    let section = localVertex / 6u; // 0: head, 1: midbody, 2: tail base

    let lengthZ = select(0.55, select(0.0, -0.55, section == 2u), section == 1u) * bSize;
    let widthX = select(0.24, 0.10, section == 2u) * bSize;
    let heightY = select(0.28, 0.14, section == 2u) * bSize;
    let tailOffset = select(0.0, wiggle * 0.18 * bSize, section == 2u);

    let quad = array<vec2f, 6>(
      vec2f(-1.0, 0.0), vec2f(1.0, 0.0), vec2f(0.0, 1.0),
      vec2f(-1.0, 0.0), vec2f(0.0, -1.0), vec2f(1.0, 0.0)
    );
    let q = quad[tri];
    local = vec3f(
      dir.x * lengthZ + side.x * (q.x * widthX + tailOffset),
      q.y * heightY,
      dir.y * lengthZ + side.y * (q.x * widthX + tailOffset)
    );
    normal = vec3f(side.x * q.x, q.y, side.y * q.x);
  } else if (localVertex < 24u) {
    // Dorsal Fin on top
    partId = 2.0;
    let tri = localVertex - 18u;
    let finPts = array<vec2f, 6>(
      vec2f(-0.15, 0.22), vec2f(0.15, 0.22), vec2f(-0.05, 0.52),
      vec2f(-0.15, 0.22), vec2f(-0.05, 0.52), vec2f(0.15, 0.22)
    );
    let p = finPts[tri];
    local = vec3f(dir.x * p.x * bSize, p.y * bSize, dir.y * p.x * bSize);
    normal = vec3f(0.0, 1.0, 0.0);
    alpha = 0.85;
  } else {
    // Caudal (Tail) Fin - swishing with fast hydrodynamic oscillation!
    partId = 3.0;
    let tri = localVertex - 24u;
    let tailSwish = wiggle * 0.35 * bSize;
    let tailPts = array<vec2f, 6>(
      vec2f(-0.55, 0.0), vec2f(-0.95, 0.32), vec2f(-0.95, -0.32),
      vec2f(-0.55, 0.0), vec2f(-0.95, -0.32), vec2f(-0.95, 0.32)
    );
    let p = tailPts[tri % 6u];
    let tailX = select(0.0, tailSwish, p.x < -0.6);
    local = vec3f(
      dir.x * p.x * bSize + side.x * tailX,
      p.y * bSize,
      dir.y * p.x * bSize + side.y * tailX
    );
    normal = vec3f(side.x, 0.0, side.y);
    alpha = 0.90;
  }

  let world = reefPoint(col, row, diveDepth) + local;
  output.position = reefProject(world);
  output.bodyPart = partId;
  output.shade = fract(t + c.x);
  output.normal = normal;
  output.finAlpha = alpha * (1.0 - retreat);
  return output;
}

@fragment
fn fragmentMain(input: Output) -> @location(0) vec4f {
  let tier = fract(input.shade * 3.7);

  // Tropical Fish Coloration
  var bodyCol = coralPrimary();
  var stripeCol = vec3f(1.0, 1.0, 1.0);
  var finCol = coralAccent();

  if (tier > 0.65) {
    // Clownfish: Orange body with white bars
    bodyCol = mix(coralAccent(), vec3f(1.0, 0.42, 0.12), 0.7);
    stripeCol = vec3f(0.98, 0.98, 0.98);
    finCol = vec3f(0.08, 0.08, 0.12);
  } else if (tier > 0.32) {
    // Blue Tang: Royal blue body with golden tail
    bodyCol = mix(coralSecondary(), vec3f(0.12, 0.35, 0.92), 0.6);
    stripeCol = vec3f(0.06, 0.08, 0.12);
    finCol = mix(coralAccent(), vec3f(1.0, 0.88, 0.15), 0.8);
  } else {
    // Butterflyfish: Pale yellow with dark accents
    bodyCol = mix(limestoneColor(), coralAccent(), 0.4);
    stripeCol = mix(coralPrimary(), vec3f(0.06, 0.08, 0.12), 0.8);
    finCol = coralAccent();
  }

  var color = bodyCol;
  if (input.bodyPart > 2.5) {
    color = finCol; // Tail fin
  } else if (input.bodyPart > 1.5) {
    color = mix(finCol, stripeCol, 0.5); // Dorsal fin
  } else {
    // Body stripes
    let stripePattern = sin(input.shade * 35.0);
    if (abs(stripePattern) > 0.65) {
      color = stripeCol;
    }
  }

  let lighting = 0.55 + max(dot(input.normal, normalize(vec3f(-0.35, 0.88, -0.30))), 0.0) * 0.65;
  let lit = color * lighting;
  return vec4f(acesToneMap(lit), input.finAlpha);
}
`;

export const REEF_QR_SHADER = /* wgsl */ `
${REEF_COMMON}

struct Output {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) uv: vec2f,
  @location(2) molten: f32,
  @location(3) tint: f32,
  @location(4) @interpolate(flat) visible: u32,
  @location(5) @interpolate(flat) neighborMask: u32,
  @location(6) @interpolate(flat) finderRole: u32,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> Output {
  var output: Output;
  let position = blockPositions[instanceIndex];
  let role = finderRole(position.x, position.y);
  // Living polyps sprout upward in a seeded radial sweep, finder polyps
  // first, then settle into the flat scan plaques.
  let center = uniforms.gridSize * 0.5;
  let radial = distance(vec2f(position.x, position.y), vec2f(center, center)) / max(uniforms.gridSize * 0.71, 1.0);
  let jitter = fract(sin((position.x * 12.9898 + position.y * 78.233 + 5.13) * 43.7585) * 43758.5453);
  let delay = clamp(radial * 0.20 + jitter * 0.10 - select(0.0, 0.08, role > 0u), 0.0, 0.30);
  let rise = reefStage(0.18 + delay, 0.56 + delay);
  let settle = reefStage(0.62 + delay, 0.92 + delay);
  let molten = rise * (1.0 - settle);
  let height = (0.052 + max(0.34 * rise - 0.052, 0.0) * (1.0 - settle)) * uniforms.blockSize;
  let footprint = mix(0.84, 0.92, settle) * uniforms.blockSize;
  let uv = quadUv(vertexIndex);
  let geometry = boxGeometry(vertexIndex / 6u, uv, vec3f(footprint, height, footprint));
  var local = geometry[0];
  // Lobed organic crown while the polyp stands; square plaque at lock.
  let topness = clamp(local.y / max(height, 0.0001), 0.0, 1.0);
  let lobe = sin(atan2(local.z, local.x) * 3.0 + position.x * 2.3 + position.y * 1.7) * 0.10;
  let pinch = 1.0 - topness * molten * (0.30 - lobe);
  local.x *= pinch;
  local.z *= pinch;
  let sway = sin(uniforms.time * 1.6 + position.x * 4.1 + position.y * 2.9) * 0.03 * molten * uniforms.blockSize;
  let world = reefPoint(position.x, position.y, 0.10) + local + vec3f(sway, 0.0, -sway);
  output.position = reefProject(world);
  output.normal = geometry[1];
  output.uv = uv;
  output.molten = molten;
  output.tint = fract(sin(position.x * 17.3 + position.y * 31.1 + 9.7) * 43758.5);
  output.visible = select(0u, 1u, blockTypes[instanceIndex] != 0u && rise > 0.002);
  output.neighborMask = u32(position.w);
  output.finderRole = role;
  if (output.visible == 0u) { output.position = vec4f(2.0, 2.0, 2.0, 1.0); }
  return output;
}

@fragment
fn fragmentMain(input: Output) -> @location(0) vec4f {
  if (input.visible == 0u) { discard; }

  let lock = reefStage(0.90, 1.0);
  let organicMask = qrModuleMask(input.uv, input.neighborMask);
  let moduleMask = select(organicMask, 1.0, input.finderRole > 0u && lock > 0.7);
  if (abs(input.normal.y) > 0.5 && moduleMask < 0.5) {
    discard;
  }

  let roleInk = select(reefQrInk(), reefFinderInk(input.finderRole), input.finderRole > 0u);
  let edgeDistance = min(min(input.uv.x, 1.0 - input.uv.x), min(input.uv.y, 1.0 - input.uv.y));
  let membrane = 1.0 - smoothstep(0.055, 0.16, edgeDistance);
  let reefDetail = textureSampleLevel(reefAtlas, reefSampler, atlasUv(2.0, input.uv, 1.6), 0.0);
  var plaqueInk = mix(roleInk, coralPrimary(), membrane * 0.065);
  plaqueInk *= 0.97 + reefDetail.r * 0.035;
  let scanMaterial = select(plaqueInk * 0.84, plaqueInk, input.normal.y > 0.5);
  // Per-module tint variation survives scan lock like the tree QR.
  let cooled = scanMaterial * (0.94 + input.tint * 0.09);
  let polypColor = mix(coralPrimary() * 1.1, coralAccent() * 1.4, 0.5 * input.molten)
    * (1.15 + input.molten * 0.85);
  let finalColor = mix(cooled, polypColor, input.molten);
  return vec4f(acesToneMap(finalColor), 1.0);
}
`;
