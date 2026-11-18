// Infantry squares (RR §5.3, §6.3, §9.5, §10.3; R26-R32).
import { emitRoll, releaseSquare } from './casualties';
import { ask, type Gen } from './decisions';
import { meleeDice, scoreRoll } from './dice';
import { enemyCavalryAdjacent, unitById } from './query';
import { randInt, rollDice } from './rng';
import { applyOutcome } from './resolve';
import { TERRAIN_STATS, terrainAt, worksForbidSquare } from './terrain';
import { statsOf } from './units';
import type { FlowCtx, GameState, MeleeCtx, Side, SquareSlot, Unit } from './types';

export const SQUARE_TRACK = 4;
export const SQUARE_MIN_HAND = 3;

function freeSlot(s: GameState, side: Side): number {
  return s.players[side].squareTrack.findIndex((c) => c === null || c === undefined);
}

/** May `target` form square against `attacker`'s melee (R26 a, b, c, g; d-f by the role and the single defend decision)? */
export function canFormSquare(s: GameState, target: Unit, attacker: Unit, m: MeleeCtx): boolean {
  if (statsOf(s, target).arm !== 'infantry' || target.square !== undefined) return false;
  if (statsOf(s, attacker).arm !== 'cavalry') return false;
  if (m.role !== 'attack' && m.role !== 'bonus') return false;
  if (s.players[target.side].hand.length < SQUARE_MIN_HAND) return false;
  if (!TERRAIN_STATS[terrainAt(s, target.hex)].squareAllowed) return false;
  if (worksForbidSquare(s, target, attacker.hex)) return false;
  return freeSlot(s, target.side) >= 0;
}

/** Form square: a random hand card goes face down on the lowest free slot (R27); the event names no card. */
export function formSquare(s: GameState, ctx: FlowCtx, u: Unit): void {
  const p = s.players[u.side];
  const i = freeSlot(s, u.side);
  const card = p.hand.splice(randInt(s, p.hand.length), 1)[0];
  p.squareTrack[i] = card;
  u.square = (i + 1) as SquareSlot;
  ctx.emit({ t: 'squareFormed', id: u.id, slot: u.square });
}

/** Does the square fight first in this melee (an infantry unit in square attacked by cavalry; R29)? */
export function squareFirstApplies(s: GameState, m: MeleeCtx): boolean {
  const target = unitById(s, m.target);
  const attacker = unitById(s, m.attacker);
  return !!target && !!attacker && target.square !== undefined && statsOf(s, attacker).arm === 'cavalry';
}

export function* leaveSquareStep(s: GameState, ctx: FlowCtx, side: Side): Gen {
  for (const u of [...s.units]) {
    const op = s.turn.ordered[u.id];
    if (u.side !== side || u.square === undefined || !op) continue;
    if (enemyCavalryAdjacent(s, u.hex, side)) {
      op.stayInSquare = true;
      continue;
    }
    const a = yield* ask(s, ctx, { kind: 'leaveSquare', side, unit: u.id });
    if (a.kind === 'yesno' && a.yes) releaseSquare(s, ctx, u);
  }
}

/** The square rolls first against cavalry; its flags bounce. 'stop' when the cavalry is gone or has left its hex. */
export function* squareFightsFirst(s: GameState, ctx: FlowCtx, m: MeleeCtx): Gen<'continue' | 'stop'> {
  if (!squareFirstApplies(s, m)) return 'continue';
  const sq = unitById(s, m.target)!;
  const cav = unitById(s, m.attacker)!;
  const from = cav.hex;
  const dice = meleeDice(s, sq, cav, { role: 'squareFirst', moved: 0 });
  ctx.emit({ t: 'combat', purpose: 'squareFirst', attacker: sq.id, target: cav.id, dice });
  const faces = rollDice(s, dice);
  const sc = scoreRoll(faces, 'melee', statsOf(s, sq), 'cavalry');
  emitRoll(ctx, 'squareFirst', faces, sc.scoring, sq.id, cav.id);
  const applied = yield* applyOutcome(s, ctx, cav, { hits: sc.hits, flags: sc.flags, bounce: true }, sq, 'square');
  if (s.winner || applied.eliminated || applied.left || !unitById(s, m.attacker) || cav.hex !== from) return 'stop';
  return 'continue';
}
