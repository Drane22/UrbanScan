import type { EveryQRCodeModel, EveryQRCodeSceneConfig } from "@every-qrcode/react";
import type { WorldPalettePreset } from "@every-qrcode/renderer-webgpu/world-options";
import type { Appearance } from "./studio-preferences";

type NightDesign = {
  readonly glow: number;
  readonly brightness: readonly [number, number, number, number, number];
};

// Surface, accent and foundation slots differ between worlds. Keep their
// selected hue family while giving each material a deliberate night treatment.
const NIGHT_DESIGNS: Record<EveryQRCodeModel, NightDesign> = {
  tree: { glow: 0.45, brightness: [0.42, 0.9, 0.88, 0.82, 0.6] },
  terrain: { glow: 0.4, brightness: [0.4, 0.9, 0.82, 0.88, 0.7] },
  city: { glow: 0.55, brightness: [0.5, 0.96, 0.88, 0.9, 0.7] },
  circuit: { glow: 0.55, brightness: [0.3, 1.0, 0.92, 0.98, 0.6] },
  reef: { glow: 0.6, brightness: [0.38, 0.98, 0.9, 0.86, 0.7] },
  colony: { glow: 0.45, brightness: [0.46, 0.96, 0.88, 0.86, 0.75] },
  dungeon: { glow: 0.6, brightness: [0.46, 1.0, 0.85, 0.88, 0.76] },
  origami: { glow: 0.4, brightness: [0.36, 0.92, 0.88, 0.9, 0.8] },
  "stained-glass": { glow: 0.6, brightness: [0.32, 0.98, 0.94, 0.9, 0.72] },
  mycelium: { glow: 0.65, brightness: [0.34, 0.96, 0.9, 0.88, 0.72] },
  constellation: { glow: 0.55, brightness: [0.24, 0.96, 0.9, 0.82, 0.78] },
  "toy-block": { glow: 0.45, brightness: [0.36, 0.96, 0.86, 0.88, 0.84] },
  crystalline: { glow: 0.65, brightness: [0.32, 0.95, 0.9, 0.9, 0.82] },
  mechanical: { glow: 0.5, brightness: [0.4, 0.96, 0.85, 0.94, 0.8] },
  waves: { glow: 0.4, brightness: [0.3, 0.9, 0.9, 0.85, 0.72] },
};

export function createWorldScene(
  model: EveryQRCodeModel,
  preset: Pick<WorldPalettePreset, "palette" | "artDirection">,
  appearance: Appearance,
): EveryQRCodeSceneConfig {
  const base = {
    palette: preset.palette,
    artDirection: preset.artDirection ?? 0,
    background: [1, 1, 1] as const,
  };
  if (appearance !== "midnight") return base;
  const design = NIGHT_DESIGNS[model];
  // Illuminate each material in its own hue. A fixed blue/orange tint made
  // different palettes converge; multiplying dark pigments hid their detail.
  const palette = preset.palette.map((color, slot) => {
    const peak = Math.max(...color, 0.001);
    const light = design.brightness[slot]!;
    const fill = slot === 0 ? 0.025 : 0.055;
    return color.map((channel) => ((channel / peak) * (1 - fill) + fill) * light);
  }) as unknown as NonNullable<EveryQRCodeSceneConfig["palette"]>;
  return {
    ...base,
    palette,
    appearance: "dark",
    background: [11 / 255, 12 / 255, 14 / 255],
    glow: design.glow,
  };
}
