// Rules: RR §15.6 (design/rules-reference.md)
// RR §15/§16 (pending Task 1): written from design/exp1-rulings.md (S22–S24, S42) and the Task 2 brief.
// Expansion #1 terrain: the Walled Farm row, 2- and 4-sided redoubts as Field Works, and per-hex river rules.
import { describe, expect, it } from 'vitest';
import {
  TERRAIN_STATS, TERRAIN_TYPES, sideRuleFlagIgnores, stopsOnEntry, terrainReduction, worksAcross, worksFlagIgnore, worksForbidSquare, worksMask,
} from '../../src/engine';
import { H, build, must, toBattle, u, type Pos } from './helpers';

describe('Walled Farm (S22)', () => {
  it('a Walled Farm is a Town in every respect but its name (S22)', () => {
    expect(TERRAIN_TYPES).toContain('walledFarm');
    const { name, ...farm } = TERRAIN_STATS.walledFarm;
    const { name: townName, ...town } = TERRAIN_STATS.town;
    expect(name).toBe('Walled farm');
    expect(townName).toBe('Town');
    expect(farm).toEqual(town);
    const s = build({ terrain: [{ at: [4, 6], t: 'walledFarm' }], units: [{ side: 'top', key: 'FR/LN', at: [4, 6] }, { side: 'bottom', key: 'BR/LN', at: [5, 6] }] });
    expect(s.terrain[H(4, 6)]).toBe('walledFarm');
    expect(sideRuleFlagIgnores(s, u(s, 'u1')!)).toBe(0);
    expect(worksFlagIgnore(s, u(s, 'u1')!, H(5, 6))).toBe(0);
    // battling into it: the town's −2 for infantry melee
    expect(terrainReduction(s, u(s, 'u2')!, 'melee', H(5, 6), H(4, 6))).toBe(-2);
    expect(stopsOnEntry(s, H(4, 5), H(4, 6))).toBe(true);
  });
});

describe('2- and 4-sided redoubts (S23)', () => {
  // works hex (4,6), an even row: N neighbours (3,5) NW and (3,6) NE; S neighbours (5,5) SW and (5,6) SE; E (4,7), W (4,5)
  const two: Pos['terrain'] = [{ at: [4, 6], t: 'fieldworks', on: 'plain', sides: ['SW', 'SE'] }];
  const four: Pos['terrain'] = [{ at: [4, 6], t: 'fieldworks', on: 'plain', sides: ['E', 'SE', 'SW', 'W'] }];
  const melee = (terrain: Pos['terrain'], from: [number, number]): number => {
    const s = build({ terrain, units: [{ side: 'top', key: 'FR/LN', at: [4, 6] }, { side: 'bottom', key: 'BR/LN', at: from }] });
    return terrainReduction(s, u(s, 'u2')!, 'melee', H(...from), H(4, 6));
  };

  it('2-sided and 4-sided redoubts protect exactly their sides (S23)', () => {
    const s2 = build({ terrain: two });
    const s4 = build({ terrain: four });
    expect(worksMask(s2, H(4, 6))).toBe((1 << 4) | (1 << 5));
    expect(worksMask(s4, H(4, 6))).toBe((1 << 0) | (1 << 3) | (1 << 4) | (1 << 5));
    expect(s2.terrain[H(4, 6)]).toBe('plain');

    // melee from the south is across works (−1 infantry), from the north it is not
    expect(melee(two, [5, 6])).toBe(-1);
    expect(melee(two, [5, 5])).toBe(-1);
    expect(melee(two, [3, 6])).toBe(0);
    expect(melee(two, [3, 5])).toBe(0);
    expect(melee(two, [4, 7])).toBe(0);
    expect(melee(four, [5, 6])).toBe(-1);
    expect(melee(four, [4, 7])).toBe(-1);
    expect(melee(four, [4, 5])).toBe(-1);
    expect(melee(four, [3, 6])).toBe(0);
    expect(melee(four, [3, 5])).toBe(0);
    expect([[3, 5], [3, 6]].map(([r, c]) => worksAcross(s4, H(4, 6), H(r, c)))).toEqual([false, false]);

    // square only from an open side (R70)
    const sq = (terrain: Pos['terrain'], from: [number, number]): boolean => {
      const s = build({ terrain, units: [{ side: 'top', key: 'FR/LN', at: [4, 6] }, { side: 'bottom', key: 'BR/LC', at: from }] });
      return worksForbidSquare(s, u(s, 'u1')!, H(...from));
    };
    expect([sq(two, [5, 6]), sq(two, [3, 6]), sq(four, [4, 7]), sq(four, [3, 5])]).toEqual([true, false, true, false]);
  });

  it('cavalry charging a 2-sided redoubt from an open side may be met by a square; across the works it may not (R70)', () => {
    const options = (from: [number, number]): string[] => {
      const s = build({ terrain: two, units: [{ side: 'bottom', key: 'BR/LC', at: from }, { side: 'top', key: 'FR/LN', at: [4, 6] }] });
      const d = toBattle(s, 'attackC', ['u1']);
      must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
      const p = d.pending;
      return p?.kind === 'defend' ? p.options : [];
    };
    expect(options([5, 6])).not.toContain('formSquare');
    expect(options([3, 6])).toContain('formSquare');
  });
});

describe('river tiles and per-hex water rules (S24, S42)', () => {
  it('a per-hex river rule overrides the battle rule (104, S24)', () => {
    const s = build({ rivers: 'impassable', terrain: [{ at: [2, 2], t: 'river' }, { at: [2, 3], t: 'river', river: 'fordable' }] });
    expect([s.terrain[H(2, 2)], s.terrain[H(2, 3)]]).toEqual(['river', 'ford']);
    const b = build({ rivers: 'fordable', terrain: [{ at: [2, 2], t: 'river', river: 'brook' }, { at: [2, 3], t: 'river', river: 'impassable', crossing: 'bridge' }] });
    expect([b.terrain[H(2, 2)], b.terrain[H(2, 3)]]).toEqual(['brook', 'bridge']);
  });

  it('fordable river with ford tiles: the tiles do not stop movement (115, S24, S42)', () => {
    const s = build({ rivers: 'fordable', terrain: [{ at: [5, 0], t: 'river', crossing: 'ford' }, { at: [5, 1], t: 'river' }] });
    expect([s.terrain[H(5, 0)], s.terrain[H(5, 1)]]).toEqual(['fordNoStop', 'ford']);
    expect(stopsOnEntry(s, H(4, 0), H(5, 0))).toBe(false);
    expect(stopsOnEntry(s, H(4, 1), H(5, 1))).toBe(true);
    // the ford tile keeps the fordable river's battle effects
    expect(TERRAIN_STATS.fordNoStop.into).toEqual(TERRAIN_STATS.ford.into);
    expect(TERRAIN_STATS.fordNoStop.out).toEqual(TERRAIN_STATS.ford.out);
  });

  it('an unknown per-hex rule or a river field on a non-river hex throws', () => {
    expect(() => build({ rivers: 'impassable', terrain: [{ at: [2, 2], t: 'river', river: 'swamp' as 'brook' }] })).toThrow(/^unknown river rule swamp at \(2,2\) \(qa\)$/);
    expect(() => build({ rivers: 'impassable', terrain: [{ at: [2, 2], t: 'hill', river: 'fordable' }] })).toThrow(/^river override on a non-river hex at \(2,2\) \(qa\)$/);
  });
});
