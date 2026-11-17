# C&C: Napoleonics — Plan 7B: Spanish Map Reading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hex-exact, independently verified transcriptions of the 18 Expansion #1 battles (101–118), in the same engine-neutral format as the base battles.

**Architecture:** This applies Plan 3A's procedure and tools (`scripts/maps/`) to the Spanish battles. Task 1 teaches the tools the second survey and the new codes. Tasks 2–7 are transcription batches of three battles each. They follow `design/superpowers/plans/2026-11-17-plan-3a-map-reading.md` (its Global Constraints and "Tasks 2–6" procedure, including the independent Opus verification), with the differences below.

**Tech Stack:** Python 3 (PIL, numpy, pytest).

**Spec:** `design/superpowers/specs/2026-11-17-cnc-napoleonics-design.md` (Expansion #1).

## Global Constraints

- **Same as Plan 3A:** data format, geometry, image locations, and the independent Opus verifier for each batch.
- **Sources:** `design/exp1-survey.md` (approved) replaces `design/survey.md`. Unit keys may use `SP/<code>` and the new code `SWI` (Swiss line infantry, on either side: `SP/SWI`, `FR/SWI`).
- **Map 104 is `maps/104.png`.** The `.jpg` is out of date. Every other map is `maps/1NN.jpg`.
- **Commits:** path-limited, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Models:** Sonnet transcribes, Opus verifies.

## Review Focus

1. **Spanish and allied blocks told apart by colour:** Spanish, British, Portuguese and Swiss, using the survey's colour key.
2. **Battles with page/map mismatches:** 106, 107, 114, 115 and 116 follow the map, as the survey decided.
3. **New terrain:** Walled Farm, and redoubts with 2 and 4 sides, recorded with their sides.

---

### Task 1: Tools read the Spanish survey

**Model:** Sonnet.

**Files:**
- Modify: `scripts/maps/expected.py`, `scripts/maps/check.py`, `scripts/maps/hexgrid.py` (the map path for 104), `scripts/maps/test_expected.py`, `scripts/maps/README.md`

**Interfaces:**
- **Produces:**
  - `expected.expected(battle_id) -> dict` reads `design/survey.md` for 001–015 and `design/exp1-survey.md` for 101–118.
  - `check.py` accepts `SWI` as an infantry code.
  - The map path resolves `104.png`.

- [ ] **Step 1: Write the failing tests**

In `test_expected.py`:
- Parsing 104 gives FR/FA 2 and FR/HA 1.
- 101 includes SWI on both sides, with the counts from the survey matrix.
- An unknown id raises.

- [ ] **Step 2: Run them to verify they fail**

Run: `python3 -m pytest scripts/maps -q`
Expected: FAIL.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Check the grid fit on two Spanish maps**

Run `fitgrid.py` on two Spanish maps and confirm they are the same size and fit as the base maps. Record per-map fits for 101–118 in `grids.json` and look at three overlays.

- [ ] **Step 5: Run the tests and commit**

Run: `python3 -m pytest scripts/maps -q`
Expected: PASS.

```bash
git add scripts/maps
git commit -m "feat(maps): tools read the Spanish expansion survey

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tasks 2–7: Transcription batches

| Task | Battles | Lane |
|---|---|---|
| 2 | 101, 102, 103 | A |
| 3 | 104, 105, 106 | B |
| 4 | 107, 108, 109 | A |
| 5 | 110, 111, 112 | B |
| 6 | 113, 114, 115 | A |
| 7 | 116, 117, 118 | B |

**Procedure:** exactly Plan 3A's "Tasks 2–6", Steps 1–4, plus its independent Opus verification. The lanes are worktrees `.worktrees/smaps-a` and `smaps-b`, branched from `main` after Task 1.

**Files:**
- Create: `design/data/<id>.json`, `design/data/notes-<first>-<last>.md` and the verifier's `design/data/verify-<first>-<last>.md`
