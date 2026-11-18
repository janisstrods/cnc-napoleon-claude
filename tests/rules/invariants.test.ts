// Rules: RR §1, §2, §5.3, §9.5, §12, §13.1 (design/rules-reference.md)
import { describe, expect, it } from 'vitest';
import {
  CARD_LIST, GameDriver, NUM_HEXES, SIDES, bannerTotal, createGame, forceDice, passableFor, randomAnswer, statsOf,
  type GameEvent, type GameState, type Side,
} from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { lcg } from '../support/rng';

/** Event kinds that may carry a card id (the only two the UI may show). Every other event must carry none. */
const CARD_EVENTS: ReadonlySet<GameEvent['t']> = new Set(['cardPlayed', 'discarded']);

/** The violated invariants of a state (empty = fine). `atPlayCard`: a card decision is pending, so every hand is whole. */
export function violations(s: GameState, atPlayCard: boolean): string[] {
  const out: string[] = [];
  // 1. each of the 70 cards exactly once
  const all = [...s.deck, ...s.discard, ...SIDES.flatMap((x) => [...s.players[x].hand, ...s.players[x].squareTrack.filter((c): c is number => c !== null)])];
  if (s.turn.card !== null) all.push(s.turn.card);
  const counts = new Map<number, number>();
  for (const c of all) counts.set(c, (counts.get(c) ?? 0) + 1);
  if (all.length !== CARD_LIST.length || counts.size !== CARD_LIST.length || [...counts.values()].some((k) => k !== 1)) out.push(`cards: ${all.length} held, ${counts.size} distinct`);
  // 2. hand plus filled track slots is the hand size at every card decision
  if (atPlayCard) {
    for (const side of SIDES) {
      const p = s.players[side];
      if (p.hand.length + p.squareTrack.filter((c) => c !== null).length !== p.cards) out.push(`${side} holds ${p.hand.length} cards`);
    }
  }
  // 3. one unit and one leader per hex; no leader on an enemy; every piece on a board hex passable for it
  const uh = s.units.filter((u) => u.hex >= 0).map((u) => u.hex);
  if (new Set(uh).size !== uh.length) out.push('two units in one hex');
  const lh = s.leaders.filter((l) => l.hex >= 0).map((l) => l.hex);
  if (new Set(lh).size !== lh.length) out.push('two leaders in one hex');
  for (const u of s.units) {
    if (u.hex >= NUM_HEXES) out.push(`unit ${u.id} off the board table (${u.hex})`);
    else if (u.hex >= 0 && !passableFor(s, u.hex, statsOf(s, u).arm)) out.push(`unit ${u.id} on an impassable hex ${u.hex}`);
  }
  for (const l of s.leaders) {
    if (l.hex >= NUM_HEXES) out.push(`leader ${l.id} off the board table (${l.hex})`);
    else if (l.hex >= 0) {
      if (!passableFor(s, l.hex, null)) out.push(`leader ${l.id} on an impassable hex ${l.hex}`);
      const on = s.units.find((u) => u.hex === l.hex);
      if (on && on.side !== l.side) out.push(`leader ${l.id} stands on enemy unit ${on.id}`);
    }
  }
  // 4. 1 ≤ blocks ≤ maxBlocks
  for (const u of s.units) if (u.hex >= 0 && (u.blocks < 1 || u.blocks > u.maxBlocks)) out.push(`unit ${u.id} has ${u.blocks}/${u.maxBlocks} blocks`);
  // 5. a square's counter and the track slot agree, slots are unique per side
  for (const side of SIDES) {
    const mine = s.units.filter((u) => u.hex >= 0 && u.side === side && u.square !== undefined);
    const slots = mine.map((u) => u.square!);
    if (new Set(slots).size !== slots.length) out.push(`${side} has two squares in one slot`);
    for (const u of mine) if (s.players[side].squareTrack[u.square! - 1] === null) out.push(`square ${u.id} has no card on slot ${u.square}`);
    s.players[side].squareTrack.forEach((c, i) => {
      if (c !== null && !mine.some((u) => u.square === i + 1)) out.push(`${side} track slot ${i + 1} holds a card with no square`);
    });
  }
  return out;
}

/** The victory invariant (6): the winner has the banners, and nobody else has them while the battle goes on. */
function victoryViolations(s: GameState, pending: boolean): string[] {
  const out: string[] = [];
  if (s.winner) {
    if (s.winner !== 'draw' && bannerTotal(s, s.winner) < s.bannersToWin) out.push(`${s.winner} won with ${bannerTotal(s, s.winner)} of ${s.bannersToWin} banners`);
    if (pending) out.push('a decision is pending after the victory');
  } else {
    for (const side of SIDES) if (bannerTotal(s, side) >= s.bannersToWin) out.push(`${side} has ${bannerTotal(s, side)} banners but no winner`);
  }
  return out;
}

/** Card ids in events (7): any numeric card field outside `cardPlayed` and `discarded`. */
function eventLeaks(es: GameEvent[]): string[] {
  const out: string[] = [];
  for (const e of es) {
    if (CARD_EVENTS.has(e.t)) continue;
    for (const [k, v] of Object.entries(e)) {
      if (/card|hand|deck/i.test(k)) out.push(`${e.t}.${k} = ${JSON.stringify(v)}`);
    }
  }
  return out;
}

describe('rule invariants hold after every decision in random play', () => {
  for (let g = 0; g < 20; g++) {
    const first: Side = g < 10 ? 'top' : 'bottom';
    it(`000, seed ${g}, ${first} first`, () => {
      forceDice([]);
      const seed = 7919 + g;
      const d = new GameDriver(createGame({ ...scenarioById('000').setup, first }, seed));
      const rnd = lcg(seed);
      const banners: Record<Side, number> = { top: 0, bottom: 0 };
      let steps = 0;
      expect(violations(d.state, d.pending?.kind === 'playCard')).toEqual([]);
      while (d.pending && steps < 4000) {
        const dec = d.pending;
        const a = randomAnswer(d.state, dec, rnd);
        if (!d.answer(a)) throw new Error(`rejected ${JSON.stringify(a)}: ${d.lastError}`);
        const where = `game ${g} step ${steps} after ${JSON.stringify(a)}`;
        const v = [
          ...violations(d.state, d.pending?.kind === 'playCard'),
          ...victoryViolations(d.state, d.pending !== null),
          ...eventLeaks(d.drainEvents().map((q) => q.e)).map((x) => `event leaks a card: ${x}`),
        ];
        for (const side of SIDES) {
          if (d.state.players[side].banners < banners[side]) v.push(`${side} permanent banners fell`);
          banners[side] = d.state.players[side].banners;
        }
        if (v.length) throw new Error(`${where}: ${v.join('; ')}`);
        steps++;
      }
      expect(d.state.winner, `turn ${d.state.turn.number}`).not.toBeNull();
      expect(d.pending).toBeNull();
    });
  }
});
