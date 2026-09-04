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

const CONSTELLATION_PARTS: u32 = 4u;

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
  return mix(ink, vec3f(0.015), 0.15);
}

fn constPaper() -> vec3f {
  return mix(uniforms.themeFifth.rgb, vec3f(0.98), 0.55);
}

fn constStage(start: f32, end: f32) -> f32 {
  return smoothstep(start, end, uniforms.progress);
}

fn constProject(localPos: vec3f) -> vec4f {
  let camera = constStage(0.5, 1.0);
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

export const CONSTELLATION_SHADER = /* wgsl */ `
${CONSTELLATION_UNIFORMS_WGSL}

struct ConstellationOutput {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) uv: vec2f,
  @location(2) local: vec3f,
  @location(3) shade: f32,
  @location(4) seed: f32,
  @location(5) @interpolate(flat) blockType: u32,
  @location(6) @interpolate(flat) starType: u32,
  @location(7) @interpolate(flat) connections: u32,
  @location(8) @interpolate(flat) faceIndex: u32,
  @location(9) @interpolate(flat) part: u32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> blockTypes: array<u32>;
@group(0) @binding(2) var<storage, read> blockPositions: array<vec4f>;
@group(0) @binding(3) var<storage, read> blockHeights: array<f32>;
@group(0) @binding(4) var<storage, read> starData: array<vec4f>;

fn constHash(pos: vec2f) -> f32 {
  let scaled = fract(pos * vec2f(0.1031, 0.103));
  let folded = scaled + dot(scaled, scaled.yx + 19.19);
  return fract((folded.x + folded.y) * folded.x);
}

fn constBoxGeometry(faceIndex: u32, uv: vec2f, size: vec3f) -> array<vec3f, 2> {
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

struct ConstPiece {
  size: vec3f,
  offset: vec3f,
  visible: f32,
}

fn createConstPiece(part: u32, sType: u32, sDepth: f32, starSize: f32, isDark: bool, seed: f32) -> ConstPiece {
  let propStage = 1.0 - constStage(0.0, 0.18);
  let detailStage = 1.0 - constStage(0.12, 0.35);
  let heightStage = 1.0 - constStage(0.22, 0.65);
  let footStage = constStage(0.55, 0.90);

  var piece: ConstPiece;
  piece.visible = 1.0;

  var footprint = mix(0.82 + seed * 0.10, 1.0, footStage);
  let totalHeight = mix(0.02, max(abs(sDepth) * 2.0, 0.08), heightStage);

  if (part == 0u) {
    // Interstellar nebula field plate
    let baseH = select(0.02, 0.05, isDark);
    piece.size = vec3f(footprint, baseH, footprint);
    piece.offset = vec3f(0.0, 0.0, 0.0);
    piece.visible = 1.0;
    return piece;
  }

  if (part == 1u) {
    // 3D Stellar node core
    if (!isDark) {
      piece.visible = 0.0;
      piece.size = vec3f(0.0);
      piece.offset = vec3f(0.0);
      return piece;
    }
    // Seeded star size gives real mass hierarchy: finder hubs and major
    // systems read as larger celestial bodies than ordinary stars.
    let bodyFootprint = footprint * select(0.70, 0.85, sType == 5u)
      * (0.72 + min(starSize, 1.8) * 0.22);
    let bodyH = totalHeight * 0.70 * heightStage;
    piece.size = vec3f(bodyFootprint, bodyH, bodyFootprint);
    piece.offset = vec3f(0.0, 0.05, 0.0);
    piece.visible = heightStage;
    return piece;
  }

  if (part == 2u) {
    // Orbital accretion ring / Planetary halo
    if (!isDark) {
      piece.visible = 0.0;
      piece.size = vec3f(0.0);
      piece.offset = vec3f(0.0);
      return piece;
    }
    let ringFootprint = footprint * select(0.88, 0.95, sType == 5u);
    let ringH = 0.06 * detailStage;
    piece.size = vec3f(ringFootprint, ringH, ringFootprint);
    piece.offset = vec3f(0.0, 0.05 + totalHeight * 0.70 * heightStage, 0.0);
    piece.visible = detailStage;
    return piece;
  }

  // Part 3: Stellar diffraction spike / Pulsar ray
  if (!isDark || (sType != 2u && sType != 5u)) {
    piece.visible = 0.0;
    piece.size = vec3f(0.0);
    piece.offset = vec3f(0.0);
    return piece;
  }
  let spikeSize = 0.22 * propStage;
  let spikeBase = 0.05 + totalHeight * heightStage;
  piece.size = vec3f(spikeSize, 0.40 * propStage, spikeSize);
  piece.offset = vec3f((seed - 0.5) * 0.3, spikeBase, (fract(seed * 7.7) - 0.5) * 0.3);
  piece.visible = propStage;
  return piece;
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> ConstellationOutput {
  var output: ConstellationOutput;
  let cellIndex = instanceIndex / CONSTELLATION_PARTS;
  let part = instanceIndex % CONSTELLATION_PARTS;
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
  let raw = starData[cellIndex];
  let sType = u32(raw.x);
  let sDepth = raw.y;
  let conn = u32(raw.z);
  // starData.w packs starSize + floor(cellSeed * 1000) * 256: the low byte
  // range holds the celestial size while the upper bits hold the seed.
  let packedW = raw.w;
  let seedCell = floor(packedW / 256.0);
  let seed = seedCell / 1000.0;
  let starSize = packedW - seedCell * 256.0;
  let isDark = blockTypes[cellIndex] != 0u;

  let piece = createConstPiece(part, sType, sDepth, starSize, isDark, seed);
  if (piece.visible < 0.01) {
    output.position = vec4f(2.0, 2.0, 2.0, 1.0);
    return output;
  }

  let blockSize = uniforms.blockSize;
  let geom = constBoxGeometry(faceIndex, uv, piece.size * blockSize);
  let halfGrid = uniforms.gridSize * blockSize * 0.5;
  let center = vec3f(
    (posData.x + 0.5) * blockSize - halfGrid,
    0.0,
    (posData.y + 0.5) * blockSize - halfGrid
  );

  let worldPos = center + piece.offset * blockSize + geom[0];
  let normal = normalize(geom[1]);
  // Space: single harsh directional (star light), near-zero ambient
  let lightDir = normalize(vec3f(-0.42, 0.88, -0.22));
  let diffuse = max(dot(normal, lightDir), 0.0);
  // Stars are self-luminous – only the base plate and structural parts receive shading
  var shade = 0.08 + pow(diffuse, 0.60) * 0.92;
  if (normal.y > 0.45) { shade = min(1.4, shade * 1.18 + 0.18); }
  if (abs(normal.y) < 0.12 && normal.x < -0.5) { shade *= 0.50; }
  // Star/node cores: they glow – override shade to 1.0
  let isStellar = select(0.0, 1.0, part >= 1u);
  shade = mix(shade, 1.0, isStellar * 0.85); // still 15% shade so depth reads

  let collapsed = constStage(0.22, 0.65);
  output.position = constProject(worldPos);
  output.normal = normal;
  output.uv = uv;
  output.local = geom[0] / blockSize;
  output.shade = mix(shade, 1.0, collapsed);
  output.seed = seed;
  output.blockType = blockTypes[cellIndex];
  output.starType = sType;
  output.connections = conn;
  output.faceIndex = faceIndex;
  output.part = part;

  return output;
}

fn constellationQrColor(blockType: u32, noise: f32) -> vec3f {
  var color = uniforms.themePrimary.rgb;
  if (blockType == 3u) {
    color = uniforms.themeSecondary.rgb;
  } else if (blockType == 4u) {
    color = mix(uniforms.themeThird.rgb, uniforms.themeFourth.rgb, 0.55);
  } else if (blockType == 2u || blockType == 5u) {
    color = uniforms.themeFourth.rgb;
  }
  let luma = dot(color, vec3f(0.2126, 0.7152, 0.0722));
  // Bright stellar tones (gold, sirius blue) must resolve to dark ink at scan
  // lock while already-dark tones keep their hue identity.
  let contrast = mix(color, constInk(), smoothstep(0.35, 0.65, luma) * 0.85);
  return contrast * (0.94 + noise * 0.06);
}

fn constellationQrMask(uv: vec2f, neighborMask: u32) -> f32 {
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
fn fragmentMain(input: ConstellationOutput) -> @location(0) vec4f {
  let progress = uniforms.progress;
  let inkStage = smoothstep(0.58, 0.96, progress);
  let isDark = input.blockType != 0u;
  let paper = constPaper();
  let noise = constHash(input.position.xy + vec2f(uniforms.time * 0.13));

  // Celestial stellar colors directly from theme palette!
  let deepSpace = mix(uniforms.themeFifth.rgb * 0.6, vec3f(0.04, 0.05, 0.10), 0.5);
  let starGlow = uniforms.themePrimary.rgb;
  let nebulaViolet = uniforms.themeSecondary.rgb;
  let goldenPulsar = uniforms.themeFourth.rgb;

  var color = deepSpace;

  if (input.part == 0u) {
    // Deep space plate with cosmic dust and constellation connecting lines.
    // Each dark cell draws line segments toward its dark 4-neighbors, so the
    // visible constellation graph is the QR connectivity itself. Lines fade
    // as the reveal locks, leaving clean scan modules behind.
    let uv = input.uv;
    let dist = length(uv - 0.5);
    let glow = smoothstep(0.5, 0.0, dist);
    color = mix(deepSpace, nebulaViolet * 0.5, glow * 0.4);
    let lineHalfWidth = 0.045;
    var starLinks = 0.0;
    if ((input.connections & 1u) != 0u) {
      starLinks = max(starLinks, (1.0 - smoothstep(lineHalfWidth * 0.5, lineHalfWidth, abs(uv.x - 0.5))) * step(uv.y, 0.5));
    }
    if ((input.connections & 2u) != 0u) {
      starLinks = max(starLinks, (1.0 - smoothstep(lineHalfWidth * 0.5, lineHalfWidth, abs(uv.y - 0.5))) * step(0.5, uv.x));
    }
    if ((input.connections & 4u) != 0u) {
      starLinks = max(starLinks, (1.0 - smoothstep(lineHalfWidth * 0.5, lineHalfWidth, abs(uv.x - 0.5))) * step(0.5, uv.y));
    }
    if ((input.connections & 8u) != 0u) {
      starLinks = max(starLinks, (1.0 - smoothstep(lineHalfWidth * 0.5, lineHalfWidth, abs(uv.y - 0.5))) * step(uv.x, 0.5));
    }
    let lineColor = mix(nebulaViolet, goldenPulsar, 0.45) * 1.2;
    color = mix(color, lineColor, clamp(starLinks, 0.0, 1.0) * 0.8 * select(0.0, 1.0, isDark) * (1.0 - inkStage));
  } else if (input.part == 1u) {
    // 3D Stellar core
    let pulse = 0.85 + 0.15 * sin(uniforms.time * 4.0 + input.seed * 6.28);
    color = starGlow * pulse;
    if (input.starType == 5u) {
      color = mix(starGlow, goldenPulsar, 0.5) * 1.3;
    }
  } else if (input.part == 2u) {
    // Accretion disk
    color = nebulaViolet;
  } else {
    // Diffraction spike ray
    color = goldenPulsar * 1.5;
  }

  var shaded = color * clamp(input.shade, 0.0, 1.5);

  let qrNoise = constHash(input.uv + vec2f(f32(input.blockType) * 0.37));
  let mask = constellationQrMask(input.uv, input.connections);
  let isActive = select(0.0, 1.0, isDark);
  let qrColor = mix(paper, constellationQrColor(input.blockType, qrNoise), isActive * mask);

  var result = mix(shaded, qrColor, inkStage);
  result += (noise - 0.5) * 0.015 * (1.0 - inkStage);

  return vec4f(clamp(result, vec3f(0.0), vec3f(1.0)), 1.0);
}
`;
