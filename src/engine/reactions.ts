// The defender's reaction to a melee (RR §9.2, §9.4, §9.5, §12.3): stand, Retire and Reform, form square, or play First Strike
// (one choice per melee, R77); the resolution of each lives here (Retire and Reform, First Strike) or in squares.ts (the square).
import { cardKind } from './cards';
import { emitRoll } from './casualties';
import { ask, type Gen } from './decisions';
import { artilleryShares } from './combinedArms';
import { meleeDice, scoreRoll, type Scored } from './dice';
import { relocate } from './movement';
import { updateHeld } from './objectives';
import { retireReformOptions } from './retreat';
import { rollDice } from './rng';
import { unitById } from './query';
import { applyOutcome } from './resolve';
import { canFormSquare, squareFirstApplies } from './squares';
import { statsOf } from './units';
import type { DefendChoice, FlowCtx, GameState, HexId, MeleeCtx, RollPurpose } from './types';

/**
 * The defender's choices (one per melee, R77): Retire and Reform for cavalry attacked by infantry (a square included) when it
 * has a path (R34); form square for infantry attacked by cavalry (R26); First Strike when its owner holds the card and the
 * melee is an attack or a bonus melee, never a battle back and never against a square that already fights first (R29, R63).
 */
export function defendOptions(s: GameState, m: MeleeCtx): DefendChoice[] {
  const options: DefendChoice[] = ['stand'];
  const target = unitById(s, m.target);
  const attacker = unitById(s, m.attacker);
  if (!target || !attacker) return options;
  if (statsOf(s, target).arm === 'cavalry' && statsOf(s, attacker).arm === 'infantry' && retireReformOptions(s, target).length > 0) {
    options.push('retireReform');
  }
  if (canFormSquare(s, target, attacker, m)) options.push('formSquare');
  if ((m.role === 'attack' || m.role === 'bonus') && !squareFirstApplies(s, m)
    && s.players[target.side].hand.some((c) => cardKind(c) === 'firstStrike')) options.push('firstStrike');
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
 * The attacking side's one roll of a melee (RR §9.6, R41): the melee unit's dice (counted now, for its current blocks) and
 * each joining gun's dice, rolled together as one `combat` event and one `roll` with `from[]`. Sabres score by the melee
 * unit's row; `retireReform` scores cavalry symbols only (R40). `from[]` lists the melee unit first, then the guns in
 * `m.artillery` order; `faces` are matching consecutive chunks of the melee unit's and each gun's dice. Returns the melee unit's own dice too.
 */
export function attackerStrike(s: GameState, ctx: FlowCtx, m: MeleeCtx, purpose: RollPurpose, kind: 'melee' | 'retireReform'): Scored & { own: number } {
  const attacker = unitById(s, m.attacker)!;
  const target = unitById(s, m.target)!;
  const own = meleeDice(s, attacker, target, { role: m.role, moved: s.turn.ordered[m.attacker]?.moved ?? 0, declared: true });
  const shares = artilleryShares(s, m);
  ctx.emit({ t: 'combat', purpose, attacker: m.attacker, target: m.target, dice: own, ...(shares.length ? { artillery: shares } : {}) });
  const faces = rollDice(s, shares.reduce((sum, g) => sum + g.dice, own));
  const sc = scoreRoll(faces, kind, statsOf(s, attacker), kind === 'retireReform' ? 'cavalry' : statsOf(s, target).arm);
  emitRoll(ctx, purpose, faces, sc.scoring, m.attacker, m.target, shares.length ? [m.attacker, ...shares.map((g) => g.id)] : undefined);
  return { ...sc, own };
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
  const sc = attackerStrike(s, ctx, m, 'retireReform', 'retireReform');
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

/**
 * First Strike (RR §12.3, R63): the card goes from the defender's hand to the discard (never `lastCard`, R56) and the defender
 * rolls its normal dice (terrain, no cards) at the melee unit. 'stop' when the attacker is eliminated or left its hex (its
 * dice and every joining gun's are lost); else 'continue', and the caller recounts the attacker's dice and skips the battle back.
 */
export function* firstStrikeRoll(s: GameState, ctx: FlowCtx, m: MeleeCtx): Gen<'continue' | 'stop'> {
  const def = unitById(s, m.target)!;
  const atk = unitById(s, m.attacker)!;
  const hand = s.players[def.side].hand;
  const card = hand.splice(hand.findIndex((c) => cardKind(c) === 'firstStrike'), 1)[0];
  s.discard.push(card);
  s.turn.firstStrikes[def.side]++;
  ctx.emit({ t: 'cardPlayed', side: def.side, card, kind: 'firstStrike', effective: null });
  const from = atk.hex;
  const dice = meleeDice(s, def, atk, { role: 'firstStrike', moved: 0 });
  ctx.emit({ t: 'combat', purpose: 'firstStrike', attacker: def.id, target: atk.id, dice });
  const faces = rollDice(s, dice);
  const sc = scoreRoll(faces, 'melee', statsOf(s, def), statsOf(s, atk).arm);
  emitRoll(ctx, 'firstStrike', faces, sc.scoring, def.id, atk.id);
  const applied = yield* applyOutcome(s, ctx, atk, { hits: sc.hits, flags: sc.flags, bounce: false }, def, 'first strike');
  if (s.winner || applied.eliminated || applied.left || !unitById(s, m.attacker) || atk.hex !== from) return 'stop';
  return 'continue';
}
