// Scenario side rules (RR §14) that change the core rules; stubs until T13.
import type { GameState, Unit } from './types';

/** Extra flags a unit may ignore by a scenario rule (006 fortress). Stub: 0 (→ T13). */
export function sideRuleFlagIgnores(_s: GameState, _u: Unit): number {
  return 0;
}

/** Is this cavalry unit impetuous (015)? Stub: false (→ T13). */
export function impetuous(_s: GameState, _u: Unit): boolean {
  return false;
}
