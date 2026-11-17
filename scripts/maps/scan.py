"""Colour-fraction scan: per hex, hill / forest-green / water-blue fractions outside the central block area,
compared with the data file's terrain. Lists disagreements (each needs a look in a crop).

  scan.py design/data/001.json            list disagreements
  scan.py design/data/001.json --dump     print every hex's fractions
  scan.py --map 001 --dump                fractions without a data file

Pixels are counted inside the hex polygon, inset by INSET px, and outside the block box (blocks and leaders
stand around the hex centre). Classes (RGB):
  water  : teal, b > r + 25, g > r + 35, r < 90, b <= g + 12 (unit-block blue has b >> g)
  forest : dark green, r < 95, g > r + 20, |b - r| < 25, g < 135
  hill   : darker olive than the meadow, 115 <= r <= 158, 135 <= g <= 172, b <= 100, and not dark (g - r > 12)
Known limits: unit blocks and leader portraits poking out of the block box, hex labels, town roofs and
the ghost map title add false hill/forest; thin rivers that only clip a hex corner and hills under a large
block give misses. Thresholds were tuned by eye on maps 001, 007 and 015.
"""
import argparse, json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hexgrid as hg

INSET = 5
BOX = (-30, 34, -36, 34)  # dx0, dx1, dy0, dy1 around the hex centre (block area)
T_HILL, T_FOREST, T_WATER = 0.12, 0.10, 0.025


def classify(a):
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    water = (b > r + 25) & (g > r + 35) & (r < 90) & (b <= g + 12)
    forest = (r < 95) & (g > r + 20) & (abs(b - r) < 25) & (g < 135)
    hill = (r >= 115) & (r <= 158) & (g >= 135) & (g <= 172) & (b <= 100) & (g - r > 12)
    return water, forest, hill


def hex_fractions(im, grid, r, c):
    x, y = hg.hex_centre(r, c, grid)
    m = Image.new("L", im.size, 0)
    poly = hg.hex_polygon(r, c, grid)
    ImageDraw.Draw(m).polygon(poly, fill=255)
    m = np.asarray(m) > 0
    # inset by eroding with a box
    from numpy.lib.stride_tricks import sliding_window_view
    x0, x1 = int(x - grid["w"] / 2) - 2, int(x + grid["w"] / 2) + 3
    y0, y1 = int(y - grid["pitch"] * 2 / 3) - 2, int(y + grid["pitch"] * 2 / 3) + 3
    x0, y0 = max(x0, 0), max(y0, 0)
    sub = m[y0:y1, x0:x1]
    pad = np.pad(sub, INSET)
    er = sliding_window_view(pad, (2 * INSET + 1, 2 * INSET + 1)).all(axis=(2, 3))
    yy, xx = np.mgrid[y0:y1, x0:x1]
    blk = (xx >= x + BOX[0]) & (xx <= x + BOX[1]) & (yy >= y + BOX[2]) & (yy <= y + BOX[3])
    sel = er & ~blk
    if not sel.any():
        return 0.0, 0.0, 0.0
    w, f, h = classify(np.asarray(im)[y0:y1, x0:x1])
    # river banks blend into the hill colour: ignore hill pixels within 4 px of water
    near = np.asarray(Image.fromarray((w * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))) > 0
    h = h & ~near
    return float(w[sel].mean()), float(f[sel].mean()), float(h[sel].mean())


def scan_map(im, grid):
    return {(r, c): hex_fractions(im, grid, r, c) for r, c in hg.all_hexes()}


def flags(fr):
    w, f, h = fr
    # dark shadows inside forest art leave a trace of teal: no river call in a forest-coloured hex
    return {"river": w >= T_WATER and f < 0.15, "forest": f >= T_FOREST, "hill": h >= T_HILL}


def data_flags(data):
    t = {}
    for e in data.get("terrain", []):
        s = t.setdefault((e["r"], e["c"]), {"river": False, "forest": False, "hill": False})
        if e["t"] == "river":
            s["river"] = True
        if e["t"] == "forest":
            s["forest"] = True
        if e["t"] == "hill" or (e["t"] == "fieldworks" and e.get("on") == "hill"):
            s["hill"] = True
    return t


def compare(fracs, data):
    """Yield (r, c, kind, message) for each disagreement between the scan and the data."""
    df = data_flags(data)
    out = []
    for (r, c), fr in sorted(fracs.items()):
        got = flags(fr)
        want = df.get((r, c), {"river": False, "forest": False, "hill": False})
        for k, idx in (("river", 0), ("forest", 1), ("hill", 2)):
            if got[k] and not want[k]:
                out.append((r, c, k, f"map looks {k} (fraction {fr[idx]:.2f}), data has none"))
            elif want[k] and not got[k]:
                out.append((r, c, k, f"data has {k}, map shows only fraction {fr[idx]:.2f}"))
    return out


def main():
    ap = argparse.ArgumentParser(description="Compare per-hex colour fractions (hill, forest, water) with a data file.")
    ap.add_argument("data", nargs="?", help="data file design/data/<id>.json")
    ap.add_argument("--map", help="map id or image path (default: from the data file id)")
    ap.add_argument("--dump", action="store_true", help="print every hex's fractions (water forest hill)")
    ap.add_argument("--grid", help="grid JSON or file (default: the data file's grid, else the fitted grid)")
    a = ap.parse_args()
    data = json.load(open(a.data)) if a.data else {"terrain": []}
    mid = a.map or data.get("id")
    if not mid:
        ap.error("give a data file or --map")
    grid = hg.parse_grid(a.grid, mid) if a.grid else data.get("grid") or hg.grid_for(mid)
    im = Image.open(hg.map_path(mid)).convert("RGB")
    fracs = scan_map(im, grid)
    if a.dump:
        for (r, c), (w, f, h) in sorted(fracs.items()):
            print(f"{r},{c}  water {w:.2f}  forest {f:.2f}  hill {h:.2f}")
        return
    dis = compare(fracs, data)
    for r, c, k, msg in dis:
        print(f"{r},{c} {k}: {msg}")
    print(f"{len(dis)} disagreement(s)")


if __name__ == "__main__":
    main()
