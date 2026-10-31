# Database schema

File: `supabase/migrations/0001_init.sql` (PostgreSQL 15/16 + PostGIS on Supabase).

**Status:** applied successfully to a local Postgres 16 (PostGIS shimmed — `geography` replaced by `point` and the spatial query stubbed) with 31 tables and 49 RLS policies. Not applied to a hosted Supabase project (no credentials in this build). Re-run with `bash supabase/tests/run_local.sh`.

## Entity groups
- **Accounts (private):** `users` — legal name, birth date (18+ check constraint), coarse home region. Owner-only RLS.
- **Public identity:** `player_profiles`, `player_characters` (layered config JSON, ≤ 2 equipped effects), `cosmetic_inventory`.
- **Courts:** `courts` (PostGIS `geography(point)`, GiST index, verification enum, source/source_ref for OSM), `court_amenities`, `court_photos`, `court_verification_records`.
- **Games:** `games` (format, target 11/15/21, capacity, mode, visibility, RRULE, check-in code, status), `game_teams`, `game_participants` (check-in timestamp), `game_results`, `player_game_stats` (verification enum, revision), `stat_confirmations` (confirm/dispute), `game_reviews` (sportsmanship → Trust only), `game_reflections`.
- **Three systems:** `player_ratings` (MMR), `player_reputation` (Trust), `player_development` (Player DNA + explainable change log).
- **Community:** `squads`, `squad_members`, `challenges` (squad or player on each side).
- **Opportunities:** `organizers` (staff-set `verified_at`), `events`, `event_registrations`, `opportunities` (min_age), `opportunity_interests` (`share_card` consent flag).
- **Platform:** `notifications`, `media_assets` (private / participants / public), `blocks`, `reports`.

## Key RLS rules (verified by `supabase/tests/rls_smoke.sql`)
- A user cannot read another user's private `users` row.
- Accounts under 18 are rejected.
- Players can only submit **their own** stat line, only as `self`, only for games they're in; they cannot self-promote verification.
- A player cannot confirm their own line; only other participants can confirm/dispute.
- Community court submissions must be `community_submitted`; nobody can self-declare a court official.
- Private games are visible only to host and participants. Blocks hide profiles in both directions.
- MMR/Trust/DNA are read-only to clients; writes happen in server functions with the service role.

## Location privacy
No user coordinates are stored. `courts_near()` rounds the caller's point to two decimals (~1 km) and caps the radius at 50 km.
