import { useEffect, useMemo, useState } from "react";
import type { EveryQRCodeModel } from "@every-qrcode/react";
import {
  getDefaultPaletteForModel,
  getPalettesForModel,
  selectWorldPalette,
} from "@every-qrcode/renderer-webgpu/world-options";
import { readAppearance, saveAppearance, type Appearance } from "./studio-preferences";
import { StudioIcon } from "./studio-icon";
import { useQRArtifact } from "./use-qr-artifact";
import { DestinationForm } from "./studio/destination-form";
import { ResultPreview } from "./studio/result-preview";
import { ThemeControls } from "./studio/theme-controls";
import { recordStudioEvent } from "./studio-diagnostics";
import { StudioSettings } from "./studio/studio-settings";
import { WORLD_CATALOG } from "./world-catalog";
import { useExperienceQR } from "./use-experience-qr";

const DEFAULT_LINK = "https://example.com";
export function App(): React.JSX.Element {
  const qr = useQRArtifact(DEFAULT_LINK);
  const [model, setModel] = useState<EveryQRCodeModel>("circuit");
  const [paletteId, setPaletteId] = useState(getDefaultPaletteForModel("circuit").id);
  const [paletteChoices, setPaletteChoices] = useState<Record<string, string>>({});
  const [seed, setSeed] = useState<number | null>(null);
  const [appearance, setAppearance] = useState<Appearance>("paper");
  const [preferencesReady, setPreferencesReady] = useState(false);
  useEffect(() => {
    setAppearance(readAppearance());
    try {
      const saved = JSON.parse(localStorage.getItem("urbanscan.design") ?? "null");
      if (saved && WORLD_CATALOG.some((world) => world.id === saved.model)) {
        const choices = typeof saved.palettes === "object" && saved.palettes ? saved.palettes : {};
        const valid =
          choices[saved.model] === "seeded" ||
          getPalettesForModel(saved.model).some((p) => p.id === choices[saved.model]);
        setModel(saved.model);
        setPaletteChoices(choices);
        setPaletteId(valid ? choices[saved.model] : getDefaultPaletteForModel(saved.model).id);
      }
    } catch {
      /* Storage is optional. */
    }
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
  const experience = useExperienceQR(qr.artifact, model, selected.id, selected.swatches);
  useEffect(() => {
    if (!preferencesReady) return;
    try {
      localStorage.setItem(
        "urbanscan.design",
        JSON.stringify({ model, palettes: { ...paletteChoices, [model]: paletteId } }),
      );
    } catch {
      /* Storage is optional. */
    }
  }, [preferencesReady, model, paletteId, paletteChoices]);
  const selectWorld = (next: EveryQRCodeModel) => {
    if (next === model) return;
    setModel(next);
    setSeed(null);
    const remembered = paletteChoices[next];
    setPaletteChoices((choices) => ({ ...choices, [model]: paletteId }));
    setPaletteId(
      remembered === "seeded" || getPalettesForModel(next).some((p) => p.id === remembered)
        ? remembered!
        : getDefaultPaletteForModel(next).id,
    );
  };
  return (
    <main className="studio-shell">
      <header className="studio-header">
        <span className="brand">
          <StudioIcon name="qr" />
          urbanscan<span className="brand-dot">.</span>
        </span>
        <StudioSettings appearance={appearance} onAppearance={setAppearance} />
      </header>
      <div className="studio-intro">
        <h1>Give your QR a world.</h1>
        <p>Choose a world and a palette. Every scan opens your creation.</p>
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
        artifact={qr.artifact}
        exportArtifact={experience.artifact}
        exportError={experience.error}
        model={model}
        scene={scene}
        onSeed={setSeed}
      />
      <span className="sr-only" role="status">
        {qr.artifact ? "QR ready for " + qr.artifact.identity.link.payloadUrl : ""}
      </span>
    </main>
  );
}
