import { parseLink, type EveryQRCodeIdentity } from "@every-qrcode/core";
import { EveryQRCode, type EveryQRCodeModel, type EveryQRCodeView } from "@every-qrcode/react";
import {
  getDefaultPaletteForModel,
  getPalettesForModel,
  selectWorldPalette,
} from "@every-qrcode/renderer-webgpu/world-options";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QRDetailsDialog } from "@/qr-details-dialog";
import { APPEARANCES, readAppearance, saveAppearance } from "@/studio-preferences";
import { StudioIcon } from "@/studio-icon";
import {
  getWorldOption,
  WORLD_CATALOG,
  WORLD_CATEGORIES,
  type WorldCategory,
} from "@/world-catalog";

const DEFAULT_LINK = "https://example.com";
const SAMPLES = [
  { name: "Tokyo", url: "https://metro.tokyo.jp" },
  { name: "NASA", url: "https://nasa.gov" },
  { name: "GitHub", url: "https://github.com" },
];

export function App(): React.JSX.Element {
  const [draftUrl, setDraftUrl] = useState(DEFAULT_LINK);
  const [url, setUrl] = useState(DEFAULT_LINK);
  const [model, setModel] = useState<EveryQRCodeModel>("circuit");
  const [category, setCategory] = useState<WorldCategory>("All");
  const [paletteId, setPaletteId] = useState(getDefaultPaletteForModel("circuit").id);
  const [morphSeed, setMorphSeed] = useState<number | null>(null);
  const [identity, setIdentity] = useState<EveryQRCodeIdentity | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [replay, setReplay] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState<EveryQRCodeView>("model");
  const [appearance, setAppearance] = useState(readAppearance);
  const warmTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const option = getWorldOption(model);
  const palettes = getPalettesForModel(model);
  const palette =
    palettes.find((preset) => preset.id === paletteId) ??
    (morphSeed === null ? palettes[0]! : selectWorldPalette(model, morphSeed));
  const scene = useMemo(
    () =>
      paletteId === "seeded"
        ? {}
        : { palette: palette.palette, artDirection: palette.artDirection ?? 0 },
    [paletteId, palette],
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
  useEffect(() => () => clearTimeout(warmTimer.current), []);
  const cancelWarmup = () => clearTimeout(warmTimer.current);
  const warmWorld = (next: EveryQRCodeModel) => {
    cancelWarmup();
    warmTimer.current = setTimeout(() => {
      void import("@every-qrcode/renderer-webgpu")
        .then((renderer) => renderer.preloadSeedTheme(next))
        .catch(() => {
          /* A real mount retries and reports failures. */
        });
    }, 120);
  };
  const resetPreview = () => {
    setReady(false);
    setRenderError(null);
    setView("model");
    setZoom(1);
  };
  const selectWorld = (next: EveryQRCodeModel) => {
    if (next === model) return;
    cancelWarmup();
    resetPreview();
    setModel(next);
    setPaletteId(
      getWorldOption(next).seededPalette ? "seeded" : getDefaultPaletteForModel(next).id,
    );
  };
  const generate = (value: string) => {
    try {
      const submitted = parseLink(value.trim()).payloadUrl;
      setInputError(null);
      setDraftUrl(submitted);
      if (submitted === url) return;
      resetPreview();
      setIdentity(null);
      setMorphSeed(null);
      setUrl(submitted);
    } catch (error) {
      setInputError(error instanceof Error ? error.message : "Enter a valid HTTP or HTTPS link.");
    }
  };
  const handleIdentity = useCallback((next: EveryQRCodeIdentity, seed: number) => {
    setIdentity(next);
    setMorphSeed(seed);
  }, []);
  const handleReady = useCallback(() => {
    setReady(true);
    setRenderError(null);
  }, []);
  const retry = () => {
    resetPreview();
    setReplay((value) => value + 1);
  };

  return (
    <main className="studio-shell">
      <header className="studio-header">
        <a className="brand" href="#studio" aria-label="urbanscan studio">
          <span className="brand-mark">
            <StudioIcon name="qr" />
          </span>
          <span>
            urbanscan<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="header-tools">
          <label className="appearance-control">
            <span className="sr-only">App appearance</span>
            <select
              aria-label="App appearance"
              value={appearance}
              onChange={(event) =>
                setAppearance(APPEARANCES.find((value) => value === event.target.value) ?? "paper")
              }
            >
              {APPEARANCES.map((value) => (
                <option key={value} value={value}>
                  {value[0]!.toUpperCase() + value.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <QRDetailsDialog identity={identity} />
        </div>
      </header>
      <div className="studio-intro" id="studio">
        <div>
          <p className="eyebrow">
            <span className="status-dot" /> The link-to-world studio
          </p>
          <h1>
            Every link has
            <br />a little world inside.
          </h1>
        </div>
        <p className="intro-note">
          Make it yours.
          <br />
          Choose a world. Find its colors.
          <br />
          Reveal a QR that takes you somewhere.
        </p>
      </div>
      <div className="studio-grid">
        <section className="preview-shell" aria-label="World preview">
          <div className="preview-core">
            <div className="preview-heading">
              <div>
                <p className="eyebrow">
                  {option.category} / {view === "qr" ? "QR view" : "World view"}
                </p>
                <h2>
                  {option.name}
                  <span className="live-badge">
                    {renderError ? "Paused" : ready ? "Live" : "Preparing"}
                  </span>
                </h2>
              </div>
              <span className="preview-symbol">
                <StudioIcon name={option.mark} />
              </span>
            </div>
            <div className="scene-stage">
              <EveryQRCode
                key={replay}
                className="scene-button"
                model={model}
                url={url}
                scene={scene}
                zoom={zoom}
                onZoomChange={setZoom}
                view={view}
                onViewChange={setView}
                onIdentity={handleIdentity}
                onReady={handleReady}
                onError={(error) => {
                  setRenderError(error.message);
                  setReady(false);
                }}
              />
              {!ready && !renderError && (
                <div className="scene-loading" role="status">
                  <span className="loading-orbit" />
                  <span>Growing your {option.name.toLowerCase()}…</span>
                </div>
              )}
            </div>
            <div className="preview-caption">
              <span>{option.description}</span>
              <span className="tap-hint">
                {renderError ? "Try again to prepare your world" : "Tap the world to transform it"}
              </span>
            </div>
            <div className="preview-toolbar">
              <button
                className="primary-button reveal-button"
                type="button"
                disabled={!ready || Boolean(renderError)}
                onClick={() => setView(view === "model" ? "qr" : "model")}
              >
                <StudioIcon name={view === "model" ? "qr" : option.mark} />
                <span>{view === "model" ? "Reveal QR" : "Restore world"}</span>
                <span className="button-island">
                  <StudioIcon name="arrow" />
                </span>
              </button>
              <div className="zoom-controls" aria-label="Preview zoom">
                <button
                  aria-label="Zoom out"
                  type="button"
                  disabled={!ready || zoom <= 0.82}
                  onClick={() => setZoom((value) => Math.max(0.82, value - 0.1))}
                >
                  <StudioIcon name="minus" />
                </button>
                <button
                  aria-label="Reset zoom"
                  type="button"
                  disabled={!ready}
                  onClick={() => setZoom(1)}
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  aria-label="Zoom in"
                  type="button"
                  disabled={!ready || zoom >= 1.45}
                  onClick={() => setZoom((value) => Math.min(1.45, value + 0.1))}
                >
                  <StudioIcon name="plus" />
                </button>
              </div>
              {option.replay && (
                <button
                  className="icon-button replay-button"
                  type="button"
                  aria-label="Replay world construction"
                  title="Replay construction"
                  disabled={!ready}
                  onClick={retry}
                >
                  <StudioIcon name="replay" />
                </button>
              )}
            </div>
            {renderError && (
              <div className="render-error" role="alert">
                <p>{renderError}</p>
                <button className="text-button" type="button" onClick={retry}>
                  Retry 3D world <StudioIcon name="replay" />
                </button>
              </div>
            )}
          </div>
          <div className="preview-footnote">
            <span className="status-dot" />
            <span>One link. One identity. A world that is yours.</span>
            <span>{WORLD_CATALOG.length} worlds to explore</span>
          </div>
        </section>
        <aside className="editor-shell" aria-label="World settings">
          <div className="editor-core">
            <section className="editor-section destination-section">
              <div className="section-heading">
                <span className="step-number">01</span>
                <h2>Start with a link</h2>
              </div>
              <p className="section-description">Where should your world take someone?</p>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  generate(draftUrl);
                }}
              >
                <label className="field-label" htmlFor="qr-content">
                  Destination URL
                </label>
                <div className="input-bezel">
                  <input
                    id="qr-content"
                    className="url-input"
                    value={draftUrl}
                    onChange={(event) => {
                      setDraftUrl(event.target.value);
                      setInputError(null);
                    }}
                    placeholder="example.com"
                    inputMode="url"
                    autoCapitalize="none"
                    autoComplete="url"
                    spellCheck={false}
                    aria-invalid={Boolean(inputError)}
                    aria-describedby={inputError ? "input-error" : "destination-hint"}
                  />
                </div>
                <p id="destination-hint" className="field-hint">
                  Editing keeps your current world. Generate when ready.
                </p>
                {inputError && (
                  <p id="input-error" className="input-error" role="alert">
                    {inputError}
                  </p>
                )}
                <button type="submit" className="primary-button generate-button">
                  <span>Generate world</span>
                  <span className="button-island">
                    <StudioIcon name="arrow" />
                  </span>
                </button>
              </form>
              <div className="sample-links">
                <span>Try</span>
                {SAMPLES.map((sample) => (
                  <button
                    type="button"
                    className="sample-chip"
                    key={sample.name}
                    onClick={() => generate(sample.url)}
                  >
                    {sample.name}
                    <span aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
            </section>
            <section className="editor-section">
              <div className="section-heading">
                <span className="step-number">02</span>
                <h2>Choose your world</h2>
                <span className="section-count">{WORLD_CATALOG.length}</span>
              </div>
              <div className="category-tabs" aria-label="World categories">
                {WORLD_CATEGORIES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={category === value}
                    onClick={() => setCategory(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <div className="world-picker" aria-label="World style">
                {WORLD_CATALOG.filter(
                  (world) => category === "All" || world.category === category,
                ).map((world) => (
                  <button
                    key={world.id}
                    type="button"
                    className="world-card"
                    aria-pressed={model === world.id}
                    title={world.description}
                    onClick={() => selectWorld(world.id)}
                    onPointerEnter={() => warmWorld(world.id)}
                    onPointerLeave={cancelWarmup}
                    onFocus={() => warmWorld(world.id)}
                    onBlur={cancelWarmup}
                  >
                    <StudioIcon name={world.mark} />
                    <span>{world.name}</span>
                    {model === world.id && <span className="selection-dot" />}
                  </button>
                ))}
              </div>
            </section>
            <section className="editor-section palette-section">
              <div className="section-heading">
                <span className="step-number">03</span>
                <h2>Find your colors</h2>
              </div>
              <div className="palette-heading">
                <span>{palette.name}</span>
                {option.seededPalette && (
                  <button
                    type="button"
                    className="text-button"
                    aria-pressed={paletteId === "seeded"}
                    onClick={() => setPaletteId("seeded")}
                  >
                    Match this link <span aria-hidden="true">↗</span>
                  </button>
                )}
              </div>
              <div className="palette-picker" aria-label="World palette">
                {palettes.map((preset) => (
                  <button
                    type="button"
                    key={preset.id}
                    className="palette-card"
                    aria-pressed={paletteId !== "seeded" && palette.id === preset.id}
                    title={preset.description}
                    onClick={() => setPaletteId(preset.id)}
                  >
                    <span className="palette-swatches" aria-hidden="true">
                      {preset.swatches.map((color, index) => (
                        <span key={index} style={{ backgroundColor: color }} />
                      ))}
                    </span>
                    <span>{preset.name}</span>
                    {paletteId !== "seeded" && palette.id === preset.id && (
                      <span className="selection-dot" />
                    )}
                  </button>
                ))}
              </div>
              <p className="palette-description">{palette.description}</p>
            </section>
          </div>
        </aside>
      </div>
      <footer className="studio-footer">
        <span>Procedural worlds. Real destinations.</span>
        <span>Made with curiosity · improved by drane</span>
      </footer>
    </main>
  );
}
