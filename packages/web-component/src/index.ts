import {
  CURRENT_GENERATOR_VERSION,
  createQRArtifact,
  resolveGeneratorVersion,
  type GeneratorVersion,
  type IdentityScope,
  type QRArtifact,
} from "@every-qrcode/core";

import { replaceRendererCanvas } from "./renderer-canvas.js";

export const EVERY_QR_CODE_TAG = "every-qr-code";
export { CURRENT_GENERATOR_VERSION };

const TEMPLATE = `
  <style>
    :host { aspect-ratio: 1; display: block; width: 100%; }
    button { position: relative; background: transparent; border: 0; cursor: pointer; height: 100%;
      padding: 0; width: 100%; }
    button[aria-disabled="true"] { cursor: default; }
    canvas, svg { display: block; height: 100%; width: 100%; }
    svg { position: absolute; inset: 0; }
    canvas[hidden], svg[hidden] { display: none; }
  </style>
  <button aria-label="Reveal the QR code" type="button">
    <canvas></canvas>
    <svg aria-hidden="true" hidden shape-rendering="crispEdges">
      <rect fill="#fff"></rect>
      <path fill="#111"></path>
    </svg>
  </button>
`;

type EveryQRCodeView = "model" | "qr";
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

type SeedRenderer = {
  dispose: () => void;
  resize: () => void;
  setFlat: (flat: boolean) => void;
};

function readView(element: HTMLElement): EveryQRCodeView {
  return element.getAttribute("initial-view") === "qr" ? "qr" : "model";
}

function readScope(element: HTMLElement): IdentityScope {
  return element.getAttribute("identity-scope") === "url" ? "url" : "site";
}

function readGeneratorVersion(element: HTMLElement): GeneratorVersion {
  const value = element.getAttribute("generator-version");
  return resolveGeneratorVersion(value === null ? undefined : Number(value));
}

const VALID_MODELS: ReadonlySet<string> = new Set([
  "city",
  "circuit",
  "colony",
  "constellation",
  "dungeon",
  "mycelium",
  "origami",
  "reef",
  "stained-glass",
  "terrain",
  "toy-block",
  "waves",
  "crystalline",
  "mechanical",
  "tree",
]);

export function resolveEveryQRCodeModel(model: string | null): EveryQRCodeModel {
  if (model && VALID_MODELS.has(model)) {
    return model as EveryQRCodeModel;
  }
  return "tree";
}

function readModel(element: HTMLElement): EveryQRCodeModel {
  return resolveEveryQRCodeModel(element.getAttribute("model"));
}

function isInteractive(element: HTMLElement): boolean {
  return element.getAttribute("interactive") !== "false";
}

function errorFrom(reason: unknown): Error {
  return reason instanceof Error ? reason : new Error("Every QR Code could not render this URL.");
}

function createElementConstructor(): CustomElementConstructor {
  return class EveryQRCodeElement extends HTMLElement {
    static get observedAttributes(): string[] {
      return ["generator-version", "identity-scope", "initial-view", "interactive", "model", "url"];
    }
    private readonly button: HTMLButtonElement;
    private canvas: HTMLCanvasElement;
    private readonly fallbackBackground: SVGRectElement;
    private readonly fallbackPath: SVGPathElement;
    private readonly fallbackSvg: SVGSVGElement;
    private artifact: QRArtifact | null = null;
    private failed = false;
    private ready = false;
    private renderer: SeedRenderer | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private revision = 0;
    private view: EveryQRCodeView = "model";

    constructor() {
      super();
      const root = this.attachShadow({ mode: "open" });
      root.innerHTML = TEMPLATE;
      this.button = root.querySelector("button") as HTMLButtonElement;
      this.canvas = root.querySelector("canvas") as HTMLCanvasElement;
      this.fallbackSvg = root.querySelector("svg") as SVGSVGElement;
      this.fallbackBackground = root.querySelector("rect") as SVGRectElement;
      this.fallbackPath = root.querySelector("path") as SVGPathElement;
    }
    connectedCallback(): void {
      this.button.addEventListener("click", this.toggle);
      this.syncControls();
      void this.renderSeed();
    }
    disconnectedCallback(): void {
      this.button.removeEventListener("click", this.toggle);
      this.revision++;
      this.disposeRenderer();
    }
    attributeChangedCallback(name: string): void {
      if (!this.isConnected) return;
      if (["generator-version", "url", "identity-scope", "model"].includes(name)) {
        void this.renderSeed();
        return;
      }
      this.syncControls();
    }
    private readonly toggle = (): void => {
      if (!isInteractive(this) || this.failed) return;
      this.view = this.view === "model" ? "qr" : "model";
      this.syncControls(false);
      this.dispatchEvent(
        new CustomEvent("every-qrcode-viewchange", {
          bubbles: true,
          composed: true,
          detail: { view: this.view },
        }),
      );
    };
    private syncControls(resetView = true): void {
      if (resetView) this.view = readView(this);
      const visible = this.artifact !== null && (this.view === "qr" || this.failed || !this.ready);
      this.button.ariaDisabled = String(!isInteractive(this) || this.failed);
      this.button.ariaBusy = String(!this.artifact && !this.failed);
      this.button.ariaLabel =
        this.failed && visible
          ? "QR code fallback"
          : this.view === "model"
            ? "Reveal the QR code"
            : "Restore the " + readModel(this);
      this.canvas.style.visibility = visible ? "hidden" : "visible";
      this.fallbackSvg.toggleAttribute("hidden", !visible);
      this.dataset["everyQrcodeStatus"] = this.failed ? "error" : this.ready ? "ready" : "loading";
      if (this.artifact) {
        const qr = this.artifact.svg;
        this.fallbackSvg.setAttribute("viewBox", "0 0 " + qr.size + " " + qr.size);
        this.fallbackBackground.setAttribute("height", String(qr.size));
        this.fallbackBackground.setAttribute("width", String(qr.size));
        this.fallbackPath.setAttribute("d", qr.path);
      } else {
        this.fallbackPath.removeAttribute("d");
      }
      this.renderer?.setFlat(this.view === "qr");
    }
    private async renderSeed(): Promise<void> {
      const revision = ++this.revision;
      const current = () => revision === this.revision && this.isConnected;
      this.disposeRenderer();
      this.artifact = null;
      this.failed = false;
      this.ready = false;
      const model = readModel(this);
      this.canvas = replaceRendererCanvas(this.canvas, model);
      this.syncControls();
      const fail = (reason: unknown) => {
        if (!current() || this.failed) return;
        this.failed = true;
        this.ready = false;
        this.disposeRenderer();
        this.syncControls(false);
        this.dispatchEvent(
          new CustomEvent("every-qrcode-error", { detail: { error: errorFrom(reason) } }),
        );
      };
      try {
        const artifact = await createQRArtifact(this.getAttribute("url") ?? "", readScope(this));
        if (!current()) return;
        this.artifact = artifact;
        this.syncControls(false);
        this.dispatchEvent(
          new CustomEvent<QRArtifact>("qr-ready", {
            detail: artifact,
            bubbles: true,
            composed: true,
          }),
        );
        if (!current()) return;
        const generatorVersion = readGeneratorVersion(this);
        const { createSeedModel, mountSeed } = await import("@every-qrcode/renderer-webgpu");
        if (!current()) return;
        const seed = await createSeedModel(artifact.identity, { generatorVersion });
        if (!current()) return;
        const renderer = mountSeed(this.canvas, seed, {}, model, {
          onError: fail,
          onReady: () => {
            if (!current() || this.failed) return;
            this.ready = true;
            this.syncControls(false);
            this.dispatchEvent(new CustomEvent("every-qrcode-ready"));
          },
        });
        if (!current() || this.failed) {
          renderer.dispose();
          return;
        }
        this.renderer = renderer;
        this.syncControls(false);
        renderer.resize();
        if (typeof ResizeObserver !== "undefined") {
          this.resizeObserver = new ResizeObserver(() => {
            if (current() && !this.failed) renderer.resize();
          });
          this.resizeObserver.observe(this.canvas);
        }
      } catch (reason) {
        fail(reason);
      }
    }
    private disposeRenderer(): void {
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;
      this.renderer?.dispose();
      this.renderer = null;
    }
  };
}

export function defineEveryQRCodeElement(tagName = EVERY_QR_CODE_TAG): boolean {
  if (typeof customElements === "undefined" || typeof HTMLElement === "undefined") return false;
  if (customElements.get(tagName)) return false;
  customElements.define(tagName, createElementConstructor());
  return true;
}
