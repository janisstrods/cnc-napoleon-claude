# C&C: Napoleonics — Plan 2B: Engine Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the copied Ancients engine with the Commands & Colours: Napoleonics base-game engine (RR §1–§14), keeping the AI, UI and art compiling and the game playable throughout, so that Plan 3B can load battles 001–015 and Plan 4/5 can build the real UI and AI on the new contract.

**Architecture:** One contract swap (T1c, five sub-tasks on one branch, squash-merged green) replaces the type contract, the unit, terrain and card tables, the scenario format and `000.json`, and leaves a *skeleton* engine that plays `000` to a finish. The skeleton places every cross-module **hook** (a named function with a stub body) so that each later rules task fills hooks inside files it alone owns. The AI becomes a seeded random stub, the UI gains generic fallbacks for any decision, and the art draws placeholder figures by arm. Rules tasks then run test-first from the RR in parallel waves; the melee chain (T6a → T6b → T7/T8 → T9 → T10 → T12c) is serial because those tasks share `melee.ts`.

**Tech Stack:** TypeScript 5.6, Vite 5, React 18, Vitest 2.

**Spec:** `design/superpowers/specs/2026-11-17-cnc-napoleonics-design.md`. **Rules (authoritative):** `design/rules-reference.md` (RR §1–§15) and `design/rulings.md` (R1–R86), both written on the `t4` worktree and merged to `main` at Gate G0. Background: `/Users/janisstrods/Gamemaking/cnc-napoleonics-research/plan2-prep.md` (deletion inventory §1, green-build strategy §2, draft contract §3, controller rulings at the top). Roadmap: `design/superpowers/plans/2026-11-17-plan-1-foundations.md`. Plan 2A (T1a purge, T1b `src/engine/codes.ts` and `src/scenarios/catalogue.ts`) is done.

## Global Constraints

- Never modify anything under `/Users/janisstrods/Gamemaking/cnc-ancients`.
- Every merge into `main` leaves `npm run typecheck` clean and `npm test` green. The five T1c sub-tasks (T1c-1, T1c-2, T1c-3a, T1c-3b, T1c-4) are one branch; only its squashed merge has to be green (each sub-task states its own partial check and the exact test files that must pass at its end).
- The engine never branches on a nation or army name. Nation-specific numbers are `UNIT_STATS` row data (moving-fire rounding included); a rule that falls on one side names the side in scenario data (`sideRules`, `objectives`). Only `src/engine/codes.ts` and `src/engine/units.ts` contain nation codes as literals.
- Determinism: every random draw goes through `src/engine/rng.ts` on `GameState` (`rng`, `rngCalls`); `forceDice` is the only test hook. `GameDriver.replay` reproduces a game exactly. The AI uses its own seeded `Rng` (`src/ai/rand.ts`), never `Math.random`.
- Hidden information: a card on a square track and the two cards of a Scout draw never appear in a `GameEvent` (`squareFormed`, `cardReturned`, `scoutDrew` and `draw` carry no card id). Only `cardPlayed` and `discarded` name cards. A First Strike played reactively emits `cardPlayed { side: <defender>, kind: 'firstStrike', effective: null }`; the UI never assumes `cardPlayed.side === active`.
- localStorage only through `storageKey(name)` from `src/ui/storage.ts` (prefix `ccn-`).
- Unit keys are `'<Nation>/<Code>'` (`'BR/LN'`), one string. Nations `FR BR PT AL SP`; codes as in `src/engine/codes.ts`; leaders are not units and have no key.
- Rules tests are written from the RR alone, with the RR's exact values. Every file in `tests/rules/` starts with a header line `// Rules: RR §a, §b.c (design/rules-reference.md)` naming the sections it tests, and cites the ruling id beside any `[Interp]` assertion.
- British spelling in comments, UI text and identifiers we introduce (`colour`, `manoeuvre`, `Centre` in card titles and section labels). Existing identifiers keep their spelling (`SectionName` stays `'left' | 'center' | 'right'`); its UI label is `'Centre'`.
- Contract files are frozen after T1c (this revision already contains the preflight amendments: layering, `retreatEnds`, `sampleOrders`, the kit's `attack`, `PlayerState.resources`): `src/engine/types.ts`, `src/engine/index.ts`, `src/engine/decisions.ts`, `src/engine/legal.ts`, `src/engine/driver.ts`, `tests/rules/helpers.ts`. A task that believes it needs to change one stops and reports to the controller. (T14 may extend `tests/rules/helpers.ts`.)
- Every exported name is unique across `src/engine` modules: `index.ts` re-exports with `export *`, so a clash is a TS2308 error that no later task may fix by editing `index.ts`.
- A task edits only the files in its **Files** list. Test helpers a task needs beyond the kit live in its own test file.
- Engine layering (each module imports only modules above it; type-only imports are exempt): `codes, types, hex, rng, expansions, units, terrain, query, cards, setup, scenarioRules, banners, objectives, dice, sight, retreat, movement, orders, tacticRules, options, decisions, combinedArms, casualties, leaders, resolve, squares, reactions, afterMelee, fire, melee, tactics, phases, flow`; then `legal`, `driver`, `text`, `index`.
- Parallel tracks: the map-tooling track is finished (T1c-1 owns `tests/scenarios/{checksum,manifest}.ts`). The art track (Plan 6B) owns `src/art/nap/**`, `tests/art/nap/**` and `src/dev/FigureGallery.tsx`; no Plan 2B task touches them (a horse-artillery team `<g>` is landing in `src/art/nap/token.tsx` from branch `art-ha-team`). Its Task 7 wires `src/art/nap` into `src/art/token.tsx` after T1c merges; T1c's placeholders must leave `#/gallery/figures` and `tests/art/nap/**` green. The history track owns `src/history/**`, `src/ui/history/**`, `tests/history/**`; T1c-4 makes one line edit in `HistoryDialog.tsx` and the controller tells that track.
- Models: Sonnet implements each task; Opus reviews each task (and T1c's reviewer checks the deletion inventory).
- Worktrees: `.worktrees/p2b-<lane>`; a lane merges `main` before starting its next task.
- Commits are path-limited (`git add <paths>`, `git add -A <paths>` for deletions) and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A decision the screen has no prompt for.** Plan 2B adds decisions the Ancients UI never had (`leaveSquare`, `combinedArms`, `elan`, `rally`, `scoutKeep`, `shortSupplyTarget`, `shortSupplyHex`, `breakthroughExtra`, `advance`). The player must never be stuck: every kind shows a prompt with a "Let the general decide" button that answers legally. Pinned by T1c-3b's `generic-prompts.test.ts` (Élan and Rally offer only that button until Plan 4).
2. **A retreat with nowhere to go.** A unit on its own baseline, boxed in by units, on an exit hex, or in square must lose 1 block per hex it cannot take and never leave the board or stall. Pinned by T6a's `retreat-flags.test.ts` (baseline, boxed-in, exit hex, square, ML 3 per flag).
3. **Card bookkeeping under pressure.** A Scout draw that empties the deck, an Élan reshuffle while cards sit on a square track, two First Strikes in one turn: the 70 cards must stay accounted for, track cards never shuffled in, and every hand back to its size at the next card. Pinned by T11's draw-phase tests and T14's invariants.
4. **A melee whose dice drop to 0 after it was declared** (a square formed, First Strike losses) must still count as the unit's battle and resolve with no effect; a 0-die attack must never be offered in the first place. Pinned by T6a (no 0-die declaration), T9 (a square formed against a 2-block BR/HC declared into a forest) and T12c (First Strike cuts a 2-block BR/HC declared into a forest to 0 dice).
5. **A leader with no way out.** A leader whose unit dies on his baseline, behind impassable terrain, or with every retreat hex held by enemy units must leave, be eliminated or escape, and the banner count must follow RR §13.2. Pinned by T6b's `leaders.test.ts`.

## Waves, lanes and file ownership

| Wave | Task | Lane (worktree) | Starts when | Owns (creates or edits) |
|---|---|---|---|---|
| 0 | T1c-1 Contract: tables, setup, scenario format | `p2b-t1c` | **G0:** RR and rulings merged to `main` | `src/engine/{codes,types,expansions,units,terrain,cards,setup}.ts`, `src/scenarios/index.ts`, `src/scenarios/data/000.json`, `tests/engine/{codes,tables,setup-validation}.test.ts`, `tests/scenarios/{loader.test,helpers,manifest,checksum}.ts` (the tooling track is finished) |
| 0 | T1c-2 Skeleton engine and test kits | `p2b-t1c` | T1c-1 reviewed | every other `src/engine/*.ts`, `tests/rules/**`, `tests/engine/{helpers.ts,rules.test.ts,soak.test.ts}`, `tests/golden/**` |
| 0 | T1c-3a AI stub | `p2b-t1c` | T1c-2 reviewed | `src/ai/**`, `tests/ai/**` |
| 0 | T1c-3b Game UI and art placeholders | `p2b-t1c` | T1c-3a reviewed | `src/ui/game/**`, `src/ui/kit/**`, `src/ui/App.tsx`, `src/art/{token,leader,icon,palettes,index}.ts(x)` (placeholders importing no Ancients figure file), `tests/art/{placeholder.test,helpers}.ts`, deletes `tests/art/{blocks,figures,kits}.test.ts`, `tests/ui/{battle-result,board-marks,controller-ask-ahead,controller-helpers,identity,record,rematch,terrain-tips,undo-card,generic-prompts}.ts` |
| 0 | T1c-4 Art clean-up, terrain, screens, galleries, scripts | `p2b-t1c` | T1c-3b reviewed; **squash-merge after** | the rest of `src/art/*.ts(x)` (not `nap/`), `src/ui/terrain/**`, `src/ui/screens/**`, `src/dev/{ArtGallery,TerrainGallery,KitGallery,HistoryGallery}.tsx`, `scripts/**`, `src/ui/history/HistoryDialog.tsx` (line 23 only), `tests/ui/{screens,unit-text,clean-slate,random-battle,triumphs-screens,version}.test.ts`, `CLAUDE.md` (Status line only) |
| 1 | T2 Units and dice | A `p2b-a` | T1c merged | `src/engine/dice.ts`, `tests/rules/units-dice.test.ts` |
| 1 | T3 Terrain and Field Works | B `p2b-b` | T1c merged | `src/engine/terrain.ts`, `tests/rules/terrain.test.ts` |
| 1 | T4 Line of sight and range | C `p2b-c` | T1c merged | `src/engine/sight.ts`, `tests/rules/sight.test.ts` |
| 1 | T5 Movement | D `p2b-d` | T1c merged | `src/engine/movement.ts`, `tests/rules/movement.test.ts` |
| 1 | T11 Section cards, orders and the turn | E `p2b-e` | T1c merged | `src/engine/{cards,orders,phases,flow}.ts`, `tests/rules/orders-turn.test.ts` |
| 1 | T13 Victory, objectives and §14 rules | F `p2b-f` | T1c merged | `src/engine/{banners,objectives,scenarioRules,setup}.ts`, `tests/rules/{objectives,scenario-rules}.test.ts` |
| 2 | T6a Fire and melee core | A | T2, T3, T4, T5, T13 merged | `src/engine/{fire,melee,resolve,casualties,retreat,options,query}.ts`, `phases.ts` (battle phase only), `tests/rules/{fire-melee,retreat-flags}.test.ts` |
| 2 | T12a Tactic cards: orders and modifiers | B | T2, T3, T5, T11 merged | `src/engine/{cards,orders}.ts`, `tests/rules/tactic-cards.test.ts` |
| 2 | T12b Élan, Rally, Short Supply | C | T2, T5, T11, T13 merged | `src/engine/{tactics,tacticRules}.ts`, `tests/rules/elan-rally-supply.test.ts` |
| 3 | T6b Leaders | A | T6a merged | `src/engine/{leaders,retreat,options,melee,resolve}.ts`, `tests/rules/leaders.test.ts` |
| 4 | T7 Take ground, breakthrough, bonus melee | A | T6b, T12a merged | `src/engine/{afterMelee,melee}.ts`, `tests/rules/advance.test.ts` |
| 4 | T8 Retire and Reform | B | T6b merged; **merges after T7** | `src/engine/{reactions,retreat}.ts`, `tests/rules/retire-reform.test.ts` |
| 5 | T9 Squares | A | T7, T8 merged | `src/engine/{squares,reactions,melee,resolve,phases}.ts`, `tests/rules/squares.test.ts` |
| 6 | T10 Combined Arms | A | T9, T12a, T12b merged | `src/engine/{combinedArms,melee,options,sight}.ts`, `tests/rules/combined-arms.test.ts` |
| 7 | T12c First Strike | A | T10 merged | `src/engine/{reactions,melee}.ts`, `tests/rules/first-strike.test.ts` |
| 8 | T14 Hardening | A | all merged | `tests/rules/{invariants.test,helpers}.ts`, `tests/engine/*.test.ts`, `tsconfig.scripts.json`, `package.json`, `package-lock.json`, `scripts/**`, `CLAUDE.md` |

**Merge order.** T1c (squashed); wave 1: T2 first, then T3, T4, T5, T13, T11 in any order (no two share a file; T3, T4 and T5 each have one integration test whose dice value needs T2, so they rebase onto T2 and rerun the full suite before merging); wave 2 in any order (T6a, T12a, T12b share no file); T6b; T7 then T8 (T8 branches after T6b, rebases on T7 and reruns the full suite, because its take-ground test needs T7); T9; T10; T12c; T14. Plan 6B Task 7 (art wiring) may merge any time after T1c; Plan 2B tasks after T1c never touch `src/art/**`.

**Hooks.** T1c-2 creates every module of the layering list with its final exported names. A function marked *stub* (or "→ Tn") has a placeholder body and is filled by the task named beside it. A task that rewrites a module keeps every call site T1c placed in it.

**Decided details (binding for every task).**
- `RetreatOption.path` and `LeaderRetreatOption.path` list the hexes entered, start excluded; `end` is the last of them, or the start hex when the path is empty. The events `move`, `retreat`, `retire`, `leaderRetreat` and `advance` carry the path **including** the start hex.
- `answerError`: `{ kind: 'hex', hex: null }` is legal only for `bonusMelee` and for a `breakthroughExtra` with `required: false`, never for `shortSupplyHex`. In an `assign` answer (one entry per die) `null` is always legal for any face, arm faces of Élan and Rally included.
- `turn.retreatEnds` records the end hex of every retreat (and retire) by a unit of the **non-active** side, whatever caused it; `cardForbidsBattle` for Fire and Hold is "a hex of `turn.retreatEnds` is adjacent to the unit", with no occupancy condition (R58).
- The skeleton's `applyMove` calls `exitPiece` for a move to `OFF_BOARD`; the skeleton's `exitPiece` removes the piece (and a unit's attached leader) with a `removed` event and no banner; T13 adds the banners.
- The R12 fallback (a declared moved gun cut to 1 block melees with the standing 1-block cell) belongs to T2 (`dice.ts`); T12c only tests it.
- Setup never checks a unit's nation against its side's `SideSetup.nation` (the kit puts French units at the bottom, and mixed armies need it).
- `giveCard` and `noFirstStrike` take and put cards only in the deck, the discard and the hands, never on a square track.
- Tests that block a retreat with friendly units on (3,5) and (3,6) give the defender support; where that raises an `ignoreFlags` decision the outline answers `{ kind: 'ignoreFlags', count: 0 }`.
- Every test outline that declares an attack uses the kit's `attack(d, unit, hex, o?)`, which answers a following `combinedArms` with `o.guns ?? []` and a `defend` with `o.defend ?? 'stand'`, so decisions added by later tasks never break earlier tests. Only a test whose subject is the `combinedArms` or `defend` decision answers it with `must`.
- `tests/engine/rr-coverage.test.ts` (T14): a bare `§n` in a header covers only §1 and §14; every other section counts as covered only through its own `§n.m`.

---
### Task T1c-1: Contract — tables, setup and scenario format

**Model:** Sonnet. **Lane:** `p2b-t1c` (branch `p2b-t1c` from `main` at G0).

**Files:**
- Modify: `src/engine/codes.ts` (add `UNIT_KEYS`, `RowKey`, `isRowKey`; add the code `'SWI'`), `src/engine/expansions.ts` (rows `base`, `exp1`)
- Rewrite: `src/engine/types.ts`, `src/engine/units.ts`, `src/engine/terrain.ts`, `src/engine/cards.ts`, `src/engine/setup.ts`, `src/scenarios/index.ts`, `src/scenarios/data/000.json`
- Rewrite tests: `tests/engine/codes.test.ts` (extend), `tests/engine/setup-validation.test.ts`, `tests/scenarios/loader.test.ts`, `tests/scenarios/{helpers,manifest,checksum}.ts`
- Create: `tests/engine/tables.test.ts`

**Interfaces:**
- Consumes: `src/engine/codes.ts` (Plan 2A): `Nation, Arm, UnitCode, UnitKey, ARM_OF, CODE_NAMES, NATION_NAMES, nationOf, codeOf, isUnitKey`; `src/engine/hex.ts` (unchanged: `hexId, rowOf, colOf, onBoard, neighbours, HEX_DIRS, distance, sectionsOf, rearHexes, baselineRow, lineBetween, hasLineOfSight, sidesCrossed, directionTo`); `src/engine/rng.ts` `shuffle`, `randInt`.
- Produces: everything below, used by every later task.

**`src/engine/codes.ts` additions.** `UnitKey` stays the vocabulary type (the art track names `FR/LNC`, the Spanish battles `FR/SWI` and `SP/SWI`, which have no row). Add `'SWI'` to `UNIT_CODES` (after `'ML'`), `ARM_OF.SWI = 'infantry'`, `CODE_NAMES.SWI = 'Swiss Infantry'` (room for Expansion #1; no row in this plan).

```ts
/** The unit rows of RR §2.2–§2.4, in RR order. */
export const UNIT_KEYS = [
  'FR/LN', 'FR/LT', 'FR/GR', 'FR/YG', 'FR/OG', 'FR/ML', 'FR/LC', 'FR/HC', 'FR/CU', 'FR/GHC', 'FR/FA', 'FR/HA', 'FR/GA',
  'BR/LN', 'BR/LT', 'BR/RI', 'BR/GR', 'BR/GG', 'BR/LC', 'BR/HC', 'BR/GHC', 'BR/FA', 'BR/HA',
  'PT/LN', 'PT/LT', 'PT/ML', 'PT/LC', 'PT/HC', 'PT/FA',
  'AL/LN', 'AL/LT', 'AL/ML', 'AL/LC', 'AL/FA',
] as const satisfies readonly UnitKey[];
/** A UnitKey that has a UNIT_STATS row. */
export type RowKey = (typeof UNIT_KEYS)[number];
export function isRowKey(s: string): s is RowKey;
```

**`src/engine/expansions.ts`:** `EXPANSIONS = [{ id: 'base', number: 0, name: 'Base game', pickerLabel: 'The Peninsula & Waterloo' }, { id: 'exp1', number: 1, name: 'Expansion #1', pickerLabel: 'The Spanish Army' }]`; `Expansion`, `ExpansionNumber` as now.

**`src/engine/types.ts`** (the whole contract; plain serialisable data). Kept unchanged from today: `SIDES`, `Side`, `SECTIONS`, `SectionName`, `HexDir`, `HexId`, `ROWS`, `COLS`, `OFF_BOARD`, `DeepReadonly`, `FlowCtx`. Removed: `UnitType`, `UnitClass`, `EliteId`, `LEGIONS`, `Legion`, `BLOCKS`, `Blocks`, `ARMY_LOOKS`, `ArmyLook`, `LeaderTrait`, `SPECIAL_RULE_IDS`, `OBJECTIVE_MARKERS`, `AmbushDef`, `PlaceUnitDef`, `CommandDef`, `HandGrowth`, `CommandBonus`. New or changed:

```ts
export type DieFace = 'infantry' | 'cavalry' | 'artillery' | 'flag' | 'sabre';
export const TERRAIN_TYPES = ['plain', 'hill', 'forest', 'rugged', 'town', 'windmill', 'fortress', 'river', 'ford',
  'fordNoStop', 'brook', 'bridge', 'sandQuarry', 'void'] as const;
export type TerrainType = (typeof TERRAIN_TYPES)[number];
export type UnitTag = 'light' | 'grenadier' | 'guard' | 'heavy' | 'horseArtillery';
export type SquareSlot = 1 | 2 | 3 | 4;

export interface Unit { id: string; side: Side; key: RowKey; hex: HexId; blocks: number; maxBlocks: number; square?: SquareSlot }
export interface Leader { id: string; side: Side; name: string; hex: HexId }
export interface PlayerState {
  side: Side; army: string; nation: Nation; commander: string;
  cards: number;                     // the scenario's hand size
  hand: number[];                    // card ids (index into CARD_LIST)
  squareTrack: (number | null)[];    // length 4; slot i holds the card of the square with counter i+1
  banners: number;                   // permanent banners
  resources: Record<string, number>; // per-side counters for later expansions (Guerrilla counters); {} in the base game
}

export type CardKind =
  | 'scoutL' | 'scoutC' | 'scoutR' | 'probeL' | 'probeC' | 'probeR' | 'attackL' | 'attackC' | 'attackR'
  | 'assaultL' | 'assaultC' | 'assaultR' | 'coordinatedAdvance' | 'flankAttack' | 'forward' | 'reconInForce'
  | 'bayonetCharge' | 'bombard' | 'cavalryCharge' | 'counterAttack' | 'elan' | 'fireAndHold' | 'firstStrike'
  | 'forceMarch' | 'coldSteel' | 'leadership' | 'grandManoeuvre' | 'rally' | 'shortSupply';
export type CardGroup = 'section' | 'tactic';
export interface MoveOption { max: number; battle: boolean }
export interface UnitMatch { arms?: readonly Arm[]; tags?: readonly UnitTag[] }    // matches when the arm OR a tag matches
export interface DiceMod { plus: number; arms?: readonly Arm[]; tags?: readonly { tag: UnitTag; arm: Arm; plus: number }[] }
export interface MoveMod { options: readonly MoveOption[]; only?: UnitMatch; leader?: number }
export interface OrderMods {
  fire: DiceMod | null; melee: DiceMod | null;
  bonusMelee: boolean;      // the melee mod also applies to the bonus melee
  lostInTown: boolean;      // no card dice battling into or out of a hex whose TerrainStats.cancelsCavalryCharge
  move: MoveMod | 'forceMarch' | null;  // replaces the allowance of matching ordered units
  noMove: boolean; noFire: boolean; noMelee: boolean;
}
export type SelectRule =
  | { kind: 'sections'; counts: Partial<Record<SectionName, number | 'command'>> }
  | { kind: 'kinds'; match: UnitMatch; max: number; notAdjacentToEnemy: boolean }
  | { kind: 'sectionAll'; match: UnitMatch }
  | { kind: 'adjacentToEnemy' }
  | { kind: 'leaders' }
  | { kind: 'grandManoeuvre'; max: number }
  | { kind: 'dice'; roll: 'elan' | 'rally' }
  | { kind: 'shortSupply' }
  | { kind: 'none' }
  | { kind: 'copy' };
export interface CardDef {
  kind: CardKind; title: string; group: CardGroup; count: number; text: string;
  sections: SectionName[]; detach: boolean; select: SelectRule; mods: OrderMods; draw: 'normal' | 'scout' | 'reshuffle';
}

export interface OrderedPiece {
  id: string; isLeader: boolean; startHex: HexId;
  moved: number;            // hexes moved in this turn's Movement phase
  moveDone: boolean;
  battled: boolean;         // made its one battle (fire, melee or a Combined Arms share)
  cardMods: boolean;        // the card's OrderMods apply (false for a fallback or La Grande Manoeuvre's single option)
  stopEntered: boolean;     // entered a hex that stops movement this turn (terrain, a works crossing, a lone friendly leader)
  noBattle: boolean;        // entered terrain that forbids battle this turn (RR §4.1)
  attachedThisTurn: boolean;// a leader joined it: it may not move afterwards
  bonusMeleeDone: boolean;
  stayInSquare: boolean;    // enemy cavalry was adjacent when it was ordered (RR §6.3)
}
export type TurnPhase = 'card' | 'orders' | 'move' | 'battle' | 'draw' | 'done';
export interface TurnState {
  number: number; card: number | null; effective: CardKind | null; mirrored: boolean; phase: TurnPhase;
  command: number;                         // Command fixed when the card was played (RR §5.3)
  ordered: Record<string, OrderedPiece>;
  mods: OrderMods;
  firstStrikes: Record<Side, number>;      // First Strikes played reactively this turn
  reshuffle: boolean; scout: boolean;      // Draw-phase effects of the card (or of the card copied)
  retreatEnds: HexId[];                    // end hexes of retreats by units of the non-active side this turn (Fire and Hold, R58)
}

export type ObjectiveDef = DeepReadonly<
  | { kind: 'tempHex'; side: Side; hex: HexId; timing: 'turnStart'; banners: number; text: string }
  | { kind: 'tempGroup'; side: Side; hexes: HexId[]; timing: 'turnStart'; banners: number; text: string }
  | { kind: 'exit'; side: Side; hex: HexId; banners: number; leadersScore: boolean; retreatOff: boolean; text: string }
  | { kind: 'killWeight'; side: Side; enemyArm: Arm; first: number; later: number }>;
export type ObjectiveOf<K extends ObjectiveDef['kind']> = Extract<ObjectiveDef, { kind: K }>;
export interface ObjectiveState { held: boolean; count: number }   // held: temp objectives; count: kills (killWeight)
export type SideRuleDef = DeepReadonly<
  | { kind: 'flagIgnoreOn'; side: Side; terrain: TerrainType; flags: number }        // 006 fortress (RR §14.6)
  | { kind: 'impetuousCavalry'; side: Side; keys: RowKey[] }>;                       // 015 (RR §14.15)
export interface ScenarioConfigData {
  objectives: ObjectiveDef[]; sideRules: SideRuleDef[];
  unitStats: Partial<Record<RowKey, UnitStats>>;   // rows changed by unitOverrides, resolved at setup
  leadersAtStart: Record<Side, number>;
}
export type ScenarioConfig = DeepReadonly<ScenarioConfigData>;
export interface SpecialState { objState: ObjectiveState[]; turnsDone: Record<Side, number>; leadersEliminated: Record<Side, number> }

export interface GameState {
  scenarioId: string;
  terrain: TerrainType[];  // length ROWS*COLS; never changed in play (cloneState shares it)
  works: number[];         // Field Works hexsides per hex: bit i = HEX_DIRS[i]; 0 = none (shared, never changed)
  units: Unit[]; leaders: Leader[]; players: Record<Side, PlayerState>;
  deck: number[]; discard: number[]; first: Side; active: Side; turn: TurnState;
  lastCard: Record<Side, CardKind | null>;   // effective card of each side's last turn (Counter-Attack)
  bannersToWin: number; rng: number; rngCalls: number;
  winner: Side | 'draw' | null; winReason: string;
  scenario: ScenarioConfig; special: SpecialState;
}

/** A melee in progress (engine-internal, passed between melee.ts and its hooks). */
export interface MeleeCtx {
  attacker: string; target: string; targetHex: HexId; role: 'attack' | 'bonus';
  artillery: string[]; reaction: DefendChoice | null; declaredMoved: number;
}

export type DefendChoice = 'stand' | 'retireReform' | 'formSquare' | 'firstStrike';
export interface RetreatOption { path: HexId[]; end: HexId; losses: number; attach: string | null }
export interface LeaderRetreatOption { path: HexId[]; end: HexId; offBoard: boolean; escapes: string[]; attach: string | null; eliminated: boolean }

export type Decision =
  | { kind: 'playCard'; side: Side }
  | { kind: 'orders'; side: Side; card: CardKind; mirrored: boolean; single: boolean }
  | { kind: 'leaveSquare'; side: Side; unit: string }
  | { kind: 'move'; side: Side }
  | { kind: 'battle'; side: Side }
  | { kind: 'combinedArms'; side: Side; unit: string; target: HexId; options: string[] }
  | { kind: 'defend'; side: Side; attacker: string; target: string; options: DefendChoice[]; bonus: boolean }
  | { kind: 'ignoreFlags'; side: Side; unit: string; flags: number; max: number }
  | { kind: 'retreat'; side: Side; unit: string; options: RetreatOption[]; reason: 'retreat' | 'retireReform' }
  | { kind: 'leaderRetreat'; side: Side; leader: string; options: LeaderRetreatOption[] }
  | { kind: 'advance'; side: Side; unit: string; hex: HexId; how: 'takeGround' | 'breakthrough' }
  | { kind: 'breakthroughExtra'; side: Side; unit: string; options: HexId[]; required: boolean }
  | { kind: 'bonusMelee'; side: Side; unit: string; targets: HexId[] }
  | { kind: 'elan'; side: Side; faces: DieFace[] }
  | { kind: 'rally'; side: Side; faces: DieFace[] }
  | { kind: 'scoutKeep'; side: Side; cards: [number, number] }
  | { kind: 'shortSupplyTarget'; side: Side; options: string[] }
  | { kind: 'shortSupplyHex'; side: Side; unit: string; options: HexId[] };

export type Answer =
  | { kind: 'playCard'; card: number }
  | { kind: 'orders'; pieces: string[]; single?: boolean }   // single: La Grande Manoeuvre's "1 unit, normal rules"
  | { kind: 'move'; piece: string; to: HexId }               // to = OFF_BOARD: step off by an exit objective
  | { kind: 'endMove' }
  | { kind: 'attack'; unit: string; target: HexId }
  | { kind: 'endBattle' }
  | { kind: 'select'; ids: string[] }                        // combinedArms ([] = none)
  | { kind: 'defend'; choice: DefendChoice }
  | { kind: 'ignoreFlags'; count: number }
  | { kind: 'choose'; index: number }                        // retreat, leaderRetreat, scoutKeep (card kept), shortSupplyTarget
  | { kind: 'yesno'; yes: boolean }                          // leaveSquare, advance
  | { kind: 'hex'; hex: HexId | null }                       // breakthroughExtra, bonusMelee (null = decline), shortSupplyHex
  | { kind: 'assign'; ids: (string | null)[] };              // elan, rally: one entry per die

export type RollPurpose = 'fire' | 'melee' | 'battleBack' | 'firstStrike' | 'bonus' | 'squareFirst' | 'retireReform'
  | 'leaderCheck' | 'escape' | 'elan' | 'rally';
export type GameEvent =
  | { t: 'turnStart'; side: Side; turn: number }
  | { t: 'cardPlayed'; side: Side; card: number; kind: CardKind; effective: CardKind | null }
  | { t: 'ordered'; side: Side; ids: string[] }
  | { t: 'move'; id: string; path: HexId[] }   // path includes the start hex; last = OFF_BOARD when it exited
  | { t: 'combat'; purpose: RollPurpose; attacker: string; target: string; dice: number; artillery?: { id: string; dice: number }[] }
  | { t: 'roll'; purpose: RollPurpose; faces: DieFace[]; scoring: boolean[]; by: string | null; against: string | null; from?: string[] }
  | { t: 'damage'; id: string; amount: number; left: number; reason: string }
  | { t: 'eliminated'; id: string }
  | { t: 'removed'; id: string; reason: string }      // left the board by an exit: no banner to the enemy
  | { t: 'leaderKilled'; id: string } | { t: 'leaderSafe'; id: string } | { t: 'leaderLeft'; id: string }
  | { t: 'flags'; id: string; flags: number; ignored: number; bounce: boolean }
  | { t: 'retreat'; id: string; path: HexId[] } | { t: 'retire'; id: string; path: HexId[] }
  | { t: 'leaderRetreat'; id: string; path: HexId[]; offBoard: boolean }
  | { t: 'attach'; leader: string; unit: string }
  | { t: 'advance'; id: string; path: HexId[] }
  | { t: 'squareFormed'; id: string; slot: SquareSlot } | { t: 'squareLeft'; id: string; slot: SquareSlot }
  | { t: 'cardReturned'; side: Side; slot: SquareSlot }
  | { t: 'rallied'; id: string; blocks: number } | { t: 'shortSupply'; id: string; hex: HexId }
  | { t: 'banner'; side: Side; total: number; reason: string }
  | { t: 'held'; side: Side; held: number; total: number; reason: string }
  | { t: 'draw'; side: Side } | { t: 'scoutDrew'; side: Side } | { t: 'discarded'; side: Side; card: number }
  | { t: 'reshuffle' }
  | { t: 'log'; text: string; side?: Side }
  | { t: 'victory'; winner: Side | 'draw'; reason: string };
```

(`types.ts` imports `Nation, Arm, RowKey` from `codes.ts` and `UnitStats` as a type from `units.ts`; a type-only import does not break the layering.)

**`src/engine/units.ts`.**

```ts
export interface ArtilleryRow { full: readonly number[]; one: readonly number[] }  // dice at distance 1..5 (index d-1): 3 or 2 blocks / 1 block
export type MeleeRule = { kind: 'blocks'; plus: number; vsInfantry: number; movedPlus: number } | { kind: 'artillery' };  // movedPlus: added after moving (0 in the base game; Spanish −1 later)
export type FireRule =
  | { kind: 'none' }
  | { kind: 'musket'; range: number; standing: number; moving: number; round: 'up' | 'down' }  // b+standing; ⌈b/2⌉ or ⌊b/2⌋ + moving
  | { kind: 'artillery'; range: number; standing: ArtilleryRow; moved: ArtilleryRow | null };  // moved: after 1 hex
export interface UnitStats {
  key: RowKey; name: string; arm: Arm; tags: readonly UnitTag[]; expansion: Expansion; blocks: number;
  move: readonly MoveOption[]; battleAfterMoveMinBlocks: number; melee: MeleeRule; fire: FireRule;
  retreat: { first: number; then: number }; flagIgnore: number; sabreHits: boolean; ignoresInfantryFireHits: number;
}
export const UNIT_STATS: Readonly<Record<RowKey, UnitStats>>;
export const LEADER_MOVE = 3;
export function statsOf(s: Pick<GameState, 'scenario'>, u: Pick<Unit, 'key'>): UnitStats;  // scenario.unitStats[key] ?? UNIT_STATS[key]
export function retreatDistance(st: UnitStats, flags: number): number;                     // 0 → 0; else first + (flags − 1) × then
export function matches(st: UnitStats, m: UnitMatch): boolean;
```

Presets: `LINE = [{max:1,battle:true}]`, `LIGHT = [{max:1,battle:true},{max:2,battle:false}]`, `LIGHT_CAV = [{max:3,battle:true}]`, `HEAVY_CAV = [{max:2,battle:true}]`, `FOOT_GUNS = [{max:0,battle:true},{max:1,battle:false}]`, `HORSE_GUNS = [{max:1,battle:true},{max:2,battle:false}]`. Artillery rows (RR §2.6): `FA = { standing: { full: [4,3,2,1,1], one: [3,2,1,1,0] }, moved: null }`, `GA = { standing: { full: [5,3,2,1,1], one: [4,2,1,1,0] }, moved: null }`, `HA = { standing: { full: [3,2,1,1,0], one: [2,1,1,0,0] }, moved: { full: [3,2,1,0,0], one: [0,0,0,0,0] } }`. Every row: `name = CODE_NAMES[code]`, `expansion: 'base'`, `retreat: { first: n, then: n }`, `battleAfterMoveMinBlocks: 1` unless stated, melee `{kind:'blocks', plus, vsInfantry: 0, movedPlus: 0}` unless stated, `ignoresInfantryFireHits: 0` unless stated. Musket `round` is `'up'` for every FR and BR row and `'down'` for every PT and AL row.

| Key | Blocks | Move | Melee plus | Fire (range, standing, moving) | Retreat | Flags ignored | Sabre | Tags | Other |
|---|---|---|---|---|---|---|---|---|---|
| FR/LN | 4 | LINE | 0, **vsInfantry 1** | musket 2, 0, 0 | 1 | 0 | yes | — | |
| FR/LT | 4 | LIGHT | 0 | musket 2, 1, 1 | 1 | 0 | yes | light | |
| FR/GR | 4 | LINE | 1 | musket 2, 0, 0 | 1 | 1 | yes | grenadier | |
| FR/YG | 4 | LIGHT | 1 | musket 2, 1, 1 | 1 | 1 | yes | light, guard | |
| FR/OG | 4 | LINE | 2 | musket 2, 1, 1 | 1 | 2 | yes | guard | |
| FR/ML | 4 | LINE | 0 | musket 2, 0, 0 | 3 | 0 | **no** | — | |
| FR/LC | 4 | LIGHT_CAV | 0 | none | 1 | 0 | yes | — | |
| FR/HC | 4 | HEAVY_CAV | 1 | none | 1 | 0 | yes | heavy | |
| FR/CU | 4 | HEAVY_CAV | 1 | none | 1 | 1 | yes | heavy | `ignoresInfantryFireHits: 1` |
| FR/GHC | 4 | HEAVY_CAV | 1 | none | 1 | 2 | yes | heavy, guard | |
| FR/FA | 3 | FOOT_GUNS | artillery | artillery 5, FA | 1 | 0 | yes | — | |
| FR/HA | 3 | HORSE_GUNS | artillery | artillery 4, HA | 1 | 0 | yes | horseArtillery | `battleAfterMoveMinBlocks: 2` |
| FR/GA | 3 | FOOT_GUNS | artillery | artillery 5, GA | 1 | 2 | yes | guard | |
| BR/LN | 4 | LINE | 0 | musket 2, 1, 0 | 1 | 0 | yes | — | |
| BR/LT | 5 | LIGHT | 0 | musket 2, 1, 1 | 1 | 0 | yes | light | |
| BR/RI | 3 | LIGHT | 0 | musket **3**, 1, 1 | 1 | 0 | **no** | light | |
| BR/GR | 4 | LINE | 1 | musket 2, 1, 1 | 1 | 1 | yes | grenadier | |
| BR/GG | 5 | LINE | 1 | musket 2, 1, 1 | 1 | 2 | yes | guard | |
| BR/LC | 3 | LIGHT_CAV | 0 | none | 1 | 0 | yes | — | |
| BR/HC | 3 | HEAVY_CAV | 1 | none | 1 | 0 | yes | heavy | |
| BR/GHC | 3 | HEAVY_CAV | 1 | none | 1 | 2 | yes | heavy, guard | |
| BR/FA | 3 | FOOT_GUNS | artillery | artillery 5, FA | 1 | 0 | yes | — | |
| BR/HA | 3 | HORSE_GUNS | artillery | artillery 4, HA | 1 | 0 | yes | horseArtillery | `battleAfterMoveMinBlocks: 2` |
| PT/LN | 4 | LINE | 0 | musket 2, 0, 0 | 1 | 0 | yes | — | |
| PT/LT | 3 | LIGHT | 0 | musket 2, 1, 1 | 1 | 0 | yes | light | |
| PT/ML | 4 | LINE | 0 | musket 2, 0, 0 | 3 | 0 | **no** | — | |
| PT/LC | 3 | LIGHT_CAV | 0 | none | 1 | 0 | yes | — | |
| PT/HC | 3 | HEAVY_CAV | 1 | none | 1 | 0 | yes | heavy | |
| PT/FA | 3 | FOOT_GUNS | artillery | artillery 5, FA | 1 | 0 | yes | — | |
| AL/LN | 4 | LINE | 0 | musket 2, 0, 0 | **2** | 0 | yes | — | |
| AL/LT | 3 | LIGHT | 0 | musket 2, 1, 1 | 1 | 0 | yes | light | |
| AL/ML | 4 | LINE | 0 | musket 2, 0, 0 | 3 | 0 | **no** | — | |
| AL/LC | 3 | LIGHT_CAV | 0 | none | 1 | 0 | yes | — | |
| AL/FA | 3 | FOOT_GUNS | artillery | artillery 5, FA | 1 | 0 | yes | — | |

**`src/engine/terrain.ts`** (tables and table-driven queries now; T3 fills the stubs).

```ts
export interface ArmValues { infantry: number; cavalry: number; artillery: number }
export interface Reductions { fire: ArmValues; melee: ArmValues }       // values ≤ 0
export interface TerrainStats {
  name: string; impassable: boolean; closedTo: readonly Arm[]; stopsOnEntry: boolean;
  noBattleAfterEntering: 'all' | 'notLight' | null; noMeleeInto: boolean;
  into: Reductions; out: Reductions; hill: boolean; blocksSight: boolean; squareAllowed: boolean; cancelsCavalryCharge: boolean;
}
export interface WorksStats { into: Reductions; out: Reductions; flagIgnore: ArmValues }
export const TERRAIN_STATS: Readonly<Record<TerrainType, TerrainStats>>;
export const WORKS: WorksStats;
export const HILL_RELATION: Readonly<Record<'uphill' | 'downhill' | 'hillToHill', Reductions>>;
export function terrainAt(s: Pick<GameState, 'terrain'>, h: HexId): TerrainType;
export function isHill(s: Pick<GameState, 'terrain'>, h: HexId): boolean;
export function worksMask(s: Pick<GameState, 'works'>, h: HexId): number;
export function crossesWorks(s: GameState, a: HexId, b: HexId): boolean;     // a, b adjacent and a works side lies between them
export function passableFor(s: GameState, h: HexId, arm: Arm | null): boolean; // null = leader: !impassable; else also !closedTo
export function stopsOnEntry(s: GameState, from: HexId, to: HexId): boolean;  // to's stopsOnEntry || crossesWorks(from, to)
export function noBattleAfterEntering(s: GameState, h: HexId, st: UnitStats): boolean; // 'all', or 'notLight' and no 'light' tag
// stubs (T3):
export function worksAcross(s: GameState, worksHex: HexId, other: HexId): boolean;     // stub: adjacent across a works side
export function terrainReduction(s: GameState, battler: Unit, kind: 'fire' | 'melee', from: HexId, to: HexId): number; // stub 0
export function worksFlagIgnore(s: GameState, target: Unit, attackerHex: HexId): number;  // stub 0
export function worksForbidSquare(s: GameState, target: Unit, attackerHex: HexId): boolean; // stub false
```

Rows (RR §4.1–§4.2; "fire I/A, melee I/C/A"; every unlisted value 0 or false; cavalry fire values 0):

| Type | Name | impassable / closedTo | stops | noBattleAfterEntering | Into fire I/A | Into melee I/C/A | Out fire I/A | Out melee I/C/A | hill | blocksSight | squareAllowed | cancelsCavalryCharge |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| plain | Open ground | | | | | | | | | | yes | |
| hill | Hill | | | | | | | | **yes** | no (hill rule, T4) | yes | |
| forest | Forest | | yes | notLight | −1/−1 | −1/−2/−1 | 0/−1 | 0/−2/−1 | | yes | yes | |
| rugged | Rugged hill | impassable | | | | | | | | yes | no | |
| town | Town | | yes | all | −2/−1 | −2/−3/−1 | 0/−1 | 0/−3/−1 | | yes | **no** | yes |
| windmill | Windmill | as town | | | | | | | | | | |
| fortress | Fortress | as town | | | | | | | | | | |
| river | River | impassable, `noMeleeInto` | | | | | | | | no | no | |
| ford | Fordable river | | yes | | 0/0 | −1/−1/−1 | −1/−1 | −1/−1/−1 | | no | yes | |
| fordNoStop | Fordable river | as ford, `stopsOnEntry: false` | | | | | | | | | | |
| brook | Brook | | yes | | | | | | | no | yes | |
| bridge | Bridge | | | | | | | | | no | yes | |
| sandQuarry | Sand quarry | closedTo `['artillery']` | yes | | −1/−1 | 0/−2/0 | 0/0 | 0/−2/0 | | no | yes | |
| void | Off board | impassable | | | | | | | | yes | no | |

`WORKS`: into fire I −1, A 0; into melee I −1, C −2, A 0; out fire 0/0; out melee I 0, C −2, A 0; `flagIgnore` I 1, C 0, A 1. `HILL_RELATION`: uphill fire I −1 A 0, melee I −1 C −1 A 0; downhill fire 0, melee I 0 C −1 A 0; hillToHill fire I −1 A 0, melee 0/0/0.

**`src/engine/cards.ts`** (table now; T11 and T12a fill the logic).

```ts
export const CARD_DEFS: Readonly<Record<CardKind, CardDef>>;   // key order = the CardKind union order above
export const CARD_LIST: readonly CardKind[];                    // CARD_DEFS expanded by count, in key order: 70 entries
export const NO_MODS: OrderMods;                                 // all null / false
export function cardKind(id: number): CardKind;
export function mirrorKind(k: CardKind): CardKind;               // swaps …L ↔ …R; others unchanged
export function cardDice(mod: DiceMod | null, st: UnitStats): number;  // (arms absent or includes st.arm ? plus : 0) + Σ matching tags (tag ∈ st.tags && arm === st.arm)
// added by T1c-2 with skeleton bodies (T1c-1's cards.ts holds only the table and the pure helpers above), logic in T11/T12a:
export function drawCard(s: GameState, ctx: FlowCtx, side: Side): void;
export function effectiveCard(s: GameState, side: Side, cardId: number): { kind: CardKind | null; mirrored: boolean };
export function cardForbidsBattle(s: GameState, op: OrderedPiece, u: Unit): boolean;   // stub false (T12a)
```

| Kind | Title | Group | Count | Sections | Detach | Select | Mods | Draw |
|---|---|---|---|---|---|---|---|---|
| scoutL / C / R | Scout Left / Centre / Right | section | 2 each | its own | yes | sections {its: 1} | NO_MODS | scout |
| probeL / C / R | Probe Left / Centre / Right | section | 4 / 6 / 4 | its own | yes | sections {its: 2} | NO_MODS | normal |
| attackL / C / R | Attack Left / Centre / Right | section | 4 / 6 / 4 | its own | yes | sections {its: 3} | NO_MODS | normal |
| assaultL / C / R | Assault Left / Centre / Right | section | 2 each | its own | yes | sections {its: 'command'} | NO_MODS | normal |
| coordinatedAdvance | Coordinated Advance | section | 2 | all | yes | sections {left 1, center 2, right 1} | NO_MODS | normal |
| flankAttack | Flank Attack | section | 2 | left, right | yes | sections {left 2, right 2} | NO_MODS | normal |
| forward | Forward | section | 2 | all | yes | sections {left 2, center 2, right 2} | NO_MODS | normal |
| reconInForce | Recon in Force | section | 2 | all | yes | sections {left 1, center 1, right 1} | NO_MODS | normal |
| bayonetCharge | Bayonet Charge | tactic | 2 | [] | no | kinds {arms [infantry]}, max 4 | melee {plus 0, tags [{guard, infantry, 1}]}, move {options [{2, battle}]}, noFire | normal |
| bombard | Bombard | tactic | 2 | [] | no | kinds {arms [artillery]}, max 4 | fire and melee {plus 2, tags [{guard, artillery, 1}]}, move {options [{0, battle}, {3, no battle}]} | normal |
| cavalryCharge | Cavalry Charge | tactic | 3 | [] | no | kinds {arms [cavalry], tags [horseArtillery]}, max 4 | melee {plus 1, arms [cavalry], tags [{guard, cavalry, 1}]}, bonusMelee, lostInTown, move {options [{3, battle}], only {tags [heavy]}} | normal |
| counterAttack | Counter-Attack | tactic | 2 | [] | (copied) | copy | (copied) | (copied) |
| elan | Élan | tactic | 1 | [] | no (flag orders detach) | dice elan | fire and melee {plus 1}, bonusMelee | reshuffle |
| fireAndHold | Fire and Hold | tactic | 2 | [] | no | kinds {arms [infantry, artillery]}, max 4, notAdjacentToEnemy | fire {plus 1}, noMove, noMelee | normal |
| firstStrike | First Strike | tactic | 2 | [] | no | none | NO_MODS | normal |
| forceMarch | Force March | tactic | 2 | [] | no | sectionAll {arms [infantry]} | move 'forceMarch' | normal |
| coldSteel | Give Them the Cold Steel | tactic | 1 | [] | no | adjacentToEnemy | melee {plus 1}, bonusMelee false, noMove, noFire | normal |
| leadership | Leadership | tactic | 2 | [] | yes | leaders | fire and melee {plus 1}, bonusMelee | normal |
| grandManoeuvre | La Grande Manoeuvre | tactic | 1 | [] | yes | grandManoeuvre, max 4 | move {options [{4, no battle}], leader 4} | normal |
| rally | Rally | tactic | 1 | [] | no | dice rally | NO_MODS | normal |
| shortSupply | Short Supply | tactic | 1 | [] | no | shortSupply | NO_MODS | normal |

`text`: one original sentence per card paraphrasing RR §12.1–§12.2 (no rulebook wording).

**`src/engine/setup.ts`** (scenario data → state; complete in this task).

```ts
export interface SideSetup { army: string; nation: Nation; commander: string; cards: number }
export interface UnitSetup { side: Side; key: RowKey; r: number; c: number; square?: SquareSlot; blocks?: number }  // blocks: starting strength (1..row blocks), which is also maxBlocks
export interface LeaderSetup { side: Side; name: string; r: number; c: number }
export type TerrainName = 'plain' | 'hill' | 'forest' | 'rugged' | 'town' | 'windmill' | 'fortress' | 'river' | 'fieldworks' | 'sandQuarry';
export interface TerrainSetup { r: number; c: number; t: TerrainName; on?: 'plain' | 'hill'; sides?: HexDir[]; crossing?: 'bridge' | 'ford'; art?: string }
export type RiverRule = 'impassable' | 'fordable' | 'fordableNoStop' | 'brook';
export type ObjectiveSetup =
  | { kind: 'tempHex'; side: Side; hex: [number, number]; timing?: 'turnStart'; banners?: number; text?: string }
  | { kind: 'tempGroup'; side: Side; hexes: [number, number][]; timing?: 'turnStart'; banners: number; text?: string }
  | { kind: 'exit'; side: Side; hex: [number, number]; banners?: number; leadersScore?: boolean; retreatOff?: boolean; text?: string }
  | { kind: 'killWeight'; side: Side; enemyArm: Arm; first: number; later: number };
export type SideRuleSetup = SideRuleDef;
export interface UnitOverride { key: RowKey; set: Partial<Pick<UnitStats, 'blocks' | 'move' | 'retreat' | 'flagIgnore' | 'sabreHits'>> }
export interface ScenarioSetup {
  id: string; name: string; top: SideSetup; bottom: SideSetup; first: Side; banners: number;
  terrain: TerrainSetup[]; rivers?: RiverRule; units: UnitSetup[]; leaders: LeaderSetup[];
  objectives?: ObjectiveSetup[]; sideRules?: SideRuleSetup[]; unitOverrides?: UnitOverride[];
}
export function createGame(setup: ScenarioSetup, seed: number): GameState;   // errors end with `(${setup.id})`, original as cause
export function boardFromTerrain(list: readonly TerrainSetup[], rivers: RiverRule): Pick<GameState, 'terrain' | 'works'>;
export function newTurn(number: number): TurnState;
export function cloneState(s: GameState): GameState;   // shares terrain, works, scenario; copies the rest (squareTrack included)
```

Rules the setup applies (each one is a test in Step 1):
- Board: `plain` on every board hex, `void` off it. `fieldworks` → base terrain `on` (`plain` or `hill`, required) plus `works[h]` = mask of `sides` (≥1, each a `HexDir`). A works side facing off the board is allowed (005).
- Rivers (default `'impassable'`): a `river` hex becomes `river` / `ford` / `fordNoStop` / `brook` for `impassable` / `fordable` / `fordableNoStop` / `brook`. `crossing: 'bridge'` → `bridge` under every rule. `crossing: 'ford'` → `ford` under `impassable`, `fordNoStop` under `fordable` and `fordableNoStop`, `brook` under `brook` (RR §14 table, §14.13). `crossing` on a non-river hex is an error.
- Ids: units `u1…un` in data order, then leaders continue the same counter (`L<n+1>`…), as today.
- `unitOverrides`: `scenario.unitStats[key] = { ...UNIT_STATS[key], ...set }`; a unit's `maxBlocks = blocks = UnitSetup.blocks ?? statsOf(...).blocks` (Rally never exceeds it). `resources = {}` for both sides.
- No check of a unit's nation against `SideSetup.nation` (see Decided details).
- `setup.ts` imports only `codes, types, hex, rng, expansions, units, terrain, cards`; never `objectives`, `elites` or `query`. `src/scenarios/index.ts` imports only `../engine/setup`, `../engine/expansions`, `../engine/types` and `./texts`.
- Deck: `CARD_LIST` ids shuffled with the seeded RNG; deal `top.cards` to top, then `bottom.cards` to bottom (one card at a time, top first). Then **squares at setup** (RR §14.12, R85): for each unit with `square: n` (data order), take a card uniformly at random (`randInt`) from its side's hand into `squareTrack[n − 1]`. `squareTrack` starts `[null, null, null, null]`.
- `active = first`; `turn = newTurn(1)`; `lastCard` both null; `leadersAtStart` counts leaders per side.
- Objectives resolve `[r, c]` to `HexId` with defaults: `timing 'turnStart'`, `tempHex.banners 1`, `exit.banners 1`, `leadersScore false`, `retreatOff false`, `text` `"<army> holds an objective."` / `"<army> holds the objective group."` / `"<army> {unit} exits the battlefield."`. `objState[i] = { held: false, count: 0 }`.
- Errors (message, then `(id)`): unknown unit key; unit or leader off the board; a unit on a hex not `passableFor` its arm; two units on one hex; two leaders on one hex; a leader on an enemy unit; `square` on a non-infantry unit; a square slot used twice by one side; `fieldworks` without `on` or `sides`; an unknown `HexDir`; an unknown `rivers`; objective hexes off the board; a `tempGroup` with fewer than 2 hexes; an `exit` hex not on row 0 or 8; `killWeight.enemyArm` not an `Arm`; a `sideRules` side not a `Side`; an `impetuousCavalry` key that is not a cavalry row; an override of an unknown key; `UnitSetup.blocks` outside 1..the row's blocks; `cards < 1`; `banners < 1`.

**`src/scenarios/index.ts`.** `ScenarioJson = ScenarioSetup` fields plus `year: string`, `expansion?: Expansion`, `hidden?: boolean`; any other top-level field (`grid`, `notes`) is ignored. `scenarioFromJson`, `scenariosFromFiles`, `SCENARIOS`, `scenarioById`, `ScenarioInfo` keep their shapes (`setup` is a deep copy; `options` removed from `ScenarioInfo`).

**`src/scenarios/data/000.json`** ("Drill", hidden; it exercises every terrain row the skeleton reads):

```json
{ "id": "000", "name": "Drill", "year": "1810", "hidden": true,
  "top": { "army": "British", "nation": "BR", "commander": "Hill", "cards": 5 },
  "bottom": { "army": "French", "nation": "FR", "commander": "Reynier", "cards": 5 },
  "first": "bottom", "banners": 4, "rivers": "fordable",
  "terrain": [
    { "r": 2, "c": 2, "t": "hill" }, { "r": 2, "c": 3, "t": "hill" }, { "r": 5, "c": 9, "t": "forest" }, { "r": 6, "c": 9, "t": "forest" },
    { "r": 2, "c": 9, "t": "town" }, { "r": 4, "c": 0, "t": "river" }, { "r": 4, "c": 1, "t": "river", "crossing": "bridge" },
    { "r": 4, "c": 2, "t": "river" }, { "r": 2, "c": 6, "t": "fieldworks", "on": "plain", "sides": ["SW", "SE"] } ],
  "units": [
    { "side": "top", "key": "BR/LN", "r": 2, "c": 6 }, { "side": "top", "key": "BR/LT", "r": 2, "c": 4 },
    { "side": "top", "key": "BR/FA", "r": 2, "c": 3 }, { "side": "top", "key": "BR/HC", "r": 1, "c": 8 },
    { "side": "top", "key": "BR/RI", "r": 2, "c": 9 },
    { "side": "bottom", "key": "FR/LN", "r": 6, "c": 4 }, { "side": "bottom", "key": "FR/LN", "r": 6, "c": 6 },
    { "side": "bottom", "key": "FR/LT", "r": 6, "c": 8 }, { "side": "bottom", "key": "FR/HC", "r": 7, "c": 3 },
    { "side": "bottom", "key": "FR/FA", "r": 7, "c": 6 } ],
  "leaders": [ { "side": "top", "name": "Hill", "r": 2, "c": 6 }, { "side": "bottom", "name": "Reynier", "r": 6, "c": 6 } ] }
```

- [ ] **Step 1: Write the failing tests**

`tests/engine/tables.test.ts` (header `// Rules: RR §2.2–§2.6, §4.1–§4.2, §12.1–§12.2, §14 (design/rules-reference.md)`):

```ts
const S = (k: RowKey) => UNIT_STATS[k];
it('UNIT_KEYS are the 34 rows of RR §2, exactly the keys the 15 battles use', () => {
  expect(UNIT_KEYS).toHaveLength(34);
  const used = new Set(readdirSync('design/data').filter((f) => /^0\d\d\.json$/.test(f))   // base battles only; 1xx files are Spanish
    .flatMap((f) => JSON.parse(readFileSync(`design/data/${f}`, 'utf8')).units.map((x: { key: string }) => x.key)));
  expect([...used].sort()).toEqual([...UNIT_KEYS].sort());
  expect(isRowKey('FR/LNC')).toBe(false); expect(isUnitKey('FR/LNC')).toBe(true);
});
it('blocks (RR §2.2–§2.4)', () => {
  expect(UNIT_KEYS.filter((k) => S(k).blocks === 5)).toEqual(['BR/LT', 'BR/GG']);
  expect(UNIT_KEYS.filter((k) => S(k).blocks === 3)).toEqual(['FR/FA', 'FR/HA', 'FR/GA', 'BR/RI', 'BR/LC', 'BR/HC', 'BR/GHC',
    'BR/FA', 'BR/HA', 'PT/LT', 'PT/LC', 'PT/HC', 'PT/FA', 'AL/LT', 'AL/LC', 'AL/FA']);
});
it('retreat per flag: AL/LN 2, every ML 3, others 1 (R10)', () => {
  expect(UNIT_KEYS.filter((k) => S(k).retreat.first !== 1)).toEqual(['FR/ML', 'PT/ML', 'AL/LN', 'AL/ML']);
  expect(retreatDistance(S('AL/LN'), 2)).toBe(4); expect(retreatDistance(S('FR/ML'), 2)).toBe(6); expect(retreatDistance(S('FR/LN'), 0)).toBe(0);
});
it('flags ignored: GR, YG, CU 1; OG, GG, GHC, GA 2 (RR §10.2)', () => {
  expect(UNIT_KEYS.filter((k) => S(k).flagIgnore === 1)).toEqual(['FR/GR', 'FR/YG', 'FR/CU', 'BR/GR']);
  expect(UNIT_KEYS.filter((k) => S(k).flagIgnore === 2)).toEqual(['FR/OG', 'FR/GHC', 'FR/GA', 'BR/GG', 'BR/GHC']);
});
it('every base melee row has movedPlus 0; SWI is a code with no row', () => {
  for (const k of UNIT_KEYS) { const m = S(k).melee; if (m.kind === 'blocks') expect(m.movedPlus).toBe(0); }
  expect(ARM_OF.SWI).toBe('infantry'); expect(isUnitKey('SP/SWI')).toBe(true); expect(isRowKey('SP/SWI')).toBe(false);
});
it('ML and RI score no sabre hits; only FR/CU ignores an infantry fire hit', () => {
  expect(UNIT_KEYS.filter((k) => !S(k).sabreHits)).toEqual(['FR/ML', 'BR/RI', 'PT/ML', 'AL/ML']);
  expect(UNIT_KEYS.filter((k) => S(k).ignoresInfantryFireHits)).toEqual(['FR/CU']);
});
it('moving fire rounds up for FR and BR rows, down for PT and AL rows (R5)', () => {
  for (const k of UNIT_KEYS) { const f = S(k).fire; if (f.kind === 'musket') expect(f.round).toBe(['PT', 'AL'].includes(k.slice(0, 2)) ? 'down' : 'up'); }
});
it('terrain rows (RR §4.2)', () => {
  expect(TERRAIN_STATS.town.into.melee).toEqual({ infantry: -2, cavalry: -3, artillery: -1 });
  expect(TERRAIN_STATS.windmill.into).toEqual(TERRAIN_STATS.town.into); expect(TERRAIN_STATS.fortress.out).toEqual(TERRAIN_STATS.town.out);
  expect(TERRAIN_STATS.sandQuarry.into.fire.infantry).toBe(-1); expect(TERRAIN_STATS.sandQuarry.into.melee.infantry).toBe(0); // R71
  expect(TERRAIN_STATS.ford.out.fire).toEqual({ infantry: -1, cavalry: 0, artillery: -1 });
  expect(TERRAIN_STATS.fordNoStop.stopsOnEntry).toBe(false); expect(TERRAIN_STATS.brook.stopsOnEntry).toBe(true);
  expect(TERRAIN_STATS.brook.into.melee).toEqual({ infantry: 0, cavalry: 0, artillery: 0 });
  expect(TERRAIN_STATS.town.squareAllowed).toBe(false); expect(TERRAIN_STATS.ford.squareAllowed).toBe(true); // R69
  expect(WORKS.into.melee).toEqual({ infantry: -1, cavalry: -2, artillery: 0 }); expect(WORKS.flagIgnore.cavalry).toBe(0);
});
it('the deck has 70 cards: 48 section, 22 tactic, with the RR §12 counts', () => {
  expect(CARD_LIST).toHaveLength(70);
  expect(CARD_LIST.filter((k) => CARD_DEFS[k].group === 'section')).toHaveLength(48);
  const count = (k: CardKind) => CARD_LIST.filter((x) => x === k).length;
  expect([count('probeL'), count('probeC'), count('probeR'), count('attackC'), count('scoutR'), count('assaultC')]).toEqual([4, 6, 4, 6, 2, 2]);
  expect([count('cavalryCharge'), count('elan'), count('firstStrike'), count('rally'), count('shortSupply'), count('coldSteel')]).toEqual([3, 1, 2, 1, 1, 1]);
  expect(mirrorKind('probeL')).toBe('probeR'); expect(mirrorKind('forward')).toBe('forward');
});
it('card dice by arm and tag', () => {
  const cc = CARD_DEFS.cavalryCharge.mods.melee;
  expect([cardDice(cc, S('BR/HC')), cardDice(cc, S('BR/GHC')), cardDice(cc, S('BR/HA'))]).toEqual([1, 2, 0]);
  expect(cardDice(CARD_DEFS.bombard.mods.fire, S('FR/GA'))).toBe(3);
  expect(cardDice(CARD_DEFS.bayonetCharge.mods.melee, S('BR/GG'))).toBe(1); expect(cardDice(CARD_DEFS.bayonetCharge.mods.melee, S('BR/LN'))).toBe(0);
});
```

`tests/engine/setup-validation.test.ts` (rewritten; local `setupOf`-style literal setups with id `'test'`):

```ts
it('rivers: each rule and crossing becomes its terrain row (RR §14)', () => {
  // one river hex and one 'ford' crossing per rule
  expect(board('fordable')).toEqual({ river: 'ford', ford: 'fordNoStop', bridge: 'bridge' });
  expect(board('impassable')).toEqual({ river: 'river', ford: 'ford', bridge: 'bridge' });
  expect(board('fordableNoStop')).toEqual({ river: 'fordNoStop', ford: 'fordNoStop', bridge: 'bridge' });
  expect(board('brook')).toEqual({ river: 'brook', ford: 'brook', bridge: 'bridge' });
  expect(board(undefined).river).toBe('river');
});
it('field works: base terrain from `on`, sides as a mask', () => {
  const s = createGame(withTerrain([{ r: 2, c: 0, t: 'fieldworks', on: 'hill', sides: ['SW', 'SE', 'E'] }]), 1);
  expect(s.terrain[hexId(2, 0)]).toBe('hill'); expect(s.works[hexId(2, 0)]).toBe((1 << 4) | (1 << 5) | (1 << 0));
});
it('squares at setup take random cards onto the track (R85)', () => {
  const s = createGame(withUnits([{ side: 'bottom', key: 'FR/LT', r: 3, c: 8, square: 1 }, { side: 'bottom', key: 'FR/LT', r: 3, c: 9, square: 2 }], { bottomCards: 6 }), 7);
  expect(s.players.bottom.hand).toHaveLength(4); expect(s.players.bottom.squareTrack.filter((c) => c !== null)).toHaveLength(2);
  expect(s.units.map((u) => u.square)).toEqual([1, 2]);
  expect(new Set([...s.deck, ...s.players.top.hand, ...s.players.bottom.hand, ...s.players.bottom.squareTrack.filter((c) => c !== null)]).size).toBe(70);
});
it('a starting strength below the row sets blocks and maxBlocks; resources start empty', () => {
  const s = createGame({ ...base, units: [{ side: 'top', key: 'BR/LN', r: 1, c: 1, blocks: 2 }] }, 1);
  expect([s.units[0].blocks, s.units[0].maxBlocks]).toEqual([2, 2]); expect(s.players.top.resources).toEqual({});
  expect(() => createGame({ ...base, units: [{ side: 'top', key: 'BR/LN', r: 1, c: 1, blocks: 5 }] }, 1)).toThrow(/\(test\)$/);
});
it('no nation check: a French unit may stand with the British side', () => {
  expect(() => createGame({ ...base, units: [{ side: 'top', key: 'FR/LN', r: 1, c: 1 }] }, 1)).not.toThrow();   // base.top.nation is 'BR'
});
it('unit overrides change the row for that key only', () => {
  const s = createGame({ ...base, units: [{ side: 'top', key: 'AL/LN', r: 1, c: 1 }], unitOverrides: [{ key: 'AL/LN', set: { retreat: { first: 1, then: 1 } } }] }, 1);
  expect(statsOf(s, s.units[0]).retreat.first).toBe(1); expect(UNIT_STATS['AL/LN'].retreat.first).toBe(2);
});
// one `it` per error in the list above, each asserting the thrown message ends with '(test)', e.g.
it('a unit on a river hex', () => expect(() => createGame(onRiver, 1)).toThrow(/impassable.*\(test\)$/));
it('artillery on a sand quarry', () => expect(() => createGame(gunInQuarry, 1)).toThrow(/\(test\)$/));
```

`tests/engine/codes.test.ts`: add `it('UNIT_KEYS has a row key for each nation’s units', ...)` asserting `isRowKey('AL/LN')` true, `isRowKey('SP/LN')` false.

All T1c-1 tests import module files (`src/engine/setup`, `src/engine/units`, `src/engine/terrain`, `src/engine/cards`, `src/engine/codes`, `src/engine/hex`, `src/scenarios`), never the `src/engine` index, which still loads the Ancients flow modules until T1c-2.

`tests/scenarios/loader.test.ts` (rewritten): 000 is hidden, base, has 5 units per side and 2 leaders; every key of `000.json` reaches the setup unchanged and as a copy (keep the existing walk test); `grid` and `notes` are ignored; an unknown expansion and a malformed file name the file and the scenario (keep the existing error-naming tests, re-pointed at the new format). `manifest.ts` and `checksum.ts`: `BattleManifest` per side `{ army, nation, commander, cards }`, `units: PerSide<Partial<Record<RowKey, number>>>`; the tally counts terrain rows, works sides and bridges.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/engine/tables.test.ts tests/engine/setup-validation.test.ts tests/engine/codes.test.ts tests/scenarios/loader.test.ts`
Expected: FAIL (`UNIT_KEYS`, `TERRAIN_STATS.ford`, `CARD_DEFS.bombard` and the new setup fields do not exist).

- [ ] **Step 3: Implement the contract files listed above**

`createGame` validates before building. `cloneState` copies `squareTrack`, `resources`, `turn.firstStrikes` and `turn.retreatEnds`.

- [ ] **Step 4: Run the tests and the partial type check**

Run: `npx vitest run tests/engine/tables.test.ts tests/engine/setup-validation.test.ts tests/engine/codes.test.ts tests/scenarios/loader.test.ts`
Expected: PASS.
Run: `npx tsc --noEmit -p . 2>&1 | grep -E '^src/engine/(codes|types|expansions|units|terrain|cards|setup)\.ts|^src/scenarios/|^tests/engine/(codes|tables|setup-validation)\.test\.ts|^tests/scenarios/'`
Expected: no output (other modules still fail until T1c-2).

- [ ] **Step 5: Commit**

```bash
git add src/engine/{codes,types,expansions,units,terrain,cards,setup}.ts src/scenarios tests/engine/{codes,tables,setup-validation}.test.ts tests/scenarios
git commit -m "feat(engine): Napoleonics contract: unit, terrain and card tables, scenario format, drill 000

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task T1c-2: Skeleton engine, hooks and test kits

**Model:** Sonnet. **Lane:** `p2b-t1c`.

**Files:**
- Delete: `src/engine/{elites,combat,attacks,held}.ts`
- Delete: `tests/rules/{cards,close-combat,evade-leaders,exp1-elites,exp1-hwm,exp1-terrain,exp1-units,exp2-rolling-fire,exp2-terrain,exp2-units,exp3-scaffold,findings,flags-retreat,momentum,movement,ranged,turn}.test.ts`, `tests/engine/{units-fields,terrain-stats}.test.ts`
- Create: `src/engine/{scenarioRules,dice,sight,tacticRules,combinedArms,leaders,resolve,squares,reactions,afterMelee,fire,melee,tactics}.ts`
- Rewrite: `src/engine/{rng,query,banners,objectives,retreat,movement,orders,options,decisions,casualties,phases,flow,legal,driver,index}.ts`; `cards.ts` (adds `drawCard`, `effectiveCard`, `cardForbidsBattle` with skeleton bodies; `cards.ts` may import `query.ts`)
- Rewrite: `tests/rules/helpers.ts`, `tests/rules/invariants.test.ts`, `tests/engine/{helpers.ts,rules.test.ts,soak.test.ts}`, `tests/golden/{golden.test,record}.ts`

**Interfaces:**
- Consumes: T1c-1's contract.
- Produces: the module map below (exported names are final; *stub* bodies are filled by the task named), and the test kit.

**`src/engine/rng.ts`:** `DIE_SIDES: readonly DieFace[] = ['infantry', 'infantry', 'cavalry', 'artillery', 'flag', 'sabre']` (rolled with `randInt(s, 6)`; two infantry faces, R16); `DIE_FACES: readonly DieFace[] = ['infantry', 'cavalry', 'artillery', 'flag', 'sabre']` (distinct faces, for display); `random`, `randInt`, `shuffle`, `freshSeed`, `forceDice`, `forcedDiceLeft`, `rollDie`, `rollDice` unchanged in behaviour.

**Module map.** Skeleton behaviour is what `000` needs to play to a finish; "→ Tn" names the task that completes it.

| Module | Exports (final names) | Skeleton behaviour |
|---|---|---|
| `query.ts` | `other, unitAt, leaderAt, PieceIndex, unitOn, leaderOn, unitById, leaderById, isLeaderId, pieceById, pieceHex, attachedLeader, leaderUnit, isLoneLeader, enemyUnitAdjacent, enemyCavalryAdjacent, supportCount, unitsOf, leadersOf, isEmptyHex` | as today minus traits; `supportCount(s, u)` = adjacent friendly units (squares included) + adjacent lone friendly leaders, 0 for a unit in square (→ T6a tests) |
| `scenarioRules.ts` | `sideRuleFlagIgnores(s, u): number`, `impetuous(s, u): boolean` | stubs 0 / false (→ T13) |
| `banners.ts` | `bannerTotal(s, side)`, `gainBanner(s, ctx, side, n, reason)`, `checkVictory(s, ctx, side): boolean` | total = permanent + Σ banners of held temp objectives of that side; victory at `bannersToWin` |
| `objectives.ts` | `turnStartObjectives(s, ctx, side)`, `updateHeld(s, ctx)`, `exitAllowedFrom(s, piece, hex): boolean`, `exitPiece(s, ctx, pieceId)`, `scoreKill(s, ctx, u)`, `scoreLeaderKill(s, ctx, l)` | turn start/held: nothing; exit: false; `scoreKill`/`scoreLeaderKill`: `gainBanner(enemy, 1)` (→ T13) |
| `dice.ts` | `StrikeRole = 'attack' \| 'bonus' \| 'back' \| 'firstStrike' \| 'squareFirst' \| 'escape'`, `DiceCtx { role; moved: number; declared?: boolean }`, `baseFireDice(st, blocks, distance, moved)`, `fireDice(s, u, targetHex, ctx)`, `baseMeleeDice(s, u, target, moved)`, `meleeDice(s, u, target, ctx)`, `escapeDice(s, u)`, `Scored { hits; flags; scoring: boolean[] }`, `scoreRoll(faces, kind: 'fire' \| 'melee' \| 'retireReform', by: UnitStats, target: Arm)`, `sabreKills(faces): boolean` | infantry and cavalry dice = blocks (fire range from the row, no halving), artillery from its `standing` row; scoring by arm and sabre; no type plus, card dice or cap; `terrainReduction` already called (→ T2) |
| `sight.ts` | `lineOfSight(s, from, to, opts?: { hillBattery?: boolean; at?: PieceIndex }): boolean`, `canFireAt(s, u, targetHex, at?): boolean`, `fireTargets(s, u, at?): HexId[]`, `clearSight(s, from, to): boolean` | pieces and `blocksSight` terrain and every intermediate hill block; range = `baseFireDice(...) > 0`; not when adjacent to an enemy unit; units only (→ T4) |
| `retreat.ts` | `retreatOptions(s, u, hexes): RetreatOption[]`, `leaderRetreatOptions(s, l): LeaderRetreatOption[]`, `retireReformOptions(s, u): RetreatOption[]` | unit: paths of retreat neighbours, full paths only if any, else the longest with losses (→ T6a); leader: `[]` (→ T6b); retire: `[]` (→ T8) |
| `movement.ts` | `MoveTarget { hex; path: HexId[]; stops: boolean; battle: boolean; attach: string \| null }`, `moveOptions(s, u, op): readonly MoveOption[]`, `unitMoves(s, id): MoveTarget[]`, `leaderMoves(s, id): MoveTarget[]`, `canBattleAfterMove(s, u, op): boolean`, `relocate(s, u, hex): void` (moves a unit and its attached leader; no event: callers emit theirs), `applyMove(s, ctx, pieceId, target)` | own allowance only; `canBattleAfterMove` = `op.moved === 0 ? some option has battle : some option with max ≥ moved has battle && blocks ≥ battleAfterMoveMinBlocks`; no entering units or enemy leaders; terrain via `passableFor`/`stopsOnEntry`; exit target `OFF_BOARD` when `exitAllowedFrom` and ≥1 hex left; leader 3 (→ T5) |
| `orders.ts` | `eligiblePieces(s, side, kind)`, `orderLimit(s, side, kind)`, `validateOrders(s, side, kind, pieces, single?)`, `autoOrders(s, side, kind): string[] \| null`, `fallbackActive(s, side, kind): boolean`, `newOrderedPiece(s, id, cardMods): OrderedPiece`, `sampleOrders(s, side, kind, rnd: () => number): { pieces: string[]; single?: boolean }` | `sections` rules with counts (`'command'` = `turn.command`); every other select: 0–1 unit or lone leader anywhere; `autoOrders` null; fallback false; `sampleOrders` returns a legal random answer for the card as the rules then stand (skeleton: greedy over shuffled eligible pieces, checked with `validateOrders`), refined by T11 (sections) and T12a (exact sets: Force March picks one section and orders all its infantry; Leadership lists every leader and keeps each attached unit with probability ½; La Grande Manoeuvre sometimes `single`) (→ T11, T12a) |
| `tacticRules.ts` | `validateElan(s, side, faces, ids)`, `validateRally(s, side, faces, ids)`, `shortSupplyTargets(s, side): string[]`, `shortSupplyHexes(s, unitId): HexId[]` | stubs: `'Not available.'`, `[]` (→ T12b) |
| `options.ts` | `Found`, `BattleTarget { hex; kind: 'fire' \| 'melee'; dice: number }`, `pieceMoves, movablePieces, battleTargets, battleReady, validateMove, validateBattle`, `combinedArmsCandidates(s, unit, target): string[]` | `combinedArmsCandidates` `[]` (→ T10); fire targets from `fireTargets`; melee targets = adjacent enemy units; a target only with dice ≥ 1; a piece battles once, not after a no-battle move; honours `turn.mods.noFire`/`noMelee` for `cardMods` pieces and `cardForbidsBattle` from the start (→ T6a) |
| `decisions.ts` | `Gen`, `ask`, `answerError` | complete: one case per `Decision` kind; list decisions check membership of `options`/`targets`/`cards` index; `assign` → `validateElan`/`validateRally`; `orders` → `validateOrders` |
| `combinedArms.ts` | `combinedArmsStep(s, ctx, m): Gen<string[]>` | `[]`, asks nothing (→ T10) |
| `casualties.ts` | `log, emitRoll, damage(s, ctx, u, n, reason): boolean /* eliminated */, removeUnit(s, ctx, u, reason), killLeader(s, ctx, l, reason), releaseSquare(s, ctx, u)` | `removeUnit` calls `releaseSquare`, `scoreKill`, `updateHeld`; `releaseSquare` complete (card back to the hand, `squareLeft` and `cardReturned` events, `square` cleared) |
| `leaders.ts` | `leaderCasualtyCheck(s, ctx, u, eliminated): Gen<boolean /* killed */>`, `leaderLosesUnit(s, ctx, l): Gen`, `loneLeaderMelee(s, ctx, attacker, l, m): Gen<boolean /* vacated */>` | no check (false); a leader whose unit is lost is killed (`killLeader`); lone leaders are never melee targets yet (→ T6b) |
| `resolve.ts` | `RollOutcome { hits; flags; bounce: boolean }`, `Applied { eliminated: boolean; left: boolean }`, `applyOutcome(s, ctx, target, o, attacker, reason): Gen<Applied>`, `flagIgnores(s, target, attacker, leaderOk): number` | hits → `leaderCasualtyCheck` → flags all accepted (`flagIgnores` 0) → `retreatDistance` → `retreatOptions` (asked when > 1) → losses → `leaderLosesUnit` on elimination; records `turn.retreatEnds` for non-active units (→ T6a) |
| `squares.ts` | `SQUARE_TRACK = 4`, `SQUARE_MIN_HAND = 3`, `canFormSquare(s, target, attacker, m): boolean`, `formSquare(s, ctx, u)`, `leaveSquareStep(s, ctx, side): Gen`, `squareFightsFirst(s, ctx, m): Gen<'continue' \| 'stop'>` | false / nothing / `'continue'` (→ T9) |
| `reactions.ts` | `defendOptions(s, m): DefendChoice[]`, `defenderReaction(s, ctx, m): Gen<DefendChoice>`, `resolveRetireReform(s, ctx, m): Gen<HexId \| null>`, `firstStrikeRoll(s, ctx, m): Gen<'continue' \| 'stop'>` | `['stand']`, asked only when more than one option; R&R throws `'not implemented'` (unreachable); first strike `'continue'` (→ T8, T9, T12c) |
| `afterMelee.ts` | `afterMelee(s, ctx, m, vacated): Gen<boolean /* entered the vacated hex: bonus melee allowed */>` | nothing, returns false (→ T7) |
| `fire.ts` | `fireAttack(s, ctx, firer, targetHex): Gen` | dice, `combat` + `roll` events, `scoreRoll`, Cuirassier ignore, `applyOutcome` (→ T6a) |
| `melee.ts` | `meleeAttack(s, ctx, attackerId, targetHex, role): Gen<boolean /* defender vacated */>` | see the sequence below (→ T6a) |
| `tactics.ts` | `elanStep(s, ctx, side): Gen`, `rallyStep(s, ctx, side): Gen`, `shortSupplyStep(s, ctx, side): Gen` | Élan and Rally ask an `orders` decision for 0–1 piece (`cardMods` true); Short Supply does nothing (→ T12b) |
| `phases.ts` | `cardStep`, `movePhase`, `battlePhase` | below |
| `flow.ts` | `turnFlow, drawPhase(s, ctx), gameFlow, nextTurn, continueTurn` | below |
| `legal.ts` | `Rand`, `greedyAssign`, `randomAnswer(s, d, rnd)` | complete for every kind: lists pick a random member; `orders` → `sampleOrders`; `assign` built greedily (candidates = own units and leaders) and checked with `answerError` only, so later rules need no change here |
| `driver.ts` | as today | `undoFrom` walks back over `orders` and `leaveSquare` answers to the card |

`melee.ts` sequence (the call sites later tasks rely on; T6a, T6b, T7, T9, T10, T12c edit this file in turn and keep them):

```ts
const m: MeleeCtx = { attacker, target, targetHex, role, artillery: [], reaction: null, declaredMoved: op.moved };
m.artillery = yield* combinedArmsStep(s, ctx, m);                 // T10
m.reaction = yield* defenderReaction(s, ctx, m);                   // T8 'retireReform', T9 'formSquare', T12c 'firstStrike'
if (m.reaction === 'retireReform') { const v = yield* resolveRetireReform(s, ctx, m); if (v !== null) yield* afterMelee(s, ctx, m, v); return v !== null; }
if (m.reaction === 'formSquare') formSquare(s, ctx, defender);
if ((yield* squareFightsFirst(s, ctx, m)) === 'stop') return false;   // T9
if (m.reaction === 'firstStrike' && (yield* firstStrikeRoll(s, ctx, m)) === 'stop') return false;  // T12c
// attacker's roll → applyOutcome → if the defender vacated: yield* afterMelee → else battle back (T6a)
```

`phases.ts` `cardStep`: ask `playCard`; take the card from the hand; `turn.command = hand.length + 1`; `effectiveCard`; `turn.mods = def.mods`; `turn.scout = def.draw === 'scout'`; `turn.reshuffle = def.draw === 'reshuffle'`; emit `cardPlayed`; then by `def.select.kind`: `dice` → `elanStep`/`rallyStep`; `shortSupply` → `shortSupplyStep`; `none`, or `copy` with nothing to copy → no orders; `autoOrders(...)` non-null → order those; else ask `orders` (`single` true only for `grandManoeuvre`), add one `OrderedPiece` per ordered id (`cardMods = !fallbackActive && !single`), emit `ordered`, then `yield* leaveSquareStep(s, ctx, side)`. `movePhase`: while any ordered piece `canMove`, ask `move`; `applyMove`. `battlePhase`: while `battleReady(s).length`, ask `battle`; `attack` → `fireAttack` or `meleeAttack` by the found target's kind.

`flow.ts` `turnFlow`: `turnStart` event → `turnStartObjectives` → `cardStep` → `movePhase` (skipped when nothing is ordered) → `battlePhase` → `drawPhase` → `lastCard[side] = turn.effective`, `turnsDone[side]++`, phase `done`. `drawPhase` skeleton: played card to the discard; `drawCard` once for the active side (→ T11 completes Scout, Élan, First Strike order). `drawCard`: an empty deck takes the shuffled discard (`reshuffle` event); emits `draw`. Victory is checked inside `gainBanner`; every generator returns as soon as `s.winner` is set.

**`src/engine/index.ts`:** `export *` from `codes, types, expansions, hex, rng, units, terrain, query, cards, setup, scenarioRules, banners, objectives, dice, sight, retreat, movement, orders, tacticRules, options, combinedArms, squares, legal, driver, text`; named: `answerError`, `type Gen` (decisions), `gameFlow, turnFlow, nextTurn, continueTurn, drawPhase` (flow). Later tasks never edit it; new exports of those modules flow through `export *`.

**Test kit `tests/rules/helpers.ts`** (signatures; frozen after this task). Top army French, bottom army British: the opposite of every real battle, so no test passes by an engine that assumes the British are on top.

```ts
type At<T> = Omit<T, 'r' | 'c'> & { at: [number, number] };
export type Pos = Partial<Omit<ScenarioSetup, 'top' | 'bottom' | 'units' | 'leaders' | 'terrain'>> & {
  units?: (At<Omit<UnitSetup, 'blocks'>> & { blocks?: number })[];   // kit `blocks` = strength set after the build; maxBlocks keeps the row's blocks
  leaders?: (Omit<At<LeaderSetup>, 'name'> & { name?: string })[];
  terrain?: At<TerrainSetup>[]; cards?: number; topCards?: number; bottomCards?: number;
};
export const H: (r: number, c: number) => HexId;
export function setupOf(p: Pos): ScenarioSetup;  // id 'qa'; top { army 'French', nation 'FR', commander 'T' }, bottom { 'British', 'BR', 'B' }; cards 5; first 'bottom'; banners 99
export function build(p: Pos, seed?: number): GameState;   // seed 4242; `blocks` set after the build
export function leaderId(s: GameState, i: number): string;
export function giveCard(s: GameState, side: Side, kind: CardKind): number;
export function noFirstStrike(s: GameState): void;
export function must(d: GameDriver, a: Answer): void;
export function play(s: GameState, kind: CardKind, pieces?: string[], opts?: { keepFS?: boolean; single?: boolean }): GameDriver;
export function toBattle(s: GameState, kind: CardKind, pieces: string[]): GameDriver;
export function u(d: GameDriver | GameState, id: string): Unit | undefined;
export function ev(d: GameDriver): GameEvent[];
export function combatDice(es: GameEvent[], purpose: RollPurpose, attacker?: string): number | undefined;
export function rolls(es: GameEvent[], purpose?: RollPurpose): DieFace[][];
export function pendingKind(d: GameDriver): Decision['kind'] | null;
export function n(face: DieFace, k: number): DieFace[];
export { forceDice, forcedDiceLeft };
export function turn(d: GameDriver, kind: CardKind, pieces: string[]): void;
export function endMoves(d: GameDriver): void;
export function endTurn(d: GameDriver): void;              // ends movement and battles; answers 'stand'/0/first option to anything else pending
export function passTurn(d: GameDriver, kind?: CardKind): void;  // default 'probeC', ordering nothing
export function fromTurnStart(es: GameEvent[], side: Side): GameEvent[];
export function miss(a: RowKey, b: RowKey): DieFace;       // the first arm symbol of ARMS matching neither unit's arm
export interface DuelOpts { card?: CardKind; atkBlocks?: number; defBlocks?: number; atkT?: Omit<TerrainSetup, 'r' | 'c'>; defT?: Omit<TerrainSetup, 'r' | 'c'> }
export function duel(atk: RowKey, def: RowKey, o?: DuelOpts): { attack?: number; back?: number };  // bottom atk (5,6) vs top def (4,6); card 'attackC'; every die misses; uses attack() ('stand')
export function attack(d: GameDriver, unit: string, hex: HexId, o?: { defend?: DefendChoice; guns?: string[] }): void;  // must(attack); then answers a combinedArms with select(o.guns ?? []) and a defend with o.defend ?? 'stand', each at most once
export function attackOn(atk: RowKey, def: RowKey, extra?: Pos): GameDriver;  // declares the attack, answers a combinedArms with []; returns at the defend decision or after it resolved
```

`tests/engine/helpers.ts`: `setupOf`/`state` re-export the rules kit with id `'test'` and seed 12345 (as today), plus `drive`, `replaceFirstCard`, `dropFirstStrike`. `tests/support/rng.ts` and `storage.ts` are unchanged (bit-identical).

- [ ] **Step 1: Write the failing tests**

`tests/engine/rules.test.ts` keeps today's generic sections, re-pointed at the new kit and card kinds: "hex grid" (all three tests, unchanged), "replay and undo" (replay reproduces the state; undo removes a move; no undo once the turn passed; a card goes back with its orders until a unit moves; not after movement ended), "answer validation" (a malformed answer is refused with the player's message: `{ kind: 'move' }` to `playCard` → `'Play a card from your hand.'`), "game state" (`cloneState` shares `terrain`, `works`, `scenario` and copies `players[side].squareTrack`, `turn.ordered`). Add:

```ts
it('the skeleton plays the drill battle to a finish', () => {
  const d = new GameDriver(createGame(scenarioById('000').setup, 99)); const rnd = mulberry32(5);
  for (let i = 0; i < 4000 && d.pending; i++) must(d, randomAnswer(d.state, d.pending, rnd));
  expect(d.state.winner === 'top' || d.state.winner === 'bottom').toBe(true);
});
it('melee: the attacker rolls its blocks, the surviving defender battles back', () => {
  const r = duel('BR/LN', 'FR/LN'); expect(r.attack).toBe(4); expect(r.back).toBeGreaterThan(0);   // exact battle-back dice are T2's and T6a's tests
});
```

`tests/engine/soak.test.ts`: 20 seeds of random play on `000` (10 with each side first) end with a winner within 4000 decisions and no thrown error. `tests/rules/invariants.test.ts` (header `// Rules: RR §5.3, §12 (design/rules-reference.md)`): random play on `000`, 10 seeds; after every answer, `deck + discard + both hands + both tracks + (turn.card ?? none)` holds each of the 70 ids exactly once; at every `playCard` decision, for both sides, `hand.length + filled track slots === players[side].cards`. `tests/golden/golden.test.ts`: two random-play runs of `000` with the same seed give identical event streams (as today).

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/engine tests/rules`
Expected: FAIL (modules missing or still Ancients).

- [ ] **Step 3: Write the skeleton modules, delete the Ancients modules and tests, rebuild the kits**

- [ ] **Step 4: Run the engine suites and the partial type check**

Run: `npx vitest run tests/engine tests/rules tests/scenarios tests/golden`
Expected: PASS.
Run: `npx tsc --noEmit -p . 2>&1 | grep -E '^(src/engine|src/scenarios|tests/(engine|rules|scenarios|golden|support))/'`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add -A src/engine tests/rules tests/engine tests/golden
git commit -m "feat(engine): skeleton Napoleonics engine with rule hooks; rebuilt test kits

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task T1c-3a: AI stub on the new contract

**Model:** Sonnet. **Lane:** `p2b-t1c`.

**Files:**
- Delete: `src/ai/{board,cardsense,dice,estimate,evaluate,goals,moves,ordering,planner,policies,sim,values,voice}.ts`, `tests/ai/{bots.ts,recruit-games.test.ts}`
- Rewrite: `src/ai/index.ts`; adapt `src/ai/{client,worker,personality}.ts` only as far as needed to compile
- Rewrite tests: `tests/ai/{ai.test,client-memory.test,helpers,no-ai-errors}.ts`

**Interfaces:**
- Consumes: the engine index (T1c-2): `randomAnswer`, `answerError`, `battleTargets`, `CARD_DEFS`, `Decision`, `Answer`.
- Produces (`src/ai/index.ts`; the UI's `Opponent` interface and the worker protocol are unchanged):

```ts
export type Difficulty = 'recruit' | 'tribune' | 'consul';   // renamed in Plan 4
export interface AiOptions { side: Side; difficulty: Difficulty; personality: Personality; seed?: number; budgetScale?: number; deterministic?: boolean }
export interface AiMemory { rngState: number; fallbacks?: number; last: { kind: Decision['kind']; ms: number } | null }
export function newMemory(): AiMemory;
export function isLegal(s: GameState, d: Decision, a: Answer): boolean;     // answerError(...) === null
export function chooseAnswer(state: GameState, decision: Decision, opts: AiOptions, mem: AiMemory): { answer: Answer; say?: string };
export function cardTitle(kind: CardKind): string;
export { PERSONALITIES, personalityById, personalityFor, type Personality };
```

`chooseAnswer` stub policy with the seeded `Rng` (state kept in `mem.rngState`): `battle` → the first ordered unit (id order) with a battle target attacks a random one of its targets, else `endBattle`; `ignoreFlags` → `max`; `advance` → yes; everything else → `randomAnswer(state, decision, () => rng.next())`. An illegal answer or a throw falls back to `randomAnswer` and counts `mem.fallbacks` (as today). It never reads the opponent's hand, track or the deck.

- [ ] **Step 1: Write the failing tests**

`tests/ai/ai.test.ts` keeps "never consumes dice forced by the test hook", "does not use hidden information: same decision whatever the opponent holds and the dice will be" and "AiClient falls back to in-thread decisions when Web Workers are unavailable", re-pointed at `000`, and adds:

```ts
it('the stub attacks when it can', () => {
  const s = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [5, 6] }, { side: 'top', key: 'FR/LN', at: [4, 6] }] });
  const d = toBattle(s, 'attackC', ['u1']);
  expect(chooseAnswer(d.state, d.pending!, { side: 'bottom', difficulty: 'tribune', personality: PERSONALITIES[0], seed: 1 }, newMemory()).answer).toEqual({ kind: 'attack', unit: 'u1', target: H(4, 6) });
});
it('the stub plays both sides of the drill battle to a finish with no fallback', () => { /* 2 seeds; winner set; fallbacks 0 for both memories */ });
```

`client-memory.test.ts` keeps "AiClient worker handling" (both tests) and "an AI answer replaced by the fallback"; the card-keeping tests go.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/ai`
Expected: FAIL (the Ancients AI imports deleted engine modules).

- [ ] **Step 3: Implement the stub; delete the Ancients AI**

- [ ] **Step 4: Run the suites and the partial type check**

Run: `npx vitest run tests/ai tests/engine tests/rules tests/scenarios tests/golden`
Expected: PASS.
Run: `npx tsc --noEmit -p . 2>&1 | grep -E '^(src/(engine|ai|scenarios)|tests/(ai|engine|rules|scenarios|golden|support))/'`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add -A src/ai tests/ai
git commit -m "feat(ai): seeded random AI stub on the new engine contract

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task T1c-3b: Game UI and art placeholders on the new contract

**Model:** Sonnet. **Lane:** `p2b-t1c`.

**Files:**
- Delete: `src/ui/game/diceOrders.ts`, `tests/art/{blocks,figures,kits}.test.ts`
- Create: `src/ui/game/promptSpec.ts`, `tests/ui/generic-prompts.test.ts`, `tests/art/placeholder.test.ts`
- Modify: `src/ui/game/*` (controller, prompts, uiModel, panels, GameScreen, Board, boardProps, unitText, terrainTips, objectiveText, BattleResult, TerrainTipBlock, opponent, makeOpponent), `src/ui/kit/{Dice,CardView,SectionMiniMap,BannerTrack,theme,index}.tsx/ts`, `src/ui/App.tsx` (no `GameOptions`)
- Rewrite: `src/art/{token,leader,icon,palettes,index}.ts(x)` as placeholders that import none of the Ancients figure files (`foot`, `mounted`, `machine`, `kits`, `parts`, `camel`, `chariot`, `elephant`, `exp2-parts`, `exp3-parts`; T1c-4 deletes them); `tests/art/helpers.ts`
- Rewrite tests: `tests/ui/{board-marks,terrain-tips,rematch,controller-helpers}.ts`; re-point as needed `tests/ui/{battle-result,controller-ask-ahead,identity,record,undo-card}.test.ts`

**Interfaces:**
- Consumes: the engine index; `ArmGlyph` from `src/art/nap` (import only; the art track owns the module).
- Produces:

```ts
// src/ui/game/promptSpec.ts — the pure description of the human's prompt for any decision
export interface PromptAction { key: string; label: string; answer: Answer | 'auto' }
export interface PromptSpec { title: string; text: string; actions: PromptAction[]; hexes: HexId[] }
export const DECISION_TITLES: Readonly<Record<Decision['kind'], string>>;
export function promptSpec(s: GameState, d: Decision): PromptSpec;
// src/art/token.tsx — placeholders; Plan 6B Task 7 replaces the bodies
export type Kind = 'foot' | 'mounted' | 'machine';
export function figureKind(k: UnitKey): Kind;            // by ARM_OF[codeOf(k)]
export interface UnitTokenProps { unitKey: UnitKey; nation: Nation; blocks: number; maxBlocks: number; facing: 'left' | 'right'; dimmed?: boolean }
export function UnitToken(p: UnitTokenProps): JSX.Element;   // any UnitKey renders: one simple figure per block (a primitive silhouette per Kind), the nation's base edge
export function UnitIcon(p: { unitKey: UnitKey; size: number }): JSX.Element;   // the arm glyph (ArmGlyph)
// src/art/leader.tsx
export const LEADER_ATTACH_OFFSET: { x: number; y: number };   // { x: 29, y: -28 }, as the art track's frame
export interface LeaderTokenProps { name: string; nation: Nation; attached: boolean; dimmed?: boolean }
export function LeaderToken(p: LeaderTokenProps): JSX.Element;  // a disc in the nation's colour with a name ribbon
// src/art/palettes.ts
export interface SideColors { /* the existing shape: edge, edgeShade, edgeLight, cloth, … unchanged */ }
export const BLOCK_COLORS: Readonly<Record<Nation, SideColors>>;   // FR blue, BR red, PT and AL brown, SP yellow
export function blockColors(nation: Nation): SideColors;
export const BASE_TOP: string;
```

UI rules:
- `promptSpec` covers all 18 kinds: `title` from `DECISION_TITLES`; every spec ends with `{ key: 'auto', label: 'Let the general decide', answer: 'auto' }`. Its other actions: `leaveSquare` → `yes`/`no`; `advance` → `yes` (Advance) / `no` (Stay); `defend` → one action per `options` entry, key = the choice (Stand / Retire and Reform / Form square / First Strike); `scoutKeep` → `keep0`/`keep1`, labels the two cards' titles; `breakthroughExtra` and `bonusMelee` → `decline` unless `required`, and `hexes` = the options/targets; `shortSupplyHex` → `hexes`; `shortSupplyTarget` and `combinedArms` → `hexes` of the listed units, plus `none` (`select []`) for `combinedArms`; `elan` and `rally` → **only** `auto` until Plan 4. Every non-`auto` action's answer is legal (`answerError` null).
- `prompts.tsx` `gamePrompt(c)` renders the spec: one button per action (`key` = action key; `auto` calls `controller.autoAnswer()`); the bespoke choosers stay for `playCard`, `orders`, `move`, `battle`, `retreat`, `leaderRetreat`, `ignoreFlags` (board clicks and highlights as today), with the spec's title and the `auto` button added. `SECTION_LABEL.center` is `'Centre'`.
- `controller.ts`: a log line for every event kind; an event kind without its own wording logs `"<kind>"` generically; combat descriptions by `RollPurpose`; no card-loss notice; `cardPlayed.side` may be the non-active side (a reactive First Strike). `uiModel.ts` highlights from `battleTargets` (`kind 'fire' | 'melee'`), hit chance `1/6` per die for fire, `2/6` against infantry.
- `kit/Dice.tsx`: placeholder glyphs for the five faces (`ALL_DIE_FACES = DIE_FACES`); `CardView` groups `section | tactic`; `unitText.ts` builds lines from `UNIT_STATS` (blocks, move options, melee and fire rules, retreat, flags ignored, sabres); `theme.ts` reads `blockColors(nation).cloth`.
- `Board.tsx` keeps calling the terrain painters through their current entry point; T1c-4 adapts the painters behind it. Difficulty, records and medals are unchanged; the briefing's optional-rules switch goes (no battle offers options).

- [ ] **Step 1: Write the failing tests**

`tests/ui/generic-prompts.test.ts`:

```ts
const s = createGame(scenarioById('000').setup, 1);
const SAMPLES: Decision[] = [/* one literal per Decision kind, with ids and hexes valid in `s` */];
it('every decision kind has a titled prompt with the general\'s button', () => {
  expect(new Set(SAMPLES.map((d) => d.kind)).size).toBe(18);
  for (const d of SAMPLES) { const p = promptSpec(s, d); expect(p.title.length).toBeGreaterThan(0); expect(p.actions.at(-1)).toEqual({ key: 'auto', label: 'Let the general decide', answer: 'auto' }); }
});
it('every other action is a legal answer', () => {
  for (const d of SAMPLES) for (const a of promptSpec(s, d).actions) if (a.answer !== 'auto') expect(answerError(s, d, a.answer)).toBeNull();
});
it('Élan and Rally offer only the general until Plan 4; Scout names its two cards', () => {
  expect(promptSpec(s, elan).actions.map((a) => a.key)).toEqual(['auto']); expect(promptSpec(s, rally).actions.map((a) => a.key)).toEqual(['auto']);
  expect(promptSpec(s, scout).actions.map((a) => a.label).slice(0, 2)).toEqual([CARD_DEFS[cardKind(scout.cards[0])].title, CARD_DEFS[cardKind(scout.cards[1])].title]);
});
it('autoAnswer alone plays the drill battle to a finish for the human', async () => { /* SeededOpponent from controller-helpers + controller.autoAnswer() loop: view.over, a winner */ });
```

`tests/art/placeholder.test.ts`:

```ts
it('every unit row draws a token, at full and at 1 block, with no NaN; any UnitKey renders', () => {
  for (const k of UNIT_KEYS) for (const b of [UNIT_STATS[k].blocks, 1]) {
    expect(renderToStaticMarkup(createElement(UnitToken, { unitKey: k, nation: nationOf(k), blocks: b, maxBlocks: UNIT_STATS[k].blocks, facing: 'left' }))).not.toContain('NaN');
  }
  expect(renderToStaticMarkup(createElement(UnitToken, { unitKey: 'FR/LNC', nation: 'FR', blocks: 4, maxBlocks: 4, facing: 'right' }))).not.toContain('NaN');
});
it('placeholder figures follow the arm', () => {
  expect(figureKind('BR/RI')).toBe('foot'); expect(figureKind('FR/CU')).toBe('mounted'); expect(figureKind('FR/HA')).toBe('machine'); expect(figureKind('FR/LNC')).toBe('mounted');
});
it('block colours by nation keep the side-colour shape', () => { for (const n of NATIONS) expect(Object.keys(blockColors(n)).sort()).toEqual(Object.keys(blockColors('FR')).sort()); });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/ui/generic-prompts.test.ts tests/art/placeholder.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the game UI and the art placeholders**

- [ ] **Step 4: Run exactly these suites and the partial type check**

Run: `npx vitest run tests/ui/{generic-prompts,battle-result,board-marks,controller-ask-ahead,identity,record,rematch,terrain-tips,undo-card}.test.ts tests/art/placeholder.test.ts tests/art/nap tests/ai tests/engine tests/rules tests/scenarios tests/golden tests/history`
Expected: PASS. (`tests/ui/{screens,unit-text,clean-slate,random-battle,triumphs-screens,version}.test.ts` import `src/ui/screens`, which T1c-4 rewrites; they are not run here.)
Run: `npx tsc --noEmit -p . 2>&1 | grep -E '^(src/(engine|ai|ui/game|ui/kit|scenarios)|src/art/(token|leader|icon|palettes|index)\.tsx?|src/ui/App\.tsx|tests/(ai|engine|rules|scenarios|golden|art/placeholder|ui/(generic-prompts|battle-result|board-marks|controller-ask-ahead|controller-helpers|identity|record|rematch|terrain-tips|undo-card)))'`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add -A src/ui/game src/ui/kit src/ui/App.tsx src/art/token.tsx src/art/leader.tsx src/art/icon.tsx src/art/palettes.ts src/art/index.ts tests/ui tests/art/placeholder.test.ts tests/art/helpers.ts tests/art/blocks.test.ts tests/art/figures.test.ts tests/art/kits.test.ts
git commit -m "feat(ui,art): generic decision prompts and placeholder figures on the new contract

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task T1c-4: Art clean-up, terrain painters, screens, galleries and scripts; squash-merge

**Model:** Sonnet. **Lane:** `p2b-t1c`.

**Files:**
- Delete: `src/art/{camel,chariot,elephant,exp2-parts,exp3-parts,foot,mounted,machine,kits,parts}.ts(x)` (after `grep` confirms nothing imports them), `src/ui/terrain/{ditch,sea,walls}.tsx`, `scripts/{ai-balance,ai-balance-report,ai-datagen,ai-fit,ai-review,ai-stats}.ts`
- Rename: `src/ui/terrain/rampart.tsx` → `src/ui/terrain/fieldworks.tsx` (draws the works hexsides of `GameState.works`)
- Modify: `src/ui/terrain/{BoardArt,TerrainIcon,base,hills,water,vegetation,objectives,index,palette,field}.ts(x)`, `src/ui/screens/{RulesReference,Menus,picker}.ts(x)`, `src/dev/{ArtGallery,TerrainGallery,KitGallery,HistoryGallery}.tsx` (not `FigureGallery.tsx`), `scripts/{ai-match,golden-record,lib}.ts`, `src/ui/history/HistoryDialog.tsx` (line 23 only: `blockColors(sc.setup[side].nation)`; `SideColors` keeps its shape, line 24 reads `edge` and `edgeShade`; the controller tells the history track), `CLAUDE.md` (Status: "the engine is the Napoleonics skeleton (Plan 2B T1c); rules land task by task")
- Rewrite tests: `tests/ui/{screens,unit-text,clean-slate,random-battle,triumphs-screens,version}.test.ts`

**Interfaces:**
- Consumes: T1c-3b's `UnitToken`, `LeaderToken`, `blockColors`; `UNIT_STATS`, `CARD_DEFS`, `TERRAIN_STATS`, `EXPANSIONS`.
- Produces: terrain painters for towns (town, windmill, fortress share the town painter), hills, water (river, ford, fordNoStop, brook, bridge), forests; rugged as a darkened hill; sand quarry a pale patch; Field Works hexsides. `RulesReference` renders units from `UNIT_STATS`, cards from `CARD_DEFS`, terrain from `TERRAIN_STATS` until Plan 6. `picker.ts` tabs from `EXPANSIONS` (2 tabs, both empty while `000` is the only battle). `ArtGallery` shows the placeholder token of every `UNIT_KEYS` row and a leader per nation. `scripts/ai-match.ts` plays the AI stub against itself on `000`.

- [ ] **Step 1: Rewrite the screen tests**

`tests/ui/screens.test.ts` "battle picker tabs": two tabs in box order (`The Peninsula & Waterloo`, `The Spanish Army`), the hidden drill in none; the optional-rules describes go; "dev route starts every battle" re-pointed at `000`. `unit-text.test.ts`: `unitSummary` lines for `FR/LN` mention "+1 against infantry", for `BR/RI` "range 3" and "no sabre hits", for `AL/LN` "retreats 2"; the rules reference's Units tab lists all 34 rows. `clean-slate`, `random-battle`, `triumphs-screens`, `version`: re-pointed at the new screens with assertions unchanged.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/ui/{screens,unit-text,clean-slate,random-battle,triumphs-screens,version}.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement; delete the Ancients-only art, painters and scripts**

- [ ] **Step 4: Run every check**

Run: `npm run typecheck && npm test`
Expected: clean; all green (`tests/art/nap/**` and `tests/history/**` untouched and green).
Then start the `dev` launch config; with `localStorage.setItem('ccn-muted','1')` set first, load `#/`, `#/gallery/art`, `#/gallery/terrain`, `#/gallery/kit`, `#/gallery/history`, `#/gallery/figures` and `#/play/000/bottom/tribune`; play two turns with "Let the general decide" and confirm no console errors. Record what each page shows in the report.

- [ ] **Step 5: Commit, review, squash-merge**

```bash
git add -A src/art/*.ts src/art/*.tsx src/ui/terrain src/ui/screens src/dev/ArtGallery.tsx src/dev/TerrainGallery.tsx src/dev/KitGallery.tsx src/dev/HistoryGallery.tsx scripts src/ui/history/HistoryDialog.tsx tests/ui CLAUDE.md
git commit -m "feat(art,ui): Napoleonic terrain painters and screens; Ancients art and scripts removed

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

After the Opus review of the whole branch (deletion inventory against `plan2-prep.md` §1, contract against this plan), the controller squash-merges `p2b-t1c` into `main` with the message `feat: Napoleonics engine contract and skeleton (Plan 2B T1c)` and the Co-Authored-By line.

---
## Wave 1 (parallel lanes A–F)

### Task T2: Units and dice

**Model:** Sonnet. **Lane:** A.

**Files:**
- Modify: `src/engine/dice.ts`
- Create: `tests/rules/units-dice.test.ts` (header `// Rules: RR §2.1–§2.6, §3.1, §3.2 (design/rules-reference.md)`)

**Interfaces:**
- Consumes: `UNIT_STATS`, `statsOf`, `cardDice`, `TERRAIN_STATS`, `terrainReduction` (stub until T3; 0 on open ground either way), `turn.ordered[id].cardMods`, `turn.mods`.
- Produces (bodies of the T1c-2 signatures in `dice.ts`):
  - `baseFireDice(st, blocks, distance, moved): number` — musket: `distance > range` → 0; `moved === 0` → `blocks + standing`; `moved ≥ 1` → `⌈blocks/2⌉` (`round 'up'`) or `⌊blocks/2⌋` (`'down'`) `+ moving`, and 0 stays 0 (R5, R15, R73: 2 hexes under Force March use the moving value). Artillery: `distance > range` → 0; row = `moved === 0 ? standing : moved === 1 ? moved : null` (null → 0); value `row[blocks ≥ 2 ? 'full' : 'one'][distance − 1]`. Cavalry: 0.
  - `fireDice(s, u, targetHex, ctx)` — RR §3.2 in order: base (0 → return 0, no card creates the shot); `+ cardDice(turn.mods.fire, st)` only when `ctx.role === 'attack'`, `u.side === s.active` and `turn.ordered[u.id]?.cardMods`; cap 1 when `u.square`; `+ terrainReduction(s, u, 'fire', u.hex, targetHex)`; floor 0.
  - `baseMeleeDice(s, u, target, moved)` — `blocks` rule: `u.blocks + plus + (target is a Unit with arm infantry ? vsInfantry : 0) + (moved > 0 ? movedPlus : 0)` (a lone leader never gets `vsInfantry`, [Interp R2]); artillery: `baseFireDice(st, u.blocks, 1, moved)`.
  - `meleeDice(s, u, target, ctx)` — base (for `ctx.declared` and a moved artillery cell of 0, use the standing 1-block cell, R12); card dice when `ctx.role === 'attack'`, or `'bonus'` with `turn.mods.bonusMelee`, under the same ordered/active test, and 0 when `turn.mods.lostInTown` and `TERRAIN_STATS[...].cancelsCavalryCharge` holds for `u.hex` or the target's hex; cap 1 when `u.square`, or when `u` is cavalry and the target is a unit in square (R31); terrain (none for `'escape'`); floor 0.
  - `escapeDice(s, u)` = `meleeDice(s, u, <a leader>, { role: 'escape', moved: 0 })`: type bonus and square cap, no terrain, no cards (RR §3.3).
  - `scoreRoll(faces, kind, by, target)` — fire: `face === target` hits; melee: `face === target` or (`'sabre'` and `by.sabreHits`); retireReform: only `'cavalry'` hits; flags counted for fire and melee, 0 for retireReform; `scoring[i]` marks hit faces. `sabreKills(faces)` = any `'sabre'`.

- [ ] **Step 1: Write the failing tests**

```ts
const S = (k: RowKey) => UNIT_STATS[k];
const row = (k: RowKey, moved: number) => [5, 4, 3, 2, 1].map((b) => (b > S(k).blocks ? null : baseFireDice(S(k), b, 2, moved)));
const art = (k: RowKey, b: number, moved: number) => [1, 2, 3, 4, 5].map((d) => baseFireDice(S(k), b, d, moved));
it('FR/LN, FR/GR, FR/ML: b standing, ⌈b/2⌉ moved (§2.5, R1)', () => { for (const k of ['FR/LN', 'FR/GR', 'FR/ML'] as const) { expect(row(k, 0)).toEqual([null, 4, 3, 2, 1]); expect(row(k, 1)).toEqual([null, 2, 2, 1, 1]); } });
it('FR/LT, FR/YG, FR/OG: b+1 / ⌈b/2⌉+1', () => { for (const k of ['FR/LT', 'FR/YG', 'FR/OG'] as const) { expect(row(k, 0)).toEqual([null, 5, 4, 3, 2]); expect(row(k, 1)).toEqual([null, 3, 3, 2, 2]); } });
it('BR/LN: b+1 standing, ⌈b/2⌉ moved, the +1 lost (R5, R9)', () => { expect(row('BR/LN', 0)).toEqual([null, 5, 4, 3, 2]); expect(row('BR/LN', 1)).toEqual([null, 2, 2, 1, 1]); });
it('BR/LT and BR/GG at 5 blocks: 6 standing, 4 moved', () => { for (const k of ['BR/LT', 'BR/GG'] as const) { expect(row(k, 0)).toEqual([6, 5, 4, 3, 2]); expect(row(k, 1)).toEqual([4, 3, 3, 2, 2]); } });
it('BR/RI: 4/3 at 3 blocks, range 3', () => { expect(row('BR/RI', 0)).toEqual([null, null, 4, 3, 2]); expect(row('BR/RI', 1)).toEqual([null, null, 3, 2, 2]); expect(baseFireDice(S('BR/RI'), 3, 3, 0)).toBe(4); expect(baseFireDice(S('BR/RI'), 3, 4, 0)).toBe(0); });
it('BR/GR gets the fire die (R1)', () => { expect(row('BR/GR', 0)).toEqual([null, 5, 4, 3, 2]); expect(row('BR/GR', 1)).toEqual([null, 3, 3, 2, 2]); });
it('PT and AL line and militia round down: 0 at 1 block moved (R15)', () => { for (const k of ['PT/LN', 'PT/ML', 'AL/LN', 'AL/ML'] as const) { expect(row(k, 0)).toEqual([null, 4, 3, 2, 1]); expect(row(k, 1)).toEqual([null, 2, 1, 1, 0]); } });
it('PT/LT and AL/LT: 4/2 at 3 blocks', () => { for (const k of ['PT/LT', 'AL/LT'] as const) { expect(row(k, 0)).toEqual([null, null, 4, 3, 2]); expect(row(k, 1)).toEqual([null, null, 2, 2, 1]); } });
it('infantry range 2; a move of 2 under Force March fires the moving value ([Interp R73])', () => { expect(baseFireDice(S('FR/LN'), 4, 3, 0)).toBe(0); expect(baseFireDice(S('BR/GR'), 4, 2, 2)).toBe(3); });
it('artillery by range (§2.6, R11, R12)', () => {
  expect(art('FR/FA', 3, 0)).toEqual([4, 3, 2, 1, 1]); expect(art('FR/FA', 2, 0)).toEqual([4, 3, 2, 1, 1]); expect(art('FR/FA', 1, 0)).toEqual([3, 2, 1, 1, 0]);
  expect(art('FR/GA', 3, 0)).toEqual([5, 3, 2, 1, 1]); expect(art('FR/GA', 1, 0)).toEqual([4, 2, 1, 1, 0]);
  expect(art('BR/HA', 3, 0)).toEqual([3, 2, 1, 1, 0]); expect(art('BR/HA', 1, 0)).toEqual([2, 1, 1, 0, 0]);
  expect(art('BR/HA', 3, 1)).toEqual([3, 2, 1, 0, 0]); expect(art('BR/HA', 1, 1)).toEqual([0, 0, 0, 0, 0]);
  expect(art('BR/HA', 3, 2)).toEqual([0, 0, 0, 0, 0]); expect(art('BR/FA', 3, 1)).toEqual([0, 0, 0, 0, 0]);
});
it('melee dice by type (§2.2–§2.4, R2)', () => {
  const s = build({ units: [{ side: 'bottom', key: 'FR/LN', at: [5, 6] }, { side: 'top', key: 'BR/LN', at: [4, 6] }, { side: 'top', key: 'BR/HC', at: [4, 7] }, { side: 'top', key: 'BR/FA', at: [5, 7] }], leaders: [{ side: 'top', at: [6, 6] }] });
  const fr = u(s, 'u1')!;
  expect([baseMeleeDice(s, fr, u(s, 'u2')!, 0), baseMeleeDice(s, fr, u(s, 'u3')!, 0), baseMeleeDice(s, fr, u(s, 'u4')!, 0), baseMeleeDice(s, fr, s.leaders[0], 0)]).toEqual([5, 4, 4, 4]);
});
// one-line `it`s, each built the same way, each a single expectation:
//   FR/GR 4 vs infantry 5; FR/OG 6; FR/HC 5; BR/HC 3 blocks 4; BR/LC 3 blocks 3; FR/FA 4; FR/GA 5; BR/HA standing 3, moved 1 → 3.
it('scoring (§3.1, R16, R17)', () => {
  expect(DIE_SIDES.filter((f) => f === 'infantry')).toHaveLength(2);
  expect(scoreRoll(['cavalry', 'infantry', 'sabre', 'flag'], 'fire', S('FR/LN'), 'cavalry')).toEqual({ hits: 1, flags: 1, scoring: [true, false, false, false] });
  expect(scoreRoll(['infantry', 'sabre', 'flag', 'artillery'], 'melee', S('FR/LN'), 'infantry')).toMatchObject({ hits: 2, flags: 1 });
  expect(scoreRoll(['infantry', 'sabre'], 'melee', S('FR/ML'), 'infantry').hits).toBe(1);
  expect(scoreRoll(['infantry', 'sabre'], 'melee', S('BR/RI'), 'infantry').hits).toBe(1);
  expect(scoreRoll(['cavalry', 'sabre', 'flag', 'infantry'], 'retireReform', S('BR/LN'), 'cavalry')).toMatchObject({ hits: 1, flags: 0 });
  expect(sabreKills(['sabre'])).toBe(true); expect(sabreKills(['flag', 'infantry'])).toBe(false);
});
it('Bombard adds 2 (GA 3) only to a shot the gun could make (§3.2 step 3, R59, [Interp R15])', () => {
  const at = (key: RowKey, blocks: number, target: [number, number]) => {
    const d = play(build({ units: [{ side: 'bottom', key, at: [6, 6], blocks }, { side: 'top', key: 'FR/LN', at: target }] }), 'bombard', ['u1']); endMoves(d);
    return fireDice(d.state, u(d, 'u1')!, H(...target), { role: 'attack', moved: 0 });
  };
  expect(at('BR/FA', 3, [4, 6])).toBe(5); expect(at('FR/GA', 3, [4, 6])).toBe(6); expect(at('BR/FA', 1, [1, 6])).toBe(0);
});
it('Cavalry Charge: cavalry +1, GHC +2, horse artillery nothing; never on a battle back (R60)', () => {
  // play cavalryCharge for u1 at (5,6) against FR/LN at (4,6); meleeDice role 'attack'
  // BR/HC 3 blocks → 5; BR/GHC → 6; BR/HA → 3; and meleeDice(state, BR/HC ordered, target, { role: 'back' }) → 4
});
it('Bayonet Charge: guard infantry +1 (§12.2)', () => { /* BR/GG 5 blocks vs FR/LN → 7; BR/LN 4 → 4 */ });
it('squares roll at most 1 die; cavalry against a square at most 1, cards included (§3.2 step 4, R31)', () => {
  // top FR/LT square:1 at (4,6); bottom BR/LN at (6,6), BR/HC at (5,6)
  // fireDice(top square at (6,6)) → 1; meleeDice(top square vs BR/HC) → 1; meleeDice(BR/HC vs square) → 1;
  // after play('cavalryCharge', ['u3']) (u3 = the BR/HC) still 1; meleeDice(BR/LN at (5,5) vs square) → 4
});
it('no card creates a shot from 0 base dice (R15)', () => {
  // PT/LN 1 block, Force March (the only infantry), moves 1 hex: fireDice at distance 2 → 0
});
it('escape dice: type bonus and square cap, no terrain, no cards (§3.3, R24)', () => {
  // BR/HC 3 blocks in a forest → 4; FR/LN 4 → 4; a BR/LN square → 1
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/rules/units-dice.test.ts`
Expected: FAIL (skeleton dice have no type bonus, halving, cards or cap).

- [ ] **Step 3: Implement the `dice.ts` bodies above**

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run tests/rules/units-dice.test.ts && npm test`
Expected: PASS; full suite green.

- [ ] **Step 5: Commit**

```bash
git add src/engine/dice.ts tests/rules/units-dice.test.ts
git commit -m "feat(engine): dice by unit row, artillery ranges, card additions and square caps (RR §2-§3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task T3: Terrain and Field Works

**Model:** Sonnet. **Lane:** B.

**Files:**
- Modify: `src/engine/terrain.ts`
- Create: `tests/rules/terrain.test.ts` (header `// Rules: RR §4.1–§4.4, §14.5, §14.11, §14.13 (design/rules-reference.md)`)

**Interfaces:**
- Consumes: `TERRAIN_STATS`, `WORKS`, `HILL_RELATION`, `hex.ts`.
- Produces (bodies of the stubs):
  - `worksAcross(s, worksHex, other): boolean` — some works side `i` of `worksHex` with angle(D→N_i, D→A) ≤ 30° (+1e-9), centres from the odd-r layout (`x = c + (r odd ? 0.5 : 0)`, `y = r·√3/2`) ([Interp R46]).
  - `hillRelation(s, from, to): 'uphill' | 'downhill' | 'hillToHill' | null`.
  - `terrainReduction(s, battler, kind, from, to)` = out(from) + into(to) + hill, each for `statsOf(...).arm` and `kind` (R3), where: a works hex contributes `WORKS` instead of its base row only when the battle crosses a works side (`to` is a works hex and `worksAcross(to, from)` → `WORKS.into`; `from` is a works hex and `worksAcross(from, to)` → `WORKS.out`), and a crossed works side of a **hill** works hex replaces the hill relation (R45, R79); otherwise works give nothing and the hill relation applies.
  - `worksFlagIgnore(s, target, attackerHex)` = `WORKS.flagIgnore[arm]` when the target's hex is a works hex and `worksAcross(target.hex, attackerHex)`, else 0.
  - `worksForbidSquare(s, target, attackerHex)` = same crossing test (R70).

- [ ] **Step 1: Write the failing tests**

```ts
const red = (p: Pos, kind: 'fire' | 'melee', by: string, from: [number, number], to: [number, number]) => { const s = build(p); return terrainReduction(s, u(s, by)!, kind, H(...from), H(...to)); };
// each terrain row, battling unit and target on the named hexes (other hex plain):
it('forest (§4.2)', () => { /* into fire I −1, A −1; into melee I −1, C −2, A −1; out fire I 0, A −1; out melee I 0, C −2, A −1 */ });
it('town, windmill and fortress (§4.2, R84)', () => { /* into fire −2/−1; into melee −2/−3/−1; out fire 0/−1; out melee 0/−3/−1, each of the three types */ });
it('fordable river with and without the stop, and the brook (§4.2, R47, R83)', () => { /* ford and fordNoStop: into fire 0, into melee −1 all arms, out fire −1 (I, A), out melee −1 all; brook 0 everywhere */ });
it('sand quarry, 4th-edition values (R71)', () => { /* into fire I −1, A −1; into melee I 0, C −2, A 0; out melee C −2; out fire I 0 */ });
it('hill relation, counted once (§4.2, R43)', () => { /* uphill: fire I −1, A 0; melee I −1, C −1, A 0. downhill: fire 0; melee C −1 only. hill to hill: fire I −1, A 0; melee 0 */ });
it('reductions add up (§4.3, R3, R47)', () => {
  expect(red({ units: [{ side: 'bottom', key: 'BR/HC', at: [5, 6] }, { side: 'top', key: 'FR/LN', at: [4, 6] }], terrain: [{ at: [5, 6], t: 'forest' }, { at: [4, 6], t: 'town' }] }, 'melee', 'u1', [5, 6], [4, 6])).toBe(-5);
  // infantry ford → ford melee: −2; infantry on a ford attacking across a works side into a works hex: −2 ([Interp R3])
});
const W006: Pos['terrain'] = [{ at: [2, 4], t: 'fieldworks', on: 'plain', sides: ['W', 'SW', 'SE'] }];
it('across a works hexside: the closed 60° wedge ([Interp R46])', () => {
  const s = build({ terrain: W006 });
  expect([[2, 3], [2, 2], [1, 2], [3, 2], [3, 3]].map(([r, c]) => worksAcross(s, H(2, 4), H(r, c)))).toEqual([true, true, true, true, true]);
  expect([[0, 2], [1, 3], [2, 5], [1, 4]].map(([r, c]) => worksAcross(s, H(2, 4), H(r, c)))).toEqual([false, false, false, false]);
});
it('works on open ground (§4.2, §4.4)', () => {
  // target FR/LN on (2,4): infantry fire from (2,2) −1, from (1,2) −1, from (0,2) 0; artillery fire from (2,2) 0;
  // melee from (2,3): cavalry −2, infantry −1, artillery 0; from (2,5) (open side): 0;
  // cavalry on (2,4) meleeing out to (2,3): −2; out to (2,5): 0;
  // cavalry on a hill at (2,3) meleeing across W into (2,4): −2 + downhill −1 = −3 (R3)
});
const W005: Pos['terrain'] = [{ at: [2, 0], t: 'fieldworks', on: 'hill', sides: ['SE', 'E'] }];
it('works on a hill replace the hill relation across a works side only (R45, R79, [Interp R79])', () => {
  // cavalry from a hill at (3,0) across SE into (2,0): −2; cavalry from a hill at (1,0) through the open NE side: 0;
  // infantry from plain (3,0): −1; infantry from plain (1,0): uphill −1;
  // cavalry on (2,0) out across SE to plain (3,0): −2; out through NE to plain (1,0): downhill −1
});
it('works flag-ignore for infantry and artillery across a works side only (R23)', () => {
  // FR/LN on (2,4) attacked from (2,3): 1; FR/FA there: 1; FR/HC there: 0; FR/LN attacked from (2,5): 0
});
it('no square across a works side; through an open side allowed (R70)', () => { /* worksForbidSquare from (2,3) true, from (2,5) false */ });
it('movement and battle rows of §4.1', () => {
  // stopsOnEntry true for forest, town, windmill, fortress, ford, brook, sandQuarry; false for fordNoStop, bridge, hill, plain;
  // crossing a works side stops both ways: stopsOnEntry(s, H(2,3), H(2,4)) and (H(2,4), H(2,3)) true, (H(2,5), H(2,4)) false;
  // passableFor: river and rugged false for every arm and leaders; sandQuarry false for artillery only;
  // noBattleAfterEntering: forest true for BR/LN, false for BR/LT, BR/RI, FR/YG; town true for BR/LT
});
it('dice integration: cavalry into a town, infantry battles back out of it (§3.2 step 5)', () => {
  expect(duel('BR/HC', 'FR/LN', { defT: { t: 'town' } })).toEqual({ attack: 1, back: 4 });
});
it('terrain never takes dice below 0 (§3.2 step 6)', () => {
  // BR/LC 1 block at (5,6), FR/LN in a town at (4,6): meleeDice(...) → 0
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/rules/terrain.test.ts`
Expected: FAIL (stubs return 0 / adjacency only).

- [ ] **Step 3: Implement the four stub bodies and `hillRelation`**

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run tests/rules/terrain.test.ts && npm test`
Expected: PASS; full suite green. (The integration `duel` expects `attack 1`: once T2 is in, BR/HC rolls 3+1 = 4, −3; before T2 it rolls 3 − 3 = 0 and the attack is refused, so merge T3 after T2 or rebase onto it before merging.)

- [ ] **Step 5: Commit**

```bash
git add src/engine/terrain.ts tests/rules/terrain.test.ts
git commit -m "feat(engine): terrain reductions, hill relation and Field Works hexsides (RR §4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task T4: Line of sight and range

**Model:** Sonnet. **Lane:** C.

**Files:**
- Modify: `src/engine/sight.ts`
- Create: `tests/rules/sight.test.ts` (header `// Rules: RR §8.1, §8.3, §8.4 (design/rules-reference.md)`)

**Interfaces:**
- Consumes: `hasLineOfSight`, `lineBetween` (`hex.ts`, which already treats off-board hexes as `OFF_BOARD` and blocks on them), `TERRAIN_STATS[t].blocksSight`, `isHill`, `baseFireDice`, `query.ts`.
- Produces:
  - `lineOfSight(s, from, to, opts?)` — an intermediate hex is obstructed when it holds a unit or leader, has `blocksSight` terrain, is off the board, or is a hill hex — except a hill hex of the same connected hill as both `from` and `to` when both stand on hill hexes (the plateau; a piece there still obstructs). Hill groups computed once per `terrain` array (WeakMap). Along a hexside, blocked only when both sides are obstructed (R49, R50). `hillBattery: true`: when `from` is a hill hex, the adjacent intermediate hex (the first one) is treated as unobstructed if it is not a hill and its only obstruction is a friendly unit or leader (R14).
  - `canFireAt(s, u, targetHex)` — `u` is infantry or artillery; the target hex holds an enemy **unit** (never a lone leader, R6); `distance ≥ 2`; `baseFireDice(st, u.blocks, distance, moved) > 0` with `moved` from `turn.ordered[u.id]` (0 when not ordered); no enemy unit adjacent to `u` (an adjacent lone enemy leader does not count); line of sight with `hillBattery` for artillery only.
  - `fireTargets(s, u)`: the target hexes in ascending order. `clearSight(s, from, to)` = `lineOfSight` without the hill battery (Combined Arms, R39).

- [ ] **Step 1: Write the failing tests**

```ts
it('ranges: infantry 2, rifles 3, foot artillery 5, horse artillery 4 (3 after moving), 1-block guns shorter (§8.1)', () => {
  // bottom firer at (6,6), top FR/LN at distance d on row 6−d … expectations:
  // BR/LN d2 true, d3 false; BR/RI d3 true; BR/FA d5 true; BR/FA 1 block d5 false, d4 true; BR/HA d4 true, 1 block d4 false, d3 true;
  // BR/HA ordered by probeC that moved 1 hex this turn: a target 4 hexes from its new hex false, 3 hexes true
});
it('a unit adjacent to an enemy unit may not fire at all; an adjacent lone leader does not stop it (§8.1)', () => {
  // BR/LN at (6,6), FR/LN at (4,6): fireTargets [H(4,6)]; add FR/HC at (6,7): []; instead a lone top leader at (6,7): [H(4,6)]
});
it('a lone leader is never a fire target (R6)', () => { /* top leader alone at (4,6), BR/LN at (6,6): fireTargets(...) equals [] */ });
it('pieces in between block; the target hex terrain never does (§8.3, R44)', () => {
  // BR/LN (6,5) → FR/LN (4,6): open; with a unit of either side or a lone leader on (5,5): blocked; FR/LN in a forest on (4,6): open
});
it('forest, town and rugged hill block; works, river, ford, bridge and sand quarry do not (§8.3)', () => {
  // lineOfSight(H(6,5), H(4,6)) with the terrain on (5,5): forest, town, windmill, fortress, rugged → false;
  // fieldworks (on plain, sides ['NE']), river, ford, bridge, sandQuarry → true
});
it('along a hexside it is blocked only if both sides are obstructed (R49)', () => {
  const s = (pcs: [number, number][]) => build({ units: pcs.map((at) => ({ side: 'bottom' as const, key: 'BR/LN' as const, at })) });
  expect(lineOfSight(s([[3, 5]]), H(4, 6), H(2, 6))).toBe(true); expect(lineOfSight(s([[3, 6]]), H(4, 6), H(2, 6))).toBe(true);
  expect(lineOfSight(s([[3, 5], [3, 6]]), H(4, 6), H(2, 6))).toBe(false);
});
it('the side edge obstructs ([Interp R50])', () => {
  expect(lineOfSight(build({}), H(0, 0), H(2, 0))).toBe(true);
  expect(lineOfSight(build({ units: [{ side: 'bottom', key: 'BR/LN', at: [1, 0] }] }), H(0, 0), H(2, 0))).toBe(false);
});
it('hills: onto the first hill hex, not through it; the plateau; two hills (§8.3, R49)', () => {
  const hills = (cs: number[]) => cs.map((c) => ({ at: [4, c] as [number, number], t: 'hill' as const }));
  expect(lineOfSight(build({ terrain: hills([4, 5, 6]) }), H(4, 2), H(4, 4))).toBe(true);
  expect(lineOfSight(build({ terrain: hills([4, 5, 6]) }), H(4, 3), H(4, 5))).toBe(false);
  expect(lineOfSight(build({ terrain: hills([4, 5, 6]) }), H(4, 4), H(4, 6))).toBe(true);
  expect(lineOfSight(build({ terrain: hills([4, 5, 6]), units: [{ side: 'top', key: 'FR/LN', at: [4, 5] }] }), H(4, 4), H(4, 6))).toBe(false);
  expect(lineOfSight(build({ terrain: hills([2, 4]) }), H(4, 2), H(4, 4))).toBe(true);
});
it('hill battery: artillery fires over one adjacent lower friendly piece (§8.4, [Interp R14])', () => {
  const p = (key: RowKey, extra: Pos['terrain'] = []): Pos => ({ terrain: [{ at: [4, 4], t: 'hill' }, ...extra], units: [{ side: 'bottom', key, at: [4, 4] }, { side: 'bottom', key: 'BR/LN', at: [4, 5] }, { side: 'top', key: 'FR/LN', at: [4, 7] }] });
  const can = (q: Pos) => { const s = build(q); return canFireAt(s, u(s, 'u1')!, H(4, 7)); };
  expect(can(p('BR/FA'))).toBe(true); expect(can(p('BR/RI'))).toBe(false); expect(can(p('BR/FA', [{ at: [4, 5], t: 'forest' }]))).toBe(false);
  const s = build(p('BR/FA')); expect(clearSight(s, H(4, 4), H(4, 7))).toBe(false);
});
it('a square fires only with no enemy unit adjacent (§8.1, R33)', () => { /* top FR/LT square:1 at (4,6), BR/LN at (6,6): canFireAt true; add BR/HC at (5,6): false */ });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/rules/sight.test.ts`
Expected: FAIL (skeleton: every hill blocks, no hill battery, no side-edge rule along hexsides).

- [ ] **Step 3: Implement `sight.ts`**

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run tests/rules/sight.test.ts && npm test`
Expected: PASS; full suite green. (Range expectations that depend on moving dice, e.g. the moved HA, need T2's `baseFireDice`; merge after T2 or rebase onto it.)

- [ ] **Step 5: Commit**

```bash
git add src/engine/sight.ts tests/rules/sight.test.ts
git commit -m "feat(engine): line of sight with hill plateaus, side edges and hill batteries; fire range (RR §8)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task T5: Movement

**Model:** Sonnet. **Lane:** D.

**Files:**
- Modify: `src/engine/movement.ts`
- Create: `tests/rules/movement.test.ts` (header `// Rules: RR §6.2, §7.1, §7.2 (design/rules-reference.md)`)

**Interfaces:**
- Consumes: `statsOf`, `LEADER_MOVE`, `passableFor`, `stopsOnEntry`, `noBattleAfterEntering`, `exitAllowedFrom`, `exitPiece`, `updateHeld`, `turn.mods.move`, `OrderedPiece`.
- Produces:
  - `moveOptions(s, u, op)` — `!op.cardMods` or `turn.mods.move === null` → the row's `move`; `MoveMod` → its `options` when `matches(st, only)` (or no `only`), else the row's; `'forceMarch'` → `[{max:2,battle:true}]` for a unit tagged `light`, `grenadier`, `guard`, or with an attached leader when it starts its move, else `[{max:1,battle:true},{max:2,battle:false}]` (RR §12.2, R73). `turn.mods.noMove && op.cardMods`, or the unit is in square (`u.square`), → `[{max:0,battle:true}]` (R33).
  - `canBattleAfterMove(s, u, op)` — `op.moved === 0`: some option of `moveOptions` has `battle: true` (so an unmoved La Grande Manoeuvre unit, options `[{4, no battle}]`, may not battle, R62); `op.moved ≥ 1`: some option with `max ≥ moved` and `battle`, and `u.blocks ≥ battleAfterMoveMinBlocks`; and never with `op.noBattle`. T6a's `battleTargets` uses it.
  - `unitMoves(s, id)` — breadth-first over steps ≤ the largest `max`; a step may not enter a hex with any unit, or an enemy leader, or a hex not `passableFor`; entering a lone friendly leader's hex is allowed only for a unit without a leader and ends the move there (`attach`); a unit with a leader may neither enter nor pass it (R80); `stopsOnEntry` ends the move; `battle` = `canBattleAfterMove` with `moved` = the path's length `d` (the same rule), and false after entering a hex with `noBattleAfterEntering`; `OFF_BOARD` when `exitAllowedFrom(s, u, hex)` and one more step fits and the move was not stopped. A piece moves at most once per turn: a unit with `op.moveDone` or `op.attachedThisTurn`, or a leader with `op.moveDone`, has no moves (RR §7.2).
  - `leaderMoves(s, id)` — none for a leader attached to a unit in square (R32); otherwise up to `LEADER_MOVE` (or `MoveMod.leader` with `cardMods`); passes through friendly units and lone friendly leaders; may not end on a friendly leader; may end on a friendly unit without a leader (attaches, stops); never enters an enemy unit's or enemy leader's hex; terrain stops and impassable apply (RR §7.2).
  - `relocate(s, u, hex)` — moves the unit and its attached leader; no event (callers emit `move`, `retreat`, `advance`, `shortSupply`).
  - `applyMove(s, ctx, pieceId, target)` — `relocate` (or move the leader), emit `move`; set `op.moved = path.length − 1`, `moveDone`, `stopEntered` (stop terrain, works crossing or a lone friendly leader's hex), `noBattle`; a leader ending on a friendly unit attaches (`attach` event) and sets that unit's `attachedThisTurn` if it is ordered (it is not ordered by this); `OFF_BOARD` → `exitPiece`; then `updateHeld`.

- [ ] **Step 1: Write the failing tests**

```ts
const moves = (p: Pos, id = 'u1', card: CardKind = 'probeC', pieces = [id]) => { const d = play(build(p), card, pieces); return pieceMoves(d.state, id); };
const reach = (m: MoveTarget[]) => new Map(m.map((t) => [t.hex, t.battle]));
it('allowances (§7.1)', () => {
  // bottom unit at (6,6): BR/LN reaches 6 hexes, all battle; BR/LT reaches (4,6) battle false and (5,6) battle true;
  // BR/LC reaches (3,6) battle true; BR/HC (4,6) true, not (3,6); BR/FA (5,6) battle false; BR/HA (5,6) true, (4,6) false;
  // BR/HA 1 block: (5,6) battle false (R12); a lone leader reaches (3,6)
});
it('units block; enemy leaders block units (§7.2)', () => {
  // BR/LT at (6,6) with friendly BR/LN on (5,5) and (5,6): (4,6) not reachable, (5,5)/(5,6) not targets;
  // with only a lone top leader on (5,6): (5,6) not a target, (4,6) reachable through (5,5)
});
it('a unit without a leader may enter a lone friendly leader and stops; one with a leader may not enter or pass (R80)', () => {
  // lone bottom leader on (5,6); BR/LC at (6,6): target (5,6) with stops true and attach = that leader; (4,6) reachable only through (5,5)
  // the same BR/LC with its own leader attached: (5,6) not a target; with (5,5) also held by a friendly unit, (4,6) not reachable
});
it('a lone leader passes friendly pieces, attaches to a leaderless unit, never ends on a leader or enters enemies (§7.2)', () => {
  // lone bottom leader at (6,6); friendly BR/LN on (5,6) (no leader), friendly BR/LN with a leader on (5,5), top FR/LN on (4,6):
  // (5,6) is a target with attach = that unit's id; (5,5) is not a target (a leader is there); (4,5) is reachable (he passes
  // through friendly hexes and attaches only where he ends); (4,6) is never a target
});
it('terrain stops: forest, town, windmill, fortress, ford, brook, sand quarry; not fordNoStop or bridge (§4.1, §7.2)', () => {
  // BR/LC at (6,6), the terrain on (5,6): (5,6) reachable with stops true; (4,6) still reachable round it through (5,5)
});
it('crossing a works hexside stops the move, both ways (§4.4)', () => {
  // works on (5,6) with side SE: BR/LC from (6,7) stops on (5,6); from (6,6) (open side) it moves on; leaving (5,6) to (6,7) stops there
});
it('river and rugged hill are impassable; the sand quarry is impassable to artillery only (§4.1)', () => {
  // terrain on (5,6): river → not a target for BR/LC or a lone leader; rugged → same; sandQuarry → target for BR/LN (stops), not for BR/HA
});
it('no battle after entering a forest (except light) or a town (R42)', () => { /* BR/LN into forest: battle false; BR/LT 1 hex into forest: true; BR/LT into town: false */ });
it('a leader who joins a unit stops it moving; attaching does not order it (§6.2)', () => {
  // probeC ordering a lone bottom leader at (6,6) and BR/LN at (5,6): the leader moves onto (5,6) (attach event);
  // pieceMoves(u BR/LN) is then [] while battleReady may still list it; with probeC ordering only the leader,
  // BR/LN stays unordered after he joins (turn.ordered has no entry for it)
});
it('nobody leaves the board without an exit objective (§7.2)', () => { /* top unit on row 0: no OFF_BOARD target */ });
it('each piece moves at most once per turn (§7.2)', () => { /* probeC ordering BR/LC: after it moves (6,6)→(5,6), pieceMoves('u1') equals [] while it still has allowance */ });
it('a square cannot move, and its attached leader cannot move alone (R32, R33)', () => { /* bottom BR/LN square:1 at (6,6) with a leader, ordered: pieceMoves for both [] */ });
it('an unmoved La Grande Manoeuvre unit may not battle (R62)', () => { /* grandManoeuvre ordering BR/LN at (5,6) next to FR/LN: canBattleAfterMove false; its target list from pieceMoves has battle false everywhere */ });
it('card movement (§12.2, [Interp R57] does not apply: cards order these units)', () => {
  // bayonetCharge BR/LN: (4,6) battle true; bayonetCharge BR/LT: (4,6) battle true;
  // forceMarch (the only infantry) BR/GR: (4,6) true; BR/LN without a leader: (5,6) true, (4,6) false; BR/LN with a leader: (4,6) true;
  // cavalryCharge BR/HC: (3,6) true; BR/LC: (3,6) true, not further; BR/HA: (5,6) true, (4,6) false;
  // bombard BR/FA: (3,6) battle false, and it may stay and battle; BR/HA under Bombard: (3,6) false;
  // grandManoeuvre BR/LN: (2,6) battle false; a leader under it: 4 hexes; fireAndHold BR/LN: no moves
});
it('"moved" is hexes moved this turn; a Force March unit that moved 2 fires its moving dice ([Interp R73])', () => {
  // forceMarch BR/GR moves (6,6)→(4,6): op.moved 2; fireDice at FR/LN two hexes away with moved 2 → 3
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/rules/movement.test.ts`
Expected: FAIL (no card movement, no leader rules).

- [ ] **Step 3: Implement `movement.ts`**

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run tests/rules/movement.test.ts && npm test`
Expected: PASS; full suite green. (The last test's dice value needs T2; merge after T2 or rebase onto it.)

- [ ] **Step 5: Commit**

```bash
git add src/engine/movement.ts tests/rules/movement.test.ts
git commit -m "feat(engine): movement allowances, terrain stops, leaders and card movement (RR §7)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task T11: Section cards, orders, Command and the turn

**Model:** Sonnet. **Lane:** E.

**Files:**
- Modify: `src/engine/{cards,orders,phases,flow}.ts`
- Create: `tests/rules/orders-turn.test.ts` (header `// Rules: RR §1, §5.1–§5.3, §6.1, §6.2, §12.1, §12.4, §12.5 (design/rules-reference.md)`)

**Interfaces:**
- Consumes: `sectionsOf`, `CARD_DEFS`, `mirrorKind`, `turn.command`, `squareTrack`, `attachedLeader`, `newOrderedPiece` (now in `orders.ts`).
- Produces:
  - `validateOrders(s, side, kind, pieces)` for `sections`: each id is an own unit or own leader, no duplicates; a unit id orders the unit **with** its attached leader (one order); a leader id while attached is a **detach** order (one order; his unit is then ordered only if its id is listed too, a second order); detaching only when `def.detach` (or a copied card's), never from a unit in square: a leader attached to a unit in square may be listed only together with that unit (one order each, two in all), and he can move only after the square has left (T9's `leaveSquareStep`; T5's `leaderMoves` gives him nothing while it is a square) (R32); each piece must lie in a section with orders left — the assignment of pieces to sections is a matching (a dotted-line piece may take either section's order), and the total per section ≤ its count (`'command'` = `turn.command`). Fewer pieces than allowed is fine; the rest are lost.
  - `sampleOrders(s, side, kind, rnd)` for `sections`: shuffle the eligible pieces and add each one that keeps `validateOrders` null (detaching with probability ¼ where allowed), so `randomAnswer` explores detaching.
  - `effectiveCard(s, side, cardId)`: `counterAttack` → `lastCard[other(side)]` (null → `{ kind: null }`), mirrored by `mirrorKind`; that card's `def` drives everything; `lastCard` stores effective kinds, so a copy of a copy resolves (R56).
  - `drawPhase(s, ctx)`: the played card (or nothing, for a Counter-Attack with nothing to copy, which is still the card played) to the discard; if `turn.reshuffle`: discard + deck shuffled into the deck (`reshuffle` event; square tracks untouched); then each other side draws `turn.firstStrikes[side]` cards first (R78); then the active side draws 1, or, with `turn.scout`, draws 2 (an empty deck between the draws takes the shuffled discard, Scout included), emits `scoutDrew` (no ids), asks `scoutKeep { cards }`, keeps the chosen card and discards the other (`discarded` event with its id).
  - `phases.ts`: when `eligiblePieces` is empty the `orders` decision is not asked and phases 2–4 are skipped (RR §5.2 step 1); otherwise it is asked and `[]` is a legal answer.

- [ ] **Step 1: Write the failing tests**

```ts
it('sections from each side, dotted-line hexes in two (§1)', () => {
  expect([[6, 2], [6, 4], [6, 6], [6, 8], [6, 10]].map(([r, c]) => sectionsOf(H(r, c), 'bottom'))).toEqual([['left'], ['left', 'center'], ['center'], ['center', 'right'], ['right']]);
  expect(sectionsOf(H(2, 4), 'top')).toEqual(['right', 'center']); expect(sectionsOf(H(2, 2), 'top')).toEqual(['right']);
});
const B = (cs: number[]): Pos => ({ units: cs.map((c) => ({ side: 'bottom' as const, key: 'BR/LN' as const, at: [6, c] as [number, number] })) });
const err = (p: Pos, kind: CardKind, pieces: string[]) => { const d = play(build(p), kind); return validateOrders(d.state, 'bottom', kind, pieces); };
it('Probe orders 2 in its section; a dotted-line unit counts for either (§12.1, §6.1)', () => {
  expect(err(B([2, 4, 6]), 'probeL', ['u1', 'u2'])).toBeNull(); expect(err(B([2, 4, 6]), 'probeL', ['u3'])).not.toBeNull();
  expect(err(B([2, 4, 6]), 'probeC', ['u2', 'u3'])).toBeNull(); expect(err(B([2, 4, 6, 8]), 'probeC', ['u2', 'u3', 'u4'])).not.toBeNull();
});
it('Scout 1, Attack 3, Assault up to Command (R52)', () => {
  expect(err(B([4, 5, 6, 7, 8]), 'scoutC', ['u1', 'u2'])).not.toBeNull();
  expect(err(B([4, 5, 6, 7, 8]), 'attackC', ['u1', 'u2', 'u3'])).toBeNull(); expect(err(B([4, 5, 6, 7, 8]), 'attackC', ['u1', 'u2', 'u3', 'u4'])).not.toBeNull();
  expect(err(B([4, 5, 6, 7, 8]), 'assaultC', ['u1', 'u2', 'u3', 'u4', 'u5'])).toBeNull();   // hand 5: Command 5
});
it('a square on the track lowers Command: hand of 5 with one square plays Assault for 4 (§5.3, R28, R52)', () => {
  const p: Pos = { units: [...B([4, 5, 6, 7]).units!, { side: 'bottom', key: 'BR/LN', at: [6, 8], square: 1 }] };
  const d = play(build(p), 'assaultC'); expect(d.state.turn.command).toBe(4);
  expect(validateOrders(d.state, 'bottom', 'assaultC', ['u1', 'u2', 'u3', 'u4'])).toBeNull();
  expect(validateOrders(d.state, 'bottom', 'assaultC', ['u1', 'u2', 'u3', 'u4', 'u5'])).not.toBeNull();
});
it('the four multi-section cards (§12.1)', () => {
  // coordinatedAdvance: 1 left, 2 centre, 1 right; flankAttack: 2 left, 2 right, 0 centre; forward: 2 each; reconInForce: 1 each
  // B([0, 1, 5, 6, 7, 11, 12]): u1, u2 left; u3, u4, u5 centre; u6, u7 right.
  // coordinatedAdvance ['u1','u3','u4','u6'] null, ['u1','u2','u3','u6'] refused; flankAttack ['u1','u2','u6','u7'] null, ['u3'] refused;
  // forward ['u1','u2','u3','u4','u6','u7'] null, ['u3','u4','u5'] refused; reconInForce ['u1','u3','u6'] null, ['u3','u4'] refused
});
it("the top player's Left is the bottom player's Right (§1)", () => { /* top unit at (2,10): probeL valid for the top side, probeR not */ });
it('an attached leader goes with his unit on one order; detaching costs one order (§6.2)', () => {
  // BR/LN at (6,6) with a leader, BR/LN at (6,7): probeC ['u1', 'u2'] valid (the leader moves with u1); probeC [L, 'u1'] valid (2 orders);
  // probeC [L, 'u1', 'u2'] refused (3 orders); bayonetCharge [L] refused (no detach on that card)
});
it('two leaders never share a hex; a leader attached to a square cannot detach (§6.2, R32)', () => {
  // a leader attached to a BR/LN square:1 at (6,6): probeC [L] refused, probeC ['u1'] valid, probeC [L, 'u1'] valid (two orders);
  // a second leader may not end his move on L's hex (leaderMoves excludes it)
});
it('a card that can order nothing skips to the draw (§5.2)', () => {
  // only BR/LN at (6,6) for bottom; bottom plays probeL: no orders decision; the events after cardPlayed are draw, then turnStart (top)
});
it('the turn: start, card, orders, moves, battles, draw (§5.2)', () => {
  // event kinds in order for one probeC turn: turnStart, cardPlayed, ordered, move, …, draw, turnStart
});
it('Command is fixed when the card is played (§5.3)', () => { const d = play(build(B([6])), 'probeC', ['u1']); expect(d.state.turn.command).toBe(5); });
it('draw: discard the card, draw 1; an empty deck takes the shuffled discard (§12.4)', () => {
  // after a probeC turn: bottom hand back to 5, the probeC id in s.discard; with s.deck emptied before drawPhase, the discard is shuffled in (reshuffle event) and the draw succeeds
});
it('Scout: draw 2, keep 1, discard 1 face up; even when it ordered nothing (§12.4, [Interp R51])', () => {
  // bottom plays scoutC ordering []; at the end: pending scoutKeep with 2 card ids; events include scoutDrew without ids and no card id;
  // answer choose 1 → that card in hand, the other in discard with a `discarded` event naming it; hand size 5
});
it('Scout with one card left in the deck: the discard, Scout included, becomes the deck between the draws (R51)', () => {
  // crafted state: turn.scout true, turn.card = a scout id, deck [x], discard [y, z]: scoutKeep offers x and one of y, z, scout; a reshuffle event between the draws
});
it('a Scout that discards an Élan it drew does not reshuffle (R53)', () => { /* scoutKeep offers [elan id, other]; keep the other: no reshuffle event, the Élan in the discard */ });
it('Élan reshuffle: the discard and deck are shuffled together before the draws; square-track cards stay out (R53)', () => {
  // crafted state: turn.reshuffle true, turn.card = an elan id, a bottom square card on the track: after drawPhase, discard [] , the Élan id in deck or hand, the track card unchanged
});
it('First Strike replacements are drawn before the active player draws, one per First Strike (R78)', () => {
  // crafted: active bottom, turn.firstStrikes.top = 2: draw events in order top, top, bottom
});
it('Counter-Attack (§12.5, R56)', () => {
  // first turn of the game: counterAttack orders nothing (no orders decision);
  // top played probeL last turn: bottom's counterAttack asks orders with card 'probeR', mirrored true;
  // top played scoutL: copy is scoutR and ends with scoutKeep; top played firstStrike as its turn card: copy orders nothing, normal draw;
  // top played counterAttack that copied probeC: the copy is probeC
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/rules/orders-turn.test.ts`
Expected: FAIL (no detach, no matching across sections, no Scout or First Strike draws, no copy).

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run tests/rules/orders-turn.test.ts && npm test`
Expected: PASS; full suite green.

- [ ] **Step 5: Commit**

```bash
git add src/engine/{cards,orders,phases,flow}.ts tests/rules/orders-turn.test.ts
git commit -m "feat(engine): section cards, detaching, Command, Counter-Attack and the draw phase (RR §5, §6, §12.1, §12.4-§12.5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task T13: Victory, objectives and the base battles' rules as data

**Model:** Sonnet. **Lane:** F.

**Files:**
- Modify: `src/engine/{banners,objectives,scenarioRules,setup}.ts`
- Create: `tests/rules/objectives.test.ts` (header `// Rules: RR §13.1–§13.4 (design/rules-reference.md)`), `tests/rules/scenario-rules.test.ts` (header `// Rules: RR §14, §14.1–§14.15 (design/rules-reference.md)`)

**Interfaces:**
- Consumes: `ObjectiveDef`, `SideRuleDef`, `objState`, `gainBanner`, `relocate` callers (they already call `updateHeld`).
- Produces:
  - `bannerTotal(s, side)` = permanent + Σ `banners` of temp objectives of `side` whose state is `held` (R64).
  - `turnStartObjectives(s, ctx, side)`: for each `tempHex`/`tempGroup` of `side` not held, held when units of `side` stand on its hex / every hex of its group; emit `held` with the new total, then `checkVictory` (R66).
  - `updateHeld(s, ctx)`: each held temp objective whose hex (any group hex) no longer holds a unit of its side loses it at once (`held` event); it stays lost until a later turn start of its side.
  - `exitAllowedFrom(s, piece, hex)`: an `exit` objective of the piece's side has `hex === hex`. `exitPiece(s, ctx, id)`: a unit is removed (`removed` event, `reason 'exit'`) with its attached leader and its side gains `banners` permanent banners; a leader is removed and scores nothing (`leadersScore false`) (R67).
  - `scoreKill(s, ctx, u)`: the enemy gains 1, or for a `killWeight` objective of the enemy side whose `enemyArm` is `u`'s arm, `first` for its first such kill and `later` afterwards (`objState.count`) (R65). `scoreLeaderKill`: 1.
  - `sideRuleFlagIgnores(s, u)` = Σ `flags` of `flagIgnoreOn` rules of `u.side` whose terrain is `u`'s hex terrain (R84). `impetuous(s, u)` = an `impetuousCavalry` rule of `u.side` lists `u.key` (R82).
  - Victory: `checkVictory` after every banner change, wherever it happens; one event is applied in full before the check ([Interp R64]).

- [ ] **Step 1: Write the failing tests**

`objectives.test.ts`:

```ts
it('1 banner per enemy unit eliminated; the game ends the instant the target is reached (§13.1–§13.2, R64)', () => {
  // banners 1; bottom BR/LN attacks top FR/LN 1 block, forced 'infantry' → winner 'bottom', d.pending null, a victory event last
});
it('victory can go to the non-active side during a battle back (§13.1)', () => {
  // banners 1; bottom BR/LN 1 block attacks top FR/LN; the attack misses; the battle back hits → winner 'top'
});
it('tempHex: gained at the start of its own turn, not the opponent’s (§13.3, R66)', () => {
  // objective tempHex top (2,5); top FR/LN on (2,5); first 'bottom': at bottom’s turnStart bannerTotal(top) 0; at top’s turnStart 1 (a held event)
});
it('tempHex: lost the instant the unit leaves or is eliminated; not regained until a later own turn start; never accumulates', () => {
  // top unit retreats off (2,5) on bottom's turn → bannerTotal 0 at once; another top unit moves onto it that turn → still 0; next top turn start → 1;
  // held three top turns in a row → still 1
});
it('a turn-start banner that reaches the target wins before the card (§13.3)', () => { /* banners 1: winner top at top's turnStart, no playCard asked */ });
it('a lone leader never holds an objective (R65)', () => { /* tempHex top (2,5) with only a lone top leader on it at top's turn start: bannerTotal(top) 0 */ });
it('tempGroup: every hex held → its banners; either hex empty → all lost (§13.4, 003)', () => {
  // tempGroup bottom [(6,5),(6,6)] banners 2: both held at bottom turn start → bannerTotal 2; one unit leaves → 0
});
it('exit: steps off from the hex as one hex of movement, 1 permanent banner, does not battle (§13.4, [Interp R67])', () => {
  // exit top (0,4): top FR/LC at (2,4) ordered: pieceMoves includes OFF_BOARD; after it: removed event, players.top.banners 1, no battle by it;
  // top FR/LN at (1,4): reaches (0,4) but no OFF_BOARD; top FR/FA on (0,4): OFF_BOARD; FR/FA at (1,4): none;
  // a unit whose move stopped on (0,4) (a forest there): no OFF_BOARD; a lone top leader on (0,4): may exit, banners unchanged
});
it('exit: retreats never carry a unit off; elimination on the hex gives only the ordinary banner (R67)', () => {
  // top FR/LN 2 blocks on (0,4), 1 flag → 1 block, still on (0,4); later eliminated there → players.bottom.banners 1
});
it('killWeight: first enemy infantry 1, each later one 2; other arms 1 (§13.4, R65)', () => {
  // (every attack through the kit's attack(), so a later Retire and Reform offer on FR/HC is answered 'stand')
  // killWeight bottom, enemyArm infantry, first 1, later 2: top FR/LN eliminated → bottom 1; second → 3; top FR/HC eliminated → 4; bottom units killed give top 1 each
});
it('one event is applied fully before the check ([Interp R64])', () => {
  // banners 2: top holds tempHex top (4,6) with FR/LN 1 block (bannerTotal top 1) and bottom has 1 banner; bottom eliminates FR/LN on (4,6):
  // winner 'bottom'; bannerTotal(top) 0 in the final state
});
```

`scenario-rules.test.ts`:

```ts
it('rivers per battle become terrain rows (§14 table, R47, R83)', () => {
  // build with rivers 'fordable' / 'fordableNoStop' / 'brook' / 'impassable' and crossings: s.terrain at the river hexes as in T1c-1's setup table
});
it('005 brook: stops, no reductions, squares allowed, sight open (§14.5, R83)', () => { /* TERRAIN_STATS.brook and a lineOfSight across it */ });
it('006 fortress: a unit of the named side ignores 1 flag there; the other side nothing (§14.6, R84)', () => {
  // sideRules [{ kind: 'flagIgnoreOn', side: 'top', terrain: 'fortress', flags: 1 }]: top FR/LN on a fortress → 1; bottom BR/LN on a fortress → 0; top FR/LN on a town → 0
});
it('012 squares at setup: 2 random French cards on the track, 4 in hand (§14.12, R85)', () => { /* bottomCards 6, two FR/LT square 1 and 2 */ });
it('014–015 Allied line retreats 2 per flag; Allied units are ordinary units of their side (§14.14, R10)', () => { /* statsOf AL/LN retreat 2; an AL leader attaches to a BR unit of the same side */ });
it('015 impetuous cavalry: BR/LC, BR/HC, BR/GHC of the named side, not AL/LC (§14.15, R82)', () => {
  // sideRules [{ kind: 'impetuousCavalry', side: 'bottom', keys: ['BR/LC', 'BR/HC', 'BR/GHC'] }]: impetuous true for bottom BR/HC; false for bottom AL/LC and for a top BR/HC
});
it('every battle scores the ordinary banners too (§14)', () => { /* a killWeight battle still gives 1 for a leader */ });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/rules/objectives.test.ts tests/rules/scenario-rules.test.ts`
Expected: FAIL (stubs).

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run tests/rules/objectives.test.ts tests/rules/scenario-rules.test.ts && npm test`
Expected: PASS; full suite green. (The retreat and battle-back sequences use the skeleton's melee and retreat, which T6a rewrites; T6a keeps these tests green.)

- [ ] **Step 5: Commit**

```bash
git add src/engine/{banners,objectives,scenarioRules,setup}.ts tests/rules/objectives.test.ts tests/rules/scenario-rules.test.ts
git commit -m "feat(engine): banners, temporary and exit objectives, kill weighting and side rules as data (RR §13-§14)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
## Wave 2

### Task T6a: Fire and melee core, flags and retreats

**Model:** Sonnet. **Lane:** A.

**Files:**
- Modify: `src/engine/{fire,melee,resolve,casualties,retreat,options,query}.ts`, `src/engine/phases.ts` (battle phase only)
- Create: `tests/rules/fire-melee.test.ts` (header `// Rules: RR §3.1, §8.1, §8.2, §9.1–§9.3 (design/rules-reference.md)`), `tests/rules/retreat-flags.test.ts` (header `// Rules: RR §1, §10.1, §10.2 (design/rules-reference.md)`)

**Interfaces:**
- Consumes: T2 `fireDice`, `meleeDice`, `scoreRoll`; T3 `worksFlagIgnore`; T4 `fireTargets`; T5 `canBattleAfterMove`, `relocate`; T13 `sideRuleFlagIgnores`, `scoreKill`, `updateHeld`; `cardForbidsBattle` (stub until T12a); hooks of `melee.ts`.
- Produces:
  - `battleTargets(s, id)`: an ordered unit with `!op.battled` and `canBattleAfterMove(s, u, op)` (T5), and `!cardForbidsBattle`: fire targets (`fireTargets`, unless `mods.noFire && op.cardMods`) with `fireDice ≥ 1`; melee targets = adjacent enemy units (unless `mods.noMelee && op.cardMods`) with `meleeDice ≥ 1` (R15). `validateBattle` refuses any other target with `'That unit cannot battle there.'`.
  - `fireAttack`: `combat` (purpose `fire`) and `roll` events; hits by arm, minus `ignoresInfantryFireHits` when the firer is infantry; `applyOutcome`; `op.battled = true`. No battle back (RR §8.2).
  - `meleeAttack` (attacker's part and battle back; keep every hook call): `combat` purpose `melee` (or `bonus`), roll, `applyOutcome`; defender vacated (eliminated or left) → `afterMelee`; otherwise, if it has ≥ 1 block and the attacker is in place: battle back with `meleeDice(role 'back')`, purpose `battleBack`, `applyOutcome` against the attacker (no battle back after a battle back, a retire, a First Strike or a square that fought first: those paths return earlier) (RR §9.2–§9.3).
  - `applyOutcome(s, ctx, target, o, attacker, reason)`: remove `o.hits` blocks (excess lost); leader check (hook); eliminated → `removeUnit` and the leader hook, flags ignored; else, `flags` event; unless `o.bounce`, when `flagIgnores > 0` ask `ignoreFlags { flags, max: min(flags, flagIgnores) }`; accepted flags → `retreatDistance`; `target.square` → lose 1 block per hex (no movement); else `retreatOptions(s, target, dist)`, asked when more than one, walked (`retreat` event, `relocate`, `updateHeld`), losses for hexes short; a loss from a failed retreat triggers the leader check unless one was made for this roll; when the target belongs to the non-active side, push its end hex onto `turn.retreatEnds` (Decided details).
  - `flagIgnores(s, target, attacker, leaderOk)` = (attached leader and `leaderOk` ? 1 : 0) + (`supportCount ≥ 2` and not in square ? 1 : 0) + `worksFlagIgnore(s, target, attacker.hex)` + `statsOf(target).flagIgnore` + `sideRuleFlagIgnores(s, target)` (R23).
  - `retreatOptions(s, u, hexes)`: every path of `hexes` steps, each to a retreat neighbour (`rearHexes`), never into a unit, an enemy leader, an impassable hex or off the board; a unit without a leader may end early on a lone friendly leader (attach, losses 0); one with a leader may pass a lone friendly leader but not end there (R75); if any path is full length, only full-length paths; else the longest, `losses = hexes − length` (R74). Ascending by end hex.

- [ ] **Step 1: Write the failing tests**

`fire-melee.test.ts`:

```ts
const fire = (key: RowKey, target: RowKey, faces: DieFace[], extra: Pos = {}) => {
  const d = toBattle(build({ ...extra, units: [{ side: 'bottom', key, at: [6, 6] }, { side: 'top', key: target, at: [4, 6] }, ...(extra.units ?? [])] }), 'attackC', ['u1']);
  forceDice(faces); attack(d, 'u1', H(4, 6)); return d;
};
it('fire: the matching arm symbol hits; sabres never do (§3.1, §8.2)', () => {
  const d = fire('BR/LN', 'FR/LN', ['infantry', 'sabre', 'cavalry', 'artillery', 'infantry']);
  expect(u(d, 'u2')!.blocks).toBe(2); expect(ev(d).some((e) => e.t === 'combat' && e.purpose === 'battleBack')).toBe(false);
});
it('a Cuirassier ignores 1 hit of each infantry fire, not of artillery fire (R8, R34)', () => {
  expect(u(fire('BR/LN', 'FR/CU', ['cavalry', 'cavalry', 'infantry', 'infantry', 'infantry']), 'u2')!.blocks).toBe(3);
  expect(u(fire('BR/FA', 'FR/CU', ['cavalry', 'cavalry', 'infantry']), 'u2')!.blocks).toBe(2);
});
it('hits beyond the blocks are lost; hits come before flags (§3.1)', () => {
  // FR/LN 1 block hit by ['infantry', 'flag', …]: eliminated event, no retreat event
});
it('each unit battles once per turn (§8.1)', () => { /* after its fire, battleTargets(s, 'u1') equals [] */ });
it('melee and battle back: FR/LN battles back with +1 against infantry (§9.3, R2)', () => { expect(duel('BR/LN', 'FR/LN')).toEqual({ attack: 4, back: 5 }); });
it('battle back takes no card dice (§9.3)', () => { expect(duel('BR/HC', 'FR/LN', { card: 'cavalryCharge' })).toEqual({ attack: 5, back: 4 }); });
it('a guns unit battles back with its range-1 dice', () => { expect(duel('BR/LN', 'FR/FA')).toEqual({ attack: 4, back: 4 }); });
it('a defender that failed a retreat and lost a block still battles back (R38)', () => {
  // top FR/LN at (4,6), top units on (3,5) and (3,6); the attack rolls 1 flag and misses; answer ignoreFlags count 0: FR/LN 3 blocks, battles back with 4 dice
});
it('no battle back by a defender that retreated or was eliminated (§9.3)', () => { /* one flag, a free hex: retreat event, no battleBack combat */ });
it('a defender attacked by several units battles back against each (§9.3)', () => { /* two bottom units attack (4,6) in turn: two battleBack combats */ });
it('no attack is offered with 0 dice (R15)', () => {
  // BR/LC 1 block at (5,6), FR/LN in a town at (4,6): battleTargets [] and the attack answer is refused
});
it('a gun that moved, a light unit that moved 2, a unit that entered a forest may not melee (§9.1)', () => { /* battleTargets [] in each case */ });
it('a La Grande Manoeuvre unit that did not move may not battle (R62)', () => { /* grandManoeuvre ordering BR/LN at (5,6) next to FR/LN, endMoves: battleTargets('u1') [] */ });
it('Fire and Hold bookkeeping: only retreats of the non-active side are recorded (R58)', () => { /* a bottom attacker retreats from a battle back: turn.retreatEnds []; a top defender retreats to (3,5): [H(3,5)] */ });
```

`retreat-flags.test.ts`:

```ts
const ends = (p: Pos, id: string, hexes: number) => { const s = build(p); return retreatOptions(s, u(s, id)!, hexes).map((o) => o.end); };
it('retreat neighbours: the two own-side hexes, fewer at an edge, none on the baseline (§1)', () => {
  expect(ends({ units: [{ side: 'top', key: 'FR/LN', at: [4, 5] }] }, 'u1', 1)).toEqual([H(3, 4), H(3, 5)]);
  expect(ends({ units: [{ side: 'top', key: 'FR/LN', at: [2, 0] }] }, 'u1', 1)).toEqual([H(1, 0)]);
  const s = build({ units: [{ side: 'top', key: 'FR/LN', at: [0, 6] }] }); expect(retreatOptions(s, s.units[0], 1)).toEqual([{ path: [], end: H(0, 6), losses: 1, attach: null }]);
});
it('per-flag distance: 1, AL/LN 2, ML 3 (§10.1, R10)', () => { /* one flag at a top AL/LN: retreat options of length 2; FR/ML: 3; two flags at FR/LN: 2 */ });
it('a blocked hex costs a block; the full distance must be taken when any path allows it (R74)', () => {
  // FR/LN at (4,6) with top units on (3,5) and (3,6) (they support it: answer ignoreFlags count 0), 1 flag: 3 blocks left, still on (4,6)
  // FR/ML at (4,6) with a top unit on (3,5), 1 flag: every option has losses 0 and path[0] === H(3,6)
  // FR/ML at (4,6) with top units on (2,5), (2,6), (2,7) (row 2 closed), 1 flag: options end on row 3 with losses 2
});
it('other terrain is ignored; impassable terrain blocks (§10.1, R42)', () => { /* a forest on (3,5): a 2-hex retreat passes it; rivers on (3,5) and (3,6): losses 1 */ });
it('a lone friendly leader stops a leaderless retreat; a unit with a leader passes but may not end there (R75)', () => {
  // lone top leader on (3,5): FR/LN, 2 flags: an option ends on (3,5) with losses 0 and attach = the leader id;
  // the same FR/LN with its own leader: no option ends on (3,5); options through (3,5) to row 2 exist
});
it('a square never moves: each retreat hex costs a block, ML 3 per flag (§10.1, R33)', () => { /* top FR/LT square:1, 1 flag → 3 blocks; top FR/ML square:1, 1 flag → 1 block */ });
it('no retreat carries a unit off the board, exit objective or not (R67)', () => { /* exit objective top (0,4), top FR/LN 2 blocks on (0,4), 1 flag: 1 block, still on (0,4) */ });
it('flag-ignore sources add up and are chosen flag by flag (§10.2, R22, R23)', () => {
  // fire at a top unit with 2 flags (no hits) and read the ignoreFlags decision's max:
  // FR/LN alone: no decision; FR/LN with 2 adjacent friendly units: 1; with 4: 1; with 1 unit + 1 lone friendly leader: 1;
  // FR/GR 1, FR/CU 1, FR/YG 1, FR/OG 2; FR/LN with an attached leader: 1; FR/LN on a works hex attacked across: 1, FR/HC there 0;
  // FR/LN on a fortress with sideRules flagIgnoreOn top: 1; FR/OG with a leader and 2 supporters, 3 flags: max 3 of 4 sources (min(flags, 4));
  // a square with 2 adjacent friendly units: no decision (support never counts for a square) and the square still supports others
  // answering { count: 1 } to 2 flags at FR/LN with a leader: a 1-hex retreat
});
it("an eliminated unit's flags do nothing (§3.1)", () => { /* 1 block, ['infantry', 'flag']: eliminated, no flags or retreat event */ });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/rules/fire-melee.test.ts tests/rules/retreat-flags.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run tests/rules && npm test`
Expected: PASS; full suite green (T13's victory tests included).

- [ ] **Step 5: Commit**

```bash
git add src/engine/{fire,melee,resolve,casualties,retreat,options,query,phases}.ts tests/rules/fire-melee.test.ts tests/rules/retreat-flags.test.ts
git commit -m "feat(engine): fire, melee, battle back, flags and retreats (RR §8-§10)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task T12a: Tactic cards — orders and modifiers

**Model:** Sonnet. **Lane:** B.

**Files:**
- Modify: `src/engine/{cards,orders}.ts`
- Create: `tests/rules/tactic-cards.test.ts` (header `// Rules: RR §12.2 (design/rules-reference.md)`)

**Interfaces:**
- Consumes: T2 card dice, T3 terrain (Cavalry Charge in a town, across works), T5 card movement, T11 `validateOrders` for sections, `turn.retreatEnds` (recorded by `applyOutcome` from T1c-2 on).
- Produces:
  - `validateOrders` for `kinds` (≤ `max` own units matching; with `notAdjacentToEnemy`, none adjacent to an enemy unit), `sectionAll` (the pieces are exactly the matching units of one section, a dotted-line unit counting in both), `leaders` (every own leader; a listed unit must have an attached leader that is listed, meaning he stays attached; a leader whose unit is not listed detaches), `grandManoeuvre` (≤ `max` units or leaders, none in square; with `single`, exactly one unit, which may be a square).
  - `fallbackActive(s, side, kind)` = `kinds`, `sectionAll` or `leaders` with no matching piece of the side **on the board** (ineligible ones count, [Interp R57]); then exactly one unit (never a lone leader) of the player's choice, `cardMods` false.
  - `autoOrders(s, side, 'coldSteel')` = every own unit adjacent to an enemy unit when the card is played (lone leaders excluded) (R61); `null` for other kinds.
  - `cardForbidsBattle(s, op, u)`: Fire and Hold and some hex of `turn.retreatEnds` is adjacent to `u` → true, whether or not the unit that retreated is still there (R58; `retreatEnds` holds only non-active retreats); Cold Steel and `u` no longer adjacent to an enemy unit → true (R61).
  - `sampleOrders` for every tactic select: `kinds` (up to `max` random matching units, all not adjacent where required), `sectionAll` (a random section that has matching units; all of them), `leaders` (every leader; each attached unit kept with probability ½), `grandManoeuvre` (`single` with probability ¼, else up to 4 non-square pieces), and the fallback (one random unit) when `fallbackActive`.

- [ ] **Step 1: Write the failing tests**

```ts
it('Bayonet Charge: up to 4 infantry, no fire, Guard infantry +1 in melee (§12.2)', () => {
  // 5 bottom infantry: 4 valid, 5 refused, a cavalry unit refused; after ordering BR/LN at (6,6) with FR/LN 2 hexes away: battleTargets has no fire target;
  // BR/GG 5 blocks adjacent to FR/LN: meleeDice 7
});
it('Bayonet Charge with no infantry on the board orders 1 unit with no bonus ([Interp R57])', () => {
  // bottom BR/FA only: orders ['u1'] valid; op.cardMods false; it may fire (BR/FA at (6,6), FR/LN at (4,6): a fire target with 3 dice)
});
it('Bombard: up to 4 guns; move up to 3 and no battle, or stay and battle with +2 (GA +3) (R59)', () => { /* 5 bottom guns: 4 valid, 5 refused; the BR/FA ordered moves (6,6)→(5,6): battleTargets [] ; one that stays fires FR/LN at 2 hexes with 5 dice */ });
it('Cavalry Charge: up to 4 cavalry and/or horse artillery; bonus lost into or out of a town, kept across works (R60)', () => {
  // 3 cavalry + 1 BR/HA valid; BR/LN refused;
  // BR/HC 3 blocks into FR/LN in a town: meleeDice 1 (4 − 3, no +1); across works into a works hex: 3 (4 + 1 − 2); BR/HC in a town attacking out: 1
});
it('Fire and Hold: up to 4 infantry/artillery not adjacent to an enemy unit; +1 fire; no move (R58)', () => {
  // BR/LN adjacent to FR/LN refused; BR/LN at (6,6) 2 hexes from FR/LN: fireDice 6; pieceMoves []
});
it('Fire and Hold: an enemy that retreated next to the unit stops its fire and melee, even once it is gone (R58)', () => {
  // fireAndHold ordering bottom u1 BR/LN (6,6), u2 BR/LN (2,6), u3 BR/FA in range; top X FR/LN 2 blocks at (4,6):
  // u1 fires, one flag: X retreats to (3,5) or (3,6) (both next to u2): battleTargets('u2') [];
  // u3 then fires at X and eliminates it: battleTargets('u2') still []
});
it('Fire and Hold with every infantry and gun adjacent orders nothing: no fallback ([Interp R57])', () => { /* orders ['u1'] refused; [] valid */ });
it('Force March: all infantry of one section (§12.2)', () => {
  // bottom infantry at (6,2), (6,4), (6,6): ['u1','u2'] valid (left), ['u2','u3'] valid (centre), ['u1'] refused, ['u1','u2','u3'] refused
});
it('Give Them the Cold Steel orders every unit adjacent to an enemy unit, no move, no fire, +1 melee (R61)', () => {
  // bottom BR/LN at (5,6) next to FR/LN (4,6), BR/LT at (6,2), lone bottom leader at (5,7): no orders decision; ordered ['u1'];
  // pieceMoves(u1) []; meleeDice(u1 vs FR/LN) 5
});
it('Cold Steel: a unit no longer adjacent when its turn comes cannot battle (R61)', () => {
  // bottom u1 BR/LN (5,6) and u2 BR/LN (5,5), both next to top FR/LN 1 block at (4,6) only: u1 eliminates it and declines the advance:
  // battleTargets('u2') []
});
it('Leadership orders every leader and the units they stay with: +1 in each battle (R20)', () => {
  // bottom leader attached to BR/LN at (5,6), lone bottom leader at (6,2): pieces must list both leaders; [L1, L2, 'u1'] valid; meleeDice(u1) 5;
  // [L1, L2] valid: L1 detaches, u1 not ordered; with no leaders: 1 unit, cardMods false
});
it('La Grande Manoeuvre: up to 4 units or leaders, not squares, 4 hexes no battle; or 1 unit under its own rules (R62)', () => {
  // a square refused in the group; ['u_square'] with single: true valid; single unit BR/LN: moves 1 and may battle (cardMods false)
});
it('a copied card\'s fallback works as the original\'s (R57)', () => { /* top played bayonetCharge; bottom has no infantry: its counterAttack orders 1 unit with cardMods false */ });
it('randomAnswer gives a legal orders answer for every card kind (sampleOrders)', () => {
  // for each CardKind with an orders decision, on a 000 state and on a state with no infantry, no artillery and no leaders:
  // giveCard, play it, then 20 randomAnswer(d.state, d.pending, rnd) orders answers each pass answerError
});
it('card dice never apply on the opponent\'s turn (§12.2)', () => { /* the unit ordered by Leadership battles back on the next turn with its plain dice */ });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/rules/tactic-cards.test.ts`
Expected: FAIL (skeleton orders 0–1 piece for every tactic card).

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run tests/rules/tactic-cards.test.ts && npm test`
Expected: PASS; full suite green (T2's and T5's single-unit card tests stay valid under the real rules).

- [ ] **Step 5: Commit**

```bash
git add src/engine/{cards,orders}.ts tests/rules/tactic-cards.test.ts
git commit -m "feat(engine): tactic card orders, fallbacks and battle limits (RR §12.2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task T12b: Élan, Rally and Short Supply

**Model:** Sonnet. **Lane:** C.

**Files:**
- Modify: `src/engine/{tactics,tacticRules}.ts`
- Create: `tests/rules/elan-rally-supply.test.ts` (header `// Rules: RR §12.2, §12.4, §12.5 (design/rules-reference.md)`)

**Interfaces:**
- Consumes: `turn.command`, `rollDice`, `newOrderedPiece` (`orders.ts`), `relocate` (`movement.ts`), `updateHeld`, `sectionsOf`, `baselineRow`, `passableFor`, T11's draw phase (reads `turn.reshuffle`).
- Produces:
  - `elanStep`: roll `turn.command` dice (`roll` purpose `elan`); ask `elan { faces }` unless every face is a sabre; `validateElan(s, side, faces, ids)`: one entry per face; an arm face may take an own unit of that arm (HA is artillery), a flag any own unit or leader (a flag-ordered attached leader detaches), a sabre `null`; no piece twice; `null` always allowed. Ordered pieces get `cardMods` true (Élan's +1, R53).
  - `rallyStep`: roll `turn.command` dice (`rally`); ask `rally { faces }` when some arm face matches an under-strength own unit; `validateRally`: arm faces on own units of that arm, each unit's `blocks + count ≤ maxBlocks`; flags and sabres `null`. Apply: `rallied` events; every unit that gained a block is ordered with `cardMods` false (R54). A rallied square is ordered and goes through `leaveSquareStep` like any other.
  - `shortSupplyStep`: ask `shortSupplyTarget { options: shortSupplyTargets }` (any unit of either side, not in square); the target's owner answers `shortSupplyHex { options: shortSupplyHexes }`: vacant hexes of the unit's own baseline in a section the unit is in (either, on a dotted line) that are `passableFor` its arm; if none, the same in the row in front; none → no question, it stays (R55). Placing: `relocate` (leader goes along), `shortSupply` event, `updateHeld`. No unit is ordered.

- [ ] **Step 1: Write the failing tests**

```ts
it('Élan: dice = Command; each arm symbol orders a unit of that arm, a flag any piece, a sabre nothing; +1 in every battle (R53)', () => {
  // bottom BR/LN (5,6) next to FR/LN, BR/HC, BR/HA, a lone leader; cards 5 → 5 dice; forceDice(['infantry','cavalry','artillery','flag','sabre']);
  // assign ['u1','u2','u3', <leader>, null] valid; ['u2', …] for the infantry face refused; meleeDice(u1 vs FR/LN) 5
});
it('an Élan flag that orders an attached leader detaches him (§6.2, R53)', () => { /* the flag face assigned to the leader attached to u1: turn.ordered has the leader and not u1; the leader may move off alone */ });
it('Élan reshuffles at the end of the turn (R53)', () => { /* after the turn: discard holds no card; the Élan id is in the deck or a hand */ });
it('Rally: arm symbols return blocks to under-strength units of that arm anywhere, never above the start (R54)', () => {
  // BR/LN 2 of 4 blocks far from any leader, BR/HC full: forceDice(['infantry','infantry','infantry','flag','sabre']);
  // ['u1','u1',null,null,null] valid; ['u1','u1','u1',…] refused (would reach 5); ['u2',…] refused (full); after: 4 blocks, u1 ordered with cardMods false
});
it('Short Supply: any unit not in square, placed by its owner on its own baseline in its section, else the row in front (R55)', () => {
  // bottom plays it; options include top FR/LN at (4,6) and bottom units, not a top square nor a lone leader;
  // choose FR/LN: pending shortSupplyHex for side top with options = vacant row-0 hexes c 4–8; answer (0,6): FR/LN on (0,6) with its leader, shortSupply event;
  // with row 0 c 4–8 all held: options are row 1 c 4–7; with those held too: no question, it stays
});
it('Short Supply: a unit on a dotted-line hex may use either section (R55)', () => { /* top FR/LN at (4,4) (top centre and right): options = vacant row-0 hexes of both sections, c 0–8 */ });
it('a rallied square is ordered like any rallied unit (§9.5, [Interp R33])', () => { /* bottom BR/LN square:1 with 3 of 4 blocks rallied: turn.ordered has it; T9 tests that it may then come out */ });
it('Short Supply orders no unit (§12.2)', () => { /* no ordered event, no move or battle decision after it */ });
it('Counter-Attack copying Élan or Rally uses the copier\'s Command; copying Élan also reshuffles (§12.5, R56)', () => { /* bottom hand 4 + 1 → 5 dice; reshuffle event at the draw */ });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/rules/elan-rally-supply.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run tests/rules/elan-rally-supply.test.ts && npm test`
Expected: PASS; full suite green.

- [ ] **Step 5: Commit**

```bash
git add src/engine/{tactics,tacticRules}.ts tests/rules/elan-rally-supply.test.ts
git commit -m "feat(engine): Élan, Rally and Short Supply (RR §12.2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Wave 3

### Task T6b: Leaders

**Model:** Sonnet. **Lane:** A.

**Files:**
- Modify: `src/engine/{leaders,retreat,options,melee,resolve}.ts`
- Create: `tests/rules/leaders.test.ts` (header `// Rules: RR §2.7, §3.3, §3.4, §11.1–§11.4 (design/rules-reference.md)`)

**Interfaces:**
- Consumes: T6a's `applyOutcome` call sites, `escapeDice`, `meleeDice`, `sabreKills`, `killLeader`, `scoreLeaderKill`.
- Produces:
  - `leaderCasualtyCheck(s, ctx, u, eliminated)`: the opponent rolls (`roll` purpose `leaderCheck`, `by null`, `against` the leader) 2 dice when the unit survives (2 sabres kill), 1 when eliminated (a sabre kills); killed → `killLeader` (banner) else `leaderSafe` (R18).
  - `leaderLosesUnit(s, ctx, l)` (after a 1-die check he survived): on his own baseline → removed, `leaderLeft`, no banner; else `leaderRetreatOptions`, asked as `leaderRetreat` (even with one option); an option `eliminated` (impassable stops him even 1 hex) → `killLeader`; an option with `escapes` walks onto each enemy unit hex in turn: that unit rolls `escapeDice` (purpose `escape`), a sabre kills; a third enemy hex eliminates him (R19, R24, R25).
  - `leaderRetreatOptions(s, l)`: paths of 1–3 steps to retreat neighbours; passes friendly units and lone friendly leaders; a hex with only a lone enemy leader is passed with no roll; may end on a friendly unit without a leader (attach) but not on a friendly leader or enemy; an enemy unit hex is entered only as an escape; stepping off his own baseline = `offBoard` (removed, no banner); the owner may choose an escape path even when a free one exists.
  - Lone leader as a melee target: `battleTargets` includes adjacent lone enemy leaders with `meleeDice ≥ 1` (lone leaders are never fire targets); `meleeAttack` against a leader calls `loneLeaderMelee`: the attacker rolls `meleeDice` (terrain and cards apply, no `vsInfantry`), purpose `melee`; a sabre kills (banner); else he must retreat via `leaderLosesUnit`'s retreat (no check); no battle back; returns vacated → `afterMelee` (R21).
  - `applyOutcome`: one check per roll; a failed-retreat loss after a survived check makes no second check, and the leader retreats from the hex where the last block was lost (R18). The attached leader's flag-ignore only when he survived the check (`leaderOk`).

- [ ] **Step 1: Write the failing tests**

```ts
it('unit hit and surviving: 2 dice, 2 sabres kill (§3.4, R18)', () => {
  // bottom BR/LN attacks top FR/LN with a leader: forceDice(['infantry','cavalry','cavalry','cavalry','sabre','sabre']) → leaderKilled, players.bottom.banners 1;
  // ['infantry','cavalry','cavalry','cavalry','sabre','flag'] → leaderSafe, leader still on (4,6); one leaderCheck roll of 2 dice
});
it('unit eliminated: 1 die; otherwise he retreats 1–3 hexes (§11.1–§11.3)', () => {
  // FR/LN 1 block with a leader, hit: leaderCheck roll of 1 die; 'cavalry' → pending leaderRetreat with options ending on rows 3, 2 and 1
});
it('on his own baseline he leaves the map: no banner (§11.2, R25)', () => { /* FR/LN 1 block with a leader on (0,6) eliminated: leaderLeft, players.bottom.banners 1 */ });
it('impassable terrain that stops him even 1 hex eliminates him: banner (§11.2)', () => { /* rivers on (3,5), (3,6): leaderKilled, bottom banners 2 */ });
it('escape: the enemy unit rolls its melee dice with type bonus and square cap, no terrain, no cards; a sabre kills (R24)', () => {
  // enemy BR/LN on (3,5) and (3,6): leaderRetreat options all carry escapes; choose one: an escape roll of 4 dice (BR/LN in a forest: still 4);
  // ['sabre', …] → leaderKilled; all 'cavalry' → he continues
});
it('a second enemy hex means a second roll; a third eliminates him (R24)', () => {
  // bottom units on (3,5),(3,6),(2,5),(2,6),(2,7),(1,4),(1,5),(1,6),(1,7): two escape rolls of misses, then leaderKilled, bottom banners 2
});
it('he may pass a lone enemy leader with no roll; he may choose an escape even with a free path (R24, R25)', () => { /* the leader's unit eliminated on (4,6); a lone bottom leader on (3,5): an option passes (3,5) to row 2 with escapes []; a BR/LN on (3,6): an option through (3,6) with escapes ['<its id>'] exists alongside the free one */ });
it('fire that takes blocks from a unit with a leader triggers the 2-dice check (§8.2, §11.1)', () => { /* BR/LN at (6,6) fires at top FR/LN with a leader: 1 infantry hit → one leaderCheck roll of 2 dice */ });
it('one check per roll; a failed retreat after a survived check makes no second check (R18)', () => {
  // FR/LN 2 blocks with a leader, (3,5) and (3,6) held by top units (answer ignoreFlags count 0): ['infantry','flag', misses…] → 1 hit, check (2 dice, no sabres), then the flag
  // cannot be taken: eliminated; exactly one leaderCheck roll; then leaderRetreat from (4,6)
});
it('a loss from a failed retreat alone triggers the check: 2 dice if it survives, 1 if eliminated (R18)', () => {
  // (3,5) and (3,6) held by top units (answer ignoreFlags count 0); the attack rolls 1 flag and no hit: FR/LN 3 blocks with a leader → 2 blocks, one leaderCheck roll of 2 dice;
  // FR/LN 1 block with a leader → eliminated by the retreat, one leaderCheck roll of 1 die
});
it('a leader killed in the check gives no flag-ignore (R18)', () => { /* 1 hit + 1 flag, both sabres in the check: no ignoreFlags decision */ });
it('lone leader in melee: normal dice, terrain and cards, no FR/LN +1; a sabre kills; else he retreats; no battle back (§3.3, R21)', () => {
  // bottom FR/LN attacks a lone top leader: combat dice 4; ['sabre', …] → leaderKilled, banner; all misses → leaderRetreat, no battleBack combat
});
it('a lone leader is never fired at and counts as one supporter (R6, R22)', () => { /* battleTargets of BR/LN two hexes from a lone leader []; supportCount with 1 unit + 1 lone leader adjacent = 2 */ });
it('leaders never add dice or hits except on Leadership (R20)', () => { expect(duel('BR/LN', 'FR/LN')).toEqual({ attack: 4, back: 5 }); /* and with a leader attached to each: the same */ });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/rules/leaders.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run tests/rules && npm test`
Expected: PASS; full suite green.

- [ ] **Step 5: Commit**

```bash
git add src/engine/{leaders,retreat,options,melee,resolve}.ts tests/rules/leaders.test.ts
git commit -m "feat(engine): leader casualty checks, retreat, escape and lone leaders (RR §11)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Wave 4 (two lanes; T8 merges after T7)

### Task T7: Take ground, breakthrough and bonus melee

**Model:** Sonnet. **Lane:** A.

**Files:**
- Modify: `src/engine/{afterMelee,melee}.ts`
- Create: `tests/rules/advance.test.ts` (header `// Rules: RR §9.7, §9.8, §14.15 (design/rules-reference.md)`)

**Interfaces:**
- Consumes: `impetuous` (T13), `stopsOnEntry`, `noBattleAfterEntering`, `op.stopEntered`, `turn.mods.bonusMelee` (T2's `meleeDice` with role `bonus`).
- Produces:
  - `afterMelee(s, ctx, m, vacated)` (only for the active side's attacker, never after fire, a battle back or First Strike): no advance for artillery, a square, or a unit with `op.stopEntered` this turn; brook entry counts as a stop, fordNoStop does not ([Interp R35], R83). Infantry: ask `advance { how: 'takeGround' }`; yes → move in (`advance` event, `relocate`, `updateHeld`). Cavalry: ask `advance { how: 'breakthrough' }` (forced, not asked, when `impetuous`); after entering, unless `stopsOnEntry(s, from, vacated)` (stop terrain or a works crossing on that step), ask `breakthroughExtra { options: enterable vacant neighbours of the vacated hex, the original hex included, required: false }`; impetuous → `options` = enterable vacant neighbours in the row next toward the enemy baseline, not the original hex, `required: true`, asked only with 2 options, taken with 1, none with 0 (R82). Returns true when the cavalry entered the vacated hex and `m.role === 'attack'`. Advancing uses `relocate` from `movement.ts`.
  - `melee.ts`: after `afterMelee` returns true and `!op.bonusMeleeDone`, unless the unit now stands on a hex with `noBattleAfterEntering`: ask `bonusMelee { targets: adjacent enemy units and lone leaders with meleeDice(role 'bonus') ≥ 1 }`; a target → `op.bonusMeleeDone = true`, `meleeAttack(..., 'bonus')`. After a successful bonus melee, `afterMelee` offers (impetuous: forces) the move into the vacated hex only: no extra hex, no further bonus (R36, R37).

- [ ] **Step 1: Write the failing tests**

```ts
const win = (atk: RowKey, extra: Pos = {}, card: CardKind = 'attackC') => {
  const d = toBattle(build({ ...extra, units: [{ side: 'bottom', key: atk, at: [5, 6] }, { side: 'top', key: 'FR/LN', at: [4, 6], blocks: 1 }, ...(extra.units ?? [])] }), card, ['u1']);
  forceDice(n('infantry', 4)); attack(d, 'u1', H(4, 6)); return d;   // 4 dice for BR/LN and plain BR/HC; a card that adds dice rolls the rest at random, which only matters for later rolls
};
it('infantry may take ground into the vacated hex (§9.7, R35)', () => { const d = win('BR/LN'); expect(d.pending).toMatchObject({ kind: 'advance', how: 'takeGround', hex: H(4, 6) }); must(d, { kind: 'yesno', yes: true }); expect(u(d, 'u1')!.hex).toBe(H(4, 6)); });
it('no advance after fire, by guns, by a battle back (§9.7)', () => { /* BR/LN fire eliminating FR/LN: no advance decision (pending battle); BR/FA meleeing FR/LN 1 block: none; a top FR/LN whose battle back eliminates the bottom attacker: none */ });
it('no advance after entering a stop hex this turn; a unit that began there and did not move may advance (R35)', () => {
  // BR/LN moved into a forest at (5,6) and could not battle anyway; BR/LT moved 1 into a forest at (5,6), attacks: no advance decision;
  // BR/LN that started in the forest at (5,6) and did not move: advance offered; entered a brook: none; entered fordNoStop: offered (R83)
});
it('take ground obeys terrain: it may enter a forest, town or ford and stops there (R35)', () => { /* FR/LN in a town at (4,6): advance offered into it */ });
it('cavalry breaks through: the vacated hex, then optionally 1 more, its original hex included (§9.8, R36)', () => {
  // BR/HC: advance yes → breakthroughExtra with options including H(5,6) and H(3,6), required false; answer H(3,6)
});
it('bonus melee only after entering the vacated hex; once per turn; against any adjacent enemy unit or lone leader (R36, R37)', () => {
  // after the extra hex to (3,6) with top FR/LN at (2,6): bonusMelee targets [H(2,6)]; declining the advance: no bonusMelee
  // a successful bonus melee: advance into its vacated hex only, no breakthroughExtra, no second bonusMelee
});
it('no bonus melee from a forest or town the breakthrough entered (R36)', () => { /* a forest (then a town) on (3,6), top FR/LN on (2,6): breakthroughExtra to (3,6), then no bonusMelee decision */ });
it('Cavalry Charge and Leadership dice apply to the bonus melee; Cold Steel\'s +1 does not (R36, R61)', () => {
  // BR/HC 3 blocks: bonus combat dice under cavalryCharge 5; under leadership 5; under coldSteel 4 (its initial melee 5)
});
it('impetuous cavalry must advance and must take the extra hex toward the enemy baseline (§14.15, R82)', () => {
  // sideRules impetuousCavalry bottom ['BR/HC']: no advance decision; with (3,5) and (3,6) vacant → breakthroughExtra { options: [H(3,5), H(3,6)], required: true };
  // with (3,6) held → it moves to (3,5) unasked; with a forest on (4,6) → no extra hex; AL/LC: the normal optional decisions
});
it('impetuous: the bonus melee stays optional; after it succeeds the unit must enter that hex, no extra hex (R82)', () => {
  // after the forced extra hex to (3,5) with top FR/LN 1 block on (2,5): bonusMelee offered and { hex: null } accepted;
  // attacking and eliminating it instead: the unit stands on (2,5) with no advance decision and no breakthroughExtra
});
it('take ground after a lone leader retreated or was killed (§11.4)', () => { /* bottom BR/LN attacks a lone top leader; he retreats: advance offered */ });
it('take ground after a destroyed unit\'s leader has retreated (§11.2)', () => { /* top FR/LN 1 block with a leader eliminated; the check misses; he retreats; then advance { how: 'takeGround', hex: H(4,6) } */ });
it('a square ordered to attack never takes ground (§9.7)', () => { /* bottom BR/LN square:1 at (5,6) eliminates FR/LN 1 block at (4,6) (square melee 1 die, forced 'infantry'): no advance decision */ });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/rules/advance.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run tests/rules && npm test`
Expected: PASS; full suite green.

- [ ] **Step 5: Commit**

```bash
git add src/engine/{afterMelee,melee}.ts tests/rules/advance.test.ts
git commit -m "feat(engine): take ground, breakthrough, bonus melee and impetuous cavalry (RR §9.7-§9.8, §14.15)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task T8: Retire and Reform

**Model:** Sonnet. **Lane:** B (branch from `main` after T6b; rebase on T7 before merging).

**Files:**
- Modify: `src/engine/{reactions,retreat}.ts`
- Create: `tests/rules/retire-reform.test.ts` (header `// Rules: RR §9.4 (design/rules-reference.md)`)

**Interfaces:**
- Consumes: the `melee.ts` R&R branch placed by T1c-2 (`resolveRetireReform` → `afterMelee`); `scoreRoll(..., 'retireReform', ...)`; `leaderCasualtyCheck`.
- Produces:
  - `defendOptions`: adds `'retireReform'` when the defender is cavalry, the attacker is infantry (a square included), `m.role` is `attack` or `bonus` (never a battle back), and `retireReformOptions` is not empty (R34).
  - `retireReformOptions(s, u)`: exactly 2 steps to retreat neighbours, each hex free of units and enemy leaders, passable (terrain that only stops movement does not block, [Interp R34]), on the board; a cavalry unit without a leader may instead retire 1 hex onto a lone friendly leader (attach); with a leader it may pass but not end on one.
  - `resolveRetireReform(s, ctx, m)`: the attacker rolls all its dice (and any Combined Arms artillery dice, T10), purpose `retireReform`; only cavalry symbols hit; no Cuirassier ignore; a hit triggers the leader check; if the cavalry survives it moves (`retire` event; asked as `retreat { reason: 'retireReform' }` when more than one path); returns the cavalry's old hex, which is vacated whether it retired or was eliminated by the roll, so the infantry may take ground.

- [ ] **Step 1: Write the failing tests**

```ts
it('offered when infantry attacks cavalry (§9.4, R34)', () => { const d = attackOn('BR/LN', 'FR/HC'); expect(d.pending).toMatchObject({ kind: 'defend', options: ['stand', 'retireReform'] }); });
it('not against artillery, cavalry, fire or a battle back (R34)', () => { /* attackOn('BR/FA','FR/HC') and ('BR/HC','FR/HC'): no retireReform option; a top FR/LN battling back at bottom cavalry: none */ });
it('the path is exactly 2 own-side steps; units, enemy leaders, impassable hexes and the edge block it; stop terrain does not ([Interp R34])', () => {
  // top FR/HC at (4,6): ends on row 2; units on (3,5) and (3,6): not offered; a forest on (3,5): still offered; FR/HC at (1,6): not offered (edge)
});
it('1 hex onto a lone friendly leader for a leaderless cavalry unit (R34)', () => { /* lone top leader on (3,5): an option ending there with attach */ });
it('a cavalry unit with a leader may retire through a lone friendly leader but not end on him (R34)', () => { /* top FR/HC with a leader, a lone top leader on (3,5): options pass (3,5) to row 2, none ends on (3,5) */ });
it('only cavalry symbols hit; then it retires and does not battle back (R34)', () => {
  // choose retireReform; forceDice(['cavalry','sabre','flag','infantry']): FR/HC 3 blocks, a retire event of 2 hexes, no battleBack combat
});
it('a hit triggers the leader check (R34)', () => { /* FR/HC with a leader, 1 cavalry hit: one leaderCheck roll of 2 dice */ });
it('the infantry may then take ground (R34)', () => { /* after the retire: advance { how: 'takeGround', hex: H(4,6) } */ });
it('a square ordered to attack cavalry: the cavalry may still retire (R34)', () => { /* bottom BR/LN square:1 attacks top FR/HC: options include retireReform */ });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/rules/retire-reform.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run to verify they pass** (after rebasing onto T7)

Run: `npx vitest run tests/rules && npm test`
Expected: PASS; full suite green.

- [ ] **Step 5: Commit**

```bash
git add src/engine/{reactions,retreat}.ts tests/rules/retire-reform.test.ts
git commit -m "feat(engine): cavalry Retire and Reform (RR §9.4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Wave 5

### Task T9: Infantry squares

**Model:** Sonnet. **Lane:** A.

**Files:**
- Modify: `src/engine/{squares,reactions,melee,resolve,phases}.ts`
- Create: `tests/rules/squares.test.ts` (header `// Rules: RR §5.3, §6.2, §6.3, §9.5, §10.3 (design/rules-reference.md)`)

**Interfaces:**
- Consumes: `worksForbidSquare` (T3), `TERRAIN_STATS[t].squareAllowed`, `enemyCavalryAdjacent`, `randInt`, `releaseSquare` (`casualties.ts`, T1c-2), `applyOutcome` (`resolve.ts`, above `squares.ts` in the layering).
- Produces:
  - `canFormSquare(s, target, attacker, m)`: target infantry, not in square; attacker cavalry; `m.role` `attack` or `bonus` (never a battle back); `hand.length ≥ SQUARE_MIN_HAND` (3) for the defender (a); its terrain `squareAllowed` (b); `!worksForbidSquare(s, target, attacker.hex)` (c); a free track slot (g). Conditions (d) battle back, (e) and (f) First Strike are enforced by the role check here and by the single `defend` decision (T12c adds `'firstStrike'` as an alternative, never alongside a formed square).
  - `defendOptions`: adds `'formSquare'` when `canFormSquare`.
  - `formSquare(s, ctx, u)`: lowest free slot; a hand card chosen with `randInt` goes to `squareTrack[slot − 1]`; `u.square = slot`; `squareFormed { id, slot }` (no card id) (R27).
  - `squareFightsFirst(s, ctx, m)`: when the defender is an infantry unit in square and the attacker is cavalry on the attacker's turn (not a battle back; the attacker is not the square): the square rolls first (`squareFirst`, `meleeDice` role `squareFirst`: capped 1, terrain after); its flags are bounce flags (`o.bounce`, never ignorable); if the cavalry is eliminated or left its hex → `'stop'` (Combined Arms artillery dice not rolled, still spent); else `'continue'`, and `melee.ts` skips the square's battle back.
  - `leaveSquareStep(s, ctx, side)` (called after the orders): each ordered own unit in square, in id order: enemy cavalry adjacent → `op.stayInSquare = true`; else ask `leaveSquare`; yes → `releaseSquare` (card back to the hand, `squareLeft`, `cardReturned`); `turn.command` unchanged ([Interp R28]); coming out is not movement.
  - A unit in square: no moves and its leader cannot move alone (T5's `moveOptions`/`leaderMoves` already handle `u.square`), no take ground or breakthrough (T7), fires only with no enemy unit adjacent (T4), retreat losses (T6a).

- [ ] **Step 1: Write the failing tests**

```ts
const cav = (extra: Pos = {}, def: RowKey = 'FR/LN') => attackOn('BR/HC', def, extra);
it('an infantry unit attacked by cavalry may form square (§9.5, R26)', () => { expect(cav().pending).toMatchObject({ kind: 'defend', options: ['stand', 'formSquare'] }); });
it('forming: a random hand card goes face down on the track; the event names no card (R27)', () => {
  // answer formSquare: top hand 4, squareTrack[0] a card id, u2.square 1; the squareFormed event has keys t, id, slot only
});
it('not with 2 or fewer cards; not on a town; not across works; not with a full track (R26 a, b, c, g)', () => {
  // topCards 2 → options ['stand']; FR/LN on a town → ['stand']; on works attacked across → ['stand'], through an open side → formSquare offered;
  // four top squares at setup (topCards 8) → ['stand']
});
it('not against a battle back (R26 d)', () => { /* bottom BR/LN attacks top FR/HC; when FR/HC battles back there is no defend decision for bottom */ });
it('the square fights first with 1 die; its flags bounce and cannot be ignored (R29, R30, §10.3)', () => {
  // formSquare, then forceDice(['flag', …]): a squareFirst roll of 1 die; the BR/HC (with a leader and 2 supporters) retreats 1 hex, no ignoreFlags decision;
  // the cavalry rolls nothing after
});
it('if the cavalry holds, it rolls at most 1 die and the square does not battle back (R29, R31)', () => {
  // squareFirst die misses: a melee combat of 1 die (BR/HC under Cavalry Charge still 1), no battleBack combat
});
it('a square already formed fights first in every later cavalry melee (R29)', () => { /* top FR/LT square:1 at setup, attacked by BR/HC: squareFirst roll, no defend decision */ });
it('infantry and artillery against a square: normal dice, then the square battles back with 1 die, ordinary flags (R29, R30)', () => { /* attackOn('BR/LN') vs a FR/LT square: melee 4 dice, battleBack 1 */ });
it('a square ordered to attack cavalry: no fight-first; the cavalry battles back with 1 die (§9.5)', () => { /* bottom BR/LN square:1 attacks top FR/HC (stand): melee 1, battleBack 1 */ });
it('a square eliminated: its card returns to the hand, the counter to the track; the enemy gains a banner (§9.5)', () => { /* cardReturned, top hand size up by 1, bottom banners 1 */ });
it('a square formed after the attack was declared may cut the cavalry to 0 dice; the melee still counts as its battle (R15)', () => {
  // BR/HC 2 blocks attacks FR/LN in a forest: declared with 3 − 2 = 1 die;
  // after the square: min(1) − 2 → 0 dice: a melee combat with dice 0, no hits, op.battled true
});
it('Command is the hand; each square lowers it; coming out in the Order phase does not raise this turn\'s Command (§5.3, R28)', () => {
  // bottom BR/LN square:1, hand 4: play assaultC → turn.command 4; leaveSquare yes → hand 4 (3 + returned card), turn.command still 4
});
it('ordered, a square may come out only with no enemy cavalry adjacent; then it fires with standing dice (§6.3, R32, R5)', () => {
  // no cavalry adjacent: leaveSquare asked; yes → squareLeft, cardReturned; its fire dice at distance 2: BR/LN standing 5;
  // FR/HC adjacent: no question, op.stayInSquare, pieceMoves [] all turn even after the cavalry leaves
});
it('a leader attached to a square cannot detach; after it comes out he may, with another order (R32)', () => { /* probeC [L, 'u1']: the square comes out (yes), then L may move */ });
it('a rallied square may come out under §6.3 ([Interp R33])', () => { /* bottom BR/LN square:1, 3 of 4 blocks, no cavalry adjacent: rally gives it a block, then leaveSquare is asked; yes → squareLeft */ });
it('La Grande Manoeuvre\'s group order cannot include a square; its single option can (R62)', () => { /* grandManoeuvre ordering a BR/LN square:1 with single: true asks leaveSquare; the group answer listing it is refused */ });
it('Fire and Hold: a square with no enemy cavalry adjacent comes out and fires standing +1; one that stays fires 1 die (R58)', () => { /* bottom BR/LN square:1 at (6,6), FR/LN at (4,6): fireAndHold ['u1'] → leaveSquare yes → fireDice 6; no → fireDice 1 */ });
it('a unit forced out by a cavalry melee may form square against that cavalry\'s bonus melee (R26)', () => {
  // BR/HC (5,6) attacks FR/LN (4,6), which stands; one flag: it retreats to (3,6); BR/HC advances to (4,6), declines the extra hex,
  // bonus-attacks (3,6): the defend decision offers formSquare
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/rules/squares.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run tests/rules && npm test`
Expected: PASS; full suite green.

- [ ] **Step 5: Commit**

```bash
git add src/engine/{squares,reactions,melee,resolve,phases}.ts tests/rules/squares.test.ts
git commit -m "feat(engine): infantry squares: forming, the hidden track, fighting first, bounce flags, leaving square (RR §9.5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Wave 6

### Task T10: Combined Arms

**Model:** Sonnet. **Lane:** A.

**Files:**
- Modify: `src/engine/{combinedArms,melee,options,sight}.ts`
- Create: `tests/rules/combined-arms.test.ts` (header `// Rules: RR §9.6 (design/rules-reference.md)`)

**Interfaces:**
- Consumes: `clearSight` (T4), `fireDice`/`meleeDice` with role `attack` (cards per unit), `scoreRoll`, the square-first `'stop'` path (T9).
- Produces:
  - `combinedArmsCandidates(s, unit, target)` (in `options.ts`, so `battleTargets` can use it): `target` is an enemy **unit** (never a lone leader, R76); own ordered artillery with `!op.battled`, allowed to battle after its move, in range with a dice cell > 0 (R15), and either adjacent to the target, or not adjacent to any enemy unit and with `clearSight` (no hill battery, [Interp R39]); an artillery unit adjacent to another enemy unit qualifies only when it is adjacent to the target.
  - `combinedArmsStep(s, ctx, m)`: on the active turn, for `m.role` `attack` or `bonus`, ask `combinedArms { unit, target, options }` when candidates exist; `select { ids }` ⊆ options; every chosen gun is `battled` at once (spent even if its dice are lost, R4, [Interp R40]).
  - `melee.ts`: the attacker's roll is the melee unit's dice (recounted for its current blocks) plus each gun's dice (`meleeDice` at distance 1 when adjacent, else `fireDice`; its own card dice and its own terrain); one `roll` with `from[]`; one `combat` event with `artillery: [{ id, dice }]`; hits and flags applied together; artillery sabres score only if the melee unit's row has `sabreHits` (R17, R41); a roll including a square's die against cavalry: every flag bounces (R30). Lost when a square fighting first or a First Strike stops the melee (the hooks return `'stop'` before the roll). Against Retire and Reform the gun dice are rolled with the attacker's, only cavalry symbols (R40).
  - `battleTargets`/`validateBattle`: a melee target whose own dice are 0 is offered when some candidate gun would roll ≥ 1 (R15).

- [ ] **Step 1: Write the failing tests**

```ts
const P = (gun: [number, number], extra: Pos = {}): Pos => ({ ...extra, units: [{ side: 'bottom', key: 'BR/LN', at: [5, 6] }, { side: 'top', key: 'FR/LN', at: [4, 6] }, { side: 'bottom', key: 'BR/FA', at: gun }, ...(extra.units ?? [])] });
const declare = (p: Pos, card: CardKind = 'attackC', pieces = ['u1', 'u3']) => { const d = toBattle(build(p), card, pieces); must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) }); return d; };
it('ordered guns in range with a clear line may join; the decision lists them (§9.6, R39)', () => { expect(declare(P([6, 5])).pending).toMatchObject({ kind: 'combinedArms', unit: 'u1', options: ['u3'] }); });
it('dice: the melee unit\'s own plus each gun\'s range dice, rolled together (R41)', () => {
  // select ['u3']: one combat event dice 4 with artillery [{ id: 'u3', dice: 3 }]; one roll of 7 faces with from[]
});
it('an adjacent gun uses its melee dice (R41)', () => { /* gun at (4,5): artillery dice 4 */ });
it('no hill battery and no pieces in between (R39)', () => { /* gun on a hill at (6,5) with a friendly unit on (5,5): not offered (it could fire at (4,6) normally) */ });
it('a gun next to another enemy unit joins only against an adjacent target (R39)', () => { /* gun at (6,5) with a top FR/LT on (6,4): not offered; gun at (4,5) with a top FR/LT on (3,4): offered (it is adjacent to the target) */ });
it('not against a lone leader; not on a battle back; only the active player\'s ordered guns (R41, R76)', () => { /* attacking a lone top leader on (4,6) with an ordered gun in range: no combinedArms decision; a top battle back: none; an unordered bottom gun in range: none */ });
it('a joining gun is spent even when its dice are lost (R4, [Interp R40])', () => {
  // cavalry attacks a square with a gun: the square bounces it first: no gun dice rolled; battleTargets(gun) []
});
it('artillery sabres score as the melee unit\'s do (R17)', () => { /* melee unit BR/RI: gun sabres miss infantry; melee unit BR/LN: they hit */ });
it('flags of the gun dice in a roll with a square\'s die against cavalry bounce (R30)', () => { /* bottom BR/LN square attacks top FR/HC with a gun: flags bounce */ });
it('the melee unit survives First Strike in place: its dice recounted, the gun dice still rolled (R40)', () => { /* (T12c adds the First Strike case) here: BR/HC attacks a top FR/LT square with the gun; the square's die misses: one roll of 1 + 3 dice */ });
it('against Retire and Reform the gun dice roll too, cavalry symbols only (R34, R40)', () => { /* BR/LN and gun u3 against top FR/HC, which retires: one retireReform roll of 4 + 3 dice; only cavalry faces hit */ });
it('a melee unit with 0 dice may attack when a gun adds dice (R15)', () => { /* BR/LC 1 block into a town (0) with a gun in range: target offered; combat dice 0, gun 2 (3, −1 firing into the town) */ });
it('a cavalry bonus melee may combine with any ordered gun that has not battled (R41)', () => { /* BR/HC wins without a gun, bonus-attacks: combinedArms lists the unbattled gun; a gun that joined the first melee is not listed */ });
it('Cold Steel: a gun adjacent to the same target joins and both get +1 (R61)', () => { /* coldSteel: BR/LN 5 dice, gun at (4,5) 5 dice */ });
it('Élan: the gun\'s share gets its +1 (R53)', () => { /* elan with the infantry face on u1 and the artillery face on u3: artillery dice 4 (3 + 1) */ });
it('the defender battles back against the melee unit only (R38)', () => { /* battleBack combat target 'u1' */ });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/rules/combined-arms.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run tests/rules && npm test`
Expected: PASS; full suite green.

- [ ] **Step 5: Commit**

```bash
git add src/engine/{combinedArms,melee,options,sight}.ts tests/rules/combined-arms.test.ts
git commit -m "feat(engine): Combined Arms (RR §9.6)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Wave 7

### Task T12c: First Strike

**Model:** Sonnet. **Lane:** A.

**Files:**
- Modify: `src/engine/{reactions,melee}.ts`
- Create: `tests/rules/first-strike.test.ts` (header `// Rules: RR §9.2, §12.3, §12.4 (design/rules-reference.md)`)

**Interfaces:**
- Consumes: T11's draw order (`turn.firstStrikes`), T9's square options, T10's lost-dice path, T2's `meleeDice` with `declared: true` (the R12 fallback lives in T2).
- Produces:
  - `defendOptions`: adds `'firstStrike'` when the defender is a unit (never a lone leader), its owner holds a First Strike card, and `m.role` is `attack` or `bonus` (never a battle back). One choice per melee (R77).
  - `firstStrikeRoll(s, ctx, m)`: the First Strike card goes from the defender's hand to the discard (`turn.firstStrikes[defender]++`; event `cardPlayed { side: defender, card, kind: 'firstStrike', effective: null }`; `lastCard` untouched, since Counter-Attack copies only Phase 1 cards, R56); the defender rolls its normal dice (`role 'firstStrike'`: terrain, no cards), purpose `firstStrike`, aimed at the melee unit; if the attacker is eliminated or left its hex → `'stop'` (gun dice lost); else `'continue'`, the attacker's dice are recounted for its current blocks (`declared: true`) and the defender does not battle back. A cavalry attacker cannot Retire and Reform from that roll; an infantry attacker cannot form square against it (neither option exists for an attacker).

- [ ] **Step 1: Write the failing tests**

```ts
const fs = (atk: RowKey, def: RowKey, extra: Pos = {}) => { const s = build({ ...extra, units: [{ side: 'bottom', key: atk, at: [5, 6] }, { side: 'top', key: def, at: [4, 6] }, ...(extra.units ?? [])] }); giveCard(s, 'top', 'firstStrike'); const d = toBattle(s, 'attackC', ['u1']); must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) }); return d; };
it('the defender may play First Strike after the declaration, before the attacker rolls (§12.3, R63)', () => { expect(fs('BR/LN', 'FR/LN').pending).toMatchObject({ kind: 'defend', options: ['stand', 'firstStrike'] }); });
it('it rolls first with normal dice and terrain, no cards; a surviving attacker then rolls its recounted dice; no battle back (R63)', () => {
  // choose firstStrike; forceDice: FR/LN 5 dice with 1 infantry hit, then the attacker's roll of 3 dice; no battleBack combat
});
it('an attacker eliminated or forced out by it does not roll (R63)', () => { /* BR/LN 2 blocks; the First Strike rolls 2 infantry: no melee combat by u1; BR/LN 4 blocks and the First Strike rolls a flag: u1 retreats, no melee combat */ });
it('one choice per melee: First Strike or square or Retire and Reform (R77)', () => { /* fs('BR/HC','FR/LN'): options ['stand','formSquare','firstStrike']; choosing firstStrike: no square */ });
it('not against a battle back; usable against a bonus melee (R63)', () => { /* bottom holds First Strike while top battles back: no defend decision for bottom; top holds it against a BR/HC bonus melee: options include firstStrike */ });
it('aimed at the melee unit of a Combined Arms attack; the guns are spent and their dice lost if it is driven off (R63, [Interp R40])', () => { /* BR/LN 1 block with gun u3: the First Strike eliminates u1: no gun dice rolled; battleTargets(u3) [] */ });
it('an attacking cavalry unit cannot Retire and Reform from the First Strike roll (§9.4)', () => { /* top infantry FS against bottom cavalry: no retire option arises */ });
it('the First Strike unit never takes ground or breaks through (§12.3)', () => { /* top FR/HC's First Strike eliminates the bottom attacker: no advance decision for top */ });
it('a horse battery that moved, declared a melee and was cut to 1 block still melees with 2 dice (R12)', () => { /* BR/HA moved 1 hex, FS hits 2: combat dice 2 */ });
it('a square ordered to attack cavalry: the cavalry may play First Strike with at most 1 die (§9.5)', () => { /* bottom BR/LN square:1 attacks top FR/HC holding it: options include firstStrike; the firstStrike roll has 1 die */ });
it('two First Strikes in one turn: both replacements drawn before the active player draws (R78)', () => { /* draw events top, top, bottom */ });
it('played as a turn card it orders nothing (R63)', () => { /* top plays firstStrike: no orders decision; normal draw */ });
it('First Strike losses can leave a declared attacker in place with 0 dice: the attack still counts (R15)', () => {
  // BR/HC 2 blocks attacks FR/LN in a forest: declared with 3 − 2 = 1 die; the First Strike takes 1 block (no flag):
  // a melee combat event with dice 0, no hits, op.battled true
});
it('a reactive First Strike is not what Counter-Attack copies (R56)', () => { /* top played probeL on its turn, then First Strike against bottom's attack: lastCard.top is still 'probeL', so a later bottom Counter-Attack copies probeL (as probeR) */ });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/rules/first-strike.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run tests/rules && npm test`
Expected: PASS; full suite green.

- [ ] **Step 5: Commit**

```bash
git add src/engine/{reactions,melee}.ts tests/rules/first-strike.test.ts
git commit -m "feat(engine): First Strike (RR §12.3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
## Wave 8

### Task T14: Hardening

**Model:** Sonnet. **Lane:** A.

**Files:**
- Modify: `tests/rules/invariants.test.ts`, `tests/rules/helpers.ts` (additions only), `tests/engine/soak.test.ts`, `package.json`, `package-lock.json`, `scripts/**` (type fixes only), `CLAUDE.md`
- Create: `tests/engine/{answer-errors,rr-coverage,no-nation-names}.test.ts`, `tsconfig.scripts.json`

**Interfaces:**
- Consumes: the whole engine; `randomAnswer`; `chooseAnswer`; `answerError`.
- Produces: `npm run typecheck` = `tsc --noEmit -p . && tsc --noEmit -p tsconfig.scripts.json`; `tsconfig.scripts.json` = `{ "extends": "./tsconfig.json", "compilerOptions": { "types": ["vite/client", "node"] }, "include": ["scripts", "src", "tests"] }`; devDependency `@types/node` (the current 22.x line, exact version recorded in the lock file).

- [ ] **Step 1: Write the failing tests**

`tests/rules/invariants.test.ts` (header `// Rules: RR §1, §2, §5.3, §9.5, §12, §13.1 (design/rules-reference.md)`), random play of `000` with 20 `lcg` seeds (10 with each side first), checked after every accepted answer:

```ts
// 1. each of the 70 card ids exactly once across deck, discard, both hands, both tracks and turn.card (while it is on the table)
// 2. at every playCard decision: hand.length + filled track slots === players[side].cards, both sides
// 3. no hex holds two units or two leaders; no leader stands on an enemy unit; every piece is on a board hex passableFor it
// 4. 1 ≤ blocks ≤ maxBlocks for every unit on the board
// 5. u.square === n ⇔ players[u.side].squareTrack[n − 1] !== null for a unit of that side; slots unique per side
// 6. permanent banners never decrease; winner set ⇔ bannerTotal(winner) ≥ bannersToWin, and no decision is pending after it
// 7. no GameEvent other than cardPlayed and discarded carries a card id (a whitelist of event kinds with numeric card fields)
```

`tests/engine/soak.test.ts`: 40 seeds of random play on `000` end with a winner within 4000 decisions; the AI stub playing both sides (`chooseAnswer`, `deterministic: true`) for 6 seeds ends with a winner and `mem.fallbacks === 0` for both sides, with no `console.error`.

`tests/engine/answer-errors.test.ts`: one sample per `Decision` kind (18; the test asserts the sample kinds are exactly the `Decision['kind']` union, listed literally) with a refused answer each — wrong answer kind; `orders` with an unknown id and with one piece too many; `move` to an unreachable hex; `attack` on a 0-dice target; `select` with an id not in `options`; `defend` with a choice not in `options`; `ignoreFlags` above `max`; `choose` out of range; `hex` not in `options`, and `null` for a `required` `breakthroughExtra` and for `shortSupplyHex`; `assign` of the wrong length; each returns a non-empty message, and `{ kind: 'move' }` to `playCard` returns `'Play a card from your hand.'`.

`tests/engine/rr-coverage.test.ts`: read `design/rules-reference.md`; collect every `### n.m` heading for n = 1–13, plus `§1` (no subsections) and `§14.1`–`§14.15`; read the header line of every `tests/rules/*.test.ts` and `tests/engine/*.test.ts`; expand ranges (`§2.1–§2.6` → 2.1 … 2.6); assert every collected section is cited by at least one file, and print the uncovered ones in the failure message.

`tests/engine/no-nation-names.test.ts`: no file in `src/engine/` other than `codes.ts` and `units.ts` matches `/['"\`](FR|BR|PT|AL|SP)(\/|['"\`])/` or `/\b(French|British|Portuguese|Allied|Spanish)\b/`.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/rules/invariants.test.ts tests/engine`
Expected: FAIL where a check finds a real gap (fix it in the owning module, recorded in the report), or PASS for checks that already hold; `rr-coverage` fails if any section lacks a citing file.

- [ ] **Step 3: Fix what the checks find; add `tsconfig.scripts.json`, `@types/node` and the typecheck script; make every script type-check**

- [ ] **Step 4: Update `CLAUDE.md`**

- Status: the engine is the Napoleonics base game (RR §1–§14); the AI is a seeded random stub until Plan 5; the UI shows generic prompts for new decisions until Plan 4; `000` is still the only battle until Plan 3B.
- Commands: the test count and time from this run; drop the `ai-balance` lines (scripts deleted in T1c-4); `npm run typecheck` now checks `scripts/` too.
- Where things live: the engine module list in layering order with one line each (tables `UNIT_STATS`, `TERRAIN_STATS`, `WORKS`, `CARD_DEFS`; `statsOf` and `unitOverrides`; the hook modules `reactions`, `squares`, `leaders`, `combinedArms`, `afterMelee`, `tactics`); the scenario format (`ScenarioSetup`: `rivers`, `fieldworks` with `on`/`sides`, `crossing`, `square` at setup, `objectives` of kinds `tempHex`/`tempGroup`/`exit`/`killWeight`, `sideRules`, `unitOverrides`); the test kit (top army French, bottom British; `duel`, `attackOn`, `miss`).
- Rules and docs: delete "Until Plan 2B the engine is still the Ancients one…"; add that every `tests/rules` file cites its RR sections in its header and `tests/engine/rr-coverage.test.ts` checks that every section is cited.

- [ ] **Step 5: Run every check**

Run: `npm install && npm run typecheck && npm test`
Expected: clean; all green.

- [ ] **Step 6: Commit**

```bash
git add tests/rules/invariants.test.ts tests/rules/helpers.ts tests/engine tsconfig.scripts.json package.json package-lock.json scripts CLAUDE.md
git commit -m "test: engine invariants, soaks, answer refusals, RR coverage check; type-check scripts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## RR coverage map

| RR | Task | Test file |
|---|---|---|
| §1 | T11, T6a, T1c-2 | `orders-turn`, `retreat-flags`, `tests/engine/rules` (hex grid) |
| §2.1–§2.6 | T1c-1, T2 | `tests/engine/tables`, `units-dice` |
| §2.7 | T6b | `leaders` |
| §3.1–§3.2 | T2, T6a | `units-dice`, `fire-melee` |
| §3.3–§3.4 | T6b (escape dice in T2) | `leaders` |
| §4.1–§4.4 | T3 (movement rows also T5) | `terrain`, `movement` |
| §5.1–§5.3 | T1c-1 (deal), T11, T9 (Command with squares) | `orders-turn`, `squares` |
| §6.1–§6.2 | T11, T5 | `orders-turn`, `movement` |
| §6.3 | T9 | `squares` |
| §7.1–§7.2 | T5 | `movement` |
| §8.1, §8.3, §8.4 | T4 | `sight` |
| §8.2 | T6a | `fire-melee` |
| §9.1–§9.3 | T6a (reaction order completed by T8, T9, T12c) | `fire-melee`, `first-strike` |
| §9.4 | T8 | `retire-reform` |
| §9.5 | T9 | `squares` |
| §9.6 | T10 | `combined-arms` |
| §9.7–§9.8 | T7 | `advance` |
| §10.1–§10.2 | T6a | `retreat-flags` |
| §10.3 | T9 | `squares` |
| §11.1–§11.4 | T6b | `leaders` |
| §12.1 | T1c-1 (table), T11 | `tables`, `orders-turn` |
| §12.2 | T12a, T12b (dice in T2, movement in T5) | `tactic-cards`, `elan-rally-supply` |
| §12.3 | T12c | `first-strike` |
| §12.4 | T11, T12b, T12c | `orders-turn`, `elan-rally-supply`, `first-strike` |
| §12.5 | T11, T12b | `orders-turn`, `elan-rally-supply` |
| §13.1–§13.4 | T13 | `objectives` |
| §14, §14.1–§14.15 | T1c-1 (rivers, squares at setup), T13, T7 (§14.15 movement), T3 (§14.5, §14.11, §14.13 terrain) | `scenario-rules`, `advance`, `terrain`, `setup-validation` |
| §15 | — (reserved for Expansion #1, Plan 7) | — |
