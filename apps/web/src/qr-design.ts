import type { QRMatrix, QRSvgPath } from "@every-qrcode/core";

export type DesignedQRArtifact = {
  readonly identity: {
    readonly link: { readonly payloadUrl: string };
    readonly qr: Pick<QRMatrix, "cells" | "size">;
  };
  readonly svg: QRSvgPath;
  readonly inks?: readonly string[];
};

function linear(value: number) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** Keep every gradient stop at least 7:1 against the untouched white quiet zone. */
export function createQRInks(swatches: readonly string[]): readonly string[] {
  return [swatches[0], swatches[1], swatches[2]].map((hex) => {
    if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return "#172b23";
    let rgb = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
    const luminance = () =>
      rgb.reduce((sum, channel, i) => sum + linear(channel) * [0.2126, 0.7152, 0.0722][i]!, 0);
    while (luminance() > 0.1) rgb = rgb.map((channel) => channel * 0.94);
    return (
      "#" +
      rgb
        .map((channel) =>
          Math.round(channel * 255)
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")
    );
  });
}

export function serializeDesignedQR(artifact: DesignedQRArtifact): string {
  const { size, path } = artifact.svg;
  if (!artifact.inks)
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="white"/><path d="${path}" fill="black"/></svg>`;
  const inks = artifact.inks ?? ["#000000", "#000000", "#000000"];
  const stops = inks
    .map(
      (ink, i) =>
        `<stop offset="${i * 50}%" stop-color="${/^#[0-9a-f]{6}$/i.test(ink) ? ink : "#000000"}"/>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges"><defs><linearGradient id="ink" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${size}" y2="${size}">${stops}</linearGradient></defs><rect width="${size}" height="${size}" fill="white"/><path d="${path}" fill="url(#ink)"/></svg>`;
}
