// Renders the ruNit Direct trailer (16:9, 30 fps) and muxes trailer/direct/out/mix.wav.
// Usage: node trailer/direct/render-direct.mjs [stills]
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const here = path.dirname(new URL(import.meta.url).pathname);
const TL = JSON.parse(fs.readFileSync(path.join(here, "timeline.json"), "utf8"));
const GLOBE_FRAMES = fs.readdirSync(path.join(here, "globe")).filter((f) => f.endsWith(".jpg")).length;
const FPS = 30;
const stills = process.argv[2] === "stills";
const exe = ["/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox", "--allow-file-access-from-files"] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.addInitScript(([tl, gf]) => { window.TL = tl; window.GLOBE_FRAMES = gf; }, [TL, GLOBE_FRAMES]);
await page.goto(`file://${here}/direct.html`);
await page.evaluate(() => window.ready);
const dir = path.join(here, "frames");
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const S = Object.fromEntries(TL.segments.map((s) => [s.id, s]));
const times = stills
  ? [0.5, 1.4, 3.6, 7, S.find.cardStart + 0.9, S.find.shotStart + 6, S.call.shotStart + 5, S.prove.shotStart + 2, S.prove.shotStart + 9, S.know.shotStart + 6.5, S.own.shotStart + 6, S.stamp.shotStart + 6, S.more.cardStart + 0.9, S.more.shotStart + 2, S.more.shotStart + 6.5, S.close.start + 5]
  : Array.from({ length: Math.ceil(TL.duration * FPS) }, (_, i) => i / FPS);
let i = 0;
for (const t of times) {
  await page.evaluate((t) => window.render(t), t);
  await page.screenshot({ path: path.join(dir, stills ? `still-${t.toFixed(1)}.jpg` : `${String(i).padStart(5, "0")}.jpg`), type: "jpeg", quality: 92 });
  i++;
  if (!stills && i % 300 === 0) console.log(`${i}/${times.length}`);
}
await browser.close();
if (!stills) {
  const out = path.join(here, "out", "ruNit-Direct-16x9.mp4");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(dir, "%05d.jpg"),
    "-i", path.join(here, "out", "mix.wav"), "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p",
    "-movflags", "+faststart", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-shortest", out], { stdio: "inherit" });
  console.log("wrote", out);
} else console.log("stills in", dir);
