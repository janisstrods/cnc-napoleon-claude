// The options of the turn being played, as pure queries of the state, with the move and battle validators that
// `answerError` (decisions.ts) dispatches to. Skeleton: fire targets from `fireTargets`, melee targets are the adjacent
// enemy units, a target only with dice >= 1 (→ T6a).
import { cardForbidsBattle } from './cards';
import { fireDice, meleeDice } from './dice';
import { neighbours } from './hex';
import { canBattleAfterMove, leaderMoves, unitMoves, type MoveTarget } from './movement';
import { unitAt, unitById } from './query';
import { fireTargets } from './sight';
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
      if (!t || t.side === u.side) continue;
      const dice = meleeDice(s, u, t, { role: 'attack', moved: op.moved });
      if (dice >= 1) out.push({ hex, kind: 'melee', dice });
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

/** The artillery that may join a Combined Arms attack by `unit` on `target`. Stub: none (→ T10). */
export function combinedArmsCandidates(_s: GameState, _unit: Unit, _target: Unit): string[] {
  return [];
}
