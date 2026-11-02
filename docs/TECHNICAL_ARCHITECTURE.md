# Technical architecture

## Stack (as built)
- **Next.js 15 (App Router) + React 19 + TypeScript 5 + Tailwind CSS 3.** All screens are client components backed by one store.
- **Fonts** self-hosted via Fontsource (Archivo variable, Instrument Sans variable, JetBrains Mono) — no network font calls.
- **Maps:** `CourtMap` has two renderers behind one props interface: `DemoMap` (offline SVG, default) and `LiveMap` (MapLibre GL, enabled when `NEXT_PUBLIC_MAP_STYLE_URL` is set — any MapLibre style: Protomaps, MapTiler, self-hosted OSM tiles).
- **QR:** `qrcode` renders check-in codes as SVG.
- **Backend:** schema + RLS in `supabase/`. `src/lib/backend.ts` detects mode and defines the `RunitBackend` contract. **The Supabase adapter is not implemented**; the app never pretends a write reached a server.

## Data flow
```
UI (src/app/*) ──dispatch(action)──▶ reducer (src/lib/store.tsx) ──▶ state ──▶ localStorage (runit-demo-v3)
                                         │
                                         ├─ archetypes.ts  (DNA ranking, archetype naming, explainable nudge)
                                         ├─ insights.ts    (InsightProvider interface + rules-v1 provider)
                                         └─ util.ts        (distance, team balancing, demo simulation)
```
Every reducer action maps 1:1 to a backend call in the `RunitBackend` contract, so swapping in Supabase means implementing that adapter and replacing local dispatch with async calls + Realtime subscriptions.

## Simulation boundaries (demo mode only)
All simulation lives in clearly named places: `simJoin` action and the effect in `runs/[id]/page.tsx` (players joining your run), “Simulate arrivals”, “Scan QR”, `simulateOthers()` in `util.ts` (other players' stat lines, with one deliberate +2 over-report), and *Request confirmations*. Each is labeled “Demo” or “sim” in the UI.

## AI
`InsightProvider` is provider-independent and returns structured `Insight` objects that **must** include `evidence` and `confidence`. The shipped `rules-v1` provider is deterministic. An LLM provider can implement the same interface server-side; it should receive aggregates (not raw identities) and its output must be validated against the same shape.

## Native clients
Domain logic (types, archetypes, insights, MMR) is plain TypeScript with no DOM dependencies and can be shared with a React Native app. The schema + RLS is the API boundary; mobile clients talk to Supabase directly with the same policies.

## Security
- RLS on every table; private account data split from public profile.
- Adults-only check constraint; no messaging surface; report/block.
- Validation in UI (forms) and in the DB (check constraints, enums).
- Rate limiting: to add at the edge (Supabase Edge Functions / middleware) for create-run, check-in and stat submission — not in this build.

## Quality tooling
- `npm run build` (type-checks).
- `node scripts/screenshots.mjs [baseUrl] [outDir]` — Playwright walk-through of all 14 demo steps on desktop (1440×900) and mobile (390×844), saving screenshots and failing loudly on runtime errors. Last run: **0 runtime errors**.
- `bash supabase/tests/run_local.sh` — migration + RLS smoke test on local Postgres.

## Basketball globe and OpenStreetMap
- `src/components/BallGlobe.tsx`: canvas orthographic globe (d3-geo). Leather gradient, Fibonacci-lattice pebbles, land from `world-atlas` (110m, then 50m when zoomed), US state lines from `us-atlas`, seams as geographic lines, lighting overlays. Drag, wheel, pinch and keyboard control; city clustering; fly-to animation; idle spin off under reduced motion. Snapshot courts become clickable count circles at 5°, 1°, and 0.1° resolution, grouped again by screen position to avoid overlap. City zoom reveals individual courts even when live lookups fail.
- `src/lib/osm.ts`: Overpass loader. Splits the view into 0.5° tiles, caches tiles for 24 hours in memory and localStorage, refuses views over 12 tiles ("zoom in a little more"), falls back to a second Overpass server, and dedupes. Only mapped basketball pitches (`leisure=pitch` or `leisure=practice_pitch` with `sport=basketball`, including shared sport values) count as courts. A sports centre by itself is a venue, not an individual court.
- `scripts/build-global-courts.py`: repeatable worldwide snapshot builder using OpenStreetMap US [Layercake POIs](https://layercake.openstreetmap.us/layers/pois/) and DuckDB (`python -m pip install duckdb`, then `python scripts/build-global-courts.py`). It filters mapped basketball pitches, deduplicates by OSM type and ID, and atomically writes `data/osm-courts.json` (not served, gitignored). `node scripts/split-court-snapshot.mjs` then writes what the app serves: `public/data/courts/index.json` (counts at 5° and 1° for the whole planet, ~120 KB) and 5° tiles under `public/data/courts/tiles/` that the globe fetches only when zoomed in. The checked-in tiles hold 371,590 court coordinates and OSM IDs from the 2026-11-01 Layercake release. These are mapped locations, not a guarantee that every physical court exists in OSM.
- `scripts/fetch-osm-courts.mjs`: alternate regional snapshot builder with adaptive tile splitting, one request at a time, optional `OVERPASS_URL`, and optional `OSM_SNAPSHOT_PROGRESS_FILE` for long resumable imports. It publishes only after every tile succeeds. Public Overpass instances may reject large jobs.
- Production: refresh the Layercake snapshot on a schedule and point `NEXT_PUBLIC_OVERPASS_URL` at a service intended for production traffic. The UI shows its snapshot region and date because OpenStreetMap mapping is incomplete in some places.
