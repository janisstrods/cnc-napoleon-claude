// Golden games: the recorded Ancients fixtures were deleted in Plan 2A (Napoleonic fixtures return with the new engine).
// What stays is a determinism check: the same seed replays to the same event stream.
import { describe, expect, it } from 'vitest';
import { GameDriver, createGame, randomAnswer } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { fnv, digest } from './record';
import { mulberry32 } from '../support/rng';

function run(seed: number): { events: string[]; hash: string } {
  const d = new GameDriver(createGame(scenarioById('000').setup, seed));
  const rnd = mulberry32(seed);
  const events = d.drainEvents().map((q) => JSON.stringify(q.e));
  let steps = 0;
  while (!d.over && steps++ < 20000) {
    if (!d.answer(randomAnswer(d.state, d.pending!, rnd))) throw new Error(`random answer rejected: ${d.lastError}`);
    events.push(...d.drainEvents().map((q) => JSON.stringify(q.e)));
  }
  expect(d.over).toBe(true);
  return { events, hash: fnv(JSON.stringify(digest(d.state))).toString(16) };
}

describe('golden games (self-replay determinism on 000)', () => {
  it('two random-play runs of 000 with the same seed produce identical event streams', () => {
    const a = run(7);
    const b = run(7);
    expect(a.events.length).toBeGreaterThan(10);
    expect(b.events).toEqual(a.events);
    expect(b.hash).toBe(a.hash);
  });
});
