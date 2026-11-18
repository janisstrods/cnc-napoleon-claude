// GameDriver.undo: a Scout draw reveals deck cards without rolling a die, so undo must stop at it.
import { describe, expect, it } from 'vitest';
import { build, giveCard, must, play } from '../rules/helpers';

describe('undo and the Scout draw', () => {
  const pos = () => build({ units: [{ side: 'bottom', key: 'BR/LN', at: [6, 6] }, { side: 'top', key: 'FR/LN', at: [1, 6] }] });

  it('cannot take back a card whose Scout draw has shown the deck', () => {
    const d = play(pos(), 'scoutC', []);
    expect(d.pending?.kind).toBe('scoutKeep');
    expect(d.canUndo()).toBe(false);
    expect(d.undoStep()).toBeNull();
    const before = d.answers.length;
    expect(d.undo().answers.length).toBe(before - 1);   // nothing to take back: only the last answer goes, as always
  });

  it('still takes back an ordinary card played with no die rolled', () => {
    const d = play(pos(), 'probeC', ['u1']);
    expect(d.canUndo()).toBe(true);
    expect(d.undoStep()).toBe('card');
  });

  it('an earlier turn\'s Scout draw does not stop the next player taking back a card', () => {
    const s = pos();
    const probe = giveCard(s, 'top', 'probeC');
    const d = play(s, 'scoutC', []);
    must(d, { kind: 'choose', index: 0 });
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
    expect(d.canUndo()).toBe(false);   // nothing of the new player's own yet
    must(d, { kind: 'playCard', card: probe });
    expect(d.pending).toMatchObject({ kind: 'orders', side: 'top' });
    expect(d.undoStep()).toBe('card');
  });
});
