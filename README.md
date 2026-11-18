# Commands & Colours: Napoleonics

A fully playable, unofficial browser edition of Richard Borg's board game of the Napoleonic Wars, published by GMT
Games: 33 battles against a computer general. They are the 15 of the base game, from Roliça in 1808 to Waterloo in 1815,
and the 18 of Expansion #1, *The Spanish Army*, from Bailén to Ordal Cross.

## Play it

https://strods.work/cnc-napoleon-claude/

There is nothing to install. Your saved game, battle record and medals stay in your browser.

## Buy the board game

This edition is no substitute for the real thing. If you enjoy it, buy the game from its publisher:

- [Buy the board game from GMT Games](https://www.gmtgames.com/p-1251-commands-colors-napoleonics-6th-printing.aspx)
- [Buy Expansion 1, the Spanish Army, from GMT Games](https://www.gmtgames.com/p-1266-commands-colors-napoleonics-expansion-1-the-spanish-army-5th-printing.aspx)

## Playing

1. **New Battle**: pick a battle (the tab **The Peninsula & Waterloo** holds the base game and the tab **The Spanish Army**
   Expansion #1), the army you command, and the opponent's strength (Captain, Colonel or Marshal).
2. Each turn: click a command card in your hand and play it, click the units it lets you order, and confirm. Move them,
   then fire or fight in melee; the dice, hits and retreats are resolved and animated for you.
3. You are asked to decide whenever you have a choice: whether to form square against cavalry, to play First Strike, to
   take a Combined Arms attack with guns beside the infantry, to Retire and Reform, or to advance after a won melee.
4. The first side to the scenario's number of Victory Banners wins. Games are saved automatically, and **Continue** on the
   main menu picks the last one up.

**History** (in the battle briefing and in the top bar) tells the story of the real battle in slides, with a schematic
map. **Rules** opens a reference to units, dice, terrain, every card and the rules of the expansion. **Triumphs** keeps
your record: a medal for each army you win with, in bronze against the Captain, silver against the Colonel and gold
against the Marshal, with 66 to win in all.

Keys: **1–9** pick a card, **Enter** takes the main action, **Esc** clears a selection, **F6** moves between the hand, board
and prompt, **B** and **P** jump to the board and the prompt, and the arrow keys, **Home** and **End** move round the board.

## Expansion #1: The Spanish Army

Battles 101–118 take the Peninsular War from Bailén (1808) to Ordal Cross (1813). They add:

- **New units:** Spanish line, light infantry, grenadiers, militia and cavalry; Swiss battalions on both sides; and new
  French rows.
- **Guerrilla Action:** in most Spanish battles the Allied side holds counters it can spend against a French card.
- **New terrain and water:** rivers that are fordable, impassable except at a bridge, or only a brook, depending on the
  battle, with a few hexes that follow rules of their own.
- **Battle rules:** at Bailén the Swiss leave the field once two of them have fallen; at Medellín the Allied hand shrinks
  with each French banner and only two units may form square; at Vitoria the opening cards decide who moves first.

The rules follow the [Rules Reference](design/rules-reference.md) of this edition, §15 and §16.

## The computer general

The AI (`src/ai`, running in a Web Worker) plans each turn by building candidate orders and movements for the cards in
its hand, then plays the plans through the real rules engine with freshly rolled dice. It never sees your cards, the
deck or the dice before they are drawn. It judges the outcomes by banners, unit strength, support, leader safety,
retreat paths, terrain and the battle's objectives.

| Level | Character |
|---|---|
| Captain | A forgiving opponent that makes mistakes |
| Colonel | A capable general (the recommended level) |
| Marshal | Thinks deeper and punishes errors |

Each commander has a temperament that shapes how boldly he fights and what he says in the battle log, from Wellington
the patient to Ney the reckless; you can pick a different one before the battle.

## Run it locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173. Other scripts:

| Command | What it does |
|---|---|
| `npm run build` | Type-check and build the static site into `docs/` (served by GitHub Pages) |
| `npm test` | Rules-engine, rules, scenario, art, UI, AI and golden-game tests (Vitest) |
| `npm run typecheck` | TypeScript only |

## Project layout

```
src/engine/     Pure TypeScript rules engine (deterministic, replayable)
src/ai/         Computer opponent (runs in a Web Worker)
src/scenarios/  The 33 battles: base game 001–015 and Expansion #1 101–118 (JSON data and texts)
src/history/    The battles' histories (one data file per battle) and their validator
src/art/        Original SVG miniatures
src/ui/         React UI: board, terrain art, cards, dice, menus
design/         Design notes, rules reference, plans and expansion surveys
docs/           Built site for GitHub Pages (generated by `npm run build`; never edited by hand)
tests/          Engine, rules, scenario, art, UI, AI and golden-game tests
```

## Credits

All artwork and prose are original. Fonts: IM Fell English SC and EB Garamond (SIL OFL 1.1). Icons: game-icons.net
(CC BY 3.0). The battle setups are transcribed from the maps at commandsandcolors.net. See `CREDITS.md`.

## Disclaimer

An unofficial fan edition, not affiliated with or endorsed by GMT Games. *Commands & Colors* is a trademark of GMT Games
LLC. *Commands & Colors: Napoleonics* and Expansion #1, *The Spanish Army*, are GMT Games products designed by Richard
Borg. The rules are paraphrased, the card texts are summaries and all artwork is original.
