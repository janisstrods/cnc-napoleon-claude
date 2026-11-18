// The battle soak, part one (battles 001-008): level 0 on both sides, one seed each, budgetScale 0.25, deterministic. Each battle ends
// with a winner by turn 150, with no fallback on either side and no console.error (failOnAiErrors). Budget: 25 s.
import { describe, expect, it } from 'vitest';
import { bannerTotal } from '../../src/engine';
import { failOnAiErrors } from './no-ai-errors';
import { playBattle } from './soak';

failOnAiErrors();

const IDS = ['001', '002', '003', '004', '005', '006', '007', '008'];

describe('battles 001-008, captain against captain', () => {
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
