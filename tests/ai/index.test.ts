// chooseAnswer (src/ai/index.ts): the planner at the card decision, the stored plan followed for orders and moves, the battle by
// rollouts, every other kind by the fast policies; legal answers, no clock in deterministic mode, no hidden information.
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CARD_LIST, GameDriver, cloneState, createGame, forceDice, forcedDiceLeft, other, type Answer, type CardKind, type Decision, type GameState, type Side,
} from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { DIFFICULTIES, PERSONALITIES, chooseAnswer, isLegal, newMemory, planFingerprint, type AiMemory, type AiOptions } from '../../src/ai';
import * as moves from '../../src/ai/moves';
import * as planner from '../../src/ai/planner';
import * as sim from '../../src/ai/sim';
import { H, build, must, toBattle, type Pos } from '../rules/helpers';
import { detOpts } from './helpers';
import { failOnAiErrors } from './no-ai-errors';

failOnAiErrors();

afterEach(() => {
  forceDice([]);
  vi.restoreAllMocks();
});

type Units = NonNullable<Pos['units']>;
const top = (key: Units[number]['key'], at: [number, number], extra: object = {}) => ({ side: 'top' as const, key, at, ...extra });
const bot = (key: Units[number]['key'], at: [number, number], extra: object = {}) => ({ side: 'bottom' as const, key, at, ...extra });

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
 * Light cavalry three hexes from a worn Guard, one banner to win, a lone enemy leader behind: the winning plan rides up and charges,
 * so it holds stored moves. Returns the driver at the first playCard decision of the bottom side.
 */
function rideKit(withLeader = true): GameDriver {
  const s = build({
    banners: 1,
    units: [bot('BR/LC', [7, 6]), top('FR/GR', [4, 6], { blocks: 1 }), top('FR/LN', [1, 2])],
    leaders: withLeader ? [{ side: 'top', at: [1, 9] }] : [],
  });
  holding(s, 'bottom', ['attackL', 'attackR', 'attackC', 'probeL', 'probeR']);
  noFS(s);
  return new GameDriver(s);
}

const opts = (over: Partial<AiOptions> = {}): AiOptions => detOpts('bottom', 3, { difficulty: 'colonel', budgetScale: 0.05, ...over });

/** The plan decision: chooseAnswer at playCard, applied; then the orders decision, answered and applied. Returns the memory. */
function planned(d: GameDriver, o: AiOptions = opts()): AiMemory {
  const mem = newMemory();
  const r = chooseAnswer(d.state, d.pending!, o, mem);
  expect(r.answer.kind).toBe('playCard');
  must(d, r.answer);
  return mem;
}

describe('the stored plan', () => {
  it('follows the stored plan for orders and moves after the card decision', () => {
    const d = rideKit();
    const mem = planned(d);
    const plan = mem.plan!;
    expect(plan).not.toBeNull();
    expect(plan.moves.length).toBeGreaterThan(0);
    expect(plan.next).toBe(0);
    expect(d.pending?.kind).toBe('orders');
    const o = chooseAnswer(d.state, d.pending!, opts(), mem).answer;
    expect(o).toMatchObject({ kind: 'orders', pieces: plan.orders!.pieces });
    must(d, o);
    const stored = [...plan.moves];
    let i = 0;
    while (d.pending?.kind === 'move') {
      const a = chooseAnswer(d.state, d.pending, opts(), mem).answer;
      expect(a, `move ${i}`).toEqual(i < stored.length ? stored[i] : { kind: 'endMove' });
      must(d, a);
      i++;
    }
    // the engine ends the movement itself once every ordered piece has moved; otherwise the plan ends it
    expect(i).toBeGreaterThanOrEqual(stored.length);
    expect(mem.plan?.next).toBe(stored.length);
    expect(mem.fallbacks).toBe(0);
  });

  const drifts: [string, (s: GameState) => void][] = [
    ['a unit moves', (s) => { s.units.find((u) => u.id === 'u3')!.hex = H(2, 2); }],
    ['a unit loses a block', (s) => { s.units.find((u) => u.id === 'u3')!.blocks -= 1; }],
    ['a leader moves', (s) => { s.leaders.find((l) => l.side === 'top')!.hex = H(1, 10); }],
  ];
  for (const [what, drift] of drifts) {
    it(`a stored plan whose fingerprint differs is dropped and the policy answers (${what} between decisions)`, () => {
      const d = rideKit();
      const mem = planned(d);
      must(d, chooseAnswer(d.state, d.pending!, opts(), mem).answer);
      expect(d.pending?.kind).toBe('move');
      expect(mem.plan).not.toBeNull();
      const first = mem.plan!.moves[0];
      drift(d.state);
      // the answer of a memory that never had a plan: the policy's
      const policy = chooseAnswer(cloneState(d.state), d.pending!, opts(), newMemory()).answer;
      const a = chooseAnswer(d.state, d.pending!, opts(), mem).answer;
      expect(mem.plan).toBeNull();
      expect(a).toEqual(policy);
      expect(isLegal(d.state, d.pending!, a)).toBe(true);
      void first;
    });
  }

  it('the plan is dropped too when the turn changes under it (a stale plan never answers the next turn)', () => {
    const d = rideKit();
    const mem = planned(d);
    const stale = mem.plan!;
    const moved = cloneState(d.state);
    moved.turn.number += 2;
    const dec: Decision = { kind: 'move', side: 'bottom' };
    chooseAnswer(moved, dec, opts(), mem);
    expect(mem.plan).not.toBe(stale);
    expect(mem.plan).toBeNull();
  });

  it('the fingerprint ignores our own hand and includes leader hexes', () => {
    const d = rideKit();
    const s = d.state;
    const fp = planFingerprint(s);
    const c = cloneState(s);
    c.players.bottom.hand = c.players.bottom.hand.slice(1);
    c.deck.push(s.players.bottom.hand[0]);
    expect(planFingerprint(c)).toBe(fp);
    const l = cloneState(s);
    l.leaders.find((x) => x.side === 'top')!.hex = H(1, 10);
    expect(planFingerprint(l)).not.toBe(fp);
    const u = cloneState(s);
    u.units[0].hex = H(7, 7);
    expect(planFingerprint(u)).not.toBe(fp);
    const sq = cloneState(s);
    sq.units[1].square = 1;
    expect(planFingerprint(sq)).not.toBe(fp);
    const t = cloneState(s);
    t.turn.number += 1;
    expect(planFingerprint(t)).not.toBe(fp);
    // the order of the unit and leader lists does not matter
    const r = cloneState(s);
    r.units.reverse();
    expect(planFingerprint(r)).toBe(fp);
  });

  it('fresh memory at a move decision answers legally (worker fallback mid-turn)', () => {
    const d = rideKit();
    const mem = planned(d);
    must(d, chooseAnswer(d.state, d.pending!, opts(), mem).answer);
    expect(d.pending?.kind).toBe('move');
    for (const diff of DIFFICULTIES) {
      const m = newMemory();
      const a = chooseAnswer(d.state, d.pending!, opts({ difficulty: diff }), m).answer;
      expect(isLegal(d.state, d.pending!, a), diff).toBe(true);
      expect(m.fallbacks).toBe(0);
    }
    // and at orders, and at battle, on a memory that has never planned
    const e = rideKit();
    must(e, { kind: 'playCard', card: planned(rideKit()).plan!.card });
    expect(e.pending?.kind).toBe('orders');
    const m2 = newMemory();
    const oa = chooseAnswer(e.state, e.pending!, opts(), m2).answer;
    expect(isLegal(e.state, e.pending!, oa)).toBe(true);
    expect(m2.fallbacks).toBe(0);
  });

  it('an Élan plan has no stored moves: the live moves are planned in the plan\'s movement style', () => {
    const s = build({ units: [bot('BR/LN', [5, 6]), bot('BR/LN', [5, 5]), top('FR/LN', [4, 6], { blocks: 1 }), top('FR/LN', [4, 5], { blocks: 1 }), top('FR/LN', [1, 1])] });
    holding(s, 'bottom', ['elan', 'scoutL', 'scoutR', 'probeL', 'probeR']);
    noFS(s);
    const d = new GameDriver(s);
    const mem = planned(d);
    expect(mem.plan!.moves).toEqual([]);
    expect(mem.plan!.style).toBeDefined();
    // name a style the plan did not choose: the moves must follow the memory, not a default
    mem.plan!.style = mem.plan!.style === 'bold' ? 'safe' : 'bold';
    const want = mem.plan!.style;
    const seen: string[] = [];
    const real = moves.greedyMoveStep;
    vi.spyOn(moves, 'greedyMoveStep').mockImplementation((st, mc) => {
      seen.push(mc.style);
      return real(st, mc);
    });
    for (let i = 0; i < 8 && d.pending && d.pending.kind !== 'battle'; i++) {
      const a = chooseAnswer(d.state, d.pending, opts(), mem).answer;
      must(d, a);
    }
    expect(seen.length).toBeGreaterThan(0);
    expect(new Set(seen)).toEqual(new Set([want]));
  });
});

describe('dispatch', () => {
  /** A defend decision: our worn infantry attacked by cavalry, four cards to form square with. */
  function defendKit(): GameDriver {
    const d = toBattle(build({ first: 'top', bottomCards: 4, units: [top('FR/HC', [3, 6]), bot('BR/LN', [4, 6], { blocks: 2 })] }), 'attackC', ['u1']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    return d;
  }

  it('defend is answered on the fast path: no planner, no simulation, no rollout, whatever the level', () => {
    for (const diff of DIFFICULTIES) {
      const d = defendKit();
      expect(d.pending?.kind).toBe('defend');
      const plan = vi.spyOn(planner, 'planTurn');
      const battle = vi.spyOn(planner, 'decideBattle');
      const run = vi.spyOn(sim, 'runTurn');
      const mem = newMemory();
      const a = chooseAnswer(d.state, d.pending!, opts({ difficulty: diff, side: 'bottom' }), mem).answer;
      expect(isLegal(d.state, d.pending!, a)).toBe(true);
      expect(plan).not.toHaveBeenCalled();
      expect(battle).not.toHaveBeenCalled();
      expect(run).not.toHaveBeenCalled();
      expect(mem.last).toMatchObject({ kind: 'defend', sims: 0 });
      vi.restoreAllMocks();
    }
  });

  it('the battle decision is the planner\'s rollouts, with a battle share of the budget', () => {
    const s = build({ units: [bot('BR/LN', [5, 6]), top('FR/LN', [4, 6], { blocks: 1 }), top('FR/LN', [1, 1])] });
    noFS(s);
    const d = toBattle(s, 'attackC', ['u1']);
    expect(d.pending?.kind).toBe('battle');
    const mem = newMemory();
    const spy = vi.spyOn(planner, 'decideBattle');
    const a = chooseAnswer(d.state, d.pending!, opts({ difficulty: 'colonel', budgetScale: 0.5 }), mem).answer;
    expect(spy).toHaveBeenCalledTimes(1);
    expect(a).toEqual({ kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(mem.last!.sims).toBeGreaterThan(0);
    expect(mem.last!.sims).toBeLessThanOrEqual(Math.round(planner.LEVELS[1].maxSims * 0.5 * 0.3));
  });

  it('forced dice: no simulation and no rollout runs, and the forced dice are untouched', () => {
    const d = rideKit();
    forceDice(['infantry', 'flag', 'sabre']);
    const run = vi.spyOn(sim, 'runTurn');
    const step = vi.spyOn(sim, 'Stepper');
    const mem = newMemory();
    for (let i = 0; i < 12 && d.pending; i++) {
      const before = forcedDiceLeft();
      const a = chooseAnswer(d.state, d.pending, opts({ difficulty: 'marshal' }), mem).answer;
      expect(forcedDiceLeft()).toBe(before);
      must(d, a);
    }
    expect(run).not.toHaveBeenCalled();
    expect(step).not.toHaveBeenCalled();
    expect(mem.fallbacks).toBe(0);
  });

  it('deterministic mode never reads a clock, whatever the decision kind (a throwing clock)', () => {
    const boom = () => {
      throw new Error('a clock was read in deterministic mode');
    };
    const sc = scenarioById('000');
    for (const diff of DIFFICULTIES) {
      const d = new GameDriver(createGame(sc.setup, 11));
      const mems: Record<Side, AiMemory> = { top: newMemory(), bottom: newMemory() };
      const pn = vi.spyOn(performance, 'now').mockImplementation(boom);
      const dn = vi.spyOn(Date, 'now').mockImplementation(boom);
      try {
        let n = 0;
        while (d.pending && d.state.turn.number <= 5 && n++ < 400) {
          const side = d.pending.side;
          const o: AiOptions = { side, difficulty: diff, personality: PERSONALITIES[side === 'top' ? 7 : 0], seed: 5, budgetScale: 0.05, deterministic: true };
          const r = chooseAnswer(d.state, d.pending, o, mems[side]);
          expect(mems[side].last?.ms, 'no time is measured').toBe(0);
          must(d, r.answer);
        }
        expect(n).toBeGreaterThan(10);
      } finally {
        pn.mockRestore();
        dn.mockRestore();
      }
      expect(mems.top.fallbacks).toBe(0);
      expect(mems.bottom.fallbacks).toBe(0);
    }
  });

  it('a clock is read, and the time recorded, only when not deterministic', () => {
    const d = rideKit();
    const mem = newMemory();
    chooseAnswer(d.state, d.pending!, opts({ deterministic: false }), mem);
    expect(mem.last!.ms).toBeGreaterThanOrEqual(0);
    expect(mem.last!.kind).toBe('playCard');
    expect(mem.plan).not.toBeNull();
  });

  it('the answer is the memory\'s seeded draw: same seed and position, same answer and same say', () => {
    const run = (): { answer: Answer; say?: string } => chooseAnswer(rideKit().state, { kind: 'playCard', side: 'bottom' }, opts({ difficulty: 'captain' }), newMemory());
    expect(run()).toEqual(run());
  });
});

describe('the commander speaks', () => {
  const chatty = { ...PERSONALITIES[8], chatter: 2 };
  const quiet = { ...PERSONALITIES[8], chatter: 0 };

  it('a talkative commander says a line when the card is played, naming only that card; a silent one never speaks', () => {
    const d = rideKit();
    const r = chooseAnswer(d.state, { kind: 'playCard', side: 'bottom' }, opts({ personality: chatty }), newMemory());
    expect(typeof r.say).toBe('string');
    expect(r.say!.length).toBeLessThanOrEqual(80);
    const q = chooseAnswer(d.state, { kind: 'playCard', side: 'bottom' }, opts({ personality: quiet }), newMemory());
    expect(q.say).toBeUndefined();
  });

  it('speaks at most once a turn', () => {
    const d = new GameDriver(createGame(scenarioById('000').setup, 21));
    const mems: Record<Side, AiMemory> = { top: newMemory(), bottom: newMemory() };
    const says: Record<string, number> = {};
    let n = 0;
    while (d.pending && d.state.turn.number <= 6 && n++ < 3000) {
      const side = d.pending.side;
      const r = chooseAnswer(d.state, d.pending, { side, difficulty: 'captain', personality: chatty, seed: 4, budgetScale: 0.05, deterministic: true }, mems[side]);
      if (r.say !== undefined) {
        const key = `${side}:${d.state.turn.number}`;
        says[key] = (says[key] ?? 0) + 1;
      }
      must(d, r.answer);
    }
    expect(Object.keys(says).length).toBeGreaterThan(1);
    for (const [k, c] of Object.entries(says)) expect(c, k).toBe(1);
  });
});

describe('whole games', () => {
  for (const diff of DIFFICULTIES) {
    it(`8 turns of 000 at ${diff}: every answer legal, no fallback`, () => {
      const d = new GameDriver(createGame(scenarioById('000').setup, 31));
      const mems: Record<Side, AiMemory> = { top: newMemory(), bottom: newMemory() };
      let n = 0;
      while (d.pending && d.state.turn.number <= 8 && n++ < 8000) {
        const side = d.pending.side;
        const o: AiOptions = { side, difficulty: diff, personality: PERSONALITIES[side === 'top' ? 8 : 0], seed: 7 + n % 3, budgetScale: 0.05, deterministic: true };
        const r = chooseAnswer(d.state, d.pending, o, mems[side]);
        expect(isLegal(d.state, d.pending, r.answer), `${d.pending.kind} ${JSON.stringify(r.answer)}`).toBe(true);
        must(d, r.answer);
      }
      expect(mems.top.fallbacks).toBe(0);
      expect(mems.bottom.fallbacks).toBe(0);
      expect(d.state.turn.number).toBeGreaterThan(2);
    });
  }
});
