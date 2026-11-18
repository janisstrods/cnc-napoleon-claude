// The battle result goes into the record at the moment the winner appears (before the closing animations), once.
import { describe, expect, it, vi } from 'vitest';
import { GameDriver, randomAnswer, type Answer, type Side } from '../../src/engine';
import { GameController, initialState, loadSaved, newSessionConfig } from '../../src/ui/game/controller';
import { loadRecord, sideStanding } from '../../src/ui/record';
import { mulberry32 } from '../support/rng';
import { dropStorage, stubStorage } from '../support/storage';
import { SeededOpponent, useFakeClock } from './controller-helpers';

/** A random game of `id` whose last answer is the winner's own (so the human's winning answer ends it). */
function winningGame(id: string): { seed: number; answers: Answer[]; side: Side } {
  for (let seed = 1; seed < 200; seed++) {
    const cfg = newSessionConfig(id, 'bottom', 'captain');
    cfg.seed = seed;
    const d = new GameDriver(initialState(cfg));
    const rnd = mulberry32(seed);
    let lastSide: Side = 'bottom';
    for (let i = 0; !d.over && i < 20000; i++) {
      lastSide = d.pending!.side;
      d.answer(randomAnswer(d.state, d.pending!, rnd));
    }
    if (d.state.winner === lastSide) return { seed, answers: d.answers.slice(), side: lastSide };
  }
  throw new Error('no such game found');
}

async function toLastAnswer(id: string) {
  const { seed, answers, side } = winningGame(id);
  const cfg = newSessionConfig(id, side, 'captain');
  cfg.seed = seed;
  const c = new GameController(cfg, new SeededOpponent(), answers.slice(0, -1));
  for (let i = 0; i < 400 && !c.view.pending; i++) {
    c.hurry();
    await vi.advanceTimersByTimeAsync(50);
  }
  expect(c.view.pending?.side).toBe(side);
  return { c, side, last: answers[answers.length - 1] };
}

describe('the battle result is recorded when the winner appears', () => {
  useFakeClock();

  it('leaving during the closing animations still records the win, and no save is left', async () => {
    stubStorage();
    const { c, side, last } = await toLastAnswer('000');
    c.answer(last);
    await vi.advanceTimersByTimeAsync(300);
    expect(c.view.over).toBeNull(); // the end is still animating
    c.dispose();
    await vi.advanceTimersByTimeAsync(20000);
    expect(loadSaved()).toBeNull();
    expect(sideStanding(loadRecord(), '000', side)).toBe('bronze');
    dropStorage();
  });

  it('finishing normally records exactly once', async () => {
    stubStorage();
    const { c, side, last } = await toLastAnswer('000');
    c.answer(last);
    for (let ms = 0; !c.view.over && ms < 30000; ms += 50) await vi.advanceTimersByTimeAsync(50);
    expect(c.view.over?.winner).toBe(side);
    expect(c.view.over?.newMedal).toBe('bronze');
    const t = loadRecord()['000'][side]!.captain!;
    expect(t.won + t.lost + t.draw).toBe(1);
    c.dispose();
    dropStorage();
  });

  it('a game started with stacked ?cards= earns no medal', async () => {
    stubStorage();
    const { seed, side } = winningGame('000');
    const cfg = newSessionConfig('000', side, 'captain');
    cfg.seed = seed;
    cfg.devCards = ['firstStrike'];
    // the stacked hand changes the game: play it out with the computer on both sides instead
    const c = new GameController(cfg, new SeededOpponent(), []);
    for (let i = 0; i < 4000 && !c.view.over && !c.view.fatal; i++) {
      c.hurry();
      if (c.view.pending) c.autoAnswer();
      await vi.advanceTimersByTimeAsync(50);
    }
    expect(c.view.over).not.toBeNull();
    expect(c.view.over?.newMedal).toBeUndefined();
    expect(loadRecord()).toEqual({});
    c.dispose();
    dropStorage();
  }, 60000);
});
