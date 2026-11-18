import { describe, expect, it } from 'vitest';
import fixtures from './fixtures.json';
import { aiGolden, AI_GAMES, type Golden } from './record';

describe('golden AI games', () => {
  it('replays every recorded AI game with identical events', () => {
    const now = aiGolden();
    const rec = (fixtures as Golden[]).filter((f) => f.id.startsWith('ai-'));
    expect(now.map((g) => g.id)).toEqual(rec.map((f) => f.id)); // nothing dropped or stale
    expect(now.map((g) => g.id)).toEqual(AI_GAMES.map(([s, n]) => `ai-${s}-${n}`));
    for (const g of now) expect(g, g.id).toEqual(rec.find((f) => f.id === g.id));
  }, 300_000);
});
