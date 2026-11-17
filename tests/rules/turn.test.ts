// Turn structure and victory (rules-reference §5, §13). Restored from the Ancients turn-scenarios suite, which also held
// battle-specific rules (deleted in Plan 2A).
import { beforeEach, describe, expect, it } from 'vitest';
import { GameDriver } from '../../src/engine';
import { H, build, forceDice, giveCard, must, n, noFirstStrike, passTurn, play, toBattle } from './helpers';

beforeEach(() => forceDice([]));

describe('turn structure', () => {
  it('play 1 card, discard it, draw 1: hand back to Command, deck one smaller', () => {
    const s = build({ units: [{ side: 'bottom', type: 'MI', at: [6, 6] }] });
    noFirstStrike(s);
    const deck = s.deck.length;
    const d = new GameDriver(s);
    passTurn(d);
    expect(d.state.players.bottom.hand).toHaveLength(5);
    expect(d.state.deck).toHaveLength(deck - 1);
    expect(d.state.discard).toHaveLength(1);
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
  });
  it('an empty deck is rebuilt by shuffling the discards', () => {
    const s = build({ units: [{ side: 'bottom', type: 'MI', at: [6, 6] }] });
    noFirstStrike(s);
    const card = giveCard(s, 'bottom', 'order2L');
    s.discard = s.deck.splice(0, s.deck.length);
    const d = new GameDriver(s);
    must(d, { kind: 'playCard', card });
    must(d, { kind: 'orders', pieces: [] });
    expect(d.state.players.bottom.hand).toHaveLength(5);
    expect(d.state.deck).toHaveLength(50);
    expect(d.state.discard).toHaveLength(0);
  });
  it('turns alternate', () => {
    const s = build({ units: [{ side: 'bottom', type: 'MI', at: [6, 6] }, { side: 'top', type: 'MI', at: [2, 6] }] });
    const d = new GameDriver(s);
    passTurn(d);
    expect(d.state.active).toBe('top');
    passTurn(d);
    expect(d.state.active).toBe('bottom');
  });
  it('all movement happens before any battle', () => {
    const s = build({ units: [
      { side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'bottom', type: 'MI', at: [6, 2] }, { side: 'top', type: 'MI', at: [4, 6] },
    ] });
    const d = play(s, 'order4C', ['u1']);
    must(d, { kind: 'endMove' });
    must(d, { kind: 'endBattle' });
    expect(d.pending?.kind).toBe('playCard');
    const s2 = build({ units: [{ side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6] }] });
    const d2 = toBattle(s2, 'order4C', ['u1']);
    expect(d2.answer({ kind: 'move', piece: 'u1', to: H(5, 5) })).toBe(false);
  });
  it('unordered units may not battle', () => {
    const s = build({ units: [
      { side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'bottom', type: 'MI', at: [5, 4] }, { side: 'top', type: 'MI', at: [4, 6] },
      { side: 'top', type: 'MI', at: [4, 4] },
    ] });
    const d = toBattle(s, 'order4C', ['u1']);
    expect(d.answer({ kind: 'attack', unit: 'u2', target: H(4, 4) })).toBe(false);
  });
});

describe('victory', () => {
  it('the first player to reach the banner count wins immediately', () => {
    const s = build({ banners: 1, units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6], blocks: 1 }] });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['medium', ...n('light', 4)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(d.state.winner).toBe('bottom');
    expect(d.pending).toBeNull();
  });
  it('an eliminated leader is a banner', () => {
    const s = build({ banners: 1, units: [{ side: 'bottom', type: 'HI', at: [5, 6] }], leaders: [{ side: 'top', at: [4, 6] }] });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['leader', ...n('light', 4)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(d.state.winner).toBe('bottom');
  });
});

