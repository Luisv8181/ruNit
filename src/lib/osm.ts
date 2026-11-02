// Live basketball courts from OpenStreetMap (Overpass API), fetched in the viewer's browser.
// OSM data © OpenStreetMap contributors, available under the Open Database License (ODbL).
// Courts are mapped pitches tagged sport=basketball. Broader sports halls are venues, not court counts.

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
  "https://overpass.private.coffee/api/interpreter",
];

const TILE = 0.5; // degrees; tiles are cached individually
const MAX_TILES_PER_VIEW = 12;
const CACHE_KEY = "runit-osm-tiles-v2";
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
    if (t.leisure !== "pitch" && t.leisure !== "practice_pitch") continue;
    out.push({
      id: `osm-${e.type}-${e.id}`, osmType: e.type, osmId: e.id, lat, lng,
      name: t.name, hoops: t.hoops, surface: t.surface,
      lit: t.lit === "yes" ? true : t.lit === "no" ? false : undefined,
      access: t.access,
      indoor: t.indoor === "yes" || t.building !== undefined || t.covered === "yes",
    });
  }
  return out;
}

export function overpassQuery(s: number, w: number, n: number, e: number) {
  return `[out:json][timeout:25];nwr["leisure"~"^(pitch|practice_pitch)$"]["sport"~"(^|;)basketball(;|$)"](${s},${w},${n},${e});out center tags;`;
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

const wrapLng = (lng: number) => ((lng + 180) % 360 + 360) % 360 - 180;

function longitudeSegments(w: number, e: number): [number, number][] {
  if (e - w >= 360) return [[-180, 180]];
  const west = wrapLng(w), east = wrapLng(e);
  return west <= east ? [[west, east]] : [[west, 180], [-180, east]];
}

/** Courts inside a bounding box. Large boxes are refused (returns skipped) — zoom in to load. */
export async function courtsInView(s: number, w: number, n: number, e: number, signal?: AbortSignal): Promise<LoadResult> {
  loadStorage();
  const segments = longitudeSegments(w, e);
  const south = Math.max(-85, s), north = Math.min(85, n);
  const keys = segments.flatMap(([west, east]) => tilesFor(south, west, north, east));
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
  return {
    courts: all.filter((c) => {
      if (seen.has(c.id) || c.lat < south || c.lat > north || !segments.some(([west, east]) => c.lng >= west && c.lng <= east)) return false;
      seen.add(c.id);
      return true;
    }),
    tiles: keys.length, failed, skipped: false,
  };
}

export function osmUrl(c: OsmCourt) {
  return `https://www.openstreetmap.org/${c.osmType}/${c.osmId}`;
}

export type SnapshotPoint = [lat: number, lng: number, type: 0 | 1 | 2, osmId: number];
const SNAPSHOT_TYPES = ["node", "way", "relation"] as const;
export const snapshotCourtId = (point: SnapshotPoint) => `osm-${SNAPSHOT_TYPES[point[2]]}-${point[3]}`;
export const snapshotCourtUrl = (point: SnapshotPoint) => `https://www.openstreetmap.org/${SNAPSHOT_TYPES[point[2]]}/${point[3]}`;

export type DensityCell = [lat: number, lng: number, count: number];
export type CourtDensity = { coarse: DensityCell[]; medium: DensityCell[]; fine: DensityCell[] };

// Each cell sits at the mean position of its courts, so clusters land where the courts are, not on a grid.
const cells = (points: SnapshotPoint[], step: number): DensityCell[] => {
  const bins = new Map<string, DensityCell>();
  for (const [lat, lng] of points) {
    const key = `${Math.floor((lat + 90) / step)},${Math.floor((lng + 180) / step)}`;
    const cell = bins.get(key);
    if (cell) { cell[0] += lat; cell[1] += lng; cell[2]++; } else bins.set(key, [lat, lng, 1]);
  }
  return [...bins.values()].map(([la, lo, n]): DensityCell => [la / n, lo / n, n]).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
};

/** Street-scale counts, built from whichever regional tiles have loaded. */
export const fineDensity = (points: SnapshotPoint[]) => cells(points, 0.1);

// The worldwide snapshot ships split (scripts/split-court-snapshot.mjs): a small index with counts
// for the whole planet, and 5° tiles of individual courts fetched only when the globe zooms in.
export interface CourtIndex {
  region: string;
  fetchedAt: string;
  complete: boolean;
  count: number;
  tileDeg: number;
  tiles: Set<string>;
  coarse: DensityCell[];
  medium: DensityCell[];
}

export async function loadCourtIndex(): Promise<CourtIndex | null> {
  try {
    const res = await fetch("/data/courts/index.json");
    if (!res.ok) return null;
    const j = await res.json();
    if (!Array.isArray(j.coarse) || !Array.isArray(j.medium) || !Array.isArray(j.tiles) || typeof j.count !== "number" || typeof j.region !== "string") return null;
    return { region: j.region, fetchedAt: j.fetchedAt, complete: j.complete === true, count: j.count, tileDeg: j.tileDeg, tiles: new Set(j.tiles), coarse: j.coarse, medium: j.medium };
  } catch {
    return null;
  }
}

const MAX_SNAPSHOT_TILES = 16;

/** Keys of snapshot tiles covering a view that exist and haven't been fetched yet. Empty when the view is too wide. */
export function snapshotTilesFor(index: CourtIndex, s: number, w: number, n: number, e: number, have: Set<string>): string[] {
  const d = index.tileDeg;
  const keys: string[] = [];
  for (const [west, east] of longitudeSegments(w, e)) {
    for (let a = Math.floor((Math.max(-90, s) + 90) / d); a <= Math.floor((Math.min(89.999, n) + 90) / d); a++)
      for (let b = Math.floor((west + 180) / d); b <= Math.floor((Math.min(179.999, east) + 180) / d); b++) keys.push(`${a}_${b}`);
  }
  if (keys.length > MAX_SNAPSHOT_TILES) return [];
  return keys.filter((k) => index.tiles.has(k) && !have.has(k));
}

export async function loadSnapshotTile(key: string): Promise<SnapshotPoint[]> {
  const res = await fetch(`/data/courts/tiles/${key}.json`);
  if (!res.ok) throw new Error(`court tile ${key}: ${res.status}`);
  return res.json();
}
