import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import type { EveryQRCodeModel } from "@every-qrcode/react";
import {
  getDefaultPaletteForModel,
  getPalettesForModel,
  selectWorldPalette,
} from "@every-qrcode/renderer-webgpu/world-options";
import { QRDetailsDialog } from "./qr-details-dialog";
import { readAppearance, saveAppearance } from "./studio-preferences";
import { StudioIcon } from "./studio-icon";
import { useQRArtifact } from "./use-qr-artifact";
import { DestinationForm } from "./studio/destination-form";
import { ResultPreview } from "./studio/result-preview";
import { WorldPicker } from "./studio/world-picker";
import { PalettePicker } from "./studio/palette-picker";
import { StudioSettings } from "./studio/studio-settings";

const DEFAULT_LINK = "https://example.com";
export function App(): React.JSX.Element {
  const qr = useQRArtifact(DEFAULT_LINK);
  const [model, setModel] = useState<EveryQRCodeModel>("circuit");
  const [paletteId, setPaletteId] = useState(getDefaultPaletteForModel("circuit").id);
  const [seed, setSeed] = useState<number | null>(null);
  const [tab, setTab] = useState<"world" | "colors">("world");
  const [appearance, setAppearance] = useState(readAppearance);
  const palettes = getPalettesForModel(model);
  const selected =
    palettes.find((palette) => palette.id === paletteId) ??
    (seed === null ? palettes[0]! : selectWorldPalette(model, seed));
  const scene = useMemo(
    () =>
      paletteId === "seeded"
        ? {}
        : { palette: selected.palette, artDirection: selected.artDirection ?? 0 },
    [paletteId, selected],
  );
  useEffect(() => {
    document.documentElement.dataset["appearance"] = appearance;
    saveAppearance(appearance);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        "content",
        appearance === "midnight" ? "#13201c" : appearance === "lavender" ? "#f3eff8" : "#f5f1e8",
      );
  }, [appearance]);
  const selectWorld = (next: EveryQRCodeModel) => {
    if (next === model) return;
    setModel(next);
    setSeed(null);
    setPaletteId(getDefaultPaletteForModel(next).id);
  };
  const tabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? "world"
        : event.key === "End"
          ? "colors"
          : tab === "world"
            ? "colors"
            : "world";
    setTab(next);
    document.getElementById(next + "-tab")?.focus();
  };
  return (
    <main className="studio-shell">
      <header className="studio-header">
        <span className="brand">
          <StudioIcon name="qr" />
          urbanscan<span className="brand-dot">.</span>
        </span>
      </header>
      <div className="studio-intro">
        <h1>QR code generator</h1>
        <p>Turn a link into a 3D world and a scannable QR.</p>
      </div>
      <DestinationForm
        draft={qr.draftUrl}
        pending={qr.pending}
        error={qr.error}
        hasArtifact={Boolean(qr.artifact)}
        onChange={qr.setDraftUrl}
        onSubmit={qr.submit}
      />
      <ResultPreview
        revision={qr.revision}
        key={qr.revision + ":" + model}
        artifact={qr.artifact}
        model={model}
        scene={scene}
        onSeed={setSeed}
      />
      <section className="customization" aria-label="Customize">
        <div className="customization-tabs" role="tablist" aria-label="Customize">
          <button
            id="world-tab"
            type="button"
            role="tab"
            aria-selected={tab === "world"}
            aria-controls="world-panel"
            tabIndex={tab === "world" ? 0 : -1}
            onClick={() => setTab("world")}
            onKeyDown={tabKeyDown}
          >
            World
          </button>
          <button
            id="colors-tab"
            type="button"
            role="tab"
            aria-selected={tab === "colors"}
            aria-controls="colors-panel"
            tabIndex={tab === "colors" ? 0 : -1}
            onClick={() => setTab("colors")}
            onKeyDown={tabKeyDown}
          >
            Colors
          </button>
        </div>
        <div id="world-panel" role="tabpanel" aria-labelledby="world-tab" hidden={tab !== "world"}>
          <WorldPicker selected={model} onSelect={selectWorld} />
        </div>
        <div
          id="colors-panel"
          role="tabpanel"
          aria-labelledby="colors-tab"
          hidden={tab !== "colors"}
        >
          <PalettePicker
            model={model}
            selected={selected.id}
            seeded={paletteId === "seeded"}
            onSelect={setPaletteId}
          />
        </div>
      </section>
      <div className="secondary-tools">
        <QRDetailsDialog identity={qr.artifact?.identity ?? null} />
        <StudioSettings appearance={appearance} onAppearance={setAppearance} />
      </div>
      <footer className="studio-footer">
        <details>
          <summary>About</summary>
          <p>
            UrbanScan creates a scannable QR and a procedural 3D world from a link. Based on Every
            QR Code; improved by drane.
          </p>
        </details>
      </footer>
      <span className="sr-only" role="status">
        {qr.artifact ? "QR ready for " + qr.artifact.identity.link.payloadUrl : ""}
      </span>
    </main>
  );
}
