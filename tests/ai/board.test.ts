// The AI's board index (src/ai/board.ts) against brute force and the engine's own lookups.
import { describe, expect, it } from 'vitest';
import { COLS, GameDriver, ROWS, createGame, distance, leaderAt, randomAnswer, sectionsOf, unitAt, type GameState } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { Rng } from '../../src/ai/rand';
import { friendsWithin, nearestEnemyDist, occOf, sectionsOfUnit } from '../../src/ai/board';
import { build } from '../rules/helpers';
import { failOnAiErrors } from './no-ai-errors';

failOnAiErrors();

function check(s: GameState): void {
  const occ = occOf(s);
  for (let h = 0; h < ROWS * COLS; h++) {
    expect(occ.unit[h] ?? undefined).toBe(unitAt(s, h));
    expect(occ.leader[h] ?? undefined).toBe(leaderAt(s, h));
  }
  for (const u of s.units) {
    if (u.hex < 0) continue;
    let best = 99;
    let friends1 = 0;
    let friends3 = 0;
    for (const o of s.units) {
      if (o === u || o.hex < 0) continue;
      const d = distance(u.hex, o.hex);
      if (o.side !== u.side) best = Math.min(best, d);
      else {
        if (d <= 1) friends1++;
        if (d <= 3) friends3++;
      }
    }
    expect(nearestEnemyDist(s, occ, u)).toBe(best);
    expect(friendsWithin(s, occ, u, 1)).toBe(friends1);
    expect(friendsWithin(s, occ, u, 3)).toBe(friends3);
    expect(sectionsOfUnit(u)).toEqual(sectionsOf(u.hex, u.side));
  }
}

describe('occOf and the distance helpers', () => {
  it('match the engine lookups and brute force on a built position', () => {
    check(build({
      units: [
        { side: 'bottom', key: 'BR/LN', at: [5, 2] }, { side: 'bottom', key: 'BR/LN', at: [5, 3] }, { side: 'bottom', key: 'BR/LN', at: [6, 9] },
        { side: 'top', key: 'FR/LN', at: [1, 6] }, { side: 'top', key: 'FR/LN', at: [2, 7] },
      ],
      leaders: [{ side: 'bottom', at: [5, 2] }],
    }));
  });

  it('give 99 when there is no enemy', () => {
    const s = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [5, 2] }] });
    expect(nearestEnemyDist(s, occOf(s), s.units[0])).toBe(99);
  });

  it('match on every position of a random drill game', () => {
    const d = new GameDriver(createGame(scenarioById('000').setup, 21));
    const rng = new Rng(9);
    for (let i = 0; i < 150 && !d.over; i++) {
      if (i % 5 === 0) check(d.state);
      d.answer(randomAnswer(d.state, d.pending!, () => rng.next()));
    }
  });
});
