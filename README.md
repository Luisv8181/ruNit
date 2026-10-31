# ruNit — Who's got next?

A basketball network: find a court, call a run, know your game, open the next door.
This repository is a **working, interactive prototype** that runs entirely in **demo mode** — no keys, no backend required — with a fictional Hazleton & Scranton, PA community.

> Everything you see in the app (people, courts, games, squads, listings) is **fictional demo data**, and the app says so on every screen.

## Run it

```bash
npm install
npm run dev            # http://localhost:3000
# or a production build
npm run build && npm start
```

Requires Node 20+ (tested on Node 22). TypeScript is pinned to 5.x (Next 15 does not support TypeScript 7).

**Reset the demo** any time with the “Reset demo” link in the top banner. Demo state is saved in your browser's localStorage.

## The 14-step demo story

| # | Step | Where |
|---|------|-------|
| 1 | Open ruNit | `/` — “Who's got next?” |
| 2 | Find a nearby court | `/courts` — map, filters, court detail, verification status |
| 3 | Discover a run | Home “Runs near you” or a court's “Runs here” |
| 4 | Create a game | `Create a run` (`/create`) — defaults filled, validated |
| 5 | Join the game | “Join · N spots” on any run row (no menus) |
| 6 | Check in | `/runs/r-northside-now` — type the code or “Scan QR” |
| 7 | Enter post-game stats | After *Tip off* → *Game over — enter final* → box score |
| 8 | Confirm statistics | Mismatch is flagged, resolved by players, then confirmed |
| 9 | Complete a reflection | “How did you get your points today?” |
| 10 | View Player DNA | Reflection result + `/my-game` |
| 11 | Customize your character | `/my-game/customize` |
| 12 | Join a squad | `/community` → Squads |
| 13 | Explore local rankings | `/community` → Rankings |
| 14 | Find an opportunity | `/opportunities` |
| 15 | Check court records | `/courts` → any court → Court records |
| 16 | Open your court passport | `/my-game/passport` |
| 17 | Spin the basketball globe | `/courts/globe` (or *Globe* on Courts) |
| 18 | Keep score live, then confirm with a tap | Run page: scoreboard → box score → *Confirm with a tap* |
| 19 | Share your game card | After *Save to My Game* |
| 20 | Get in line at a court | Court detail → *Got next* |
| 21 | Add friends, see head-to-head | `/community` → Friends |

The fastest path through the signature Game Loop: Home → the dark **“You're up”** card → Scan QR → Simulate arrivals → Tip off → Game over → 21–18 → enter your stats → *Ask Big Bell to recheck* → *Request confirmations* → *Save to My Game* → reflect.

## What's in the box

- `src/app` — Next.js 15 App Router screens (Home, Courts, Create, Run/Game Loop, Reflect, My Game, Customize, Community, Opportunities)
- `src/lib` — domain types, demo store (reducer + localStorage), demo data, archetype/DNA logic, insight provider, backend mode
- `src/components` — shell/navigation, layered character renderer, map renderers, run rows, QR
- `supabase/migrations/0001_init.sql` — full Postgres/PostGIS schema with Row Level Security
- `supabase/tests` — local Postgres smoke test for the migration and key RLS rules
- `trailer/` — reproducible trailer pipeline (capture → compose → synthesize audio → render → encode)
- `scripts/screenshots.mjs` — end-to-end visual QA walk-through (desktop + mobile)
- `docs/` — product, design, schema, architecture, flows, demo data, trailer production, roadmap

## Trailer

Rendered files: `trailer/out/ruNit-demo-trailer-16x9.mp4` and `trailer/out/ruNit-demo-trailer-9x16.mp4` (72 s). To re-render, see [docs/TRAILER_PRODUCTION.md](docs/TRAILER_PRODUCTION.md).

## Status at a glance

| Works now (demo mode) | Simulated in the demo | Needs credentials / not built |
|---|---|---|
| Navigation, all five destinations, mobile + desktop | Other players joining your run, arriving, and confirming stats | Supabase auth, database writes, realtime (adapter not implemented) |
| Create / join / leave runs with validation | Camera QR scanning (button simulates a scan) | Live map tiles (set `NEXT_PUBLIC_MAP_STYLE_URL` for MapLibre) |
| Check-in by code, teams balanced by MMR, final score rules | Teammate over-reporting by 2 pts so the mismatch check has something to catch | Photo/video upload, video-supported stats |
| Stat entry, mismatch detection, confirm/dispute, verification ladder | Organizer receiving your interest | Messaging, push notifications, organizer verification workflow |
| Reflection → explainable Player DNA change → insights | | LLM-based insight provider (interface exists; rules engine ships) |
| Character creator, share card, squads, rankings, challenges, report/block | |
| Court records, court passport stamps and badges (confirmed games only) | Past games at each court (made-up ledger) | Payments, tournaments brackets, seasons |
| Court submissions & corrections (pending state) | | Moderation tools, youth safeguarding (adults-only at launch) |

See [docs/ROADMAP.md](docs/ROADMAP.md) for what to build next.

## Real courts from OpenStreetMap

The globe (`/courts/globe`) loads real basketball courts (`sport=basketball`) live from OpenStreetMap's Overpass API for whatever area you zoom into. This runs in the viewer's browser, so it needs normal internet access; it was not reachable from the sandbox this prototype was built in, so it is tested against a recorded-format fixture (`node scripts/test-globe.mjs`).

To light up the whole planet when zoomed out, download a snapshot once on your own machine:

```bash
node scripts/fetch-osm-courts.mjs pa      # Pennsylvania
node scripts/fetch-osm-courts.mjs us      # contiguous US
node scripts/fetch-osm-courts.mjs world   # everything (slow; be kind to the public servers)
```

This writes `public/data/osm-courts.json`, which the globe picks up automatically. Court data © OpenStreetMap contributors, ODbL.

## Native-only features
Lock-screen Live Activities, widgets, true tap-to-confirm (Nearby Interaction / NFC) and native haptics need the iOS and Android apps. They're specified in [docs/NATIVE.md](docs/NATIVE.md); the web build has working stand-ins. Video stat tracking is planned in [docs/VIDEO_TRACKING.md](docs/VIDEO_TRACKING.md).
