// Scenario side rules (RR §14, §15) that change the core rules, read from `scenario.sideRules`.
import { terrainAt } from './terrain';
import type { GameState, Side, SideRuleDef, Unit } from './types';

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
