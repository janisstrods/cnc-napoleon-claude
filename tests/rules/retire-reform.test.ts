// Rules: RR §9.4 (design/rules-reference.md)
import { describe, expect, it } from 'vitest';
import { GameDriver, bannerTotal, retireReformOptions } from '../../src/engine';
import type { DefendChoice, DieFace, RetreatOption, RowKey } from '../../src/engine';
import { H, attack, attackOn, build, endMoves, ev, forceDice, must, n, noFirstStrike, passTurn, rolls, toBattle, turn, u, type Pos } from './helpers';

const top = (key: RowKey, at: [number, number], extra: object = {}) => ({ side: 'top' as const, key, at, ...extra });
const topLdr = (at: [number, number]) => ({ side: 'top' as const, at });
const options = (d: GameDriver): DefendChoice[] => (d.pending?.kind === 'defend' ? d.pending.options : []);
const rrOptions = (p: Pos, id = 'u1'): RetreatOption[] => { const s = build(p); return retireReformOptions(s, u(s, id)!); };
const ends = (p: Pos) => rrOptions(p).map((o) => o.end);

/** A bottom BR/LN u1 at (5,6) attacks the top FR/HC u2 at (4,6) (`extra` adds pieces); the dice come out as `faces`, then non-cavalry. */
function charge(extra: Pos, faces: DieFace[], atk: RowKey = 'BR/LN'): GameDriver {
  const s = build({ ...extra, units: [{ side: 'bottom', key: atk, at: [5, 6] }, top('FR/HC', [4, 6]), ...(extra.units ?? [])] });
  const d = toBattle(s, 'attackC', ['u1']);
  ev(d);
  forceDice([...faces, ...n('infantry', 40)]);
  must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
  if (d.pending?.kind === 'combinedArms') must(d, { kind: 'select', ids: [] });
  return d;
}

describe('Retire and Reform (§9.4)', () => {
  it('offered when infantry attacks cavalry (§9.4, R34)', () => {
    const d = attackOn('BR/LN', 'FR/HC');
    expect(d.pending).toMatchObject({ kind: 'defend', options: ['stand', 'retireReform'] });
  });

  it('not against artillery, cavalry, fire or a battle back (R34)', () => {
    expect(options(attackOn('BR/FA', 'FR/HC'))).toEqual([]);
    expect(options(attackOn('BR/HC', 'FR/HC'))).toEqual([]);
    expect(options(attackOn('BR/LN', 'FR/LN'))).toEqual([]);
    // fire: a bottom BR/LN two hexes from the cavalry asks nothing
    const s = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [6, 6] }, top('FR/HC', [4, 6])] });
    const d = toBattle(s, 'attackC', ['u1']);
    forceDice(n('infantry', 20));
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(d.pending?.kind).not.toBe('defend');
    // a battle back: a top FR/LN stands against bottom cavalry and battles back; the bottom cavalry is never asked
    const s2 = build({ units: [{ side: 'bottom', key: 'BR/HC', at: [5, 6] }, top('FR/LN', [4, 6])] });
    const d2 = toBattle(s2, 'attackC', ['u1']);
    ev(d2);
    forceDice(n('artillery', 40));
    must(d2, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    if (d2.pending?.kind === 'combinedArms') must(d2, { kind: 'select', ids: [] });
    expect(d2.pending).toMatchObject({ kind: 'defend', target: 'u2' });  // T9: infantry may form square against cavalry
    must(d2, { kind: 'defend', choice: 'stand' });
    expect(d2.pending?.kind).not.toBe('defend');
    expect(ev(d2).some((e) => e.t === 'combat' && e.purpose === 'battleBack')).toBe(true);
  });

  it('the path is exactly 2 own-side steps; units, enemy leaders, impassable hexes and the edge block it; stop terrain does not ([Interp R34])', () => {
    const hc = (at: [number, number]) => ({ units: [top('FR/HC', at)] });
    expect(rrOptions(hc([4, 6])).every((o) => o.path.length === 2 && o.losses === 0)).toBe(true);
    expect(ends(hc([4, 6])).sort()).toEqual([H(2, 5), H(2, 6), H(2, 6), H(2, 7)].sort());
    // both rear hexes held by units: not offered
    expect(rrOptions({ units: [top('FR/HC', [4, 6]), top('FR/LN', [3, 5]), top('FR/LN', [3, 6])] })).toEqual([]);
    const blocked = attackOn('BR/LN', 'FR/HC', { units: [top('FR/LN', [3, 5]), top('FR/LN', [3, 6])] });
    if (blocked.pending?.kind === 'ignoreFlags') must(blocked, { kind: 'ignoreFlags', count: 0 });
    expect(options(blocked)).not.toContain('retireReform');
    // an enemy leader blocks one hex
    const withEnemyLdr = rrOptions({ units: [top('FR/HC', [4, 6])], leaders: [{ side: 'bottom', at: [3, 5] }] });
    expect(withEnemyLdr.every((o) => o.path[0] !== H(3, 5))).toBe(true);
    expect(withEnemyLdr.length).toBeGreaterThan(0);
    // a forest stops movement only: still offered
    expect(rrOptions({ units: [top('FR/HC', [4, 6])], terrain: [{ t: 'forest', at: [3, 5] }] }).length).toBeGreaterThan(0);
    expect(rrOptions({ units: [top('FR/HC', [4, 6])], terrain: [{ t: 'forest', at: [3, 5] }] }).some((o) => o.path[0] === H(3, 5))).toBe(true);
    // impassable terrain blocks its hex
    expect(rrOptions({ units: [top('FR/HC', [4, 6])], terrain: [{ t: 'rugged', at: [3, 5] }] }).every((o) => o.path[0] !== H(3, 5))).toBe(true);
    // the edge: one step from the baseline is not enough
    expect(rrOptions(hc([1, 6]))).toEqual([]);
  });

  it('1 hex onto a lone friendly leader for a leaderless cavalry unit (R34)', () => {
    const o = rrOptions({ units: [top('FR/HC', [4, 6])], leaders: [topLdr([3, 5])] });
    const att = o.filter((x) => x.attach !== null);
    expect(att).toHaveLength(1);
    expect(att[0]).toMatchObject({ path: [H(3, 5)], end: H(3, 5), losses: 0 });
  });

  it('a cavalry unit with a leader may retire through a lone friendly leader but not end on him (R34)', () => {
    const o = rrOptions({ units: [top('FR/HC', [4, 6])], leaders: [topLdr([4, 6]), topLdr([3, 5])] });
    expect(o.length).toBeGreaterThan(0);
    expect(o.some((x) => x.path[0] === H(3, 5))).toBe(true);
    expect(o.every((x) => x.end !== H(3, 5) && x.attach === null && x.path.length === 2)).toBe(true);
  });

  it('only cavalry symbols hit; then it retires and does not battle back (R34)', () => {
    const d = charge({}, ['cavalry', 'sabre', 'flag', 'infantry']);
    expect(d.pending).toMatchObject({ kind: 'defend' });
    must(d, { kind: 'defend', choice: 'retireReform' });
    expect(d.pending?.kind).toBe('retreat');
    expect(d.pending).toMatchObject({ reason: 'retireReform' });
    const es0 = ev(d);
    expect(rolls(es0, 'retireReform')).toEqual([['cavalry', 'sabre', 'flag', 'infantry']]);
    must(d, { kind: 'choose', index: 0 });
    const es = ev(d);
    expect(u(d, 'u2')!.blocks).toBe(3);
    const retire = es.find((e) => e.t === 'retire');
    expect(retire).toMatchObject({ t: 'retire', id: 'u2' });
    expect((retire as { path: number[] }).path).toHaveLength(3);
    expect((retire as { path: number[] }).path[0]).toBe(H(4, 6));
    expect(u(d, 'u2')!.hex).not.toBe(H(4, 6));
    expect(es.some((e) => e.t === 'combat' && e.purpose === 'battleBack')).toBe(false);
  });

  it('a hit triggers the leader check (R34)', () => {
    const d = charge({ leaders: [topLdr([4, 6])] }, ['cavalry', 'infantry', 'infantry', 'infantry']);
    must(d, { kind: 'defend', choice: 'retireReform' });
    const es = ev(d);
    expect(rolls(es, 'leaderCheck')).toHaveLength(1);
    expect(rolls(es, 'leaderCheck')[0]).toHaveLength(2);
    must(d, { kind: 'choose', index: 0 });
    expect(d.state.leaders).toHaveLength(1);
    expect(d.state.leaders[0].hex).toBe(u(d, 'u2')!.hex);
    expect(u(d, 'u2')!.hex).not.toBe(H(4, 6));
  });

  it('no hit: no leader check, and an eliminated cavalry vacates the hex (R34)', () => {
    const d = charge({ units: [], leaders: [topLdr([4, 6])] }, ['infantry', 'infantry', 'infantry', 'infantry']);
    must(d, { kind: 'defend', choice: 'retireReform' });
    expect(rolls(ev(d), 'leaderCheck')).toHaveLength(0);
    const e = charge({ units: [] }, n('cavalry', 12));
    must(e, { kind: 'defend', choice: 'retireReform' });
    expect(u(e, 'u2')).toBeUndefined();
  });

  it('the infantry may then take ground (R34)', () => {
    const d = charge({}, ['cavalry', 'infantry', 'infantry', 'infantry']);
    must(d, { kind: 'defend', choice: 'retireReform' });
    if (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
    expect(d.pending).toMatchObject({ kind: 'advance', unit: 'u1', hex: H(4, 6), how: 'takeGround' });
    must(d, { kind: 'yesno', yes: true });
    expect(u(d, 'u1')!.hex).toBe(H(4, 6));
    expect(ev(d).some((e) => e.t === 'advance')).toBe(true);
  });

  it('retires onto a lone friendly leader through the driver: attach (R34)', () => {
    const d = charge({ leaders: [topLdr([3, 5])] }, ['cavalry', 'infantry', 'infantry', 'infantry']);
    must(d, { kind: 'defend', choice: 'retireReform' });
    const o = (d.pending as { options: RetreatOption[] }).options;
    must(d, { kind: 'choose', index: o.findIndex((x) => x.attach !== null) });
    const es = ev(d);
    expect(es.some((e) => e.t === 'attach' && e.unit === 'u2')).toBe(true);
    expect(u(d, 'u2')!.hex).toBe(H(3, 5));
    expect(d.state.leaders[0].hex).toBe(H(3, 5));
  });

  it('records the retire end in turn.retreatEnds while the turn is open (R58)', () => {
    const s = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [5, 6] }, top('FR/HC', [4, 6]), { side: 'bottom', key: 'BR/LN', at: [5, 7] }, top('FR/LN', [4, 7])] });
    const d = toBattle(s, 'attackC', ['u1', 'u3']);
    ev(d);
    forceDice([...n('infantry', 40)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    must(d, { kind: 'defend', choice: 'retireReform' });
    must(d, { kind: 'choose', index: 0 });
    expect(d.state.turn.retreatEnds).toEqual([u(d, 'u2')!.hex]);
  });

  it('a Cuirassier takes the hit: no ignore (R34)', () => {
    const s = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [5, 6] }, top('FR/CU', [4, 6])] });
    const e = toBattle(s, 'attackC', ['u1']);
    ev(e);
    forceDice([...n('cavalry', 1), ...n('infantry', 40)]);
    must(e, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    must(e, { kind: 'defend', choice: 'retireReform' });
    expect(u(e, 'u2')!.blocks).toBe(u(e, 'u2')!.maxBlocks - 1);
  });

  it('the infantry may take ground after the cavalry is eliminated by the roll (R34)', () => {
    const d = charge({}, n('cavalry', 12));
    must(d, { kind: 'defend', choice: 'retireReform' });
    expect(u(d, 'u2')).toBeUndefined();
    expect(d.pending).toMatchObject({ kind: 'advance', unit: 'u1', hex: H(4, 6), how: 'takeGround' });
    must(d, { kind: 'yesno', yes: true });
    expect(u(d, 'u1')!.hex).toBe(H(4, 6));
  });

  it('a square ordered to attack cavalry: the cavalry may still retire (R34)', () => {
    const s = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [5, 6], square: 1 }, top('FR/HC', [4, 6])] });
    const d = toBattle(s, 'attackC', ['u1']);
    forceDice(n('infantry', 20));
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    if (d.pending?.kind === 'combinedArms') must(d, { kind: 'select', ids: [] });
    expect(d.pending).toMatchObject({ kind: 'defend', options: ['stand', 'retireReform'] });
  });

  it('a unit that retires off a temporary objective hex loses the objective at once (§13.3, R66)', () => {
    const s = build({
      first: 'top', objectives: [{ kind: 'tempHex', side: 'top', hex: [4, 6] }],
      units: [top('FR/HC', [4, 6]), { side: 'bottom', key: 'BR/LN', at: [5, 6] }],
    });
    noFirstStrike(s);
    const d = new GameDriver(s);
    expect(bannerTotal(d.state, 'top')).toBe(1);   // held at the start of top's own turn
    passTurn(d);
    turn(d, 'attackC', ['u2']);
    endMoves(d);
    ev(d);
    forceDice(n('artillery', 40));
    must(d, { kind: 'attack', unit: 'u2', target: H(4, 6) });
    if (d.pending?.kind === 'combinedArms') must(d, { kind: 'select', ids: [] });
    must(d, { kind: 'defend', choice: 'retireReform' });
    if (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
    expect(u(d, 'u1')!.hex).not.toBe(H(4, 6));
    expect(bannerTotal(d.state, 'top')).toBe(0);
    expect(ev(d).some((e) => e.t === 'held' && e.side === 'top' && e.total === 0)).toBe(true);
  });
});
