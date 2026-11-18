// Keyboard play on the board (Task 10c): the pure cursor helpers, the label that announces the cursor hex, and a keyboard-only
// walk through a turn that reaches every hex the click handler would act on, with Enter handing it that very hex.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COLS, ROWS, colOf, hexId, rowOf, type GameState, type HexId } from '../../src/engine';
import type { Highlight } from '../../src/ui/game/Board';
import type { Decision } from '../../src/engine';
import {
  boardKeyAction, boardKeyStep, firstMarked, freshSelection, globalKeyAction, hexLabel, jumpTarget, markedHexes, moveCursor, nextRegion, screenKey,
  type CursorKey, type KeyStepIn,
} from '../../src/ui/game/boardKeys';
import { hexClick, leaderClick } from '../../src/ui/game/hexClick';
import { boardMarks, type UiSel } from '../../src/ui/game/uiModel';
import { H, build, ev, leaderId, must, play, toBattle, type Pos } from '../rules/helpers';

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

const STEP: KeyStepIn = { cursor: H(4, 4), key: 'ArrowRight', shift: false, repeat: false, flipped: false, leaderAt: () => null, cursorShown: true };

describe('boardKeyStep: what a key does on the board', () => {
  it('an arrow moves the cursor, shows it, and the hover follows it', () => {
    expect(boardKeyStep(STEP)).toEqual({ handled: true, cursor: H(4, 5), hover: H(4, 5), showCursor: true });
  });
  it('a turned board reads the arrows the other way', () => {
    expect(boardKeyStep({ ...STEP, flipped: true }).cursor).toBe(H(4, 3));
    expect(boardKeyStep({ ...STEP, flipped: true, key: 'ArrowUp' }).cursor).toBe(H(5, 4));
  });
  it('an arrow shows a cursor that was hidden by a mouse click, and moves it from where the click put it', () => {
    expect(boardKeyStep({ ...STEP, cursorShown: false })).toMatchObject({ handled: true, cursor: H(4, 5), showCursor: true });
  });
  it('Enter and Space click the cursor hex, but only while the cursor is shown', () => {
    expect(boardKeyStep({ ...STEP, key: 'Enter' })).toEqual({ handled: true, clickHex: H(4, 4) });
    expect(boardKeyStep({ ...STEP, key: ' ' })).toEqual({ handled: true, clickHex: H(4, 4) });
    // a mouse player's Enter is the global shortcut's (confirm the orders), not the hidden cursor's
    expect(boardKeyStep({ ...STEP, key: 'Enter', cursorShown: false })).toEqual({ handled: false });
    expect(boardKeyStep({ ...STEP, key: ' ', cursorShown: false })).toEqual({ handled: false });
  });
  it('a held key does not click again', () => {
    expect(boardKeyStep({ ...STEP, key: 'Enter', repeat: true })).toEqual({ handled: true });
  });
  it('Shift+Enter clicks the leader on the hex, else the hex', () => {
    expect(boardKeyStep({ ...STEP, key: 'Enter', shift: true, leaderAt: () => 'L1' })).toEqual({ handled: true, leaderId: 'L1' });
    expect(boardKeyStep({ ...STEP, key: 'Enter', shift: true })).toEqual({ handled: true, clickHex: H(4, 4) });
  });
  it('other keys are not the board\'s', () => {
    expect(boardKeyStep({ ...STEP, key: 'Escape' })).toEqual({ handled: false });
    expect(boardKeyStep({ ...STEP, key: 'Tab' })).toEqual({ handled: false });
  });
});

describe('jumpTarget: where the cursor goes on a new decision', () => {
  const pos: Pos = { first: 'bottom', units: [
    { side: 'bottom', key: 'FR/LN', at: [5, 6] }, { side: 'bottom', key: 'FR/LN', at: [5, 7] }, { side: 'top', key: 'BR/LN', at: [3, 6] },
  ] };
  const orders = () => { const dr = play(build(pos), 'attackC'); return { s: dr.state, d: dr.pending! }; };
  it('the first marked hex, for a keyboard player', () => {
    const { s, d } = orders();
    expect(d.kind).toBe('orders');
    expect(jumpTarget(s, d, 'bottom', false, false, false)).toEqual({ cursor: H(5, 6), keepFocus: false });
    expect(jumpTarget(s, d, 'bottom', false, false, true)).toEqual({ cursor: H(5, 7), keepFocus: false }); // turned: reading order from the other end
  });
  it('not while the pointer is over the board and the focus is elsewhere', () => {
    const { s, d } = orders();
    expect(jumpTarget(s, d, 'bottom', true, false, false)).toBeNull();
  });
  it('with the focus in the board it jumps and keeps the focus there, wherever the pointer rests', () => {
    const { s, d } = orders();
    expect(jumpTarget(s, d, 'bottom', true, true, false)).toEqual({ cursor: H(5, 6), keepFocus: true });
    expect(jumpTarget(s, d, 'bottom', false, true, false)).toEqual({ cursor: H(5, 6), keepFocus: true });
  });
  it('never for the computer\'s decision, a card choice, or no decision', () => {
    const { s, d } = orders();
    expect(jumpTarget(s, d, 'top', false, true, false)).toBeNull();
    expect(jumpTarget(s, { kind: 'playCard', side: 'bottom' }, 'bottom', false, true, false)).toBeNull();
    expect(jumpTarget(s, null, 'bottom', false, true, false)).toBeNull();
  });
  it('the marks a decision starts with, not those of the selection before it', () => {
    // two units can battle, so nothing is selected yet: the first attacker is marked, not the targets of a piece selected earlier
    const bs = build({ first: 'bottom', units: [
      { side: 'bottom', key: 'FR/LN', at: [4, 6] }, { side: 'bottom', key: 'FR/LN', at: [4, 7] }, { side: 'top', key: 'BR/LN', at: [3, 6] },
    ] });
    const dr = toBattle(bs, 'attackC', ['u1', 'u2']);
    expect(dr.pending?.kind).toBe('battle');
    expect(freshSelection(dr.state, dr.pending, 'bottom').selPiece).toBeNull();
    expect(jumpTarget(dr.state, dr.pending, 'bottom', false, false, false)?.cursor).toBe(H(4, 6));
  });
  it('a lone mover is selected at once, so the jump goes to its first destination', () => {
    const dr = play(build(pos), 'attackC', ['u1']);
    expect(freshSelection(dr.state, dr.pending, 'bottom').selPiece).toBe('u1');
    const j = jumpTarget(dr.state, dr.pending, 'bottom', false, false, false)!;
    expect(j.cursor).toBeLessThan(H(5, 6));
  });
});

describe('globalKeyAction: the letters are not for dialogs or fields (WCAG 2.1.4)', () => {
  const k = (key: string, o: Partial<{ shift: boolean; ctrl: boolean; meta: boolean; alt: boolean }> = {}) => ({ key, shift: false, ctrl: false, meta: false, alt: false, ...o });
  const here = { inGame: true, typing: false, modal: false };
  it('B goes to the board, P to the prompt, F6 and Shift+F6 cycle', () => {
    expect(globalKeyAction(k('b'), here)).toBe('board');
    expect(globalKeyAction(k('B'), here)).toBe('board');
    expect(globalKeyAction(k('p'), here)).toBe('prompt');
    expect(globalKeyAction(k('F6'), here)).toBe('cycle');
    expect(globalKeyAction(k('F6', { shift: true }), here)).toBe('cycleBack');
  });
  it('B and P work with a button focused', () => {
    expect(globalKeyAction(k('b'), { ...here, typing: false })).toBe('board');
  });
  it('nothing in a dialog, in a field, outside the game screen, or with a modifier', () => {
    for (const ctx of [{ ...here, modal: true }, { ...here, typing: true }, { ...here, inGame: false }]) {
      expect(globalKeyAction(k('b'), ctx)).toBeNull();
      expect(globalKeyAction(k('p'), ctx)).toBeNull();
      expect(globalKeyAction(k('F6'), ctx)).toBeNull();
    }
    expect(globalKeyAction(k('b', { ctrl: true }), here)).toBeNull();
    expect(globalKeyAction(k('p', { meta: true }), here)).toBeNull();
    expect(globalKeyAction(k('b', { alt: true }), here)).toBeNull();
    expect(globalKeyAction(k('x'), here)).toBeNull();
  });
  it('F6 goes board, prompt, hand, board; Shift+F6 the other way; from elsewhere to the board', () => {
    expect(nextRegion('board', false)).toBe('prompt');
    expect(nextRegion('prompt', false)).toBe('hand');
    expect(nextRegion('hand', false)).toBe('board');
    expect(nextRegion('board', true)).toBe('hand');
    expect(nextRegion('hand', true)).toBe('prompt');
    expect(nextRegion('other', false)).toBe('board');
    expect(nextRegion('other', true)).toBe('board');
  });
});

describe('hexLabel: the words of a mark', () => {
  const s = build({ units: [{ side: 'bottom', key: 'FR/LN', at: [5, 6] }, { side: 'top', key: 'BR/LN', at: [3, 6] }], leaders: [{ side: 'bottom', at: [5, 6], name: 'Ney' }] });
  it('a move with no battle after is not "move target" alone', () => {
    const l = hexLabel(s, H(4, 4), new Map<HexId, Highlight>([[H(4, 4), 'moveNoBattle']]));
    expect(l).toContain('move target (no battle after)');
    expect(hexLabel(s, H(4, 4), new Map<HexId, Highlight>([[H(4, 4), 'moveMustBattle']]))).toContain('move target (must battle)');
  });
  it('a target says its dice, as the badge on the board does', () => {
    const l = hexLabel(s, H(3, 6), new Map<HexId, Highlight>([[H(3, 6), 'targetClose']]), { badges: new Map([[H(3, 6), '4 dice']]) });
    expect(l).toContain('target, melee, 4 dice');
  });
  it('a retreat hex says so, and the retreating unit is named', () => {
    const d = { kind: 'retreat', side: 'bottom' } as unknown as Decision;
    const marks = new Map<HexId, Highlight>([[H(4, 4), 'option'], [H(5, 6), 'focus']]);
    expect(hexLabel(s, H(4, 4), marks, { decision: d })).toContain('retreat here');
    expect(hexLabel(s, H(5, 6), marks, { decision: d })).toContain('retreating');
    expect(hexLabel(s, H(4, 4), marks)).toContain('selectable'); // not a retreat decision
  });
  it('an attached leader has his own mark beside his unit\'s', () => {
    const marks = new Map<HexId, Highlight>([[H(5, 6), 'eligible']]);
    const l = hexLabel(s, H(5, 6), marks, { leaderMarks: new Map([[leaderId(s, 0), 'selected' as Highlight]]) });
    expect(l).toMatch(/Line Infantry, 4 of 4 blocks, selectable, leader Ney \(attached\), selected/);
    expect(hexLabel(s, H(5, 6), marks)).toMatch(/leader Ney \(attached\)$/);
  });
});

describe('a keyboard-only turn through the UI model', () => {
  for (const flipped of [false, true]) {
    it(`order, move and attack by key events give the answers the clicks give (board ${flipped ? 'turned' : 'upright'})`, () => {
      const human = flipped ? 'top' : 'bottom';
      const foe = human === 'top' ? 'bottom' : 'top';
      // the human's units stand at rows 4 and 5 of the board as seen from their side, the enemy one hex from the first
      const row = (r: number) => (human === 'bottom' ? r : 8 - r);
      const st = build({ first: human, units: [
        { side: human, key: 'FR/LN', at: [row(4), 6] }, { side: human, key: 'FR/LN', at: [row(5), 7] }, { side: foe, key: 'BR/LN', at: [row(2), 6] },
      ] });
      const dr = play(st, 'attackC');
      let ui = freshSelection(dr.state, dr.pending, human);
      let cursor = 0;
      const press = (key: string) => {
        const step = boardKeyStep({ cursor, key, shift: false, repeat: false, flipped, leaderAt: () => null, cursorShown: true });
        if (step.cursor !== undefined) cursor = step.cursor;
        if (step.clickHex === undefined) return;
        const r = hexClick(dr.state, dr.pending, ui, step.clickHex, human);
        if (r.ui) ui = r.ui;
        if (r.answer) { must(dr, r.answer); ui = freshSelection(dr.state, dr.pending, human); }
      };
      const goTo = (hex: HexId) => { for (const k of keysTo(cursor, hex, flipped)!) press(k); expect(cursor).toBe(hex); };
      const jump = () => { cursor = jumpTarget(dr.state, dr.pending, human, false, false, flipped)!.cursor; };
      // orders: the cursor lands on the first eligible hex; Enter orders the unit; the button confirms
      expect(dr.pending?.kind).toBe('orders');
      jump();
      expect(ui.orderSel).toEqual([]);
      press('Enter');
      expect(ui.orderSel).toHaveLength(1);
      must(dr, { kind: 'orders', pieces: ui.orderSel });
      ui = freshSelection(dr.state, dr.pending, human);
      // move: a lone mover is already selected; the cursor goes to its first destination and Enter moves it there
      expect(dr.pending?.kind).toBe('move');
      const piece = ui.selPiece!;
      expect(piece).toBeTruthy();
      jump();
      const before = dr.state.units.find((x) => x.id === piece)!.hex;
      press('Enter');
      const after = dr.state.units.find((x) => x.id === piece)!.hex;
      expect(after).not.toBe(before);
      if (dr.pending?.kind === 'move') must(dr, { kind: 'endMove' });
      // battle: select the attacker, walk to the enemy, Enter attacks
      expect(dr.pending?.kind).toBe('battle');
      {
        jump();
        if (!ui.selPiece) press('Enter');
        const foeHex = dr.state.units.find((x) => x.side === foe)!.hex;
        const mark = boardMarks(dr.state, dr.pending, ui, human).highlights.get(foeHex);
        expect(['targetClose', 'targetRanged']).toContain(mark);
        goTo(foeHex);
        press('Enter');
        expect(ev(dr).some((e) => e.t === 'combat')).toBe(true);
      }
    });
  }

  it('a click and the key are the same answer: the one hexClick', () => {
    const st = build({ first: 'bottom', units: [{ side: 'bottom', key: 'FR/LN', at: [5, 6] }, { side: 'top', key: 'BR/LN', at: [3, 6] }] });
    const dr = play(st, 'attackC');
    const ui = freshSelection(dr.state, dr.pending, 'bottom');
    const click = hexClick(dr.state, dr.pending, ui, H(5, 6), 'bottom');
    const key = boardKeyStep({ ...STEP, cursor: H(5, 6), key: 'Enter' });
    expect(hexClick(dr.state, dr.pending, ui, key.clickHex!, 'bottom')).toEqual(click);
    expect(click.ui?.orderSel).toEqual(['u1']);
    expect(leaderClick(dr.state, dr.pending, ui, 'nobody', 'bottom')).toEqual({ handled: false });
  });
});

describe('wiring: the screen uses the pure steps', () => {
  const board = src('../../src/ui/game/Board.tsx');
  const screen = src('../../src/ui/game/GameScreen.tsx');
  it('the board is one tab stop with a name; each cursor hex has its own id, and a live region repeats the sentence', () => {
    expect(board).toMatch(/role="application"/);
    expect(board).toMatch(/tabIndex=\{0\}/);
    expect(board).toContain('board-cursor-${p.cursor}');
    expect(board).not.toMatch(/aria-activedescendant=\{[^}]*'board-cursor'/);
    expect(screen).toMatch(/aria-live="polite"[^]*?cursorLabel|cursorLabel[^]*?aria-live="polite"/);
  });
  it('the keys, the jump and the global letters come from the pure steps; clicks from hexClick', () => {
    expect(screen).toContain('boardKeyStep(');
    expect(screen).toContain('jumpTarget(');
    expect(screen).toContain('globalKeyAction(');
    expect(screen).toContain('hexClick(');
    expect(screen).toContain('leaderClick(');
    expect(screen).not.toContain('markedNow'); // no marks of a stale render
  });
  it('a mouse click on the board moves the cursor there and hides it; Enter then falls to the global shortcut', () => {
    expect(screen).toMatch(/const onHexPointer = [^]*?setCursor\(h\)[^]*?setKbd\(false\)/);
    expect(screen).toMatch(/onHexClick=\{onHexPointer\}/);
    expect(screen).toMatch(/t\.closest\('\.board-svg'\)[^]*?kbd/); // the global Enter skips the board only while the cursor is shown
  });
  it('the board shows the cursor only while the keyboard drives it', () => {
    expect(board).toContain('cursorShown');
    expect(src('../../src/ui/game/board-keys.css')).toContain('.board-svg--kbd');
    expect(src('../../src/ui/game/board-keys.css')).not.toContain(':focus-visible .board-cursor');
  });
  it('the tooltip is anchored to the cursor hex while the keys drive it, and the hover clears when the board loses focus', () => {
    expect(screen).toMatch(/anchor=\{/);
    expect(screen).toMatch(/onBoardBlur = [^]*?hoverHex: null/);
  });
  it('the rules dialog documents the keys', () => {
    const rules = src('../../src/ui/screens/rulesText.ts');
    expect(rules).toMatch(/Keyboard[^]*?arrow keys[^]*?F6/i);
  });
  it('the focus ring lives in board-keys.css, from existing tokens', () => {
    const css = src('../../src/ui/game/board-keys.css');
    expect(css).toContain('.board-cursor');
    expect(css).toContain('var(--kit-gold)');
    expect(css).not.toMatch(/#[0-9a-f]{3,6}\b/i);
    expect(screen + board).toContain('board-keys.css');
  });
});
