# Demo data

Source: `src/lib/demo-data.ts`. **All of it is fictional.** Names of people, squads, courts and organizations were invented for this demo; court coordinates are approximate placements inside Hazleton and Scranton for the map only and do not identify real facilities. Organizations in listings are prefixed “Demo:” in the UI.

## The story
You are **Jaylen “J-Rise” Cruz**, a 6′4″ wing from Hazleton who runs Northside on weeknights and is working on his left hand. Your DNA leans Slasher (85), so your archetype is *Slashing Wing* and your equipped effect is orange energy trails with a flux sleeve.

Your 3v3 at **Northside Commons** tips in minutes (`/runs/r-northside-now`, code shown on the page). Big Bell and Yari are already checked in.

## Contents
- **9 courts** — 5 around Hazleton/West Hazleton, 4 around Scranton/Dunmore, covering every verification state, indoor/outdoor, lights/no lights, membership and school-hours access.
- **12 players** with distinct DNA, MMR (1311–1533), Trust and characters.
- **6 runs** — one is yours (game loop), others are public runs to join, including recurring ones.
- **6 past games + 4 reflections** — chosen so the insight engine finds a real pattern (attacking the basket, weak hand mentioned twice), an early-signal habit (settling for threes in a loss), and turnovers tracking losses.
- **4 squads**, **2 challenges** (one addressed to you), **8 opportunities** (two deliberately unverified organizers).

## Dates
Seeded relative to the moment the demo first loads, so runs are always “today/tomorrow”. Reset the demo to re-seed.

## Court ledger
`courtGames` (seeded in `src/lib/records.ts`) holds ~120 made-up past games across the 9 courts so every court has a record book. Each court has regulars who play best there, so record holders differ by court. Roughly 72% of games are opponent-confirmed; the rest are shown as excluded. You start with confirmed wins at Northside Commons and Elm Yard, and losses at Hilltop and Riverside.
