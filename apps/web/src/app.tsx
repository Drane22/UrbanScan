import type { EveryQRCodeIdentity } from "@every-qrcode/core";
import { EveryQRCode, type EveryQRCodeModel } from "@every-qrcode/react";
import {
  getDefaultPaletteForModel,
  selectWorldPalette,
  isStagedWorld,
  getPalettesForModel,
  type WorldPalettePreset,
} from "@every-qrcode/renderer-webgpu/world-options";
import { useCallback, useEffect, useMemo, useState } from "react";

import { QRDetailsDialog } from "@/qr-details-dialog";

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
  colony: { desc: "Underground chambers & tunnels", icon: "🧫", label: "Colony" },
  constellation: {
    desc: "Fantasy planets, moons and cosmic flybys",
    icon: "🪐",
    label: "Solar System",
  },
  dungeon: { desc: "Isometric stone labyrinth", icon: "🗝️", label: "Dungeon" },
  mycelium: { desc: "Living fungal forest and root chambers", icon: "🍄", label: "Mycelium" },
  origami: { desc: "Flying paper cranes and folded gardens", icon: "📄", label: "Origami" },
  reef: { desc: "Underwater coral aquarium", icon: "🪸", label: "Reef" },
  "stained-glass": {
    desc: "Kinetic glass pavilion and hanging prisms",
    icon: "🔮",
    label: "Stained Glass",
  },
  terrain: { desc: "Surreal crystal ridges and moving rivers", icon: "🏔️", label: "Terrain" },
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
  const [morphSeed, setMorphSeed] = useState<number | null>(null);
  const [replay, setReplay] = useState(0);
  const [identity, setIdentity] = useState<EveryQRCodeIdentity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolvedInput, setResolvedInput] = useState(DEFAULT_LINK);
  useEffect(() => {
    const timer = setTimeout(() => setResolvedInput(input.trim() || DEFAULT_LINK), 350);
    return () => clearTimeout(timer);
  }, [input]);
  const seededDefault = useMemo(
    () => (morphSeed === null ? null : selectWorldPalette(model, morphSeed)),
    [model, morphSeed],
  );

  const currentPalettes = getPalettesForModel(model);
  const currentPalette: WorldPalettePreset =
    currentPalettes.find((p) => p.id === paletteId) ??
    (isStagedWorld(model) || model === "terrain" ? seededDefault : null) ??
    currentPalettes[0]!;

  const handleSelectModel = (nextModel: EveryQRCodeModel) => {
    setModel(nextModel);
    const defaultForNext = getDefaultPaletteForModel(nextModel);
    setPaletteId(
      isStagedWorld(nextModel) || nextModel === "terrain" ? "seeded" : defaultForNext.id,
    );
  };

  useEffect(() => {
    setIdentity(null);
    setMorphSeed(null);
    setError(null);
  }, [resolvedInput]);

  const handleIdentity = useCallback((nextIdentity: EveryQRCodeIdentity, seed: number) => {
    setMorphSeed(seed);
    setIdentity(nextIdentity);
    setError(null);
  }, []);

  const scene = useMemo(
    () =>
      (isStagedWorld(model) || model === "terrain") && paletteId === "seeded"
        ? {}
        : { palette: currentPalette.palette, artDirection: currentPalette.artDirection ?? 0 },
    [model, paletteId, currentPalette],
  );

  return (
    <main className="demo-shell">
      <header className="brand-header">
        <div className="brand-title-row">
          <h1 className="brand-title">urbanscan</h1>
          <span className="brand-badge">v1.2</span>
        </div>
        <p className="brand-attribution">Modified and improved by drane</p>
        <QRDetailsDialog identity={identity} />
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
          key={replay}
          className="scene-button"
          model={model}
          onError={(rendererError) => setError(rendererError.message)}
          onIdentity={handleIdentity}
          scene={scene}
          url={resolvedInput}
        />
      </section>

      <div className="input-region">
        <section className="palette-region" aria-label="Color Palette">
          <div className="palette-header">
            <span className="palette-title">{MODEL_INFO[model].label} Palette:</span>
            <span className="palette-active-name">{currentPalette.name}</span>
            {(isStagedWorld(model) || model === "terrain") && (
              <div className="scene-actions">
                <button
                  className="preset-chip"
                  type="button"
                  onClick={() => setReplay((value) => value + 1)}
                >
                  Replay
                </button>
                <button
                  className="preset-chip"
                  type="button"
                  aria-pressed={paletteId === "seeded"}
                  onClick={() => setPaletteId("seeded")}
                >
                  Link palette
                </button>
              </div>
            )}
          </div>
          <div className="palette-selector">
            {currentPalettes.map((p) => (
              <button
                aria-pressed={p.id === currentPalette.id}
                className="palette-button"
                key={p.id}
                onClick={() => setPaletteId(p.id)}
                title={p.description ?? p.name}
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

        <p className="palette-description">{currentPalette.description}</p>
        <form
          className="url-input-wrapper"
          onSubmit={(event) => {
            event.preventDefault();
            setResolvedInput(input.trim() || DEFAULT_LINK);
          }}
        >
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
          <select
            aria-label="Try a sample destination"
            className="sample-select"
            value=""
            onChange={(event) => {
              if (event.target.value) {
                setInput(event.target.value);
                setResolvedInput(event.target.value);
              }
            }}
          >
            <option value="" disabled>
              Try a link
            </option>
            {PRESET_URLS.map((preset) => (
              <option key={preset.label} value={preset.url}>
                {preset.label}
              </option>
            ))}
          </select>
          <button className="generate-button" type="submit">
            Generate
          </button>
        </form>
        {error && (
          <p role="alert" className="input-error">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
