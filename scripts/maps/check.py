"""Validate a battle data file against the survey matrix.

check(data, expected) -> list of problem strings. expected = {"top": {key: n}, "bottom": {...}}.
"""
import argparse, json, os, sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hexgrid as hg
import expected as ex

TERRAIN = {"hill", "forest", "rugged", "town", "windmill", "fortress", "river", "fieldworks", "sandQuarry", "walledFarm"}


def check(data, expected):
    P = []
    ter = data.get("terrain", [])
    units = data.get("units", [])
    leaders = data.get("leaders", [])

    for what, items in (("terrain", ter), ("unit", units), ("leader", leaders), ("objective", data.get("objectives", []))):
        for it in items:
            if not hg.on_board(it["r"], it["c"]):
                P.append(f"off board: {what} at {it['r']},{it['c']}")

    seen = {}
    for u in units:
        k = (u["r"], u["c"])
        if k in seen:
            P.append(f"two units in hex {k[0]},{k[1]}: {seen[k]['key']} and {u['key']}")
        seen[k] = u
    lseen = {}
    for l in leaders:
        k = (l["r"], l["c"])
        if k in lseen:
            P.append(f"two leaders in hex {k[0]},{k[1]}: {lseen[k]['name']} and {l['name']}")
        lseen[k] = l
        if k in seen and seen[k]["side"] != l["side"]:
            P.append(f"leader {l['name']} on enemy unit {seen[k]['key']} at {k[0]},{k[1]}")

    nations = {s: {key[:2] for key in expected.get(s, {})} for s in ("top", "bottom")}
    for u in units:
        if u["side"] not in nations:
            P.append(f"unit at {u['r']},{u['c']}: bad side {u['side']}")
            continue
        n = u["key"][:2]
        if n not in nations[u["side"]]:
            P.append(f"nation {n} not allowed for side {u['side']}: {u['key']} at {u['r']},{u['c']}")
        if u["key"].endswith("/LDR"):
            P.append(f"leader key used as unit: {u['key']} at {u['r']},{u['c']}")

    for s in ("top", "bottom"):
        have = Counter(u["key"] for u in units if u["side"] == s)
        want = {k: v for k, v in expected.get(s, {}).items() if not k.endswith("/LDR")}
        for k in sorted(set(have) | set(want)):
            if have.get(k, 0) != want.get(k, 0):
                P.append(f"count {s} {k}: data {have.get(k, 0)}, survey {want.get(k, 0)}")
        nl = sum(1 for l in leaders if l["side"] == s)
        wl = sum(v for k, v in expected.get(s, {}).items() if k.endswith("/LDR"))
        if nl != wl:
            P.append(f"count {s} leaders: data {nl}, survey {wl}")

    tkey = Counter()
    for t in ter:
        if t["t"] not in TERRAIN:
            P.append(f"unknown terrain {t['t']} at {t['r']},{t['c']}")
        tkey[(t["r"], t["c"], t["t"])] += 1
        if "crossing" in t and t["t"] != "river":
            P.append(f"crossing on {t['t']} at {t['r']},{t['c']} (only on river)")
        if "crossing" in t and t["crossing"] not in ("bridge", "ford"):
            P.append(f"bad crossing {t['crossing']} at {t['r']},{t['c']}")
        if t["t"] != "fieldworks":
            for f in ("on", "sides"):
                if f in t:
                    P.append(f"'{f}' on {t['t']} at {t['r']},{t['c']} (only on fieldworks)")
        else:
            if t.get("on", "plain") not in ("plain", "hill"):
                P.append(f"bad 'on' {t['on']} at {t['r']},{t['c']}")
            for sd in t.get("sides", []):
                if sd not in hg.HEX_DIRS:
                    P.append(f"invalid works side {sd!r} at {t['r']},{t['c']}")
    for k, n in tkey.items():
        if n > 1:
            P.append(f"duplicate terrain {k[2]} at {k[0]},{k[1]}")

    rivers = {(t["r"], t["c"]) for t in ter if t["t"] == "river"}
    for r, c in sorted(rivers):
        if not any(n in rivers for n in hg.neighbours(r, c)):
            P.append(f"isolated river hex at {r},{c}")
    return P


def main():
    ap = argparse.ArgumentParser(description="Validate battle data files against the survey matrix (design/survey.md 2.1).")
    ap.add_argument("files", nargs="+", help="design/data/<id>.json")
    ap.add_argument("--survey", default=ex.SURVEY)
    a = ap.parse_args()
    exp = ex.parse_survey(a.survey)
    bad = 0
    for f in a.files:
        d = json.load(open(f))
        if d["id"] not in exp:
            print(f"{f}: unknown battle id {d['id']}")
            bad += 1
            continue
        ps = check(d, exp[d["id"]])
        print(f"{f}: {'ok' if not ps else str(len(ps)) + ' problem(s)'}")
        for p in ps:
            print("  -", p)
        bad += bool(ps)
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
