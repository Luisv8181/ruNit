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
- `src/components/BallGlobe.tsx`: canvas orthographic globe (d3-geo). Leather gradient, Fibonacci-lattice pebbles, land from `world-atlas` (110m, then 50m when zoomed), US state lines from `us-atlas`, seams as geographic lines, lighting overlays. Drag, wheel, pinch and keyboard control; city clustering; fly-to animation; idle spin off under reduced motion.
- `src/lib/osm.ts`: Overpass loader. Splits the view into 0.5° tiles, caches tiles for 24 hours in memory and localStorage, refuses views over 12 tiles ("zoom in a little more"), falls back to a second Overpass server, and dedupes. Parsing keeps only `sport=basketball` (including shared values like `basketball;tennis`).
- `scripts/fetch-osm-courts.mjs`: one-off snapshot downloader with adaptive tile splitting and polite pacing. Output: `public/data/osm-courts.json` (coordinates only; details load live on zoom).
- Production: point `NEXT_PUBLIC_OVERPASS_URL` at your own Overpass instance, or replace snapshots with vector tiles (PMTiles) for the full worldwide set.
