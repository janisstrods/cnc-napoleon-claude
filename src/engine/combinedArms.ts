// Combined Arms (RR §9.6): artillery joining a melee. Skeleton: none, asks nothing (→ T10).
import type { Gen } from './decisions';
import type { FlowCtx, GameState, MeleeCtx } from './types';

// eslint-disable-next-line require-yield
export function* combinedArmsStep(_s: GameState, _ctx: FlowCtx, _m: MeleeCtx): Gen<string[]> {
  return [];
}
