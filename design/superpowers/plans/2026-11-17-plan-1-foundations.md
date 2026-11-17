# C&C: Napoleonics — Plan 1: Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A new `cnc-napoleonics` project copied from the Ancients edition, renamed so it can never clash with Ancients, plus the three documents every later plan builds on: the base-game rulings, the authoritative rules reference, and the survey of battles 001–015.

**Architecture:** Task 1 takes an exact copy of `cnc-ancients` at commit `6f4941b` into a fresh git repo. Task 2 renames its identity (storage keys, dev hook, title, version), guarded by a test. **The Ancients game stays working and its ~2570 tests stay green in this plan.** Ancients content is deleted at the start of Plan 2, when the new engine types land, because deleting it earlier leaves half-broken code. Tasks 3–6 are research and specification documents, written into `design/`.

**Tech Stack:** TypeScript 5.6, Vite 5, React 18, Vitest 2 (inherited from `cnc-ancients`). Research uses WebSearch/WebFetch and PDF reading.

**Spec:** `design/superpowers/specs/2026-11-17-cnc-napoleonics-design.md`. Companion research: `design/ccn-rules-research.md`. Until Task 1 runs, both are in `/Users/janisstrods/Gamemaking/cnc-napoleonics-research/`.

## Roadmap (the plans after this one)

Each plan is written by Opus when the previous one has landed, because each needs the previous one's output.

| Plan | Covers (spec phases) | Needs from earlier plans |
|---|---|---|
| 1 Foundations (this) | 1 scaffold, 2 rules, the base-scenario survey | — |
| 2 Engine | 3: delete Ancients content, new engine contract and rules, test-first from `design/rules-reference.md` | rules reference, unit codes |
| 3 Base scenarios | 4: map-reading and verification tooling (committed under `scripts/`), transcription of 001–015 | engine scenario format, survey |
| 4 UI | 5: new decisions in the prompts, dice faces, tooltips, theme | engine decisions |
| 5 AI | 6: probability model, evaluation, card values, policies, balance. **Ends with the base game playable locally.** | engine, scenarios |
| 6 Extras | 7: miniature art, histories, Triumphs, rules dialog (parallel worktrees) | all of the above |
| 7 Expansion #1 | 8: Spanish survey, rulings, transcription, units, Guerrilla counters, art, histories, AI | base game done |
| 8 Release | 9: golden replays, full review, first publish | everything |

## Global Constraints

- Never modify anything under `/Users/janisstrods/Gamemaking/cnc-ancients`. Read it freely.
- Project folder: `/Users/janisstrods/Gamemaking/cnc-napoleonics`. Branch `main`. Copy source: `cnc-ancients` commit `6f4941b` (v1.6.2).
- Every localStorage key starts with `ccn-` (Ancients uses `cca-`; both sites share the strods.work origin). The dev hook is `window.__ccn`.
- Repo name `cnc-napoleonics`; site https://strods.work/cnc-napoleonics/. **No push in this plan**: the user creates the GitHub repo when the first push is due. Until the first release, `docs/` (build output) is git-ignored and Pages stays off.
- No GitHub Actions files (`.github/workflows/*`); the push token lacks the `workflow` scope.
- Rules text is paraphrased in our own words; quotations from sources stay under 15 words. British spelling.
- Rules follow GMT *Rules of Play, 4th Edition* first, then the National Unit Reference Cards / Quick Reference Card, the 2nd-edition scenario booklet, Richard Borg's rulings in the commandsandcolors.net condensed FAQ, then BGG.
- Models: Tasks 1, 2 and 5 are implemented by **Sonnet**; Tasks 3, 4 and 6 (rules judgement and specification) by **Opus**. Every task is reviewed by **Opus**.
- Commits are path-limited (`git add <paths>`, never `git add -A` after Task 1) and end with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Unit and nation codes** (fixed here because Plans 2–7 key data on them; Task 4 uses exactly these):
  - Nations: `FR` French, `BR` British, `PT` Portuguese, `AL` Allied (Dutch-Belgian and German at 014–015), `SP` Spanish (Expansion #1).
  - Infantry: `LN` line, `LT` light, `RI` rifle, `GR` grenadier, `YG` Young Guard, `OG` Old Guard, `GG` Guard Grenadier, `ML` militia.
  - Cavalry: `LC` light, `LNC` lancer, `HC` heavy, `CU` cuirassier, `GLC` Guard light, `GHC` Guard heavy.
  - Artillery: `FA` foot, `HA` horse, `GA` Guard foot. Leader: `LDR`.
  - A unit is identified by nation + code (for example `BR/LN`). If a source needs a type not listed, Task 4 adds a code and says so in its report.

## Review Focus

1. **A player who has played Ancients on strods.work opens Napoleonics:** they expect no Ancients save, medals, speed or mute setting to appear, and Ancients to be untouched. Pinned by Task 2's `identity.test.ts`, which scans `src/` for the old prefix.
2. **A rule the rulebook leaves open:** the engine author must find one decision, not a guess. Pinned by Task 4's check that `design/rules-reference.md` has no `[?]` and that every `[Interp]` points to a row in `design/rulings.md`.
3. **A scenario whose web page, booklet and map disagree** (unit counts, hand sizes, banners): the survey records which source wins and why, so transcription never guesses. Pinned by Task 5's discrepancy section and its count check.
4. **The built site served from `/cnc-napoleonics/`:** it must load with relative asset paths. Pinned by Task 2's `pages-preview` launch config and its build check.
5. **An accidental `npm run build` before release:** the generated `docs/` must not be committed. Pinned by Task 1's `.gitignore` entry and its `git status` check.

---

### Task 1: Create the project from Ancients v1.6.2

**Model:** Sonnet.

**Files:**
- Create: `/Users/janisstrods/Gamemaking/cnc-napoleonics/` (whole tree from `git archive`)
- Move: every existing `design/*` → `design/ancients/` (Ancients docs kept as reference; only comments in code point at them)
- Create: `design/superpowers/specs/2026-11-17-cnc-napoleonics-design.md`, `design/ccn-rules-research.md`, `design/superpowers/plans/2026-11-17-plan-1-foundations.md` (copied from `/Users/janisstrods/Gamemaking/cnc-napoleonics-research/`)
- Modify: `.gitignore` (add `docs/`)
- Delete: `docs/` (Ancients build output)

**Interfaces:**
- Produces: a git repo on branch `main` whose first commit is the unchanged Ancients game, with all tests passing. Later tasks rely on the paths above.

- [ ] **Step 1: Confirm the source commit**

Run: `git -C /Users/janisstrods/Gamemaking/cnc-ancients rev-parse --short 6f4941b && git -C /Users/janisstrods/Gamemaking/cnc-ancients cat-file -t 6f4941b`
Expected: `6f4941b` and `commit`. Also confirm `/Users/janisstrods/Gamemaking/cnc-napoleonics` does not exist yet (`test ! -e …`); stop and report if it does.

- [ ] **Step 2: Extract the tree**

```bash
mkdir /Users/janisstrods/Gamemaking/cnc-napoleonics
git -C /Users/janisstrods/Gamemaking/cnc-ancients archive 6f4941b | tar -x -C /Users/janisstrods/Gamemaking/cnc-napoleonics
cd /Users/janisstrods/Gamemaking/cnc-napoleonics && rm -rf docs
```

- [ ] **Step 3: Move the Ancients design docs and add the new ones**

Move everything currently in `design/` into `design/ancients/`. Then copy the three files from `/Users/janisstrods/Gamemaking/cnc-napoleonics-research/` to the paths in **Files**. In the copied spec, change `Status:` to `Approved by user 2026-11-17.` and delete the sentence about the file moving. Leave the research folder in place (it also holds map images later).

- [ ] **Step 4: Ignore build output until the first release**

Append to `.gitignore`:

```
# Build output for GitHub Pages. Ignored until the first release (Plan 8 removes this line and commits docs/).
docs/
```

- [ ] **Step 5: Install and run the inherited checks**

Run: `npm ci && npm run typecheck && npm test`
Expected: typecheck clean; Vitest reports all test files passed (about 2570 tests, about 75 s). Note the exact test count in the commit message body. If anything fails, stop and report it: the copy must start green.

- [ ] **Step 6: First commit**

```bash
git init -b main && git add -A && git status --short | grep -c '^A' && git status --short docs | wc -l
```
Expected: a positive file count, and `0` lines for `docs`.

```bash
git commit -m "chore: start from cnc-ancients v1.6.2 (6f4941b)

The unchanged Ancients edition as the base for Commands & Colours: Napoleonics.
Ancients design docs moved to design/ancients/. <N> tests pass.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Project identity

**Model:** Sonnet.

**Files:**
- Modify: `src/ui/storage.ts`: add the prefix constant and key helper
- Modify: `src/ui/sound.ts:5,24`, `src/ui/record.ts:140,165`, `src/ui/game/controller.ts:119,208,273`, `src/ui/game/GameScreen.tsx:56`, `src/ui/screens/Menus.tsx:94,208,256`, `src/ui/screens/picker.ts:46,92`, `src/ui/kit/CardView.tsx:217`, `src/dev/KitGallery.tsx:99`
- Modify: `index.html` (title), `package.json` and `package-lock.json` root (name, version), `src/version.ts`, `.claude/launch.json`, `CLAUDE.md`, `README.md`
- Modify: `tests/ui/record.test.ts`, `tests/ui/exp1-screens.test.ts` (keys), `tests/ui/version.test.ts`
- Create: `tests/ui/identity.test.ts`

**Interfaces:**
- Produces: `STORAGE_PREFIX: 'ccn-'` and `storageKey(name: string): string` exported from `src/ui/storage.ts`. Every later plan builds keys with `storageKey`, never a string literal.

- [ ] **Step 1: Write the failing test** `tests/ui/identity.test.ts`

```ts
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { STORAGE_PREFIX, storageKey } from '../../src/ui/storage';

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(p) ? [p] : [];
  });

describe('project identity', () => {
  it('keys localStorage under ccn-', () => {
    expect(STORAGE_PREFIX).toBe('ccn-');
    expect(storageKey('muted')).toBe('ccn-muted');
  });
  it('never uses the Ancients prefix or dev hook in src', () => {
    const offenders = files('src').filter((p) => /['"`]cca-|__cca\b/.test(readFileSync(p, 'utf8')));
    expect(offenders).toEqual([]);
  });
  it('is titled Commands & Colours: Napoleonics', () => {
    expect(readFileSync('index.html', 'utf8')).toContain('<title>Commands &amp; Colours: Napoleonics</title>');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/ui/identity.test.ts`
Expected: FAIL (`STORAGE_PREFIX` is not exported, the offenders list names the seven files above, and the title differs).

- [ ] **Step 3: Implement**

- `src/ui/storage.ts`: `export const STORAGE_PREFIX = 'ccn-';` and `export function storageKey(name: string): string` (returns `STORAGE_PREFIX + name`).
- Replace every `'cca-<name>'` literal with `storageKey('<name>')`. That covers `muted`, `record-v1`, `triumphs` (the record file mark), `autosave-v1`, `speed`, `difficulty`, `battle-tab` and `options`.
- In `GameScreen.tsx`, rename `__cca` to `__ccn`.
- `index.html`: set the title to `Commands &amp; Colours: Napoleonics`. Keep the favicon shape.
- Branding strings:
  - `CardView.tsx:217`: caption `Napoleonics`.
  - `KitGallery.tsx:99`: `Commands &amp; Colours · Napoleonics`.
  - `Menus.tsx:94`: the About paragraph names *Commands &amp; Colours: Napoleonics* (Richard Borg, GMT Games) with the same disclaimer.
- Update the keys asserted in `tests/ui/record.test.ts` and `tests/ui/exp1-screens.test.ts` to `ccn-`.

- [ ] **Step 4: Reset the version**

- `package.json` and the root of `package-lock.json`: `"name": "cnc-napoleonics"`, `"version": "0.1.0"`.
- `src/version.ts`: `RELEASES` becomes exactly one entry: `{ number: '0.1.0', name: 'Unreleased', notes: 'Work in progress: Commands & Colours: Napoleonics, started from the Ancients edition v1.6.2' }`.
- `tests/ui/version.test.ts`: the battle-name rule exempts the name `'Unreleased'`, with the comment `// until the first release (Plan 8)`. The other release checks are unchanged.

- [ ] **Step 5: Point the sub-path preview at the new site**

In `.claude/launch.json`, change `pages-preview`'s base to `/cnc-napoleonics/`.

Then run: `npm run build && ls docs/index.html && git status --short docs | wc -l`
Expected: the file exists and `0` (the folder is ignored).

- [ ] **Step 6: Rewrite CLAUDE.md and README.md for the new project**

- **CLAUDE.md:** keep the Ancients structure (Commands, Development shortcuts, Where things live) with names updated: `window.__ccn`, `localStorage.setItem('ccn-muted','1')`.
- **Publishing:**
  - Repo `janisstrods/cnc-napoleonics`, site https://strods.work/cnc-napoleonics/.
  - Pages stays off and `docs/` is git-ignored until the first release.
  - The release-naming rule uses battles of this game. The `Unreleased` placeholder stands until the first release.
  - Keep the no-Actions and HTTPS-push notes.
- **Status section, near the top:**
  - The code is still the Ancients game.
  - Plan 2 replaces the engine and deletes Ancients content.
  - `design/ancients/` holds the Ancients design docs for reference.
  - The roadmap is in `design/superpowers/plans/2026-11-17-plan-1-foundations.md`.
- **Leave Golden fixtures and Battle histories alone.** They still describe the Ancients content, which Plan 2 deletes. Add one line under each saying so.
- **README.md:** a short work-in-progress README with the same run commands and the unofficial-fan-edition credit line naming GMT Games.

- [ ] **Step 7: Run all checks**

Run: `npm run typecheck && npm test`
Expected: typecheck clean; every test passes, including `identity.test.ts`, with the count from Task 1 plus 3.

- [ ] **Step 8: Commit**

```bash
git add src tests index.html package.json package-lock.json .claude/launch.json CLAUDE.md README.md
git commit -m "chore: Napoleonics identity (ccn- storage keys, __ccn, title, v0.1.0)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Base-game rulings

**Model:** Opus. Research task: fetch and read the primary sources yourself. Do not rely on `design/ccn-rules-research.md` alone, which a single research pass wrote.

**Files:**
- Create: `design/rulings.md`
- Create (outside the repo, not committed): source PDFs under `/Users/janisstrods/Gamemaking/cnc-napoleonics-research/sources/`

**Interfaces:**
- Consumes: `design/ccn-rules-research.md` (sources §9, open questions at the end); the spec's "Rules basis" defaults table.
- Produces: `design/rulings.md` with a numbered decisions table (`R1`, `R2`, …). Task 4 cites these ids in its `[Interp]` marks. Plan 2's tests cite them too.

- [ ] **Step 1: Fetch the sources**

Download into `…/cnc-napoleonics-research/sources/`:
- the 4th-edition rulebook
- the Quick Reference Card
- the 2nd-edition scenario booklet
- the extra Salamanca scenarios

The URLs are in research §9. Read the commandsandcolors.net Napoleonics condensed FAQ pages. Search BGG only for points the official texts leave open.

- [ ] **Step 2: Write the source ranking and source list**

At the top of `design/rulings.md`, write:
- the ranking from Global Constraints
- each source's title, date or edition, and URL

- [ ] **Step 3: Rule on every point below and record each one**

**Format.** One table row per point: id | point | decision | basis (source, section or page) | `[Interp]` if no source settles it, with one sentence of reasoning.

**Points:**
- **The spec's open points:**
  - French Grenadier fire
  - French line +1 melee against infantry
  - stacking of terrain reductions when both hexes have terrain
  - whether Combined Arms artillery is spent for the turn
  - moving infantry fire and its rounding by nation
  - lone leaders as fire targets
- **Unit details:**
  - which unit types and counts the current base box supplies, including French lancers and Guard light cavalry
  - the artillery dice-by-range tables, including the 1-block rows
  - horse artillery moving and firing
  - hill batteries firing over adjacent lower friendly units
- **Dice and leaders:**
  - sabre hits: melee only, the militia and rifle exceptions, lone leaders
  - the leader casualty check after a failed retreat
  - leaders giving +1 die only on Leadership
  - a lone leader counting toward support
  - leader escape
- **Squares:**
  - when forming is forbidden: hand size, terrain, track full, First Strike
  - who draws the random card and how it is hidden
  - Command reduction
  - the square firing first, and bounce flags
  - 1-die caps both ways
  - leaving square
  - a square eliminated
- **Movement and melee results:**
  - Retire and Reform: the trigger, the path, which hits count, no battle back
  - taking ground into or out of forest, town or ford
  - cavalry breakthrough distance and bonus melee
  - the one-bonus-per-turn limit
- **Combined Arms:** line of sight, dice lost on a bounce or First Strike, its use in a bonus melee.
- **Terrain:**
  - into and out values per arm, with fire and melee separated
  - Field Works hexsides, and works on a hill
  - fords and streams
  - no melee across rivers
  - hill line of sight: plateau, two hills, low to first hill
  - the side board edge blocking line of sight
- **Cards:**
  - Scout: when it draws and when it discards
  - Assault equal to Command when squares hold cards
  - Élan's dice orders and reshuffle
  - Rally anywhere, never above starting size
  - Short Supply's targets and destination
  - Counter-Attack copying a First Strike or a Scout
  - the "order 1 unit" fallback granting no bonuses
  - Fire and Hold out of square
  - Bombard
  - Cavalry Charge with heavy cavalry moving 3
  - Give Them the Cold Steel
  - La Grande Manoeuvre
- **Victory:**
  - the game ends the moment the target is reached, even during a battle back
  - turn-start timing for temporary banners
  - breakthrough exits
- **Edition differences:** anything the 4th edition changed from earlier printings that the 2010–2012 scenario booklet assumes.

- [ ] **Step 4: Verify completeness**

Run: `grep -c '^| R[0-9]' design/rulings.md`
Expected: at least 45 rows, and every bullet in Step 3 maps to a row. List any bullet with no row in the task report.

Run: `grep -n '\[?\]' design/rulings.md`
Expected: no output. An undecided point is a decision marked `[Interp]`, never `[?]`.

- [ ] **Step 5: Commit**

```bash
git add design/rulings.md
git commit -m "docs: base-game rulings for C&C: Napoleonics (4th edition)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The rules reference

**Model:** Opus.

**Files:**
- Create: `design/rules-reference.md`

**Interfaces:**
- Consumes: `design/rulings.md` (ids `R…`); the unit and nation codes in Global Constraints; the Ancients reference `design/ancients/rules-reference.md` as a model of structure and tone.
- Produces: `design/rules-reference.md` with these exact section numbers, which Plans 2–7 cite as `RR §n`:
  - §1 Board and sections
  - §2 Units: a table per nation (FR, BR, PT, AL) with code, unit, blocks, move, melee dice formula, standing fire formula, moving fire formula, range, retreat per flag, flags ignored, sabre hits yes/no and notes; then the artillery dice-by-range table and leaders
  - §3 Dice and hit scoring (fire, melee, lone leader, leader casualty checks)
  - §4 Terrain: movement, battle restrictions, into/out reductions per arm (fire and melee), flag effects, square allowed, line of sight, Field Works hexsides
  - §5 Turn sequence and Command (squares reduce Command)
  - §6 Orders, leaders attaching and detaching, ordering a square
  - §7 Movement
  - §8 Fire: range, line of sight, hill batteries
  - §9 Melee: sequence, battle back, First Strike, Retire and Reform, squares, Combined Arms, take ground, breakthrough and bonus melee
  - §10 Retreats and ignoring flags (sources of ignores, bounce flags)
  - §11 Leaders: casualty checks, lone leaders, escape
  - §12 Command cards: all 70, with counts and exact effects, including the fallbacks
  - §13 Victory and objectives: banner sources and each objective type as data-shaped definitions
  - §14 Base-scenario special rules: a stub that Task 6 fills
  - §15 onward reserved for Expansion #1 (state this; leave it empty)

- [ ] **Step 1: Write §1–§13**

**Every number lives in a table:** dice, blocks, ranges, reductions, counts. Each rule is stated so that a test can be written from it alone. Interpretations carry `**[Interp R<n>]**` pointing to the deciding row in `design/rulings.md`.

**Copy from Ancients where the games agree.** That covers the board geometry, sections, retreat direction and the hexside line-of-sight rule, which may be copied from `design/ancients/rules-reference.md` §1, §8 and §10. These are our own texts.

- [ ] **Step 2: Verify**

Run: `grep -n '\[?\]\|TBD\|TODO' design/rules-reference.md`
Expected: no output.

Run: `grep -o 'Interp R[0-9]*' design/rules-reference.md | sort -u`, then check that each id exists in `design/rulings.md`.
Expected: no id missing.

Run: `grep -c '^## ' design/rules-reference.md`
Expected: 15, for §1–§15.

**Self-check before committing:** pick three rules at random (one dice formula, one terrain reduction, one card), then write down the test assertion each implies, using only this file. Put the three assertions in the task report.

- [ ] **Step 3: Commit**

```bash
git add design/rules-reference.md
git commit -m "docs: rules reference for C&C: Napoleonics base game (RR §1-§13)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Survey of battles 001–015

**Model:** Sonnet. It can run in parallel with Tasks 3 and 4, because the codes are fixed in Global Constraints.

**Files:**
- Create: `design/survey.md`
- Create (outside the repo, not committed): map images at `/Users/janisstrods/Gamemaking/cnc-napoleonics-research/maps/001.jpg` … `015.jpg`

**Interfaces:**
- Consumes: the codes in Global Constraints. The format follows `design/ancients/exp1-survey.md` (read its "How to read this" section and one scenario entry).
- Produces: `design/survey.md`, which Plan 3 transcribes from and Task 6 folds into RR §14.
  - A `### NNN Name (date)` entry per battle.
  - A closing **Needs** summary.

- [ ] **Step 1: Collect the sources**

For each of 001–015:
- Fetch the commandsandcolors.net scenario page. The URL pattern is in `design/ccn-rules-research.md` §9.
- Download the map image to the maps folder.

Read the matching pages of the GMT scenario booklet. The PDF is in `…/cnc-napoleonics-research/sources/` if Task 3 has run; otherwise download it from the URL in research §9.

- [ ] **Step 2: Write one entry per battle**

Record these fields:
- The top and bottom army, with nation(s) and block colours. Which side moves first.
- Hand sizes, the banner target, and the leaders with their names.
- Unit counts by `nation/code`, from the page table and from the map, with any mismatch listed.
- Terrain types and rough counts.
- Victory objectives, with type, hexes or area, and banner value.
- Special rules, paraphrased.
- New needs: terrain, units or mechanics not in the base rules.

View each map image yourself to count units and read terrain. When page, booklet and map disagree, record all three values and the one you would follow, with a reason. The usual order of precedence is the booklet's later edition, then the map, then the page, unless a ruling says otherwise.

- [ ] **Step 3: Write the Needs summary**

Write four parts:
- a matrix of `nation/code` × battle, with counts
- every terrain type used, and the battles that use it
- every objective type used
- every special rule, with its battles

End with a **Discrepancies** list.

- [ ] **Step 4: Verify**

Run: `grep -c '^### 0[01][0-9] ' design/survey.md`
Expected: `15`.

**Totals check:** for each battle, check that the per-side unit totals in the entry equal the sum of its rows. Report any battle where page and map totals differ.

- [ ] **Step 5: Commit**

```bash
git add design/survey.md
git commit -m "docs: survey of C&C: Napoleonics battles 001-015

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Scenario rules into the reference, docs map

**Model:** Opus. It runs after Tasks 4 and 5.

**Files:**
- Modify: `design/rules-reference.md` §14
- Modify: `design/rulings.md` (new rows for scenario points, if any)
- Modify: `CLAUDE.md` ("Rules and docs" section)

**Interfaces:**
- Consumes: `design/survey.md` (special rules, objectives, Needs), `design/rulings.md`.
- Produces: RR §14, with one subsection per battle that has special rules or objectives (§14.1 = 001, and so on), stated as data a scenario file can carry. Plan 2's objective and scenario-rule engine work is written from it.

- [ ] **Step 1: Fill §14**

For every battle with special rules or objectives, write each rule as data-shaped text:
- the objective type, from the §13 taxonomy
- the hexes, as a description from the survey; Plan 3 gives exact coordinates
- the banner values
- side-specific rules naming the side

Examples include Waterloo's impetuous British cavalry and Allied 2-hex retreat, and García Hernández's doubled banners. Rule on anything ambiguous: add an `R…` row to `design/rulings.md` and cite it.

- [ ] **Step 2: Cross-check the reference against the survey**

Every unit `nation/code` in the survey's matrix appears in RR §2. Every terrain type in the survey appears in RR §4. Every objective type appears in RR §13. List and fix any gaps.

- [ ] **Step 3: Update the CLAUDE.md docs map**

Rewrite "Rules and docs" to point at:
- `design/rules-reference.md`, with a one-line outline of its §1–§15
- `design/rulings.md`
- `design/survey.md`
- `design/ccn-rules-research.md`
- `design/ancients/`, kept as Ancients reference only

- [ ] **Step 4: Verify and commit**

Run: `grep -n '\[?\]\|TBD\|TODO' design/rules-reference.md design/rulings.md`
Expected: no output.

Then: `npm test`
Expected: unchanged pass count (docs only).

```bash
git add design/rules-reference.md design/rulings.md CLAUDE.md
git commit -m "docs: base-scenario rules in RR §14; docs map in CLAUDE.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
