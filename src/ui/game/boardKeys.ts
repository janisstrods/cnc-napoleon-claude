// Keyboard play on the board: the cursor hex, the keys that move it, and the sentence that announces it. Pure, so the
// tests can walk a turn without a browser. Enter and Space on the cursor hex go through the same click handler as a click.
import { colOf, leaderAt, rowOf, unitAt, UNIT_STATS, type GameState, type HexId } from '../../engine';
import type { Highlight } from './Board';
import { terrainTip } from './terrainTips';

export type CursorKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | 'Home' | 'End';

const CURSOR_KEYS: readonly string[] = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];

/** What a key does on the board: move the cursor, act like a click on the hex, act like a click on its leader's medallion, or nothing. */
export type BoardKeyAction = { kind: 'move'; key: CursorKey } | { kind: 'activate' } | { kind: 'leader' };

export function boardKeyAction(key: string, shift: boolean): BoardKeyAction | null {
  if (CURSOR_KEYS.includes(key)) return { kind: 'move', key: key as CursorKey };
  if (key === 'Enter') return shift ? { kind: 'leader' } : { kind: 'activate' };
  if (key === ' ') return { kind: 'activate' };
  return null; // Escape stays the screen's clear-selection
}

const TURNED: Record<CursorKey, CursorKey> = {
  ArrowLeft: 'ArrowRight', ArrowRight: 'ArrowLeft', ArrowUp: 'ArrowDown', ArrowDown: 'ArrowUp', Home: 'End', End: 'Home',
};

/** The key as the board lies on the screen: a board turned for the top army (`flipped`) is the map seen from the other side. */
export function screenKey(key: CursorKey, flipped: boolean): CursorKey {
  return flipped ? TURNED[key] : key;
}

/** The first column past the end of row `r`: an odd row holds one hex fewer. */
const rowLen = (r: number, cols: number) => (r % 2 === 0 ? cols : cols - 1);

/**
 * The hex a key takes the cursor to, on a map of `rows` rows of `cols` hexes (odd rows one fewer; ids `row * cols + col`).
 * Left and Right run along the row, Home and End go to its ends, Up and Down to the same column of the next row. The cursor
 * stops at the edges of the map; it never wraps.
 */
export function moveCursor(hex: HexId, key: CursorKey, rows: number, cols: number): HexId {
  const r = Math.floor(hex / cols);
  const c = hex % cols;
  const at = (nr: number, nc: number): HexId => nr * cols + Math.max(0, Math.min(rowLen(nr, cols) - 1, nc));
  switch (key) {
    case 'ArrowLeft': return at(r, c - 1);
    case 'ArrowRight': return at(r, c + 1);
    case 'Home': return at(r, 0);
    case 'End': return at(r, cols);
    case 'ArrowUp': return at(Math.max(0, r - 1), c);
    case 'ArrowDown': return at(Math.min(rows - 1, r + 1), c);
  }
}

/**
 * The marked hex the cursor jumps to: the first in reading order on the screen (the top row's left end first; with the board
 * `flipped` that is the highest id), or null when nothing is marked. The `focus` mark (the unit that retreats) is passed over:
 * the cursor goes where the choice is.
 */
export function firstMarked(marks: ReadonlyMap<HexId, unknown> | ReadonlySet<HexId>, flipped = false): HexId | null {
  let best: HexId | null = null;
  for (const h of marks.keys()) {
    if (marks instanceof Map && marks.get(h) === 'focus') continue; // the piece in question (a retreating unit) is not where the choice is made
    if (best === null || (flipped ? h > best : h < best)) best = h;
  }
  return best;
}

/** Every marked hex with its mark: the hex highlights, and the hex of each leader marked on his own token. */
export function markedHexes(m: { highlights: ReadonlyMap<HexId, Highlight>; leaderHighlights: ReadonlyMap<string, Highlight> }, s?: GameState): Map<HexId, Highlight> {
  const out = new Map(m.highlights);
  if (s) for (const l of s.leaders) { const h = m.leaderHighlights.get(l.id); if (h && l.hex >= 0 && !out.has(l.hex)) out.set(l.hex, h); }
  return out;
}

const MARK_WORD: Partial<Record<Highlight, string>> = {
  eligible: 'selectable', mover: 'selectable', attacker: 'selectable', option: 'selectable', selected: 'selected',
  move: 'move target', moveNoBattle: 'move target', moveMustBattle: 'move target',
  targetClose: 'target, melee', targetRanged: 'target, fire',
};

/**
 * What the cursor hex says aloud: "row 2, column 6, Open ground, French Line Infantry 4/4 blocks, selectable". Row and column
 * are the numbers of the retreat buttons ("To 5,5"). `marks` is the board's highlights (see `markedHexes`).
 */
export function hexLabel(s: GameState, hex: HexId, marks: ReadonlyMap<HexId, Highlight>): string {
  const parts = [`row ${rowOf(hex)}, column ${colOf(hex)}`, terrainTip(s, hex, false)?.name ?? 'Open ground'];
  const u = unitAt(s, hex);
  const l = leaderAt(s, hex);
  if (u) parts.push(`${s.players[u.side].army} ${UNIT_STATS[u.key].name}, ${u.blocks} of ${u.maxBlocks} blocks${u.square !== undefined ? ', in square' : ''}`);
  if (l) parts.push(`leader ${l.name || 'unnamed'} (${u ? 'attached' : 'alone'})`);
  if (!u && !l) parts.push('empty');
  const mark = marks.get(hex);
  const word = mark && MARK_WORD[mark];
  if (word) parts.push(word);
  return parts.join(', ');
}

