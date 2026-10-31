#!/usr/bin/env node
// Download every basketball court in a region from OpenStreetMap into public/data/osm-courts.json.
// The globe draws these as the "all mapped courts" layer when zoomed out.
//
//   node scripts/fetch-osm-courts.mjs pa       # Pennsylvania (a minute or two)
//   node scripts/fetch-osm-courts.mjs us       # contiguous US (roughly 15–40 minutes)
//   node scripts/fetch-osm-courts.mjs world    # whole planet (an hour or more)
//   node scripts/fetch-osm-courts.mjs bbox 40.8 -76.2 41.6 -75.4 nepa
//
// Data © OpenStreetMap contributors, ODbL. Be kind to the public Overpass servers: this script
// runs one request at a time with pauses. For production, host your own Overpass or use a planet extract.

import fs from "node:fs";
import path from "node:path";

const PRESETS = {
  pa: { name: "Pennsylvania", bbox: [39.7, -80.52, 42.27, -74.69], tile: 1 },
  us: { name: "the contiguous United States", bbox: [24.4, -125.0, 49.4, -66.9], tile: 3 },
  world: { name: "the world", bbox: [-60, -180, 75, 180], tile: 10 },
};
const ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
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
  const q = `[out:csv(::lat,::lon;false;",")][timeout:180];nwr["sport"~"(^|;)basketball(;|$)"](${s},${w},${n},${e});out center;`;
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const url of ENDPOINTS) {
      try {
        const res = await fetch(url, { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "ruNit-court-snapshot/0.1" } });
        const text = await res.text();
        if (res.status === 429 || res.status === 504) { await sleep(15000); continue; }
        if (!res.ok || text.includes("runtime error")) throw new Error(`HTTP ${res.status}`);
        return text.trim().split("\n").filter(Boolean).map((l) => l.split(",").map(Number)).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
      } catch { await sleep(4000); }
    }
  }
  return null; // failed: caller splits the tile
}

async function tile(s, w, n, e, depth = 0) {
  const r = await query(s, w, n, e);
  await sleep(1500);
  if (r) return r;
  if (depth >= 3) { console.warn(`  gave up on ${s},${w},${n},${e}`); return []; }
  const ms = (s + n) / 2, mw = (w + e) / 2;
  console.log(`  splitting ${s.toFixed(2)},${w.toFixed(2)} into quarters`);
  const out = [];
  for (const [a, b, c, d] of [[s, w, ms, mw], [s, mw, ms, e], [ms, w, n, mw], [ms, mw, n, e]]) out.push(...(await tile(a, b, c, d, depth + 1)));
  return out;
}

const [S, W, N, E] = region.bbox;
const step = region.tile;
const points = [];
const total = Math.ceil((N - S) / step) * Math.ceil((E - W) / step);
let done = 0;
console.log(`Fetching basketball courts in ${region.name} (${total} tiles)…`);
for (let la = S; la < N; la += step) {
  for (let lo = W; lo < E; lo += step) {
    const pts = await tile(la, lo, Math.min(N, la + step), Math.min(E, lo + step));
    pts.forEach(([a, b]) => points.push([+a.toFixed(4), +b.toFixed(4)]));
    done++;
    process.stdout.write(`\r  ${done}/${total} tiles, ${points.length.toLocaleString()} courts`);
  }
}
const seen = new Set();
const unique = points.filter(([a, b]) => { const k = `${a},${b}`; return seen.has(k) ? false : (seen.add(k), true); });
const outFile = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "public", "data", "osm-courts.json");
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify({ region: region.name, fetchedAt: new Date().toISOString(), attribution: "© OpenStreetMap contributors, ODbL", points: unique }));
console.log(`\nSaved ${unique.length.toLocaleString()} courts to ${outFile}`);
