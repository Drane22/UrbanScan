const GLASS_UNIFORMS_WGSL = /* wgsl */ `
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

fn glassInk() -> vec3f {
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

fn glassPaper() -> vec3f {
  return mix(uniforms.themeFifth.rgb, vec3f(1.0), 0.68);
}

fn glassStage(start: f32, end: f32) -> f32 {
  return smoothstep(start, end, uniforms.progress);
}

fn glassProject(localPos: vec3f) -> vec4f {
  let camera = glassStage(0.5, 1.0);
  let angleY = mix(0.70, 0.0, camera);
  let angleX = mix(-0.58, -1.570796, camera);
  let cy = cos(angleY);
  let sy = sin(angleY);
  let cx = cos(angleX);
  let sx = sin(angleX);

  let rotX = localPos.x * cy - localPos.z * sy;
  let rotZ = localPos.x * sy + localPos.z * cy;
  let rotY = localPos.y * cx - rotZ * sx;
  let depth = localPos.y * sx + rotZ * cx;

  let portrait = select(1.0, 1.18, uniforms.aspectRatio < 0.8);
  let pulse = 1.0 + sin(camera * 3.14159265) * 0.025;
  let scale = mix(38.0, 46.4, camera) / uniforms.gridSize * portrait * pulse * uniforms.camera.x;
  let scaleX = scale / max(uniforms.aspectRatio, 1.0);
  let scaleY = scale / max(1.0 / uniforms.aspectRatio, 1.0);
  let yOffset = mix(-0.16, 0.08, camera) + uniforms.cameraBobY;

  return vec4f(rotX * scaleX + uniforms.cameraBobX, (rotY + yOffset) * scaleY, depth * 0.01 + 0.5, 1.0);
}
`;

export const STAINED_GLASS_SHADER = /* wgsl */ `
${GLASS_UNIFORMS_WGSL}

struct GlassOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) @interpolate(flat) blockType: u32,
  @location(2) @interpolate(flat) paneType: u32,
  @location(3) @interpolate(flat) colorIndex: u32,
  @location(4) @interpolate(flat) connections: u32,
  @location(5) seed: f32,
  @location(6) shade: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> blockTypes: array<u32>;
@group(0) @binding(2) var<storage, read> blockPositions: array<vec4f>;
@group(0) @binding(3) var<storage, read> blockHeights: array<f32>;
@group(0) @binding(4) var<storage, read> paneData: array<vec4f>;

const QUAD_VERTS: array<vec2f, 6> = array<vec2f, 6>(
  vec2f(-0.5, -0.5), vec2f(0.5, -0.5), vec2f(0.5, 0.5),
  vec2f(-0.5, -0.5), vec2f(0.5, 0.5), vec2f(-0.5, 0.5)
);

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> GlassOutput {
  var output: GlassOutput;
  let cellIndex = instanceIndex;

  if (cellIndex >= arrayLength(&blockPositions)) {
    output.position = vec4f(2.0, 2.0, 2.0, 1.0);
    return output;
  }

  let posData = blockPositions[cellIndex];
  let raw = paneData[cellIndex];
  let paneType = u32(raw.x);
  let colorIndex = u32(raw.y);
  let conn = u32(raw.z);
  let seed = raw.w / 1000.0;
  let isDark = blockTypes[cellIndex] != 0u;

  let v = QUAD_VERTS[vertexIndex % 6u];
  let qrStage = glassStage(0.8, 1.0);
  let sz = mix(0.96, 1.0, qrStage);

  let center = (uniforms.gridSize - 1.0) * 0.5;
  let worldX = posData.x - center + v.x * sz;
  let worldZ = posData.y - center + v.y * sz;
  let worldY = select(0.01, 0.05, isDark);

  let modelPos = vec3f(worldX, worldY, worldZ);
  output.position = glassProject(modelPos);
  output.uv = v + 0.5;
  output.blockType = blockTypes[cellIndex];
  output.paneType = paneType;
  output.colorIndex = colorIndex;
  output.connections = conn;
  output.seed = seed;
  output.shade = 0.9 + 0.1 * sin(seed * 6.28);

  return output;
}

@fragment
fn fragmentMain(input: GlassOutput) -> @location(0) vec4f {
  let isDark = input.blockType != 0u;
  let morphQR = glassStage(0.85, 1.0);

  if (morphQR >= 1.0) {
    let finalColor = select(glassPaper(), glassInk(), isDark);
    return vec4f(finalColor, 1.0);
  }

  // Gem-tone cathedral glass palette
  let gemColors: array<vec3f, 6> = array<vec3f, 6>(
    vec3f(0.12, 0.28, 0.78), // Cobalt sapphire
    vec3f(0.76, 0.12, 0.22), // Ruby crimson
    vec3f(0.92, 0.65, 0.18), // Amber gold
    vec3f(0.08, 0.58, 0.42), // Emerald green
    vec3f(0.55, 0.18, 0.68), // Amethyst violet
    vec3f(0.18, 0.65, 0.85)  // Aquamarine
  );

  let frostedGlass = vec3f(0.92, 0.94, 0.96);
  let leadCame = vec3f(0.12, 0.13, 0.15);

  let uv = input.uv;
  var glassColor = frostedGlass;

  if (isDark) {
    if (input.paneType == 2u || input.paneType == 3u) {
      // Finder Landmark: Gothic Rose Window medallion
      let centered = uv - 0.5;
      let angle = atan2(centered.y, centered.x);
      let dist = length(centered);
      let petal = sin(angle * 8.0);
      let ring = select(gemColors[0], gemColors[2], petal > 0.0);
      glassColor = mix(ring, gemColors[1], step(0.25, dist));
    } else {
      glassColor = gemColors[input.colorIndex % 6u];
    }
  }

  // Lead came border line
  let leadWidth = mix(0.06, 0.0, morphQR);
  let onCameX = uv.x < leadWidth || uv.x > 1.0 - leadWidth;
  let onCameY = uv.y < leadWidth || uv.y > 1.0 - leadWidth;
  let onCame = onCameX || onCameY;

  // Luminous backlight effect
  let backLight = 1.0 + 0.25 * sin(uniforms.time * 1.5 + input.seed * 6.28);
  var shaded = select(glassColor * backLight, leadCame, onCame);

  // Transition to canonical QR
  let canonicalColor = select(glassPaper(), glassInk(), isDark);
  shaded = mix(shaded, canonicalColor, morphQR);

  return vec4f(shaded, 1.0);
}
`;
