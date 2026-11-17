# C&C: Napoleonics — Plan 3B: Base Scenarios Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Battles 001–015 load from `src/scenarios/data/<id>.json` in the engine's scenario format, generated from the verified transcriptions in `design/data/`, with briefing texts, picker wiring and tests, so each battle validates, sets up as the survey says and plays to a finish under random play.

**Architecture:** A pure, tested converter (`scripts/scenarios/convert.ts`) joins two inputs: the engine-neutral map data `design/data/<id>.json` (terrain, units, leaders, objective hexes) and a hand-written per-battle table (`scripts/scenarios/meta-base.ts`: sides, hands, first player, banners, river rule, objectives, side rules, squares at setup) that transcribes RR §14. A thin CLI (`scripts/scenarios/build.ts`) writes the files; a Vitest test regenerates every file in memory and fails if a committed file differs by one byte, so the generated files are never hand-edited. Anything the engine does not support yet (Spanish unit types, unknown terrain, unknown fields at the top level or inside items) makes the converter throw, naming each feature, so Expansion #1 (Plan 7) drops in by adding `meta-exp1.ts` once its engine work lands. Per-battle tests pin each setup to the survey through `tests/scenarios/manifest.ts`; a soak plays every battle to the end.

**Tech Stack:** TypeScript 5.6, Vite 5 (`import.meta.glob`, `?raw`), Vitest 2, vite-node for the CLI.

**Spec:** `design/superpowers/specs/2026-11-17-cnc-napoleonics-design.md` (Scope › Battles; Testing: "each setup loads, matches its survey counts and checksum"; headless soak over every battle). **Rules:** `design/rules-reference.md` §13–§14 (the meta table below is §14 restated as data), `design/rulings.md` R47, R64–R67, R72, R81–R86. **Data:** `design/data/001.json`…`015.json` (verified; notes and verify logs beside them), `design/survey.md`. **Engine contract:** Plan 2B (`design/superpowers/plans/2026-11-17-plan-2b-engine.md`) Task T1c-1, frozen at `p2b-t1c` commit `effdc59`: `src/engine/setup.ts` (`ScenarioSetup`, `SideSetup`, `UnitSetup`, `LeaderSetup`, `TerrainSetup`, `RiverRule`, `ObjectiveSetup`, `SideRuleSetup`, `UnitOverride`, `createGame`), `src/scenarios/index.ts` (`ScenarioJson`, `scenarioFromJson`, `SCENARIOS`, `scenarioById`), `src/engine/codes.ts` (`isRowKey`, `RowKey`). Roadmap: Plan 1.

## Global Constraints

- Never modify anything under `/Users/janisstrods/Gamemaking/cnc-ancients`.
- Every merge into `main` leaves `npm run typecheck` clean and `npm test` green.
- Plan 3B consumes the engine; it never edits `src/engine/**`. A task that finds an engine bug or a missing engine feature stops and reports it (the owner is the Plan 2B task in the RR coverage map, or Plan 7 for Spanish features).
- `src/scenarios/data/001.json`…`015.json` are generated: never hand-edit them. Change `design/data/<id>.json` (verified map data) or `scripts/scenarios/meta-base.ts` and rerun the build. `000.json` stays hand-written and hidden.
- The engine never branches on a nation or army name (Plan 2B). A rule that falls on one side names the side in data (`objectives`, `sideRules`).
- In all 15 battles **top** is the British side (BR, PT, AL) and **bottom** is the French (RR §14).
- Briefing texts are original prose, British spelling (`towards`, `colour`, `manoeuvre`, `defence`), short; quotations under 15 words. Facts must agree with the battle's history in `src/history/battles/<id>.ts`; no new claims beyond it.
- localStorage only through `storageKey(name)` (`ccn-` prefix); no new keys in this plan.
- Tests that read repository files use `import.meta.glob` (with `query: '?raw'` for text), never `node:fs` (there is no `@types/node` in the main tsconfig). Only `scripts/scenarios/build.ts` uses `node:fs`; nothing under `tests/` imports it.
- Models: **Sonnet** implements every task; **Opus** reviews every task (Task 3's reviewer also checks each blurb against its history file).
- Worktrees: `.worktrees/p3b` (branch `p3b`) for Tasks 1, 2, 4, 5, 6; `.worktrees/p3b-texts` (branch `p3b-texts`) for Task 3. A lane merges `main` before starting its next task.
- Commits are path-limited (`git add <paths>`) and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Dependencies on Plan 2B

| Task | Can start when | Why | Re-check when |
|---|---|---|---|
| 1 Converter and CLI | **T1c squash-merged** | needs `setup.ts` types, `createGame`, `isRowKey`, `CATALOGUE` on `main` | T13 merges (it may edit `setup.ts`): rerun Task 1's tests |
| 2 Base battle data, manifest, setup tests | Task 1 merged (so T1c) | objectives, side rules and squares are validated by T1c-1's `createGame`; their *behaviour* is not needed | T13 merges: rerun `build.ts -- --check` and `npm test` |
| 3 Briefing texts | **now** (on `main`, before T1c) | `texts.ts` and `ScenarioTexts` are the same on `main` and `p2b-t1c`; its test reads only `TEXTS` and `CATALOGUE` | — |
| 4 Random-play soak of every battle | Task 2 merged | needs the skeleton's `randomAnswer` and T1c-3a's AI stub `chooseAnswer` | every later Plan 2B merge must keep it green (tell the 2B controller when Task 4 lands) |
| 5 Battle rules in the real setups | Task 2 merged **and T13 merged** | calls T13's `turnStartObjectives`, `bannerTotal`, `exitAllowedFrom`, `scoreKill`, `sideRuleFlagIgnores`, `impetuous` | — |
| 6 Picker check, visual check, docs | Tasks 2, 3, 4 merged (T1c-4's picker on `main`) | renders the real picker; CLAUDE.md lines | ruling (a): whichever of Task 6 and T14 lands second writes CLAUDE.md's Status line (T14's carry-note is in the 2B ledger); T14 may make type-only fixes to `build.ts` |

No Plan 3B task waits for the melee chain (T6a…T12c) or T14. Tasks 1, 2, 4, 6 form one lane; Task 3 runs in parallel from today; Task 5 slots in when T13 lands.

## Named gaps (not built here)

| Gap | Owner |
|---|---|
| Place-name labels and river-piece art (`art`, `riverPieces` in `design/data`) are not converted; the painters draw rivers from adjacency | Plan 4 (UI) may extend the converter |
| Spanish rows (`SP/*`, `FR/SWI`, `FR/LNC`, `FR/GLC`) | Plan 7. Today the converter refuses 101–118 **only** through these unit keys |
| Guerrilla counters, walled farm, redoubt rules, two river rules in one battle (104) | Plan 7. They are not marked in `design/data` (redoubts are ordinary `fieldworks` entries), so the converter cannot detect them: Plan 7's meta and engine work must add them explicitly |
| AI temperament per battle commander (`SideSetup.commander`) | Plan 5 |
| Real AI-vs-AI soak over every battle | Plan 5 (this plan soaks with random play and the AI stub) |
| Golden replays of the battles | Plan 8 |
| 015's optional Walled Farm swap | not adopted (R72) |

## Review Focus

1. **A Spanish battle run through the converter before Plan 7's engine work** must fail with one error naming every unsupported key and feature, never write a half-valid file. Pinned by Task 1's `convert.test.ts` "refuses Expansion #1 data" on the real `design/data/101.json`.
2. **A hand edit to a generated battle file** (someone "fixes" a hex in `src/scenarios/data/006.json`) must fail `npm test` with a message pointing at `design/data` and the build command. Pinned by Task 2's `generated.test.ts`.
3. **A typo in an objective hex in the meta table** must not ship: the meta's objective hexes must equal the hexes the map data marks. Pinned by Task 1's "objective hexes must match the map" and Task 2's per-battle objective assertions.
4. **A battle that stalls** (012's British have only cavalry against French squares; 006's exit hex; impassable rivers at 009/010) must still end. Pinned by Task 4's soak (cap 6000 decisions, both random play and the AI stub).
5. **A player opening the picker** must see 15 base battles, each briefing with its special rules, and random battle must never offer the hidden drill. Pinned by Task 2's updated `clean-slate`/`screens` tests and Task 6's picker render test.

---

### Task 1: Converter, formatter and build CLI

**Files:**
- Create: `scripts/scenarios/convert.ts` (pure: no `node:*` imports), `scripts/scenarios/meta.ts`, `scripts/scenarios/build.ts` (CLI, `node:fs`)
- Create: `tests/scenarios/convert.test.ts`

**Interfaces:**
- Consumes: `ScenarioSetup`, `SideSetup`, `RiverRule`, `ObjectiveSetup`, `SideRuleSetup`, `UnitOverride`, `UnitSetup`, `TerrainName`, `createGame` from `src/engine/setup.ts`; `isRowKey` from `src/engine/codes.ts` (no infantry check of its own: `createGame` refuses a square on a non-infantry unit); `SquareSlot`, `Side` from `src/engine/types.ts`; `CatalogueEntry`, `catalogueEntry` from `src/scenarios/catalogue.ts`; `type ScenarioJson` from `src/scenarios/index.ts` (type-only import: never a value import, which would pull in its `import.meta.glob`).
- Produces (used by Tasks 2 and Plan 7):

```ts
// scripts/scenarios/convert.ts
export interface RawBattle {            // design/data/<id>.json (Plan 3A format)
  id: string;
  terrain: { r: number; c: number; t: string; on?: string; sides?: string[]; crossing?: string; art?: string }[];
  units: { r: number; c: number; side: string; key: string }[];
  leaders: { r: number; c: number; side: string; name: string }[];
  objectives: { r: number; c: number; note: string }[];
  grid?: unknown; notes?: string[]; riverPieces?: unknown;
}
export interface BattleMeta {
  top: SideSetup; bottom: SideSetup; first: Side; banners: number;
  rivers: RiverRule | 'none';                       // 'none': the map has no river hex; the field is left out
  objectives?: ObjectiveSetup[]; sideRules?: SideRuleSetup[]; unitOverrides?: UnitOverride[];
  squares?: { r: number; c: number; slot: SquareSlot }[];  // units that start in square (RR §14.12)
  leaderNames?: Record<string, string>;             // map label → leader name ('(unnamed)' → 'Brennier')
}
export const RAW_FIELDS: readonly string[];         // ['id','grid','terrain','units','leaders','objectives','notes','riverPieces']
export function unsupportedFeatures(raw: RawBattle): string[];
export function convertBattle(raw: RawBattle, meta: BattleMeta, entry: CatalogueEntry): ScenarioJson;
export function formatScenario(j: ScenarioJson): string;

// scripts/scenarios/meta.ts
export const META: Readonly<Record<string, BattleMeta>>;   // { ...BASE_META } (Task 2); Plan 7 spreads EXP1_META in
```

- [ ] **Step 1: Write the failing tests** `tests/scenarios/convert.test.ts`

Build raw input from the real files: `const RAW = import.meta.glob<RawBattle>('../../design/data/*.json', { eager: true, import: 'default' })`, keyed by id. A local `meta(over?)` returns a valid `BattleMeta` for 002 (top Anglo-Portuguese/BR/Wellesley/6, bottom French/FR/Delaborde/5, first top, banners 5, rivers 'none', `leaderNames: { '(unnamed)': 'Brennier' }`); synthetic raws are small literal objects.

```ts
it('keeps terrain, units and leaders in file order and drops grid, notes, riverPieces, objective notes and art', () => {
  const j = convertBattle(RAW['002'], meta(), catalogueEntry('002')!);
  expect(j.units.map((u) => [u.r, u.c, u.key])).toEqual(RAW['002'].units.map((u) => [u.r, u.c, u.key]));
  expect(Object.keys(j)).toEqual(['id', 'name', 'year', 'top', 'bottom', 'first', 'banners', 'terrain', 'units', 'leaders']);
  expect(j.terrain.some((t) => 'art' in t)).toBe(false);
});
it('name and year come from the catalogue; a 1xx id gets expansion exp1', () => {
  // 002 → name 'Roliça (French Second Position)', year '1808', no expansion key;
  // a synthetic raw with id '199' and base keys, entry { id: '199', name: 'Test', date: '1 May 1811', box: 'exp1' } → expansion 'exp1', year '1811'
});
it('renames leaders by leaderNames; a bracketed name left unrenamed throws', () => {
  // 002 leaders bottom → ['Delaborde', 'Brennier']; without leaderNames → throws /leader name "\(unnamed\)".*\(002\)/
});
it('squares attach to the unit on the hex; a square on an empty hex throws', () => {
  // 012 raw + meta squares [{3,8,1},{3,9,2}] → those two units carry square 1 and 2, no other unit has one;
  // a square at an empty hex → throws /no unit at \(\d,\d+\) for square 1/
});
it('objective hexes must match the map', () => {
  // 001 raw with meta({ rivers: 'fordable', objectives }) and tempHex top (8,2) and (8,11) → ok; with (8,3) instead of (8,2) → throws naming 8,2 (unclaimed) and 8,3 (not on the map);
  // a tempGroup's hexes and an exit's hex count; killWeight has no hex
});
it('river rule and river hexes agree', () => {
  // rivers 'none' with a river hex → throws /river hexes but rivers is none/; rivers 'fordable' with no river hex → throws /no river hex/
});
it('refuses Expansion #1 data, naming every unsupported feature (Plan 7)', () => {
  expect(unsupportedFeatures(RAW['101'])).toContain('unit type SP/LN ×' + RAW['101'].units.filter((u) => u.key === 'SP/LN').length);
  expect(() => convertBattle(RAW['101'], meta(), catalogueEntry('101')!)).toThrow(/^101: not yet supported \(Plan 7\): .*unit type SP\//);
  // synthetic: terrain 'walledFarm' → 'terrain walledFarm ×1'; an extra top-level field 'guerrilla' → 'field guerrilla'; FR/LNC → 'unit type FR/LNC ×1';
  // unknown keys inside items: a terrain item with redoubt: true → 'terrain key redoubt ×1'; a unit with blocks: 2 → 'unit key blocks ×1';
  // a leader with nation: 'SP' → 'leader key nation ×1'; an objective with side: 'top' → 'objective key side ×1'
});
it('validates the result with createGame', () => {
  // meta with banners 0 → throws /banners must be at least 1 \(002\)/
});
it('formats one item per line, fixed key order, trailing newline, and round-trips', () => {
  const text = formatScenario(convertBattle(RAW['002'], meta(), catalogueEntry('002')!));
  expect(text.endsWith('}\n')).toBe(true);
  expect(text.split('\n')[1]).toBe('  "id": "002",');
  expect(formatScenario(JSON.parse(text))).toBe(text);
  // 001 (with rivers and objectives): top-level keys in order [..., 'banners', 'rivers', 'terrain', 'units', 'leaders', 'objectives']
  // every terrain/unit/leader item is one line: lines starting '    {' === terrain + units + leaders (+ objectives) counts
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/scenarios/convert.test.ts`
Expected: FAIL (module `scripts/scenarios/convert.ts` not found).

- [ ] **Step 3: Implement `convert.ts`, `meta.ts` (exporting `META = {}` until Task 2) and `build.ts`**

`convertBattle` order of work: (1) `unsupportedFeatures(raw)` non-empty → `throw new Error(\`${raw.id}: not yet supported (Plan 7): ${list.join(', ')}\`)`; features are `field <name>` (top-level key not in `RAW_FIELDS`), `<item> key <k> ×<n>` (a key inside an item outside its allowed set: terrain `r, c, t, on, sides, crossing, art`; unit `r, c, side, key`; leader `r, c, side, name`; objective `r, c, note`), `unit type <K> ×<n>` (`!isRowKey`), `terrain <t> ×<n>` (not in `SETUP_TERRAIN`), `crossing <x>` (not `bridge`/`ford`); each kind counted and sorted. `convert.ts` declares its own list, never `TERRAIN_TYPES` (the engine's rows, which differ):

```ts
const SETUP_TERRAIN = ['plain', 'hill', 'forest', 'rugged', 'town', 'windmill', 'fortress', 'river', 'fieldworks', 'sandQuarry'] as const satisfies readonly TerrainName[];
const _all: Record<TerrainName, true> = { plain: true, hill: true, forest: true, rugged: true, town: true, windmill: true, fortress: true, river: true, fieldworks: true, sandQuarry: true };  // fails to compile if TerrainName gains a name
``` (2) `raw.id === entry.id`. (3) River agreement. (4) Objective hexes: the set of `[r,c]` in `meta.objectives` (`tempHex.hex`, `tempGroup.hexes`, `exit.hex`) equals the set in `raw.objectives`; the error lists unclaimed map hexes and meta hexes not on the map. (5) Leaders renamed; a name starting with `(` still left → throw. (6) Squares attached. (7) Build the `ScenarioJson` and call `createGame(setup, 1)` (errors keep `createGame`'s `(id)` suffix). Every converter error ends with `(${raw.id})` except the unsupported one, which starts with the id.

Output shapes and key order: top level `id, name, year, expansion?, top, bottom, first, banners, rivers?, terrain, units, leaders, objectives?, sideRules?, unitOverrides?` (optional keys only when present and non-empty; `expansion` only for `box !== 'base'`); terrain items `r, c, t, on?, sides?, crossing?`; units `side, key, r, c, square?`; leaders `side, name, r, c`; `year` = the last 4 characters of `entry.date`; `name` = `entry.name`.

`formatScenario`: `{` line; then one line per top-level key, `  "<key>": <JSON.stringify(value)>`, except the arrays `terrain`, `units`, `leaders`, `objectives`, `sideRules`, `unitOverrides`, written as `  "<key>": [` / one `    <JSON.stringify(item)>` line per item (comma-separated) / `  ]`; lines joined with `,\n` between keys; `}\n` last.

`build.ts` (run with `npx vite-node scripts/scenarios/build.ts [-- --check] [-- --ids 001,006]`): for each id of `META` (or `--ids`), read `design/data/<id>.json`, convert with `catalogueEntry(id)`, and write `src/scenarios/data/<id>.json`; with `--check` write nothing, print each missing or stale path and set `process.exitCode = 1` if any. Header comment: what it does, the flags, "never hand-edit the output". Node use is limited to `readFileSync(path, 'utf8')`, `writeFileSync` (from `node:fs`), `process.argv` and `process.exitCode`, with no ambient `declare` of its own (it would clash with `@types/node`, which T14 adds). Controller ruling (a): Plan 3B owns `scripts/scenarios/**`; T14 may make type-only fixes to `build.ts` for its scripts typecheck and reports anything more.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run tests/scenarios/convert.test.ts && npm run typecheck && npx vite-node scripts/scenarios/build.ts -- --check`
Expected: PASS; typecheck clean; `--check` exits 0 with nothing to do (`META` is empty).

- [ ] **Step 5: Commit**

```bash
git add scripts/scenarios tests/scenarios/convert.test.ts
git commit -m "feat(scenarios): design/data to scenario-file converter with build CLI; refuses unsupported features

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Base battle data, manifest and setup tests

**Files:**
- Create: `scripts/scenarios/meta-base.ts`; generated `src/scenarios/data/001.json` … `015.json`; `tests/scenarios/generated.test.ts`, `tests/scenarios/base.test.ts`
- Modify: `scripts/scenarios/meta.ts` (spread `BASE_META`), `tests/scenarios/manifest.ts` (15 entries; header comment drops "Plan 6"), `tests/scenarios/loader.test.ts`, `tests/ui/clean-slate.test.ts`, `tests/ui/screens.test.ts`, `tests/engine/setup-validation.test.ts` (only the `['000']` assertion at line 30; T14-owned, allowed by controller ruling), and any other test whose only failure is a battle count that assumed `000` alone (list each in the report)
- Modify: `design/rules-reference.md` §14.14 and §14.15 (ruling (c)): replace each "`sideRules` (top): the … units are `AL` units …" bullet with "The Nassau, Hanover and Dutch (015: and Brunswick) units are `AL/*` rows (§2.4, R10); no side rule."
- Modify: the header comment of `src/scenarios/index.ts` (it says "only the hidden drill battle 000 until the Napoleonic battles return": now "the drill 000 (hidden) and battles generated from design/data by scripts/scenarios/build.ts"). Apart from it and the data files, no `src/` change.

**Interfaces:**
- Consumes: Task 1 (`convertBattle`, `formatScenario`, `META`, `BattleMeta`); `tests/scenarios/helpers.ts` (`game`, `unitCounts`, `range`, `H`, `rc`); `checksum.ts` (`terrainTally`, `checksums`).
- Produces: `BASE_META: Readonly<Record<string, BattleMeta>>` (ids `001`–`015`); `MANIFEST` filled for `001`–`015`; 15 playable scenarios in `SCENARIOS`.

**`BASE_META`** (RR §14 table and §14.1–§14.15; survey §1 for armies and commanders; every `nation` is `BR` for top and `FR` for bottom). Army names: `Anglo-Portuguese` where PT units are present, `British` where only BR, `Anglo-Allied` at 014–015; bottom always `French`.

| Id | top army / commander / cards | bottom commander / cards | first | banners | rivers | objectives / sideRules / squares / leaderNames |
|---|---|---|---|---|---|---|
| 001 | Anglo-Portuguese / Wellesley / 6 | Delaborde / 5 | top | 5 | fordable | tempHex top (8,2) "Anglo-Portuguese hold a hill on the French baseline."; tempHex top (8,11) same text; leaderNames `(unnamed)` → `Brennier` (comment: Oman’s spelling, `src/history/battles/001.ts:24`; `design/data` keeps `(unnamed)`) |
| 002 | Anglo-Portuguese / Wellesley / 6 | Delaborde / 5 | top | 5 | none | leaderNames `(unnamed)` → `Brennier` (comment: Oman’s spelling, `src/history/battles/001.ts:24`; `design/data` keeps `(unnamed)`) |
| 003 | Anglo-Portuguese / Wellesley / 6 | Junot / 5 | bottom | 6 | fordable | tempGroup bottom [(1,3),(1,4)] banners 2 "The French hold Vimiero." |
| 004 | British / Moore / 5 | Soult / 5 | bottom | 6 | fordable | — |
| 005 | British / Wellesley / 6 | King Joseph / 5 | bottom | 7 | brook | — |
| 006 | Anglo-Portuguese / Craufurd / 4 | Ney / 4 | top | 6 | impassable | exit top (0,4) banners 1, leadersScore false, retreatOff false, "Anglo-Portuguese {unit} crosses the Côa bridge."; sideRules `[{ kind: 'flagIgnoreOn', side: 'top', terrain: 'fortress', flags: 1 }]` |
| 007 | Anglo-Portuguese / Wellington / 6 | Massena / 5 | bottom | 6 | fordable | — |
| 008 | Anglo-Portuguese / Wellington / 6 | Massena / 5 | bottom | 7 | none | — |
| 009 | Anglo-Portuguese / Wellington / 6 | Ney / 5 | top | 6 | impassable | — |
| 010 | Anglo-Portuguese / Wellington / 6 | Marmont / 5 | bottom | 6 | impassable | — |
| 011 | British / Wellington / 6 | Marmont / 5 | top | 6 | fordableNoStop | — |
| 012 | British / Bock / 6 | Foy / 6 | bottom | 6 | none | killWeight top, enemyArm infantry, first 1, later 2; squares [(3,8) slot 1, (3,9) slot 2] |
| 013 | Anglo-Portuguese / Hill / 6 | Clausel / 5 | top | 6 | fordable | tempHex top (7,0) "Anglo-Portuguese hold Nauzeilles."; tempHex top (8,11) "Anglo-Portuguese hold the Seminary." |
| 014 | Anglo-Allied / Wellington / 6 | Ney / 5 | bottom | 9 | fordableNoStop | tempHex bottom (1,5) "The French hold Quatre Bras." |
| 015 | Anglo-Allied / Wellington / 6 | Napoleon / 6 | bottom | 8 | none | tempHex bottom (3,5) "The French hold La Haye Sainte."; (4,1) "The French hold Hougoumont."; (4,12) "The French hold Papelotte."; sideRules `[{ kind: 'impetuousCavalry', side: 'top', keys: ['BR/LC', 'BR/HC', 'BR/GHC'] }]` |

Every `tempHex` has `timing: 'turnStart'`, `banners: 1`. The Allied 2-hex retreat (014–015) and 013's ford tile need no meta: they come from the `AL/LN` row and from `crossing: 'ford'` under `fordable` (→ `fordNoStop`).

- [ ] **Step 1: Write the failing tests**

`tests/scenarios/generated.test.ts`:

```ts
// RAW: design/data/*.json; FILES: import.meta.glob('../../src/scenarios/data/*.json', { eager: true, query: '?raw', import: 'default' })
it('every generated battle file equals a fresh conversion, byte for byte', () => {
  for (const id of Object.keys(META)) {
    const want = formatScenario(convertBattle(RAW[id], META[id], catalogueEntry(id)!));
    expect(FILES[`../../src/scenarios/data/${id}.json`], `${id}: run npx vite-node scripts/scenarios/build.ts (never hand-edit src/scenarios/data; edit design/data or scripts/scenarios/meta-base.ts)`).toBe(want);
  }
});
it('every scenario file but the drill 000 has a META entry, and the reverse; 001–015 are all in META', () => {
  // file ids minus '000' sorted === Object.keys(META) sorted; every id of range(1, 15) padded is in META (Plan 7 adds more ids)
});
```

`tests/scenarios/base.test.ts`, one `describe(id)` per manifest entry:

```ts
it('name, year, banners, first, sides and leaders match the manifest', ...);   // scenarioById(id) and game(id).leaders by side
it('units per side and key match the survey (manifest)', () => { for (const side of SIDES) expect(unitCounts(s, side)).toEqual(m.units[side]); });
it('terrain tally and checksums match', () => { expect(terrainTally(s)).toEqual(m.terrain); expect(checksums(s)).toEqual(m.checksum); });
it('is a visible base battle', () => { expect(info.hidden).toBeUndefined(); expect(info.expansion).toBe('base'); });
```

plus these special-rule data checks (RR §14):

```ts
it('objectives and side rules are the battle’s own', () => {
  // s.scenario.objectives as [kind, side, 'r,c' list]: 001 [['tempHex','top',['8,2']],['tempHex','top',['8,11']]]; 002, 004, 005, 007–011: [];
  // 003 [['tempGroup','bottom',['1,3','1,4']]] with banners 2; 006 [['exit','top',['0,4']]] with leadersScore false, retreatOff false;
  // 012 [{ kind: 'killWeight', side: 'top', enemyArm: 'infantry', first: 1, later: 2 }]; 013 top (7,0), (8,11); 014 bottom (1,5); 015 bottom (3,5), (4,1), (4,12)
  // sideRules: 006 flagIgnoreOn top fortress 1; 015 impetuousCavalry top ['BR/LC','BR/HC','BR/GHC']; every other battle []
});
it('012 starts two French squares: 2 cards on the track, 4 in hand (§14.12, R85)', () => {
  // for seeds 1..5: players.bottom.hand.length 4, squareTrack slots 0 and 1 filled, 2 and 3 null; FR/LT at (3,8) square 1, (3,9) square 2;
  // players.bottom.cards 6; the 70 card ids are each once across deck, both hands and the track
});
it('rivers become their rows (§14, R47, R83)', () => {
  // via m.terrain.types (below): 005 brook 14; 006 river 5 + bridge (0,4); 011 fordNoStop 12; 013 ford 11, fordNoStop 1 at (2,8), bridges (3,1), (3,10)
});
```

**`MANIFEST` values** (units from survey §2.1, checked against `design/data`; terrain from `design/data` under each river rule; works on a hill count under `hill`). `sides` is the meta row; `leaders` in file order, with `Brennier` for the unnamed French leader; `checksum` is computed once from the generated files (`checksums(game(id))`) and pasted, and the reviewer recomputes it.

| Id | top units | bottom units | leaders top / bottom | terrain types | works hexes/sides | bridges |
|---|---|---|---|---|---|---|
| 001 | BR/FA 2, BR/HA 1, BR/HC 1, BR/LN 5, BR/LT 1, PT/LC 1, PT/LN 2, PT/LT 1 | FR/FA 1, FR/LC 2, FR/LN 4, FR/LT 2 | Wellesley, Fergusson, Trant / Delaborde, Brennier | ford 12, forest 8, hill 17, town 2 | 0/0 | 0 |
| 002 | as 001 | as 001 | Wellesley, Fergusson, Lake, Trant / Delaborde, Brennier | forest 10, hill 12, rugged 13 | 0/0 | 0 |
| 003 | BR/FA 2, BR/LC 1, BR/LN 9, BR/LT 1, BR/RI 1, PT/LC 1, PT/LN 2 | FR/FA 2, FR/GR 1, FR/HC 2, FR/LC 2, FR/LN 7, FR/LT 2 | Hill, Fane, Fergusson / St. Clair, Kellermann, Solignac | ford 6, forest 7, hill 18, rugged 4, town 3 | 0/0 | 0 |
| 004 | BR/FA 1, BR/GG 1, BR/LC 1, BR/LN 6, BR/LT 2, BR/RI 1 | FR/FA 2, FR/HC 2, FR/LN 8, FR/LT 3 | Moore, Baird, Hope / Mermet, Merle, De Laborde | ford 17, forest 5, hill 18, town 4 | 0/0 | 0 |
| 005 | BR/FA 3, BR/GG 1, BR/GHC 1, BR/LC 3, BR/LN 6, BR/LT 1, BR/RI 1 | FR/FA 3, FR/HC 1, FR/LC 2, FR/LN 10, FR/LT 3 | Sherbrooke, Mackenzie, Hill / Ruffin, Sebastiani, Merlin | brook 14, forest 3, hill 22, town 1 | 1/3 | 0 |
| 006 | BR/FA 1, BR/HA 2, BR/HC 1, BR/LC 1, BR/LN 3, BR/LT 1, BR/RI 2, PT/LT 2 | FR/FA 1, FR/GR 1, FR/HC 2, FR/LC 3, FR/LN 6, FR/LT 3 | Craufurd, Anson, Sydney / Ferey, Loison, Mermet | bridge 1, forest 2, fortress 2, hill 9, river 5, windmill 1 | 2/6 | 1 |
| 007 | BR/FA 1, BR/HC 1, BR/LN 3, BR/LT 1, PT/FA 1, PT/LN 5, PT/ML 1 | FR/FA 2, FR/HC 1, FR/LC 1, FR/LN 7, FR/LT 5 | Spry, Champalimaud, Mackinnon / Heudelet, Merle, Soult | ford 6, forest 5, hill 28, town 3 | 0/0 | 0 |
| 008 | BR/FA 1, BR/GG 1, BR/HC 1, BR/LN 4, BR/LT 2, BR/RI 1, PT/LN 3, PT/LT 1 | FR/FA 2, FR/LC 2, FR/LN 10, FR/LT 3 | Craufurd, Pack / Marchand, Ferey, Simon | forest 17, hill 21, town 4 | 0/0 | 0 |
| 009 | BR/FA 1, BR/GG 1, BR/GR 1, BR/HA 1, BR/LC 2, BR/LN 2, BR/LT 1, PT/LN 3, PT/LT 1 | FR/FA 1, FR/HA 1, FR/LC 1, FR/LN 7, FR/LT 1 | Picton, Cole, Erskine, Pack / Mermet, Loison, Marchand | bridge 1, forest 9, hill 17, river 10, town 2 | 0/0 | 1 |
| 010 | BR/FA 1, BR/LC 1, BR/LN 6, BR/LT 1, BR/RI 1, PT/HC 2, PT/LN 2, PT/LT 1 | FR/FA 2, FR/LC 3, FR/LN 7, FR/LT 1 | Campbell, Wallace, Power / Thomières, Maucune | bridge 1, forest 3, hill 18, river 8, town 1 | 0/0 | 1 |
| 011 | BR/FA 1, BR/GG 2, BR/HA 1, BR/HC 2, BR/LC 2, BR/LN 7, BR/LT 1, BR/RI 1 | FR/FA 2, FR/LC 1, FR/LN 8, FR/LT 3 | Alten, H. Campbell, Bock / Ferey, Foy | bridge 1, fordNoStop 12, forest 2, hill 16, town 4 | 0/0 | 1 |
| 012 | BR/HC 4, BR/LC 6 | FR/FA 1, FR/HC 2, FR/LC 2, FR/LN 6, FR/LT 2 | Anson, Bock, Gleichen / Curto, Foy | forest 3, hill 6, town 2 | 0/0 | 0 |
| 013 | BR/HA 2, BR/LN 4, BR/LT 1, PT/HC 1, PT/LC 1, PT/LN 5, PT/LT 2 | FR/FA 1, FR/HC 1, FR/LC 1, FR/LN 6, FR/LT 1, FR/ML 2 | Buchan, Da Costa, Stewart / Harispe, Villatte | bridge 2, ford 11, fordNoStop 1, forest 10, hill 14, town 2 | 0/0 | 2 |
| 014 | AL/FA 2, AL/LC 2, AL/LN 5, AL/LT 1, AL/ML 1, BR/FA 2, BR/GG 2, BR/LN 3, BR/RI 1 | FR/CU 2, FR/FA 3, FR/LC 1, FR/LN 9, FR/LT 2 | Alten, Picton, Prince of Orange, Perponcher / Kellermann, Foy, Bachelu | bridge 2, fordNoStop 8, forest 12, hill 12, town 2 | 0/0 | 2 |
| 015 | AL/LC 2, AL/LN 6, AL/LT 1, BR/FA 3, BR/GG 1, BR/GHC 1, BR/HC 1, BR/LN 4, BR/LT 1, BR/RI 1 | FR/CU 1, FR/FA 2, FR/GA 1, FR/GHC 1, FR/HA 1, FR/LC 2, FR/LN 8, FR/LT 1, FR/OG 1, FR/YG 1 | Hill, Picton, Perponcher / d'Erlon, Reille, Ney | forest 8, hill 14, sandQuarry 1, town 3 | 0/0 | 0 |

Forced updates to existing tests (the battles now exist): `loader.test.ts` "is the hidden drill battle 000…" → file ids are `000`–`015`, only `000` hidden, no file has `expansion`, `scenarioById(id)` equals `scenarioFromJson(file)` for each; its key walk runs over all 16 files unchanged. `clean-slate.test.ts` → header comment rewritten ("the Ancients battles are gone; the hidden drill 000 and the generated base battles remain"); `SCENARIOS` ids `['000', '001', …, '015']`; `visibleBattles` ids `001`–`015`; `randomPick(SCENARIOS, '000', rnd)` never returns `000` over 50 draws; the picker opened with `initialBattle: '000'` still does not contain `Drill`, and its "with no battle its Start is disabled" half is inverted (Start is enabled, the first base battle shown). `screens.test.ts` "battle picker tabs" → the base tab lists `001`–`015` in order, the Expansion #1 tab holds no real battle (ignore any mocked stand-in T1c-4 kept), the drill is in no tab. `setup-validation.test.ts:30` → `SCENARIOS` ids are `000`–`015` and each `createGame`s without throwing.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/scenarios`
Expected: FAIL (`META` empty, no files, empty manifest).

- [ ] **Step 3: Write `meta-base.ts`, generate, fill the manifest, update the forced tests**

Run `npx vite-node scripts/scenarios/build.ts`, then compute the 15 checksums with a temporary test that prints `checksums(game(id))` (deleted before the commit) and paste them into `MANIFEST`.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vite-node scripts/scenarios/build.ts -- --check && npm run typecheck && npm test`
Expected: `--check` exits 0; typecheck clean; all green.

- [ ] **Step 5: Commit**

```bash
git add scripts/scenarios src/scenarios/data src/scenarios/index.ts design/rules-reference.md tests/scenarios tests/ui/clean-slate.test.ts tests/ui/screens.test.ts tests/engine/setup-validation.test.ts <other count-only test files listed in the report>
git commit -m "feat(scenarios): battles 001-015 generated from the verified map data, with manifest and setup tests

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Briefing texts

**Files:**
- Modify: `src/scenarios/texts.ts` (15 entries; header comment: "Briefing texts by battle id; the loader reads this table." — drop "Plan 6")
- Create: `tests/scenarios/texts.test.ts`

**Interfaces:**
- Consumes: `ScenarioTexts { blurb: string; specialText?: string[]; hint: string }` (unchanged), `CATALOGUE`.
- Produces: `TEXTS['001']`…`TEXTS['015']`, shown by the picker as `blurb`, `specialText`, `difficultyHint`.

`blurb`: 2–4 sentences, 30–80 words: who fought whom, where and why, and how it ended, agreeing with `src/history/battles/<id>.ts`. `hint`: one line, at most 70 characters, about what the player must do (for example "Hold the ridge; the French must come to you."). `specialText` is fixed copy:

| Id | specialText |
|---|---|
| 001 | "Each hill at either end of the French baseline gives the Anglo-Portuguese a temporary banner while one of their units holds it at the start of their turn." · "The river is fordable everywhere." |
| 002 | (none) |
| 003 | "Vimiero: the French gain 2 temporary banners while they hold both town hexes at the start of their turn, and lose both the moment either hex is empty." · "The river is fordable everywhere." |
| 004 | "All streams are fordable." |
| 005 | "The Portina Brook stops movement but gives no battle penalties; a unit that entered it this turn may not take ground." · "A British battery starts behind field works on a hill." |
| 006 | "An Anglo-Portuguese unit that leaves the board by the Côa bridge on its own baseline scores 1 permanent banner; leaders may leave but score nothing." · "No retreat leads off the bridge: a unit that cannot complete its retreat loses blocks instead." · "The river is impassable except at the bridge." · "The Fortress of Almeida counts as a town; an Anglo-Portuguese unit there may ignore 1 flag." · "Each side holds 4 cards." |
| 007 | "The stream is fordable everywhere." |
| 008 | (none) |
| 009 | "The Ancos is impassable except at the bridge." |
| 010 | "The Azan is impassable except at the bridge." |
| 011 | "The stream is fordable everywhere, and entering it does not stop movement." |
| 012 | "Two French light infantry units start in square, so 2 French cards begin on the square track." · "The first French infantry unit destroyed gives the British 1 banner; each later one gives 2." |
| 013 | "Nauzeilles and the Seminary each give the Anglo-Portuguese a temporary banner while held at the start of their turn." · "The river is fordable; crossing at the ford does not stop movement." |
| 014 | "Quatre Bras gives the French a temporary banner while held at the start of their turn." · "The stream is fordable everywhere, and entering it does not stop movement." · "Allied line infantry retreats 2 hexes per flag." |
| 015 | "La Haye Sainte, Hougoumont and Papelotte each give the French a temporary banner while held at the start of their turn." · "British cavalry is impetuous: after a successful attack it must break through and press on 1 hex towards the French." · "Allied line infantry retreats 2 hexes per flag." |

- [ ] **Step 1: Write the failing test** `tests/scenarios/texts.test.ts`

```ts
it('every base battle has texts; every entry is a catalogue battle', () => {
  // CATALOGUE.filter(b => b.box === 'base') ids ⊆ Object.keys(TEXTS); every key of TEXTS has a catalogueEntry
});
it('blurbs are 30–80 words, hints at most 70 characters', ...);
it('special rules: line counts and key words', () => {
  // counts { '001': 2, '002': 0, '003': 2, '004': 1, '005': 2, '006': 5, '007': 1, '008': 0, '009': 1, '010': 1, '011': 1, '012': 2, '013': 2, '014': 3, '015': 3 }
  // 006 mentions 'bridge', 'Almeida', '4 cards'; 012 'square'; 015 'impetuous'
});
it('British spelling, and no quotation of 15 words or more', () => {
  // no match of /\b(center|centers|color|colors|maneuvers?|defense|honor|favor|armor|toward)\b/i in any string;
  // every run inside “…” or "…" has fewer than 15 words
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/scenarios/texts.test.ts`
Expected: FAIL (TEXTS empty).

- [ ] **Step 3: Write the 15 entries** (read each `src/history/battles/<id>.ts` first; no fact that is not there)

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/scenarios/texts.test.ts && npm run typecheck && npm test`
Expected: PASS; all green.

- [ ] **Step 5: Commit**

```bash
git add src/scenarios/texts.ts tests/scenarios/texts.test.ts
git commit -m "feat(scenarios): briefing texts for battles 001-015

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Random-play soak of every battle

**Files:**
- Create: `tests/scenarios/battles-soak.test.ts`

**Interfaces:**
- Consumes: `GameDriver`, `createGame`, `randomAnswer`, `bannerTotal` (`src/engine`); `chooseAnswer`, `newMemory`, `PERSONALITIES` (`src/ai`, T1c-3a stub); `mulberry32` (`tests/support/rng.ts`); `must` (`tests/rules/helpers.ts`); `scenarioById`.

- [ ] **Step 1: Write the test**

```ts
for (const id of range(1, 15)) {     // '001'…'015'
  for (const k of [0, 1]) it(`${id} random play, seed ${k}, ends with a winner within 6000 decisions`, () => {
    // seed = 7000 + 10 * Number(id) + k; createGame(scenarioById(id).setup, seed); answers randomAnswer(state, pending, mulberry32(seed))
    // after the loop: winner !== null (message: turn number and both banner totals); bannerTotal(winner) >= bannersToWin;
    // unit hexes on the board distinct; 1 <= blocks <= maxBlocks for every unit
  });
  it(`${id} AI stub on both sides ends with a winner and no fallbacks`, () => {
    // seed 9000 + Number(id); chooseAnswer(state, pending, { side: pending.side, difficulty: 'tribune', personality: PERSONALITIES[0], seed, deterministic: true }, mem[side]);
    // winner !== null within 6000 decisions; mem.top.fallbacks ?? 0 === 0 and the same for bottom; console.error not called (vi.spyOn)
  });
}
```

- [ ] **Step 2: Run it**

Run: `npx vitest run tests/scenarios/battles-soak.test.ts`
Expected: PASS, about 45 tests (the preflight dry run finished every battle within 1489 decisions, about 1 s in all; rename the file to `battles-soak.slow.test.ts` only if it takes over 10 s). A battle that fails to finish or breaks an invariant is an engine bug: stop and report it with the battle, seed and turn (the owner is the Plan 2B task for the rule involved); do not raise the cap.

- [ ] **Step 3: Run everything**

Run: `npm run typecheck && npm test`
Expected: clean; all green. Note the file's run time in the report.

- [ ] **Step 4: Commit**

```bash
git add tests/scenarios/battles-soak.test.ts
git commit -m "test(scenarios): random-play and AI-stub soak of battles 001-015

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Battle rules in the real setups (after T13)

**Files:**
- Create: `tests/scenarios/battle-rules.test.ts` (header `// Rules: RR §13.3–§13.4, §14.1–§14.15 (design/rules-reference.md)`)

**Interfaces:**
- Consumes: T13's `turnStartObjectives(s, ctx, side)`, `updateHeld(s, ctx)`, `bannerTotal(s, side)`, `exitAllowedFrom(s, piece, hex)`, `scoreKill(s, ctx, u)`, `sideRuleFlagIgnores(s, u)`, `impetuous(s, u)`; `game`, `H` (`tests/scenarios/helpers.ts`). `ctx = { emit: () => {} }`.

A local helper `placeOn(s, side, hex)`: removes any unit on `hex`, then moves the first unit of `side` (file order) whose arm may stand there onto it. The tests check that the meta's hexes and sides are wired to the right battle; the rules themselves are T13's tests.

- [ ] **Step 1: Write the tests**

```ts
it('001: the baseline hills give top a banner each at top’s turn start; a lone leader holds nothing', () => {
  // placeOn top (8,2) → turnStartObjectives top → bannerTotal top 1; placeOn top (8,11) → 2; a fresh game with only a top leader moved to (8,2) → 0;
  // turnStartObjectives bottom with a top unit on (8,2) → 0
});
it('003: French on both Vimiero hexes → 2; one emptied → 0 at once', ...);   // placeOn bottom (1,3) and (1,4); then move the unit off (1,4) and updateHeld → 0
it('006: the bridge exit is the top side’s; the fortress flag-ignore is the top side’s', () => {
  // exitAllowedFrom(s, a top unit, H(0,4)) true, H(0,5) false, a bottom unit at (0,4) false;
  // the top BR/FA starting on (0,11): sideRuleFlagIgnores 1; a bottom unit moved to (0,12): 0; a top unit on the windmill (4,10): 0
});
it('012: first French infantry kill 1, the next 2; French cavalry 1', () => {
  // scoreKill on a bottom FR/LN → bannerTotal top 1; on a bottom FR/LT → 3; on a bottom FR/HC → 4; scoreKill on a top BR/LC → bottom 1
});
it('013: Nauzeilles (7,0) and the Seminary (8,11) for top', ...);
it('014: Quatre Bras (1,5) for bottom', ...);
it('015: the three farms for bottom; only British cavalry is impetuous', () => {
  // placeOn bottom (3,5), (4,1), (4,12) → bannerTotal bottom 3;
  // impetuous true for every top unit keyed BR/HC or BR/GHC, false for top AL/LC and for every bottom unit
});
```

- [ ] **Step 2: Run them**

Run: `npx vitest run tests/scenarios/battle-rules.test.ts`
Expected: PASS. A failure is either a meta error (fix `meta-base.ts`, rebuild, rerun Task 2's tests) or an engine bug (stop and report to T13's owner).

- [ ] **Step 3: Run everything**

Run: `npx vite-node scripts/scenarios/build.ts -- --check && npm run typecheck && npm test`
Expected: clean; all green.

- [ ] **Step 4: Commit**

```bash
git add tests/scenarios/battle-rules.test.ts
git commit -m "test(scenarios): objectives and side rules of the base battles in their real setups

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(If Step 2 changed `meta-base.ts`, add `scripts/scenarios/meta-base.ts src/scenarios/data` and the touched manifest lines.)

---

### Task 6: Picker check, visual check against the maps, docs

**Files:**
- Modify: `tests/ui/screens.test.ts` (one new test), `CLAUDE.md` (Status, Commands test count, Development shortcuts, Where things live)

**Interfaces:**
- Consumes: `ScenarioSelect` (`src/ui/screens/Menus.tsx`, T1c-4), `SCENARIOS`, `TEXTS`.

- [ ] **Step 1: Write the picker render test** (in `tests/ui/screens.test.ts`)

```ts
it('the briefing of each base battle shows its blurb and special rules', () => {
  // for every id 001–015: renderToStaticMarkup(createElement(ScenarioSelect, { onBack, onStart, initialBattle: id }))
  // contains the battle name, TEXTS[id].blurb (HTML-escaped) and every TEXTS[id].specialText line
});
```

Plan 4 items in the picker (layout, commander portraits, optional rules) stay as T1c-4 left them; this task adds no UI code. If the test fails because the picker does not render a field, stop and report it (owner: Plan 4).

- [ ] **Step 2: Run it**

Run: `npx vitest run tests/ui/screens.test.ts`
Expected: PASS.

- [ ] **Step 3: Browser check**

Start the `dev` launch config; on its origin run `localStorage.setItem('ccn-muted','1'); location.reload()`. Check: the picker's base tab lists 15 battles and the Expansion #1 tab none; each briefing shows blurb, hint and special rules; random battle never lands on the drill. Then for each id open `#/play/<id>/bottom/tribune`, screenshot the opening board into `/Users/janisstrods/Gamemaking/cnc-napoleonics-research/map-work/p3b/<id>.png` (never committed) and compare it by eye with `/Users/janisstrods/Gamemaking/cnc-napoleonics-research/maps/<id>.jpg`: units, leaders, terrain, rivers, bridges, works sides, squares (012). Play two turns of 006 and 012 with "Let the general decide" and confirm no console errors. Record a one-line verdict per battle in the report. A data mismatch goes back to `design/data` (with the Plan 3A tools and a note in its verify log); a drawing problem is reported, not fixed (owner: T1c-4's painters / Plan 4).

- [ ] **Step 4: Update `CLAUDE.md`**

Controller ruling (a), amended: whichever of this task and Plan 2B T14 lands second writes the Status line (T14 carries a note in the 2B ledger to do so). Merge `main` first; if T14 has already landed, replace its "`000` is still the only battle until Plan 3B" sentence; if not, write the line below and T14 keeps it.

- Status: battles 001–015 are generated from `design/data` (Plan 3B) and playable; `000` stays the hidden drill.
- Development shortcuts: replace the "only the hidden drill battle `000` for now (Napoleonic battles return in Plan 6)" line (the last stale "Plan 6" reference; Task 2 fixed `manifest.ts` and `src/scenarios/index.ts`, Task 3 `texts.ts`) with: battle files `src/scenarios/data/<id>.json` are generated by `npx vite-node scripts/scenarios/build.ts` (`-- --check` to verify, `-- --ids 006` for one) from `design/data/<id>.json` and `scripts/scenarios/meta-base.ts`; never hand-edit them; briefing texts in `src/scenarios/texts.ts`.
- Where things live: the converter (`scripts/scenarios/convert.ts`; it refuses unsupported features until Plan 7), the meta table, `tests/scenarios/{generated,base,battles-soak,battle-rules,texts}.test.ts` and `manifest.ts`.
- Commands: the test count and time from this run.

- [ ] **Step 5: Run everything**

Run: `npx vite-node scripts/scenarios/build.ts -- --check && npm run typecheck && npm test`
Expected: clean; all green.

- [ ] **Step 6: Commit**

```bash
git add tests/ui/screens.test.ts CLAUDE.md
git commit -m "test(ui): base battle briefings in the picker; docs for the scenario build

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Spec and contract notes found while planning

1. **Ownership overlap with Plan 2B** (ruling (a), amended). Plan 3B owns `scripts/scenarios/**` exclusively; T14 may make type-only fixes to `build.ts`. CLAUDE.md's Status line is written by whichever of 3B Task 6 and T14 lands second. Task 2 may change the one T14-owned assertion `tests/engine/setup-validation.test.ts:30`.
2. **`setup.ts` is not on Plan 2B's frozen list,** and T13 may modify it (ruling (b)). Plan 3B relies on T1c-1's `ObjectiveSetup`, `SideRuleSetup`, `UnitSetup` (`square`), `TerrainSetup`, `TerrainName` and `RiverRule`. Task 2's byte-for-byte check and Task 1's tests catch any drift; rerun them after T13 merges.
3. **RR §14.14–§14.15 list the Allied units as "`sideRules` (top)",** but `SideRuleDef` has no such kind: AL behaviour comes only from the `AL/*` rows (R10). Plan 3B writes no side rule, and Task 2 corrects the RR wording (ruling (c)).
4. **`design/data` has no structured sides, hands, first player, banners, river rule or objective records** (objectives are free-text notes on hexes). So `meta-base.ts` restates RR §14 as data, and the converter checks its objective hexes against the map's marked hexes.
5. **Stale "Plan 6" references** for the battles' return contradict the roadmap (Plan 3). They are fixed in passing (ruling (e)): `manifest.ts` and the `src/scenarios/index.ts` header in Task 2, `texts.ts` in Task 3, CLAUDE.md in Task 6.
6. **001/002 have a leader labelled `(unnamed)`** in `design/data`. Controller ruling (f): the meta names him `Brennier` (Oman's spelling, as in histories 001–003; he is stacked with the FR/LN of Brennier's line brigade, `src/history/battles/001.ts:24`); `design/data` keeps `(unnamed)`.
7. **Spec testing line "headless AI-vs-AI soak over every battle":** until Plan 5 the AI is T1c-3a's random stub, so Task 4 soaks with it and with random play. The real AI soak belongs to Plan 5.
