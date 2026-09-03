import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 560,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@every-qrcode/renderer-webgpu": fileURLToPath(
        new URL("../../packages/renderer-webgpu/src/index.ts", import.meta.url),
      ),
      "@every-qrcode/core": fileURLToPath(
        new URL("../../packages/core/src/index.ts", import.meta.url),
      ),
      "@every-qrcode/react": fileURLToPath(
        new URL("../../packages/react/src/index.ts", import.meta.url),
      ),
    },
  },
});
