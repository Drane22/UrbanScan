import type { QRArtifact } from "./qr-artifact.js";
import { createQRSvgPath } from "./qr-svg.js";

/** Canonical geometry only: destination strings never enter XML. */
export function serializeQRSvg(artifact: QRArtifact): string {
  const { path, size } = createQRSvgPath(artifact.identity.qr);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="white"/><path d="${path}" fill="black"/></svg>`;
}

export function getQRRasterLayout(matrixSize: number, size: number) {
  if (!Number.isSafeInteger(matrixSize) || matrixSize <= 0 || !Number.isSafeInteger(size))
    throw new RangeError("Invalid QR output dimensions");
  const modulePx = Math.floor(size / (matrixSize + 8));
  if (modulePx < 1) throw new RangeError("Output cannot fit one pixel per QR module");
  const symbolPx = (matrixSize + 8) * modulePx;
  return { size, modulePx, symbolPx, margin: Math.floor((size - symbolPx) / 2) };
}
