// Rules: RR §9.7, §9.8, §14.15 (design/rules-reference.md)
import { describe, expect, it } from 'vitest';
import type { CardKind, DieFace, GameDriver, RowKey } from '../../src/engine';
import { H, attack, build, combatDice, endMoves, ev, forceDice, must, n, play, toBattle, u, type Pos } from './helpers';

const PAD = n('artillery', 40);        // padding after the dice a test cares about: an artillery face never hits infantry or cavalry
const topLn = (at: [number, number], blocks = 1): NonNullable<Pos['units']>[number] => ({ side: 'top', key: 'FR/LN', at, blocks });
const gone = (d: GameDriver, id: string): boolean => !u(d, id) || u(d, id)!.hex < 0;
const pendingOf = (d: GameDriver) => d.pending as unknown as Record<string, unknown>;

/** A bottom attacker u1 at (5,6) against a 1-block FR/LN at (4,6) (u2); the first dice come out as `faces`. */
const win = (atk: RowKey, extra: Pos = {}, card: CardKind = 'attackC', faces: DieFace[] = n('infantry', 4), atBlocks?: number, pieces: string[] = ['u1'], tweak?: (s: ReturnType<typeof build>) => void): GameDriver => {
  const s0 = build({
    ...extra,
    units: [{ side: 'bottom', key: atk, at: [5, 6], blocks: atBlocks }, topLn([4, 6]), ...(extra.units ?? [])],
  });
  tweak?.(s0);
  const d = toBattle(s0, card, pieces);
  forceDice([...faces, ...PAD]);
  attack(d, 'u1', H(4, 6));
  return d;
};
/** Answer the decisions that follow a declared bonus melee. */
const bonus = (d: GameDriver, hex: number, faces: DieFace[]): void => {
  forceDice([...faces, ...PAD]);
  must(d, { kind: 'hex', hex });
  if (d.pending?.kind === 'combinedArms') must(d, { kind: 'select', ids: [] });
  if (d.pending?.kind === 'defend') must(d, { kind: 'defend', choice: 'stand' });
};
const impetuousBottom: Pos = { sideRules: [{ kind: 'impetuousCavalry', side: 'bottom', keys: ['BR/HC'] }] };

describe('take ground (§9.7, R35)', () => {
  it('infantry may take ground into the vacated hex (§9.7, R35)', () => {
    const d = win('BR/LN');
    expect(d.pending).toMatchObject({ kind: 'advance', how: 'takeGround', hex: H(4, 6), unit: 'u1' });
    must(d, { kind: 'yesno', yes: true });
    expect(u(d, 'u1')!.hex).toBe(H(4, 6));
    const e = ev(d).find((x) => x.t === 'advance');
    expect(e).toMatchObject({ id: 'u1', path: [H(5, 6), H(4, 6)] });
    expect(d.pending?.kind).toBe('playCard');
  });
  it('declining leaves the unit in place; infantry never get a bonus melee (R37)', () => {
    const d = win('BR/LN', { units: [topLn([3, 6])] });
    must(d, { kind: 'yesno', yes: false });
    expect(u(d, 'u1')!.hex).toBe(H(5, 6));
    const e = win('BR/LN', { units: [topLn([3, 6])] });
    must(e, { kind: 'yesno', yes: true });
    expect(e.pending?.kind).toBe('playCard');
  });
  it('no advance after fire, by guns, by a battle back (§9.7)', () => {
    const f = toBattle(build({ units: [{ side: 'bottom', key: 'BR/LN', at: [6, 6] }, topLn([4, 6])] }), 'attackC', ['u1']);
    forceDice([...n('infantry', 4), ...PAD]);
    attack(f, 'u1', H(4, 6));
    expect(gone(f, 'u2')).toBe(true);
    expect(f.pending?.kind).toBe('playCard');
    const g = win('BR/FA', {}, 'attackC', n('infantry', 6));
    expect(g.pending?.kind).toBe('playCard');
    expect(gone(g, 'u2')).toBe(true);
    // a top attacker eliminated by the battle back... the active side's attacker is never asked about the defender's win
    const s = build({ first: 'top', units: [{ side: 'top', key: 'FR/LN', at: [4, 6], blocks: 1 }, { side: 'bottom', key: 'BR/LN', at: [5, 6] }] });
    const b = toBattle(s, 'attackC', ['u1']);
    forceDice([...n('sabre', 4), ...n('infantry', 10), ...PAD]);
    attack(b, 'u1', H(5, 6));
    expect(b.pending?.kind).not.toBe('advance');
  });
  it('no advance after entering a stop hex this turn; a unit that began there and did not move may advance (R35)', () => {
    const moved = (terrain: 'forest' | 'brook' | 'fordNoStop'): GameDriver => {
      const s = build({ units: [{ side: 'bottom', key: 'BR/LT', at: [6, 6] }, topLn([4, 6])] });
      s.terrain[H(5, 6)] = terrain;
      const d = play(s, 'attackC', ['u1']);
      must(d, { kind: 'move', piece: 'u1', to: H(5, 6) });
      endMoves(d);
      forceDice([...n('infantry', 5), ...PAD]);
      attack(d, 'u1', H(4, 6));
      return d;
    };
    expect(moved('forest').pending?.kind).toBe('playCard');       // took the hit but no advance
    expect(gone(moved('forest'), 'u2')).toBe(true);
    expect(moved('brook').pending?.kind).toBe('playCard');        // a brook stops movement (R83)
    expect(moved('fordNoStop').pending).toMatchObject({ kind: 'advance', how: 'takeGround' });   // R83
    // began in the forest and did not move: advance offered
    const k = win('BR/LN', { terrain: [{ at: [5, 6], t: 'forest' }] });
    expect(k.pending).toMatchObject({ kind: 'advance', how: 'takeGround' });
  });
  it('take ground obeys terrain: it may enter a town and stops there (R35)', () => {
    const d = win('BR/LN', { terrain: [{ at: [4, 6], t: 'town' }] }, 'attackC', n('infantry', 4));
    expect(d.pending).toMatchObject({ kind: 'advance', how: 'takeGround', hex: H(4, 6) });
    must(d, { kind: 'yesno', yes: true });
    expect(u(d, 'u1')!.hex).toBe(H(4, 6));
  });
  it('take ground into a ford is allowed and stops there; a works crossing too (R35)', () => {
    const d = win('BR/LN', {}, 'attackC', n('infantry', 4), undefined, ['u1'], (s) => { s.terrain[H(4, 6)] = 'ford'; });
    expect(d.pending).toMatchObject({ kind: 'advance', how: 'takeGround', hex: H(4, 6) });
    must(d, { kind: 'yesno', yes: true });
    expect(u(d, 'u1')!.hex).toBe(H(4, 6));
  });
  it('a square ordered to attack never takes ground (§9.7)', () => {
    const s = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [5, 6], square: 1 }, topLn([4, 6])] });
    const d = play(s, 'attackC', ['u1']);
    must(d, { kind: 'yesno', yes: false });  // it stays in square (T9: ordered with no cavalry adjacent, it is asked)
    endMoves(d);
    forceDice([...n('infantry', 4), ...PAD]);
    attack(d, 'u1', H(4, 6));
    expect(gone(d, 'u2')).toBe(true);
    expect(d.pending?.kind).not.toBe('advance');
  });
  it('take ground after a lone leader retreated or was killed (§11.4)', () => {
    const s = build({ leaders: [{ side: 'top', at: [4, 6] }], units: [{ side: 'bottom', key: 'BR/LN', at: [5, 6] }] });
    const d = toBattle(s, 'attackC', ['u1']);
    forceDice(['flag', 'flag', ...PAD]);
    attack(d, 'u1', H(4, 6));
    if (d.pending?.kind === 'leaderRetreat') must(d, { kind: 'choose', index: 0 });
    expect(d.pending).toMatchObject({ kind: 'advance', how: 'takeGround', hex: H(4, 6) });
    expect(d.state.leaders[0].hex).not.toBe(H(4, 6));
    const k = build({ leaders: [{ side: 'top', at: [4, 6] }], units: [{ side: 'bottom', key: 'BR/LN', at: [5, 6] }] });
    const e = toBattle(k, 'attackC', ['u1']);
    forceDice(['sabre', ...PAD]);
    attack(e, 'u1', H(4, 6));
    expect(e.pending).toMatchObject({ kind: 'advance', how: 'takeGround' });
  });
  it('take ground after a destroyed unit\'s leader has retreated (§11.2)', () => {
    const s = build({ leaders: [{ side: 'top', at: [4, 6] }], units: [{ side: 'bottom', key: 'BR/LN', at: [5, 6] }, topLn([4, 6])] });
    const d = toBattle(s, 'attackC', ['u1']);
    // 4 hits-dice: one hit kills the 1 block; the leader's casualty check (2 dice or 1) misses; he retreats
    forceDice([...n('infantry', 4), 'sabre', 'sabre', 'sabre', ...PAD]);
    attack(d, 'u1', H(4, 6));
    while (d.pending?.kind === 'leaderRetreat') must(d, { kind: 'choose', index: 0 });
    expect(d.pending).toMatchObject({ kind: 'advance', how: 'takeGround', hex: H(4, 6) });
  });
});

describe('cavalry breakthrough and bonus melee (§9.8, R36, R37)', () => {
  it('cavalry breaks through: the vacated hex, then optionally 1 more, its original hex included (§9.8, R36)', () => {
    const d = win('BR/HC');
    expect(d.pending).toMatchObject({ kind: 'advance', how: 'breakthrough', hex: H(4, 6) });
    must(d, { kind: 'yesno', yes: true });
    expect(u(d, 'u1')!.hex).toBe(H(4, 6));
    expect(d.pending).toMatchObject({ kind: 'breakthroughExtra', unit: 'u1', required: false });
    const opts = pendingOf(d).options as number[];
    expect(opts).toContain(H(5, 6));
    expect(opts).toContain(H(3, 6));
    expect(opts).not.toContain(H(4, 6));
    must(d, { kind: 'hex', hex: H(3, 6) });
    expect(u(d, 'u1')!.hex).toBe(H(3, 6));
    expect(ev(d).filter((x) => x.t === 'advance')).toHaveLength(2);
  });
  it('the extra hex may be declined, and the original hex taken (§9.8, R36)', () => {
    const d = win('BR/HC');
    must(d, { kind: 'yesno', yes: true });
    must(d, { kind: 'hex', hex: null });
    expect(u(d, 'u1')!.hex).toBe(H(4, 6));
    const e = win('BR/HC');
    must(e, { kind: 'yesno', yes: true });
    must(e, { kind: 'hex', hex: H(5, 6) });
    expect(u(e, 'u1')!.hex).toBe(H(5, 6));
  });
  it('no extra hex after a vacated stop hex (R36)', () => {
    const d = win('BR/HC', { terrain: [{ at: [4, 6], t: 'town' }] });
    must(d, { kind: 'yesno', yes: true });
    expect(d.pending?.kind).not.toBe('breakthroughExtra');
    expect(u(d, 'u1')!.hex).toBe(H(4, 6));
  });
  it('bonus melee only after entering the vacated hex; once per turn; against any adjacent enemy unit or lone leader (R36, R37)', () => {
    const d = win('BR/HC', { units: [topLn([2, 6])] });
    must(d, { kind: 'yesno', yes: true });
    must(d, { kind: 'hex', hex: H(3, 6) });
    expect(d.pending).toMatchObject({ kind: 'bonusMelee', unit: 'u1', targets: [H(2, 6)] });
    // a successful bonus melee: advance into its vacated hex only, no breakthroughExtra, no second bonusMelee
    bonus(d, H(2, 6), n('infantry', 6));
    expect(d.pending).toMatchObject({ kind: 'advance', hex: H(2, 6) });
    must(d, { kind: 'yesno', yes: true });
    expect(u(d, 'u1')!.hex).toBe(H(2, 6));
    expect(d.pending?.kind).toBe('playCard');
    // declining the advance: no bonus melee
    const e = win('BR/HC', { units: [topLn([3, 6])] });
    must(e, { kind: 'yesno', yes: false });
    expect(e.pending?.kind).toBe('playCard');
    // a lone leader is a target
    const f = win('BR/HC', { leaders: [{ side: 'top', at: [3, 6] }] });
    must(f, { kind: 'yesno', yes: true });
    must(f, { kind: 'hex', hex: null });
    expect(f.pending).toMatchObject({ kind: 'bonusMelee', targets: [H(3, 6)] });
  });
  it('a bonus melee that does not succeed ends the unit\'s turn of fighting; it is once per turn (R37)', () => {
    const d = win('BR/HC', { units: [topLn([2, 6], 3)] });
    must(d, { kind: 'yesno', yes: true });
    must(d, { kind: 'hex', hex: H(3, 6) });
    bonus(d, H(2, 6), n('artillery', 6));
    expect(d.pending?.kind).toBe('playCard');
    expect(u(d, 'u1')!.hex).toBe(H(3, 6));
  });
  it('no bonus melee from a forest or town the breakthrough entered (R36)', () => {
    for (const t of ['forest', 'town'] as const) {
      const d = win('BR/HC', { terrain: [{ at: [3, 6], t }], units: [topLn([2, 6])] });
      must(d, { kind: 'yesno', yes: true });
      must(d, { kind: 'hex', hex: H(3, 6) });
      expect(d.pending?.kind).toBe('playCard');
    }
  });
  it('Cavalry Charge and Leadership dice apply to the bonus melee; Cold Steel\'s +1 does not (R36, R61)', () => {
    const bonusDice = (card: CardKind, extra: Pos = {}, pieces = ['u1']): number | undefined => {
      const d = win('BR/HC', { ...extra, units: [topLn([2, 6], 3), ...(extra.units ?? [])] }, card, n('infantry', 7), 3, pieces);
      must(d, { kind: 'yesno', yes: true });
      must(d, { kind: 'hex', hex: H(3, 6) });
      ev(d);
      bonus(d, H(2, 6), n('artillery', 20));
      return combatDice(ev(d), 'bonus', 'u1');
    };
    expect(bonusDice('cavalryCharge')).toBe(5);
    expect(bonusDice('attackC')).toBe(4);
    expect(bonusDice('coldSteel')).toBe(4);   // its initial melee has 5 dice; the bonus melee loses the +1
    expect(bonusDice('leadership', { leaders: [{ side: 'bottom', at: [5, 6] }] }, ['u1', 'L4'])).toBe(5);
  });
});

describe('stop entries during a breakthrough (R35, R36, R82)', () => {
  const ford = (s: ReturnType<typeof build>): void => { s.terrain[H(3, 6)] = 'ford'; };
  it('cavalry that broke through into a ford and wins its bonus melee gets no second advance', () => {
    const d = win('BR/HC', { units: [topLn([2, 6])] }, 'attackC', n('infantry', 4), undefined, ['u1'], ford);
    must(d, { kind: 'yesno', yes: true });
    must(d, { kind: 'hex', hex: H(3, 6) });
    bonus(d, H(2, 6), n('infantry', 6));
    expect(gone(d, 'u3')).toBe(true);
    expect(d.pending?.kind).not.toBe('advance');
    expect(u(d, 'u1')!.hex).toBe(H(3, 6));
  });
  it('the same for impetuous cavalry: it stays put (R82)', () => {
    const d = win('BR/HC', { ...impetuousBottom, units: [topLn([2, 6]), topLn([3, 5], 3)] }, 'attackC', n('infantry', 4), undefined, ['u1'], ford);
    expect(u(d, 'u1')!.hex).toBe(H(3, 6));
    bonus(d, H(2, 6), n('infantry', 6));
    expect(gone(d, 'u3')).toBe(true);
    expect(d.pending?.kind).not.toBe('advance');
    expect(u(d, 'u1')!.hex).toBe(H(3, 6));
  });
  it('a unit without a leader may break through onto a lone friendly leader\'s hex and attaches; one with a leader may not (R35)', () => {
    const d = win('BR/HC', { leaders: [{ side: 'bottom', at: [3, 6] }] });
    must(d, { kind: 'yesno', yes: true });
    expect(pendingOf(d).options as number[]).toContain(H(3, 6));
    must(d, { kind: 'hex', hex: H(3, 6) });
    expect(u(d, 'u1')!.hex).toBe(H(3, 6));
    expect(ev(d).some((x) => x.t === 'attach' && x.leader === 'L3' && x.unit === 'u1')).toBe(true);
    const e = win('BR/HC', { leaders: [{ side: 'bottom', at: [5, 6] }, { side: 'bottom', at: [3, 6] }] });
    must(e, { kind: 'yesno', yes: true });
    expect(pendingOf(e).options as number[]).not.toContain(H(3, 6));
    const f = win('BR/HC', { ...impetuousBottom, leaders: [{ side: 'bottom', at: [3, 6] }] });
    expect(u(f, 'u1')!.hex).toBe(H(3, 5));   // impetuous: vacant hexes only
  });
});

describe('impetuous cavalry (§14.15, R82)', () => {
  it('must advance and must take the extra hex toward the enemy baseline (R82)', () => {
    const d = win('BR/HC', impetuousBottom);
    expect(d.pending).toMatchObject({ kind: 'breakthroughExtra', unit: 'u1', options: [H(3, 5), H(3, 6)], required: true });
    expect(u(d, 'u1')!.hex).toBe(H(4, 6));
    must(d, { kind: 'hex', hex: H(3, 5) });
    expect(u(d, 'u1')!.hex).toBe(H(3, 5));
  });
  it('with one qualifying hex it moves there unasked; with none it stays; the original hex never qualifies (R82)', () => {
    const one = win('BR/HC', { ...impetuousBottom, units: [topLn([3, 6], 3)] });
    expect(u(one, 'u1')!.hex).toBe(H(3, 5));
    expect(one.pending?.kind).not.toBe('breakthroughExtra');
    const none = win('BR/HC', { ...impetuousBottom, units: [topLn([3, 6], 3), topLn([3, 5], 3)] });
    expect(u(none, 'u1')!.hex).toBe(H(4, 6));
    const back = build({ ...impetuousBottom, units: [{ side: 'bottom', key: 'BR/HC', at: [3, 6] }, topLn([4, 6])] });
    const bd = toBattle(back, 'attackC', ['u1']);
    forceDice([...n('infantry', 4), ...PAD]);
    attack(bd, 'u1', H(4, 6));
    expect(u(bd, 'u1')!.hex).toBe(H(3, 5));   // the original hex (3,6) never qualifies
    expect(bd.pending?.kind).not.toBe('breakthroughExtra');
    expect(none.pending?.kind).toBe('bonusMelee');
    expect([...(pendingOf(none).targets as number[])].sort((a, b) => a - b)).toEqual([H(3, 5), H(3, 6)]);
  });
  it('no extra hex when the vacated hex stops movement (R82)', () => {
    const d = win('BR/HC', { ...impetuousBottom, terrain: [{ at: [4, 6], t: 'forest' }] });
    expect(u(d, 'u1')!.hex).toBe(H(4, 6));
    expect(d.pending?.kind).not.toBe('breakthroughExtra');
  });
  it('other cavalry get the normal optional decisions (R82)', () => {
    const d = win('BR/LC', impetuousBottom);
    expect(d.pending).toMatchObject({ kind: 'advance', how: 'breakthrough' });
    const e = win('AL/LC', { sideRules: [{ kind: 'impetuousCavalry', side: 'bottom', keys: ['BR/LC'] }] });
    expect(e.pending).toMatchObject({ kind: 'advance', how: 'breakthrough' });
  });
  it('the bonus melee stays optional; after it succeeds the unit must enter that hex, no extra hex (R82)', () => {
    const d = win('BR/HC', { ...impetuousBottom, units: [topLn([2, 5])] });
    must(d, { kind: 'hex', hex: H(3, 5) });
    expect(d.pending).toMatchObject({ kind: 'bonusMelee', targets: [H(2, 5)] });
    must(d, { kind: 'hex', hex: null });
    expect(u(d, 'u1')!.hex).toBe(H(3, 5));
    expect(d.pending?.kind).toBe('playCard');
    const e = win('BR/HC', { ...impetuousBottom, units: [topLn([2, 5])] });
    must(e, { kind: 'hex', hex: H(3, 5) });
    bonus(e, H(2, 5), n('infantry', 6));
    expect(u(e, 'u1')!.hex).toBe(H(2, 5));
    expect(e.pending?.kind).toBe('playCard');
  });
});
