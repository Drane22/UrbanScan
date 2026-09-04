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

const COLONY_PARTS: u32 = 6u;

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

// Tree-contract camera: continuous tilt with a breathing pulse and idle bob.
fn colProject(localPos: vec3f) -> vec4f {
  let camera = uniforms.progress;
  let angleY = mix(0.785398, 0.0, camera) + uniforms.cameraBobX;
  let angleX = mix(-0.610865, -1.570796, camera) + uniforms.cameraBobY;
  let cy = cos(angleY);
  let sy = sin(angleY);
  let cx = cos(angleX);
  let sx = sin(angleX);

  let rotX = localPos.x * cy - localPos.z * sy;
  let rotZ = localPos.x * sy + localPos.z * cy;
  let rotY = localPos.y * cx - rotZ * sx;
  let depth = localPos.y * sx + rotZ * cx;

  let portrait = select(1.0, 1.18, uniforms.aspectRatio < 0.8);
  let pulse = 1.0 + sin(camera * 3.14159265) * 0.035;
  let scale = mix(38.0, 46.4, camera) / uniforms.gridSize * portrait * pulse * uniforms.camera.x;
  let scaleX = scale / max(uniforms.aspectRatio, 1.0);
  let scaleY = scale / max(1.0 / uniforms.aspectRatio, 1.0);
  let yOffset = mix(-0.18, 0.08, camera) + uniforms.cameraBobY;
  let xOffset = mix(0.0, 0.015, camera);

  return vec4f((rotX + xOffset) * scaleX, (rotY + yOffset) * scaleY, depth * 0.01 + 0.5, 1.0);
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
  @location(5) cellRadius: f32,
  @location(6) @interpolate(flat) blockType: u32,
  @location(7) @interpolate(flat) moduleType: u32,
  @location(8) @interpolate(flat) connections: u32,
  @location(9) @interpolate(flat) faceIndex: u32,
  @location(10) @interpolate(flat) part: u32,
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

// Rod-shaped specimen morphology: seeded orientation and elongation.
fn rodAngle(seed: f32) -> f32 {
  return seed * 6.28318;
}

fn rodFactor(modType: u32, seed: f32) -> f32 {
  return select(0.0, 1.0, modType == 3u || modType == 4u || seed > 0.82);
}

fn applyStretch(p: vec2f, angle: f32, stretch: vec2f) -> vec2f {
  let c = cos(angle);
  let s = sin(angle);
  let q = vec2f(p.x * c - p.y * s, p.x * s + p.y * c);
  let r = q * stretch;
  return vec2f(r.x * c + r.y * s, -r.x * s + r.y * c);
}

// Hexagonal membrane footprint blended toward the exact square QR module.
fn hexFootprint(p: vec2f, footHalf: f32) -> f32 {
  let q = abs(p);
  let d = max(q.x * 0.866 + q.y * 0.5, q.y);
  return 1.0 - smoothstep(footHalf * 0.80, footHalf, d);
}

fn squareFootprint(p: vec2f, footHalf: f32) -> f32 {
  let q = abs(p);
  let d = max(q.x, q.y);
  return 1.0 - smoothstep(footHalf * 0.94, footHalf, d);
}

// Seeded off-lattice drift plus slow ambient wander; both die during fixation
// so every cell resolves onto its exact module coordinate.
fn cellDrift(seed: f32, settle: f32) -> vec2f {
  let base = vec2f(seed - 0.5, fract(seed * 7.31) - 0.5) * 0.56;
  let wanderX = sin(uniforms.time * 0.42 + seed * 47.0) * 0.07;
  let wanderZ = cos(uniforms.time * 0.33 + seed * 61.0) * 0.07;
  return (base + vec2f(wanderX, wanderZ)) * (1.0 - settle);
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

  let blockSize = uniforms.blockSize;
  let halfGrid = uniforms.gridSize * blockSize * 0.5;
  let cellCenter = vec3f(
    (posData.x + 0.5) * blockSize - halfGrid,
    0.0,
    (posData.y + 0.5) * blockSize - halfGrid
  );

  // Fixation timeline: drift dies first, then domes collapse while prisms
  // rise, nuclei sink, and the square footprint locks in.
  let settle = colStage(0.28, 0.64);
  let lift = 1.0 - colStage(0.44, 0.84);
  let prismStage = colStage(0.52, 0.90);
  let nucleusStage = 1.0 - colStage(0.42, 0.72);
  let vesicleStage = 1.0 - colStage(0.18, 0.48);
  let scatter = colStage(0.14, 0.46);

  let drift = cellDrift(seed, settle) * blockSize;
  let cellRadius = mix(0.78, 1.0, fract(seed * 3.71));
  let isRod = rodFactor(modType, seed);
  let stretch = mix(vec2f(1.0), vec2f(1.55, 0.72), isRod);
  let angle = rodAngle(seed);

  // Tissue fusion: stretch the membrane toward connected neighbors.
  var fusion = vec2f(0.0);
  if ((conn & 1u) != 0u) { fusion.y -= 0.16; }
  if ((conn & 2u) != 0u) { fusion.x += 0.16; }
  if ((conn & 4u) != 0u) { fusion.y += 0.16; }
  if ((conn & 8u) != 0u) { fusion.x -= 0.16; }
  fusion *= (1.0 - settle) * cellRadius;

  let heightScale = select(1.0, select(select(1.06, 1.18, modType >= 5u), 0.84, modType == 3u || modType == 4u), modType >= 2u);
  let domeHeight = max(modHeight * heightScale, 0.12) * lift;

  var localVert = vec3f(0.0);
  var localNorm = vec3f(0.0, 1.0, 0.0);
  var pieceOffset = vec3f(0.0);
  var visible = 1.0;

  if (part == 0u) {
    // Culture-medium film under every cell.
    let filmH = select(0.035, 0.055, isDark);
    let geom = colonyBoxGeometry(faceIndex, uv, vec3f(1.0, filmH, 1.0) * blockSize);
    localVert = geom[0];
    localNorm = geom[1];
    if (faceIndex == 0u) {
      let gx = posData.x + uv.x;
      let gz = posData.y + uv.y;
      localVert.y += cultureMediumRelief(gx, gz) * blockSize * (1.0 - prismStage);
    }
  } else if (!isDark) {
    visible = 0.0;
  } else if (part == 1u) {
    // Membrane dome: hexagonal organic silhouette, top face only. It
    // collapses as the square QR prism (part 4) rises beneath it.
    if (faceIndex != 0u) {
      visible = 0.0;
    } else {
      var p = (uv - vec2f(0.5)) * blockSize * cellRadius;
      p = applyStretch(p, angle, stretch);
      p += fusion * blockSize;
      let radius = length(p) / max(0.5 * blockSize * cellRadius, 0.0001);
      let domeProfile = cos(min(radius, 1.0) * 1.570796);
      let membranePulse = 0.94 + 0.06 * sin(uniforms.time * 1.15 + seed * 6.28318);
      let bumps = 0.88 + 0.12 * sin(p.x * 84.0 / blockSize + seed * 40.0) * sin(p.y * 76.0 / blockSize + seed * 61.0);
      let domeH = domeHeight * blockSize * domeProfile * bumps * membranePulse
        + blockSize * 0.035 * lift;
      localVert = vec3f(p.x + drift.x, domeH, p.y + drift.y);
      let slope = -sin(min(radius, 1.0) * 1.570796) * 0.6;
      localNorm = normalize(vec3f(p.x * slope, 1.0, p.y * slope));
    }
  } else if (part == 2u) {
    // Nucleus dome riding inside large cells; sinks during fixation.
    let nucleusW = select(0.34, 0.52, modType >= 5u) * cellRadius * nucleusStage;
    if (nucleusW < 0.02) {
      visible = 0.0;
    } else {
      let geom = colonyBoxGeometry(faceIndex, uv, vec3f(nucleusW, 0.18 * nucleusStage, nucleusW) * blockSize);
      localVert = geom[0];
      localNorm = geom[1];
      if (faceIndex == 0u) {
        let radius = length(uv - vec2f(0.5)) * 2.0;
        localVert.y += cos(min(radius, 1.0) * 1.570796) * 0.18 * nucleusStage * blockSize;
      }
      pieceOffset = vec3f(drift.x, domeHeight * blockSize * 0.42 + blockSize * 0.045, drift.y);
    }
  } else if (part == 3u) {
    // Drifting vesicle near the parent membrane.
    let hasVesicle = f32(select(0.0, 1.0, modType == 3u || modType == 4u || seed > 0.72));
    let vScale = vesicleStage * hasVesicle;
    if (vScale < 0.02) {
      visible = 0.0;
    } else {
      let orbitAngle = uniforms.time * 0.24 + seed * 6.28318;
      let orbit = vec2f(cos(orbitAngle), sin(orbitAngle)) * 0.30 * cellRadius;
      let geom = colonyBoxGeometry(faceIndex, uv, vec3f(0.15, 0.11, 0.15) * vScale * blockSize);
      localVert = geom[0];
      localNorm = geom[1];
      pieceOffset = vec3f(
        drift.x + orbit.x * blockSize,
        domeHeight * blockSize * 0.28 + blockSize * 0.05,
        drift.y + orbit.y * blockSize
      );
    }
  } else if (part == 4u) {
    // Square QR prism: hidden while alive, rises into the exact scan module.
    if (!isDark || prismStage < 0.01) {
      visible = 0.0;
    } else {
      let prismH = 0.055 * prismStage;
      let geom = colonyBoxGeometry(faceIndex, uv, vec3f(1.0, prismH, 1.0) * blockSize);
      localVert = geom[0];
      localNorm = geom[1];
    }
  } else {
    // Motile germ swimming above the culture; darts away at fixation.
    let germSeed = step(0.86, seed) + f32(select(0.0, 1.0, modType == 3u));
    if (germSeed < 0.5 || scatter > 0.99) {
      visible = 0.0;
    } else {
      let swim = 1.0 - scatter;
      let orbitAngle = uniforms.time * (0.5 + seed) + seed * 43.0;
      let orbitR = (0.45 + seed * 0.5) * blockSize;
      let bob = sin(uniforms.time * 2.1 + seed * 30.0) * 0.06 * blockSize;
      let direction = normalize(vec2f(seed - 0.5, fract(seed * 3.11) - 0.5) + vec2f(0.013, 0.017));
      let bodyAngle = orbitAngle + 1.570796;
      let geom = colonyBoxGeometry(
        faceIndex,
        uv,
        vec3f(0.34, 0.13, 0.13) * (0.55 + seed * 0.45) * blockSize
      );
      localVert = geom[0];
      localNorm = geom[1];
      localVert = vec3f(
        localVert.x * cos(bodyAngle) - localVert.z * sin(bodyAngle),
        localVert.y + sin(uniforms.time * 9.0 + seed * 31.0) * 0.03 * blockSize * swim,
        localVert.x * sin(bodyAngle) + localVert.z * cos(bodyAngle)
      );
      localNorm = vec3f(
        localNorm.x * cos(bodyAngle) - localNorm.z * sin(bodyAngle),
        localNorm.y,
        localNorm.x * sin(bodyAngle) + localNorm.z * cos(bodyAngle)
      );
      pieceOffset = vec3f(
        drift.x + cos(orbitAngle) * orbitR * swim + direction.x * scatter * 9.0 * blockSize,
        (0.6 + seed * 1.1) * blockSize * swim + bob + scatter * 3.0 * blockSize,
        drift.y + sin(orbitAngle) * orbitR * swim + direction.y * scatter * 9.0 * blockSize
      );
    }
  }

  if (visible < 0.01) {
    output.position = vec4f(2.0, 2.0, 2.0, 1.0);
    return output;
  }

  let worldPos = cellCenter + pieceOffset + localVert;
  let normal = normalize(localNorm);
  let keyDir = normalize(vec3f(-0.38, 0.88, -0.24));
  let diffuse = max(dot(normal, keyDir), 0.0);
  let fill = max(dot(normal, normalize(vec3f(0.42, 0.26, 0.48))), 0.0) * 0.18;
  var shade = 0.24 + pow(diffuse, 0.82) * 0.78 + fill;
  if (normal.y > 0.45) { shade = min(1.25, shade * 1.08 + 0.10); }

  let viewDir = normalize(vec3f(sin(0.785), 0.61, cos(0.785)));
  let rimLight = pow(1.0 - abs(dot(normal, viewDir)), 3.5) * 0.24;
  let collapsed = colStage(0.44, 0.84);
  let valley = colonyValley(modHeight, column, row) * (1.0 - collapsed);
  shade *= 1.0 - valley * 0.18;
  shade = mix(shade, 1.0, colStage(0.56, 0.94));

  output.position = colProject(worldPos);
  output.normal = normal;
  output.uv = uv;
  output.worldPos = worldPos;
  output.shade = shade + rimLight * f32(part == 1u) * (1.0 - collapsed);
  output.seed = seed;
  output.cellRadius = cellRadius;
  output.blockType = blockTypes[cellIndex];
  output.moduleType = modType;
  output.connections = conn;
  output.faceIndex = faceIndex;
  output.part = part;
  return output;
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
    // Agar medium: growth rings, micro-colony speckle, meniscus rim.
    let mediumGrain = colonyHash(input.worldPos.xz * 7.0 + vec2f(input.seed * 4.3));
    color = mix(paper, stainTone, 0.055 + mediumGrain * 0.025);

    let ringRadius = length(input.worldPos.xz) / max(uniforms.blockSize, 0.0001);
    let growthRing = sin(ringRadius * 0.9) * 0.5 + 0.5;
    color = mix(color, stainTone, growthRing * 0.030 * (1.0 - fixationInk));

    let speckCell = floor(input.worldPos.xz / max(uniforms.blockSize * 0.5, 0.0001));
    let speck = colonyHash(speckCell + vec2f(11.3, 7.7));
    let speckMask = smoothstep(0.965, 0.995, speck) * (1.0 - fixationInk);
    color = mix(color, reagentTone, speckMask * 0.30);

    let halfSlide = uniforms.gridSize * uniforms.blockSize * 0.5;
    let slideEdge = halfSlide - max(abs(input.worldPos.x), abs(input.worldPos.z));
    let glassRim = 1.0 - smoothstep(0.0, uniforms.blockSize * 0.72, slideEdge);
    color = mix(color, mix(paper, membraneTone, 0.16), glassRim * (1.0 - fixationInk));
  } else if (input.part == 1u) {
    // Membrane body. The footprint blends from hexagon to exact square while
    // the dome collapses into its QR prism.
    let p = applyStretch(
      (input.uv - vec2f(0.5)) * uniforms.blockSize * input.cellRadius,
      rodAngle(input.seed),
      mix(vec2f(1.0), vec2f(1.55, 0.72), rodFactor(input.moduleType, input.seed)),
    );
    let converge = colStage(0.55, 0.92);
    let footHalf = 0.5 * uniforms.blockSize * input.cellRadius;
    let organic = mix(hexFootprint(p, footHalf), squareFootprint(p, footHalf), converge);
    if (input.faceIndex == 0u && organic < 0.5) { discard; }

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
    let membraneBand = smoothstep(0.76, 0.92, length(input.uv - vec2f(0.5)) * 2.0);
    color = mix(color, membraneTone, membraneBand * 0.14);

    let qrNoise = colonyHash(input.uv + vec2f(f32(input.blockType) * 0.37));
    color = mix(color, colonyQrColor(input.moduleType, qrNoise), fixationInk);
  } else if (input.part == 2u) {
    // Nucleus with chromatin speckle.
    color = mix(primaryTone, stainTone, 0.34);
    let chromatin = colonyHash(input.uv * 8.0 + vec2f(input.seed));
    color = mix(color, reagentTone, step(0.72, chromatin) * 0.18);
    color = mix(color, colonyQrColor(input.moduleType, 0.5), fixationInk);
  } else if (input.part == 3u) {
    color = mix(reagentTone, membraneTone, 0.20);
    color = mix(color, colonyQrColor(input.moduleType, 0.5), fixationInk);
  } else if (input.part == 4u) {
    // Exact QR module prism with rounded corners at scan lock. Finder
    // organoids keep full square footprints so scan targets stay solid.
    var scanMask = colonyQrMask(input.uv, input.connections);
    if (input.moduleType >= 5u) { scanMask = 1.0; }
    scanMask = mix(scanMask, 1.0, squareLock);
    if (abs(input.normal.y) > 0.5 && scanMask < 0.5) { discard; }

    let qrNoise = colonyHash(input.uv + vec2f(f32(input.blockType) * 0.37));
    var qrInk = colonyQrColor(input.moduleType, qrNoise);
    let edgeDistance = min(min(input.uv.x, 1.0 - input.uv.x), min(input.uv.y, 1.0 - input.uv.y));
    let pulseInterior = smoothstep(0.10, 0.28, edgeDistance);
    let scanPulse = sin(uniforms.time * 0.82 + input.seed * 6.28318) * 0.010;
    qrInk *= 1.0 + scanPulse * pulseInterior * squareLock;

    color = qrInk;
  } else {
    // Germ body.
    color = mix(reagentTone, vec3f(1.0), 0.18) * 1.08;
    color = mix(color, paper, fixationInk);
  }

  var lit = color * input.shade;
  let livingNoise = colonyHash(input.position.xy + vec2f(uniforms.time * 0.12));
  lit += (livingNoise - 0.5) * 0.012 * (1.0 - fixationInk);
  return vec4f(clamp(lit, vec3f(0.0), vec3f(1.0)), 1.0);
}`;
