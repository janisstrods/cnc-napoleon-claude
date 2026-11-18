// Fast policies for all 20 decision kinds (Plan 5 Task 7b): live answers to the reactions of a turn, and the answers of both sides inside a
// simulation (sim.ts). Each kind has one exported helper; `policyFor` dispatches over `d.kind` exhaustively.
//
// Nothing here searches. Estimates (estimate.ts, reactions.ts), the evaluation and the engine's own queries rank the engine's own
// options; a decision's answer is always one of them. Hidden information is never read directly: hands come through view.ts.
import {
  answerError, battleReady, battleTargets, distance, greedyAssign, impetuous, leaderById, other, randomAnswer, relocate, retreatDistance,
  retreatOptions, shortSupplyHexes, statsOf, unitById, unitMoves, updateHeld, validateElan,
  type Answer, type Decision, type DieFace, type FlowCtx, type GameState, type HexId, type Side, type Unit,
} from '../engine';
import { occOf, type Occ } from './board';
import { makeBudget, type Budget } from './budget';
import { guerrillaScoutTake, guerrillaSpend, keepValue, moveFirstPick, openingCard, rallyAssign, scoutKeepIndex } from './cardsense';
import { bestGuns, defendValue } from './reactions';
import { fireEstimate, loneLeaderEstimate, makeEstCtx, meleeEstimate, takeGround, type EstCtx, type Outcome } from './estimate';
import { evaluate, impetuousCost, objectiveHexes, reachOf, rootContextOf } from './evaluate';
import { greedyMoveStep, type MoveCtx, type MoveStyle } from './moves';
import { MAX_CANDIDATES, orderCandidates, pieceBenefits, quickCardScore } from './ordering';
import type { Rng } from './rand';
import type { Policy } from './sim';
import { unitValue, type Weights } from './values';
import { blindClone, isDeterminised, myHand, withoutSquare } from './view';

export interface PolicyCtx {
  me: Side;
  /** The weights for `me`'s own decisions. */
  W: Weights;
  /** The weights of the opponent's decisions inside a simulation. */
  oppW: Weights;
  rand: Rng;
  /** The chance that a reactive decision is answered at random (the weakest levels); drawn from `rand`, and only when above 0. */
  mistakeRate: number;
  /** Charged by the move policy; without it each move decision gets its own small budget. */
  budget?: Budget;
  /** The movement style of the move policy. */
  style?: MoveStyle;
}

export type { Policy };
type D<K extends Decision['kind']> = Extract<Decision, { kind: K }>;

/** Nodes a policy's move decision may spend when the caller gives no budget. */
const MOVE_NODES = 60;
/** A gain must exceed this to count (ties go to the plainer answer). */
const EPS = 1e-9;
/** Benefit below which an Élan die is not worth an order. */
const ELAN_MIN = 0.002;
/** Hexes that count as safely clear of an enemy's reach. */
const FAR = 6;

const NO_EVENTS: FlowCtx = { emit: () => undefined };

/** Decisions that answer the course of a battle: the weakest levels err on these. */
const REACTIVE: ReadonlySet<Decision['kind']> = new Set<Decision['kind']>([
  'defend', 'ignoreFlags', 'retreat', 'leaderRetreat', 'advance', 'breakthroughExtra', 'bonusMelee',
]);

/** Determinised estimate contexts made once per simulated state (their card value is kept for the turn: an approximation). */
const simBase = new WeakMap<GameState, Map<string, EstCtx>>();

/**
 * The estimate context of `side` on `s`: on a state `determinize` produced, the sampled hands are read (`determinised`), the board is
 * current and the card value is made once per state; elsewhere it is `makeEstCtx`'s, with the assumed opponent hands.
 */
export function estCtxFor(s: GameState, side: Side, W: Weights): EstCtx {
  if (!isDeterminised(s)) return makeEstCtx(s, side, W);
  let byKey = simBase.get(s);
  if (!byKey) simBase.set(s, (byKey = new Map()));
  let base = byKey.get(side);
  if (!base || base.W !== W) byKey.set(side, (base = rootContextOf(s, side, W)));
  return { ...base, occ: occOf(s), W, moved: 0, role: 'attack', determinised: true, oppHands: undefined };
}

/** A non-determinised context of `side` for evaluating blind clones made from `s` (the evaluation refuses a determinised one there). */
function rootCtx(s: GameState, side: Side, W: Weights): EstCtx {
  return rootContextOf(s, side, W);
}

function argmaxBy<T>(items: readonly T[], score: (t: T) => number): T | null {
  let best: T | null = null;
  let bestV = -Infinity;
  for (const t of items) {
    const v = score(t);
    if (v > bestV) {
      bestV = v;
      best = t;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------------------------------------------------
// Threat helpers (distance-based reach, as the evaluation uses)

/** How many enemy units can attack a unit of `side` standing on `hex`, by their reach. */
function exposure(s: GameState, occ: Occ, side: Side, hex: HexId): number {
  let n = 0;
  for (const e of occ.bySide[other(side)]) {
    const d = distance(e.hex, hex);
    if (d > FAR) continue;
    if (d <= 1 || reachOf(s, occ, e, hex) >= d) n++;
  }
  return n;
}

/** The smallest margin by which `hex` is out of an enemy's reach (reach − distance, negated): larger is safer. */
function safetyMargin(s: GameState, occ: Occ, side: Side, hex: HexId): number {
  let margin = FAR;
  for (const e of occ.bySide[other(side)]) {
    const d = distance(e.hex, hex);
    if (d > FAR) continue;
    margin = Math.min(margin, d - (d <= 1 ? 1 : reachOf(s, occ, e, hex)));
  }
  return margin;
}

// ---------------------------------------------------------------------------------------------------------------------
// The card and its orders

/**
 * `playCard`: the card with the best quick score less its keep value (the planner replaces this at the live decision); on its
 * first turn at 116 a side plays the opening card it revealed (RR §15.8, S38).
 */
export function pickCard(s: GameState, d: D<'playCard'>, W: Weights, ec?: EstCtx): Answer {
  const bound = openingCard(s, d.side);
  if (bound !== null) return { kind: 'playCard', card: bound };
  ec ??= estCtxFor(s, d.side, W);
  const hand = myHand(s, d.side);
  const best = argmaxBy(hand, (c) => quickCardScore(s, d.side, c, W, ec) - keepValue(s, d.side, c, W, ec.occ));
  return { kind: 'playCard', card: best ?? hand[0] };
}

/** `orders`: the candidate order set with the largest summed benefit that the engine accepts. */
export function pickOrders(s: GameState, d: D<'orders'>, W: Weights, ec: EstCtx = estCtxFor(s, d.side, W)): Answer {
  const cands = orderCandidates(s, d.side, d.card, W, MAX_CANDIDATES, ec);
  const sorted = [...cands].sort((a, b) => (b.benefit ?? 0) - (a.benefit ?? 0));
  for (const c of sorted) {
    const a: Answer = c.single ? { kind: 'orders', pieces: c.pieces, single: true } : { kind: 'orders', pieces: c.pieces };
    if (answerError(s, d, a) === null) return a;
  }
  return { kind: 'orders', pieces: [] };
}

/**
 * `leaveSquare` (yes = leave): stay when enemy cavalry could reach the unit next turn; otherwise leave when the unit would gain a
 * move or a shot (or more dice) out of square.
 */
export function stayInSquare(s: GameState, d: D<'leaveSquare'>, _W?: Weights, ec?: EstCtx): Answer {
  const u = unitById(s, d.unit);
  if (!u) return { kind: 'yesno', yes: false };
  const occ = ec?.occ ?? occOf(s);
  for (const e of occ.bySide[other(u.side)]) {
    if (statsOf(s, e).arm !== 'cavalry') continue;
    const dist = distance(e.hex, u.hex);
    if (dist <= 1 || reachOf(s, occ, e, u.hex) >= dist) return { kind: 'yesno', yes: false };
  }
  // the position with the unit out of square, for the engine's own queries
  const out = withoutSquare(s, u.id);
  if (unitMoves(out, u.id).length > 0) return { kind: 'yesno', yes: true };
  const now = new Map(battleTargets(s, u.id).map((t) => [t.hex * 2 + (t.kind === 'fire' ? 0 : 1), t.dice]));
  const gains = battleTargets(out, u.id).some((t) => (now.get(t.hex * 2 + (t.kind === 'fire' ? 0 : 1)) ?? 0) < t.dice);
  return { kind: 'yesno', yes: gains };
}

// ---------------------------------------------------------------------------------------------------------------------
// Battle

/** The value of one attack for its maker: the estimate, cut by an impetuous cavalry unit's forced advance, scaled for cavalry's dash. */
export function attackValue(s: GameState, u: Unit, hex: HexId, kind: 'fire' | 'melee', W: Weights, ec: EstCtx): number {
  const op = s.turn.ordered[u.id];
  const ea: EstCtx = { ...ec, moved: op?.moved ?? 0, role: 'attack' };
  const victim = ec.occ.unit[hex] ?? ec.occ.leader[hex];
  let o: Outcome;
  if (kind === 'fire') o = fireEstimate(s, u, hex, ea);
  else o = ec.occ.unit[hex] ? meleeEstimate(s, u, hex, ea) : loneLeaderEstimate(s, u, hex, ea);
  let e = o.ev;
  const st = statsOf(s, u);
  // approximates RR §14.15, R82 (engine: afterMelee): the forced advance of impetuous cavalry
  if (kind === 'melee' && st.arm === 'cavalry' && victim && impetuous(s, u)) e -= impetuousCost(s, ec.occ, u, victim, o);
  if (st.arm === 'cavalry') e *= W.cavalryDash;
  return e;
}

/** `battle`: the highest-value attack (fire or melee, Combined Arms guns included) above `attackThreshold`, else end the battle. */
export function greedyBattle(s: GameState, d: D<'battle'>, W: Weights, ec: EstCtx = estCtxFor(s, d.side, W)): Answer {
  let best: { unit: string; target: HexId; v: number } | null = null;
  for (const id of battleReady(s)) {
    const u = unitById(s, id);
    if (!u) continue;
    for (const t of battleTargets(s, id)) {
      const v = attackValue(s, u, t.hex, t.kind, W, ec);
      if (!best || v > best.v) best = { unit: id, target: t.hex, v };
    }
  }
  if (best && best.v > W.attackThreshold) return { kind: 'attack', unit: best.unit, target: best.target };
  return { kind: 'endBattle' };
}

/** `combinedArms`: `bestGuns` (at least one gun when the engine requires it). */
export function pickGuns(s: GameState, d: D<'combinedArms'>, W: Weights, ec: EstCtx = estCtxFor(s, d.side, W)): Answer {
  const u = unitById(s, d.unit);
  const op = s.turn.ordered[d.unit];
  if (!u || !op) return { kind: 'select', ids: d.required ? d.options.slice(0, 1) : [] };
  // the melee has been declared: `bonusMeleeDone` marks a bonus melee, `battled` an initial one
  const role = op.bonusMeleeDone ? 'bonus' : 'attack';
  const ea: EstCtx = { ...ec, moved: op.moved, role };
  let ids = bestGuns(s, u, d.target, ea).filter((id) => d.options.includes(id));
  if (d.required && ids.length === 0) ids = d.options.slice(0, 1);
  return { kind: 'select', ids };
}

/** `defend`: the offered reaction with the best `defendValue` (a square gets the personality's `squareBias`). Cheap: one branch per option. */
export function pickDefence(s: GameState, d: D<'defend'>, W: Weights, budget?: Budget): Answer {
  const v = defendValue(s, d, W);
  budget?.charge(d.options.length);
  const best = argmaxBy(d.options, (c) => v[c] + (c === 'formSquare' ? W.squareBias : 0));
  return { kind: 'defend', choice: best ?? 'stand' };
}

/**
 * `ignoreFlags`: ignore the most the unit may, unless a free retreat (no block lost) would leave it less exposed and it holds no
 * objective hex: then ignore none.
 */
export function pickIgnore(s: GameState, d: D<'ignoreFlags'>, W: Weights, ec?: EstCtx): Answer {
  const max: Answer = { kind: 'ignoreFlags', count: d.max };
  const u = unitById(s, d.unit);
  if (!u || d.max <= 0 || u.square !== undefined) return max;
  if (objectiveHexes(s, u.side).includes(u.hex)) return max;
  const occ = ec?.occ ?? occOf(s);
  const free = retreatOptions(s, u, retreatDistance(statsOf(s, u), d.flags)).filter((o) => o.losses === 0 && o.path.length > 0);
  if (free.length === 0) return max;
  const here = exposure(s, occ, u.side, u.hex);
  const safest = Math.min(...free.map((o) => exposure(s, occ, u.side, o.end)));
  return safest < here ? { kind: 'ignoreFlags', count: 0 } : max;
}

/** `retreat`: fewest blocks lost, then the end hex farthest from enemy reach, then one that attaches a leader, then the first. */
export function pickRetreat(s: GameState, d: D<'retreat'>, _W?: Weights, ec?: EstCtx): Answer {
  const u = unitById(s, d.unit);
  const occ = ec?.occ ?? occOf(s);
  const side = u?.side ?? d.side;
  const key = d.options.map((o) => ({ losses: o.losses, margin: safetyMargin(s, occ, side, o.end), attach: o.attach !== null ? 1 : 0 }));
  let best = 0;
  for (let i = 1; i < d.options.length; i++) {
    const a = key[i];
    const b = key[best];
    if (a.losses < b.losses || (a.losses === b.losses && (a.margin > b.margin || (a.margin === b.margin && a.attach > b.attach)))) best = i;
  }
  return { kind: 'choose', index: best };
}

/** `leaderRetreat`: never eliminated when an alternative exists; fewest escape rolls; an attach far from the enemy; staying on the board. */
export function pickLeaderRetreat(s: GameState, d: D<'leaderRetreat'>, _W?: Weights, ec?: EstCtx): Answer {
  const occ = ec?.occ ?? occOf(s);
  const l = leaderById(s, d.leader);
  const side = l?.side ?? d.side;
  const score = (o: D<'leaderRetreat'>['options'][number]): number => {
    if (o.eliminated) return -100;
    let v = -1.5 * o.escapes.length - (o.offBoard ? 0.4 : 0);
    if (o.attach) v += 0.3;
    v += 0.1 * safetyMargin(s, occ, side, o.end);
    return v;
  };
  const best = argmaxBy(d.options.map((_, i) => i), (i) => score(d.options[i]));
  return { kind: 'choose', index: best ?? 0 };
}

// ---------------------------------------------------------------------------------------------------------------------
// After a melee

/** The position's evaluation for `side` with `u` moved to `to` (on a blind clone, by the engine's own move and held-objective update). */
function evalMoved(s: GameState, side: Side, W: Weights, base: EstCtx, id: string, to: HexId | null): number {
  const c = blindClone(s, side);
  if (to !== null) {
    const u = unitById(c, id);
    if (u) {
      relocate(c, u, to);
      updateHeld(c, NO_EVENTS);
    }
  }
  return evaluate(c, side, W, { ...base, occ: occOf(c), W, moved: 0, role: 'attack' });
}

/** `advance` (take ground or breakthrough): yes when the position's evaluation after the move is higher, a cavalry bonus-melee prospect counted. */
export function pickAdvance(s: GameState, d: D<'advance'>, W: Weights, ec: EstCtx = estCtxFor(s, d.side, W)): Answer {
  const u = unitById(s, d.unit);
  if (!u) return { kind: 'yesno', yes: false };
  const op = s.turn.ordered[u.id];
  const base = rootCtx(s, d.side, W);
  let gain = evalMoved(s, d.side, W, base, u.id, d.hex) - evalMoved(s, d.side, W, base, u.id, null);
  const adv = takeGround(s, u, d.hex, { ...ec, moved: op?.moved ?? 0, role: op?.bonusMeleeDone ? 'bonus' : 'attack' });
  if (adv.bonus) gain += adv.value;
  return { kind: 'yesno', yes: gain > EPS };
}

/**
 * `breakthroughExtra`: the hex whose bonus-melee prospect (the targets around the hex the unit would end on, `takeGround`) plus the
 * position it gives is best; `null` only when not required and staying where it is scores at least as well.
 */
export function pickBreakthroughHex(s: GameState, d: D<'breakthroughExtra'>, W: Weights, ec: EstCtx = estCtxFor(s, d.side, W)): Answer {
  const u = unitById(s, d.unit);
  if (!u) return { kind: 'hex', hex: d.required ? d.options[0] : null };
  const op = s.turn.ordered[u.id];
  const ea: EstCtx = { ...ec, moved: op?.moved ?? 0, role: 'attack' };
  const base = rootCtx(s, d.side, W);
  const here = evalMoved(s, d.side, W, base, u.id, null);
  // memoised: the best hex's score is asked again below, and each score is a full evaluation of a clone (Task 11 speed probe)
  const seen = new Map<HexId, number>();
  const score = (h: HexId): number => {
    let v = seen.get(h);
    if (v === undefined) seen.set(h, (v = takeGround(s, u, h, ea).value + evalMoved(s, d.side, W, base, u.id, h) - here));
    return v;
  };
  const best = argmaxBy(d.options, score);
  if (best === null) return { kind: 'hex', hex: null };
  if (d.required) return { kind: 'hex', hex: best };
  return score(best) > takeGround(s, u, u.hex, ea).value + EPS ? { kind: 'hex', hex: best } : { kind: 'hex', hex: null };
}

/** `bonusMelee`: the best target when its value reaches `bonusThreshold`, else decline. */
export function pickBonusMelee(s: GameState, d: D<'bonusMelee'>, W: Weights, ec: EstCtx = estCtxFor(s, d.side, W)): Answer {
  const u = unitById(s, d.unit);
  if (!u) return { kind: 'hex', hex: null };
  const op = s.turn.ordered[u.id];
  const ea: EstCtx = { ...ec, moved: op?.moved ?? 0, role: 'bonus' };
  const value = (h: HexId): number => (ec.occ.unit[h] ? meleeEstimate(s, u, h, ea) : loneLeaderEstimate(s, u, h, ea)).ev;
  const best = argmaxBy(d.targets, value);
  return best !== null && value(best) >= W.bonusThreshold ? { kind: 'hex', hex: best } : { kind: 'hex', hex: null };
}

// ---------------------------------------------------------------------------------------------------------------------
// Tactic cards

/**
 * `elan`: each die orders the piece it fits whose benefit under Élan is largest (the engine's `validateElan` decides what fits); a
 * piece with no worthwhile order is left. Arm dice choose first, flags (any piece) last.
 */
export function assignElan(s: GameState, d: D<'elan'>, W: Weights, ec: EstCtx = estCtxFor(s, d.side, W)): Answer {
  const ben = pieceBenefits(s, d.side, 'elan', W, ec);
  const ranked = [...ben.entries()].filter(([, b]) => b > ELAN_MIN).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([id]) => id);
  const ids: (string | null)[] = d.faces.map(() => null);
  const used = new Set<string>();
  const dice = d.faces.map((f, i) => ({ f, i })).filter((x) => x.f !== 'sabre').sort((a, b) => Number(a.f === 'flag') - Number(b.f === 'flag') || a.i - b.i);
  for (const { f, i } of dice) {
    for (const id of ranked) {
      if (used.has(id)) continue;
      const trial = [...ids];
      trial[i] = id;
      if (validateElan(s, d.side, d.faces, trial) !== null) continue;
      ids[i] = id;
      used.add(id);
      break;
    }
    void f;
  }
  if (validateElan(s, d.side, d.faces, ids) === null) return { kind: 'assign', ids };
  // a leader detaching from a square, say: fall back on the engine's greedy assignment over the same ranking
  const safe = greedyAssign(d.faces.length, () => ranked, (trial) => validateElan(s, d.side, d.faces, trial));
  return { kind: 'assign', ids: safe };
}

/** `rally`: cardsense's `rallyAssign` (greedy through the engine's `validateRally`): each block goes where fighting value plus, for a unit an enemy can reach, the banner risk removed gains most (a threatened worn unit first). */
export function assignRally(s: GameState, d: D<'rally'>): Answer {
  return { kind: 'assign', ids: rallyAssign(s, d.side, d.faces as readonly DieFace[]) };
}

/** `scoutKeep`: the card with the higher keep value. */
export function pickScout(s: GameState, d: D<'scoutKeep'>, W: Weights): Answer {
  return { kind: 'choose', index: scoutKeepIndex(s, d.side, d.cards, W) };
}

/** Cost of an enemy (positive: a gain) or own (negative) unit going back to its baseline, per hex it travels. */
const LIFT_HEX = 0.03;

/** The hexes the unit would travel on a Short Supply lift (to the nearest offered hex). */
function liftDistance(s: GameState, u: Unit): number {
  const hexes = shortSupplyHexes(s, u.id);
  if (hexes.length === 0) return 0;
  return Math.min(...hexes.map((h) => distance(u.hex, h)));
}

/**
 * `shortSupplyTarget`: the unit, of either side, whose lift gains most for us. An enemy gains us the banners of an objective it
 * holds and the safety of our worn units it threatens; our own unit gains the threat it is under, but loses the distance it falls back.
 */
export function pickShortSupplyTarget(s: GameState, d: D<'shortSupplyTarget'>, W: Weights, ec: EstCtx = estCtxFor(s, d.side, W)): Answer {
  const occ = ec.occ;
  const goals = objectiveHexes(s, d.side);
  const value = (id: string): number => {
    const u = unitById(s, id);
    if (!u) return -Infinity;
    const trip = LIFT_HEX * liftDistance(s, u);
    if (u.side !== d.side) {
      let v = trip;
      if (goals.includes(u.hex)) v += 1;
      for (const w of occ.bySide[d.side]) {
        if (w.blocks > 2) continue;
        const dist = distance(u.hex, w.hex);
        if (dist <= 1 || reachOf(s, occ, u, w.hex) >= dist) v += 0.5 * unitValue(s, w);
      }
      return v;
    }
    // our own unit: worth lifting only when it stands in mortal danger (worn and several enemy units can reach it)
    const danger = exposure(s, occ, u.side, u.hex);
    return (u.blocks <= 2 && danger >= 2 ? 0.6 * unitValue(s, u) : 0) - trip - 0.01;
  };
  const best = argmaxBy(d.options.map((_, i) => i), (i) => value(d.options[i]));
  return { kind: 'choose', index: best ?? 0 };
}

/** `shortSupplyHex`: the offered hex where the unit's side evaluates the position best. */
export function pickShortSupplyHex(s: GameState, d: D<'shortSupplyHex'>, W: Weights): Answer {
  const base = rootCtx(s, d.side, W);
  const best = argmaxBy(d.options, (h) => evalMoved(s, d.side, W, base, d.unit, h));
  return { kind: 'hex', hex: best ?? d.options[0] };
}

// ---------------------------------------------------------------------------------------------------------------------
// Expansion #1 (Plan 7C Task 19)

/**
 * `guerrilla`: spend a counter when cancelling the opponent's card is worth the counter (`guerrillaSpend`); take one with our
 * Scout while few are held or when it beats the keep-one draw (`guerrillaScoutTake`).
 */
export function pickGuerrilla(s: GameState, d: D<'guerrilla'>, W: Weights): Answer {
  if (d.mode === 'scout') return { kind: 'yesno', yes: guerrillaScoutTake(s, d.side, W) };
  return { kind: 'yesno', yes: d.card !== null && guerrillaSpend(s, d.side, d.card, W) };
}

/** `moveFirst`: the option with the best opening value, ties to the lower Move First value (`moveFirstPick`). */
export function pickMoveFirst(s: GameState, d: D<'moveFirst'>, W: Weights): Answer {
  return { kind: 'playCard', card: moveFirstPick(s, d.side, d.options, W) };
}

// ---------------------------------------------------------------------------------------------------------------------

function assertNever(d: never): never {
  throw new Error(`policyFor: unhandled decision ${JSON.stringify(d)}`);
}

/** The fast policy of `c`: it answers the decisions of either side (`c.W` for `c.me`, `c.oppW` for the other). */
export function policyFor(c: PolicyCtx): Policy {
  // one move context per (state, side): its `decided` pieces belong to the move phase of the state it was filled on, so two
  // simulations of one turn (the same key `turn|active|card`) never share it
  const movers = new WeakMap<GameState, Map<Side, MoveCtx>>();
  return (s, d) => {
    const W = d.side === c.me ? c.W : c.oppW;
    if (c.mistakeRate > 0 && REACTIVE.has(d.kind) && c.rand.chance(c.mistakeRate)) return randomAnswer(s, d, () => c.rand.next());
    switch (d.kind) {
      case 'playCard': return pickCard(s, d, W);
      case 'orders': return pickOrders(s, d, W);
      case 'leaveSquare': return stayInSquare(s, d, W);
      case 'move': {
        let bySide = movers.get(s);
        if (!bySide) movers.set(s, (bySide = new Map()));
        let mc = bySide.get(d.side);
        const budget = c.budget ?? makeBudget(MOVE_NODES, null, null);
        if (!mc || mc.W !== W) bySide.set(d.side, (mc = { me: d.side, W, occ: occOf(s), style: c.style ?? 'base', rand: c.rand, budget }));
        mc.budget = budget;
        return greedyMoveStep(s, mc);
      }
      case 'battle': return greedyBattle(s, d, W);
      case 'combinedArms': return pickGuns(s, d, W);
      case 'defend': return pickDefence(s, d, W, c.budget);
      case 'ignoreFlags': return pickIgnore(s, d, W);
      case 'retreat': return pickRetreat(s, d, W);
      case 'leaderRetreat': return pickLeaderRetreat(s, d, W);
      case 'advance': return pickAdvance(s, d, W);
      case 'breakthroughExtra': return pickBreakthroughHex(s, d, W);
      case 'bonusMelee': return pickBonusMelee(s, d, W);
      case 'elan': return assignElan(s, d, W);
      case 'rally': return assignRally(s, d);
      case 'scoutKeep': return pickScout(s, d, W);
      case 'shortSupplyTarget': return pickShortSupplyTarget(s, d, W);
      case 'shortSupplyHex': return pickShortSupplyHex(s, d, W);
      case 'guerrilla': return pickGuerrilla(s, d, W);
      case 'moveFirst': return pickMoveFirst(s, d, W);
      default: return assertNever(d);
    }
  };
}
