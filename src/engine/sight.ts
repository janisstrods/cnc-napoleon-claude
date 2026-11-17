// Line of sight and range (RR §8.1, §8.3). Skeleton: pieces, `blocksSight` terrain and every intermediate hill block (→ T4).
import { hasLineOfSight, distance } from './hex';
import { baseFireDice } from './dice';
import { enemyUnitAdjacent, leaderOn, unitOn, type PieceIndex } from './query';
import { TERRAIN_STATS, isHill, terrainAt } from './terrain';
import { statsOf } from './units';
import type { GameState, HexId, Unit } from './types';

export function lineOfSight(s: GameState, from: HexId, to: HexId, opts: { hillBattery?: boolean; at?: PieceIndex } = {}): boolean {
  const at = opts.at;
  return hasLineOfSight(from, to, (h) =>
    !!unitOn(s, h, at) || !!leaderOn(s, h, at) || TERRAIN_STATS[terrainAt(s, h)].blocksSight || isHill(s, h));
}

/** May `u` fire at the enemy unit on `targetHex`? Units only; range from `baseFireDice`; not when adjacent to an enemy unit. */
export function canFireAt(s: GameState, u: Unit, targetHex: HexId, at?: PieceIndex): boolean {
  const t = unitOn(s, targetHex, at);
  if (!t || t.side === u.side) return false;
  const d = distance(u.hex, targetHex);
  if (d < 2) return false;
  const moved = s.turn.ordered[u.id]?.moved ?? 0;
  if (baseFireDice(statsOf(s, u), u.blocks, d, moved) <= 0) return false;
  if (enemyUnitAdjacent(s, u.hex, u.side, at)) return false;
  return lineOfSight(s, u.hex, targetHex, { at });
}

/** The hexes `u` may fire at, ascending. */
export function fireTargets(s: GameState, u: Unit, at?: PieceIndex): HexId[] {
  return s.units.filter((v) => v.side !== u.side && v.hex >= 0 && canFireAt(s, u, v.hex, at)).map((v) => v.hex).sort((a, b) => a - b);
}

/** Line of sight without the hill battery (Combined Arms, R39). */
export function clearSight(s: GameState, from: HexId, to: HexId): boolean {
  return lineOfSight(s, from, to);
}
