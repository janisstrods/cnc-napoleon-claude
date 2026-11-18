// The defender's reaction to a melee (RR §9.2, §9.4, §9.5, §12.3). Skeleton: the defender only stands (→ T8, T9, T12c).
import { emitRoll } from './casualties';
import { ask, type Gen } from './decisions';
import { meleeDice, scoreRoll } from './dice';
import { relocate } from './movement';
import { updateHeld } from './objectives';
import { retireReformOptions } from './retreat';
import { rollDice } from './rng';
import { unitById } from './query';
import { applyOutcome } from './resolve';
import { canFormSquare } from './squares';
import { statsOf } from './units';
import type { DefendChoice, FlowCtx, GameState, HexId, MeleeCtx } from './types';

/** The defender's choices: Retire and Reform for cavalry attacked by infantry (a square included) when it has a path (R34). */
export function defendOptions(s: GameState, m: MeleeCtx): DefendChoice[] {
  const options: DefendChoice[] = ['stand'];
  const target = unitById(s, m.target);
  const attacker = unitById(s, m.attacker);
  if (!target || !attacker) return options;
  if (statsOf(s, target).arm === 'cavalry' && statsOf(s, attacker).arm === 'infantry' && retireReformOptions(s, target).length > 0) {
    options.push('retireReform');
  }
  if (canFormSquare(s, target, attacker, m)) options.push('formSquare');
  return options;
}

/** Ask the defender how to react (only when there is more than one option). */
export function* defenderReaction(s: GameState, ctx: FlowCtx, m: MeleeCtx): Gen<DefendChoice> {
  const options = defendOptions(s, m);
  if (options.length <= 1) return options[0];
  const target = unitById(s, m.target)!;
  const a = yield* ask(s, ctx, { kind: 'defend', side: target.side, attacker: m.attacker, target: m.target, options, bonus: m.role === 'bonus' });
  return (a as { choice: DefendChoice }).choice;
}

/**
 * Retire and Reform (RR §9.4, R34): the attacker rolls all its dice, only cavalry symbols hit (no flags, no Cuirassier
 * ignore); a hit triggers the leader check; a surviving cavalry unit then retires 2 hexes and does not battle back.
 * Returns the cavalry's old hex (vacated either way), or null if it could not move.
 */
export function* resolveRetireReform(s: GameState, ctx: FlowCtx, m: MeleeCtx): Gen<HexId | null> {
  const attacker = unitById(s, m.attacker)!;
  const target = unitById(s, m.target)!;
  const from = target.hex;
  const op = s.turn.ordered[m.attacker];
  const dice = meleeDice(s, attacker, target, { role: m.role, moved: op?.moved ?? 0, declared: true });
  ctx.emit({ t: 'combat', purpose: 'retireReform', attacker: m.attacker, target: m.target, dice });
  const faces = rollDice(s, dice);
  const sc = scoreRoll(faces, 'retireReform', statsOf(s, attacker), 'cavalry');
  emitRoll(ctx, 'retireReform', faces, sc.scoring, m.attacker, m.target);
  const applied = yield* applyOutcome(s, ctx, target, { hits: sc.hits, flags: 0, bounce: false }, attacker, 'retire and reform');
  if (s.winner) return null;
  if (applied.eliminated) return from;
  const options = retireReformOptions(s, target);
  if (!options.length) return null;
  let pick = options[0];
  if (options.length > 1) {
    const a = yield* ask(s, ctx, { kind: 'retreat', side: target.side, unit: target.id, options, reason: 'retireReform' });
    pick = options[(a as { index: number }).index];
  }
  relocate(s, target, pick.end);
  ctx.emit({ t: 'retire', id: target.id, path: [from, ...pick.path] });
  if (pick.attach) ctx.emit({ t: 'attach', leader: pick.attach, unit: target.id });
  if (target.side !== s.active) s.turn.retreatEnds.push(pick.end);
  updateHeld(s, ctx);
  return from;
}

// eslint-disable-next-line require-yield
export function* firstStrikeRoll(_s: GameState, _ctx: FlowCtx, _m: MeleeCtx): Gen<'continue' | 'stop'> {
  return 'continue';
}
