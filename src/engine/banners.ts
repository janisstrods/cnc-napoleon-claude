// Banners and victory (RR §13). A side's banner total is its permanent banners plus the banners of the temporary
// objectives it holds right now (`objState[i].held`).
import type { FlowCtx, GameState, Side } from './types';

/** A side's banner total: permanent banners plus the banners of its held temporary objectives. */
export function bannerTotal(s: GameState, side: Side): number {
  let n = s.players[side].banners;
  s.scenario.objectives.forEach((o, i) => {
    // held banners of the Expansion #1 kinds count only for their own side's record (S35, S36)
    const temp = o.kind === 'tempHex' || o.kind === 'tempGroup' || o.kind === 'tempAny' || o.kind === 'majority';
    if (o.side === side && temp && s.special.objState[i]?.held) n += o.banners;
  });
  return n;
}

/** The victory check after `side`'s total rose: reaching `bannersToWin` wins at once. Returns true when the battle is over. */
export function checkVictory(s: GameState, ctx: FlowCtx, side: Side): boolean {
  if (s.winner) return true;
  const total = bannerTotal(s, side);
  if (total < s.bannersToWin) return false;
  s.winner = side;
  s.winReason = `${s.players[side].army} captured ${total} banners`;
  ctx.emit({ t: 'victory', winner: side, reason: s.winReason });
  return true;
}

/** `side` scores `n` permanent banners; `reason` goes in the `banner` event. */
export function gainBanner(s: GameState, ctx: FlowCtx, side: Side, n: number, reason: string): void {
  if (s.winner) return;
  s.players[side].banners += n;
  ctx.emit({ t: 'banner', side, total: bannerTotal(s, side), reason });
  checkVictory(s, ctx, side);
}
