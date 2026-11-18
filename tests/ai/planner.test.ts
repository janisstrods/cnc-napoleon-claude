// The turn planner and the battle rollouts (src/ai/planner.ts, Plan 5 Task 8): one node budget for plan building, move scoring,
// simulations and rollouts; deterministic mode never reads a clock; the plans are legal and blind to hidden information.
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CARD_LIST, GameDriver, answerError, cardKind, cloneState, createGame, forceDice, forcedDiceLeft, moveFirstOptions, other, unitById,
  type Answer, type CardKind, type Decision, type GameState, type Side,
} from '../../src/engine';
import { SCENARIOS } from '../../src/scenarios';
import * as cardsense from '../../src/ai/cardsense';
import { keepValue } from '../../src/ai/cardsense';
import { quickCardScore } from '../../src/ai/ordering';
import * as sim from '../../src/ai/sim';
import * as evaluateModule from '../../src/ai/evaluate';
import { isDeterminised } from '../../src/ai/view';
import { greedyBattle } from '../../src/ai/policies';
import { LEVELS, decideBattle, makeCtx, planTurn, type LevelCfg, type PlanCtx, type TurnPlan } from '../../src/ai/planner';
import { Rng } from '../../src/ai/rand';
import { NEUTRAL_W, type Weights } from '../../src/ai/values';
import { build, must, toBattle, type Pos } from '../rules/helpers';
import { failOnAiErrors } from './no-ai-errors';

failOnAiErrors();

const realEvaluate = evaluateModule.evaluate;

afterEach(() => forceDice([]));

type Units = NonNullable<Pos['units']>;
const top = (key: Units[number]['key'], at: [number, number], extra: object = {}) => ({ side: 'top' as const, key, at, ...extra });
const bot = (key: Units[number]['key'], at: [number, number], extra: object = {}) => ({ side: 'bottom' as const, key, at, ...extra });
const W = NEUTRAL_W;
const ME: Side = 'bottom';
const LEVEL_IDS = [0, 1, 2] as const;
const noClock = (): number => {
  throw new Error('clock read');
};

/** A hand of exactly these cards' kinds, in this order (each swaps with the card it displaces, in the hand or the deck). */
function holding(s: GameState, side: Side, kinds: CardKind[]): number[] {
  const hand = s.players[side].hand;
  const foe = s.players[other(side)].hand;
  const ids: number[] = [];
  kinds.forEach((k, i) => {
    const id = CARD_LIST.map((c, x) => (c === k && !ids.includes(x) && !foe.includes(x) ? x : -1)).filter((x) => x >= 0)
      .find((x) => hand.indexOf(x) >= i || s.deck.includes(x))!;
    const p = hand.indexOf(id);
    if (p >= 0) [hand[i], hand[p]] = [hand[p], hand[i]];
    else {
      const at = s.deck.indexOf(id);
      [hand[i], s.deck[at]] = [s.deck[at], hand[i]];
    }
    ids.push(id);
  });
  return ids;
}

/** No First Strike in either hand (no defend decisions to muddy the comparisons). */
function noFS(s: GameState): void {
  for (const side of ['top', 'bottom'] as const) {
    const hand = s.players[side].hand;
    for (let i = 0; i < hand.length; i++) {
      if (CARD_LIST[hand[i]] !== 'firstStrike') continue;
      const j = s.deck.findIndex((c) => CARD_LIST[c] !== 'firstStrike');
      [hand[i], s.deck[j]] = [s.deck[j], hand[i]];
    }
  }
}

/**
 * The kit: one banner to win; our full BR/LN stands next to a 1-block FR/GR in the centre. Only the Centre card orders it
 * (the other four cards are for empty sections), so the winning melee needs `attackC`.
 */
function winKit(): { s: GameState; ids: number[] } {
  const s = build({ banners: 1, units: [bot('BR/LN', [5, 6]), top('FR/GR', [4, 6], { blocks: 1 }), top('FR/LN', [1, 2])] });
  const ids = holding(s, ME, ['attackL', 'attackR', 'attackC', 'probeL', 'probeR']);
  noFS(s);
  return { s, ids };
}

const cfgOf = (level: 0 | 1 | 2, over: Partial<LevelCfg> = {}): LevelCfg => ({ ...LEVELS[level], ...over });

function ctxOf(root: GameState, level: 0 | 1 | 2, o: { seed?: number; scale?: number; over?: Partial<LevelCfg>; W?: Weights; battle?: boolean; clock?: (() => number) | null; det?: boolean } = {}): PlanCtx {
  const det = o.det ?? true;
  return makeCtx(ME, o.W ?? W, W, new Rng(o.seed ?? 1), cfgOf(level, o.over), o.scale ?? 0.02, det, o.clock ?? null, root, o.battle ?? false);
}

/** Replay a plan through the engine on a copy of `root`: the card, the orders, then each move; every answer must be legal. */
function replay(root: GameState, plan: TurnPlan): GameDriver {
  const d = new GameDriver(cloneState(root));
  const step = (a: Answer): void => {
    expect(d.pending, `a decision for ${JSON.stringify(a)}`).not.toBeNull();
    expect(answerError(d.state, d.pending!, a), JSON.stringify(a)).toBeNull();
    must(d, a);
  };
  step({ kind: 'playCard', card: plan.card });
  if (d.pending?.kind === 'orders') {
    expect(plan.orders, 'the plan has orders for the orders decision').not.toBeNull();
    step(plan.orders!.single ? { kind: 'orders', pieces: plan.orders!.pieces, single: true } : { kind: 'orders', pieces: plan.orders!.pieces });
  }
  for (const m of plan.moves) {
    expect(d.pending?.kind).toBe('move');
    step(m);
  }
  return d;
}

describe('planTurn', () => {
  it('with a winning melee available, every level plays the card that orders it', () => {
    for (const level of LEVEL_IDS) {
      for (const seed of [1, 2]) {
        const { s, ids } = winKit();
        const plan = planTurn(s, ctxOf(s, level, { seed, scale: 0.05, over: { hastyShare: 0 } }));
        expect(plan.card, `level ${level} seed ${seed}: ${plan.label}`).toBe(ids[2]);
        expect(plan.orders?.pieces).toEqual(['u1']);
      }
    }
  });

  it('the same seed gives the same plan; a different seed may differ at level 0 only through noise', () => {
    for (const level of LEVEL_IDS) {
      const a = winKit();
      const b = winKit();
      expect(planTurn(a.s, ctxOf(a.s, level, { seed: 9 }))).toEqual(planTurn(b.s, ctxOf(b.s, level, { seed: 9 })));
    }
    // the noiseless levels pick the same card whatever the seed; level 0 does too once its noise, softmax and hasty turns are off
    const cards = (level: 0 | 1 | 2, over: Partial<LevelCfg> = {}): Set<number> =>
      new Set([3, 4, 5, 6].map((seed) => {
        const { s } = winKit();
        return planTurn(s, ctxOf(s, level, { seed, over })).card;
      }));
    expect(cards(1).size).toBe(1);
    expect(cards(2).size).toBe(1);
    expect(cards(0, { evalNoise: 0, pickTemp: 0, hastyShare: 0 }).size).toBe(1);
  });

  it('deterministic mode never reads a clock', () => {
    for (const level of LEVEL_IDS) {
      const { s } = winKit();
      const ctx = ctxOf(s, level, { clock: noClock, scale: 0.02 });
      expect(ctx.budget.clock).toBeNull();
      expect(ctx.budget.deadline).toBeNull();
      const plan = planTurn(s, ctx);
      expect(answerError(s, { kind: 'playCard', side: ME }, { kind: 'playCard', card: plan.card })).toBeNull();
      const b = battleKit();
      const bctx = makeCtx(ME, W, W, new Rng(3), LEVELS[level], 0.02, true, noClock, b.d.state, true);
      const a = decideBattle(b.d.state, bctx);
      expect(answerError(b.d.state, b.d.pending!, a)).toBeNull();
    }
  });

  it('deterministic mode spends at most its node budget; the floor gives every card k0 samples even at budgetScale 0.01', () => {
    for (const level of LEVEL_IDS) {
      const { s } = winKit();
      const cfg = cfgOf(level, { hastyShare: 0 });
      const ctx = ctxOf(s, level, { scale: 0.01, over: { hastyShare: 0 } });
      const floor = 5 * cfg.k0;
      expect(ctx.budget.maxNodes).toBe(Math.max(Math.round(cfg.maxSims * 0.01), floor));
      const plan = planTurn(s, ctx);
      expect(ctx.budget.nodes).toBeLessThanOrEqual(ctx.budget.maxNodes);
      // five distinct cards, each sampled k0 times
      const byCard = new Map<number, number>();
      for (const c of plan.cands ?? []) byCard.set(c.card, (byCard.get(c.card) ?? 0) + c.n);
      expect(byCard.size).toBe(5);
      for (const [card, n] of byCard) expect(n, `card ${CARD_LIST[card]}`).toBeGreaterThanOrEqual(cfg.k0);
      expect(plan.sims).toBeGreaterThanOrEqual(floor);
    }
  });

  it('plan building counts against the node budget', () => {
    // a budget of 10 nodes (5 cards × k0 2): the screening samples take all ten, plan building takes nothing beyond them
    const { s } = winKit();
    const ctx = ctxOf(s, 1, { scale: 1, over: { maxSims: 10, k0: 2 } });
    expect(ctx.budget.maxNodes).toBe(10);
    const plan = planTurn(s, ctx);
    expect(ctx.budget.nodes).toBeLessThanOrEqual(10);
    replay(s, plan);
    // with room to spare, scoring the moves of the plans charges nodes of its own (beyond the samples)
    const big = winKit();
    const ctx2 = ctxOf(big.s, 1, { scale: 1, over: { maxSims: 120, k0: 2, kMax: 2, topUp: 0 } });
    const plan2 = planTurn(big.s, ctx2);
    expect(ctx2.budget.nodes).toBeLessThanOrEqual(120);
    expect(ctx2.budget.nodes - plan2.sims).toBeGreaterThan(0);
  });

  it('stops at the deadline under an injected slow clock and returns a legal plan', () => {
    let t = 0;
    let reads = 0;
    const slow = (): number => {
      reads++;
      return (t += 50);
    };
    const { s } = winKit();
    const ctx = makeCtx(ME, W, W, new Rng(4), LEVELS[2], 0.1, false, slow, s);
    expect(ctx.budget.deadline).not.toBeNull();
    const plan = planTurn(s, ctx);
    expect(reads).toBeGreaterThan(1);
    // the deadline (200 ms of slow clock: four readings) stopped it long before the node cap
    expect(ctx.budget.nodes).toBeLessThan(ctx.budget.maxNodes / 2);
    replay(s, plan);
  });

  it('runs no simulation while forced dice are queued (sims === 0, forcedDiceLeft unchanged)', () => {
    const { s } = winKit();
    forceDice(['infantry', 'sabre', 'flag']);
    const before = forcedDiceLeft();
    const ctx = ctxOf(s, 2);
    const plan = planTurn(s, ctx);
    expect(plan.sims).toBe(0);
    expect(forcedDiceLeft()).toBe(before);
    expect(answerError(s, { kind: 'playCard', side: ME }, { kind: 'playCard', card: plan.card })).toBeNull();
    const b = battleKit();
    forceDice(['infantry', 'sabre', 'flag']);
    const bctx = makeCtx(ME, W, W, new Rng(3), LEVELS[2], 0.1, true, null, b.d.state, true);
    const a = decideBattle(b.d.state, bctx);
    expect(answerError(b.d.state, b.d.pending!, a)).toBeNull();
    expect(bctx.budget.nodes).toBe(0);
    expect(forcedDiceLeft()).toBe(3);
  });

  it('level 0 takes about hastyShare of its turns without simulation; levels 1-2 never do', () => {
    const hasty = (level: 0 | 1 | 2): number =>
      [...Array(20).keys()].filter((seed) => {
        const { s } = winKit();
        const plan = planTurn(s, ctxOf(s, level, { seed: seed + 1, scale: 0.01 }));
        return plan.sims === 0 && plan.label.includes('hasty');
      }).length;
    const n0 = hasty(0);
    expect(n0).toBeGreaterThan(0);
    expect(n0).toBeLessThan(20);
    expect(hasty(1)).toBe(0);
    expect(hasty(2)).toBe(0);
  });

  it('subtracts keep value: with two equal plays, it spends the cheaper card', () => {
    // two units, both in the centre; Probe and Assault order the same two, the Scouts order nothing (empty flanks)
    const s = build({
      cards: 4,
      units: [bot('BR/LN', [6, 5]), bot('BR/LN', [6, 7]), top('FR/LN', [4, 5], { blocks: 2 }), top('FR/LN', [4, 7], { blocks: 2 }), top('FR/LN', [1, 1])],
    });
    const [probe, assault] = holding(s, ME, ['probeC', 'assaultC', 'scoutL', 'scoutR']);
    noFS(s);
    expect(keepValue(s, ME, assault, W)).toBeGreaterThan(keepValue(s, ME, probe, W));
    const plan = planTurn(s, ctxOf(s, 1, { scale: 0.05 }));
    expect(plan.card, plan.label).toBe(probe);
    // the two plays are the same orders and moves, so under common seeds their samples are equal: the keep value decides
    const of = (card: number) => (plan.cands ?? []).filter((c) => c.card === card && c.n > 0).sort((a, b) => b.n - a.n)[0];
    const p = of(probe);
    const q = of(assault);
    expect(p.mean).toBeCloseTo(q.mean, 9);
    expect(p.score - q.score).toBeCloseTo(keepValue(s, ME, assault, W) - keepValue(s, ME, probe, W), 9);
  });

  it('samples are played on determinised clones and judged with a determinised context', () => {
    const { s } = winKit();
    // the final judgement of a sample: a finished turn on a determinised clone (move scoring evaluates unfinished ones)
    const seen: { det: boolean; ecDet: boolean | undefined }[] = [];
    const spy = vi.spyOn(evaluateModule, 'evaluate').mockImplementation((st, me, w, ec) => {
      if (st.turn.phase === 'done' || st.winner) seen.push({ det: isDeterminised(st), ecDet: ec?.determinised });
      return realEvaluate(st, me, w, ec);
    });
    try {
      const plan = planTurn(s, ctxOf(s, 1, { scale: 0.05 }));
      expect(seen.length).toBe(plan.sims);
      expect(seen.every((x) => x.det && x.ecDet === true)).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });

  it('the plan answers stay legal when replayed through the engine in order', () => {
    // a wider position with moves to make: several units out of reach of the enemy
    for (const level of LEVEL_IDS) {
      const s = build({
        units: [bot('BR/LN', [8, 4]), bot('BR/LN', [8, 6]), bot('BR/LC', [8, 8]), bot('BR/FA', [7, 6]), top('FR/LN', [2, 4]), top('FR/LN', [2, 7]), top('FR/HC', [1, 9])],
      });
      noFS(s);
      const plan = planTurn(s, ctxOf(s, level, { scale: 0.05, over: { hastyShare: 0 } }));
      const d = replay(s, plan);
      expect(['move', 'battle', 'playCard'].includes(d.pending?.kind ?? 'none') || d.pending === null).toBe(true);
    }
  });

  it('plans never read hidden information: the same plan for re-dealt opponent hand, track, deck and rng', () => {
    const make = (): GameState => {
      const s = build({ units: [bot('BR/LN', [6, 5]), bot('BR/LN', [6, 7]), bot('BR/HC', [7, 9]), top('FR/LN', [4, 5], { blocks: 2 }), top('FR/LN', [4, 7]), top('FR/HC', [3, 9])] });
      // the opponent's second unit stands in square: a card of its track is hidden too
      s.units[4].square = 1;
      s.players.top.squareTrack[0] = s.deck.shift()!;
      return s;
    };
    const redeal = (s: GameState, seed: number): GameState => {
      const c = cloneState(s);
      const opp = c.players.top;
      const pool = [...opp.hand, ...c.deck, ...opp.squareTrack.filter((x): x is number => x !== null)];
      new Rng(seed).shuffle(pool);
      const n = opp.hand.length;
      opp.hand = pool.slice(0, n);
      opp.squareTrack = opp.squareTrack.map((x) => (x === null ? null : pool[n]));
      c.deck = pool.slice(n + 1);
      c.rng = 1000 + seed;
      c.rngCalls = seed;
      return c;
    };
    for (const level of LEVEL_IDS) {
      const s = make();
      const plan = planTurn(s, ctxOf(s, level, { seed: 5, scale: 0.03 }));
      for (const seed of [1, 2]) {
        const r = redeal(s, seed);
        expect(r.players.top.hand).not.toEqual(s.players.top.hand);
        expect(planTurn(r, ctxOf(r, level, { seed: 5, scale: 0.03 })), `level ${level} re-deal ${seed}`).toEqual(plan);
      }
    }
  });
});

/**
 * Our 1-block BR/LN next to a full FR/GR, ordered by the Centre card and at its battle decision; one banner wins, so losing the
 * unit to the battle back loses the game (the melee's one die cannot eliminate the Guard).
 */
function battleKit(): { d: GameDriver } {
  const s = build({ banners: 1, units: [bot('BR/LN', [5, 6], { blocks: 1 }), top('FR/GR', [4, 6]), top('FR/LN', [1, 2])] });
  noFS(s);
  const d = toBattle(s, 'attackC', ['u1']);
  expect(d.pending?.kind).toBe('battle');
  return { d };
}

describe('decideBattle', () => {
  it('battle rollouts are counted in sims and capped at maxSims × 0.3 in deterministic mode', () => {
    const { d } = battleKit();
    const s = d.state;
    const cfg = LEVELS[2];
    // an odd cap (35): whole rounds of the two candidates (the melee and ending the phase) must stop one node short of it
    const ctx = makeCtx(ME, W, W, new Rng(2), cfg, 0.023, true, null, s, true);
    const cap = Math.round(Math.max(Math.round(cfg.maxSims * 0.023), s.players[ME].hand.length * cfg.k0) * 0.3);
    expect(ctx.budget.maxNodes).toBe(cap);
    expect(cap % 2).toBe(1);
    const a = decideBattle(s, ctx);
    expect(answerError(s, d.pending!, a)).toBeNull();
    expect(ctx.budget.nodes).toBeGreaterThan(0);
    expect(ctx.budget.nodes).toBeLessThanOrEqual(cap);
    // the rollouts wanted (32 rounds of each candidate) are more than the cap: it is the cap that stopped them
    expect(cfg.battleRollouts * 2).toBeGreaterThan(cap);
    expect(ctx.budget.nodes).toBe(cap - 1);
  });

  it('decideBattle rolls out at levels 1-2 and declines a melee whose rollout mean is below ending the phase', () => {
    // a reckless threshold: the greedy policy would make the hopeless melee
    const reckless: Weights = { ...W, attackThreshold: -10 };
    const { d } = battleKit();
    const dec = d.pending as Extract<Decision, { kind: 'battle' }>;
    expect(greedyBattle(d.state, dec, reckless).kind).toBe('attack');
    for (const level of [1, 2] as const) {
      const ctx = makeCtx(ME, reckless, W, new Rng(7), LEVELS[level], 0.2, true, null, d.state, true);
      const a = decideBattle(d.state, ctx);
      expect(a, `level ${level}`).toEqual({ kind: 'endBattle' });
      expect(ctx.budget.nodes).toBeGreaterThan(0);
    }
    // level 0 has no rollouts: it follows the (noisy) greedy estimate
    const ctx0 = makeCtx(ME, reckless, W, new Rng(7), { ...LEVELS[0], battleNoise: 0 }, 0.2, true, null, d.state, true);
    expect(decideBattle(d.state, ctx0).kind).toBe('attack');
    expect(ctx0.budget.nodes).toBe(0);
  });
});


// ---------------------------------------------------------------------------------------------------------------------
// Review round 1

/** A wider position with moves to make (several units out of the enemy's reach). */
function wideKit(): GameState {
  const s = build({
    units: [bot('BR/LN', [8, 4]), bot('BR/LN', [8, 6]), bot('BR/LC', [8, 8]), bot('BR/FA', [7, 6]), top('FR/LN', [2, 4]), top('FR/LN', [2, 7]), top('FR/HC', [1, 9])],
  });
  noFS(s);
  return s;
}

/** The keep-value kit: Probe and Assault order the same two centre units; the Scouts order nothing. */
function keepKit(): { s: GameState; probe: number; assault: number } {
  const s = build({
    cards: 4,
    units: [bot('BR/LN', [6, 5]), bot('BR/LN', [6, 7]), top('FR/LN', [4, 5], { blocks: 2 }), top('FR/LN', [4, 7], { blocks: 2 }), top('FR/LN', [1, 1])],
  });
  const [probe, assault] = holding(s, ME, ['probeC', 'assaultC', 'scoutL', 'scoutR']);
  noFS(s);
  return { s, probe, assault };
}

describe('planTurn (review round 1)', () => {
  it('widening never builds a plan it cannot sample: every plan built gets k0 samples, within the node cap (tight marshal budget)', () => {
    let widened = 0;
    for (const scale of [0.02, 0.03, 0.05]) {
      const s = wideKit();
      const ctx = ctxOf(s, 2, { scale });
      const plan = planTurn(s, ctx);
      expect(ctx.budget.nodes).toBeLessThanOrEqual(ctx.budget.maxNodes);
      const cands = plan.cands ?? [];
      widened += cands.length - new Set(s.players[ME].hand.map(cardKind)).size;
      for (const c of cands) expect(c.n, `${c.label} at scale ${scale}`).toBeGreaterThanOrEqual(LEVELS[2].k0);
    }
    expect(widened, 'some widening happened').toBeGreaterThan(0);
  });

  it('the samples replay the stored moves: a melee three hexes off is won by moving first', () => {
    // our light cavalry (no fire) three hexes from a 1-block Guard, one banner to win: the plan must ride up to it, then charge
    const s = build({ banners: 1, units: [bot('BR/LC', [7, 6]), top('FR/GR', [4, 6], { blocks: 1 }), top('FR/LN', [1, 2])] });
    const ids = holding(s, ME, ['attackL', 'attackR', 'attackC', 'probeL', 'probeR']);
    noFS(s);
    const plan = planTurn(s, ctxOf(s, 1, { scale: 0.05 }));
    expect(plan.card).toBe(ids[2]);
    expect(plan.moves.length).toBeGreaterThan(0);
    const won = (plan.cands ?? []).filter((c) => c.card === ids[2] && c.n > 0).map((c) => c.mean);
    // the moving plan's samples win most of the time (a plan whose moves were not replayed could never fight)
    expect(Math.max(...won)).toBeGreaterThan(50);
  });

  it('level 0 noise changes the pick across seeds on a near tie; without noise the pick is fixed', () => {
    const picks = (over: Partial<LevelCfg>): Set<number> =>
      new Set([...Array(12).keys()].map((i) => {
        const { s } = keepKit();
        return planTurn(s, ctxOf(s, 0, { seed: i + 1, scale: 0.05, over: { hastyShare: 0, ...over } })).card;
      }));
    expect(picks({}).size).toBeGreaterThan(1);
    expect(picks({ evalNoise: 0, pickTemp: 0 }).size).toBe(1);
  });

  it('the hand-floor penalty is subtracted from every sample', () => {
    const { s } = keepKit();
    const run = (pen: number): Map<string, { n: number; mean: number }> => {
      const spy = vi.spyOn(cardsense, 'handFloorPenalty').mockReturnValue(pen);
      try {
        const plan = planTurn(cloneState(s), ctxOf(s, 1, { seed: 3, scale: 0.05 }));
        return new Map((plan.cands ?? []).map((c) => [c.label, { n: c.n, mean: c.mean }]));
      } finally {
        spy.mockRestore();
      }
    };
    const none = run(0);
    const five = run(5);
    expect(five.size).toBe(none.size);
    for (const [label, c] of none) {
      if (c.n === 0) continue;
      expect(five.get(label)!.n).toBe(c.n);
      expect(five.get(label)!.mean, label).toBeCloseTo(c.mean - 5, 9);
    }
  });

  it('a deadline cut: screened cards keep their partial means, unscreened ones their quick score on the evaluation scale', () => {
    // the clock jumps past the deadline at a later check (the budget reads it at 0 charges, then every 16): the screening is cut
    let branches = 0;
    let cuts = 0;
    const kits: (() => GameState)[] = [() => winKit().s, () => keepKit().s, wideKit];
    for (const make of kits) {
      for (const [level, after] of [[1, 1], [1, 2], [2, 1], [2, 2], [2, 3]] as const) {
        let reads = 0;
        const jump = (): number => (reads++ <= after ? 0 : 1e9);
        const s = make();
        const ctx = makeCtx(ME, W, W, new Rng(2), { ...LEVELS[level], hastyShare: 0 }, 1, false, jump, s);
        const plan = planTurn(s, ctx);
        const sampled = new Set((plan.cands ?? []).filter((c) => c.n > 0).map((c) => cardKind(c.card)));
        const kinds = [...new Set(s.players[ME].hand.map(cardKind))];
        const unscreened = kinds.filter((k) => !sampled.has(k));
        if (!unscreened.length) continue;
        cuts++;
        if (!sampled.size) {
          expect(plan.label).toContain('quick');
          continue;
        }
        // the rule: the best screened score against the root evaluation plus the best unscreened quick score
        const best = Math.max(...(plan.cands ?? []).filter((c) => c.n > 0).map((c) => c.score));
        const q = (k: CardKind): number => {
          const card = s.players[ME].hand.find((c) => cardKind(c) === k)!;
          return quickCardScore(s, ME, card, W, ctx.ec) - keepValue(s, ME, card, W);
        };
        const top = [...unscreened].sort((a, b) => q(b) - q(a))[0];
        const est = realEvaluate(s, ME, W, ctx.ec) + q(top);
        if (est > best) {
          branches++;
          expect(cardKind(plan.card)).toBe(top);
          expect(plan.label).toContain('unscreened');
          expect(plan.score).toBeCloseTo(est, 9);
        } else {
          expect(plan.label).not.toContain('unscreened');
          expect(plan.score).toBeCloseTo(best, 9);
        }
      }
    }
    expect(cuts, 'some cut left a card unscreened').toBeGreaterThan(0);
    expect(branches, 'some kit takes the unscreened card').toBeGreaterThan(0);
  });

  it('battle 116: the first turn plays the opening card committed to move first', () => {
    const info = SCENARIOS.find((x) => x.id === '116')!;
    let tested = 0;
    for (let seed = 1; seed <= 30 && tested < 2; seed++) {
      // commit, for each side, the option the planner likes least (by quick score), so the binding must override it
      const d = new GameDriver(createGame(info.setup, seed));
      while (d.pending?.kind === 'moveFirst') {
        const side = d.pending.side;
        const st = d.state;
        const ec0 = makeCtx(side, W, W, new Rng(1), LEVELS[0], 0.01, true, null, st).ec;
        const worst = [...moveFirstOptions(st, side)].sort((a, b) => quickCardScore(st, side, a, W, ec0) - quickCardScore(st, side, b, W, ec0) || a - b)[0];
        must(d, { kind: 'playCard', card: worst });
      }
      if (d.pending?.kind !== 'playCard') continue;
      const s = cloneState(d.state);
      const me = s.active;
      const committed = s.special.moveFirst?.committed[me] ?? null;
      if (committed === null) continue;
      // the same position unbound: the planner would play another card
      const free = cloneState(s);
      free.special.moveFirst!.committed[me] = null;
      const unbound = planTurn(free, makeCtx(me, W, W, new Rng(4), { ...LEVELS[1], hastyShare: 0 }, 0.02, true, null, free));
      if (cardKind(unbound.card) === cardKind(committed)) continue;
      const plan = planTurn(s, makeCtx(me, W, W, new Rng(4), { ...LEVELS[1], hastyShare: 0 }, 0.02, true, null, s));
      expect(plan.card).toBe(committed);
      expect(answerError(s, { kind: 'playCard', side: me }, { kind: 'playCard', card: plan.card })).toBeNull();
      // the paths without simulation (a hasty turn, forced dice) are bound too
      const hasty = planTurn(s, makeCtx(me, W, W, new Rng(4), { ...LEVELS[0], hastyShare: 1 }, 0.02, true, null, s));
      expect(hasty.label).toContain('hasty');
      expect(hasty.card).toBe(committed);
      forceDice(['sabre']);
      const forced = planTurn(s, makeCtx(me, W, W, new Rng(4), LEVELS[2], 0.02, true, null, s));
      forceDice([]);
      expect(forced.card).toBe(committed);
      tested++;
    }
    expect(tested).toBeGreaterThan(0);
  });

  it('an Élan plan names the movement style its moves are to be planned in', () => {
    const s = build({ units: [bot('BR/LN', [5, 6]), bot('BR/LN', [5, 5]), top('FR/LN', [4, 6], { blocks: 1 }), top('FR/LN', [4, 5], { blocks: 1 }), top('FR/LN', [1, 1])] });
    const [elan] = holding(s, ME, ['elan', 'scoutL', 'scoutR', 'probeL', 'probeR']);
    noFS(s);
    const plan = planTurn(s, ctxOf(s, 1, { scale: 0.05 }));
    expect(plan.card).toBe(elan);
    expect(plan.moves).toEqual([]);
    expect(['base', 'hold', 'bold', 'safe', 'noisy']).toContain(plan.style);
    const keepPlan = planTurn(keepKit().s, ctxOf(keepKit().s, 1, { scale: 0.05 }));
    expect(keepPlan.style).toBeUndefined();
  });
});

describe('planTurn and decideBattle (Task 9 carries)', () => {
  /** The movement style a candidate's label names (`elan [] hold`, `elan [] bold o1`, `elan [] var3` = a perturbed noisy plan). */
  const styleOfLabel = (label: string): string => {
    const tag = label.slice(label.indexOf('] ') + 2);
    return tag.startsWith('var') ? 'noisy' : tag.split(' ')[0];
  };

  it('an Élan plan\'s style is the style of the winning online candidate, with units two or more hexes from the enemy', () => {
    // Élan against four plain cards; both our lines stand three hexes behind two worn enemy units, where the styles score differently
    const styles = new Set<string>();
    for (const [level, seed] of [[1, 1], [1, 2], [1, 3], [2, 1], [2, 2], [2, 3]] as const) {
      const s = build({ units: [bot('BR/LN', [7, 6]), bot('BR/LN', [7, 5]), top('FR/LN', [4, 6], { blocks: 1 }), top('FR/LN', [4, 5], { blocks: 1 }), top('FR/LN', [1, 1])] });
      const [elan] = holding(s, ME, ['elan', 'scoutL', 'scoutR', 'probeL', 'probeR']);
      noFS(s);
      const plan = planTurn(s, ctxOf(s, level, { seed, scale: 0.1 }));
      expect(plan.card, `level ${level} seed ${seed}`).toBe(elan);
      const winner = (plan.cands ?? []).find((c) => c.label === plan.label && c.n > 0)!;
      expect(winner, 'the winning candidate is among the diagnostics').toBeDefined();
      expect(plan.style, `level ${level} seed ${seed}: ${plan.label}`).toBe(styleOfLabel(winner.label));
      styles.add(plan.style!);
      // the styles did compete: more than one online candidate was sampled
      const online = (plan.cands ?? []).filter((c) => c.card === elan && c.n > 0);
      expect(new Set(online.map((c) => styleOfLabel(c.label))).size).toBeGreaterThan(1);
    }
    // and the winner is not always the default style (a plan that named 'base' regardless would pass the loop above only by luck)
    expect([...styles].some((x) => x !== 'base')).toBe(true);
  });

  it('decideBattle judges every rollout with the determinised judgement context (the root context would be refused)', () => {
    const d = battleKit().d;
    const s = d.state;
    const seen: { det: boolean; ecDet: boolean | undefined; hands: unknown }[] = [];
    const spy = vi.spyOn(evaluateModule, 'evaluate').mockImplementation((st, me, w, ec) => {
      if (st.turn.phase === 'done' || st.winner) seen.push({ det: isDeterminised(st), ecDet: ec?.determinised, hands: ec?.oppHands });
      return realEvaluate(st, me, w, ec);
    });
    try {
      const ctx = makeCtx(ME, W, W, new Rng(3), LEVELS[1], 0.2, true, null, s, true);
      decideBattle(s, ctx);
      expect(seen.length).toBeGreaterThan(0);
      expect(seen.every((x) => x.det && x.ecDet === true && x.hands === undefined)).toBe(true);
      // the root context (ctx.ec) is not determinised: it is the judgement of live positions only
      expect(ctx.ec.determinised).not.toBe(true);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('decideBattle (review round 1)', () => {
  /** Two of our units, each with a target: a sure kill of a worn unit and a poor fire at a full one; five banners to win. */
  function twoAttacks(): GameDriver {
    const s = build({
      banners: 5,
      units: [bot('BR/LN', [5, 6]), bot('BR/LN', [5, 5]), top('FR/LN', [4, 7], { blocks: 1 }), top('FR/GR', [4, 5]), top('FR/LN', [1, 10])],
    });
    noFS(s);
    const d = toBattle(s, 'attackC', ['u1', 'u2']);
    expect(d.pending?.kind).toBe('battle');
    return d;
  }

  it('ranks the attacks by estimate and rolls out the best against ending, without extra rounds away from a match point', () => {
    const d = twoAttacks();
    const s = d.state;
    const cfg: LevelCfg = { ...LEVELS[1], battleCands: 1 };
    const ctx = makeCtx(ME, W, W, new Rng(5), cfg, 1, true, null, s, true);
    const a = decideBattle(s, ctx);
    expect(a).toMatchObject({ kind: 'attack', target: unitById(s, 'u3')!.hex });
    // one attack and ending the phase, battleRollouts rounds each, and no game-deciding extra rounds
    expect(ctx.budget.nodes).toBe(cfg.battleRollouts * 2);
  });

  it('rolls every candidate of a round out under the same seed (common random numbers)', () => {
    const d = twoAttacks();
    const s = d.state;
    const seeds: number[] = [];
    const real = sim.runTurn;
    const spy = vi.spyOn(sim, 'runTurn').mockImplementation((st, p, r, b) => {
      seeds.push(st.rng); // determinize gave the clone its game seed from the round's generator
      return real(st, p, r, b);
    });
    try {
      const ctx = makeCtx(ME, W, W, new Rng(5), { ...LEVELS[1], battleRollouts: 6 }, 1, true, null, s, true);
      decideBattle(s, ctx);
    } finally {
      spy.mockRestore();
    }
    const per = seeds.length / 6;
    expect(Number.isInteger(per) && per >= 2).toBe(true);
    for (let r = 0; r < 6; r++) {
      const round = seeds.slice(r * per, (r + 1) * per);
      expect(new Set(round).size, `round ${r}`).toBe(1);
    }
    expect(new Set(seeds).size).toBe(6);
  });
});
