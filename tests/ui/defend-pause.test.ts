// A melee the human declares starts to show (the card, the first roll) after one fixed pause, whether or not the computer
// was asked how to defend: a pause only when it is asked would tell the player it holds First Strike.
import { describe, expect, it, vi } from 'vitest';
import { GameDriver, cloneState, forceDice, other, type GameState } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { GameController, newSessionConfig } from '../../src/ui/game/controller';
import { H, build, giveCard, miss, must, n, noFirstStrike } from '../rules/helpers';
import { SeededOpponent, runToHuman, useFakeClock } from './controller-helpers';

/** Milliseconds from the human's attack to the first new line of the log, defender holding First Strike or not. */
async function declarationToFirstLine(strike: boolean): Promise<number> {
  const s: GameState = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [5, 6] }, { side: 'top', key: 'FR/LN', at: [4, 6] }] });
  if (strike) giveCard(s, 'top', 'firstStrike');
  if (!strike) noFirstStrike(s);
  const card = giveCard(s, s.active, 'attackC');
  const d = new GameDriver(s, { snapshots: true });
  must(d, { kind: 'playCard', card });
  must(d, { kind: 'orders', pieces: ['u1'] });
  must(d, { kind: 'endMove' });
  expect(d.pending?.kind).toBe('battle');
  d.drainEvents(); // the events up to here belong to the setup, not to the declared melee
  const human = other(scenarioById('000').setup.first);
  const c = new GameController({ ...newSessionConfig('000', human, 'recruit'), seed: 9 }, new SeededOpponent());
  await runToHuman(c);
  // the controller plays the crafted battle from its battle decision, the human on the bottom side
  const priv = c as unknown as { driver: GameDriver; config: { humanSide: string }; set(p: object): void };
  priv.config.humanSide = 'bottom';
  priv.driver = d;
  priv.set({ humanSide: 'bottom', pending: d.pending, display: cloneState(d.state), undo: null });
  forceDice(n(miss('BR/LN', 'FR/LN'), 40));
  const lines = c.view.log.length;
  const t0 = Date.now();
  c.answer({ kind: 'attack', unit: 'u1', target: H(4, 6) });
  let at = -1;
  for (let i = 0; i < 4000 && at < 0; i++) {
    await vi.advanceTimersByTimeAsync(5);
    if (c.view.log.length > lines) at = Date.now() - t0;
  }
  forceDice([]);
  c.dispose();
  return at;
}

describe('the pause after a declared melee', () => {
  useFakeClock();

  it('is the same with and without a defend decision', async () => {
    const none = await declarationToFirstLine(false);
    const asked = await declarationToFirstLine(true);
    expect(none).toBeGreaterThanOrEqual(600);
    expect(asked).toBeGreaterThanOrEqual(600);
    expect(Math.abs(asked - none)).toBeLessThanOrEqual(10);
  });
});
