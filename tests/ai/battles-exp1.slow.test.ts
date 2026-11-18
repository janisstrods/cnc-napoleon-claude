// The battle soak for Expansion #1 (battles 101-118): captain against captain, deterministic, one seed each, budgetScale 0.05 (Plan 5's
// battles-a/b pattern). Each battle sets up and ends with a winner by turn 150, with no fallback on either side and no console.error
// (failOnAiErrors). Also: the same seed gives the same event stream twice (101, 106, 115, 116), and the saved answers of a 116 game
// replay to the same final state. Budget: 120 s for the file.
import { describe, expect, it, vi } from 'vitest';
import { GameDriver, bannerTotal } from '../../src/engine';
import { failOnAiErrors } from './no-ai-errors';
import { playBattle, type SoakOpts } from './soak';

failOnAiErrors();

// a machine 15-20x slower than the dev machine must not time a soak out (the default is 120 s)
vi.setConfig({ testTimeout: 300_000 });

const EXP1_IDS = Array.from({ length: 18 }, (_, i) => String(101 + i));
const opts = (id: string, record = false): SoakOpts => ({ seed: 9000 + Number(id), budgetScale: 0.05, maxTurn: 150, record });

describe('battles 101-118, captain against captain', () => {
  for (const id of EXP1_IDS) {
    it(`${id}: every battle sets up and AI against AI ends with a winner, no fallback, no console error`, () => {
      const r = playBattle(id, opts(id));
      const s = r.d.state;
      const msg = `${id} (seed ${9000 + Number(id)}): turn ${s.turn.number}, banners top ${bannerTotal(s, 'top')} bottom ${bannerTotal(s, 'bottom')}, ${r.decisions} decisions`;
      expect(s.winner === 'top' || s.winner === 'bottom', msg).toBe(true);
      expect(s.turn.number, msg).toBeLessThanOrEqual(150);
      expect(r.mems.top.fallbacks, msg).toBe(0);
      expect(r.mems.bottom.fallbacks, msg).toBe(0);
    });
  }
});

describe('determinism and replay on the Spanish battles', () => {
  for (const id of ['101', '106', '115', '116']) {
    it(`${id}: the same seed gives the same event stream twice`, () => {
      const a = playBattle(id, opts(id, true));
      const b = playBattle(id, opts(id, true));
      expect(a.events.length, id).toBeGreaterThan(50);
      expect(b.answers, `${id} answers`).toEqual(a.answers);
      expect(b.events, `${id} events`).toEqual(a.events);
      expect(JSON.stringify(b.d.state), `${id} final state`).toBe(JSON.stringify(a.d.state));
    });
  }

  it('replaying the saved answers of an AI game of 116 reproduces it', () => {
    const live = playBattle('116', opts('116'));
    expect(live.d.over).toBe(true);
    const replayed = GameDriver.replay(live.d.initial, live.d.answers);
    expect(replayed.answers.length).toBe(live.d.answers.length);
    expect(JSON.stringify(replayed.state)).toBe(JSON.stringify(live.d.state));
  });

  // Task 12 carry M6: the replay check holds across the whole 1xx range, not one battle
  it.each(EXP1_IDS)('%s: the saved answers of an AI game replay to the live final state', (id) => {
    const live = playBattle(id, { ...opts(id), budgetScale: 0.02 });
    const replayed = GameDriver.replay(live.d.initial, live.d.answers);
    expect(JSON.stringify(replayed.state), id).toBe(JSON.stringify(live.d.state));
  });
});
