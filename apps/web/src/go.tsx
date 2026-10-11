import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { EveryQRCode } from "@every-qrcode/react";
import { getPalettesForModel } from "@every-qrcode/renderer-webgpu/world-options";
import { readExperience } from "./experience";
import { StudioIcon } from "./studio-icon";
import { getWorldOption } from "./world-catalog";
import "./styles.css";

function Arrival() {
  const [hash, setHash] = useState(() => window.location.hash);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const update = () => {
      setHash(window.location.hash);
      setFailed(false);
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const experience = useMemo(() => {
    try {
      return readExperience(hash);
    } catch {
      return null;
    }
  }, [hash]);
  const palette = experience
    ? getPalettesForModel(experience.model).find((item) => item.id === experience.paletteId)!
    : null;
  const scene = useMemo(
    () => (palette ? { palette: palette.palette, artDirection: palette.artDirection ?? 0 } : {}),
    [palette],
  );
  return (
    <main className="arrival-shell">
      <header className="arrival-header">
        <span className="brand">
          <StudioIcon name="qr" />
          urbanscan<span className="brand-dot">.</span>
        </span>
      </header>
      {experience ? (
        <>
          <section
            className="arrival-world"
            aria-label={getWorldOption(experience.model).name + " animation"}
          >
            <div className="arrival-art">
              {failed ? (
                <img
                  className="arrival-fallback"
                  src={"/worlds/" + experience.model + ".webp"}
                  alt={getWorldOption(experience.model).name}
                />
              ) : (
                <EveryQRCode
                  key={hash}
                  className="arrival-canvas"
                  url={experience.url}
                  model={experience.model}
                  scene={scene}
                  generatorVersion={3}
                  interactive={false}
                  loadingFallback="none"
                  onError={() => setFailed(true)}
                />
              )}
            </div>
          </section>
          <footer className="arrival-destination">
            <p className="arrival-world-name">{getWorldOption(experience.model).name}</p>
            <p className="arrival-url" title={experience.url}>
              {experience.url}
            </p>
            <a className="primary-button continue-button" href={experience.url} rel="noreferrer">
              Go to link <span aria-hidden="true">↗</span>
            </a>
          </footer>
        </>
      ) : (
        <section className="arrival-invalid">
          <h1>This world link is incomplete</h1>
          <p>Open the full link from your QR code.</p>
          <a href="/">Create a QR</a>
        </section>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Arrival />
  </StrictMode>,
);
