const DUNGEON_UNIFORMS_WGSL = /* wgsl */ `
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

const DUNGEON_PARTS: u32 = 4u;

fn dungInk() -> vec3f {
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

fn dungPaper() -> vec3f {
  return mix(uniforms.themeFifth.rgb, vec3f(0.98), 0.55);
}

fn dungStage(start: f32, end: f32) -> f32 {
  return smoothstep(start, end, uniforms.progress);
}

fn dungProject(localPos: vec3f) -> vec4f {
  let camera = dungStage(0.5, 1.0);
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

export const DUNGEON_SHADER = /* wgsl */ `
${DUNGEON_UNIFORMS_WGSL}

struct DungeonOutput {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) uv: vec2f,
  @location(2) local: vec3f,
  @location(3) shade: f32,
  @location(4) seed: f32,
  @location(5) @interpolate(flat) blockType: u32,
  @location(6) @interpolate(flat) featureType: u32,
  @location(7) @interpolate(flat) connections: u32,
  @location(8) @interpolate(flat) faceIndex: u32,
  @location(9) @interpolate(flat) part: u32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> blockTypes: array<u32>;
@group(0) @binding(2) var<storage, read> blockPositions: array<vec4f>;
@group(0) @binding(3) var<storage, read> blockHeights: array<f32>;
@group(0) @binding(4) var<storage, read> dungeonData: array<vec4f>;

fn dungeonHash(pos: vec2f) -> f32 {
  let scaled = fract(pos * vec2f(0.1031, 0.103));
  let folded = scaled + dot(scaled, scaled.yx + 19.19);
  return fract((folded.x + folded.y) * folded.x);
}

fn dungeonBoxGeometry(faceIndex: u32, uv: vec2f, size: vec3f) -> array<vec3f, 2> {
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

struct DungeonPiece {
  size: vec3f,
  offset: vec3f,
  visible: f32,
}

fn dungeonHeightAt(column: i32, row: i32) -> f32 {
  let size = i32(uniforms.gridSize);
  if (column < 0 || column >= size || row < 0 || row >= size) { return 0.0; }
  let idx = u32(row * size + column);
  if (idx >= arrayLength(&dungeonData)) { return 0.0; }
  return dungeonData[idx].y;
}

fn dungeonShadow(height: f32, column: i32, row: i32) -> f32 {
  let direction = normalize(vec2f(0.50, 0.85));
  var shadow = 1.0;
  for (var s: i32 = 1; s < 6; s = s + 1) {
    let offset = vec2f(f32(s)) * direction;
    let neighbor = dungeonHeightAt(column + i32(round(offset.x)), row + i32(round(offset.y)));
    let occlusion = smoothstep(height + 0.08, height + 0.55, neighbor);
    shadow *= mix(1.0, 0.70, occlusion * (1.0 - f32(s) * 0.13));
  }
  return max(shadow, 0.62);
}

fn dungeonValley(height: f32, column: i32, row: i32) -> f32 {
  var highest = 0.0;
  for (var dr: i32 = -1; dr <= 1; dr = dr + 1) {
    for (var dc: i32 = -1; dc <= 1; dc = dc + 1) {
      if (dc == 0 && dr == 0) { continue; }
      highest = max(highest, dungeonHeightAt(column + dc, row + dr));
    }
  }
  return smoothstep(0.02, 0.45, max(0.0, highest - height));
}

fn createDungeonPiece(part: u32, featType: u32, featHeight: f32, isDark: bool, seed: f32) -> DungeonPiece {
  let propStage = 1.0 - dungStage(0.0, 0.18);
  let detailStage = 1.0 - dungStage(0.12, 0.35);
  let heightStage = 1.0 - dungStage(0.22, 0.65);
  let footStage = dungStage(0.55, 0.90);

  var piece: DungeonPiece;
  piece.visible = 1.0;

  var footprint = mix(0.65 + seed * 0.25, 1.0, footStage);
  // Towers are very tall, walls moderate, rubble short – strong height variation
  let heightScale = select(
    1.8,  // wall section
    select(3.2, select(4.5, 2.2, featType == 3u), featType == 5u), // keep: tallest, ruins: short
    featType == 1u
  );
  let totalHeight = mix(0.05, max(featHeight * heightScale, 0.20), heightStage);

  if (part == 0u) {
    // Flagstone floor – wide, very thin, creates dungeon floor feel
    let baseH = select(0.04, 0.08, isDark);
    piece.size = vec3f(footprint, baseH, footprint);
    piece.offset = vec3f(0.0, 0.0, 0.0);
    piece.visible = 1.0;
    return piece;
  }

  if (part == 1u) {
    // Stone wall / tower body – massive walls, narrow spires
    if (!isDark) { piece.visible = 0.0; piece.size = vec3f(0.0); piece.offset = vec3f(0.0); return piece; }
    let bodyW = select(
      footprint * 0.82,  // wall: thick
      select(footprint * 0.60, footprint * 0.88, featType == 3u), // tower: narrow spire, ruin: wide chunk
      featType == 5u
    );
    let bodyH = totalHeight * 0.78 * heightStage;
    piece.size = vec3f(bodyW, bodyH, bodyW);
    piece.offset = vec3f(0.0, 0.08, 0.0);
    piece.visible = heightStage;
    return piece;
  }

  if (part == 2u) {
    // Crenellations / battlements – WIDER than the tower body for overhang effect
    if (!isDark) { piece.visible = 0.0; piece.size = vec3f(0.0); piece.offset = vec3f(0.0); return piece; }
    let capW = select(
      footprint * 0.85,  // wall cap
      select(footprint * 0.78, footprint * 1.05, featType == 3u), // tower battlements: wider overhang
      featType == 5u
    );
    let capH = select(0.22, select(0.40, 0.15, featType == 3u), featType == 5u) * detailStage;
    piece.size = vec3f(capW, capH, capW);
    piece.offset = vec3f(0.0, 0.08 + totalHeight * 0.78 * heightStage, 0.0);
    piece.visible = detailStage;
    return piece;
  }

  // Part 3: Torch flame – offset to edge of tower, glowing
  if (!isDark || (featType != 2u && featType != 5u)) {
    piece.visible = 0.0; piece.size = vec3f(0.0); piece.offset = vec3f(0.0);
    return piece;
  }
  let torchBase = 0.08 + totalHeight * heightStage * 0.55;
  piece.size = vec3f(0.18 * propStage, 0.45 * propStage, 0.18 * propStage);
  piece.offset = vec3f((seed - 0.5) * 0.55, torchBase, (fract(seed * 7.7) - 0.5) * 0.55);
  piece.visible = propStage;
  return piece;
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> DungeonOutput {
  var output: DungeonOutput;
  let cellIndex = instanceIndex / DUNGEON_PARTS;
  let part = instanceIndex % DUNGEON_PARTS;
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
  let raw = dungeonData[cellIndex];
  let featType = u32(raw.x);
  let featHeight = raw.y;
  let conn = u32(raw.z);
  let seed = raw.w / 1000.0;
  let isDark = blockTypes[cellIndex] != 0u;

  let piece = createDungeonPiece(part, featType, featHeight, isDark, seed);
  if (piece.visible < 0.01) {
    output.position = vec4f(2.0, 2.0, 2.0, 1.0);
    return output;
  }

  let blockSize = uniforms.blockSize;
  let geom = dungeonBoxGeometry(faceIndex, uv, piece.size * blockSize);
  let halfGrid = uniforms.gridSize * blockSize * 0.5;
  let center = vec3f(
    (posData.x + 0.5) * blockSize - halfGrid,
    0.0,
    (posData.y + 0.5) * blockSize - halfGrid
  );

  let worldPos = center + piece.offset * blockSize + geom[0];
  let normal = normalize(geom[1]);
  // Dungeon: harsh directional light, very low ambient (torch-lit feel)
  let lightDir = normalize(vec3f(-0.42, 0.84, -0.32));
  let diffuse = max(dot(normal, lightDir), 0.0);
  let fillDir = normalize(vec3f(0.30, 0.45, 0.60));
  let fill = max(dot(normal, fillDir), 0.0) * 0.10;
  // Very low ambient: dungeon is dark
  var shade = 0.08 + pow(diffuse, 0.55) * 0.92 + fill;
  if (normal.y > 0.45) { shade = min(1.4, shade * 1.18 + 0.18); }
  if (abs(normal.y) < 0.12 && normal.x < -0.5) { shade *= 0.55; }
  if (abs(normal.y) < 0.12 && normal.z > 0.5)  { shade *= 0.68; }
  // Rim: baked into shade
  let viewDir = normalize(vec3f(sin(0.79), 0.62, cos(0.79)));
  shade += pow(1.0 - abs(dot(normal, viewDir)), 4.2) * 0.22;

  let collapsed = dungStage(0.22, 0.65);

  output.position = dungProject(worldPos);
  output.normal = normal;
  output.uv = uv;
  output.local = geom[0] / blockSize;
  output.shade = mix(shade, 1.0, collapsed);
  output.seed = seed;
  output.blockType = blockTypes[cellIndex];
  output.featureType = featType;
  output.connections = conn;
  output.faceIndex = faceIndex;
  output.part = part;

  return output;
}

fn dungeonQrColor(blockType: u32, noise: f32) -> vec3f {
  var color = uniforms.themePrimary.rgb;
  if (blockType == 3u) {
    color = uniforms.themeSecondary.rgb;
  } else if (blockType == 4u) {
    color = mix(uniforms.themeThird.rgb, uniforms.themeFourth.rgb, 0.55);
  } else if (blockType == 2u || blockType == 5u) {
    color = uniforms.themeFourth.rgb;
  }
  let luma = dot(color, vec3f(0.2126, 0.7152, 0.0722));
  let contrast = mix(color, dungInk(), smoothstep(0.76, 0.96, luma) * 0.15);
  return contrast * (0.94 + noise * 0.06);
}

fn dungeonQrMask(uv: vec2f, neighborMask: u32) -> f32 {
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
fn fragmentMain(input: DungeonOutput) -> @location(0) vec4f {
  let progress = uniforms.progress;
  let inkStage = smoothstep(0.58, 0.96, progress);
  let isDark = input.blockType != 0u;
  let paper = dungPaper();
  let noise = dungeonHash(input.position.xy + vec2f(uniforms.time * 0.13));

  // Derive rich materials directly from theme palette colors!
  let floorFlagstone = mix(uniforms.themeFifth.rgb * 0.85, vec3f(0.45), 0.35);
  let masonryWall = uniforms.themePrimary.rgb;
  let torchFlame = uniforms.themeSecondary.rgb;
  let ironSconce = uniforms.themeFourth.rgb;

  var color = floorFlagstone;

  if (input.part == 0u) {
    // Flagstone floor with mortar lines
    let uv = input.uv;
    let mortar = step(0.05, uv.x) * step(uv.x, 0.95) * step(0.05, uv.y) * step(uv.y, 0.95);
    color = mix(floorFlagstone * 0.65, floorFlagstone, mortar);
  } else if (input.part == 1u) {
    // 3D Ashlar stone wall
    color = masonryWall;
    if (input.featureType == 5u) {
      // Fortress keep
      color = mix(masonryWall, ironSconce, 0.4);
    }
  } else if (input.part == 2u) {
    // Crenellations / lintels
    color = mix(masonryWall, vec3f(0.85), 0.2);
  } else {
    // Flickering torch flame
    let flicker = 0.7 + 0.3 * sin(uniforms.time * 8.0 + input.seed * 6.28);
    color = torchFlame * flicker * 1.5;
  }

  // Stone masonry detail: mortar lines darker
  if (input.part == 1u || input.part == 2u) {
    let mortarH = step(0.93, fract(input.local.y * 3.5 + input.seed));
    let mortarV = step(0.93, fract(input.uv.x * 4.0 + input.seed * 1.7));
    color = mix(color, color * 0.58, max(mortarH, mortarV) * 0.5);
  }
  // Contact shadow at base of each structure
  let contact = 1.0 - smoothstep(0.0, 0.22, input.local.y) * 0.30 * (1.0 - uniforms.progress);
  color *= contact;
  // Full shade range
  var shaded = color * clamp(input.shade, 0.0, 1.4);

  let qrNoise = dungeonHash(input.uv + vec2f(f32(input.blockType) * 0.37));
  let mask = dungeonQrMask(input.uv, input.connections);
  let isActive = select(0.0, 1.0, isDark);
  let qrColor = mix(paper, dungeonQrColor(input.blockType, qrNoise), isActive * mask);

  var result = mix(shaded, qrColor, inkStage);
  result += (noise - 0.5) * 0.015 * (1.0 - inkStage);

  return vec4f(clamp(result, vec3f(0.0), vec3f(1.0)), 1.0);
}
`;
