// Rules: RR §9.6 (design/rules-reference.md)
import { describe, expect, it } from 'vitest';
import { answerError, battleTargets, randomAnswer, type CardKind, type DieFace, type GameDriver, type GameEvent } from '../../src/engine';
import { H, attack, build, endMoves, ev, forceDice, giveCard, must, n, play, toBattle, u, type Pos } from './helpers';

const PAD = n('artillery', 60); // an artillery face never hits infantry or cavalry
type Unit1 = NonNullable<Pos['units']>[number];
const bot = (key: Unit1['key'], at: [number, number], extra: object = {}): Unit1 => ({ side: 'bottom', key, at, ...extra }) as Unit1;
const top = (key: Unit1['key'], at: [number, number], extra: object = {}): Unit1 => ({ side: 'top', key, at, ...extra }) as Unit1;

/** u1 BR/LN (5,6), u2 top FR/LN (4,6), u3 the gun at `gun`. */
const P = (gun: [number, number], extra: Pos = {}): Pos => ({
  ...extra,
  units: [bot('BR/LN', [5, 6]), top('FR/LN', [4, 6]), bot('BR/FA', gun), ...(extra.units ?? [])],
});
const declare = (p: Pos, card: CardKind = 'attackC', pieces = ['u1', 'u3']): GameDriver => {
  const d = toBattle(build(p), card, pieces);
  must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
  return d;
};
const offered = (d: GameDriver): string[] => (d.pending?.kind === 'combinedArms' ? d.pending.options : []);
const combats = (es: GameEvent[]) => es.filter((e): e is Extract<GameEvent, { t: 'combat' }> => e.t === 'combat');
const rollEvents = (es: GameEvent[]) => es.filter((e): e is Extract<GameEvent, { t: 'roll' }> => e.t === 'roll');

describe('Combined Arms (§9.6)', () => {
  it('ordered guns in range with a clear line may join; the decision lists them (§9.6, R39)', () => {
    expect(declare(P([6, 5])).pending).toMatchObject({ kind: 'combinedArms', side: 'bottom', unit: 'u1', target: H(4, 6), options: ['u3'] });
  });

  it("dice: the melee unit's own plus each gun's range dice, rolled together (R41)", () => {
    const d = declare(P([6, 5]));
    ev(d);
    forceDice(PAD);
    must(d, { kind: 'select', ids: ['u3'] });
    const es = ev(d);
    const c = combats(es).find((e) => e.purpose === 'melee')!;
    expect(c).toMatchObject({ attacker: 'u1', target: 'u2', dice: 4, artillery: [{ id: 'u3', dice: 3 }] });
    const r = rollEvents(es).filter((e) => e.purpose === 'melee');
    expect(r).toHaveLength(1);
    expect(r[0].faces).toHaveLength(7);
    expect(r[0].from).toEqual(['u1', 'u3']);
  });

  it("an adjacent gun uses its melee dice (R41)", () => {
    const d = declare(P([4, 5]));
    expect(offered(d)).toEqual(['u3']);
    ev(d);
    forceDice(PAD);
    must(d, { kind: 'select', ids: ['u3'] });
    expect(combats(ev(d)).find((e) => e.purpose === 'melee')).toMatchObject({ dice: 4, artillery: [{ id: 'u3', dice: 4 }] });
  });

  it('no hill battery and no pieces in between (R39)', () => {
    const hill = { terrain: [{ t: 'hill' as const, at: [6, 5] as [number, number] }] };
    expect(offered(declare(P([6, 5], hill)))).toEqual(['u3']);
    const blocked = P([6, 5], { ...hill, units: [bot('BR/LN', [5, 5])] });
    const d = declare(blocked, 'attackC', ['u1', 'u3']);
    expect(offered(d)).toEqual([]);
    expect(d.pending?.kind).not.toBe('combinedArms');
  });

  it('a gun next to another enemy unit joins only against an adjacent target (R39)', () => {
    expect(offered(declare(P([6, 5], { units: [top('FR/LT', [6, 4])] })))).toEqual([]);
    expect(offered(declare(P([4, 5], { units: [top('FR/LT', [3, 4])] })))).toEqual(['u3']);
  });

  it("not against a lone leader; not on a battle back; only the active player's ordered guns (R41, R76)", () => {
    const s = build({ units: [bot('BR/LN', [5, 6]), bot('BR/FA', [6, 5])], leaders: [{ side: 'top', at: [4, 6] }] });
    const d = toBattle(s, 'attackC', ['u1', 'u2']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(d.pending?.kind).not.toBe('combinedArms');
    // an unordered gun in range
    expect(offered(declare(P([6, 5]), 'attackC', ['u1']))).toEqual([]);
    // a top battle back: the defender's guns never ask anything
    const s2 = build(P([6, 5], { units: [top('FR/FA', [3, 5])] }));
    const d2 = toBattle(s2, 'attackC', ['u1', 'u3']);
    must(d2, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    must(d2, { kind: 'select', ids: [] });
    ev(d2);
    forceDice(PAD);
    expect(d2.pending?.kind).not.toBe('combinedArms');
  });

  it('a joining gun is spent even when its dice are lost (R4, [Interp R40])', () => {
    const s = build({ units: [bot('BR/HC', [5, 6]), top('FR/LN', [4, 6], { square: 1 }), bot('BR/FA', [6, 5]), bot('BR/LN', [6, 7])] });
    const d = toBattle(s, 'attackC', ['u1', 'u3', 'u4']);
    ev(d);
    forceDice(['flag', ...PAD]);  // the square's flag bounces the cavalry
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(offered(d)).toEqual(['u3']);
    must(d, { kind: 'select', ids: ['u3'] });
    while (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
    const es = ev(d);
    expect(rollEvents(es).filter((e) => e.purpose === 'melee')).toHaveLength(0);
    expect(d.state.turn.ordered.u3.battled).toBe(true);
    expect(battleTargets(d.state, 'u3')).toEqual([]);
  });

  it("artillery sabres score as the melee unit's do (R17)", () => {
    const run = (atk: Unit1['key']) => {
      const s = build({ units: [bot(atk, [5, 6]), top('FR/LN', [4, 6]), bot('BR/FA', [6, 5])] });
      const d = toBattle(s, 'attackC', ['u1', 'u3']);
      ev(d);
      forceDice([...n('sabre', 20), ...PAD]);
      attack(d, 'u1', H(4, 6), { guns: ['u3'] });
      return rollEvents(ev(d)).find((e) => e.purpose === 'melee')!;
    };
    expect(run('BR/RI').scoring.every((x) => !x)).toBe(true);
    expect(run('BR/LN').scoring.every((x) => x)).toBe(true);
  });

  it("flags of the gun dice in a roll with a square's die against cavalry bounce (R30)", () => {
    const s = build({ units: [bot('BR/LN', [5, 6], { square: 1 }), top('FR/HC', [4, 6]), bot('BR/FA', [6, 5])] });
    const d = toBattle(s, 'attackC', ['u1', 'u3']);
    ev(d);
    forceDice(['flag', 'flag', 'flag', 'flag', ...PAD]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    must(d, { kind: 'select', ids: ['u3'] });
    if (d.pending?.kind === 'defend') must(d, { kind: 'defend', choice: 'stand' });
    expect(d.pending?.kind).not.toBe('ignoreFlags');
    const es = ev(d);
    expect(combats(es).find((e) => e.purpose === 'melee')).toMatchObject({ dice: 1, artillery: [{ id: 'u3', dice: 3 }] });
    expect(es.find((e) => e.t === 'flags')).toMatchObject({ bounce: true, flags: 4, ignored: 0 });
  });

  it("the melee unit survives in place: its dice recounted, the gun dice still rolled (R40)", () => {
    const s = build({ units: [bot('BR/HC', [5, 6]), top('FR/LT', [4, 6], { square: 1 }), bot('BR/FA', [6, 5])] });
    const d = toBattle(s, 'attackC', ['u1', 'u3']);
    ev(d);
    forceDice(PAD);  // the square's die misses
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    must(d, { kind: 'select', ids: ['u3'] });
    const es = ev(d);
    expect(rollEvents(es).find((e) => e.purpose === 'squareFirst')!.faces).toHaveLength(1);
    const mr = rollEvents(es).filter((e) => e.purpose === 'melee');
    expect(mr).toHaveLength(1);
    expect(mr[0].faces).toHaveLength(4);
    expect(mr[0].from).toEqual(['u1', 'u3']);
  });

  it('against Retire and Reform the gun dice roll too, cavalry symbols only (R34, R40)', () => {
    const s = build({ units: [bot('BR/LN', [5, 6]), top('FR/HC', [4, 6]), bot('BR/FA', [6, 5])] });
    const d = toBattle(s, 'attackC', ['u1', 'u3']);
    ev(d);
    const faces: DieFace[] = ['cavalry', 'sabre', 'infantry', 'cavalry', 'artillery', 'flag', 'cavalry'];
    forceDice([...faces, ...PAD]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    must(d, { kind: 'select', ids: ['u3'] });
    must(d, { kind: 'defend', choice: 'retireReform' });
    while (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
    const es = ev(d);
    expect(combats(es).find((e) => e.purpose === 'retireReform')).toMatchObject({ dice: 4, artillery: [{ id: 'u3', dice: 3 }] });
    const r = rollEvents(es).filter((e) => e.purpose === 'retireReform');
    expect(r).toHaveLength(1);
    expect(r[0].faces).toEqual(faces);
    expect(r[0].from).toEqual(['u1', 'u3']);
    expect(r[0].scoring).toEqual([true, false, false, true, false, false, true]);
    expect(es.find((e) => e.t === 'damage' && e.id === 'u2')).toMatchObject({ amount: 3 });
  });

  it('a melee unit with 0 dice may attack when a gun adds dice (R15)', () => {
    const pos = (withGun: boolean): Pos => ({
      terrain: [{ t: 'town', at: [4, 6] }],
      units: [bot('BR/LC', [5, 6], { blocks: 1 }), top('FR/LN', [4, 6]), ...(withGun ? [bot('BR/FA', [6, 5])] : [])],
    });
    const s = build(pos(true));
    const d = toBattle(s, 'attackC', ['u1', 'u3']);
    expect(battleTargets(d.state, 'u1')).toEqual([{ hex: H(4, 6), kind: 'melee', dice: 0 }]);
    const solo = build(pos(false));
    const d0 = toBattle(solo, 'attackC', ['u1']);
    expect(battleTargets(d0.state, 'u1')).toEqual([]);
    expect(d0.answer({ kind: 'attack', unit: 'u1', target: H(4, 6) })).toBe(false);
    ev(d);
    forceDice(PAD);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    must(d, { kind: 'select', ids: ['u3'] });
    const es = ev(d);
    expect(combats(es).find((e) => e.purpose === 'melee')).toMatchObject({ dice: 0, artillery: [{ id: 'u3', dice: 2 }] });
    expect(rollEvents(es).find((e) => e.purpose === 'melee')!.faces).toHaveLength(2);
  });

  describe('a cavalry bonus melee (R41)', () => {
    const win = (guns: string[]): GameDriver => {
      const s = build({ units: [bot('BR/HC', [5, 6]), top('FR/LN', [4, 6], { blocks: 1 }), bot('BR/FA', [3, 5]), top('FR/LN', [2, 6])] });
      const d = toBattle(s, 'attackC', ['u1', 'u3']);
      forceDice([...n('infantry', 10), ...PAD]);
      attack(d, 'u1', H(4, 6), { guns });
      must(d, { kind: 'yesno', yes: true });
      must(d, { kind: 'hex', hex: H(3, 6) });
      return d;
    };
    it('may combine with an ordered gun that has not battled', () => {
      const d = win([]);
      expect(d.pending).toMatchObject({ kind: 'bonusMelee', targets: [H(2, 6)] });
      must(d, { kind: 'hex', hex: H(2, 6) });
      expect(d.pending).toMatchObject({ kind: 'combinedArms', unit: 'u1', target: H(2, 6), options: ['u3'] });
    });
    it('not with a gun that joined the first melee', () => {
      const d = win(['u3']);
      expect(d.pending).toMatchObject({ kind: 'bonusMelee' });
      must(d, { kind: 'hex', hex: H(2, 6) });
      expect(d.pending?.kind).not.toBe('combinedArms');
    });
  });

  it('the defend decision carries the joined guns, [] when they are declined (R40: declared before the reaction)', () => {
    for (const ids of [['u3'], []]) {
      const d = toBattle(build(P([6, 5])), 'attackC', ['u1', 'u3']);
      giveCard(d.state, 'top', 'firstStrike'); // so the defender has a choice to make
      must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
      must(d, { kind: 'select', ids });
      expect(d.pending).toMatchObject({ kind: 'defend', side: 'top', attacker: 'u1', target: 'u2', options: ['stand', 'firstStrike'], artillery: ids });
    }
  });

  it('on a bonus melee the defend decision carries only the guns of that melee (R41)', () => {
    // u1 BR/HC breaks through the worn FR/LN at (4,6) with u3; u5 is declined there and joins the bonus melee on (2,6)
    const s = build({ units: [bot('BR/HC', [5, 6]), top('FR/LN', [4, 6], { blocks: 1 }), bot('BR/FA', [3, 5]), top('FR/LN', [2, 6]), bot('BR/FA', [3, 7])] });
    const d = toBattle(s, 'attackC', ['u1', 'u3', 'u5']);
    forceDice([...n('infantry', 10), ...PAD]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(d.pending).toMatchObject({ kind: 'combinedArms', options: ['u3', 'u5'] });
    must(d, { kind: 'select', ids: ['u3'] });
    expect(d.pending).toMatchObject({ kind: 'defend', bonus: false, artillery: ['u3'] }); // infantry may form square against cavalry
    must(d, { kind: 'defend', choice: 'stand' });
    must(d, { kind: 'yesno', yes: true });
    must(d, { kind: 'hex', hex: H(3, 6) });
    must(d, { kind: 'hex', hex: H(2, 6) });
    expect(d.pending).toMatchObject({ kind: 'combinedArms', target: H(2, 6), options: ['u5'] });
    must(d, { kind: 'select', ids: ['u5'] });
    expect(d.pending).toMatchObject({ kind: 'defend', bonus: true, target: 'u4', artillery: ['u5'] });
    forceDice([]);
  });

  it('Cold Steel: a gun adjacent to the same target joins and both get +1 (R61)', () => {
    const s = build(P([4, 5]));
    const d = toBattle(s, 'coldSteel', ['u1', 'u3']);
    ev(d);
    forceDice(PAD);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    must(d, { kind: 'select', ids: ['u3'] });
    expect(combats(ev(d)).find((e) => e.purpose === 'melee')).toMatchObject({ dice: 5, artillery: [{ id: 'u3', dice: 5 }] });
  });

  it("Élan: the gun's share gets its +1 (R53)", () => {
    const s = build(P([6, 5]));
    forceDice(['infantry', 'artillery', 'sabre', 'sabre', 'sabre']);
    const d = play(s, 'elan');
    must(d, { kind: 'assign', ids: ['u1', 'u3', null, null, null] });
    endMoves(d);
    ev(d);
    forceDice(PAD);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    must(d, { kind: 'select', ids: ['u3'] });
    expect(combats(ev(d)).find((e) => e.purpose === 'melee')).toMatchObject({ dice: 5, artillery: [{ id: 'u3', dice: 4 }] });
  });

  it('the defender battles back against the melee unit only (R38)', () => {
    const d = declare(P([6, 5]));
    ev(d);
    forceDice(PAD);
    must(d, { kind: 'select', ids: ['u3'] });
    const es = ev(d);
    expect(combats(es).find((e) => e.purpose === 'battleBack')).toMatchObject({ attacker: 'u2', target: 'u1' });
    expect(u(d, 'u3')!.blocks).toBe(3);
  });

  describe('a melee unit with no dice of its own (R15)', () => {
    const zero = (): GameDriver => {
      const s = build({ terrain: [{ t: 'town', at: [4, 6] }], units: [bot('BR/LC', [5, 6], { blocks: 1 }), top('FR/LN', [4, 6]), bot('BR/FA', [6, 5])] });
      const d = toBattle(s, 'attackC', ['u1', 'u3']);
      must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
      return d;
    };
    it('must bring at least one gun: select [] is refused', () => {
      const d = zero();
      expect(d.pending).toMatchObject({ kind: 'combinedArms', required: true, options: ['u3'] });
      expect(d.answer({ kind: 'select', ids: [] })).toBe(false);
      expect(answerError(d.state, d.pending!, { kind: 'select', ids: [] })).toMatch(/at least one gun/);
      expect(answerError(d.state, d.pending!, { kind: 'select', ids: ['u3'] })).toBeNull();
    });
    it('the random answer always includes a gun', () => {
      const d = zero();
      for (let i = 0; i < 30; i++) {
        const a = randomAnswer(d.state, d.pending!, () => (i % 2 ? 0.99 : 0.01));
        expect(a).toMatchObject({ kind: 'select' });
        expect((a as { ids: string[] }).ids.length).toBeGreaterThan(0);
      }
    });
    it('with one gun the attack resolves normally', () => {
      const d = zero();
      ev(d);
      forceDice(PAD);
      must(d, { kind: 'select', ids: ['u3'] });
      expect(rollEvents(ev(d)).find((e) => e.purpose === 'melee')!.faces).toHaveLength(2);
    });
    it('a unit with dice of its own is not required to bring a gun', () => {
      const d = declare(P([6, 5]));
      expect(d.pending).toMatchObject({ kind: 'combinedArms', required: false });
      expect(d.answer({ kind: 'select', ids: [] })).toBe(true);
    });
  });

  it('a square attacking cavalry with no gun: its flags bounce (R30)', () => {
    const s = build({ units: [bot('BR/LN', [5, 6], { square: 1 }), top('FR/HC', [4, 6])] });
    const d = toBattle(s, 'attackC', ['u1']);
    ev(d);
    forceDice(['flag', ...PAD]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    must(d, { kind: 'defend', choice: 'stand' });
    expect(d.pending?.kind).not.toBe('ignoreFlags');
    expect(ev(d).find((e) => e.t === 'flags')).toMatchObject({ bounce: true, flags: 1, ignored: 0 });
  });

  it("a square with 0 dice of its own (the hill) brings a gun: no square's die in the roll, so the flags are ordinary (R30)", () => {
    const s = build({ terrain: [{ t: 'hill', at: [4, 6] }], units: [bot('BR/LN', [5, 6], { square: 1 }), top('FR/HC', [4, 6]), bot('BR/FA', [6, 5])] });
    const d = toBattle(s, 'attackC', ['u1', 'u3']);
    ev(d);
    forceDice(['flag', 'flag', 'flag', ...PAD]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(d.pending).toMatchObject({ kind: 'combinedArms', required: true, options: ['u3'] });
    must(d, { kind: 'select', ids: ['u3'] });
    if (d.pending?.kind === 'defend') must(d, { kind: 'defend', choice: 'stand' });
    const es = ev(d);
    expect(combats(es).find((e) => e.purpose === 'melee')).toMatchObject({ dice: 0, artillery: [{ id: 'u3', dice: expect.any(Number) }] });
    expect(es.find((e) => e.t === 'flags')).toMatchObject({ id: 'u2', bounce: false });
  });
});
