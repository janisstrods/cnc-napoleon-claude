import { describe, expect, it } from 'vitest';
import { GameDriver, createGame, randomAnswer } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { mulberry32 } from '../support/rng';
import { must } from '../rules/helpers';

describe('random-play soak on the drill battle', () => {
  for (let g = 0; g < 20; g++) {
    const first = g < 10 ? 'top' : 'bottom';
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
