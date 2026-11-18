// The turn planner (Plan 5 Task 8): at a card decision, candidate (card, orders, moves) plans are played out with the engine's own
// turn flow on determinised clones, judged by the static evaluation, and compared, less the value of keeping the card. The battle
// phase is decided by rollouts of the best attacks against ending it. Ported in shape from the Ancients planner (`bf3a648^`).
//
// One node budget (budget.ts, ruling 2) bounds a decision's work:
// - a node is one scored move target (moves.ts charges it), one simulated turn with its final evaluation (sim.ts `runTurn` charges
//   it), one battle rollout, one plan-building line played through a `Stepper` (which charges nothing itself), or one evaluation
//   outside a simulation (the root's, when an unsampled card must be compared);
// - a simulated turn's node covers its reactive and battle policies (greedy estimates, the defender's `pickDefence`): they run
//   without a budget of their own, so no private budget hides work inside a simulation; only move scoring inside a simulation (an
//   Élan plan's moves, planned per sample) charges more, from the planning share;
// - plan building draws on the nodes left above the screening reserve (k0 samples for every card still to screen), so the floor
//   (cards × k0 nodes) always buys every card its k0 samples; once that share is gone, a plan is still built for every card but
//   uncharged and without scoring: its card step on the Stepper, and moves by the zero-cost step towards the goal (moves.ts
//   `nearestToGoal`); a widened plan is built only when the nodes left pay for its line, its move scoring and its own k0 samples,
//   which are then reserved like the screening's, so no plan is built that cannot be sampled;
// - fixed per-decision setup is not a node: `makeEstCtx` (made once in `makeCtx`, after the deadline starts, so its time counts
//   against the wall clock), one quick score and one order-candidate list per card, and the base plan's card step when the planning
//   share is gone. It is bounded by the hand size (measured 0.06–0.19 ms for `makeEstCtx` on 001/004/015).
// With a clock (not deterministic) the budget also stops at its deadline; the clock is read every 16 charges, so a deadline may be
// overrun by up to 16 nodes of work (≈ 15 ms on real states). The planner itself never reads a clock: it asks `Budget.spent()`.
//
// Modelling notes (Task 11 tunes):
// - simulations model an all-seeing opponent: on a determinised clone our own hand is the real one, and the opponent's policies read
//   it as their "sampled" opponent hand (`sampledOppHolds`, `estCtxFor` from its side) — a pessimistic bias;
// - inside a simulation `estCtxFor` keeps the first call's card value for the whole turn, and the final evaluation prices our own
//   squares with the root decision's card value (the hand has changed by one card): approximations;
// - an Élan plan's moves are planned in each sample from the planning share; at the floor that share is empty, so its samples move
//   by the zero-cost step towards the goal and the card is undervalued there (Task 11 tunes);
// - strike-first piece ordering (Ancients) is not ported (optional): moves.ts plans the front units first; add it only if a
//   shooter's only firing hex turns out to be taken by an earlier-planned piece.
import {
  CARD_DEFS, answerError, bannerTotal, battleReady, battleTargets, cardKind, effectiveCard, forcedDiceLeft, other, pieceMoves, unitById,
  type Answer, type CardKind, type Decision, type GameState, type Side,
} from '../engine';
import { occOf } from './board';
import { makeBudget, type Budget } from './budget';
import { handFloorPenalty, keepValue } from './cardsense';
import { makeEstCtx, type EstCtx } from './estimate';
import { evaluate } from './evaluate';
import { greedyMoveStep, type MoveCtx, type MoveStyle } from './moves';
import { orderCandidates, quickCardScore, type OrderCandidate } from './ordering';
import { attackValue, policyFor } from './policies';
import { Rng } from './rand';
import { Stepper, runTurn, type Policy } from './sim';
import { WIN_SCORE, type Weights } from './values';
import { blindClone, determinize, myHand } from './view';

/** Search settings of one difficulty level (indexed by `levelOf`). */
export interface LevelCfg {
  /** Wall-clock cap of a card decision at `budgetScale` 1, ms (not deterministic only). A battle decision gets 30 % of it. */
  budgetMs: number;
  /** Nodes of a card decision at `budgetScale` 1 (the floor is cards in hand × k0); a battle decision gets 30 % of them. */
  maxSims: number;
  /** Order candidates tried per widened card. */
  orderCands: number;
  /** Movement styles per order candidate (base, hold, bold, safe, noisy). */
  moveVariants: number;
  /** Cards (by their screening score) that get the wider plans. */
  topCards: number;
  /** Samples of every plan in the screening rounds. */
  k0: number;
  /** Most samples of one plan in the successive halving. */
  kMax: number;
  /** Gaussian noise on the plan scores, and the temperature of the softmax pick among the top plans (the weakest level). */
  evalNoise: number;
  pickTemp: number;
  /** Battle phase: rollouts per candidate (0 = the greedy estimate), the attacks rolled out, noise on the greedy pick. */
  battleRollouts: number;
  battleCands: number;
  battleNoise: number;
  /** Chance that a live reactive decision is answered at random (passed to the policies by Task 9; simulations play it straight). */
  mistakeRate: number;
  /** Perturbed movement plans for the two leading plans. */
  extraVariants: number;
  /** Leftover budget: keep sampling the leader and its close rivals up to this many samples (0 = off). */
  topUp: number;
  /** Share of card decisions taken without simulation, by quick score (hasty turns). */
  hastyShare: number;
}

/**
 * The three levels, captain / colonel / marshal (Task 11 tunes them). The search shape is the Ancients Recruit / Tribune / Consul
 * one; the node counts are sized from measured node costs (see the Task 8 report): captain's floor fits its 150 ms.
 */
export const LEVELS: readonly [LevelCfg, LevelCfg, LevelCfg] = [
  {
    budgetMs: 150, maxSims: 90, orderCands: 1, moveVariants: 1, topCards: 2, k0: 2, kMax: 4, evalNoise: 0.6, pickTemp: 0.3,
    battleRollouts: 0, battleCands: 0, battleNoise: 0.3, mistakeRate: 0.3, extraVariants: 0, topUp: 0, hastyShare: 0.3,
  },
  {
    budgetMs: 800, maxSims: 1200, orderCands: 2, moveVariants: 3, topCards: 3, k0: 4, kMax: 16, evalNoise: 0, pickTemp: 0,
    battleRollouts: 24, battleCands: 3, battleNoise: 0, mistakeRate: 0, extraVariants: 2, topUp: 48, hastyShare: 0,
  },
  {
    // Task 11 (ruling 8): the shipped 2 s buys about 1,200 nodes (ai-probe), where the Task 8 shape (k0 12, topCards 6, orderCands 4,
    // moveVariants 5, extraVariants 16) spent them all on building and screening and never reached the halving; this shape screens
    // fewer, better plans and samples the leaders deeply within the same nodes
    budgetMs: 2000, maxSims: 5000, orderCands: 3, moveVariants: 3, topCards: 3, k0: 6, kMax: 48, evalNoise: 0, pickTemp: 0,
    battleRollouts: 32, battleCands: 6, battleNoise: 0, mistakeRate: 0, extraVariants: 4, topUp: 64, hastyShare: 0,
  },
];

export interface PlanCtx {
  me: Side;
  W: Weights;
  oppW: Weights;
  /** The weights that judge simulated outcomes. */
  judgeW: Weights;
  rand: Rng;
  cfg: LevelCfg;
  /** The one budget of this decision. */
  budget: Budget;
  /** Common random seeds per sample index (paired comparisons between plans). */
  seeds: number[];
  deterministic: boolean;
  /** The root decision's estimate context (`makeEstCtx`, built once). */
  ec: EstCtx;
}

/** One plan as the search saw it (diagnostics for tests and `ai-review`). */
export interface PlanCandInfo {
  card: number;
  label: string;
  /** Samples taken. */
  n: number;
  /** Mean sampled evaluation (less the hand-floor penalty); NaN with no sample. */
  mean: number;
  /** mean − keep value; −Infinity with no sample. */
  score: number;
}

export interface TurnPlan {
  card: number;
  /** The orders to give at the orders decision; null when the card asks none. */
  orders: OrderCandidate | null;
  /** The moves to make in order (empty: answer the move decisions with the policy, as for an Élan whose dice are not yet known). */
  moves: Answer[];
  label: string;
  score: number;
  /** Simulated turns played for this decision. */
  sims: number;
  cands?: PlanCandInfo[];
  /** An Élan plan (`moves` empty): the movement style its winning variant planned the moves in, per sample. */
  style?: MoveStyle;
}

/** A battle decision's share of the level's budget (time, or nodes in deterministic mode). */
const BATTLE_SHARE = 0.3;
/** The movement styles, in the order the widening takes them. */
const STYLES: readonly MoveStyle[] = ['base', 'hold', 'bold', 'safe', 'noisy'];
/** Most move-scoring nodes one simulated Élan turn may spend on its moves. */
const ONLINE_NODES = 30;
/** Paired close-call test width, in standard errors. */
const CLOSE_SE = 2.5;
/** Prior towards the analytic favourite of a battle decision (breaks near-ties among the rollout means). */
const GREEDY_PRIOR = 0.01;

/**
 * The context of one decision for `me`. The budget has max(round(maxSims × scale), cards in hand × k0) nodes (the floor of
 * ruling 2), 30 % of them for a battle decision. Deterministic: no clock is kept (`clock` is ignored and never called) and there
 * is no deadline. Otherwise the deadline is `budgetMs × scale` (30 % for a battle) after now, and the node cap still applies.
 */
export function makeCtx(
  me: Side, W: Weights, oppW: Weights, rand: Rng, cfg: LevelCfg, scale: number, deterministic: boolean, clock: (() => number) | null,
  root: GameState, battle = false,
): PlanCtx {
  const share = battle ? BATTLE_SHARE : 1;
  const nodes = Math.max(1, Math.round(Math.max(Math.round(cfg.maxSims * scale), myHand(root, me).length * cfg.k0) * share));
  const budget = deterministic ? makeBudget(nodes, null, null) : makeBudget(nodes, cfg.budgetMs * scale * share, clock);
  return { me, W, oppW, judgeW: W, rand, cfg, budget, seeds: [], deterministic, ec: makeEstCtx(root, me, W) };
}

function seedAt(ctx: PlanCtx, i: number): number {
  while (ctx.seeds.length <= i) ctx.seeds.push(ctx.rand.u32());
  return ctx.seeds[i];
}

/** The context that judges a determinised clone: the root's, with its sampled hands read. */
function judgeCtx(ctx: PlanCtx): EstCtx {
  return { ...ctx.ec, determinised: true, oppHands: undefined };
}

/** The value of a finished simulated turn for `me`: the evaluation, less the cost of a hand too short to form square. */
function judge(c: GameState, ctx: PlanCtx, ec: EstCtx): number {
  return evaluate(c, ctx.me, ctx.judgeW, ec) - handFloorPenalty(c, ctx.me);
}

// ---------------------------------------------------------------------------------------------------------------------
// The search state and its candidates

interface Cand {
  card: number;
  kind: CardKind;
  orders: OrderCandidate | null;
  moves: Answer[];
  /** A dice-ordered card (Élan): its moves are planned in each sample, in `style`. */
  online: boolean;
  style: MoveStyle;
  label: string;
  /** The card's keep value (`keepValue`, the personality's retention included). */
  keep: number;
  vals: number[];
  sum: number;
  n: number;
  key: string;
}

interface Search {
  root: GameState;
  ctx: PlanCtx;
  sims: number;
  /** Nodes still owed to samples not yet taken (screening, then the widened plans): plan building may not take them. */
  reserve: number;
  judgeEc: EstCtx;
  cands: Cand[];
  keys: Set<string>;
}

const mean = (c: Cand): number => (c.n ? c.sum / c.n : NaN);
const scoreOf = (c: Cand): number => (c.n ? c.sum / c.n - c.keep : -Infinity);
const byScore = (a: Cand, b: Cand): number => scoreOf(b) - scoreOf(a);

/**
 * A view of the decision's budget for plan building: its charges go to the budget, and it is spent once `cap` nodes are used, once
 * the budget is spent, or once only the screening reserve is left.
 */
function planBudget(S: Search, cap: number): Budget {
  const b = S.ctx.budget;
  const v: Budget = {
    nodes: 0,
    maxNodes: cap,
    deadline: b.deadline,
    clock: b.clock,
    charge(n = 1) {
      v.nodes += n;
      b.charge(n);
    },
    spent() {
      return v.nodes >= cap || b.nodes + S.reserve >= b.maxNodes || b.spent();
    },
  };
  return v;
}

/** The nodes left above the screening reserve. */
function surplus(S: Search): number {
  return Math.max(0, S.ctx.budget.maxNodes - S.ctx.budget.nodes - S.reserve);
}

function ordersAnswer(oc: OrderCandidate): Answer {
  return oc.single ? { kind: 'orders', pieces: oc.pieces, single: true } : { kind: 'orders', pieces: oc.pieces };
}

/** The policy of a sample: our plan's card, orders and moves; every other decision (both sides) by the fast policies. */
function simPolicy(S: Search, c: Cand, rand: Rng): Policy {
  const { me, W, oppW } = S.ctx;
  // no budget: reactive and battle policies are part of the simulated turn's node; our moves are answered below
  const base = policyFor({ me, W, oppW, rand, mistakeRate: 0 });
  let mi = 0;
  let mc: MoveCtx | null = null;
  return (s, d) => {
    if (d.side !== me) return base(s, d);
    switch (d.kind) {
      case 'playCard': return { kind: 'playCard', card: c.card };
      case 'orders': return c.orders ? ordersAnswer(c.orders) : base(s, d);
      case 'move': {
        while (mi < c.moves.length) {
          const a = c.moves[mi++];
          if (a.kind === 'move' && s.turn.ordered[a.piece] && pieceMoves(s, a.piece).some((m) => m.hex === a.to)) return a;
        }
        if (!c.online) return { kind: 'endMove' };
        // fresh per sample (a new state each time): never reused across turns
        mc ??= { me, W, occ: occOf(s), style: c.style, rand, budget: planBudget(S, Math.min(ONLINE_NODES, surplus(S))), ec: S.ctx.ec };
        return greedyMoveStep(s, mc);
      }
      default: return base(s, d);
    }
  };
}

/** One sample of `c` with the common seed of its index: blind clone, determinise, play the turn, judge. One node. */
function sample(S: Search, c: Cand): void {
  const { ctx, root } = S;
  const rand = new Rng(seedAt(ctx, c.n) ^ 0x5bd1e995);
  const st = blindClone(root, ctx.me);
  determinize(st, ctx.me, rand);
  if (S.reserve > 0) S.reserve--; // this sample's node was owed
  runTurn(st, simPolicy(S, c, rand), rand, ctx.budget);
  const v = judge(st, ctx, S.judgeEc);
  c.vals.push(v);
  c.sum += v;
  c.n++;
  S.sims++;
}

/** Sample every plan of `cands` up to `n` samples, round by round, while the budget lasts. */
function sampleTo(S: Search, cands: readonly Cand[], n: number): void {
  for (let round = 0; round < n; round++) {
    for (const c of cands) {
      if (c.n > round) continue;
      if (S.ctx.budget.spent()) return;
      sample(S, c);
    }
  }
}

/**
 * Build a plan on a private determinised clone: play the card, give `oc` at the orders decision (refused: null), answer what comes
 * before the movement by the policies, then plan the moves greedily in `style` (scored targets charge a plan view of at most `cap`
 * nodes). An Élan's moves are left to each sample. The plan is added unless an identical one exists.
 */
function buildCand(
  S: Search, card: number, keep: number, oc: OrderCandidate | null, style: MoveStyle, W: Weights, tag: string, cap: number,
): Cand | null {
  const { ctx, root } = S;
  const me = ctx.me;
  const rand = new Rng(ctx.rand.u32());
  const st = new Stepper(root, me, rand);
  // read through a function: the decision changes with every answer (no narrowing across them)
  const at = (): Decision | null => st.at;
  if (at()?.kind !== 'playCard' || !st.answer({ kind: 'playCard', card })) return null;
  const pre = policyFor({ me, W: ctx.W, oppW: ctx.oppW, rand, mistakeRate: 0 });
  const mine = (kinds: Decision['kind'][]) => (d: Decision): boolean => d.side === me && kinds.includes(d.kind);
  st.play(pre, rand, undefined, mine(['orders', 'move', 'battle']));
  let orders: OrderCandidate | null = null;
  const o = at();
  if (o?.kind === 'orders' && o.side === me) {
    if (!oc || !st.answer(ordersAnswer(oc))) return null;
    orders = oc;
    st.play(pre, rand, undefined, mine(['move', 'battle']));
  }
  const kind = cardKind(card);
  const eff = st.state.turn.effective;
  const online = eff !== null && CARD_DEFS[eff].select.kind === 'dice';
  const moves: Answer[] = [];
  // the line played on the Stepper is a node of the planning share, while that share lasts
  const pb = planBudget(S, cap);
  if (!pb.spent()) pb.charge(1);
  const m0 = at();
  if (!online && m0?.kind === 'move' && m0.side === me) {
    const mc: MoveCtx = { me, W, occ: occOf(st.state), style, rand, budget: pb, ec: ctx.ec };
    for (let guard = 0; guard < 60 && at()?.kind === 'move'; guard++) {
      const a = greedyMoveStep(st.state, mc);
      if (a.kind === 'endMove' || !st.answer(a)) break;
      moves.push(a);
    }
  }
  const pieces = orders ? `${orders.single ? 's:' : ''}${[...orders.pieces].sort().join(',')}` : '-';
  const key = `${kind}|${pieces}|${online ? `online:${style}` : moves.map((m) => (m.kind === 'move' ? `${m.piece}>${m.to}` : '')).join(';')}`;
  if (S.keys.has(key)) return null;
  S.keys.add(key);
  const c: Cand = {
    card, kind, orders, moves, online, style,
    label: `${kind}${eff && eff !== kind ? `->${eff}` : ''} [${orders ? orders.pieces.join(',') : ''}] ${tag}`,
    keep,
    vals: [], sum: 0, n: 0, key,
  };
  S.cands.push(c);
  return c;
}

/** Paired comparison over common seeds: is the gap between `a` and `b` (keep values included) under 2.5 standard errors? */
function closeCall(a: Cand, b: Cand): boolean {
  const m = Math.min(a.vals.length, b.vals.length);
  if (m < 4) return true;
  let sum = 0;
  let sum2 = 0;
  for (let i = 0; i < m; i++) {
    const d = a.vals[i] - b.vals[i];
    sum += d;
    sum2 += d * d;
  }
  const mu = sum / m;
  const sd = Math.sqrt(Math.max(0, sum2 / m - mu * mu));
  return Math.abs(mu - (a.keep - b.keep)) < CLOSE_SE * (sd / Math.sqrt(m) + 1e-9);
}

/** A plan whose samples never vary (no dice decided anything): more samples cannot change its estimate. */
function settled(c: Cand): boolean {
  return c.n >= 4 && c.vals.every((v) => v === c.vals[0]);
}

/** The leader's two best rivals still worth samples: uncertain plans that are a close call with it. */
function closeRivals(lead: Cand, cands: readonly Cand[]): Cand[] {
  return [...cands].sort(byScore).filter((c) => c !== lead && c.n > 0 && !settled(c) && closeCall(lead, c)).slice(0, 2);
}

/**
 * The leftover budget on close calls: re-admit plans cut early whose score beats the leader, then sample the leader and its close
 * rivals while they stay indistinguishable, up to `topUp` samples each.
 */
function topUp(S: Search, pool: Cand[]): Cand[] {
  const cfg = S.ctx.cfg;
  pool.sort(byScore);
  const lead0 = pool[0];
  for (const c of S.cands) {
    if (pool.includes(c) || S.ctx.budget.spent()) continue;
    if (c.n > 0 && scoreOf(c) > scoreOf(lead0)) {
      sampleTo(S, [c], lead0.n);
      pool.push(c);
    }
  }
  for (let guard = 0; guard < 24 && !S.ctx.budget.spent(); guard++) {
    pool.sort(byScore);
    const lead = pool[0];
    const close = closeRivals(lead, S.cands);
    if (!close.length) break;
    const group = [lead, ...close].filter((c) => !settled(c) && c.n < cfg.topUp);
    if (!group.length) break;
    const target = Math.min(cfg.topUp, Math.max(...[lead, ...close].map((c) => c.n)) + 8);
    sampleTo(S, group, target);
    for (const c of close) if (!pool.includes(c)) pool.push(c);
  }
  return pool.sort(byScore);
}

// ---------------------------------------------------------------------------------------------------------------------
// planTurn

/** The orders a card would get without a search (the first candidate), or null when it asks none. */
function quickOrders(root: GameState, ctx: PlanCtx, card: number, ocs?: OrderCandidate[]): OrderCandidate | null {
  const eff = effectiveCard(root, ctx.me, card).kind;
  if (eff === null) return null;
  const sel = CARD_DEFS[eff].select.kind;
  if (sel === 'dice' || sel === 'none' || sel === 'shortSupply' || sel === 'copy') return null;
  return (ocs ?? orderCandidates(root, ctx.me, cardKind(card), ctx.W, 1, ctx.ec))[0] ?? null;
}

function info(S: Search): PlanCandInfo[] {
  return S.cands.map((c) => ({ card: c.card, label: c.label, n: c.n, mean: mean(c), score: scoreOf(c) }));
}

/**
 * Choose the card, its orders and its moves for this turn (see the algorithm in the plan, Task 8). The card is always one the
 * engine accepts (`answerError`), the orders passed `validateOrders` and the moves were taken by the engine in order.
 */
export function planTurn(root: GameState, ctx: PlanCtx): TurnPlan {
  const me = ctx.me;
  const cfg = ctx.cfg;
  const S: Search = { root, ctx, sims: 0, reserve: 0, judgeEc: judgeCtx(ctx), cands: [], keys: new Set() };
  const hand = myHand(root, me);
  const asked: Decision = { kind: 'playCard', side: me };
  const legal = hand.filter((card) => answerError(root, asked, { kind: 'playCard', card }) === null);
  // one card of each kind (two cards of a kind play alike)
  const byKind = new Map<CardKind, number>();
  for (const card of legal.length ? legal : hand) if (!byKind.has(cardKind(card))) byKind.set(cardKind(card), card);
  const cards = [...byKind.values()];
  const keep = new Map(cards.map((c) => [c, keepValue(root, me, c, ctx.W, ctx.ec.occ)]));
  const quick = new Map(cards.map((c) => [c, quickCardScore(root, me, c, ctx.W, ctx.ec) - keep.get(c)!]));
  const quickPlan = (card: number, why: string, score: number, ocs?: OrderCandidate[]): TurnPlan => ({
    card, orders: quickOrders(root, ctx, card, ocs), moves: [], label: `${cardKind(card)} (${why})`, score, sims: S.sims, cands: info(S),
  });
  const byQuick = [...cards].sort((a, b) => quick.get(b)! - quick.get(a)! || a - b);

  // 1. no simulation while forced dice are queued, nor on a hasty turn
  if (forcedDiceLeft() > 0) return quickPlan(byQuick[0], 'quick', quick.get(byQuick[0])!);
  if (cfg.hastyShare > 0 && ctx.rand.chance(cfg.hastyShare)) return quickPlan(byQuick[0], 'hasty', quick.get(byQuick[0])!);

  // 2-3. screen every card, the most promising first: its base plan, then k0 samples (the reserve keeps the samples' nodes)
  const ocsOf = new Map<number, OrderCandidate[]>();
  S.reserve = byQuick.length * cfg.k0;
  for (let i = 0; i < byQuick.length; i++) {
    const card = byQuick[i];
    if (ctx.budget.spent()) break;
    const ocs = orderCandidates(root, me, cardKind(card), ctx.W, Math.max(1, cfg.orderCands), ctx.ec);
    ocsOf.set(card, ocs);
    const cap = Math.floor(surplus(S) / (byQuick.length - i));
    let c: Cand | null = null;
    for (const oc of ocs.length ? ocs : [null]) {
      c = buildCand(S, card, keep.get(card)!, oc, 'base', ctx.W, 'base', cap);
      if (c) break;
    }
    for (let j = 0; c && j < cfg.k0 && !ctx.budget.spent(); j++) sample(S, c);
    S.reserve = (byQuick.length - i - 1) * cfg.k0;
  }
  S.reserve = 0;
  const screened = (card: number): boolean => S.cands.some((c) => c.card === card && c.n > 0);

  // 5. widen the best cards: more order candidates and movement styles, then perturbed plans for the two leaders
  const bestOf = (card: number): number => Math.max(...S.cands.filter((c) => c.card === card).map(scoreOf));
  const top = cards.filter(screened).sort((a, b) => bestOf(b) - bestOf(a) || a - b).slice(0, cfg.topCards);
  // a widened plan is built only when the nodes left, after the samples owed to the plans already built, pay for its line, its
  // move scoring (at most a quarter of them) and its own k0 samples; the samples it will need are then reserved
  const wideCap = (): number => {
    const avail = ctx.budget.maxNodes - ctx.budget.nodes - S.reserve;
    return Math.min(Math.floor(avail / 4), avail - cfg.k0);
  };
  const widen = (out: Cand[], build: (cap: number) => Cand | null): void => {
    const cap = wideCap();
    if (cap < 1 || ctx.budget.spent()) return;
    const c = build(cap);
    if (!c) return;
    out.push(c);
    S.reserve += cfg.k0;
  };
  const fresh: Cand[] = [];
  for (const card of top) {
    const ocs = (ocsOf.get(card) ?? []).slice(0, cfg.orderCands);
    for (let oi = 0; oi < ocs.length; oi++) {
      for (const style of STYLES.slice(0, oi === 0 ? cfg.moveVariants : Math.min(2, cfg.moveVariants))) {
        if (oi === 0 && style === 'base') continue;
        widen(fresh, (cap) => buildCand(S, card, keep.get(card)!, ocs[oi], style, ctx.W, `${style}${oi ? ` o${oi}` : ''}`, cap));
      }
    }
  }
  sampleTo(S, fresh, cfg.k0);
  S.reserve = 0;
  let pool = S.cands.filter((c) => c.n > 0).sort(byScore);
  const extra: Cand[] = [];
  for (let i = 0; i < cfg.extraVariants && pool.length && !ctx.budget.spent(); i++) {
    const lead = pool[i % Math.min(2, pool.length)];
    if (lead.online) continue;
    const r = ctx.rand;
    const Wv: Weights = { ...ctx.W, riskSelf: ctx.W.riskSelf * (0.65 + 0.7 * r.next()), advance: ctx.W.advance * (0.4 + 1.2 * r.next()) };
    widen(extra, (cap) => buildCand(S, lead.card, lead.keep, lead.orders, 'noisy', Wv, `var${i}`, cap));
  }
  sampleTo(S, extra, cfg.k0);
  S.reserve = 0;

  // 6. successive halving up to kMax, then the leftover budget on close rivals
  pool = S.cands.filter((c) => c.n > 0).sort(byScore);
  let k = cfg.k0;
  while (!ctx.budget.spent() && pool.length > 2 && k < cfg.kMax) {
    pool = pool.slice(0, Math.max(2, Math.ceil(pool.length / 2)));
    k = Math.min(k * 2, cfg.kMax);
    sampleTo(S, pool, k);
    pool.sort(byScore);
  }
  if (pool.length >= 2 && !ctx.budget.spent()) {
    pool = pool.slice(0, Math.min(3, pool.length));
    sampleTo(S, pool.slice(0, 2), cfg.kMax);
    pool.sort(byScore);
  }
  if (cfg.topUp > 0 && pool.length) pool = topUp(S, pool);

  // 7. the weakest level: noisy judgement and a softmax pick among the top plans
  const all = S.cands.filter((c) => c.n > 0).sort(byScore);
  let best: Cand | undefined = pool[0] ?? all[0];
  if (best && (cfg.evalNoise > 0 || cfg.pickTemp > 0)) {
    const tops = all.slice(0, 4).map((c) => ({ c, v: scoreOf(c) + cfg.evalNoise * ctx.rand.normal() }));
    const mx = Math.max(...tops.map((t) => t.v));
    const ws = tops.map((t) => Math.exp((t.v - mx) / Math.max(0.01, cfg.pickTemp)));
    let x = ctx.rand.next() * ws.reduce((a, w) => a + w, 0);
    for (let i = 0; i < tops.length; i++) {
      x -= ws[i];
      if (x <= 0) {
        best = tops[i].c;
        break;
      }
    }
  }

  // 8. cards the budget never screened keep their quick score, on the evaluation's scale (root evaluation + quick gain)
  if (!best) return quickPlan(byQuick[0], 'quick, unscreened', quick.get(byQuick[0])!, ocsOf.get(byQuick[0]));
  const unscreened = byQuick.filter((c) => !screened(c));
  if (unscreened.length && ctx.budget.nodes < ctx.budget.maxNodes) {
    ctx.budget.charge(1);
    const rootV = evaluate(root, me, ctx.judgeW, ctx.ec);
    const u = unscreened[0];
    const est = rootV + quick.get(u)!;
    if (est > scoreOf(best)) return quickPlan(u, 'quick, unscreened', est, ocsOf.get(u));
  }
  return {
    card: best.card, orders: best.orders, moves: best.online ? [] : best.moves, label: best.label, score: scoreOf(best), sims: S.sims, cands: info(S),
    ...(best.online ? { style: best.style } : {}),
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// decideBattle

/** One rollout: `first` answers the battle decision, the policies the rest of the battle phase and the draw; then the judgement. One node. */
function rollout(s: GameState, ctx: PlanCtx, first: Answer, seed: number, ec: EstCtx): number {
  const rand = new Rng(seed);
  const c = blindClone(s, ctx.me);
  determinize(c, ctx.me, rand);
  const base = policyFor({ me: ctx.me, W: ctx.W, oppW: ctx.oppW, rand, mistakeRate: 0 });
  let used = false;
  const policy: Policy = (st, d) => {
    if (!used && d.kind === 'battle' && d.side === ctx.me) {
      used = true;
      return first;
    }
    return base(st, d);
  };
  runTurn(c, policy, rand, ctx.budget);
  return judge(c, ctx, ec);
}

const sameAnswer = (a: Answer, b: Answer): boolean => JSON.stringify(a) === JSON.stringify(b);

/**
 * The battle decision of `ctx.me` on `s` (at its `battle` decision): the attacks ranked by estimate. Without rollouts (or while
 * forced dice are queued) the best one above `attackThreshold`, the estimates noised by `battleNoise`, else end the phase; every
 * answer returned passes `answerError`. With
 * rollouts, the top `battleCands` attacks and ending the phase are rolled out in rounds under common seeds (whole rounds only, so
 * the node cap holds), and the best mean wins; at a match point or after a game-deciding rollout the two best get more rounds.
 */
export function decideBattle(s: GameState, ctx: PlanCtx): Answer {
  const { me, W, cfg, budget } = ctx;
  const d: Decision = { kind: 'battle', side: me };
  const end: Answer = { kind: 'endBattle' };
  const opts: { a: Answer; v: number }[] = [];
  for (const id of battleReady(s)) {
    const u = unitById(s, id);
    if (!u) continue;
    for (const t of battleTargets(s, id)) opts.push({ a: { kind: 'attack', unit: id, target: t.hex }, v: attackValue(s, u, t.hex, t.kind, W, ctx.ec) });
  }
  if (!opts.length) return end;
  const noisy = opts.map((o) => o.v + (cfg.battleNoise > 0 ? cfg.battleNoise * ctx.rand.normal() : 0));
  let gi = 0;
  for (let i = 1; i < opts.length; i++) if (noisy[i] > noisy[gi]) gi = i;
  const greedy = noisy[gi] > W.attackThreshold && answerError(s, d, opts[gi].a) === null ? opts[gi].a : end;
  if (cfg.battleRollouts <= 0 || forcedDiceLeft() > 0) return greedy;

  const answers = [...opts].sort((x, y) => y.v - x.v).slice(0, Math.max(1, cfg.battleCands)).map((o) => o.a);
  answers.push(end);
  const ec = judgeCtx(ctx);
  const sums = answers.map(() => 0);
  const ns = answers.map(() => 0);
  let terminal = false;
  const round = (idx: readonly number[]): boolean => {
    if (budget.spent() || budget.nodes + idx.length > budget.maxNodes) return false;
    const seed = ctx.rand.u32();
    for (const i of idx) {
      const v = rollout(s, ctx, answers[i], seed, ec);
      if (Math.abs(v) >= WIN_SCORE / 2) terminal = true;
      sums[i] += v;
      ns[i]++;
    }
    return true;
  };
  const every = answers.map((_, i) => i);
  for (let r = 0; r < cfg.battleRollouts && round(every); r++);
  if (ns[0] === 0) return greedy;
  // a game-deciding phase: rare catastrophes and wins need more samples of the two best answers
  const T = s.bannersToWin;
  const matchPoint = bannerTotal(s, me) >= T - 1 || bannerTotal(s, other(me)) >= T - 1;
  if (terminal || matchPoint) {
    const two = [...every].sort((x, y) => sums[y] / ns[y] - sums[x] / ns[x]).slice(0, 2);
    for (let r = 0; r < cfg.battleRollouts && round(two); r++);
  }
  let best = -1;
  let bv = -Infinity;
  answers.forEach((a, i) => {
    const v = sums[i] / Math.max(1, ns[i]) + (sameAnswer(a, greedy) ? GREEDY_PRIOR : 0);
    if (v > bv && answerError(s, d, a) === null) {
      bv = v;
      best = i;
    }
  });
  return best >= 0 ? answers[best] : end;
}
