// After a melee that vacated the target's hex: take ground, breakthrough and the move after a bonus melee (RR §9.7, §9.8, §14.15).
import { ask, type Gen } from './decisions';
import { areAdjacent, neighbours, rowOf } from './hex';
import { relocate } from './movement';
import { updateHeld } from './objectives';
import { attachedLeader, isEmptyHex, leaderAt, unitAt, unitById } from './query';
import { impetuous } from './scenarioRules';
import { passableFor, stopsOnEntry } from './terrain';
import { statsOf } from './units';
import type { FlowCtx, GameState, HexId, MeleeCtx, Unit } from './types';

/** Move into `hex` (a stop entry is recorded; a lone friendly leader there attaches, R35). */
function enter(s: GameState, ctx: FlowCtx, u: Unit, hex: HexId): void {
  const from = u.hex;
  const op = s.turn.ordered[u.id];
  const l0 = leaderAt(s, hex);
  const lone = l0 && l0.side === u.side && !unitAt(s, hex) ? l0 : undefined;
  if (stopsOnEntry(s, from, hex) || lone) op.stopEntered = true;
  relocate(s, u, hex);
  ctx.emit({ t: 'advance', id: u.id, path: [from, hex] });
  if (lone) {
    ctx.emit({ t: 'attach', leader: lone.id, unit: u.id });
    op.attachedThisTurn = true;
    const lo = s.turn.ordered[lone.id];
    if (lo) lo.moveDone = true;
  }
  updateHeld(s, ctx);
}

/** A vacant hex the unit may enter. */
const enterable = (s: GameState, u: Unit, h: HexId): boolean => isEmptyHex(s, h) && passableFor(s, h, statsOf(s, u).arm);

/**
 * The attacker's move into the vacated hex. Returns true when the cavalry entered it after its initial melee
 * (`m.role === 'attack'`), so that a bonus melee may follow.
 */
export function* afterMelee(s: GameState, ctx: FlowCtx, m: MeleeCtx, vacated: HexId): Gen<boolean> {
  const u = unitById(s, m.attacker);
  const op = s.turn.ordered[m.attacker];
  if (!u || !op || u.hex < 0 || s.winner || !areAdjacent(u.hex, vacated)) return false;
  const st = statsOf(s, u);
  if (st.arm === 'artillery' || u.square || op.stopEntered) return false;
  if (!enterable(s, u, vacated)) return false;
  const cavalry = st.arm === 'cavalry';
  const forced = cavalry && impetuous(s, u);
  const origin = u.hex;
  if (!forced) {
    const a = yield* ask(s, ctx, { kind: 'advance', side: u.side, unit: u.id, hex: vacated, how: cavalry ? 'breakthrough' : 'takeGround' });
    if (a.kind !== 'yesno' || !a.yes) return false;
  }
  const stops = stopsOnEntry(s, origin, vacated);
  enter(s, ctx, u, vacated);
  // infantry stop here; after a bonus melee the vacated hex only: no extra hex, no further attack (R36)
  if (!cavalry || m.role !== 'attack') return false;
  if (stops) return true;
  if (!forced) {
    const hasLeader = !!attachedLeader(s, u);
    const options = neighbours(vacated).filter((h) => {
      const l = leaderAt(s, h);
      const lone = !!l && l.side === u.side && !unitAt(s, h) && !hasLeader && passableFor(s, h, st.arm);
      return enterable(s, u, h) || lone;
    });
    if (options.length === 0) return true;
    const a = yield* ask(s, ctx, { kind: 'breakthroughExtra', side: u.side, unit: u.id, options, required: false });
    if (a.kind === 'hex' && a.hex !== null) enter(s, ctx, u, a.hex);
    return true;
  }
  // impetuous: 1 more hex in the next row toward the enemy baseline, never the original hex (R82)
  const row = rowOf(vacated) + (u.side === 'top' ? 1 : -1);
  const options = neighbours(vacated).filter((h) => rowOf(h) === row && h !== origin && enterable(s, u, h)).sort((a, b) => a - b);
  if (options.length === 1) enter(s, ctx, u, options[0]);
  else if (options.length === 2) {
    const a = yield* ask(s, ctx, { kind: 'breakthroughExtra', side: u.side, unit: u.id, options, required: true });
    if (a.kind === 'hex' && a.hex !== null) enter(s, ctx, u, a.hex);
  }
  return true;
}
