// Rules: RR §1, §2, §5.3, §9.5, §12, §13.1 (design/rules-reference.md)
import { describe, expect, it } from 'vitest';
import {
  GameDriver, SIDES, bannerTotal, createGame, forceDice, randomAnswer,
  type GameEvent, type GameState, type Side,
} from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { lcg } from '../support/rng';
import { violations } from './helpers';

/** Event kinds that may carry a card id (the only two the UI may show). Every other event must carry none. */
const CARD_EVENTS: ReadonlySet<GameEvent['t']> = new Set(['cardPlayed', 'discarded']);

/** The victory invariant (6): the winner has the banners, and nobody else has them while the battle goes on. */
function victoryViolations(s: GameState, pending: boolean): string[] {
  const out: string[] = [];
  if (s.winner) {
    if (s.winner !== 'draw' && bannerTotal(s, s.winner) < s.bannersToWin) out.push(`${s.winner} won with ${bannerTotal(s, s.winner)} of ${s.bannersToWin} banners`);
    if (pending) out.push('a decision is pending after the victory');
  } else {
    for (const side of SIDES) if (bannerTotal(s, side) >= s.bannersToWin) out.push(`${side} has ${bannerTotal(s, side)} banners but no winner`);
  }
  return out;
}

/** Card ids in events (7): any numeric card field outside `cardPlayed` and `discarded`. */
function eventLeaks(es: GameEvent[]): string[] {
  const out: string[] = [];
  for (const e of es) {
    if (CARD_EVENTS.has(e.t)) continue;
    for (const [k, v] of Object.entries(e)) {
      if (/card|hand|deck/i.test(k)) out.push(`${e.t}.${k} = ${JSON.stringify(v)}`);
    }
  }
  return out;
}

describe('rule invariants hold after every decision in random play', () => {
  for (let g = 0; g < 20; g++) {
    const first: Side = g < 10 ? 'top' : 'bottom';
    it(`000, seed ${g}, ${first} first`, () => {
      forceDice([]);
      const seed = 7919 + g;
      const d = new GameDriver(createGame({ ...scenarioById('000').setup, first }, seed));
      const rnd = lcg(seed);
      const banners: Record<Side, number> = { top: 0, bottom: 0 };
      let steps = 0;
      expect(violations(d.state, d.pending?.kind === 'playCard')).toEqual([]);
      while (d.pending && steps < 4000) {
        const dec = d.pending;
        const a = randomAnswer(d.state, dec, rnd);
        if (!d.answer(a)) throw new Error(`rejected ${JSON.stringify(a)}: ${d.lastError}`);
        const where = `game ${g} step ${steps} after ${JSON.stringify(a)}`;
        const v = [
          ...violations(d.state, d.pending?.kind === 'playCard'),
          ...victoryViolations(d.state, d.pending !== null),
          ...eventLeaks(d.drainEvents().map((q) => q.e)).map((x) => `event leaks a card: ${x}`),
        ];
        for (const side of SIDES) {
          if (d.state.players[side].banners < banners[side]) v.push(`${side} permanent banners fell`);
          banners[side] = d.state.players[side].banners;
        }
        if (v.length) throw new Error(`${where}: ${v.join('; ')}`);
        steps++;
      }
      expect(d.state.winner, `turn ${d.state.turn.number}`).not.toBeNull();
      expect(d.pending).toBeNull();
    });
  }
});
