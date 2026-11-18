// An exiting unit is removed before the banner event that names it: the controller keeps its name for that one line.
import { describe, expect, it } from 'vitest';
import { UNIT_STATS, cloneState, type Side } from '../../src/engine';
import { GameController, newSessionConfig } from '../../src/ui/game/controller';
import { SeededOpponent, eventPlayer, runToHuman, useFakeClock } from './controller-helpers';

describe('the exit banner line', () => {
  useFakeClock();
  async function settled(human: Side) {
    const c = new GameController({ ...newSessionConfig('000', human, 'captain'), seed: 9 }, new SeededOpponent());
    await runToHuman(c);
    return { c, animate: eventPlayer(c) };
  }
  const lastLog = (c: GameController) => c.view.log[c.view.log.length - 1].text;

  it('names the unit that left, and forgets it after the line', async () => {
    const { c, animate } = await settled('bottom');
    try {
      const s0 = c.driver.state;
      const unit = s0.units.find((u) => u.side === 'top')!;
      const gone = cloneState(s0);
      gone.units = gone.units.filter((u) => u.id !== unit.id);
      await animate({ t: 'removed', id: unit.id, reason: 'left the field' }, gone);
      const banner = { t: 'banner' as const, side: 'bottom' as const, total: 1, reason: `${unit.id} leaves by the baseline.` };
      await animate(banner, gone);
      expect(lastLog(c)).toContain(`— ${UNIT_STATS[unit.key].name} leaves by the baseline.`);
      expect(lastLog(c)).not.toMatch(/\bunit\b leaves|\bu\d+\b/);
      // the name is used once: the same banner again no longer knows the unit
      await animate(banner, gone);
      expect(lastLog(c)).toContain('— unit leaves by the baseline.');
    } finally {
      c.dispose();
    }
  });
});
