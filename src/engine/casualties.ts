// Losses and the event helpers the flow shares (RR §3.1, §9.5, §13.2).
import { scoreKill, scoreLeaderKill, updateHeld } from './objectives';
import { breakRule } from './scenarioRules';
import type { DieFace, FlowCtx, GameState, Leader, RollPurpose, Side, Unit } from './types';

export function log(ctx: FlowCtx, text: string, side?: Side): void {
  ctx.emit({ t: 'log', text, side });
}

export function emitRoll(
  ctx: FlowCtx, purpose: RollPurpose, faces: DieFace[], scoring: boolean[], by: string | null, against: string | null, from?: string[],
): void {
  ctx.emit({ t: 'roll', purpose, faces, scoring, by, against, ...(from ? { from } : {}) });
}

/** A unit in square leaves it: its card goes back to the hand (`squareLeft`, `cardReturned`). Nothing if it is not in square. */
export function releaseSquare(s: GameState, ctx: FlowCtx, u: Unit): void {
  const slot = u.square;
  if (slot === undefined) return;
  const p = s.players[u.side];
  const card = p.squareTrack[slot - 1];
  p.squareTrack[slot - 1] = null;
  if (card !== null && card !== undefined) p.hand.push(card);
  delete u.square;
  ctx.emit({ t: 'squareLeft', id: u.id, slot });
  ctx.emit({ t: 'cardReturned', side: u.side, slot });
}

/** An enemy unit is eliminated: it leaves the board, its square releases, its enemy scores. */
export function removeUnit(s: GameState, ctx: FlowCtx, u: Unit, reason: string): void {
  releaseSquare(s, ctx, u);
  s.units = s.units.filter((x) => x.id !== u.id);
  delete s.turn.ordered[u.id];
  ctx.emit({ t: 'eliminated', id: u.id });
  log(ctx, `${u.id} is eliminated (${reason}).`, u.side);
  // updateHeld first: the objective is lost before the kill banner and its victory check (R64, R66). scoreKill's own
  // updateHeld (objectives.ts) is then a no-op, kept there for its other callers.
  updateHeld(s, ctx);
  scoreKill(s, ctx, u);
  if (!s.winner) breakAfterLoss(s, ctx, u.side);   // a victory reached by this elimination is decided first (R64)
}

/**
 * A `breakOnLosses` rule of `side` (S30): once `losses` of its start-of-battle units of those rows are gone, every one still on
 * the board is removed at once. No banner, no leader check (an attached leader stays as a lone leader); a square releases.
 */
export function breakAfterLoss(s: GameState, ctx: FlowCtx, side: Side): void {
  const r = breakRule(s, side);
  if (!r) return;
  const left = s.units.filter((x) => x.side === side && r.keys.includes(x.key));
  if (left.length === 0 || r.start - left.length < r.losses) return;
  for (const u of left) {
    releaseSquare(s, ctx, u);
    s.units = s.units.filter((x) => x.id !== u.id);
    delete s.turn.ordered[u.id];
    ctx.emit({ t: 'removed', id: u.id, reason: 'broken' });
    log(ctx, `${u.id} leaves the field (broken).`, side);
  }
  updateHeld(s, ctx);
}

/** Remove `n` blocks (hits beyond the blocks are lost). Returns true when the unit is eliminated (and removed). */
export function damage(s: GameState, ctx: FlowCtx, u: Unit, n: number, reason: string): boolean {
  const lost = Math.min(n, u.blocks);
  if (lost <= 0) return false;
  u.blocks -= lost;
  ctx.emit({ t: 'damage', id: u.id, amount: lost, left: u.blocks, reason });
  if (u.blocks > 0) return false;
  removeUnit(s, ctx, u, reason);
  return true;
}

/** A leader is killed: he leaves the board and his enemy scores a banner. */
export function killLeader(s: GameState, ctx: FlowCtx, l: Leader, reason: string): void {
  s.leaders = s.leaders.filter((x) => x.id !== l.id);
  delete s.turn.ordered[l.id];
  s.special.leadersEliminated[l.side]++;
  ctx.emit({ t: 'leaderKilled', id: l.id });
  log(ctx, `${l.name} is killed (${reason}).`, l.side);
  scoreLeaderKill(s, ctx, l);
  updateHeld(s, ctx);
}
