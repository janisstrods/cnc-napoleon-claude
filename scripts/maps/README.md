# Map-reading and checking tools

Python 3 (PIL, numpy; pytest for tests), no other dependencies. Used to transcribe the 15 base-game battle maps
(`cnc-napoleonics-research/maps/NNN.jpg`, 1190x866) and the 18 Spanish expansion maps (101-118) into
`design/data/<id>.json` and to verify those files. Expected unit counts come from `design/survey.md` section 2.1
(001-015) or `design/exp1-survey.md` section 2.1 (101-118), chosen by battle id (`expected.expected(id)`). The Spanish
survey adds the infantry code SWI (Swiss line, 101 only: SP/SWI and FR/SWI); top is Spanish or British, bottom French.
Map 104 is `104.png` (1196x866; the `104.jpg` is stale and never used): `hexgrid.map_path` resolves it.
Images produced by the tools go to `cnc-napoleonics-research/map-work/` and are never committed.

Tests: `python3 -m pytest scripts/maps -q`. Every tool has `--help`.

## Geometry

Board 9 rows x 13 columns: even rows have 13 hexes (c 0-12), odd rows 12 (c 0-11), odd rows shifted right by half a
hex (odd-r). Hexes are pointy-top. Hexside order E, NE, NW, W, SW, SE, as `src/engine/hex.ts`.
`grid = {x0, y0, w, pitch}`: centre of r0,c0 is (x0, y0); centre of r,c is
`(x0 + w*(c + 0.5*(r%2)), y0 + pitch*r)`; hex height is `pitch*4/3`.

## Grid fit

`fitgrid.py` samples a ridge image (light outline against meadow) along all hexsides of a predicted grid and
maximises the mean ridge value (coarse search, then 0.5/0.25/0.125 px refinement). Fitted on every map separately
and on 001+007+015 together (`grids.json` holds the per-map fits):

- **w = 87.0 and pitch = 75.5 on all 15 maps** (identical).
- x0, y0 vary a little by map image: 001, 003, 004, 005, 007, 008, 011, 013, 014 are (72.3, 132.4); 002, 009, 010
  (74.4, 130.1); 006, 012 (74.1, 129.9); 015 (74.1, 136.1). The joint fit of 001+007+015 gives (72.25, 132.4),
  which is 2-4 px off on 015, so the tools use the per-map fit (`hexgrid.grid_for`). Put the map's fit in each data
  file's `grid` (use the `x0 y0 w pitch` from `grids.json`).
- **Spanish maps 101-118** (same 1190x866 size, 104.png is 1196 wide): w = 87.0 on all 18 and pitch 75.5 on 13 of
  them (102 75.125, 107 75.0, 115 75.375, others differ from 75.5 by under 0.5 px of fit noise). x0, y0 cluster at
  (74.4, 129.9-130.4) for 101, 103, 104, 105, 106, 109, 110, 111, 113, 114, 117, 118; 108, 115, 116 are near
  (72.1-72.5, 132.4-133.1); 112 is the outlier (77.25, 135.9). Per-map fits are in `grids.json`. Overlays of 104, 107
  and 112 show every hex outline on the grid.
- Checked on overlays of 001, 006, 007 and 015: every hex outline sits on the grid, and the red objective hex outlines
  (001 at 8,2 and 8,11; 006 at 0,4) fall exactly on the grid hexes.

## Tools

| Tool | Use |
|---|---|
| `hexgrid.py` | Geometry: `hex_centre`, `hex_polygon`, `on_board`, `neighbours`, `side_segment`, `grid_for`. |
| `fitgrid.py 001 007 015 [--each]` | Fit the grid; prints JSON `{x0,y0,w,pitch}`. |
| `overlay.py --all` or `overlay.py 001 007` | `map-work/overlay/NNN.png`: grid and `r,c` labels. |
| `crops.py 001 --rows 0-2 --cols 3-9 [--scale 3] [--plain]` | `map-work/crops/`: 3x crop of a hex range with the grid (`--plain` for the bare map). |
| `render.py design/data/001.json [--crop 0-2 3-9]` | `map-work/render/`: the data over its map. Terrain letter tags (H hill, F forest, G rugged, T town, W windmill, X fortress, R river, E fieldworks `/p` plain `/h` hill, Q sand quarry, Y walled farm), `:bridge`/`:ford` with a bar, works sides as thick orange hexsides, units as `key` in a red (top) or blue (bottom) box, leaders as yellow tags with the name, objectives with a thick green outline. |
| `scan.py design/data/001.json [--dump]` | Per hex hill / forest / water-blue fractions outside the block area, compared with the data file; lists disagreements. `--map 001 --dump` works without a data file. |
| `check.py design/data/001.json ...` | Validates data files; exit code 1 on any problem. |
| `expected.py [015]` | Prints the parsed survey section 2.1 matrix (expected counts per battle and side). |

## Data format

```
{ "id": "001", "grid": {x0,y0,w,pitch},
  "terrain": [{r,c,t, crossing?, on?, sides?, art?}],   // t: hill forest rugged town windmill fortress river fieldworks sandQuarry walledFarm
  "units": [{r,c,side,key}], "leaders": [{r,c,side,name}],
  "objectives": [{r,c,note}], "notes": [string] }
```
`side` is `top` or `bottom`. `key` is `NATION/CODE` (e.g. `BR/LN`). Top armies are BR, PT, AL; bottom is FR.
`crossing` (`bridge`|`ford`) only on `river`; `on` (`plain`|`hill`) and `sides` (direction names) only on `fieldworks`.
`riverPieces` (optional, default 1): the number of separate river pieces the battle has; check.py reports a river
that splits into more pieces than this (a missing hex mid-river). Isolated single river hexes are always reported.
A hex holds at most one unit and one leader. Leader keys are not units: leaders are counted per side against the
survey's `*/LDR` rows (leaders carry no nation in the file).

## What check.py checks

Hexes on the board; one unit and one leader per hex; unit nation allowed for its side (nations the survey lists for
that side); counts per side and key equal the survey matrix (leaders per side equal the sum of the side's LDR rows);
no isolated river hex (every river hex touches another); works sides are valid direction names; `crossing` only on
river; leaders only on own units or empty hexes; plus unknown or duplicate terrain.

## scan.py classes and limits

Pixels inside each hex polygon (inset 5 px) and outside the block box (dx -30..34, dy -36..34 from the centre).

- water: teal (b > r+25, g > r+35, r < 90, b <= g+12). Flagged at >= 2.5% (river and unit-block blue differ: block blue has b >> g). Not called inside a forest-coloured hex.
- forest: dark green (r < 95, g > r+20, b near r, g < 135). Flagged at >= 10% (real forest hexes give 26-29%).
- hill: darker olive than the meadow, not near water. Flagged at >= 12% (real hills give 13-18%, not hill <= 5%). The ring of rays is the only evidence under a block, so hills under big stacks sit close to the threshold.

Known limits: thresholds were tuned by eye on 001, 007 and 015; hill margin is thin (0.13 to 0.12); a river clipping
only a hex corner can fall under 2.5%; town roofs, leader portraits, the ghost map title and labels near the board
edge can add stray pixels; a ford or bridge is not detected; fieldworks, walled farm and sand quarry are not
classified at all (only hill art under fieldworks counts as hill). Every flag needs a look at a crop.
