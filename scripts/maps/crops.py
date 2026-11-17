"""Write 3x crops of a hex range of a map, with the grid and r,c labels (use --plain for the bare map).

  crops.py 001 --rows 0-2 --cols 0-5            -> map-work/crops/001_r0-2_c0-5.png
  crops.py 001 --rows 3 --cols 4-8 --scale 4
Range arguments are N or A-B (inclusive). Odd rows have one column fewer; missing hexes are skipped.
"""
import argparse, os, sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hexgrid as hg
import overlay


def rng(s):
    a, _, b = s.partition("-")
    return int(a), int(b or a)


def main():
    ap = argparse.ArgumentParser(description="Write enlarged crops of a hex range of a map.")
    ap.add_argument("map", help="map id or image path")
    ap.add_argument("--rows", required=True, help="e.g. 0-2")
    ap.add_argument("--cols", required=True, help="e.g. 0-5")
    ap.add_argument("--scale", type=float, default=3.0)
    ap.add_argument("--plain", action="store_true", help="no grid or labels")
    ap.add_argument("--grid", help="grid JSON or file (default: the map's fitted grid)")
    ap.add_argument("--out", default=f"{hg.WORK_DIR}/crops")
    a = ap.parse_args()
    grid = hg.parse_grid(a.grid, a.map)
    r0, r1 = rng(a.rows)
    c0, c1 = rng(a.cols)
    hexes = [(r, c) for r in range(r0, r1 + 1) for c in range(c0, c1 + 1) if hg.on_board(r, c)]
    if not hexes:
        ap.error("no hexes in range")
    xs, ys = [], []
    for r, c in hexes:
        for x, y in hg.hex_polygon(r, c, grid):
            xs.append(x)
            ys.append(y)
    im = Image.open(hg.map_path(a.map)).convert("RGB")
    if not a.plain:
        im = overlay.draw_overlay(im, grid)
    box = (max(int(min(xs)) - 4, 0), max(int(min(ys)) - 4, 0), min(int(max(xs)) + 5, im.width), min(int(max(ys)) + 5, im.height))
    crop = im.crop(box)
    crop = crop.resize((int(crop.width * a.scale), int(crop.height * a.scale)), Image.LANCZOS)
    os.makedirs(a.out, exist_ok=True)
    name = f"{os.path.splitext(os.path.basename(a.map))[0]}_r{a.rows}_c{a.cols}" + ("_plain" if a.plain else "") + ".png"
    out = os.path.join(a.out, name)
    crop.save(out)
    print(out)


if __name__ == "__main__":
    main()
