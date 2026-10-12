import { createExportQRMatrix, createQRSvgPath, type QRArtifact } from "@every-qrcode/core";
import { useEffect, useMemo, useState } from "react";
import type { EveryQRCodeModel } from "@every-qrcode/react";
import { createExperienceURL } from "./experience";
import { createQRInks, type DesignedQRArtifact } from "./qr-design";

export function useExperienceQR(
  destination: QRArtifact | null,
  model: EveryQRCodeModel,
  paletteId: string,
  swatches: readonly string[],
) {
  const url = destination?.identity.link.payloadUrl ?? "";
  const [state, setState] = useState<{
    key: string;
    artifact: DesignedQRArtifact | null;
    error: string | null;
  }>({ key: "", artifact: null, error: null });
  const key = JSON.stringify([url, model, paletteId]);
  const inks = useMemo(() => createQRInks(swatches), [swatches]);
  useEffect(() => {
    let active = true;
    if (!url) return;
    void (async () => {
      try {
        const payloadUrl = createExperienceURL({ url, model, paletteId });
        const matrix = createExportQRMatrix(payloadUrl);
        const artifact = {
          identity: { link: { payloadUrl }, qr: matrix },
          svg: createQRSvgPath(matrix),
        };
        if (active) setState({ key, artifact: { ...artifact, inks }, error: null });
      } catch {
        if (active)
          setState({
            key,
            artifact: null,
            error: "This link is too long for a themed QR. Shorten the destination and try again.",
          });
      }
    })();
    return () => {
      active = false;
    };
  }, [key, url, model, paletteId, inks]);
  return {
    artifact: state.key === key ? state.artifact : null,
    error: state.key === key ? state.error : null,
  };
}
