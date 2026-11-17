import copy, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import check

EXPECTED = {"top": {"BR/LN": 2, "BR/LDR": 1}, "bottom": {"FR/LN": 1, "FR/LDR": 1}}


def base():
    return {
        "id": "999",
        "grid": {"x0": 0, "y0": 0, "w": 86, "pitch": 76},
        "terrain": [
            {"r": 1, "c": 1, "t": "hill"},
            {"r": 3, "c": 3, "t": "river"},
            {"r": 3, "c": 4, "t": "river", "crossing": "bridge"},
        ],
        "units": [
            {"r": 0, "c": 0, "side": "top", "key": "BR/LN"},
            {"r": 0, "c": 1, "side": "top", "key": "BR/LN"},
            {"r": 8, "c": 0, "side": "bottom", "key": "FR/LN"},
        ],
        "leaders": [
            {"r": 0, "c": 0, "side": "top", "name": "Wellesley"},
            {"r": 8, "c": 1, "side": "bottom", "name": "Delaborde"},
        ],
        "objectives": [],
        "notes": [],
    }


def problems(d):
    return check.check(d, EXPECTED)


def test_valid():
    assert problems(base()) == []


def test_two_units_one_hex():
    d = base()
    d["units"][1]["c"] = 0
    p = problems(d)
    assert len(p) == 1 and "two units" in p[0]


def test_off_board():
    d = base()
    d["units"][0].update(r=1, c=12)
    p = problems(d)
    assert len(p) == 1 and "off board" in p[0]


def test_count_mismatch():
    d = base()
    d["units"].pop()
    p = problems(d)
    assert len(p) == 1 and "count" in p[0] and "FR/LN" in p[0]


def test_crossing_on_hill():
    d = base()
    d["terrain"][0]["crossing"] = "ford"
    p = problems(d)
    assert len(p) == 1 and "crossing" in p[0]


def test_isolated_river():
    d = base()
    d["terrain"].append({"r": 6, "c": 6, "t": "river"})
    p = problems(d)
    assert len(p) == 1 and "isolated river" in p[0]


def test_wrong_nation_for_side():
    d = base()
    d["units"][2]["key"] = "BR/LN"
    p = problems(d)
    assert any("nation" in x for x in p)


def test_leader_on_enemy():
    d = base()
    d["leaders"][1].update(r=0, c=1)
    p = problems(d)
    assert any("leader" in x and "enemy" in x for x in p)


def test_bad_works_side():
    d = base()
    d["terrain"].append({"r": 5, "c": 5, "t": "fieldworks", "on": "plain", "sides": ["UP"]})
    p = problems(d)
    assert any("side" in x for x in p)


def split_river():
    d = base()
    d["terrain"] = [{"r": 3, "c": c, "t": "river"} for c in (0, 1, 2, 4, 5, 6)]
    return d


def test_river_splits():
    p = problems(split_river())
    assert len(p) == 1 and "river splits into 2 pieces" in p[0]


def test_river_pieces_declared():
    d = split_river()
    d["riverPieces"] = 2
    assert problems(d) == []


def test_malformed_entry():
    d = base()
    del d["units"][0]["key"]
    del d["terrain"][0]["t"]
    p = problems(d)
    assert any("malformed" in x for x in p)


def test_duplicate_works_side():
    d = base()
    d["terrain"].append({"r": 5, "c": 5, "t": "fieldworks", "on": "plain", "sides": ["E", "E"]})
    assert any("duplicate works side" in x for x in problems(d))


def test_swi_accepted_as_infantry_code():
    import expected as ex
    e = ex.expected("101")
    d = {"units": [{"r": 0, "c": 0, "side": "top", "key": "SP/SWI"}, {"r": 0, "c": 1, "side": "bottom", "key": "FR/SWI"}]}
    ps = check.check(d, e)
    assert not any("not allowed" in p or "unknown" in p for p in ps)
    assert "count top SP/SWI: data 1, survey 2" in ps
