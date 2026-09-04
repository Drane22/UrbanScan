const STAINED_GLASS_UNIFORMS_WGSL = /* wgsl */ `
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

const GLASS_PARTS: u32 = 4u;

fn glassInk() -> vec3f {
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

fn glassPaper() -> vec3f {
  return mix(uniforms.themeFifth.rgb, vec3f(0.98), 0.55);
}

fn glassStage(start: f32, end: f32) -> f32 {
  return smoothstep(start, end, uniforms.progress);
}

fn glassProject(localPos: vec3f) -> vec4f {
  let camera = glassStage(0.5, 1.0);
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

export const STAINED_GLASS_SHADER = /* wgsl */ `
${STAINED_GLASS_UNIFORMS_WGSL}

struct GlassOutput {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) uv: vec2f,
  @location(2) local: vec3f,
  @location(3) shade: f32,
  @location(4) seed: f32,
  @location(5) @interpolate(flat) blockType: u32,
  @location(6) @interpolate(flat) paneType: u32,
  @location(7) @interpolate(flat) colorIndex: u32,
  @location(8) @interpolate(flat) connections: u32,
  @location(9) @interpolate(flat) faceIndex: u32,
  @location(10) @interpolate(flat) part: u32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> blockTypes: array<u32>;
@group(0) @binding(2) var<storage, read> blockPositions: array<vec4f>;
@group(0) @binding(3) var<storage, read> blockHeights: array<f32>;
@group(0) @binding(4) var<storage, read> paneData: array<vec4f>;

fn glassHash(pos: vec2f) -> f32 {
  let scaled = fract(pos * vec2f(0.1031, 0.103));
  let folded = scaled + dot(scaled, scaled.yx + 19.19);
  return fract((folded.x + folded.y) * folded.x);
}

fn glassBoxGeometry(faceIndex: u32, uv: vec2f, size: vec3f) -> array<vec3f, 2> {
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

struct GlassPiece {
  size: vec3f,
  offset: vec3f,
  visible: f32,
}

fn createGlassPiece(part: u32, pType: u32, isDark: bool, seed: f32) -> GlassPiece {
  let propStage = 1.0 - glassStage(0.0, 0.18);
  let detailStage = 1.0 - glassStage(0.12, 0.35);
  let heightStage = 1.0 - glassStage(0.22, 0.65);
  let footStage = glassStage(0.55, 0.90);

  var piece: GlassPiece;
  piece.visible = 1.0;

  var footprint = mix(0.70 + seed * 0.22, 1.0, footStage);
  // Glass jewels should be taller - they're 3D beveled prisms catching light
  let totalHeight = mix(0.02, max(0.28 + seed * 0.55, 0.30) * heightStage, heightStage);

  if (part == 0u) {
    // Frosted clear glass base plate with lead outline
    let baseH = select(0.02, 0.05, isDark);
    piece.size = vec3f(footprint, baseH, footprint);
    piece.offset = vec3f(0.0, 0.0, 0.0);
    piece.visible = 1.0;
    return piece;
  }

  if (part == 1u) {
    // 3D Beveled jewel glass prism
    if (!isDark) {
      piece.visible = 0.0;
      piece.size = vec3f(0.0);
      piece.offset = vec3f(0.0);
      return piece;
    }
    // Beveled jewel prism - tapered, each jewel slightly different in shape
    let bodyW = footprint * select(0.80, select(0.70, 0.90, seed > 0.6), seed < 0.35);
    let bodyH = totalHeight * 0.75 * heightStage;
    piece.size = vec3f(bodyW, bodyH, bodyW);
    piece.offset = vec3f(0.0, 0.05, 0.0);
    piece.visible = heightStage;
    return piece;
  }

  if (part == 2u) {
    // Inner lead came filigree framework
    if (!isDark) {
      piece.visible = 0.0;
      piece.size = vec3f(0.0);
      piece.offset = vec3f(0.0);
      return piece;
    }
    let cameFootprint = footprint * select(0.65, 0.88, pType == 3u);
    let cameH = select(0.08, 0.16, pType == 3u) * detailStage;
    piece.size = vec3f(cameFootprint, cameH, cameFootprint);
    piece.offset = vec3f(0.0, 0.05 + totalHeight * 0.70 * heightStage, 0.0);
    piece.visible = detailStage;
    return piece;
  }

  // Part 3: Rose window central jewel medallion
  if (!isDark || (pType != 3u && pType != 4u)) {
    piece.visible = 0.0;
    piece.size = vec3f(0.0);
    piece.offset = vec3f(0.0);
    return piece;
  }
  let jewelSize = 0.28 * propStage;
  let jewelBase = 0.05 + totalHeight * heightStage;
  piece.size = vec3f(jewelSize, 0.35 * propStage, jewelSize);
  piece.offset = vec3f((seed - 0.5) * 0.3, jewelBase, (fract(seed * 7.7) - 0.5) * 0.3);
  piece.visible = propStage;
  return piece;
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> GlassOutput {
  var output: GlassOutput;
  let cellIndex = instanceIndex / GLASS_PARTS;
  let part = instanceIndex % GLASS_PARTS;
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
  let raw = paneData[cellIndex];
  let pType = u32(raw.x);
  let colorIdx = u32(raw.y);
  let conn = u32(raw.z);
  let seed = raw.w / 1000.0;
  let isDark = blockTypes[cellIndex] != 0u;

  let piece = createGlassPiece(part, pType, isDark, seed);
  if (piece.visible < 0.01) {
    output.position = vec4f(2.0, 2.0, 2.0, 1.0);
    return output;
  }

  let blockSize = uniforms.blockSize;
  let geom = glassBoxGeometry(faceIndex, uv, piece.size * blockSize);
  let halfGrid = uniforms.gridSize * blockSize * 0.5;
  let center = vec3f(
    (posData.x + 0.5) * blockSize - halfGrid,
    0.0,
    (posData.y + 0.5) * blockSize - halfGrid
  );

  let worldPos = center + piece.offset * blockSize + geom[0];
  let normal = normalize(geom[1]);
  // Glass: strong overhead light, minimal fill (glass transmits, doesn’t absorb)
  let lightDir = normalize(vec3f(-0.35, 0.92, -0.18));
  let diffuse = max(dot(normal, lightDir), 0.0);
  // Backlit fill (transmitted light from behind glass)
  let backDir = normalize(vec3f(0.35, 0.55, 0.75));
  let backFill = max(dot(normal, backDir), 0.0) * 0.25;
  // Moderate ambient - glass scatters light
  var shade = 0.15 + pow(diffuse, 0.50) * 0.85 + backFill;
  if (normal.y > 0.45) { shade = min(1.5, shade * 1.20 + 0.20); }
  if (abs(normal.y) < 0.12 && normal.x < -0.5) { shade *= 0.65; }
  if (abs(normal.y) < 0.12 && normal.z > 0.5)  { shade *= 0.78; }
  // Strong specular rim - glass catches light at edges
  let viewDir = normalize(vec3f(sin(0.79), 0.58, cos(0.79)));
  shade += pow(1.0 - abs(dot(normal, viewDir)), 3.0) * 0.35;

  let collapsed = glassStage(0.22, 0.65);
  output.position = glassProject(worldPos);
  output.normal = normal;
  output.uv = uv;
  output.local = geom[0] / blockSize;
  output.shade = mix(shade, 1.0, collapsed);
  output.seed = seed;
  output.blockType = blockTypes[cellIndex];
  output.paneType = pType;
  output.colorIndex = colorIdx;
  output.connections = conn;
  output.faceIndex = faceIndex;
  output.part = part;

  return output;
}

fn stainedGlassQrColor(colorIdx: u32, paneType: u32, noise: f32) -> vec3f {
  // Each glass family keeps its hue identity in the final QR: jewel panes
  // resolve to their seeded jewel tone and rose medallions to a warm
  // ceremonial ink. The contrast correction preserves scan-safe luminance
  // separation for every curated palette family.
  var color = uniforms.themePrimary.rgb;
  if (colorIdx % 3u == 1u) {
    color = mix(uniforms.themePrimary.rgb, uniforms.themeSecondary.rgb, 0.30);
  } else if (colorIdx % 3u == 2u) {
    color = mix(uniforms.themePrimary.rgb, uniforms.themeThird.rgb, 0.30);
  }
  if (paneType == 3u || paneType == 2u) {
    color = mix(color, uniforms.themeFourth.rgb, 0.25);
  } else if (paneType == 4u) {
    color = mix(color, uniforms.themeSecondary.rgb, 0.30);
  }
  let luma = dot(color, vec3f(0.2126, 0.7152, 0.0722));
  let contrast = mix(color, glassInk(), smoothstep(0.55, 0.85, luma) * 0.35);
  return contrast * (0.94 + noise * 0.06);
}

fn stainedGlassQrMask(uv: vec2f, neighborMask: u32) -> f32 {
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
fn fragmentMain(input: GlassOutput) -> @location(0) vec4f {
  let progress = uniforms.progress;
  let inkStage = smoothstep(0.58, 0.96, progress);
  let isDark = input.blockType != 0u;
  let paper = glassPaper();
  let noise = glassHash(input.position.xy + vec2f(uniforms.time * 0.13));

  // Cathedral jewel tones directly from theme colors!
  let leadCame = mix(uniforms.themePrimary.rgb * 0.4, vec3f(0.12, 0.14, 0.18), 0.5);
  let jewelGlass = select(
    uniforms.themePrimary.rgb,
    select(uniforms.themeSecondary.rgb, uniforms.themeFourth.rgb, input.colorIndex % 2u == 1u),
    input.colorIndex > 1u
  );
  let goldAccent = uniforms.themeFourth.rgb;

  var color = leadCame;

  if (input.part == 0u) {
    // Translucent glass plate with dark lead border came
    let uv = input.uv;
    let border = step(0.06, uv.x) * step(uv.x, 0.94) * step(0.06, uv.y) * step(uv.y, 0.94);
    color = mix(leadCame, paper, border);
  } else if (input.part == 1u) {
    // 3D Beveled jewel glass prism with internal cathedral refraction
    color = jewelGlass;
    let refraction = sin(input.uv.x * 12.0) * cos(input.uv.y * 12.0);
    color = mix(jewelGlass, jewelGlass * 1.3, max(refraction * 0.3, 0.0));
  } else if (input.part == 2u) {
    // Inner lead came filigree
    color = leadCame * 1.2;
  } else {
    // Rose window medallion gold jewel
    color = goldAccent * 1.5;
  }

  // Glass transmissive glow: jewels emit light from within
  if (input.part == 1u) {
    let transmit = 0.80 + 0.20 * sin(uniforms.time * 0.8 + input.seed * 5.0);
    color = mix(color, color * 2.2 * transmit, 0.25);
  }
  // Full shade - glass has high dynamic range
  var shaded = color * clamp(input.shade, 0.0, 1.6);

  let qrNoise = glassHash(input.uv + vec2f(f32(input.blockType) * 0.37));
  let mask = stainedGlassQrMask(input.uv, input.connections);
  let isActive = select(0.0, 1.0, isDark);
  let qrColor = mix(paper, stainedGlassQrColor(input.colorIndex, input.paneType, qrNoise), isActive * mask);

  var result = mix(shaded, qrColor, inkStage);
  result += (noise - 0.5) * 0.015 * (1.0 - inkStage);

  return vec4f(clamp(result, vec3f(0.0), vec3f(1.0)), 1.0);
}
`;
