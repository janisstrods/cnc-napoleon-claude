// Board index and distance helpers for the AI. Public information only (positions of pieces).
import { COLS, OFF_BOARD, ROWS, distance, sectionsOf, type GameState, type PieceIndex, type SectionName, type Side, type Unit } from '../engine';
import type { Leader } from '../engine';

/** The engine's `PieceIndex` (one lookup per hex) plus the units on the board by side. */
export interface Occ extends PieceIndex {
  readonly bySide: Readonly<Record<Side, readonly Unit[]>>;
}

/** Build the occupancy table of a state once; pass it to the engine's `at` parameters. */
export function occOf(s: GameState): Occ {
  const unit: (Unit | null)[] = new Array<Unit | null>(ROWS * COLS).fill(null);
  const leader: (Leader | null)[] = new Array<Leader | null>(ROWS * COLS).fill(null);
  const bySide: Record<Side, Unit[]> = { top: [], bottom: [] };
  for (const u of s.units) {
    if (u.hex === OFF_BOARD) continue;
    unit[u.hex] = u;
    bySide[u.side].push(u);
  }
  for (const l of s.leaders) if (l.hex !== OFF_BOARD) leader[l.hex] = l;
  return { unit, leader, bySide };
}

/** Distance from `u` to the nearest enemy unit on the board (99 when there is none). */
export function nearestEnemyDist(_s: GameState, occ: Occ, u: Unit): number {
  let best = 99;
  for (const e of occ.bySide[u.side === 'top' ? 'bottom' : 'top']) {
    const d = distance(u.hex, e.hex);
    if (d < best) best = d;
  }
  return best;
}

/** Friendly units (not `u` itself) within `r` hexes of `u`. */
export function friendsWithin(_s: GameState, occ: Occ, u: Unit, r: number): number {
  let n = 0;
  for (const f of occ.bySide[u.side]) if (f !== u && f.id !== u.id && distance(u.hex, f.hex) <= r) n++;
  return n;
}

/** The sections of the board (from its own side's view) that the unit stands in. */
export function sectionsOfUnit(u: Unit): SectionName[] {
  return sectionsOf(u.hex, u.side);
}
