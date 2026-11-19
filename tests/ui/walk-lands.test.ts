// A piece the board walks stays where its walk ended: when the walk is over the board shows the state after the move,
// with the piece on its last hex. It used to show the piece back on its start hex until the next event (the move event's
// state was taken before the piece was moved), so a computer turn of several moves (Force March) looked wobbly: a unit
// walked, jumped back, the next one walked, and the first jumped to where it had gone.
import { describe, expect, it, vi } from 'vitest';
import { other, pieceById, randomAnswer, type HexId, type Side } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { GameController, newSessionConfig } from '../../src/ui/game/controller';
import { rng } from '../../src/ui/terrain/noise';
import { SeededOpponent, useFakeClock } from './controller-helpers';

describe('a walk lands', () => {
  useFakeClock();

  it('the piece is shown on its last hex when the walk ends, for both sides', async () => {
    const human: Side = other(scenarioById('000').setup.first);
    const c = new GameController({ ...newSessionConfig('000', human, 'captain'), seed: 9 }, new SeededOpponent());
    let walking: Record<string, HexId> = {};
    const landed: { id: string; at: HexId; shown: HexId | undefined }[] = [];
    c.subscribe(() => {
      const now = c.view.walking;
      for (const id of Object.keys(walking)) {
        if (now[id] === undefined) landed.push({ id, at: walking[id], shown: pieceById(c.view.display, id)?.hex });
      }
      walking = now;
    });
    const pick = rng(11);
    try {
      for (let i = 0; i < 40; i++) {
        for (let k = 0; k < 60000 && !c.view.pending; k++) {
          if (c.view.fatal || c.view.over) throw new Error(`the battle stopped: ${c.view.error ?? 'over'}`);
          await vi.advanceTimersByTimeAsync(10);
        }
        c.answer(randomAnswer(c.driver.state, c.view.pending!, pick));
      }
    } finally {
      c.dispose();
    }
    expect(landed.length).toBeGreaterThan(5);
    for (const l of landed) expect(l.shown, `piece ${l.id}`).toBe(l.at);
  });
});
