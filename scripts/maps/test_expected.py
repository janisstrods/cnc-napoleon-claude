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
