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
      {getWorldOption(model).seededPalette && (
        <button
          className="seeded-choice"
          type="button"
          aria-pressed={seeded}
          onClick={() => onSelect("seeded")}
        >
          Match this link {seeded && <span aria-hidden="true">✓</span>}
        </button>
      )}
      <p className="selected-palette">
        {palettes.find((palette) => palette.id === selected)?.name}
      </p>
      <div className="palette-picker" aria-label="Color choices">
        {palettes.map((palette) => (
          <button
            className="palette-card"
            type="button"
            key={palette.id}
            aria-pressed={!seeded && selected === palette.id}
            onClick={() => onSelect(palette.id)}
          >
            <span className="palette-swatches" aria-hidden="true">
              {palette.swatches.map((color, i) => (
                <span key={i} style={{ background: color }} />
              ))}
            </span>
            <span className="choice-label">
              {palette.name}
              <span aria-hidden="true">{!seeded && selected === palette.id ? "✓" : ""}</span>
            </span>
          </button>
        ))}
      </div>
      <details className="choice-info" key={selected}>
        <summary>About these colors</summary>
        <p>
          {palettes.find((palette) => palette.id === selected)?.description ??
            "Colors selected for this world."}
        </p>
      </details>
    </div>
  );
}
