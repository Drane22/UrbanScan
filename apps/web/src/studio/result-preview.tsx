import { useEffect, useState } from "react";
import type { QRArtifact } from "@every-qrcode/core";
import {
  EveryQRCode,
  type EveryQRCodeModel,
  type EveryQRCodeSceneConfig,
  type EveryQRCodeView,
} from "@every-qrcode/react";
import { getWorldOption } from "../world-catalog";
import { OutputActions } from "./output-actions";
import type { DesignedQRArtifact } from "../qr-design";
import { startStudioTiming } from "../studio-diagnostics";
import { StudioIcon } from "../studio-icon";

export function ResultPreview({
  artifact,
  exportArtifact,
  experienceUrl,
  revision,
  model,
  scene,
  onSeed,
  updating,
  invalid,
}: {
  artifact: QRArtifact | null;
  exportArtifact: DesignedQRArtifact | null;
  experienceUrl: string | null;
  revision: number;
  model: EveryQRCodeModel;
  scene: EveryQRCodeSceneConfig;
  onSeed: (seed: number) => void;
  updating: boolean;
  invalid: boolean;
}): React.JSX.Element {
  const [view, setView] = useState<EveryQRCodeView>("model");
  const [readyKey, setReadyKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const defaultZoom = 1;
  const [zoom, setZoom] = useState(defaultZoom);
  const [timing] = useState(startStudioTiming);
  const key = revision + ":" + model + ":" + retry;
  const ready = readyKey === key && !error;
  const world = getWorldOption(model);
  useEffect(() => {
    setView("model");
    setError(null);
    setZoom(defaultZoom);
  }, [model, revision, defaultZoom]);
  const shownView = ready ? view : "model";
  return (
    <section className="result-preview" id="result" aria-label="Result">
      <div className="result-heading">
        <h2>{world.name}</h2>
        <span className="preview-label" role="status">
          {error ? "QR ready" : ready ? "Live preview" : "Building your world…"}
        </span>
      </div>
      <div className="scene-stage">
        {artifact && (
          <EveryQRCode
            key={retry}
            className="scene-button"
            url={artifact.identity.link.payloadUrl}
            model={model}
            generatorVersion={3}
            scene={scene}
            view={shownView}
            loadingFallback="qr"
            fallbackColors={exportArtifact?.inks ?? []}
            interactive={ready}
            onViewChange={setView}
            zoom={zoom}
            onZoomChange={setZoom}
            onIdentity={(_identity, seed) => onSeed(seed)}
            onReady={() => {
              timing("world-ready");
              setReadyKey(key);
              setError(null);
            }}
            onError={(reason) => {
              timing("world-fallback");
              setError(reason.message);
            }}
          />
        )}
        {!artifact && !error && (
          <div className="world-loading" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>
      <div className="preview-hint" aria-hidden="true">
        {ready && !error && (
          <span className="preview-caption">
            {shownView === "model" ? "Tap to reveal QR" : "Tap to return to world"}
            <span>↗</span>
          </span>
        )}
      </div>
      <div className="preview-toolbar">
        {error ? (
          <div className="preview-fallback">
            <span>{exportArtifact ? "3D unavailable. Your QR is ready." : "3D unavailable."}</span>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setRetry((value) => value + 1);
              }}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <button
              className="reveal-button"
              type="button"
              disabled={!ready}
              onClick={() => setView((current) => (current === "model" ? "qr" : "model"))}
            >
              {shownView === "model" ? "Reveal QR" : "Restore world"}
            </button>
            {world.replay && (
              <button
                className="replay-button"
                type="button"
                aria-label="Replay world construction"
                disabled={!ready || shownView !== "model"}
                onClick={() => {
                  setView("model");
                  setRetry((value) => value + 1);
                }}
              >
                <StudioIcon name="replay" />
                <span className="replay-label">Replay</span>
              </button>
            )}
            <div className="zoom-controls" aria-label="World zoom">
              <button
                type="button"
                aria-label="Zoom out"
                disabled={!ready || shownView !== "model" || zoom <= 0.82}
                onClick={() => setZoom((value) => Math.max(0.82, value - 0.1))}
              >
                −
              </button>
              <button
                type="button"
                aria-label="Reset zoom"
                disabled={!ready || shownView !== "model"}
                onClick={() => setZoom(1)}
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                aria-label="Zoom in"
                disabled={!ready || shownView !== "model" || zoom >= 1.45}
                onClick={() => setZoom((value) => Math.min(1.45, value + 0.1))}
              >
                +
              </button>
            </div>
          </>
        )}
      </div>
      <div className="result-meta">
        <OutputActions
          artifact={updating || invalid ? null : exportArtifact}
          updating={updating}
          invalid={invalid}
          revision={revision}
          destination={artifact?.identity.link.payloadUrl}
        />
        <div className="scan-destination">
          <span>
            {updating || invalid ? "Previous QR destination" : "Scanning opens this link directly"}
          </span>
          <p className="committed-destination" aria-label="Committed destination">
            {artifact?.identity.link.payloadUrl ?? " "}
          </p>
        </div>
        {experienceUrl && (
          <a className="preview-arrival" href={experienceUrl} target="_blank" rel="noreferrer">
            Open world experience <span aria-hidden="true">↗</span>
          </a>
        )}
        <p className="experience-note">
          The world experience is a separate page. Your downloaded QR opens your link directly.
        </p>
      </div>
    </section>
  );
}
