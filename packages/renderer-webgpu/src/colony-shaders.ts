const COLONY_UNIFORMS_WGSL = /* wgsl */ `
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

const COLONY_PARTS: u32 = 4u;

fn colInk() -> vec3f {
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

fn colPaper() -> vec3f {
  return mix(uniforms.themeFifth.rgb, vec3f(0.98), 0.55);
}

fn colStage(start: f32, end: f32) -> f32 {
  return smoothstep(start, end, uniforms.progress);
}

fn colProject(localPos: vec3f) -> vec4f {
  let camera = colStage(0.5, 1.0);
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

export const COLONY_SHADER = /* wgsl */ `
${COLONY_UNIFORMS_WGSL}

struct ColonyOutput {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) uv: vec2f,
  @location(2) local: vec3f,
  @location(3) shade: f32,
  @location(4) seed: f32,
  @location(5) @interpolate(flat) blockType: u32,
  @location(6) @interpolate(flat) moduleType: u32,
  @location(7) @interpolate(flat) connections: u32,
  @location(8) @interpolate(flat) faceIndex: u32,
  @location(9) @interpolate(flat) part: u32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> blockTypes: array<u32>;
@group(0) @binding(2) var<storage, read> blockPositions: array<vec4f>;
@group(0) @binding(3) var<storage, read> blockHeights: array<f32>;
@group(0) @binding(4) var<storage, read> moduleData: array<vec4f>;

fn colonyHash(pos: vec2f) -> f32 {
  let scaled = fract(pos * vec2f(0.1031, 0.103));
  let folded = scaled + dot(scaled, scaled.yx + 19.19);
  return fract((folded.x + folded.y) * folded.x);
}

fn colonyBoxGeometry(faceIndex: u32, uv: vec2f, size: vec3f) -> array<vec3f, 2> {
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

struct ColonyPiece {
  size: vec3f,
  offset: vec3f,
  visible: f32,
}

fn createColonyPiece(part: u32, modType: u32, modHeight: f32, isDark: bool, seed: f32) -> ColonyPiece {
  let propStage = 1.0 - colStage(0.0, 0.18);
  let detailStage = 1.0 - colStage(0.12, 0.35);
  let heightStage = 1.0 - colStage(0.22, 0.65);
  let footStage = colStage(0.55, 0.90);

  var piece: ColonyPiece;
  piece.visible = 1.0;

  var footprint = mix(0.82 + seed * 0.10, 1.0, footStage);
  let totalHeight = mix(0.02, max(modHeight * 1.8, 0.05), heightStage);

  if (part == 0u) {
    // Regolith Ground Plate with crater rim
    let baseH = select(0.03, 0.06, isDark);
    piece.size = vec3f(footprint, baseH, footprint);
    piece.offset = vec3f(0.0, 0.0, 0.0);
    piece.visible = 1.0;
    return piece;
  }

  if (part == 1u) {
    // 3D Habitat Shell / Station Cylinder
    if (!isDark) {
      piece.visible = 0.0;
      piece.size = vec3f(0.0);
      piece.offset = vec3f(0.0);
      return piece;
    }
    let bodyFootprint = footprint * select(0.82, 0.70, modType == 1u);
    let bodyH = totalHeight * 0.75 * heightStage;
    piece.size = vec3f(bodyFootprint, bodyH, bodyFootprint);
    piece.offset = vec3f(0.0, 0.06, 0.0);
    piece.visible = heightStage;
    return piece;
  }

  if (part == 2u) {
    // Pressurized dome cap / Solar panel array wings
    if (!isDark) {
      piece.visible = 0.0;
      piece.size = vec3f(0.0);
      piece.offset = vec3f(0.0);
      return piece;
    }
    let capFootprint = footprint * select(0.65, 0.90, modType == 2u); // Solar panel wings wider
    let capH = select(0.12, 0.05, modType == 2u) * detailStage;
    piece.size = vec3f(capFootprint, capH, capFootprint);
    piece.offset = vec3f(0.0, 0.06 + totalHeight * 0.75 * heightStage, 0.0);
    piece.visible = detailStage;
    return piece;
  }

  // Part 3: Comm dish antenna mast / Beacon light
  if (!isDark || modType != 3u && modType != 5u) {
    piece.visible = 0.0;
    piece.size = vec3f(0.0);
    piece.offset = vec3f(0.0);
    return piece;
  }
  let dishSize = 0.28 * propStage;
  let dishBase = 0.06 + totalHeight * heightStage;
  piece.size = vec3f(dishSize, 0.40 * propStage, dishSize);
  piece.offset = vec3f((seed - 0.5) * 0.3, dishBase, (fract(seed * 7.7) - 0.5) * 0.3);
  piece.visible = propStage;
  return piece;
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> ColonyOutput {
  var output: ColonyOutput;
  let cellIndex = instanceIndex / COLONY_PARTS;
  let part = instanceIndex % COLONY_PARTS;
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
  let raw = moduleData[cellIndex];
  let modType = u32(raw.x);
  let modHeight = raw.y;
  let conn = u32(raw.z);
  let seed = raw.w / 1000.0;
  let isDark = blockTypes[cellIndex] != 0u;

  let piece = createColonyPiece(part, modType, modHeight, isDark, seed);
  if (piece.visible < 0.01) {
    output.position = vec4f(2.0, 2.0, 2.0, 1.0);
    return output;
  }

  let blockSize = uniforms.blockSize;
  let geom = colonyBoxGeometry(faceIndex, uv, piece.size * blockSize);
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

  let collapsed = colStage(0.22, 0.65);
  output.position = colProject(worldPos);
  output.normal = normal;
  output.uv = uv;
  output.local = geom[0] / blockSize;
  output.shade = mix(shade, 1.0, collapsed);
  output.seed = seed;
  output.blockType = blockTypes[cellIndex];
  output.moduleType = modType;
  output.connections = conn;
  output.faceIndex = faceIndex;
  output.part = part;

  return output;
}

fn colonyQrColor(blockType: u32, noise: f32) -> vec3f {
  var color = uniforms.themePrimary.rgb;
  if (blockType == 3u) {
    color = uniforms.themeSecondary.rgb;
  } else if (blockType == 4u) {
    color = mix(uniforms.themeThird.rgb, uniforms.themeFourth.rgb, 0.55);
  } else if (blockType == 2u || blockType == 5u) {
    color = uniforms.themeFourth.rgb;
  }
  let luma = dot(color, vec3f(0.2126, 0.7152, 0.0722));
  let contrast = mix(color, colInk(), smoothstep(0.76, 0.96, luma) * 0.15);
  return contrast * (0.94 + noise * 0.06);
}

fn colonyQrMask(uv: vec2f, neighborMask: u32) -> f32 {
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
fn fragmentMain(input: ColonyOutput) -> @location(0) vec4f {
  let progress = uniforms.progress;
  let inkStage = smoothstep(0.58, 0.96, progress);
  let isDark = input.blockType != 0u;
  let paper = colPaper();
  let noise = colonyHash(input.position.xy + vec2f(uniforms.time * 0.13));

  // Derive rich materials directly from theme palette colors!
  let regolith = mix(uniforms.themeFifth.rgb * 0.85, vec3f(0.55), 0.3);
  let habShell = uniforms.themePrimary.rgb;
  let thermalGold = uniforms.themeSecondary.rgb;
  let beaconColor = uniforms.themeFourth.rgb;

  var color = regolith;

  if (input.part == 0u) {
    // Regolith ground tile with crater depression
    let uv = input.uv;
    let crater = length(uv - 0.5);
    let rim = smoothstep(0.35, 0.45, crater) * smoothstep(0.55, 0.45, crater);
    color = mix(regolith, regolith * 0.7, rim * 0.6);
  } else if (input.part == 1u) {
    // 3D Habitat shell
    color = habShell;
    if (input.moduleType == 5u) {
      // Command citadel
      color = mix(habShell, thermalGold, 0.4);
    }
  } else if (input.part == 2u) {
    // Thermal insulation / Solar panels
    color = thermalGold;
    if (input.moduleType == 2u) {
      // Solar array blue grid
      let grid = sin(input.uv.x * 20.0) * sin(input.uv.y * 20.0);
      color = mix(uniforms.themeThird.rgb, thermalGold, grid * 0.3 + 0.5);
    }
  } else {
    // Comm dish / Beacon light
    color = beaconColor * 1.4;
  }

  var shaded = color * mix(0.9, 1.1, input.shade);

  let qrNoise = colonyHash(input.uv + vec2f(f32(input.blockType) * 0.37));
  let mask = colonyQrMask(input.uv, input.connections);
  let isActive = select(0.0, 1.0, isDark);
  let qrColor = mix(paper, colonyQrColor(input.blockType, qrNoise), isActive * mask);

  var result = mix(shaded, qrColor, inkStage);
  result += (noise - 0.5) * 0.015 * (1.0 - inkStage);

  return vec4f(clamp(result, vec3f(0.0), vec3f(1.0)), 1.0);
}
`;
