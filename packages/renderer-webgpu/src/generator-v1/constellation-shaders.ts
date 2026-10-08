const CONSTELLATION_UNIFORMS_WGSL = /* wgsl */ `
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

fn constInk() -> vec3f {
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

fn constPaper() -> vec3f {
  return mix(uniforms.themeFifth.rgb, vec3f(1.0), 0.68);
}

fn constStage(start: f32, end: f32) -> f32 {
  return smoothstep(start, end, uniforms.progress);
}

fn constProject(localPos: vec3f) -> vec4f {
  let camera = constStage(0.5, 1.0);
  let angleY = mix(0.72, 0.0, camera);
  let angleX = mix(-0.55, -1.570796, camera);
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
  let yOffset = mix(-0.15, 0.08, camera) + uniforms.cameraBobY;

  return vec4f(rotX * scaleX + uniforms.cameraBobX, (rotY + yOffset) * scaleY, depth * 0.01 + 0.5, 1.0);
}
`;

export const CONSTELLATION_SHADER = /* wgsl */ `
${CONSTELLATION_UNIFORMS_WGSL}

struct ConstellationOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) @interpolate(flat) blockType: u32,
  @location(2) @interpolate(flat) nodeType: u32,
  @location(3) @interpolate(flat) connections: u32,
  @location(4) seed: f32,
  @location(5) starSize: f32,
  @location(6) depth: f32,
  @location(7) @interpolate(flat) partIndex: u32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> blockTypes: array<u32>;
@group(0) @binding(2) var<storage, read> blockPositions: array<vec4f>;
@group(0) @binding(3) var<storage, read> blockHeights: array<f32>;
@group(0) @binding(4) var<storage, read> starData: array<vec4f>;

const QUAD_VERTS: array<vec2f, 6> = array<vec2f, 6>(
  vec2f(-0.5, -0.5), vec2f(0.5, -0.5), vec2f(0.5, 0.5),
  vec2f(-0.5, -0.5), vec2f(0.5, 0.5), vec2f(-0.5, 0.5)
);

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> ConstellationOutput {
  var output: ConstellationOutput;
  let cellIndex = instanceIndex / 2u;
  let part = instanceIndex % 2u;

  if (cellIndex >= arrayLength(&blockPositions)) {
    output.position = vec4f(2.0, 2.0, 2.0, 1.0);
    return output;
  }

  let posData = blockPositions[cellIndex];
  let raw = starData[cellIndex];
  let nodeType = u32(raw.x);
  let rawDepth = raw.y;
  let conn = u32(raw.z);
  let packed = u32(raw.w);
  let starSize = f32(packed & 255u) / 100.0;
  let seed = f32(packed >> 8u) / 1000.0;
  let isDark = blockTypes[cellIndex] != 0u;

  let v = QUAD_VERTS[vertexIndex % 6u];
  let flattenStage = constStage(0.2, 0.8);
  let qrStage = constStage(0.75, 1.0);

  // Depth flattens toward 0.0
  let depth = mix(rawDepth, 0.0, flattenStage);

  let center = (uniforms.gridSize - 1.0) * 0.5;
  var worldX = posData.x - center;
  var worldZ = posData.y - center;
  var worldY = depth;

  if (part == 0u) {
    // Background space cell / QR substrate
    let sz = mix(0.96, 1.0, qrStage);
    worldX += v.x * sz;
    worldZ += v.y * sz;
    worldY = 0.0;
  } else {
    // 3D Star Node / Constellation geometry
    if (!isDark || flattenStage >= 1.0) {
      output.position = vec4f(2.0, 2.0, 2.0, 1.0);
      return output;
    }
    let sz = mix(starSize * 0.85, 1.0, flattenStage);
    worldX += v.x * sz;
    worldZ += v.y * sz;
  }

  let modelPos = vec3f(worldX, worldY, worldZ);
  output.position = constProject(modelPos);
  output.uv = v + 0.5;
  output.blockType = blockTypes[cellIndex];
  output.nodeType = nodeType;
  output.connections = conn;
  output.seed = seed;
  output.starSize = starSize;
  output.depth = depth;
  output.partIndex = part;

  return output;
}

@fragment
fn fragmentMain(input: ConstellationOutput) -> @location(0) vec4f {
  let isDark = input.blockType != 0u;
  let morphQR = constStage(0.85, 1.0);

  if (morphQR >= 1.0) {
    let finalColor = select(constPaper(), constInk(), isDark);
    return vec4f(finalColor, 1.0);
  }

  let deepSpace = vec3f(0.02, 0.03, 0.07);
  let starCyan = vec3f(0.4, 0.85, 1.0);
  let starGold = vec3f(1.0, 0.85, 0.45);
  let starWhite = vec3f(0.98, 0.98, 1.0);
  let nebulaPurple = vec3f(0.18, 0.08, 0.28);
  let lineCyan = vec3f(0.25, 0.65, 0.95);

  var color = deepSpace;

  if (input.partIndex == 0u) {
    // Deep space background with subtle nebula gas and constellation trace lines
    let uv = input.uv;
    let dist = length(uv - 0.5);

    // Subtle nebula haze
    let neb = sin(uv.x * 3.14) * sin(uv.y * 3.14);
    color = mix(deepSpace, nebulaPurple, neb * 0.35);

    // Draw constellation lines connecting adjacent star nodes
    let lineWidth = 0.04;
    var hasLine = false;
    if ((input.connections & 1u) != 0u && uv.y > 0.5 && abs(uv.x - 0.5) < lineWidth) { hasLine = true; }
    if ((input.connections & 2u) != 0u && uv.x > 0.5 && abs(uv.y - 0.5) < lineWidth) { hasLine = true; }
    if ((input.connections & 4u) != 0u && uv.y < 0.5 && abs(uv.x - 0.5) < lineWidth) { hasLine = true; }
    if ((input.connections & 8u) != 0u && uv.x < 0.5 && abs(uv.y - 0.5) < lineWidth) { hasLine = true; }

    if (hasLine) {
      let pulse = 0.7 + 0.3 * sin(uniforms.time * 2.0 + input.seed * 6.28);
      color = mix(color, lineCyan * pulse, 0.85);
    }
  } else {
    // Star node billboard
    let uv = input.uv;
    let dist = length(uv - 0.5);

    if (dist > 0.5) {
      discard;
    }

    // Stellar glow profile
    let glow = pow(max(0.0, 1.0 - dist * 2.0), 1.8);
    let core = pow(max(0.0, 1.0 - dist * 3.5), 3.0);

    let twinkle = 0.85 + 0.15 * sin(uniforms.time * 4.0 + input.seed * 12.56);
    let baseColor = mix(starCyan, starGold, input.seed);

    if (input.nodeType == 4u || input.nodeType == 5u) {
      // Finder Landmark: Giant celestial hub with diffraction spikes
      let spike = max(0.0, 1.0 - abs(uv.x - 0.5) * 16.0) * max(0.0, 1.0 - abs(uv.y - 0.5) * 3.0) +
                  max(0.0, 1.0 - abs(uv.y - 0.5) * 16.0) * max(0.0, 1.0 - abs(uv.x - 0.5) * 3.0);
      color = mix(starGold, starWhite, core) * (glow + spike * 0.8) * twinkle * 1.5;
    } else if (input.nodeType == 3u) {
      // Planet with ring
      let ringDist = abs(dist - 0.38);
      let ring = select(0.0, 0.7, ringDist < 0.04);
      color = mix(baseColor * glow, vec3f(0.8, 0.7, 0.9), ring);
    } else {
      // Regular star / pulsar
      color = mix(baseColor, starWhite, core) * glow * twinkle;
    }
  }

  // Smooth morph to canonical QR code
  let canonicalColor = select(constPaper(), constInk(), isDark);
  color = mix(color, canonicalColor, morphQR);

  return vec4f(color, 1.0);
}
`;
