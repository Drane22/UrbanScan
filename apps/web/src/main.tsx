import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";

import { App } from "@/app";
import "@/styles.css";

const root = document.querySelector<HTMLDivElement>("#root");
if (!root) throw new Error("Every QR Code root element is missing.");

const app = (
  <StrictMode>
    <App />
  </StrictMode>
);
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
