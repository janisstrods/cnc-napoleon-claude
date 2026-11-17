// Élan, Rally and Short Supply (RR §12.2). Skeleton: Élan and Rally ask for 0-1 piece to order; Short Supply does nothing
// (→ T12b).
import { ask, type Gen } from './decisions';
import { newOrderedPiece } from './orders';
import type { CardKind, FlowCtx, GameState, Side } from './types';

function* orderOne(s: GameState, ctx: FlowCtx, side: Side, card: CardKind): Gen {
  const a = yield* ask(s, ctx, { kind: 'orders', side, card, mirrored: false, single: false });
  const ids = (a as { pieces: string[] }).pieces;
  for (const id of ids) s.turn.ordered[id] = newOrderedPiece(s, id, true);
  ctx.emit({ t: 'ordered', side, ids });
}

export function* elanStep(s: GameState, ctx: FlowCtx, side: Side): Gen {
  yield* orderOne(s, ctx, side, 'elan');
}

export function* rallyStep(s: GameState, ctx: FlowCtx, side: Side): Gen {
  yield* orderOne(s, ctx, side, 'rally');
}

// eslint-disable-next-line require-yield
export function* shortSupplyStep(_s: GameState, _ctx: FlowCtx, _side: Side): Gen {}
