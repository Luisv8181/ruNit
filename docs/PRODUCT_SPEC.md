# Product spec — as built

ruNit connects people through basketball, helps them develop their game, and gives their participation somewhere to lead. Launch market: Hazleton & Scranton, PA. Adults (18+) only at launch.

## Pillars and what exists in this build

### The Network
- **Home** answers “Who's got next?”: your next game (one tap to check in), runs near you with inline **Join**, players free now, nearby courts, a featured event and community activity.
- **Court Network** (`/courts`): offline demo map per region (Hazleton / Scranton), filters (runs now, indoor/outdoor, lights, accessible, verified only), court detail (surface, lights, hoops, access, accessibility, amenities, notes, runs here), **Add a court** and **Submit correction** (both create pending submissions).
- Court records carry one of four verification states: *Imported* (open map data), *Submitted* (by a player), *Community verified* (5+ confirmations), *Official* (operator). The UI explains each and states that ruNit doesn't know every court.
- **Runs**: create in seconds (court, date/time, format 1v1–5v5, first to 11/15/21, players incl. “got next” spots, casual/ranked, public/invite-only, weekly repeat, house rules). Join/leave, QR + code check-in.

### The Player
- **My Game**: player card (nickname, archetype, three separate systems), development insights, game log with verification badges, reflections, Player DNA, achievements, media (honest empty state), shareable card.
- **Archetypes emerge from data**: Player DNA has five traits (Slasher, Shooter, Defender, Playmaker, Post). The archetype name is derived from the top one or two traits (e.g. *Slashing Wing*, *Rim Protector*, *Stretch Big*). Hybrids are supported.
- **Character creator**: jersey colors/number/cut, build, skin tone, hair, shoes, sleeve (none/compression/flux), headband, tights, skill effects. All layers are reusable SVG; nothing is regenerated per change. Skill effects unlock only for archetypes in your DNA; cosmetics never affect ratings.

### The Competition
Three independent systems:
1. **MMR** — Elo-style (K=24) update for ranked games against average team ratings. Drives local rankings.
2. **Player DNA** — how you play. Moves at most 3 points per trait per game, with the reasons shown.
3. **Trust** — attendance %, sportsmanship, number of confirmed games.

Also: squads (join/leave, records), local rankings by region, challenges (accept).

### The Opportunity Network
Listings for tournaments, coaching, refereeing, training, employment, sponsorship, showcases and community events, filterable by type, city, date window and 18+. Each shows organizer verification. Interest is consent-based: sharing your card is opt-in and off by default. Copy states ruNit never promises recruitment or scholarships and that ratings never decide selection.

## The Game Loop (signature)
INTENTION → ACTION → EVIDENCE → REFLECTION → GROWTH

1. Join → 2. Check in (code/QR) → 3. Teams (snake-draft by MMR; host can swap) → 4. Play (“Phone down. Go hoop.” — the app gets out of the way) → 5. Final score (validated: winner reaches target; past target must be win-by-2; no ties) → 6. Your stats (your own line only) → 7. Evidence review → 8. Reflection.

**Evidence rules**
- Each participant submits only their own line. A team's summed points must equal its final score; if not, ruNit flags it, names no culprit, and offers *ask a teammate to recheck* or *lower my points*. Saving is blocked until resolved.
- Other players' lines can be *confirmed* or *disputed* by participants.
- Verification ladder: Self-reported → Teammate-confirmed → Opponent-confirmed → Video-supported (video not in this build).
- No AI certifies anything.

**Reflection**: optional, one screen of chips (“How did you get your points today?”), then optional prompts (strongest / difficult / learned / improve). Result shows the DNA change with reasons and the top insight with its evidence and confidence (Early signal / Emerging pattern / Consistent pattern).

## Safety & privacy decisions in this build
- Adults only (enforced by a DB check constraint in the schema).
- No direct messaging; the UI says so. Inviting a player to a run is the only contact path.
- Report (reasons) and Block are available on every player profile. Blocked players disappear from discovery and suggestions.
- Exact user location is never collected; the demo uses a fixed approximate area. The schema stores only a coarse region.
