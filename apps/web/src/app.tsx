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
import { createDesignedQR } from "./qr-design";
import { createExperienceURL } from "./experience";
import { createWorldScene } from "./world-appearance";

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
    () => createWorldScene(model, selected, appearance),
    [model, selected, appearance],
  );
  useEffect(() => {
    if (!preferencesReady) return;
    document.documentElement.dataset["appearance"] = appearance;
    saveAppearance(appearance);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        "content",
        appearance === "midnight" ? "#09090b" : appearance === "lavender" ? "#f3eff8" : "#f5f1e8",
      );
  }, [appearance, preferencesReady]);
  const exportArtifact = useMemo(
    () => (qr.artifact ? createDesignedQR(qr.artifact, selected.swatches) : null),
    [qr.artifact, selected.swatches],
  );
  const experienceUrl = qr.artifact
    ? createExperienceURL({
        url: qr.artifact.identity.link.payloadUrl,
        model,
        paletteId: selected.id,
        appearance,
      })
    : null;
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
        <p>Choose a world and a palette. Every scan opens your link.</p>
      </div>
      <DestinationForm
        draft={qr.draftUrl}
        pending={qr.pending}
        error={qr.error}
        onChange={qr.setDraftUrl}
        onSubmit={qr.submit}
      />
      <ThemeControls
        dark={appearance === "midnight"}
        model={model}
        paletteId={paletteId}
        selectedPaletteId={selected.id}
        onWorld={selectWorld}
        onPalette={setPaletteId}
      />
      <ResultPreview
        updating={qr.pending}
        invalid={Boolean(qr.error)}
        revision={qr.revision}
        artifact={qr.artifact}
        exportArtifact={exportArtifact}
        experienceUrl={experienceUrl}
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
