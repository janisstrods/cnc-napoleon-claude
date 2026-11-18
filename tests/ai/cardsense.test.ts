import { describe, expect, it } from 'vitest';
import { CARD_LIST, cloneState, sectionsOf, type CardKind, type GameState, type Side } from '../../src/engine';
import { handFloorPenalty, keepValue, meanHandValue, scoutKeepIndex } from '../../src/ai/cardsense';
import { NEUTRAL_W, weightsFor } from '../../src/ai/values';
import { personalityById } from '../../src/ai/personality';
import { H, build, type Pos } from '../rules/helpers';
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
    expect(sq).toBeCloseTo(keepValue(shorter, me, id('assaultC'), W), 1);
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
});
