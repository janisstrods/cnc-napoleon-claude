import { describe, expect, it, vi } from 'vitest';
import { GameDriver, bannerTotal, createGame, randomAnswer } from '../../src/engine';
import { PERSONALITIES, chooseAnswer, newMemory } from '../../src/ai';
import type { AiMemory } from '../../src/ai';
import { scenarioById } from '../../src/scenarios';
import { mulberry32 } from '../support/rng';
import { must } from '../rules/helpers';

const CAP = 6000;
const ids = Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(3, '0'));

function invariants(d: GameDriver): void {
  const hexes = d.state.units.filter((u) => u.hex >= 0).map((u) => u.hex);
  expect(new Set(hexes).size, 'unit hexes distinct').toBe(hexes.length);
  for (const u of d.state.units) {
    expect(u.blocks, `unit ${u.id} blocks`).toBeGreaterThanOrEqual(1);
    expect(u.blocks, `unit ${u.id} blocks <= max`).toBeLessThanOrEqual(u.maxBlocks);
  }
}

function finished(d: GameDriver): void {
  const w = d.state.winner;
  const msg = `turn ${d.state.turn.number}, banners top ${bannerTotal(d.state, 'top')} bottom ${bannerTotal(d.state, 'bottom')}`;
  expect(w, msg).not.toBeNull();
  if (w && w !== 'draw') expect(bannerTotal(d.state, w), msg).toBeGreaterThanOrEqual(d.state.bannersToWin);
}

describe('soak of the base battles 001-015', () => {
  for (const id of ids) {
    for (const k of [0, 1]) {
      it(`${id} random play, seed ${k}, ends with a winner within ${CAP} decisions`, () => {
        const seed = 7000 + 10 * Number(id) + k;
        const d = new GameDriver(createGame(scenarioById(id).setup, seed));
        const rnd = mulberry32(seed);
        let steps = 0;
        while (d.pending && steps < CAP) {
          must(d, randomAnswer(d.state, d.pending, rnd));
          steps++;
        }
        finished(d);
        invariants(d);
      });
    }
    it(`${id} AI stub on both sides ends with a winner and no fallbacks`, () => {
      const seed = 9000 + Number(id);
      const err = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const d = new GameDriver(createGame(scenarioById(id).setup, seed));
        const mem: Record<'top' | 'bottom', AiMemory> = { top: newMemory(), bottom: newMemory() };
        let steps = 0;
        while (d.pending && steps < CAP) {
          const side = d.pending.side;
          const { answer } = chooseAnswer(d.state, d.pending, { side, difficulty: 'tribune', personality: PERSONALITIES[0], seed, deterministic: true }, mem[side]);
          must(d, answer);
          steps++;
        }
        finished(d);
        invariants(d);
        expect(mem.top.fallbacks ?? 0).toBe(0);
        expect(mem.bottom.fallbacks ?? 0).toBe(0);
        expect(err).not.toHaveBeenCalled();
      } finally {
        err.mockRestore();
      }
    });
  }
});
