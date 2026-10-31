// Captures app screens (Lights look unless noted) for the ruNit broadcast trailer.
// Requires the app running (npm run build && npm start). Usage: node trailer/broadcast/capture.mjs [baseUrl]
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = new URL("./assets/", import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const exe = ["/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
// The trailer carries its own "made-up data" notice, so the in-app demo banner and the floating button are hidden.
const CLEAN = ".justify-center.bg-ink.text-center{display:none!important} a[aria-label='Call a run'].fixed{display:none!important} header.sticky{position:relative!important}";
const meta = {};

async function phone(theme) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, reducedMotion: "reduce" });
  await ctx.addInitScript((t) => { try { localStorage.setItem("runit-theme", t); } catch {} }, theme);
  const page = await ctx.newPage();
  await page.route(/overpass/, (r) => r.abort());
  const go = async (p) => { await page.goto(BASE + p, { waitUntil: "load" }); await page.addStyleTag({ content: CLEAN }); await page.waitForTimeout(700); };
  const snap = async (id, full = false) => { await page.waitForTimeout(350); await page.screenshot({ path: `${OUT}${id}.png`, fullPage: full }); };
  const scrollTo = async (sel, offset = 80) => { await page.locator(sel).first().evaluate((el, o) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - o), offset); await page.waitForTimeout(300); };
  return { ctx, page, go, snap, scrollTo };
}

{ // Lights: the whole loop
  const { ctx, page, go, snap, scrollTo } = await phone("lights");
  await go("/"); await snap("home", true); await snap("home-view");
  await go("/courts?c=c-northside");
  meta.court = await page.evaluate(() => {
    const y = (t) => { const h = [...document.querySelectorAll("h3")].find((e) => e.textContent.trim() === t); return h ? h.getBoundingClientRect().top + window.scrollY : 0; };
    return { gotNext: y("Got next"), records: y("Court records"), height: document.documentElement.scrollHeight };
  });
  await snap("court", true);
  await go("/runs/r-northside-now");
  await page.getByRole("button", { name: "Scan QR" }).click(); await page.waitForTimeout(1300);
  await page.getByRole("button", { name: /Simulate arrivals/ }).click(); await page.waitForTimeout(1800);
  await page.getByRole("button", { name: "Tip off" }).click(); await page.waitForTimeout(400);
  const tap = async (lbl, n = 1) => { for (let i = 0; i < n; i++) await page.getByRole("button", { name: lbl }).click(); };
  await tap("Add 2 for Shirts", 6); await tap("Add 1 for Shirts"); await tap("Add 2 for Skins", 6);
  await scrollTo(".board", 24);
  const steps = [null, "Add 2 to my points", "Add 2 for Skins", "Add 2 for Shirts", "Add 2 for Skins", "Add 2 to my points", "Add 2 for Skins", "Add 2 for Shirts"];
  for (let i = 0; i < steps.length; i++) { if (steps[i]) await tap(steps[i]); await snap(`live-${i}`); }
  await page.getByRole("button", { name: /Game over|Save it/ }).click();
  await page.getByRole("button", { name: "Save final score" }).click(); await page.waitForTimeout(500);
  await tap("Increase Points", 5); await tap("Increase Assists", 3); await tap("Increase Rebounds", 5);
  await page.getByRole("button", { name: "Submit my stats" }).click(); await page.waitForTimeout(1000);
  const recheck = page.getByRole("button", { name: /to recheck/ });
  if (await recheck.count()) { await recheck.click(); await page.waitForTimeout(1800); }
  await page.getByRole("button", { name: "Yari", exact: false }).first().click(); await page.waitForTimeout(500);
  await snap("bump");
  await page.getByRole("button", { name: /Their phone/ }).click(); await page.waitForTimeout(1300);
  await page.getByRole("button", { name: /Ask everyone to confirm/ }).click(); await page.waitForTimeout(3800);
  const confirms = page.getByRole("button", { name: "Confirm", exact: true });
  const n = await confirms.count(); for (let i = 0; i < Math.min(n, 3); i++) await confirms.first().click();
  await scrollTo(".board", 24); await snap("boxscore");
  await page.getByRole("button", { name: "Save to My Game" }).click(); await page.waitForURL(/reflect/); await page.waitForTimeout(500);
  await go("/runs/r-northside-now"); await page.waitForTimeout(1200);
  const card = await page.locator("img[alt^='Game card']").first().getAttribute("src");
  if (card) fs.writeFileSync(`${OUT}gamecard.png`, Buffer.from(card.split(",")[1], "base64"));
  await go("/community"); await snap("friends");
  await go("/my-game/passport"); await snap("passport", true);
  await go("/my-game"); await snap("mygame");
  await go("/courts?c=c-northside"); await scrollTo("h3:has-text('Court records')", 30); await snap("records");
  await ctx.close();
}
for (const theme of ["paint", "card"]) {
  const { ctx, page, go, snap, scrollTo } = await phone(theme);
  await go("/"); await snap(`home-view-${theme}`);
  await go("/courts?c=c-northside"); await scrollTo("h3:has-text('Court records')", 30);
  if (theme === "paint") await scrollTo("[aria-label='Court records']", 160);
  await snap(`records-${theme}`);
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${OUT}meta.json`, JSON.stringify(meta, null, 1));
console.log("captured", fs.readdirSync(OUT).length, "files", meta);
