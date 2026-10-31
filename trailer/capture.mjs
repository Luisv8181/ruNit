// Captures real application screens for the trailer. Requires the app running (npm run build && npm start).
// Usage: node trailer/capture.mjs [baseUrl]
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = new URL("./assets/", import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const exe = ["/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });

async function session(kind) {
  const ctx = await browser.newContext(
    kind === "phone"
      ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: "no-preference" }
      : { viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.2, reducedMotion: "no-preference" }
  );
  const page = await ctx.newPage();
  const go = async (p) => { await page.goto(BASE + p, { waitUntil: "networkidle" }); await page.waitForTimeout(500); };
  const snap = async (id, opts = {}) => {
    if (opts.scrollTo) await page.locator(opts.scrollTo).first().scrollIntoViewIfNeeded();
    if (opts.y !== undefined) await page.evaluate((y) => window.scrollTo(0, y), opts.y);
    // hide fixed chrome that would float over content in a trailer close-up
    if (opts.hideChrome) await page.addStyleTag({ content: "nav[aria-label=Primary].fixed, a[aria-label='Create a run'].fixed{display:none!important}" });
    await page.waitForTimeout(450);
    await page.screenshot({ path: `${OUT}${kind}-${id}.png` });
  };
  return { ctx, page, go, snap };
}

// ---------- phone: the full game loop ----------
{
  const { ctx, page, go, snap } = await session("phone");
  await go("/"); await snap("home");
  await go("/courts?c=c-northside"); await snap("court", { y: 330 });
  await go("/create"); await snap("create", { y: 140, hideChrome: true });
  await go("/runs/r-northside-now"); await snap("checkin", { hideChrome: true });
  await page.getByRole("button", { name: "Scan QR" }).click(); await page.waitForTimeout(1300);
  await page.getByRole("button", { name: /Simulate arrivals/ }).click(); await page.waitForTimeout(1800);
  await snap("teams", { scrollTo: "text=Shirts vs Skins", hideChrome: true });
  await page.getByRole("button", { name: "Tip off" }).click(); await page.waitForTimeout(400);
  await snap("live", { scrollTo: "text=Phone down.", hideChrome: true });
  await page.getByRole("button", { name: /Game over/ }).click();
  await page.getByLabel("Shirts", { exact: true }).fill("21"); await page.getByLabel("Skins", { exact: true }).fill("18");
  await page.getByRole("button", { name: "Save final score" }).click(); await page.waitForTimeout(500);
  for (let i = 0; i < 9; i++) await page.getByRole("button", { name: "Increase Points" }).click();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Increase Assists" }).click();
  for (let i = 0; i < 5; i++) await page.getByRole("button", { name: "Increase Rebounds" }).click();
  await snap("stats", { scrollTo: "text=Your box score", hideChrome: true });
  await page.getByRole("button", { name: "Submit my stats" }).click(); await page.waitForTimeout(1000);
  await snap("mismatch", { scrollTo: "text=points don't add up", hideChrome: true });
  await page.getByRole("button", { name: /to recheck/ }).click(); await page.waitForTimeout(1800);
  await page.getByRole("button", { name: /Request confirmations/ }).click(); await page.waitForTimeout(3800);
  await snap("confirmed", { scrollTo: "text=Box score", hideChrome: true });
  await page.getByRole("button", { name: "Save to My Game" }).click(); await page.waitForURL(/reflect/); await page.waitForTimeout(500);
  for (const t of ["Drives", "Finishing through contact", "Putbacks"]) await page.getByRole("button", { name: t, exact: true }).click();
  await snap("reflect", { hideChrome: true });
  await page.getByRole("button", { name: "Just save this" }).click(); await page.waitForTimeout(800);
  await snap("dna", { hideChrome: true });
  await go("/my-game"); await snap("mygame", { hideChrome: true });
  await go("/community"); await snap("community", { hideChrome: true });
  await go("/opportunities"); await snap("opps", { y: 380, hideChrome: true });
  await page.getByText("Hazleton Summer 3v3 Classic").first().click(); await page.waitForTimeout(500); await snap("opp-detail");
  await ctx.close();
}

// ---------- desktop: hero frames ----------
{
  const { ctx, page, go, snap } = await session("desk");
  await go("/"); await snap("home");
  await go("/courts"); await snap("courts", { y: 100 });
  await page.getByRole("button", { name: /Northside Commons/ }).first().click(); await snap("court-detail", { y: 100 });
  await go("/my-game"); await snap("mygame");
  await go("/my-game/customize"); await page.getByRole("tab", { name: "Skill FX" }).click(); await snap("customize");
  await go("/community"); await page.getByRole("tab", { name: "Squads" }).click(); await snap("squads");
  await page.getByRole("tab", { name: "Rankings" }).click(); await snap("rankings");
  await go("/opportunities"); await snap("opps");
  await ctx.close();
}
await browser.close();
console.log("captured", fs.readdirSync(OUT).length, "screens");
