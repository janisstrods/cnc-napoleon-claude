// The state a driver snapshots with a movement event is the state right after it: the UI walks the piece along the
// event's path and then shows that snapshot, so a snapshot that still had the piece on its start hex made it jump back
// (and jump forward again at the next event).
import { describe, expect, it } from 'vitest';
import { GameDriver, pieceMoves, type GameState } from '../../src/engine';
import { build, giveCard, leaderId, must, noFirstStrike } from '../rules/helpers';

const B = (key: string, r: number, c: number) => ({ side: 'bottom' as const, key: key as never, at: [r, c] as [number, number] });

function hexOf(s: GameState, id: string): number | undefined {
  return (s.units.find((u) => u.id === id) ?? s.leaders.find((l) => l.id === id))?.hex;
}

describe('movement event snapshots', () => {
  it('a move event carries the state with the piece (and its attached leader) on the end hex', () => {
    const s = build({
      units: [B('BR/LN', 6, 5), B('BR/LN', 6, 7)],
      leaders: [{ side: 'bottom', at: [6, 7] }],
    });
    noFirstStrike(s);
    const card = giveCard(s, 'bottom', 'forceMarch');
    const d = new GameDriver(s, { snapshots: true });
    must(d, { kind: 'playCard', card });
    if (d.pending?.kind === 'orders') must(d, { kind: 'orders', pieces: ['u1', 'u2'] });
    d.drainEvents();
    // the furthest hex each can reach (one and two hexes: the leader makes u2 fast under Force March)
    const far = (id: string) => pieceMoves(d.state, id).reduce((a, b) => (b.path.length > a.path.length ? b : a)).hex;
    const to1 = far('u1');
    must(d, { kind: 'move', piece: 'u1', to: to1 });
    const to2 = far('u2');
    must(d, { kind: 'move', piece: 'u2', to: to2 });
    const moves = d.drainEvents().filter((q) => q.e.t === 'move');
    expect(moves).toHaveLength(2);
    for (const q of moves) {
      if (q.e.t !== 'move') continue;
      expect(hexOf(q.state!, q.e.id)).toBe(q.e.path[q.e.path.length - 1]);
    }
    // the second snapshot keeps the first unit where it went, and the leader rides with its unit
    expect(hexOf(moves[1].state!, 'u1')).toBe(to1);
    expect(hexOf(moves[1].state!, leaderId(s, 0))).toBe(to2);
  });
});
