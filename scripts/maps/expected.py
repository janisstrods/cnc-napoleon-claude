"""Parse design/survey.md section 2.1 into expected counts per battle and side.

parse_survey() -> {"001": {"top": {"BR/LN": 5, ...}, "bottom": {...}}, ...}
Top army is BR/PT/AL, bottom is FR (survey section 1). Leader rows are keys like BR/LDR.
"""
import argparse, json, os, re

SURVEY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "design", "survey.md")
BOTTOM_NATIONS = {"FR"}


def side_of(nation):
    return "bottom" if nation in BOTTOM_NATIONS else "top"


def parse_survey(path=SURVEY):
    lines = open(path, encoding="utf-8").read().split("\n")
    start = next(i for i, l in enumerate(lines) if l.startswith("### 2.1"))
    out = {}
    ids = None
    for l in lines[start + 1:]:
        if l.startswith("#") and ids:
            break
        if not l.startswith("|"):
            continue
        cells = [x.strip() for x in l.strip().strip("|").split("|")]
        if cells[0].startswith("nation/code"):
            ids = cells[1:-1]
            for i in ids:
                out[i] = {"top": {}, "bottom": {}}
            continue
        if ids is None or not re.match(r"^[A-Z]{2}/[A-Z]+$", cells[0]):
            continue
        key = cells[0]
        for bid, v in zip(ids, cells[1:-1]):
            if v:
                out[bid][side_of(key[:2])][key] = int(v)
    return out


def main():
    ap = argparse.ArgumentParser(description="Print expected unit counts per battle and side from design/survey.md 2.1")
    ap.add_argument("battle", nargs="?", help="battle id, e.g. 015 (default: all)")
    ap.add_argument("--survey", default=SURVEY)
    a = ap.parse_args()
    e = parse_survey(a.survey)
    print(json.dumps(e[a.battle] if a.battle else e, indent=1))


if __name__ == "__main__":
    main()
