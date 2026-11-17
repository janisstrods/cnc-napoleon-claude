"""Draw a data file over its map: terrain letters, crossings, works sides, units, leaders, objectives.

  render.py design/data/001.json            -> map-work/render/001.png
  render.py design/data/001.json --crop 0-2 0-5 --scale 3

Legend: terrain letter tags at the hex's upper left (H hill, F forest, G rugged, T town, W windmill, X fortress, R river, E fieldworks,
Q sand quarry, Y walled farm) (units and leaders never cover that corner); river crossings 'bridge' as a brown bar /
'ford' as a dotted bar; field-works sides as thick orange hexside lines; units as their key in a box coloured by
side (top red, bottom blue); leaders as a yellow bar with the name; objectives as a thick green hex outline.
"""
import argparse, json, os, sys
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hexgrid as hg
from overlay import font

LETTER = {"hill": "H", "forest": "F", "rugged": "G", "town": "T", "windmill": "W", "fortress": "X",
          "river": "R", "fieldworks": "E", "sandQuarry": "Q", "walledFarm": "Y"}
SIDE = {"top": (200, 30, 30, 235), "bottom": (30, 80, 210, 235)}


def render(data, im, grid):
    im = im.convert("RGBA")
    lay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    f, fs = font(12), font(10)
    for r, c in hg.all_hexes():
        poly = hg.hex_polygon(r, c, grid)
        d.line(poly + [poly[0]], fill=(255, 0, 255, 90), width=1)
    for o in data.get("objectives", []):
        poly = hg.hex_polygon(o["r"], o["c"], grid)
        d.line(poly + [poly[0]], fill=(0, 255, 60, 255), width=4)
    for t in data.get("terrain", []):
        x, y = hg.hex_centre(t["r"], t["c"], grid)
        tag = LETTER.get(t["t"], "?")
        if t["t"] == "fieldworks":
            tag += "/" + ("h" if t.get("on") == "hill" else "p")
        if "crossing" in t:
            tag += ":" + t["crossing"]
            yy = y - 4
            if t["crossing"] == "bridge":
                d.rectangle([x - 30, yy - 3, x + 30, yy + 3], fill=(120, 70, 20, 230))
            else:
                for i in range(-30, 30, 8):
                    d.rectangle([x + i, yy - 3, x + i + 4, yy + 3], fill=(240, 240, 240, 230))
        w = d.textlength(tag, font=fs)
        bx, by = x - 40, y - 36 + 11 * [e for e in data["terrain"] if (e["r"], e["c"]) == (t["r"], t["c"])].index(t)
        d.rectangle([bx, by, bx + w + 4, by + 12], fill=(0, 0, 0, 200))
        d.text((bx + 2, by), tag, fill=(255, 255, 255, 255), font=fs)
        for s in t.get("sides", []):
            a, b = hg.side_segment(t["r"], t["c"], s, grid)
            d.line([a, b], fill=(255, 140, 0, 255), width=5)
    for u in data.get("units", []):
        x, y = hg.hex_centre(u["r"], u["c"], grid)
        w = d.textlength(u["key"], font=f)
        d.rectangle([x - w / 2 - 3, y - 14, x + w / 2 + 3, y + 2], fill=SIDE[u["side"]], outline=(255, 255, 255, 255))
        d.text((x - w / 2, y - 14), u["key"], fill=(255, 255, 255, 255), font=f)
    for l in data.get("leaders", []):
        x, y = hg.hex_centre(l["r"], l["c"], grid)
        w = d.textlength(l["name"], font=fs)
        d.rectangle([x - w / 2 - 2, y + 4, x + w / 2 + 2, y + 17], fill=(250, 220, 40, 235), outline=SIDE[l["side"]][:3] + (255,), width=2)
        d.text((x - w / 2, y + 5), l["name"], fill=(0, 0, 0, 255), font=fs)
    return Image.alpha_composite(im, lay).convert("RGB")


def main():
    ap = argparse.ArgumentParser(description="Draw a battle data file over its map image.")
    ap.add_argument("data", help="design/data/<id>.json")
    ap.add_argument("--crop", nargs=2, metavar=("ROWS", "COLS"), help="e.g. --crop 0-2 0-5")
    ap.add_argument("--scale", type=float, default=3.0, help="crop scale (default 3)")
    ap.add_argument("--map", help="map id or image path (default: the data file id)")
    ap.add_argument("--out", default=f"{hg.WORK_DIR}/render")
    a = ap.parse_args()
    data = json.load(open(a.data))
    grid = data.get("grid") or hg.grid_for(a.map or data["id"])
    im = render(data, Image.open(hg.map_path(a.map or data["id"])), grid)
    name = data["id"]
    if a.crop:
        def rng(s):
            x, _, y = s.partition("-")
            return int(x), int(y or x)
        r0, r1 = rng(a.crop[0])
        c0, c1 = rng(a.crop[1])
        pts = [p for r in range(r0, r1 + 1) for c in range(c0, c1 + 1) if hg.on_board(r, c) for p in hg.hex_polygon(r, c, grid)]
        box = (max(int(min(p[0] for p in pts)) - 4, 0), max(int(min(p[1] for p in pts)) - 4, 0),
               min(int(max(p[0] for p in pts)) + 5, im.width), min(int(max(p[1] for p in pts)) + 5, im.height))
        im = im.crop(box)
        im = im.resize((int(im.width * a.scale), int(im.height * a.scale)), Image.LANCZOS)
        name += f"_r{a.crop[0]}_c{a.crop[1]}"
    os.makedirs(a.out, exist_ok=True)
    out = os.path.join(a.out, name + ".png")
    im.save(out)
    print(out)


if __name__ == "__main__":
    main()
