// Rules: RR §4.1–§4.4, §14.5, §14.11, §14.13 (design/rules-reference.md)
import { describe, expect, it } from 'vitest';
import { meleeDice, noBattleAfterEntering, passableFor, statsOf, stopsOnEntry, terrainReduction, worksAcross, worksFlagIgnore, worksForbidSquare } from '../../src/engine';
import type { RowKey } from '../../src/engine';
import { H, build, u, type Pos } from './helpers';

type T = Omit<NonNullable<Pos['terrain']>[number], 'at'>;
const I: RowKey = 'BR/LN';
const C: RowKey = 'BR/HC';
const A: RowKey = 'BR/FA';

/** Battler `key` at (5,6) battling (4,6), with terrain `from` under it and `to` under the target (other hex plain). */
function red(key: RowKey, kind: 'fire' | 'melee', from?: T, to?: T, rivers?: Pos['rivers']): number {
  const terrain: NonNullable<Pos['terrain']> = [];
  if (from) terrain.push({ ...from, at: [5, 6] });
  if (to) terrain.push({ ...to, at: [4, 6] });
  const s = build({ units: [{ side: 'bottom', key, at: [5, 6] }], terrain, rivers });
  return terrainReduction(s, u(s, 'u1')!, kind, H(5, 6), H(4, 6));
}
/** [infantry, cavalry, artillery] reductions. */
const trio = (kind: 'fire' | 'melee', from?: T, to?: T, rivers?: Pos['rivers']): number[] => [I, C, A].map((k) => red(k, kind, from, to, rivers));

describe('terrain reductions (§4.2)', () => {
  it('forest (§4.2)', () => {
    expect(trio('fire', undefined, { t: 'forest' })).toEqual([-1, 0, -1]);
    expect(trio('melee', undefined, { t: 'forest' })).toEqual([-1, -2, -1]);
    expect(trio('fire', { t: 'forest' })).toEqual([0, 0, -1]);
    expect(trio('melee', { t: 'forest' })).toEqual([0, -2, -1]);
  });
  it('town, windmill and fortress (§4.2, R84)', () => {
    for (const t of ['town', 'windmill', 'fortress'] as const) {
      expect(trio('fire', undefined, { t })).toEqual([-2, 0, -1]);
      expect(trio('melee', undefined, { t })).toEqual([-2, -3, -1]);
      expect(trio('fire', { t })).toEqual([0, 0, -1]);
      expect(trio('melee', { t })).toEqual([0, -3, -1]);
    }
  });
  it('fordable river with and without the stop, and the brook (§4.2, R47, R83)', () => {
    for (const rivers of ['fordable', 'fordableNoStop'] as const) {
      const r: T = { t: 'river' };
      expect(trio('fire', undefined, r, rivers)).toEqual([0, 0, 0]);
      expect(trio('melee', undefined, r, rivers)).toEqual([-1, -1, -1]);
      expect(trio('fire', r, undefined, rivers)).toEqual([-1, 0, -1]);
      expect(trio('melee', r, undefined, rivers)).toEqual([-1, -1, -1]);
    }
    for (const kind of ['fire', 'melee'] as const) {
      expect(trio(kind, { t: 'river' }, undefined, 'brook')).toEqual([0, 0, 0]);
      expect(trio(kind, undefined, { t: 'river' }, 'brook')).toEqual([0, 0, 0]);
    }
  });
  it('sand quarry, 4th-edition values (R71)', () => {
    expect(red(I, 'fire', undefined, { t: 'sandQuarry' })).toBe(-1);
    expect(red(A, 'fire', undefined, { t: 'sandQuarry' })).toBe(-1);
    expect(red(I, 'melee', undefined, { t: 'sandQuarry' })).toBe(0);
    expect(red(C, 'melee', undefined, { t: 'sandQuarry' })).toBe(-2);
    expect(red(A, 'melee', undefined, { t: 'sandQuarry' })).toBe(0);
    expect(red(C, 'melee', { t: 'sandQuarry' })).toBe(-2);
    expect(red(I, 'fire', { t: 'sandQuarry' })).toBe(0);
  });
  it('hill relation, counted once (§4.2, R43)', () => {
    const hill: T = { t: 'hill' };
    // uphill: target on the hill
    expect(trio('fire', undefined, hill)).toEqual([-1, 0, 0]);
    expect(trio('melee', undefined, hill)).toEqual([-1, -1, 0]);
    // downhill: battler on the hill
    expect(trio('fire', hill)).toEqual([0, 0, 0]);
    expect(trio('melee', hill)).toEqual([0, -1, 0]);
    // hill to hill
    expect(trio('fire', hill, hill)).toEqual([-1, 0, 0]);
    expect(trio('melee', hill, hill)).toEqual([0, 0, 0]);
  });
  it('reductions add up (§4.3, R3, R47)', () => {
    expect(red('BR/HC', 'melee', { t: 'forest' }, { t: 'town' })).toBe(-5);
    // infantry ford → ford melee: -1 out, -1 into
    expect(red(I, 'melee', { t: 'river' }, { t: 'river' }, 'fordable')).toBe(-2);
    // infantry on a ford attacking across a works side into a works hex: -1 out of the ford, -1 into the works ([Interp R3])
    const s = build({
      units: [{ side: 'bottom', key: I, at: [2, 3] }],
      terrain: [{ at: [2, 3], t: 'river' }, { at: [2, 4], t: 'fieldworks', on: 'plain', sides: ['W'] }],
      rivers: 'fordable',
    });
    expect(terrainReduction(s, u(s, 'u1')!, 'melee', H(2, 3), H(2, 4))).toBe(-2);
  });
});

const W006: Pos['terrain'] = [{ at: [2, 4], t: 'fieldworks', on: 'plain', sides: ['W', 'SW', 'SE'] }];
describe('Field Works (§4.2, §4.4)', () => {
  it('across a works hexside: the closed 60° wedge ([Interp R46])', () => {
    const s = build({ terrain: W006 });
    expect([[2, 3], [2, 2], [1, 2], [3, 2], [3, 3]].map(([r, c]) => worksAcross(s, H(2, 4), H(r, c)))).toEqual([true, true, true, true, true]);
    expect([[0, 2], [1, 3], [2, 5], [1, 4]].map(([r, c]) => worksAcross(s, H(2, 4), H(r, c)))).toEqual([false, false, false, false]);
  });
  it('works on open ground (§4.2, §4.4)', () => {
    const fire = (key: RowKey, from: [number, number]): number => {
      const s = build({ terrain: W006, units: [{ side: 'top', key: 'FR/LN', at: [2, 4] }, { side: 'bottom', key, at: from }] });
      return terrainReduction(s, u(s, 'u2')!, 'fire', H(...from), H(2, 4));
    };
    expect(fire(I, [2, 2])).toBe(-1);
    expect(fire(I, [1, 2])).toBe(-1);
    expect(fire(I, [0, 2])).toBe(0);
    expect(fire(A, [2, 2])).toBe(0);
    const melee = (key: RowKey, from: [number, number]): number => {
      const s = build({ terrain: W006, units: [{ side: 'top', key: 'FR/LN', at: [2, 4] }, { side: 'bottom', key, at: from }] });
      return terrainReduction(s, u(s, 'u2')!, 'melee', H(...from), H(2, 4));
    };
    expect(melee(C, [2, 3])).toBe(-2);
    expect(melee(I, [2, 3])).toBe(-1);
    expect(melee(A, [2, 3])).toBe(0);
    expect(melee(I, [2, 5])).toBe(0);
    expect(melee(C, [2, 5])).toBe(0);
    // cavalry on the works hex meleeing out
    const out = (to: [number, number]): number => {
      const s = build({ terrain: W006, units: [{ side: 'bottom', key: C, at: [2, 4] }] });
      return terrainReduction(s, u(s, 'u1')!, 'melee', H(2, 4), H(...to));
    };
    expect(out([2, 3])).toBe(-2);
    expect(out([2, 5])).toBe(0);
    // cavalry on a hill at (2,3) meleeing across W into (2,4): -2 + downhill -1 (R3)
    const s = build({ terrain: [...W006!, { at: [2, 3], t: 'hill' }], units: [{ side: 'bottom', key: C, at: [2, 3] }] });
    expect(terrainReduction(s, u(s, 'u1')!, 'melee', H(2, 3), H(2, 4))).toBe(-3);
  });
  const W005: Pos['terrain'] = [{ at: [2, 0], t: 'fieldworks', on: 'hill', sides: ['SE', 'E'] }];
  it('works on a hill replace the hill relation across a works side only (R45, R79, [Interp R79])', () => {
    const from = (key: RowKey, at: [number, number], hill: boolean): number => {
      const s = build({ terrain: [...W005!, ...(hill ? [{ at, t: 'hill' as const }] : [])], units: [{ side: 'bottom', key, at }] });
      return terrainReduction(s, u(s, 'u1')!, 'melee', H(...at), H(2, 0));
    };
    expect(from(C, [3, 0], true)).toBe(-2);
    expect(from(C, [1, 0], true)).toBe(0);
    expect(from(I, [3, 0], false)).toBe(-1);
    expect(from(I, [1, 0], false)).toBe(-1);
    const out = (to: [number, number]): number => {
      const s = build({ terrain: W005, units: [{ side: 'bottom', key: C, at: [2, 0] }] });
      return terrainReduction(s, u(s, 'u1')!, 'melee', H(2, 0), H(...to));
    };
    expect(out([3, 0])).toBe(-2);
    expect(out([1, 0])).toBe(-1);
  });
  it('works flag-ignore for infantry and artillery across a works side only (R23)', () => {
    const f = (key: RowKey, from: [number, number]): number => {
      const s = build({ terrain: W006, units: [{ side: 'top', key: 'FR/LN', at: [2, 4] }, { side: 'bottom', key, at: from }] });
      return worksFlagIgnore(s, u(s, 'u1')!, H(...from));
    };
    expect(f(I, [2, 3])).toBe(1);
    expect(f(I, [2, 5])).toBe(0);
    const g = (key: RowKey, from: [number, number]): number => {
      const s = build({ terrain: W006, units: [{ side: 'top', key, at: [2, 4] }] });
      return worksFlagIgnore(s, u(s, 'u1')!, H(...from));
    };
    expect(g('FR/FA', [2, 3])).toBe(1);
    expect(g('FR/HC', [2, 3])).toBe(0);
    expect(g('FR/LN', [2, 5])).toBe(0);
  });
  it('no square across a works side; through an open side allowed (R70)', () => {
    const s = build({ terrain: W006, units: [{ side: 'top', key: 'FR/LN', at: [2, 4] }] });
    expect(worksForbidSquare(s, u(s, 'u1')!, H(2, 3))).toBe(true);
    expect(worksForbidSquare(s, u(s, 'u1')!, H(2, 5))).toBe(false);
  });
});

describe('§4.1 rows', () => {
  it('movement and battle rows of §4.1', () => {
    const s = build({
      terrain: [
        { at: [2, 0], t: 'forest' }, { at: [2, 1], t: 'town' }, { at: [2, 2], t: 'windmill' }, { at: [2, 3], t: 'fortress' },
        { at: [3, 0], t: 'river' }, { at: [3, 1], t: 'sandQuarry' }, { at: [3, 2], t: 'rugged' }, { at: [3, 3], t: 'hill' },
        { at: [4, 4], t: 'fieldworks', on: 'plain', sides: ['W'] },
      ],
      units: [{ side: 'bottom', key: 'BR/LN', at: [6, 0] }, { side: 'bottom', key: 'BR/LT', at: [6, 1] }, { side: 'bottom', key: 'BR/RI', at: [6, 2] }, { side: 'top', key: 'FR/YG', at: [0, 0] }],
      rivers: 'impassable',
    });
    const stops = (r: number, c: number): boolean => stopsOnEntry(s, H(8, 0), H(r, c));
    expect([[2, 0], [2, 1], [2, 2], [2, 3], [3, 1]].map(([r, c]) => stops(r, c))).toEqual([true, true, true, true, true]);
    expect([[3, 3], [5, 5]].map(([r, c]) => stops(r, c))).toEqual([false, false]);
    expect(stopsOnEntry(s, H(4, 3), H(4, 4))).toBe(true);
    expect(stopsOnEntry(s, H(4, 4), H(4, 3))).toBe(true);
    expect(stopsOnEntry(s, H(4, 5), H(4, 4))).toBe(false);
    for (const arm of ['infantry', 'cavalry', 'artillery', null] as const) {
      expect(passableFor(s, H(3, 0), arm)).toBe(false);
      expect(passableFor(s, H(3, 2), arm)).toBe(false);
    }
    expect(passableFor(s, H(3, 1), 'artillery')).toBe(false);
    expect(passableFor(s, H(3, 1), 'infantry')).toBe(true);
    expect(passableFor(s, H(3, 1), 'cavalry')).toBe(true);
    const nb = (id: string): boolean => noBattleAfterEntering(s, H(2, 0), statsOf(s, u(s, id)!));
    expect([nb('u1'), nb('u2'), nb('u3'), nb('u4')]).toEqual([true, false, false, false]);
    expect(noBattleAfterEntering(s, H(2, 1), statsOf(s, u(s, 'u2')!))).toBe(true);
  });
  it('ford variants and bridge stop rows', () => {
    const f = build({ terrain: [{ at: [2, 0], t: 'river' }], rivers: 'fordable' });
    const n = build({ terrain: [{ at: [2, 0], t: 'river' }], rivers: 'fordableNoStop' });
    const b = build({ terrain: [{ at: [2, 0], t: 'river' }], rivers: 'brook' });
    const br = build({ terrain: [{ at: [2, 0], t: 'river', crossing: 'bridge' }], rivers: 'impassable' });
    expect([f, n, b, br].map((s) => stopsOnEntry(s, H(5, 5), H(2, 0)))).toEqual([true, false, true, false]);
  });
});

describe('dice integration', () => {
  it.todo('dice integration: cavalry into a town, infantry battles back out of it (§3.2 step 5) — needs T2 (rebase)');
  it('terrain never takes dice below 0 (§3.2 step 6)', () => {
    const s = build({
      units: [{ side: 'bottom', key: 'BR/LC', at: [5, 6], blocks: 1 }, { side: 'top', key: 'FR/LN', at: [4, 6] }],
      terrain: [{ at: [4, 6], t: 'town' }],
    });
    expect(meleeDice(s, u(s, 'u1')!, u(s, 'u2')!, { role: 'attack', moved: 0 })).toBe(0);
  });
});
