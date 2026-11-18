// Rules: RR §5.3, §6.2, §6.3, §9.5, §10.3 (design/rules-reference.md)
import { describe, expect, it } from 'vitest';
import type { DieFace, GameDriver, GameEvent, RowKey } from '../../src/engine';
import { GameDriver as Driver, pieceMoves } from '../../src/engine';
import { H, attack, attackOn, build, combatDice, endMoves, ev, forceDice, giveCard, leaderId, must, n, noFirstStrike, play, rolls, toBattle, u, type Pos } from './helpers';

const bot = (key: RowKey, at: [number, number], extra: object = {}) => ({ side: 'bottom' as const, key, at, ...extra });
const top = (key: RowKey, at: [number, number], extra: object = {}) => ({ side: 'top' as const, key, at, ...extra });
const cav = (extra: Pos = {}, def: RowKey = 'FR/LN') => attackOn('BR/HC', def, extra);
const art: DieFace = 'artillery'; // a miss for cavalry and infantry alike

/** Bottom BR/HC u1 (5,6) attacks the top FR/LN u2 (4,6); the defender forms square; `faces` come out first, then misses. */
function charge(extra: Pos, faces: DieFace[], card: 'attackC' | 'cavalryCharge' = 'attackC'): GameDriver {
  const s = build({ ...extra, units: [bot('BR/HC', [5, 6]), top('FR/LN', [4, 6]), ...(extra.units ?? [])] });
  const d = toBattle(s, card, ['u1']);
  ev(d);
  forceDice([...faces, ...n(art, 40)]);
  must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
  if (d.pending?.kind === 'combinedArms') must(d, { kind: 'select', ids: [] });
  must(d, { kind: 'defend', choice: 'formSquare' });
  return d;
}

describe('Infantry squares (§9.5)', () => {
  it('an infantry unit attacked by cavalry may form square (§9.5, R26)', () => {
    expect(cav().pending).toMatchObject({ kind: 'defend', options: ['stand', 'formSquare'] });
  });

  it('forming: a random hand card goes face down on the track; the event names no card (R27)', () => {
    const d = cav();
    ev(d);
    must(d, { kind: 'defend', choice: 'formSquare' });
    const es = ev(d);
    const p = d.state.players.top;
    expect(u(d, 'u2')!.square).toBe(1);
    expect(typeof p.squareTrack[0]).toBe('number');
    expect(p.hand).toHaveLength(4);
    expect(p.hand).not.toContain(p.squareTrack[0]);
    const f = es.find((e) => e.t === 'squareFormed')!;
    expect(Object.keys(f).sort()).toEqual(['id', 'slot', 't']);
    expect(f).toMatchObject({ id: 'u2', slot: 1 });
  });

  it('not with 2 or fewer cards; not on a town; not across works; not with a full track (R26 a, b, c, g)', () => {
    expect(cav({ topCards: 2 }).pending?.kind).not.toBe('defend');
    expect(cav({ topCards: 3 }).pending).toMatchObject({ kind: 'defend', options: ['stand', 'formSquare'] });
    expect(cav({ terrain: [{ t: 'town', at: [4, 6] }] }).pending?.kind).not.toBe('defend');
    // (5,6) lies SE of (4,6)
    expect(cav({ terrain: [{ t: 'fieldworks', on: 'plain', sides: ['SW', 'SE'], at: [4, 6] }] }).pending?.kind).not.toBe('defend');
    expect(cav({ terrain: [{ t: 'fieldworks', on: 'plain', sides: ['NW', 'NE'], at: [4, 6] }] }).pending).toMatchObject({ kind: 'defend', options: ['stand', 'formSquare'] });
    const full = cav({
      topCards: 8,
      units: [0, 2, 4, 6].map((c, i) => top('FR/LN', [0, c], { square: i + 1 })),
    });
    expect(full.pending?.kind).not.toBe('defend');
  });

  it('not against a battle back (R26 d)', () => {
    const s = build({ units: [bot('BR/LN', [5, 6]), top('FR/HC', [4, 6])] });
    const d = toBattle(s, 'attackC', ['u1']);
    forceDice(n(art, 40));
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    if (d.pending?.kind === 'combinedArms') must(d, { kind: 'select', ids: [] });
    ev(d);
    must(d, { kind: 'defend', choice: 'stand' });
    const es = ev(d);
    expect(combatDice(es, 'battleBack')).toBeGreaterThan(0);
    expect(d.pending?.kind).not.toBe('defend');
    expect(es.some((e) => e.t === 'squareFormed')).toBe(false);
    expect(u(d, 'u1')!.square).toBeUndefined();
  });

  it('the square fights first with 1 die; its flags bounce and cannot be ignored (R29, R30, §10.3)', () => {
    const d = charge(
      { units: [bot('BR/LN', [5, 5]), bot('BR/LN', [5, 7])], leaders: [{ side: 'bottom', at: [5, 6] }] },
      ['flag'],
    );
    while (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
    const es = ev(d);
    expect(es.some((e) => e.t === 'combat' && e.purpose === 'squareFirst')).toBe(true);
    expect(combatDice(es, 'squareFirst')).toBe(1);
    expect(rolls(es, 'squareFirst')[0]).toEqual(['flag']);
    const fl = es.find((e) => e.t === 'flags') as Extract<GameEvent, { t: 'flags' }>;
    expect(fl).toMatchObject({ id: 'u1', flags: 1, ignored: 0, bounce: true });
    expect(es.some((e) => e.t === 'retreat' && e.id === 'u1')).toBe(true);
    expect(u(d, 'u1')!.hex).not.toBe(H(5, 6));
    expect(es.some((e) => e.t === 'combat' && (e.purpose === 'melee' || e.purpose === 'battleBack'))).toBe(false);
    expect(es.some((e) => e.t === 'flags' && e.ignored > 0)).toBe(false);
  });

  it('if the cavalry holds, it rolls at most 1 die and the square does not battle back (R29, R31)', () => {
    const d = charge({}, [art], 'cavalryCharge');
    const es = ev(d);
    expect(combatDice(es, 'squareFirst')).toBe(1);
    expect(combatDice(es, 'melee')).toBe(1);
    expect(es.some((e) => e.t === 'combat' && e.purpose === 'battleBack')).toBe(false);
  });

  it('a square already formed fights first in every later cavalry melee (R29)', () => {
    const s = build({ units: [bot('BR/HC', [5, 6]), top('FR/LT', [4, 6], { square: 1 })] });
    const d = toBattle(s, 'attackC', ['u1']);
    ev(d);
    forceDice(n(art, 40));
    attack(d, 'u1', H(4, 6));
    const es = ev(d);
    expect(d.pending?.kind).not.toBe('defend');
    expect(rolls(es, 'squareFirst')).toHaveLength(1);
    expect(es.some((e) => e.t === 'combat' && e.purpose === 'battleBack')).toBe(false);
  });

  it('infantry and artillery against a square: normal dice, then the square battles back with 1 die, ordinary flags (R29, R30)', () => {
    const s = build({ units: [bot('BR/LN', [5, 6]), top('FR/LT', [4, 6], { square: 1 })] });
    const d = toBattle(s, 'attackC', ['u1']);
    ev(d);
    forceDice([...n('cavalry', 4), 'flag', ...n('cavalry', 40)]);   // the square's single die is a flag
    attack(d, 'u1', H(4, 6));
    const es = ev(d);
    expect(combatDice(es, 'squareFirst')).toBeUndefined();
    expect(combatDice(es, 'melee')).toBe(4);
    expect(combatDice(es, 'battleBack')).toBe(1);
    expect(es.find((e) => e.t === 'flags')).toMatchObject({ id: 'u1', flags: 1, bounce: false });   // ordinary: only a square against cavalry bounces (§10.3)
  });

  it('infantry and artillery attacking infantry offer no defend choice and no square (§9.5)', () => {
    for (const atk of ['BR/LN', 'BR/FA'] as RowKey[]) {
      const d = attackOn(atk, 'FR/LN');
      expect(d.pending?.kind, atk).not.toBe('defend');
      expect(ev(d).some((e) => e.t === 'squareFormed'), atk).toBe(false);
      expect(u(d, 'u2')?.square, atk).toBeUndefined();
      forceDice([]);
    }
  });

  it('a square ordered to attack cavalry: no fight-first; the cavalry battles back with 1 die (§9.5)', () => {
    const s = build({ units: [bot('BR/LN', [5, 6], { square: 1 }), top('FR/HC', [4, 6])] });
    const d = toBattle(s, 'attackC', ['u1']);
    ev(d);
    forceDice(n(art, 40));
    attack(d, 'u1', H(4, 6));
    const es = ev(d);
    expect(combatDice(es, 'squareFirst')).toBeUndefined();
    expect(combatDice(es, 'melee')).toBe(1);
    expect(combatDice(es, 'battleBack')).toBe(1);
  });

  it('a square eliminated: its card returns to the hand, the counter to the track; the enemy gains a banner (§9.5)', () => {
    const s = build({ units: [bot('BR/LN', [5, 6]), top('FR/LT', [4, 6], { square: 1, blocks: 1 })] });
    expect(s.players.top.hand).toHaveLength(4);
    const card = s.players.top.squareTrack[0]!;
    const d = toBattle(s, 'attackC', ['u1']);
    ev(d);
    forceDice(n('infantry', 40));
    attack(d, 'u1', H(4, 6));
    const es = ev(d);
    expect(es.some((e) => e.t === 'cardReturned' && e.side === 'top' && e.slot === 1)).toBe(true);
    expect(es.some((e) => e.t === 'squareLeft')).toBe(true);
    expect(d.state.players.top.hand).toHaveLength(5);
    expect(d.state.players.top.hand).toContain(card);
    expect(d.state.players.top.squareTrack[0]).toBeNull();
    expect(d.state.players.bottom.banners).toBe(1);
  });

  it('a square formed after the attack was declared may cut the cavalry to 0 dice; the melee still counts as its battle (R15)', () => {
    const s = build({
      units: [bot('BR/HC', [5, 6], { blocks: 2 }), top('FR/LN', [4, 6])],
      terrain: [{ t: 'forest', at: [4, 6] }],
    });
    const d = toBattle(s, 'attackC', ['u1']);
    ev(d);
    forceDice(n(art, 40));
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    if (d.pending?.kind === 'combinedArms') must(d, { kind: 'select', ids: [] });
    must(d, { kind: 'defend', choice: 'formSquare' });
    const es = ev(d);
    expect(combatDice(es, 'melee')).toBe(0);
    expect(es.some((e) => e.t === 'damage')).toBe(false);
    expect(d.pending?.kind).toBe('playCard');  // u1's one battle is spent: nothing left to do this turn
  });

  it("Command is the hand; each square lowers it; coming out in the Order phase does not raise this turn's Command (§5.3, R28)", () => {
    const s = build({ units: [bot('BR/LN', [6, 6], { square: 1 }), top('FR/LN', [1, 6])] });
    expect(s.players.bottom.hand).toHaveLength(4);
    const d = play(s, 'assaultC', ['u1']);
    expect(d.state.turn.command).toBe(4);
    expect(d.pending).toMatchObject({ kind: 'leaveSquare', unit: 'u1' });
    must(d, { kind: 'yesno', yes: true });
    expect(d.state.players.bottom.hand).toHaveLength(4);
    expect(d.state.turn.command).toBe(4);
    expect(u(d, 'u1')!.square).toBeUndefined();
  });

  it('ordered, a square may come out only with no enemy cavalry adjacent; then it fires with standing dice (§6.3, R32, R5)', () => {
    const s = build({ units: [bot('BR/LN', [6, 6], { square: 1 }), top('FR/LN', [4, 6])] });
    const d = play(s, 'attackC', ['u1']);
    expect(d.pending).toMatchObject({ kind: 'leaveSquare', unit: 'u1' });
    ev(d);
    must(d, { kind: 'yesno', yes: true });
    const es0 = ev(d);
    expect(es0.some((e) => e.t === 'squareLeft')).toBe(true);
    expect(es0.some((e) => e.t === 'cardReturned')).toBe(true);
    endMoves(d);
    forceDice(n(art, 20));
    attack(d, 'u1', H(4, 6));
    expect(combatDice(ev(d), 'fire')).toBe(5);

    const s2 = build({ units: [bot('BR/LN', [5, 6], { square: 1 }), top('FR/HC', [4, 6])] });
    const d2 = play(s2, 'attackC', ['u1']);
    expect(d2.pending?.kind).not.toBe('leaveSquare');
    expect(d2.state.turn.ordered.u1.stayInSquare).toBe(true);
    expect(pieceMoves(d2.state, 'u1')).toEqual([]);
    expect(u(d2, 'u1')!.square).toBe(1);
  });

  it('a leader attached to a square cannot detach; after it comes out he may, with another order (R32)', () => {
    const p: Pos = { units: [bot('BR/LN', [6, 6], { square: 1 }), top('FR/LN', [1, 6])], leaders: [{ side: 'bottom', at: [6, 6] }] };
    const s0 = build(p);
    noFirstStrike(s0);
    const c0 = giveCard(s0, 'bottom', 'probeC');
    const d0 = new Driver(s0);
    must(d0, { kind: 'playCard', card: c0 });
    expect(d0.answer({ kind: 'orders', pieces: [leaderId(s0, 0)] })).toBe(false);
    const s = build(p);
    const d = play(s, 'probeC', [leaderId(s, 0), 'u1']);
    expect(d.pending).toMatchObject({ kind: 'leaveSquare', unit: 'u1' });
    must(d, { kind: 'yesno', yes: true });
    expect(pieceMoves(d.state, leaderId(s, 0)).length).toBeGreaterThan(0);
  });

  it('a rallied square may come out under §6.3 ([Interp R33])', () => {
    const s = build({ units: [bot('BR/LN', [6, 6], { square: 1, blocks: 3 }), top('FR/LN', [1, 6])] });
    noFirstStrike(s);
    const c = giveCard(s, 'bottom', 'rally');
    const d = new Driver(s);
    forceDice(n('infantry', 10));
    must(d, { kind: 'playCard', card: c });
    expect(d.pending?.kind).toBe('rally');
    const faces = (d.pending as { faces: DieFace[] }).faces;
    must(d, { kind: 'assign', ids: faces.map((_, i) => (i === 0 ? 'u1' : null)) });
    expect(u(d, 'u1')!.blocks).toBe(4);
    expect(d.pending).toMatchObject({ kind: 'leaveSquare', unit: 'u1' });
    must(d, { kind: 'yesno', yes: true });
    expect(u(d, 'u1')!.square).toBeUndefined();
  });

  it("La Grande Manoeuvre's group order cannot include a square; its single option can (R62)", () => {
    const p: Pos = { units: [bot('BR/LN', [6, 6], { square: 1 }), bot('BR/LN', [6, 4]), top('FR/LN', [1, 6])] };
    const s = build(p);
    noFirstStrike(s);
    const c = giveCard(s, 'bottom', 'grandManoeuvre');
    const d = new Driver(s);
    must(d, { kind: 'playCard', card: c });
    expect(d.answer({ kind: 'orders', pieces: ['u1', 'u2'] })).toBe(false);
    expect(d.answer({ kind: 'orders', pieces: ['u1'] })).toBe(false);
    must(d, { kind: 'orders', pieces: ['u1'], single: true });
    expect(d.pending).toMatchObject({ kind: 'leaveSquare', unit: 'u1' });
  });

  it('Fire and Hold: a square with no enemy cavalry adjacent comes out and fires standing +1; one that stays fires 1 die (R58)', () => {
    const p: Pos = { units: [bot('BR/LN', [6, 6], { square: 1 }), top('FR/LN', [4, 6])] };
    const fire = (yes: boolean): number | undefined => {
      const s = build(p);
      const d = play(s, 'fireAndHold', ['u1']);
      expect(d.pending).toMatchObject({ kind: 'leaveSquare', unit: 'u1' });
      must(d, { kind: 'yesno', yes });
      endMoves(d);
      ev(d);
      forceDice(n(art, 20));
      attack(d, 'u1', H(4, 6));
      return combatDice(ev(d), 'fire');
    };
    expect(fire(true)).toBe(6);
    expect(fire(false)).toBe(1);
  });

  it("a unit forced out by a cavalry melee may form square against that cavalry's bonus melee (R26)", () => {
    const s = build({ units: [bot('BR/HC', [5, 6]), top('FR/LN', [4, 6])] });
    const d = toBattle(s, 'attackC', ['u1']);
    ev(d);
    forceDice(['flag', ...n(art, 40)]);
    attack(d, 'u1', H(4, 6));
    expect(d.pending?.kind).toBe('retreat');
    const opts = (d.pending as { options: { end: number }[] }).options;
    must(d, { kind: 'choose', index: opts.findIndex((o) => o.end === H(3, 6)) });
    must(d, { kind: 'yesno', yes: true });
    if (d.pending?.kind === 'breakthroughExtra') must(d, { kind: 'hex', hex: null });
    expect(d.pending).toMatchObject({ kind: 'bonusMelee' });
    must(d, { kind: 'hex', hex: H(3, 6) });
    expect(d.pending).toMatchObject({ kind: 'defend', bonus: true });
    expect((d.pending as { options: string[] }).options).toContain('formSquare');
  });
});
