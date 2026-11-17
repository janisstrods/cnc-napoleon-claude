// Scenario side rules (RR §14) that change the core rules, read from `scenario.sideRules`.
import { terrainAt } from './terrain';
import type { GameState, Unit } from './types';

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
