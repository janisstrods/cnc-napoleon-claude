// Applying a roll's hits and flags to a unit (RR §10). Skeleton: hits, the leader hooks, every flag accepted, the
// retreat and its losses (→ T6a).
import { damage } from './casualties';
import { ask, type Gen } from './decisions';
import { leaderCasualtyCheck, leaderLosesUnit } from './leaders';
import { relocate } from './movement';
import { updateHeld } from './objectives';
import { attachedLeader } from './query';
import { retreatOptions } from './retreat';
import { statsOf, retreatDistance } from './units';
import type { FlowCtx, GameState, Unit } from './types';

export interface RollOutcome { hits: number; flags: number; bounce: boolean }
export interface Applied { eliminated: boolean; left: boolean }

/** Flags the target may ignore (RR §10.2). Skeleton: 0. */
export function flagIgnores(_s: GameState, _target: Unit, _attacker: Unit, _leaderOk: boolean): number {
  return 0;
}

export function* applyOutcome(s: GameState, ctx: FlowCtx, target: Unit, o: RollOutcome, attacker: Unit, reason: string): Gen<Applied> {
  const leader = attachedLeader(s, target);
  let eliminated = false;
  let killed = false;
  const checked = o.hits > 0;
  if (checked) {
    eliminated = damage(s, ctx, target, o.hits, reason);
    if (s.winner) return { eliminated, left: false };
    killed = yield* leaderCasualtyCheck(s, ctx, target, eliminated);
    if (s.winner) return { eliminated, left: false };
  }
  const finish = function* (): Gen {
    if (eliminated && leader && !killed) yield* leaderLosesUnit(s, ctx, leader);
  };
  if (eliminated) {
    yield* finish();
    return { eliminated: true, left: false };
  }
  if (o.flags <= 0) return { eliminated: false, left: false };

  const max = o.bounce ? 0 : Math.min(o.flags, flagIgnores(s, target, attacker, !killed));
  let ignored = 0;
  if (max > 0) {
    const a = yield* ask(s, ctx, { kind: 'ignoreFlags', side: target.side, unit: target.id, flags: o.flags, max });
    ignored = (a as { count: number }).count;
  }
  ctx.emit({ t: 'flags', id: target.id, flags: o.flags, ignored, bounce: o.bounce });
  const accepted = o.flags - ignored;
  if (accepted <= 0) return { eliminated: false, left: false };
  const dist = retreatDistance(statsOf(s, target), accepted);

  let losses = 0;
  let left = false;
  if (target.square !== undefined) losses = dist;
  else {
    const options = retreatOptions(s, target, dist);
    let pick = options[0];
    if (options.length > 1) {
      const a = yield* ask(s, ctx, { kind: 'retreat', side: target.side, unit: target.id, options, reason: 'retreat' });
      pick = options[(a as { index: number }).index];
    }
    if (pick.path.length > 0) {
      const from = target.hex;
      relocate(s, target, pick.end);
      ctx.emit({ t: 'retreat', id: target.id, path: [from, ...pick.path] });
      if (pick.attach) ctx.emit({ t: 'attach', leader: pick.attach, unit: target.id });
      if (target.side !== s.active) s.turn.retreatEnds.push(pick.end);
      left = true;
      updateHeld(s, ctx);
    }
    losses = pick.losses;
  }
  if (losses > 0) {
    eliminated = damage(s, ctx, target, losses, 'failed retreat');
    if (s.winner) return { eliminated, left };
    if (!checked) killed = yield* leaderCasualtyCheck(s, ctx, target, eliminated);
    if (s.winner) return { eliminated, left };
    yield* finish();
  }
  return { eliminated, left: left && !eliminated };
}
