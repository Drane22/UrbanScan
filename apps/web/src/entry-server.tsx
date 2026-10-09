import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { App } from "./app";
export { createSiteMetadata, renderSiteMetadata } from "./site-metadata";

export function render(): string {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
