// Plan 4 Task 11: the general plays the human side of every playable battle (000 and 001-015) to the end through the
// controller, the same path the screen uses: every decision it meets has a prompt whose buttons are legal answers, and the
// log never shows a raw event kind. A `.slow` file, so the vitest sequencer starts it first. The general runs at the AI small
// budget (Plan 5 ruling 5), the opponent is the seeded random one, and the clock is fake: the duration is the AI's work only.
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

const IDS = ['000', ...Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(3, '0'))];
/** Decisions taken before a battle is called stuck (a battle takes a few hundred). */
const MAX_DECISIONS = 3000;

async function playToEnd(id: string) {
  const config: SessionConfig = {
    ...newSessionConfig(id, 'bottom', 'captain'), seed: 1,
    ai: { difficulty: 'captain', budgetScale: 0.05, deterministic: true },
  };
  const c = new GameController(config, new SeededOpponent(), []);
  let decisions = 0;
  // the controller falls back to a random answer, with a console.error, when the general fails: that must never go unseen
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const kinds = new Set(Object.keys(EVENT_KINDS));
  let lastLogId = 0;
  /** Every log line added since the last look (the log keeps only its last 400 lines, so it is read at each step). */
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

describe('every battle plays to the end through the screen\'s controller', () => {
  useFakeClock();
  for (const id of IDS) {
    it(`battle ${id}`, async () => {
      const n = await playToEnd(id);
      console.log(`battle ${id}: ${n} human decisions`);
    }, 300_000);
  }
});
