// Determinism of the AI (ruling 2): the same seeds give the same answers and the same event stream; another AI seed plays differently.
// Level 1, deterministic, budgetScale 0.05. Budget: 10 s.
import { describe, expect, it } from 'vitest';
import { failOnAiErrors } from './no-ai-errors';
import { playBattle, type SoakOpts } from './soak';

failOnAiErrors();

const base = (seed: number): SoakOpts => ({ seed, levels: { top: 1, bottom: 1 }, budgetScale: 0.05, record: true, maxTurn: 150 });

describe('determinism', () => {
  it('two full games of 000 and 007 with the same seeds (level 1, deterministic, budgetScale 0.05) give identical answers and event streams', () => {
    for (const [id, seed] of [['000', 61], ['007', 62]] as const) {
      const a = playBattle(id, base(seed));
      const b = playBattle(id, base(seed));
      expect(a.answers.length, id).toBeGreaterThan(50);
      expect(a.d.over, id).toBe(true);
      expect(b.answers, `${id} answers`).toEqual(a.answers);
      expect(b.events, `${id} events`).toEqual(a.events);
      expect(b.says, `${id} lines`).toEqual(a.says);
      expect(a.mems.top.fallbacks).toBe(0);
      expect(a.mems.bottom.fallbacks).toBe(0);
    }
  });

  it('a different AI seed changes at least one answer over a game', () => {
    const a = playBattle('000', base(63));
    const b = playBattle('000', { ...base(63), aiSeed: 1000 });
    expect(a.answers.length).toBeGreaterThan(50);
    expect(b.answers).not.toEqual(a.answers);
  });
});
