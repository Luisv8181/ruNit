// Live basketball courts from OpenStreetMap (Overpass API), fetched in the viewer's browser.
// OSM data © OpenStreetMap contributors, available under the Open Database License (ODbL).
// Courts are elements tagged sport=basketball (usually leisure=pitch; indoor ones often leisure=sports_hall).

export interface OsmCourt {
  id: string;          // e.g. "osm-way-123"
  osmType: "node" | "way" | "relation";
  osmId: number;
  lat: number;
  lng: number;
  name?: string;
  hoops?: string;
  surface?: string;
  lit?: boolean;
  access?: string;
  indoor: boolean;
}

const ENDPOINTS = [
  process.env.NEXT_PUBLIC_OVERPASS_URL || "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const TILE = 0.5; // degrees; tiles are cached individually
const MAX_TILES_PER_VIEW = 12;
const CACHE_KEY = "runit-osm-tiles-v1";
const CACHE_TTL = 24 * 3600e3;

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export function parseOverpass(json: { elements?: OverpassElement[] }): OsmCourt[] {
  const out: OsmCourt[] = [];
  for (const e of json.elements ?? []) {
    const lat = e.lat ?? e.center?.lat, lng = e.lon ?? e.center?.lon;
    if (lat === undefined || lng === undefined) continue;
    const t = e.tags ?? {};
    if (!/(^|;)\s*basketball\s*(;|$)/.test(t.sport ?? "")) continue;
    out.push({
      id: `osm-${e.type}-${e.id}`, osmType: e.type, osmId: e.id, lat, lng,
      name: t.name, hoops: t.hoops, surface: t.surface,
      lit: t.lit === "yes" ? true : t.lit === "no" ? false : undefined,
      access: t.access,
      indoor: t.indoor === "yes" || t.leisure === "sports_hall" || t.leisure === "sports_centre" || t.building !== undefined || t.covered === "yes",
    });
  }
  return out;
}

export function overpassQuery(s: number, w: number, n: number, e: number) {
  return `[out:json][timeout:25];nwr["sport"~"(^|;)basketball(;|$)"](${s},${w},${n},${e});out center tags;`;
}

// ---------- tile cache ----------
type TileEntry = { at: number; courts: OsmCourt[] };
const memory = new Map<string, TileEntry>();
let storageLoaded = false;
function loadStorage() {
  if (storageLoaded) return;
  storageLoaded = true;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw) as Record<string, TileEntry>;
    Object.entries(obj).forEach(([k, v]) => { if (Date.now() - v.at < CACHE_TTL) memory.set(k, v); });
  } catch { /* storage unavailable */ }
}
function saveStorage() {
  try {
    const recent = [...memory.entries()].sort((a, b) => b[1].at - a[1].at).slice(0, 80);
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(recent)));
  } catch { /* quota or private mode — the in-memory cache still works */ }
}

export function tilesFor(s: number, w: number, n: number, e: number) {
  const keys: string[] = [];
  for (let la = Math.floor(s / TILE) * TILE; la < n; la += TILE)
    for (let lo = Math.floor(w / TILE) * TILE; lo < e; lo += TILE)
      keys.push(`${la.toFixed(1)},${lo.toFixed(1)}`);
  return keys;
}

async function fetchTile(key: string, signal?: AbortSignal): Promise<OsmCourt[]> {
  const [la, lo] = key.split(",").map(Number);
  const body = "data=" + encodeURIComponent(overpassQuery(la, lo, la + TILE, lo + TILE));
  let lastErr: unknown;
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" }, signal });
      if (res.status === 429) throw new Error("busy");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return parseOverpass(await res.json());
    } catch (err) {
      if ((err as Error).name === "AbortError") throw err;
      lastErr = err;
    }
  }
  throw lastErr ?? new Error("unreachable");
}

export type LoadResult = { courts: OsmCourt[]; tiles: number; failed: number; skipped: boolean };

/** Courts inside a bounding box. Large boxes are refused (returns skipped) — zoom in to load. */
export async function courtsInView(s: number, w: number, n: number, e: number, signal?: AbortSignal): Promise<LoadResult> {
  loadStorage();
  const keys = tilesFor(Math.max(-85, s), Math.max(-180, w), Math.min(85, n), Math.min(180, e));
  if (keys.length > MAX_TILES_PER_VIEW) return { courts: [], tiles: 0, failed: 0, skipped: true };
  let failed = 0;
  const all: OsmCourt[] = [];
  for (const k of keys) {
    const hit = memory.get(k);
    if (hit && Date.now() - hit.at < CACHE_TTL) { all.push(...hit.courts); continue; }
    try {
      const courts = await fetchTile(k, signal);
      memory.set(k, { at: Date.now(), courts });
      all.push(...courts);
    } catch (err) {
      if ((err as Error).name === "AbortError") throw err;
      failed++;
    }
  }
  if (failed < keys.length) saveStorage();
  const seen = new Set<string>();
  return { courts: all.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true))), tiles: keys.length, failed, skipped: false };
}

export function osmUrl(c: OsmCourt) {
  return `https://www.openstreetmap.org/${c.osmType}/${c.osmId}`;
}

/** Optional prebuilt snapshot (public/data/osm-courts.json, made by scripts/fetch-osm-courts.mjs). */
export async function loadSnapshot(): Promise<{ points: [number, number][]; region: string; fetchedAt: string } | null> {
  try {
    const res = await fetch("/data/osm-courts.json");
    if (!res.ok) return null;
    const j = await res.json();
    return { points: j.points, region: j.region, fetchedAt: j.fetchedAt };
  } catch {
    return null;
  }
}
