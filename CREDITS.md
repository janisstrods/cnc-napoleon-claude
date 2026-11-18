# Credits

## Battle histories

The History slides of each battle (`src/history/battles/`) are original summaries written from the standard histories
of the period (among them Oman's *History of the Peninsular War* and Napier's *History of the War in the Peninsula*); each lists its sources. The battle maps are schematic reconstructions drawn for this edition.

## Icons — game-icons.net

The icons below come from [game-icons.net](https://game-icons.net)
([GitHub: game-icons/icons](https://github.com/game-icons/icons)). They are licensed under
[Creative Commons Attribution 3.0 Unported (CC BY 3.0)](https://creativecommons.org/licenses/by/3.0/).
The original SVGs are kept in `src/ui/kit/icons/`. Their glyph paths are extracted into
`src/ui/kit/icons/paths.ts` and drawn with new colours and gradients. The black background square of each icon is removed.

| Icon | Author | Used for | Licence | Link |
| --- | --- | --- | --- | --- |
| Crossed swords | Lorc | card back, Cold Steel, menu emblem | CC BY 3.0 | https://game-icons.net/1x1/lorc/crossed-swords.html |
| Laurel crown | Lorc | Grand Manoeuvre | CC BY 3.0 | https://game-icons.net/1x1/lorc/laurel-crown.html |
| Shield echoes | Lorc | Fire and Hold | CC BY 3.0 | https://game-icons.net/1x1/lorc/shield-echoes.html |
| Shield reflect | Lorc | Counter Attack | CC BY 3.0 | https://game-icons.net/1x1/lorc/shield-reflect.html |
| Striking arrows | Lorc | Bombard | CC BY 3.0 | https://game-icons.net/1x1/lorc/striking-arrows.html |
| Run | Lorc | Force March | CC BY 3.0 | https://game-icons.net/1x1/lorc/run.html |
| Sword wound | Lorc | First Strike | CC BY 3.0 | https://game-icons.net/1x1/lorc/sword-wound.html |
| Spears | Lorc | Bayonet Charge | CC BY 3.0 | https://game-icons.net/1x1/lorc/spears.html |
| Cavalry | Delapouite | Cavalry Charge | CC BY 3.0 | https://game-icons.net/1x1/delapouite/cavalry.html |
| Trumpet flag | Delapouite | Élan, Rally | CC BY 3.0 | https://game-icons.net/1x1/delapouite/trumpet-flag.html |
| Laurels | Lorc | Card back wreath, Coordinated Advance, menu and medal wreath | CC BY 3.0 | https://game-icons.net/1x1/lorc/laurels.html |

The bicorne, spyglass and haversack card glyphs (`src/ui/kit/icons/napGlyphs.ts`) are drawn for this project.

Authors: Lorc (https://lorcblog.blogspot.com) and Delapouite (https://delapouite.com).

## Fonts

| Font | Licence | Link |
| --- | --- | --- |
| Cinzel (via @fontsource/cinzel) | SIL Open Font License 1.1 | https://fonts.google.com/specimen/Cinzel |
| EB Garamond (via @fontsource/eb-garamond) | SIL Open Font License 1.1 | https://fonts.google.com/specimen/EB+Garamond |

## Original art

These parts of the UI kit are original CSS/SVG made for this project:

- section mini-maps
- dice cubes and the infantry, cavalry, artillery, flag and sabre die faces
- banners
- card frames
- parchment, wood, leather and felt textures (procedural SVG turbulence)

No third-party assets are used for them.

## Scenarios

The 15 base-game battles (001–015, `design/data`) were transcribed hex by hex from the battle maps published at
[commandsandcolors.net](https://www.commandsandcolors.net); Expansion #1, *The Spanish Army*, is to come. The setups are
data; the rules are paraphrased (`design/rules-reference.md`), the battle summaries are original, and all army and
terrain art is original.

*Commands & Colors: Napoleonics* is a board game by Richard Borg, published by GMT Games; Expansion #1, *The Spanish
Army*, is also a GMT Games product. This is an unofficial fan implementation. The card texts are paraphrased summaries.
