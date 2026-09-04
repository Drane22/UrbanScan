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
  return mix(ink, vec3f(0.012), 0.18);
}

fn dungPaper() -> vec3f {
  return mix(uniforms.themeFifth.rgb, vec3f(0.98), 0.58);
}

fn dungQrContrast(color: vec3f) -> vec3f {
  let luma = dot(color, vec3f(0.2126, 0.7152, 0.0722));
  // Torch-amber and pale ashlar tones must resolve to dark ink at scan lock
  // while deep stone and crimson tones keep their hue identity.
  let correction = smoothstep(0.38, 0.68, luma) * 0.80;
  return mix(color, dungInk(), correction);
}

fn dungStage(start: f32, end: f32) -> f32 {
  return smoothstep(start, end, uniforms.progress);
}

fn dungProject(localPos: vec3f) -> vec4f {
  let camera = dungStage(0.50, 1.00);
  let angleY = mix(0.785398, 0.0, camera);
  let angleX = mix(-0.610865, -1.570796, camera);
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
  @location(2) worldPos: vec3f,
  @location(3) shade: f32,
  @location(4) seed: f32,
  @location(5) castShadow: f32,
  @location(6) valleyOcclusion: f32,
  @location(7) rimLight: f32,
  @location(8) heightFraction: f32,
  @location(9) @interpolate(flat) blockType: u32,
  @location(10) @interpolate(flat) featType: u32,
  @location(11) @interpolate(flat) connections: u32,
  @location(12) @interpolate(flat) faceIndex: u32,
  @location(13) @interpolate(flat) part: u32,
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

fn createDungeonPiece(
  part: u32,
  featType: u32,
  featHeight: f32,
  isDark: bool,
  seed: f32,
  conn: u32
) -> DungeonPiece {
  let torchStage = 1.0 - dungStage(0.00, 0.18);
  let detailStage = 1.0 - dungStage(0.12, 0.35);
  let elevationStage = 1.0 - dungStage(0.22, 0.65);
  let footStage = dungStage(0.55, 0.90);

  var piece: DungeonPiece;
  piece.visible = 1.0;

  var heightScale = 1.6;
  if (featType == 5u) {
    heightScale = 2.8; // Boss keep & central tower
  } else if (featType == 2u) {
    heightScale = 2.0; // Vaulted Great Hall
  } else if (featType == 4u) {
    heightScale = 1.8; // Structural pillar
  } else if (featType == 3u) {
    heightScale = 1.6; // Archway corridor
  } else if (featType == 1u) {
    heightScale = 1.7; // Thick stone wall
  }

  let totalHeight = mix(0.04, max(featHeight * heightScale, 0.18), elevationStage);

  if (part == 0u) {
    // Part 0: Continuous paved flagstone floor covering full 1.0 module size (zero gaps)
    let baseH = select(0.04, 0.08, isDark);
    piece.size = vec3f(1.0, baseH, 1.0);
    piece.offset = vec3f(0.0, 0.0, 0.0);
    piece.visible = 1.0;
    return piece;
  }

  if (part == 1u) {
    // Part 1: Heavy stone masonry walls and chamber massing
    if (!isDark) {
      piece.visible = 0.0; piece.size = vec3f(0.0); piece.offset = vec3f(0.0);
      return piece;
    }
    // Full width so adjacent walls fuse seamlessly
    var bodyW = mix(0.96, 1.0, footStage);
    var bodyD = mix(0.96, 1.0, footStage);
    if (featType == 4u) {
      // Free-standing column in courtyard/alcove
      bodyW = mix(0.68, 1.0, footStage);
      bodyD = mix(0.68, 1.0, footStage);
    }
    let bodyH = totalHeight * 0.78 * elevationStage;
    piece.size = vec3f(bodyW, bodyH, bodyD);
    piece.offset = vec3f(0.0, 0.08, 0.0);
    piece.visible = elevationStage;
    return piece;
  }

  if (part == 2u) {
    // Part 2: Overhanging battlements, crenellations, corbels, and archways
    if (!isDark) {
      piece.visible = 0.0; piece.size = vec3f(0.0); piece.offset = vec3f(0.0);
      return piece;
    }
    var capW = mix(1.02, 1.0, footStage);
    var capD = mix(1.02, 1.0, footStage);
    var capH = 0.28 * detailStage;

    if (featType == 5u) {
      // Boss keep: wide overhanging machicolations & battlements
      capW = mix(1.08, 1.0, footStage);
      capD = mix(1.08, 1.0, footStage);
      capH = 0.45 * detailStage;
    } else if (featType == 4u) {
      // Flared pillar capital
      capW = mix(0.85, 1.0, footStage);
      capD = mix(0.85, 1.0, footStage);
      capH = 0.32 * detailStage;
    }

    piece.size = vec3f(capW, capH, capD);
    piece.offset = vec3f(0.0, 0.08 + totalHeight * 0.78 * elevationStage, 0.0);
    piece.visible = detailStage;
    return piece;
  }

  // Part 3: Wall Torches, Fire Braziers & Altar Flames
  let hasFlame = featType == 7u || featType == 5u || (featType == 2u && seed > 0.35) || (featType == 3u && seed > 0.45);
  if (!isDark || !hasFlame) {
    piece.visible = 0.0; piece.size = vec3f(0.0); piece.offset = vec3f(0.0);
    return piece;
  }

  let flicker = 0.85 + 0.15 * sin(uniforms.time * 11.0 + seed * 14.0) + 0.08 * sin(uniforms.time * 24.0 + seed * 9.0);
  let flameBase = 0.08 + totalHeight * 0.78 * elevationStage + 0.18 * detailStage;
  let emberY = fract(uniforms.time * 0.8 + seed * 5.0) * 0.25 * torchStage;
  let emberSway = sin(uniforms.time * 4.2 + seed * 8.0) * 0.03 * torchStage;

  var flameW = 0.25 * torchStage * flicker;
  var flameH = 0.55 * torchStage * flicker;
  var flameD = 0.25 * torchStage * flicker;

  if (featType == 5u) {
    flameW = 0.38 * torchStage * flicker;
    flameH = 0.75 * torchStage * flicker;
    flameD = 0.38 * torchStage * flicker;
  }

  piece.size = vec3f(flameW, flameH, flameD);
  piece.offset = vec3f(emberSway, flameBase + emberY, 0.0);
  piece.visible = torchStage;
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

  let piece = createDungeonPiece(part, featType, featHeight, isDark, seed, conn);
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

  var localVert = geom[0];
  var localNorm = geom[1];

  let footStage = dungStage(0.55, 0.90);
  let archFactor = (1.0 - footStage);
  let halfB = blockSize * 0.5;

  // CONTINUOUS 4-WAY WALL BRIDGING:
  // Connect adjacent wall modules seamlessly so they form continuous masonry walls
  if (part == 1u && isDark) {
    if ((conn & 1u) != 0u && uv.y < 0.35) {
      localVert.z = mix(localVert.z, -halfB, 0.90 * archFactor);
    }
    if ((conn & 4u) != 0u && uv.y > 0.65) {
      localVert.z = mix(localVert.z, halfB, 0.90 * archFactor);
    }
    if ((conn & 8u) != 0u && uv.x < 0.35) {
      localVert.x = mix(localVert.x, -halfB, 0.90 * archFactor);
    }
    if ((conn & 2u) != 0u && uv.x > 0.65) {
      localVert.x = mix(localVert.x, halfB, 0.90 * archFactor);
    }

    // Wall batter: stone masonry walls taper slightly inward toward the top
    let heightT = clamp(localVert.y / (piece.size.y * blockSize), 0.0, 1.0);
    let batter = (1.0 - heightT * 0.08) * archFactor;
    localVert.x *= batter;
    localVert.z *= batter;
  } else if (part == 2u && isDark) {
    // Crenellations & Archways bridging across hallway connections
    if ((conn & 1u) != 0u && uv.y < 0.35) {
      localVert.z = mix(localVert.z, -halfB, 0.92 * archFactor);
    }
    if ((conn & 4u) != 0u && uv.y > 0.65) {
      localVert.z = mix(localVert.z, halfB, 0.92 * archFactor);
    }
    if ((conn & 8u) != 0u && uv.x < 0.35) {
      localVert.x = mix(localVert.x, -halfB, 0.92 * archFactor);
    }
    if ((conn & 2u) != 0u && uv.x > 0.65) {
      localVert.x = mix(localVert.x, halfB, 0.92 * archFactor);
    }
  }

  let worldPos = center + piece.offset * blockSize + localVert;
  let normal = normalize(localNorm);

  // Directional torch & moon lighting
  let lightDir = normalize(vec3f(-0.45, 0.82, -0.35));
  let diffuse = max(dot(normal, lightDir), 0.0);
  let fillDir = normalize(vec3f(0.35, 0.40, 0.55));
  let fill = max(dot(normal, fillDir), 0.0) * 0.15;

  var shade = 0.12 + pow(diffuse, 0.65) * 0.88 + fill;
  if (normal.y > 0.45) { shade = min(1.35, shade * 1.15 + 0.15); }
  if (abs(normal.y) < 0.12 && normal.x < -0.5) { shade *= 0.58; }
  if (abs(normal.y) < 0.12 && normal.z > 0.5)  { shade *= 0.70; }

  let viewDir = normalize(vec3f(0.707, 0.60, 0.707));
  let rim = pow(1.0 - abs(dot(normal, viewDir)), 3.8) * 0.22;
  shade += rim;

  let collapsed = dungStage(0.22, 0.65);
  let colI = i32(round(posData.x));
  let rowI = i32(round(posData.y));

  output.position = dungProject(worldPos);
  output.normal = normal;
  output.uv = uv;
  output.worldPos = worldPos;
  output.shade = mix(shade, 1.0, collapsed);
  output.seed = seed;
  output.castShadow = mix(dungeonShadow(featHeight, colI, rowI), 1.0, collapsed);
  output.valleyOcclusion = dungeonValley(featHeight, colI, rowI) * (1.0 - collapsed);
  output.rimLight = rim * (1.0 - collapsed);
  output.heightFraction = clamp(localVert.y / max(piece.size.y * blockSize, 0.001), 0.0, 1.0);
  output.blockType = blockTypes[cellIndex];
  output.featType = featType;
  output.connections = conn;
  output.faceIndex = faceIndex;
  output.part = part;

  return output;
}

fn dungeonQrColor(blockType: u32, featType: u32, noise: f32) -> vec3f {
  var color = uniforms.themePrimary.rgb;
  if (featType == 5u) {
    color = uniforms.themePrimary.rgb;
  } else if (featType == 2u) {
    color = mix(uniforms.themePrimary.rgb, uniforms.themeFourth.rgb, 0.40);
  } else if (featType == 3u) {
    color = mix(uniforms.themePrimary.rgb, uniforms.themeThird.rgb, 0.35);
  } else if (featType == 7u) {
    color = mix(uniforms.themeSecondary.rgb, uniforms.themeFourth.rgb, 0.50);
  } else {
    color = mix(uniforms.themePrimary.rgb, uniforms.themeThird.rgb, 0.25);
  }
  let contrasted = dungQrContrast(color);
  return contrasted * (0.95 + noise * 0.05);
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
    mask *= 1.0 - step(radius, distance(uv, vec2f(1.0 - radius, 1.0 - radius)));
  }
  return mask;
}

@fragment
fn fragmentMain(input: DungeonOutput) -> @location(0) vec4f {
  let progress = uniforms.progress;
  let inkStage = smoothstep(0.62, 0.98, progress);
  let isDark = input.blockType != 0u;
  let paper = dungPaper();
  let noise = dungeonHash(input.position.xy + vec2f(uniforms.time * 0.10));

  let primaryStone = uniforms.themePrimary.rgb;
  let torchGlow = uniforms.themeSecondary.rgb;
  let wallAshlar = uniforms.themeThird.rgb;
  let accentGranite = uniforms.themeFourth.rgb;
  let floorFlagstone = uniforms.themeFifth.rgb;

  var color = wallAshlar;

  if (input.part == 0u) {
    // Part 0: Continuous paved flagstone pavement with masonry joints and aged wear
    let uv = input.uv;
    let seamX = smoothstep(0.03, 0.05, uv.x) * smoothstep(0.97, 0.95, uv.x);
    let seamY = smoothstep(0.03, 0.05, uv.y) * smoothstep(0.97, 0.95, uv.y);
    let seam = seamX * seamY;
    let stoneGrain = dungeonHash(input.worldPos.xz * 12.0 + vec2f(input.seed * 3.7));
    let baseFloor = mix(wallAshlar, floorFlagstone, 0.45);
    color = mix(primaryStone * 0.65, baseFloor, seam);
    color *= (0.88 + stoneGrain * 0.24);
  } else if (input.part == 1u) {
    // Part 1: Heavy stone masonry walls with running bond ashlar coursing
    let courseY = fract(input.worldPos.y * 5.0);
    let mortarLine = smoothstep(0.06, 0.12, courseY) * smoothstep(0.94, 0.88, courseY);
    let blockShade = mix(0.75, 1.0, mortarLine);

    if (input.featType == 5u) {
      // Boss keep: massive dark fortified stone with royal bloodstone trim
      color = mix(primaryStone, accentGranite, 0.35) * blockShade;
    } else if (input.featType == 2u) {
      // Vaulted chamber: polished dressed ashlar with torch illumination
      color = mix(wallAshlar, torchGlow, 0.22) * blockShade;
    } else if (input.featType == 3u) {
      // Archway corridor: colonnade stone
      color = mix(wallAshlar, accentGranite, 0.25) * blockShade;
    } else if (input.featType == 4u) {
      // Fluted pillar
      let flute = sin(input.uv.x * 37.699) * 0.5 + 0.5;
      color = mix(wallAshlar * 0.85, wallAshlar * 1.15, flute);
    } else {
      color = wallAshlar * blockShade;
    }

    let contactDark = 1.0 - smoothstep(0.0, 0.20, input.heightFraction) * 0.35;
    color *= contactDark;
  } else if (input.part == 2u) {
    // Part 2: Overhanging crenellations, battlements, and corbels
    if (input.featType == 5u) {
      // Keep battlements: alternating crenel and merlon
      let crenel = step(0.50, fract(input.uv.x * 3.0));
      color = mix(accentGranite, primaryStone, crenel * 0.45);
    } else if (input.featType == 4u) {
      color = mix(wallAshlar, accentGranite, 0.40);
    } else {
      color = mix(wallAshlar, floorFlagstone, 0.25);
    }
  } else {
    // Part 3: Glowing torch flames & altar brazier fire
    if (input.featType == 5u) {
      // Boss altar flame: incandescent royal flame with golden core
      let flameGrad = input.uv.y;
      color = mix(torchGlow * 2.2, accentGranite * 1.5, flameGrad);
    } else {
      // Wall torch: warm golden flame
      let flameGrad = input.uv.y;
      color = mix(torchGlow * 2.0, vec3f(1.0, 0.4, 0.1), flameGrad);
    }
  }

  var lit = color * input.shade;
  lit *= input.castShadow;
  lit *= 1.0 - input.valleyOcclusion * 0.28;
  lit += color * input.rimLight;

  let groundContact = 1.0 - smoothstep(0.0, 0.16, input.heightFraction) * 0.22 * (1.0 - uniforms.progress);
  lit *= mix(groundContact, 1.0, uniforms.progress);

  // High-contrast scannable QR generation
  let qrNoise = dungeonHash(input.uv + vec2f(f32(input.blockType) * 0.43));
  let mask = dungeonQrMask(input.uv, input.connections);
  let isActive = select(0.0, 1.0, isDark);
  let qrInk = dungeonQrColor(input.blockType, input.featType, qrNoise);
  let qrColor = mix(paper, qrInk, isActive * mask);

  var result = mix(lit, qrColor, inkStage);
  result += (noise - 0.5) * 0.012 * (1.0 - inkStage);

  return vec4f(clamp(result, vec3f(0.0), vec3f(1.0)), 1.0);
}
`;
