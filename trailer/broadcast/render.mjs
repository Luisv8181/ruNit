// Renders the ruNit broadcast trailer: 1920x1080, 60 fps, H.264 + AAC, loudness -14 LUFS.
// Usage: node trailer/broadcast/render.mjs            full film
//        node trailer/broadcast/render.mjs stills     a contact set of stills for review
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const here = path.dirname(new URL(import.meta.url).pathname);
const TL = JSON.parse(fs.readFileSync(path.join(here, "timeline.json"), "utf8"));
const META = JSON.parse(fs.readFileSync(path.join(here, "assets", "meta.json"), "utf8"));
const GLOBE_FRAMES = fs.readdirSync(path.join(here, "globe")).filter((f) => f.endsWith(".png")).length;
const FPS = 60;
const stills = process.argv[2] === "stills";
const S = Object.fromEntries(TL.scenes.map((s) => [s.id, s]));
const exe = ["/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox", "--allow-file-access-from-files"] });
const dir = path.join(here, stills ? "stills" : "frames");
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });

const times = stills
  ? [1.0, 2.0, 3.2, 4.1, S.title.start + 0.7, S.title.start + 3, S.find.start + 0.25, S.find.start + 3, S.next.start + 3, S.score.start + 1.5, S.score.start + 4.4,
     S.bump.start + 1.5, S.bump.start + 3.55, S.bump.start + 4.3, S.box.start + 3, S.records.start + 3, S.passport.start + 3, S.friends.start + 4,
     S.looks.start + 3.5, S.globe.start + 2.5, S.globe.start + 5.5, S.montage.start + 0.3, S.montage.start + 2.1, S.end.start + 1, S.end.start + 6.5]
  : Array.from({ length: Math.ceil(TL.duration * FPS) }, (_, i) => i / FPS);

const WORKERS = stills ? 1 : Math.max(1, Math.min(3, os.cpus().length));
async function worker(w) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.addInitScript(([tl, meta, gf]) => { window.TL = tl; window.META = meta; window.GLOBE_FRAMES = gf; }, [TL, META, GLOBE_FRAMES]);
  await page.goto(`file://${here}/film.html`);
  await page.evaluate(() => window.ready);
  for (let i = w; i < times.length; i += WORKERS) {
    await page.evaluate((t) => window.render(t), times[i]);
    const name = stills ? `still-${String(i).padStart(2, "0")}-${times[i].toFixed(2)}.jpg` : `${String(i).padStart(5, "0")}.jpg`;
    await page.screenshot({ path: path.join(dir, name), type: "jpeg", quality: 94 });
    if (!stills && w === 0 && i % 600 === 0) console.log(`${i}/${times.length}`);
  }
  await page.close();
}
const t0 = Date.now();
await Promise.all(Array.from({ length: WORKERS }, (_, w) => worker(w)));
await browser.close();
console.log(`frames done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
if (!stills) {
  const out = path.join(here, "out", "ruNit-Broadcast-16x9.mp4");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(dir, "%05d.jpg"),
    "-i", path.join(here, "out", "mix.wav"), "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-r", String(FPS),
    "-movflags", "+faststart", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", out], { stdio: "inherit" });
  console.log("wrote", out);
}
