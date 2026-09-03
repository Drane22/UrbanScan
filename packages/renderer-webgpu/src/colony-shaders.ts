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
  return mix(ink, vec3f(0.055, 0.012, 0.030), 0.24);
}

fn colPaper() -> vec3f {
  return mix(uniforms.themeFifth.rgb, vec3f(0.985, 0.970, 0.930), 0.42);
}

fn colQrContrast(color: vec3f) -> vec3f {
  let luma = dot(color, vec3f(0.2126, 0.7152, 0.0722));
  let correction = smoothstep(0.72, 0.94, luma) * 0.25;
  return mix(color, colInk(), correction);
}

fn colStage(start: f32, end: f32) -> f32 {
  return smoothstep(start, end, uniforms.progress);
}

fn colProject(localPos: vec3f) -> vec4f {
  // Reversible camera tilt: 0.50 -> 1.00
  let camera = colStage(0.50, 1.00);
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

export const COLONY_SHADER = /* wgsl */ `
${COLONY_UNIFORMS_WGSL}

struct ColonyOutput {
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
  let direction = normalize(vec2f(0.48, 0.78));
  var shadow = 1.0;
  for (var s: i32 = 1; s < 6; s = s + 1) {
    let offset = vec2f(f32(s)) * direction;
    let neighbor = colonyHeightAt(column + i32(round(offset.x)), row + i32(round(offset.y)));
    let occlusion = smoothstep(height + 0.1, height + 0.6, neighbor);
    shadow *= mix(1.0, 0.72, occlusion * (1.0 - f32(s) * 0.12));
  }
  return max(shadow, 0.65);
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

// Shallow culture-medium surface tension across the glass slide.
fn cultureMediumRelief(gx: f32, gz: f32) -> f32 {
  let w1 = sin(gx * 0.32 + gz * 0.25) * 0.035;
  let w2 = cos(gx * 0.68 - gz * 0.54) * 0.022;
  let w3 = sin(gx * 1.85 + gz * 2.20) * 0.008;
  return w1 + w2 + w3;
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

fn createColonyPiece(
  part: u32,
  modType: u32,
  modHeight: f32,
  isDark: bool,
  seed: f32,
  conn: u32
) -> ColonyPiece {
  let activityStage = 1.0 - colStage(0.08, 0.30);
  let detailStage = 1.0 - colStage(0.24, 0.52);
  let heightStage = 1.0 - colStage(0.38, 0.78);
  let fixationStage = colStage(0.56, 0.92);

  var piece: ColonyPiece;
  piece.visible = 1.0;

  var heightScale = 0.92;
  if (modType >= 5u) {
    heightScale = 1.18;
  } else if (modType == 2u) {
    heightScale = 1.06;
  } else if (modType == 3u || modType == 4u) {
    heightScale = 0.84;
  }
  let totalHeight = mix(0.04, max(modHeight * heightScale, 0.12), heightStage);

  if (part == 0u) {
    let baseH = select(0.035, 0.055, isDark);
    piece.size = vec3f(1.0, baseH, 1.0);
    piece.offset = vec3f(0.0);
    return piece;
  }

  if (!isDark) {
    piece.visible = 0.0;
    piece.size = vec3f(0.0);
    piece.offset = vec3f(0.0);
    return piece;
  }

  if (part == 1u) {
    var bodyW = mix(0.84, 1.0, fixationStage);
    var bodyD = mix(0.84, 1.0, fixationStage);
    if (modType >= 5u) {
      bodyW = mix(0.94, 1.0, fixationStage);
      bodyD = mix(0.94, 1.0, fixationStage);
    }
    piece.size = vec3f(bodyW, totalHeight * 0.72 * heightStage, bodyD);
    piece.offset = vec3f(0.0, 0.055, 0.0);
    piece.visible = heightStage;
    return piece;
  }

  if (part == 2u) {
    var nucleusW = mix(0.38, 0.82, fixationStage);
    var nucleusH = 0.20 * detailStage;
    if (modType >= 5u) {
      nucleusW = mix(0.56, 0.88, fixationStage);
      nucleusH = 0.34 * detailStage;
    } else if (modType == 2u) {
      nucleusW = mix(0.46, 0.84, fixationStage);
      nucleusH = 0.24 * detailStage;
    }
    piece.size = vec3f(nucleusW, nucleusH, nucleusW);
    piece.offset = vec3f(0.0, 0.055 + totalHeight * 0.72, 0.0);
    piece.visible = detailStage;
    return piece;
  }

  if (modType >= 5u) {
    let organoidPulse = 0.96 + 0.04 * sin(uniforms.time * 1.2 + seed * 6.28318);
    piece.size = vec3f(
      0.30 * activityStage * organoidPulse,
      0.24 * activityStage,
      0.30 * activityStage * organoidPulse
    );
    piece.offset = vec3f(0.0, 0.055 + totalHeight + 0.16 * detailStage, 0.0);
    piece.visible = activityStage;
    return piece;
  }

  if (modType == 2u) {
    let divide = sin(uniforms.time * 0.85 + seed * 6.28318);
    let divideOffset = (0.18 + divide * 0.025) * activityStage;
    piece.size = vec3f(0.42 * activityStage, 0.24 * activityStage, 0.34 * activityStage);
    piece.offset = vec3f(divideOffset, 0.055 + totalHeight * 0.82, 0.0);
    piece.visible = activityStage;
    return piece;
  }

  let vesicleDrift = sin(uniforms.time * 0.72 + seed * 6.28318) * 0.08 * activityStage;
  var moveX = 0.0;
  var moveZ = vesicleDrift;
  if ((conn & 10u) != 0u) {
    moveX = vesicleDrift;
    moveZ = 0.0;
  }
  piece.size = vec3f(0.18 * activityStage, 0.13 * activityStage, 0.18 * activityStage);
  piece.offset = vec3f(moveX, 0.055 + totalHeight * 0.82, moveZ);
  piece.visible = select(0.0, activityStage, modType == 3u || modType == 4u || seed > 0.72);
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
  let piece = createColonyPiece(part, modType, modHeight, isDark, seed, conn);

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

  var localVert = geom[0];
  let localNorm = geom[1];
  let fixationStage = colStage(0.56, 0.92);
  let activityStage = 1.0 - colStage(0.08, 0.30);
  let pieceH = piece.size.y * blockSize;
  let heightFrac = clamp(localVert.y / max(pieceH, 0.001), 0.0, 1.0);

  if (part == 0u && faceIndex == 0u) {
    let gx = posData.x + uv.x;
    let gz = posData.y + uv.y;
    localVert.y += cultureMediumRelief(gx, gz) * blockSize * (1.0 - fixationStage);
  } else if (part == 1u) {
    let livingStage = 1.0 - fixationStage;
    let halfB = blockSize * 0.5;
    if ((conn & 1u) != 0u && uv.y < 0.35) {
      localVert.z = mix(localVert.z, -halfB, 0.68 * livingStage);
    }
    if ((conn & 4u) != 0u && uv.y > 0.65) {
      localVert.z = mix(localVert.z, halfB, 0.68 * livingStage);
    }
    if ((conn & 8u) != 0u && uv.x < 0.35) {
      localVert.x = mix(localVert.x, -halfB, 0.68 * livingStage);
    }
    if ((conn & 2u) != 0u && uv.x > 0.65) {
      localVert.x = mix(localVert.x, halfB, 0.68 * livingStage);
    }

    let radius = length(uv - 0.5) * 2.0;
    if (faceIndex == 0u) {
      let membraneDome = cos(min(radius, 1.0) * 1.570796) * pieceH * 0.30 * livingStage;
      localVert.y += membraneDome;
    } else {
      let membraneBulge = sin(heightFrac * 3.14159265) * 0.16 * livingStage;
      localVert.x *= 1.0 + membraneBulge;
      localVert.z *= 1.0 + membraneBulge;
    }

    if (modType >= 5u) {
      let foldAngle = atan2(localVert.z, localVert.x);
      let membraneFold = sin(foldAngle * 6.0 + heightFrac * 5.0 + seed * 3.0) * 0.055 * livingStage;
      localVert.x *= 1.0 + membraneFold;
      localVert.z *= 1.0 + membraneFold;
    }
  } else if (part == 2u && faceIndex == 0u) {
    let radius = length(uv - 0.5) * 2.0;
    localVert.y += cos(min(radius, 1.0) * 1.570796) * pieceH * 0.42 * (1.0 - fixationStage);
  } else if (part == 3u) {
    let intracellularPulse = sin(uniforms.time * 1.1 + seed * 6.28318) * 0.035 * activityStage;
    localVert *= 1.0 + intracellularPulse;
  }

  let worldPos = center + piece.offset * blockSize + localVert;
  let normal = normalize(localNorm);
  let keyDir = normalize(vec3f(-0.38, 0.88, -0.24));
  let diffuse = max(dot(normal, keyDir), 0.0);
  let fill = max(dot(normal, normalize(vec3f(0.42, 0.26, 0.48))), 0.0) * 0.18;
  var shade = 0.24 + pow(diffuse, 0.82) * 0.78 + fill;
  if (normal.y > 0.45) { shade = min(1.25, shade * 1.08 + 0.10); }

  let viewDir = normalize(vec3f(sin(0.785), 0.61, cos(0.785)));
  let rimLight = pow(1.0 - abs(dot(normal, viewDir)), 3.5) * 0.24;
  let collapsed = colStage(0.38, 0.78);

  output.position = colProject(worldPos);
  output.normal = normal;
  output.uv = uv;
  output.worldPos = worldPos;
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

fn colonyQrColor(modType: u32, noise: f32) -> vec3f {
  var color = uniforms.themePrimary.rgb;
  if (modType == 1u) {
    color = mix(uniforms.themePrimary.rgb, uniforms.themeThird.rgb, 0.12);
  } else if (modType == 2u) {
    color = mix(uniforms.themePrimary.rgb, uniforms.themeSecondary.rgb, 0.15);
  } else if (modType == 3u) {
    color = mix(uniforms.themePrimary.rgb, uniforms.themeFourth.rgb, 0.12);
  } else if (modType == 4u) {
    color = mix(uniforms.themePrimary.rgb, uniforms.themeFourth.rgb, 0.18);
  } else if (modType == 6u) {
    color = mix(uniforms.themePrimary.rgb, uniforms.themeThird.rgb, 0.14);
  } else if (modType == 7u) {
    color = mix(uniforms.themePrimary.rgb, uniforms.themeSecondary.rgb, 0.12);
  }
  return colQrContrast(color) * (0.985 + noise * 0.015);
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
    mask *= 1.0 - step(radius, distance(uv, vec2f(1.0 - radius, 1.0 - radius)));
  }
  return mask;
}

@fragment
fn fragmentMain(input: ColonyOutput) -> @location(0) vec4f {
  let progress = uniforms.progress;
  let fixationInk = smoothstep(0.62, 0.98, progress);
  let squareLock = smoothstep(0.92, 0.995, progress);
  let isDark = input.blockType != 0u;
  let paper = colPaper();
  let primaryTone = uniforms.themePrimary.rgb;
  let reagentTone = uniforms.themeSecondary.rgb;
  let stainTone = uniforms.themeThird.rgb;
  let membraneTone = uniforms.themeFourth.rgb;

  var color = paper;
  if (input.part == 0u) {
    let mediumGrain = colonyHash(input.worldPos.xz * 7.0 + vec2f(input.seed * 4.3));
    let reagentBloom = smoothstep(0.12, 0.48, length(input.uv - 0.5));
    color = mix(paper, stainTone, 0.055 + mediumGrain * 0.025);
    color = mix(color, reagentTone, (1.0 - reagentBloom) * 0.035 * (1.0 - fixationInk));

    let halfSlide = uniforms.gridSize * uniforms.blockSize * 0.5;
    let slideEdge = halfSlide - max(abs(input.worldPos.x), abs(input.worldPos.z));
    let glassRim = 1.0 - smoothstep(0.0, uniforms.blockSize * 0.72, slideEdge);
    color = mix(color, mix(paper, membraneTone, 0.16), glassRim * (1.0 - fixationInk));
  } else if (input.part == 1u) {
    if (input.moduleType == 5u) {
      color = mix(primaryTone, reagentTone, 0.20);
    } else if (input.moduleType == 6u) {
      color = mix(primaryTone, stainTone, 0.24);
    } else if (input.moduleType == 7u) {
      color = mix(primaryTone, membraneTone, 0.20);
    } else if (input.moduleType == 2u) {
      color = mix(primaryTone, reagentTone, 0.16);
    } else if (input.moduleType == 3u) {
      color = mix(primaryTone, stainTone, 0.18);
    } else if (input.moduleType == 4u) {
      color = mix(primaryTone, membraneTone, 0.18);
    } else {
      color = mix(primaryTone, membraneTone, 0.10);
    }
    let membraneBand = smoothstep(0.76, 0.92, length(input.uv - 0.5) * 2.0);
    color = mix(color, membraneTone, membraneBand * 0.14);
  } else if (input.part == 2u) {
    color = mix(primaryTone, stainTone, 0.34);
    if (input.moduleType >= 5u) {
      let chromatin = colonyHash(input.uv * 8.0 + vec2f(input.seed));
      color = mix(color, reagentTone, step(0.72, chromatin) * 0.18);
    }
  } else {
    if (input.moduleType >= 5u) {
      color = mix(reagentTone, membraneTone, 0.20);
    } else if (input.moduleType == 2u) {
      color = mix(primaryTone, reagentTone, 0.34);
    } else {
      color = mix(stainTone, reagentTone, 0.42);
    }
  }

  var lit = color * input.shade;
  lit *= input.castShadow;
  lit *= 1.0 - input.valleyOcclusion * 0.18;
  lit += color * input.rimLight;

  let qrNoise = colonyHash(input.uv + vec2f(f32(input.blockType) * 0.37));
  let organicMask = colonyQrMask(input.uv, input.connections);
  let finderLock = select(organicMask, 1.0, input.moduleType >= 5u);
  let scanMask = mix(finderLock, 1.0, squareLock);
  let isActive = select(0.0, 1.0, isDark);
  var qrInk = colonyQrColor(input.moduleType, qrNoise);

  // At the scan endpoint, pulse only the center color of dark modules. Geometry and edges stay fixed.
  let edgeDistance = min(min(input.uv.x, 1.0 - input.uv.x), min(input.uv.y, 1.0 - input.uv.y));
  let pulseInterior = smoothstep(0.10, 0.28, edgeDistance);
  let scanPulse = sin(uniforms.time * 0.82 + input.seed * 6.28318) * 0.010;
  qrInk *= 1.0 + scanPulse * pulseInterior * squareLock;

  let qrColor = mix(paper, qrInk, isActive * scanMask);
  var result = mix(lit, qrColor, fixationInk);
  let livingNoise = colonyHash(input.position.xy + vec2f(uniforms.time * 0.12));
  result += (livingNoise - 0.5) * 0.012 * (1.0 - fixationInk);
  return vec4f(clamp(result, vec3f(0.0), vec3f(1.0)), 1.0);
}`;
