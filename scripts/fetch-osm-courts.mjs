#!/usr/bin/env node
// Build a snapshot of mapped basketball pitches for the globe.
// Only a completed import is published; failed tiles stop the build.
//
//   node scripts/fetch-osm-courts.mjs pa       # Pennsylvania (a minute or two)
//   node scripts/fetch-osm-courts.mjs us       # contiguous US (roughly 15–40 minutes)
//   node scripts/fetch-osm-courts.mjs world    # whole planet (long-running)
//   node scripts/fetch-osm-courts.mjs bbox 40.8 -76.2 41.6 -75.4 nepa
//
// Data © OpenStreetMap contributors, ODbL. For a full world build, use a dedicated
// Overpass instance or an OSM planet extract; public servers may reject large jobs.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PRESETS = {
  pa: { name: "Pennsylvania area", bbox: [39.7, -80.52, 42.27, -74.69], tile: 1 },
  us: { name: "the contiguous United States", bbox: [24.4, -125.0, 49.4, -66.9], tile: 3 },
  world: { name: "the world", bbox: [-85, -180, 85, 180], tile: 30 },
};
const ENDPOINTS = process.env.OVERPASS_URL
  ? [process.env.OVERPASS_URL]
  : ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const [mode, ...rest] = process.argv.slice(2);
let region;
if (mode === "bbox") {
  const [s, w, n, e, name = "custom area"] = rest;
  region = { name, bbox: [s, w, n, e].map(Number), tile: 1 };
} else if (PRESETS[mode]) region = PRESETS[mode];
else {
  console.log("Usage: node scripts/fetch-osm-courts.mjs <pa|us|world|bbox s w n e name>");
  process.exit(1);
}

async function query(s, w, n, e) {
  const q = `[out:json][timeout:180];nwr["leisure"~"^(pitch|practice_pitch)$"]["sport"~"(^|;)basketball(;|$)"](${s},${w},${n},${e});out center;`;
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const url of ENDPOINTS) {
      try {
        const res = await fetch(`${url}?data=${encodeURIComponent(q)}`, { headers: { "User-Agent": "ruNit-court-snapshot/0.2" }, signal: AbortSignal.timeout(200000) });
        const text = await res.text();
        if (!res.ok || text.includes("runtime error") || text.includes("<html")) throw new Error(`HTTP ${res.status}`);
        return JSON.parse(text).elements
          .map((element) => ({ id: `${element.type}/${element.id}`, lat: element.lat ?? element.center?.lat, lon: element.lon ?? element.center?.lon }))
          .filter(({ lat, lon }) => Number.isFinite(lat) && Number.isFinite(lon));
      } catch (error) { console.warn(`  ${url}: ${error.message}`); await sleep(4000); }
    }
  }
  return null;
}

async function tile(s, w, n, e, depth = 0) {
  const r = await query(s, w, n, e);
  await sleep(1500);
  if (r) return r;
  if (depth >= 4) throw new Error(`Incomplete snapshot: tile ${s},${w},${n},${e} failed`);
  const ms = (s + n) / 2, mw = (w + e) / 2;
  console.log(`  splitting ${s.toFixed(2)},${w.toFixed(2)} into quarters`);
  const out = [];
  for (const [a, b, c, d] of [[s, w, ms, mw], [s, mw, ms, e], [ms, w, n, mw], [ms, mw, n, e]]) out.push(...(await tile(a, b, c, d, depth + 1)));
  return out;
}

const [S, W, N, E] = region.bbox;
const step = region.tile;
const courts = new Map();
const progressFile = process.env.OSM_SNAPSHOT_PROGRESS_FILE;
const progressKey = JSON.stringify({ bbox: region.bbox, step });
let progress = { key: progressKey, tiles: {} };
if (progressFile && fs.existsSync(progressFile)) {
  const saved = JSON.parse(fs.readFileSync(progressFile, "utf8"));
  if (saved.key === progressKey) progress = saved;
}
const total = Math.ceil((N - S) / step) * Math.ceil((E - W) / step);
let done = 0;
console.log(`Fetching basketball courts in ${region.name} (${total} tiles)…`);
for (let la = S; la < N; la += step) {
  for (let lo = W; lo < E; lo += step) {
    const tileKey = `${la},${lo}`;
    const pts = progress.tiles[tileKey] ?? await tile(la, lo, Math.min(N, la + step), Math.min(E, lo + step));
    if (!progress.tiles[tileKey] && progressFile) {
      progress.tiles[tileKey] = pts;
      fs.writeFileSync(progressFile, JSON.stringify(progress));
    }
    pts.forEach(({ id, lat, lon }) => {
      const [kind, osmId] = id.split("/");
      courts.set(id, [+lat.toFixed(5), +lon.toFixed(5), { node: 0, way: 1, relation: 2 }[kind], Number(osmId)]);
    });
    done++;
    process.stdout.write(`\r  ${done}/${total} tiles, ${courts.size.toLocaleString()} courts`);
  }
}
const points = [...courts.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
const outFile = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "osm-courts.json"); // then: node scripts/split-court-snapshot.mjs
fs.mkdirSync(path.dirname(outFile), { recursive: true });
const tmpFile = `${outFile}.tmp`;
fs.writeFileSync(tmpFile, JSON.stringify({ region: region.name, bbox: region.bbox, fetchedAt: new Date().toISOString(), complete: true, attribution: "© OpenStreetMap contributors, ODbL", points }));
fs.renameSync(tmpFile, outFile);
console.log(`\nSaved ${points.length.toLocaleString()} courts to ${outFile}`);
