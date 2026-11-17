// The defender's reaction to a melee (RR §9.2, §9.4, §9.5, §12.3). Skeleton: the defender only stands (→ T8, T9, T12c).
import { ask, type Gen } from './decisions';
import { unitById } from './query';
import type { DefendChoice, FlowCtx, GameState, HexId, MeleeCtx } from './types';

export function defendOptions(_s: GameState, _m: MeleeCtx): DefendChoice[] {
  return ['stand'];
}

/** Ask the defender how to react (only when there is more than one option). */
export function* defenderReaction(s: GameState, ctx: FlowCtx, m: MeleeCtx): Gen<DefendChoice> {
  const options = defendOptions(s, m);
  if (options.length <= 1) return options[0];
  const target = unitById(s, m.target)!;
  const a = yield* ask(s, ctx, { kind: 'defend', side: target.side, attacker: m.attacker, target: m.target, options, bonus: m.role === 'bonus' });
  return (a as { choice: DefendChoice }).choice;
}

/** Retire and Reform; the hex vacated, or null. Skeleton: unreachable. */
// eslint-disable-next-line require-yield
export function* resolveRetireReform(_s: GameState, _ctx: FlowCtx, _m: MeleeCtx): Gen<HexId | null> {
  throw new Error('not implemented');
}

// eslint-disable-next-line require-yield
export function* firstStrikeRoll(_s: GameState, _ctx: FlowCtx, _m: MeleeCtx): Gen<'continue' | 'stop'> {
  return 'continue';
}
