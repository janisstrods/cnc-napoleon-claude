// The battle soak, part two (battles 009-015): level 0 on both sides, one seed each, budgetScale 0.25, deterministic. Each battle ends
// with a winner by turn 150, with no fallback on either side and no console.error (failOnAiErrors). Budget: 25 s.
import { describe, expect, it, vi } from 'vitest';
import { bannerTotal } from '../../src/engine';
import { failOnAiErrors } from './no-ai-errors';
import { playBattle } from './soak';

failOnAiErrors();

// a machine 15-20x slower than the dev machine must not time a soak out (the default is 120 s)
vi.setConfig({ testTimeout: 300_000 });

const IDS = ['009', '010', '011', '012', '013', '014', '015'];

describe('battles 009-015, captain against captain', () => {
  for (const id of IDS) {
    it(`${id} ends with a winner by turn 150 and no fallback`, () => {
      const r = playBattle(id, { seed: 9000 + Number(id), budgetScale: 0.25, maxTurn: 150 });
      const s = r.d.state;
      const msg = `${id}: turn ${s.turn.number}, banners top ${bannerTotal(s, 'top')} bottom ${bannerTotal(s, 'bottom')}, ${r.decisions} decisions`;
      expect(s.winner === 'top' || s.winner === 'bottom', msg).toBe(true);
      expect(s.turn.number, msg).toBeLessThanOrEqual(150);
      expect(r.mems.top.fallbacks, msg).toBe(0);
      expect(r.mems.bottom.fallbacks, msg).toBe(0);
    });
  }
});
