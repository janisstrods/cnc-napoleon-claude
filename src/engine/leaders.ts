// Leaders in combat (RR §11). Skeleton: no casualty check; a leader whose unit is lost is killed; lone leaders are never
// melee targets yet (→ T6b).
import type { Gen } from './decisions';
import { killLeader } from './casualties';
import type { FlowCtx, GameState, Leader, MeleeCtx, Unit } from './types';

/** The casualty check after a unit lost blocks or was eliminated. Skeleton: none (false: nobody killed). */
// eslint-disable-next-line require-yield
export function* leaderCasualtyCheck(_s: GameState, _ctx: FlowCtx, _u: Unit, _eliminated: boolean): Gen<boolean> {
  return false;
}

/** The leader of an eliminated unit. Skeleton: killed. */
// eslint-disable-next-line require-yield
export function* leaderLosesUnit(s: GameState, ctx: FlowCtx, l: Leader): Gen {
  killLeader(s, ctx, l, 'his unit was lost');
}

/** Melee against a lone leader. Skeleton: nothing happens (false: not vacated). */
// eslint-disable-next-line require-yield
export function* loneLeaderMelee(_s: GameState, _ctx: FlowCtx, _attacker: Unit, _l: Leader, _m: MeleeCtx): Gen<boolean> {
  return false;
}
