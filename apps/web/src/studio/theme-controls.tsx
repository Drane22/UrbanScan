import { useEffect, useRef, useState } from "react";
import type { EveryQRCodeModel } from "@every-qrcode/react";
import { getWorldOption, getWorldThumbnail } from "../world-catalog";
import { WorldPicker } from "./world-picker";
import { PalettePicker } from "./palette-picker";

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
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const world = getWorldOption(model);
  const close = () => {
    dialog.current?.close();
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  };
  useEffect(() => {
    const media = window.matchMedia("(max-width: 850px)");
    const update = () => {
      setMobile(media.matches);
      setOpen(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!mobile || !open || !dialog.current) return;
    const panel = dialog.current;
    const fit = () => {
      const viewport = window.visualViewport;
      panel.style.setProperty("--picker-height", (viewport?.height ?? innerHeight) - 24 + "px");
      panel.style.setProperty("--picker-top", (viewport?.offsetTop ?? 0) + 12 + "px");
    };
    fit();
    panel.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.visualViewport?.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("scroll", fit);
    window.addEventListener("resize", fit);
    return () => {
      panel.close();
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("scroll", fit);
    };
  }, [mobile, open]);
  const selectPalette = (id: string) => {
    onPalette(id);
    if (open) close();
  };
  return (
    <section
      className="theme-controls"
      aria-label="Customize"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          close();
        }
      }}
    >
      <div className="selection-bar">
        <div className="selection-heading">
          <span className="selection-current">
            <img src={getWorldThumbnail(model, dark)} width={36} height={36} alt="" />
            <span>
              <small>Your world</small>
              <strong>{world.name}</strong>
            </span>
          </span>
          <button
            className="worlds-trigger"
            type="button"
            ref={trigger}
            aria-expanded={open}
            aria-controls="world-browser"
            onClick={() => setOpen(!open)}
          >
            {open ? "Done" : "Browse worlds"}
            <span aria-hidden="true">{open ? "✓" : "⌄"}</span>
          </button>
        </div>
        <PalettePicker
          model={model}
          selected={selectedPaletteId}
          seeded={paletteId === "seeded"}
          onSelect={selectPalette}
        />
      </div>
      {mobile ? (
        <dialog
          ref={dialog}
          className="world-dialog"
          id="world-browser"
          aria-labelledby="world-browser-title"
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div className="world-dialog-content">
            <div className="world-dialog-heading">
              <h2 id="world-browser-title">Choose your world</h2>
              <button type="button" onClick={close}>
                Done
              </button>
            </div>
            <div className="dialog-palette">
              <strong>{world.name}</strong>
              <PalettePicker
                model={model}
                selected={selectedPaletteId}
                seeded={paletteId === "seeded"}
                onSelect={selectPalette}
              />
            </div>
            <div className="world-dialog-scroll">
              <WorldPicker selected={model} onSelect={onWorld} dark={dark} />
            </div>
          </div>
        </dialog>
      ) : (
        <div className="world-browser" id="world-browser">
          <WorldPicker selected={model} onSelect={onWorld} dark={dark} />
        </div>
      )}
    </section>
  );
}
