// Rules: RR §2.1–§2.6, §3.1, §3.2 (design/rules-reference.md)
import { describe, expect, it } from 'vitest';
import { DIE_SIDES, UNIT_STATS, type RowKey } from '../../src/engine';
import { baseFireDice, baseMeleeDice, escapeDice, fireDice, meleeDice, sabreKills, scoreRoll } from '../../src/engine/dice';
import { H, build, endMoves, play, u } from './helpers';

const S = (k: RowKey) => UNIT_STATS[k];
const row = (k: RowKey, moved: number) => [5, 4, 3, 2, 1].map((b) => (b > S(k).blocks ? null : baseFireDice(S(k), b, 2, moved)));
const art = (k: RowKey, b: number, moved: number) => [1, 2, 3, 4, 5].map((d) => baseFireDice(S(k), b, d, moved));

describe('base fire dice', () => {
  it('FR/LN, FR/GR, FR/ML: b standing, ⌈b/2⌉ moved (§2.5, R1)', () => {
    for (const k of ['FR/LN', 'FR/GR', 'FR/ML'] as const) { expect(row(k, 0)).toEqual([null, 4, 3, 2, 1]); expect(row(k, 1)).toEqual([null, 2, 2, 1, 1]); }
  });
  it('FR/LT, FR/YG, FR/OG: b+1 / ⌈b/2⌉+1', () => {
    for (const k of ['FR/LT', 'FR/YG', 'FR/OG'] as const) { expect(row(k, 0)).toEqual([null, 5, 4, 3, 2]); expect(row(k, 1)).toEqual([null, 3, 3, 2, 2]); }
  });
  it('BR/LN: b+1 standing, ⌈b/2⌉ moved, the +1 lost (R5, R9)', () => { expect(row('BR/LN', 0)).toEqual([null, 5, 4, 3, 2]); expect(row('BR/LN', 1)).toEqual([null, 2, 2, 1, 1]); });
  it('BR/LT and BR/GG at 5 blocks: 6 standing, 4 moved', () => {
    for (const k of ['BR/LT', 'BR/GG'] as const) { expect(row(k, 0)).toEqual([6, 5, 4, 3, 2]); expect(row(k, 1)).toEqual([4, 3, 3, 2, 2]); }
  });
  it('BR/RI: 4/3 at 3 blocks, range 3', () => {
    expect(row('BR/RI', 0)).toEqual([null, null, 4, 3, 2]); expect(row('BR/RI', 1)).toEqual([null, null, 3, 2, 2]);
    expect(baseFireDice(S('BR/RI'), 3, 3, 0)).toBe(4); expect(baseFireDice(S('BR/RI'), 3, 4, 0)).toBe(0);
  });
  it('BR/GR gets the fire die (R1)', () => { expect(row('BR/GR', 0)).toEqual([null, 5, 4, 3, 2]); expect(row('BR/GR', 1)).toEqual([null, 3, 3, 2, 2]); });
  it('PT and AL line and militia round down: 0 at 1 block moved (R15)', () => {
    for (const k of ['PT/LN', 'PT/ML', 'AL/LN', 'AL/ML'] as const) { expect(row(k, 0)).toEqual([null, 4, 3, 2, 1]); expect(row(k, 1)).toEqual([null, 2, 1, 1, 0]); }
  });
  it('PT/LT and AL/LT: 4/2 at 3 blocks', () => {
    for (const k of ['PT/LT', 'AL/LT'] as const) { expect(row(k, 0)).toEqual([null, null, 4, 3, 2]); expect(row(k, 1)).toEqual([null, null, 2, 2, 1]); }
  });
  it('infantry range 2; a move of 2 under Force March fires the moving value ([Interp R73])', () => {
    expect(baseFireDice(S('FR/LN'), 4, 3, 0)).toBe(0); expect(baseFireDice(S('BR/GR'), 4, 2, 2)).toBe(3);
  });
  it('cavalry never fires', () => { expect(baseFireDice(S('BR/HC'), 3, 1, 0)).toBe(0); });
  it('artillery by range (§2.6, R11, R12)', () => {
    expect(art('FR/FA', 3, 0)).toEqual([4, 3, 2, 1, 1]); expect(art('FR/FA', 2, 0)).toEqual([4, 3, 2, 1, 1]); expect(art('FR/FA', 1, 0)).toEqual([3, 2, 1, 1, 0]);
    expect(art('FR/GA', 3, 0)).toEqual([5, 3, 2, 1, 1]); expect(art('FR/GA', 1, 0)).toEqual([4, 2, 1, 1, 0]);
    expect(art('BR/HA', 3, 0)).toEqual([3, 2, 1, 1, 0]); expect(art('BR/HA', 1, 0)).toEqual([2, 1, 1, 0, 0]);
    expect(art('BR/HA', 3, 1)).toEqual([3, 2, 1, 0, 0]); expect(art('BR/HA', 1, 1)).toEqual([0, 0, 0, 0, 0]);
    expect(art('BR/HA', 3, 2)).toEqual([0, 0, 0, 0, 0]); expect(art('BR/FA', 3, 1)).toEqual([0, 0, 0, 0, 0]);
  });
});

describe('melee dice', () => {
  const lay = (key: RowKey, blocks?: number) =>
    build({
      units: [{ side: 'bottom', key, at: [5, 6], blocks }, { side: 'top', key: 'BR/LN', at: [4, 6] }, { side: 'top', key: 'BR/HC', at: [4, 7] }, { side: 'top', key: 'BR/FA', at: [5, 7] }],
      leaders: [{ side: 'top', at: [6, 6] }],
    });
  const four = (key: RowKey, blocks?: number) => {
    const s = lay(key, blocks); const a = u(s, 'u1')!;
    return [baseMeleeDice(s, a, u(s, 'u2')!, 0), baseMeleeDice(s, a, u(s, 'u3')!, 0), baseMeleeDice(s, a, u(s, 'u4')!, 0), baseMeleeDice(s, a, s.leaders[0], 0)];
  };
  it('melee dice by type (§2.2–§2.4, R2)', () => { expect(four('FR/LN')).toEqual([5, 4, 4, 4]); });
  it('FR/GR 4 vs infantry 5', () => { expect(four('FR/GR')[0]).toBe(5); });
  it('FR/OG 6', () => { expect(four('FR/OG')[0]).toBe(6); });
  it('FR/HC 5', () => { expect(four('FR/HC')[1]).toBe(5); });
  it('BR/HC 3 blocks 4', () => { expect(four('BR/HC')[1]).toBe(4); });
  it('BR/LC 3 blocks 3', () => { expect(four('BR/LC')[1]).toBe(3); });
  it('FR/FA 4', () => { expect(four('FR/FA')[1]).toBe(4); });
  it('FR/GA 5', () => { expect(four('FR/GA')[1]).toBe(5); });
  it('BR/HA standing 3, moved 1 → 3', () => {
    const s = lay('BR/HA'); const a = u(s, 'u1')!;
    expect(baseMeleeDice(s, a, u(s, 'u2')!, 0)).toBe(3); expect(baseMeleeDice(s, a, u(s, 'u2')!, 1)).toBe(3);
  });
  it('a lone leader never gives the infantry bonus ([Interp R2])', () => { expect(four('FR/LN')[3]).toBe(4); });
  it('a moved horse-artillery cut to 1 block melees with the standing 1-block cell (R12)', () => {
    const s = lay('BR/HA', 1); const a = u(s, 'u1')!;
    expect(meleeDice(s, a, u(s, 'u2')!, { role: 'attack', moved: 1, declared: true })).toBe(2);
    expect(meleeDice(s, a, u(s, 'u2')!, { role: 'attack', moved: 1 })).toBe(0);
  });
});

describe('scoring', () => {
  it('scoring (§3.1, R16, R17)', () => {
    expect(DIE_SIDES.filter((f) => f === 'infantry')).toHaveLength(2);
    expect(scoreRoll(['cavalry', 'infantry', 'sabre', 'flag'], 'fire', S('FR/LN'), 'cavalry')).toEqual({ hits: 1, flags: 1, scoring: [true, false, false, false] });
    expect(scoreRoll(['infantry', 'sabre', 'flag', 'artillery'], 'melee', S('FR/LN'), 'infantry')).toMatchObject({ hits: 2, flags: 1 });
    expect(scoreRoll(['infantry', 'sabre'], 'melee', S('FR/ML'), 'infantry').hits).toBe(1);
    expect(scoreRoll(['infantry', 'sabre'], 'melee', S('BR/RI'), 'infantry').hits).toBe(1);
    expect(scoreRoll(['cavalry', 'sabre', 'flag', 'infantry'], 'retireReform', S('BR/LN'), 'cavalry')).toMatchObject({ hits: 1, flags: 0 });
    expect(sabreKills(['sabre'])).toBe(true); expect(sabreKills(['flag', 'infantry'])).toBe(false);
  });
});

describe('card dice, caps and escape', () => {
  it('Bombard adds 2 (GA 3) only to a shot the gun could make (§3.2 step 3, R59, [Interp R15])', () => {
    const at = (key: RowKey, blocks: number, target: [number, number]) => {
      const d = play(build({ units: [{ side: 'bottom', key, at: [6, 6], blocks }, { side: 'top', key: 'FR/LN', at: target }] }), 'bombard', ['u1']); endMoves(d);
      return fireDice(d.state, u(d, 'u1')!, H(...target), { role: 'attack', moved: 0 });
    };
    expect(at('BR/FA', 3, [4, 6])).toBe(5); expect(at('FR/GA', 3, [4, 6])).toBe(6); expect(at('BR/FA', 1, [1, 6])).toBe(0);
  });
  const charge = (key: RowKey, blocks: number) => {
    const s = build({ units: [{ side: 'bottom', key, at: [5, 6], blocks }, { side: 'top', key: 'FR/LN', at: [4, 6] }] });
    const d = play(s, 'cavalryCharge', ['u1']);
    return { d, a: u(d, 'u1')!, t: u(d, 'u2')! };
  };
  it('Cavalry Charge: cavalry +1, GHC +2, horse artillery nothing; never on a battle back (R60)', () => {
    let c = charge('BR/HC', 3); expect(meleeDice(c.d.state, c.a, c.t, { role: 'attack', moved: 0 })).toBe(5);
    expect(meleeDice(c.d.state, c.a, c.t, { role: 'back', moved: 0 })).toBe(4);
    c = charge('BR/GHC', 3); expect(meleeDice(c.d.state, c.a, c.t, { role: 'attack', moved: 0 })).toBe(6);
    c = charge('BR/HA', 3); expect(meleeDice(c.d.state, c.a, c.t, { role: 'attack', moved: 0 })).toBe(3);
  });
  it('Cavalry Charge bonus melee uses the card dice; Bayonet Charge: guard infantry +1 (§12.2)', () => {
    const c = charge('BR/HC', 3); expect(meleeDice(c.d.state, c.a, c.t, { role: 'bonus', moved: 0 })).toBe(5);
    const bay = (key: RowKey, blocks: number) => {
      const s = build({ units: [{ side: 'bottom', key, at: [5, 6], blocks }, { side: 'top', key: 'FR/LN', at: [4, 6] }] });
      const d = play(s, 'bayonetCharge', ['u1']);
      return meleeDice(d.state, u(d, 'u1')!, u(d, 'u2')!, { role: 'attack', moved: 0 });
    };
    expect(bay('BR/GG', 5)).toBe(7); expect(bay('BR/LN', 4)).toBe(4);
  });
  it('squares roll at most 1 die; cavalry against a square at most 1, cards included (§3.2 step 4, R31)', () => {
    const s = build({ units: [{ side: 'top', key: 'FR/LT', at: [4, 6] }, { side: 'bottom', key: 'BR/LN', at: [6, 6] }, { side: 'bottom', key: 'BR/HC', at: [5, 6] }, { side: 'bottom', key: 'BR/LN', at: [5, 5] }] });
    const sq = u(s, 'u1')!; sq.square = 1;
    const d = play(s, 'cavalryCharge', ['u3']);
    const st = d.state; const hc = u(d, 'u3')!; const ln = u(d, 'u2')!;
    expect(meleeDice(st, sq, hc, { role: 'back', moved: 0 })).toBe(1);
    expect(meleeDice(st, hc, sq, { role: 'attack', moved: 0 })).toBe(1);
    expect(meleeDice(st, u(d, 'u4')!, sq, { role: 'attack', moved: 0 })).toBe(4);
    st.active = 'top'; sq.hex = H(6, 7);
    expect(fireDice(st, sq, ln.hex, { role: 'attack', moved: 0 })).toBe(1);
  });
  it('no card creates a shot from 0 base dice (R15)', () => {
    const s = build({ units: [{ side: 'bottom', key: 'PT/LN', at: [6, 6], blocks: 1 }, { side: 'top', key: 'FR/LN', at: [4, 6] }] });
    const d = play(s, 'forceMarch', ['u1']);
    expect(fireDice(d.state, u(d, 'u1')!, H(4, 6), { role: 'attack', moved: 1 })).toBe(0);
  });
  it('escape dice: type bonus and square cap, no terrain, no cards (§3.3, R24)', () => {
    const s = build({
      units: [{ side: 'top', key: 'BR/HC', at: [4, 6], blocks: 3 }, { side: 'top', key: 'FR/LN', at: [4, 7] }, { side: 'top', key: 'BR/LN', at: [4, 5] }],
      terrain: [{ at: [4, 6], t: 'forest' }],
    });
    u(s, 'u3')!.square = 1;
    expect([escapeDice(s, u(s, 'u1')!), escapeDice(s, u(s, 'u2')!), escapeDice(s, u(s, 'u3')!)]).toEqual([4, 4, 1]);
  });
});
