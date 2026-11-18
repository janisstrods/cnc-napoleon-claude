// Melee (RR §9.2, §9.3). The call sites of the hooks below are kept by every later task.
import { afterMelee } from './afterMelee';
import { emitRoll } from './casualties';
import { combinedArmsStep } from './combinedArms';
import { ask, type Gen } from './decisions';
import { meleeDice, scoreRoll } from './dice';
import { neighbours } from './hex';
import { leaderAt, unitAt, unitById } from './query';
import { loneLeaderMelee } from './leaders';
import { defenderReaction, firstStrikeRoll, resolveRetireReform } from './reactions';
import { rollDice } from './rng';
import { applyOutcome } from './resolve';
import { formSquare, squareFightsFirst } from './squares';
import { noBattleAfterEntering } from './terrain';
import { statsOf } from './units';
import type { FlowCtx, GameState, HexId, MeleeCtx } from './types';

/** The move into the vacated hex, then a cavalry unit's optional bonus melee (RR §9.8, R36, R37). */
function* afterAndBonus(s: GameState, ctx: FlowCtx, m: MeleeCtx, vacated: HexId): Gen {
  const entered = yield* afterMelee(s, ctx, m, vacated);
  if (!entered || s.winner) return;
  const u = unitById(s, m.attacker);
  const op = s.turn.ordered[m.attacker];
  if (!u || !op || op.bonusMeleeDone || noBattleAfterEntering(s, u.hex, statsOf(s, u))) return;
  const targets = neighbours(u.hex).filter((h) => {
    const t = unitAt(s, h);
    const l = t ? undefined : leaderAt(s, h);
    const foe = t ?? l;
    return !!foe && foe.side !== u.side && meleeDice(s, u, foe, { role: 'bonus', moved: op.moved, declared: true }) >= 1;
  });
  if (targets.length === 0) return;
  const a = yield* ask(s, ctx, { kind: 'bonusMelee', side: u.side, unit: u.id, targets });
  if (a.kind !== 'hex' || a.hex === null) return;
  yield* meleeAttack(s, ctx, u.id, a.hex, 'bonus');
}

/** Returns true when the defender vacated its hex. */
export function* meleeAttack(s: GameState, ctx: FlowCtx, attackerId: string, targetHex: HexId, role: 'attack' | 'bonus'): Gen<boolean> {
  const attacker = unitById(s, attackerId)!;
  const op = s.turn.ordered[attackerId];
  if (role === 'attack') op.battled = true;
  else op.bonusMeleeDone = true;
  const defender = unitAt(s, targetHex);
  if (!defender) {
    const l = leaderAt(s, targetHex)!;
    const lm: MeleeCtx = { attacker: attackerId, target: l.id, targetHex, role, artillery: [], reaction: null, declaredMoved: op.moved };
    const vacated = yield* loneLeaderMelee(s, ctx, attacker, l, lm);
    if (s.winner) return false;
    if (vacated) yield* afterAndBonus(s, ctx, lm, targetHex);
    return vacated;
  }
  const m: MeleeCtx = { attacker: attackerId, target: defender.id, targetHex, role, artillery: [], reaction: null, declaredMoved: op.moved };
  m.artillery = yield* combinedArmsStep(s, ctx, m);
  m.reaction = yield* defenderReaction(s, ctx, m);
  if (m.reaction === 'retireReform') {
    const v = yield* resolveRetireReform(s, ctx, m);
    if (v !== null) yield* afterAndBonus(s, ctx, m, v);
    return v !== null;
  }
  if (m.reaction === 'formSquare') formSquare(s, ctx, defender);
  if ((yield* squareFightsFirst(s, ctx, m)) === 'stop') return false;
  if (m.reaction === 'firstStrike' && (yield* firstStrikeRoll(s, ctx, m)) === 'stop') return false;

  // the attacker's roll
  const purpose = role === 'bonus' ? 'bonus' : 'melee';
  const dice = meleeDice(s, attacker, defender, { role, moved: op.moved, declared: true });
  ctx.emit({ t: 'combat', purpose, attacker: attackerId, target: defender.id, dice });
  const faces = rollDice(s, dice);
  const sc = scoreRoll(faces, 'melee', statsOf(s, attacker), statsOf(s, defender).arm);
  emitRoll(ctx, purpose, faces, sc.scoring, attackerId, defender.id);
  const applied = yield* applyOutcome(s, ctx, defender, { hits: sc.hits, flags: sc.flags, bounce: false }, attacker, 'melee');
  if (s.winner) return false;
  if (applied.eliminated || applied.left) {
    yield* afterAndBonus(s, ctx, m, targetHex);
    return true;
  }
  // battle back: the defender survives in place and the attacker is still there
  if (defender.blocks >= 1 && unitById(s, attackerId)) {
    const back = meleeDice(s, defender, attacker, { role: 'back', moved: 0 });
    ctx.emit({ t: 'combat', purpose: 'battleBack', attacker: defender.id, target: attackerId, dice: back });
    const bf = rollDice(s, back);
    const bs = scoreRoll(bf, 'melee', statsOf(s, defender), statsOf(s, attacker).arm);
    emitRoll(ctx, 'battleBack', bf, bs.scoring, defender.id, attackerId);
    yield* applyOutcome(s, ctx, attacker, { hits: bs.hits, flags: bs.flags, bounce: false }, defender, 'battle back');
  }
  return false;
}
