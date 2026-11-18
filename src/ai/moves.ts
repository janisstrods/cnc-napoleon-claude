// Movement planning (Plan 5 Task 6b): score each reachable hex of an ordered piece, and step through the pieces greedily.
//
// A target is scored on a `blindClone` with the move applied by the engine (`applyMove`): the engine decides what the move
// does (an exit, a captured or held objective, an attached leader, the stop a hex forces, what the unit may fight after it),
// and every estimate then reads the clone, where the unit stands. The score is the change in the position's evaluation, plus
// the best attack the move leaves open (`battleTargets` on the clone: the engine's own dice, including moving fire at half
// dice), at `ATTACK_SHARE`. Pieces are never moved on the live state.
//
// Napoleonic moves follow from the engine's own movement queries and the rows' dice: foot guns that stand and fire beat their
// one-hex step (no battle after it), line infantry weighs one hex at half dice against standing, squares have no targets,
// light cavalry's three hexes flank, Bayonet Charge's two hexes end in melee, and La Grande Manoeuvre's four hexes (no battle)
// are worth what the position gains where they end: an objective, or out of the enemy's reach.
import {
  OFF_BOARD, applyMove, battleTargets, canBattleAfterMove, distance, impetuous, isLeaderId, leaderById, leaderUnit, other, pieceMoves, statsOf, unitById,
  type Answer, type FlowCtx, type GameState, type HexId, type Side, type Unit,
} from '../engine';
import type { MoveTarget } from '../engine/movement';
import { occOf, type Occ } from './board';
import type { Budget } from './budget';
import { fireEstimate, loneLeaderEstimate, meleeEstimate, type EstCtx, type Outcome } from './estimate';
import { evaluate, impetuousCost, objectiveHexes, rootContextOf } from './evaluate';
import { blindClone } from './view';
import type { Rng } from './rand';
import type { Weights } from './values';

/** Movement styles: plan diversity for the planner (a plan is built per style and the simulations pick between them). */
export type MoveStyle = 'base' | 'hold' | 'bold' | 'safe' | 'noisy';

export interface MoveCtx {
  me: Side;
  /** The personality's weights; the style adjusts a copy. */
  W: Weights;
  /** The occupancy of the position being moved (`greedyMoveStep` rebuilds it for the state it is given). */
  occ: Occ;
  style: MoveStyle;
  rand: Rng;
  budget: Budget;
  /** The root decision's estimate context (`makeEstCtx` for `me`); without it the evaluation's cached root context is used. */
  ec?: EstCtx;
  /** Pieces whose move has been decided in this move phase (moved, or left standing); `greedyMoveStep` fills it. */
  decided?: Set<string>;
}

/** The share of the best attack that a move leaves open which counts towards the move (the attack is not yet made). */
const ATTACK_SHARE = 0.85;
/** A piece moves only when its best target beats standing by this much (a move is never free: the plan stays steadier). */
const STAY_EDGE = 0.004;

interface StyleSpec {
  /** Multipliers on `riskSelf`, `riskEnemy` and `advance`. */
  self: number;
  enemy: number;
  advance: number;
  /** Multiplier on the open attack's value. */
  attack: number;
  /** Added to standing still. */
  stay: number;
  /** Standard deviation of the noise added to every score. */
  noise: number;
}

const STYLES: Readonly<Record<MoveStyle, StyleSpec>> = {
  base: { self: 1, enemy: 1, advance: 1, attack: 1, stay: 0, noise: 0 },
  hold: { self: 1.15, enemy: 1, advance: 0.5, attack: 1, stay: 0.03, noise: 0 },
  bold: { self: 0.5, enemy: 1.3, advance: 1.6, attack: 1.2, stay: 0, noise: 0 },
  safe: { self: 1.8, enemy: 0.8, advance: 0.5, attack: 0.6, stay: 0, noise: 0 },
  noisy: { self: 1, enemy: 1, advance: 1, attack: 1, stay: 0, noise: 0.03 },
};

/** The weights of a style, made once per (weights, style). */
const styled = new WeakMap<Weights, Map<MoveStyle, Weights>>();
function styleWeights(W: Weights, style: MoveStyle): Weights {
  let byStyle = styled.get(W);
  if (!byStyle) styled.set(W, (byStyle = new Map()));
  let out = byStyle.get(style);
  if (!out) {
    const k = STYLES[style];
    byStyle.set(style, (out = { ...W, riskSelf: W.riskSelf * k.self, riskEnemy: W.riskEnemy * k.enemy, advance: W.advance * k.advance }));
  }
  return out;
}

/** The context moves are applied under: nothing is recorded (the clone is thrown away). */
const NO_EVENTS: FlowCtx = { emit: () => undefined };

/** The target "stay where it stands": a path of one hex, as `greedyMoveStep` offers it. */
function standTarget(s: GameState, id: string): MoveTarget {
  const hex = isLeaderId(id) ? leaderById(s, id)!.hex : unitById(s, id)!.hex;
  const u = isLeaderId(id) ? undefined : unitById(s, id);
  const op = s.turn.ordered[id];
  return { hex, path: [hex], stops: false, battle: !!u && !!op && canBattleAfterMove(s, u, op), attach: null };
}

/** Does `t` leave the piece where it is (its own hex, no path)? Such a target is not a move: nothing is applied. */
function isStanding(s: GameState, id: string, t: MoveTarget): boolean {
  const here = isLeaderId(id) ? leaderById(s, id)?.hex : unitById(s, id)?.hex;
  return t.path.length <= 1 && t.hex === here;
}

/** The evaluation of the root position under a style, per move context, remembered while the position is unchanged. */
const roots = new WeakMap<MoveCtx, { key: string; value: number }>();

/** What fixes the root evaluation: every piece's place and strength, the banners, and what is ordered and moved. */
function rootKey(s: GameState): string {
  let k = `${s.players.top.banners},${s.players.bottom.banners}|`;
  for (const u of s.units) k += `${u.hex}.${u.blocks}.${u.square ?? 0};`;
  for (const l of s.leaders) k += `${l.hex};`;
  for (const id in s.turn.ordered) k += `${id}${s.turn.ordered[id].moveDone ? 1 : 0}`;
  return k;
}

function rootValue(s: GameState, mc: MoveCtx, W: Weights, base: EstCtx): number {
  const key = rootKey(s);
  const known = roots.get(mc);
  if (known && known.key === key) return known.value;
  const value = evaluate(s, mc.me, W, base);
  roots.set(mc, { key, value });
  return value;
}

/**
 * The value of `pieceId` taking `t`, from `mc.me`'s side: the change in the evaluation of the position after the move (made on
 * a blind clone, by the engine), plus the best attack the move leaves open times `ATTACK_SHARE`. The attack exists only when
 * `t.battle`; a unit's moving fire is the engine's `fireDice` for the hexes it moved. A target on the piece's own hex means
 * standing still. Charges one node.
 */
export function scoreTarget(s: GameState, pieceId: string, t: MoveTarget, mc: MoveCtx): number {
  mc.budget.charge();
  const spec = STYLES[mc.style];
  const W = styleWeights(mc.W, mc.style);
  const base = mc.ec ?? rootContextOf(s, mc.me, mc.W);
  const standing = isStanding(s, pieceId, t);
  const c = blindClone(s, mc.me);
  if (!standing) applyMove(c, NO_EVENTS, pieceId, t);
  const occ = occOf(c);
  const ec: EstCtx = { ...base, occ, W, moved: 0, role: 'attack' };
  let v = evaluate(c, mc.me, W, ec) - rootValue(s, mc, W, base);
  if (standing) v += spec.stay;
  if (t.battle && !c.winner && !isLeaderId(pieceId)) v += ATTACK_SHARE * spec.attack * openAttack(c, pieceId, t, occ, W, ec);
  if (spec.noise) v += spec.noise * mc.rand.normal();
  return v;
}

/**
 * The best attack the piece (already moved, on the clone `c`) could make, in banners: the engine's battle targets for it, each
 * valued by the estimates, less the forced advance of an impetuous cavalry unit (R82), more for cavalry by its dash; an attack
 * not worth the personality's threshold is not made and counts for nothing.
 */
function openAttack(c: GameState, id: string, t: MoveTarget, occ: Occ, W: Weights, ec: EstCtx): number {
  const u: Unit | undefined = unitById(c, id);
  const op = c.turn.ordered[id];
  if (!u || !op || u.hex < 0) return 0;
  const st = statsOf(c, u);
  const ea: EstCtx = { ...ec, moved: op.moved };
  const forced = st.arm === 'cavalry' && impetuous(c, u) && !t.stops;
  let best = 0;
  for (const bt of battleTargets(c, id)) {
    let o: Outcome;
    if (bt.kind === 'fire') o = fireEstimate(c, u, bt.hex, ea);
    else o = occ.unit[bt.hex] ? meleeEstimate(c, u, bt.hex, ea) : loneLeaderEstimate(c, u, bt.hex, ea);
    let e = o.ev;
    // approximates RR §14.15, R82 (engine: afterMelee): the forced advance and extra hex put it next to the enemy
    const victim = occ.unit[bt.hex] ?? occ.leader[bt.hex];
    if (forced && bt.kind === 'melee' && victim) e -= impetuousCost(c, occ, u, victim, o);
    if (st.arm === 'cavalry') e *= W.cavalryDash;
    if (e > W.attackThreshold && e > best) best = e;
  }
  return best;
}

/** The distance from `h` to what `me` is heading for: the nearest enemy unit, or a hex its objectives need. */
function goalGap(s: GameState, mc: MoveCtx, goals: readonly HexId[], h: HexId): number {
  let d = 99;
  for (const e of mc.occ.bySide[other(mc.me)]) d = Math.min(d, distance(h, e.hex));
  for (const g of goals) d = Math.min(d, distance(h, g));
  return d;
}

/**
 * The target nearest the goal, without evaluating anything (the fallback once the budget is spent): the move that ends
 * closest to the nearest enemy or needed hex and closer than the piece stands now, or null to stay. A lone leader stays, and
 * a step off the board is never taken unevaluated. Ties go to the shorter path, then the lower hex.
 */
function nearestToGoal(s: GameState, id: string, moves: readonly MoveTarget[], mc: MoveCtx, goals: readonly HexId[]): HexId | null {
  if (isLeaderId(id)) return null;
  let best: MoveTarget | null = null;
  let bestGap = goalGap(s, mc, goals, unitById(s, id)!.hex);
  for (const m of moves) {
    if (m.hex === OFF_BOARD) continue;
    const gap = goalGap(s, mc, goals, m.hex);
    if (gap < bestGap || (best && gap === bestGap && (m.path.length < best.path.length || (m.path.length === best.path.length && m.hex < best.hex)))) {
      best = m;
      bestGap = gap;
    }
  }
  return best ? best.hex : null;
}

/** Best destination for a piece among `moves`, or null to stay. Evaluates the targets nearest the goal first, while the budget lasts. */
function bestMoveFor(s: GameState, id: string, moves: readonly MoveTarget[], mc: MoveCtx, goals: readonly HexId[]): HexId | null {
  if (mc.budget.spent()) return nearestToGoal(s, id, moves, mc, goals);
  let best: HexId | null = null;
  let bestScore = scoreTarget(s, id, standTarget(s, id), mc) + STAY_EDGE;
  const here = isLeaderId(id) ? 0 : goalGap(s, mc, goals, unitById(s, id)!.hex);
  void here;
  const ordered = isLeaderId(id)
    ? moves
    : [...moves].sort((a, b) => goalGap(s, mc, goals, a.hex === OFF_BOARD ? -1 : a.hex) - goalGap(s, mc, goals, b.hex === OFF_BOARD ? -1 : b.hex) || a.path.length - b.path.length || a.hex - b.hex);
  for (const m of ordered) {
    if (mc.budget.spent()) break;
    const sc = scoreTarget(s, id, m, mc);
    if (sc > bestScore) {
      bestScore = sc;
      best = m.hex;
    }
  }
  return best;
}

/** Planning order: leaders who may detach first, then the units at the front, lone leaders last. */
function orderKey(s: GameState, mc: MoveCtx, id: string): number {
  if (isLeaderId(id)) {
    const l = leaderById(s, id);
    if (!l) return 2000;
    return leaderUnit(s, l) ? -100 : 1000;
  }
  const u = unitById(s, id);
  if (!u) return 2000;
  let d = 99;
  for (const e of mc.occ.bySide[other(mc.me)]) d = Math.min(d, distance(u.hex, e.hex));
  return d;
}

/**
 * The next move of the greedy planner: the first piece (leaders who may detach, then the front units, lone leaders last)
 * whose best target beats standing; `endMove` when none does. A piece looked at once is `decided` and not looked at again, so a
 * move phase costs a bounded number of scores. Once `mc.budget` is spent no more targets are scored: the remaining pieces take
 * the target nearest their goal (the nearest enemy or a needed hex) without evaluation. Always a legal answer.
 */
export function greedyMoveStep(s: GameState, mc: MoveCtx): Answer {
  mc.occ = occOf(s);
  const decided = (mc.decided ??= new Set());
  const moves = new Map<string, MoveTarget[]>();
  for (const id of Object.keys(s.turn.ordered)) {
    if (decided.has(id)) continue;
    const m = pieceMoves(s, id);
    if (m.length) moves.set(id, m);
  }
  const ids = [...moves.keys()];
  if (!ids.length) return { kind: 'endMove' };
  const keys = new Map(ids.map((id) => [id, orderKey(s, mc, id)]));
  ids.sort((a, b) => keys.get(a)! - keys.get(b)! || (a < b ? -1 : 1));
  const goals = objectiveHexes(s, mc.me);
  for (const id of ids) {
    decided.add(id);
    const to = bestMoveFor(s, id, moves.get(id)!, mc, goals);
    if (to !== null) return { kind: 'move', piece: id, to };
  }
  return { kind: 'endMove' };
}
