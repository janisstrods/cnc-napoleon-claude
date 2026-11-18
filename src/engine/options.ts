// The options of the turn being played, as pure queries of the state, with the move and battle validators that
// `answerError` (decisions.ts) dispatches to. Fire targets come from `fireTargets`; melee targets are the adjacent enemy
// units and lone leaders; a target is offered only with dice >= 1 (R15), the exception being a melee unit with none of its own
// when a Combined Arms gun could join (the combinedArms decision then requires one).
import { cardForbidsBattle } from './cards';
import { fireDice, meleeDice } from './dice';
import { distance, neighbours } from './hex';
import { canBattleAfterMove, leaderMoves, unitMoves, type MoveTarget } from './movement';
import { enemyUnitAdjacent, leaderAt, unitAt, unitById } from './query';
import { clearSight, fireTargets } from './sight';
import { statsOf } from './units';
import type { Answer, GameState, HexId, Unit } from './types';

/** The option a legal answer picked, as `answerError` found it: the flow acts on it at once instead of working it out again. */
export interface Found { move?: MoveTarget; target?: BattleTarget }

export interface BattleTarget { hex: HexId; kind: 'fire' | 'melee'; dice: number }

/** Move targets of an ordered piece (empty if it may not move). */
export function pieceMoves(s: GameState, id: string): MoveTarget[] {
  const op = s.turn.ordered[id];
  if (!op) return [];
  return op.isLeader ? leaderMoves(s, id) : unitMoves(s, id);
}

/** Ordered pieces that can move now. */
export function movablePieces(s: GameState): string[] {
  return Object.keys(s.turn.ordered).filter((id) => pieceMoves(s, id).length > 0);
}

/** Legal battle targets of an ordered unit right now. */
export function battleTargets(s: GameState, id: string): BattleTarget[] {
  const op = s.turn.ordered[id];
  const u = unitById(s, id);
  if (!op || !u || op.isLeader || op.battled || u.hex < 0) return [];
  if (!canBattleAfterMove(s, u, op) || cardForbidsBattle(s, op, u)) return [];
  const m = s.turn.mods;
  const out: BattleTarget[] = [];
  if (!(m.noFire && op.cardMods)) {
    for (const hex of fireTargets(s, u)) {
      const dice = fireDice(s, u, hex, { role: 'attack', moved: op.moved });
      if (dice >= 1) out.push({ hex, kind: 'fire', dice });
    }
  }
  if (!(m.noMelee && op.cardMods)) {
    for (const hex of neighbours(u.hex)) {
      const t: Unit | undefined = unitAt(s, hex);
      const target = t ?? leaderAt(s, hex);  // a lone enemy leader may be attacked in melee, never fired at (R6, R21)
      if (!target || target.side === u.side) continue;
      const dice = meleeDice(s, u, target, { role: 'attack', moved: op.moved });
      // a melee unit with no dice of its own may still attack when a gun adds some (R15, §9.6)
      if (dice >= 1 || (t && combinedArmsCandidates(s, u, t).length > 0)) out.push({ hex, kind: 'melee', dice });
    }
  }
  return out;
}

/** Ordered units that can battle now. */
export function battleReady(s: GameState): string[] {
  return Object.keys(s.turn.ordered).filter((id) => battleTargets(s, id).length > 0);
}

export function validateMove(s: GameState, a: Answer, found?: Found): string | null {
  if (a.kind === 'endMove') return null;
  if (a.kind !== 'move') return 'Move a unit or end movement.';
  if (!s.turn.ordered[a.piece]) return 'That piece is not ordered.';
  const move = pieceMoves(s, a.piece).find((m) => m.hex === a.to);
  if (!move) return 'That piece cannot move there.';
  if (found) found.move = move;
  return null;
}

export function validateBattle(s: GameState, a: Answer, found?: Found): string | null {
  if (a.kind === 'endBattle') return null;
  if (a.kind !== 'attack') return 'Attack or end the battle phase.';
  const t = battleTargets(s, a.unit).find((x) => x.hex === a.target);
  if (!t) return 'That unit cannot battle there.';
  if (found) found.target = t;
  return null;
}

/** The dice a gun rolls in a Combined Arms attack on `target`: melee dice when adjacent, range dice otherwise (R41; 0 when it cannot join). */
export function gunDice(s: GameState, gun: Unit, target: Unit, role: 'attack' | 'bonus'): number {
  const moved = s.turn.ordered[gun.id]?.moved ?? 0;
  if (distance(gun.hex, target.hex) <= 1) return meleeDice(s, gun, target, { role, moved, declared: true });
  return fireDice(s, gun, target.hex, { role: role === 'attack' || s.turn.mods.bonusMelee ? 'attack' : 'bonus', moved });
}

/**
 * The artillery that may join a Combined Arms attack by `unit` on the enemy unit `target` (RR §9.6, R39, R41, R76): own ordered
 * guns that have not battled, with dice >= 1, either adjacent to the target or not adjacent to any enemy unit and with a
 * clear line (no hill battery, [Interp R39]).
 */
export function combinedArmsCandidates(s: GameState, unit: Unit, target: Unit, role: 'attack' | 'bonus' = 'attack'): string[] {
  if (target.side === unit.side || target.hex < 0 || unit.hex < 0 || !s.turn.ordered[unit.id]) return [];
  if (statsOf(s, unit).arm === 'artillery') return [];
  const m = s.turn.mods;
  const out: string[] = [];
  for (const g of s.units) {
    const op = s.turn.ordered[g.id];
    if (g.side !== unit.side || g.id === unit.id || g.hex < 0 || !op || op.isLeader || op.battled) continue;
    if (statsOf(s, g).arm !== 'artillery' || !canBattleAfterMove(s, g, op) || cardForbidsBattle(s, op, g)) continue;
    if (distance(g.hex, target.hex) <= 1) {
      if (m.noMelee && op.cardMods) continue;
    } else if ((m.noFire && op.cardMods) || enemyUnitAdjacent(s, g.hex, g.side) || !clearSight(s, g.hex, target.hex)) continue;
    if (gunDice(s, g, target, role) >= 1) out.push(g.id);
  }
  return out;
}
