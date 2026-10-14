import type { SeedForm } from "../seed-model.js";

/** Screen-space calibration at 100% zoom, a 25-module symbol and a 600x450
 * viewport. Match the square root of visible bounding-box area, not width:
 * wide dioramas and upright trees cannot match a square on both axes.
 * The QR scale includes all four quiet-zone modules on every side. */
export const QR_FRAME_SCALE = 1.66;
const FRAMES: Record<SeedForm, readonly [scale: number, centerY: number]> = {
  crystalline: [1.235, -0.093],
  mechanical: [0.899, 0],
  tree: [0.947, -0.032],
  terrain: [0.947, 0.021],
  city: [1.046, 0.123],
  circuit: [0.904, 0.056],
  reef: [1, 0.06],
  colony: [0.972, 0.048],
  dungeon: [0.959, 0.026],
  origami: [0.976, 0.018],
  "stained-glass": [0.955, 0.021],
  mycelium: [0.951, 0.089],
  constellation: [0.935, -0.004],
  "toy-block": [0.957, 0.021],
  waves: [1.08, 0.026],
};

export function worldFraming(form: SeedForm, gridSize: number): readonly [number, number] {
  const [scale, centerY] = FRAMES[form];
  // Legacy Tree/City use gridSize; staged worlds use gridSize + 10.
  const adjustment =
    form === "tree" || form === "city"
      ? gridSize / (gridSize + 8) / (25 / 33)
      : (gridSize + 10) / (gridSize + 8) / (35 / 33);
  return [scale * adjustment, centerY * adjustment];
}

/** Apply only at v3 compilation, preserving archived v1/v2 shader sources and
 * fingerprints. World and QR share a centered, aspect-correct projection;
 * automatic framing and user zoom ease out on the same reversible timeline. */
export function frameVersionThreeShader(source: string): string {
  return source
    .replace(/camera: vec4f,\s*}/, "camera: vec4f,\n  appearance: vec4f,\n}")
    .replace(
      "let scale=mix(worldScale,qrScale,t)*portrait*pulse*zoom;",
      "let scale=mix(worldScale*zoom,uniforms.appearance.z/((uniforms.gridSize+8.0)*uniforms.blockSize),smoothstep(0.0,1.0,t))*pulse;",
    )
    .replace(
      "(y+shift.y)*scale/max(1.0/uniforms.aspectRatio,1.0)",
      "((y+shift.y)*scale+uniforms.appearance.w*(1.0-smoothstep(0.0,1.0,t)))/max(1.0/uniforms.aspectRatio,1.0)",
    );
}
