// Run against the local Vite server. Optional QA dependencies are kept in .qa/node_modules.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "../.qa/node_modules/playwright-core/index.mjs";
import pngjs from "../.qa/node_modules/pngjs/lib/png.js";
import jsQR from "../.qa/node_modules/jsqr/dist/jsQR.js";

const output = path.resolve(".qa/url-compositions/final");
fs.mkdirSync(output, { recursive: true });
const harness = path.resolve(".qa/url-compositions-harness.html");
fs.writeFileSync(
  harness,
  `<!doctype html><link rel="icon" href="data:,"><style>body{margin:0;background:white}canvas{display:block;width:100vw;height:100vh}</style><canvas></canvas><script type="module">
import {createEveryQRCodeIdentity} from '../packages/core/src/index.ts';
import {createSeedModel,mountSeed,getPalettesForModel} from '../packages/renderer-webgpu/src/index.ts';
window.qaErrors=[];
window.boot=async(form,url)=>{
 window.renderer?.dispose();const old=document.querySelector('canvas');const canvas=old.cloneNode();old.replaceWith(canvas);
 const identity=await createEveryQRCodeIdentity(url);const model=await createSeedModel(identity,{generatorVersion:3});
 const p=getPalettesForModel(form)[0];
 window.renderer=mountSeed(canvas,model,{palette:p.palette,artDirection:p.artDirection??0,effect:'calm'},form,{onError:e=>window.qaErrors.push(String(e))});
 return identity.link.payloadUrl;
};window.loaded=true;</script>`,
);
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: [
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan",
    "--use-vulkan=swiftshader",
    "--use-webgpu-adapter=swiftshader",
    "--disable-vulkan-surface",
  ],
});
const page = await browser.newPage({
  viewport: { width: 768, height: 768 },
  reducedMotion: "no-preference",
});
const errors = [],
  records = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.addInitScript(() => {
  const real = performance.now.bind(performance),
    raf = requestAnimationFrame.bind(window);
  let clock = null;
  const now = () => clock ?? real();
  Object.defineProperty(performance, "now", { value: now });
  window.requestAnimationFrame = (callback) => raf(() => callback(now()));
  window.testClock = {
    reset() {
      clock = real();
    },
    advance(ms) {
      clock += ms;
    },
  };
});
const urls = [
  "https://example.com/custom/alpha",
  "https://example.com/custom/bravo",
  "https://nasa.gov/",
  "https://github.com/",
];
async function boot(form, url) {
  await page.evaluate(() => window.testClock.reset());
  const payload = await page.evaluate(([form, url]) => window.boot(form, url), [form, url]);
  await page.waitForFunction(
    () =>
      document.querySelector("canvas").dataset.renderer === "webgpu-wgsl" || window.qaErrors.length,
  );
  assert.deepEqual(await page.evaluate(() => window.qaErrors), []);
  await advance(2500);
  return payload;
}
async function advance(ms) {
  await page.evaluate((ms) => window.testClock.advance(ms), ms);
  await page.waitForTimeout(200);
}
function changed(a, b, predicate = () => true) {
  let pixels = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    if (predicate(a.data, i) && [0, 1, 2].some((c) => Math.abs(a.data[i + c] - b.data[i + c]) > 10))
      pixels++;
  }
  return pixels;
}
try {
  await page.goto(
    (process.env.STUDIO_BASE_URL ?? "http://127.0.0.1:5176") +
      "/@fs/" +
      harness.replaceAll("\\", "/"),
  );
  await page.waitForFunction(() => window.loaded);
  for (const form of (process.env.QA_WORLDS ?? "waves,mechanical,crystalline").split(",")) {
    const samples = [];
    for (let i = 0; i < urls.length; i++) {
      await boot(form, urls[i]);
      samples.push(
        pngjs.PNG.sync.read(
          await page.screenshot({ path: path.join(output, `${form}-url-${i}.png`) }),
        ),
      );
    }
    const differences = samples.slice(1).map((sample) => changed(samples[0], sample));
    assert.ok(
      differences.every((count) => count > 5000),
      `${form}: URLs must change substantial visible geometry`,
    );
    const payload = await boot(form, urls[0]);
    const first = pngjs.PNG.sync.read(await page.screenshot());
    await advance(1700);
    const moving = pngjs.PNG.sync.read(
      await page.screenshot({ path: path.join(output, `${form}-motion.png`) }),
    );
    const movingPixels = changed(first, moving);
    assert.ok(movingPixels > 100, `${form}: ambient motion`);
    let crabPixels;
    if (form === "waves") {
      // Red/orange crab material is separate from the blue water and beige beach.
      crabPixels = changed(
        first,
        moving,
        (data, i) => data[i] > data[i + 1] * 1.65 && data[i + 1] > data[i + 2] * 1.25,
      );
      assert.ok(crabPixels > 30, "crabs must visibly move across the sand");
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(200);
    const still = await page.screenshot();
    await advance(2000);
    assert.ok(still.equals(await page.screenshot()), "reduced motion must remain still");
    for (const size of [768, 320]) {
      await page.setViewportSize({ width: size, height: size });
      await page.evaluate(() => window.renderer.setFlat(false));
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(output, `${form}-${size}.png`) });
      await page.evaluate(() => window.renderer.setFlat(true));
      await page.waitForFunction(
        () => document.querySelector("canvas").dataset.morphProgress === "1.000",
      );
      const qr = pngjs.PNG.sync.read(
        await page.screenshot({ path: path.join(output, `${form}-${size}-qr.png`) }),
      );
      assert.equal(jsQR(new Uint8ClampedArray(qr.data), size, size)?.data, payload);
    }
    await page.setViewportSize({ width: 768, height: 768 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    records.push({
      form,
      differences,
      movingPixels,
      crabPixels,
      reducedMotionStable: true,
      qrDecoded: [768, 320],
    });
    console.log(JSON.stringify(records.at(-1)));
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(await page.evaluate(() => window.qaErrors), []);
} finally {
  fs.writeFileSync(path.join(output, "results.json"), JSON.stringify({ records, errors }, null, 2));
  await browser.close();
}
