import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import hexgrid as hg

GRID = {"x0": 75.0, "y0": 130.0, "w": 86.0, "pitch": 76.0}


def test_on_board():
    assert not hg.on_board(1, 12)
    assert hg.on_board(0, 12)
    assert hg.on_board(8, 12)
    assert not hg.on_board(9, 0)
    assert not hg.on_board(-1, 0)


def test_neighbours_corner():
    assert set(hg.neighbours(0, 0)) == {(0, 1), (1, 0)}


def test_neighbours_odd_row():
    assert set(hg.neighbours(1, 0)) == {(0, 0), (0, 1), (1, 1), (2, 0), (2, 1)}


def test_dir_order():
    assert hg.HEX_DIRS == ["E", "NE", "NW", "W", "SW", "SE"]


def test_side_midpoint_halfway():
    for r, c in [(2, 3), (3, 4)]:
        cx, cy = hg.hex_centre(r, c, GRID)
        for i, d in enumerate(hg.HEX_DIRS):
            dr, dc = (hg.EVEN_DIRS if r % 2 == 0 else hg.ODD_DIRS)[i]
            nx, ny = hg.hex_centre(r + dr, c + dc, GRID)
            (ax, ay), (bx, by) = hg.side_segment(r, c, d, GRID)
            assert abs((ax + bx) / 2 - (cx + nx) / 2) < 1e-6
            assert abs((ay + by) / 2 - (cy + ny) / 2) < 1e-6


def test_map_path_104_is_png():
    assert hg.map_path("104").endswith("/104.png")
    assert hg.map_path("101").endswith("/101.jpg")
    assert hg.map_path("015").endswith("/015.jpg")
