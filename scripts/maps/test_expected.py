import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import expected


def test_015():
    e = expected.parse_survey()
    assert e["015"]["bottom"]["FR/LN"] == 8
    assert e["015"]["top"]["BR/LDR"] == 3
    assert e["001"]["top"]["PT/LDR"] == 1
    assert "BR/LN" not in e["001"]["bottom"]
    assert sum(e["015"]["top"].values()) + sum(e["015"]["bottom"].values()) > 40


def test_expected_104():
    e = expected.expected("104")
    assert e["bottom"]["FR/FA"] == 2
    assert e["bottom"]["FR/HA"] == 1
    assert e["top"]["SP/ML"] == 3


def test_expected_101_swiss():
    e = expected.expected("101")
    assert e["top"]["SP/SWI"] == 2
    assert e["bottom"]["FR/SWI"] == 4
    assert e["top"]["SP/LDR"] == 2 and e["bottom"]["FR/LDR"] == 3


def test_expected_base_battle_still_from_base_survey():
    assert expected.expected("015")["bottom"]["FR/LN"] == 8


def test_expected_all_spanish_totals_match_side_table():
    tops = {"101": 16, "104": 17, "110": 25, "118": 16}
    for bid, n in tops.items():
        e = expected.expected(bid)
        assert sum(v for k, v in e["top"].items() if not k.endswith("/LDR")) == n


def test_expected_unknown_id_raises():
    import pytest
    with pytest.raises(KeyError):
        expected.expected("999")
    with pytest.raises(KeyError):
        expected.expected("016")
