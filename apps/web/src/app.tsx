import { useEffect, useMemo, useState } from "react";
import type { EveryQRCodeModel } from "@every-qrcode/react";
import {
  getDefaultPaletteForModel,
  getPalettesForModel,
  selectWorldPalette,
} from "@every-qrcode/renderer-webgpu/world-options";
import { QRDetailsDialog } from "./qr-details-dialog";
import { readAppearance, saveAppearance, type Appearance } from "./studio-preferences";
import { StudioIcon } from "./studio-icon";
import { useQRArtifact } from "./use-qr-artifact";
import { DestinationForm } from "./studio/destination-form";
import { ResultPreview } from "./studio/result-preview";
import { ThemeControls } from "./studio/theme-controls";
import { recordStudioEvent } from "./studio-diagnostics";
import { StudioSettings } from "./studio/studio-settings";

const DEFAULT_LINK = "https://example.com";
export function App(): React.JSX.Element {
  const qr = useQRArtifact(DEFAULT_LINK);
  const [model, setModel] = useState<EveryQRCodeModel>("circuit");
  const [paletteId, setPaletteId] = useState(getDefaultPaletteForModel("circuit").id);
  const [seed, setSeed] = useState<number | null>(null);
  const [appearance, setAppearance] = useState<Appearance>("paper");
  const [preferencesReady, setPreferencesReady] = useState(false);
  useEffect(() => {
    setAppearance(readAppearance());
    setPreferencesReady(true);
    recordStudioEvent("controls-ready");
  }, []);
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
    if (!preferencesReady) return;
    document.documentElement.dataset["appearance"] = appearance;
    saveAppearance(appearance);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        "content",
        appearance === "midnight" ? "#13201c" : appearance === "lavender" ? "#f3eff8" : "#f5f1e8",
      );
  }, [appearance, preferencesReady]);
  const selectWorld = (next: EveryQRCodeModel) => {
    if (next === model) return;
    setModel(next);
    setSeed(null);
    setPaletteId(getDefaultPaletteForModel(next).id);
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
      <ThemeControls
        model={model}
        paletteId={paletteId}
        selectedPaletteId={selected.id}
        onWorld={selectWorld}
        onPalette={setPaletteId}
      />
      <ResultPreview
        revision={qr.revision}
        key={qr.revision + ":" + model}
        artifact={qr.artifact}
        model={model}
        scene={scene}
        onSeed={setSeed}
      />
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
          <p>
            Paste a destination, choose a world and colors, then download your QR as PNG or SVG. QR
            generation and downloads run in your browser. The optional 3D preview needs WebGPU; the
            scannable QR works without it. Your destination is encoded directly in the QR.
          </p>
        </details>
      </footer>
      <span className="sr-only" role="status">
        {qr.artifact ? "QR ready for " + qr.artifact.identity.link.payloadUrl : ""}
      </span>
    </main>
  );
}
