// Guerrilla Action (RR §15.5, S15–S21, S45): the guerrilla side spends a counter against its opponent's card, and gains one
// with a Scout. A hook module called from `phases` (the card) and `flow` (the Draw phase).
import { emitRoll } from './casualties';
import { cardKind } from './cards';
import { ask, type Gen } from './decisions';
import { other } from './query';
import { rollDice } from './rng';
import { guerrillaHeld, guerrillaPool, guerrillaSide } from './scenarioRules';
import type { FlowCtx, GameState, Side } from './types';

/** Add `n` (±1) to the counters the guerrilla side holds; the pool is the rest of the box. */
function moveCounter(s: GameState, side: Side, n: 1 | -1): void {
  s.players[side].resources.guerrilla = guerrillaHeld(s) + n;
}

/**
 * Right after `active` played its card: the guerrilla side, if it is the other side and holds a counter, is asked once
 * whether to spend one (S17, S45). Yes: the counter goes to the pool and 1 die is rolled; a sabre lets the card stand
 * (S18), any other face cancels it (S19). Returns true when the card is cancelled.
 */
export function* guerrillaSpendStep(s: GameState, ctx: FlowCtx, active: Side): Gen<boolean> {
  const side = guerrillaSide(s);
  if (side !== other(active) || guerrillaHeld(s) < 1 || s.turn.card === null) return false;
  const a = yield* ask(s, ctx, {
    kind: 'guerrilla', side, mode: 'spend', card: s.turn.effective ?? cardKind(s.turn.card), held: guerrillaHeld(s), pool: guerrillaPool(s),
  });
  if (a.kind !== 'yesno' || !a.yes) return false;
  moveCounter(s, side, -1);
  const faces = rollDice(s, 1);
  const stood = faces[0] === 'sabre';
  emitRoll(ctx, 'guerrilla', faces, [stood], null, null);
  s.turn.guerrilla = stood ? 'stood' : 'cancelled';
  ctx.emit({ t: 'guerrilla', side, what: stood ? 'stood' : 'cancelled', held: guerrillaHeld(s), pool: guerrillaPool(s) });
  return !stood;
}

/**
 * The Draw phase of a Scout played by `side`: if it is the guerrilla side and the pool holds a counter, it is asked whether
 * to take one and draw one card instead of two (S20, S45). Returns true when it takes the counter.
 */
export function* guerrillaScoutStep(s: GameState, ctx: FlowCtx, side: Side): Gen<boolean> {
  if (guerrillaSide(s) !== side || guerrillaPool(s) < 1) return false;
  const a = yield* ask(s, ctx, { kind: 'guerrilla', side, mode: 'scout', card: s.turn.effective, held: guerrillaHeld(s), pool: guerrillaPool(s) });
  if (a.kind !== 'yesno' || !a.yes) return false;
  moveCounter(s, side, 1);
  ctx.emit({ t: 'guerrilla', side, what: 'gained', held: guerrillaHeld(s), pool: guerrillaPool(s) });
  return true;
}
