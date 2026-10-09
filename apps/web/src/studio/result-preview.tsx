import { useState } from "react";
import type { QRArtifact } from "@every-qrcode/core";
import {
  EveryQRCode,
  type EveryQRCodeModel,
  type EveryQRCodeSceneConfig,
  type EveryQRCodeView,
} from "@every-qrcode/react";
import { getWorldOption } from "../world-catalog";
import { OutputActions } from "./output-actions";
import { startStudioTiming } from "../studio-diagnostics";

export function ResultPreview({
  artifact,
  revision,
  model,
  scene,
  onSeed,
}: {
  artifact: QRArtifact | null;
  revision: number;
  model: EveryQRCodeModel;
  scene: EveryQRCodeSceneConfig;
  onSeed: (seed: number) => void;
}): React.JSX.Element {
  const [view, setView] = useState<EveryQRCodeView>("model");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [timing] = useState(startStudioTiming);
  const world = getWorldOption(model);
  return (
    <section className="result-preview" id="result" aria-label="Result">
      <div className="result-heading">
        <h2>{world.name}</h2>
        <span className="preview-label">Your preview</span>
      </div>
      <div className="scene-stage">
        {artifact ? (
          <EveryQRCode
            key={retry}
            className="scene-button"
            url={artifact.identity.link.payloadUrl}
            model={model}
            generatorVersion={3}
            scene={scene}
            view={view}
            onViewChange={setView}
            zoom={zoom}
            onZoomChange={setZoom}
            onIdentity={(_identity, seed) => onSeed(seed)}
            onReady={() => {
              timing("world-ready");
              setReady(true);
              setError(null);
            }}
            onError={(reason) => {
              timing("world-fallback");
              setReady(false);
              setError(reason.message);
            }}
          />
        ) : (
          <p className="empty-result">Preparing QR…</p>
        )}
        {artifact && !error && (
          <span className="preview-caption" aria-hidden="true">
            {view === "model" ? "Tap to reveal QR" : "Tap to return to world"}
            <span>↗</span>
          </span>
        )}
      </div>
      <div className="result-meta">
        <p className="committed-destination" aria-label="Committed destination">
          {artifact?.identity.link.payloadUrl ?? " "}
        </p>
        {view === "model" && !ready && !error && artifact && (
          <p className="render-status" role="status">
            Preparing 3D…
          </p>
        )}
        {error && (
          <div className="render-status" role="status">
            <span>3D unavailable. Your QR is ready.</span>
            <button
              type="button"
              onClick={() => {
                setReady(false);
                setError(null);
                setRetry((value) => value + 1);
              }}
            >
              Retry 3D
            </button>
          </div>
        )}
        <div className="result-actions">
          <OutputActions artifact={artifact} revision={revision} />
          {view === "model" && ready && world.replay && (
            <button
              type="button"
              aria-label="Replay world construction"
              onClick={() => {
                setReady(false);
                setError(null);
                setRetry((value) => value + 1);
              }}
            >
              Replay
            </button>
          )}
          {view === "model" && ready && (
            <div className="zoom-controls" aria-label="World zoom">
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => setZoom((value) => Math.max(0.82, value - 0.1))}
                disabled={zoom <= 0.82}
              >
                −
              </button>
              <button type="button" aria-label="Reset zoom" onClick={() => setZoom(1)}>
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => setZoom((value) => Math.min(1.45, value + 0.1))}
                disabled={zoom >= 1.45}
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
