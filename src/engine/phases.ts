// The card, movement and battle phases of a turn (RR §5.2, §6-§9).
import { CARD_DEFS, NO_MODS, cardKind, effectiveCard } from './cards';
import { ask, type Gen } from './decisions';
import { fireAttack } from './fire';
import { meleeAttack } from './melee';
import { applyMove } from './movement';
import { battleReady, movablePieces, type Found } from './options';
import { autoOrders, eligiblePieces, fallbackActive, newOrderedPiece } from './orders';
import { unitById } from './query';
import { leaveSquareStep } from './squares';
import { elanStep, rallyStep, shortSupplyStep } from './tactics';
import type { FlowCtx, GameState, Side } from './types';

/** The card of the active side's turn: it is played and gives its orders. */
export function* cardStep(s: GameState, ctx: FlowCtx, side: Side): Gen {
  const t = s.turn;
  const pa = yield* ask(s, ctx, { kind: 'playCard', side });
  const cardId = (pa as { card: number }).card;
  const hand = s.players[side].hand;
  hand.splice(hand.indexOf(cardId), 1);
  t.card = cardId;
  t.command = hand.length + 1;
  const { kind: effective, mirrored } = effectiveCard(s, side, cardId);
  const def = effective ? CARD_DEFS[effective] : null;
  t.effective = effective;
  t.mirrored = mirrored;
  t.mods = def ? { ...def.mods } : { ...NO_MODS };
  t.scout = def?.draw === 'scout';
  t.reshuffle = def?.draw === 'reshuffle';
  ctx.emit({ t: 'cardPlayed', side, card: cardId, kind: cardKind(cardId), effective });
  t.phase = 'orders';
  if (!effective || !def) return;
  const kind = def.select.kind;
  if (kind === 'dice') {
    yield* (def.select.roll === 'elan' ? elanStep : rallyStep)(s, ctx, side);
  } else if (kind === 'shortSupply') {
    yield* shortSupplyStep(s, ctx, side);
    return;
  } else if (kind === 'none' || kind === 'copy') {
    return;
  } else {
    let ids = autoOrders(s, side, effective);
    let single = false;
    // a card that can order nothing skips the orders and phases 2-4 (RR §5.2 step 1)
    if (ids === null && eligiblePieces(s, side, effective).length === 0) return;
    if (ids === null) {
      const a = (yield* ask(s, ctx, { kind: 'orders', side, card: effective, mirrored, single: effective === 'grandManoeuvre' })) as { pieces: string[]; single?: boolean };
      ids = a.pieces;
      single = !!a.single;
    }
    const cardMods = !fallbackActive(s, side, effective) && !single;
    for (const id of ids) t.ordered[id] = newOrderedPiece(s, id, cardMods);
    ctx.emit({ t: 'ordered', side, ids });
  }
  if (s.winner) return;
  yield* leaveSquareStep(s, ctx, side);
}

export function* movePhase(s: GameState, ctx: FlowCtx): Gen {
  for (;;) {
    if (s.winner || movablePieces(s).length === 0) return;
    const found: Found = {};
    const a = yield* ask(s, ctx, { kind: 'move', side: s.active }, found);
    if (a.kind === 'endMove') return;
    if (a.kind === 'move') applyMove(s, ctx, a.piece, found.move!);
  }
}

export function* battlePhase(s: GameState, ctx: FlowCtx): Gen {
  while (!s.winner && battleReady(s).length > 0) {
    const found: Found = {};
    const a = yield* ask(s, ctx, { kind: 'battle', side: s.active }, found);
    if (a.kind === 'endBattle') return;
    if (a.kind !== 'attack') continue;
    if (found.target!.kind === 'fire') yield* fireAttack(s, ctx, unitById(s, a.unit)!, a.target);
    else yield* meleeAttack(s, ctx, a.unit, a.target, 'attack');
  }
}
