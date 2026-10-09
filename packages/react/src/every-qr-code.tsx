import {
  CURRENT_GENERATOR_VERSION,
  createQRArtifact,
  type EveryQRCodeIdentity,
  type GeneratorVersion,
  type IdentityScope,
  type QRSvgPath,
  type QRArtifact,
} from "@every-qrcode/core";
import type { SeedSceneConfig } from "@every-qrcode/renderer-webgpu";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

import { nextEveryQRCodeView } from "./every-qr-code-view.js";

export type EveryQRCodeView = "model" | "qr";
export type EveryQRCodeModel =
  | "city"
  | "circuit"
  | "colony"
  | "constellation"
  | "dungeon"
  | "mycelium"
  | "origami"
  | "reef"
  | "stained-glass"
  | "terrain"
  | "toy-block"
  | "waves"
  | "crystalline"
  | "mechanical"
  | "tree";
export type EveryQRCodeSceneConfig = SeedSceneConfig;
export type EveryQRCodeGeneratorVersion = GeneratorVersion;

export type EveryQRCodeProps = {
  readonly className?: string;
  readonly generatorVersion?: EveryQRCodeGeneratorVersion;
  readonly identityScope?: IdentityScope;
  readonly initialView?: EveryQRCodeView;
  readonly initialZoom?: number;
  readonly interactive?: boolean;
  readonly model?: EveryQRCodeModel;
  readonly onError?: (error: Error) => void;
  readonly onIdentity?: (identity: EveryQRCodeIdentity, morphSeed: number) => void;
  readonly onReady?: () => void;
  readonly onQRReady?: (artifact: QRArtifact) => void;
  readonly onViewChange?: (view: EveryQRCodeView) => void;
  readonly onZoomChange?: (zoom: number) => void;
  readonly scene?: EveryQRCodeSceneConfig;
  readonly style?: CSSProperties;
  readonly url: string;
  readonly view?: EveryQRCodeView;
  readonly zoom?: number;
};

type SeedRenderer = {
  dispose: () => void;
  resize: () => void;
  setFlat: (flat: boolean) => void;
  setScene: (scene: EveryQRCodeSceneConfig) => void;
  setZoom: (zoom: number) => void;
};

type PreparedSeed = {
  readonly identity: EveryQRCodeIdentity;
  readonly morphSeed: number;
  mount: (
    canvas: HTMLCanvasElement,
    scene: EveryQRCodeSceneConfig,
    onError: (error: Error) => void,
    onReady: () => void,
  ) => SeedRenderer;
  readonly qr: QRSvgPath;
};

const CANVAS_STYLE: CSSProperties = {
  display: "block",
  height: "100%",
  width: "100%",
};

const ERROR_STYLE: CSSProperties = {
  alignItems: "center",
  color: "#555",
  display: "flex",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: "0.75rem",
  inset: "12%",
  justifyContent: "center",
  lineHeight: 1.5,
  position: "absolute",
  textAlign: "center",
};

const FALLBACK_STYLE: CSSProperties = {
  display: "block",
  height: "100%",
  inset: 0,
  position: "absolute",
  width: "100%",
};

const HIDDEN_STYLE: CSSProperties = {
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  whiteSpace: "nowrap",
  width: 1,
};

const ROOT_STYLE: CSSProperties = {
  aspectRatio: "1",
  background: "transparent",
  border: 0,
  display: "block",
  padding: 0,
  position: "relative",
  width: "100%",
};

function clampZoom(zoom: number): number {
  return Math.max(0.82, Math.min(1.45, zoom));
}

function useSeedZoom(options: {
  readonly generatorVersion: EveryQRCodeGeneratorVersion;
  readonly initialZoom: number;
  readonly model: EveryQRCodeModel;
  readonly onZoomChange?: ((zoom: number) => void) | undefined;
  readonly rendererRef: { current: SeedRenderer | null };
  readonly url: string;
  readonly zoom?: number | undefined;
}): {
  readonly handleKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  readonly zoom: number;
  readonly zoomRef: { current: number };
} {
  const zoomRef = useRef(clampZoom(options.initialZoom));
  const [internalZoom, setZoom] = useState(zoomRef.current);
  const zoom = clampZoom(options.zoom ?? internalZoom);
  const onZoomChangeRef = useRef(options.onZoomChange);
  useEffect(() => {
    onZoomChangeRef.current = options.onZoomChange;
  }, [options.onZoomChange]);
  useEffect(
    () => setZoom(clampZoom(options.initialZoom)),
    [options.generatorVersion, options.initialZoom, options.model, options.url],
  );
  useEffect(() => {
    zoomRef.current = zoom;
    options.rendererRef.current?.setZoom(zoom);
  }, [options.rendererRef, zoom]);
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>) => {
    const positive = event.key === "+" || event.key === "=";
    const negative = event.key === "-" || event.key === "_";
    const direction = positive ? 1 : negative ? -1 : 0;
    if (direction === 0 && event.key !== "0") return;
    event.preventDefault();
    const next = event.key === "0" ? 1 : clampZoom(zoomRef.current + direction * 0.1);
    zoomRef.current = next;
    setZoom(next);
    onZoomChangeRef.current?.(next);
  }, []);
  return { handleKeyDown, zoom, zoomRef };
}

function errorFrom(reason: unknown): Error {
  return reason instanceof Error ? reason : new Error("Every QR Code could not render this URL.");
}

type PreparedSource = {
  identity: EveryQRCodeIdentity;
  morphSeed: number;
  mount: (
    canvas: HTMLCanvasElement,
    scene: EveryQRCodeSceneConfig,
    onError: (error: Error) => void,
    onReady: () => void,
    form: EveryQRCodeModel,
  ) => SeedRenderer;
  qr: QRSvgPath;
};
const preparedSources = new Map<string, Promise<PreparedSource>>();

async function prepareSeed(
  generatorVersion: EveryQRCodeGeneratorVersion,
  identityScope: IdentityScope,
  url: string,
  model: EveryQRCodeModel,
  artifact: QRArtifact,
): Promise<PreparedSeed> {
  const key = JSON.stringify([generatorVersion, identityScope, url]);
  let source = preparedSources.get(key);
  if (!source) {
    source = (async () => {
      const { createSeedModel, mountSeed } = await import("@every-qrcode/renderer-webgpu");
      const seed = await createSeedModel(artifact.identity, { generatorVersion });
      return {
        identity: artifact.identity,
        morphSeed: seed.morphSeed,
        qr: artifact.svg,
        mount: (canvas, scene, onError, onReady, form) =>
          mountSeed(canvas, seed, scene, form, { onError, onReady }),
      } satisfies PreparedSource;
    })();
    preparedSources.set(key, source);
    if (preparedSources.size > 8) preparedSources.delete(preparedSources.keys().next().value!);
    const pending = source;
    void pending.catch(() => {
      if (preparedSources.get(key) === pending) preparedSources.delete(key);
    });
  }
  const value = await source;
  return {
    ...value,
    mount: (canvas, scene, onError, onReady) => value.mount(canvas, scene, onError, onReady, model),
  };
}

export function EveryQRCode({
  className,
  generatorVersion = CURRENT_GENERATOR_VERSION,
  identityScope = "site",
  initialView = "model",
  initialZoom = 1,
  interactive = true,
  model = "tree",
  onError,
  onIdentity,
  onReady,
  onQRReady,
  onViewChange,
  onZoomChange,
  scene,
  style,
  url,
  view: controlledView,
  zoom: controlledZoom,
}: EveryQRCodeProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<SeedRenderer | null>(null);
  const callbacks = useRef({ onError, onIdentity, onReady, onQRReady });
  callbacks.current = { onError, onIdentity, onReady, onQRReady };
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  const key = JSON.stringify([generatorVersion, identityScope, model, url]);
  const currentKey = useRef(key);
  currentKey.current = key;
  const [state, setState] = useState<{
    key: string;
    artifact: QRArtifact | null;
    error: Error | null;
    ready: boolean;
  }>({ key, artifact: null, error: null, ready: false });
  const artifact = state.key === key ? state.artifact : null;
  const error = state.key === key ? state.error : null;
  const ready = state.key === key && state.ready;
  const [internalView, setView] = useState<EveryQRCodeView>(initialView);
  const view = controlledView ?? internalView;
  const viewRef = useRef(view);
  viewRef.current = view;
  const { handleKeyDown, zoom, zoomRef } = useSeedZoom({
    generatorVersion,
    initialZoom,
    model,
    onZoomChange,
    rendererRef,
    url,
    zoom: controlledZoom,
  });

  useEffect(() => setView(initialView), [generatorVersion, initialView, url]);
  useEffect(() => {
    let active = true;
    let failed = false;
    let renderer: SeedRenderer | null = null;
    let observer: ResizeObserver | null = null;
    const current = () => active && currentKey.current === key;
    const fail = (reason: unknown) => {
      if (!current() || failed) return;
      failed = true;
      const error = errorFrom(reason);
      setState((state) => ({ ...state, error, ready: false }));
      observer?.disconnect();
      renderer?.dispose();
      if (rendererRef.current === renderer) rendererRef.current = null;
      callbacks.current.onError?.(error);
    };
    setState({ key, artifact: null, error: null, ready: false });
    void (async () => {
      const nextArtifact = await createQRArtifact(url, identityScope);
      if (!current()) return;
      setState({ key, artifact: nextArtifact, error: null, ready: false });
      callbacks.current.onQRReady?.(nextArtifact);
      if (!current()) return;
      const prepared = await prepareSeed(generatorVersion, identityScope, url, model, nextArtifact);
      if (!current()) return;
      callbacks.current.onIdentity?.(prepared.identity, prepared.morphSeed);
      if (!current() || !canvasRef.current) return;
      renderer = prepared.mount(canvasRef.current, sceneRef.current ?? {}, fail, () => {
        if (!current() || failed) return;
        setState((state) => ({ ...state, ready: true }));
        callbacks.current.onReady?.();
      });
      if (!current() || failed) {
        renderer.dispose();
        return;
      }
      rendererRef.current = renderer;
      renderer.setFlat(viewRef.current === "qr");
      renderer.setZoom(zoomRef.current);
      renderer.resize();
      if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(() => {
          if (current() && !failed) renderer?.resize();
        });
        observer.observe(canvasRef.current);
      }
    })().catch(fail);
    return () => {
      active = false;
      observer?.disconnect();
      renderer?.dispose();
      if (rendererRef.current === renderer) rendererRef.current = null;
    };
  }, [generatorVersion, identityScope, key, model, url, zoomRef]);
  useEffect(() => {
    rendererRef.current?.setScene(scene ?? {});
  }, [scene]);
  useEffect(() => {
    rendererRef.current?.setFlat(view === "qr");
  }, [view]);
  const toggle = useCallback(() => {
    if (!interactive || error) return;
    const next = nextEveryQRCodeView(view);
    setView(next);
    onViewChange?.(next);
  }, [error, interactive, onViewChange, view]);
  const qr = artifact && (view === "qr" || error || !ready) ? artifact.svg : null;

  return (
    <button
      aria-busy={!artifact && !error}
      aria-disabled={!interactive || Boolean(error)}
      aria-keyshortcuts="+ - 0"
      aria-label={
        error && qr
          ? "QR code fallback"
          : view === "model"
            ? "Reveal the QR code"
            : "Restore the " + model
      }
      className={className}
      data-every-qrcode-fallback={error && qr ? "qr" : undefined}
      data-every-qrcode-status={error ? "error" : ready ? "ready" : "loading"}
      data-every-qrcode-generator-version={generatorVersion}
      data-every-qrcode-model={model}
      data-every-qrcode-view={view}
      data-every-qrcode-zoom={zoom.toFixed(2)}
      onClick={toggle}
      onKeyDown={handleKeyDown}
      style={{ ...ROOT_STYLE, ...style }}
      type="button"
    >
      <canvas
        key={key}
        data-every-qrcode-canvas={model}
        ref={canvasRef}
        style={{ ...CANVAS_STYLE, visibility: qr ? "hidden" : "visible" }}
      />
      {qr && (
        <svg
          aria-hidden="true"
          shapeRendering="crispEdges"
          style={FALLBACK_STYLE}
          viewBox={"0 0 " + qr.size + " " + qr.size}
        >
          <rect fill="#fff" height={qr.size} width={qr.size} />
          <path d={qr.path} fill="#000" />
        </svg>
      )}
      {error && !qr && <span style={ERROR_STYLE}>{error.message}</span>}
      <span aria-live="polite" style={HIDDEN_STYLE}>
        {error?.message ?? (view === "model" ? model + " view" : "QR code view")}
      </span>
    </button>
  );
}
