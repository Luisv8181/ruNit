# Roadmap — what to build next

## Next (to go from demo to pilot in Hazleton)
1. **Supabase adapter** implementing `RunitBackend`; auth (email/phone OTP), age gate at sign-up; Realtime on `game_participants` and `stat_confirmations`.
2. **Real court import**: OSM `leisure=pitch` + `sport=basketball` for Luzerne & Lackawanna counties into `courts` (`source='osm'`), then community confirmation drives.
3. **MapLibre live map** with a hosted style (Protomaps self-host recommended for cost) and clustering.
4. **Server functions** for MMR, Trust and DNA updates (service role), plus rate limiting on create-run, check-in and stat submission.
5. **Camera QR scanning** and rotating check-in codes tied to game start time + coarse court proximity.
6. **Push notifications** (reflection prompt, run filling up, check-in reminder).

## Then
- **Recorded play (opt-in).** Record a game on your phone; clips attach to the game and can move a stat line to *video-supported*.
- **Machine-learning analysis of your own footage**, added later and opt-in per game: shot charts, make/miss detection, and movement patterns that feed Player DNA as evidence, with confidence shown. Requirements before shipping: consent from everyone visible in a clip, processing that blurs or excludes non-consenting players, footage deleted on request, and models evaluated for accuracy across skin tones, lighting and outdoor courts.
- Court records history: seasons, all-time vs this year, and record-broken notifications.
- Organizer verification workflow + organizer dashboard (events, registrations, consent-respecting player cards).
- Media: photos/clips per game, credited court photography, “video-supported” stat verification.
- Tournament brackets seeded by opt-in MMR; seasons and divisions.
- LLM insight provider behind the existing interface (server-side, aggregates only, evidence required).
- Spanish UI (large Spanish-speaking player base in Hazleton).
- Native apps (React Native) sharing `src/lib` domain code.

## Later, with safeguards designed first
- Youth participation: guardian consent, age-appropriate discovery, no adult–minor messaging, organizer clearances.
- Sponsorships and business partnerships with transparent labeling.

## Known gaps in this build
- Supabase adapter, messaging, uploads, real organizer verification, moderation tooling, rate limiting, and real-time multi-user state are not implemented.
- The demo map's streets and parks are decorative.
- The trailer's play section is an illustrated diagram, not game footage.
