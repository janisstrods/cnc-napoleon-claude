// Turn flow as a generator: yields Decisions, receives Answers (RR §5.2). The flow's modules, each importing only those
// before it, are listed in the layering of the plan; this one holds the turn, the draw phase and the game loop.
import { drawCard, takeCard } from './cards';
import { ask } from './decisions';
import { guerrillaScoutStep } from './guerrilla';
import { turnStartObjectives } from './objectives';
import { battlePhase, cardStep, movePhase } from './phases';
import { other } from './query';
import { shuffle } from './rng';
import { newTurn } from './setup';
import type { Gen } from './decisions';
import { SIDES, type FlowCtx, type GameState } from './types';

/**
 * The draw phase, a generator: call with `yield*` (RR §5.2 step 5, §12.4): the played card to the discard; an Élan (turn.reshuffle) shuffles discard and
 * deck together (R53); each other side draws one replacement per First Strike it played (R78); then the active side draws
 * 1, or with a Scout draws 2, keeps 1 and discards the other face up (R51), unless the guerrilla side takes a counter
 * and draws 1 instead (RR §15.5, S20). Card ids appear only in `discarded`.
 */
export function* drawPhase(s: GameState, ctx: FlowCtx): Gen {
  const t = s.turn;
  const side = s.active;
  t.phase = 'draw';
  if (t.card !== null) {
    s.discard.push(t.card);
    t.card = null;
  }
  if (t.reshuffle) {
    s.deck = shuffle(s, [...s.deck, ...s.discard]);
    s.discard = [];
    ctx.emit({ t: 'reshuffle' });
  }
  for (const o of SIDES) {
    if (o === side) continue;
    for (let i = 0; i < t.firstStrikes[o]; i++) drawCard(s, ctx, o);
  }
  // a Scout of the guerrilla side may take a counter and one card instead of the two-and-keep-one draw (S20)
  if (!t.scout || (yield* guerrillaScoutStep(s, ctx, side))) {
    drawCard(s, ctx, side);
    return;
  }
  const a = takeCard(s, ctx);
  const b = a === null ? null : takeCard(s, ctx);
  if (a === null) return;
  const hand = s.players[side].hand;
  if (b === null) {
    hand.push(a);
    ctx.emit({ t: 'draw', side });
    return;
  }
  // both cards sit in the hand while the choice is open, so every card stays accounted for
  hand.push(a, b);
  ctx.emit({ t: 'scoutDrew', side });
  const ans = (yield* ask(s, ctx, { kind: 'scoutKeep', side, cards: [a, b] })) as { index: number };
  const drop = ans.index === 0 ? b : a;
  hand.splice(hand.indexOf(drop), 1);
  s.discard.push(drop);
  ctx.emit({ t: 'discarded', side, card: drop });
}

function* battleToEnd(s: GameState, ctx: FlowCtx): Gen {
  const t = s.turn;
  t.phase = 'battle';
  yield* battlePhase(s, ctx);
  if (s.winner) return;
  yield* drawPhase(s, ctx);
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
