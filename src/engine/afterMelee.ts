// After a melee that vacated the target's hex: take ground, breakthrough, bonus melee (RR §9.7, §9.8). Skeleton: nothing (→ T7).
import type { Gen } from './decisions';
import type { FlowCtx, GameState, HexId, MeleeCtx } from './types';

/** Returns true when the attacker entered the vacated hex (a bonus melee is then allowed). */
// eslint-disable-next-line require-yield
export function* afterMelee(_s: GameState, _ctx: FlowCtx, _m: MeleeCtx, _vacated: HexId): Gen<boolean> {
  return false;
}
