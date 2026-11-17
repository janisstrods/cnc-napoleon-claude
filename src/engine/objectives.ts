// Objectives (RR §13.3, §13.4). Skeleton: no temporary objectives, no exits; kills score a banner (→ T13).
import { gainBanner } from './banners';
import { attachedLeader, other, pieceById } from './query';
import type { FlowCtx, GameState, HexId, Leader, Side, Unit } from './types';

/** Banners decided at the start of `side`'s turn. Stub: nothing (→ T13). */
export function turnStartObjectives(_s: GameState, _ctx: FlowCtx, _side: Side): void {}

/** Bring the held objectives up to date after a piece moved or was lost. Stub: nothing (→ T13). */
export function updateHeld(_s: GameState, _ctx: FlowCtx): void {}

/** May this piece step off the board from `hex`? Stub: false (→ T13). */
export function exitAllowedFrom(_s: GameState, _piece: Unit | Leader, _hex: HexId): boolean {
  return false;
}

/** A piece (and a unit's attached leader) steps off the board: a `removed` event and no banner (T13 adds banners). */
export function exitPiece(s: GameState, ctx: FlowCtx, pieceId: string): void {
  const p = pieceById(s, pieceId);
  if (!p) return;
  const ids = [pieceId];
  if ('key' in p) {
    const l = attachedLeader(s, p);
    if (l) ids.push(l.id);
  }
  for (const id of ids) {
    s.units = s.units.filter((x) => x.id !== id);
    s.leaders = s.leaders.filter((x) => x.id !== id);
    delete s.turn.ordered[id];
    ctx.emit({ t: 'removed', id, reason: 'exit' });
  }
}

/** An enemy unit was eliminated: its enemy scores a banner (T13 adds the kill weights). */
export function scoreKill(s: GameState, ctx: FlowCtx, u: Unit): void {
  gainBanner(s, ctx, other(u.side), 1, 'unit eliminated');
}

/** A leader was killed: his enemy scores a banner. */
export function scoreLeaderKill(s: GameState, ctx: FlowCtx, l: Leader): void {
  gainBanner(s, ctx, other(l.side), 1, 'leader killed');
}
