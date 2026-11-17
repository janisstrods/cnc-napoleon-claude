// Rules: RR §1, §10.1, §10.2 (design/rules-reference.md)
import { describe, expect, it } from 'vitest';
import type { DieFace, GameDriver, Decision, RowKey } from '../../src/engine';
import { retreatOptions } from '../../src/engine';
import { H, attack, build, ev, forceDice, leaderId, must, n, toBattle, u, type Pos } from './helpers';

const ends = (p: Pos, id: string, hexes: number) => { const s = build(p); return retreatOptions(s, u(s, id)!, hexes).map((o) => o.end); };
const top = (key: RowKey, at: [number, number], extra: Partial<Pos['units'] extends (infer E)[] | undefined ? E : never> = {}) => ({ side: 'top' as const, key, at, ...extra });

/** A bottom BR/LN u1 at (6,6) fires at the top unit `u2` (4,6) of `p`, the dice coming out as `faces` then sabres (misses). */
function fireAt(p: Pos, faces: DieFace[]): GameDriver {
  const units = [{ side: 'bottom' as const, key: 'BR/LN' as const, at: [6, 6] as [number, number] }, ...(p.units ?? [])];
  const d = toBattle(build({ ...p, units }), 'attackC', ['u1']);
  ev(d);
  forceDice([...faces, ...n('sabre', 12)]);
  attack(d, 'u1', H(4, 6));
  return d;
}
const flags = (k: number): DieFace[] => n('flag', k);
/** The ignoreFlags max asked, or null when nothing was asked. */
const flagMax = (p: Pos, k = 2): number | null => {
  const d = fireAt(p, flags(k));
  const q = d.pending as Decision | null;
  return q?.kind === 'ignoreFlags' ? q.max : null;
};
const retreatAsk = (p: Pos, k: number) => {
  const d = fireAt(p, flags(k));
  if (d.pending?.kind === 'ignoreFlags') must(d, { kind: 'ignoreFlags', count: 0 });
  return d.pending?.kind === 'retreat' ? d.pending.options : null;
};

describe('retreat paths (§1, §10.1)', () => {
  it('retreat neighbours: the two own-side hexes, fewer at an edge, none on the baseline (§1)', () => {
    expect(ends({ units: [top('FR/LN', [4, 5])] }, 'u1', 1)).toEqual([H(3, 4), H(3, 5)]);
    expect(ends({ units: [top('FR/LN', [2, 0])] }, 'u1', 1)).toEqual([H(1, 0)]);
    const s = build({ units: [top('FR/LN', [0, 6])] });
    expect(retreatOptions(s, s.units[0], 1)).toEqual([{ path: [], end: H(0, 6), losses: 1, attach: null }]);
  });
  it('per-flag distance: 1, AL/LN 2, ML 3 (§10.1, R10)', () => {
    const lens = (key: RowKey, k: number) => retreatAsk({ units: [top(key, [4, 6])] }, k)!.map((o) => o.path.length);
    expect(new Set(lens('FR/LN', 1))).toEqual(new Set([1]));
    expect(new Set(lens('AL/LN', 1))).toEqual(new Set([2]));
    expect(new Set(lens('FR/ML', 1))).toEqual(new Set([3]));
    expect(new Set(lens('FR/LN', 2))).toEqual(new Set([2]));
  });
  it('a blocked hex costs a block; the full distance must be taken when any path allows it (R74)', () => {
    const d = fireAt({ units: [top('FR/LN', [4, 6]), top('FR/LN', [3, 5]), top('FR/LN', [3, 6])] }, flags(1));
    must(d, { kind: 'ignoreFlags', count: 0 });
    expect(u(d, 'u2')!.blocks).toBe(3);
    expect(u(d, 'u2')!.hex).toBe(H(4, 6));
    const one = retreatAsk({ units: [top('FR/ML', [4, 6]), top('FR/LN', [3, 5])] }, 1)!;
    expect(one.every((o) => o.losses === 0 && o.path[0] === H(3, 6))).toBe(true);
    const closed = retreatAsk({ units: [top('FR/ML', [4, 6]), top('FR/LN', [2, 5]), top('FR/LN', [2, 6]), top('FR/LN', [2, 7])] }, 1)!;
    expect(closed.length).toBeGreaterThan(0);
    expect(closed.every((o) => o.losses === 2 && o.path.length === 1)).toBe(true);
  });
  it('other terrain is ignored; impassable terrain blocks (§10.1, R42)', () => {
    const through = (p: Pos) => { const s = build({ ...p, units: [top('FR/LN', [4, 6])] }); return retreatOptions(s, s.units[0], 2); };
    const forest = through({ terrain: [{ at: [3, 5], t: 'forest' }] });
    expect(forest.some((o) => o.path[0] === H(3, 5) && o.losses === 0)).toBe(true);
    const rivers = through({ rivers: 'impassable', terrain: [{ at: [3, 5], t: 'river' }, { at: [3, 6], t: 'river' }] });
    expect(rivers).toEqual([{ path: [], end: H(4, 6), losses: 2, attach: null }]);
    const s = build({ rivers: 'impassable', terrain: [{ at: [3, 5], t: 'river' }, { at: [3, 6], t: 'river' }], units: [top('FR/LN', [4, 6])] });
    expect(retreatOptions(s, s.units[0], 1)[0].losses).toBe(1);
  });
  it('a lone friendly leader stops a leaderless retreat; a unit with a leader passes but may not end there (R75)', () => {
    const lone: Pos = { units: [top('FR/LN', [4, 6])], leaders: [{ side: 'top', at: [3, 5] }] };
    const s = build(lone);
    const o = retreatOptions(s, s.units[0], 2);
    const stop = o.filter((x) => x.end === H(3, 5));
    expect(stop).toEqual([{ path: [H(3, 5)], end: H(3, 5), losses: 0, attach: leaderId(s, 0) }]);
    const own = build({ units: [top('FR/LN', [4, 6])], leaders: [{ side: 'top', at: [3, 5] }, { side: 'top', at: [4, 6] }] });
    const o2 = retreatOptions(own, own.units[0], 2);
    expect(o2.some((x) => x.end === H(3, 5))).toBe(false);
    expect(o2.some((x) => x.path[0] === H(3, 5) && x.path.length === 2 && x.losses === 0)).toBe(true);
  });
  it('a square never moves: each retreat hex costs a block, ML 3 per flag (§10.1, R33)', () => {
    const lt = fireAt({ units: [top('FR/LT', [4, 6], { square: 1 })] }, flags(1));
    expect(u(lt, 'u2')).toMatchObject({ blocks: 3, hex: H(4, 6) });
    const ml = fireAt({ units: [top('FR/ML', [4, 6], { square: 1 })] }, flags(1));
    expect(u(ml, 'u2')).toMatchObject({ blocks: 1, hex: H(4, 6) });
  });
  it('no retreat carries a unit off the board, exit objective or not (R67)', () => {
    const s = build({
      objectives: [{ kind: 'exit', side: 'top', hex: [0, 4] }],
      units: [{ side: 'bottom', key: 'BR/LN', at: [2, 4] }, top('FR/LN', [0, 4], { blocks: 2 })],
    });
    const d = toBattle(s, 'attackC', ['u1']);
    forceDice(['flag', ...n('sabre', 12)]);
    attack(d, 'u1', H(0, 4));
    expect(u(d, 'u2')).toMatchObject({ blocks: 1, hex: H(0, 4) });
  });
});

describe('flags and their ignoring (§10.2, R22, R23)', () => {
  const alone = (key: RowKey, extra: Pos = {}): Pos => ({ ...extra, units: [top(key, [4, 6]), ...(extra.units ?? [])] });
  const friends = (...at: [number, number][]) => at.map((a) => top('FR/LN', a));
  it('flag-ignore sources add up and are chosen flag by flag (§10.2, R22, R23)', () => {
    expect(flagMax(alone('FR/LN'))).toBe(null);
    expect(flagMax(alone('FR/LN', { units: friends([3, 5], [3, 6]) }))).toBe(1);
    expect(flagMax(alone('FR/LN', { units: friends([3, 5], [3, 6], [4, 5], [4, 7]) }))).toBe(1);
    expect(flagMax(alone('FR/LN', { units: friends([3, 5]), leaders: [{ side: 'top', at: [3, 6] }] }))).toBe(1);
    expect(flagMax(alone('FR/LN', { units: friends([3, 5]) }))).toBe(null);
    expect(flagMax(alone('FR/GR'))).toBe(1);
    expect(flagMax(alone('FR/CU'))).toBe(1);
    expect(flagMax(alone('FR/YG'))).toBe(1);
    expect(flagMax(alone('FR/OG'))).toBe(2);
    expect(flagMax(alone('FR/LN', { leaders: [{ side: 'top', at: [4, 6] }] }))).toBe(1);
    const works: Pos['terrain'] = [{ at: [4, 6], t: 'fieldworks', on: 'plain', sides: ['SW', 'SE'] }];
    expect(flagMax(alone('FR/LN', { terrain: works }))).toBe(1);
    expect(flagMax(alone('FR/HC', { terrain: works }))).toBe(null);
    const fortress: Pos = { terrain: [{ at: [4, 6], t: 'fortress' }], sideRules: [{ kind: 'flagIgnoreOn', side: 'top', terrain: 'fortress', flags: 1 }] };
    expect(flagMax(alone('FR/LN', fortress))).toBe(1);
    expect(flagMax(alone('FR/OG', { units: friends([3, 5], [3, 6]), leaders: [{ side: 'top', at: [4, 6] }] }), 3)).toBe(3);
    expect(flagMax(alone('FR/LN', { units: [top('FR/LN', [3, 5], { square: 1 }), top('FR/LN', [3, 6])] }))).toBe(1); // a square supports others
    expect(flagMax(alone('FR/LN', { units: [top('FR/LN', [3, 5], { square: 1 })] }))).toBe(null);
  });
  it('a square gets no support, and no support ignores flags for it (§10.2)', () => {
    expect(flagMax({ units: [top('FR/LN', [4, 6], { square: 1 }), ...friends([3, 5], [3, 6])] })).toBe(null);
  });
  it('answering 1 of 2 flags at FR/LN with a leader gives a 1-hex retreat (§10.2)', () => {
    const d = fireAt(alone('FR/LN', { leaders: [{ side: 'top', at: [4, 6] }] }), flags(2));
    must(d, { kind: 'ignoreFlags', count: 1 });
    expect(d.pending?.kind).toBe('retreat');
    must(d, { kind: 'choose', index: 0 });
    const r = ev(d).find((e) => e.t === 'retreat');
    expect(r && r.t === 'retreat' && r.path.length).toBe(2);
  });
  it("an eliminated unit's flags do nothing (§3.1)", () => {
    const d = fireAt({ units: [top('FR/LN', [4, 6], { blocks: 1 })] }, ['infantry', 'flag', 'flag', 'flag', 'flag']);
    const e = ev(d);
    expect(e.some((x) => x.t === 'eliminated' && x.id === 'u2')).toBe(true);
    expect(e.some((x) => x.t === 'flags' || x.t === 'retreat')).toBe(false);
  });
});
