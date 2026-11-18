import { describe, expect, it, vi } from 'vitest';
import { GameDriver, createGame, randomAnswer, type Side } from '../../src/engine';
import { PERSONALITIES, chooseAnswer, newMemory, type AiOptions } from '../../src/ai';
import { scenarioById } from '../../src/scenarios';
import { mulberry32 } from '../support/rng';
import { must } from '../rules/helpers';

describe('random-play soak on the drill battle', () => {
  for (let g = 0; g < 40; g++) {
    const first = g < 20 ? 'top' : 'bottom';
    it(`seed ${g}, ${first} first, ends with a winner within 4000 decisions`, () => {
      const seed = 1000 + g;
      const d = new GameDriver(createGame({ ...scenarioById('000').setup, first }, seed));
      const rnd = mulberry32(seed);
      let steps = 0;
      while (d.pending && steps < 4000) {
        must(d, randomAnswer(d.state, d.pending, rnd));
        steps++;
      }
      expect(d.state.winner, `turn ${d.state.turn.number}`).not.toBeNull();
      const hexes = d.state.units.filter((x) => x.hex >= 0).map((x) => x.hex);
      expect(new Set(hexes).size).toBe(hexes.length);
      for (const x of d.state.units) expect(x.blocks).toBeGreaterThan(0);
    });
  }
});

describe('the AI plays both sides of the drill battle', () => {
  // Whole AI games are the slow suites' work (tests/ai/*.slow.test.ts); here the weakest level, a small budget and 8 turns.
  for (let g = 0; g < 6; g++) {
    it(`seed ${g}: 8 turns, legal answers, no fallback, no console.error`, () => {
      const spy = vi.spyOn(console, 'error');
      try {
        const seed = 500 + g;
        const first: Side = g % 2 ? 'bottom' : 'top';
        const d = new GameDriver(createGame({ ...scenarioById('000').setup, first }, seed));
        const mems = { top: newMemory(), bottom: newMemory() };
        const opts = (side: Side): AiOptions => ({
          side, difficulty: 'captain', personality: PERSONALITIES[g % PERSONALITIES.length], seed: seed * 3 + (side === 'top' ? 1 : 2),
          budgetScale: 0.05, deterministic: true,
        });
        let steps = 0;
        while (d.pending && d.state.turn.number <= 8 && steps < 4000) {
          const side = d.pending.side;
          must(d, chooseAnswer(d.state, d.pending, opts(side), mems[side]).answer);
          steps++;
        }
        expect(steps, `turn ${d.state.turn.number}`).toBeGreaterThan(20);
        expect(mems.top.fallbacks).toBe(0);
        expect(mems.bottom.fallbacks).toBe(0);
        expect(spy.mock.calls).toEqual([]);
      } finally {
        spy.mockRestore();
      }
    });
  }
});
