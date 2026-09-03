const MYCELIUM_UNIFORMS_WGSL = /* wgsl */ `
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

fn mycInk() -> vec3f {
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

fn mycPaper() -> vec3f {
  return mix(uniforms.themeFifth.rgb, vec3f(1.0), 0.68);
}

fn mycStage(start: f32, end: f32) -> f32 {
  return smoothstep(start, end, uniforms.progress);
}

fn mycProject(localPos: vec3f) -> vec4f {
  let camera = mycStage(0.5, 1.0);
  let angleY = mix(0.7854, 0.0, camera);
  let angleX = mix(-0.60, -1.570796, camera);
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

export const MYCELIUM_SHADER = /* wgsl */ `
${MYCELIUM_UNIFORMS_WGSL}

struct MyceliumOutput {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) uv: vec2f,
  @location(2) @interpolate(flat) blockType: u32,
  @location(3) @interpolate(flat) nodeType: u32,
  @location(4) @interpolate(flat) connections: u32,
  @location(5) @interpolate(flat) partIndex: u32,
  @location(6) shade: f32,
  @location(7) seed: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> blockTypes: array<u32>;
@group(0) @binding(2) var<storage, read> blockPositions: array<vec4f>;
@group(0) @binding(3) var<storage, read> blockHeights: array<f32>;
@group(0) @binding(4) var<storage, read> fungalData: array<vec4f>;

const CUBE_VERTS: array<vec3f, 36> = array<vec3f, 36>(
  // Top
  vec3f(-0.5, 0.5, -0.5), vec3f(-0.5, 0.5,  0.5), vec3f( 0.5, 0.5,  0.5),
  vec3f(-0.5, 0.5, -0.5), vec3f( 0.5, 0.5,  0.5), vec3f( 0.5, 0.5, -0.5),
  // Bottom
  vec3f(-0.5, -0.5,  0.5), vec3f(-0.5, -0.5, -0.5), vec3f( 0.5, -0.5, -0.5),
  vec3f(-0.5, -0.5,  0.5), vec3f( 0.5, -0.5, -0.5), vec3f( 0.5, -0.5,  0.5),
  // Front
  vec3f(-0.5, -0.5, 0.5), vec3f( 0.5, -0.5, 0.5), vec3f( 0.5, 0.5, 0.5),
  vec3f(-0.5, -0.5, 0.5), vec3f( 0.5, 0.5, 0.5), vec3f(-0.5, 0.5, 0.5),
  // Back
  vec3f( 0.5, -0.5, -0.5), vec3f(-0.5, -0.5, -0.5), vec3f(-0.5, 0.5, -0.5),
  vec3f( 0.5, -0.5, -0.5), vec3f(-0.5, 0.5, -0.5), vec3f( 0.5, 0.5, -0.5),
  // Right
  vec3f(0.5, -0.5,  0.5), vec3f(0.5, -0.5, -0.5), vec3f(0.5, 0.5, -0.5),
  vec3f(0.5, -0.5,  0.5), vec3f(0.5, 0.5, -0.5), vec3f(0.5, 0.5,  0.5),
  // Left
  vec3f(-0.5, -0.5, -0.5), vec3f(-0.5, -0.5,  0.5), vec3f(-0.5, 0.5,  0.5),
  vec3f(-0.5, -0.5, -0.5), vec3f(-0.5, 0.5,  0.5), vec3f(-0.5, 0.5, -0.5)
);

const CUBE_NORMS: array<vec3f, 6> = array<vec3f, 6>(
  vec3f(0.0, 1.0, 0.0), vec3f(0.0, -1.0, 0.0),
  vec3f(0.0, 0.0, 1.0), vec3f(0.0, 0.0, -1.0),
  vec3f(1.0, 0.0, 0.0), vec3f(-1.0, 0.0, 0.0)
);

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> MyceliumOutput {
  var output: MyceliumOutput;
  let cellIndex = instanceIndex / 2u;
  let part = instanceIndex % 2u;

  if (cellIndex >= arrayLength(&blockPositions)) {
    output.position = vec4f(2.0, 2.0, 2.0, 1.0);
    return output;
  }

  let posData = blockPositions[cellIndex];
  let raw = fungalData[cellIndex];
  let nodeType = u32(raw.x);
  let rawHeight = raw.y;
  let conn = u32(raw.z);
  let seed = raw.w / 1000.0;
  let isDark = blockTypes[cellIndex] != 0u;

  let v = CUBE_VERTS[vertexIndex % 36u];
  let normal = CUBE_NORMS[(vertexIndex % 36u) / 6u];

  let retractStage = mycStage(0.2, 0.85);
  let qrStage = mycStage(0.8, 1.0);

  var sizeX = 0.96;
  var sizeZ = 0.96;
  var sizeY = 0.06;
  var offsetY = sizeY * 0.5;

  if (part == 0u) {
    // Spore moss ground tile
    sizeX = mix(0.96, 1.0, qrStage);
    sizeZ = mix(0.96, 1.0, qrStage);
    sizeY = mix(0.06, 0.01, qrStage);
    offsetY = sizeY * 0.5;
  } else {
    // 3D Mushroom stalks & caps
    if (!isDark || retractStage >= 1.0) {
      output.position = vec4f(2.0, 2.0, 2.0, 1.0);
      return output;
    }
    let h = mix(rawHeight * 0.55, 0.01, retractStage);
    sizeY = h;
    sizeX = mix(0.85, 1.0, retractStage);
    sizeZ = mix(0.85, 1.0, retractStage);
    offsetY = 0.06 + sizeY * 0.5;
  }

  let center = (uniforms.gridSize - 1.0) * 0.5;
  let worldX = posData.x - center + v.x * sizeX;
  let worldZ = posData.y - center + v.z * sizeZ;
  let worldY = offsetY + v.y * sizeY;

  let modelPos = vec3f(worldX, worldY, worldZ);
  output.position = mycProject(modelPos);
  output.normal = normal;
  output.uv = v.xz + 0.5;
  output.blockType = blockTypes[cellIndex];
  output.nodeType = nodeType;
  output.connections = conn;
  output.partIndex = part;
  output.seed = seed;

  let lightDir = normalize(vec3f(0.5, 0.85, 0.35));
  output.shade = clamp(dot(normal, lightDir) * 0.45 + 0.55, 0.25, 1.0);

  return output;
}

@fragment
fn fragmentMain(input: MyceliumOutput) -> @location(0) vec4f {
  let isDark = input.blockType != 0u;
  let morphQR = mycStage(0.85, 1.0);

  if (morphQR >= 1.0) {
    let finalColor = select(mycPaper(), mycInk(), isDark);
    return vec4f(finalColor, 1.0);
  }

  let darkPeat = vec3f(0.08, 0.12, 0.09);
  let neonEmerald = vec3f(0.12, 0.95, 0.45);
  let bioCyan = vec3f(0.15, 0.85, 0.95);
  let stalkCream = vec3f(0.88, 0.90, 0.82);
  let sporeGold = vec3f(0.95, 0.82, 0.25);

  var color = darkPeat;

  if (input.partIndex == 0u) {
    // Spore ground with glowing hyphae strands between connected cells
    let uv = input.uv;
    let dist = length(uv - 0.5);

    var hasStrand = false;
    let strandWidth = 0.08;
    if ((input.connections & 1u) != 0u && uv.y > 0.5 && abs(uv.x - 0.5) < strandWidth) { hasStrand = true; }
    if ((input.connections & 2u) != 0u && uv.x > 0.5 && abs(uv.y - 0.5) < strandWidth) { hasStrand = true; }
    if ((input.connections & 4u) != 0u && uv.y < 0.5 && abs(uv.x - 0.5) < strandWidth) { hasStrand = true; }
    if ((input.connections & 8u) != 0u && uv.x < 0.5 && abs(uv.y - 0.5) < strandWidth) { hasStrand = true; }

    if (hasStrand) {
      let pulse = 0.7 + 0.3 * sin(uniforms.time * 3.0 + input.seed * 6.28);
      color = bioCyan * pulse;
    } else {
      let moss = sin(uv.x * 24.0) * sin(uv.y * 24.0);
      color = mix(darkPeat, vec3f(0.10, 0.25, 0.14), moss * 0.4 + 0.5);
    }
  } else {
    // Fungal stalks and glowing bioluminescent mushroom caps
    let pulse = 0.75 + 0.25 * sin(uniforms.time * 2.5 + input.seed * 6.28);

    if (input.nodeType == 4u || input.nodeType == 5u) {
      // Giant Fungal Tower / Core Spire (Finder Landmark)
      let capPattern = length(input.uv - 0.5);
      color = mix(bioCyan * 1.3, neonEmerald, capPattern) * pulse;
    } else if (input.nodeType == 3u) {
      // Glowing puffball
      color = mix(neonEmerald, bioCyan, input.seed) * pulse;
    } else {
      // Stalk with cap ring
      let isCap = step(0.35, length(input.uv - 0.5));
      color = mix(stalkCream, neonEmerald * pulse, isCap);
    }
  }

  var shaded = color * input.shade;
  let canonicalColor = select(mycPaper(), mycInk(), isDark);
  shaded = mix(shaded, canonicalColor, morphQR);

  return vec4f(shaded, 1.0);
}
`;
