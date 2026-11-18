# C&C: Napoleonics — Plan 7C: The Spanish Expansion (battles 101–118) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** All 18 Expansion #1 battles (101–118) playable end to end against the AI, from either side: the Spanish, Swiss and new French unit rows, Guerrilla Action, the new terrain and water rules, every battle's special rules, the generated scenario files, art, screens, rules reference and AI.

**Architecture:** Third part of Plan 7, after 7A (survey and rulings) and 7B (verified maps). Task 1 writes the rules reference for the expansion (RR §15–§16) from `design/exp1-rulings.md`. Task 2 is the one contract change: every new type, setup field and decision kind, with stubbed behaviour and the minimal rows other tracks' exhaustive tables need, so the engine lanes after it never touch `types.ts`, `src/ui` or `src/ai`. Engine rules then land in four parallel lanes, as hook modules called from the existing flow. Battle rules are data in `scripts/scenarios/meta-exp1.ts`, which the existing converter turns into `src/scenarios/data/1NN.json` (files stay `hidden` until the screens are ready). Art follows the refined Plan 6B style (Opus). UI and AI work waits for Plan 4 Task 10 and Plan 5 Task 9 and only consumes their interfaces.

**Tech Stack:** TypeScript 5.6, React 18, Vite, Vitest 2 (`react-dom/server` markup tests), `vite-node` scripts, headless Chrome via `scripts/shot.sh`.

**Spec:** `design/superpowers/specs/2026-11-17-cnc-napoleonics-design.md` ("Expansion #1 additions", phase 8). Rules authority: `design/exp1-rulings.md` (S1–S40; S10 superseded by commit `e9db9c3`) and `design/exp1-survey.md`. Maps: `design/data/101–118.json` with `notes-*` and `verify-*` beside them. Conventions: Plans 2B, 3B, 4, 5, 6B (`design/superpowers/plans/2026-11-17-plan-*.md`), `CLAUDE.md`, `.superpowers/sdd/2026-11-17-plan-2b-engine/carry-forward.md` (Plan 7 carries are taken up in Tasks 2, 3 and 11).

## Global Constraints

- Never modify anything under `/Users/janisstrods/Gamemaking/cnc-ancients`.
- localStorage only through `storageKey(name)` from `src/ui/storage.ts` (prefix `ccn-`); never a string literal key.
- British spelling (`colour`, `centre`, `manoeuvre`, `defence`, `armour`, `grey`); original prose and original art; any quotation under 15 words; no GMT rule text or artwork.
- House title "Commands & Colours: Napoleonics"; GMT's spelling "Commands & Colors" appears only in the disclaimer.
- Commits are path-limited (`git add <paths>`, `git add -A <paths>` for deletions) and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. No GitHub Actions. No push.
- Browser tests are silent: on each dev-server origin run `localStorage.setItem('ccn-muted','1'); location.reload()` before playing. Start a server with `npx vite --port <N> --strictPort` (background); stop it only with `pkill -f 'vite --port <N>'` (never kill a pid found with `lsof`). Ports: lane `p7c-<n>` uses `52<30+n>` (p7c-1 → 5231 … p7c-12 → 5242). Screenshots go to `/Users/janisstrods/Gamemaking/cnc-napoleonics-research/ui-shots/p7c/`, never committed; the implementer opens each one and says what it shows.
- Never `npm install` in a worktree (`node_modules` is a symlink). No new dependencies in this plan.
- Every merge into `main` leaves `npm run typecheck` clean, `npm test` green and `npx vite-node scripts/scenarios/build.ts -- --check` clean.
- **Engine:** the engine never branches on a nation or army name, and new engine files contain none of the words French, British, Portuguese, Allied, Spanish nor a nation-code literal (`tests/engine/no-nation-names.test.ts`). The side that holds Guerrilla counters is "the guerrilla side" and the other "its opponent". A rule that falls on one side names the side in the data. Rows and nation codes live only in `codes.ts` and `units.ts`.
- **Contract:** only Task 2 edits `src/engine/types.ts`. A later task that finds it needs a type change stops and reports to the controller. `src/engine/index.ts` is append-only (merges keep both sides' lines).
- **Rules tests** are written from `design/rules-reference.md` §15–§16 (Task 1) and each `tests/rules` file starts with `// Rules: RR §… (design/rules-reference.md)`. A new rules question gets an `S` row in `design/exp1-rulings.md` first (controller or Task 1 owner).
- **Cross-track tables** (Plan 4 owns `src/ui/**`, Plan 5 owns `src/ai/**`): Plan 7C touches them before its UI/AI tasks only where named in a task's Files list (Task 2's table rows, Task 3's row-count tests). Anything else stops and is reported.
- **Models:** Sonnet implements unless the task says Opus; Opus reviews every task and the whole plan at the end. Art tasks (13, 14) are implemented by Opus.
- **Worktrees** `.worktrees/p7c-<n>` (table below). A lane merges `main` before each new task.
- **Commits:** each task's commit adds exactly the paths of its Files list; where a step gives only the message, that is the commit (message + trailer).

## Review Focus

1. **Battle 116 with no eligible opening card** (a hand of Counter-Attack, Élan, First Strike, Leadership and Rally only): the game must not stall; that side picks nothing and moves second (S43). Pinned in Task 9 ("a side with no eligible card picks nothing and moves second").
2. **Guerrilla cancellation of a card with Draw-phase effects or a copy:** a cancelled Scout draws one card, a cancelled Élan still reshuffles, a Counter-Attack later copies the cancelled card, and a Scout with an empty pool (6 counters held) draws normally with no prompt. Pinned in Task 4.
3. **A Spanish unit whose 2- or 3-hex retreat is blocked** by the board edge, units or impassable water, or which is in square: it loses 1 block per hex short (2 per flag in square, 3 for militia, 1 for Swiss). Pinned in Task 3.
4. **Undo and replay across the new hidden or random steps:** undo may not cross the 116 reveal or the Guerrilla die, and replaying the saved answers reproduces the game. Pinned in Task 9 ("undo cannot cross the reveal"), Task 4 ("undo stops at the Guerrilla roll") and Task 21 (determinism).
5. **A unit removed in the middle of a combat by a battle rule** (the second `FR/SWI` destroyed by a battle back on the Spanish turn; the third `SP/FA` destroyed by a failed retreat): the game ends or continues cleanly, with no melee step acting on a removed unit. Pinned in Task 8 and Task 5.

---

## Lanes, dependencies and file ownership

| Task | Model | Lane (worktree) | Starts after | Owns (creates or edits) |
|---|---|---|---|---|
| 1 RR §15–§16 and plan rulings | Opus | `p7c-1` | now | `design/rules-reference.md`, `design/exp1-rulings.md` |
| 2 Expansion contract, terrain and water | Opus | `p7c-3` | now | `src/engine/{types,setup,scenarioRules,squares,terrain,decisions,legal,index}.ts`, `src/scenarios/index.ts`, `scripts/scenarios/convert.ts` (name lists only), table rows in `src/ui/game/{promptSpec,logText}.ts`, `src/ui/terrain/TerrainIcon.tsx` (one case), `src/ai/policies.ts` + `tests/ai/kinds.test.ts` (only if merged), `tests/ui/{log-text,generic-prompts}.test.ts`, `tests/engine/answer-errors.test.ts`, `tests/rules/{helpers,invariants}.test.ts`, new `tests/rules/exp1-contract.test.ts`, `tests/rules/exp1-terrain.test.ts` |
| 3 Spanish, Swiss and new French rows; moving penalties | Sonnet | `p7c-2` | now | `src/engine/{codes,units,dice}.ts`, `tests/ui/unit-text.test.ts` (row counts), `tests/ui/rules-reference.test.ts` (expansion-tab assertion), `tests/art/nap/wiring.test.ts` (`PLACEHOLDER_OK`), new `tests/rules/exp1-units.test.ts` |
| 4 Guerrilla Action | Opus | `p7c-4` | Task 2 | new `src/engine/guerrilla.ts`, `src/engine/{phases,flow}.ts`, new `tests/rules/guerrilla.test.ts` |
| 5 New objective kinds | Sonnet | `p7c-5` | Task 2 | `src/engine/{objectives,banners}.ts`, new `tests/rules/exp1-objectives.test.ts` |
| 6 Lancers' flag re-roll | Sonnet | `p7c-2` | Task 3 | `src/engine/{dice,reactions,leaders}.ts`, new `tests/rules/lancers.test.ts` |
| 7 Square and First Strike limits (106, 115) | Sonnet | `p7c-2` | Tasks 2, 6 | `src/engine/reactions.ts`, new `tests/rules/exp1-squares.test.ts` |
| 8 Swiss break (101) and shrinking hand (106) | Sonnet | `p7c-5` | Tasks 3, 5 | `src/engine/{casualties,banners,scenarioRules}.ts` (the Swiss hook in `casualties`, the hand hook in `scenarioRules`), new `tests/rules/exp1-side-rules.test.ts` |
| 9 Move First by revealed cards (116) | Sonnet | `p7c-4` | Task 4 | new `src/engine/moveFirst.ts`, `src/engine/{flow,decisions,driver}.ts`, new `tests/rules/move-first.test.ts` |
| 10 Briefing texts 101–118 | Sonnet | `p7c-1` | Task 1 | `src/scenarios/texts.ts`, `tests/scenarios/texts.test.ts` |
| 11 Scenario files 101–118 | Sonnet | `p7c-3` | Tasks 2, 3 | new `scripts/scenarios/meta-exp1.ts`, `scripts/scenarios/{convert,meta}.ts`, `src/scenarios/data/101–118.json`, new `tests/scenarios/{manifest-exp1.ts,exp1.test.ts}`, `tests/scenarios/{generated,convert}.test.ts` |
| 12 Spanish battles in their real setups; soak; RR coverage | Sonnet | `p7c-3` | Tasks 4–11 | new `tests/scenarios/exp1-rules.test.ts`, `tests/scenarios/battles-soak.test.ts`, `tests/engine/rr-coverage.test.ts` |
| 13 Spanish, Swiss and Guard light cavalry figures | Opus | `p7c-6` | Task 3 | `src/art/nap/{keys,nations}.ts`, `src/art/nap/specs/**`, `src/art/nap/headgear/**`, `tests/art/nap/**` |
| 14 Terrain, counter and objective-marker art | Opus | `p7c-6` | Tasks 2, 5, 13, **Plan 4 Task 10** | `src/ui/terrain/{towns,water,fieldworks,objectives,TerrainIcon}.tsx`, `src/ui/kit/icons/napGlyphs.ts`, `src/dev/TerrainGallery.tsx`, new `tests/ui/exp1-terrain-art.test.ts` |
| 15 Guerrilla and Move First on screen | Sonnet | `p7c-7` | Tasks 4, 9, 14, **Plan 4 Task 10** | `src/ui/game/{promptSpec,prompts,uiModel,GameScreen,panels}.ts(x)`, `src/ui/game/game.css`, new `tests/ui/exp1-prompts.test.ts` |
| 16 Log, tooltips and objective text | Sonnet | `p7c-8` | Tasks 5, 6, 8, 14, **Plan 4 Task 10** | `src/ui/game/{logText,unitText,objectiveText}.ts`, new `tests/ui/exp1-text.test.ts` |
| 17 Rules tab, picker and Triumphs for 101–118 | Sonnet | `p7c-8` | Tasks 11, 12, 15, 16, **Plan 4 Task 9** | `src/ui/screens/{rulesText.ts,RulesReference.tsx}`, `scripts/scenarios/meta-exp1.ts` (hidden flag), `src/scenarios/data/101–118.json` (regenerated), `tests/ui/{clean-slate,screens,rules-reference,ranks,random-battle}.test.ts`, new `tests/ui/exp1-screens.test.ts` |
| 18 AI values and Spanish-war temperaments | Sonnet | `p7c-9` | Task 3, **Plan 5 Task 9** | `src/ai/{values,personality}.ts`, new `tests/ai/exp1-values.test.ts` |
| 19 AI Guerrilla and Move First sense | Opus | `p7c-10` | Tasks 4, 9, **Plan 5 Task 9** | `src/ai/{policies,cardsense,view}.ts`, `tests/ai/hidden-scan.test.ts`, new `tests/ai/exp1-cards.test.ts` |
| 20 AI objectives and battle rules | Opus | `p7c-11` | Tasks 5, 8, **Plan 5 Task 9** | `src/ai/{evaluate,ordering,estimate}.ts`, new `tests/ai/exp1-objectives.test.ts` |
| 21 Acceptance and docs | Sonnet | `p7c-12` | Tasks 1–20, **Plan 4 Task 11**, **Plan 5 Task 10** | new `tests/ai/battles-exp1.slow.test.ts`, `tests/ui/full-games-exp1.slow.test.ts`, `CLAUDE.md`, `design/ai-balance.md` (Spanish section) |

**Start order.** Tasks 1, 2 and 3 start now, in parallel (disjoint files). After Task 2 merges: Tasks 4 (lane 4) and 5 (lane 5) start; lane 2 continues 3 → 6 → 7; lane 1 continues 1 → 10; lane 3 continues 2 → 11 → 12. Lane 6 starts Task 13 once Task 3 merges. UI tasks wait for Plan 4 Task 10 (it edits `panels`, `prompts`, `GameScreen`, `controller`, `objectives.tsx`); AI tasks wait for Plan 5 Task 9 (it rewrites `chooseAnswer` on `policies.ts`). Two tasks running at the same time never share a file, except the append-only `src/engine/index.ts`.

**Cross-track notes for the controller.**
- When Task 2 merges, relay to the Plan 5 controller: two new decision kinds (`guerrilla`, `moveFirst`) exist. If Plan 5 Task 7 has not merged, its `policyFor` and `tests/ai/kinds.test.ts` take them as random-legal (`safeAnswer`) entries, 20 kinds in all; Task 19 gives the real policies. If Task 7 has merged, Task 2 adds those entries itself.
- When Task 2 merges, relay to the Plan 4 controller: `DECISION_TITLES` and the `guerrilla` roll purpose have rows; until Task 15 the human sees only the generic prompt for the two new kinds ("Let the general decide" always works).
- Relay to Plan 4 Task 9 (if it has not merged): a scenario with `hidden: true` is unavailable everywhere in the UI (picker, random battle, Triumphs show "Not yet available"); the dev route still opens it. If Task 9 has merged and counts hidden files as available, Task 11 may change that one availability test in `Triumphs.tsx` (named exception).

## Decisions taken in this plan

| Question | Decision | Cost if wrong |
|---|---|---|
| S10 re-check of 103, 105, 110, 114 | Done while planning: the special rules of those four battles (survey §1) set no strength, so every unit starts at its card strength (the 4-block `SP/HC` at 103, 3- and 5-block line at 105, 5-block `SP/LN` at 110 and 5-block `BR/LN` at 114 are map numbering slips, as survey.md discrepancy 18). The converter gets no per-unit blocks field. Recorded as S41 (Task 1). | one meta field |
| 115 ford hexes | The four drawn ford tiles of the verified `design/data/115.json`: (5,0), (5,1), (5,3), (6,4); S24's two-hex list predates the verifier's correction. Recorded as S42. | four hexes |
| 116 with no eligible card | That side picks nothing, counts above every card, has no committed card, and moves second; if both pick nothing, the tie goes to the top (Allied) side. S43. | a stall |
| 116 secrecy and undo | Picks are asked top first, then bottom. The AI never reads the other side's unrevealed pick (Task 19 redacts it in `view.ts`); the UI never shows it; undo cannot cross the reveal. S44. | a leak |
| When the Guerrilla question is asked | `spend`: on every turn of the guerrilla side's opponent, right after its card is played, only while the guerrilla side holds a counter. `scout`: in the guerrilla side's Draw phase after a Scout (or a Counter-Attack copying one), only while the pool has a counter, before any card is drawn. S45. | a prompt |
| 106 hand shrink | Counts permanent banners only (106 has no temporary objective); the card goes face up to the discard (`discarded` event). S46. | one rule |
| Army names, nations and commanders of 101–118 | The Task 11 META table. Mixed armies: 109 `Anglo-Spanish` (SP, Cuesta), 114 `Anglo-Spanish` (BR, Graham), 115 and 116 `Allied` (BR), 118 `Anglo-Spanish` (BR, Adam). | strings |
| Box of the new rows | Rows first used by Expansion #1 battles (`FR/LNC`, `FR/GLC`, `FR/SWI`, every `SP/*`) have `expansion: 'exp1'` and appear in the rules dialog's Expansion #1 tab. | a tab |
| Colours of Swiss units and mixed-army leaders | Presentation only (no rules effect): a unit's base edge is its row's nation colour (`SP/SWI` Spanish yellow, `FR/SWI` French blue, so the side reads at a glance; coats come from history); a leader is drawn in his side's nation (`PlayerState.nation`). | art |
| Spanish battles before the screens are ready | Generated with `hidden: true` (Task 11) and opened through the dev route; Task 17 makes them visible together with the screens and the Triumphs counts. | a flag |
| Where 2- and 4-sided redoubts live | They are `fieldworks` with 2 or 4 `sides` (S23): no new terrain type; Task 2 tests both counts. The Walled Farm is a new terrain row `walledFarm`, a Town in every respect (S22). | — |

---

### Task 1: Rules reference §15–§16 and the plan's rulings

**Model:** Opus. **Lane:** `p7c-1`. **Starts:** now.

**Files:**
- Modify: `design/rules-reference.md` (replace the "§15 reserved" stub), `design/exp1-rulings.md` (rows S41–S46; one sentence closing S10)

**Interfaces:**
- Produces the section numbers every later test header cites:
  - §15 Expansion #1 rules: **§15.1** Spanish, Swiss and new French unit rows (one table: code, blocks, move, range, fire standing/moving, melee standing/moved, retreat per flag, flags ignored, sabres, notes; S1–S6, S11–S13); **§15.2** moving penalties and 0-dice cells (S7, S8); **§15.3** retreats of 2 and 3 hexes (S9); **§15.4** lancers and Guard light cavalry (S12, S13); **§15.5** Guerrilla Action (S15–S21, S45); **§15.6** terrain: Walled Farm, 2- and 4-sided redoubts, river tiles and per-battle water (S22–S26, S42); **§15.7** mixed armies, the square track, first player (S27–S29); **§15.8** objective types and side rules added (data definitions: `tempAny`, `majority`, `exitEdge`, `suddenDeath`; `guerrilla`, `breakOnLosses`, `handShrink`, `squareCap`, `cavalryChargeFolly`; `moveFirst`; the per-hex `river` field), each as a field table in the style of §13.4, with the field names of Task 2.
  - §16 Expansion #1 battle special rules: the intro and battle table in the style of §14 (hand, first, banners, objectives, rivers, other), then **§16.1–§16.18** for 101–118 in order, each with its data (hexes from `design/data/1NN.json`), the rulings it rests on and `[Interp S<n>]` marks where the row is `[Interp]`.
- New rulings rows (format of the decisions table; basis "Plan 7C planning"):
  - **S41** block counts: every unit at card strength; 103, 105, 110, 114 checked (Decisions table).
  - **S42** 115 ford hexes (5,0), (5,1), (5,3), (6,4) per the verified map.
  - **S43** 116 no eligible card. `[Interp]`.
  - **S44** 116 picking order, secrecy and undo. `[Interp]`.
  - **S45** when the Guerrilla question is asked (`spend` / `scout`). `[Interp]`.
  - **S46** 106 counts permanent banners only; discarded face up. `[Interp]`.

- [ ] **Step 1: Write §15 and §16.** Paraphrase only; cite S-ids; no GMT text. Numbers come from `design/exp1-rulings.md`.
- [ ] **Step 2: Add S41–S46 and close S10** with "Checked in Plan 7C: no text sets a strength at 103, 105, 110 or 114 (S41)."
- [ ] **Step 3: Verify**

Run: `grep -c '^### 15\.' design/rules-reference.md; grep -c '^### 16\.' design/rules-reference.md; grep -c '^| S4[1-6] ' design/exp1-rulings.md; npx vitest run tests/engine/rr-coverage.test.ts`
Expected: `8`, `18`, `6`; PASS (coverage still requires §1–§14 only; Task 12 extends it).

- [ ] **Step 4: Commit**

```bash
git add design/rules-reference.md design/exp1-rulings.md
git commit -m "docs(rules): RR §15-§16 for Expansion #1; rulings S41-S46

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Expansion contract, terrain and water

**Model:** Opus. **Lane:** `p7c-3`. **Starts:** now (independent of Task 1; it cites the S-rows directly).

**Files:**
- Modify: `src/engine/types.ts`, `src/engine/setup.ts`, `src/engine/scenarioRules.ts`, `src/engine/squares.ts`, `src/engine/terrain.ts`, `src/engine/decisions.ts`, `src/engine/legal.ts`, `src/engine/index.ts`, `src/scenarios/index.ts`, `scripts/scenarios/convert.ts` (`SETUP_TERRAIN`, `_all`, `ITEM_KEYS.terrain` gains nothing; `walledFarm` and the `river` field pass through)
- Modify (table rows only): `src/ui/game/promptSpec.ts` (`DECISION_TITLES`: `guerrilla: 'Guerrilla Action'`, `moveFirst: 'Choose your opening card'`), `src/ui/game/logText.ts` (`VERB`, `rollTitle`, `rollSummary` for `guerrilla`; event cases `guerrilla`, `moveFirst`), `src/ui/terrain/TerrainIcon.tsx` (`walledFarm` drawn as town until Task 14, only if the compiler asks), `tests/ui/log-text.test.ts` (`SAMPLES`), `tests/ui/generic-prompts.test.ts` (two samples; 18 → 20 kinds), `tests/engine/answer-errors.test.ts` (`Refusals`), `tests/rules/helpers.ts` (`endTurn` cases: `guerrilla` → `yesno false`, `moveFirst` → first option), `tests/rules/invariants.test.ts` (`moveFirst` joins `CARD_EVENTS`: it reveals card ids; the victory invariant accepts a win whose `winReason` is a `suddenDeath` objective's text), and only if Plan 5 Task 7 has merged: `src/ai/policies.ts` (`safeAnswer` for both kinds) and `tests/ai/kinds.test.ts` (20 names)
- Create: `tests/rules/exp1-contract.test.ts`, `tests/rules/exp1-terrain.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  - `TERRAIN_TYPES` gains `'walledFarm'`.
  - `RollPurpose` gains `'guerrilla'`. The `roll` event gains optional `reroll?: true`.
  - `Decision` gains `{ kind: 'guerrilla'; side: Side; mode: 'spend' | 'scout'; card: CardKind | null; held: number; pool: number }` (answer `yesno`) and `{ kind: 'moveFirst'; side: Side; options: number[] }` (answer `{ kind: 'playCard'; card }`, card ∈ `options`).
  - `GameEvent` gains `{ t: 'guerrilla'; side: Side; what: 'stood' | 'cancelled' | 'gained'; held: number; pool: number }` and `{ t: 'moveFirst'; picks: Record<Side, number | null>; values: Record<Side, number>; first: Side }`.
  - `TurnState.guerrilla: 'none' | 'stood' | 'cancelled'` (`newTurn` sets `'none'`).
  - `SpecialState` gains `squared: Record<Side, string[]>` (units that ever formed square), `handSize: Record<Side, number>`, `moveFirst: { done: boolean; picks: Record<Side, number | null>; committed: Record<Side, number | null> } | null`. `ObjectiveState` gains `holders?: string[]`.
  - `ObjectiveDef` gains `tempAny { side; hexes: HexId[]; timing: 'turnStart'; banners; text }`, `majority { side; hexes: HexId[]; banners; startHeld: boolean; text }`, `exitEdge { side; row: 0 | 8; free: number; banners; text }`, `suddenDeath { side; keys: RowKey[]; need: number; text }` (`need` = enemy units of `keys` at setup).
  - `SideRuleDef` gains `guerrilla { side; counters: number }`, `breakOnLosses { side; keys: RowKey[]; losses: number; start: number }` (`start` resolved at setup), `handShrink { side; floor: number }`, `squareCap { side; units: number }`, `cavalryChargeFolly { side }`. `SideRuleSetup` (in `setup.ts`) stops being an alias of `SideRuleDef`: it is the same union with `breakOnLosses` lacking `start`.
  - `ScenarioConfigData.moveFirst: boolean`.
- Produces (`setup.ts`): `TerrainName` gains `'walledFarm'`; `TerrainSetup.river?: RiverRule` (per-hex override of `ScenarioSetup.rivers`, used by 104); `ScenarioSetup.moveFirst?: 'reveal'` (`first` is then the tie side); `ObjectiveSetup` gains `tempAny { side; hexes: [r,c][]; banners?; text? }`, `majority { side; hexes; banners?; startHeld?; text? }`, `exitEdge { side; row: 0 | 8; free?; banners?; text? }`, `suddenDeath { side; keys: RowKey[]; text? }`. `createGame` sets `players[side].resources.guerrilla = counters` for the guerrilla side, `special.handSize = cards`, `special.squared` = ids of units starting in square, `special.moveFirst` (or `null`), `objState[i].held = true` for a `majority` with `startHeld`. `cloneState` deep-copies every new array and record.
- Produces (`scenarioRules.ts`, pure queries): `GUERRILLA_COUNTERS = 6`; `guerrillaSide(s): Side | null`; `guerrillaHeld(s): number`; `guerrillaPool(s): number` (= 6 − held, 0 without the rule); `squareCapReached(s, u: Unit): boolean`; `follyActive(s, defender: Side): boolean`; `handShrinkRule(s, side)`, `breakRule(s, side)` (the rule or `undefined`).
- Produces (`squares.ts`): `formSquare` appends the unit to `special.squared[side]` once, and, while that side has not finished a turn (`special.turnsDone[side] === 0`), never takes its committed Move First card (`special.moveFirst?.committed[side]`) as the random track card (so the record never needs clearing). The dead `m.role` guard in `canFormSquare` goes (carry-forward: `MeleeCtx.role` is only `'attack' | 'bonus'`).
- Produces (`terrain.ts`): `TERRAIN_STATS.walledFarm = { ...TOWN, name: 'Walled farm' }`.
- Produces (`decisions.ts`, `legal.ts`): `answerError` and `randomAnswer` for both new kinds.
- Produces (`src/scenarios/index.ts`): the loader passes `moveFirst` through.

Setup validation messages (exact prefixes, each ending with the battle id as today): `tempAny objective needs at least 2 hexes`, `majority objective needs at least 2 hexes`, `majority objective starts held by ${side} without a majority`, `exitEdge row must be 0 or 8`, `suddenDeath: no enemy unit of ${keys}`, `guerrilla counters must be 0..6`, `two guerrilla rules`, `breakOnLosses: unknown unit key`, `handShrink floor must be 1..cards`, `unknown river rule ${x} at (r,c)`, `river override on a non-river hex at (r,c)`, `moveFirst must be 'reveal'`.

- [ ] **Step 1: Write the failing tests**

`tests/rules/exp1-contract.test.ts` (header `// Rules: RR §15.5, §15.7, §15.8 (design/rules-reference.md)`):

```ts
it('a guerrilla rule gives its side counters; the pool is the rest of six', () => {
  // build({ sideRules: [{ kind: 'guerrilla', side: 'top', counters: 1 }] }): players.top.resources.guerrilla === 1,
  // guerrillaSide === 'top', guerrillaHeld === 1, guerrillaPool === 5; no rule → null, 0, 0; the opponent has no key
});
it('majority startHeld is held at setup and counts in the banner total', () => { /* bannerTotal(s,'top') === 1 */ });
it('a majority that starts held without a majority throws', () => {});
it('suddenDeath resolves need from the enemy units of its keys', () => { /* 3 enemy FR/FA + suddenDeath keys FR/FA → need 3; none → throws */ });
it('breakOnLosses resolves start from the side\'s units of its keys', () => {});
it('exitEdge, tempAny, handShrink, squareCap, cavalryChargeFolly validate', () => { /* each bad value throws with its prefix */ });
it('moveFirst sets special.moveFirst with no picks; without it special.moveFirst is null', () => {});
it('handSize starts at the hand size; squared lists the units that start in square', () => {});
it('formSquare records the unit once and never takes the committed card', () => {
  // hand [a, b, c, d], committed b: 50 seeds → the track card is never b; forming twice keeps squared length 1
});
it('squareCapReached and follyActive read their rules', () => {
  // squareCap 2 with squared ['u1','u2']: u3 reached, u1 not; follyActive(top) only when active is bottom, effective 'cavalryCharge', guerrilla !== 'cancelled'
});
it('cloneState copies squared, handSize, moveFirst and holders', () => { /* mutate the copy, the original is unchanged */ });
it('answerError and randomAnswer cover guerrilla and moveFirst', () => {
  // guerrilla: yesno ok, other kinds refused; moveFirst: playCard with a card in options ok, a card outside refused
});
it('the loader keeps moveFirst', () => {});
```

`tests/rules/exp1-terrain.test.ts` (header `// Rules: RR §15.6 (design/rules-reference.md)`):

```ts
it('a Walled Farm is a Town in every respect but its name (S22)', () => {
  // TERRAIN_STATS.walledFarm equals TERRAIN_STATS.town except name 'Walled farm'; sideRuleFlagIgnores 0 there
});
it('2-sided and 4-sided redoubts protect exactly their sides (S23)', () => {
  // fieldworks on plain sides ['SW','SE'] and ['E','SE','SW','W']: works mask bits; melee from the south is across works
  // (−1 infantry), from the north is not; square allowed only from an open side (R70)
});
it('a per-hex river rule overrides the battle rule (104, S24)', () => {
  // rivers 'impassable', river (2,2) and (2,3) with river: 'fordable' → terrain ['river','ford']
});
it('fordable river with ford tiles: the tiles do not stop movement (115, S24, S42)', () => { /* crossing ford → fordNoStop */ });
it('an unknown per-hex rule or a river field on a non-river hex throws', () => {});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/rules/exp1-contract.test.ts tests/rules/exp1-terrain.test.ts`
Expected: FAIL (compile errors on the new fields).

- [ ] **Step 3: Implement the types, setup, queries, `formSquare` bookkeeping, `walledFarm` row and answer checks.** Behaviour beyond setup stays stubbed: no flow asks the new decisions yet. Replace the `setup.ts` comment "needs a per-river rule; it is deferred to Plan 7" with the per-hex rule.
- [ ] **Step 4: Add the cross-track rows**, then run `npm run typecheck` until clean. List every file and line touched outside `src/engine` in the report.
- [ ] **Step 5: Run everything**

Run: `npx vitest run tests/rules tests/engine tests/scenarios && npm run typecheck && npm test && npx vite-node scripts/scenarios/build.ts -- --check`
Expected: all green; base battle files unchanged (the check is clean).

- [ ] **Step 6: Commit**

```bash
git add src/engine src/scenarios/index.ts scripts/scenarios/convert.ts src/ui/game/promptSpec.ts src/ui/game/logText.ts tests/rules tests/engine/answer-errors.test.ts tests/ui/log-text.test.ts tests/ui/generic-prompts.test.ts
# plus src/ui/terrain/TerrainIcon.tsx, src/ai/policies.ts, tests/ai/kinds.test.ts if touched
git commit -m "feat(engine): Expansion #1 contract: new objectives, side rules, decisions, Walled Farm, per-hex rivers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Spanish, Swiss and new French unit rows; moving penalties

**Model:** Sonnet. **Lane:** `p7c-2`. **Starts:** now.

**Files:**
- Modify: `src/engine/codes.ts` (`UNIT_KEYS` appends 12 rows; header comment), `src/engine/units.ts` (rows; `RowSpec` gains `round?`, `movedPlus?`, `expansion?`, `reroll?`, `rerollImmune?`; `UnitStats` gains `rerollsFlags: boolean; immuneToFlagReroll: boolean`; `SP` rounds down), `src/engine/dice.ts` (S7)
- Modify (row-count tests): `tests/ui/unit-text.test.ts:55,57` (34 → `UNIT_KEYS.length`, 46), `tests/ui/rules-reference.test.ts` (the "no SP rows today → no Expansion #1 tab" assertion becomes "SP rows exist → the Expansion #1 tab is offered"), `tests/art/nap/wiring.test.ts` (`PLACEHOLDER_OK = ['FR/SWI', 'FR/GLC']`, reason "art in Plan 7C Task 13")
- Create: `tests/rules/exp1-units.test.ts`

**Interfaces:**
- Produces `UNIT_STATS` rows (`expansion: 'exp1'` for all twelve; `fire: [range, standing, moving]`; retreat per flag):

| key | blocks | move | melee plus / moved | fire | round | retreat | flags | other |
|---|---|---|---|---|---|---|---|---|
| `FR/LNC` | 4 | 1–3 battle | 0 / 0 | none | — | 1 | 0 | `rerollsFlags` |
| `FR/GLC` | 4 | 1–3 battle | 0 / 0 | none | — | 1 | 2 | tag `guard` |
| `FR/SWI` | 5 | 1 battle | 0 / 0 | [2, 0, 0] | down | 1 | 0 | — |
| `SP/LN` | 4 | 1 battle | 0 / −1 | [2, 0, −1] | down | 2 | 0 | — |
| `SP/LT` | 5 | 1 battle or 2 no battle | 0 / −1 | [2, 0, 0] | down | 2 | 0 | tag `light` |
| `SP/GR` | 4 | 1 battle | +1 / 0 | [2, 0, 0] | down | 2 | 1 | tag `grenadier` |
| `SP/ML` | 4 | 1 battle | 0 / −1 | [2, 0, −1] | down | 3 | 0 | `sabreHits: false` |
| `SP/SWI` | 5 | 1 battle | 0 / 0 | [2, 0, 0] | down | 1 | 0 | — |
| `SP/LC` | 3 | 1–3 battle | 0 / 0 | none | — | 2 | 0 | — |
| `SP/HC` | 3 | 1–2 battle | +1 / 0 | none | — | 2 | 0 | tag `heavy` |
| `SP/CU` | 3 | 1–2 battle | +1 / 0 | none | — | 2 | 1 | tag `heavy`, `ignoresInfantryFireHits: 1`, `immuneToFlagReroll` |
| `SP/FA` | 3 | foot guns | artillery | FA table | — | 1 | 0 | — |

  `FR/CU` also gets `immuneToFlagReroll: true`. Every other row gets `false` for both new fields.
- Produces (`dice.ts`): `baseMeleeDice` adds `movedPlus` after moving and floors at 0. `meleeDice` keeps its early `return 0` only for artillery-rule units (R12 untouched); for a blocks-rule unit it adds card dice to a 0 base, applies caps and terrain, and floors at 0 (S7).

- [ ] **Step 1: Write the failing tests** (`tests/rules/exp1-units.test.ts`, header `// Rules: RR §15.1, §15.2, §15.3 (design/rules-reference.md)`)

```ts
it('every new row matches the §15.1 table', () => { /* table-driven over the 12 keys: blocks, move, melee, fire, retreat, flags, sabre, tags, expansion 'exp1' */ });
it('Spanish moving fire: LN and ML 1 at 4 blocks, none at 3; LT 2/2/1/1/0; GR 2/1/1/0 (S1–S4, S7)', () => {
  // baseFireDice(UNIT_STATS[k], b, 2, 1) for b = 5..1 per key
});
it('Swiss move and fire half rounded down; FR/SWI gets no French line die (S11, S14)', () => {
  // baseFireDice(FR/SWI, 5, 2, 1) === 2; baseMeleeDice(FR/SWI vs infantry) === blocks
});
it('Spanish melee after moving: LN/LT/ML b−1, GR b+1, cavalry b or b+1 (S1–S5)', () => {});
it('a moved 1-block SP/LN has 0 dice but may melee with a card die (S7)', () => {
  // ordered by Leadership with its leader attached (melee +1): meleeDice === 1, battleTargets offers the melee;
  // under Probe: meleeDice 0 and no melee target unless a Combined Arms gun can join (then combinedArms required)
});
it('a moved 1-block SP/LN cannot fire, and no card creates the shot (S7, R15)', () => { /* ordered by Leadership (fire +1): fireDice 0 */ });
it('battle back, First Strike and escape use standing dice (S8)', () => {
  // SP/LN 3 blocks battles back with 3; escapeDice === 3
});
it('rallied, unsquared and Short-Supplied units have not moved (S8)', () => { /* ordered piece moved 0 after leaveSquare; fireDice standing */ });
it('FR/LN rolls +1 against Spanish and Swiss infantry (S14)', () => {});
it('SP/CU ignores 1 hit of infantry fire and 1 flag (S5)', () => {});
it('a Spanish infantry unit retreats 2 hexes per flag; militia 3; artillery and Swiss 1 (S9)', () => {
  // forced flags: 1 flag → path length 2 for SP/LN, 3 for SP/ML, 1 for SP/FA and SP/SWI
});
it('a blocked Spanish retreat costs 1 block per hex short; in square 2 per flag, militia 3 (S9, R33, R74)', () => {
  // SP/LN on row 0 (top army retreats up): 1 flag → loses 2; in square: 2 flags → loses 4 (eliminated at 4 blocks)
});
it('Spanish cavalry Retire and Reform is exactly 2 hexes (S5, R34)', () => {});
it('FR/GLC rolls +2 under Cavalry Charge as Guard cavalry (S13, R60)', () => {});
```

- [ ] **Step 2: Run** `npx vitest run tests/rules/exp1-units.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** the rows, the `row()` options and S7 in `dice.ts`.
- [ ] **Step 4: Run** `npx vitest run tests/rules tests/engine && npm run typecheck && npm test` — Expected: green. If a `tests/ai/**` assertion fails on the new rows, stop and report it (Plan 5 owns those files).
- [ ] **Step 5: Commit**

```bash
git add src/engine/codes.ts src/engine/units.ts src/engine/dice.ts tests/rules/exp1-units.test.ts tests/ui/unit-text.test.ts tests/ui/rules-reference.test.ts tests/art/nap/wiring.test.ts
git commit -m "feat(engine): Spanish, Swiss, lancer and Guard light cavalry rows; Spanish moving penalties

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Guerrilla Action

**Model:** Opus. **Lane:** `p7c-4`. **Starts:** Task 2 merged.

**Files:**
- Create: `src/engine/guerrilla.ts` (layer: after `tactics`, before `phases`), `tests/rules/guerrilla.test.ts`
- Modify: `src/engine/phases.ts` (`cardStep`), `src/engine/flow.ts` (`drawPhase`), `src/engine/index.ts` (append)

**Interfaces:**
- Consumes: `guerrillaSide`, `guerrillaHeld`, `guerrillaPool` (Task 2).
- Produces (`guerrilla.ts`):
  - `function* guerrillaSpendStep(s, ctx, active: Side): Gen<boolean>` — when `guerrillaSide(s)` is the other side and it holds ≥ 1 counter, asks `{ kind: 'guerrilla', side, mode: 'spend', card: s.turn.effective ?? cardKind(card), held, pool }`. On yes: held −1 (to the pool), roll 1 die (`rollDice`, purpose `guerrilla`, `emitRoll(ctx, 'guerrilla', faces, [face === 'sabre'], null, null)`); sabre → `turn.guerrilla = 'stood'`, event `what: 'stood'`, returns false; otherwise `turn.guerrilla = 'cancelled'`, event `what: 'cancelled'`, returns true (S17–S19).
  - `function* guerrillaScoutStep(s, ctx, side: Side): Gen<boolean>` — when `side` is the guerrilla side and the pool has a counter, asks mode `scout`; yes → held +1, event `what: 'gained'`, returns true (S20).
- `cardStep` calls `guerrillaSpendStep` right after `cardPlayed`. A cancelled card: `t.mods = NO_MODS`, `t.scout = false`, `t.reshuffle` kept (Élan), nothing ordered, no Élan/Rally/Short Supply step, return (the flow goes to the Draw phase; `lastCard` is set to `t.effective` as usual, S21).
- `drawPhase`: when `t.scout` and `guerrillaScoutStep` returns true, the side draws 1 card instead of 2-keep-1. First Strike replacements are drawn first, as today (R51).

- [ ] **Step 1: Write the failing tests** (`tests/rules/guerrilla.test.ts`, header `// Rules: RR §15.5 (design/rules-reference.md)`). The kit's top army is French; give the guerrilla rule to `bottom` in most tests, and to `top` in one, so no test depends on the side.

```ts
it('no counter, no rule or on its own turn: no guerrilla question (S15, S45)', () => {});
it('the question names the opponent\'s card, held and pool', () => { /* pending toMatchObject({ kind:'guerrilla', mode:'spend', card:'attackC', held:1, pool:5 }) */ });
it('declining keeps the counter and the card is carried out', () => {});
it('a sabre: the counter goes to the pool and the card stands (S18)', () => {
  // forceDice(['sabre']): event what 'stood', held 0, pool 6, orders proceed
});
it('no sabre: the card is discarded, nothing is ordered, one card is drawn and the turn ends (S19)', () => {
  // forceDice(['infantry']): no 'ordered' event; discard holds the card; hand size unchanged after the draw; next pending is the guerrilla side's playCard
});
it('a cancelled Scout draws one card, not two (S19)', () => {});
it('a cancelled Élan still reshuffles; no dice are rolled for it (S19, R53)', () => { /* 'reshuffle' event; no 'elan' decision */ });
it('a cancelled Rally rolls nothing; a cancelled Short Supply moves nothing (S19)', () => {});
it('Counter-Attack next turn copies the cancelled card (S21, R56)', () => { /* lastCard[opponent] === cancelled kind; the guerrilla side's Counter-Attack effective === it */ });
it('the opponent\'s Counter-Attack may itself be cancelled (S21)', () => {});
it('only one attempt per turn (S17)', () => { /* after declining, no second question in that turn */ });
it('a reactive First Strike on the guerrilla side\'s turn is never asked about (S17)', () => {});
it('Scout: may take a counter and draw one card instead of two (S20)', () => { /* yes → held +1, one 'draw' event, no 'scoutKeep' */ });
it('Scout with an empty pool asks nothing and draws normally (S20)', () => { /* counters 6 → scoutKeep asked */ });
it('a Counter-Attack that becomes Scout may take a counter (S20)', () => {});
it('the opponent never gains counters with Scout (S15)', () => {});
it('undo stops at the Guerrilla roll', () => { /* GameDriver: after the roll, undoStep() is null for the card */ });
```

- [ ] **Step 2: Run** `npx vitest run tests/rules/guerrilla.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** `guerrilla.ts` and the two call sites.
- [ ] **Step 4: Run** `npx vitest run tests/rules tests/engine && npm run typecheck && npm test` — Expected: green; base battles unchanged (no guerrilla rule there).
- [ ] **Step 5: Commit**

```bash
git add src/engine/guerrilla.ts src/engine/phases.ts src/engine/flow.ts src/engine/index.ts tests/rules/guerrilla.test.ts
git commit -m "feat(engine): Spanish Guerrilla Action

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: New objective kinds

**Model:** Sonnet. **Lane:** `p7c-5`. **Starts:** Task 2 merged.

**Files:**
- Modify: `src/engine/objectives.ts` (`turnStartObjectives`, `updateHeld`, `exitAllowedFrom`, `exitPiece`, `scoreKill`), `src/engine/banners.ts` (`bannerTotal` counts held `tempAny` and `majority`)
- Create: `tests/rules/exp1-objectives.test.ts`

**Interfaces:**
- `tempAny` (115, S35): at its side's turn start, the side's units on any of its hexes become `holders` and it is held; it is lost the instant no holder stands on one of its hexes. A unit entering mid-turn is not a holder.
- `majority` (114, 117, S36): held at its side's turn start when the side has more of its hexes than the enemy (units only, R65); lost the instant that count is no longer greater, on either turn. One record per side per group, so the two sides' records never hold together.
- `exitEdge` (102, S31): `exitAllowedFrom` true for a piece of its side on any hex of `row`; `exitPiece` counts exited units in `objState.count`; the unit after the first `free` scores `banners` permanent banners; leaders exit for nothing and are not counted; retreats never exit (R67).
- `suddenDeath` (105, S32): `scoreKill` counts eliminated enemy units of `keys`; when the count reaches `need` and no one has won, the objective's side wins at once (`winReason = text`, `victory` event). The ordinary kill banner is scored first (R64).

- [ ] **Step 1: Write the failing tests** (header `// Rules: RR §15.8, §16.2, §16.5, §16.13–§16.15, §16.17 (design/rules-reference.md)`)

```ts
it('tempAny: a unit on either hex at turn start holds it; one banner whatever the count (S35)', () => {});
it('tempAny: lost when the last holder leaves, even if a non-holder stands on the other hex (S35)', () => {});
it('majority: held at own turn start with more hexes; one against none counts (S36)', () => {});
it('majority: lost at once when the enemy ties, on the enemy\'s turn; the enemy takes it only at its own turn start (S36)', () => {});
it('majority: a lone leader counts for nothing (R65)', () => {});
it('majority startHeld: the start banner is the group banner, lost like any other (S36)', () => {});
it('exitEdge: any baseline hex; the first three units score nothing, the fourth scores 1 (S31)', () => {});
it('exitEdge: a leader exits for nothing and is not counted; a retreat never carries a unit off (S31, R67)', () => {});
it('exitEdge: stepping off costs a hex; a unit stopped on the baseline by terrain cannot exit (S31)', () => {});
it('suddenDeath: the third gun lost ends the battle at once, even by a failed retreat on the other side\'s turn (S32)', () => {});
it('suddenDeath: a banner win in an earlier event stands (S32)', () => {});
```

- [ ] **Step 2: Run** `npx vitest run tests/rules/exp1-objectives.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.** `heldCount` and `bannerTotal` treat `tempAny` and `majority` like `tempHex`.
- [ ] **Step 4: Run** `npx vitest run tests/rules tests/engine && npm run typecheck && npm test` — Expected: green.
- [ ] **Step 5: Commit** `feat(engine): held-any, majority, edge-exit and sudden-death objectives` (paths: the two engine files and the test).

---

### Task 6: Lancers' flag re-roll

**Model:** Sonnet. **Lane:** `p7c-2`. **Starts:** Task 3 merged.

**Files:**
- Modify: `src/engine/dice.ts` (helper), `src/engine/reactions.ts` (`attackerStrike`, `firstStrikeRoll`), `src/engine/leaders.ts` (melee against a lone leader)
- Create: `tests/rules/lancers.test.ts`

**Interfaces:**
- Produces (`dice.ts`): `flagRerollApplies(s: GameState, by: Unit, target: Unit | Leader, role: StrikeRole): boolean` — `statsOf(by).rerollsFlags` and role `attack`, `bonus` or `firstStrike`, and not a unit target whose row has `immuneToFlagReroll`.
- After the first roll, every die showing a flag (the melee unit's and any Combined Arms gun's) is re-rolled once (`rollDice`); the re-roll is scored by the same rule and emitted as a second `roll` event with `reroll: true` and the same purpose; hits and flags add to the first roll's (S12). A re-rolled sabre kills a lone leader.

- [ ] **Step 1: Write the failing tests** (header `// Rules: RR §15.4 (design/rules-reference.md)`)

```ts
it('an attacking lancer re-rolls its flags once; new flags add to the first (S12)', () => {
  // forceDice([...n('flag',2), 'infantry', 'cavalry', /* re-roll */ 'flag', 'sabre']): flags 3, hits counted from both rolls; two roll events, the second reroll: true
});
it('no re-roll against a cuirassier (SP/CU, FR/CU) (S12)', () => {});
it('no re-roll in a battle back; a defending lancer re-rolls only with First Strike (S12)', () => {});
it('the re-roll covers the guns of a Combined Arms roll it leads (S12)', () => {});
it('against a square: its single die is re-rolled on a flag (S12)', () => {});
it('against a lone leader: a re-rolled sabre kills him; no re-roll in an escape roll (S12)', () => {});
it('re-rolled flags are not re-rolled again', () => {});
```

- [ ] **Step 2: Run** `npx vitest run tests/rules/lancers.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run tests/rules tests/engine && npm run typecheck && npm test` — Expected: green.
- [ ] **Step 5: Commit** `feat(engine): lancers re-roll flags in their own melee`.

---

### Task 7: Square and First Strike limits (106, 115)

**Model:** Sonnet. **Lane:** `p7c-2`. **Starts:** Tasks 2 and 6 merged.

**Files:**
- Modify: `src/engine/reactions.ts` (`defendOptions`)
- Create: `tests/rules/exp1-squares.test.ts`

**Interfaces:**
- Consumes: `squareCapReached`, `follyActive` (Task 2).
- `defendOptions` drops `formSquare` when `squareCapReached(s, target)` (S34), and drops `formSquare` and `firstStrike` when `follyActive(s, target.side)` (S37).

- [ ] **Step 1: Write the failing tests** (header `// Rules: RR §15.8, §16.6, §16.15 (design/rules-reference.md)`)

```ts
it('106: two different units may form square over the battle; a third never may (S34)', () => {});
it('106: either of the two may form square again after leaving it (S34)', () => {});
it('106: the other square limits still apply (R26)', () => {});
it('115: on the enemy\'s Cavalry Charge turn the folly side may not form square or play First Strike (S37)', () => {});
it('115: a Counter-Attack copying Cavalry Charge brings the folly too (S37)', () => {});
it('115: a Cavalry Charge that a guerrilla counter failed to cancel (sabre) still brings the folly (S37)', () => {
  // set turn.guerrilla = 'stood' on the built state: Task 4 need not have merged
});
it('115: on other turns, and against the folly side\'s own Cavalry Charge, squares and First Strike are offered as usual', () => {});
```

- [ ] **Step 2: Run** `npx vitest run tests/rules/exp1-squares.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** the two filters in `defendOptions`.
- [ ] **Step 4: Run** `npx vitest run tests/rules && npm run typecheck && npm test` — Expected: green.
- [ ] **Step 5: Commit** `feat(engine): square cap and Stewart's Folly as side rules`.

---

### Task 8: Swiss break (101) and shrinking hand (106)

**Model:** Sonnet. **Lane:** `p7c-5`. **Starts:** Tasks 3 and 5 merged.

**Files:**
- Modify: `src/engine/casualties.ts` (`removeUnit`, `breakAfterLoss`), `src/engine/banners.ts` (`gainBanner`), `src/engine/scenarioRules.ts` (`shrinkHand`)
- Create: `tests/rules/exp1-side-rules.test.ts`

**Interfaces:**
- Consumes: `breakRule`, `handShrinkRule` (Task 2). Layering: `scenarioRules` sits below `objectives` and `casualties`, so the Swiss hook (which needs `releaseSquare` and `updateHeld`) lives in `casualties.ts`; the hand hook needs only `rng` and lives in `scenarioRules.ts`.
- Produces:
  - `breakAfterLoss(s, ctx, side: Side): void` (`casualties.ts`) — called by `removeUnit` after `scoreKill` when no one has won: if `start` minus the side's units of `keys` still on the board reaches `losses`, every remaining unit of `keys` of that side is removed: `releaseSquare`, `removed` event with reason `'broken'`, no banner, no leader check; an attached leader stays as a lone leader; then `updateHeld` (S30).
  - `shrinkHand(s, ctx, loser: Side, n: number): void` (`scenarioRules.ts`) — called by `gainBanner` for the other side's gain: `n` times, while `special.handSize[loser] > floor`, `handSize −1` and one random held card (`randInt(s, hand.length)`) goes to the discard with a `discarded` event; nothing when the hand is empty (S33, S46).

- [ ] **Step 1: Write the failing tests** (header `// Rules: RR §15.8, §16.1, §16.6 (design/rules-reference.md)`)

```ts
it('101: the second FR/SWI lost removes the others at once, for no banner (S30)', () => { /* 4 FR/SWI: banners to the enemy 2, not 4; 'removed' reason broken ×2 */ });
it('101: a removed unit in square returns its card; its attached leader stays alone (S30)', () => {});
it('101: the second loss by a battle back on the enemy turn removes them mid-turn; the melee goes on cleanly', () => {});
it('101: a victory reached by the second elimination is decided before the removal (S30, R64)', () => {});
it('101: the other side\'s Swiss have no such rule', () => {});
it('106: each enemy banner costs one random held card until the hand size is 3 (S33)', () => {
  // handSize 6 → after 3 banners 3 and 3 'discarded' events; a 4th banner discards nothing
});
it('106: two banners in one event cost two cards (S33)', () => {});
it('106: square-track cards are never taken; the normal draw keeps the reduced size (S33)', () => {});
it('106: a hand that falls to 1 with two squares only stops new squares (S33, R26)', () => {});
it('106: the random card is seeded: the same seed takes the same card', () => {});
```

- [ ] **Step 2: Run** `npx vitest run tests/rules/exp1-side-rules.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** the two hooks and their call sites.
- [ ] **Step 4: Run** `npx vitest run tests/rules tests/engine && npm run typecheck && npm test` — Expected: green.
- [ ] **Step 5: Commit** `feat(engine): Swiss break and the shrinking hand as side rules`.

---

### Task 9: Move First by revealed cards (116)

**Model:** Sonnet. **Lane:** `p7c-4`. **Starts:** Task 4 merged.

**Files:**
- Create: `src/engine/moveFirst.ts` (layer: after `phases`, before `flow`), `tests/rules/move-first.test.ts`
- Modify: `src/engine/flow.ts` (`gameFlow` runs the step once before turn 1), `src/engine/decisions.ts` (`playCard` must be the committed card on that side's first turn), `src/engine/driver.ts` (undo barrier at the `moveFirst` event, like `scoutAt`), `src/engine/index.ts` (append)

**Interfaces:**
- Produces (`moveFirst.ts`):
  - `MOVE_FIRST_VALUE: Readonly<Partial<Record<CardKind, number | 'command'>>>` — scout* 1, probe* 2, attack* 3, reconInForce 3, coordinatedAdvance 4, flankAttack 4, forward 6, assault* `'command'`, bayonetCharge / bombard / cavalryCharge / fireAndHold / grandManoeuvre 4, shortSupply 1, forceMarch 99, coldSteel 99; counterAttack, elan, firstStrike, leadership, rally absent (not eligible) (S38).
  - `moveFirstOptions(s, side): number[]` — the eligible card ids in the hand.
  - `moveFirstValue(s, side, card): number` — `'command'` is the side's hand length at the reveal.
  - `function* moveFirstStep(s, ctx): Gen` — asks `moveFirst` of top, then bottom (a side with no option is not asked and picks `null`, value 100, S43); lower value moves first, a tie to `s.first`; sets `s.first`, `s.active`, `special.moveFirst = { done: true, picks, committed: picks }`; emits `moveFirst`. The committed card stays in hand (Command and the two-card square limit count it; `formSquare` already skips it, Task 2).
- `answerError` for `playCard`: while `special.moveFirst?.committed[side]` is set and `special.turnsDone[side] === 0`, only that card is legal. The record is never cleared; every reader checks `turnsDone[side] === 0`.

- [ ] **Step 1: Write the failing tests** (header `// Rules: RR §15.8, §16.16 (design/rules-reference.md)`)

```ts
it('both sides are asked before turn 1, top first; excluded cards are not options (S38)', () => {});
it('the lower printed value moves first; a tie goes to the tie side (S38)', () => { /* Scout vs Probe → Scout's side; Attack vs Recon in Force → tie → top */ });
it('Assault counts the picker\'s Command; Force March and Cold Steel count above every number (S38)', () => {});
it('each side must play its revealed card on its first turn (S38)', () => { /* another card → answerError; the committed card → ok */ });
it('the second player\'s committed card counts for Command and is never taken for a square (S38)', () => {});
it('a side with no eligible card picks nothing and moves second (S43)', () => {});
it('the moveFirst event shows both picks only after both are made (S44)', () => { /* no moveFirst event while the bottom pick is pending */ });
it('undo cannot cross the reveal (S44)', () => { /* after the event, undoStep() never reaches a moveFirst answer */ });
it('without the rule the battle starts as before', () => {});
```

- [ ] **Step 2: Run** `npx vitest run tests/rules/move-first.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** `moveFirst.ts`, the `gameFlow` call, the `playCard` check and the undo barrier.
- [ ] **Step 4: Run** `npx vitest run tests/rules tests/engine && npm run typecheck && npm test` — Expected: green.
- [ ] **Step 5: Commit** `feat(engine): Vitoria's opening by revealed cards`.

---

### Task 10: Briefing texts 101–118

**Model:** Sonnet. **Lane:** `p7c-1`. **Starts:** Task 1 merged.

**Files:**
- Modify: `src/scenarios/texts.ts` (18 entries), `tests/scenarios/texts.test.ts`

**Interfaces:**
- Produces `TEXTS['101'…'118']`: a blurb of 30–80 words (original; facts only from the battle's history in `src/history/battles/1NN.ts`, no new research), a hint of at most 70 characters, and `specialText` exactly as below. Army words follow the Task 11 META.

| id | specialText (fixed copy) |
|---|---|
| 101 | `The Rumblar is fordable everywhere.` · `Guerrilla Action: the Spanish start with no counters.` · `Swiss infantry has 5 blocks, retreats 1 hex per flag and fires half its blocks, rounded down, after moving.` · `Once two French Swiss units are destroyed, the other French Swiss leave the field; their removal scores no banners.` |
| 102 | `A Spanish unit may leave the board from the Spanish baseline; from the fourth on, each scores 1 permanent banner. Leaders may leave but score nothing.` · `Guerrilla Action: the Spanish start with no counters.` · `The river is fordable everywhere.` |
| 103 | `The Pico is fordable.` · `Guerrilla Action: the Spanish start with 1 counter.` |
| 104 | `The Trueba is impassable; the Shallow Stream is fordable.` · `Guerrilla Action: the Spanish start with 1 counter.` |
| 105 | `The French win at once when all three Spanish batteries are destroyed.` · `Guerrilla Action: the Spanish start with 1 counter.` |
| 106 | `Each banner the French gain costs the Spanish a random card from their hand, until their hand is down to 3.` · `Only two Spanish units may ever form square in this battle.` · `The Guadiana and the Hortiga are impassable except at the bridge.` · `Guerrilla Action: the Spanish start with 1 counter.` |
| 107 | `The Guadalope is impassable except at the bridge.` · `Guerrilla Action: the Spanish start with 1 counter.` |
| 108 | `The Abbey of Santa Fe counts as a town.` · `Guerrilla Action: the Spanish start with 1 counter.` |
| 109 | `The Portina Brook stops movement but gives no battle penalties; a unit that entered it this turn may not take ground.` · `Spanish and British units share one hand of cards.` · `Guerrilla Action: the Anglo-Spanish start with 1 counter.` |
| 110 | `The stream is fordable.` · `Guerrilla Action: the Spanish start with 1 counter.` |
| 111 | `Guerrilla Action: the Spanish start with 1 counter.` |
| 112 | `Guerrilla Action: the Spanish start with no counters.` |
| 113 | `The bridge gives the French a temporary banner while held at the start of their turn.` · `The Tormes cannot be forded.` · `Guerrilla Action: the Spanish start with no counters.` |
| 114 | `Barrosa Ridge: the side holding more of its 11 hexes at the start of its turn gains a temporary banner, lost the moment it no longer holds more; the Anglo-Spanish start with it.` · `The river cannot be forded.` · `No Guerrilla Action in this battle.` |
| 115 | `Albuera gives the French a temporary banner while a French unit holds either of its hexes from the start of their turn.` · `The river is fordable everywhere; crossing at a ford does not stop movement.` · `Stewart's Folly: on a French Cavalry Charge turn not cancelled by a counter, the Allies may not form square or play First Strike.` · `Guerrilla Action: the Allies start with no counters.` |
| 116 | `Before the battle each side picks the card it will open with; the card ordering fewer units moves first, the Allies on a tie.` · `The Zadorra cannot be forded.` · `No Guerrilla Action in this battle.` |
| 117 | `Each of the three hill groups gives a temporary banner to the side holding more of its hexes at the start of its turn; the Spanish start with all three.` · `The Bidassoa is fordable.` · `Guerrilla Action: the Spanish start with 1 counter.` |
| 118 | `The river cannot be forded.` · `Guerrilla Action: the Anglo-Spanish start with 1 counter.` |

- [ ] **Step 1: Extend the tests**: `every base and Expansion #1 battle has texts` (33 ids); the line counts (101: 4, 102: 3, 103–105: 2, 106: 4, 107–108: 2, 109: 3, 110: 2, 111–112: 1, 113–114: 3, 115: 4, 116–117: 3, 118: 2); the fixed copy above; the spelling and quotation test already covers all entries.
- [ ] **Step 2: Run** `npx vitest run tests/scenarios/texts.test.ts` — Expected: FAIL.
- [ ] **Step 3: Write the 18 entries.**
- [ ] **Step 4: Run** `npx vitest run tests/scenarios && npm run typecheck` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(scenarios): briefing texts for the Spanish battles`.

---

### Task 11: Scenario files 101–118

**Model:** Sonnet. **Lane:** `p7c-3`. **Starts:** Tasks 2 and 3 merged.

**Files:**
- Create: `scripts/scenarios/meta-exp1.ts`, `tests/scenarios/manifest-exp1.ts`, `tests/scenarios/exp1.test.ts`, `src/scenarios/data/101.json` … `118.json` (generated)
- Modify: `scripts/scenarios/meta.ts` (spread `EXP1_META`), `scripts/scenarios/convert.ts` (`BattleMeta` gains `riverRules?: Record<string, RiverRule>`, `moveFirst?: 'reveal'`, `hidden?: boolean`; `metaObjectiveHexes` claims `tempAny` and `majority` hexes; the header no longer says it refuses Expansion #1), `tests/scenarios/generated.test.ts` (101–118 in META; `unsupportedFeatures` empty for every battle), `tests/scenarios/convert.test.ts` (the "refuses Expansion #1 data" test becomes a synthetic unknown-code case; new cases below)

**Interfaces:**
- Produces `EXP1_META: Readonly<Record<string, BattleMeta>>`, every entry with `hidden: true` (from one constant `EXP1_HIDDEN = true`, flipped by Task 17). Top is always the Allied side and holds `guerrilla` where in effect; bottom is `{ army: 'French', nation: 'FR' }`.

| id | top army / nation / commander / cards | bottom commander / cards | first | banners | rivers | objectives, side rules, other |
|---|---|---|---|---|---|---|
| 101 | Spanish / SP / Castaños / 5 | Dupont / 5 | bottom | 7 | fordable | guerrilla 0; `breakOnLosses` bottom `['FR/SWI']` losses 2 |
| 102 | Spanish / SP / Blake / 4 | Lefebvre / 5 | bottom | 6 | fordable | guerrilla 0; `exitEdge` top row 0 free 3 banners 1, text `Spanish {unit} leaves by the Spanish baseline.` |
| 103 | Spanish / SP / Belveder / 5 | Soult / 6 | bottom | 6 | fordable | guerrilla 1 |
| 104 | Spanish / SP / Blake / 5 | Victor / 5 | bottom | 7 | impassable, `riverRules` { `Shallow Stream`: fordable, `Shallow Stream (source)`: fordable } | guerrilla 1 |
| 105 | Spanish / SP / San Juan / 4 | Napoleon / 6 | bottom | 7 | none | guerrilla 1; `suddenDeath` bottom `['SP/FA']`, text `Every Spanish battery is lost.` |
| 106 | Spanish / SP / Cuesta / 6 | Victor / 5 | top | 6 | impassable | guerrilla 1; `handShrink` top floor 3; `squareCap` top 2 |
| 107 | Spanish / SP / Blake / 5 | Suchet / 5 | bottom | 6 | impassable | guerrilla 1 |
| 108 | Spanish / SP / Blake / 5 | Suchet / 5 | top | 6 | none | guerrilla 1 |
| 109 | Anglo-Spanish / SP / Cuesta / 5 | Victor / 5 | bottom | 6 | brook | guerrilla 1 |
| 110 | Spanish / SP / Del Parque / 6 | Marchand / 6 | bottom | 8 | fordable | guerrilla 1 |
| 111 | Spanish / SP / Freire / 5 | Milhaud / 6 | bottom | 7 | none | guerrilla 1 |
| 112 | Spanish / SP / Aréizaga / 4 | Soult / 5 | bottom | 6 | none | guerrilla 0 |
| 113 | Spanish / SP / Del Parque / 4 | Kellermann / 5 | bottom | 6 | impassable | guerrilla 0; `tempHex` bottom (0,6), text `The French hold the Tormes bridge.` |
| 114 | Anglo-Spanish / BR / Graham / 6 | Victor / 5 | bottom | 7 | impassable | `majority` × 2 over (2,3) (3,1) (3,2) (3,3) (4,2) (4,3) (4,4) (5,2) (5,3) (5,4) (6,3): top `startHeld: true`, text `The Anglo-Spanish hold Barrosa Ridge.`; bottom, text `The French hold Barrosa Ridge.` |
| 115 | Allied / BR / Beresford / 5 | Soult / 5 | bottom | 8 | fordable | guerrilla 0; `tempAny` bottom (4,9) (4,10) banners 1, text `The French hold Albuera.`; `cavalryChargeFolly` top |
| 116 | Allied / BR / Wellington / 5 | King Joseph / 4 | top (tie side) | 9 | impassable | `moveFirst: 'reveal'` |
| 117 | Spanish / SP / Freire / 5 | Soult / 5 | bottom | 8 | fordable | guerrilla 1; `majority` × 6: left (1,1) (2,1) (2,2) (3,0) (3,2) (4,0); centre (1,6) (1,7) (2,4) (2,5) (2,6) (2,8) (3,6); right (1,10) (2,11) (3,9) (3,10) (3,11) (4,12); top `startHeld: true` in each; texts `The Spanish hold the left hills.` / `The French hold the left hills.` (centre, right alike) |
| 118 | Anglo-Spanish / BR / Adam / 5 | Suchet / 6 | bottom | 6 | impassable | guerrilla 1 |

- Produces `MANIFEST_EXP1` in the format of `manifest.ts`: name, year, banners, first, sides, leaders in file order, units per side and key (survey §2.1 matrix), terrain tally (`walledFarm` 0 everywhere; works hexes/sides: 105 1/4, 109 2/6, 118 3/9; bridges per data), checksums pinned from the first green run.

- [ ] **Step 1: Write the failing tests**

`tests/scenarios/exp1.test.ts` (header `// Rules: RR §16 (design/rules-reference.md)`; one `describe` per id as `base.test.ts`):

```ts
it('the manifest covers 101–118, and META the same ids', () => {});
// per id:
it('name, year, banners, first, sides and leaders match the manifest', () => {});
it('units per side and key match the survey (manifest)', () => {});
it('terrain tally and checksums match', () => {});
it('is a hidden Expansion #1 battle until the screens are ready', () => { /* expansion 'exp1', hidden true */ });
// once:
it('every unit starts at its card strength (S41)', () => { /* for each unit: blocks === maxBlocks === UNIT_STATS[key].blocks */ });
it('guerrilla counters per battle match S15', () => {
  // 1 in 103–111, 117, 118; 0 in 101, 102, 112, 113, 115; no rule in 114, 116
});
it('104: the Trueba is impassable and the Shallow Stream fordable (S24)', () => {});
it('115: exactly (5,0), (5,1), (5,3), (6,4) are fords that do not stop; the bridge is (5,9) (S42)', () => {});
```

`tests/scenarios/convert.test.ts` additions:

```ts
it('riverRules sets the per-hex rule by art label; an unknown label in riverRules throws', () => {});
it('tempAny and majority hexes are claimed against the map; exitEdge and suddenDeath claim none', () => {});
it('hidden and moveFirst pass through to the file', () => {});
```

- [ ] **Step 2: Run** `npx vitest run tests/scenarios` — Expected: FAIL.
- [ ] **Step 3: Implement** the converter options and `meta-exp1.ts`; generate with `npx vite-node scripts/scenarios/build.ts -- --ids 101,…,118`; pin the checksums. Never hand-edit the output.
- [ ] **Step 4: Run** `npx vite-node scripts/scenarios/build.ts -- --check && npx vitest run tests/scenarios && npm run typecheck && npm test` — Expected: clean and green (UI tests unchanged: the files are hidden).
- [ ] **Step 5: Browser check** (port 5233): for each id open `#/play/<id>/bottom/colonel` (the slug Plan 4 Task 9 sets; `tribune` before it), screenshot the opening board and compare by eye with `/Users/janisstrods/Gamemaking/cnc-napoleonics-research/maps/<id>.jpg` (`104.png` for 104): units, leaders, terrain, rivers and bridges, works sides. One verdict line per battle. A data mismatch goes back to `design/data` with a note in its verify log; a drawing problem is reported (Task 14).
- [ ] **Step 6: Commit**

```bash
git add scripts/scenarios src/scenarios/data tests/scenarios
git commit -m "feat(scenarios): generate the Spanish battles 101-118 (hidden until the screens land)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Spanish battles in their real setups; soak; RR coverage

**Model:** Sonnet. **Lane:** `p7c-3`. **Starts:** Tasks 4–11 merged.

**Files:**
- Create: `tests/scenarios/exp1-rules.test.ts`
- Modify: `tests/scenarios/battles-soak.test.ts` (101–118 random-play cases), `tests/engine/rr-coverage.test.ts` (sections §1–§16 required; `§16` cited bare like `§14`)

- [ ] **Step 1: Write the tests** (header `// Rules: RR §15.7, §16, §16.1–§16.18 (design/rules-reference.md)`; each builds the real setup with `createGame(scenarioById(id).setup, seed)` and drives it with the rules kit)

```ts
it('101: two FR/SWI lost → the other two leave; 2 banners, not 4', () => {});
it('102: a Spanish unit steps off row 0; the fourth exit scores', () => {});
it('103, 107, 110, 111, 112, 118: guerrilla counters at the start as S15', () => {});
it('104: a unit cannot enter the Trueba; it stops in the Shallow Stream', () => {});
it('105: the redoubt (5,3) protects E, SE, SW, W; the third SP/FA lost ends the battle', () => {});
it('106: the Spanish move first; a French banner costs a card; a third unit cannot form square', () => {});
it('108: the abbey is a town; the Spanish move first', () => {});
it('109: the brook stops; both redoubts on plain with their sides; a Spanish leader attaches to a British unit (S27)', () => {});
it('113: a French unit on the bridge at turn start holds 1 banner, lost when it leaves', () => {});
it('114: the Anglo-Spanish start with the Ridge banner; no guerrilla rule', () => {});
it('115: Albuera held from the French turn start; fords do not stop; the folly on Cavalry Charge', () => {});
it('116: both sides pick before turn 1; the opening follows the values', () => {});
it('117: the Spanish start with three group banners (3 of 8)', () => {});
it('118: three hill works with sides SW, SE, E', () => {});
```

`battles-soak.test.ts`: the base random-play cases loop over 101–118 too (same seeds and `CAP`; Guerrilla, Move First and every side rule are exercised by random answers).

- [ ] **Step 2: Run** `npx vitest run tests/scenarios tests/engine/rr-coverage.test.ts` — Expected: PASS. A failure is an engine bug: report it to the owning task's lane, do not patch the engine here.
- [ ] **Step 3: Run** `npm run typecheck && npm test` — Expected: green.
- [ ] **Step 4: Commit** `test(scenarios): Spanish battle rules in their real setups; soak; RR §15-§16 coverage`.

---

### Task 13: Spanish, Swiss and Guard light cavalry figures

**Model:** Opus (implements). **Lane:** `p7c-6`. **Starts:** Task 3 merged.

**Files:**
- Modify: `src/art/nap/keys.ts` (`ART_NATIONS` gains `SP`; key lists gain `SP/LN`, `SP/LT`, `SP/GR`, `SP/ML`, `SP/SWI`, `FR/SWI`, `SP/LC`, `SP/HC`, `SP/CU`, `FR/GLC`, `SP/FA`), `src/art/nap/nations.ts` (`NATION_LOOKS.SP`: a Spanish yellow edge that clears dE 20 against every ground colour, as the PT comment explains), `src/art/nap/specs/{index,cavalry,artillery,leaders}.ts`, `src/art/nap/headgear/**` (only new kinds), `src/dev/FigureGallery.tsx` (SP group)
- Create: `src/art/nap/specs/infantry-sp.ts`, `tests/art/nap/spanish.test.ts`
- Modify (tests): `tests/art/nap/wiring.test.ts` (`PLACEHOLDER_OK = []`; "an SP key keeps the placeholder" and "an SP leader keeps the placeholder" become "SP keys and SP leaders draw the Napoleonic art"), `tests/art/nap/looks.test.ts` (re-pin; say so in the commit)

**Interfaces:**
- Style: the refined Plan 6B look (`.superpowers/sdd/2026-11-17-plan-6b-art/task-refine-report.md`): low visual noise, readable at 0.75 px per unit, data-driven specs (no nation or code tests in drawing code), Plan 6B's frame and token rules unchanged.
- Uniform brief (period knowledge, hedged in spec comments where sources differ): `SP/LN` white coat with coloured facings and bicorne (1808 look); `SP/LT` dark blue coat, round hat; `SP/GR` white coat, tall fur cap; `SP/ML` brown civilian-style coat, round hat; `SP/SWI` dark blue coat, shako; `FR/SWI` red coat, shako; `SP/LC` green or light blue hussar-style; `SP/HC` dark blue coat, bicorne; `SP/CU` cuirass and helmet; `FR/GLC` Guard chasseur green with fur colpack; `SP/FA` dark blue gunners; Spanish general bicorne with red sash.

- [ ] **Step 1: Write the failing tests** (`tests/art/nap/spanish.test.ts`)

```ts
it('every new key renders 1–5 blocks without NaN or stub, both facings', () => {});
it('shapes differ with colours stripped: SP/LN, SP/LT, SP/GR, SP/ML; SP/LC, SP/HC, SP/CU; FR/SWI vs FR/LN; FR/GLC vs FR/LC', () => {});
it('a 5-block unit (SP/LT, SP/SWI, FR/SWI) shows 5 figures and keeps slots as it loses blocks', () => {});
it('the SP edge colour clears dE 20 against every ground colour', () => {});
it('an SP leader is drawn, with the name ribbon fitting "Castaños" and "San Juan"', () => {});
```

- [ ] **Step 2: Run** `npx vitest run tests/art` — Expected: FAIL.
- [ ] **Step 3: Implement** the specs and look.
- [ ] **Step 4: Board-scale check** (port 5236): `#/gallery/figures/single/SP-LN` … for each new key and `#/play/101/bottom/colonel`, `#/play/105/top/colonel`, `#/play/111/bottom/colonel`; screenshot and open each.
- [ ] **Step 5: Run** `npx vitest run tests/art && npm run typecheck && npm test` — Expected: green after re-pinning `looks.test.ts` with the hash it prints.
- [ ] **Step 6: Commit** `feat(art): Spanish, Swiss and Guard light cavalry miniatures (looks hash re-pinned)`.

---

### Task 14: Terrain, counter and objective-marker art

**Model:** Opus (implements). **Lane:** `p7c-6`. **Starts:** Tasks 2, 5 and 13 merged, and **Plan 4 Task 10** merged (it edits `objectives.tsx`).

**Files:**
- Modify: `src/ui/terrain/towns.tsx` (Walled Farm painter), `src/ui/terrain/TerrainIcon.tsx` (its icon), `src/ui/terrain/water.tsx` (only if the river-end, Y-junction and ford hexes of 101, 104, 110 and 115 show a gap or seam), `src/ui/terrain/fieldworks.tsx` (only if a 2- or 4-sided mask draws badly), `src/ui/terrain/objectives.tsx` (markers), `src/ui/kit/icons/napGlyphs.ts` (Guerrilla counter glyph), `src/dev/TerrainGallery.tsx` (Walled Farm, 2/4-sided works, the new markers)
- Create: `tests/ui/exp1-terrain-art.test.ts`

**Interfaces:**
- Produces: `paintWalledFarm` (an enclosure wall with a farmhouse, clearly unlike a town block cluster); the glyph `guerrilla` in `NAP_GLYPHS` (original: a broad-brimmed hat over a crossed knife and musket); `ObjectiveMarkers` draws `exitEdge` as a band along its row with an arrow off the board, `majority` as a dotted outline round the group tinted by the holder (none, top, bottom), `tempAny` like `tempGroup`, and nothing on the board for `suddenDeath` (its text is in the panel, Task 16). Markers keep Plan 4 Task 10's `<title>` = objective `text`.

- [ ] **Step 1: Write the failing tests**

```ts
it('walledFarm paints its own art, not the town\'s', () => {});
it('2- and 4-sided works draw exactly their sides', () => { /* masks SW|SE and E|SE|SW|W: one wall element per side */ });
it('majority outlines change tint with the holder; exitEdge draws a band on its row', () => {});
it('the guerrilla glyph renders at 16 and 32 px with a <title>', () => {});
```

- [ ] **Step 2: Run** `npx vitest run tests/ui/exp1-terrain-art.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Board-scale check** (port 5236): 101 (river end, Y junction), 102 (exit band), 105 (4-sided redoubt), 114 and 117 (ridge outlines, start tint), 115 (fords, Albuera), 118 (hill works), and the terrain gallery. Screenshot and open each; muted origin.
- [ ] **Step 5: Run** `npx vitest run tests/ui && npm run typecheck && npm test` — Expected: green (re-pin any terrain hash test it changes, saying so).
- [ ] **Step 6: Commit** `feat(art): Walled Farm, Guerrilla counter and Spanish objective markers`.

---

### Task 15: Guerrilla and Move First on screen

**Model:** Sonnet. **Lane:** `p7c-7`. **Starts:** Tasks 4, 9 and 14 merged, and **Plan 4 Task 10** merged.

**Files:**
- Modify: `src/ui/game/promptSpec.ts`, `src/ui/game/prompts.tsx`, `src/ui/game/uiModel.ts`, `src/ui/game/GameScreen.tsx`, `src/ui/game/panels.tsx`, `src/ui/game/game.css`
- Create: `tests/ui/exp1-prompts.test.ts`

**Interfaces:**
- Consumes: `guerrillaHeld`, `guerrillaPool`, `guerrillaSide`, `moveFirstOptions`, `moveFirstValue` (engine index), the `guerrilla` glyph (Task 14).
- Produces:
  - `promptSpec` for `guerrilla` / `spend`: title `Guerrilla Action`, text names the opponent's card and the odds (`It fails only on a sabre: 1 chance in 6.`), buttons `Spend a counter` (yes) and `Keep it` (no); for `scout`: title `Guerrilla Action: Scout`, buttons `Take a counter (draw 1 card)` and `Draw 2, keep 1`; then "Let the general decide".
  - `moveFirst`: the hand chooser used for `playCard`, with only `options` clickable; title `Choose your opening card`; text `The card ordering fewer units moves first; the Allies win a tie.` (army words from the state); the AI's pick is never shown before the `moveFirst` event; after it, both picks and values appear in the log line (Task 16) and the second player's committed card sits face up beside its hand while that side has not finished a turn (`special.turnsDone[side] === 0`).
  - Side panel: the guerrilla side shows its counters with the glyph and `n held · p in the pool`; a `handShrink` side shows `Hand size n (falls with each banner lost, to 3)`.

- [ ] **Step 1: Write the failing tests**

```ts
it('guerrilla spend prompt: title, card named, odds, two answers legal, then the general', () => {});
it('guerrilla scout prompt: two answers legal', () => {});
it('moveFirst marks only eligible cards; every action legal', () => {});
it('the opponent\'s pick is not in the DOM, a title or an aria-label before the reveal', () => {});
it('the committed card shows face up beside the second player\'s hand until its first turn ends', () => {});
it('the counter panel shows held and pool and changes after a gained event', () => {});
it('the 106 hand-size line falls after a French banner', () => {});
```

- [ ] **Step 2: Run** `npx vitest run tests/ui/exp1-prompts.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run tests/ui && npm run typecheck` — Expected: green. Browser (port 5237, muted): 103 as the Spanish (spend a counter, see the roll; win and lose one by `?cards=`), a Spanish Scout taking a counter, 116 from both sides (pick, reveal, forced first card), 106 hand-size line.
- [ ] **Step 5: Commit** `feat(ui): Guerrilla Action and Vitoria's opening on screen`.

---

### Task 16: Log, tooltips and objective text

**Model:** Sonnet. **Lane:** `p7c-8`. **Starts:** Tasks 5, 6, 8 and 14 merged, and **Plan 4 Task 10** merged.

**Files:**
- Modify: `src/ui/game/logText.ts`, `src/ui/game/unitText.ts`, `src/ui/game/objectiveText.ts`
- Create: `tests/ui/exp1-text.test.ts`

**Interfaces:**
- Produces:
  - Log lines (exact): guerrilla `stood` — `The guerrillas strike, but the ${army(opp)} card stands (sabre).`; `cancelled` — `Guerrillas cut the ${army(opp)} orders: the card is lost.`; `gained` — `The ${army(side)} army gains a Guerrilla counter (${held} held).`; `moveFirst` — `Opening cards: ${top title} (${v}) against ${bottom title} (${v}); the ${army(first)} army moves first.` (a side with no pick reads `no card`); `removed` reason `broken` — `${name} leaves the field.`; a `roll` with `reroll` gets the title suffix ` — flags re-rolled`; roll purpose `guerrilla` title `Guerrilla Action` and summary `Sabre: the card stands` / `No sabre: the card is lost`.
  - `unitText` lines for the new row fields: moving penalty (`After moving: fire half its blocks, rounded down, less 1; melee 1 die less.` as each row's numbers say), retreat distance (`Retreats 2 hexes per flag.` / 3), `Re-rolls flags once when it attacks (not against cuirassiers).`, `Lancers do not re-roll flags against it.`
  - `objectiveText` for `tempAny`, `majority` (holder named or `held by no one`), `exitEdge` (`n of 3 free exits used` then banners), `suddenDeath` (`${need − count} batteries left before the French win`, words from the objective's text and the state).

- [ ] **Step 1: Write the failing tests** — one per line kind above, each comparing the exact string for a crafted event or state; plus `no log line names a raw unit id for the new events`.
- [ ] **Step 2: Run** `npx vitest run tests/ui/exp1-text.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run tests/ui && npm run typecheck` — Expected: green. Browser (port 5238): hover an SP/LN, SP/ML, SP/CU, FR/LNC; read the log through a lancer melee on 112 and the Swiss break on 101.
- [ ] **Step 5: Commit** `feat(ui): log, tooltips and objective text for the Spanish rules`.

---

### Task 17: Rules tab, picker and Triumphs for 101–118

**Model:** Sonnet. **Lane:** `p7c-8`. **Starts:** Tasks 11, 12, 15 and 16 merged, and **Plan 4 Task 9** merged.

**Files:**
- Modify: `src/ui/screens/rulesText.ts` (`RULES_TEXT.exp1`), `src/ui/screens/RulesReference.tsx` (the Expansion #1 tab: unit cards of every `exp1` row grouped Spanish, Swiss, French; the Walled Farm in the Terrain tab's text), `scripts/scenarios/meta-exp1.ts` (`EXP1_HIDDEN = false`, then regenerate 101–118), `tests/ui/{clean-slate,screens,rules-reference,ranks,random-battle}.test.ts` (counts now include 18 Spanish battles), `tests/scenarios/exp1.test.ts` ("hidden until the screens are ready" becomes "visible")
- Create: `tests/ui/exp1-screens.test.ts`

**Interfaces:**
- `RULES_TEXT.exp1` blocks, written from RR §15 in our own words (a comment names the RR section of each): Spanish units, moving penalties, retreats of 2 and 3, Swiss, lancers and Guard light cavalry, Guerrilla Action, terrain and water, mixed armies, the new objective kinds. `reading` notes (`Our reading: …`, never a raw `[Interp` mark) for S7 (a 0-die moved unit may still melee with a card die), S8 (battle back uses standing dice), S16 (the counters belong to the whole Allied side), S20 (counters are capped at the six in the box), S30 (a removed Swiss unit's leader stays), S33 (square-track cards count in the 106 hand size), S34 (two units over the whole battle), S36 (a majority banner is lost at once, taken only at one's own turn start), S38 and S43 (the 116 card values; a side with no eligible card moves second).

- [ ] **Step 1: Write the failing tests** (`tests/ui/exp1-screens.test.ts`)

```ts
it('the Spanish tab of the picker lists 101–118 in order with their briefings', () => {});
it('random battle may land on a Spanish battle', () => {});
it('Triumphs lists all 33 battles and none is "Not yet available"; the tally counts 33 battles', () => {});
it('the Expansion #1 rules tab shows every exp1 row once and the readings as plain notes', () => {});
it('the Terrain tab has the Walled Farm row with its icon', () => {});
```

- [ ] **Step 2: Run** `npx vitest run tests/ui/exp1-screens.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement**, flip the hidden flag, regenerate (`npx vite-node scripts/scenarios/build.ts -- --ids 101,…,118`), update the counted UI tests.
- [ ] **Step 4: Run** `npx vite-node scripts/scenarios/build.ts -- --check && npx vitest run && npm run typecheck` — Expected: clean, green. Browser (port 5238): picker tab, three briefings, random battle, Triumphs dialog, the rules tab from the menu and in battle.
- [ ] **Step 5: Commit** `feat(ui): the Spanish battles in the picker, Triumphs and the rules dialog`.

---

### Task 18: AI values and Spanish-war temperaments

**Model:** Sonnet. **Lane:** `p7c-9`. **Starts:** Task 3 merged and **Plan 5 Task 9** merged.

**Files:**
- Modify: `src/ai/values.ts` (constants appended; `rawPower` reads `movedPlus`, `rerollsFlags`, `immuneToFlagReroll`), `src/ai/personality.ts` (`PERSONALITIES`, `BY_NAME`; `NATION_DEFAULT.SP` becomes the Spanish default)
- Create: `tests/ai/exp1-values.test.ts`

**Interfaces:**
- Produces in `values.ts`: `MOVED_MELEE_DIE = 0.5` (dice lost per −1 `movedPlus`, weighted by how often the row melees after moving), the moving-fire term already follows `baseFireDice`; `REROLL_DIE = 0.25` (dice of value for `rerollsFlags`); `REROLL_IMMUNE_DIE = 0.1`.
- Produces in `personality.ts` (ids, names, one-line temperament, the four weights in the existing order, voice, the existing last number): Spanish commanders `castanos` (cautious, holds ground), `blake` (brave but rash in manoeuvre), `cuesta` (obstinate, attacks headlong), `belveder` (inexperienced), `san_juan` (stubborn in defence), `del_parque` (steady), `freire` (cavalryman), `areizaga` (reckless); British `graham` (bold); French `dupont`, `lefebvre`, `victor`, `suchet` (methodical, the best of the Spanish war), `kellermann` (cavalry), `milhaud` (cavalry), `marchand`, `joseph` (hesitant); `BY_NAME` matches each (accent-insensitive: `Castaños`, `Aréizaga`); `NATION_DEFAULT.SP = 'del_parque'`. The voice lines of Plan 5 Task 9's `voice.ts` need no change (voices are shared).

- [ ] **Step 1: Write the failing tests**

```ts
it('values rank SP/ML < SP/LN < FR/LN < SP/GR at full strength', () => {});
it('FR/LNC is worth more than FR/LC; FR/GLC more than FR/LC', () => {});
it('a 5-block SP/LT is worth more than a 4-block SP/LN; Swiss more than SP/LN', () => {});
it('every exp1 row has a finite positive value at every block count', () => {});
it('each 101–118 commander maps to his own temperament; an unknown Spanish name gets the Spanish default', () => {});
```

- [ ] **Step 2: Run** `npx vitest run tests/ai/exp1-values.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** the value terms and the temperaments.
- [ ] **Step 4: Run** `npx vitest run tests/ai && npm run typecheck` — Expected: green; Plan 5's value and personality tests still pass.
- [ ] **Step 5: Commit** `feat(ai): values of the Spanish rows; Spanish-war temperaments`.

---

### Task 19: AI Guerrilla and Move First sense

**Model:** Opus (implements). **Lane:** `p7c-10`. **Starts:** Tasks 4 and 9 merged and **Plan 5 Task 9** merged.

**Files:**
- Modify: `src/ai/cardsense.ts`, `src/ai/policies.ts` (`guerrilla` and `moveFirst` cases replace the `safeAnswer` entries), `src/ai/view.ts` (redaction)
- Create: `tests/ai/exp1-cards.test.ts`

**Interfaces:**
- Consumes: Plan 5's `policyFor`, `PolicyCtx`, `keepValue`, `quickCardScore`, `blindClone`, `determinize`; engine `guerrillaHeld`, `guerrillaPool`, `moveFirstOptions`, `moveFirstValue`.
- Produces (`cardsense.ts`):
  - `COUNTER_VALUE = 0.3` (banners) and `counterValue(s, me): number` (`COUNTER_VALUE`, ×1.5 for the last counter held).
  - `guerrillaSpend(s, me, card: CardKind, W): boolean` — spend when `(5/6) × opponentTurnValue(card) ≥ counterValue`, where `opponentTurnValue` is the opponent's expected gain from playing that card now (Plan 5's quick card score from the opponent's side on a `blindClone`).
  - `guerrillaScoutTake(s, me, W): boolean` — take a counter when held < 2, else when `counterValue` ≥ the Scout's keep-one gain.
  - `moveFirstPick(s, me, options, W): number` — the option with the highest opening value (`quickCardScore` for turn 1), ties to the lower `moveFirstValue`.
- Produces (`view.ts`): `blindClone` and `determinize` clear the opponent's unrevealed pick (`special.moveFirst.picks[opp]` while `!done`); a committed card is public and stays.

- [ ] **Step 1: Write the failing tests**

```ts
it('spends a counter against a card that orders a winning melee; keeps it against a Scout', () => {});
it('takes a counter with a Scout when holding none; may decline when holding three', () => {});
it('the moveFirst pick is legal, eligible and the same with any opponent pick in the state', () => {
  // two states differing only in special.moveFirst.picks[opp] give the same answer
});
it('every answer for both kinds passes answerError', () => {});
// tests/ai/hidden-scan.test.ts gains: no AI file but view.ts names `moveFirst.picks`
```

- [ ] **Step 2: Run** `npx vitest run tests/ai/exp1-cards.test.ts tests/ai/hidden-scan.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** the three helpers, the two policy cases and the redaction.
- [ ] **Step 4: Run** `npx vitest run tests/ai && npm run typecheck` — Expected: green.
- [ ] **Step 5: Commit** `feat(ai): Guerrilla counters and Vitoria's opening card`.

---

### Task 20: AI objectives and battle rules

**Model:** Opus (implements). **Lane:** `p7c-11`. **Starts:** Tasks 5 and 8 merged and **Plan 5 Task 9** merged.

**Files:**
- Modify: `src/ai/evaluate.ts` (objective pulls and held-objective threat for the new kinds), `src/ai/ordering.ts` (`wants` for the new kinds), `src/ai/estimate.ts` (banner value of an elimination that triggers `suddenDeath` or `breakOnLosses`)
- Create: `tests/ai/exp1-objectives.test.ts`

**Interfaces:**
- `tempAny` is pulled like `tempGroup` with any one hex enough; `majority` pulls toward the group while the side's count does not exceed the enemy's, and weighs the threat of a tie to a held group; `exitEdge` pulls units on its side's row off the board once the free exits are used or the unit is at risk; `suddenDeath` makes the last enemy units of `keys` worth the win (and the victim side guards them); `breakOnLosses` makes the eliminations up to `losses` worth the removed units as well (the banners do not change, the enemy strength does); `handShrink` costs the loser one `CARD_VALUE` per banner while above the floor.

- [ ] **Step 1: Write the failing tests**

```ts
it('105: the French value the last Spanish gun as the win; the Spanish keep their last gun out of reach', () => {});
it('114: a unit moves onto the ridge to break a tie; an empty ridge hex next to the enemy draws a defender', () => {});
it('102: a Spanish unit on the baseline exits once three have gone, not before unless in danger', () => {});
it('115: the French move onto Albuera before their turn ends to hold it next turn', () => {});
it('101: the second Swiss loss is worth more to the Spanish than the first', () => {});
```

- [ ] **Step 2: Run** `npx vitest run tests/ai/exp1-objectives.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** the pulls and banner values.
- [ ] **Step 4: Run** `npx vitest run tests/ai && npm run typecheck` — Expected: green; the evaluation speed test stays under its limit.
- [ ] **Step 5: Commit** `feat(ai): pulls for the Spanish objectives and battle rules`.

---

### Task 21: Acceptance and docs

**Model:** Sonnet. **Lane:** `p7c-12`. **Starts:** Tasks 1–20 merged, **Plan 4 Task 11** and **Plan 5 Task 10** merged.

**Files:**
- Create: `tests/ai/battles-exp1.slow.test.ts`, `tests/ui/full-games-exp1.slow.test.ts`
- Modify: `CLAUDE.md`, `design/ai-balance.md` (a Spanish section)

- [ ] **Step 1: Write the tests**

```ts
// tests/ai/battles-exp1.slow.test.ts (Plan 5's battles-a/b pattern)
it.each(EXP1_IDS)('%s: every battle sets up and AI against AI ends with a winner, no fallback, no console error', (id) => {
  // createGame(scenarioById(id).setup, 1); both sides chooseAnswer with { difficulty: 'captain', budgetScale: 0.05, deterministic: true };
  // ends (winner set) within the soak cap; mem.fallbacks === 0 on both sides; console.error spy not called
});
it.each(['101', '106', '115', '116'])('%s: the same seed gives the same event stream twice', (id) => {
  // two runs, identical JSON of events and final state
});
it('replaying the saved answers of an AI game of 116 reproduces it', () => { /* GameDriver.replay(initial, answers) equals the live final state */ });

// tests/ui/full-games-exp1.slow.test.ts (Plan 4 Task 11's harness)
it.each(['101', '106', '116'])('%s: the general plays the human side to the end through the controller', () => {
  // as Plan 4 Task 11: every human decision has a promptSpec with legal actions; the game ends; no log line equals an event kind
});
```

- [ ] **Step 2: Run** `npx vitest run tests/ai/battles-exp1.slow.test.ts tests/ui/full-games-exp1.slow.test.ts` — Expected: PASS within 120 s; a longer run is reported, not hidden by raising budgets. A stall or fallback is an engine or AI bug: report it with the seed.
- [ ] **Step 3: Balance runs.** Two games per battle with `scripts/ai-match.ts` (flags as its header documents, Plan 5 Task 10), colonel against colonel, each side once. Append a table to `design/ai-balance.md` (battle, winner per game, turns, banners). No tuning here: a battle one side wins 4 of 4, or any game over the turn cap, is listed as a follow-up for the controller.
- [ ] **Step 4: Browser walkthrough** (port 5242, muted), one line per flow: Guerrilla spend won and lost, Guerrilla Scout, Swiss break (101), edge exit (102), sudden death (105), hand shrink and square cap (106), brook and works (109), bridge objective (113), ridge banner changing hands (114), Albuera, fords and the folly (115), the 116 opening, three hill groups (117); a medal on a Spanish battle.
- [ ] **Step 5: Update `CLAUDE.md`**: Status (battles 001–015 and 101–118 playable); engine layering adds `guerrilla` (after `tactics`) and `moveFirst` (after `phases`); scenario format adds `river` per hex, `moveFirst`, the objective kinds `tempAny` / `majority` / `exitEdge` / `suddenDeath` and side rules `guerrilla` / `breakOnLosses` / `handShrink` / `squareCap` / `cavalryChargeFolly`; `scripts/scenarios/meta-exp1.ts`; RR §15–§16; art notes (SP is an art nation); the test count and time from this run.
- [ ] **Step 6: Run** `npx vite-node scripts/scenarios/build.ts -- --check && npm run typecheck && npm test && npm run build` — Expected: clean, green, built.
- [ ] **Step 7: Commit**

```bash
git add tests/ai/battles-exp1.slow.test.ts tests/ui/full-games-exp1.slow.test.ts CLAUDE.md design/ai-balance.md
git commit -m "test: the Spanish battles play to the end; docs for Expansion #1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
