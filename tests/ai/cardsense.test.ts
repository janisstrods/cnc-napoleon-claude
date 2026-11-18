import { describe, expect, it } from 'vitest';
import { CARD_LIST, cloneState, sectionsOf, statsOf, type CardKind, type GameState, type Side } from '../../src/engine';
import { handFloorPenalty, keepValue, meanHandValue, rallyAssign, rallyGain, scoutKeepIndex } from '../../src/ai/cardsense';
import { NEUTRAL_W, weightsFor } from '../../src/ai/values';
import { personalityById } from '../../src/ai/personality';
import { rowValue } from '../../src/ai/values';
import { build, must, play, type Pos } from '../rules/helpers';
import { failOnAiErrors } from './no-ai-errors';

failOnAiErrors();

type Units = NonNullable<Pos['units']>;
const top = (key: Units[number]['key'], at: [number, number], extra: object = {}) => ({ side: 'top' as const, key, at, ...extra });
const bot = (key: Units[number]['key'], at: [number, number], extra: object = {}) => ({ side: 'bottom' as const, key, at, ...extra });
const W = NEUTRAL_W;
const id = (k: CardKind): number => CARD_LIST.indexOf(k);
const me: Side = 'bottom';

/** `n` bottom line infantry units in the centre section, facing a top line unit. */
function centre(n: number, cards = 5): GameState {
  const at: [number, number][] = [[7, 5], [7, 6], [7, 7], [8, 5], [8, 6], [8, 7], [7, 4], [7, 8], [8, 4], [8, 8]];
  const units = [...at.slice(0, n).map((a) => bot('BR/LN', a)), top('FR/LN', [5, 6]), top('FR/LN', [5, 8])];
  return build({ units, cards });
}
const sized = (s: GameState, side: Side, n: number): GameState => {
  const c = cloneState(s);
  c.players[side].hand = c.players[side].hand.slice(0, n);
  return c;
};

describe('keepValue', () => {
  it('Assault and Élan rise with Command; a section card for an empty section is worth little', () => {
    const s = centre(7);
    expect(sectionsOf(s.units[0].hex, me)).toContain('center');
    for (const k of ['assaultC', 'elan'] as const) {
      const low = keepValue(sized(s, me, 2), me, id(k), W);
      const high = keepValue(sized(s, me, 6), me, id(k), W);
      expect(high, k).toBeGreaterThan(low);
    }
    // every unit stands in the centre: the Left Attack has nobody to order
    expect(keepValue(s, me, id('attackL'), W)).toBeLessThan(0.05);
    expect(keepValue(s, me, id('attackC'), W)).toBeGreaterThan(keepValue(s, me, id('attackL'), W) * 3);
    // strong cards sit above weak ones
    expect(keepValue(s, me, id('assaultC'), W)).toBeGreaterThan(keepValue(s, me, id('scoutC'), W));
  });

  it('Command for keep values excludes square-track cards (R28)', () => {
    const base = centre(6);
    const inSquare = cloneState(base);
    // a unit in square holds a card on the track: the hand is one card shorter, and so is Command
    inSquare.units[0].square = 1;
    inSquare.players[me].squareTrack[0] = inSquare.players[me].hand.pop()!;
    const n = base.players[me].hand.length;
    expect(inSquare.players[me].hand.length).toBe(n - 1);
    const shorter = sized(base, me, n - 1);
    // the same keep value as a hand of n-1 with nothing on the track: the track card is not counted
    const sq = keepValue(inSquare, me, id('assaultC'), W);
    expect(sq).toBeLessThan(keepValue(base, me, id('assaultC'), W));
    expect(sq).toBe(keepValue(shorter, me, id('assaultC'), W));
  });

  it('First Strike is kept while enemy units can reach ours and is cheap to play when none can', () => {
    const near = build({ units: [bot('BR/LN', [6, 6]), top('FR/LC', [4, 6])] });
    const far = build({ units: [bot('BR/LN', [8, 6]), top('FR/LN', [0, 6])] });
    const a = keepValue(near, me, id('firstStrike'), W);
    const b = keepValue(far, me, id('firstStrike'), W);
    expect(a).toBeGreaterThan(b + W.firstStrikeReserve * W.retention * 0.9);
    expect(b).toBeLessThan(0.08);
  });

  it('Counter-Attack copies the value of the opponent last card (lastCard), mirrored for section cards', () => {
    const s = centre(4);
    const n = cloneState(s);
    n.lastCard.top = 'attackL';
    // top's Left is bottom's Right: the copy is the mirrored Attack Right
    expect(keepValue(n, me, id('counterAttack'), W)).toBeCloseTo(keepValue(n, me, id('attackR'), W), 10);
    n.lastCard.top = 'bombard';
    expect(keepValue(n, me, id('counterAttack'), W)).toBeCloseTo(keepValue(n, me, id('bombard'), W), 10);
    n.lastCard.top = null;
    expect(keepValue(n, me, id('counterAttack'), W)).toBeLessThan(0.06);
    n.lastCard.top = 'counterAttack';
    expect(keepValue(n, me, id('counterAttack'), W)).toBeLessThan(0.06);
  });

  it('scoutKeepIndex keeps the higher keep value', () => {
    const s = centre(5);
    expect(scoutKeepIndex(s, me, [id('attackL'), id('assaultC')], W)).toBe(1);
    expect(scoutKeepIndex(s, me, [id('assaultC'), id('attackL')], W)).toBe(0);
    expect(scoutKeepIndex(s, me, [id('attackC'), id('attackC')], W)).toBe(0);
  });

  it('meanHandValue is the mean keep value of the hand, near a mean card', () => {
    const s = centre(6);
    const hand = s.players[me].hand;
    const mean = hand.reduce((a, c) => a + keepValue(s, me, c, W), 0) / hand.length;
    expect(meanHandValue(s, me, W)).toBeCloseTo(mean, 12);
    expect(mean).toBeGreaterThan(0.03);
    expect(mean).toBeLessThan(0.5);
    const empty = cloneState(s);
    empty.players[me].hand = [];
    expect(meanHandValue(empty, me, W)).toBeGreaterThan(0);
  });

  it('personalities scale keep values by retention', () => {
    const s = centre(5);
    const cunning = weightsFor(personalityById('wellington'));
    const ratio = keepValue(s, me, id('assaultC'), cunning) / keepValue(s, me, id('assaultC'), W);
    expect(ratio).toBeCloseTo(cunning.retention / W.retention, 10);
  });

  it('keep values ignore the opponent hand and the deck', () => {
    const s = centre(5);
    const t = cloneState(s);
    t.players.top.hand = [...s.deck.slice(0, 5)];
    t.deck = [...s.deck.slice(5), ...s.players.top.hand];
    for (const k of ['assaultC', 'firstStrike', 'counterAttack', 'elan', 'rally'] as const) {
      expect(keepValue(t, me, id(k), W), k).toBe(keepValue(s, me, id(k), W));
    }
    expect(meanHandValue(t, me, W)).toBe(meanHandValue(s, me, W));
    expect(handFloorPenalty(t, me)).toBe(handFloorPenalty(s, me));
  });
});

describe('handFloorPenalty', () => {
  const kit = (cards: number, cav = true) => build({ units: [bot('BR/LN', [6, 6]), bot('BR/LN', [6, 7]), top(cav ? 'FR/HC' : 'FR/LN', [4, 6])], cards });

  it('is positive only when the hand would drop to 2 or fewer with enemy cavalry near our infantry', () => {
    expect(handFloorPenalty(kit(2), me)).toBeGreaterThan(0);
    expect(handFloorPenalty(kit(5), me)).toBe(0);
    expect(handFloorPenalty(kit(2, false), me)).toBe(0);
    // a square formed (one card to the track) takes a hand of 3 to 2
    expect(handFloorPenalty(kit(3), me)).toBe(0);
    expect(handFloorPenalty(kit(3), me, 1)).toBeGreaterThan(0);
    // cavalry out of reach
    const far = build({ units: [bot('BR/LN', [8, 2]), top('FR/HC', [0, 10])], cards: 2 });
    expect(handFloorPenalty(far, me)).toBe(0);
  });

  it('follows the position when the engine mutates the state in place (no stale board)', () => {
    const s = kit(2);
    expect(handFloorPenalty(s, me)).toBeGreaterThan(0);
    const m = s.units.find((u) => u.side === 'top')!;
    m.hex = -1;
    expect(handFloorPenalty(s, me)).toBe(0);
    const f = centre(5);
    const before = keepValue(f, me, id('firstStrike'), W);
    f.units.find((u) => u.side === 'top')!.hex = -1;
    f.units.find((u) => u.side === 'top' && u.hex >= 0)!.hex = -1;
    expect(keepValue(f, me, id('firstStrike'), W)).not.toBe(before);
  });

  it('counts only infantry that could form square: not in a town, not with a full track', () => {
    const open = build({ units: [bot('BR/LN', [6, 6]), top('FR/HC', [4, 6])], cards: 2 });
    expect(handFloorPenalty(open, me)).toBeGreaterThan(0);
    const town = build({ units: [bot('BR/LN', [6, 6]), top('FR/HC', [4, 6])], terrain: [{ at: [6, 6], t: 'town' }], cards: 2 });
    expect(handFloorPenalty(town, me)).toBe(0);
    const full = cloneState(open);
    full.players[me].squareTrack = [0, 1, 2, 3];
    expect(handFloorPenalty(full, me)).toBe(0);
  });
});

describe('rallyGain: the exact expectation against the engine', () => {
  const N = 700;
  const cases: { label: string; units: Units }[] = [
    { label: 'one cavalry at 1 block', units: [bot('BR/LC', [7, 6], { blocks: 1 }), bot('BR/LN', [7, 5]), top('FR/LN', [2, 6])] },
    { label: 'one infantry at 1 of 4', units: [bot('BR/LN', [7, 6], { blocks: 1 }), top('FR/LN', [2, 6])] },
    { label: 'mixed', units: [bot('BR/LN', [7, 6], { blocks: 2 }), bot('BR/LC', [7, 7], { blocks: 1 }), bot('BR/FA', [7, 5], { blocks: 1 }), bot('BR/LN', [7, 4], { blocks: 3 }), top('FR/LN', [2, 6])] },
  ];
  for (const c of cases) {
    it(`${c.label}: rallyGain is within 3 standard errors of the engine's rolls`, () => {
      const s0 = build({ units: c.units, first: 'bottom' });
      const expected = rallyGain(s0, me, s0.players[me].hand.length);
      expect(expected).toBeGreaterThan(0);
      let sum = 0;
      let sum2 = 0;
      for (let seed = 1; seed <= N; seed++) {
        const s = build({ units: c.units, first: 'bottom' });
        s.rng = seed;
        const before = new Map(s.units.map((u) => [u.id, u.blocks]));
        const d = play(s, 'rally');
        if (d.pending?.kind === 'rally') must(d, { kind: 'assign', ids: rallyAssign(d.state, me, d.pending.faces) });
        let v = 0;
        for (const u of d.state.units) v += rowValue(statsOf(d.state, u), u.blocks) - rowValue(statsOf(d.state, u), before.get(u.id)!);
        sum += v;
        sum2 += v * v;
      }
      const mean = sum / N;
      const se = Math.sqrt(Math.max(1e-12, sum2 / N - mean * mean) / N);
      expect(Math.abs(mean - expected), `${c.label}: engine ${mean.toFixed(4)} vs ${expected.toFixed(4)} (se ${se.toFixed(4)})`).toBeLessThanOrEqual(3 * se);
    });
  }
});
