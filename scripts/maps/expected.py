"""Parse the survey section 2.1 unit matrix into expected counts per battle and side.

design/survey.md covers battles 001-015, design/exp1-survey.md the Spanish battles 101-118.
parse_survey(path) -> {"001": {"top": {"BR/LN": 5, ...}, "bottom": {...}}, ...}
expected(battle_id) -> {"top": {...}, "bottom": {...}} from whichever survey holds the id (KeyError if none).
Top army is BR/PT/AL/SP, bottom is FR (survey section 1). Leader rows are keys like BR/LDR.
"""
import argparse, json, os, re

DESIGN = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "design")
SURVEY = os.path.join(DESIGN, "survey.md")
EXP1_SURVEY = os.path.join(DESIGN, "exp1-survey.md")
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


def expected(battle_id):
    """Expected counts for one battle: 001-015 from survey.md, 101-118 from exp1-survey.md."""
    path = EXP1_SURVEY if str(battle_id).startswith("1") else SURVEY
    return parse_survey(path)[battle_id]


def main():
    ap = argparse.ArgumentParser(description="Print expected unit counts per battle and side from design/survey.md 2.1 (001-015) or design/exp1-survey.md 2.1 (101-118)")
    ap.add_argument("battle", nargs="?", help="battle id, e.g. 015 or 104 (default: all of both surveys)")
    ap.add_argument("--survey", help="read only this survey file")
    a = ap.parse_args()
    if a.survey:
        e = parse_survey(a.survey)
    elif a.battle:
        e = {a.battle: expected(a.battle)}
    else:
        e = {**parse_survey(SURVEY), **parse_survey(EXP1_SURVEY)}
    print(json.dumps(e[a.battle] if a.battle else e, indent=1))


if __name__ == "__main__":
    main()
