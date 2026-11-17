// Élan, Rally and Short Supply (RR §12.2, R53–R55).
import { emitRoll } from './casualties';
import { ask, type Gen } from './decisions';
import { relocate } from './movement';
import { updateHeld } from './objectives';
import { newOrderedPiece } from './orders';
import { unitById } from './query';
import { rollDice } from './rng';
import { canRally, shortSupplyHexes, shortSupplyTargets } from './tacticRules';
import type { FlowCtx, GameState, Side } from './types';

const orderAll = (s: GameState, ctx: FlowCtx, side: Side, ids: string[], cardMods: boolean): void => {
  for (const id of ids) s.turn.ordered[id] = newOrderedPiece(s, id, cardMods);
  if (ids.length) ctx.emit({ t: 'ordered', side, ids });
};

/** Élan: Command dice; each arm face orders a unit of that arm, a flag any piece; ordered pieces roll +1 (R53). */
export function* elanStep(s: GameState, ctx: FlowCtx, side: Side): Gen {
  const faces = rollDice(s, s.turn.command);
  emitRoll(ctx, 'elan', faces, faces.map((f) => f !== 'sabre'), null, null);
  if (faces.every((f) => f === 'sabre')) return;
  const a = (yield* ask(s, ctx, { kind: 'elan', side, faces })) as { ids: (string | null)[] };
  orderAll(s, ctx, side, a.ids.filter((id): id is string => id !== null), true);
}

/** Rally: Command dice; each arm face returns a block to an under-strength unit of that arm; those units are ordered (R54). */
export function* rallyStep(s: GameState, ctx: FlowCtx, side: Side): Gen {
  const faces = rollDice(s, s.turn.command);
  emitRoll(ctx, 'rally', faces, faces.map((f) => f !== 'sabre' && f !== 'flag'), null, null);
  if (!canRally(s, side, faces)) return;
  const a = (yield* ask(s, ctx, { kind: 'rally', side, faces })) as { ids: (string | null)[] };
  const gain = new Map<string, number>();
  for (const id of a.ids) if (id !== null) gain.set(id, (gain.get(id) ?? 0) + 1);
  for (const [id, n] of gain) {
    unitById(s, id)!.blocks += n;
    ctx.emit({ t: 'rallied', id, blocks: n });
  }
  orderAll(s, ctx, side, [...gain.keys()], false);
}

/** Short Supply: the player picks any unit; its owner lifts it to a free hex of its own baseline (R55). No unit is ordered. */
export function* shortSupplyStep(s: GameState, ctx: FlowCtx, side: Side): Gen {
  const targets = shortSupplyTargets(s, side);
  if (!targets.length) return;
  const t = (yield* ask(s, ctx, { kind: 'shortSupplyTarget', side, options: targets })) as { index: number };
  const unit = unitById(s, targets[t.index])!;
  const options = shortSupplyHexes(s, unit.id);
  if (!options.length) return;
  const h = (yield* ask(s, ctx, { kind: 'shortSupplyHex', side: unit.side, unit: unit.id, options })) as { hex: number };
  relocate(s, unit, h.hex);
  ctx.emit({ t: 'shortSupply', id: unit.id, hex: h.hex });
  updateHeld(s, ctx);
}
