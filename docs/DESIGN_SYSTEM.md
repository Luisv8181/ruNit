# Design system — Solar-punk basketball futurism

Bright, warm, sunlit and athletic. Technology shows up only where it carries meaning (skill effects, play paths, verification). Dark surfaces are reserved for the player card, the live-game screen, the run header and cinematic moments.

## Color tokens (`tailwind.config.ts`)
| Token | Hex | Use |
|---|---|---|
| `ball` | #F47B35 | Brand signature, primary actions, Slasher |
| `paper` | #FFF9F0 | App background (warm white) |
| `sun` | #F4C65E | Highlights on dark, Post, pending states |
| `emerald` | #239B72 | Success, verified, Defender, Opportunities |
| `sky` | #56B8E8 | Indoor courts, Shooter, official verification |
| `ink` | #202B30 | Text, dark surfaces |
| `violet` | #8A6BE0 | Playmaker only |

Each archetype owns one color used consistently in DNA bars, archetype labels, reflection chips and character effects.

## Type
- **Display**: Archivo variable, width 72%, weight 850, uppercase, tight leading — headlines, numbers that matter (`.display`).
- **Body/UI**: Instrument Sans variable.
- **Stats/codes**: JetBrains Mono, tabular (`.num`).
- **Eyebrows**: Archivo 100% width, 0.16em tracking, uppercase (`.eyebrow`).

## Recurring motifs
- **Court lines** (`CourtArt`): a half-court line drawing used only where the content concerns a court or a game.
- **Sideline rule** dividers, **time blocks** (big mono time + day) on run rows, **verification dots** (1–4 filled).
- Sunlit gradients (gold → orange) for Home and Customize; concrete grain at 35% opacity on the body.

## Holographic skill effects (functional, per archetype)
| Archetype | Effect | Meaning |
|---|---|---|
| Slasher | Orange energy trails toward the hand + impact ring | Getting downhill, finishing |
| Shooter | Blue dotted release arc to the rim | Range, release |
| Defender | Emerald pressure rings at the feet + arm-span arc | Space taken away |
| Playmaker | Violet passing lanes to teammate nodes | Vision, connection |
| Post | Gold footwork rings | Position, footwork |
Hybrids combine up to two. The **flux sleeve** glows in the color of the primary effect. All motion is disabled under `prefers-reduced-motion`.

## Components
Buttons (`btn-ball`, `btn-ink`, `btn-line`, `btn-ghost`), `panel`, `chip`/`chip-on`, `field`/`label`, `CourtBadge`, `StatBadge`, `DNABars`, `Avatar`, `PlayerFigure`, `RunRow`, `Roster`, `Empty`, `DemoTag`.

## Rules we held to
No purple-blue gradients, no stock photography (empty states say why), no fake “real users”, demo data labeled everywhere, numbers shown with their basis, at most one dark hero per screen.

## Accessibility
Visible focus rings, ARIA roles on tabs/radios/dialogs, keyboard-operable map markers, labels on all inputs, reduced-motion support, ≥ 4.5:1 text contrast on body copy.
