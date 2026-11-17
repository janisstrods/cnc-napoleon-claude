# C&C: Napoleonics — Plan 6A: Battle Histories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A three-slide history (road to battle and armies, animated schematic map, outcome) for each of the 33 battles (001–015 and the 18 of Expansion #1), using the history system inherited from the Ancients edition.

**Architecture:** Part of Plan 6 (Extras), pulled forward because it depends only on the battle catalogue (Plan 2A Task 2), not on the engine. Task 1 adapts the map vocabulary to the Napoleonic era. Tasks 2–12 write histories in batches of three battles. The batches run in three parallel lanes (git worktrees), each battle being its own file. Task 13 turns on coverage. History system: `src/history/{types,validate,index}.ts`, `src/ui/history/{BattleMap,HistoryDialog}.tsx`, `src/dev/HistoryGallery.tsx`. The Ancients design note is `design/ancients/superpowers/specs/2026-10-10-battle-history-design.md`; read it, since the slide format, phases, word limits and the fact-check step carry over.

**Tech Stack:** TypeScript, React, Vitest; Python 3 + PIL for `scripts/history-shot.sh` tiles; WebSearch/WebFetch for research.

**Spec:** `design/superpowers/specs/2026-11-17-cnc-napoleonics-design.md` ("Battle histories" under Extras).

## Global Constraints

- **Prose:** original, never copied sentences. Quotations from any source stay under 15 words. British spelling. Hedged where sources disagree or are uncertain ("about", "perhaps", "sources differ").
- **Sources:** cite period and modern sources by name: Napier's *History of the War in the Peninsula*, Oman's *History of the Peninsular War*, Wellington's *Dispatches*, French memoirs (e.g. Marbot, Foy), and modern works (e.g. Esdaile, Gates, Chandler, Fletcher, Adkin for Waterloo) with volume and chapter or page where you have them. Never invent a citation. Cite only what you actually consulted or can verify exists.
- **Sides:** a history's `top` and `bottom` sides are the battle's own top and bottom armies: `design/survey.md` for 001–015, the battle's commandsandcolors.net scenario page for Expansion #1.
- **Ids** match `src/scenarios/catalogue.ts`.
- `validateHistory` must report nothing; `npx vite-node scripts/history-check.ts -- <id>` must pass.
- Commits are path-limited and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Models:** Sonnet writes; Opus reviews and fact-checks each batch.

## Review Focus

1. **A wrong fact a Napoleonic enthusiast would spot:** a date, commander, unit, casualty figure or who held which ground. The Opus fact-check reviewer checks every name, date and number in each batch against at least two sources.
2. **A map that contradicts the scenario's orientation:** the French drawn at the bottom when they are the top army. The reviewer compares each map's sides with the survey or scenario page.
3. **Text overflowing the slide.** The validator's word limits plus the screenshot tiles, which the writer must read.
4. **Two-part battles told twice** (Roliça 001/002, Bussaco 007/008, Salamanca 010/011): each history covers its own phase of the day and refers to the other in one line.
5. **Unit kinds that look identical on the legend:** Task 1's glyph test.

---

### Task 1: Napoleonic map vocabulary

**Model:** Sonnet.

**Files:**
- Modify: `src/history/types.ts` (`UnitKind`, `MapFeature`), `src/history/validate.ts` (date pattern, kinds), `src/ui/history/BattleMap.tsx` (glyphs, sizes, legend names, feature drawing), `tests/history/fixture-007.ts` (converted to the new kinds and date), `tests/history/history.test.ts`

**Interfaces:**
- **Produces:**
  - `UnitKind = 'infantry' | 'light' | 'guard' | 'cavalry' | 'heavycavalry' | 'artillery'`.
  - `MapFeature` gains `{ kind: 'farm'; at: Pt; size?: number; label?: string }` (a walled farm or château such as Hougoumont) and `{ kind: 'redoubt'; at: Pt; size?: number; label?: string }`. It loses `camp`.
  - `BattleHistory.date`, when present, matches `^(\d{1,2}(–\d{1,2})? )?(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$` (for example `17 August 1808`, `16–17 January 1809`).
  - Writers use exactly these kinds.

- [ ] **Step 1: Write the failing tests**

In `history.test.ts`:
- **Distinct glyphs:** each `UnitKind` renders a distinct glyph markup. Render `UnitGlyph` for every kind and expect 6 distinct strings.
- **Legend names:** the legend lists all six kinds with these names:
  - `Infantry`
  - `Light infantry`
  - `Guard`
  - `Cavalry`
  - `Heavy cavalry`
  - `Artillery`
- **Date checks:** the validator accepts `'21 August 1808'` and `'16–17 January 1809'`, and rejects `'216'` and `'1808 AD'`.

Update the existing validator test's date expectations to the new message.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/history`
Expected: FAIL.

- [ ] **Step 3: Implement**

Glyphs, drawn small and plain in the existing style:
- **infantry:** solid block.
- **light:** loose dotted block.
- **guard:** block with a double border.
- **cavalry:** block with a diagonal.
- **heavycavalry:** block with a cross.
- **artillery:** gun-and-wheel mark.

**Map features:**
- **farm:** a small walled square with a courtyard.
- **redoubt:** an angular earthwork outline.

Convert `fixture-007.ts` mechanically:
- `foot` and `warband` → `infantry`
- `light` → `light`
- `horse` → `cavalry`
- `lighthorse` → `cavalry`
- `elephants` → `heavycavalry`
- `chariots` → `heavycavalry`
- `camels` → `cavalry`
- `machines` → `artillery`
- `camp` → `redoubt`

Set its date to `2 August 1808` or drop it. It is test data only.

- [ ] **Step 4: Run tests, typecheck and look at it**

Run: `npm run typecheck && npx vitest run tests/history`
Expected: clean and PASS.

Start the dev server, open `#/gallery/history`, screenshot the fixture with `scripts/history-shot.sh` if the gallery can show it, and read the legend tile.

- [ ] **Step 5: Commit**

```bash
git add src/history src/ui/history tests/history
git commit -m "feat(history): Napoleonic unit kinds, farms and redoubts, modern dates

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tasks 2–12: History batches

The same procedure for each batch. Batches, in lane order:

| Task | Battles | Lane |
|---|---|---|
| 2 | 001 Roliça (First Position), 002 Roliça (Second Position), 003 Vimeiro | A |
| 3 | 004 Corunna, 005 Talavera, 006 River Côa | B |
| 4 | 007 Bussaco (Reynier), 008 Bussaco (Ney), 009 Redinha | C |
| 5 | 010 Salamanca (French Left), 011 Salamanca (French Right), 012 García Hernández | A |
| 6 | 013 Aire, 014 Quatre Bras, 015 Waterloo | B |
| 7–12 | The 18 Expansion #1 battles in catalogue order, three per task | C, A, B, C, A, B |

Lanes are git worktrees `.worktrees/hist-a`, `hist-b`, `hist-c`, branched from `main` after Task 1. Each lane runs its own dev server on port 5176 (A), 5177 (B) or 5178 (C). The controller merges each reviewed batch into `main`.

**Model:** Sonnet writes; Opus reviews.

**Files (per battle):**
- Create: `src/history/battles/<id>.ts`

**Interfaces:**
- **Consumes:** the `BattleHistory` type from Task 1; `catalogueEntry(id)`; the survey entry (or scenario page) for sides and commanders; the worked example `tests/history/fixture-007.ts`.

- [ ] **Step 1: Research each battle**

Read the survey entry and the scenario page's historical notes, then research the battle in at least two of the sources named in Global Constraints. Read online editions where available: Napier and Oman are on archive.org and Project Gutenberg; Wellington's dispatches are on archive.org. Note uncertain points.

- [ ] **Step 2: Write `src/history/battles/<id>.ts`**

The three slides follow the Ancients design note:
- **Context:** the war and campaign, and why here.
- **Sides:** commanders, strength with its uncertainty, forces.
- **Map:** 1–4 phases with titles and captions. Terrain uses rivers, hills, woods, towns, farms, redoubts and roads. Units use the kinds from Task 1; at most 32.
- **Outcome:** winner, result, losses with their uncertainty, what followed.
- **Sources:** as in Global Constraints.

For two-part battles, cover only this scenario's part and mention the other in one line.

- [ ] **Step 3: Validate**

Run: `npx vite-node scripts/history-check.ts -- <id>`
Expected: no problems; word counts within limits.

- [ ] **Step 4: Look at it**

With the lane's dev server running, run `scripts/history-shot.sh <id> /Users/janisstrods/Gamemaking/cnc-napoleonics-research/history-shots <port>`. Read every tile: slide I, each map phase, the flipped map, slide III. Fix overlaps, off-field units, unreadable labels and arrows that point the wrong way.

- [ ] **Step 5: Run the history tests, then commit the batch**

Run: `npx vitest run tests/history`
Expected: PASS.

```bash
git add src/history/battles/<id1>.ts src/history/battles/<id2>.ts src/history/battles/<id3>.ts
git commit -m "feat(history): <names of the three battles>

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Review (Opus):**
- Fact-check every name, date, number and claim against at least two sources, using web research.
- Check sides against the survey or scenario page, and check that the prose is original.
- Read the tiles in `history-shots/`.

---

### Task 13: Coverage on

**Model:** Sonnet. It runs after Tasks 2–12 are merged.

**Files:**
- Modify: `tests/history/history.test.ts` (`COVERED = ['base', 'exp1']`), `CLAUDE.md` ("Battle histories": Napoleonic sources, ports, lanes; how to check one)

- [ ] **Step 1: Turn coverage on and verify**

Set `COVERED` and run `npx vitest run tests/history`.
Expected: PASS with all 33 catalogue battles covered.

Open `#/gallery/history/maps` to check every map phase on the contact sheet. Read the sheet.

- [ ] **Step 2: Update CLAUDE.md and commit**

```bash
git add tests/history/history.test.ts CLAUDE.md
git commit -m "test(history): every base and Spanish battle has a history

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
