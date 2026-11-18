// Plan 4 Task 3: "Let the general decide" goes through the general's own opponent (a worker in the app), and a late answer
// never lands on another decision.
import { describe, expect, it } from 'vitest';
import type { Answer, Decision, GameState } from '../../src/engine';
import { randomAnswer } from '../../src/engine';
import { AiClient } from '../../src/ai/client';
import { GameController, LocalGeneral, newSessionConfig, rematchConfig, type SessionConfig } from '../../src/ui/game/controller';
import { makeGeneral } from '../../src/ui/game/makeOpponent';
import type { Opponent } from '../../src/ui/game/opponent';
import { gamePrompt, type PromptCtx } from '../../src/ui/game/prompts';
import { SeededOpponent, runToHuman, useFakeClock } from './controller-helpers';

/** A general that records its calls and answers when told to. */
class FakeGeneral implements Opponent {
  calls: { state: GameState; d: Decision }[] = [];
  waiting: ((r: { answer: Answer }) => void)[] = [];
  disposed = 0;
  decide(state: GameState, d: Decision) {
    this.calls.push({ state, d });
    return new Promise<{ answer: Answer }>((res) => this.waiting.push(res));
  }
  resolveAll() {
    for (const w of this.waiting.splice(0)) {
      const { state, d } = this.calls[this.calls.length - 1];
      w({ answer: randomAnswer(state, d, () => 0.3) });
    }
  }
  dispose() {
    this.disposed++;
  }
}

const cfg = (): SessionConfig => ({ ...newSessionConfig('000', 'bottom', 'captain'), seed: 5 });

describe('the general in the worker', () => {
  useFakeClock();

  it('the general answers through its own opponent, for the human side', async () => {
    const g = new FakeGeneral();
    const c = new GameController(cfg(), new SeededOpponent(), [], undefined, g);
    try {
      await runToHuman(c);
      const d = c.view.pending!;
      const n = c.driver.answers.length;
      const p = c.autoAnswer();
      expect(c.view.generalThinking).toBe(true);
      expect(g.calls[0].d.side).toBe('bottom');
      g.resolveAll();
      await p;
      expect(c.view.generalThinking).toBe(false);
      expect(c.driver.answers.length).toBeGreaterThan(n);
      expect(c.view.pending).not.toBe(d);
    } finally {
      c.dispose();
    }
  });

  it('a stale answer is dropped when the decision changed', async () => {
    const g = new FakeGeneral();
    const c = new GameController(cfg(), new SeededOpponent(), [], undefined, g);
    try {
      await runToHuman(c);
      // take one answer by hand so that Undo is available, then ask the general at the next decision
      const first = c.view.pending!;
      c.answer(randomAnswer(c.driver.state, first, () => 0.1));
      await runToHuman(c);
      expect(c.view.undo).not.toBeNull(); // the card just played can be taken back
      const asked = c.view.pending!;
      const n = c.driver.answers.length;
      const p = c.autoAnswer();
      c.undo();
      const now = c.view.pending;
      expect(now).not.toBe(asked);
      g.resolveAll();
      await p;
      expect(c.driver.answers.length).toBe(n - 1);
      expect(c.view.pending).toBe(now);
      expect(c.view.generalThinking).toBe(false);
    } finally {
      c.dispose();
    }
  });

  it('a rematch builds a general for its own side', () => {
    const rematch = rematchConfig(cfg(), true);
    const g = makeGeneral(rematch) as AiClient;
    try {
      expect(g.opts.side).toBe(rematch.humanSide);
      expect(rematch.humanSide).toBe('top');
    } finally {
      g.dispose();
    }
  });

  it('the default test general is cheap and deterministic', async () => {
    const run = async () => {
      const c = new GameController(cfg(), new SeededOpponent());
      try {
        await runToHuman(c);
        const general = (c as unknown as { general: LocalGeneral }).general;
        await c.autoAnswer();
        return { answers: [...c.driver.answers], opts: general.lastOpts };
      } finally {
        c.dispose();
      }
    };
    const a = await run();
    const b = await run();
    expect(a.answers).toEqual(b.answers);
    expect(a.opts).toMatchObject({ budgetScale: 0.05, deterministic: true, side: 'bottom' });
  });

  it('while the general thinks the prompt has no answer buttons', async () => {
    const g = new FakeGeneral();
    const c = new GameController(cfg(), new SeededOpponent(), [], undefined, g);
    try {
      await runToHuman(c);
      const p = c.autoAnswer();
      const ctx = { controller: c, view: c.view, s: c.view.display, human: 'bottom', ai: 'top', ui: {}, setUi: () => {}, answer: () => {}, onExit: () => {} } as unknown as PromptCtx;
      const prompt = gamePrompt(ctx)!;
      expect(prompt.text).toBe('Your general is deciding…');
      expect(prompt.buttons).toEqual([]);
      g.resolveAll();
      await p;
    } finally {
      c.dispose();
    }
  });

  it('dispose disposes the general', () => {
    const g = new FakeGeneral();
    const c = new GameController(cfg(), new SeededOpponent(), [], undefined, g);
    c.dispose();
    expect(g.disposed).toBe(1);
  });
});
