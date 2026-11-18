// Rules: RR §15.8, §16.6, §16.15 (design/rules-reference.md); design/exp1-rulings.md S34, S37
import { describe, expect, it } from 'vitest';
import type { CardKind, GameDriver, GameEvent, RowKey } from '../../src/engine';
import { cardKind } from '../../src/engine/cards';
import { H, build, ev, forceDice, giveCard, must, n, play, u, type Pos } from './helpers';

const bot = (key: RowKey, at: [number, number], extra: object = {}) => ({ side: 'bottom' as const, key, at, ...extra });
const top = (key: RowKey, at: [number, number], extra: object = {}) => ({ side: 'top' as const, key, at, ...extra });
const MISS = n('artillery', 80); // an artillery face never hits infantry or cavalry

const CAP: Pos['sideRules'] = [{ kind: 'squareCap', side: 'top', units: 2 }];
const FOLLY: Pos['sideRules'] = [{ kind: 'cavalryChargeFolly', side: 'top' }];

/** Three bottom cavalry (row 5) face three top infantry (row 4); the cavalry attack one after another and every die misses. */
function threeCharges(extra: Pos = {}): GameDriver {
  const cols = [2, 6, 10];
  const s = build({
    ...extra,
    units: [...cols.map((c) => bot('BR/HC', [5, c])), ...cols.map((c) => top('FR/LN', [4, c]))],
  });
  const d = play(s, 'cavalryCharge', ['u1', 'u2', 'u3']);
  if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
  ev(d);
  forceDice(MISS);
  return d;
}

/** Cavalry `i` (1..3) attacks the infantry above it; returns the defend decision's options, or null when none was asked. */
function chargeOptions(d: GameDriver, i: number, choice?: 'formSquare'): string[] | null {
  must(d, { kind: 'attack', unit: `u${i}`, target: H(4, [2, 6, 10][i - 1]) });
  if (d.pending?.kind === 'combinedArms') must(d, { kind: 'select', ids: [] });
  if (d.pending?.kind !== 'defend') return null;
  const options = [...d.pending.options];
  must(d, { kind: 'defend', choice: choice ?? 'stand' });
  return options;
}

describe('106: at most two units form square (S34)', () => {
  it('two different units may form square over the battle; a third never may (S34)', () => {
    const d = threeCharges({ sideRules: CAP });
    expect(chargeOptions(d, 1, 'formSquare')).toEqual(['stand', 'formSquare']);
    expect(chargeOptions(d, 2, 'formSquare')).toEqual(['stand', 'formSquare']);
    expect(d.state.special.squared.top).toEqual(['u4', 'u5']);
    expect(d.state.players.top.hand.length).toBeGreaterThanOrEqual(3); // the hand is not what refuses the third
    expect(chargeOptions(d, 3, 'formSquare')).toBeNull(); // only 'stand' is left, so nothing is asked
    expect(u(d, 'u6')!.square).toBeUndefined();
  });

  it('without the cap rule the third unit may form square too', () => {
    const d = threeCharges();
    chargeOptions(d, 1, 'formSquare');
    chargeOptions(d, 2, 'formSquare');
    expect(chargeOptions(d, 3)).toEqual(['stand', 'formSquare']);
  });

  it('either of the two may form square again after leaving it (S34)', () => {
    const s = build({
      sideRules: CAP,
      units: [bot('BR/HC', [5, 2]), bot('BR/HC', [5, 6]), top('FR/LN', [4, 2], { square: 1 }), top('FR/LN', [4, 6], { square: 2 }), top('FR/LN', [4, 10])],
    });
    expect(s.special.squared.top).toEqual(['u3', 'u4']); // starting squares count
    // u3 leaves its square (as the leave-square step does)
    s.units.find((x) => x.id === 'u3')!.square = undefined;
    s.players.top.squareTrack[0] = null;
    const d = play(s, 'cavalryCharge', ['u1', 'u2']);
    if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
    ev(d);
    forceDice(MISS);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 2) });
    if (d.pending?.kind === 'combinedArms') must(d, { kind: 'select', ids: [] });
    expect(d.pending).toMatchObject({ kind: 'defend', options: ['stand', 'formSquare'] });
  });

  it('a unit outside the two is refused while the two stand out of square (S34)', () => {
    const s = build({
      sideRules: CAP,
      units: [bot('BR/HC', [5, 10]), top('FR/LN', [4, 2], { square: 1 }), top('FR/LN', [4, 6], { square: 2 }), top('FR/LN', [4, 10])],
    });
    for (const x of s.units.filter((y) => y.square !== undefined)) x.square = undefined;
    s.players.top.squareTrack = [null, null, null, null];
    const d = play(s, 'cavalryCharge', ['u1']);
    if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
    ev(d);
    forceDice(MISS);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 10) });
    if (d.pending?.kind === 'combinedArms') must(d, { kind: 'select', ids: [] });
    expect(d.pending?.kind).not.toBe('defend');
  });

  it('the other square limits still apply (R26)', () => {
    // a member of the two, with the cap reached, still needs 3 cards in hand and ground that allows a square
    const member = (extra: Pos, hand?: number): GameDriver => {
      const s = build({
        sideRules: CAP,
        units: [bot('BR/HC', [5, 6]), top('FR/LN', [4, 6]), top('FR/LN', [4, 2], { square: 1 }), top('FR/LN', [4, 10], { square: 2 })],
        ...extra,
      });
      s.special.squared.top = ['u2', 'u3']; // u2 formed square before and has left it
      s.units.find((x) => x.id === 'u4')!.square = undefined;
      s.players.top.squareTrack[1] = null;
      if (hand !== undefined) s.players.top.hand.length = hand;
      const d = play(s, 'cavalryCharge', ['u1']);
      if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
      ev(d);
      forceDice(MISS);
      must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
      if (d.pending?.kind === 'combinedArms') must(d, { kind: 'select', ids: [] });
      return d;
    };
    expect(member({}).pending).toMatchObject({ kind: 'defend', options: ['stand', 'formSquare'] });
    expect(member({}, 2).pending?.kind).not.toBe('defend');
    expect(member({ terrain: [{ t: 'town', at: [4, 6] }] }).pending?.kind).not.toBe('defend');
  });
});

describe("115: Stewart's Folly (S37)", () => {
  /** Bottom BR/HC u1 (5,6) attacks top FR/LN u2 (4,6), which holds First Strike. */
  function folly(card: CardKind, o: { rules?: Pos['sideRules']; last?: CardKind; before?: (s: ReturnType<typeof build>) => void; after?: (d: GameDriver) => void } = {}): { d: GameDriver; pending: GameDriver['pending']; pre: GameEvent[]; es: GameEvent[] } {
    const s = build({
      sideRules: o.rules ?? FOLLY,
      units: [bot('BR/HC', [5, 6]), top('FR/LN', [4, 6])],
    });
    if (o.last) s.lastCard.top = o.last;
    giveCard(s, 'top', 'firstStrike');
    o.before?.(s);
    const d = play(s, card, ['u1'], { keepFS: true });
    if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
    o.after?.(d);
    const pre = ev(d);
    forceDice(MISS);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    if (d.pending?.kind === 'combinedArms') must(d, { kind: 'select', ids: [] });
    return { d, pending: d.pending, pre, es: ev(d) };
  }

  /** The melee went ahead with no defend decision: it was resolved, with no square formed and no First Strike played. */
  function noChoice(r: ReturnType<typeof folly>): void {
    expect(r.pending?.kind).not.toBe('defend');
    expect(r.es.some((e) => e.t === 'combat' && e.purpose === 'melee')).toBe(true);
    expect(r.es.some((e) => e.t === 'squareFormed' || (e.t === 'cardPlayed' && e.kind === 'firstStrike'))).toBe(false);
    expect(r.d.state.players.top.hand.some((c) => cardKind(c) === 'firstStrike')).toBe(true); // still held
  }

  it('on the enemy\'s Cavalry Charge turn the folly side may not form square or play First Strike (S37)', () => {
    noChoice(folly('cavalryCharge'));
    // the same melee on another card offers all three
    expect(folly('attackC').pending).toMatchObject({ kind: 'defend', options: ['stand', 'formSquare', 'firstStrike'] });
  });

  it('a Counter-Attack copying Cavalry Charge brings the folly too (S37)', () => {
    const r = folly('counterAttack', { last: 'cavalryCharge' });
    expect(r.pre.find((e) => e.t === 'cardPlayed')).toMatchObject({ kind: 'counterAttack', effective: 'cavalryCharge' });
    noChoice(r);
  });

  it('a Cavalry Charge that a guerrilla counter failed to cancel (sabre) still brings the folly (S37)', () => {
    noChoice(folly('cavalryCharge', { after: (g) => { g.state.turn.guerrilla = 'stood'; } }));
  });

  it('a Cavalry Charge that a guerrilla counter cancelled brings no folly (S37)', () => {
    expect(folly('cavalryCharge', { after: (g) => { g.state.turn.guerrilla = 'cancelled'; } }).pending).toMatchObject({ kind: 'defend', options: ['stand', 'formSquare', 'firstStrike'] });
  });

  it("on other turns, and against the folly side's own Cavalry Charge, squares and First Strike are offered as usual", () => {
    expect(folly('bayonetCharge').pending).toMatchObject({ kind: 'defend', options: ['stand', 'formSquare', 'firstStrike'] });
    expect(folly('cavalryCharge', { rules: [] }).pending).toMatchObject({ kind: 'defend', options: ['stand', 'formSquare', 'firstStrike'] });
    // the folly side charges: its opponent (no rule) keeps its options
    const s = build({
      sideRules: FOLLY,
      first: 'top',
      units: [top('FR/HC', [4, 6]), bot('BR/LN', [5, 6])],
    });
    giveCard(s, 'bottom', 'firstStrike');
    const d = play(s, 'cavalryCharge', ['u1'], { keepFS: true });
    if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
    ev(d);
    forceDice(MISS);
    must(d, { kind: 'attack', unit: 'u1', target: H(5, 6) });
    if (d.pending?.kind === 'combinedArms') must(d, { kind: 'select', ids: [] });
    expect(d.pending).toMatchObject({ kind: 'defend', options: ['stand', 'formSquare', 'firstStrike'] });
  });
});
