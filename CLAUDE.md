# Commands & Colours: Napoleonics — notes for Claude

Browser game: TypeScript + Vite + React, pure rules engine in `src/engine`, AI in `src/ai` (Web Worker).

## Status

- **v1.0.0 "Talavera" released 2026-11-19: base 001–015 and Expansion #1 101–118, live at https://strods.work/cnc-napoleon-claude/ (Plans 4, 5, 7C and 8 done; the AI is calibrated).** The engine is the Napoleonics base game (RR §1–§14, Plan 2B) plus Expansion #1, the Spanish Army (RR §15–§16, Plan 7C). The computer's general is the real AI (`src/ai`, Plan 5), and the UI covers every decision: each of the 20 decision kinds has its own prompt (Plan 4; the `guerrilla` and `moveFirst` prompts are Plan 7C Task 15), and `tests/ui/full-games.slow.test.ts` plays battles 000 and 001–015 to the end through the controller (`full-games-exp1.slow.test.ts` plays 101 and 106 as the Spanish side and 116 as the French; `tests/ai/battles-exp1.slow.test.ts` soaks all of 101–118 AI against AI, with determinism and replay checks). This project was started from the Commands & Colors: Ancients edition (v1.6.2); its identity has changed (`ccn-` storage keys, `window.__ccn`, title, version 1.0.0 "Talavera").
- `src/ai` is the Plan 5 planner: card plans played out on determinised clones under one node budget per decision, three levels `captain`/`colonel`/`marshal`, calibrated in `design/ai-balance.md`.
- Spanish battles 101–118 (Expansion #1, Plan 7C) are playable from the battle picker ("The Spanish Army" tab), with histories. The AI has policies for Guerrilla counters and the 116 opening card (`cardsense`); their calibration and the open follow-ups (116's one-sided results, the Guerrilla spend rate, the Scout question) are in the Spanish section of `design/ai-balance.md`.
- Test run at the v1.0.0 release audit (Plan 8 Task 3, main `fe5cb28`): `npm test` ran 2217 tests (+1 skipped) in 136 files in about 53 s; `npm run test:perf` passed. Post-release follow-ups are listed in `.superpowers/sdd/2026-11-18-plan-8-release/post-release-followups.md`.
- Ancients content (battles, texts, histories, golden fixtures, art and terrain hash pins, scenario-bound tests) was removed in Plan 2A.
- Battles 001–015 are generated from `design/data` (Plan 3B) and playable; `000` stays the hidden drill (the picker and random battle skip `hidden` battles).
- `design/ancients/` holds the Ancients design docs for reference.
- The roadmap is in `design/superpowers/plans/2026-11-17-plan-1-foundations.md`.
- Every localStorage key starts with `ccn-` and is built with `storageKey(name)` from `src/ui/storage.ts`, never a string literal.

## Commands

| Command | What it does |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Dev server on http://localhost:5173 (launch config `dev`) |
| `npm test` | All Vitest tests (engine, rules, scenarios, art, terrain, UI, AI, golden games; the number and time change with every plan, so read the run) |
| `npm run typecheck` | `tsc --noEmit -p .` and `tsc --noEmit -p tsconfig.scripts.json` (adds `@types/node`; checks `scripts/` too) |
| `npm run build` | Type-check, then build the static site into `docs/` |

Slow opt-in AI runs (levels `captain`, `colonel`, `marshal` or 0/1/2; `--deterministic` reads no clock, so results do not depend on machine
load; see each file header for flags):
- `npx vite-node scripts/ai-match.ts -- --a colonel --b captain --games 2 --deterministic` (add `--random` for a random side B);
- `npx vite-node scripts/ai-balance.ts -- --a colonel --b colonel --scale 0.5 --games 6 --deterministic --shard 0/4 --json bal-0.json`,
  then `npx vite-node scripts/ai-balance-report.ts -- bal-*.json` (wins with Wilson intervals, behaviour counters);
- `npx vite-node scripts/ai-probe.ts -- --scenarios 001,012,113` (per-battle node cost and the scale that matches the time caps).

## Publishing (GitHub Pages)

- Repo: https://github.com/janisstrods/cnc-napoleon-claude. Live site: https://strods.work/cnc-napoleon-claude/.
- `docs/` is committed from v1.0.0 on, and Pages serves **`main` branch, `/docs` folder** (the legacy build, switched on with `gh api`). `docs/` is generated build output: never hand-edit it, and never put notes there (design notes live in `design/`).
- To publish a change: `npm run build`, then commit the source changes **together with the regenerated `docs/`**, then `git push`. Pages updates about a minute later.
- Every publish is a release. Before building, add it at the top of `RELEASES` in `src/version.ts` and set the same number
  in `package.json` (and the root of `package-lock.json`). The main menu shows it in the lower-right corner, with the build time.
  Each release takes the name of a battle of this game (Napoleonic battles) that fits what it brings, never reused (v1.0.0 is "Talavera"). Pick it yourself (the user
  likes a fitting, playful choice) and tell the user; there is no need to ask first.
- Players' saves outlive a release: bump `ENGINE_VERSION` (`src/ui/game/controller.ts`; saves of another version are discarded on load) whenever a change to engine rules or scenario data would break old saves or replays. The replay check (answer count and `rngCalls`) catches most divergence, but not a rules change that leaves `rngCalls` as it was.
- `docs/.nojekyll` comes from `public/.nojekyll`; keep it.
- `vite.config.ts` uses `base: './'` and routes are hash-based (`#/...`) so the site works under `/cnc-napoleon-claude/`. Do not introduce absolute asset paths (`/assets/...`).
- To check the built site under the sub-path locally: run `npm run build`, then start the `pages-preview` launch config (http://localhost:4173/cnc-napoleon-claude/).
- **No GitHub Actions:** the push token lacks the `workflow` scope, so a push that adds `.github/workflows/*` is rejected.
- **Pushing:** use HTTPS with the macOS keychain credential. `gh` is logged in (still no Actions).

## Development shortcuts

- Battles: files `src/scenarios/data/<id>.json` are generated by `npx vite-node scripts/scenarios/build.ts` (`-- --check` to verify, `-- --ids 006` for one) from `design/data/<id>.json` and the meta table `scripts/scenarios/meta.ts` (which joins `meta-base.ts`, 001–015, and `meta-exp1.ts`, 101–118); never hand-edit them (`000` is hand-written). Briefing texts are in `src/scenarios/texts.ts`.
- Developer routes (they also work in the production build; only `window.__ccn` is dev-only; a game started with `?cards=` records no Triumphs medal): `#/play/<scenario>/<top|bottom>/<captain|colonel|marshal>[/<seed>]` (e.g. `#/play/000/top/colonel`) and `#/gallery/art|terrain|kit|history|figures`; the figures gallery is `#/gallery/figures[/infantry|cavalry|artillery|leaders|board|single/<KEY>|<KEY,KEY>]` (keys written with `-`, e.g. `FR-LN`).
- In dev, `window.__ccn` is the GameController. `__ccn.autoAnswer()` plays the human's move through the general (the real AI, as the "Let the general decide" button does), and `__ccn.setSpeed(4)` speeds up animations.
- Browser tests must be silent: before playing on a dev-server origin, run `localStorage.setItem('ccn-muted','1'); location.reload()`
  (the flag is per origin, so each port needs it).

## Where things live

- `src/engine/codes.ts`: the Napoleonics vocabulary (nations, arms, unit codes, `UnitKey` = `Nation/UnitCode`, `isUnitKey`); imports nothing.
- `scripts/scenarios/convert.ts` (the converter; it carries `river` per hex, `moveFirst`, and the Expansion #1 objectives and side rules through to the JSON), `scripts/scenarios/meta-base.ts` (the meta table of 001–015), `scripts/scenarios/meta-exp1.ts` (the meta table of 101–118: armies, commanders, objectives and side rules), `tests/scenarios/{generated,base,battles-soak,battle-rules,texts}.test.ts` and `manifest.ts`.
- `src/scenarios/catalogue.ts`: `CATALOGUE` of every battle (base 001–015, Expansion #1 101–118) with name, date and box, transcribed or not; histories are checked against it.
- One table per kind of thing: `UNIT_STATS` (`src/engine/units.ts`), `TERRAIN_STATS` and `WORKS` (`terrain.ts`), `CARD_DEFS`
  (`cards.ts`) and `EXPANSIONS` (`expansions.ts`). A new unit type or terrain is a row there, and the compiler then asks for its
  art (see the art notes below). A new expansion is an `EXPANSIONS` row plus its battle files; briefing texts of every battle are one table in `src/scenarios/texts.ts`.
- Art: the Napoleonic miniatures are in `src/art/nap/`. Data is in `keys.ts` (`ART_KEYS`), `nations.ts` and `specs/`; the drawing code never tests nations or codes. A new unit key needs an `ART_KEYS` entry, a spec, and a decision in `tests/art/nap/wiring.test.ts` (art, or `PLACEHOLDER_OK` with a reason). The public tokens (`src/art/token.tsx`, `leader.tsx`, `icon.tsx`) delegate to it for art keys and art nations; every unit row and every nation now has art (SP is an art nation, Plan 7C Task 13), so the placeholder drawing in `token.tsx` and `leader.tsx` is reached only by a key or nation that is not in the tables. The hash pin is `tests/art/nap/looks.test.ts`: after a deliberate art change, re-pin with the hash it prints and say so in the commit. An attached leader sits at `NAP_LEADER_ATTACH_OFFSET` (the left end of the badge).
- Battle rules are data: the scenario JSON → `ScenarioSetup` (`src/engine/setup.ts`) → `GameState.scenario` (readonly,
  shared by `cloneState`). Play state lives in `GameState.special` (copied). A rule that falls on one side names it in the
  data; it never goes by army name.
- Engine modules, bottom layer first (each imports only earlier ones; type-only imports exempt): `codes, types, hex, rng,
  expansions, units, terrain, query, cards, setup, scenarioRules, banners, objectives, dice, sight, retreat, movement,
  orders, tacticRules, options, decisions, combinedArms, casualties, leaders, resolve, squares, reactions, afterMelee,
  fire, melee, tactics, guerrilla, phases, moveFirst, flow`; then `legal`, `driver`, `text`, `index`. `statsOf(state, unit)` is the unit's row
  with the scenario's `unitOverrides` applied. Rules that act at a point in a battle are hook modules called from
  `melee`/`resolve`/`phases`: `reactions` (Retire and Reform, First Strike), `squares`, `leaders`, `combinedArms`,
  `afterMelee` (take ground, breakthrough, bonus melee), `tactics` (Élan, Rally, Short Supply), `guerrilla` (the counters, the spend question and the Scout draw) and `moveFirst` (116's secret opening card). `decisions.ts` holds `ask`
  and `answerError`, the one answer check the AI and UI also use. The flow is generators yielding one of 20 `Decision`
  kinds (`playCard, orders, leaveSquare, move, battle, combinedArms, defend, ignoreFlags, retreat, leaderRetreat, advance,
  breakthroughExtra, bonusMelee, elan, rally, scoutKeep, shortSupplyTarget, shortSupplyHex`, and `guerrilla, moveFirst` from Expansion #1); `GameDriver` runs them
  (replay, undo, events). The engine never branches on a nation or army name (`tests/engine/no-nation-names.test.ts`).
- Scenario format (`ScenarioSetup`, `src/engine/setup.ts`): `terrain` entries (a `river` hex may carry a `crossing` and a `river` rule of its own that overrides the battle's `rivers`; `fieldworks`
  has `on` for the base terrain and `sides` for the works hexsides), `rivers` (one rule per battle), `square` on a unit at setup,
  `objectives` of kinds `tempHex` / `tempGroup` / `exit` / `killWeight` and, from Expansion #1, `tempAny` / `majority` / `exitEdge` / `suddenDeath`, `sideRules` (`flagIgnoreOn`, `impetuousCavalry`, and from Expansion #1 `guerrilla` / `breakOnLosses` / `handShrink` / `squareCap` / `cavalryChargeFolly`), `moveFirst: 'reveal'` (116: the first player comes from revealed cards) and `unitOverrides` (rows changed for one key).
- The AI calls the engine's rules, passing its `Occ` board index as a `PieceIndex` (`src/engine/query.ts`) rather than
  copying them. Deliberate approximations say so in a comment (`// approximates RR §x (engine: <generator>)`).
- `src/ai` modules, lowest first (a few type-level and function-scoped cycles aside), one line each:
  - `rand`: the AI's own generator (never the game's RNG).
  - `budget`: the one node budget of a decision (ruling 2; no clock in deterministic mode).
  - `board`: the `Occ` board index and distance helpers.
  - `personality`: commander temperaments (`personalityFor`).
  - `values`: unit, banner and weight values (`weightsFor`).
  - `odds`: dice distributions from the engine's scoring.
  - `view`: the hidden-information boundary: the only file that reads hidden fields (`deck`, `hand`, `squareTrack`, `rng`) and the
    only `cloneState` caller (`blindClone`, `determinize`); `tests/ai/hidden-scan.test.ts` enforces it.
  - `voice`: the commanders' lines.
  - `estimate`: the expected value of one battle.
  - `reactions`: the defender's choice and the Combined Arms guns.
  - `evaluate`: the static evaluation.
  - `cardsense`: card keep values, Guerrilla and Move First.
  - `ordering`: order candidates and the quick card score.
  - `moves`: move scoring.
  - `sim`: engine turns on determinised clones.
  - `policies`: fast answers to every decision kind.
  - `planner`: turn plans, battle rollouts and `LEVELS`.
  - `index`: `chooseAnswer`, the entry point.
  - `worker`: the Web Worker entry.
  - `client`: the main-thread wrapper, with the in-thread fallback.
- `design/ai-balance.md`: the AI calibration log (reference win rates, strength and balance runs, behaviour counters, timings).
- The player's record (Triumphs: medals per battle, side and opponent level) is `src/ui/record.ts`, in localStorage
  `ccn-record-v1`; the controller records a battle once when it ends. Medal art and the dialog: `src/ui/screens/Medal.tsx`,
  `Triumphs.tsx`.
- Test kits: `tests/rules/helpers.ts` (`build`/`setupOf` pass `ScenarioSetup` fields through; the top army is French and the
  bottom British; `duel`, `attackOn` and `miss` set up a melee, `attack` answers the decisions that follow a declaration), `tests/ai/helpers.ts`,
  `tests/scenarios/helpers.ts`, `tests/support/rng.ts`, `tests/support/storage.ts` (a localStorage stub). Scripts share `scripts/lib.ts`. Long AI tests go in
  `*.slow.test.ts` files, which a sequencer in `vite.config.ts` starts first. Wall-clock speed budgets (`tests/ai/evaluate-speed.slow.test.ts`) assert only with `CCN_PERF=1` (`npm run test:perf`, on a quiet machine); in `npm test` they just run.

- UI (`src/ui/game/`): `GameScreen.tsx` is the layout and keyboard wiring; `controller.ts` runs the game and the general; `promptSpec.ts` (pure
  prompt text and buttons per decision), `prompts.tsx` and `panels.tsx` render them; `logText.ts` words each event for the battle log (no raw
  event kind ever reaches the log); `assign.ts` maps Élan and Rally dice to units; `squareText.ts` and `SquareTrack.tsx` show the square track
  and its counters; `boardKeys.ts` is the pure keyboard logic. `src/ui/screens/rulesText.ts` is the Rules Reference text (its Controls and
  Keyboard blocks are UI help, not from the RR).
- Look: the campaign-map theme (parchment, ink and bronze, engraved cards) is the tokens in `src/ui/kit/theme.css` with their TypeScript twins
  in `theme.ts`; new UI takes its colours from the tokens. The side column of the game screen (army panel, dice, log) is laid out in `game.css`
  so the log keeps at least 170 px at 1024x768.
- Keyboard: Tab reaches the board as one stop, where the arrow keys move a cursor hex, Home and End go to the ends of its row, Enter or Space
  clicks the hex and Shift+Enter its leader; B goes to the board, P to the prompt buttons, F6 (Shift+F6 back) cycles board, prompt and hand;
  1–9 pick a card. Browser tests: `window.__ccn` and the dev routes above; a worktree's dev server needs nothing special (`vite.config.ts` allows the
  real `node_modules` path for fonts in dev).

## Rules and docs

- `design/rules-reference.md` (RR) is the authoritative condensed rules of the base game (4th edition); the new rules
  tests are written from it. §1 board and sections, §2 units (per-nation tables FR/BR/PT/AL, fire dice by
  blocks, artillery by range, leaders), §3 dice and hit scoring, §4 terrain, §5 turn and Command, §6 orders and
  leaders, §7 movement, §8 fire and line of sight, §9 melee (squares, Retire and Reform, Combined Arms, breakthrough),
  §10 retreats and flags, §11 leaders, §12 the 70 Command cards, §13 victory and objective types, §14 the special rules
  of battles 001–015, §15 the Expansion #1 rules (Guerrilla counters, Move First, the Spanish and Swiss rows, retreats of two and three hexes, the new objective kinds) and §16 its battle special rules (one subsection per battle, 101–118). `design/exp1-rulings.md` (rows S1…S46) holds the Expansion #1 decisions; a new rules question gets an S row there first.
- `design/rulings.md`: the binding decisions table (R1…); the RR's `[Interp R<n>]` marks and engine tests cite it. A new
  rules question gets a row there first.
- `design/survey.md`: the scenario survey of battles 001–015 (sides, hands, units, terrain, objectives, special rules).
  The verified hex-exact transcriptions are `design/data/NNN.json`, with notes and verification logs beside them.
- `design/ccn-rules-research.md`: background rules research and the comparison with Ancients.
- `design/ancients/`: the Ancients design docs, kept as reference only (not rules for this game).
- `design/superpowers/` holds the design specs and implementation plans.
- Every `tests/rules` file starts with a header line `// Rules: RR §a, §b.c (design/rules-reference.md)` naming the RR sections it
  tests, and `tests/engine/rr-coverage.test.ts` checks that every section is cited by some header (a bare `§n` covers only §1, §14 and §16).
- Battle objectives are data (`objectives` in the scenario JSON), handled by `objectives.ts` and `banners.ts`; victory counts `bannerTotal`
  (permanent + held). The board never changes in play (`cloneState` shares `terrain` and `works`).

## Battle histories

- Every battle in the catalogue (base 001–015 and Expansion #1 101–118) has a history in `src/history/battles/<id>.ts`
  (format `src/history/types.ts`: context, map with phases, outcome, sources). `COVERED` in `tests/history/history.test.ts`
  is `['base', 'exp1']`, so a new catalogue battle in those boxes fails the tests until its history is written;
  `tests/history/fixture-007.ts` is the validator fixture.
- Sources: Oman, *A History of the Peninsular War*, and Napier, *History of the War in the Peninsula* (cite the 1829–1840
  first edition), read in full on archive.org; other campaigns from comparable standard histories. Paraphrase (quotes
  under 15 words, no close paraphrase of Oman), attribute every judgement or figure to the source that makes it, and say
  so when sources differ. British spelling. The lessons from the fact-checks are in
  `.superpowers/sdd/2026-11-17-plan-6a-histories/lessons.md` when present.
- Check one: `npx vite-node scripts/history-check.ts -- <id>` (validator and word counts), then with a dev server running
  `scripts/history-shot.sh <id> <out-dir> [port]` cuts `#/gallery/history/<id>` into tiles to read one by one (every map
  phase and the flipped map; arrows fade in for about a second). `#/gallery/history/maps` is the contact sheet of every
  map phase. Parallel writers each use their own worktree and dev-server port.

## Golden fixtures

- `tests/golden/fixtures.json` records 38 games: a random-play game for every battle (`rnd-<id>-<seed>`: `000` seed 11, `001`–`015` seeds 11–25, `101`–`118` seeds 111–128) and four AI-vs-AI games at budget scale 0.05 (`ai-005-31`, `ai-010-32`, `ai-101-33`, `ai-116-34`). Each holds the hash of every engine event plus the final state digest (which includes `special`), the answer count and the winner. `tests/golden/save-fixture.json` is a battle 116 save (seed 17, the first 60 random answers) with its `rngCalls` and state hash. `golden.test.ts` replays the random games and rebuilds the save; `golden-ai.slow.test.ts` replays the AI games.
- Re-record with `npx vite-node scripts/golden-record.ts > tests/golden/fixtures.json` and `npx vite-node scripts/golden-record.ts -- --save > tests/golden/save-fixture.json`.
- Re-record only after a deliberate engine or AI change, and say so in the commit message. A golden test failing otherwise is a regression: fix the code, not the fixture.
