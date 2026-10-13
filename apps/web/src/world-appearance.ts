import type { EveryQRCodeModel, EveryQRCodeSceneConfig } from "@every-qrcode/react";
import type { WorldPalettePreset } from "@every-qrcode/renderer-webgpu/world-options";
import type { Appearance } from "./studio-preferences";

type NightDesign = {
  readonly tint: readonly [number, number, number];
  readonly glow: number;
  readonly levels: readonly [number, number, number, number, number];
};

// Surface, accent and foundation slots differ between worlds. Keep their
// selected hue family while giving each material a deliberate night treatment.
const NIGHT_DESIGNS: Record<EveryQRCodeModel, NightDesign> = {
  tree: { tint: [0.48, 0.85, 0.98], glow: 0.55, levels: [1.1, 0.6, 0.45, 0.65, 0.15] },
  terrain: { tint: [0.4, 0.72, 1], glow: 0.4, levels: [0.5, 0.65, 0.65, 1.1, 0.35] },
  city: { tint: [1, 0.78, 0.48], glow: 0.6, levels: [0.55, 0.8, 1.15, 0.55, 0.18] },
  circuit: { tint: [0.4, 0.86, 1], glow: 0.65, levels: [0.35, 1.1, 0.6, 1.1, 0.3] },
  reef: { tint: [0.48, 0.95, 0.92], glow: 0.75, levels: [0.6, 1.05, 1.05, 0.8, 0.18] },
  colony: { tint: [1, 0.7, 0.4], glow: 0.35, levels: [0.5, 0.65, 0.9, 0.6, 0.2] },
  dungeon: { tint: [1, 0.62, 0.3], glow: 0.65, levels: [0.4, 0.55, 1.1, 1.15, 0.16] },
  origami: { tint: [0.75, 0.65, 1], glow: 0.35, levels: [0.7, 0.9, 0.85, 0.65, 0.16] },
  "stained-glass": { tint: [0.8, 0.6, 1], glow: 0.75, levels: [1.05, 1.1, 1.1, 0.85, 0.12] },
  mycelium: { tint: [0.35, 1, 0.82], glow: 0.85, levels: [0.55, 1.1, 1.1, 0.65, 0.15] },
  constellation: { tint: [0.55, 0.7, 1], glow: 0.75, levels: [0.65, 1.1, 1, 0.8, 0.12] },
  "toy-block": { tint: [0.65, 0.78, 1], glow: 0.4, levels: [0.65, 0.85, 1, 0.75, 0.18] },
  crystalline: { tint: [0.6, 0.75, 1], glow: 0.8, levels: [0.35, 1.05, 1.1, 1.05, 0.15] },
  mechanical: { tint: [1, 0.7, 0.4], glow: 0.45, levels: [0.35, 0.75, 0.85, 1.05, 0.22] },
  waves: { tint: [0.4, 0.72, 1], glow: 0.4, levels: [0.35, 0.8, 0.8, 0.6, 0.2] },
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
  const palette = preset.palette.map((color, slot) =>
    color.map((channel, axis) =>
      Math.min(1, (channel * 0.88 + design.tint[axis]! * 0.12) * design.levels[slot]!),
    ),
  ) as unknown as NonNullable<EveryQRCodeSceneConfig["palette"]>;
  return {
    ...base,
    palette,
    appearance: "dark",
    background: [11 / 255, 12 / 255, 14 / 255],
    glow: design.glow,
  };
}
