// Keyboard play on the board (Task 10c): the pure cursor helpers, the label that announces the cursor hex, and a keyboard-only
// walk through a turn that reaches every hex the click handler would act on, with Enter handing it that very hex.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COLS, ROWS, colOf, hexId, rowOf, type GameState, type HexId } from '../../src/engine';
import type { Highlight } from '../../src/ui/game/Board';
import { boardKeyAction, firstMarked, hexLabel, markedHexes, moveCursor, screenKey, type CursorKey } from '../../src/ui/game/boardKeys';
import { boardMarks, type UiSel } from '../../src/ui/game/uiModel';
import { H, build, play, toBattle, type Pos } from '../rules/helpers';

const SEL: UiSel = { selCard: null, hoverCard: null, orderSel: [], selPiece: null, hoverHex: null, hoverAction: null, assign: null, gunSel: [] };
const src = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

describe('moveCursor', () => {
  const id = (r: number, c: number) => hexId(r, c);
  it('Left and Right run along the row and stop at its ends', () => {
    expect(moveCursor(id(4, 5), 'ArrowRight', ROWS, COLS)).toBe(id(4, 6));
    expect(moveCursor(id(4, 5), 'ArrowLeft', ROWS, COLS)).toBe(id(4, 4));
    expect(moveCursor(id(4, 0), 'ArrowLeft', ROWS, COLS)).toBe(id(4, 0));
    expect(moveCursor(id(4, 12), 'ArrowRight', ROWS, COLS)).toBe(id(4, 12));
  });
  it('an odd row holds one hex fewer: its right end is column 11', () => {
    expect(moveCursor(id(3, 11), 'ArrowRight', ROWS, COLS)).toBe(id(3, 11));
    expect(moveCursor(id(3, 5), 'End', ROWS, COLS)).toBe(id(3, 11));
    expect(moveCursor(id(4, 5), 'End', ROWS, COLS)).toBe(id(4, 12));
    expect(moveCursor(id(4, 5), 'Home', ROWS, COLS)).toBe(id(4, 0));
  });
  it('Up and Down change row, stay on the map and keep a column the row has', () => {
    expect(moveCursor(id(4, 5), 'ArrowDown', ROWS, COLS)).toBe(id(5, 5));
    expect(moveCursor(id(4, 5), 'ArrowUp', ROWS, COLS)).toBe(id(3, 5));
    expect(moveCursor(id(0, 3), 'ArrowUp', ROWS, COLS)).toBe(id(0, 3));
    expect(moveCursor(id(8, 3), 'ArrowDown', ROWS, COLS)).toBe(id(8, 3));
    expect(moveCursor(id(4, 12), 'ArrowDown', ROWS, COLS)).toBe(id(5, 11)); // the odd row ends one hex sooner
  });
  it('every key keeps the cursor on a hex of the map, from every hex', () => {
    const keys: CursorKey[] = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < (r % 2 ? COLS - 1 : COLS); c++) {
        for (const k of keys) {
          const to = moveCursor(id(r, c), k, ROWS, COLS);
          expect(colOf(to)).toBeLessThan(rowOf(to) % 2 ? COLS - 1 : COLS);
          expect(rowOf(to)).toBeLessThan(ROWS);
        }
      }
    }
  });
  it('a board turned for the top army reads the arrows the other way round', () => {
    expect(screenKey('ArrowLeft', true)).toBe('ArrowRight');
    expect(screenKey('ArrowUp', true)).toBe('ArrowDown');
    expect(screenKey('Home', true)).toBe('End');
    expect(screenKey('ArrowLeft', false)).toBe('ArrowLeft');
  });
});

describe('boardKeyAction', () => {
  it('arrows and Home/End move; Enter and Space act like a click; Shift+Enter clicks the leader', () => {
    expect(boardKeyAction('ArrowUp', false)).toEqual({ kind: 'move', key: 'ArrowUp' });
    expect(boardKeyAction('Home', false)).toEqual({ kind: 'move', key: 'Home' });
    expect(boardKeyAction('Enter', false)).toEqual({ kind: 'activate' });
    expect(boardKeyAction(' ', false)).toEqual({ kind: 'activate' });
    expect(boardKeyAction('Enter', true)).toEqual({ kind: 'leader' });
    expect(boardKeyAction('Escape', false)).toBeNull(); // Escape stays the screen's clear-selection
    expect(boardKeyAction('a', false)).toBeNull();
  });
});

describe('firstMarked', () => {
  it('the first hex in reading order on screen, or null', () => {
    const marks = new Map<HexId, Highlight>([[H(6, 3), 'eligible'], [H(5, 9), 'eligible'], [H(7, 1), 'eligible']]);
    expect(firstMarked(marks)).toBe(H(5, 9));
    expect(firstMarked(marks, true)).toBe(H(7, 1)); // turned board: row 7 is at the top of the screen
    expect(firstMarked(new Set([H(2, 2)]))).toBe(H(2, 2));
    expect(firstMarked(new Map())).toBeNull();
    // a retreat: the unit in question is marked `focus`, the cursor goes to the hexes it may retreat to
    expect(firstMarked(new Map<HexId, Highlight>([[H(2, 3), 'focus'], [H(3, 3), 'option'], [H(3, 2), 'option']]))).toBe(H(3, 2));
  });
});

const P: Pos = {
  first: 'top',
  units: [
    { side: 'top', key: 'FR/LN', at: [2, 6] }, { side: 'top', key: 'FR/LN', at: [2, 7] },
    { side: 'bottom', key: 'BR/LN', at: [3, 6] }, { side: 'bottom', key: 'BR/LN', at: [6, 2] },
  ],
};

describe('hexLabel', () => {
  const s = build(P);
  it('row, column, terrain, what stands there, and the mark', () => {
    const marks = new Map<HexId, Highlight>([[H(2, 6), 'eligible'], [H(3, 6), 'targetClose']]);
    const a = hexLabel(s, H(2, 6), marks);
    expect(a).toMatch(/^row 2, column 6, /);
    expect(a).toContain('Open ground');
    expect(a).toContain('French Line Infantry');
    expect(a).toContain('selectable');
    expect(hexLabel(s, H(3, 6), marks)).toContain('target');
    const empty = hexLabel(s, H(0, 0), marks);
    expect(empty).toContain('empty');
    expect(empty).not.toMatch(/selectable|target|selected/);
  });
  it('a leader, attached or alone, and a hill', () => {
    const t = build({ units: [{ side: 'top', key: 'FR/LN', at: [2, 6] }], leaders: [{ side: 'top', at: [2, 6], name: 'Ney' }, { side: 'top', at: [1, 1], name: 'Soult' }], terrain: [{ at: [4, 4], t: 'hill' }] });
    expect(hexLabel(t, H(2, 6), new Map())).toContain('leader Ney (attached)');
    expect(hexLabel(t, H(1, 1), new Map())).toContain('leader Soult (alone)');
    expect(hexLabel(t, H(4, 4), new Map())).toMatch(/Hill/i);
  });
  it('the marks of a decision: selected, move target, path', () => {
    const marks = new Map<HexId, Highlight>([[1, 'selected'], [2, 'move'], [3, 'moveMustBattle'], [4, 'option'], [5, 'targetRanged']]);
    expect(hexLabel(s, 1, marks)).toContain('selected');
    expect(hexLabel(s, 2, marks)).toContain('move target');
    expect(hexLabel(s, 3, marks)).toContain('move target');
    expect(hexLabel(s, 4, marks)).toContain('selectable');
    expect(hexLabel(s, 5, marks)).toContain('target');
  });
});

/** Presses `keys` from `cursor` the way the board does: moves are screen keys, Enter reports the hex it would click. */
function press(cursor: HexId, keys: { key: string; shift?: boolean }[], flipped: boolean): { cursor: HexId; clicks: HexId[] } {
  const clicks: HexId[] = [];
  for (const k of keys) {
    const a = boardKeyAction(k.key, !!k.shift);
    if (a?.kind === 'move') cursor = moveCursor(cursor, screenKey(a.key, flipped), ROWS, COLS);
    else if (a?.kind === 'activate') clicks.push(cursor);
  }
  return { cursor, clicks };
}

/** The shortest run of arrow keys from `from` to `to` (a breadth-first walk), or null. */
function keysTo(from: HexId, to: HexId, flipped: boolean): CursorKey[] | null {
  const seen = new Map<HexId, CursorKey[]>([[from, []]]);
  const queue = [from];
  const board: CursorKey[] = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
  while (queue.length) {
    const h = queue.shift()!;
    if (h === to) return seen.get(h)!;
    for (const k of board) {
      const n = moveCursor(h, screenKey(k, flipped), ROWS, COLS);
      if (!seen.has(n)) { seen.set(n, [...seen.get(h)!, k]); queue.push(n); }
    }
  }
  return null;
}

describe('a keyboard-only turn', () => {
  for (const flipped of [false, true]) {
    it(`order, move and attack: every marked hex is reachable by arrows, and Enter acts on that hex (board ${flipped ? 'turned' : 'upright'})`, () => {
      const human = flipped ? 'top' : 'bottom';
      const st = build({ first: human, units: [
        { side: human, key: 'FR/LN', at: [5, 6] }, { side: human, key: 'FR/LN', at: [5, 7] },
        { side: human === 'top' ? 'bottom' : 'top', key: 'BR/LN', at: [4, 6] },
      ] });
      // 1. orders: the cursor lands on the first eligible hex, and arrows reach the other
      const orders = { kind: 'orders', side: human, card: 'probeC' } as never;
      const m1 = boardMarks(st, orders, SEL, human);
      const marked = markedHexes(m1);
      expect(marked.size).toBe(2);
      const start = firstMarked(marked, flipped)!;
      for (const target of marked.keys()) {
        const keys = keysTo(start, target, flipped)!;
        expect(keys).not.toBeNull();
        const out = press(start, [...keys.map((key) => ({ key })), { key: 'Enter' }], flipped);
        expect(out.cursor).toBe(target);
        expect(out.clicks).toEqual([target]); // the same hex a click on it passes to the one click handler
      }
      // 2. the label at the cursor says it can be chosen
      expect(hexLabel(st, start, marked)).toContain('selectable');
    });
  }

  it('a move then a battle: the marks of a selected piece are reachable too, with their labels', () => {
    const pos: Pos = { first: 'top', units: [{ side: 'top', key: 'FR/LN', at: [2, 6] }, { side: 'bottom', key: 'BR/LN', at: [6, 5] }] };
    const mv = play(build(pos), 'probeC', ['u1']);
    const m = markedHexes(boardMarks(mv.state, mv.pending, { ...SEL, selPiece: 'u1' }, 'top'));
    expect([...m.values()]).toContain('move');
    for (const [h, kind] of m) {
      if (kind === 'move') expect(hexLabel(mv.state, h, m)).toContain('move target');
      expect(keysTo(firstMarked(m, true)!, h, true)).not.toBeNull();
    }
    const bt = toBattle(build({ first: 'top', units: [{ side: 'top', key: 'FR/LN', at: [2, 6] }, { side: 'bottom', key: 'BR/LN', at: [3, 6] }] }), 'probeC', ['u1']);
    const bm = markedHexes(boardMarks(bt.state, bt.pending, { ...SEL, selPiece: 'u1' }, 'top'));
    const target = [...bm].find(([, k]) => k === 'targetClose' || k === 'targetRanged');
    expect(target).toBeDefined();
    expect(hexLabel(bt.state, target![0], bm)).toContain('target');
  });
});

describe('wiring: keys go through the one click handler', () => {
  const board = src('../../src/ui/game/Board.tsx');
  const screen = src('../../src/ui/game/GameScreen.tsx');
  it('the board is one tab stop with a name, announcing the cursor hex', () => {
    expect(board).toMatch(/role="application"/);
    expect(board).toMatch(/aria-label=/);
    expect(board).toMatch(/tabIndex=\{0\}/);
    expect(board).toContain('aria-activedescendant');
    expect(board).toContain('board-cursor');
  });
  it('Enter and Space call the same onHexClick the hexes use; Shift+Enter the leader click', () => {
    expect(screen).toContain('boardKeyAction(');
    expect(screen).toMatch(/kind === 'activate'\)[^]*?handlers\.current\.onHexClick\(cursor\)/);
    expect(screen).toMatch(/leaderAt\(s, cursor\)[^]*?handlers\.current\.onLeaderClick\(l\.id\)/);
  });
  it('the global Enter shortcut leaves the board to its own handler', () => {
    expect(screen).toMatch(/closest\('\.board-svg'\)/);
  });
  it('a new decision moves the cursor to the first marked hex, for keyboard players only', () => {
    expect(screen).toContain('firstMarked(');
    expect(screen).toMatch(/wantsPromptFocus\(d, human, overBoard\.current\)[^]*?firstMarked|firstMarked[^]*?wantsPromptFocus/);
  });
  it('the focus ring lives in board-keys.css, from existing tokens', () => {
    const css = src('../../src/ui/game/board-keys.css');
    expect(css).toContain('.board-cursor');
    expect(css).toContain('var(--kit-gold)');
    expect(css).not.toMatch(/#[0-9a-f]{3,6}\b/i); // tokens only
    expect(screen + board).toContain("board-keys.css");
  });
});
