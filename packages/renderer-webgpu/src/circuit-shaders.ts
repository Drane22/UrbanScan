const CIRCUIT_COMMON = /* wgsl */ `
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

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> blockTypes: array<u32>;
@group(0) @binding(2) var<storage, read> blockPositions: array<vec4f>;
@group(0) @binding(3) var<storage, read> componentData: array<vec4f>;
@group(0) @binding(4) var<storage, read> traceData: array<vec4f>;
@group(0) @binding(5) var materialAtlas: texture_2d<f32>;
@group(0) @binding(6) var materialSampler: sampler;

fn pcbBase() -> vec3f {
  return mix(uniforms.themePrimary.rgb, vec3f(0.04, 0.08, 0.06), 0.25);
}

fn pcbEdge() -> vec3f {
  return mix(uniforms.themePrimary.rgb, vec3f(0.12, 0.16, 0.14), 0.35);
}

fn goldPad() -> vec3f {
  return mix(uniforms.themeSecondary.rgb, vec3f(0.98, 0.82, 0.28), 0.55);
}

fn traceMetal() -> vec3f {
  return mix(uniforms.themeSecondary.rgb, uniforms.themeThird.rgb, 0.28);
}

fn traceBright() -> vec3f {
  return mix(uniforms.themeSecondary.rgb, uniforms.themeFourth.rgb, 0.68);
}

fn ceramicMaterial() -> vec3f {
  return mix(uniforms.themeFifth.rgb, vec3f(0.92, 0.91, 0.86), 0.22);
}

fn plasticMaterial() -> vec3f {
  return mix(uniforms.themePrimary.rgb, vec3f(0.08, 0.09, 0.10), 0.85);
}

fn hardwareMetal() -> vec3f {
  return mix(uniforms.themeThird.rgb, vec3f(0.72, 0.75, 0.78), 0.55);
}

fn solderMaterial() -> vec3f {
  return mix(uniforms.themeFifth.rgb, vec3f(0.82, 0.85, 0.88), 0.72);
}

fn signalColor() -> vec3f {
  return mix(uniforms.themeSecondary.rgb, uniforms.themeFourth.rgb, 0.82);
}

fn circuitQrSubstrate() -> vec3f {
  return mix(uniforms.themeFifth.rgb, vec3f(0.96, 0.95, 0.91), 0.28);
}

fn circuitQrInk() -> vec3f {
  let paletteInk = mix(uniforms.themePrimary.rgb, uniforms.themeThird.rgb, 0.10);
  return mix(paletteInk, vec3f(0.018, 0.026, 0.024), 0.48);
}

fn circuitFinderInk(role: u32) -> vec3f {
  let base = circuitQrInk();
  let plated = mix(base, goldPad(), 0.10);
  return select(plated, base * 0.72, role == 2u);
}

fn finderRole(column: f32, row: f32) -> u32 {
  let farOrigin = uniforms.gridSize - 7.0;
  var local = vec2f(-1.0);
  if (column < 7.0 && row < 7.0) {
    local = vec2f(column, row);
  } else if (column >= farOrigin && row < 7.0) {
    local = vec2f(column - farOrigin, row);
  } else if (column < 7.0 && row >= farOrigin) {
    local = vec2f(column, row - farOrigin);
  }
  if (local.x < 0.0) { return 0u; }
  let ring = min(min(local.x, local.y), min(6.0 - local.x, 6.0 - local.y));
  if (ring < 0.5) { return 1u; }
  if (ring > 1.5) { return 2u; }
  return 0u;
}

fn stage(start: f32, end: f32) -> f32 {
  return smoothstep(start, end, uniforms.progress);
}

// Seeded per-object delay so dissolution sweeps across the board instead of
// popping globally. Radial term sinks the center first and the corner finder
// processors last, handing their positions off to the rising QR finder pillars.
fn circuitDelay(column: f32, row: f32, seed: f32) -> f32 {
  let center = uniforms.gridSize * 0.5;
  let radial = distance(vec2f(column, row), vec2f(center, center)) / max(uniforms.gridSize * 0.71, 1.0);
  let jitter = fract(sin(seed * 91.7 + column * 17.3 + row * 31.1) * 43758.5);
  return clamp((1.0 - radial) * 0.16 + jitter * 0.12, 0.0, 0.28);
}

// Tree-contract camera: moves across the whole morph with a breathing pulse and
// idle/bounce bob instead of waiting for the second half to swing to top-down.
fn circuitProject(localPos: vec3f) -> vec4f {
  let cy = cos(mix(0.70, 0.0, uniforms.progress) + uniforms.cameraBobX);
  let sy = sin(mix(0.70, 0.0, uniforms.progress) + uniforms.cameraBobX);
  let cx = cos(mix(-0.55, -1.570796, uniforms.progress) + uniforms.cameraBobY);
  let sx = sin(mix(-0.55, -1.570796, uniforms.progress) + uniforms.cameraBobY);
  let rotX = localPos.x * cy - localPos.z * sy;
  let rotZ = localPos.x * sy + localPos.z * cy;
  let rotY = localPos.y * cx - rotZ * sx;
  let depth = localPos.y * sx + rotZ * cx;
  let portrait = select(1.0, 1.16, uniforms.aspectRatio < 0.8);
  let morphPulse = 1.0 + sin(uniforms.progress * 3.14159265) * 0.035;
  let scale = mix(40.5, 46.2, uniforms.progress) / uniforms.gridSize * portrait * morphPulse * uniforms.camera.x;
  let scaleX = scale / max(uniforms.aspectRatio, 1.0);
  let scaleY = scale / max(1.0 / uniforms.aspectRatio, 1.0);
  let yOffset = mix(-0.13, 0.07, uniforms.progress);
  let xOffset = mix(0.0, 0.015, uniforms.progress);
  return vec4f((rotX + xOffset) * scaleX, (rotY + yOffset) * scaleY, depth * 0.01 + 0.5, 1.0);
}

fn boardPoint(column: f32, row: f32, height: f32) -> vec3f {
  let halfGrid = uniforms.gridSize * uniforms.blockSize * 0.5;
  return vec3f(
    (column + 0.5) * uniforms.blockSize - halfGrid,
    height * uniforms.blockSize,
    (row + 0.5) * uniforms.blockSize - halfGrid
  );
}

fn boxGeometry(faceIndex: u32, uv: vec2f, size: vec3f) -> array<vec3f, 2> {
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

fn quadUv(index: u32) -> vec2f {
  let quad = array<vec2f, 6>(
    vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(0.0, 1.0),
    vec2f(0.0, 1.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0)
  );
  return quad[index % 6u];
}

fn atlasUv(tile: f32, uv: vec2f, repeat: f32) -> vec2f {
  let tileColumn = tile % 4.0;
  let tileRow = floor(tile / 4.0);
  return (vec2f(tileColumn, tileRow) + fract(uv * repeat)) * 0.25 + vec2f(0.002);
}

fn acesToneMap(color: vec3f) -> vec3f {
  let x = color;
  let mapped = clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), vec3f(0.0), vec3f(1.0));
  var out = pow(mapped, vec3f(1.0 / 2.2));
  let gray = dot(out, vec3f(0.299, 0.587, 0.114));
  return mix(vec3f(gray), out, 1.25);
}

fn studioLight(normal: vec3f, roughness: f32) -> f32 {
  let sunDir = normalize(vec3f(-0.46, 0.82, -0.33));
  let fillDir = normalize(vec3f(0.55, 0.48, 0.68));
  let key = max(dot(normal, sunDir), 0.0);
  let fill = max(dot(normal, fillDir), 0.0);
  let up = max(normal.y, 0.0);
  let viewDir = normalize(vec3f(0.398, 0.597, 0.696));
  let halfVec = normalize(sunDir + viewDir);
  let specPower = mix(48.0, 6.0, roughness);
  let spec = pow(max(dot(normal, halfVec), 0.0), specPower) * mix(0.7, 0.08, roughness);
  return 0.38 + key * 0.72 + fill * 0.22 + up * 0.15 + spec;
}

fn qrModuleMask(uv: vec2f, neighborMask: u32) -> f32 {
  let up = (neighborMask & 1u) != 0u;
  let right = (neighborMask & 2u) != 0u;
  let down = (neighborMask & 4u) != 0u;
  let left = (neighborMask & 8u) != 0u;
  let radius = 0.44;
  var mask = 1.0;
  if (!left && !up && uv.x < radius && uv.y < radius) {
    mask *= 1.0 - step(radius, distance(uv, vec2f(radius, radius)));
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
`;

export const CIRCUIT_BOARD_SHADER = /* wgsl */ `
${CIRCUIT_COMMON}

struct Output {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) uv: vec2f,
  @location(2) @interpolate(flat) layer: u32,
  @location(3) worldPos: vec3f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> Output {
  var output: Output;
  let face = vertexIndex / 6u;
  let uv = quadUv(vertexIndex);
  let isBoard = instanceIndex == 1u;
  let flatten = stage(0.72, 0.94);
  let width = (uniforms.gridSize + select(3.2, 0.55, isBoard)) * uniforms.blockSize;
  let heightCells = select(0.30, 0.18, isBoard);
  let height = mix(heightCells, 0.055, flatten) * uniforms.blockSize;
  let geometry = boxGeometry(face, uv, vec3f(width, height, width));
  let baseHeight = select(-0.38, -0.12, isBoard) * uniforms.blockSize;
  let localPos = vec3f(0.0, baseHeight, 0.0) + geometry[0];
  output.position = circuitProject(localPos);
  output.normal = geometry[1];
  output.uv = uv;
  output.layer = instanceIndex;
  output.worldPos = localPos;
  return output;
}

@fragment
fn fragmentMain(input: Output) -> @location(0) vec4f {
  let scan = stage(0.86, 1.0);
  if (input.layer == 0u) {
    let baseLighting = studioLight(input.normal, 0.45);
    let scanBase = mix(circuitQrSubstrate(), pcbBase(), 0.08);
    let baseColor = mix(vec3f(0.08, 0.09, 0.10), scanBase, scan) * baseLighting;
    return vec4f(acesToneMap(baseColor), 1.0);
  }

  let weave = textureSampleLevel(materialAtlas, materialSampler, atlasUv(0.0, input.uv, 14.0), 0.0);
  let grain = textureSampleLevel(materialAtlas, materialSampler, atlasUv(1.0, input.uv, 4.0), 0.0);
  var worldColor = mix(pcbBase(), pcbEdge(), select(0.0, 1.0, abs(input.normal.y) < 0.5));
  worldColor *= 0.88 + weave.r * 0.24;

  if (input.normal.y > 0.5) {
    let boardUv = input.uv;
    let gridCols = uniforms.gridSize;

    let distTL = distance(boardUv, vec2f(0.055, 0.055));
    let distTR = distance(boardUv, vec2f(0.945, 0.055));
    let distBL = distance(boardUv, vec2f(0.055, 0.945));
    let distBR = distance(boardUv, vec2f(0.945, 0.945));
    let minHoleDist = min(min(distTL, distTR), min(distBL, distBR));
    if (minHoleDist < 0.038) {
      if (minHoleDist < 0.016) {
        worldColor = vec3f(0.02, 0.02, 0.03);
      } else {
        worldColor = solderMaterial() * 1.35;
      }
    }

    if (boardUv.y > 0.94 && boardUv.x > 0.15 && boardUv.x < 0.85) {
      let fingerMod = fract(boardUv.x * gridCols * 1.6);
      if (fingerMod > 0.35 && fingerMod < 0.85) {
        worldColor = goldPad() * 1.4;
      }
    }

    let borderTick = (boardUv.x < 0.035 || boardUv.x > 0.965 || boardUv.y < 0.035 || boardUv.y > 0.965);
    let tickPattern = fract((boardUv.x + boardUv.y) * gridCols * 0.5);
    if (borderTick && tickPattern < 0.2) {
      worldColor = mix(worldColor, vec3f(0.92, 0.94, 0.90), 0.75);
    }

    let lineX = fract(boardUv.x * gridCols);
    let lineY = fract(boardUv.y * gridCols);
    let gridHatch = step(0.96, lineX) + step(0.96, lineY);
    let hatchNoise = fract(sin(floor(boardUv.x * gridCols) * 17.3 + floor(boardUv.y * gridCols) * 31.7) * 43758.5);
    if (gridHatch > 0.5 && hatchNoise > 0.65) {
      worldColor = mix(worldColor, pcbBase() * 1.35, 0.45);
    }

    let p1 = distance(boardUv, vec2f(3.5 / gridCols, 3.5 / gridCols));
    let p2 = distance(boardUv, vec2f((gridCols - 3.5) / gridCols, 3.5 / gridCols));
    let p3 = distance(boardUv, vec2f(3.5 / gridCols, (gridCols - 3.5) / gridCols));
    let minProc = min(min(p1, p2), p3);
    let procBoxDist = minProc * gridCols;
    if (procBoxDist > 3.6 && procBoxDist < 3.85) {
      worldColor = mix(worldColor, vec3f(0.95, 0.96, 0.92), 0.85);
    }

    let testCell = floor(boardUv * (gridCols * 0.5));
    let testSeed = fract(sin(dot(testCell, vec2f(127.1, 311.7))) * 43758.5);
    if (testSeed > 0.82) {
      let testUv = fract(boardUv * (gridCols * 0.5));
      let testDist = distance(testUv, vec2f(0.5, 0.5));
      if (testDist < 0.24) {
        worldColor = select(goldPad() * 1.3, vec3f(0.04), testDist < 0.08);
      }
    }
  }

  let lighting = studioLight(input.normal, grain.a * 0.7);
  let litColor = worldColor * lighting;
  let finalColor = mix(litColor, circuitQrSubstrate(), scan);
  return vec4f(acesToneMap(finalColor), 1.0);
}
`;

export const CIRCUIT_TRACE_SHADER = /* wgsl */ `
${CIRCUIT_COMMON}

struct Output {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) normal: vec3f,
  @location(2) seed: f32,
  @location(3) level: f32,
  @location(4) delay: f32,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> Output {
  var output: Output;
  let a = traceData[instanceIndex * 3u];
  let b = traceData[instanceIndex * 3u + 1u];
  let uv = quadUv(vertexIndex);
  let start = boardPoint(a.x, a.y, 0.105 + b.y * 0.022);
  let end = boardPoint(a.z, a.w, 0.105 + b.y * 0.022);
  let delta = end.xz - start.xz;
  let length = max(length(delta), uniforms.blockSize * 0.1);
  let tangent = delta / length;
  let side = vec2f(-tangent.y, tangent.x);
  var point = mix(start, end, uv.x);
  let traceWidth = max(b.x, 0.22);
  point.x += side.x * (uv.y - 0.5) * traceWidth * uniforms.blockSize;
  point.z += side.y * (uv.y - 0.5) * traceWidth * uniforms.blockSize;
  point.y += 0.016 * uniforms.blockSize;
  output.position = circuitProject(point);
  output.uv = uv;
  output.normal = vec3f(0.0, 1.0, 0.0);
  output.seed = traceData[instanceIndex * 3u + 2u].y;
  output.level = b.y;
  output.delay = circuitDelay(min(a.x, a.z), min(a.y, a.w), traceData[instanceIndex * 3u + 2u].y);
  return output;
}

@fragment
fn fragmentMain(input: Output) -> @location(0) vec4f {
  // Each trace dies in its own staggered window with a brief emissive drain
  // shimmer as the current bleeds out, instead of one global alpha fade.
  let fade = 1.0 - stage(0.50 + input.delay, 0.82 + input.delay);
  let drain = stage(0.50 + input.delay, 0.60 + input.delay)
    * (1.0 - stage(0.62 + input.delay, 0.78 + input.delay));
  let brushed = textureSampleLevel(materialAtlas, materialSampler, atlasUv(2.0, input.uv, 4.0), 0.0);

  let edgeDist = abs(input.uv.y - 0.5) * 2.0;
  let edgeShade = 1.0 - smoothstep(0.72, 1.0, edgeDist) * 0.35;

  var copper = mix(traceMetal(), traceBright(), brushed.r * 0.32 + input.seed * 0.12);
  if (input.level > 1.5) {
    copper = goldPad() * (0.9 + brushed.r * 0.2);
  }
  copper *= 1.0 + drain * 1.8;

  let endDist = min(input.uv.x, 1.0 - input.uv.x);
  if (endDist < 0.18) {
    let viaRadius = distance(vec2f(endDist * 5.5, (input.uv.y - 0.5) * 2.0), vec2f(0.5, 0.0));
    if (viaRadius < 0.65) {
      copper = select(solderMaterial() * 1.3, vec3f(0.03), viaRadius < 0.22);
    }
  }

  let lighting = studioLight(input.normal, 0.28);
  let lit = copper * lighting * edgeShade;
  return vec4f(acesToneMap(lit), fade);
}
`;

export const CIRCUIT_SIGNAL_SHADER = /* wgsl */ `
${CIRCUIT_COMMON}

struct Output {
  @builtin(position) position: vec4f,
  @location(0) along: f32,
  @location(1) routeId: f32,
  @location(2) routeLength: f32,
  @location(3) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> Output {
  var output: Output;
  let a = traceData[instanceIndex * 3u];
  let b = traceData[instanceIndex * 3u + 1u];
  let c = traceData[instanceIndex * 3u + 2u];
  let uv = quadUv(vertexIndex);
  let start = boardPoint(a.x, a.y, 0.16 + b.y * 0.022);
  let end = boardPoint(a.z, a.w, 0.16 + b.y * 0.022);
  let delta = end.xz - start.xz;
  let length = max(length(delta), uniforms.blockSize * 0.1);
  let tangent = delta / length;
  let side = vec2f(-tangent.y, tangent.x);
  var point = mix(start, end, uv.x);
  let signalWidth = max(b.x, 0.24) * 1.6;
  point.x += side.x * (uv.y - 0.5) * signalWidth * uniforms.blockSize;
  point.z += side.y * (uv.y - 0.5) * signalWidth * uniforms.blockSize;
  output.position = circuitProject(point);
  let segmentCells = distance(a.xy, a.zw);
  output.along = b.w + uv.x * segmentCells;
  output.routeId = b.z;
  output.routeLength = c.x;
  output.uv = uv;
  return output;
}

@fragment
fn fragmentMain(input: Output) -> @location(0) vec4f {
  let time = uniforms.time;
  let speed = 4.2 + input.routeId * 0.75;
  let routeLen = max(input.routeLength, 1.0);

  let packetPeriod = 4.2;
  let packetPhase = fract((input.along - time * speed) / packetPeriod);
  let packetHead = pow(max(1.0 - packetPhase * 1.5, 0.0), 4.0);

  let pulseCycle = 1.4;
  let pulsePhase = fract((input.along - time * (speed * 1.35)) / pulseCycle);
  let pulseHead = pow(max(1.0 - pulsePhase * 2.2, 0.0), 3.0) * 0.65;

  let activeRoute = floor(time / 2.5) % 10.0;
  let isTargetRoute = step(0.9, 1.0 - abs(input.routeId - activeRoute));
  let burstSeed = floor((time * 0.8 + input.routeId * 1.7) / 2.0);
  let burstActive = max(step(0.45, fract(sin(burstSeed * 91.3 + input.routeId * 17.1) * 43758.5)), isTargetRoute);
  let combinedPackets = (packetHead + pulseHead * burstActive);

  let transverse = 1.0 - abs(input.uv.y - 0.5) * 2.0;
  let beam = pow(transverse, 2.5) * combinedPackets;

  let sparkJitter = 0.9 + 0.2 * sin(time * 24.0 + input.along * 12.0);

  let mapping = smoothstep(0.18, 0.32, uniforms.progress) * (1.0 - smoothstep(0.48, 0.62, uniforms.progress));
  let mappingWave = 0.5 + 0.5 * sin(input.along * 1.8 - time * 6.0);

  let alpha = max(beam * sparkJitter * (1.0 - stage(0.24, 0.42)), mapping * mappingWave * 0.85);
  let glowColor = mix(signalColor(), vec3f(1.0, 0.98, 0.85), clamp(combinedPackets * 1.2, 0.0, 1.0));
  let emissive = glowColor * (1.6 + alpha * 1.8);
  return vec4f(acesToneMap(emissive), alpha * 0.95);
}
`;

export const CIRCUIT_COMPONENT_SHADER = /* wgsl */ `
${CIRCUIT_COMMON}

const COMPONENT_PARTS: u32 = 12u;

struct Output {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) uv: vec2f,
  @location(2) seed: f32,
  @location(3) @interpolate(flat) componentType: u32,
  @location(4) @interpolate(flat) part: u32,
  @location(5) @interpolate(flat) visible: u32,
}

struct PartGeometry {
  offset: vec3f,
  size: vec3f,
  visible: bool,
}

fn componentPart(part: u32, kind: u32, size: vec3f, variant: u32) -> PartGeometry {
  var result: PartGeometry;
  result.offset = vec3f(0.0);
  result.size = size;
  result.visible = part == 0u;

  if (kind == 0u) {
    if (part == 0u) {
      result.size = vec3f(size.x, size.y * 0.32, size.z);
      result.offset = vec3f(0.0, 0.0, 0.0);
    }
    if (part == 1u) {
      result.visible = true;
      result.size = vec3f(size.x * 0.76, size.y * 0.42, size.z * 0.76);
      result.offset = vec3f(0.0, size.y * 0.32, 0.0);
    }
    if (part >= 2u && part <= 9u) {
      result.visible = true;
      let side = (part - 2u) / 2u;
      let along = select(-0.30, 0.30, (part % 2u) == 1u);
      result.size = select(
        vec3f(size.x * 0.12, size.y * 0.16, size.z * 0.24),
        vec3f(size.x * 0.24, size.y * 0.16, size.z * 0.12),
        side >= 2u
      );
      result.offset = select(
        vec3f(along * size.x, size.y * 0.08, select(-0.54, 0.54, side == 1u) * size.z),
        vec3f(select(-0.54, 0.54, side == 3u) * size.x, size.y * 0.08, along * size.z),
        side >= 2u
      );
    }
    if (part == 10u) {
      result.visible = true;
      result.size = vec3f(size.x * 0.14, size.y * 0.06, size.z * 0.14);
      result.offset = vec3f(-size.x * 0.38, size.y * 0.74, -size.z * 0.38);
    }
    if (part == 11u) {
      result.visible = true;
      result.size = vec3f(size.x * 0.55, size.y * 0.22, size.z * 0.12);
      result.offset = vec3f(0.0, size.y * 0.08, size.z * 0.46);
    }
  } else if (kind == 2u) {
    if (part == 0u) {
      result.visible = true;
      result.size = vec3f(size.x, size.y * 0.22, size.z);
      result.offset = vec3f(0.0);
    } else if (part < 9u) {
      result.visible = true;
      let fin = f32(part) - 4.5;
      result.size = vec3f(size.x * 0.08, size.y * 0.82, size.z * 0.94);
      result.offset = vec3f(fin * size.x * 0.115, size.y * 0.22, 0.0);
    } else {
      result.visible = true;
      result.size = vec3f(size.x * 1.05, size.y * 0.08, size.z * 0.08);
      result.offset = vec3f(0.0, size.y * 0.95, 0.0);
    }
  } else if (kind == 3u) {
    if (part == 0u) {
      result.visible = true;
      result.size = vec3f(size.x * 0.65, size.y * 0.85, size.z * 0.90);
      result.offset = vec3f(0.0);
    } else if (part == 1u || part == 2u) {
      result.visible = true;
      let side = select(-1.0, 1.0, part == 2u);
      result.size = vec3f(size.x * 0.22, size.y * 0.88, size.z * 0.92);
      result.offset = vec3f(side * size.x * 0.38, 0.0, 0.0);
    } else if (part == 3u) {
      result.visible = true;
      result.size = vec3f(size.x * 0.45, size.y * 0.55, size.z * 0.45);
      result.offset = vec3f(0.0, 0.0, size.z * 0.75);
    }
  } else if (kind == 4u) {
    if (part == 0u) {
      result.visible = true;
      result.size = vec3f(size.x * 0.65, size.y * 0.75, size.z * 0.85);
      result.offset = vec3f(0.0);
    } else if (part == 1u || part == 2u) {
      result.visible = true;
      let side = select(-1.0, 1.0, part == 2u);
      result.size = vec3f(size.x * 0.20, size.y * 0.78, size.z * 0.88);
      result.offset = vec3f(side * size.x * 0.38, 0.0, 0.0);
    } else if (part >= 3u && part <= 5u) {
      result.visible = true;
      let idx = f32(part - 3u) - 1.0;
      result.size = vec3f(size.x * 0.22, size.y * 0.45, size.z * 0.22);
      result.offset = vec3f(idx * size.x * 0.35, 0.0, size.z * 0.65);
    }
  } else if (kind == 1u || kind == 7u) {
    if (part == 0u) {
      result.visible = true;
      result.size = vec3f(size.x, size.y * 0.72, size.z);
      result.offset = vec3f(0.0);
    } else if (part >= 1u && part <= 8u) {
      result.visible = true;
      let along = (f32((part - 1u) / 2u) - 1.5) * size.x * 0.26;
      let side = select(-1.0, 1.0, (part % 2u) == 0u);
      result.size = vec3f(size.x * 0.08, size.y * 0.16, size.z * 0.26);
      result.offset = vec3f(along, size.y * 0.06, side * size.z * 0.58);
    } else if (part == 9u) {
      result.visible = true;
      result.size = vec3f(size.x * 0.12, size.y * 0.05, size.z * 0.12);
      result.offset = vec3f(-size.x * 0.35, size.y * 0.72, -size.z * 0.35);
    }
  } else if (kind == 8u) {
    if (part == 0u) {
      result.visible = true;
      result.size = vec3f(size.x * 0.75, size.y * 0.85, size.z * 0.75);
      result.offset = vec3f(0.0);
    } else if (part == 1u || part == 2u) {
      result.visible = true;
      let side = select(-1.0, 1.0, part == 2u);
      result.size = vec3f(size.x * 0.25, size.y * 0.25, size.z * 0.80);
      result.offset = vec3f(side * size.x * 0.45, 0.0, 0.0);
    } else if (part >= 3u && part <= 6u) {
      result.visible = true;
      let vx = select(-0.35, 0.35, (part % 2u) == 1u);
      let vz = select(-0.35, 0.35, part >= 5u);
      result.size = vec3f(size.x * 0.22, size.y * 0.18, size.z * 0.22);
      result.offset = vec3f(vx * size.x * 1.8, 0.0, vz * size.z * 1.8);
    }
  } else {
    if (part == 0u) {
      result.visible = true;
      result.size = size;
      result.offset = vec3f(0.0);
    } else if (part < 5u) {
      result.visible = true;
      result.size = vec3f(size.x * 0.18, size.y * 0.85, size.z * 0.18);
      result.offset = vec3f((f32(part % 2u) - 0.5) * size.x * 0.55, 0.0, (f32(part / 2u) - 0.7) * size.z * 0.4);
    }
  }
  return result;
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> Output {
  var output: Output;
  let componentIndex = instanceIndex / COMPONENT_PARTS;
  let part = instanceIndex % COMPONENT_PARTS;
  let a = componentData[componentIndex * 3u];
  let b = componentData[componentIndex * 3u + 1u];
  let c = componentData[componentIndex * 3u + 2u];
  let kind = u32(b.z);
  let variant = u32(b.w);
  // Staggered reflow: details retract first, then each body deflates into its
  // own pad. Hero processors hold until the end so the rising QR finder
  // pillars read as a handoff instead of everything vanishing at once.
  let delay = circuitDelay(a.x, a.y, c.x) + select(0.0, 0.12, kind == 0u);
  let detailFade = 1.0 - stage(0.08 + delay, 0.32 + delay);
  let bodyFade = 1.0 - stage(0.36 + delay, 0.62 + delay);
  let partGeometry = componentPart(part, kind, vec3f(a.z, b.x, a.w), variant);
  let visibility = select(bodyFade, detailFade, part > 0u);
  let uv = quadUv(vertexIndex);
  let face = vertexIndex / 6u;
  let geometry = boxGeometry(face, uv, partGeometry.size * uniforms.blockSize * vec3f(1.0, visibility, 1.0));
  let rotation = b.y * 1.570796;
  let local = geometry[0] + partGeometry.offset * uniforms.blockSize;
  let rotated = vec3f(
    local.x * cos(rotation) - local.z * sin(rotation),
    local.y,
    local.x * sin(rotation) + local.z * cos(rotation)
  );
  let center = boardPoint(a.x, a.y, 0.12);
  output.position = circuitProject(center + rotated);
  output.normal = geometry[1];
  output.uv = uv;
  output.seed = c.x;
  output.componentType = kind;
  output.part = part;
  output.visible = select(0u, 1u, partGeometry.visible && visibility > 0.005);
  if (output.visible == 0u) { output.position = vec4f(2.0, 2.0, 2.0, 1.0); }
  return output;
}

@fragment
fn fragmentMain(input: Output) -> @location(0) vec4f {
  if (input.visible == 0u) { discard; }
  var base = plasticMaterial();
  var tile = 1.0;
  var roughness = 0.65;
  var ledEmission = vec3f(0.0);

  if (input.componentType == 0u) {
    if (input.part == 0u) {
      base = ceramicMaterial();
      tile = 4.0;
      roughness = 0.55;
    } else if (input.part == 1u) {
      base = hardwareMetal() * 1.25;
      tile = 2.0;
      roughness = 0.22;
    } else if (input.part == 10u) {
      base = goldPad() * 1.4;
      tile = 7.0;
      roughness = 0.18;
    } else if (input.part >= 2u && input.part <= 9u) {
      base = traceBright() * 1.15;
      tile = 2.0;
      roughness = 0.25;
    } else {
      base = ceramicMaterial() * 0.92;
      tile = 4.0;
      roughness = 0.45;
    }
  } else if (input.componentType == 2u) {
    base = hardwareMetal() * 1.1;
    tile = 3.0;
    roughness = 0.32;
  } else if (input.componentType == 3u) {
    if (input.part == 1u || input.part == 2u) {
      base = solderMaterial() * 1.3;
      tile = 5.0;
      roughness = 0.22;
    } else {
      base = mix(ceramicMaterial(), vec3f(0.72, 0.58, 0.42), 0.5);
      tile = 4.0;
      roughness = 0.55;
    }
  } else if (input.componentType == 4u) {
    if (input.part == 1u || input.part == 2u) {
      base = solderMaterial() * 1.3;
      tile = 5.0;
      roughness = 0.22;
    } else {
      base = vec3f(0.06, 0.08, 0.12);
      tile = 1.0;
      roughness = 0.65;
    }
  } else if (input.componentType == 8u) {
    if (input.part == 0u) {
      let time = uniforms.time;
      let ledSeed = fract(sin(input.seed * 37.1) * 43758.5);
      let heartbeat = 0.5 + 0.5 * sin(time * 3.5 + ledSeed * 6.28);
      let burstCycle = fract(time * 4.0 + ledSeed * 13.0);
      let burst = step(0.65, burstCycle);
      let ledIntensity = max(heartbeat * 0.8, burst * 1.5);
      let ledColor = select(
        mix(uniforms.themeSecondary.rgb, vec3f(0.2, 1.0, 0.3), 0.6),
        mix(uniforms.themeFourth.rgb, vec3f(1.0, 0.6, 0.1), 0.7),
        ledSeed > 0.5
      );
      ledEmission = ledColor * ledIntensity * 2.8;
      base = ledColor * (0.8 + ledIntensity * 0.8);
      roughness = 0.15;
    } else {
      base = solderMaterial() * 1.25;
      tile = 5.0;
      roughness = 0.25;
    }
  } else if (input.part > 0u) {
    base = traceBright();
    tile = 2.0;
    roughness = 0.32;
  }

  let detail = textureSampleLevel(
    materialAtlas,
    materialSampler,
    atlasUv(tile, input.uv, 2.0 + input.seed * 2.0),
    0.0
  );
  let material = base * (0.85 + detail.r * 0.30);
  let lit = material * studioLight(normalize(input.normal), roughness) + ledEmission;
  return vec4f(acesToneMap(lit), 1.0);
}
`;

export const CIRCUIT_QR_SHADER = /* wgsl */ `
${CIRCUIT_COMMON}

struct Output {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) uv: vec2f,
  @location(2) molten: f32,
  @location(3) tint: f32,
  @location(4) @interpolate(flat) visible: u32,
  @location(5) @interpolate(flat) neighborMask: u32,
  @location(6) @interpolate(flat) finderRole: u32,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> Output {
  var output: Output;
  let activeModule = blockTypes[instanceIndex] != 0u;
  let face = vertexIndex / 6u;
  let uv = quadUv(vertexIndex);
  let position = blockPositions[instanceIndex];
  let role = finderRole(position.x, position.y);
  // Finder cells bloom first; the rest sweep outward from the corners with
  // seeded jitter so solder reflows across the board instead of popping in.
  let center = uniforms.gridSize * 0.5;
  let radial = distance(vec2f(position.x, position.y), vec2f(center, center)) / max(uniforms.gridSize * 0.71, 1.0);
  let jitter = fract(sin((position.x * 12.9898 + position.y * 78.233) * 43.7585) * 43758.5453);
  let delay = clamp(radial * 0.20 + jitter * 0.10 - select(0.0, 0.08, role > 0u), 0.0, 0.30);
  let rise = stage(0.14 + delay, 0.52 + delay);
  let settle = stage(0.60 + delay, 0.90 + delay);
  let molten = rise * (1.0 - settle);
  // Tall molten bump that cools down into the shallow scan module profile.
  let height = (0.052 + max(0.38 * rise - 0.052, 0.0) * (1.0 - settle)) * uniforms.blockSize;
  let footprint = mix(0.86, 0.92, settle) * uniforms.blockSize;
  let geometry = boxGeometry(face, uv, vec3f(footprint, height, footprint));
  var local = geometry[0];
  // Round the pillar crown while molten; the locked module stays a square.
  let topness = clamp(local.y / max(height, 0.0001), 0.0, 1.0);
  let pinch = 1.0 - topness * molten * 0.34;
  local.x *= pinch;
  local.z *= pinch;
  let wobblePhase = position.x * 3.1 + position.y * 5.7;
  let wobble = sin(uniforms.time * 2.2 + wobblePhase) * 0.02 * molten * uniforms.blockSize;
  let moduleCenter = boardPoint(position.x, position.y, 0.12);
  output.position = circuitProject(moduleCenter + local + vec3f(wobble, 0.0, -wobble));
  output.normal = geometry[1];
  output.uv = uv;
  output.molten = molten;
  output.tint = fract(sin(position.x * 17.3 + position.y * 31.1) * 43758.5);
  output.visible = select(0u, 1u, activeModule && rise > 0.002);
  output.neighborMask = u32(position.w);
  output.finderRole = role;
  if (output.visible == 0u) { output.position = vec4f(2.0, 2.0, 2.0, 1.0); }
  return output;
}

@fragment
fn fragmentMain(input: Output) -> @location(0) vec4f {
  if (input.visible == 0u) { discard; }

  let lock = stage(0.88, 1.0);
  let organicMask = qrModuleMask(input.uv, input.neighborMask);
  let moduleMask = select(organicMask, 1.0, input.finderRole > 0u && lock > 0.7);
  if (abs(input.normal.y) > 0.5 && moduleMask < 0.5) {
    discard;
  }

  let roleInk = select(circuitQrInk(), circuitFinderInk(input.finderRole), input.finderRole > 0u);
  let edgeDistance = min(min(input.uv.x, 1.0 - input.uv.x), min(input.uv.y, 1.0 - input.uv.y));
  let platedInset = 1.0 - smoothstep(0.045, 0.13, edgeDistance);
  let contactInk = mix(roleInk, goldPad(), platedInset * 0.075);
  let scanMaterial = select(contactInk * 0.82, contactInk, input.normal.y > 0.5);
  // Locked modules keep per-module brightness variation like the tree QR.
  let cooled = scanMaterial * (0.94 + input.tint * 0.09);
  let moltenColor = mix(goldPad(), vec3f(1.0, 0.86, 0.48), 0.4 * input.molten)
    * (1.25 + input.molten * 1.0);
  let finalColor = mix(cooled, moltenColor, input.molten);
  return vec4f(acesToneMap(finalColor), 1.0);
}
`;
