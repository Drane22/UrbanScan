import { useEffect, useRef, useState } from "react";
import type { EveryQRCodeModel } from "@every-qrcode/react";
import { getWorldOption } from "../world-catalog";
import { WorldPicker } from "./world-picker";
import { PalettePicker } from "./palette-picker";

export function ThemeControls({
  model,
  paletteId,
  selectedPaletteId,
  onWorld,
  onPalette,
}: {
  model: EveryQRCodeModel;
  paletteId: string;
  selectedPaletteId: string;
  onWorld: (model: EveryQRCodeModel) => void;
  onPalette: (id: string) => void;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const region = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const world = getWorldOption(model);
  const close = () => {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (!open) return;
    let frame = 0;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const bottom = region.current?.getBoundingClientRect().bottom ?? 0;
        const viewport = window.visualViewport;
        const space = (viewport?.height ?? innerHeight) + (viewport?.offsetTop ?? 0) - bottom - 20;
        region.current?.style.setProperty(
          "--browser-height",
          Math.max(80, Math.min(430, space)) + "px",
        );
      });
    };
    fit();
    window.addEventListener("scroll", fit, { passive: true });
    window.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("resize", fit);
    const outside = (event: PointerEvent) => {
      if (!region.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("scroll", fit);
      window.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("resize", fit);
      cancelAnimationFrame(frame);
    };
  }, [open]);
  return (
    <section
      className="theme-controls"
      ref={region}
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
            <img src={"/worlds/" + model + ".webp"} width={36} height={36} alt="" />
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
          onSelect={onPalette}
        />
      </div>
      <div className="world-browser" id="world-browser" data-open={open}>
        <WorldPicker selected={model} onSelect={onWorld} />
      </div>
    </section>
  );
}
