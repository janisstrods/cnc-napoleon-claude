// The hidden-information boundary (src/ai/view.ts): the unseen pool, card odds, blind clones and determinisation.
import { describe, expect, it } from 'vitest';
import { CARD_LIST, cardKind, createGame, GameDriver, randomAnswer, type CardKind, type GameState, type Side } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { Rng } from '../../src/ai/rand';
import {
  assumeOppHand, blindClone, determinize, driverOn, handSize, myHand, myTrack, oppHoldsP, sampledOppHolds, trackFilled, unseenCards, unseenOf,
} from '../../src/ai/view';
import { build } from '../rules/helpers';
import { failOnAiErrors } from './no-ai-errors';

failOnAiErrors();

const ME: Side = 'bottom';
const OPP: Side = 'top';
const ALL = CARD_LIST.map((_, i) => i);
const sorted = (a: readonly number[]): number[] => [...a].sort((x, y) => x - y);

/** Lay the cards out explicitly: my hand and track, the opponent's hand and track, the deck; the rest is the discard. */
function lay(s: GameState, l: { mine?: number[]; myTrack?: (number | null)[]; opp?: number[]; oppTrack?: (number | null)[]; deck: number[] }): GameState {
  s.players[ME].hand = l.mine ?? s.players[ME].hand;
  s.players[ME].squareTrack = l.myTrack ?? [null, null, null, null];
  s.players[OPP].hand = l.opp ?? s.players[OPP].hand;
  s.players[OPP].squareTrack = l.oppTrack ?? [null, null, null, null];
  s.deck = l.deck;
  const used = new Set([...s.players[ME].hand, ...s.players[ME].squareTrack, ...s.players[OPP].hand, ...s.players[OPP].squareTrack, ...s.deck]);
  s.discard = ALL.filter((c) => !used.has(c));
  s.turn.card = null;
  return s;
}

const idsOf = (kind: CardKind): number[] => ALL.filter((c) => cardKind(c) === kind);
const notKind = (kind: CardKind): number[] => ALL.filter((c) => cardKind(c) !== kind);

/** A state with a square for each of the opponent's two units (slots 1 and 3) and cards on its track. */
function withSquares(): GameState {
  const s = build({ units: [
    { side: 'bottom', key: 'BR/LN', at: [5, 6] }, { side: 'top', key: 'FR/LN', at: [1, 1] }, { side: 'top', key: 'FR/LN', at: [1, 2] },
  ] });
  s.units[1].square = 1;
  s.units[2].square = 3;
  const c = sorted(ALL);
  const mine = c.slice(0, 5);
  const myTr = [c[5], null, null, null];
  const opp = c.slice(30, 35);
  const oppTr = [c[40], null, c[41], null];
  const out = new Set([...mine, c[5], ...opp, c[40], c[41], ...c.slice(20, 26)]); // the last six go to the discard
  lay(s, { mine, myTrack: myTr, opp, oppTrack: oppTr, deck: c.filter((x) => !out.has(x)) });
  return s;
}

describe('the unseen pool', () => {
  it('is deck + opponent hand + opponent track, sorted, and excludes my hand, my track and the discard', () => {
    const s = withSquares();
    const direct = sorted([...s.deck, ...s.players[OPP].hand, ...s.players[OPP].squareTrack.filter((c): c is number => c !== null)]);
    const pool = unseenCards(s, ME);
    expect(pool).toEqual(direct);
    expect(pool).toEqual(sorted(pool));
    for (const c of [...myHand(s, ME), ...myTrack(s, ME).filter((c): c is number => c !== null), ...s.discard]) expect(pool).not.toContain(c);
  });

  it('equals the union view at every decision of a real game', () => {
    const d = new GameDriver(createGame(scenarioById('000').setup, 11));
    const rng = new Rng(5);
    let n = 0;
    while (!d.over && n++ < 600) {
      const s = d.state;
      for (const me of ['top', 'bottom'] as Side[]) {
        const opp: Side = me === 'top' ? 'bottom' : 'top';
        const direct = sorted([...s.deck, ...s.players[opp].hand, ...s.players[opp].squareTrack.filter((c): c is number => c !== null)]);
        expect(unseenCards(s, me)).toEqual(direct);
      }
      const dec = d.pending!;
      d.answer(randomAnswer(s, dec, () => rng.next()));
    }
    expect(n).toBeGreaterThan(50);
  });

  it('unseenOf counts one kind', () => {
    const s = withSquares();
    const direct = unseenCards(s, ME).filter((c) => cardKind(c) === 'firstStrike').length;
    expect(unseenOf(s, ME, 'firstStrike')).toBe(direct);
  });
});

describe('oppHoldsP', () => {
  /** A pool of exactly 40 unseen cards with `k` of the kind; opponent holds 5. */
  function pooled(kind: CardKind, k: number, size = 40): GameState {
    const s = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [5, 6] }, { side: 'top', key: 'FR/LN', at: [1, 1] }] });
    const of = idsOf(kind).slice(0, k);
    const rest = notKind(kind).slice(0, size - k);
    const pool = [...rest.slice(0, 20), ...of, ...rest.slice(20)];
    const mine = notKind(kind).filter((c) => !pool.includes(c)).slice(0, 5);
    return lay(s, { mine, opp: pool.slice(0, 5), deck: pool.slice(5) });
  }

  it('matches the hypergeometric value: 2 First Strikes unseen in a pool of 40, opponent holds 5 -> 1 - C(38,5)/C(40,5)', () => {
    const s = pooled('firstStrike', 2);
    expect(unseenCards(s, ME)).toHaveLength(40);
    const C = (n: number, k: number): number => {
      let r = 1;
      for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
      return r;
    };
    expect(oppHoldsP(s, ME, 'firstStrike')).toBeCloseTo(1 - C(38, 5) / C(40, 5), 12);
  });

  it('is 0 when no card of the kind is unseen and 1 when the whole pool is that kind', () => {
    const s = pooled('firstStrike', 0);
    expect(oppHoldsP(s, ME, 'firstStrike')).toBe(0);
    const t = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [5, 6] }, { side: 'top', key: 'FR/LN', at: [1, 1] }] });
    const kind: CardKind = 'firstStrike';
    const fs = idsOf(kind);
    const pool = fs.slice(0, 2); // both First Strikes unseen, opponent hand of 2: the whole pool is that kind
    lay(t, { mine: notKind(kind).slice(0, 5), opp: pool, deck: [] });
    expect(unseenCards(t, ME)).toHaveLength(2);
    expect(oppHoldsP(t, ME, kind)).toBe(1);
  });
});

describe('assumeOppHand', () => {
  it('holds=true puts exactly one card of the kind in the hand; holds=false none; hand sizes unchanged; my hand untouched', () => {
    const s = withSquares();
    for (const kind of ['firstStrike', 'probeC'] as CardKind[]) {
      expect(unseenOf(s, ME, kind)).toBeGreaterThan(0);
      const yes = assumeOppHand(s, ME, kind, true);
      const no = assumeOppHand(s, ME, kind, false);
      expect(yes.players[OPP].hand.filter((c) => cardKind(c) === kind)).toHaveLength(1);
      expect(no.players[OPP].hand.filter((c) => cardKind(c) === kind)).toHaveLength(0);
      for (const c of [yes, no]) {
        expect(c.players[OPP].hand).toHaveLength(handSize(s, OPP));
        expect(c.players[ME].hand).toEqual(s.players[ME].hand);
        expect(c.players[ME].squareTrack).toEqual(s.players[ME].squareTrack);
        expect(sorted([...c.deck, ...c.players[OPP].hand, ...c.players[OPP].squareTrack.filter((x): x is number => x !== null)])).toEqual(unseenCards(s, ME));
        expect(c.rng).toBe(1);
      }
    }
  });
});

describe('determinize', () => {
  it('keeps hand sizes, filled track slots and the multiset of unseen cards, and never changes my hand or track', () => {
    const s = withSquares();
    const c = blindClone(s, ME);
    determinize(c, ME, new Rng(77));
    expect(c.players[OPP].hand).toHaveLength(handSize(s, OPP));
    expect(c.players[OPP].squareTrack.map((x) => x !== null)).toEqual(s.players[OPP].squareTrack.map((x) => x !== null));
    expect(sorted([...c.deck, ...c.players[OPP].hand, ...c.players[OPP].squareTrack.filter((x): x is number => x !== null)])).toEqual(unseenCards(s, ME));
    expect(c.players[ME].hand).toEqual(s.players[ME].hand);
    expect(c.players[ME].squareTrack).toEqual(s.players[ME].squareTrack);
    expect(c.rngCalls).toBe(0);
    expect(c.deck).not.toEqual(blindClone(s, ME).deck); // actually shuffled
  });

  it('depends only on which cards are unseen: the same unseen set in different places gives identical results', () => {
    const a = withSquares();
    const b = withSquares();
    const pool = unseenCards(a, ME);
    const rev = [...pool].reverse();
    b.players[OPP].hand = rev.slice(0, 5);
    b.players[OPP].squareTrack = [rev[5], null, rev[6], null];
    b.deck = rev.slice(7);
    b.rng = 987654;
    expect(unseenCards(b, ME)).toEqual(pool);
    const ca = blindClone(a, ME);
    const cb = blindClone(b, ME);
    determinize(ca, ME, new Rng(5));
    determinize(cb, ME, new Rng(5));
    expect(cb).toEqual(ca);
  });
});

describe('trackFilled', () => {
  it('counts square counters on units, not track entries', () => {
    const s = withSquares();
    expect(trackFilled(s, OPP)).toBe(2);
    expect(trackFilled(s, ME)).toBe(0); // my track holds a card, but no unit of mine is in a square
    s.players[OPP].squareTrack = [null, null, null, null];
    expect(trackFilled(s, OPP)).toBe(2);
  });
});

describe('blindClone', () => {
  it('keeps my hand, my track, the board and hand sizes, and gives the same result whatever the real opponent hand, track, deck order and rng', () => {
    const a = withSquares();
    const b = withSquares();
    const pool = unseenCards(a, ME);
    const rev = [...pool].reverse();
    b.players[OPP].hand = rev.slice(0, 5);
    b.players[OPP].squareTrack = [rev[5], null, rev[6], null];
    b.deck = rev.slice(7);
    b.rng = 31337;
    b.rngCalls = 12;
    const ca = blindClone(a, ME);
    const cb = blindClone(b, ME);
    expect(cb).toEqual(ca);
    expect(ca.players[ME].hand).toEqual(a.players[ME].hand);
    expect(ca.players[ME].squareTrack).toEqual(a.players[ME].squareTrack);
    expect(ca.units).toEqual(a.units);
    expect(ca.players[OPP].hand).toHaveLength(5);
    expect(ca.rng).toBe(1);
    expect(ca.rngCalls).toBe(0);
    expect(a.players[OPP].hand).not.toEqual(ca.players[OPP].hand); // the source is untouched
  });
});

describe('sampledOppHolds', () => {
  it('throws on a clone determinize did not produce', () => {
    const s = withSquares();
    expect(() => sampledOppHolds(s, ME, 'firstStrike')).toThrow();
    expect(() => sampledOppHolds(blindClone(s, ME), ME, 'firstStrike')).toThrow();
    const c = blindClone(s, ME);
    determinize(c, ME, new Rng(1));
    expect(typeof sampledOppHolds(c, ME, 'firstStrike')).toBe('boolean');
  });
});

describe('the blind-clone guards', () => {
  it('determinize and driverOn refuse a state that blindClone did not make', () => {
    const s = withSquares();
    expect(() => determinize(s, ME, new Rng(1))).toThrow();
    expect(() => driverOn(s)).toThrow();
    expect(() => driverOn(blindClone(s, ME))).not.toThrow();
    expect(() => driverOn(assumeOppHand(s, ME, 'firstStrike', true))).not.toThrow();
  });

  it('blindClone throws when the pool does not account for the deck, hand and filled slots', () => {
    const s = withSquares();
    s.units[1].square = undefined; // a filled track slot with no square counter on the board
    expect(() => blindClone(s, ME)).toThrow(/unseen pool/);
  });
});
