// Turn flow as a generator: yields Decisions, receives Answers (RR §5.2). The flow's modules, each importing only those
// before it, are listed in the layering of the plan; this one holds the turn, the draw phase and the game loop.
import { drawCard } from './cards';
import { turnStartObjectives } from './objectives';
import { battlePhase, cardStep, movePhase } from './phases';
import { other } from './query';
import { newTurn } from './setup';
import type { Gen } from './decisions';
import type { FlowCtx, GameState } from './types';

/** The draw phase: the played card to the discard, then the active side draws. Skeleton: one card (→ T11). */
export function drawPhase(s: GameState, ctx: FlowCtx): void {
  const t = s.turn;
  t.phase = 'draw';
  if (t.card !== null) {
    s.discard.push(t.card);
    t.card = null;
  }
  drawCard(s, ctx, s.active);
}

function* battleToEnd(s: GameState, ctx: FlowCtx): Gen {
  const t = s.turn;
  t.phase = 'battle';
  yield* battlePhase(s, ctx);
  if (s.winner) return;
  drawPhase(s, ctx);
  s.lastCard[s.active] = t.effective;
  s.special.turnsDone[s.active]++;
  t.phase = 'done';
}

export function* turnFlow(s: GameState, ctx: FlowCtx): Gen {
  const side = s.active;
  const t = s.turn;
  ctx.emit({ t: 'turnStart', side, turn: t.number });
  t.phase = 'card';
  turnStartObjectives(s, ctx, side);
  if (s.winner) return;
  yield* cardStep(s, ctx, side);
  if (s.winner) return;
  if (Object.keys(t.ordered).length) {
    t.phase = 'move';
    yield* movePhase(s, ctx);
    if (s.winner) return;
  }
  yield* battleToEnd(s, ctx);
}

/**
 * Continue the active side's turn, already in its movement (`from` 'move') or battle phase, exactly as `turnFlow` would
 * go on. For searches on a copied state (a running generator cannot be copied).
 */
export function* continueTurn(s: GameState, ctx: FlowCtx, from: 'move' | 'battle'): Gen {
  if (from === 'move' && Object.keys(s.turn.ordered).length) {
    s.turn.phase = 'move';
    yield* movePhase(s, ctx);
    if (s.winner) return;
  }
  yield* battleToEnd(s, ctx);
}

/** Advance to the next player's turn (call after turnFlow completes without a winner). */
export function nextTurn(s: GameState): void {
  s.active = other(s.active);
  s.turn = newTurn(s.turn.number + 1);
}

export function* gameFlow(s: GameState, ctx: FlowCtx): Gen {
  while (!s.winner) {
    if (s.turn.phase === 'done') nextTurn(s);
    yield* turnFlow(s, ctx);
  }
}
