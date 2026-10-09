import { useEffect, useRef, useState } from "react";
import type { EveryQRCodeModel } from "@every-qrcode/react";
import { getPalettesForModel } from "@every-qrcode/renderer-webgpu/world-options";
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
  const [panel, setPanel] = useState<"world" | "palette" | null>(null);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 850px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const region = useRef<HTMLElement>(null);
  const worldTrigger = useRef<HTMLButtonElement>(null);
  const paletteTrigger = useRef<HTMLButtonElement>(null);
  const lastTrigger = useRef<"world" | "palette">("world");
  const world = getWorldOption(model);
  const palette = getPalettesForModel(model).find((p) => p.id === selectedPaletteId)!;
  const close = (restore = true) => {
    setPanel(null);
    if (restore)
      (lastTrigger.current === "world" ? worldTrigger : paletteTrigger).current?.focus({
        preventScroll: true,
      });
  };
  useEffect(() => {
    if (!panel) return;
    const fitPanel = () => {
      const bar = region.current?.querySelector(".selection-bar");
      if (!bar) return;
      const viewport = window.visualViewport;
      const bottom = (viewport?.height ?? innerHeight) + (viewport?.offsetTop ?? 0);
      region.current?.style.setProperty(
        "--panel-height",
        Math.max(100, bottom - bar.getBoundingClientRect().bottom - 20) + "px",
      );
    };
    fitPanel();
    window.addEventListener("resize", fitPanel);
    window.addEventListener("scroll", fitPanel, { passive: true });
    window.visualViewport?.addEventListener("resize", fitPanel);
    const outside = (event: PointerEvent) => {
      if (!region.current?.contains(event.target as Node)) setPanel(null);
    };
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", fitPanel);
      window.removeEventListener("scroll", fitPanel);
      window.visualViewport?.removeEventListener("resize", fitPanel);
    };
  }, [panel]);
  const open = (next: "world" | "palette") => {
    lastTrigger.current = next;
    setPanel(panel === next ? null : next);
  };
  const chooseWorld = (next: EveryQRCodeModel) => {
    onWorld(next);
    setPanel("palette");
    // Focus the contextual panel after React commits its new palette choices.
    requestAnimationFrame(() =>
      region.current
        ?.querySelector<HTMLElement>(".palette-card[aria-pressed=true]")
        ?.focus({ preventScroll: true }),
    );
  };
  return (
    <section
      className="theme-controls"
      aria-label="Customize"
      ref={region}
      onKeyDown={(event) => {
        if (event.key === "Escape" && panel) {
          event.preventDefault();
          close();
        }
      }}
    >
      <div className="selection-bar">
        <button
          className="selection-trigger"
          ref={worldTrigger}
          type="button"
          aria-expanded={mobile ? panel === "world" : undefined}
          aria-pressed={!mobile ? panel !== "palette" : undefined}
          aria-controls="theme-panel"
          onClick={() => open("world")}
        >
          <img src={"/worlds/" + model + ".webp"} width={40} height={40} alt="" />
          <span>
            <small>World</small>
            <strong>{world.name}</strong>
          </span>
          <span className="chevron" aria-hidden="true">
            ⌄
          </span>
        </button>
        <button
          className="selection-trigger palette-trigger"
          ref={paletteTrigger}
          type="button"
          aria-expanded={mobile ? panel === "palette" : undefined}
          aria-pressed={!mobile ? panel === "palette" : undefined}
          aria-controls="theme-panel"
          onClick={() => open("palette")}
        >
          <span className="mini-swatches" aria-hidden="true">
            {palette.swatches.slice(0, 3).map((color, i) => (
              <i key={i} style={{ background: color }} />
            ))}
          </span>
          <span>
            <small>Palette</small>
            <strong>{paletteId === "seeded" ? "Match link" : palette.name}</strong>
          </span>
          <span className="chevron" aria-hidden="true">
            ⌄
          </span>
        </button>
      </div>
      <div className="theme-panel" id="theme-panel" data-open={Boolean(panel)}>
        <div className="theme-panel-heading">
          {panel === "palette" ? (
            <button className="back-to-worlds" type="button" onClick={() => setPanel("world")}>
              ← Worlds
            </button>
          ) : (
            <h2>Choose your world</h2>
          )}
          <button
            className="close-theme-panel"
            type="button"
            aria-label="Close selections"
            onClick={() => close()}
          >
            ×
          </button>
        </div>
        {panel === "palette" ? (
          <>
            <h2 className="palette-heading">Colors for {world.name}</h2>
            <PalettePicker
              model={model}
              selected={selectedPaletteId}
              seeded={paletteId === "seeded"}
              onSelect={(id) => {
                onPalette(id);
                close();
              }}
            />
          </>
        ) : (
          <WorldPicker selected={model} onSelect={chooseWorld} />
        )}
      </div>
    </section>
  );
}
