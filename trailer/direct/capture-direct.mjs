// Captures the redesigned app for the ruNit Direct trailer, plus globe frames.
// Requires the app running: npm run build && npm start. Usage: node trailer/direct/capture-direct.mjs [baseUrl]
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = new URL("./assets/", import.meta.url).pathname;
const GLOBE = new URL("./globe/", import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
fs.rmSync(GLOBE, { recursive: true, force: true }); fs.mkdirSync(GLOBE, { recursive: true });
const exe = ["/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
// The trailer carries its own "made-up data" notice, so the in-app demo banner is hidden for clean shots.
const CLEAN = ".justify-center.bg-ink.text-center{display:none!important} a[aria-label='Call a run'].fixed{display:none!important}";

async function session(kind) {
  const ctx = await browser.newContext(kind === "phone"
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, reducedMotion: "reduce" }
    : { viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.route(/overpass/, (r) => r.abort());
  const go = async (p) => { await page.goto(BASE + p, { waitUntil: "load" }); await page.addStyleTag({ content: CLEAN }); await page.waitForTimeout(700); };
  const snap = async (id, opts = {}) => {
    if (opts.scrollTo) { await page.locator(opts.scrollTo).first().evaluate((el) => el.scrollIntoView({ block: "start" })); await page.evaluate((o) => window.scrollBy(0, -o), opts.offset ?? 90); }
    if (opts.y !== undefined) await page.evaluate((y) => window.scrollTo(0, y), opts.y);
    await page.waitForTimeout(400);
    if (opts.el) await page.locator(opts.el).first().screenshot({ path: `${OUT}${kind}-${id}.png` });
    else await page.screenshot({ path: `${OUT}${kind}-${id}.png` });
  };
  return { ctx, page, go, snap };
}

const GLOBE_ONLY = process.argv[3] === "globe";
if (!GLOBE_ONLY) { // phone: the game loop
  const { ctx, page, go, snap } = await session("phone");
  await go("/"); await snap("home");
  await go("/create"); await snap("create", { y: 0 });
  await go("/runs/r-northside-now");
  await page.getByRole("button", { name: "Scan QR" }).click(); await page.waitForTimeout(1300);
  await page.getByRole("button", { name: /Simulate arrivals/ }).click(); await page.waitForTimeout(1800);
  await snap("teams", { y: 380 });
  await page.getByRole("button", { name: "Tip off" }).click(); await page.waitForTimeout(400);
  await snap("live", { scrollTo: "text=Phone down." , offset: 40 });
  await page.getByRole("button", { name: /Game over/ }).click();
  await page.getByLabel("Shirts", { exact: true }).fill("21"); await page.getByLabel("Skins", { exact: true }).fill("18");
  await page.getByRole("button", { name: "Save final score" }).click(); await page.waitForTimeout(500);
  for (let i = 0; i < 9; i++) await page.getByRole("button", { name: "Increase Points" }).click();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Increase Assists" }).click();
  for (let i = 0; i < 5; i++) await page.getByRole("button", { name: "Increase Rebounds" }).click();
  await snap("stats", { scrollTo: "text=Your box score" });
  await page.getByRole("button", { name: "Submit my stats" }).click(); await page.waitForTimeout(1000);
  await snap("mismatch", { scrollTo: "text=points don't add up", offset: 30 });
  await page.getByRole("button", { name: /to recheck/ }).click(); await page.waitForTimeout(1800);
  await page.getByRole("button", { name: /Request confirmations/ }).click(); await page.waitForTimeout(3800);
  await snap("confirmed", { scrollTo: "text=Box score", offset: 60 });
  await page.getByRole("button", { name: "Save to My Game" }).click(); await page.waitForURL(/reflect/); await page.waitForTimeout(500);
  await page.addStyleTag({ content: CLEAN });
  for (const t of ["Drives", "Finishing through contact", "Putbacks"]) await page.getByRole("button", { name: t, exact: true }).click();
  await snap("reflect", { y: 0 });
  await page.getByRole("button", { name: "Just save this" }).click(); await page.waitForTimeout(800);
  await snap("dna", { y: 0 });
  await ctx.close();
}

if (!GLOBE_ONLY) { // desktop
  const { ctx, page, go, snap } = await session("desk");
  await go("/"); await snap("home", { y: 0 });
  await go("/courts?c=c-northside"); await snap("records", { el: "section[aria-labelledby='rec-c-northside']" });
  await go("/my-game/passport"); await snap("passport", { el: "section[aria-labelledby='area-Hazleton']" });
  await snap("badges", { el: "section[aria-labelledby='badges']" });
  await ctx.close();
}

{ // globe frames, 30 fps: spin toward Pennsylvania, then fly into Hazleton
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.route(/overpass/, (r) => r.abort());
  await page.goto(BASE + "/courts/globe", { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__runitGlobe);
  await page.addStyleTag({ content: "canvas ~ div, canvas ~ a { display: none !important; }" });
  // warm up detail layers
  await page.evaluate(() => window.__runitGlobe.set({ zoom: 6 })); await page.waitForTimeout(2500);
  const canvas = page.locator("canvas").first();
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const frames = [];
  const SPIN = 100, FLY = 110, HOLD = 40;
  for (let i = 0; i < SPIN; i++) frames.push({ lng: 30 - (i / SPIN) * 95, lat: 18 + (i / SPIN) * 10, zoom: 1 });
  const from = { lng: -65, lat: 28, zoom: 1 }, to = { lng: -75.982, lat: 40.957, zoom: 3600 };
  for (let i = 1; i <= FLY; i++) {
    const e = ease(i / FLY), er = Math.min(1, e * 1.5), ez = Math.max(0, (e - 0.15) / 0.85);
    frames.push({ lng: from.lng + (to.lng - from.lng) * er, lat: from.lat + (to.lat - from.lat) * er, zoom: Math.exp(Math.log(from.zoom) + (Math.log(to.zoom) - Math.log(from.zoom)) * ez) });
  }
  for (let i = 0; i < HOLD; i++) frames.push({ ...to, zoom: to.zoom * (1 + i * 0.002) });
  for (let i = 0; i < frames.length; i++) {
    await page.evaluate((v) => window.__runitGlobe.set(v), frames[i]);
    await canvas.screenshot({ path: `${GLOBE}${String(i).padStart(4, "0")}.jpg`, type: "jpeg", quality: 90 });
  }
  console.log("globe frames:", frames.length);
  await ctx.close();
}
await browser.close();
console.log("captured", fs.readdirSync(OUT).length, "screens");
