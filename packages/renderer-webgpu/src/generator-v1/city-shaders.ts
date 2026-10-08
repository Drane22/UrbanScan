const CITY_UNIFORMS_WGSL = /* wgsl */ `
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

const CITY_PARTS: u32 = 4u;
const CITY_MAX_FLOORS: f32 = 28.0;
const CITY_FLOOR_HEIGHT: f32 = 0.42;

fn cityInk() -> vec3f {
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

fn cityPaper() -> vec3f {
  return mix(uniforms.themeFifth.rgb, vec3f(1.0), 0.68);
}

fn cityNight() -> f32 {
  return 1.0 - step(0.51, abs(uniforms.sceneEffect - 1.0));
}

fn citySnow() -> f32 {
  return 1.0 - step(0.51, abs(uniforms.sceneEffect - 2.0));
}

/**
 * Staged morph: the city dissolves from the sky down. Props vanish first, then roofs, then the
 * building heights sink into the plan, then the footprints square off and the camera tilts to
 * plan view while ink and paper take over.
 */
fn cityStage(start: f32, end: f32) -> f32 {
  return smoothstep(start, end, uniforms.progress);
}

fn cityProject(localPos: vec3f) -> vec4f {
  let camera = cityStage(0.5, 1.0);
  let angleY = mix(0.79, 0.0, camera);
  let angleX = mix(-0.56, -1.5708, camera);
  let cy = cos(angleY);
  let sy = sin(angleY);
  let cx = cos(angleX);
  let sx = sin(angleX);
  let rotatedX = localPos.x * cy - localPos.z * sy;
  let rotatedZ = localPos.x * sy + localPos.z * cy;
  let rotatedY = localPos.y * cx - rotatedZ * sx;
  let depth = localPos.y * sx + rotatedZ * cx;
  let portrait = select(1.0, 1.18, uniforms.aspectRatio < 0.8);
  let pulse = 1.0 + sin(camera * 3.14159265) * 0.025;
  let scale = mix(40.0, 46.4, camera) / uniforms.gridSize * portrait * pulse * uniforms.camera.x;
  let scaleX = scale / max(uniforms.aspectRatio, 1.0);
  let scaleY = scale / max(1.0 / uniforms.aspectRatio, 1.0);
  let yOffset = mix(-0.18, 0.08, camera) + uniforms.cameraBobY;
  return vec4f(rotatedX * scaleX + uniforms.cameraBobX, (rotatedY + yOffset) * scaleY, depth * 0.01 + 0.5, 1.0);
}
`;

export const CITY_SHADER = /* wgsl */ `
${CITY_UNIFORMS_WGSL}

struct CityOutput {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) uv: vec2f,
  @location(2) local: vec3f,
  @location(3) shade: f32,
  @location(4) occlusion: f32,
  @location(5) partHeight: f32,
  @location(6) partVisible: f32,
  @location(7) seed: f32,
  @location(8) floors: f32,
  @location(9) @interpolate(flat) blockType: u32,
  @location(10) @interpolate(flat) neighborMask: u32,
  @location(11) @interpolate(flat) faceIndex: u32,
  @location(12) @interpolate(flat) part: u32,
  @location(13) @interpolate(flat) flags: u32,
  @location(14) @interpolate(flat) archetype: u32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> blockTypes: array<u32>;
@group(0) @binding(2) var<storage, read> blockPositions: array<vec4f>;
@group(0) @binding(3) var<storage, read> blockHeights: array<f32>;
@group(0) @binding(4) var<storage, read> cityLots: array<vec4f>;

fn cityHash(position: vec2f) -> f32 {
  let scaled = fract(position * vec2f(0.1031, 0.103));
  let folded = scaled + dot(scaled, scaled.yx + 19.19);
  return fract((folded.x + folded.y) * folded.x);
}

fn cityFloorsAt(column: i32, row: i32) -> f32 {
  let size = i32(uniforms.gridSize);
  if (column < 0 || column >= size || row < 0 || row >= size) {
    return 0.0;
  }
  return cityLots[u32(row * size + column)].x;
}

/** Neighbor-height ambient occlusion: low buildings hemmed in by towers sit in shade. */
fn cityOcclusion(floors: f32, column: i32, row: i32) -> f32 {
  var tallest = 0.0;
  var sum = 0.0;
  for (var rowOffset: i32 = -1; rowOffset <= 1; rowOffset = rowOffset + 1) {
    for (var columnOffset: i32 = -1; columnOffset <= 1; columnOffset = columnOffset + 1) {
      if (columnOffset == 0 && rowOffset == 0) { continue; }
      let neighbor = cityFloorsAt(column + columnOffset, row + rowOffset);
      tallest = max(tallest, neighbor);
      sum += max(0.0, neighbor - floors);
    }
  }
  return clamp(sum / 48.0 + smoothstep(2.0, 14.0, tallest - floors) * 0.35, 0.0, 0.6);
}

fn cityShadow(floors: f32, column: i32, row: i32) -> f32 {
  let direction = normalize(vec2f(0.42, 0.76));
  var shadow = 1.0;
  for (var stepIndex: i32 = 1; stepIndex < 6; stepIndex = stepIndex + 1) {
    let offset = vec2f(f32(stepIndex)) * direction;
    let neighbor = cityFloorsAt(column + i32(round(offset.x)), row + i32(round(offset.y)));
    let occlusion = smoothstep(floors + 1.5, floors + 6.0, neighbor);
    shadow *= mix(1.0, 0.8, occlusion * (1.0 - f32(stepIndex) * 0.1));
  }
  return max(shadow, 0.7);
}

struct CityPart {
  size: vec3f,
  offset: vec3f,
  visible: f32,
}

/**
 * Multi-part building: 0 = body, 1 = upper setback section, 2 = roof cap, 3 = rooftop prop.
 * Every dimension is expressed in block units and already includes the morph collapse.
 */
fn cityPart(part: u32, lot: vec4f, blockType: u32, seed: f32) -> CityPart {
  let progress = uniforms.progress;
  let propStage = 1.0 - cityStage(0.0, 0.18);
  let roofStage = 1.0 - cityStage(0.12, 0.34);
  let heightStage = 1.0 - cityStage(0.22, 0.62);
  let footStage = cityStage(0.55, 0.9);
  let floors = lot.x;
  let archetype = u32(lot.y);
  let flags = u32(lot.w);
  let isDark = select(0.0, 1.0, blockType != 0u);
  let isPlaza = select(0.0, 1.0, (flags & 8u) != 0u);
  let hasAntenna = select(0.0, 1.0, (flags & 1u) != 0u);
  let hasEquipment = select(0.0, 1.0, (flags & 2u) != 0u);
  let hasLight = select(0.0, 1.0, (flags & 4u) != 0u);
  let hasCourtyard = select(0.0, 1.0, (flags & 16u) != 0u);

  let cityHeight = floors * CITY_FLOOR_HEIGHT;
  let flatDark = 0.11;
  let flatLight = 0.0;
  let flatHeight = select(flatLight, flatDark, blockType != 0u);
  let totalHeight = mix(flatHeight, max(cityHeight, 0.03), heightStage);

  var footprint = mix(0.72 + seed * 0.14, 0.98, isPlaza * 0.3);
  footprint = mix(footprint, 1.0, footStage);
  let inset = 1.0 - footprint;

  var result: CityPart;
  result.visible = 1.0;

  if (part == 0u) {
    var bodyHeight = totalHeight;
    if (archetype == 1u || archetype == 2u || archetype == 3u || archetype == 4u) {
      bodyHeight = mix(totalHeight, totalHeight * select(0.55, 0.36, archetype == 3u), heightStage);
    }
    result.size = vec3f(footprint, bodyHeight, footprint);
    result.offset = vec3f(0.0, 0.0, 0.0);
    result.visible = 1.0;
    // Light cells are a paper-thin plate: roads/plazas in the city, paper cells in the QR.
    if (blockType == 0u) {
      result.size.y = 0.05;
    }
    return result;
  }

  if (part == 1u) {
    var upperFootprint = footprint * select(0.7, 0.52, archetype == 2u || archetype == 4u);
    upperFootprint = mix(upperFootprint, footprint, footStage);
    let base = totalHeight * select(0.55, 0.36, archetype == 3u);
    let upperHeight = (totalHeight - base) * heightStage;
    let shiftX = select(0.0, (seed - 0.5) * inset * 0.5, archetype == 1u);
    result.size = vec3f(upperFootprint, upperHeight, upperFootprint);
    result.offset = vec3f(shiftX, base, -shiftX);
    result.visible = isDark * select(0.0, 1.0, archetype != 0u) * heightStage;
    return result;
  }

  if (part == 2u) {
    let capFootprint = footprint * select(0.82, 0.6, archetype == 2u || archetype == 4u);
    let capHeight = select(0.12, 0.22, archetype == 4u) * roofStage;
    result.size = vec3f(capFootprint, capHeight, capFootprint);
    result.offset = vec3f(0.0, totalHeight, 0.0);
    result.visible = isDark * roofStage * select(0.0, 1.0, floors >= 3.0 || archetype == 4u);
    return result;
  }

  // Rooftop prop: antenna mast, mechanical box, or a plaza streetlight.
  let propHeight = select(0.0, 1.6 + seed * 1.2, hasAntenna > 0.5)
    + select(0.0, 0.4, hasEquipment > 0.5 && hasAntenna < 0.5)
    + select(0.0, 0.9, hasLight > 0.5 && isDark < 0.5);
  let propWidth = select(0.32, 0.08, hasAntenna > 0.5 || hasLight > 0.5);
  let propBase = select(0.0, totalHeight + select(0.0, 0.12, floors >= 3.0), isDark > 0.5);
  result.size = vec3f(propWidth, propHeight * propStage, propWidth);
  result.offset = vec3f((seed - 0.5) * 0.3 * (1.0 - hasLight), propBase, (fract(seed * 7.7) - 0.5) * 0.3);
  result.visible = propStage * select(0.0, 1.0, propHeight > 0.01) * (1.0 - hasCourtyard * 0.5);
  return result;
}

fn cityGeometry(faceIndex: u32, uv: vec2f, size: vec3f) -> array<vec3f, 2> {
  let halfX = size.x * 0.5;
  let halfZ = size.z * 0.5;
  var position = vec3f(0.0);
  var normal = vec3f(0.0, 1.0, 0.0);
  if (faceIndex == 0u) {
    position = vec3f((uv.x - 0.5) * size.x, size.y, (uv.y - 0.5) * size.z);
  } else if (faceIndex == 1u) {
    position = vec3f((uv.x - 0.5) * size.x, 0.0, (0.5 - uv.y) * size.z);
    normal = vec3f(0.0, -1.0, 0.0);
  } else if (faceIndex == 2u) {
    position = vec3f((uv.x - 0.5) * size.x, uv.y * size.y, halfZ);
    normal = vec3f(0.0, 0.0, 1.0);
  } else if (faceIndex == 3u) {
    position = vec3f((0.5 - uv.x) * size.x, uv.y * size.y, -halfZ);
    normal = vec3f(0.0, 0.0, -1.0);
  } else if (faceIndex == 4u) {
    position = vec3f(halfX, uv.y * size.y, (uv.x - 0.5) * size.z);
    normal = vec3f(1.0, 0.0, 0.0);
  } else {
    position = vec3f(-halfX, uv.y * size.y, (0.5 - uv.x) * size.z);
    normal = vec3f(-1.0, 0.0, 0.0);
  }
  return array<vec3f, 2>(position, normal);
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32,
) -> CityOutput {
  var output: CityOutput;
  let lotIndex = instanceIndex / CITY_PARTS;
  let part = instanceIndex % CITY_PARTS;
  let faceIndex = vertexIndex / 6u;
  let quadIndex = vertexIndex % 6u;
  let quad = array<vec2f, 6>(
    vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(0.0, 1.0),
    vec2f(0.0, 1.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0),
  );
  let uv = quad[quadIndex];
  let positionData = blockPositions[lotIndex];
  let column = i32(positionData.x);
  let row = i32(positionData.y);
  let blockType = blockTypes[lotIndex];
  let lot = cityLots[lotIndex];
  let seed = lot.z;
  let piece = cityPart(part, lot, blockType, seed);
  let blockSize = uniforms.blockSize;
  let geometry = cityGeometry(faceIndex, uv, piece.size * blockSize);
  let halfGrid = uniforms.gridSize * blockSize * 0.5;
  let center = vec3f(
    (positionData.x + 0.5) * blockSize - halfGrid,
    0.0,
    (positionData.y + 0.5) * blockSize - halfGrid,
  );
  let worldPosition = center + piece.offset * blockSize + geometry[0];
  let normal = normalize(geometry[1]);
  let lightDirection = normalize(vec3f(-0.41, 0.86, -0.3));
  let diffuse = max(dot(normal, lightDirection), 0.0);
  var shade = 0.32 + pow(diffuse, 0.7) * 0.68;
  if (normal.y > 0.45) { shade = min(1.0, shade * 1.06 + 0.08); }
  if (abs(normal.y) < 0.12 && normal.x > 0.5) { shade *= 0.74; }
  if (abs(normal.y) < 0.12 && normal.z < -0.5) { shade *= 0.66; }
  let collapsed = cityStage(0.22, 0.62);
  output.position = cityProject(worldPosition);
  output.normal = normal;
  output.uv = uv;
  output.local = geometry[0] / blockSize;
  output.shade = mix(shade, 1.0, collapsed) * mix(cityShadow(lot.x, column, row), 1.0, collapsed);
  output.occlusion = cityOcclusion(lot.x, column, row) * (1.0 - collapsed);
  output.partHeight = piece.size.y;
  output.partVisible = piece.visible;
  output.seed = seed;
  output.floors = lot.x;
  output.blockType = blockType;
  output.neighborMask = u32(positionData.w);
  output.faceIndex = faceIndex;
  output.part = part;
  output.flags = u32(lot.w);
  output.archetype = u32(lot.y);
  return output;
}

fn cityQrColor(blockType: u32, noise: f32) -> vec3f {
  var color = uniforms.themePrimary.rgb;
  if (blockType == 3u) {
    color = uniforms.themeSecondary.rgb;
  } else if (blockType == 4u) {
    color = mix(uniforms.themeThird.rgb, uniforms.themeFourth.rgb, 0.58);
  } else if (blockType == 2u || blockType == 5u) {
    color = uniforms.themeFourth.rgb;
  }
  let luma = dot(color, vec3f(0.2126, 0.7152, 0.0722));
  let contrast = mix(color, cityInk(), smoothstep(0.76, 0.96, luma) * 0.2);
  return contrast * (0.92 + noise * 0.08);
}

fn cityQrMask(uv: vec2f, neighborMask: u32) -> f32 {
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

/** Facade material derived from the theme so every city matches its brand palette. */
fn cityFacade(archetype: u32, seed: f32, floors: f32) -> vec3f {
  let concrete = mix(uniforms.terrainRidge.rgb, vec3f(0.78, 0.77, 0.74), 0.55);
  let brick = mix(uniforms.terrainShore.rgb, vec3f(0.62, 0.42, 0.36), 0.4);
  let glass = mix(uniforms.terrainWater.rgb, uniforms.themeThird.rgb, 0.35);
  let stone = mix(uniforms.terrainSummit.rgb, vec3f(0.86), 0.5);
  var base = concrete;
  if (archetype == 2u || archetype == 4u) { base = glass; }
  else if (floors < 5.0) { base = mix(brick, concrete, step(0.55, seed)); }
  else if (archetype == 3u) { base = stone; }
  return mix(base, base * (0.88 + fract(seed * 13.7) * 0.2), 0.6);
}

fn cityWindows(local: vec3f, normal: vec3f, flags: u32, seed: f32, floors: f32, night: f32) -> f32 {
  if (abs(normal.y) > 0.5) { return 0.0; }
  let horizontal = select(local.x, local.z, abs(normal.x) > 0.5);
  let floorCoord = local.y / CITY_FLOOR_HEIGHT;
  let ribbon = (flags & 64u) != 0u;
  let strip = (flags & 128u) != 0u;
  let columns = select(3.0, 5.0, strip);
  let cellX = fract(horizontal * columns + 0.5);
  let cellY = fract(floorCoord);
  let padX = select(0.22, 0.08, ribbon);
  let padY = select(0.3, 0.42, strip);
  let inX = step(padX, cellX) * step(cellX, 1.0 - padX);
  let inY = step(padY, cellY) * step(cellY, 1.0 - padY);
  let window = inX * inY * step(0.5, floorCoord) * step(floorCoord, floors - 0.15);
  let id = floor(horizontal * columns) + floor(floorCoord) * 17.0 + seed * 91.0;
  let lit = step(0.35 + night * -0.25, cityHash(vec2f(id, seed * 3.1)));
  return window * mix(0.35, 1.0, lit * night + (1.0 - night) * 0.5);
}

@fragment
fn fragmentMain(input: CityOutput) -> @location(0) vec4f {
  if (input.partVisible < 0.02) { discard; }
  let progress = uniforms.progress;
  let inkStage = smoothstep(0.62, 0.98, progress);
  let night = cityNight();
  let snow = citySnow();
  let paper = cityPaper();
  let noise = cityHash(input.position.xy + vec2f(uniforms.time * 0.13));

  var facade = cityFacade(input.archetype, input.seed, input.floors);
  if (input.part == 3u) {
    facade = mix(cityInk(), vec3f(0.55), 0.4);
  }
  if (input.part == 2u) {
    facade = mix(facade, cityInk(), 0.35);
  }
  if (input.blockType == 0u && input.part == 0u) {
    // Roads and plazas: asphalt with a faint lane line, plaza gets paving tone.
    let plaza = (input.flags & 8u) != 0u;
    let asphalt = mix(cityInk(), vec3f(0.45), 0.55);
    let paving = mix(paper, uniforms.terrainMeadow.rgb, 0.2);
    facade = select(asphalt, paving, plaza);
    let lane = step(0.47, input.uv.x) * step(input.uv.x, 0.53) * select(1.0, 0.0, plaza);
    facade = mix(facade, vec3f(0.85), lane * 0.5 * (1.0 - night * 0.5));
  }

  var color = facade * mix(0.9, 1.1, input.shade);
  color *= 1.0 - input.occlusion * 0.55;
  let contact = smoothstep(0.0, 0.5, input.local.y);
  color *= mix(0.78, 1.0, contact);

  // Night: desaturate the facade, add lit windows and a warm ground glow near street level.
  color = mix(color, color * vec3f(0.42, 0.46, 0.58), night * 0.7);
  let windows = cityWindows(input.local, input.normal, input.flags, input.seed, input.floors, night)
    * select(0.0, 1.0, input.part <= 1u && input.blockType != 0u);
  let windowColor = mix(vec3f(0.12, 0.14, 0.18), vec3f(1.0, 0.86, 0.6), night);
  color = mix(color, windowColor, windows * mix(0.55, 0.95, night));
  // Snow: dust roofs and plazas.
  let topFace = select(0.0, 1.0, input.faceIndex == 0u);
  color = mix(color, paper, snow * topFace * 0.8 * (1.0 - inkStage));

  let qrNoise = cityHash(input.uv + vec2f(input.floors * 0.37));
  let qrMask = cityQrMask(input.uv, input.neighborMask);
  let isActive = select(0.0, 1.0, input.blockType != 0u);
  var qrColor = mix(paper, cityQrColor(input.blockType, qrNoise), isActive * qrMask);
  if (input.faceIndex != 0u) {
    qrColor = mix(qrColor, cityInk(), 0.18);
  }
  var result = mix(color, qrColor, inkStage);
  result += (noise - 0.5) * 0.02 * (1.0 - inkStage);
  return vec4f(clamp(result, vec3f(0.0), vec3f(1.0)), 1.0);
}
`;
