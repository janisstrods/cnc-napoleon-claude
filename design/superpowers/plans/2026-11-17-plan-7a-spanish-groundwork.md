# C&C: Napoleonics — Plan 7A: Spanish Expansion Groundwork Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The survey of the 18 Expansion #1 battles (101–118) and the Expansion #1 rulings, written before any Spanish engine, data or art work.

**Architecture:** This is the first part of Plan 7 (Expansion #1), pulled forward because it is research that depends only on the base-game rulings (`design/rulings.md`, merged). It mirrors Plan 1 Tasks 3 and 5. Later parts of Plan 7 cover transcription with the Plan 3A tools, Spanish units and the Guerrilla mechanic in the engine, art and AI.

**Tech Stack:** Research (WebSearch/WebFetch, PDF reading with pypdf); Markdown.

**Spec:** `design/superpowers/specs/2026-11-17-cnc-napoleonics-design.md` ("Expansion #1 additions").

## Global Constraints

- **Codes:** as in Plan 1. Nations `FR`, `BR`, `PT`, `AL`, `SP`. Infantry `LN`, `LT`, `RI`, `GR`, `YG`, `OG`, `GG`, `ML`. Cavalry `LC`, `LNC`, `HC`, `CU`, `GLC`, `GHC`. Artillery `FA`, `HA`, `GA`. Leader `LDR`. Units are written `nation/code`. A needed type not listed gets a descriptive new code, flagged under Needs.
- **Battle ids and names:** `src/scenarios/catalogue.ts` (101–118).
- **Source ranking:** the same as `design/rulings.md`, with the Expansion #1 rules and the National Unit Reference Card for Spain beside the 4th-edition rulebook. Designer FAQ rulings count as errata where they narrow or clarify a rule.
- **Writing:** paraphrase; quotations under 15 words; British spelling.
- **Files kept out of the repo:** map images go to `/Users/janisstrods/Gamemaking/cnc-napoleonics-research/maps/1NN.jpg` and PDFs to `…/sources/`. Never commit them.
- **Commits:** path-limited, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Models:** Task 1 Sonnet, Task 2 Opus, reviews Opus.

## Review Focus

1. **A Spanish battle with British or Portuguese allies:** the nations are split correctly by block colour, using the survey's colour key.
2. **Guerrilla Action counters:** each battle states the counts per side, and when they are gained and spent.
3. **New terrain** (Walled Farm, 2- and 4-sided redoubts): it is listed in the battles that use it.

---

### Task 1: Survey of battles 101–118

**Model:** Sonnet.

**Files:**
- Create: `design/exp1-survey.md`
- Create (not committed): `maps/101.jpg` … `118.jpg`

**Interfaces:**
- **Format:** the same as `design/survey.md`. Read its "How to read this" section and one entry.
- **Produces:**
  - One `### 1NN Name (date)` entry per battle.
  - The Needs summary: unit matrix, terrain, objectives, special rules, the **Guerrilla counters per battle and side**, and other needs.
  - Discrepancies.

- [ ] **Step 1: Collect the sources**

For each battle, fetch its scenario page on commandsandcolors.net and its map image. Also fetch the Expansion #1 pages: contents, new units, new game mechanic and terrain.

- [ ] **Step 2: Write the entries**

Use the same fields as `design/survey.md`, plus the Guerrilla counters. View each map yourself.

- [ ] **Step 3: Write the Needs summary and Discrepancies**

- [ ] **Step 4: Verify**

Run: `grep -c '^### 1[01][0-9] ' design/exp1-survey.md`
Expected: `18`.

Per-side totals equal the sum of their rows.

- [ ] **Step 5: Commit**

```bash
git add design/exp1-survey.md
git commit -m "docs: survey of the Spanish expansion battles 101-118

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Expansion #1 rulings

**Model:** Opus. It runs after Task 1.

**Files:**
- Create: `design/exp1-rulings.md`

**Interfaces:**
- **Consumes:** `design/rulings.md` (base, R1–R72), `design/exp1-survey.md`.
- **Produces:** a decisions table with ids `S1`, `S2`, …, in the same format as `design/rulings.md`. It covers:
  - Spanish unit rows (blocks, dice formulas with moving penalties, retreat 2 per flag, militia 3, flag ignores, sabre ability) for every `SP/<code>` the survey uses.
  - Guerrilla Action: when counters are gained and spent, the sabre cancellation roll, Scout giving a counter, and interaction with Counter-Attack, Élan and First Strike.
  - Walled Farm and 2- and 4-sided redoubts.
  - Each scenario special rule in the survey.
  - Any base ruling the expansion changes.

- [ ] **Step 1: Research**

Use the Expansion #1 rules and reference card, the commandsandcolors.net Expansion #1 pages and FAQ, then BGG.

- [ ] **Step 2: Write the table and verify**

Run: `grep -n '\[?\]' design/exp1-rulings.md`
Expected: no output.

Every Needs item in the survey has a row.

- [ ] **Step 3: Commit**

```bash
git add design/exp1-rulings.md
git commit -m "docs: Expansion #1 (Spanish) rulings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
