// Globe frames for the broadcast trailer, 60 fps, Lights look: spin toward Pennsylvania, then fly into Hazleton.
// Requires the app running. Usage: node trailer/broadcast/globe.mjs [baseUrl]
import { chromium } from "playwright";
import fs from "node:fs";
const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = new URL("./globe/", import.meta.url).pathname;
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const exe = ["/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1200, height: 1000 }, deviceScaleFactor: 1.4, reducedMotion: "reduce" });
await ctx.addInitScript(() => { try { localStorage.setItem("runit-theme", "lights"); } catch {} });
const page = await ctx.newPage();
await page.route(/overpass/, (r) => r.abort());
await page.goto(BASE + "/courts/globe", { waitUntil: "load" });
await page.waitForFunction(() => !!window.__runitGlobe);
await page.addStyleTag({ content: "canvas ~ div, canvas ~ a { display: none !important; }" });
await page.evaluate(() => window.__runitGlobe.set({ zoom: 6 })); await page.waitForTimeout(2500);
const canvas = page.locator("canvas").first();
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const frames = [];
const SPIN = 156, FLY = 204, HOLD = 72;
for (let i = 0; i < SPIN; i++) { const p = i / SPIN; frames.push({ lng: 40 - p * 105, lat: 16 + p * 12, zoom: 1 }); }
const from = { lng: -65, lat: 28, zoom: 1 }, to = { lng: -75.982, lat: 40.957, zoom: 3600 };
for (let i = 1; i <= FLY; i++) {
  const e = ease(i / FLY), er = Math.min(1, e * 1.5), ez = Math.max(0, (e - 0.15) / 0.85);
  frames.push({ lng: from.lng + (to.lng - from.lng) * er, lat: from.lat + (to.lat - from.lat) * er, zoom: Math.exp(Math.log(from.zoom) + (Math.log(to.zoom) - Math.log(from.zoom)) * ez) });
}
for (let i = 0; i < HOLD; i++) frames.push({ ...to, zoom: to.zoom * (1 + i * 0.0012) });
for (let i = 0; i < frames.length; i++) {
  await page.evaluate((v) => window.__runitGlobe.set(v), frames[i]);
  await canvas.screenshot({ path: `${OUT}${String(i).padStart(4, "0")}.png`, omitBackground: true });
  if (i % 100 === 0) console.log(i);
}
await browser.close();
console.log("globe frames:", frames.length);
