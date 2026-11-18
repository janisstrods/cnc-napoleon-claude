// Plan 7C Task 21: the general plays the human side of battles 101, 106 and 116 to the end through the controller (the harness of
// full-games.slow.test.ts): every human decision has a prompt whose buttons are legal answers, the game ends, no console.error, and no
// log line equals an event kind. The clock is fake, the opponent is the seeded random one.
import { describe, expect, it, vi } from 'vitest';
import { answerError, type GameEvent } from '../../src/engine';
import { GameController, newSessionConfig, type SessionConfig } from '../../src/ui/game/controller';
import { promptSpec } from '../../src/ui/game/promptSpec';
import { SeededOpponent, runToHuman, useFakeClock } from './controller-helpers';

/** Every event kind: typed as a record, so a new kind in the engine fails the typecheck until it is listed here. */
const EVENT_KINDS: Record<GameEvent['t'], true> = {
  turnStart: true, cardPlayed: true, ordered: true, move: true, combat: true, roll: true, damage: true, eliminated:
  true, removed: true, leaderKilled: true, leaderSafe: true, leaderLeft: true, flags: true, retreat: true, retire: true,
  leaderRetreat: true, attach: true, advance: true, squareFormed: true, squareLeft: true, cardReturned: true, rallied:
  true, shortSupply: true, banner: true, held: true, draw: true, scoutDrew: true, discarded: true, reshuffle: true, log:
  true, victory: true, guerrilla: true, moveFirst: true,
};

const MAX_DECISIONS = 3000;

async function playToEnd(id: string) {
  const config: SessionConfig = {
    ...newSessionConfig(id, 'bottom', 'captain'), seed: 1,
    ai: { difficulty: 'captain', budgetScale: 0.05, deterministic: true },
  };
  const c = new GameController(config, new SeededOpponent(), []);
  let decisions = 0;
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const kinds = new Set(Object.keys(EVENT_KINDS));
  let lastLogId = 0;
  const checkNewLog = () => {
    for (const l of c.view.log) {
      if (l.id <= lastLogId) continue;
      lastLogId = l.id;
      expect(kinds.has(l.text), `${id} log line "${l.text}"`).toBe(false);
    }
  };
  try {
    for (; decisions < MAX_DECISIONS && !c.view.over; decisions++) {
      await runToHuman(c).catch((e) => {
        if (c.view.over) return;
        throw e;
      });
      if (c.view.over) break;
      const d = c.view.pending!;
      const spec = promptSpec(c.view.display, d);
      expect(spec.title, `${id} ${d.kind}`).not.toBe('');
      for (const a of spec.actions) {
        if (a.answer !== 'auto') expect(answerError(c.driver.state, d, a.answer), `${id} ${d.kind}/${a.key}`).toBeNull();
      }
      await c.autoAnswer();
      checkNewLog();
    }
    expect(c.view.over, `${id} ended after ${decisions} decisions`).not.toBeNull();
    checkNewLog();
    expect(lastLogId).toBeGreaterThan(0);
    expect(errors.mock.calls, `${id} console.error calls`).toEqual([]);
  } finally {
    errors.mockRestore();
    c.dispose();
  }
  return decisions;
}

describe('the Spanish battles play to the end through the screen\'s controller', () => {
  useFakeClock();
  for (const id of ['101', '106', '116']) {
    it(`${id}: the general plays the human side to the end through the controller`, async () => {
      const n = await playToEnd(id);
      console.log(`battle ${id}: ${n} human decisions`);
    }, 300_000);
  }
});
