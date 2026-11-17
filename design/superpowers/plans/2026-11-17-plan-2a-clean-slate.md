# C&C: Napoleonics — Plan 2A: Clean Slate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all Ancients content from the copied codebase while it stays green, then add the Napoleonics vocabulary (unit codes and the battle catalogue) so that the history, art and map-tooling tracks can branch off before the engine contract changes.

**Architecture:** This plan is the first part of Plan 2 (Engine), split off because it does not depend on the rules reference, which is still being written. Plan 2B (the contract swap and rules) follows when `design/rules-reference.md` lands. Background and the full deletion inventory are in `/Users/janisstrods/Gamemaking/cnc-napoleonics-research/plan2-prep.md` §0–§2 (read §1 for T1). **The Ancients engine, AI and UI stay in place and working in this plan**: only content (battles, texts, histories, golden fixtures, hash pins and the tests tied to them) goes.

**Tech Stack:** TypeScript 5.6, Vite 5, React 18, Vitest 2.

**Spec:** `design/superpowers/specs/2026-11-17-cnc-napoleonics-design.md`. Roadmap: `design/superpowers/plans/2026-11-17-plan-1-foundations.md`.

## Global Constraints

- Never modify anything under `/Users/janisstrods/Gamemaking/cnc-ancients`.
- Every commit leaves `npm run typecheck` clean and `npm test` green.
- localStorage keys only through `storageKey(...)` from `src/ui/storage.ts` (prefix `ccn-`).
- Unit and nation codes exactly as in Plan 1's Global Constraints. **Nations:** `FR`, `BR`, `PT`, `AL`, `SP`. **Infantry:** `LN`, `LT`, `RI`, `GR`, `YG`, `OG`, `GG`, `ML`. **Cavalry:** `LC`, `LNC`, `HC`, `CU`, `GLC`, `GHC`. **Artillery:** `FA`, `HA`, `GA`. **Leader:** `LDR`. A unit key is `'<nation>/<code>'`.
- The engine never branches on nation or army name. Data names the side.
- British spelling. Commits are path-limited and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Models: Sonnet implements, Opus reviews.

## Review Focus

1. **A generic test deleted along with Ancients content.** For example a controller, undo, rematch, save or invariants test that only used battle `001`. It must be re-pointed at `000` with its assertions intact. The T1 reviewer compares the deleted-test list against the inventory.
2. **The app on a fresh browser after the purge.** The main menu and battle picker must render with no visible battles and no crash. Random battle and Continue must be disabled or handled, never throw. This is pinned by T1's picker test.
3. **A stale autosave of a deleted Ancients battle.** Loading it must be refused quietly (the save is dropped and Continue hidden), never crash. Pinned by T1's save test.
4. **History ids that match no battle once the catalogue exists.** Pinned by T2's history test against the catalogue.
5. **The dev galleries (`#/gallery/art|terrain|kit|history`) after the purge.** They must render without the deleted files. Pinned by T1's gallery render checks.

---

### Task 1: Content purge, with placeholder battle `000`

**Model:** Sonnet.

**Files:**
- Delete: everything listed for **T1a** in `plan2-prep.md` §1:
  - `src/scenarios/data/*.json` except the new `000.json`.
  - `src/scenarios/{base,exp1,exp2,exp3,rule}-texts.ts`.
  - `src/history/battles/*.ts`, after moving `007.ts` to `tests/history/fixture-007.ts`.
  - `tests/golden/fixtures.json` and `save-fixture.json`.
  - The art and terrain hash-pin tests and `palette-baseline.json`.
  - `tests/scenarios/{exp1,exp2,exp3}.test.ts`.
  - The scenario-bound rules, AI and UI tests named there.
- Create: `src/scenarios/data/000.json`, `src/scenarios/texts.ts`.
- Modify:
  - `src/scenarios/index.ts`.
  - `src/ui/screens/picker.ts` and `Menus.tsx`: hide `hidden` battles; random battle skips them.
  - `src/ui/game/controller.ts`: drop a save whose battle no longer exists.
  - `src/ui/terrain/index.ts`, `src/dev/*Gallery.tsx`, `src/ui/screens/RulesReference.tsx`: only as far as needed to compile without the deleted files.
  - `src/history/index.ts`.
  - `tests/history/history.test.ts`.
  - `tests/golden/golden.test.ts`.
  - `tests/scenarios/manifest.ts`.
  - Every test that pointed at a deleted battle for a generic purpose.
  - `CLAUDE.md`.

**Interfaces:**
- **Produces:** battle `000` ("Drill"), hidden. `SCENARIOS` contains exactly `['000']`. `ScenarioInfo` gains `hidden?: boolean` (or the JSON field passes through; match the existing loader pattern). Later plans add battles beside it, and Plan 2B rewrites `000.json` in the new format.
- **Rule for every test that loaded a deleted battle:**
  - **Generic subject** (controller, save/continue, undo, rematch, record, battle result, ask-ahead, invariants, soak, random play, setup validation, loader): re-point it at `000`, assertions unchanged apart from ids and names.
  - **Ancients subject** (a specific battle's rules, units, objectives, AI calibration, screens): delete it.
  - List both groups in the report.

- [ ] **Step 1: Write the failing tests**

`tests/ui/clean-slate.test.ts`:

```ts
it('only the hidden drill battle remains', () => {
  expect(SCENARIOS.map((s) => s.id)).toEqual(['000']);
  expect(scenarioById('000')?.hidden).toBe(true);
});
it('the battle picker shows no hidden battle and random battle finds none', () => {
  // use picker.ts's exported list / random helpers: visible list is [], random pick returns null (no throw)
});
it('a saved game of a battle that no longer exists is dropped', () => {
  // tests/support/storage.ts stub; put a ccn-autosave-v1 for battle '007'; the controller's load returns null and removes the key
});
```

Write the second and third tests against the real exported helpers. Read `picker.ts` and `controller.ts` load/save, and name the helpers you use in the report.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/ui/clean-slate.test.ts`
Expected: FAIL (81 battles exist; no `hidden`).

- [ ] **Step 3: Write `000.json`**

Use the existing Ancients format: copy `001.json`'s shape. Content:
- id `000`, name `Drill`, year `1810`, `"hidden": true`, banners 3, no terrain.
- Each side 5 cards; bottom moves first.
- Top 4 units and 1 leader, bottom 4 units and 1 leader, using existing Ancients unit types (e.g. `MI`, `LI`, `MC` and a leader).
- Units in the centre rows, at least two hexes apart.
- Blocks and looks reused from an existing army.
- No reserves, no special rules.
- Keep `rosterCheck` consistent, or omit it if the loader allows.

This file is replaced in Plan 2B.

- [ ] **Step 4: Delete the content and fix compilation**

Delete per the inventory and fix each import.

- `src/scenarios/texts.ts` keeps the `ScenarioTexts` type and an empty texts table that the loader reads.
- Galleries and `RulesReference` lose only the sections that need deleted data; mark each removed section with a one-line comment `// Napoleonics content returns in Plan 6`.
- `history.test.ts`:
  - `COVERED` becomes `[]`.
  - The validator tests read `tests/history/fixture-007.ts`; adjust the import and the scenario check for the fixture.
  - Any test that requires a history file to exist uses the fixture through the validator only.
- `golden.test.ts` becomes one test: two random-play runs of `000` with the same seed produce identical event streams. Keep `tests/golden/record.ts` and `scripts/golden-record.ts`.

- [ ] **Step 5: Re-point or delete scenario-bound tests**

Apply the rule in **Interfaces**. Run `grep -rln "scenarioById\|SCENARIOS\|data/[0-9]" tests src scripts` and resolve every hit.

- [ ] **Step 6: Run all checks**

Run: `npm run typecheck && npm test`
Expected: clean, all green, and `clean-slate.test.ts` passes.

Then start the `dev` launch config. Load `#/`, `#/gallery/art`, `#/gallery/terrain`, `#/gallery/kit` and `#/gallery/history`, and `#/play/000/bottom/tribune`, with `localStorage.setItem('ccn-muted','1')` set first. Confirm each page renders with no console errors, and record that in the report.

- [ ] **Step 7: Update CLAUDE.md**

Status section:
- Ancients content was removed in Plan 2A.
- The engine, AI and UI are still the Ancients ones until Plan 2B.
- `000` is the hidden drill battle.

Under Battle histories and Golden fixtures, replace the Ancients descriptions with one line each about the current state.

- [ ] **Step 8: Commit**

Use `git add -A src tests scripts CLAUDE.md`. Deletions need `-A` on these paths only.

```bash
git commit -m "chore: remove Ancients content; hidden drill battle 000

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Napoleonics vocabulary (codes and battle catalogue)

**Model:** Sonnet.

**Files:**
- Create: `src/engine/codes.ts`, `src/scenarios/catalogue.ts`, `tests/engine/codes.test.ts`
- Modify: `tests/history/history.test.ts` (history ids are checked against the catalogue), `CLAUDE.md` ("Where things live")

**Interfaces:**
- **Consumes:** `design/survey.md` (merged by the controller before this task) for the base battles' names and dates.
- **Produces, from `src/engine/codes.ts`** (it imports nothing):

```ts
export const NATIONS = ['FR', 'BR', 'PT', 'AL', 'SP'] as const;
export type Nation = (typeof NATIONS)[number];
export const ARMS = ['infantry', 'cavalry', 'artillery'] as const;
export type Arm = (typeof ARMS)[number];
export const UNIT_CODES = ['LN','LT','RI','GR','YG','OG','GG','ML','LC','LNC','HC','CU','GLC','GHC','FA','HA','GA'] as const;
export type UnitCode = (typeof UNIT_CODES)[number];
export const ARM_OF: Readonly<Record<UnitCode, Arm>>;
export const CODE_NAMES: Readonly<Record<UnitCode, string>>;   // 'Line Infantry', 'Rifles', 'Guard Foot Artillery', …
export const NATION_NAMES: Readonly<Record<Nation, string>>;  // 'French', 'British', 'Portuguese', 'Allied', 'Spanish'
export type UnitKey = `${Nation}/${UnitCode}`;
export function nationOf(k: UnitKey): Nation;
export function codeOf(k: UnitKey): UnitCode;
export function isUnitKey(s: string): s is UnitKey;
```

`UNIT_KEYS` (the exhaustive list of the rows that exist) is **not** defined here. Plan 2B adds it from RR §2. The `UnitKey` template type is the vocabulary until then.

- **Produces, from `src/scenarios/catalogue.ts`:**

```ts
export interface CatalogueEntry { id: string; name: string; date: string; box: 'base' | 'exp1' }
export const CATALOGUE: readonly CatalogueEntry[];
export function catalogueEntry(id: string): CatalogueEntry | undefined;
```

It lists the 15 base battles, `001`–`015`, with names and dates from `design/survey.md`, and the 18 Expansion #1 battles. For those, look up the official list on commandsandcolors.net (Napoleonics → Expansion #1, *The Spanish Army*). Load web tools via ToolSearch with `select:WebFetch`. Use the site's three-digit numbers, names and dates, and cite the URL in a comment.

**Battle names are plain names with accents** (e.g. `Roliça`, `Bussaco`). Two-part battles carry their part in the name as the survey writes it, e.g. `Roliça (French First Position)`.

- [ ] **Step 1: Write the failing test** `tests/engine/codes.test.ts`

```ts
it('maps every code to an arm', () => {
  expect(ARM_OF.LN).toBe('infantry'); expect(ARM_OF.CU).toBe('cavalry'); expect(ARM_OF.GA).toBe('artillery');
  expect(UNIT_CODES.every((c) => ARM_OF[c] && CODE_NAMES[c])).toBe(true);
});
it('splits and checks unit keys', () => {
  expect(nationOf('BR/RI')).toBe('BR'); expect(codeOf('FR/GHC')).toBe('GHC');
  expect(isUnitKey('PT/LN')).toBe(true); expect(isUnitKey('PT/XX')).toBe(false); expect(isUnitKey('LN')).toBe(false);
});
it('catalogues 15 base and 18 Spanish battles with unique ids', () => {
  expect(CATALOGUE.filter((b) => b.box === 'base').map((b) => b.id)).toEqual(
    Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(3, '0')));
  expect(CATALOGUE.filter((b) => b.box === 'exp1')).toHaveLength(18);
  expect(new Set(CATALOGUE.map((b) => b.id)).size).toBe(33);
  expect(catalogueEntry('015')?.name).toBe('Waterloo');
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/engine/codes.test.ts`
Expected: FAIL (modules missing).

- [ ] **Step 3: Implement both modules**

- [ ] **Step 4: Point the history test at the catalogue**

In `tests/history/history.test.ts`, "every history belongs to a battle" now checks `catalogueEntry(id)` instead of `scenarioById(id)`. Histories can then be written before their battle is transcribed. `COVERED` coverage stays keyed on boxes, but checks catalogue entries: every catalogue entry of a covered box has a history. `COVERED` stays `[]`.

- [ ] **Step 5: Run all checks and update CLAUDE.md**

Run: `npm run typecheck && npm test`
Expected: clean and green.

Add `codes.ts` and `catalogue.ts` to "Where things live", with one line each.

- [ ] **Step 6: Commit**

```bash
git add src/engine/codes.ts src/scenarios/catalogue.ts tests/engine/codes.test.ts tests/history/history.test.ts CLAUDE.md
git commit -m "feat: Napoleonics unit codes and battle catalogue

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
