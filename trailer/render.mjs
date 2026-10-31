// Renders the trailer frame-by-frame with headless Chrome, then encodes with FFmpeg.
// Usage:
//   node trailer/render.mjs                 -> both formats, full length
//   node trailer/render.mjs 16x9            -> one format
//   node trailer/render.mjs 16x9 stills     -> a few preview stills only
// Requires: trailer/assets (node trailer/capture.mjs), trailer/out/score.wav (python3 trailer/audio.py trailer/out/score.wav 72)
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const here = path.dirname(new URL(import.meta.url).pathname);
const FPS = 30, DUR = 72;
const formats = process.argv[2] && process.argv[2] !== "all" ? [process.argv[2]] : ["16x9", "9x16"];
const stills = process.argv[3] === "stills";
const exe = ["/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox", "--allow-file-access-from-files"] });

for (const f of formats) {
  const [W, H] = f === "9x16" ? [1080, 1920] : [1920, 1080];
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.goto(`file://${here}/composition.html?f=${f}`);
  await page.evaluate(() => window.ready);
  const dir = path.join(here, "frames", f);
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const times = stills ? [3, 5.5, 11, 13, 19, 25, 29.4, 31.5, 37.5, 41.5, 43, 46, 50.5, 57, 59, 66, 69, 71] : Array.from({ length: DUR * FPS }, (_, i) => i / FPS);
  let i = 0;
  for (const t of times) {
    await page.evaluate((t) => window.render(t), t);
    const name = stills ? `still-${String(t).replace(".", "_")}.jpg` : `${String(i).padStart(5, "0")}.jpg`;
    await page.screenshot({ path: path.join(dir, name), type: "jpeg", quality: 92 });
    i++;
    if (!stills && i % 300 === 0) console.log(f, `${i}/${times.length}`);
  }
  await page.close();
  if (stills) { console.log("stills in", dir); continue; }
  const out = path.join(here, "out", `ruNit-demo-trailer-${f}.mp4`);
  execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error",
    "-framerate", String(FPS), "-i", path.join(dir, "%05d.jpg"),
    "-i", path.join(here, "out", "score.wav"),
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-shortest", out], { stdio: "inherit" });
  console.log("wrote", out);
}
await browser.close();
