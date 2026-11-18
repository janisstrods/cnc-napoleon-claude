// Scenario side rules (RR §14, §15) that change the core rules, read from `scenario.sideRules`.
import { randInt } from './rng';
import { terrainAt } from './terrain';
import type { FlowCtx, GameState, Side, SideRuleDef, Unit } from './types';

/** Extra flags a unit may ignore by a scenario rule: the sum of `flagIgnoreOn` rules of its side for the terrain it stands on (006, R84). */
export function sideRuleFlagIgnores(s: GameState, u: Unit): number {
  const t = terrainAt(s, u.hex);
  let n = 0;
  for (const r of s.scenario.sideRules) if (r.kind === 'flagIgnoreOn' && r.side === u.side && r.terrain === t) n += r.flags;
  return n;
}

/** Is this cavalry unit impetuous: an `impetuousCavalry` rule of its side lists its key (015, R82)? */
export function impetuous(s: GameState, u: Unit): boolean {
  return s.scenario.sideRules.some((r) => r.kind === 'impetuousCavalry' && r.side === u.side && r.keys.includes(u.key));
}

// Expansion #1 side rules (RR §15.5, §15.8): pure queries; the flow hooks that use them come with their tasks.

/** Guerrilla counters in the box: those the guerrilla side does not hold form the pool (S15). */
export const GUERRILLA_COUNTERS = 6;

type SideRuleOf<K extends SideRuleDef['kind']> = Extract<SideRuleDef, { kind: K }>;
const ruleOf = <K extends SideRuleDef['kind']>(s: GameState, kind: K, side: Side): SideRuleOf<K> | undefined =>
  s.scenario.sideRules.find((r): r is SideRuleOf<K> => r.kind === kind && r.side === side);

/** The side that holds Guerrilla counters (the guerrilla side), or null when the battle has no Guerrilla Action. */
export function guerrillaSide(s: GameState): Side | null {
  return s.scenario.sideRules.find((r) => r.kind === 'guerrilla')?.side ?? null;
}

/** Counters the guerrilla side holds now (0 without the rule). */
export function guerrillaHeld(s: GameState): number {
  const side = guerrillaSide(s);
  return side === null ? 0 : (s.players[side].resources.guerrilla ?? 0);
}

/** Counters in the pool beside the deck: the box's six less those held (0 without the rule). */
export function guerrillaPool(s: GameState): number {
  return guerrillaSide(s) === null ? 0 : GUERRILLA_COUNTERS - guerrillaHeld(s);
}

/** A `squareCap` rule of the unit's side has as many units on its record and this unit is not one of them (S34). */
export function squareCapReached(s: GameState, u: Unit): boolean {
  const r = ruleOf(s, 'squareCap', u.side);
  if (!r) return false;
  const squared = s.special.squared[u.side];
  return !squared.includes(u.id) && squared.length >= r.units;
}

/**
 * Is a `cavalryChargeFolly` rule of `defender` in force: it is the enemy's turn, whose effective card is Cavalry Charge, and a
 * Guerrilla counter has not cancelled it (S37)?
 */
export function follyActive(s: GameState, defender: Side): boolean {
  return !!ruleOf(s, 'cavalryChargeFolly', defender) && s.active !== defender && s.turn.effective === 'cavalryCharge'
    && s.turn.guerrilla !== 'cancelled';
}

/** The `handShrink` rule of `side`, if any (S33). */
export function handShrinkRule(s: GameState, side: Side): SideRuleOf<'handShrink'> | undefined {
  return ruleOf(s, 'handShrink', side);
}

/** The `breakOnLosses` rule of `side`, if any (S30). */
export function breakRule(s: GameState, side: Side): SideRuleOf<'breakOnLosses'> | undefined {
  return ruleOf(s, 'breakOnLosses', side);
}

/** Take one random held card of `side` to the discard, face up (S33, S46). False when no card is held. */
function takeRandomCard(s: GameState, ctx: FlowCtx, side: Side): boolean {
  const hand = s.players[side].hand;
  if (hand.length === 0) return false;
  const card = hand.splice(randInt(s, hand.length), 1)[0];
  s.discard.push(card);
  ctx.emit({ t: 'discarded', side, card });
  return true;
}

/**
 * The enemy of `loser` gained `n` permanent banners: while a `handShrink` rule of `loser` has its hand size above the floor,
 * the size falls by 1 and one random held card is discarded (S33). With no card held the card is taken after the next draw
 * (`settleHand`, S46).
 */
export function shrinkHand(s: GameState, ctx: FlowCtx, loser: Side, n: number): void {
  const r = handShrinkRule(s, loser);
  if (!r) return;
  for (let i = 0; i < n && s.special.handSize[loser] > r.floor; i++) {
    s.special.handSize[loser]--;
    takeRandomCard(s, ctx, loser);
  }
}

/** After a side's draw: cards held and on the track above the hand size are taken at random (the deferred S46 take). */
export function settleHand(s: GameState, ctx: FlowCtx, side: Side): void {
  if (!handShrinkRule(s, side)) return;
  const p = s.players[side];
  while (p.hand.length + p.squareTrack.filter((c) => c !== null).length > s.special.handSize[side]) {
    if (!takeRandomCard(s, ctx, side)) break;
  }
}
