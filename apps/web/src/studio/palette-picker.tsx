import { getPalettesForModel } from "@every-qrcode/renderer-webgpu/world-options";
import type { EveryQRCodeModel } from "@every-qrcode/react";
import { getWorldOption } from "../world-catalog";

export function PalettePicker({
  model,
  selected,
  seeded,
  onSelect,
}: {
  model: EveryQRCodeModel;
  selected: string;
  seeded: boolean;
  onSelect: (id: string) => void;
}): React.JSX.Element {
  const palettes = getPalettesForModel(model);
  return (
    <div className="palette-controls">
      <div className="palette-label">
        <span>Palette</span>
        <span>
          {seeded ? "Match link" : palettes.find((palette) => palette.id === selected)?.name}
        </span>
      </div>
      <div className="palette-picker" role="group" aria-label="Color choices">
        {palettes.map((palette) => (
          <button
            className="palette-card"
            type="button"
            key={palette.id}
            aria-label={palette.name}
            title={palette.name}
            aria-pressed={!seeded && selected === palette.id}
            onClick={() => onSelect(palette.id)}
          >
            <span className="palette-swatches" aria-hidden="true">
              {palette.swatches.map((color, i) => (
                <span key={i} style={{ background: color }} />
              ))}
            </span>
            <span className="palette-check" aria-hidden="true">
              {!seeded && selected === palette.id ? "✓" : ""}
            </span>
          </button>
        ))}
        {getWorldOption(model).seededPalette && (
          <button
            className="seeded-choice"
            type="button"
            title="Match this link"
            aria-label="Match this link"
            aria-pressed={seeded}
            onClick={() => onSelect("seeded")}
          >
            <span aria-hidden="true">✦</span>
          </button>
        )}
      </div>
    </div>
  );
}
