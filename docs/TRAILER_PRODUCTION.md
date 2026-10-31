# Trailer production

**Title:** The future of basketball is around the corner.
**Outputs:** `trailer/out/ruNit-demo-trailer-16x9.mp4` (1920×1080) and `trailer/out/ruNit-demo-trailer-9x16.mp4` (1080×1920). 72 s, 30 fps, H.264 + AAC, loudness-normalized to −16 LUFS.

## Pipeline (fully reproducible, no external services)
```bash
npm run build && npm start                         # 1. run the app
node trailer/capture.mjs http://localhost:3000     # 2. capture real app screens → trailer/assets/
python3 trailer/audio.py trailer/out/score.wav 72  # 3. synthesize the original soundtrack
node trailer/render.mjs                            # 4. render frames (headless Chrome) + encode (FFmpeg), both formats
node trailer/render.mjs 16x9 stills                # optional: preview stills only
```
Requirements: Node 20+, Playwright with Chrome/Chromium, Python 3 + NumPy, FFmpeg.

### Why not Remotion
The directive preferred Remotion. This build uses an equivalent programmatic approach — `trailer/composition.html` exposes a deterministic `render(t)` for any timestamp, rendered frame-by-frame by Playwright and encoded by FFmpeg — because it needs no extra framework, renders the exact same fonts and screens as the app, and was verifiable in this environment. Porting each scene to a Remotion `<Sequence>` is mechanical: the scene functions already take local time and return styles.

## Edit decision list
| Time | Section | Picture | Sound |
|---|---|---|---|
| 0–7 | IT STARTS WITH A COURT. | Sunlit court lines draw in under light rays; a basketball bounces on concrete (bounce physics locked to the audio hits) | Ball on concrete ×7, sneaker squeak, net swish, riser |
| 7–15 | FIND YOUR PEOPLE. | Court Network (desktop) pushes in; phone slides in with court detail, then players | Beat enters (92 BPM, D–Bm–G–A) |
| 15–24 | CALL YOUR RUN. | Three phones: Create a run → Check in (QR) → Teams; format chips pop | Drums enter |
| 24–34 | PLAY YOUR GAME. | “Phone down. Go hoop.” screen, then an illustrated play: kick-out (violet), cut (blue), drive (orange), finish burst at the rim; KICK / DRIVE / FINISH on the beat | Squeaks + dribbles on the beat, net swish |
| 34–44 | KNOW YOUR GAME. | Phone sequence: box score → mismatch flagged → confirmed → reflection → Player DNA; callouts explain each; DNA bars glow in archetype colors | |
| 44–54 | BUILD YOUR IDENTITY. | My Game card → Character creator (Skill FX) → Rankings | |
| 54–64 | OPEN THE NEXT DOOR. | Opportunities list and a listing detail with organizer verification and consent toggle | Riser into finale |
| 64–72 | YOUR CITY. YOUR COURT. YOUR RUN. — ruNit — WHO'S GOT NEXT? | Back on the court; the ball goes up out of frame (tip-off); logo; “Prototype · launching in Hazleton & Scranton, PA” | Beat drops, swell, final impact + net |

## Honesty rules applied
- Every app image is a real screen captured from the working prototype (`trailer/capture.mjs`), not a mockup.
- A persistent caption reads: *app screens captured from the working prototype · all people, courts and listings are fictional*.
- The play section is tagged *Illustrated play · not product footage*.
- Product scenes carry *Working prototype · demo data* / *In the prototype* tags.
- No testimonials, user counts or claims of real activity. The end card says “Prototype”.

## Audio
`trailer/audio.py` synthesizes everything (ball bounce = pitched sine thump + rubber slap; squeak = vibrato chirp; net = shaped band-passed noise; drums, bass and pad from oscillators). No samples or licensed music. Replace with a licensed track by swapping `trailer/out/score.wav`.

## Upgrading the trailer
- Replace the illustrated play (24–34 s) with real footage shot at a NEPA court (signed releases), color-graded warm. Keep the holographic play-path overlay — it matches the in-app archetype colors.
- Add a voice-over pass (English + Spanish).
