import { describe, expect, it } from 'vitest';
import { UNIT_STATS } from '../../src/engine';
import { dieOdds, pAnySabre, rollDist } from '../../src/ai/odds';
import { failOnAiErrors } from './no-ai-errors';

failOnAiErrors();

describe('odds', () => {
  it('fire on infantry: hit 2/6, flag 1/6, sabre scores nothing', () => {
    for (const k of ['FR/LN', 'BR/LN'] as const) {
      const o = dieOdds('fire', UNIT_STATS[k], 'infantry');
      expect(o.hit).toBeCloseTo(2 / 6);
      expect(o.flag).toBeCloseTo(1 / 6);
      expect(o.sabre).toBeCloseTo(1 / 6); // the face shows, but a sabre is no hit in fire: hit stays 2/6
    }
  });

  it('melee on cavalry: hit 2/6 (cavalry face + sabre); militia sabres miss: 1/6', () => {
    const line = dieOdds('melee', UNIT_STATS['FR/LN'], 'cavalry');
    expect(line.hit).toBeCloseTo(2 / 6);
    expect(line.flag).toBeCloseTo(1 / 6);
    const militia = dieOdds('melee', UNIT_STATS['FR/ML'], 'cavalry');
    expect(militia.hit).toBeCloseTo(1 / 6);
  });

  it('Retire and Reform scores cavalry faces only and no flags', () => {
    const o = dieOdds('retireReform', UNIT_STATS['FR/LN'], 'infantry');
    expect(o.hit).toBeCloseTo(1 / 6);
    expect(o.flag).toBe(0);
  });

  it('rollDist sums to 1 and its mean hits equal n · hit', () => {
    for (const n of [0, 1, 3, 6]) {
      const o = dieOdds('melee', UNIT_STATS['FR/LN'], 'infantry');
      const d = rollDist(n, o);
      let sum = 0, hits = 0, flags = 0;
      for (let h = 0; h <= n; h++) {
        for (let f = 0; f <= n; f++) {
          const p = d[h * (n + 1) + f];
          sum += p;
          hits += p * h;
          flags += p * f;
        }
      }
      expect(sum).toBeCloseTo(1, 10);
      expect(hits).toBeCloseTo(n * o.hit, 10);
      expect(flags).toBeCloseTo(n * o.flag, 10);
    }
  });

  it('pAnySabre follows the engine: 0 dice 0, one die 1/6', () => {
    expect(pAnySabre(0)).toBe(0);
    expect(pAnySabre(1)).toBeCloseTo(1 / 6);
    expect(pAnySabre(2)).toBeCloseTo(1 - (5 / 6) ** 2);
  });
});
