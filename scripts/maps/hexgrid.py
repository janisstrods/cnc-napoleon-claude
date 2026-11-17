"""Hex geometry for the 13x9 odd-r board; matches src/engine/hex.ts.

Hexes are pointy-top. Grid dict: {x0, y0, w, pitch}: centre of (0,0) is (x0, y0),
w is the hex width (flat side to flat side), pitch the row spacing. Odd rows are
shifted right by w/2. Hex height is pitch*4/3.
"""
ROWS = 9
COLS = 13

# (dr, dc) in the order E, NE, NW, W, SW, SE (src/engine/hex.ts).
EVEN_DIRS = [(0, 1), (-1, 0), (-1, -1), (0, -1), (1, -1), (1, 0)]
ODD_DIRS = [(0, 1), (-1, 1), (-1, 0), (0, -1), (1, 0), (1, 1)]
HEX_DIRS = ["E", "NE", "NW", "W", "SW", "SE"]


def on_board(r, c):
    return 0 <= r < ROWS and 0 <= c < (COLS if r % 2 == 0 else COLS - 1)


def all_hexes():
    return [(r, c) for r in range(ROWS) for c in range(COLS) if on_board(r, c)]


def neighbours(r, c):
    if not on_board(r, c):
        return []
    dirs = EVEN_DIRS if r % 2 == 0 else ODD_DIRS
    return [(r + dr, c + dc) for dr, dc in dirs if on_board(r + dr, c + dc)]


def hex_centre(r, c, grid):
    return (grid["x0"] + grid["w"] * (c + 0.5 * (r % 2)), grid["y0"] + grid["pitch"] * r)


def _corners(grid):
    hw = grid["w"] / 2
    h = grid["pitch"] * 4 / 3
    return {
        "E": [(hw, -h / 4), (hw, h / 4)],
        "NE": [(hw, -h / 4), (0, -h / 2)],
        "NW": [(0, -h / 2), (-hw, -h / 4)],
        "W": [(-hw, -h / 4), (-hw, h / 4)],
        "SW": [(-hw, h / 4), (0, h / 2)],
        "SE": [(0, h / 2), (hw, h / 4)],
    }


def hex_polygon(r, c, grid):
    x, y = hex_centre(r, c, grid)
    hw = grid["w"] / 2
    h = grid["pitch"] * 4 / 3
    pts = [(hw, -h / 4), (0, -h / 2), (-hw, -h / 4), (-hw, h / 4), (0, h / 2), (hw, h / 4)]
    return [(x + dx, y + dy) for dx, dy in pts]


def side_segment(r, c, d, grid):
    """Two endpoints of the hexside in direction d (name or index)."""
    if isinstance(d, int):
        d = HEX_DIRS[d]
    x, y = hex_centre(r, c, grid)
    a, b = _corners(grid)[d]
    return ((x + a[0], y + a[1]), (x + b[0], y + b[1]))


# Typical fit; w and pitch are identical on all 15 maps, x0/y0 differ by up to 4 px (see grids.json).
DEFAULT_GRID = {"x0": 72.25, "y0": 132.375, "w": 87.0, "pitch": 75.5}
MAPS_DIR = "/Users/janisstrods/Gamemaking/cnc-napoleonics-research/maps"
WORK_DIR = "/Users/janisstrods/Gamemaking/cnc-napoleonics-research/map-work"


def map_path(mid):
    return mid if mid.endswith(".jpg") else f"{MAPS_DIR}/{mid}.jpg"


def grid_for(mid):
    """Fitted grid for a map id (grids.json, from fitgrid.py per map); falls back to DEFAULT_GRID."""
    import json, os
    try:
        g = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "grids.json")))
        e = g[os.path.basename(mid).replace(".jpg", "")]
        return {k: e[k] for k in ("x0", "y0", "w", "pitch")}
    except (OSError, KeyError):
        return dict(DEFAULT_GRID)


def parse_grid(s, mid=None):
    """--grid argument: JSON string or path to a JSON file (data file or grid). None -> the map's fitted grid."""
    import json, os
    if not s:
        return grid_for(mid) if mid else dict(DEFAULT_GRID)
    d = json.load(open(s)) if os.path.exists(s) else json.loads(s)
    return d.get("grid", d)
