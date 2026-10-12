/** Darken palette colors without replacing their hue; keep at least 7:1 on white. */
export function createQRInks(swatches: readonly string[]): readonly string[] {
  return [swatches[0], swatches[1], swatches[2]].map((hex) => {
    if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return "#172b23";
    let rgb = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
    const luminance = () =>
      rgb.reduce(
        (sum, channel, i) =>
          sum +
          (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4) *
            [0.2126, 0.7152, 0.0722][i]!,
        0,
      );
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

/** Hold each accent long enough that complementary hues don't average into gray. */
export function createQRGradientStops(
  inks: readonly string[],
): readonly { offset: number; color: string }[] {
  const first = inks[0] ?? "#172b23",
    middle = inks[1] ?? first,
    last = inks[2] ?? middle;
  return [
    { offset: 0, color: first },
    { offset: 0.28, color: first },
    { offset: 0.38, color: middle },
    { offset: 0.62, color: middle },
    { offset: 0.72, color: last },
    { offset: 1, color: last },
  ];
}
