import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { EveryQRCodeIdentity } from "@every-qrcode/core";

const Inspector = lazy(() =>
  import("./core-inspector").then((module) => ({ default: module.CoreInspector })),
);

export function QRDetailsDialog({
  identity,
}: {
  identity: EveryQRCodeIdentity | null;
}): React.JSX.Element {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
  }, [open]);
  const close = () => {
    dialog.current?.close();
    setOpen(false);
  };
  return (
    <>
      <button
        className="details-trigger"
        type="button"
        disabled={!identity}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        QR details
      </button>
      <dialog
        ref={dialog}
        className="qr-details-dialog"
        aria-labelledby="qr-details-title"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="qr-details-content">
          <div className="dialog-heading">
            <div>
              <h2 id="qr-details-title">QR information</h2>
            </div>
            <button
              autoFocus
              type="button"
              aria-label="Close QR details"
              className="dialog-close"
              onClick={close}
            >
              ×
            </button>
          </div>
          {open && identity && (
            <Suspense fallback={<p>Loading details…</p>}>
              <Inspector identity={identity} />
            </Suspense>
          )}
        </div>
      </dialog>
    </>
  );
}
