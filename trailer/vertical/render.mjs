// Renders the ruNit vertical story trailer: 1080x1920, 60 fps, H.264 + AAC, loudness -14 LUFS.
// Usage: node trailer/broadcast/render.mjs            full film
//        node trailer/broadcast/render.mjs stills     a contact set of stills for review
import { chromium } from "playwright";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const here = path.dirname(new URL(import.meta.url).pathname);
const TL = JSON.parse(fs.readFileSync(path.join(here, "timeline.json"), "utf8"));
const FPS = 60;
const stills = process.argv[2] === "stills";
const S = Object.fromEntries(TL.scenes.map((s) => [s.id, s]));
const exe = ["/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox", "--allow-file-access-from-files"] });
const dir = path.join(here, stills ? "stills" : "frames");
// RANGE=a-b re-renders only those frame numbers into the existing frames folder
const RANGE = process.env.RANGE?.split("-").map(Number);
if (!RANGE) { fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); }

const times = stills
  ? [0.8, 1.8, 3.2, S.call.start + 0.2, S.call.start + 2.5, S.checkin.start + 1.5, S.checkin.start + 3.5, S.play.start + 1.5, S.play.start + 4.6, S.play.start + 5.2, S.play.start + 5.6,
     S.reflect.start + 2.5, S.dna.start + 2.5, S.custom.start + 3.5, S.king.start + 2.5, S.doors.start + 2.5, S.end.start + 1, S.end.start + 4]
  : Array.from({ length: Math.ceil(TL.duration * FPS) }, (_, i) => i / FPS);

const WORKERS = stills ? 1 : Math.max(1, Math.min(3, os.cpus().length));
async function worker(w) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.addInitScript((tl) => { window.TL = tl; }, TL);
  await page.goto(`file://${here}/film.html`);
  await page.evaluate(() => window.ready);
  for (let i = w + (RANGE ? RANGE[0] : 0); i < (RANGE ? Math.min(RANGE[1], times.length) : times.length); i += WORKERS) {
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
  const out = path.join(here, "out", "ruNit-Story-9x16.mp4");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const probe = spawnSync("ffmpeg", ["-hide_banner", "-i", path.join(here, "out", "mix.wav"), "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"]).stderr.toString();
  const m = JSON.parse(probe.slice(probe.lastIndexOf("{")));
  const ln = `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(dir, "%05d.jpg"),
    "-i", path.join(here, "out", "mix.wav"), "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-tune", "film", "-pix_fmt", "yuv420p", "-r", String(FPS),
    "-movflags", "+faststart", "-af", ln, "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", out], { stdio: "inherit" });
  console.log("wrote", out);
}
