// Split the worldwide court snapshot into a small index plus regional tiles, so the globe
// downloads counts for the whole planet up front and individual courts only where you zoom in.
// Usage: node scripts/split-court-snapshot.mjs [source.json]   (default: data/osm-courts.json)
import fs from "node:fs";
import path from "node:path";

const SRC = process.argv[2] ?? "data/osm-courts.json";
const OUT = "public/data/courts";
export const TILE_DEG = 5;

const snap = JSON.parse(fs.readFileSync(SRC, "utf8"));
if (!Array.isArray(snap.points)) throw new Error(`${SRC} has no points array`);

const round = (n) => Math.round(n * 1e4) / 1e4; // ~11 m, plenty to place a court
// Each cell sits at the mean position of its courts, so clusters land where the courts are, not on a grid.
const cells = (step) => {
  const bins = new Map();
  for (const [lat, lng] of snap.points) {
    const k = `${Math.floor((lat + 90) / step)},${Math.floor((lng + 180) / step)}`;
    const c = bins.get(k);
    if (c) { c[0] += lat; c[1] += lng; c[2]++; } else bins.set(k, [lat, lng, 1]);
  }
  return [...bins.values()].map(([la, lo, n]) => [round(la / n), round(lo / n), n]).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
};

const tiles = new Map();
for (const [lat, lng, type, id] of snap.points) {
  const k = `${Math.floor((lat + 90) / TILE_DEG)}_${Math.floor((lng + 180) / TILE_DEG)}`;
  if (!tiles.has(k)) tiles.set(k, []);
  tiles.get(k).push([round(lat), round(lng), type, id]);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "tiles"), { recursive: true });
let tileBytes = 0;
for (const [k, pts] of tiles) {
  pts.sort((x, y) => x[0] - y[0]);
  const body = JSON.stringify(pts);
  tileBytes += body.length;
  fs.writeFileSync(path.join(OUT, "tiles", `${k}.json`), body);
}
const index = {
  region: snap.region, fetchedAt: snap.fetchedAt, complete: snap.complete === true,
  attribution: snap.attribution ?? "© OpenStreetMap contributors, ODbL", source: snap.source,
  count: snap.points.length, tileDeg: TILE_DEG, tiles: [...tiles.keys()].sort(),
  coarse: cells(5), medium: cells(1),
};
const body = JSON.stringify(index);
fs.writeFileSync(path.join(OUT, "index.json"), body);
console.log(`${snap.points.length} courts → index ${(body.length / 1024).toFixed(0)} KB, ${tiles.size} tiles totalling ${(tileBytes / 1048576).toFixed(1)} MB (largest ${(Math.max(...[...tiles.values()].map((t) => JSON.stringify(t).length)) / 1024).toFixed(0)} KB)`);
