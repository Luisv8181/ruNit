// Globe test: OpenStreetMap is mocked with a synthetic fixture (the sandbox can't reach it).
// Usage: node scripts/test-globe.mjs [baseUrl] [outDir]
import { chromium } from "playwright";
import fs from "node:fs";
const BASE = process.argv[2] ?? "http://localhost:3000", OUT = process.argv[3] ?? "screens-globe";
fs.mkdirSync(OUT, { recursive: true });
const fixture = fs.readFileSync(new URL("./fixtures/overpass-sample.json", import.meta.url), "utf8");
const exe = ["/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => fs.existsSync(p));
const b = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
const errors = [];
const run = async (mode) => {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${mode}: ${e.message}`));
  let calls = 0;
  await page.route(/overpass/, (r) => { calls++; return mode === "ok" ? r.fulfill({ status: 200, contentType: "application/json", body: fixture }) : r.abort(); });
  await page.goto(BASE + "/courts/globe", { waitUntil: "load" });
  await page.waitForTimeout(2500);
  if (mode === "ok") await page.screenshot({ path: `${OUT}/globe-planet.png` });
  await page.getByRole("button", { name: "Hazleton", exact: true }).click();
  await page.waitForTimeout(4000);
  const status = await page.getByRole("status").innerText();
  await page.screenshot({ path: `${OUT}/globe-hazleton-${mode}.png` });
  console.log(mode, "| requests:", calls, "| status:", status.trim());
  if (mode === "ok") {
    await page.getByRole("button", { name: "Pennsylvania" }).click(); await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/globe-pa.png` });
  }
  await ctx.close();
};
await run("ok");
await run("offline");
await b.close();
console.log(errors.length ? errors.join("\n") : "no runtime errors");
