// Screenshots key screens in all three looks. Usage: node scripts/looks.mjs [outDir] [baseUrl]
import { chromium } from "playwright";
import fs from "node:fs";
const OUT = process.argv[2] ?? "looks"; const BASE = process.argv[3] ?? "http://localhost:3000";
fs.mkdirSync(OUT, { recursive: true });
const exe = ["/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
const errors = [];
for (const theme of ["lights", "paint", "card"]) {
  for (const kind of ["phone", "desk"]) {
    const ctx = await browser.newContext(kind === "phone" ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: "reduce" } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
    await ctx.addInitScript((t) => { try { localStorage.setItem("runit-theme", t); } catch {} }, theme);
    const page = await ctx.newPage();
    let cur = "";
    page.on("pageerror", (e) => errors.push(`${theme} ${kind} ${cur}: ${e.message.slice(0, 90)}`));
    await page.route(/overpass/, (r) => r.abort());
    const shot = async (name, path, act) => {
      cur = path; await page.goto(BASE + path, { waitUntil: "load" }); await page.waitForTimeout(600);
      if (act) await act();
      await page.screenshot({ path: `${OUT}/${theme}-${kind}-${name}.png`, fullPage: kind === "phone" });
    };
    await shot("home", "/");
    if (kind === "desk") { await ctx.close(); continue; }
    await shot("court", "/courts?c=c-northside", async () => { await page.locator("text=Got next").first().scrollIntoViewIfNeeded().catch(() => {}); });
    await shot("live", "/runs/r-northside-now", async () => {
      await page.getByRole("button", { name: "Scan QR" }).click(); await page.waitForTimeout(1200);
      await page.getByRole("button", { name: /Simulate arrivals/ }).click(); await page.waitForTimeout(1600);
      await page.getByRole("button", { name: "Tip off" }).click(); await page.waitForTimeout(300);
      for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Add 2 for Shirts" }).click();
      for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Add 2 for Skins" }).click();
      await page.getByRole("button", { name: "Add 2 to my points" }).click();
    });
    await shot("community", "/community");
    await shot("mygame", "/my-game");
    await shot("opps", "/opportunities");
    await shot("create", "/create");
    await ctx.close();
  }
}
await browser.close();
console.log(errors.length ? errors.join("\n") : "no page errors");
