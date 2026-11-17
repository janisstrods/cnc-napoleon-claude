// Line of sight and range (RR §8.1, §8.3, §8.4).
import { ALL_HEXES, distance, lineBetween, neighbours } from './hex';
import { baseFireDice } from './dice';
import { enemyUnitAdjacent, leaderOn, unitOn, type PieceIndex } from './query';
import { TERRAIN_STATS, isHill, terrainAt } from './terrain';
import { statsOf } from './units';
import { OFF_BOARD, type GameState, type HexId, type Unit } from './types';

/** Connected hill groups (hex → group id), once per `terrain` array. */
const hillGroups = new WeakMap<object, Map<HexId, number>>();
function hillGroupOf(s: GameState, h: HexId): number | undefined {
  let groups = hillGroups.get(s.terrain);
  if (!groups) {
    groups = new Map();
    let next = 0;
    for (const start of ALL_HEXES) {
      if (!isHill(s, start) || groups.has(start)) continue;
      const stack = [start];
      groups.set(start, next);
      while (stack.length) {
        for (const n of neighbours(stack.pop()!)) {
          if (isHill(s, n) && !groups.has(n)) { groups.set(n, next); stack.push(n); }
        }
      }
      next++;
    }
    hillGroups.set(s.terrain, groups);
  }
  return groups.get(h);
}

/** Line of sight (RR §8.3): pieces, sight-blocking terrain, the side edge and hills obstruct; the plateau and a hill battery are the exceptions. */
export function lineOfSight(s: GameState, from: HexId, to: HexId, opts: { hillBattery?: boolean; at?: PieceIndex } = {}): boolean {
  if (distance(from, to) <= 1) return true;
  const at = opts.at;
  const fromGroup = isHill(s, from) ? hillGroupOf(s, from) : undefined;
  const plateau = fromGroup !== undefined && isHill(s, to) && hillGroupOf(s, to) === fromGroup;
  const shooter = opts.hillBattery && fromGroup !== undefined ? unitOn(s, from, at) ?? leaderOn(s, from, at) : undefined;
  const obstructed = (h: HexId, first: boolean): boolean => {
    if (h === OFF_BOARD) return true;
    if (TERRAIN_STATS[terrainAt(s, h)].blocksSight) return true;
    const hill = isHill(s, h);
    if (hill && !(plateau && hillGroupOf(s, h) === fromGroup)) return true;
    const u = unitOn(s, h, at);
    const l = leaderOn(s, h, at);
    if (!u && !l) return false;
    if (first && shooter && !hill && (!u || u.side === shooter.side) && (!l || l.side === shooter.side)) return false;
    return true;
  };
  const [plus, minus] = lineBetween(from, to);
  // Blocked only where the hexes on both sides of the line are obstructed, step by step (R49); a step on a hex centre has one hex.
  return !plus.some((h, i) => obstructed(h, i === 0) && (minus[i] === h || obstructed(minus[i], i === 0)));
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
  return lineOfSight(s, u.hex, targetHex, { at, hillBattery: statsOf(s, u).arm === 'artillery' });
}

/** The hexes `u` may fire at, ascending. */
export function fireTargets(s: GameState, u: Unit, at?: PieceIndex): HexId[] {
  return s.units.filter((v) => v.side !== u.side && v.hex >= 0 && canFireAt(s, u, v.hex, at)).map((v) => v.hex).sort((a, b) => a - b);
}

/** Line of sight without the hill battery (Combined Arms, R39). */
export function clearSight(s: GameState, from: HexId, to: HexId): boolean {
  return lineOfSight(s, from, to);
}
