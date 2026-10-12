import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "../.qa/node_modules/playwright-core/index.mjs";
const base = process.env.STUDIO_BASE_URL ?? "http://127.0.0.1:5176";
const publicDir = path.resolve("apps/web/public");
const thumbnails = process.argv.includes("--thumbnails");
const harness = path.resolve(".qa/studio-assets.html");
fs.writeFileSync(
  harness,
  `<!doctype html><style>body{margin:0;background:white}canvas{width:100vw;height:100vh;display:block}</style><canvas></canvas><script type="module">
import {createQRArtifact,serializeQRSvg} from '../packages/core/src/index.ts';
import {createSeedModel,mountSeed,getDefaultPaletteForModel} from '../packages/renderer-webgpu/src/index.ts';
import {WORLD_CATALOG} from '../apps/web/src/world-catalog.ts';
window.forms=WORLD_CATALOG.map(w=>w.id);
window.captureWorld=async form=>{
window.renderer?.dispose();const old=document.querySelector('canvas');const canvas=old.cloneNode();old.replaceWith(canvas);
const artifact=await createQRArtifact('https://urbanscan-omega.vercel.app/');
const model=await createSeedModel(artifact.identity,{generatorVersion:3});
const palette=getDefaultPaletteForModel(form);window.failure=null;
window.renderer=mountSeed(canvas,model,{palette:palette.palette,artDirection:palette.artDirection??0,effect:'calm'},form,{onError:e=>window.failure=e.message});
return serializeQRSvg(artifact);
};</script>`,
);
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: [
    "--enable-unsafe-webgpu",
    "--enable-webgpu-developer-features",
    "--enable-features=Vulkan",
    "--use-vulkan=swiftshader",
    "--use-webgpu-adapter=swiftshader",
    "--disable-vulkan-surface",
  ],
});
try {
  const page = await browser.newPage({
    viewport: { width: 400, height: 400 },
    reducedMotion: "reduce",
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/@fs/" + harness.replaceAll("\\", "/"));
  await page.waitForFunction(() => window.forms);
  const forms = process.env.CAPTURE_WORLDS?.split(",") ?? (thumbnails
    ? await page.evaluate(() => window.forms)
    : ["waves", "crystalline", "mechanical"]);
  const images = {};
  let qr;
  fs.mkdirSync(path.join(publicDir, "worlds"), { recursive: true });
  for (const form of forms) {
    qr = await page.evaluate((form) => window.captureWorld(form), form);
    await page.waitForFunction(
      () => window.failure || document.querySelector("canvas").dataset.renderer === "webgpu-wgsl",
      undefined,
      { timeout: 90000 },
    );
    assert.equal(await page.evaluate(() => window.failure), null);
    await page.waitForTimeout(350);
    images[form] = (await page.screenshot()).toString("base64");
    if (thumbnails) {
      const bytes = await page.evaluate(async (screenshot) => {
        const image = new Image();
        image.src = "data:image/png;base64," + screenshot;
        await image.decode();
        const c = document.createElement("canvas");
        c.width = c.height = 240;
        c.getContext("2d").drawImage(image, 0, 0, 240, 240);
        return c.toDataURL("image/webp", 0.84).split(",")[1];
      }, images[form]);
      fs.writeFileSync(
        path.join(publicDir, "worlds", form + ".webp"),
        Buffer.from(bytes, "base64"),
      );
    }
  }
  await page.evaluate(() => window.renderer.dispose());
  if (!thumbnails) {
    await page.setViewportSize({ width: 1200, height: 630 });
    await page.setContent(`<!doctype html><style>
  @font-face{font-family:Jakarta;src:url('${base}/fonts/plus-jakarta-sans.woff2')}*{box-sizing:border-box}body{margin:0;background:#f5f1e8;color:#253a2e;font-family:Jakarta,Arial,sans-serif;padding:45px 54px}header{font-size:24px;font-weight:750}h1{font-size:55px;letter-spacing:-2.5px;line-height:1.12;margin:22px 0 12px;max-width:820px}p{font-size:21px;margin:0;color:#57675a}.worlds{display:flex;gap:18px;margin-top:28px;width:842px}.world{width:268px;background:white;border-radius:18px;overflow:hidden}.world img{display:block;width:268px;height:240px;object-fit:cover}.world span{display:block;padding:10px 18px 15px;font-size:16px;font-weight:700}.qr{position:absolute;right:54px;top:334px;width:200px;background:white;border-radius:18px;padding:12px}.qr svg{width:176px;height:176px;display:block}.tag{position:absolute;right:54px;top:549px;font-size:14px;width:200px;text-align:center}
  </style><header>urbanscan.</header><h1>A QR code.<br>A world of its own.</h1><p>Create your link. Choose a world. Download your QR.</p><div class="worlds">${["waves", "crystalline", "mechanical"].map((form) => `<div class="world"><img src="data:image/png;base64,${images[form]}"><span>${form[0].toUpperCase() + form.slice(1)}</span></div>`).join("")}</div><div class="qr">${qr}</div><div class="tag">PNG + SVG · 15 worlds</div>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(publicDir, "og-image.png") });
  }
  assert.deepEqual(errors, []);
  console.log(
    `Captured ${forms.length} actual version 3 scenes for ${thumbnails ? "240px WebP thumbnails" : "1200x630 social image"}.`,
  );
} finally {
  await browser.close();
}
