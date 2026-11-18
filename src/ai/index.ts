// The computer opponent for Commands & Colours: Napoleonics. `chooseAnswer` answers any engine decision for the AI's side.
//
// - `playCard`: the planner (planner.ts) plays candidate (card, orders, moves) plans out on determinised clones, judges them with the
//   static evaluation and keeps the best; the plan is stored in the memory, and the card answered.
// - `orders` and `move`: the stored plan's next answer, while the position is still the one the plan expects (its fingerprint) and
//   the engine accepts the answer; otherwise the plan is dropped and the fast policies answer (a worker that died mid-turn, an
//   autosave reloaded, a unit moved by someone else).
// - `battle`: the rollouts of `decideBattle`, on a battle share of the level's budget.
// - every other kind, `defend` included (it must be answered inside the UI's uniform pause): the fast policies (policies.ts).
// Forced dice (the engine's test hook) mean no simulation: the planner and the battle rollouts check for them themselves and fall back
// on quick scores and the greedy policy (the plan's orders and the committed Move First card are still honoured).
//
// Hidden information is never read here: the planner and the policies take what they need from view.ts. With
// `deterministic: true` no clock is read anywhere (the node budget alone limits the work).
import { answerError, bannerTotal, battleTargets, CARD_DEFS, cardKind, forcedDiceLeft, other, randomAnswer, statsOf, unitById } from '../engine';
import type { Answer, CardKind, Decision, GameState, Side } from '../engine';
import { LEVELS, decideBattle, makeCtx, planTurn, type TurnPlan } from './planner';
import { PERSONALITIES, personalityById, personalityFor, type Personality } from './personality';
import type { MoveStyle } from './moves';
import { policyFor, type PolicyCtx } from './policies';
import type { OrderCandidate } from './ordering';
import { Rng, entropySeed } from './rand';
import { Stepper } from './sim';
import { NEUTRAL_W, weightsFor } from './values';
import { sayFor, type Moment } from './voice';

/** Strength levels, weakest first; per-level settings are indexed by position (`levelOf`). */
export const DIFFICULTIES = ['captain', 'colonel', 'marshal'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** Level index of a difficulty: captain 0, colonel 1, marshal 2. An unknown string reads as colonel. */
export function levelOf(d: Difficulty): 0 | 1 | 2 {
  switch (d) {
    case 'captain': return 0;
    case 'colonel': return 1;
    case 'marshal': return 2;
    default: {
      const unknown: never = d; // a new slug must be added above
      void unknown;
      return 1;
    }
  }
}
export type { Personality };
export { PERSONALITIES, personalityById, personalityFor };

export interface AiOptions {
  side: Side;
  difficulty: Difficulty;
  personality: Personality;
  seed?: number;
  /** Scales the thinking budget (default 1): the time at each level, or the node count in deterministic mode. */
  budgetScale?: number;
  deterministic?: boolean;
}

/** The turn plan kept between the card decision and the turn's orders and moves. */
export interface StoredPlan {
  /** What the position must look like at the next decision the plan answers (`planFingerprint`; see `expects`). */
  fingerprint: string;
  /** The card the plan was made for (its id). */
  card: number;
  orders: OrderCandidate | null;
  /** The moves to make in order; empty means the policy answers the move decisions (an Élan, or a quick plan). */
  moves: Answer[];
  /** The moves answered so far. */
  next: number;
  /** The movement style of the policy's live moves (an Élan plan's winning style). */
  style?: MoveStyle;
  /** The fingerprints expected at the plan's decisions after the next one, from a replay of the plan on a clone. */
  ahead: string[];
}

export interface AiMemory {
  /** State of the AI's private generator (0: not yet seeded). */
  rngState: number;
  /** Answers replaced by the random fallback (each is also reported with console.error); must stay 0 in tests. */
  fallbacks: number;
  /** Diagnostics of the last decision (shown by `ai-review`). `ms` is 0 in deterministic mode (no clock is read). */
  last: { kind: Decision['kind']; ms: number; sims: number; plan?: string } | null;
  plan: StoredPlan | null;
  /** The turn of the last line spoken (a commander speaks at most once a turn). */
  voice: { lastTurn: number };
}

export function newMemory(): AiMemory {
  return { rngState: 0, fallbacks: 0, last: null, plan: null, voice: { lastTurn: -1 } };
}

const now = (): number => (globalThis.performance ? globalThis.performance.now() : Date.now());

/** Would the engine accept answer `a` to decision `d` (its one validator, `answerError`)? */
export function isLegal(s: GameState, d: Decision, a: Answer): boolean {
  return answerError(s, d, a) === null;
}

// ---------------------------------------------------------------------------------------------------------------------
// The fingerprint of a position

const byId = (a: { id: string }, b: { id: string }): number => a.id.localeCompare(b.id, 'en', { numeric: true });

/**
 * The turn, the side to act, every unit's id, hex, blocks and square counter (sorted) and every leader's id and hex (sorted). It
 * leaves out the hands: playing the card changes ours, and a hand is not position.
 */
export function planFingerprint(s: GameState): string {
  const units = [...s.units].sort(byId).map((u) => `${u.id}@${u.hex}/${u.blocks}/${u.square ?? 0}`).join(',');
  const leaders = [...s.leaders].sort(byId).map((l) => `${l.id}@${l.hex}`).join(',');
  return `${s.turn.number}|${s.active}|${units}|${leaders}`;
}

/** The part of a fingerprint that names the turn and the side. */
const turnPart = (fp: string): string => fp.slice(0, fp.indexOf('|', fp.indexOf('|') + 1) + 1);
/** Marks a plan whose later positions are not known in advance (live moves): only the turn, the side and the card are checked. */
const LIVE = '*';

/** Does the position `s` still match what the plan expects at its next decision? */
function expects(p: StoredPlan, s: GameState): boolean {
  const fp = planFingerprint(s);
  if (p.fingerprint.endsWith(LIVE)) return fp.startsWith(p.fingerprint.slice(0, -1)) && s.turn.card === p.card;
  return fp === p.fingerprint;
}

const ordersAnswer = (oc: OrderCandidate): Answer => (oc.single ? { kind: 'orders', pieces: oc.pieces, single: true } : { kind: 'orders', pieces: oc.pieces });

/**
 * The fingerprints the real game should show at each decision the plan answers (its orders, each move, the decision after the last
 * move), found by playing the plan on a private clone with the engine's own flow and the same policies that answer the other
 * decisions live. Null when the replay cannot follow the plan (it is then not stored with moves).
 */
function replayFingerprints(root: GameState, me: Side, plan: TurnPlan, c: PolicyCtx, rand: Rng): string[] | null {
  const st = new Stepper(root, me, new Rng(rand.u32()));
  const at = (): Decision | null => st.at;
  if (at()?.kind !== 'playCard' || !st.answer({ kind: 'playCard', card: plan.card })) return null;
  const pre = policyFor({ ...c, rand: new Rng(rand.u32()), mistakeRate: 0 });
  const mine = (kinds: Decision['kind'][]) => (d: Decision): boolean => d.side === me && kinds.includes(d.kind);
  const fps: string[] = [];
  st.play(pre, c.rand, undefined, mine(['orders', 'move', 'battle']));
  const o = at();
  if (o?.kind === 'orders' && o.side === me) {
    fps.push(planFingerprint(st.state));
    const a = plan.orders ? ordersAnswer(plan.orders) : pre(st.state, o);
    if (!st.answer(a)) return null;
    st.play(pre, c.rand, undefined, mine(['move', 'battle']));
  }
  for (const m of plan.moves) {
    if (at()?.kind !== 'move') return null;
    fps.push(planFingerprint(st.state));
    if (!st.answer(m)) return null;
  }
  if (at()?.kind === 'move') fps.push(planFingerprint(st.state));
  return fps.length ? fps : null;
}

// ---------------------------------------------------------------------------------------------------------------------
// The voice

/** A line for `moment`, at most one a turn, from the commander's temperament; the public facts only. */
function speak(s: GameState, me: Side, p: Personality, mem: AiMemory, rand: Rng, moment: Moment, ctx: { card?: CardKind; unit?: string }): string | undefined {
  if (mem.voice.lastTurn === s.turn.number) return undefined;
  const line = sayFor(p, moment, ctx, rand);
  if (line !== undefined) mem.voice.lastTurn = s.turn.number;
  void me;
  return line;
}

/** How far ahead on banners (public) a side must be for the commander to remark on it. */
const LEAD_TALK = 2;
/** Chance that a turn's card line gives way to a remark on the banner count when one side leads. */
const REMARK = 0.25;

function unitName(s: GameState, id: string): string | undefined {
  const u = unitById(s, id);
  return u ? statsOf(s, u).name : undefined;
}

// ---------------------------------------------------------------------------------------------------------------------
// The dispatch

interface Outcome {
  answer: Answer;
  say?: string;
  sims?: number;
  plan?: string;
}

function decide(s: GameState, d: Decision, opts: AiOptions, mem: AiMemory, rand: Rng): Outcome {
  const me = d.side;
  const det = !!opts.deterministic;
  const cfg = LEVELS[levelOf(opts.difficulty)];
  const scale = opts.budgetScale ?? 1;
  const P = opts.personality;
  const W = weightsFor(P);
  const policyCtx = (style?: MoveStyle): PolicyCtx => ({ me, W, oppW: NEUTRAL_W, rand, mistakeRate: cfg.mistakeRate, style });
  const policy = (style?: MoveStyle): Answer => policyFor(policyCtx(style))(s, d);

  /** The stored plan when it still matches the position and this turn's card; otherwise it is dropped. */
  const followed = (): StoredPlan | null => {
    const p = mem.plan;
    if (!p) return null;
    if (!expects(p, s)) {
      mem.plan = null;
      return null;
    }
    return p;
  };
  /** The plan's next expectation after it answered a decision. */
  const advance = (p: StoredPlan): void => {
    p.fingerprint = p.ahead.length ? p.ahead.shift()! : `${turnPart(p.fingerprint)}${LIVE}`;
  };

  switch (d.kind) {
    case 'playCard': {
      const ctx = makeCtx(me, W, NEUTRAL_W, rand, cfg, scale, det, det ? null : now, s);
      const plan = planTurn(s, ctx);
      const stored: StoredPlan = {
        fingerprint: `${turnPart(planFingerprint(s))}${LIVE}`, card: plan.card, orders: plan.orders, moves: plan.moves, next: 0, ahead: [],
        ...(plan.style ? { style: plan.style } : {}),
      };
      if (plan.moves.length && forcedDiceLeft() === 0) {
        ctx.budget.charge(1); // the replay is one more line played through
        const fps = replayFingerprints(s, me, plan, policyCtx(), rand);
        if (fps) {
          stored.fingerprint = fps[0];
          stored.ahead = fps.slice(1);
        } else stored.moves = []; // a plan the replay cannot follow: its moves are left to the policy
      }
      mem.plan = stored;
      const lead = bannerTotal(s, me) - bannerTotal(s, other(me));
      const remark: Moment | null = Math.abs(lead) >= LEAD_TALK && rand.chance(REMARK) ? (lead > 0 ? 'winning' : 'losing') : null;
      const say = speak(s, me, P, mem, rand, remark ?? 'cardPlayed', { card: cardKind(plan.card) });
      return { answer: { kind: 'playCard', card: plan.card }, say, sims: plan.sims, plan: `${plan.label} = ${plan.score.toFixed(3)}` };
    }
    case 'orders': {
      const p = followed();
      if (p?.orders) {
        const a = ordersAnswer(p.orders);
        if (isLegal(s, d, a)) {
          advance(p);
          return { answer: a };
        }
        mem.plan = null;
      }
      return { answer: policy() };
    }
    case 'move': {
      const p = followed();
      if (p) {
        if (p.moves.length === 0) {
          // an Élan or a quick plan: the policy plays the moves, in the plan's style
          advance(p);
          return { answer: policy(p.style) };
        }
        if (p.next >= p.moves.length) return { answer: { kind: 'endMove' } };
        const a = p.moves[p.next];
        if (isLegal(s, d, a)) {
          p.next++;
          advance(p);
          return { answer: a };
        }
        mem.plan = null;
      }
      return { answer: policy() };
    }
    case 'battle': {
      const ctx = makeCtx(me, W, NEUTRAL_W, rand, cfg, scale, det, det ? null : now, s, true);
      const a = decideBattle(s, ctx);
      let say: string | undefined;
      if (a.kind === 'attack') {
        const u = unitById(s, a.unit);
        const t = u ? battleTargets(s, a.unit).find((x) => x.hex === a.target) : undefined;
        if (u && t && t.kind === 'melee' && statsOf(s, u).arm === 'cavalry') say = speak(s, me, P, mem, rand, 'charge', { unit: unitName(s, u.id) });
      }
      return { answer: a, say, sims: ctx.budget.nodes };
    }
    case 'defend': {
      const a = policy();
      const say = a.kind === 'defend' && a.choice === 'formSquare' ? speak(s, me, P, mem, rand, 'squareFormed', { unit: unitName(s, d.target) }) : undefined;
      return { answer: a, say, sims: 0 };
    }
    case 'advance': {
      const a = policy();
      const say = a.kind === 'yesno' && a.yes && d.how === 'takeGround' ? speak(s, me, P, mem, rand, 'bigHit', { unit: unitName(s, d.unit) }) : undefined;
      return { answer: a, say };
    }
    case 'retreat': {
      const a = policy();
      const o = a.kind === 'choose' ? d.options[a.index] : undefined;
      const say = o && o.losses > 0 ? speak(s, me, P, mem, rand, 'unitLost', { unit: unitName(s, d.unit) }) : undefined;
      return { answer: a, say };
    }
    case 'leaderRetreat': {
      const a = policy();
      const o = a.kind === 'choose' ? d.options[a.index] : undefined;
      const say = o?.eliminated ? speak(s, me, P, mem, rand, 'leaderLost', {}) : undefined;
      return { answer: a, say };
    }
    default:
      return { answer: policy() };
  }
}

/** Choose an answer for `decision` (decision.side === opts.side). Always returns a legal answer when one exists. */
export function chooseAnswer(state: GameState, decision: Decision, opts: AiOptions, mem: AiMemory): { answer: Answer; say?: string } {
  const timed = !opts.deterministic; // deterministic mode never reads a clock, not even to record the time taken
  const t0 = timed ? now() : 0;
  if (!mem.rngState) mem.rngState = (opts.seed ?? entropySeed()) >>> 0 || 1;
  const rand = new Rng(mem.rngState);
  let out: Outcome;
  try {
    out = decide(state, decision, opts, mem, rand);
    if (!isLegal(state, decision, out.answer)) {
      if (typeof console !== 'undefined') console.error('AI error: illegal answer replaced by a fallback', decision.kind, JSON.stringify(out.answer));
      mem.fallbacks++;
      mem.plan = null;
      out = { answer: randomAnswer(state, decision, () => rand.next()) };
    }
  } catch (e) {
    if (typeof console !== 'undefined') console.error('AI error', e);
    mem.fallbacks++;
    mem.plan = null;
    out = { answer: randomAnswer(state, decision, () => rand.next()) };
  } finally {
    mem.rngState = rand.state; // saved even when the fallback throws, so a retry does not repeat the same draws
  }
  mem.last = { kind: decision.kind, ms: timed ? now() - t0 : 0, sims: out.sims ?? 0, ...(out.plan ? { plan: out.plan } : {}) };
  return out.say !== undefined ? { answer: out.answer, say: out.say } : { answer: out.answer };
}

/** Card title helper for logs. */
export function cardTitle(kind: CardKind): string {
  return CARD_DEFS[kind].title;
}

