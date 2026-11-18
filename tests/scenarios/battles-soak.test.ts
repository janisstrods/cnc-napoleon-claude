import { describe, expect, it, vi } from 'vitest';
import { GameDriver, bannerTotal, createGame, randomAnswer } from '../../src/engine';
import { PERSONALITIES, chooseAnswer, newMemory } from '../../src/ai';
import type { AiMemory } from '../../src/ai';
import { scenarioById } from '../../src/scenarios';
import { mulberry32 } from '../support/rng';
import { must, violations } from '../rules/helpers';

const CAP = 6000;
const ids = Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(3, '0'));
const expIds = Array.from({ length: 18 }, (_, i) => String(101 + i));

/** Checked after every decision, so it throws plainly (expect() per step is too slow). */
function invariants(d: GameDriver): void {
  const s = d.state;
  const bad = (m: string): never => { throw new Error(`${m} (turn ${s.turn.number})`); };
  const seen = new Set<number>();
  for (const u of s.units) {
    if (u.hex < 0) bad(`unit ${u.id} is off the board`);
    if (seen.has(u.hex)) bad(`unit ${u.id} shares hex ${u.hex}`);
    seen.add(u.hex);
    if (u.blocks < 1 || u.blocks > u.maxBlocks) bad(`unit ${u.id} has ${u.blocks} of ${u.maxBlocks} blocks`);
  }
  const lseen = new Set<number>();
  for (const l of s.leaders) {
    if (l.hex < 0) continue;
    if (lseen.has(l.hex)) bad(`leader ${l.id} shares hex ${l.hex} with another leader`);
    lseen.add(l.hex);
    for (const u of s.units) if (u.hex === l.hex && u.side !== l.side) bad(`leader ${l.id} stands on enemy unit ${u.id}`);
  }
  const v = violations(s, d.pending?.kind === 'playCard');
  if (v.length) bad(v.join('; '));
}

function finished(d: GameDriver, steps: number): void {
  const w = d.state.winner;
  const msg = `after ${steps} decisions, turn ${d.state.turn.number}, banners top ${bannerTotal(d.state, 'top')} bottom ${bannerTotal(d.state, 'bottom')}`;
  expect(w === 'top' || w === 'bottom', `winner ${String(w)} ${msg}`).toBe(true);
  if (w !== 'top' && w !== 'bottom') return;
  const loser = w === 'top' ? 'bottom' : 'top';
  expect(bannerTotal(d.state, w), msg).toBeGreaterThanOrEqual(d.state.bannersToWin);
  expect(bannerTotal(d.state, loser), msg).toBeLessThan(d.state.bannersToWin);
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
          invariants(d);
        }
        finished(d, steps);
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
          invariants(d);
        }
        finished(d, steps);
        expect(mem.top.fallbacks ?? 0).toBe(0);
        expect(mem.bottom.fallbacks ?? 0).toBe(0);
        expect(err).not.toHaveBeenCalled();
      } finally {
        err.mockRestore();
      }
    });
  }
});

describe('soak of the Expansion #1 battles 101-118 (random answers exercise Guerrilla, Move First and every side rule)', () => {
  for (const id of expIds) {
    for (const k of [0, 1]) {
      it(`${id} random play, seed ${k}, ends with a winner within ${CAP} decisions`, () => {
        const seed = 7000 + 10 * Number(id) + k;
        const d = new GameDriver(createGame(scenarioById(id).setup, seed));
        const rnd = mulberry32(seed);
        let steps = 0;
        while (d.pending && steps < CAP) {
          must(d, randomAnswer(d.state, d.pending, rnd));
          steps++;
          invariants(d);
        }
        finished(d, steps);
      });
    }
  }
});
