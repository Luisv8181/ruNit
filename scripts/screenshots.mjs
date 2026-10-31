// Visual QA + trailer source capture. Usage: node scripts/screenshots.mjs [baseUrl] [outDir]
// Walks the full demo story on desktop and mobile and saves screenshots.
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = process.argv[3] ?? "screens";
fs.mkdirSync(OUT, { recursive: true });

const exe = ["/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
const errors = [];

async function run(name, viewport, scale = 1) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: scale, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`[${name}] ${e.message}`));
  page.on("console", (m) => m.type() === "error" && !m.text().startsWith("Failed to load resource") && errors.push(`[${name}] console: ${m.text()}`));
  page.on("response", (r) => r.status() >= 400 && errors.push(`[${name}] ${r.status()} ${r.url()}`));
  const shot = async (id, full = true) => {
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${OUT}/${name}-${id}.png`, fullPage: full });
  };
  const go = async (path) => { await page.goto(BASE + path, { waitUntil: "networkidle" }); await page.waitForTimeout(400); };

  await go("/"); await shot("01-home");
  await go("/courts"); await shot("02-courts");
  await page.getByRole("button", { name: /Northside Commons/ }).first().click(); await shot("03-court-detail");
  await go("/create"); await shot("04-create");
  await page.getByRole("button", { name: "Call it" }).click();
  await page.waitForURL(/\/runs\//); await page.waitForTimeout(6500); await shot("05-run-created");

  // Guided game loop on the seeded run.
  await go("/runs/r-northside-now"); await shot("06-checkin");
  await page.getByRole("button", { name: "Scan QR" }).click(); await page.waitForTimeout(1300);
  await page.getByRole("button", { name: /Simulate arrivals/ }).click(); await page.waitForTimeout(1800); await shot("07-teams");
  await page.getByRole("button", { name: "Tip off" }).click();
  for (const [lbl, n] of [["Add 2 to my points", 3], ["Add 1 to my points", 1], ["Add 2 for Shirts", 6], ["Add 2 for Skins", 9]]) for (let i = 0; i < n; i++) await page.getByRole("button", { name: lbl }).click();
  await shot("08-live", false);
  await page.getByRole("button", { name: /Game over|Save it/ }).click();
  await page.getByLabel("Shirts", { exact: true }).fill("21"); await page.getByLabel("Skins", { exact: true }).fill("18");
  await page.getByRole("button", { name: "Save final score" }).click(); await shot("09-stats");
  for (let i = 0; i < 2; i++) await page.getByRole("button", { name: "Increase Points" }).click(); // 7 from the scoreboard + 2
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Increase Assists" }).click();
  for (let i = 0; i < 5; i++) await page.getByRole("button", { name: "Increase Rebounds" }).click();
  await page.getByRole("button", { name: "Submit my stats" }).click(); await page.waitForTimeout(1000); await shot("10-mismatch");
  await page.getByRole("button", { name: /to recheck/ }).click(); await page.waitForTimeout(1800);
  await page.getByRole("button", { name: "Yari", exact: false }).first().click(); await page.waitForTimeout(400); await shot("10b-bump", false);
  await page.getByRole("button", { name: /Their phone/ }).click(); await page.waitForTimeout(1300);
  await page.getByRole("button", { name: /Ask everyone to confirm/ }).click(); await page.waitForTimeout(3800);
  const confirms = page.getByRole("button", { name: "Confirm", exact: true });
  const n = await confirms.count(); for (let i = 0; i < Math.min(n, 3); i++) await confirms.first().click();
  await shot("11-confirmed");
  await page.getByRole("button", { name: "Save to My Game" }).click();
  await page.waitForURL(/reflect/); await page.waitForTimeout(500);
  for (const t of ["Drives", "Finishing through contact", "Putbacks"]) await page.getByRole("button", { name: t, exact: true }).click();
  await shot("12-reflect");
  await page.getByRole("button", { name: /A few more/ }).click();
  await page.getByRole("button", { name: "Weak hand" }).click();
  await page.getByRole("button", { name: "Weak-hand finishing" }).click();
  await page.getByRole("button", { name: "Save reflection" }).click(); await page.waitForTimeout(600); await shot("13-reflect-done");

  await go("/runs/r-northside-now"); await shot("13b-game-card");
  await go("/courts?c=c-northside"); await page.getByRole("button", { name: "Put my name down" }).click(); await shot("24-got-next");
  await go("/community"); await page.getByRole("button", { name: "Add a friend" }).click(); await page.getByLabel("Their code").fill((await page.locator("text=/Lock [A-Z2-9]{3}-[A-Z2-9]{3}/").first().innerText()).match(/Lock ([A-Z2-9-]{7})/)?.[1] ?? "");
  await page.getByRole("button", { name: "Add", exact: true }).click(); await shot("25-friends-add", false);
  await page.getByRole("button", { name: "Done" }).click(); await shot("26-friends");
  await go("/my-game"); await shot("14-my-game");
  await go("/my-game/passport"); await shot("22-passport");
  await go("/courts?c=c-northside"); await shot("23-court-records");
  await go("/my-game/customize"); await shot("15-customize");
  await page.getByRole("tab", { name: "Skill FX" }).click(); await shot("16-skill-fx");
  await go("/community"); await shot("17-community");
  await page.getByRole("tab", { name: "Squads" }).click();
  await page.getByRole("button", { name: "Join squad" }).first().click(); await shot("18-squads");
  await page.getByRole("tab", { name: "Rankings" }).click(); await shot("19-rankings");
  await go("/opportunities"); await shot("20-opps");
  await page.getByText("Hazleton Summer 3v3 Classic").first().click(); await shot("21-opp-detail", false);
  await ctx.close();
}

await run("desktop", { width: 1440, height: 900 });
await run("mobile", { width: 390, height: 844 }, 2);
await browser.close();
fs.writeFileSync(`${OUT}/errors.txt`, errors.join("\n") || "no errors");
console.log(errors.length ? errors.join("\n") : "no runtime errors");
