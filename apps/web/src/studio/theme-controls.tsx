import type { EveryQRCodeModel } from "@every-qrcode/react";
import { WorldPicker } from "./world-picker";
import { PalettePicker } from "./palette-picker";

/** Persistent inline controls: no modal, no category dropdown, no body-scroll lock. */
export function ThemeControls({
  model,
  paletteId,
  selectedPaletteId,
  onWorld,
  onPalette,
  dark = false,
}: {
  model: EveryQRCodeModel;
  paletteId: string;
  selectedPaletteId: string;
  onWorld: (model: EveryQRCodeModel) => void;
  onPalette: (id: string) => void;
  dark?: boolean;
}): React.JSX.Element {
  return (
    <section className="theme-controls" aria-label="Customize world">
      <div className="selection-bar">
        <PalettePicker
          model={model}
          selected={selectedPaletteId}
          seeded={paletteId === "seeded"}
          onSelect={onPalette}
        />
      </div>
      <div className="world-browser">
        <WorldPicker selected={model} onSelect={onWorld} dark={dark} />
      </div>
    </section>
  );
}
