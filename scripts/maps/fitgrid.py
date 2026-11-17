"""Fit the hex grid (x0, y0, w, pitch) so hex edges fall on the faint light hex outlines.

The maps draw outlines as thin lines slightly lighter than the meadow. A ridge image
(gray minus a local box blur, clipped) is sampled along every hexside of the predicted
grid; the score is the mean ridge value. Coarse search, then local refinement. With
several maps the scores are summed. Prints the best grid as JSON.
"""
import argparse, json, os, sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hexgrid as hg

MAPS = hg.MAPS_DIR


def ridge(path, blur=4):
    g = np.asarray(Image.open(path).convert("L"), dtype=np.float32)
    k = 2 * blur + 1
    pad = np.pad(g, blur, mode="edge")
    # separable box blur via cumulative sums
    cs = np.cumsum(np.pad(pad, ((1, 0), (0, 0))), axis=0)
    v = (cs[k:] - cs[:-k]) / k
    cs = np.cumsum(np.pad(v, ((0, 0), (1, 0))), axis=1)
    m = (cs[:, k:] - cs[:, :-k]) / k
    return np.clip(g - m, -6, 12)


def side_samples(step=0.04):
    """Sample coefficients: x = x0 + w*ax, y = y0 + pitch*by, for each hexside sample (deduped)."""
    unit = {"w": 1.0, "pitch": 1.0}
    seen, ax, by = set(), [], []
    for r, c in hg.all_hexes():
        for d in hg.HEX_DIRS:
            (xa, ya), (xb, yb) = hg.side_segment(r, c, d, {"x0": 0, "y0": 0, **unit})
            key = (round((xa + xb) / 2, 3), round((ya + yb) / 2, 3))
            if key in seen:
                continue
            seen.add(key)
            for t in np.arange(0.1, 0.91, step * 4):
                ax.append(xa + (xb - xa) * t)
                by.append(ya + (yb - ya) * t)
    return np.array(ax), np.array(by)


def score(R, g, AX, BY):
    x = np.rint(g[0] + g[2] * AX).astype(int)
    y = np.rint(g[1] + g[3] * BY).astype(int)
    h, w = R.shape
    ok = (x >= 0) & (x < w) & (y >= 0) & (y < h)
    if ok.sum() < len(x) * 0.9:
        return -1e9
    return float(R[y[ok], x[ok]].mean())


def total(Rs, g, AX, BY):
    return sum(score(R, g, AX, BY) for R in Rs) / len(Rs)


def fit(Rs, ranges=None, verbose=False):
    AX, BY = side_samples()
    rg = ranges or {"x0": (60, 90), "y0": (110, 150), "w": (83, 91), "pitch": (72, 80)}
    best = (-1e9, None)
    for x0 in np.arange(*rg["x0"], 2.0):
        for y0 in np.arange(*rg["y0"], 2.0):
            for w in np.arange(*rg["w"], 0.5):
                for p in np.arange(*rg["pitch"], 0.5):
                    s = total(Rs, (x0, y0, w, p), AX, BY)
                    if s > best[0]:
                        best = (s, (x0, y0, w, p))
    if verbose:
        print("coarse", best, file=sys.stderr)
    for step in (0.5, 0.25, 0.125):
        s0, g0 = best
        for _ in range(4):
            improved = False
            for dx in (-step, 0, step):
                for dy in (-step, 0, step):
                    for dw in (-step, 0, step):
                        for dp in (-step, 0, step):
                            g = (g0[0] + dx, g0[1] + dy, g0[2] + dw, g0[3] + dp)
                            s = total(Rs, g, AX, BY)
                            if s > best[0] + 1e-9:
                                best, improved = (s, g), True
            if not improved:
                break
            g0 = best[1]
    return best


def main():
    ap = argparse.ArgumentParser(description="Fit the hex grid to one or more map images; prints JSON {x0,y0,w,pitch}.")
    ap.add_argument("maps", nargs="+", help="map ids (e.g. 001 007 015) or image paths")
    ap.add_argument("--each", action="store_true", help="also fit each map separately")
    ap.add_argument("-v", "--verbose", action="store_true")
    a = ap.parse_args()
    paths = [m if os.path.exists(m) else os.path.join(MAPS, m + ".jpg") for m in a.maps]
    Rs = [ridge(p) for p in paths]
    if a.each:
        for p, R in zip(paths, Rs):
            s, g = fit([R], verbose=a.verbose)
            print(os.path.basename(p), json.dumps(dict(zip(("x0", "y0", "w", "pitch"), (round(float(v), 3) for v in g)))), round(s, 3), file=sys.stderr)
    s, g = fit(Rs, verbose=a.verbose)
    out = dict(zip(("x0", "y0", "w", "pitch"), (round(float(v), 3) for v in g)))
    print(json.dumps(out))
    print("score", round(s, 3), file=sys.stderr)


if __name__ == "__main__":
    main()
