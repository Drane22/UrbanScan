import type { SeedScenePalette } from "./renderer.js";

type Color = readonly [number, number, number];
export function qrPaper(palette: SeedScenePalette): Color {
  return palette[4].map((c) => Math.max(0.9, c * 0.35 + 0.98 * 0.65)) as unknown as Color;
}

/** Matches WGSL. Saturated dark hues remain distinct with even bright overrides. */
export function qrMaterial(palette: SeedScenePalette, role: number, noise: number): Color {
  const hue = palette[((role % 4) + 4) % 4]!;
  const peak = Math.max(...hue, 0.001);
  const normalized = hue.map((c) => 0.018 + (c / peak) * 0.4);
  const luma = normalized[0]! * 0.2126 + normalized[1]! * 0.7152 + normalized[2]! * 0.0722;
  // Equal scanner brightness prevents hue boundaries being mistaken for light cells.
  const lift = Math.max(0, (0.23 - luma) / (1 - luma));
  const scale = Math.min(1, 0.23 / luma);
  const grain = 0.97 + (noise - Math.floor(noise)) * 0.03;
  return normalized.map((c) => (c * scale * (1 - lift) + lift) * grain) as unknown as Color;
}

export function relativeLuminance(color: Color): number {
  const linear = color.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722;
}

export const DIORAMA_MATERIALS_WGSL = /* wgsl */ `
fn qrPaper() -> vec3f { return max(vec3f(0.9),mix(uniforms.themeFifth.rgb,vec3f(0.98),0.65)); }
fn qrMaterial(role: u32, noise: f32) -> vec3f {
  let hue=palette(f32(role%4u));
  let peak=max(max(hue.r,hue.g),max(hue.b,0.001));
  let normalized=vec3f(0.018)+hue/peak*0.40;
  let luma=dot(normalized,vec3f(0.2126,0.7152,0.0722));
  let lift=max(0.0,(0.23-luma)/(1.0-luma));
  let scale=min(1.0,0.23/luma);
  return (normalized*scale*(1.0-lift)+vec3f(lift))*(0.97+fract(noise)*0.03);
}
`;
