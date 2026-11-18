// Rules: RR §2.7, §3.3, §3.4, §6.2, §11.1, §11.2, §11.3, §11.4, §12.2 (design/rules-reference.md)
import { describe, expect, it } from 'vitest';
import type { DieFace, GameDriver, GameEvent, LeaderRetreatOption, RowKey } from '../../src/engine';
import { OFF_BOARD, battleTargets, fireDice, retreatOptions, rowOf, supportCount } from '../../src/engine';
import { H, attack, build, combatDice, endMoves, ev, forceDice, leaderId, miss, must, n, play, rolls, toBattle, u, duel, type Pos } from './helpers';

const bot = (key: RowKey, at: [number, number], extra: object = {}) => ({ side: 'bottom' as const, key, at, ...extra });
const top = (key: RowKey, at: [number, number], extra: object = {}) => ({ side: 'top' as const, key, at, ...extra });
const topLdr = (at: [number, number]) => ({ side: 'top' as const, at });
const botLdr = (at: [number, number]) => ({ side: 'bottom' as const, at });
const hit: DieFace = 'infantry'; // BR/LN against an infantry unit
const dud: DieFace = 'cavalry';  // a miss for BR/LN against infantry (and for infantry fire at infantry)

/** Bottom BR/LN u1 at (5,6) attacks the top unit u2 at (4,6) (`p` adds units and leaders); the dice come out as `faces`, then misses. */
function melee(p: Pos, faces: DieFace[], atk: RowKey = 'BR/LN'): GameDriver {
  const s = build({ ...p, units: [bot(atk, [5, 6]), ...(p.units ?? [])] });
  const d = toBattle(s, 'attackC', ['u1']);
  ev(d);
  forceDice([...faces, ...n(dud, 40)]);
  attack(d, 'u1', H(4, 6));
  return d;
}
/** Bottom BR/LN u1 at (6,6) fires at the top unit u2 at (4,6). */
function fireAt(p: Pos, faces: DieFace[]): GameDriver {
  const s = build({ ...p, units: [bot('BR/LN', [6, 6]), ...(p.units ?? [])] });
  const d = toBattle(s, 'attackC', ['u1']);
  ev(d);
  forceDice([...faces, ...n(dud, 40)]);
  attack(d, 'u1', H(4, 6));
  return d;
}
const banners = (d: GameDriver, side: 'top' | 'bottom') => d.state.players[side].banners;
const kinds = (es: GameEvent[], t: GameEvent['t']) => es.filter((e) => e.t === t);
const retreatDecision = (d: GameDriver): LeaderRetreatOption[] => {
  expect(d.pending?.kind).toBe('leaderRetreat');
  return (d.pending as { options: LeaderRetreatOption[] }).options;
};
const choose = (d: GameDriver, o: LeaderRetreatOption): void => {
  const i = retreatDecision(d).indexOf(o);
  must(d, { kind: 'choose', index: i });
};
const LDR: Pos = { leaders: [topLdr([4, 6])] };
const four = (...extra: DieFace[]): DieFace[] => [hit, dud, dud, dud, ...extra];

describe('casualty checks (§3.4, §11.1, R18)', () => {
  it('unit hit and surviving: 2 dice, 2 sabres kill (§3.4, R18)', () => {
    const d = melee({ ...LDR, units: [top('FR/LN', [4, 6])] }, four('sabre', 'sabre'));
    const es = ev(d);
    expect(rolls(es, 'leaderCheck')).toEqual([['sabre', 'sabre']]);
    expect(kinds(es, 'leaderKilled')).toHaveLength(1);
    expect(banners(d, 'bottom')).toBe(1);
    expect(d.state.leaders).toHaveLength(0);
    forceDice([]);
    const e = melee({ ...LDR, units: [top('FR/LN', [4, 6])] }, four('sabre', 'flag'));
    const f = ev(e);
    expect(rolls(f, 'leaderCheck')).toEqual([['sabre', 'flag']]);
    expect(kinds(f, 'leaderSafe')).toHaveLength(1);
    expect(kinds(f, 'leaderKilled')).toHaveLength(0);
    expect(e.state.leaders[0].hex).toBe(H(4, 6));
    expect(banners(e, 'bottom')).toBe(0);
    forceDice([]);
  });
  it('unit eliminated: 1 die; a sabre kills, otherwise he retreats 1–3 hexes (§11.1–§11.3)', () => {
    const P: Pos = { ...LDR, units: [top('FR/LN', [4, 6], { blocks: 1 })] };
    const d = melee(P, four(dud));
    const es = ev(d);
    expect(rolls(es, 'leaderCheck')).toEqual([[dud]]);
    expect(new Set(retreatDecision(d).map((o) => rowOf(o.end)))).toEqual(new Set([3, 2, 1]));
    forceDice([]);
    const k = melee(P, four('sabre'));
    expect(kinds(ev(k), 'leaderKilled')).toHaveLength(1);
    expect(banners(k, 'bottom')).toBe(2);
    expect(k.pending?.kind).not.toBe('leaderRetreat');
    forceDice([]);
  });
  it('on his own baseline he leaves the map: no banner (§11.2, R25)', () => {
    const s = build({ units: [bot('BR/LN', [1, 6]), top('FR/LN', [0, 6], { blocks: 1 })], leaders: [topLdr([0, 6])] });
    const d = toBattle(s, 'attackC', ['u1']);
    ev(d);
    forceDice([hit, dud, dud, dud, dud, ...n(dud, 20)]);
    attack(d, 'u1', H(0, 6));
    const es = ev(d);
    expect(kinds(es, 'leaderLeft')).toHaveLength(1);
    expect(kinds(es, 'leaderRetreat')).toHaveLength(0);
    expect(d.state.leaders).toHaveLength(0);
    expect(banners(d, 'bottom')).toBe(1); // the unit only
    forceDice([]);
  });
  it('impassable terrain that stops him even 1 hex eliminates him: banner (§11.2)', () => {
    const d = melee({ ...LDR, rivers: 'impassable', terrain: [{ at: [3, 5], t: 'river' }, { at: [3, 6], t: 'river' }], units: [top('FR/LN', [4, 6], { blocks: 1 })] }, four(dud));
    const o = retreatDecision(d);
    expect(o).toHaveLength(1);
    expect(o[0].eliminated).toBe(true);
    must(d, { kind: 'choose', index: 0 });
    expect(kinds(ev(d), 'leaderKilled')).toHaveLength(1);
    expect(banners(d, 'bottom')).toBe(2);
    forceDice([]);
  });
});

describe('escape (§3.3, §11.4, R24, R25)', () => {
  const stage = (enemy: NonNullable<Pos["units"]>, faces: DieFace[], extra: Pos = {}): GameDriver =>
    melee({ ...extra, ...LDR, units: [top('FR/LN', [4, 6], { blocks: 1 }), ...enemy] }, [...four(dud), ...faces]);
  it('every path through enemy units carries the escapes; the enemy rolls its dice with type bonus, no terrain (R24)', () => {
    const forest: Pos = { terrain: [{ at: [3, 5], t: 'forest' }, { at: [3, 6], t: 'forest' }] };
    const d = stage([bot('BR/LN', [3, 5]), bot('BR/LN', [3, 6])], [], forest);
    const o = retreatDecision(d);
    expect(o.every((x) => x.escapes.length >= 1)).toBe(true);
    choose(d, o.find((x) => x.path.length === 2 && x.escapes.length === 1 && x.eliminated === false)!);
    expect(rolls(ev(d), 'escape')).toEqual([n(dud, 4)]); // BR/LN 4 blocks, forest ignored
    forceDice([]);
    const g = stage([bot('BR/GG', [3, 5]), bot('BR/GG', [3, 6])], []);
    const og = retreatDecision(g);
    choose(g, og.find((x) => x.escapes.length === 1 && x.path.length === 2)!);
    expect(rolls(ev(g), 'escape')[0]).toHaveLength(6); // 5 blocks + 1 (GG, b+1)
    forceDice([]);
  });
  it('a square rolls 1 die; a sabre kills the leader (R24)', () => {
    const d = stage([bot('BR/LN', [3, 5], { square: 1 })], ['sabre', dud, dud, dud]);
    const o = retreatDecision(d);
    expect(o.some((x) => x.escapes.length === 0)).toBe(true); // the owner may choose either
    choose(d, o.find((x) => x.escapes.length === 1)!);
    const es = ev(d);
    expect(rolls(es, 'escape')).toEqual([['sabre']]);
    expect(kinds(es, 'leaderKilled')).toHaveLength(1);
    expect(banners(d, 'bottom')).toBe(2);
    forceDice([]);
  });
  it('a surviving leader continues to the end of his path', () => {
    const d = stage([bot('BR/LN', [3, 5]), bot('BR/LN', [3, 6])], []);
    const o = retreatDecision(d).find((x) => x.path.length === 2 && x.escapes.length === 1 && !x.eliminated)!;
    choose(d, o);
    expect(d.state.leaders[0].hex).toBe(o.end);
    expect(kinds(ev(d), 'leaderKilled')).toHaveLength(0);
    forceDice([]);
  });
  it('a second enemy hex means a second roll; a third eliminates him (R24)', () => {
    const wall = [[3, 5], [3, 6], [2, 5], [2, 6], [2, 7], [1, 4], [1, 5], [1, 6], [1, 7]].map(([r, c]) => bot('BR/LN', [r, c]));
    const d = stage(wall, []);
    const o = retreatDecision(d);
    expect(o.every((x) => x.eliminated && x.escapes.length === 2)).toBe(true);
    choose(d, o[0]);
    const es = ev(d);
    expect(rolls(es, 'escape')).toHaveLength(2);
    expect(kinds(es, 'leaderKilled')).toHaveLength(1);
    expect(banners(d, 'bottom')).toBe(2);
    forceDice([]);
  });
  it('he may pass a lone enemy leader with no roll, and choose an escape even with a free path (R24, R25)', () => {
    const d = melee({ leaders: [topLdr([4, 6]), botLdr([3, 5])], units: [top('FR/LN', [4, 6], { blocks: 1 }), bot('BR/LN', [3, 6])] }, four(dud));
    const s = d.state;
    const o = retreatDecision(d);
    expect(o.some((x) => x.path[0] === H(3, 5) && x.path.length >= 2 && x.escapes.length === 0 && !x.eliminated)).toBe(true);
    expect(o.some((x) => x.path[0] === H(3, 6) && x.escapes.length === 1 && x.escapes[0] === 'u3')).toBe(true);
    expect(o.some((x) => x.end === H(3, 5) || x.end === H(3, 6))).toBe(false); // never ends on an enemy unit or leader
    expect(s.leaders.find((l) => l.id === leaderId(s, 1))!.hex).toBe(H(3, 5));
    forceDice([]);
  });
  it('his own retreat may pass a friendly unit or leader, attach to a unit without a leader, but not end on a leader (§11.3)', () => {
    const d = melee({
      leaders: [topLdr([4, 6]), topLdr([3, 5])],
      units: [top('FR/LN', [4, 6], { blocks: 1 }), top('FR/LN', [3, 6])],
    }, four(dud));
    const o = retreatDecision(d);
    expect(o.some((x) => x.end === H(3, 6) && x.attach === 'u3')).toBe(true);
    expect(o.some((x) => x.end === H(3, 5))).toBe(false);
    expect(o.some((x) => x.path[0] === H(3, 5) && x.path.length === 2)).toBe(true);
    forceDice([]);
  });
});

describe('one check per roll (§11.1, R18)', () => {
  const blockers = [top('FR/LN', [3, 5]), top('FR/LN', [3, 6])];
  it('fire that takes blocks from a unit with a leader makes the 2-dice check (§8.2, §11.1)', () => {
    const d = fireAt({ ...LDR, units: [top('FR/LN', [4, 6])] }, [hit]);
    const es = ev(d);
    expect(rolls(es, 'leaderCheck')).toHaveLength(1);
    expect(rolls(es, 'leaderCheck')[0]).toHaveLength(2);
    forceDice([]);
  });
  it('a failed retreat after a survived check makes no second check; the leader retreats from the hex (R18)', () => {
    const d = melee({ ...LDR, units: [top('FR/LN', [4, 6], { blocks: 2 }), ...blockers] }, [hit, 'flag', dud, dud, dud, dud]);
    must(d, { kind: 'ignoreFlags', count: 0 });
    const es = ev(d);
    expect(rolls(es, 'leaderCheck')).toEqual([[dud, dud]]);
    expect(u(d, 'u2')).toBeUndefined();
    retreatDecision(d);
    expect((d.state.leaders[0]).hex).toBe(H(4, 6));
    forceDice([]);
  });
  it('a loss from a failed retreat alone triggers the check: 2 dice if it survives, 1 if eliminated (R18)', () => {
    const d = melee({ ...LDR, units: [top('FR/LN', [4, 6], { blocks: 3 }), ...blockers] }, ['flag', dud, dud, dud, dud, dud]);
    must(d, { kind: 'ignoreFlags', count: 0 });
    const es = ev(d);
    expect(u(d, 'u2')!.blocks).toBe(2);
    expect(rolls(es, 'leaderCheck')).toEqual([[dud, dud]]);
    forceDice([]);
    const e = melee({ ...LDR, units: [top('FR/LN', [4, 6], { blocks: 1 }), ...blockers] }, ['flag', dud, dud, dud, dud, dud]);
    must(e, { kind: 'ignoreFlags', count: 0 });
    const fs = ev(e);
    expect(u(e, 'u2')).toBeUndefined();
    expect(rolls(fs, 'leaderCheck')).toEqual([[dud]]);
    retreatDecision(e);
    forceDice([]);
  });
  it('a leader killed in the check gives no flag-ignore (R18)', () => {
    const P: Pos = { ...LDR, units: [top('FR/LN', [4, 6])] };
    const k = melee(P, [hit, 'flag', dud, dud, 'sabre', 'sabre']);
    expect(kinds(ev(k), 'leaderKilled')).toHaveLength(1);
    expect(k.pending?.kind).toBe('retreat'); // no ignoreFlags: nothing left to ignore with
    forceDice([]);
    const ok = melee(P, [hit, 'flag', dud, dud, dud, dud]);
    expect(ok.pending).toMatchObject({ kind: 'ignoreFlags', max: 1 });
    forceDice([]);
  });
});

describe('lone leaders in melee (§3.3, §11.4, R21, R22, R6)', () => {
  const lone: Pos = { leaders: [topLdr([4, 6])] };
  const sabreFirst = (extra: DieFace[] = []): DieFace[] => ['sabre', dud, dud, dud, ...extra];
  it('normal dice, terrain and cards, no FR/LN +1; a sabre kills him (R21)', () => {
    const s = build({ ...lone, units: [bot('FR/LN', [5, 6])] });
    expect(battleTargets(s, 'u1')).toEqual([]);
    const d = toBattle(s, 'attackC', ['u1']);
    expect(battleTargets(d.state, 'u1')).toEqual([{ hex: H(4, 6), kind: 'melee', dice: 4 }]);
    ev(d);
    forceDice([...sabreFirst(), ...n(dud, 20)]);
    attack(d, 'u1', H(4, 6));
    const es = ev(d);
    expect(combatDice(es, 'melee')).toBe(4);
    expect(kinds(es, 'leaderKilled')).toHaveLength(1);
    expect(banners(d, 'bottom')).toBe(1);
    expect(combatDice(es, 'battleBack')).toBeUndefined();
    forceDice([]);
    const f = toBattle(build({ ...lone, terrain: [{ at: [4, 6], t: 'forest' }], units: [bot('BR/LN', [5, 6])] }), 'attackC', ['u1']);
    expect(battleTargets(f.state, 'u1')).toEqual([{ hex: H(4, 6), kind: 'melee', dice: 3 }]);
    const g = toBattle(build({ ...lone, units: [bot('BR/GG', [5, 6])] }), 'bayonetCharge', ['u1']);
    expect(battleTargets(g.state, 'u1')).toEqual([{ hex: H(4, 6), kind: 'melee', dice: 7 }]); // 5 + 1 (GG, b+1) + 1 (Bayonet Charge, Guard); nothing against a leader beyond that
  });
  it('otherwise flags do nothing, he retreats, there is no battle back (R21)', () => {
    const s = build({ ...lone, units: [bot('BR/LN', [5, 6])] });
    const d = toBattle(s, 'attackC', ['u1']);
    ev(d);
    forceDice(['flag', 'flag', dud, dud, ...n(dud, 20)]);
    attack(d, 'u1', H(4, 6));
    const es = ev(d);
    expect(combatDice(es, 'battleBack')).toBeUndefined();
    expect(kinds(es, 'flags')).toHaveLength(0);
    const o = retreatDecision(d);
    must(d, { kind: 'choose', index: 0 });
    expect(d.state.leaders[0].hex).toBe(o[0].end);
    expect(kinds(ev(d), 'leaderRetreat')).toHaveLength(1);
    forceDice([]);
  });
  it('a lone leader is never fired at and counts as one supporter (R6, R22)', () => {
    const s = build({ ...lone, units: [bot('BR/LN', [6, 6])] });
    const d = toBattle(s, 'attackC', ['u1']);
    expect(battleTargets(d.state, 'u1')).toEqual([]);
    const t = build({ leaders: [topLdr([3, 5])], units: [top('FR/LN', [4, 6]), top('FR/LN', [3, 6])] });
    expect(supportCount(t, u(t, 'u1')!)).toBe(2);
  });
  it('leaders never add dice or hits except on Leadership (R20)', () => {
    expect(duel('BR/LN', 'FR/LN')).toEqual({ attack: 4, back: 5 });
    const s = build({ units: [bot('BR/LN', [5, 6]), top('FR/LN', [4, 6])], leaders: [botLdr([5, 6]), topLdr([4, 6])] });
    const d = toBattle(s, 'attackC', ['u1', leaderId(s, 0)]);
    ev(d);
    forceDice(n(miss('BR/LN', 'FR/LN'), 30));
    attack(d, 'u1', H(4, 6));
    const es = ev(d);
    expect({ attack: combatDice(es, 'melee'), back: combatDice(es, 'battleBack') }).toEqual({ attack: 4, back: 5 });
    forceDice([]);
  });
});

describe('T6a carry-forward: retreats and targets', () => {
  it('an enemy lone leader blocks a unit retreat (R74)', () => {
    const s = build({ units: [top('FR/LN', [4, 6])], leaders: [botLdr([3, 5]), botLdr([3, 6])] });
    expect(retreatOptions(s, s.units[0], 1)).toEqual([{ path: [], end: H(4, 6), losses: 1, attach: null }]);
  });
  it('a fire target that would roll 0 dice is refused (R5)', () => {
    const s = build({ units: [bot('BR/LN', [6, 6], { blocks: 1 }), top('FR/LN', [4, 6])], terrain: [{ at: [4, 6], t: 'town' }] });
    const d = toBattle(s, 'attackC', ['u1']);
    expect(fireDice(d.state, u(d, 'u1')!, H(4, 6), { role: 'attack', moved: 0 })).toBe(0);
    expect(battleTargets(d.state, 'u1')).toEqual([]);
    expect(d.answer({ kind: 'attack', unit: 'u1', target: H(4, 6) })).toBe(false);
  });
  it('a retreat onto a lone friendly leader attaches him (§10.1, R75)', () => {
    const d = fireAt({ units: [top('FR/LN', [4, 6])], leaders: [topLdr([3, 5])] }, ['flag']);
    const o = (d.pending as { options: { end: number; attach: string | null }[] }).options;
    expect(d.pending?.kind).toBe('retreat');
    const i = o.findIndex((x) => x.end === H(3, 5));
    expect(o[i].attach).not.toBeNull();
    must(d, { kind: 'choose', index: i });
    const es = ev(d);
    expect(kinds(es, 'attach')).toEqual([{ t: 'attach', leader: leaderId(d.state, 0), unit: 'u2' }]);
    expect(d.state.leaders[0].hex).toBe(H(3, 5));
    expect(u(d, 'u2')!.hex).toBe(H(3, 5));
    forceDice([]);
  });
});

describe('Leadership: a unit is ordered only while its leader stays (§6.2, §12.2)', () => {
  const P: Pos = { units: [bot('BR/LN', [5, 6]), top('FR/LN', [4, 6])], leaders: [botLdr([5, 6]), botLdr([6, 2])] };
  it('when the leader moves away his former unit is no longer ordered', () => {
    const s = build(P);
    const [L1, L2] = [leaderId(s, 0), leaderId(s, 1)];
    const d = play(s, 'leadership', [L1, L2, 'u1']);
    expect(d.state.turn.ordered.u1).toBeDefined();
    must(d, { kind: 'move', piece: L1, to: H(6, 6) });
    expect(d.state.turn.ordered.u1).toBeUndefined();
    endMoves(d);
    expect(battleTargets(d.state, 'u1')).toEqual([]);
  });
  it('a leader that leaves the board also frees his unit; a unit whose leader stays stays ordered', () => {
    const s = build(P);
    const [L1, L2] = [leaderId(s, 0), leaderId(s, 1)];
    const d = play(s, 'leadership', [L1, L2, 'u1']);
    must(d, { kind: 'move', piece: L2, to: H(6, 3) });
    expect(d.state.turn.ordered.u1).toBeDefined();
    endMoves(d);
    expect(battleTargets(d.state, 'u1')).toEqual([{ hex: H(4, 6), kind: 'melee', dice: 5 }]);
    expect(OFF_BOARD).toBeLessThan(0);
  });
});
