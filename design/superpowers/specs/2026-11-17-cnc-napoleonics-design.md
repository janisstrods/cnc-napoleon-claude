# Commands & Colours: Napoleonics — Digital Edition (Design Spec)

Date: 2026-11-17
Status: Approved by user 2026-11-17.
Companion research: `design/ccn-rules-research.md`: rules with sources, differences from Ancients, and expansion contents.

## Intent

The user wants a second Commands & Colours adaptation that stands next to the existing browser edition of *Commands &
Colors: Ancients* (`/Users/janisstrods/Gamemaking/cnc-ancients`, repo `janisstrods/cnc-claude`, live at
https://strods.work/cnc-claude/). It should feel just as finished: faithful rules, a computer general worth playing
against, original miniature art, and the extras the Ancients edition has (battle histories, medals, an in-game rules
reference). It is for the user to play solo against the AI in a browser.

## User decisions

| Question | Answer |
|---|---|
| Relation to the Ancients code | **Copy** `cnc-ancients` into a new sibling project and adapt it. No shared package and no combined app. |
| First release scope | **Base game (15 battles, 001–015) + Expansion #1 *The Spanish Army* (18 battles)**, released together |
| Extras in the first release | **All four:** original miniature art, battle histories, Triumphs medals, in-game rules reference |
| Publishing | **New GitHub repo, on Pages at strods.work** (proposed name `cnc-napoleonics` → https://strods.work/cnc-napoleonics/), same build and release conventions as Ancients |
| Models | **Opus** writes plans and does reviews; **Sonnet** implements |

## Goals

* All 33 battles playable start to finish against the AI, from either side, at three difficulty levels.
* Rules follow GMT's current rulebook (4th edition), with every interpretation written down.
* The same engineering quality as Ancients: a pure, deterministic, replayable engine; one authoritative rules
  reference with tests written from it; golden replays once the engine is stable; AI in a Web Worker with a fallback.
* Original art and original prose throughout. No GMT artwork, no copied rule text.

## Non-goals (this release)

* Expansions #2–#7 (Russia, Austria, Prussia, Generals/Marshals & Tacticians, EPIC, Grand Battles), the 90-card green
  deck, Tactician cards, the EPIC and Grand boards, and fan scenarios. The data model should not rule them out (see
  "Leave room for"), but nothing is built for them.
* Online multiplayer and hot-seat. Human against AI only, as in Ancients.
* Keeping the two codebases in sync. Fixes to the shared skeleton are ported by hand when worth it.

## Anti-goals (failure even if it works)

* Breaking or slowing down the shipped Ancients game. Nothing in `cnc-ancients` changes.
* Clashing with Ancients in the browser. Both sites share the strods.work origin, so the two must never read or write
  each other's saved games, medals or settings.
* Rules that drift from the rulebook without saying so. Every deviation is marked **[Interp]** in the rules reference.
* An AI that is mechanically legal but plays C&C:N like Ancients (for example ignoring squares, artillery range or the
  shrinking dice of worn infantry).

## Constraints

* Stack: TypeScript + Vite + React + Vitest, as in Ancients. Static site, hash routes, `base: './'`, built into `docs/`.
* GitHub Pages serves `main:/docs`. No GitHub Actions (the token lacks the `workflow` scope). Push over HTTPS with the
  keychain credential; `gh` and SSH are not set up. **The user creates the empty GitHub repo** when asked.
* All localStorage keys use a new prefix **`ccn-`** (Ancients uses `cca-`), and the dev hook becomes `window.__ccn`.
* Copy from `cnc-ancients` `main` (currently `6f4941b`, v1.6.2). Ancients Expansion #6 work on other branches is not
  wanted here.
* Fonts and icons must be openly licensed (OFL / CC BY) and credited, as in Ancients.

## Approaches considered

| Approach | Trade-off | Outcome |
|---|---|---|
| **A. Copy the repo and adapt** | Fastest; zero risk to Ancients; free to change the core types. Shared fixes are ported by hand. | **Chosen by the user** |
| B. Extract a shared core package | Cleaner long term, but every core change must keep Ancients' golden replays and art hashes identical, and the shared contract (unit, dice, card and decision types) is exactly what C&C:N changes. | Rejected |
| C. Napoleonics as a mode inside the Ancients app | One deploy, but every type and screen carries both games, and a regression can break Ancients. | Rejected |

## Rules basis

* Primary: GMT *Rules of Play, 4th Edition* (2023 PDF) and the National Unit Reference Cards / Quick Reference Card.
  Then the 2nd-edition scenario booklet, Richard Borg's rulings in the commandsandcolors.net condensed FAQ, then BGG.
  The Ancients project's source ranking and its "decisions table is binding" habit carry over.
* Output of the rulings phase, written before engine work:
  * `design/rules-reference.md`: the authoritative condensed C&C:N rules as implemented (structure modelled on the
    Ancients one), base game in the main sections and Expansion #1 in its own section.
  * `design/rulings.md` (base) and `design/exp1-rulings.md` (Spanish): research and a decisions table.
* Proposed defaults for the open points in the research (the rulings phase confirms or overturns each, and marks the
  outcome **[Interp]** where no official answer exists):

| Open point | Proposed default |
|---|---|
| French Grenadier +1 fire? | Follow the current French unit reference card |
| French line +1 melee vs infantry | Implemented (on the 2011 card and the current site) |
| Terrain reductions when both hexes have terrain | They add up ("out" of the battling unit's hex + "into" the target's hex); Field Works on a hill replace the hill values |
| Combined Arms artillery spent for the turn? | Yes: each ordered unit battles once |
| Moving infantry fire | Half the blocks, rounded per nation (French/British up; Portuguese/Spanish down), then type bonuses |
| Lone leader as a fire target | Not allowed (base rules) |

## Scope

### Battles
* Base game 001–015: Roliça (two parts) to Waterloo, French against British, Portuguese and (at 014–015) Allied units.
* Expansion #1 *The Spanish Army*: the 18 official scenarios, numbered as on commandsandcolors.net. A survey
  (`design/exp1-survey.md`) lists each battle's units, terrain, hand sizes, banners and special rules before any is
  transcribed.

### Rules and mechanics (base game)
* Units as data keyed by **nation + type**: French, British, Portuguese and Allied variants of line, light, rifle,
  grenadier, guard and militia infantry; light, heavy, cuirassier and guard cavalry (lancer and guard light cavalry if a
  scenario uses them); foot, horse and guard artillery; leaders. Each row gives blocks, movement, melee dice formula,
  standing and moving fire formulas, range, retreat per flag (as a formula, so "1 then 2" fits later), flags ignored,
  and sabre ability.
* Dice: 2 infantry, 1 cavalry, 1 artillery, 1 flag, 1 sabre. Sabres hit in melee only (not for militia or rifles) and
  kill a lone leader. Leader casualty checks: 2 sabres on 2 dice, or 1 sabre on 1 die after elimination.
* Dice equal blocks for infantry and cavalry; artillery uses range tables that weaken only at 1 block; squares roll at
  most 1 die.
* Terrain as reductions by the battling unit's arm, with "into" and "out of" values and separate fire and melee values
  where the chart has them; Field Works protect named hexsides; rivers forbid melee; C&C:N line of sight including the
  hill plateau rules and the side board edge.
* Infantry squares: the interrupt on the opponent's turn, the random hidden card on a square track, Command reduced,
  the square firing first with bounce flags, 1-die caps, leaving square on an order with no adjacent enemy cavalry.
* Combined Arms (artillery dice joining a melee), cavalry Retire and Reform, infantry take ground, cavalry breakthrough
  and bonus melee, support (2 adjacent friendly units or lone leaders), leaders (ignore 1 flag, +1 die only on
  Leadership, cannot be fired at alone), leader escape.
* The 70-card base deck (48 section, 22 tactic), including Scout's draw-2-keep-1, Assault = Command, Élan's dice orders
  and reshuffle, Rally anywhere, Short Supply moving any unit to the baseline, Counter-Attack, two First Strikes.
* Victory banners: units, leaders, and objectives as data (temporary, turn-start, group, majority, permanent,
  breakthrough exits). The Ancients objective engine is the starting point.
* Each scenario's special rules as data (for example Waterloo's impetuous British cavalry and Allied 2-hex retreat,
  García Hernández's doubled banners).

### Expansion #1 additions
* Spanish units (2-hex retreats, militia 3, moving penalties, 5-block light infantry, flag-ignoring grenadiers and
  cuirassiers), Guerrilla Action counters, Walled Farm and 2-/4-sided redoubts, and any other mechanic the survey finds.

### Extras
* **Miniature art:** procedural SVG figures per unit type and nation (shakos, bearskins, cuirasses, lancers, guns and
  limbers, mounted generals), one figure per block, as in Ancients.
* **Battle histories:** three slides per battle with an animated schematic map, for all 33 battles, using the Ancients
  history system. Original prose, British spelling, hedged, citing period sources (Napier, Oman, Wellington's
  dispatches, French memoirs).
* **Triumphs:** bronze, silver and gold per battle, side and AI level, in `ccn-record-v1`.
* **Rules reference dialog:** units per nation, dice, terrain chart, every card, squares and Combined Arms, and a
  Spanish tab.

## How it is built on the Ancients code

| Area | Plan |
|---|---|
| Kept nearly as is | Hex maths and board geometry (same 13×9 board and sections), seeded RNG, the decision/answer pipeline and driver (replay, undo, autosave), occupancy queries, retreat path search, movement driven by the terrain table, the objectives/held/banners trio, the AI planner framework and worker, the UI shell (router, board, terrain painters, card hand, dice tray, prompts, log, modal kit), history system, Triumphs, sound, storage wrapper, dev routes and galleries, scripts and test kits |
| Rewritten | Engine type contract (unit, dice face, card kind, decision and order-modifier types), unit table columns, combat dice and hit scoring, the card deck and card-to-order handling, the attack sequence (squares, Combined Arms, Retire and Reform, breakthrough), leader rules, nation rules (replacing Ancients' elites), the AI's hit-probability model, evaluation, card values and reaction policies, all art, dice faces, texts and theme |
| Deleted at the start of the engine work (Plan 2) | All Ancients scenarios, histories, texts, art, golden fixtures, art and terrain hash pins, and Ancients-specific tests. The test kits stay. New golden replays are recorded once the base game is stable. Until then the copied Ancients game keeps running and its tests stay green, so deleting happens together with the new engine types rather than leaving half-broken code. |

Rough estimate from the code audit: about 40% of the engine and AI framework carries over; the rest is rewritten.

## Look and feel (builder's call, within this direction)

* A Napoleonic campaign-map look: engraved, ink-on-paper, a period typeface for titles (an OFL face such as IM Fell),
  a readable serif for text, national colours as accents. Not a reskin of the Roman bronze-and-laurel theme.
* Difficulty names and medal tiers change from Recruit / Tribune / Consul to Napoleonic ranks (proposed: **Captain /
  Colonel / Marshal**).
* AI commanders with temperaments drawn from the period (Wellington, Moore, Hill, Picton, Beresford; Junot, Soult,
  Masséna, Ney, Marmont, Reynier, Napoleon; Spanish generals for Expansion #1), each with flavour lines in the log.
* Release names: battles from the game, never reused, chosen by the builder.

## Phases and milestones

1. **Scaffold:** create `/Users/janisstrods/Gamemaking/cnc-napoleonics` from `cnc-ancients` `main`, strip Ancients
   content, rename storage keys and the dev hook, get an empty game building and the kept tests passing. Ask the user
   to create the GitHub repo when the first push is due. Until phase 9, push source only (no `docs/` build), with
   Pages switched off; the user turns Pages on at release. *(Builder's call, noted for review.)*
2. **Rules:** rulings research and `design/rules-reference.md` for the base game.
3. **Engine:** rewrite the contract and rules from the reference, test-first.
4. **Base scenarios:** survey and transcribe 001–015 from the commandsandcolors.net map images and the GMT booklet,
   rebuilding the map-reading and verification tooling (the Ancients tooling was never committed; see
   `cnc-ancients/design/exp3-data/verification.md`). Commit the tooling this time, under `scripts/`.
5. **UI:** adapt prompts and panels to the new decisions (form square, Combined Arms, Retire and Reform, Scout keep-one),
   dice faces, tooltips, theme.
6. **AI:** new probability model, evaluation, card values and policies; AI-vs-AI balance runs logged in
   `design/ai-balance.md`. **Milestone: the base game is playable locally; the user is invited to try it.**
7. **Art, histories, Triumphs, rules dialog** for the base game. Art and histories can run in parallel worktrees.
8. **Expansion #1:** survey, rulings, transcription, Spanish units and mechanics, art, histories, AI calibration.
9. **Golden replays, full review, release** (first published release, base + Spain).

The work is split into eight plans written one after another, each by Opus once the previous one has landed, because
each needs the previous one's output (the engine plan's tests come from the rules reference, and so on): 1 Foundations
(phases 1–2 and the base-scenario survey), 2 Engine, 3 Base scenarios, 4 UI, 5 AI, 6 Extras, 7 Expansion #1, 8 Release.
The roadmap is in Plan 1. Opus writes each plan and reviews each finished task; Sonnet implements, test-first for engine
work, with path-limited commits.

## Testing

* Rules tests written from `design/rules-reference.md`, one area per file, through the `build`/`setupOf` kits.
* Scenario tests: each setup loads, matches its survey counts and checksum.
* Headless AI-vs-AI soak over every battle: no errors, no stalls, games end.
* Golden replays (random play plus a few AI games) recorded after the base engine settles, then kept unchanged except
  for deliberate changes.
* Browser checks of every new decision flow and a visual comparison of each setup with its reference map.

## Leave room for (not built now)

Per-side resources and extra card zones (Guerrilla counters are the first; later Iron Will counters, the Tactician
hand, Mother Russia's pre-battle roll), nation rules as data (Russian, Austrian, Prussian rows), a "retreat 1 then 2"
formula, larger boards (EPIC 11×20), and lone-leader fire. The engine must not branch on army or nation name; rules
that apply to one side say so in data.

## Left to the builder

File and module layout inside the copied structure, the exact theme and typefaces within the direction above, AI
search budgets and weights, commander names and temperaments, release names, and how phases split into plan tasks.
