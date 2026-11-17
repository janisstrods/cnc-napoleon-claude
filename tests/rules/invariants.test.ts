// Rules: RR §5.3, §12 (design/rules-reference.md)
import { describe, expect, it } from 'vitest';
import { CARD_LIST, GameDriver, SIDES, createGame, forceDice, randomAnswer, type GameState } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { mulberry32 } from '../support/rng';

/** The violated invariants (empty = fine). */
export function violations(s: GameState, atPlayCard: boolean): string[] {
  const out: string[] = [];
  const uh = s.units.filter((u) => u.hex >= 0).map((u) => u.hex);
  if (new Set(uh).size !== uh.length) out.push('two units in one hex');
  const lh = s.leaders.filter((l) => l.hex >= 0).map((l) => l.hex);
  if (new Set(lh).size !== lh.length) out.push('two leaders in one hex');
  for (const u of s.units) if (u.blocks < 1 || u.blocks > u.maxBlocks) out.push(`unit ${u.id} has ${u.blocks}/${u.maxBlocks} blocks`);
  const all = [...s.deck, ...s.discard, ...SIDES.flatMap((x) => [...s.players[x].hand, ...s.players[x].squareTrack.filter((c): c is number => c !== null)])];
  if (s.turn.card !== null) all.push(s.turn.card);
  const counts = new Map<number, number>();
  for (const c of all) counts.set(c, (counts.get(c) ?? 0) + 1);
  if (all.length !== CARD_LIST.length || counts.size !== CARD_LIST.length || [...counts.values()].some((k) => k !== 1)) out.push(`cards: ${all.length} held, ${counts.size} distinct`);
  if (atPlayCard) {
    for (const side of SIDES) {
      const p = s.players[side];
      if (p.hand.length + p.squareTrack.filter((c) => c !== null).length !== p.cards) out.push(`${side} holds ${p.hand.length} cards`);
    }
  }
  return out;
}

describe('rule invariants hold after every decision in random play', () => {
  it('000, 10 seeds', () => {
    forceDice([]);
    for (let g = 0; g < 10; g++) {
      const seed = 7919 + g;
      const d = new GameDriver(createGame(scenarioById('000').setup, seed));
      const rnd = mulberry32(seed);
      let steps = 0;
      while (d.pending && steps < 4000) {
        const a = randomAnswer(d.state, d.pending, rnd);
        if (!d.answer(a)) throw new Error(`rejected ${JSON.stringify(a)}: ${d.lastError}`);
        const v = violations(d.state, d.pending?.kind === 'playCard');
        if (v.length) throw new Error(`game ${g} step ${steps} after ${JSON.stringify(a)}: ${v.join('; ')}`);
        steps++;
      }
      expect(d.state.winner).not.toBeNull();
    }
  });
});
