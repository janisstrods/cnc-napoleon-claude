// Golden games: a random game per battle, pinned against tests/golden/fixtures.json (AI games: golden-ai.slow.test.ts),
// plus the 116 save fixture and a 000 self-replay determinism check.
import { describe, expect, it } from 'vitest';
import { GameDriver, createGame, randomAnswer, type Answer } from '../../src/engine';
import { SCENARIOS, scenarioById } from '../../src/scenarios';
import fixtures from './fixtures.json';
import saveFixture from './save-fixture.json';
import { fnv, digest, randomGolden, RANDOM_GAMES, type Golden } from './record';
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

describe('golden random games (engine behaviour is unchanged)', () => {
  it('replays every recorded random game with identical events', () => {
    const now = randomGolden();
    const rec = (fixtures as Golden[]).filter((f) => f.id.startsWith('rnd-'));
    expect(now.map((g) => g.id)).toEqual(rec.map((f) => f.id)); // nothing dropped or stale
    for (const g of now) expect(g, g.id).toEqual(rec.find((f) => f.id === g.id));
  }, 300_000);
  it('records a random game for every battle, 000 and 001–015 and 101–118', () => {
    expect(RANDOM_GAMES.map(([id]) => id)).toEqual(SCENARIOS.map((s) => s.id).sort()); // 34 ids, '000' first
  });
});

describe('saved games stay loadable (a save is exactly config + answers)', () => {
  it('rebuilds the recorded save by replaying its answers', () => {
    const { scenarioId, seed, answers, rngCalls, stateHash } = saveFixture as { scenarioId: string; seed: number; answers: Answer[]; rngCalls: number; stateHash: string };
    expect(answers).toHaveLength(60);
    const d = GameDriver.replay(createGame(scenarioById(scenarioId).setup, seed), answers);
    expect(d.answers).toHaveLength(answers.length);
    expect(d.pending).not.toBeNull();
    const dg = digest(d.state);
    expect(dg.rngCalls).toBe(rngCalls);
    expect(fnv(JSON.stringify(dg)).toString(16)).toBe(stateHash);
  });
});
