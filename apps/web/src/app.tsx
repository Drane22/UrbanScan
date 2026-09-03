import { createEveryQRCodeIdentity, type EveryQRCodeIdentity } from "@every-qrcode/core";
import { EveryQRCode, type EveryQRCodeModel } from "@every-qrcode/react";
import {
  getDefaultPaletteForModel,
  getPalettesForModel,
  type WorldPalettePreset,
} from "@every-qrcode/renderer-webgpu";
import { useDeferredValue, useEffect, useState } from "react";

import { CoreInspector } from "@/core-inspector";

const DEFAULT_LINK = "https://example.com";

const MODELS: readonly EveryQRCodeModel[] = [
  "tree",
  "terrain",
  "city",
  "circuit",
  "reef",
  "colony",
  "dungeon",
  "origami",
  "stained-glass",
  "mycelium",
  "constellation",
  "toy-block",
];

const MODEL_INFO: Readonly<
  Record<EveryQRCodeModel, { label: string; icon: string; desc: string }>
> = {
  city: { desc: "Skyscrapers & plazas", icon: "🏙️", label: "City" },
  circuit: { desc: "Motherboard & IC chips", icon: "⚡", label: "Circuit" },
  colony: { desc: "Lunar habitat settlement", icon: "🚀", label: "Colony" },
  constellation: { desc: "Deep space star map", icon: "✨", label: "Constellation" },
  dungeon: { desc: "Isometric stone labyrinth", icon: "🗝️", label: "Dungeon" },
  mycelium: { desc: "Bioluminescent fungal forest", icon: "🍄", label: "Mycelium" },
  origami: { desc: "Folded washi paper panels", icon: "📄", label: "Origami" },
  reef: { desc: "Underwater coral aquarium", icon: "🪸", label: "Reef" },
  "stained-glass": { desc: "Cathedral rose glass", icon: "🔮", label: "Stained Glass" },
  terrain: { desc: "Topographic relief terrain", icon: "🏔️", label: "Terrain" },
  "toy-block": { desc: "Modular brick diorama", icon: "🧱", label: "Toy Block" },
  tree: { desc: "Procedural blooming tree", icon: "🌳", label: "Tree" },
};

const PRESET_URLS = [
  { label: "Tokyo", url: "https://metro.tokyo.jp" },
  { label: "Wikipedia", url: "https://en.wikipedia.org" },
  { label: "GitHub", url: "https://github.com" },
  { label: "NASA", url: "https://nasa.gov" },
  { label: "Kyoto", url: "https://kyoto.travel" },
];

export function App(): React.JSX.Element {
  const [input, setInput] = useState(DEFAULT_LINK);
  const [model, setModel] = useState<EveryQRCodeModel>("circuit");
  const [paletteId, setPaletteId] = useState<string>(() => getDefaultPaletteForModel("circuit").id);
  const [identity, setIdentity] = useState<EveryQRCodeIdentity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const deferredInput = useDeferredValue(input);
  const resolvedInput = deferredInput.trim() || DEFAULT_LINK;

  const currentPalettes = getPalettesForModel(model);
  const currentPalette: WorldPalettePreset =
    currentPalettes.find((p) => p.id === paletteId) ?? currentPalettes[0]!;

  const handleSelectModel = (nextModel: EveryQRCodeModel) => {
    setModel(nextModel);
    const defaultForNext = getDefaultPaletteForModel(nextModel);
    setPaletteId(defaultForNext.id);
  };

  useEffect(() => {
    let cancelled = false;
    void createEveryQRCodeIdentity(resolvedInput)
      .then((nextIdentity) => {
        if (cancelled) return;
        setIdentity(nextIdentity);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : "urbanscan could not read that link.");
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedInput]);

  return (
    <main className="demo-shell">
      <header className="brand-header">
        <div className="brand-title-row">
          <h1 className="brand-title">urbanscan</h1>
          <span className="brand-badge">v1.2</span>
        </div>
        <p className="brand-attribution">Modified and improved by drane</p>
      </header>

      <section className="scene-region">
        <nav aria-label="World archetype" className="model-picker">
          {MODELS.map((option) => {
            const info = MODEL_INFO[option];
            return (
              <button
                aria-pressed={option === model}
                className="model-pill"
                key={option}
                onClick={() => handleSelectModel(option)}
                title={info.desc}
                type="button"
              >
                <span className="model-icon">{info.icon}</span>
                <span className="model-text">{info.label}</span>
              </button>
            );
          })}
        </nav>

        <EveryQRCode
          className="scene-button"
          model={model}
          onError={(rendererError) => setError(rendererError.message)}
          scene={{ palette: currentPalette.palette }}
          url={resolvedInput}
        />
      </section>

      <div className="input-region">
        <section className="palette-region" aria-label="Color Palette">
          <div className="palette-header">
            <span className="palette-title">{MODEL_INFO[model].label} Palette:</span>
            <span className="palette-active-name">{currentPalette.name}</span>
          </div>
          <div className="palette-selector">
            {currentPalettes.map((p) => (
              <button
                aria-pressed={p.id === currentPalette.id}
                className="palette-button"
                key={p.id}
                onClick={() => setPaletteId(p.id)}
                title={p.name}
                type="button"
              >
                <div className="palette-swatches">
                  {p.swatches.map((color, idx) => (
                    <span className="swatch-dot" key={idx} style={{ backgroundColor: color }} />
                  ))}
                </div>
                <span className="palette-label">{p.name}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="preset-chips" aria-label="Sample destinations">
          <span className="preset-title">Presets:</span>
          {PRESET_URLS.map((preset) => (
            <button
              className="preset-chip"
              key={preset.label}
              onClick={() => setInput(preset.url)}
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="url-input-wrapper">
          <label className="sr-only" htmlFor="qr-content">
            URL to render
          </label>
          <input
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            className="url-input"
            id="qr-content"
            inputMode="url"
            onChange={(event) => {
              setInput(event.target.value);
            }}
            placeholder="https://example.com"
            spellCheck={false}
            value={input}
          />
        </div>

        <p aria-live="polite" className="input-error">
          {error}
        </p>

        {identity ? <CoreInspector identity={identity} /> : null}
      </div>
    </main>
  );
}
