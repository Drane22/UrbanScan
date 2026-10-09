// Runtime scan endpoint shared by preserved generators. Keep historical world
// shaders unchanged while rendering the exact QR cell field with a quiet zone.
export const CANONICAL_QR_SHADER = /* wgsl */ `
struct CanonicalUniforms {
  aspectRatio: f32,
  time: f32,
  itemCount: f32,
  progress: f32,
  gridSize: f32,
}

struct Output {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f,
}

@group(0) @binding(0) var<uniform> uniforms: CanonicalUniforms;
@group(0) @binding(1) var<storage, read> blockTypes: array<u32>;
@group(0) @binding(2) var<storage, read> blockPositions: array<vec4f>;
@group(0) @binding(4) var<storage, read> baseY: array<f32>;

@vertex
fn vertexMain(@builtin(vertex_index) vertex: u32, @builtin(instance_index) owner: u32) -> Output {
  var output: Output;
  output.position = vec4f(2.0, 2.0, 0.0, 1.0);
  let corners = array<vec2f, 6>(
    vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(0.0, 1.0),
    vec2f(0.0, 1.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0)
  );
  let uv = corners[vertex];
  let side = uniforms.gridSize + 8.0;
  var point: vec2f;
  if (owner == u32(uniforms.itemCount)) {
    point = (uv - vec2f(0.5)) * side;
    output.color = vec3f(1.0);
  } else {
    // Tree contains stacked organs at the same column. Only canonical ground
    // cells participate; every other legacy form already has one ground cell.
    if (blockTypes[owner] == 0u || baseY[owner] != 0.0) { return output; }
    point = blockPositions[owner].xy + uv - vec2f(uniforms.gridSize * 0.5);
    output.color = vec3f(0.015);
  }
  let scale = 1.84 / side;
  output.position = vec4f(
    point.x * scale / max(uniforms.aspectRatio, 1.0),
    -point.y * scale / max(1.0 / uniforms.aspectRatio, 1.0),
    0.0, 1.0
  );
  return output;
}

@fragment
fn fragmentMain(input: Output) -> @location(0) vec4f {
  return vec4f(input.color, 1.0);
}
`;
