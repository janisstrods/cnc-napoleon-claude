// The seeded random AI stub (Plan 2B T1c-3a): legality, no hidden information, the attack policy, whole drill games and
// the in-thread AiClient. The real AI comes in a later plan.
import { describe, expect, it } from 'vitest';
import { GameDriver, createGame, forceDice, forcedDiceLeft, type Decision, type Side } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { PERSONALITIES, chooseAnswer, isLegal, newMemory, type AiOptions } from '../../src/ai';
import { AiClient } from '../../src/ai/client';
import { H, build, toBattle } from '../rules/helpers';
import { failOnAiErrors } from './no-ai-errors';

failOnAiErrors();

describe('the stub policy', () => {
  it('never consumes dice forced by the test hook', () => {
    const sc = scenarioById('000');
    const d = new GameDriver(createGame(sc.setup, 3));
    const opts: AiOptions = { side: d.pending!.side, difficulty: 'tribune', personality: PERSONALITIES[1], seed: 9, budgetScale: 0.1 };
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
    const opts: AiOptions = { side: base.active, difficulty: 'tribune', personality: PERSONALITIES[0], seed: 1234, budgetScale: 0.1, deterministic: true };
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

  it('the stub attacks when it can', () => {
    const s = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [5, 6] }, { side: 'top', key: 'FR/LN', at: [4, 6] }] });
    const d = toBattle(s, 'attackC', ['u1']);
    expect(chooseAnswer(d.state, d.pending!, { side: 'bottom', difficulty: 'tribune', personality: PERSONALITIES[0], seed: 1 }, newMemory()).answer).toEqual({
      kind: 'attack', unit: 'u1', target: H(4, 6),
    });
  });

  it('the stub plays both sides of the drill battle to a finish with no fallback', () => {
    for (const seed of [1, 2]) {
      const sc = scenarioById('000');
      const d = new GameDriver(createGame(sc.setup, seed));
      const mems: Record<Side, ReturnType<typeof newMemory>> = { top: newMemory(), bottom: newMemory() };
      const opts = (side: Side): AiOptions => ({ side, difficulty: 'recruit', personality: PERSONALITIES[seed], seed: seed * 7 + (side === 'top' ? 1 : 2) });
      let n = 0;
      while (!d.over && n++ < 20000) {
        const dec = d.pending!;
        const r = chooseAnswer(d.state, dec, opts(dec.side), mems[dec.side]);
        expect(d.answer(r.answer)).toBe(true);
      }
      expect(d.state.winner).toBeTruthy();
      expect(mems.top.fallbacks).toBe(0);
      expect(mems.bottom.fallbacks).toBe(0);
    }
  });
});

describe('AiClient', () => {
  it('falls back to in-thread decisions when Web Workers are unavailable', async () => {
    const sc = scenarioById('000');
    const d = new GameDriver(createGame(sc.setup, 8));
    const c = {
      top: new AiClient({ side: 'top', difficulty: 'recruit', personality: PERSONALITIES[0], seed: 1, budgetScale: 0.3 }),
      bottom: new AiClient({ side: 'bottom', difficulty: 'recruit', personality: PERSONALITIES[2], seed: 2, budgetScale: 0.3 }),
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
