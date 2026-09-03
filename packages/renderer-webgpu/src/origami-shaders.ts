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

fn origInk() -> vec3f {
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

fn origPaper() -> vec3f {
  return mix(uniforms.themeFifth.rgb, vec3f(1.0), 0.68);
}

fn origStage(start: f32, end: f32) -> f32 {
  return smoothstep(start, end, uniforms.progress);
}

fn origProject(localPos: vec3f) -> vec4f {
  let camera = origStage(0.5, 1.0);
  let angleY = mix(0.68, 0.0, camera);
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
  let yOffset = mix(-0.16, 0.08, camera) + uniforms.cameraBobY;

  return vec4f(rotX * scaleX + uniforms.cameraBobX, (rotY + yOffset) * scaleY, depth * 0.01 + 0.5, 1.0);
}
`;

export const ORIGAMI_SHADER = /* wgsl */ `
${ORIGAMI_UNIFORMS_WGSL}

struct OrigamiOutput {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) uv: vec2f,
  @location(2) @interpolate(flat) blockType: u32,
  @location(3) @interpolate(flat) foldType: u32,
  @location(4) shade: f32,
  @location(5) seed: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> blockTypes: array<u32>;
@group(0) @binding(2) var<storage, read> blockPositions: array<vec4f>;
@group(0) @binding(3) var<storage, read> blockHeights: array<f32>;
@group(0) @binding(4) var<storage, read> panelData: array<vec4f>;

// 2 triangular facets per cell
const TRI_VERTS: array<vec2f, 6> = array<vec2f, 6>(
  vec2f(-0.5, -0.5), vec2f(0.5, -0.5), vec2f(0.5, 0.5),
  vec2f(-0.5, -0.5), vec2f(0.5, 0.5), vec2f(-0.5, 0.5)
);

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> OrigamiOutput {
  var output: OrigamiOutput;
  let cellIndex = instanceIndex;

  if (cellIndex >= arrayLength(&blockPositions)) {
    output.position = vec4f(2.0, 2.0, 2.0, 1.0);
    return output;
  }

  let posData = blockPositions[cellIndex];
  let raw = panelData[cellIndex];
  let foldType = u32(raw.x);
  let rawElevation = raw.y;
  let angle = raw.z;
  let seed = raw.w / 1000.0;
  let isDark = blockTypes[cellIndex] != 0u;

  let v = TRI_VERTS[vertexIndex % 6u];
  let triId = (vertexIndex % 6u) / 3u;

  // Unfolding stage: paper flattens completely
  let unfoldStage = origStage(0.15, 0.85);
  let qrStage = origStage(0.8, 1.0);

  let elevation = mix(rawElevation, 0.0, unfoldStage);

  // Faceted fold displacement
  let foldDir = select(v.x + v.y, v.x - v.y, triId == 1u);
  let foldY = (1.0 - abs(foldDir)) * elevation;

  let center = (uniforms.gridSize - 1.0) * 0.5;
  let sz = mix(0.96, 1.0, qrStage);
  let worldX = posData.x - center + v.x * sz;
  let worldZ = posData.y - center + v.y * sz;
  let worldY = select(0.01, foldY, isDark);

  let modelPos = vec3f(worldX, worldY, worldZ);
  output.position = origProject(modelPos);
  output.uv = v + 0.5;
  output.blockType = blockTypes[cellIndex];
  output.foldType = foldType;
  output.seed = seed;

  // Compute facet normal
  let nx = select(-elevation * 0.5, elevation * 0.5, triId == 0u);
  let nz = select(-elevation * 0.5, elevation * 0.5, triId == 1u);
  let normal = normalize(vec3f(nx, 1.0, nz));
  output.normal = normal;

  let lightDir = normalize(vec3f(0.5, 0.85, 0.35));
  output.shade = clamp(dot(normal, lightDir) * 0.4 + 0.6, 0.3, 1.0);

  return output;
}

@fragment
fn fragmentMain(input: OrigamiOutput) -> @location(0) vec4f {
  let isDark = input.blockType != 0u;
  let morphQR = origStage(0.85, 1.0);

  if (morphQR >= 1.0) {
    let finalColor = select(origPaper(), origInk(), isDark);
    return vec4f(finalColor, 1.0);
  }

  // Washi paper aesthetic
  let washiBase = vec3f(0.96, 0.95, 0.92);
  let washiCrease = vec3f(0.82, 0.80, 0.76);
  let origamiIndigo = vec3f(0.12, 0.16, 0.28);
  let origamiCrimson = vec3f(0.68, 0.15, 0.18);
  let origamiGold = vec3f(0.85, 0.70, 0.35);

  var paperColor = washiBase;
  if (isDark) {
    if (input.foldType == 4u || input.foldType == 5u) {
      // Finder Rosette: Gold and crimson accents
      paperColor = mix(origamiCrimson, origamiGold, input.seed);
    } else if (input.foldType == 1u) {
      // Mountain fold: Deep indigo washi
      paperColor = mix(origamiIndigo, vec3f(0.18, 0.22, 0.35), input.seed);
    } else {
      paperColor = mix(origamiIndigo * 0.8, origamiCrimson * 0.6, input.seed * 0.4);
    }
  }

  // Crease shadow along diagonal fold
  let uv = input.uv;
  let creaseDist = abs(uv.x - uv.y);
  let creaseShadow = smoothstep(0.0, 0.08, creaseDist);
  paperColor = mix(washiCrease * 0.8, paperColor, creaseShadow * 0.3 + 0.7);

  var shaded = paperColor * input.shade;

  let canonicalColor = select(origPaper(), origInk(), isDark);
  shaded = mix(shaded, canonicalColor, morphQR);

  return vec4f(shaded, 1.0);
}
`;
