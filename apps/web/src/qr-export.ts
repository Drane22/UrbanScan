import { getQRRasterLayout, serializeQRSvg, type QRArtifact } from "@every-qrcode/core";

export const QR_EXPORT_SIZES = [512, 1024, 2048] as const;
export type QRExportSize = (typeof QR_EXPORT_SIZES)[number];

export function encodeQRPNG(artifact: QRArtifact, size: QRExportSize): Promise<Blob> {
  if (!QR_EXPORT_SIZES.includes(size)) throw new RangeError("Unsupported PNG size");
  const matrix = artifact.identity.qr;
  const { modulePx, margin } = getQRRasterLayout(matrix.size, size);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare PNG. Try again.");
  context.imageSmoothingEnabled = false;
  context.fillStyle = "#fff";
  context.fillRect(0, 0, size, size);
  context.fillStyle = "#000";
  for (let row = 0; row < matrix.size; row++)
    for (let column = 0; column < matrix.size; column++)
      if (matrix.cells[row * matrix.size + column] === 1)
        context.fillRect(
          margin + (column + 4) * modulePx,
          margin + (row + 4) * modulePx,
          modulePx,
          modulePx,
        );
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      canvas.width = canvas.height = 0;
      if (blob?.type === "image/png") resolve(blob);
      else reject(new Error("Could not prepare PNG. Try again."));
    }, "image/png");
  });
}

export function encodeQRSVG(artifact: QRArtifact): Blob {
  return new Blob([serializeQRSvg(artifact)], { type: "image/svg+xml" });
}

export type PreparedQRExport = {
  artifact: QRArtifact;
  revision: number;
  size: QRExportSize;
  file: File;
};
type ExportState = { pending: boolean; prepared: PreparedQRExport | null; error: string | null };
export function createQRExportState(encode = encodeQRPNG) {
  let state: ExportState = { pending: false, prepared: null, error: null };
  let ticket = 0;
  const listeners = new Set<() => void>();
  const publish = (next: ExportState) => {
    state = next;
    for (const listener of listeners) listener();
  };
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    cancel() {
      ticket++;
      publish({ pending: false, prepared: null, error: null });
    },
    async prepare(artifact: QRArtifact, revision: number, size: QRExportSize) {
      const request = ++ticket;
      publish({ pending: true, prepared: null, error: null });
      try {
        const blob = await encode(artifact, size);
        if (request !== ticket) return;
        const file = new File([blob], "urbanscan-qr.png", { type: "image/png" });
        publish({ pending: false, prepared: { artifact, revision, size, file }, error: null });
      } catch {
        if (request === ticket)
          publish({ pending: false, prepared: null, error: "Could not prepare PNG. Try again." });
      }
    },
  };
}

/** Call directly during the user gesture, using an already prepared file. */
export function canShareQR(file: File): boolean {
  try {
    return (
      typeof navigator.share === "function" && navigator.canShare?.({ files: [file] }) === true
    );
  } catch {
    return false;
  }
}
export function shareQR(file: File): Promise<"opened" | "cancelled"> {
  try {
    return navigator.share({ files: [file] }).then(
      () => "opened" as const,
      (reason: unknown) => {
        if (reason instanceof Error && reason.name === "AbortError") return "cancelled" as const;
        throw reason;
      },
    );
  } catch (reason) {
    return Promise.reject(reason);
  }
}

/** Bound object URLs to the download dispatch and component lifetime. */
export function createQRDownloads() {
  const urls = new Map<string, ReturnType<typeof setTimeout>>();
  return {
    download(blob: Blob, filename: "urbanscan-qr.png" | "urbanscan-qr.svg") {
      const anchor = document.createElement("a");
      const url = URL.createObjectURL(blob);
      try {
        anchor.href = url;
        anchor.download = filename;
        document.body.append(anchor);
        anchor.click();
      } catch (reason) {
        URL.revokeObjectURL(url);
        throw reason;
      } finally {
        anchor.remove();
      }
      urls.set(
        url,
        setTimeout(() => {
          URL.revokeObjectURL(url);
          urls.delete(url);
        }, 1000),
      );
    },
    dispose() {
      for (const [url, timer] of urls) {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
      }
      urls.clear();
    },
  };
}
