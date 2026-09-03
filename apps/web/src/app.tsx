import { createEveryQRCodeIdentity, type EveryQRCodeIdentity } from "@every-qrcode/core";
import { EveryQRCode, type EveryQRCodeModel } from "@every-qrcode/react";
import type { SeedScenePalette } from "@every-qrcode/renderer-webgpu";
import { useDeferredValue, useEffect, useState } from "react";

import { CoreInspector } from "@/core-inspector";

const DEFAULT_LINK = "https://example.com";

export type PaletteOption = {
  readonly id: string;
  readonly name: string;
  readonly palette: SeedScenePalette;
  readonly swatches: readonly [string, string, string];
};

export const PALETTES: readonly PaletteOption[] = [
  {
    id: "natural",
    name: "Natural Jade",
    palette: [
      [0.14, 0.24, 0.16],
      [0.82, 0.58, 0.38],
      [0.93, 0.77, 0.52],
      [0.31, 0.43, 0.18],
      [0.965, 0.945, 0.906],
    ],
    swatches: ["#243d29", "#d19461", "#4f6e2e"],
  },
  {
    id: "cyberpunk",
    name: "Cyber Neon",
    palette: [
      [0.06, 0.08, 0.18],
      [0.98, 0.12, 0.52],
      [0.12, 0.88, 0.95],
      [0.55, 0.18, 0.85],
      [0.95, 0.95, 0.98],
    ],
    swatches: ["#0f142e", "#fa1f85", "#1fe0f2"],
  },
  {
    id: "synthwave",
    name: "Sunset Synth",
    palette: [
      [0.22, 0.08, 0.16],
      [0.95, 0.35, 0.22],
      [0.98, 0.82, 0.24],
      [0.72, 0.18, 0.45],
      [0.98, 0.96, 0.92],
    ],
    swatches: ["#381429", "#f25938", "#fad13d"],
  },
  {
    id: "oceanic",
    name: "Deep Oceanic",
    palette: [
      [0.05, 0.12, 0.28],
      [0.18, 0.65, 0.92],
      [0.42, 0.88, 0.82],
      [0.12, 0.35, 0.65],
      [0.93, 0.96, 0.98],
    ],
    swatches: ["#0d1f47", "#2ea6eb", "#6be0d1"],
  },
  {
    id: "monochrome",
    name: "Monochrome Pro",
    palette: [
      [0.1, 0.11, 0.14],
      [0.55, 0.58, 0.65],
      [0.85, 0.88, 0.92],
      [0.32, 0.35, 0.42],
      [0.98, 0.98, 0.98],
    ],
    swatches: ["#1a1c24", "#8c94a6", "#d9e0eb"],
  },
  {
    id: "sakura",
    name: "Sakura Blossom",
    palette: [
      [0.28, 0.12, 0.18],
      [0.92, 0.45, 0.62],
      [0.98, 0.78, 0.85],
      [0.65, 0.22, 0.38],
      [0.98, 0.95, 0.96],
    ],
    swatches: ["#471f2e", "#eb739e", "#fbc7d9"],
  },
  {
    id: "gilded",
    name: "Obsidian Gold",
    palette: [
      [0.08, 0.08, 0.1],
      [0.92, 0.75, 0.25],
      [0.98, 0.88, 0.52],
      [0.45, 0.38, 0.18],
      [0.96, 0.95, 0.92],
    ],
    swatches: ["#14141a", "#ebbf40", "#fbe085"],
  },
  {
    id: "emerald",
    name: "Emerald Forest",
    palette: [
      [0.04, 0.22, 0.12],
      [0.18, 0.85, 0.45],
      [0.92, 0.78, 0.28],
      [0.12, 0.55, 0.35],
      [0.94, 0.97, 0.94],
    ],
    swatches: ["#0a381f", "#2ed973", "#ebc747"],
  },
];

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
  const [model, setModel] = useState<EveryQRCodeModel>("tree");
  const [paletteId, setPaletteId] = useState<string>("natural");
  const [identity, setIdentity] = useState<EveryQRCodeIdentity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const deferredInput = useDeferredValue(input);
  const resolvedInput = deferredInput.trim() || DEFAULT_LINK;

  const currentPalette = PALETTES.find((p) => p.id === paletteId) ?? PALETTES[0]!;

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
                onClick={() => setModel(option)}
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
          scene={{ palette: currentPalette.palette }}
          url={resolvedInput}
        />
      </section>

      <div className="input-region">
        <section className="palette-region" aria-label="Color Palette">
          <div className="palette-header">
            <span className="palette-title">Color Palette:</span>
            <span className="palette-active-name">{currentPalette.name}</span>
          </div>
          <div className="palette-selector">
            {PALETTES.map((p) => (
              <button
                aria-pressed={p.id === paletteId}
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
