// Whole games through chooseAnswer: the drill battle at each level, and the Expansion kinds (Guerrilla in 103, Move First in 116), with
// every answer legal and no fallback. Budget: 8 s.
import { describe, expect, it, vi } from 'vitest';
import { GameDriver, createGame, type Decision } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { DIFFICULTIES, chooseAnswer, newMemory } from '../../src/ai';
import { H, build, must, toBattle } from '../rules/helpers';
import { failOnAiErrors } from './no-ai-errors';
import { aiOptions, playBattle } from './soak';

failOnAiErrors();

// a machine 15-20x slower than the dev machine must not time a soak out (the default is 120 s)
vi.setConfig({ testTimeout: 300_000 });

describe('whole games', () => {
  for (const [level, diff] of DIFFICULTIES.entries()) {
    it(`a whole game of 000 at ${diff}: every answer legal (checked per decision), a winner, no fallback`, () => {
      const r = playBattle('000', { seed: 70 + level, levels: { top: level as 0 | 1 | 2, bottom: level as 0 | 1 | 2 }, budgetScale: 0.05, maxTurn: 150 });
      expect(r.d.state.winner === 'top' || r.d.state.winner === 'bottom').toBe(true);
      expect(r.mems.top.fallbacks).toBe(0);
      expect(r.mems.bottom.fallbacks).toBe(0);
    });
  }
});

describe('the Expansion kinds stay legal (Plan 7C Task 19 gave them policies)', () => {
  for (const [id, kind] of [['103', 'guerrilla'], ['116', 'moveFirst']] as const) {
    it(`${id}: ${kind} decisions occur and every answer is legal, no fallback`, () => {
      const kinds = new Map<Decision['kind'], number>();
      const r = playBattle(id, {
        seed: 80 + Number(id), budgetScale: 0.05, maxTurn: 30, seen: (d) => kinds.set(d.kind, (kinds.get(d.kind) ?? 0) + 1),
      });
      expect(kinds.get(kind), `${kind} decisions in ${id}`).toBeGreaterThan(0);
      expect(r.mems.top.fallbacks).toBe(0);
      expect(r.mems.bottom.fallbacks).toBe(0);
      expect(r.decisions).toBeGreaterThan(30);
    });
  }

  it('116: the first turn is played with the card the side committed to move first', () => {
    let tested = 0;
    for (let seed = 1; seed <= 20 && tested < 3; seed++) {
      const d = new GameDriver(createGame(scenarioById('116').setup, seed));
      const mems = { top: newMemory(), bottom: newMemory() };
      for (let i = 0; i < 40 && d.pending; i++) {
        const dec = d.pending;
        const r = chooseAnswer(d.state, dec, aiOptions('116', dec.side, { seed, budgetScale: 0.05 }), mems[dec.side]);
        if (dec.kind === 'playCard') {
          const committed = d.state.special.moveFirst?.committed[dec.side] ?? null;
          if (committed !== null) {
            expect(r.answer, `seed ${seed}`).toEqual({ kind: 'playCard', card: committed });
            tested++;
          }
          break;
        }
        must(d, r.answer);
      }
    }
    expect(tested).toBeGreaterThan(0);
  });
});

describe('defend stays on the fast path', () => {
  it('a defend decision is answered well inside Plan 4\'s 600 ms pause at every level (best of 5 calls)', () => {
    const d = toBattle(build({ first: 'top', bottomCards: 4, units: [{ side: 'top', key: 'FR/HC', at: [3, 6] }, { side: 'bottom', key: 'BR/LN', at: [4, 6], blocks: 2 }] }), 'attackC', ['u1']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(d.pending?.kind).toBe('defend');
    for (const diff of DIFFICULTIES) {
      let best = Infinity;
      for (let k = 0; k < 5; k++) {
        const t0 = performance.now();
        chooseAnswer(d.state, d.pending!, { side: 'bottom', difficulty: diff, personality: aiOptions('001', 'bottom', { seed: 1, budgetScale: 1 }).personality, seed: 1, budgetScale: 1, deterministic: false }, newMemory());
        best = Math.min(best, performance.now() - t0);
      }
      expect(best, `${diff}: best of 5 calls, ms`).toBeLessThan(150);
    }
  });
});
