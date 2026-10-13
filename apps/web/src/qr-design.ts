import { createQRInks, createQRGradientStops, type QRArtifact } from "@every-qrcode/core";
export { createQRInks } from "@every-qrcode/core";

export type DesignedQRArtifact = QRArtifact & {
  readonly inks?: readonly string[];
};

/** Palette styling must preserve the destination and the renderer's exact QR cells. */
export function createDesignedQR(
  artifact: QRArtifact,
  swatches: readonly string[],
): DesignedQRArtifact {
  return { ...artifact, inks: createQRInks(swatches) };
}

export function serializeDesignedQR(artifact: DesignedQRArtifact): string {
  const { size, path } = artifact.svg;
  if (!artifact.inks)
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="white"/><path d="${path}" fill="black"/></svg>`;
  const inks = artifact.inks ?? ["#000000", "#000000", "#000000"];
  const stops = createQRGradientStops(inks)
    .map(
      ({ offset, color }) =>
        `<stop offset="${offset * 100}%" stop-color="${/^#[0-9a-f]{6}$/i.test(color) ? color : "#172b23"}"/>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges"><defs><linearGradient id="ink" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${size}" y2="${size}">${stops}</linearGradient></defs><rect width="${size}" height="${size}" fill="white"/><path d="${path}" fill="url(#ink)"/></svg>`;
}
