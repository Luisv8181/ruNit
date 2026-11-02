// Captures app screens for the vertical (9:16) story trailer. Reuses the broadcast trailer's shots and adds the ones
// this story needs: calling a run, check-in teams, the reflection question, customization and opportunities.
// Requires the app running. Usage: node trailer/vertical/capture.mjs [baseUrl]
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = new URL("./assets/", import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const exe = ["/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
const CLEAN = ".justify-center.bg-ink.text-center{display:none!important} a[aria-label='Call a run'].fixed{display:none!important} header.sticky{position:relative!important}";

async function phone(theme) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, reducedMotion: "reduce" });
  await ctx.addInitScript((t) => { try { localStorage.setItem("runit-theme", t); } catch {} }, theme);
  const page = await ctx.newPage();
  await page.route(/overpass/, (r) => r.abort());
  const go = async (p) => { await page.goto(BASE + p, { waitUntil: "load" }); await page.addStyleTag({ content: CLEAN }); await page.waitForTimeout(700); };
  const snap = async (id, full = false) => { await page.addStyleTag({ content: CLEAN }); await page.waitForTimeout(350); await page.screenshot({ path: `${OUT}${id}.png`, fullPage: full }); };
  const scrollTo = async (sel, offset = 80) => { await page.locator(sel).first().evaluate((el, o) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - o), offset); await page.waitForTimeout(300); };
  return { ctx, page, go, snap, scrollTo };
}

{
  const { ctx, page, go, snap, scrollTo } = await phone("lights");
  const tap = async (lbl, n = 1) => { for (let i = 0; i < n; i++) await page.getByRole("button", { name: lbl }).click(); };
  await go("/create"); await snap("create", true);
  await go("/runs/r-northside-now"); await snap("checkin");
  await tap("Scan QR"); await page.waitForTimeout(1300);
  await page.getByRole("button", { name: /Simulate arrivals/ }).click(); await page.waitForTimeout(1800);
  await scrollTo("text=Tip off", 520); await snap("teams");
  await tap("Tip off"); await page.waitForTimeout(400);
  await tap("Add 2 for Shirts", 10); await tap("Add 1 for Shirts"); await tap("Add 2 for Skins", 9);
  await page.getByRole("button", { name: /Game over|Save it/ }).click();
  await page.getByRole("button", { name: "Save final score" }).click(); await page.waitForTimeout(500);
  await tap("Increase Points", 9); await tap("Increase Assists", 3); await tap("Increase Rebounds", 5);
  await page.getByRole("button", { name: "Submit my stats" }).click(); await page.waitForTimeout(1000);
  const recheck = page.getByRole("button", { name: /to recheck/ });
  if (await recheck.count()) { await recheck.click(); await page.waitForTimeout(1800); }
  await page.getByRole("button", { name: /Ask everyone to confirm/ }).click(); await page.waitForTimeout(3800);
  const confirms = page.getByRole("button", { name: "Confirm", exact: true });
  const n = await confirms.count(); for (let i = 0; i < n; i++) await confirms.first().click();
  await page.getByRole("button", { name: "Save to My Game" }).click(); await page.waitForURL(/reflect/); await page.waitForTimeout(600);
  await snap("reflect-q");
  for (const t of ["Drives", "Finishing through contact", "Putbacks"]) { await page.getByRole("button", { name: t, exact: true }).click(); await page.waitForTimeout(150); }
  await snap("reflect");
  await page.getByRole("button", { name: "Just save this" }).click(); await page.waitForTimeout(900);
  await snap("dna");
  await go("/my-game/customize"); await snap("customize");
  await page.getByRole("tab", { name: "Skill FX" }).click(); await page.waitForTimeout(400); await snap("skillfx");
  await go("/opportunities"); await snap("opps");
  await ctx.close();
}
{
  const { ctx, go, snap, scrollTo } = await phone("paint");
  await go("/courts?c=c-northside"); await scrollTo("[aria-label='Court records']", 230); await snap("king-paint");
  await ctx.close();
}
await browser.close();
console.log("captured", fs.readdirSync(OUT).length, "files");
