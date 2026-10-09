import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
// Resolve Vite from the demo workspace, where it is a declared dependency.
import { createRequire } from "node:module";
const root = fileURLToPath(new URL("../apps/web/", import.meta.url));
const require = createRequire(path.join(root, "package.json"));
const { createServer, loadEnv } = await import(pathToFileURL(require.resolve("vite")).href);
const server = await createServer({ root, server: { middlewareMode: true }, appType: "custom" });
try {
  const { render, createSiteMetadata, renderSiteMetadata } =
    await server.ssrLoadModule("/src/entry-server.tsx");
  const origin = process.env.SITE_ORIGIN ?? loadEnv("production", root, "SITE_").SITE_ORIGIN;
  const metadata = createSiteMetadata(origin);
  const dist = path.join(root, "dist");
  const htmlPath = path.join(dist, "index.html");
  const template = await fs.readFile(htmlPath, "utf8");
  if (!template.includes('<div id="root"></div>') || !template.includes("<!--studio-metadata-->"))
    throw new Error("Missing pristine studio prerender markers; run vite build first.");
  // Fail the build rather than publish metadata pointing to a missing social image.
  const image = await fs.readFile(path.join(dist, "og-image.png"));
  if (image.readUInt32BE(16) !== 1200 || image.readUInt32BE(20) !== 630)
    throw new Error("The social image must be a real 1200 by 630 PNG.");
  const html = template
    .replace('<div id="root"></div>', () => `<div id="root">${render()}</div>`)
    .replace("<!--studio-metadata-->", () => renderSiteMetadata(origin));
  await fs.writeFile(htmlPath, html);
  await fs.writeFile(path.join(dist, "robots.txt"), metadata.robots);
  await fs.writeFile(path.join(dist, "sitemap.xml"), metadata.sitemap);
  console.log(`Prerendered studio and public route metadata for ${metadata.canonical}`);
} finally {
  await server.close();
}
