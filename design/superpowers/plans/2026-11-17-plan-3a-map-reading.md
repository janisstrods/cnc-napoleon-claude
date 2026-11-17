# C&C: Napoleonics — Plan 3A: Map Reading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hex-exact transcriptions of battles 001–015 from their map images, independently verified, in an engine-neutral data format, plus the committed tooling that produced and checked them.

**Architecture:**
- **Why it runs early:** this is the first part of Plan 3 (Base scenarios). It is pulled forward because reading maps does not depend on the engine's scenario format, which Plan 2B freezes.
- **Output:** engine-neutral files `design/data/<id>.json`. Plan 3B converts them into `src/scenarios/data/<id>.json` once the format exists.
- **Tooling:** Python 3 + PIL + numpy scripts under `scripts/maps/`. They fit the hex grid, draw a labelled grid over each map, cut zoomed crops for reading, draw a data file back over its map for checking, scan colours per hex to catch misses, and check data files against the survey. Each is unit-tested with pytest.
- **Method:** the Ancients project's method (`design/ancients/exp3-data/verification.md`, Method section). Its scripts were never committed; these are rebuilt, and this time committed.

**Tech Stack:** Python 3 (PIL 12, numpy 1.26, pytest 7.4), no new npm dependencies.

**Spec:** `design/superpowers/specs/2026-11-17-cnc-napoleonics-design.md` (phase 4: "rebuilding the map-reading and verification tooling … commit the tooling this time").

## Global Constraints

- Map images live outside the repo, at `/Users/janisstrods/Gamemaking/cnc-napoleonics-research/maps/<id>.jpg` (1190×866). Overlays and crops go to `/Users/janisstrods/Gamemaking/cnc-napoleonics-research/map-work/`. Never commit images.
- Board geometry: 9 rows (0 = top) × 13 columns. Even rows have 13 hexes (c 0–12), odd rows 12 (c 0–11), odd rows shifted right by half a hex ("odd-r"), as in `src/engine/hex.ts`. Hexside directions are `src/engine/hex.ts`'s `HEX_DIRS` order: `E, NE, NW, W, SW, SE`.
- Unit keys are exactly those of `design/survey.md` (`<nation>/<code>`; the codes are listed in Plan 1's Global Constraints).
- **Data format** (`design/data/<id>.json`), fixed here; Plan 3B reads it:

```json
{
  "id": "001",
  "grid": { "x0": 0, "y0": 0, "w": 0, "pitch": 0 },
  "terrain": [
    { "r": 2, "c": 5, "t": "hill" },
    { "r": 4, "c": 6, "t": "river", "crossing": "bridge" },
    { "r": 6, "c": 2, "t": "fieldworks", "on": "hill", "sides": ["NW", "W"] }
  ],
  "units": [{ "r": 1, "c": 4, "side": "top", "key": "FR/LN" }],
  "leaders": [{ "r": 1, "c": 4, "side": "top", "name": "Delaborde" }],
  "objectives": [{ "r": 7, "c": 3, "note": "Temporary banner for the French, held at turn start (survey 001)" }],
  "notes": ["Anything the map shows that the fields cannot say, with the decision taken"]
}
```

  - Terrain types `t`: `hill`, `forest`, `rugged`, `town`, `windmill`, `fortress`, `river`, `fieldworks`, `sandQuarry`, `walledFarm`. Plain hexes are omitted.
  - `crossing` (`bridge` or `ford`) appears only on `river`. `on` (`plain` or `hill`) and `sides` appear only on `fieldworks`.
  - An optional `"art"` string records a visual detail worth keeping (e.g. `"label": "Hougoumont"`).
- One unit and one leader at most per hex.
- Commits are path-limited and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Models: Sonnet implements and transcribes; an **independent** Opus verifier reviews each batch.

## Review Focus

1. **A unit placed one hex off** (the most common transcription error): the verifier redraws the data file over the map and compares hex by hex, at full size and in crops.
2. **A unit on the wrong side or of the wrong type:** for example a BR/LT read as BR/LN, or a light blue Allied block read as Portuguese. Caught by `check.py`'s count check against the survey matrix, plus the verifier's eye.
3. **Terrain hidden under a block or a label:** a hill or forest under a unit, or a river hex under the map's title. Caught by `scan.py`'s colour fractions outside the block area, with every flagged hex looked at.
4. **River continuity:** a missing river hex breaks the line the board painter draws. Caught by `check.py`'s connectivity check (each river hex has at least one river neighbour, except a single-hex stream end noted in `notes`).
5. **Field works sides drawn on the wrong hexsides:** the verifier checks each works hex in a 3× crop.

---

### Task 1: The tooling

**Model:** Sonnet.

**Files:**
- Create: `scripts/maps/hexgrid.py`, `fitgrid.py`, `overlay.py`, `crops.py`, `render.py`, `scan.py`, `check.py`, `expected.py`, `README.md`.
  - `hexgrid.py`: geometry. `hex_centre(r, c, grid) -> (x, y)`, `hex_polygon(r, c, grid) -> list[(x, y)]`, `on_board(r, c) -> bool`, `neighbours(r, c) -> list[(r, c)]`, `side_segment(r, c, dir, grid)`. The odd-r rules and `HEX_DIRS` order match `src/engine/hex.ts`.
  - `fitgrid.py`: searches x0, y0, w and pitch so that the hex edges fall on the dark hex outlines of one or more maps. Prints the best grid as JSON.
  - `overlay.py`: writes a map with the grid and `r,c` labels drawn on it.
  - `crops.py`: writes 3× crops of a hex range.
  - `render.py`: draws a data file over its map, showing terrain type letters, crossings, works sides, units as `key` with side colour, leaders and objectives.
  - `scan.py`: per hex, the hill, forest-green and water-blue colour fractions outside the central block area, compared with the data file. Lists disagreements.
  - `check.py`: validates a data file.
  - `expected.py`: parses `design/survey.md` §2.1 into expected counts per battle and side.
- Create: `scripts/maps/test_hexgrid.py`, `test_check.py`, `test_expected.py`.
- Create (not committed): grid fits and overlays for 001–015 in `map-work/`.

**Interfaces:**
- **Produces (CLIs):** `python3 scripts/maps/<tool>.py --help` documents each.
- **Produces (functions):** `check.check(data: dict, expected: dict) -> list[str]` returns problems. It checks:
  - every hex is on the board
  - at most one unit and one leader per hex
  - each key's nation is allowed for its side, as the survey lists
  - counts per side and key equal the survey matrix
  - river connectivity
  - field-works sides are valid direction names
  - `crossing` only on rivers
  - leaders only on own units or empty hexes
- **Produces:** the fitted grid, recorded per map in each data file's `grid`. All 15 maps share one size, so one fit is expected; verify it on at least three maps.

- [ ] **Step 1: Write the failing tests**

`test_hexgrid.py`:
- `on_board(1, 12)` is False and `on_board(0, 12)` is True.
- `neighbours(0, 0)` equals the engine's neighbours of `0,0`: `{(0,1), (1,0)}`.
- `neighbours(1, 0)` equals `{(0,0), (0,1), (1,1), (2,0), (2,1)}`.
- A side segment's midpoint is halfway between the two hex centres.

`test_check.py`:
- A minimal valid data file gives `[]`.
- Two units in one hex, an off-board hex, a count mismatch, a `crossing` on a hill and an isolated river hex each give one named problem.

`test_expected.py`:
- Parsing the survey gives `015` FR/LN 8 and BR/LDR 3.

- [ ] **Step 2: Run them to verify they fail**

Run: `python3 -m pytest scripts/maps -q`
Expected: FAIL (modules missing).

- [ ] **Step 3: Implement the modules and make the tests pass**

Run: `python3 -m pytest scripts/maps -q`
Expected: PASS.

- [ ] **Step 4: Fit the grid and draw overlays**

Run `fitgrid.py` on maps 001, 007 and 015, then `overlay.py` for all 15 maps into `map-work/overlay/`. Look at three overlays at full size: every hex outline must sit on the grid. Record the fit in `scripts/maps/README.md` along with the usage of each tool.

- [ ] **Step 5: Commit**

```bash
git add scripts/maps
git commit -m "feat(maps): map-reading and checking tools for scenario transcription

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tasks 2–6: Transcription batches

| Task | Battles | Lane |
|---|---|---|
| 2 | 001, 002, 003 | A |
| 3 | 004, 005, 006 | B |
| 4 | 007, 008, 009 | A |
| 5 | 010, 011, 012 | B |
| 6 | 013, 014, 015 | A |

Lanes are worktrees `.worktrees/maps-a` and `maps-b`, branched from `main` after Task 1. The controller merges each verified batch.

**Model:** Sonnet transcribes; an independent Opus verifier reviews.

**Files:**
- Create: `design/data/<id>.json` for each battle in the batch.
- Create: `design/data/notes-<first id>-<last id>.md` (decisions and doubts).

**Interfaces:**
- **Consumes:** the Task 1 tools; the survey entries for each battle (counts, leaders, terrain, objectives, discrepancies with the chosen value).

- [ ] **Step 1: Read each map**

Use the labelled overlay and 3× crops of every region. Record every terrain hex, every unit (nation from block colour and the survey's colour notes; code from the unit icon), every leader with the name on the map, and the objective hexes. Where the map and survey disagree, follow the survey's chosen value and write it in `notes`.

- [ ] **Step 2: Check the data**

Run: `python3 scripts/maps/check.py design/data/<id>.json`
Expected: no problems.

Run: `python3 scripts/maps/scan.py design/data/<id>.json`
Look at every flagged hex in a crop and fix the data or note why the flag is false.

- [ ] **Step 3: Compare the rendered data with the map**

Run `render.py` for each battle into `map-work/render/`. Compare it with the original at full size and in crops: every unit, leader, terrain hex and works side must sit where the map shows it.

- [ ] **Step 4: Commit the batch**

```bash
git add design/data/<id1>.json design/data/<id2>.json design/data/<id3>.json design/data/notes-<id1>-<id3>.md
git commit -m "data(maps): transcribe battles <id1>-<id3>

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Verification (Opus, independent):**
- Re-render each data file and compare it with the map hex by hex, at full size and in crops of every river, hill block, town, works and unit cluster.
- Run `check.py` and `scan.py` yourself.
- Report each discrepancy with the hex and what the map shows. The format follows `design/ancients/exp3-data/verification.md`. The verifier writes `design/data/verify-<id1>-<id3>.md`; the controller commits it with the batch.
