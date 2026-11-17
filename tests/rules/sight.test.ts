// Rules: RR §8.1, §8.3, §8.4 (design/rules-reference.md)
import { describe, expect, it } from 'vitest';
import { canFireAt, clearSight, fireTargets, lineOfSight } from '../../src/engine/sight';
import { H, build, must, play, u, type Pos } from './helpers';
import type { RowKey } from '../../src/engine';

type PU = NonNullable<Pos['units']>[number];
const bot = (key: RowKey, at: [number, number], blocks?: number): PU => ({ side: 'bottom', key, at, blocks });
const top = (key: RowKey, at: [number, number], blocks?: number): PU => ({ side: 'top', key, at, blocks });

/** Can the bottom firer u1 at (6,6) fire at a top FR/LN at distance d (row 6-d)? */
function reach(key: RowKey, d: number, blocks?: number): boolean {
  const s = build({ units: [bot(key, [6, 6], blocks), top('FR/LN', [6 - d, 6])] });
  return canFireAt(s, u(s, 'u1')!, H(6 - d, 6));
}

describe('range (RR §8.1)', () => {
  it('infantry 2, rifles 3, foot artillery 5, horse artillery 4, 1-block guns shorter', () => {
    expect(reach('BR/LN', 2)).toBe(true);
    expect(reach('BR/LN', 3)).toBe(false);
    expect(reach('BR/RI', 3)).toBe(true);
    expect(reach('BR/FA', 5)).toBe(true);
    expect(reach('BR/FA', 5, 1)).toBe(false);
    expect(reach('BR/FA', 4, 1)).toBe(true);
    expect(reach('BR/HA', 4)).toBe(true);
    expect(reach('BR/HA', 4, 1)).toBe(false);
    expect(reach('BR/HA', 3, 1)).toBe(true);
  });

  it('horse artillery that moved 1 hex fires 3 hexes, not 4 (§8.1)', () => {
    const at = (d: number): boolean => {
      const s = build({ units: [bot('BR/HA', [7, 6]), top('FR/LN', [6 - d, 6]), top('FR/LN', [6, 3])] });  // the decoy keeps the battle phase (and `ordered`) alive
      const dr = play(s, 'probeC', ['u1']);
      must(dr, { kind: 'move', piece: 'u1', to: H(6, 6) });
      expect(dr.state.turn.ordered.u1?.moved).toBe(1);
      return canFireAt(dr.state, u(dr, 'u1')!, H(6 - d, 6));
    };
    expect(at(4)).toBe(false);
    expect(at(3)).toBe(true);
  });

  it('a unit adjacent to an enemy unit may not fire; an adjacent lone leader does not stop it (§8.1)', () => {
    const base = [bot('BR/LN', [6, 6]), top('FR/LN', [4, 6])];
    let s = build({ units: base });
    expect(fireTargets(s, u(s, 'u1')!)).toEqual([H(4, 6)]);
    s = build({ units: [...base, top('FR/HC', [6, 7])] });
    expect(fireTargets(s, u(s, 'u1')!)).toEqual([]);
    s = build({ units: base, leaders: [{ side: 'top', at: [6, 7] }] });
    expect(fireTargets(s, u(s, 'u1')!)).toEqual([H(4, 6)]);
  });

  it('targets come back in ascending hex order', () => {
    const s = build({ units: [bot('BR/FA', [6, 6]), top('FR/LN', [4, 6]), top('FR/LN', [3, 5]), top('FR/LN', [4, 4])] });
    const t = fireTargets(s, u(s, 'u1')!);
    expect(t.length).toBeGreaterThan(1);
    expect(t).toEqual([...t].sort((a, b) => a - b));
  });

  it('a lone leader is never a fire target (R6)', () => {
    const s = build({ units: [bot('BR/LN', [6, 6])], leaders: [{ side: 'top', at: [4, 6] }] });
    expect(fireTargets(s, u(s, 'u1')!)).toEqual([]);
  });

  it('a square fires only with no enemy unit adjacent (§8.1, R33)', () => {
    const base: PU[] = [{ side: 'top', key: 'FR/LT', at: [4, 6], square: 1 }, bot('BR/LN', [6, 6])];
    let s = build({ units: base });
    expect(canFireAt(s, u(s, 'u1')!, H(6, 6))).toBe(true);
    s = build({ units: [...base, bot('BR/HC', [5, 6])] });
    expect(canFireAt(s, u(s, 'u1')!, H(6, 6))).toBe(false);
  });
});

describe('line of sight (RR §8.3)', () => {
  const blocked = (extra: Pos): boolean => !lineOfSight(build({ units: [], ...extra }), H(6, 5), H(4, 6));

  it('pieces in between block; the target hex terrain never does (R44)', () => {
    expect(blocked({})).toBe(false);
    expect(blocked({ units: [top('FR/LN', [5, 5])] })).toBe(true);
    expect(blocked({ units: [bot('BR/LN', [5, 5])] })).toBe(true);
    expect(blocked({ leaders: [{ side: 'bottom', at: [5, 5] }] })).toBe(true);
    expect(blocked({ units: [top('FR/LN', [4, 6])], terrain: [{ at: [4, 6], t: 'forest' }] })).toBe(false);
  });

  it('forest, town and rugged hill block; works, river, ford, bridge and sand quarry do not', () => {
    for (const t of ['forest', 'town', 'windmill', 'fortress', 'rugged'] as const)
      expect(blocked({ terrain: [{ at: [5, 5], t }] }), t).toBe(true);
    expect(blocked({ terrain: [{ at: [5, 5], t: 'fieldworks', on: 'plain', sides: ['NE'] }] })).toBe(false);
    expect(blocked({ terrain: [{ at: [5, 5], t: 'river' }] })).toBe(false);
    expect(blocked({ terrain: [{ at: [5, 5], t: 'river', crossing: 'ford' }] })).toBe(false);
    expect(blocked({ terrain: [{ at: [5, 5], t: 'river', crossing: 'bridge' }] })).toBe(false);
    expect(blocked({ terrain: [{ at: [5, 5], t: 'sandQuarry' }] })).toBe(false);
  });

  it('along a hexside it is blocked only if both sides are obstructed (R49)', () => {
    const s = (pcs: [number, number][]) => build({ units: pcs.map((at) => bot('BR/LN', at)) });
    expect(lineOfSight(s([[3, 5]]), H(4, 6), H(2, 6))).toBe(true);
    expect(lineOfSight(s([[3, 6]]), H(4, 6), H(2, 6))).toBe(true);
    expect(lineOfSight(s([[3, 5], [3, 6]]), H(4, 6), H(2, 6))).toBe(false);
  });

  it('a hexside is judged hex pair by hex pair along the line (R49)', () => {
    const s = (pcs: [number, number][]) => build({ units: pcs.map((at) => bot('BR/LN', at)) });
    expect(lineOfSight(s([[0, 1], [2, 2]]), H(0, 0), H(2, 3))).toBe(true);
    expect(lineOfSight(s([[0, 1], [1, 0]]), H(0, 0), H(2, 3))).toBe(false);
    expect(lineOfSight(s([[1, 1]]), H(0, 0), H(2, 3))).toBe(false);
  });

  it('a line that crosses an edge midpoint without running along a hexside meets both hexes (§8.3)', () => {
    const s = (pcs: [number, number][]) => build({ units: pcs.map((at) => bot('BR/LN', at)) });
    expect(lineOfSight(s([]), H(4, 4), H(5, 7))).toBe(true);
    expect(lineOfSight(s([[5, 5]]), H(4, 4), H(5, 7))).toBe(false);
    expect(lineOfSight(s([[4, 6]]), H(4, 4), H(5, 7))).toBe(false);
  });

  it('the side edge obstructs ([Interp R50])', () => {
    expect(lineOfSight(build({}), H(0, 0), H(2, 0))).toBe(true);
    expect(lineOfSight(build({ units: [bot('BR/LN', [1, 0])] }), H(0, 0), H(2, 0))).toBe(false);
  });

  it('hills: onto the first hill hex, not through it; the plateau; two hills (R49)', () => {
    const hills = (cs: number[]) => cs.map((c) => ({ at: [4, c] as [number, number], t: 'hill' as const }));
    expect(lineOfSight(build({ terrain: hills([4, 5, 6]) }), H(4, 2), H(4, 4))).toBe(true);
    expect(lineOfSight(build({ terrain: hills([4, 5, 6]) }), H(4, 3), H(4, 5))).toBe(false);
    expect(lineOfSight(build({ terrain: hills([4, 5, 6]) }), H(4, 4), H(4, 6))).toBe(true);
    expect(lineOfSight(build({ terrain: hills([4, 5, 6]), units: [top('FR/LN', [4, 5])] }), H(4, 4), H(4, 6))).toBe(false);
    expect(lineOfSight(build({ terrain: hills([2, 4]) }), H(4, 2), H(4, 4))).toBe(true);
  });
});

describe('hill battery (RR §8.4)', () => {
  const p = (key: RowKey, extra: Pos['terrain'] = []): Pos => ({
    terrain: [{ at: [4, 4], t: 'hill' }, ...extra],
    units: [bot(key, [4, 4]), bot('BR/LN', [4, 5]), top('FR/LN', [4, 7])],
  });
  const can = (q: Pos): boolean => { const s = build(q); return canFireAt(s, u(s, 'u1')!, H(4, 7)); };

  it('artillery fires over one adjacent lower friendly piece ([Interp R14])', () => {
    expect(can(p('BR/FA'))).toBe(true);
    expect(can(p('BR/RI'))).toBe(false);
    expect(can(p('BR/FA', [{ at: [4, 5], t: 'forest' }]))).toBe(false);
    const s = build(p('BR/FA'));
    expect(clearSight(s, H(4, 4), H(4, 7))).toBe(false);
  });
});
