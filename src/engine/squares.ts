// Infantry squares (RR §9.5). Skeleton: no squares form (→ T9).
import type { Gen } from './decisions';
import type { FlowCtx, GameState, MeleeCtx, Side, Unit } from './types';

export const SQUARE_TRACK = 4;
export const SQUARE_MIN_HAND = 3;

export function canFormSquare(_s: GameState, _target: Unit, _attacker: Unit, _m: MeleeCtx): boolean {
  return false;
}

export function formSquare(_s: GameState, _ctx: FlowCtx, _u: Unit): void {}

// eslint-disable-next-line require-yield
export function* leaveSquareStep(_s: GameState, _ctx: FlowCtx, _side: Side): Gen {}

// eslint-disable-next-line require-yield
export function* squareFightsFirst(_s: GameState, _ctx: FlowCtx, _m: MeleeCtx): Gen<'continue' | 'stop'> {
  return 'continue';
}
