const REEF_UNIFORMS_WGSL = /* wgsl */ `
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

const REEF_PARTS: u32 = 4u;

fn reefInk() -> vec3f {
  let first = uniforms.themePrimary.rgb;
  let second = uniforms.themeSecondary.rgb;
  let fourth = uniforms.themeFourth.rgb;
  let firstLuma = dot(first, vec3f(0.2126, 0.7152, 0.0722));
  let secondLuma = dot(second, vec3f(0.2126, 0.7152, 0.0722));
  let fourthLuma = dot(fourth, vec3f(0.2126, 0.7152, 0.0722));
  var ink = select(first, second, secondLuma < firstLuma);
  let inkLuma = min(firstLuma, secondLuma);
  ink = select(ink, fourth, fourthLuma < inkLuma);
  return mix(ink, vec3f(0.015), 0.15);
}

fn reefPaper() -> vec3f {
  return mix(uniforms.themeFifth.rgb, vec3f(0.98), 0.55);
}

fn reefStage(start: f32, end: f32) -> f32 {
  return smoothstep(start, end, uniforms.progress);
}

fn reefProject(localPos: vec3f) -> vec4f {
  let camera = reefStage(0.5, 1.0);
  let angleY = mix(0.79, 0.0, camera);
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
  let scale = mix(40.0, 46.4, camera) / uniforms.gridSize * portrait * pulse * uniforms.camera.x;
  let scaleX = scale / max(uniforms.aspectRatio, 1.0);
  let scaleY = scale / max(1.0 / uniforms.aspectRatio, 1.0);
  let yOffset = mix(-0.18, 0.08, camera) + uniforms.cameraBobY;

  return vec4f(rotX * scaleX + uniforms.cameraBobX, (rotY + yOffset) * scaleY, depth * 0.01 + 0.5, 1.0);
}
`;

export const REEF_SHADER = /* wgsl */ `
${REEF_UNIFORMS_WGSL}

struct ReefOutput {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) uv: vec2f,
  @location(2) local: vec3f,
  @location(3) shade: f32,
  @location(4) seed: f32,
  @location(5) @interpolate(flat) blockType: u32,
  @location(6) @interpolate(flat) coralType: u32,
  @location(7) @interpolate(flat) connections: u32,
  @location(8) @interpolate(flat) faceIndex: u32,
  @location(9) @interpolate(flat) part: u32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> blockTypes: array<u32>;
@group(0) @binding(2) var<storage, read> blockPositions: array<vec4f>;
@group(0) @binding(3) var<storage, read> blockHeights: array<f32>;
@group(0) @binding(4) var<storage, read> reefData: array<vec4f>;

fn reefHash(pos: vec2f) -> f32 {
  let scaled = fract(pos * vec2f(0.1031, 0.103));
  let folded = scaled + dot(scaled, scaled.yx + 19.19);
  return fract((folded.x + folded.y) * folded.x);
}

fn reefBoxGeometry(faceIndex: u32, uv: vec2f, size: vec3f) -> array<vec3f, 2> {
  let halfX = size.x * 0.5;
  let halfZ = size.z * 0.5;
  var pos = vec3f(0.0);
  var norm = vec3f(0.0, 1.0, 0.0);
  if (faceIndex == 0u) {
    pos = vec3f((uv.x - 0.5) * size.x, size.y, (uv.y - 0.5) * size.z);
  } else if (faceIndex == 1u) {
    pos = vec3f((uv.x - 0.5) * size.x, 0.0, (0.5 - uv.y) * size.z);
    norm = vec3f(0.0, -1.0, 0.0);
  } else if (faceIndex == 2u) {
    pos = vec3f((uv.x - 0.5) * size.x, uv.y * size.y, halfZ);
    norm = vec3f(0.0, 0.0, 1.0);
  } else if (faceIndex == 3u) {
    pos = vec3f((0.5 - uv.x) * size.x, uv.y * size.y, -halfZ);
    norm = vec3f(0.0, 0.0, -1.0);
  } else if (faceIndex == 4u) {
    pos = vec3f(halfX, uv.y * size.y, (uv.x - 0.5) * size.z);
    norm = vec3f(1.0, 0.0, 0.0);
  } else {
    pos = vec3f(-halfX, uv.y * size.y, (0.5 - uv.x) * size.z);
    norm = vec3f(-1.0, 0.0, 0.0);
  }
  return array<vec3f, 2>(pos, norm);
}

struct ReefPiece {
  size: vec3f,
  offset: vec3f,
  visible: f32,
}

fn createReefPiece(part: u32, cType: u32, cHeight: f32, isDark: bool, seed: f32) -> ReefPiece {
  let propStage = 1.0 - reefStage(0.0, 0.18);
  let detailStage = 1.0 - reefStage(0.12, 0.35);
  let heightStage = 1.0 - reefStage(0.22, 0.65);
  let footStage = reefStage(0.55, 0.90);

  var piece: ReefPiece;
  piece.visible = 1.0;

  var footprint = mix(0.82 + seed * 0.10, 1.0, footStage);
  let totalHeight = mix(0.02, max(cHeight * 1.8, 0.05), heightStage);

  if (part == 0u) {
    // Seabed coral sand plate
    let baseH = select(0.03, 0.06, isDark);
    piece.size = vec3f(footprint, baseH, footprint);
    piece.offset = vec3f(0.0, 0.0, 0.0);
    piece.visible = 1.0;
    return piece;
  }

  if (part == 1u) {
    // 3D Coral Pillar / Brain Coral Mass
    if (!isDark) {
      piece.visible = 0.0;
      piece.size = vec3f(0.0);
      piece.offset = vec3f(0.0);
      return piece;
    }
    let bodyFootprint = footprint * select(0.80, 0.70, cType == 4u);
    let bodyH = totalHeight * 0.75 * heightStage;
    piece.size = vec3f(bodyFootprint, bodyH, bodyFootprint);
    piece.offset = vec3f(0.0, 0.06, 0.0);
    piece.visible = heightStage;
    return piece;
  }

  if (part == 2u) {
    // Sea Anemone Crown / Tube Coral mouth
    if (!isDark) {
      piece.visible = 0.0;
      piece.size = vec3f(0.0);
      piece.offset = vec3f(0.0);
      return piece;
    }
    let capFootprint = footprint * select(0.68, 0.88, cType == 3u || cType == 5u);
    let capH = select(0.12, 0.22, cType == 3u) * detailStage;
    piece.size = vec3f(capFootprint, capH, capFootprint);
    piece.offset = vec3f(0.0, 0.06 + totalHeight * 0.75 * heightStage, 0.0);
    piece.visible = detailStage;
    return piece;
  }

  // Part 3: Tropical Fish / Floating seaweed frond
  if (!isDark || cType != 2u && cType != 5u) {
    piece.visible = 0.0;
    piece.size = vec3f(0.0);
    piece.offset = vec3f(0.0);
    return piece;
  }
  let fishSize = 0.22 * propStage;
  let fishBase = 0.06 + totalHeight * heightStage;
  piece.size = vec3f(fishSize, 0.30 * propStage, fishSize);
  piece.offset = vec3f((seed - 0.5) * 0.4, fishBase, (fract(seed * 7.7) - 0.5) * 0.4);
  piece.visible = propStage;
  return piece;
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> ReefOutput {
  var output: ReefOutput;
  let cellIndex = instanceIndex / REEF_PARTS;
  let part = instanceIndex % REEF_PARTS;
  let faceIndex = vertexIndex / 6u;
  let quadIndex = vertexIndex % 6u;

  let quad = array<vec2f, 6>(
    vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(0.0, 1.0),
    vec2f(0.0, 1.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0)
  );
  let uv = quad[quadIndex];

  if (cellIndex >= arrayLength(&blockPositions)) {
    output.position = vec4f(2.0, 2.0, 2.0, 1.0);
    return output;
  }

  let posData = blockPositions[cellIndex];
  let raw = reefData[cellIndex];
  let cType = u32(raw.x);
  let cHeight = raw.y;
  let conn = u32(raw.z);
  let seed = raw.w / 1000.0;
  let isDark = blockTypes[cellIndex] != 0u;

  let piece = createReefPiece(part, cType, cHeight, isDark, seed);
  if (piece.visible < 0.01) {
    output.position = vec4f(2.0, 2.0, 2.0, 1.0);
    return output;
  }

  let blockSize = uniforms.blockSize;
  let geom = reefBoxGeometry(faceIndex, uv, piece.size * blockSize);
  let halfGrid = uniforms.gridSize * blockSize * 0.5;
  let center = vec3f(
    (posData.x + 0.5) * blockSize - halfGrid,
    0.0,
    (posData.y + 0.5) * blockSize - halfGrid
  );

  let worldPos = center + piece.offset * blockSize + geom[0];
  let normal = normalize(geom[1]);
  let lightDir = normalize(vec3f(-0.41, 0.86, -0.3));
  let diffuse = max(dot(normal, lightDir), 0.0);
  var shade = 0.35 + pow(diffuse, 0.7) * 0.65;
  if (normal.y > 0.45) { shade = min(1.0, shade * 1.06 + 0.08); }

  let collapsed = reefStage(0.22, 0.65);
  output.position = reefProject(worldPos);
  output.normal = normal;
  output.uv = uv;
  output.local = geom[0] / blockSize;
  output.shade = mix(shade, 1.0, collapsed);
  output.seed = seed;
  output.blockType = blockTypes[cellIndex];
  output.coralType = cType;
  output.connections = conn;
  output.faceIndex = faceIndex;
  output.part = part;

  return output;
}

fn reefQrColor(blockType: u32, noise: f32) -> vec3f {
  var color = uniforms.themePrimary.rgb;
  if (blockType == 3u) {
    color = uniforms.themeSecondary.rgb;
  } else if (blockType == 4u) {
    color = mix(uniforms.themeThird.rgb, uniforms.themeFourth.rgb, 0.55);
  } else if (blockType == 2u || blockType == 5u) {
    color = uniforms.themeFourth.rgb;
  }
  let luma = dot(color, vec3f(0.2126, 0.7152, 0.0722));
  let contrast = mix(color, reefInk(), smoothstep(0.76, 0.96, luma) * 0.15);
  return contrast * (0.94 + noise * 0.06);
}

fn reefQrMask(uv: vec2f, neighborMask: u32) -> f32 {
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

@fragment
fn fragmentMain(input: ReefOutput) -> @location(0) vec4f {
  let progress = uniforms.progress;
  let inkStage = smoothstep(0.58, 0.96, progress);
  let isDark = input.blockType != 0u;
  let paper = reefPaper();
  let noise = reefHash(input.position.xy + vec2f(uniforms.time * 0.13));

  // Derive rich materials directly from theme palette colors!
  let seaSand = mix(uniforms.themeFifth.rgb * 0.85, vec3f(0.75, 0.72, 0.65), 0.35);
  let coralBody = uniforms.themePrimary.rgb;
  let anemoneTint = uniforms.themeSecondary.rgb;
  let fishTint = uniforms.themeFourth.rgb;

  var color = seaSand;

  if (input.part == 0u) {
    // Coral seabed with underwater ripple caustics
    let uv = input.uv;
    let wave = sin(uv.x * 12.0 + uniforms.time * 2.0) * cos(uv.y * 12.0 + uniforms.time * 2.0);
    color = mix(seaSand, seaSand * 1.25, max(wave * 0.25, 0.0));
  } else if (input.part == 1u) {
    // 3D Coral body
    color = coralBody;
    if (input.coralType == 5u) {
      // Crown coral
      color = mix(coralBody, anemoneTint, 0.4);
    }
  } else if (input.part == 2u) {
    // Anemone crown
    color = anemoneTint;
  } else {
    // Fish / Swimming creature
    color = fishTint * 1.3;
  }

  var shaded = color * mix(0.9, 1.1, input.shade);

  let qrNoise = reefHash(input.uv + vec2f(f32(input.blockType) * 0.37));
  let mask = reefQrMask(input.uv, input.connections);
  let isActive = select(0.0, 1.0, isDark);
  let qrColor = mix(paper, reefQrColor(input.blockType, qrNoise), isActive * mask);

  var result = mix(shaded, qrColor, inkStage);
  result += (noise - 0.5) * 0.015 * (1.0 - inkStage);

  return vec4f(clamp(result, vec3f(0.0), vec3f(1.0)), 1.0);
}
`;
