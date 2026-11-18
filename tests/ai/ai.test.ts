// The AI's plumbing (Plan 2B T1c-3a, kept by Plan 5 Task 9): forced dice, hidden information, the private generator's state and the
// in-thread AiClient. The dispatch itself is tests/ai/index.test.ts.
import { describe, expect, it, vi } from 'vitest';
import { GameDriver, createGame, forceDice, forcedDiceLeft, type Decision, type Side } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { DIFFICULTIES, PERSONALITIES, chooseAnswer, isLegal, levelOf, newMemory, type AiOptions } from '../../src/ai';
import { Rng } from '../../src/ai/rand';
import { AiClient } from '../../src/ai/client';
import { failOnAiErrors } from './no-ai-errors';

failOnAiErrors();

describe('chooseAnswer', () => {
  it('never consumes dice forced by the test hook', () => {
    const sc = scenarioById('000');
    const d = new GameDriver(createGame(sc.setup, 3));
    const opts: AiOptions = { side: d.pending!.side, difficulty: 'colonel', personality: PERSONALITIES[1], seed: 9, budgetScale: 0.1 };
    const mem = newMemory();
    forceDice(['infantry', 'flag', 'sabre']);
    try {
      for (let i = 0; i < 6 && d.pending && d.pending.kind !== 'battle'; i++) {
        const before = forcedDiceLeft();
        const r = chooseAnswer(d.state, d.pending, { ...opts, side: d.pending.side }, mem);
        expect(forcedDiceLeft()).toBe(before);
        expect(isLegal(d.state, d.pending, r.answer)).toBe(true);
        d.answer(r.answer);
      }
    } finally {
      forceDice([]);
    }
  });

  it('does not use hidden information: same decision whatever the opponent holds and the dice will be', () => {
    const sc = scenarioById('000');
    const base = createGame(sc.setup, 5);
    const opts: AiOptions = { side: base.active, difficulty: 'colonel', personality: PERSONALITIES[0], seed: 1234, budgetScale: 0.1, deterministic: true };
    const variant = createGame(sc.setup, 5);
    const opp: Side = base.active === 'top' ? 'bottom' : 'top';
    const pool = [...variant.deck, ...variant.players[opp].hand].reverse();
    variant.players[opp].hand = pool.slice(0, variant.players[opp].hand.length);
    variant.deck = pool.slice(variant.players[opp].hand.length);
    variant.rng = (variant.rng ^ 0xdeadbeef) >>> 0;
    const d: Decision = { kind: 'playCard', side: base.active };
    const a1 = chooseAnswer(base, d, opts, newMemory());
    const a2 = chooseAnswer(variant, d, opts, newMemory());
    expect(a2.answer).toEqual(a1.answer);
    expect(typeof (a1.answer as { card: number }).card).toBe('number');
  });
});

describe('the private generator', () => {
  const opts = (side: Side): AiOptions => ({ side, difficulty: 'colonel', personality: PERSONALITIES[0], seed: 3, budgetScale: 0.05, deterministic: true });

  it('a throwing planner still advances the stored generator state', () => {
    const d = new GameDriver(createGame(scenarioById('000').setup, 4));
    const mem = newMemory();
    const o: AiOptions = { ...opts(d.pending!.side), difficulty: 'captain' };
    let calls = 0;
    const real = Rng.prototype.next;
    const spy = vi.spyOn(Rng.prototype, 'next').mockImplementation(function (this: Rng) {
      if (++calls > 1) throw new Error('planted failure');
      return real.call(this);
    });
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined); // the expected 'AI error' report
    try {
      // the planner draws from the generator and throws; the random fallback draws too and throws out of chooseAnswer
      expect(() => chooseAnswer(d.state, d.pending!, o, mem)).toThrow('planted failure');
      expect(err.mock.calls.map((c) => String(c[0]))).toEqual(['AI error']);
    } finally {
      spy.mockRestore();
      err.mockClear(); // the planted failure was reported on purpose; failOnAiErrors must not see it
    }
    expect(calls).toBeGreaterThan(1);
    expect(mem.rngState).not.toBe(o.seed);
    expect(mem.fallbacks).toBe(1);
  });
});

describe('difficulty levels', () => {
  it('levelOf orders DIFFICULTIES weakest first', () => {
    expect([...DIFFICULTIES]).toEqual(['captain', 'colonel', 'marshal']);
    DIFFICULTIES.forEach((d, i) => expect(levelOf(d)).toBe(i));
  });
});

describe('AiClient', () => {
  it('falls back to in-thread decisions when Web Workers are unavailable', async () => {
    const sc = scenarioById('000');
    const d = new GameDriver(createGame(sc.setup, 8));
    const c = {
      top: new AiClient({ side: 'top', difficulty: 'captain', personality: PERSONALITIES[0], seed: 1, budgetScale: 0.3 }),
      bottom: new AiClient({ side: 'bottom', difficulty: 'captain', personality: PERSONALITIES[2], seed: 2, budgetScale: 0.3 }),
    };
    expect(c.top.usingWorker).toBe(false);
    let n = 0;
    while (!d.over && d.state.turn.number <= 4) {
      const dec = d.pending!;
      const r = await c[dec.side].decide(d.state, dec);
      expect(d.answer(r.answer)).toBe(true);
      n++;
    }
    expect(n).toBeGreaterThan(5);
    c.top.dispose();
    await expect(c.top.decide(d.state, d.pending!)).rejects.toThrow();
    c.bottom.dispose();
  });
});
