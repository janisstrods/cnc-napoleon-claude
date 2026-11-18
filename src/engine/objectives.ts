// Objectives (RR §13.3, §13.4). Temporary hexes and groups, exits and kill weights, all read from the scenario's data.
import { checkVictory, bannerTotal, gainBanner } from './banners';
import { rowOf } from './hex';
import { attachedLeader, other, pieceById, unitAt } from './query';
import { statsOf } from './units';
import type { FlowCtx, GameState, HexId, Leader, ObjectiveDef, ObjectiveOf, Side, Unit } from './types';

type HeldKind = 'tempHex' | 'tempGroup' | 'tempAny' | 'majority';
const isHeldKind = (o: ObjectiveDef): o is ObjectiveOf<HeldKind> =>
  o.kind === 'tempHex' || o.kind === 'tempGroup' || o.kind === 'tempAny' || o.kind === 'majority';

const hexesOf = (o: ObjectiveOf<HeldKind>): readonly HexId[] => (o.kind === 'tempHex' ? [o.hex] : o.hexes);

/** Does a unit of `side` (never a lone leader, R65) stand on every hex of the objective? */
function occupied(s: GameState, side: Side, hexes: readonly HexId[]): boolean {
  return hexes.every((h) => unitAt(s, h)?.side === side);
}

/** How many of `hexes` a unit of `side` stands on (units only, R65). */
const unitsOn = (s: GameState, side: Side, hexes: readonly HexId[]): number => hexes.filter((h) => unitAt(s, h)?.side === side).length;

/** The ids of the units of `side` standing on any of `hexes`. */
const unitsAmong = (s: GameState, side: Side, hexes: readonly HexId[]): string[] =>
  hexes.flatMap((h) => { const u = unitAt(s, h); return u && u.side === side ? [u.id] : []; });

const heldCount = (s: GameState, side: Side): number =>
  s.scenario.objectives.filter((o, i) => o.side === side && isHeldKind(o) && s.special.objState[i]?.held).length;

/** Is the objective in the condition for its side to hold it right now (before the turn-start rule for a new gain)? */
function standing(s: GameState, o: ObjectiveOf<HeldKind>, holders: readonly string[] | undefined): boolean {
  const hexes = hexesOf(o);
  switch (o.kind) {
    case 'tempAny': return (holders ?? []).some((id) => { const u = s.units.find((x) => x.id === id); return !!u && u.side === o.side && hexes.includes(u.hex); });
    case 'majority': return unitsOn(s, o.side, hexes) > unitsOn(s, other(o.side), hexes);
    default: return occupied(s, o.side, hexes);
  }
}

/** At the start of `side`'s turn it takes the temporary objectives it now holds (RR §13.3, §15.8, R66), then the victory check. */
export function turnStartObjectives(s: GameState, ctx: FlowCtx, side: Side): void {
  s.scenario.objectives.forEach((o, i) => {
    if (o.side !== side || !isHeldKind(o)) return;
    const st = s.special.objState[i];
    if (!st) return;
    if (st.held) {
      if (o.kind === 'tempAny') st.holders = unitsAmong(s, side, hexesOf(o));   // kept: the units there now replace the old holders (S35)
      return;
    }
    if (o.kind === 'tempAny') {
      const holders = unitsAmong(s, side, hexesOf(o));   // only the units standing there now are holders (S35)
      if (holders.length === 0) return;
      st.holders = holders;
    } else if (!standing(s, o, undefined)) return;
    st.held = true;
    ctx.emit({ t: 'held', side, held: heldCount(s, side), total: bannerTotal(s, side), reason: o.text });
  });
  checkVictory(s, ctx, side);
}

/** A held temporary objective that no longer stands (hex or group emptied of its side, last holder gone, majority gone) is lost at once (R66, S35, S36). */
export function updateHeld(s: GameState, ctx: FlowCtx): void {
  s.scenario.objectives.forEach((o, i) => {
    if (!isHeldKind(o)) return;
    const st = s.special.objState[i];
    if (!st?.held) return;
    if (o.kind === 'tempAny') st.holders = (st.holders ?? []).filter((id) => standing(s, o, [id]));
    if (standing(s, o, st.holders)) return;
    st.held = false;
    ctx.emit({ t: 'held', side: o.side, held: heldCount(s, o.side), total: bannerTotal(s, o.side), reason: `${o.text} (lost)` });
  });
}

/** May this piece step off the board from `hex`? An exit objective of its side lies there (RR §13.4, R67). */
export function exitAllowedFrom(s: GameState, piece: Unit | Leader, hex: HexId): boolean {
  return s.scenario.objectives.some((o) => exitAt(o, piece.side, hex));
}

/** An exit objective of `side` that covers `hex`: its one hex, or any hex of an edge row (S31). */
const exitAt = (o: ObjectiveDef, side: Side, hex: HexId): boolean =>
  o.side === side && ((o.kind === 'exit' && o.hex === hex) || (o.kind === 'exitEdge' && rowOf(hex) === o.row));

/** A piece (and a unit's attached leader) steps off the board: `removed` events and, for a unit, the exit's permanent banners (R67). */
export function exitPiece(s: GameState, ctx: FlowCtx, pieceId: string): void {
  const p = pieceById(s, pieceId);
  if (!p) return;
  const exitIdx = s.scenario.objectives.findIndex((o) => exitAt(o, p.side, p.hex));
  const exit = s.scenario.objectives[exitIdx];
  if (exitIdx < 0) throw new Error(`piece ${pieceId} exits from hex ${p.hex}, which is no exit of the ${p.side} side`);
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
  // an edge exit counts units only (leaders exit for nothing); the units after the first `free` score (S31)
  if (exit.kind === 'exitEdge' && isUnit && ++s.special.objState[exitIdx].count > exit.free) gainBanner(s, ctx, p.side, exit.banners, exit.text.replace('{unit}', pieceId));
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
  gainBanner(s, ctx, side, n, 'unit eliminated');   // the ordinary kill banner first (R64)
  s.scenario.objectives.forEach((o, i) => {
    if (o.kind !== 'suddenDeath' || o.side !== side || !o.keys.includes(u.key)) return;
    const st = s.special.objState[i];
    st.count++;
    if (st.count < o.need || s.winner) return;
    s.winner = side;
    s.winReason = o.text;
    ctx.emit({ t: 'victory', winner: side, reason: o.text });
  });
}

/** A leader was killed: his enemy scores a banner. */
export function scoreLeaderKill(s: GameState, ctx: FlowCtx, l: Leader): void {
  gainBanner(s, ctx, other(l.side), 1, 'leader killed');
}
