const TOY_UNIFORMS_WGSL = /* wgsl */ `
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

fn toyInk() -> vec3f {
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

fn toyPaper() -> vec3f {
  return mix(uniforms.themeFifth.rgb, vec3f(1.0), 0.68);
}

fn toyStage(start: f32, end: f32) -> f32 {
  return smoothstep(start, end, uniforms.progress);
}

fn toyProject(localPos: vec3f) -> vec4f {
  let camera = toyStage(0.5, 1.0);
  let angleY = mix(0.7854, 0.0, camera);
  let angleX = mix(-0.62, -1.570796, camera);
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

export const TOY_BLOCK_SHADER = /* wgsl */ `
${TOY_UNIFORMS_WGSL}

struct ToyOutput {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) uv: vec2f,
  @location(2) @interpolate(flat) blockType: u32,
  @location(3) @interpolate(flat) toyType: u32,
  @location(4) @interpolate(flat) colorIndex: u32,
  @location(5) @interpolate(flat) partIndex: u32,
  @location(6) shade: f32,
  @location(7) seed: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> blockTypes: array<u32>;
@group(0) @binding(2) var<storage, read> blockPositions: array<vec4f>;
@group(0) @binding(3) var<storage, read> blockHeights: array<f32>;
@group(0) @binding(4) var<storage, read> toyData: array<vec4f>;

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
) -> ToyOutput {
  var output: ToyOutput;
  let cellIndex = instanceIndex / 2u;
  let part = instanceIndex % 2u;

  if (cellIndex >= arrayLength(&blockPositions)) {
    output.position = vec4f(2.0, 2.0, 2.0, 1.0);
    return output;
  }

  let posData = blockPositions[cellIndex];
  let raw = toyData[cellIndex];
  let toyType = u32(raw.x);
  let rawHeight = raw.y;
  let colorIdx = u32(raw.z);
  let seed = raw.w / 1000.0;
  let isDark = blockTypes[cellIndex] != 0u;

  let v = CUBE_VERTS[vertexIndex % 36u];
  let normal = CUBE_NORMS[(vertexIndex % 36u) / 6u];

  let deconstruct = toyStage(0.2, 0.85);
  let qrStage = toyStage(0.8, 1.0);

  var sizeX = 0.94;
  var sizeZ = 0.94;
  var sizeY = 0.06;
  var offsetY = sizeY * 0.5;

  if (part == 0u) {
    // Base plate
    sizeX = mix(0.94, 1.0, qrStage);
    sizeZ = mix(0.94, 1.0, qrStage);
    sizeY = mix(0.06, 0.01, qrStage);
    offsetY = sizeY * 0.5;
  } else {
    // Modular toy brick
    if (!isDark || deconstruct >= 1.0) {
      output.position = vec4f(2.0, 2.0, 2.0, 1.0);
      return output;
    }
    let h = mix(rawHeight * 0.55, 0.01, deconstruct);
    sizeY = h;
    sizeX = mix(0.90, 1.0, deconstruct);
    sizeZ = mix(0.90, 1.0, deconstruct);
    offsetY = 0.06 + sizeY * 0.5;
  }

  let center = (uniforms.gridSize - 1.0) * 0.5;
  let worldX = posData.x - center + v.x * sizeX;
  let worldZ = posData.y - center + v.z * sizeZ;
  let worldY = offsetY + v.y * sizeY;

  let modelPos = vec3f(worldX, worldY, worldZ);
  output.position = toyProject(modelPos);
  output.normal = normal;
  output.uv = v.xz + 0.5;
  output.blockType = blockTypes[cellIndex];
  output.toyType = toyType;
  output.colorIndex = colorIdx;
  output.partIndex = part;
  output.seed = seed;

  let lightDir = normalize(vec3f(0.5, 0.85, 0.35));
  output.shade = clamp(dot(normal, lightDir) * 0.45 + 0.55, 0.25, 1.0);

  return output;
}

@fragment
fn fragmentMain(input: ToyOutput) -> @location(0) vec4f {
  let isDark = input.blockType != 0u;
  let morphQR = toyStage(0.85, 1.0);

  if (morphQR >= 1.0) {
    let finalColor = select(toyPaper(), toyInk(), isDark);
    return vec4f(finalColor, 1.0);
  }

  // Classic primary block colors
  let blockColors: array<vec3f, 5> = array<vec3f, 5>(
    vec3f(0.85, 0.12, 0.15), // Bold Red
    vec3f(0.08, 0.38, 0.85), // Classic Blue
    vec3f(0.95, 0.78, 0.12), // Sunshine Yellow
    vec3f(0.12, 0.65, 0.25), // Grass Green
    vec3f(0.95, 0.95, 0.95)  // Clean White
  );

  let plateGreen = vec3f(0.18, 0.55, 0.22);
  let castleGray = vec3f(0.55, 0.58, 0.62);

  var color = plateGreen;

  if (input.partIndex == 0u) {
    // Base plate with circular stud indentations
    let uv = input.uv;
    let studDist = length(uv - 0.5);
    let studRing = select(0.0, 0.2, abs(studDist - 0.28) < 0.04);
    color = mix(plateGreen, vec3f(0.12, 0.42, 0.16), studRing);
  } else {
    // 3D plastic building brick with raised cylindrical stud top
    if (input.toyType == 5u || input.toyType == 6u) {
      // Castle landmark (Finder)
      color = castleGray;
    } else {
      color = blockColors[input.colorIndex % 5u];
    }

    // Top surface stud highlight
    let uv = input.uv;
    let studDist = length(uv - 0.5);
    if (studDist < 0.26) {
      color = color * 1.15; // Stud highlight
    }
  }

  // Glossy plastic specular
  var shaded = color * input.shade;
  let canonicalColor = select(toyPaper(), toyInk(), isDark);
  shaded = mix(shaded, canonicalColor, morphQR);

  return vec4f(shaded, 1.0);
}
`;
