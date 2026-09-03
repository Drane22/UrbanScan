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
  let angleY = mix(0.72, 0.0, camera);
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
  let yOffset = mix(-0.22, 0.08, camera) + uniforms.cameraBobY;

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
  @location(5) castShadow: f32,
  @location(6) valleyOcclusion: f32,
  @location(7) rimLight: f32,
  @location(8) heightFraction: f32,
  @location(9) @interpolate(flat) blockType: u32,
  @location(10) @interpolate(flat) moduleType: u32,
  @location(11) @interpolate(flat) connections: u32,
  @location(12) @interpolate(flat) faceIndex: u32,
  @location(13) @interpolate(flat) part: u32,
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

fn colonyHeightAt(column: i32, row: i32) -> f32 {
  let size = i32(uniforms.gridSize);
  if (column < 0 || column >= size || row < 0 || row >= size) { return 0.0; }
  let idx = u32(row * size + column);
  if (idx >= arrayLength(&moduleData)) { return 0.0; }
  return moduleData[idx].y;
}

fn colonyShadow(height: f32, column: i32, row: i32) -> f32 {
  let direction = normalize(vec2f(0.55, 0.82));
  var shadow = 1.0;
  for (var s: i32 = 1; s < 6; s = s + 1) {
    let offset = vec2f(f32(s)) * direction;
    let neighbor = colonyHeightAt(column + i32(round(offset.x)), row + i32(round(offset.y)));
    let occlusion = smoothstep(height + 0.1, height + 0.6, neighbor);
    shadow *= mix(1.0, 0.74, occlusion * (1.0 - f32(s) * 0.12));
  }
  return max(shadow, 0.68);
}

fn colonyValley(height: f32, column: i32, row: i32) -> f32 {
  var highest = 0.0;
  for (var dr: i32 = -1; dr <= 1; dr = dr + 1) {
    for (var dc: i32 = -1; dc <= 1; dc = dc + 1) {
      if (dc == 0 && dr == 0) { continue; }
      highest = max(highest, colonyHeightAt(column + dc, row + dr));
    }
  }
  return smoothstep(0.02, 0.40, max(0.0, highest - height));
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

  var footprint = mix(0.70 + seed * 0.20, 1.0, footStage);

  // Much taller structures — colony buildings need to read as 3D at distance
  // Domes: 1.8x, hab blocks: 2.4x, command towers: 3.5x
  let heightScale = select(
    1.8,  // basic dome
    select(2.4, select(3.5, 2.0, modType == 4u), modType == 5u), // hab block, command, solar
    modType == 1u
  );
  let totalHeight = mix(0.04, max(modHeight * heightScale, 0.18), heightStage);

  if (part == 0u) {
    // Regolith ground pad – thin slab, wider than the structure
    let baseH = select(0.04, 0.08, isDark);
    piece.size = vec3f(footprint * 1.0, baseH, footprint * 1.0);
    piece.offset = vec3f(0.0, 0.0, 0.0);
    piece.visible = 1.0;
    return piece;
  }

  if (part == 1u) {
    // Habitat shell / cylinder / dome base
    if (!isDark) {
      piece.visible = 0.0; piece.size = vec3f(0.0); piece.offset = vec3f(0.0);
      return piece;
    }
    // Domes are narrower, hab blocks wider, command towers narrow spires
    let bodyW = select(
      footprint * 0.75,  // dome: narrower
      select(footprint * 0.85, footprint * 0.50, modType == 5u), // hab: wider, command: spire
      modType == 1u
    );
    let bodyH = totalHeight * 0.72 * heightStage;
    piece.size = vec3f(bodyW, bodyH, bodyW);
    piece.offset = vec3f(0.0, 0.08, 0.0);
    piece.visible = heightStage;
    return piece;
  }

  if (part == 2u) {
    // Dome cap / Solar wing / Command spire top
    if (!isDark) {
      piece.visible = 0.0; piece.size = vec3f(0.0); piece.offset = vec3f(0.0);
      return piece;
    }
    // Solar panels are VERY wide, domes are medium, command has tall thin finial
    let capW = select(
      footprint * 0.60,  // dome: narrow rounded cap
      select(footprint * 1.40, footprint * 0.35, modType == 5u), // solar: very wide, command: thin
      modType == 1u
    );
    let capH = select(0.28, select(0.18, 0.55, modType == 5u), modType == 2u) * detailStage;
    piece.size = vec3f(capW, capH, capW);
    piece.offset = vec3f(0.0, 0.08 + totalHeight * 0.72 * heightStage, 0.0);
    piece.visible = detailStage;
    return piece;
  }

  // Part 3: Comm dish mast / Beacon / Antenna
  if (!isDark || (modType != 3u && modType != 5u)) {
    piece.visible = 0.0; piece.size = vec3f(0.0); piece.offset = vec3f(0.0);
    return piece;
  }
  let dishBase = 0.08 + totalHeight * heightStage;
  piece.size = vec3f(0.22 * propStage, 0.75 * propStage, 0.22 * propStage);
  piece.offset = vec3f((seed - 0.5) * 0.25, dishBase, (fract(seed * 7.7) - 0.5) * 0.25);
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
  let column = i32(posData.x);
  let row = i32(posData.y);
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

  // Lunar directional light: strong, harsh, single source (no atmosphere)
  let sunDir = normalize(vec3f(-0.50, 0.82, -0.28));
  let diffuse = max(dot(normal, sunDir), 0.0);
  // Fill from opposite side (reflected regolith)
  let fillDir = normalize(vec3f(0.40, 0.35, 0.55));
  let fill = max(dot(normal, fillDir), 0.0) * 0.12;
  // Very low ambient: space is dark, long crisp shadows
  var shade = 0.08 + pow(diffuse, 0.60) * 0.92 + fill;
  if (normal.y > 0.45) { shade = min(1.4, shade * 1.15 + 0.15); }
  if (abs(normal.y) < 0.12 && normal.x < -0.5) { shade *= 0.60; }
  if (abs(normal.y) < 0.12 && normal.z > 0.5)  { shade *= 0.72; }

  // Rim light from behind (sun edge on structures)
  let viewDir = normalize(vec3f(sin(0.72), 0.60, cos(0.72)));
  let rimLight = pow(1.0 - abs(dot(normal, viewDir)), 4.0) * 0.35;

  let pieceH = piece.size.y * blockSize;
  let heightFrac = clamp(geom[0].y / max(pieceH, 0.001), 0.0, 1.0);
  let collapsed = colStage(0.22, 0.65);

  output.position = colProject(worldPos);
  output.normal = normal;
  output.uv = uv;
  output.local = geom[0] / blockSize;
  output.shade = mix(shade, 1.0, collapsed);
  output.seed = seed;
  output.castShadow = mix(colonyShadow(modHeight, column, row), 1.0, collapsed);
  output.valleyOcclusion = colonyValley(modHeight, column, row) * (1.0 - collapsed);
  output.rimLight = rimLight * (1.0 - collapsed);
  output.heightFraction = heightFrac;
  output.blockType = blockTypes[cellIndex];
  output.moduleType = modType;
  output.connections = conn;
  output.faceIndex = faceIndex;
  output.part = part;

  return output;
}

fn colonyQrColor(blockType: u32, noise: f32) -> vec3f {
  var color = uniforms.themePrimary.rgb;
  if (blockType == 3u) { color = uniforms.themeSecondary.rgb; }
  else if (blockType == 4u) { color = mix(uniforms.themeThird.rgb, uniforms.themeFourth.rgb, 0.55); }
  else if (blockType == 2u || blockType == 5u) { color = uniforms.themeFourth.rgb; }
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

  // Lunar regolith surface palette
  let regolith = mix(vec3f(0.68, 0.65, 0.58), vec3f(0.52, 0.50, 0.46), 0.3);
  // Hab shell: white thermal paint with slight warmth
  let habShell = mix(uniforms.themePrimary.rgb, vec3f(0.88, 0.86, 0.82), 0.55);
  // Solar panels: deep blue-black
  let solarPanel = mix(uniforms.themeThird.rgb, vec3f(0.08, 0.12, 0.22), 0.5);
  // Accent: warning orange / mission color
  let accent = uniforms.themeFourth.rgb;
  // Beacon light
  let beaconEmit = mix(uniforms.themeSecondary.rgb, vec3f(1.0, 0.85, 0.4), 0.3);

  var color = regolith;

  if (input.part == 0u) {
    // Regolith ground pad with subtle crater ring and texture
    let uv = input.uv;
    let dist = length(uv - 0.5);
    let craterRim = smoothstep(0.38, 0.42, dist) * smoothstep(0.48, 0.42, dist);
    let dustPattern = colonyHash(uv * 8.0 + vec2f(input.seed * 3.7));
    color = mix(regolith, regolith * 0.72, craterRim * 0.5);
    color = mix(color, regolith * 1.10, step(0.72, dustPattern) * 0.15);
  } else if (input.part == 1u) {
    // Hab shell body – white/cream with thermal stripe band
    color = habShell;
    let stripeY = fract(input.local.y * 4.0);
    let stripe = step(0.85, stripeY);
    color = mix(color, accent * 0.7, stripe * select(0.0, 0.3, input.moduleType == 5u));
    // Contact shadow at base
    let contactDark = 1.0 - smoothstep(0.0, 0.28, input.heightFraction) * 0.35;
    color *= contactDark;
  } else if (input.part == 2u) {
    // Solar panels: dark with reflective grid lines
    if (input.moduleType == 2u) {
      let gridX = step(0.92, fract(input.uv.x * 8.0));
      let gridY = step(0.92, fract(input.uv.y * 8.0));
      let grid = max(gridX, gridY);
      color = mix(solarPanel, solarPanel * 1.8, grid * 0.4);
    } else {
      // Dome cap: slightly lighter than shell
      color = mix(habShell, vec3f(0.92, 0.90, 0.88), 0.3);
    }
  } else {
    // Comm dish / antenna beacon pulse
    let pulse = 0.7 + 0.3 * sin(uniforms.time * 5.0 + input.seed * 6.28);
    color = beaconEmit * pulse * 1.6;
  }

  // Apply terrain-quality lighting
  var lit = color * input.shade;
  lit *= input.castShadow;
  lit *= 1.0 - input.valleyOcclusion * 0.28;
  lit += color * input.rimLight;

  // Contact darkening at base (ambient occlusion proxy)
  let groundContact = 1.0 - smoothstep(0.0, 0.18, input.heightFraction) * 0.22 * (1.0 - uniforms.progress);
  lit *= mix(groundContact, 1.0, uniforms.progress);

  let qrNoise = colonyHash(input.uv + vec2f(f32(input.blockType) * 0.37));
  let mask = colonyQrMask(input.uv, input.connections);
  let isActive = select(0.0, 1.0, isDark);
  let qrColor = mix(paper, colonyQrColor(input.blockType, qrNoise), isActive * mask);

  var result = mix(lit, qrColor, inkStage);
  result += (noise - 0.5) * 0.018 * (1.0 - inkStage);

  return vec4f(clamp(result, vec3f(0.0), vec3f(1.0)), 1.0);
}
`;
