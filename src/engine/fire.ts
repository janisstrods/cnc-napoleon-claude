// Fire (RR §8.2): no battle back, no Retire and Reform, no taking ground.
import { emitRoll } from './casualties';
import type { Gen } from './decisions';
import { fireDice, scoreRoll } from './dice';
import { unitAt } from './query';
import { rollDice } from './rng';
import { applyOutcome } from './resolve';
import { statsOf } from './units';
import type { FlowCtx, GameState, HexId, Unit } from './types';

export function* fireAttack(s: GameState, ctx: FlowCtx, firer: Unit, targetHex: HexId): Gen {
  const target = unitAt(s, targetHex)!;
  const op = s.turn.ordered[firer.id];
  op.battled = true;
  const dice = fireDice(s, firer, targetHex, { role: 'attack', moved: op.moved });
  ctx.emit({ t: 'combat', purpose: 'fire', attacker: firer.id, target: target.id, dice });
  const faces = rollDice(s, dice);
  const fst = statsOf(s, firer);
  const tst = statsOf(s, target);
  const sc = scoreRoll(faces, 'fire', fst, tst.arm);
  emitRoll(ctx, 'fire', faces, sc.scoring, firer.id, target.id);
  const ignore = fst.arm === 'infantry' ? tst.ignoresInfantryFireHits : 0;
  yield* applyOutcome(s, ctx, target, { hits: Math.max(0, sc.hits - ignore), flags: sc.flags, bounce: false }, firer, 'fire');
}
