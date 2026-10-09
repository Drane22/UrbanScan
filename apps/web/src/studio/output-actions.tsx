import type { QRArtifact } from "@every-qrcode/core";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  canShareQR,
  createQRDownloads,
  createQRExportState,
  encodeQRSVG,
  QR_EXPORT_SIZES,
  shareQR,
  type QRExportSize,
} from "../qr-export";

export function OutputActions({
  artifact,
  revision,
}: {
  artifact: QRArtifact | null;
  revision: number;
}): React.JSX.Element {
  const [size, setSize] = useState<QRExportSize>(1024);
  const [exports] = useState(createQRExportState);
  const [downloads] = useState(createQRDownloads);
  const state = useSyncExternalStore(exports.subscribe, exports.getSnapshot, exports.getSnapshot);
  const [feedback, setFeedback] = useState<{
    artifact: QRArtifact;
    error?: string;
    status?: string;
    selectable?: boolean;
  } | null>(null);
  const [sharing, setSharing] = useState(false);
  const [retry, setRetry] = useState(0);
  const current = useRef(artifact);
  current.current = artifact;
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      exports.cancel();
      downloads.dispose();
    };
  }, [exports, downloads]);
  useEffect(() => {
    if (artifact) void exports.prepare(artifact, revision, size);
    else exports.cancel();
    return exports.cancel;
  }, [artifact, revision, size, retry, exports]);
  const prepared =
    state.prepared?.artifact === artifact &&
    state.prepared.revision === revision &&
    state.prepared.size === size
      ? state.prepared
      : null;
  const message = feedback?.artifact === artifact ? feedback : null;
  const fail = (error: string) => {
    if (artifact) setFeedback({ artifact, error });
  };
  const download = (svg: boolean) => {
    if (!artifact || (!svg && !prepared)) return;
    try {
      downloads.download(
        svg ? encodeQRSVG(artifact) : prepared!.file,
        svg ? "urbanscan-qr.svg" : "urbanscan-qr.png",
      );
      setFeedback({ artifact, status: "Download started." });
    } catch {
      fail("Could not start download. Try again.");
    }
  };
  const share = () => {
    if (!artifact || !prepared || sharing) return;
    setSharing(true);
    const result = shareQR(prepared.file);
    void result
      .then(
        (outcome) => {
          if (mounted.current && current.current === artifact)
            setFeedback({
              artifact,
              status: outcome === "cancelled" ? "Sharing cancelled." : "Share request completed.",
            });
        },
        () => {
          if (mounted.current && current.current === artifact)
            fail("Could not share image. Download PNG instead.");
        },
      )
      .finally(() => {
        if (mounted.current) setSharing(false);
      });
  };
  const copy = async () => {
    if (!artifact) return;
    try {
      await navigator.clipboard.writeText(artifact.identity.link.payloadUrl);
      if (mounted.current && current.current === artifact)
        setFeedback({ artifact, status: "Link copied." });
    } catch {
      if (mounted.current && current.current === artifact)
        setFeedback({
          artifact,
          error: "Could not copy. Select the destination below.",
          selectable: true,
        });
    }
  };
  return (
    <div className="output-actions">
      <button
        type="button"
        className="primary-button"
        disabled={!prepared}
        onClick={() => download(false)}
      >
        Download PNG
      </button>
      <label className="export-size">
        PNG size
        <select
          aria-label="PNG size"
          value={size}
          onChange={(event) => setSize(Number(event.target.value) as QRExportSize)}
        >
          {QR_EXPORT_SIZES.map((value) => (
            <option key={value} value={value}>
              {value} px
            </option>
          ))}
        </select>
      </label>
      <button type="button" disabled={!artifact} onClick={() => download(true)}>
        Download SVG
      </button>
      {prepared && canShareQR(prepared.file) && (
        <button type="button" disabled={sharing} onClick={share}>
          {sharing ? "Sharing…" : "Share"}
        </button>
      )}
      <button type="button" disabled={!artifact} onClick={() => void copy()}>
        Copy link
      </button>
      {state.pending && <span role="status">Preparing PNG…</span>}
      {state.error && (
        <p className="field-error" role="alert">
          {state.error}{" "}
          <button type="button" onClick={() => setRetry((value) => value + 1)}>
            Retry PNG
          </button>
        </p>
      )}
      {message?.error && (
        <p className="field-error" role="alert">
          {message.error}
        </p>
      )}
      {message?.status && <span role="status">{message.status}</span>}
      {message?.selectable && artifact && (
        <label className="copy-destination">
          Destination
          <input
            aria-label="Copy destination"
            readOnly
            value={artifact.identity.link.payloadUrl}
            onFocus={(event) => event.currentTarget.select()}
          />
        </label>
      )}
    </div>
  );
}
