// Keyboard play on the board: the cursor hex, the keys that move it, and the sentence that announces it. Pure, so the
// tests can walk a turn without a browser. Enter and Space on the cursor hex go through the same click handler as a click.
import {
  COLS, ROWS, battleReady, colOf, leaderAt, movablePieces, rowOf, unitAt, UNIT_STATS, type Decision, type GameState, type HexId, type Side,
} from '../../engine';
import type { Highlight } from './Board';
import { terrainTip } from './terrainTips';
import { boardMarks, handChoices, wantsPromptFocus, type UiSel } from './uiModel';

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
  move: 'move target', moveNoBattle: 'move target (no battle after)', moveMustBattle: 'move target (must battle)',
  targetClose: 'target, melee', targetRanged: 'target, fire',
};

/** The word of a mark; in a retreat the option hexes are where the unit goes and the focus mark is the unit that falls back. */
function markWord(mark: Highlight | undefined, d: Decision | null | undefined): string | undefined {
  if (!mark) return undefined;
  const retreat = d?.kind === 'retreat' || d?.kind === 'leaderRetreat';
  if (retreat && mark === 'option') return 'retreat here';
  if (retreat && mark === 'focus') return 'retreating';
  return MARK_WORD[mark];
}

export interface LabelExtras {
  /** The badges on the board (a target's dice). */
  badges?: ReadonlyMap<HexId, string>;
  /** The pending decision (a retreat's hexes are worded as such). */
  decision?: Decision | null;
  /** The marks on attached leaders' own tokens, by leader id. */
  leaderMarks?: ReadonlyMap<string, Highlight>;
}

/**
 * What the cursor hex says aloud: "row 2, column 6, Open ground, French Line Infantry, 4 of 4 blocks, selectable". Row and
 * column are the numbers of the retreat buttons ("To 5,5"). `marks` is the board's hex highlights; an attached leader's own
 * mark (`leaderMarks`) follows his name, so it is not taken for his unit's.
 */
export function hexLabel(s: GameState, hex: HexId, marks: ReadonlyMap<HexId, Highlight>, extras: LabelExtras = {}): string {
  const parts = [`row ${rowOf(hex)}, column ${colOf(hex)}`, terrainTip(s, hex, false)?.name ?? 'Open ground'];
  const u = unitAt(s, hex);
  const l = leaderAt(s, hex);
  const hexWord = markWord(marks.get(hex), extras.decision);
  const badge = extras.badges?.get(hex);
  const hexMark = hexWord ? [badge && marks.get(hex)?.startsWith('target') ? `${hexWord}, ${badge}` : hexWord] : [];
  if (u) parts.push(`${s.players[u.side].army} ${UNIT_STATS[u.key].name}, ${u.blocks} of ${u.maxBlocks} blocks${u.square !== undefined ? ', in square' : ''}`, ...hexMark);
  if (l) {
    parts.push(`leader ${l.name || 'unnamed'} (${u ? 'attached' : 'alone'})`);
    const own = markWord(extras.leaderMarks?.get(l.id), extras.decision);
    if (u) { if (own) parts.push(own); } else parts.push(...hexMark);
  }
  if (!u && !l) parts.push('empty', ...hexMark);
  return parts.join(', ');
}

// ---------------------------------------------------------------------------------------------------- the key step

export interface KeyStepIn {
  cursor: HexId;
  key: string;
  shift: boolean;
  repeat: boolean;
  /** The board is turned for the top army. */
  flipped: boolean;
  /** The id of the leader standing on a hex, if any. */
  leaderAt: (hex: HexId) => string | null;
  /** The cursor is on show: the keyboard drives it (a mouse click hides it). */
  cursorShown: boolean;
}

export interface KeyStepOut {
  /** False: the key is not the board's (the screen's own shortcut, or the browser, keeps it). */
  handled: boolean;
  cursor?: HexId;
  /** The hex the hover (path preview, tooltip) follows. */
  hover?: HexId;
  showCursor?: boolean;
  /** Act as a click on this hex. */
  clickHex?: HexId;
  /** Act as a click on this leader's medallion. */
  leaderId?: string;
}

/** What one key does on the board (see `KeyStepIn`): the whole keyboard behaviour of the board, without a browser. */
export function boardKeyStep(i: KeyStepIn): KeyStepOut {
  const a = boardKeyAction(i.key, i.shift);
  if (!a) return { handled: false };
  if (a.kind === 'move') {
    const to = moveCursor(i.cursor, screenKey(a.key, i.flipped), ROWS, COLS);
    return { handled: true, cursor: to, hover: to, showCursor: true };
  }
  // with the cursor hidden (a mouse click took the focus) Enter is the screen's own shortcut, as it was before the board had keys
  if (!i.cursorShown) return { handled: false };
  if (i.repeat) return { handled: true }; // a held key must not act again
  if (a.kind === 'leader') {
    const id = i.leaderAt(i.cursor);
    return id ? { handled: true, leaderId: id } : { handled: true, clickHex: i.cursor };
  }
  return { handled: true, clickHex: i.cursor };
}

// ------------------------------------------------------------------------------------------------ the new decision

/** The selection a new decision of the human's starts with: nothing, or the one piece that can act. */
export function freshSelection(s: GameState, d: Decision | null, human: Side): UiSel {
  let selPiece: string | null = null;
  if (d?.kind === 'move' && d.side === human) { const movers = movablePieces(s); if (movers.length === 1) selPiece = movers[0]; }
  if (d?.kind === 'battle' && d.side === human) { const ready = battleReady(s); if (ready.length === 1) selPiece = ready[0]; }
  // a hand chooser with one legal card (the bound opening card) has it selected, so the primary button is there to take
  let selCard: number | null = null;
  if ((d?.kind === 'playCard' || d?.kind === 'moveFirst') && d.side === human) { const c = handChoices(s, d, human); if (c.length === 1) selCard = c[0]; }
  return { selCard, hoverCard: null, orderSel: [], selPiece, hoverHex: null, hoverAction: null, assign: null, gunSel: [] };
}

/**
 * Where a new decision puts the board cursor: the first hex its fresh marks show (not those of the selection before it),
 * for a keyboard player. `keepFocus`: the focus was in the board, so it stays there. Null: leave the cursor, and the
 * focus goes to the prompt as for any decision.
 */
export function jumpTarget(
  s: GameState, d: Decision | null, human: Side, pointerOverBoard: boolean, focusInBoard: boolean, flipped: boolean,
): { cursor: HexId; keepFocus: boolean } | null {
  // a pointer resting on the board does not matter once the keyboard is already in it
  if (!wantsPromptFocus(d, human, pointerOverBoard && !focusInBoard) || d?.kind === 'playCard') return null;
  const first = firstMarked(markedHexes(boardMarks(s, d, freshSelection(s, d, human), human), s), flipped);
  return first === null ? null : { cursor: first, keepFocus: focusInBoard };
}

// ---------------------------------------------------------------------------------------------------- global keys

export type GlobalKey = 'board' | 'prompt' | 'cycle' | 'cycleBack';
export type Region = 'board' | 'prompt' | 'hand' | 'other';

/**
 * The screen-wide navigation keys: B (board), P (prompt buttons), F6 / Shift+F6 (cycle board, prompt, hand). Single letters
 * work only while the focus is in the game screen and not in a dialog or a field (WCAG 2.1.4); F6 is the key without a letter.
 */
export function globalKeyAction(
  e: { key: string; shift: boolean; ctrl: boolean; meta: boolean; alt: boolean },
  where: { inGame: boolean; typing: boolean; modal: boolean },
): GlobalKey | null {
  if (!where.inGame || where.typing || where.modal || e.ctrl || e.meta || e.alt) return null;
  if (e.key === 'F6') return e.shift ? 'cycleBack' : 'cycle';
  if (e.key === 'b' || e.key === 'B') return 'board';
  if (e.key === 'p' || e.key === 'P') return 'prompt';
  return null;
}

const ORDER: Region[] = ['board', 'prompt', 'hand'];

/** The region F6 goes to from `from`: board, prompt, hand, board; from anywhere else the board. */
export function nextRegion(from: Region, back: boolean): Exclude<Region, 'other'> {
  const i = ORDER.indexOf(from);
  if (i < 0) return 'board';
  return ORDER[(i + (back ? ORDER.length - 1 : 1)) % ORDER.length] as Exclude<Region, 'other'>;
}
