// Rules: RR §15.4 (design/rules-reference.md); design/exp1-rulings.md S12, S5, S14
import { describe, expect, it } from 'vitest';
import type { DieFace, GameDriver, GameEvent, RowKey } from '../../src/engine';
import { battleTargets, statsOf } from '../../src/engine';
import { flagRerollApplies } from '../../src/engine/dice';
import { H, attack, build, ev, forceDice, giveCard, miss, must, n, rolls, toBattle, u, type Pos } from './helpers';

const PAD = n('artillery', 60); // an artillery face never hits infantry or cavalry
type Unit1 = NonNullable<Pos['units']>[number];
const bot = (key: RowKey, at: [number, number], extra: object = {}): Unit1 => ({ side: 'bottom', key, at, ...extra }) as Unit1;
const top = (key: RowKey, at: [number, number], extra: object = {}): Unit1 => ({ side: 'top', key, at, ...extra }) as Unit1;
type RollEv = Extract<GameEvent, { t: 'roll' }> & { reroll?: true };
const rollEvs = (es: GameEvent[], purpose: string): RollEv[] => es.filter((e): e is RollEv => e.t === 'roll' && e.purpose === purpose);
const faces = (es: GameEvent[], purpose: string): DieFace[][] => rollEvs(es, purpose).map((e) => e.faces);
const rerolls = (es: GameEvent[], purpose: string): boolean[] => rollEvs(es, purpose).map((e) => e.reroll === true);

/** Bottom lancer u1 (5,6) attacks the top unit u2 (4,6) with `faces` first, then misses; returns the driver and the events. */
function lancerAttack(def: Unit1, first: DieFace[], extra: Pos = {}, guns: string[] = []): { d: GameDriver; es: GameEvent[] } {
  const s = build({ ...extra, units: [bot('FR/LNC', [5, 6]), def, ...(extra.units ?? [])] });
  const d = toBattle(s, 'attackC', ['u1', ...guns]);
  ev(d);
  forceDice([...first, ...PAD]);
  attack(d, 'u1', H(4, 6), { guns });
  return { d, es: ev(d) };
}

describe('Lancers re-roll flags (S12)', () => {
  it('an attacking lancer re-rolls its flags once; new flags add to the first (S12)', () => {
    const { d, es } = lancerAttack(top('FR/LC', [4, 6]), [...n('flag', 2), 'infantry', 'cavalry', /* re-roll */ 'flag', 'sabre']);
    expect(faces(es, 'melee')).toEqual([['flag', 'flag', 'infantry', 'cavalry'], ['flag', 'sabre']]);
    expect(rerolls(es, 'melee')).toEqual([false, true]);
    expect(rollEvs(es, 'melee')[1].scoring).toEqual([false, true]);
    expect(u(d, 'u2')!.blocks).toBe(2); // cavalry + the re-rolled sabre; 4 - 2
    expect(es.find((e) => e.t === 'flags')).toMatchObject({ flags: 3 }); // 2 + 1
  });

  it('no re-roll against a cuirassier (SP/CU, FR/CU) (S12)', () => {
    for (const key of ['SP/CU', 'FR/CU'] as RowKey[]) {
      const { es } = lancerAttack(top(key, [4, 6]), [...n('flag', 2), 'infantry', 'cavalry']);
      expect(faces(es, 'melee'), key).toEqual([['flag', 'flag', 'infantry', 'cavalry']]);
    }
    const { es } = lancerAttack(top('SP/HC', [4, 6]), [...n('flag', 2), 'infantry', 'cavalry']);
    expect(rollEvs(es, 'melee')).toHaveLength(2); // a non-cuirassier is re-rolled
  });

  it('no re-roll in a battle back; a defending lancer re-rolls only with First Strike (S12)', () => {
    const s = build({ units: [bot('BR/LC', [5, 6]), top('FR/LNC', [4, 6])] });
    const d = toBattle(s, 'attackC', ['u1']);
    const dice = battleTargets(d.state, 'u1')[0].dice;
    ev(d);
    forceDice([...n(miss('BR/LC', 'FR/LNC'), dice), ...n('flag', 4), ...PAD]);
    attack(d, 'u1', H(4, 6));
    const back = ev(d);
    expect(faces(back, 'battleBack')).toEqual([n('flag', 4)]);
    expect(rerolls(back, 'battleBack')).toEqual([false]);
    forceDice([]);
    // with First Strike
    const t = build({ units: [bot('BR/LC', [5, 6]), top('FR/LNC', [4, 6])] });
    const e = toBattle(t, 'attackC', ['u1']);
    giveCard(e.state, 'top', 'firstStrike');
    ev(e);
    must(e, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(e.pending).toMatchObject({ kind: 'defend', options: ['stand', 'firstStrike'] });
    forceDice([...n('flag', 2), 'cavalry', 'artillery', /* re-roll */ 'cavalry', 'sabre', ...PAD]);
    must(e, { kind: 'defend', choice: 'firstStrike' });
    const fs = ev(e);
    expect(faces(fs, 'firstStrike')).toEqual([['flag', 'flag', 'cavalry', 'artillery'], ['cavalry', 'sabre']]);
    expect(rerolls(fs, 'firstStrike')).toEqual([false, true]);
    expect(u(e, 'u1')).toBeUndefined(); // the first roll's cavalry + the re-roll's cavalry and sabre: 3 hits eliminate the 3-block attacker (1 without the re-roll)
    forceDice([]);
  });

  it('a First Strike re-roll adds its flags to the first roll\'s (S12)', () => {
    const s = build({ units: [bot('BR/LC', [5, 6]), top('FR/LNC', [4, 6])] });
    const d = toBattle(s, 'attackC', ['u1']);
    giveCard(d.state, 'top', 'firstStrike');
    ev(d);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    forceDice([...n('flag', 2), 'artillery', 'artillery', /* re-roll */ 'flag', 'artillery', ...PAD]);
    must(d, { kind: 'defend', choice: 'firstStrike' });
    const fs = ev(d);
    expect(rerolls(fs, 'firstStrike')).toEqual([false, true]);
    expect(fs.find((e) => e.t === 'flags')).toMatchObject({ flags: 3 }); // 2 + 1
    forceDice([]);
  });

  it('the re-roll covers the guns of a Combined Arms roll it leads (S12)', () => {
    // the lancer rolls 4 dice, the gun at (6,5) 3: flags among all 7 are re-rolled together
    const first: DieFace[] = ['flag', 'artillery', 'artillery', 'artillery', /* gun */ 'flag', 'artillery', 'infantry'];
    const { d, es } = lancerAttack(top('FR/LN', [4, 6]), [...first, /* re-roll */ 'infantry', 'infantry'], { units: [bot('BR/FA', [6, 5])] }, ['u3']);
    expect(faces(es, 'melee')).toEqual([first, ['infantry', 'infantry']]);
    expect(rerolls(es, 'melee')).toEqual([false, true]);
    expect(rollEvs(es, 'melee')[0].from).toEqual(['u1', 'u3']);
    expect(rollEvs(es, 'melee')[1].from).toEqual(['u1', 'u3']); // the re-roll names the same pieces
    expect(u(d, 'u2')!.blocks).toBe(1); // 1 + 2 infantry hits = 3 of 4 blocks
  });

  it('against a square: its single die is re-rolled on a flag (S12)', () => {
    const { es } = lancerAttack(top('FR/LN', [4, 6], { square: 1 }), ['artillery' /* the square strikes first */, 'flag', 'infantry']);
    expect(faces(es, 'melee')).toEqual([['flag'], ['infantry']]);
    expect(rerolls(es, 'melee')).toEqual([false, true]);
  });

  it('against a lone leader: a re-rolled sabre kills him; no re-roll in an escape roll (S12)', () => {
    const lone: Pos = { leaders: [{ side: 'top', at: [4, 6] }] };
    const s = build({ ...lone, units: [bot('FR/LNC', [5, 6])] });
    const d = toBattle(s, 'attackC', ['u1']);
    ev(d);
    forceDice(['flag', 'flag', 'artillery', 'artillery', /* re-roll */ 'sabre', 'artillery', ...PAD]);
    attack(d, 'u1', H(4, 6));
    const es = ev(d);
    expect(faces(es, 'melee')).toEqual([['flag', 'flag', 'artillery', 'artillery'], ['sabre', 'artillery']]);
    expect(rerolls(es, 'melee')).toEqual([false, true]);
    expect(es.filter((e) => e.t === 'leaderKilled')).toHaveLength(1);
    forceDice([]);
    // a re-rolled infantry face does nothing to a leader: it does not score, and he lives
    const w = build({ ...lone, units: [bot('FR/LNC', [5, 6])] });
    const f = toBattle(w, 'attackC', ['u1']);
    ev(f);
    forceDice(['flag', 'infantry', 'artillery', 'artillery', /* re-roll */ 'infantry', ...PAD]);
    attack(f, 'u1', H(4, 6));
    const fe = ev(f);
    expect(rollEvs(fe, 'melee').map((r) => r.scoring)).toEqual([[false, false, false, false], [false]]);
    expect(fe.filter((e) => e.t === 'leaderKilled')).toHaveLength(0);
    forceDice([]);
    // escape: a lancer in the leader's path rolls flags and does not re-roll
    const t = build({ ...lone, units: [bot('BR/LN', [5, 6]), top('FR/LN', [4, 6], { blocks: 1 }), bot('FR/LNC', [3, 5])], leaders: [{ side: 'top', at: [4, 6] }] });
    const e = toBattle(t, 'attackC', ['u1']);
    ev(e);
    forceDice(['infantry', 'cavalry', 'cavalry', 'cavalry', 'cavalry' /* casualty check */, ...n('flag', 4), ...PAD]);
    attack(e, 'u1', H(4, 6));
    expect(e.pending?.kind).toBe('leaderRetreat');
    const opts = (e.pending as { options: { escapes: string[] }[] }).options;
    must(e, { kind: 'choose', index: opts.findIndex((o) => o.escapes.length === 1) });
    const esc = ev(e);
    expect(faces(esc, 'escape')).toEqual([n('flag', 4)]);
    expect(rerolls(esc, 'escape')).toEqual([false]);
    forceDice([]);
  });

  it('a bonus melee re-rolls too (S12)', () => {
    const s = build({ units: [bot('FR/LNC', [5, 6]), top('FR/LN', [4, 6], { blocks: 1 }), top('FR/LN', [2, 6])] });
    const d = toBattle(s, 'attackC', ['u1']);
    ev(d);
    forceDice([...n('infantry', 4), 'flag', 'flag', 'artillery', 'artillery', 'infantry', 'infantry', ...PAD]);
    attack(d, 'u1', H(4, 6));
    if (d.pending?.kind === 'advance') must(d, { kind: 'yesno', yes: true });
    expect(d.pending?.kind).toBe('breakthroughExtra'); // light cavalry advances a second hex
    must(d, { kind: 'hex', hex: H(3, 6) });
    expect(d.pending?.kind).toBe('bonusMelee');
    must(d, { kind: 'hex', hex: H(2, 6) });
    if (d.pending?.kind === 'defend') must(d, { kind: 'defend', choice: 'stand' });
    const es = ev(d);
    expect(rolls(es, 'bonus')).toEqual([['flag', 'flag', 'artillery', 'artillery'], ['infantry', 'infantry']]);
    expect(rerolls(es, 'bonus')).toEqual([false, true]);
    expect(u(d, 'u3')!.blocks).toBe(2); // 4 - 2
  });

  it('re-rolled flags are not re-rolled again', () => {
    const { es } = lancerAttack(top('FR/LC', [4, 6]), [...n('flag', 4), ...n('flag', 4)]);
    expect(faces(es, 'melee')).toEqual([n('flag', 4), n('flag', 4)]);
    expect(rerolls(es, 'melee')).toEqual([false, true]);
  });

  it('flagRerollApplies: roles attack, bonus and firstStrike only; never against a cuirassier (S12)', () => {
    const s = build({ units: [bot('FR/LNC', [5, 6]), bot('BR/LN', [5, 4]), top('FR/LC', [4, 6]), top('SP/CU', [4, 4]), top('FR/CU', [4, 2])], leaders: [{ side: 'top', at: [3, 6] }] });
    const [lnc, ln, lc, spcu, frcu] = s.units;
    expect(statsOf(s, lnc).rerollsFlags).toBe(true);
    for (const r of ['attack', 'bonus', 'firstStrike'] as const) expect(flagRerollApplies(s, lnc, lc, r)).toBe(true);
    for (const r of ['back', 'squareFirst', 'escape'] as const) expect(flagRerollApplies(s, lnc, lc, r)).toBe(false);
    expect(flagRerollApplies(s, lnc, spcu, 'attack')).toBe(false);
    expect(flagRerollApplies(s, lnc, frcu, 'bonus')).toBe(false);
    expect(flagRerollApplies(s, lnc, s.leaders[0], 'attack')).toBe(true);
    expect(flagRerollApplies(s, ln, lc, 'attack')).toBe(false); // not a lancer
  });
});
