"""Draw the hex grid with r,c labels on map images.

  overlay.py 001 007          -> map-work/overlay/001.png, 007.png
  overlay.py --all            -> all 15
"""
import argparse, os, sys
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hexgrid as hg


def font(size):
    for p in ("/System/Library/Fonts/Helvetica.ttc", "/System/Library/Fonts/Supplemental/Arial.ttf"):
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            pass
    return ImageFont.load_default()


def draw_overlay(im, grid, labels=True):
    im = im.convert("RGBA")
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    f = font(11)
    for r, c in hg.all_hexes():
        poly = hg.hex_polygon(r, c, grid)
        d.line(poly + [poly[0]], fill=(255, 0, 255, 200), width=1)
        if labels:
            x, y = hg.hex_centre(r, c, grid)
            t = f"{r},{c}"
            d.text((x - 10, y + 22), t, fill=(255, 255, 0, 255), font=f, stroke_width=1, stroke_fill=(0, 0, 0, 255))
    return Image.alpha_composite(im, layer).convert("RGB")


def main():
    ap = argparse.ArgumentParser(description="Write map images with the hex grid and r,c labels drawn on them.")
    ap.add_argument("maps", nargs="*", help="map ids (001..015) or image paths")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--grid", help="JSON string or file with grid (default: the map's fitted grid)")
    ap.add_argument("--out", default=f"{hg.WORK_DIR}/overlay")
    a = ap.parse_args()
    ids = [f"{i:03d}" for i in range(1, 16)] if a.all else a.maps
    if not ids:
        ap.error("give map ids or --all")
    os.makedirs(a.out, exist_ok=True)
    for m in ids:
        grid = hg.parse_grid(a.grid, m)
        out = os.path.join(a.out, os.path.basename(m).replace(".jpg", "") + ".png")
        draw_overlay(Image.open(hg.map_path(m)), grid).save(out)
        print(out)


if __name__ == "__main__":
    main()
