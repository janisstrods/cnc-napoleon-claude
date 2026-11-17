// Shared plumbing for the scenario suites: starting states, hex labels, unit tallies and terrain queries.
import type { RowKey } from '../../src/engine/codes';
import { colOf, hexId, rowOf } from '../../src/engine/hex';
import { createGame } from '../../src/engine/setup';
import type { GameState, Side } from '../../src/engine/types';
import { scenarioById } from '../../src/scenarios';

export const H = (r: number, c: number) => hexId(r, c);
export const SIDES: Side[] = ['top', 'bottom'];

/** A battle's starting state. */
export const game = (id: string, seed = 1) => createGame(scenarioById(id).setup, seed);

/** The numbers a..b as strings. */
export const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => String(a + i));

/** A hex as 'r,c'. */
export const rc = (h: number) => `${rowOf(h)},${colOf(h)}`;

/** The hexes r,a .. r,b as 'r,c' strings. */
export const cols = (r: number, a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => `${r},${a + i}`);
export const sorted = (xs: string[]) => [...xs].sort();

export function unitCounts(s: GameState, side: Side): Partial<Record<RowKey, number>> {
  const n: Partial<Record<RowKey, number>> = {};
  for (const u of s.units) if (u.side === side) n[u.key] = (n[u.key] ?? 0) + 1;
  return n;
}

/** The hexes of a terrain type as sorted 'r,c' strings. */
export function hexesOf(s: GameState, type: string): string[] {
  const out: string[] = [];
  s.terrain.forEach((t, h) => {
    if (t === type) out.push(rc(h));
  });
  return out.sort();
}
