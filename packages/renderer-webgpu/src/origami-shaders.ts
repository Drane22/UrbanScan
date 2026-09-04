const ORIGAMI_UNIFORMS_WGSL = /* wgsl */ `
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

const ORIGAMI_PARTS: u32 = 4u;

fn oriInk() -> vec3f {
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

fn oriPaper() -> vec3f {
  return mix(uniforms.themeFifth.rgb, vec3f(0.985), 0.55);
}

fn oriStage(start: f32, end: f32) -> f32 {
  return smoothstep(start, end, uniforms.progress);
}

fn oriQrContrast(color: vec3f) -> vec3f {
  let luma = dot(color, vec3f(0.2126, 0.7152, 0.0722));
  // Bright fold tones (gilded gold leaf) must resolve to dark ink at scan
  // lock while sumi, vermilion, and sage tones keep their hue identity.
  let correction = smoothstep(0.38, 0.68, luma) * 0.80;
  return mix(color, oriInk(), correction);
}

fn oriProject(localPos: vec3f) -> vec4f {
  let camera = oriStage(0.50, 1.00);
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

export const ORIGAMI_SHADER = /* wgsl */ `
${ORIGAMI_UNIFORMS_WGSL}

struct OrigamiOutput {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) uv: vec2f,
  @location(2) local: vec3f,
  @location(3) shade: f32,
  @location(4) seed: f32,
  @location(5) castShadow: f32,
  @location(6) heightFraction: f32,
  @location(7) @interpolate(flat) blockType: u32,
  @location(8) @interpolate(flat) foldType: u32,
  @location(9) @interpolate(flat) connections: u32,
  @location(10) @interpolate(flat) faceIndex: u32,
  @location(11) @interpolate(flat) part: u32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> blockTypes: array<u32>;
@group(0) @binding(2) var<storage, read> blockPositions: array<vec4f>;
@group(0) @binding(3) var<storage, read> blockHeights: array<f32>;
@group(0) @binding(4) var<storage, read> foldData: array<vec4f>;

fn origamiHash(pos: vec2f) -> f32 {
  let scaled = fract(pos * vec2f(0.1031, 0.103));
  let folded = scaled + dot(scaled, scaled.yx + 19.19);
  return fract((folded.x + folded.y) * folded.x);
}

fn origamiBoxGeometry(faceIndex: u32, uv: vec2f, size: vec3f) -> array<vec3f, 2> {
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

struct OrigamiPiece {
  size: vec3f,
  offset: vec3f,
  visible: f32,
}

fn origamiHeightAt(column: i32, row: i32) -> f32 {
  let size = i32(uniforms.gridSize);
  if (column < 0 || column >= size || row < 0 || row >= size) { return 0.0; }
  let idx = u32(row * size + column);
  if (idx >= arrayLength(&foldData)) { return 0.0; }
  return foldData[idx].y;
}

fn origamiCreaseShadow(height: f32, column: i32, row: i32) -> f32 {
  let direction = normalize(vec2f(0.48, 0.82));
  var shadow = 1.0;
  for (var s: i32 = 1; s < 5; s = s + 1) {
    let offset = vec2f(f32(s)) * direction;
    let neighbor = origamiHeightAt(column + i32(round(offset.x)), row + i32(round(offset.y)));
    let occlusion = smoothstep(height + 0.06, height + 0.45, neighbor);
    shadow *= mix(1.0, 0.72, occlusion * (1.0 - f32(s) * 0.16));
  }
  return max(shadow, 0.65);
}

fn createOrigamiPiece(
  part: u32,
  fType: u32,
  fElevation: f32,
  fAngle: f32,
  isDark: bool,
  seed: f32,
  conn: u32
) -> OrigamiPiece {
  // Reversible 6-stage reveal choreography:
  // 0.00-0.18: Perched cranes and delicate paper flaps unfold and retract
  let craneStage = 1.0 - oriStage(0.00, 0.18);
  // 0.12-0.35: Overlapping rosette petals and secondary crease flaps flatten flush
  let flapStage = 1.0 - oriStage(0.12, 0.35);
  // 0.22-0.65: Mountain and valley facet elevations descend toward the base sheet
  let elevationStage = 1.0 - oriStage(0.22, 0.65);
  // 0.55-0.90: Angled facet footprints align and expand to full-bleed grid modules
  let footStage = oriStage(0.55, 0.90);

  var piece: OrigamiPiece;
  piece.visible = 1.0;

  var footprint = mix(0.68 + seed * 0.22, 1.0, footStage);

  // Elevation scale across fold types:
  // 5: origamiRosette (outer collar 5.8, inner petals 8.0, crest 11.0)
  // 4: paperCraneSculpture (sculptural crane figure)
  // 3: miuraTessellation (dense herringbone tessellation)
  // 1: mountainFold (ridged peak crease)
  // 7: pleatCorner (creased corner tab)
  // 6: foldedFlap (triangular paper flap)
  // 2: valleyFold (depressed valley pleat)
  var heightScale = 0.26;
  if (fType == 5u) {
    heightScale = 0.32;
  } else if (fType == 4u) {
    heightScale = 0.28;
  } else if (fType == 3u) {
    heightScale = 0.25;
  } else if (fType == 1u) {
    heightScale = 0.26;
  } else if (fType == 7u) {
    heightScale = 0.24;
  } else if (fType == 6u) {
    heightScale = 0.22;
  } else if (fType == 2u) {
    heightScale = 0.18;
  }

  let totalHeight = mix(0.02, max(fElevation * heightScale, 0.12), elevationStage);

  if (part == 0u) {
    // Part 0: Base washi paper backing sheet – full 1.0 module coverage, zero gaps
    let baseH = select(0.025, 0.05, isDark);
    piece.size = vec3f(1.0, baseH, 1.0);
    piece.offset = vec3f(0.0, 0.0, 0.0);
    piece.visible = 1.0;
    return piece;
  }

  if (part == 1u) {
    // Part 1: Primary folded paper facet massing with crisp diagonal mountain/valley creases
    if (!isDark) {
      piece.visible = 0.0;
      piece.size = vec3f(0.0);
      piece.offset = vec3f(0.0);
      return piece;
    }
    var bodyW = footprint * 0.80;
    var bodyD = footprint * 0.80;
    let creaseOffset = vec3f(
      sin(fAngle) * 0.07 * (1.0 - footStage),
      0.05,
      cos(fAngle) * 0.07 * (1.0 - footStage)
    );

    if (fType == 5u) {
      // Rosette collar & dais
      bodyW = footprint * 0.90;
      bodyD = footprint * 0.90;
    } else if (fType == 3u) {
      // Miura herringbone tessellation
      bodyW = footprint * 0.84;
      bodyD = footprint * 0.84;
    } else if (fType == 1u) {
      // Mountain fold peak
      bodyW = footprint * 0.80;
      bodyD = footprint * 0.80;
    } else if (fType == 2u) {
      // Valley fold crease
      bodyW = footprint * 0.68;
      bodyD = footprint * 0.68;
    } else if (fType == 4u) {
      // Paper crane sculpture
      bodyW = footprint * 0.74;
      bodyD = footprint * 0.74;
    } else if (fType == 6u) {
      // Triangular folded flap
      bodyW = footprint * 0.76;
      bodyD = footprint * 0.76;
    } else if (fType == 7u) {
      // Pleat corner tab
      bodyW = footprint * 0.78;
      bodyD = footprint * 0.78;
    }

    let bodyH = totalHeight * 0.75 * elevationStage;
    piece.size = vec3f(bodyW, bodyH, bodyD);
    piece.offset = creaseOffset;
    piece.visible = elevationStage;
    return piece;
  }

  if (part == 2u) {
    // Part 2: Layered folding flaps, folded crane wings, and overlapping rosette petals
    if (!isDark) {
      piece.visible = 0.0;
      piece.size = vec3f(0.0);
      piece.offset = vec3f(0.0);
      return piece;
    }
    var flapW = footprint * 0.75;
    var flapD = footprint * 0.75;
    var flapH = 0.16 * flapStage;
    var flapOffset = vec3f(0.0, 0.05 + totalHeight * 0.74 * elevationStage, 0.0);

    if (fType == 5u) {
      // Overlapping rosette petals
      flapW = footprint * 0.96;
      flapD = footprint * 0.96;
      flapH = 0.22 * flapStage;
    } else if (fType == 4u) {
      // Folded crane wings
      flapW = footprint * 1.12;
      flapD = footprint * 0.62;
      flapH = 0.20 * flapStage;
    } else if (fType == 3u) {
      // Miura reverse facet pleat
      flapW = footprint * 0.82;
      flapD = footprint * 0.82;
      flapH = 0.18 * flapStage;
      flapOffset = vec3f(cos(fAngle) * 0.06, 0.05 + totalHeight * 0.70 * elevationStage, sin(fAngle) * 0.06);
    } else if (fType == 6u) {
      // Folded flap
      flapW = footprint * 0.84;
      flapD = footprint * 0.84;
      flapH = 0.16 * flapStage;
      flapOffset = vec3f((seed - 0.5) * 0.10, 0.05 + totalHeight * 0.65 * elevationStage, (fract(seed * 5.7) - 0.5) * 0.10);
    } else if (fType == 7u) {
      // Pleat corner tab
      flapW = footprint * 0.80;
      flapD = footprint * 0.80;
      flapH = 0.17 * flapStage;
    }

    piece.size = vec3f(flapW, flapH, flapD);
    piece.offset = flapOffset;
    piece.visible = flapStage;
    return piece;
  }

  // Part 3: Animated paper fluttering in ambient draft (gentle time-based wave displacement and crisp edge highlights)
  // 0.00-0.18: Perched cranes and delicate paper flaps unfold and retract
  if (!isDark) {
    piece.visible = 0.0;
    piece.size = vec3f(0.0);
    piece.offset = vec3f(0.0);
    return piece;
  }

  let draftWave = sin(uniforms.time * 4.2 + seed * 9.5 + fAngle * 2.0);
  let draftSway = cos(uniforms.time * 3.0 + seed * 7.1) * 0.05 * craneStage;
  let draftLift = (draftWave * 0.5 + 0.5) * 0.07 * craneStage;

  var tipW = 0.22 * craneStage;
  var tipH = 0.28 * craneStage;
  var tipD = 0.22 * craneStage;
  var tipOffset = vec3f(draftSway * 0.5, 0.05 + totalHeight * 0.68 * elevationStage + 0.14 * flapStage + draftLift, draftSway * 0.5);

  if (fType == 4u) {
    // Perched crane neck & sculpted beak
    tipW = 0.28 * craneStage;
    tipH = 0.52 * craneStage;
    tipD = 0.28 * craneStage;
    tipOffset = vec3f(draftSway, 0.05 + totalHeight * 0.75 * elevationStage + 0.18 * flapStage + draftLift, draftSway * 0.5);
  } else if (fType == 5u) {
    // Rosette crest finial
    tipW = 0.32 * craneStage;
    tipH = 0.44 * craneStage;
    tipD = 0.32 * craneStage;
    tipOffset = vec3f(0.0, 0.05 + totalHeight * 0.75 * elevationStage + 0.20 * flapStage + draftLift * 0.4, 0.0);
  } else if (fType == 6u || fType == 7u || fType == 3u) {
    // Fluttering flap tip / corner tab
    tipW = 0.24 * craneStage;
    tipH = 0.30 * craneStage;
    tipD = 0.24 * craneStage;
    tipOffset = vec3f(draftSway * 0.8, 0.05 + totalHeight * 0.70 * elevationStage + 0.15 * flapStage + draftLift, draftSway * 0.8);
  }

  piece.size = vec3f(tipW, tipH, tipD);
  piece.offset = tipOffset;
  piece.visible = craneStage;
  return piece;
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> OrigamiOutput {
  var output: OrigamiOutput;
  let cellIndex = instanceIndex / ORIGAMI_PARTS;
  let part = instanceIndex % ORIGAMI_PARTS;
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
  let raw = foldData[cellIndex];
  let fType = u32(raw.x);
  let fElevation = raw.y;
  let fAngle = raw.z;
  let packed = u32(raw.w);
  let seed = f32(packed % 10000u) / 1000.0;
  let conn = packed / 10000u;
  let isDark = blockTypes[cellIndex] != 0u;

  let piece = createOrigamiPiece(part, fType, fElevation, fAngle, isDark, seed, conn);
  if (piece.visible < 0.01) {
    output.position = vec4f(2.0, 2.0, 2.0, 1.0);
    return output;
  }

  let blockSize = uniforms.blockSize;
  let geom = origamiBoxGeometry(faceIndex, uv, piece.size * blockSize);
  let halfGrid = uniforms.gridSize * blockSize * 0.5;
  let center = vec3f(
    (posData.x + 0.5) * blockSize - halfGrid,
    0.0,
    (posData.y + 0.5) * blockSize - halfGrid
  );

  var localVert = geom[0];
  let footStage = oriStage(0.55, 0.90);
  let foldBlend = (1.0 - footStage);
  let halfB = blockSize * 0.5;

  // 4-way contiguous crease bridging
  if (part == 1u && isDark) {
    if ((conn & 1u) != 0u && uv.y < 0.35) { localVert.z = mix(localVert.z, -halfB, 0.88 * foldBlend); }
    if ((conn & 4u) != 0u && uv.y > 0.65) { localVert.z = mix(localVert.z, halfB, 0.88 * foldBlend); }
    if ((conn & 8u) != 0u && uv.x < 0.35) { localVert.x = mix(localVert.x, -halfB, 0.88 * foldBlend); }
    if ((conn & 2u) != 0u && uv.x > 0.65) { localVert.x = mix(localVert.x, halfB, 0.88 * foldBlend); }

    // Diagonal paper facet crease deformation
    let creaseSkew = sin(fAngle) * (uv.x - 0.5) * 0.25 * foldBlend;
    localVert.y += (1.0 - length(uv - 0.5) * 1.4) * piece.size.y * blockSize * 0.35 * foldBlend;
    localVert.x += creaseSkew * blockSize;
  }

  let worldPos = center + piece.offset * blockSize + localVert;
  let normal = normalize(geom[1]);

  // Clean studio paper lighting: sharp directional single source, low ambient
  // Fold creases create crisp mountain/valley contrast
  let lightDir = normalize(vec3f(-0.48, 0.85, -0.25));
  let diffuse = max(dot(normal, lightDir), 0.0);
  let fillDir = normalize(vec3f(0.35, 0.45, 0.60));
  let fill = max(dot(normal, fillDir), 0.0) * 0.10;
  var shade = 0.14 + pow(diffuse, 0.55) * 0.86 + fill;
  if (normal.y > 0.45) { shade = min(1.45, shade * 1.20 + 0.18); }
  // Hard shadow on recessed crease faces
  if (abs(normal.y) < 0.15 && normal.x < -0.4) { shade *= 0.48; }
  if (abs(normal.y) < 0.15 && normal.z > 0.4)  { shade *= 0.64; }
  // Rim highlights on crisp folded edges
  let viewDir = normalize(vec3f(sin(0.785), 0.60, cos(0.785)));
  let rim = pow(1.0 - abs(dot(normal, viewDir)), 3.5) * 0.22;
  shade += rim;

  let collapsed = oriStage(0.22, 0.65);

  let colI = i32(round(posData.x));
  let rowI = i32(round(posData.y));
  let castShadow = origamiCreaseShadow(fElevation, colI, rowI);

  output.position = oriProject(worldPos);
  output.normal = normal;
  output.uv = uv;
  output.local = geom[0] / blockSize;
  output.shade = mix(shade, 1.0, collapsed);
  output.seed = seed;
  output.castShadow = mix(castShadow, 1.0, collapsed);
  output.heightFraction = clamp(worldPos.y / max(blockSize * 8.0, 0.01), 0.0, 1.0);
  output.blockType = blockTypes[cellIndex];
  output.foldType = fType;
  output.connections = conn;
  output.faceIndex = faceIndex;
  output.part = part;

  return output;
}

fn origamiQrMask(uv: vec2f, neighborMask: u32) -> f32 {
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
fn fragmentMain(input: OrigamiOutput) -> @location(0) vec4f {
  let progress = uniforms.progress;
  // 0.62-0.98: Paper grain and cast crease shadows cross-fade into high-contrast scannable QR ink and paper with 4-neighbor corner rounding (radius 0.46) and oriQrContrast() correction.
  let inkStage = smoothstep(0.62, 0.98, progress);
  let isDark = input.blockType != 0u;
  let paper = oriPaper();
  let noise = origamiHash(input.position.xy + vec2f(uniforms.time * 0.12));

  // Washi paper color palette
  // themePrimary: Deep sumi / aizome ink
  // themeSecondary: Torii vermilion / accent fold
  // themeThird: Crease fold shadow tone / sage fold
  // themeFourth: Gilded gold leaf accent / crest
  // themeFifth: Bleached washi paper substrate
  let primaryInk = uniforms.themePrimary.rgb;
  let vermilionAccent = uniforms.themeSecondary.rgb;
  let foldShadow = uniforms.themeThird.rgb;
  let goldLeaf = uniforms.themeFourth.rgb;
  let washiBase = mix(uniforms.themeFifth.rgb, vec3f(0.97, 0.96, 0.93), 0.60);

  var color = washiBase;

  if (input.part == 0u) {
    // Part 0: Base washi paper backing sheet with fibrous grain texture
    let fiberCoord = input.uv * 16.0 + vec2f(input.seed * 3.7);
    let fiber1 = origamiHash(fiberCoord);
    let fiber2 = origamiHash(fiberCoord * 2.5 + vec2f(11.3, 5.7));
    let fibrousGrain = (fiber1 * 0.65 + fiber2 * 0.35 - 0.5) * 0.07;
    let diagonalCrease = smoothstep(0.035, 0.0, abs(input.uv.x - input.uv.y));
    color = mix(washiBase, washiBase * 0.84, diagonalCrease * 0.40) + vec3f(fibrousGrain);
  } else if (input.part == 1u) {
    // Part 1: Primary folded paper facet massing with crisp diagonal mountain/valley creases
    let shadedWashi = mix(washiBase * 0.88, washiBase, f32(input.foldType) / 8.0);
    color = shadedWashi;
    if (input.foldType == 5u) {
      // Rosette / collar: vermilion blush on outer collar / petal dais
      color = mix(shadedWashi, mix(washiBase, vermilionAccent, 0.35), 0.60);
    } else if (input.foldType == 4u) {
      // Paper crane sculpture: pristine white washi with subtle gold leaf reflection
      color = mix(washiBase * 0.95, goldLeaf, 0.15);
    } else if (input.foldType == 3u) {
      // Miura tessellation: alternating herringbone facet shading
      let facetParity = ((u32(input.local.x * 3.0 + 10.0) + u32(input.local.z * 3.0 + 10.0)) % 2u) == 0u;
      color = mix(shadedWashi * select(0.90, 1.06, facetParity), foldShadow, 0.18);
    } else if (input.foldType == 1u) {
      // Mountain fold: elevated crisp peak highlight
      color = mix(shadedWashi, vec3f(0.98), 0.20);
    } else if (input.foldType == 2u) {
      // Valley fold: depressed crease channel / deeper shadow
      color = mix(shadedWashi, foldShadow, 0.30);
    } else if (input.foldType == 6u) {
      // Folded flap: subtle accent tint
      color = mix(shadedWashi, vermilionAccent, 0.18);
    } else if (input.foldType == 7u) {
      // Pleat corner: diagonal crease shadow
      color = mix(shadedWashi, foldShadow, 0.22);
    }
  } else if (input.part == 2u) {
    // Part 2: Layered folding flaps, folded crane wings, and overlapping rosette petals
    color = mix(washiBase, vec3f(0.98, 0.96, 0.94), 0.35);
    if (input.foldType == 5u) {
      // Overlapping rosette petals: vermilion seal accent
      color = mix(color, vermilionAccent, 0.28);
    } else if (input.foldType == 4u) {
      // Folded crane wings: gold leaf lined edge
      color = mix(color, goldLeaf, 0.30);
    } else if (input.foldType == 3u) {
      // Miura reverse pleats
      color = mix(color, foldShadow, 0.20);
    } else if (input.foldType == 6u) {
      // Flap underside
      color = mix(color, vermilionAccent, 0.22);
    }
  } else {
    // Part 3: Animated paper fluttering in ambient draft with crisp edge highlights
    let edgeHighlight = pow(1.0 - abs(dot(input.normal, vec3f(0.0, 1.0, 0.0))), 2.5) * 0.30;
    if (input.foldType == 5u) {
      // Rosette crest: radiant gold leaf crest
      color = mix(goldLeaf, vec3f(0.95, 0.85, 0.35), noise * 0.3) * 1.35 + vec3f(edgeHighlight);
    } else if (input.foldType == 4u) {
      // Perched crane beak / crown: gold foil tip
      color = mix(goldLeaf, vec3f(0.98, 0.90, 0.40), noise * 0.25) * 1.40 + vec3f(edgeHighlight);
    } else {
      // Fluttering flap edge / crisp fold highlight
      color = mix(washiBase * 1.05, goldLeaf, 0.25) + vec3f(edgeHighlight);
    }
  }

  // Contact shadow at fold base
  let contact = 1.0 - smoothstep(0.0, 0.22, input.heightFraction) * 0.30 * (1.0 - uniforms.progress);
  color *= contact;

  // Directional shade and cast crease shadow
  var shaded = color * clamp(input.shade, 0.0, 1.45);
  shaded *= input.castShadow;

  // 0.62-0.98: Paper grain and cast crease shadows cross-fade into high-contrast scannable QR ink and paper with 4-neighbor corner rounding (radius 0.46) and oriQrContrast() correction.
  let qrNoise = origamiHash(input.uv + vec2f(f32(input.blockType) * 0.37));
  let mask = origamiQrMask(input.uv, input.connections);
  let isActive = select(0.0, 1.0, isDark);

  var qrInkBase = primaryInk;
  if (input.foldType == 5u) {
    qrInkBase = mix(primaryInk, vermilionAccent, 0.22);
  } else if (input.foldType == 4u) {
    qrInkBase = mix(primaryInk, goldLeaf, 0.25);
  } else if (input.foldType == 3u) {
    qrInkBase = mix(primaryInk, foldShadow, 0.18);
  }

  let qrInk = oriQrContrast(qrInkBase) * (0.95 + qrNoise * 0.05);
  let qrColor = mix(paper, qrInk, isActive * mask);

  var result = mix(shaded, qrColor, inkStage);
  result += (noise - 0.5) * 0.012 * (1.0 - inkStage);

  return vec4f(clamp(result, vec3f(0.0), vec3f(1.0)), 1.0);
}
`;
