# Native app spec (iOS and Android)

These features need native code. They are specified here, not built, because they can't be compiled or tested in the web prototype. The web build has working stand-ins, noted for each.

Recommended path: React Native (Expo, with config plugins / native modules) so `src/lib` (types, records, friends, bump payloads, insights) is shared with the web app.

## Tap phones to confirm
- **iPhone:** Nearby Interaction (UWB) between two phones with ruNit open. Discovery tokens are exchanged over Multipeer Connectivity; when distance drops under ~15 cm, both phones exchange the signed `BumpPayload` (see `src/lib/bump.ts`) and record a confirmation with `method = 'nearby'` and a proximity proof. Phones without UWB fall back to QR.
- **Android:** NFC Host Card Emulation: one phone emulates an NDEF tag holding the payload, the other reads it; then roles swap. `method = 'nfc'`.
- **Web stand-in (built):** QR code exchange with camera scanning (BarcodeDetector) or a six-character match code. Web NFC can't do phone to phone, so it isn't used.

## Contacts
- **iPhone:** CNContactPickerViewController (no contacts permission needed; the user picks specific people). **Android:** ACTION_PICK on ContactsContract.
- Only a salted hash of a picked phone number is ever sent, to match people who already use ruNit. The address book is never uploaded.
- **Web stand-in (built):** Contact Picker API on Android Chrome; invite link via the share sheet everywhere.

## Lock screen
- **Live Activity (iOS 16.1+) / ongoing notification (Android):** during a run, shows court, score (from `score_events`), clock and "Game over" deep link. Updated locally from scoreboard taps; push-updated for players who aren't keeping score.
- **Widgets:** "Who's at my court" (players checked in, open runs) and "Got next" (your place in line). Refresh via background fetch every 15 minutes plus push.
- **Web stand-in:** none possible; the installed web app shows a notification when you're up next (demo uses in-app notices).

## Haptics
- iOS UIImpactFeedbackGenerator (light for score taps, medium for "you're up", success notification for a confirmed game). Android VibrationEffect equivalents.
- **Web stand-in (built):** `navigator.vibrate` where supported (Android). iPhone Safari has no web haptics.

## Offline
- SQLite (expo-sqlite) mirror of the user's runs, tallies, submissions and queue entries; an outbox of actions synced in order when back online. `score_events.client_at` keeps true order.
- **Web stand-in (built):** service worker caches the app; all demo state lives on the phone.
