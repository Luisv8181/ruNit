// Globe test: OpenStreetMap is mocked with a synthetic fixture (the sandbox can't reach it).
// Usage: node scripts/test-globe.mjs [baseUrl] [outDir]
import { chromium } from "playwright";
import fs from "node:fs";
const BASE = process.argv[2] ?? "http://localhost:3000", OUT = process.argv[3] ?? "screens-globe";
fs.mkdirSync(OUT, { recursive: true });
const fixture = fs.readFileSync(new URL("./fixtures/overpass-sample.json", import.meta.url), "utf8");
const snapshot = JSON.parse(fs.readFileSync(new URL("../public/data/courts/index.json", import.meta.url), "utf8"));
// Hazleton sits in the 5° tile 26_20.
const hazletonTile = JSON.parse(fs.readFileSync(new URL("../public/data/courts/tiles/26_20.json", import.meta.url), "utf8"));
const exe = [process.env.CHROME, "/usr/bin/google-chrome", "/usr/bin/chromium", "C:/Program Files/Google/Chrome/Application/chrome.exe", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].filter(Boolean).find((p) => fs.existsSync(p));
const b = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
const errors = [];
const run = async (mode) => {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${mode}: ${e.message}`));
  let calls = 0;
  await page.route(/overpass/, (r) => { calls++; return mode === "ok" ? r.fulfill({ status: 200, contentType: "application/json", body: fixture }) : r.abort(); });
  await page.goto(BASE + "/courts/globe", { waitUntil: "load" });
  await page.getByRole("heading", { name: /Find your next court/i }).waitFor();
  if (mode === "ok") {
    await page.getByText(snapshot.count.toLocaleString(), { exact: true }).waitFor();
    const intro = await page.locator("body").innerText();
    if (!intro.includes("COURT ATLAS") || !intro.includes("COURTS ON THE MAP")) throw new Error("Court atlas branding is missing");
    await page.screenshot({ path: `${OUT}/globe-planet.png` });
  }
  await page.getByRole("button", { name: "Hazleton", exact: true }).click();
  await page.waitForTimeout(4000);
  const status = await page.getByRole("status").innerText();
  if (mode === "ok" && !status.includes("3 courts in view")) throw new Error(`Expected three mapped courts, got: ${status}`);
  if (mode === "offline" && !status.includes("Snapshot locations are still shown")) throw new Error(`Expected snapshot fallback status, got: ${status}`);
  await page.screenshot({ path: `${OUT}/globe-hazleton-${mode}.png` });
  console.log(mode, "| requests:", calls, "| status:", status.trim());
  if (mode === "ok") {
    await page.getByRole("button", { name: "New York" }).click(); await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/globe-new-york.png` });
  } else {
    const point = hazletonTile.find(([lat, lng]) => lat > 40.9 && lat < 41 && lng > -76.1 && lng < -76);
    if (!point) throw new Error("No nearby snapshot court to test");
    await page.evaluate(([lat, lng]) => window.__runitGlobe.set({ lat, lng, zoom: 2600 }), point);
    await page.waitForTimeout(1500); // view settles, then the regional tile loads
    const box = await page.locator("canvas").boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.getByText("Mapped by OpenStreetMap", { exact: true }).waitFor();
    const href = await page.getByRole("link", { name: "View on OpenStreetMap" }).getAttribute("href");
    if (!href?.endsWith(`/${point[3]}`)) throw new Error(`Snapshot court opened the wrong source: ${href}`);
  }
  await ctx.close();
};
await run("ok");
await run("offline");
const mobile = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
const mobilePage = await mobile.newPage();
mobilePage.on("pageerror", (e) => errors.push(`mobile: ${e.message}`));
await mobilePage.goto(BASE + "/courts/globe", { waitUntil: "load" });
await mobilePage.getByRole("heading", { name: /Find your next court/i }).waitFor();
await mobilePage.getByText(snapshot.count.toLocaleString(), { exact: true }).waitFor();
const mobileWidth = await mobilePage.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }));
if (mobileWidth.content > mobileWidth.viewport) throw new Error(`Mobile horizontal overflow: ${JSON.stringify(mobileWidth)}`);
await mobilePage.screenshot({ path: `${OUT}/globe-mobile.png`, fullPage: true });
console.log("mobile | horizontal overflow: none");
await mobile.close();
await b.close();
if (errors.length) { console.error(errors.join("\n")); process.exitCode = 1; }
else console.log("no runtime errors");
