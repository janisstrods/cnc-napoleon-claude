// Objectives (RR §13.3, §13.4). Temporary hexes and groups, exits and kill weights, all read from the scenario's data.
import { checkVictory, bannerTotal, gainBanner } from './banners';
import { attachedLeader, other, pieceById, unitAt } from './query';
import { statsOf } from './units';
import type { FlowCtx, GameState, HexId, Leader, ObjectiveOf, Side, Unit } from './types';

const hexesOf = (o: ObjectiveOf<'tempHex' | 'tempGroup'>): readonly HexId[] => (o.kind === 'tempGroup' ? o.hexes : [o.hex]);

/** Does a unit of `side` (never a lone leader, R65) stand on every hex of the objective? */
function occupied(s: GameState, side: Side, hexes: readonly HexId[]): boolean {
  return hexes.every((h) => unitAt(s, h)?.side === side);
}

const heldCount = (s: GameState, side: Side): number =>
  s.scenario.objectives.filter((o, i) => o.side === side && (o.kind === 'tempHex' || o.kind === 'tempGroup') && s.special.objState[i]?.held).length;

/** At the start of `side`'s turn it takes the temporary objectives it now occupies (RR §13.3, R66), then the victory check. */
export function turnStartObjectives(s: GameState, ctx: FlowCtx, side: Side): void {
  s.scenario.objectives.forEach((o, i) => {
    if (o.side !== side || (o.kind !== 'tempHex' && o.kind !== 'tempGroup')) return;
    const st = s.special.objState[i];
    if (!st || st.held || !occupied(s, side, hexesOf(o))) return;
    st.held = true;
    ctx.emit({ t: 'held', side, held: heldCount(s, side), total: bannerTotal(s, side), reason: o.text });
  });
  checkVictory(s, ctx, side);
}

/** A held temporary objective whose hex (any hex of its group) no longer holds a unit of its side is lost at once (R66). */
export function updateHeld(s: GameState, ctx: FlowCtx): void {
  s.scenario.objectives.forEach((o, i) => {
    if (o.kind !== 'tempHex' && o.kind !== 'tempGroup') return;
    const st = s.special.objState[i];
    if (!st?.held || occupied(s, o.side, hexesOf(o))) return;
    st.held = false;
    ctx.emit({ t: 'held', side: o.side, held: heldCount(s, o.side), total: bannerTotal(s, o.side), reason: `${o.text} (lost)` });
  });
}

/** May this piece step off the board from `hex`? An exit objective of its side lies there (RR §13.4, R67). */
export function exitAllowedFrom(s: GameState, piece: Unit | Leader, hex: HexId): boolean {
  return s.scenario.objectives.some((o) => o.kind === 'exit' && o.side === piece.side && o.hex === hex);
}

/** A piece (and a unit's attached leader) steps off the board: `removed` events and, for a unit, the exit's permanent banners (R67). */
export function exitPiece(s: GameState, ctx: FlowCtx, pieceId: string): void {
  const p = pieceById(s, pieceId);
  if (!p) return;
  const exit = s.scenario.objectives.find((o) => o.kind === 'exit' && o.side === p.side && o.hex === p.hex);
  if (!exit) throw new Error(`piece ${pieceId} exits from hex ${p.hex}, which is no exit of the ${p.side} side`);
  const ids = [pieceId];
  const isUnit = 'key' in p;
  if (isUnit) {
    const l = attachedLeader(s, p);
    if (l) ids.push(l.id);
  }
  for (const id of ids) {
    s.units = s.units.filter((x) => x.id !== id);
    s.leaders = s.leaders.filter((x) => x.id !== id);
    delete s.turn.ordered[id];
    ctx.emit({ t: 'removed', id, reason: 'exit' });
  }
  updateHeld(s, ctx);
  if (exit.kind === 'exit' && (isUnit || exit.leadersScore)) gainBanner(s, ctx, p.side, exit.banners, exit.text.replace('{unit}', pieceId));
}

/** An enemy unit was eliminated: its enemy scores 1, or the weight of a matching `killWeight` objective (R65, R64). */
export function scoreKill(s: GameState, ctx: FlowCtx, u: Unit): void {
  const side = other(u.side);
  updateHeld(s, ctx);   // one event is applied in full before the victory check ([Interp R64])
  const arm = statsOf(s, u).arm;
  let n = 1;
  s.scenario.objectives.forEach((o, i) => {
    if (o.kind !== 'killWeight' || o.side !== side || o.enemyArm !== arm) return;
    const st = s.special.objState[i];
    n = st.count === 0 ? o.first : o.later;
    st.count++;
  });
  gainBanner(s, ctx, side, n, 'unit eliminated');
}

/** A leader was killed: his enemy scores a banner. */
export function scoreLeaderKill(s: GameState, ctx: FlowCtx, l: Leader): void {
  gainBanner(s, ctx, other(l.side), 1, 'leader killed');
}
