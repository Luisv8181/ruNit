# Video stat tracking (future)

Goal: a phone propped on the fence records the game, and ruNit suggests makes, misses and who took each shot. Players still have the final word.

## Stages
1. **Rim-only shot detection.** Detect the ball and rim; classify make or miss from the ball's path through the rim. Output: team-level makes and misses with timestamps. Works with one fixed camera. Precedent: HomeCourt (NEX Team) already tracks shots from a phone camera.
2. **Shot charts for one player.** The person filming tags themselves; the shooter's position on the court gives a shot chart. Feeds Player DNA as evidence ("most of your makes are at the rim").
3. **Attribution for everyone.** Suggest the shooter for each shot using several cues together: shoes (color and silhouette), jersey or shirt color, height, and court position tracked over time. Shoes alone fail when players overlap in the paint, so each suggestion carries a confidence and the cues used (`shot_events.cues`).
4. **Video-supported stat lines.** When a player accepts the suggested shots, their line can move up the verification ladder to "video-supported".

## Requirements before shipping
- **Consent:** everyone visible in a clip agrees before it's processed (`game_videos.all_players_consented`). Non-consenting players are blurred or excluded from attribution.
- **On-device first:** run detection on the phone (Core ML / TensorFlow Lite) and upload only events, not footage, unless the player chooses to share clips.
- **Accuracy across conditions:** evaluate on outdoor courts, night lighting, and a range of skin tones and clothing before turning on attribution. Publish the numbers.
- **No silent automation:** suggestions never change a stat line until a player in the game accepts them.

## Data model
`game_videos` and `shot_events` (migration 0003): time, made or missed, points, suggested shooter, confidence, cues, who accepted it, and a court-normalized shot position.
