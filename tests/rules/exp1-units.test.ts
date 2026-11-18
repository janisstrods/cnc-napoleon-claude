// Rules: RR §15.1, §15.2, §15.3 (design/rules-reference.md)
import { describe, expect, it } from 'vitest';
import { UNIT_STATS, battleTargets, retreatOptions, type DieFace, type GameDriver, type Decision, type RowKey } from '../../src/engine';
import { baseFireDice, baseMeleeDice, escapeDice, fireDice, meleeDice } from '../../src/engine/dice';
import { H, attack, build, ev, endMoves, forceDice, leaderId, must, n, play, toBattle, u, type Pos } from './helpers';

const S = (k: RowKey) => UNIT_STATS[k];
const NEW: RowKey[] = ['FR/LNC', 'FR/GLC', 'FR/SWI', 'SP/LN', 'SP/LT', 'SP/GR', 'SP/ML', 'SP/SWI', 'SP/LC', 'SP/HC', 'SP/CU', 'SP/FA'];
const mv = (max: number, battle: boolean) => ({ max, battle });
const LINE = [mv(1, true)];
const LIGHT = [mv(1, true), mv(2, false)];
const bot = (key: RowKey, at: [number, number], extra: object = {}) => ({ side: 'bottom' as const, key, at, ...extra });
const top = (key: RowKey, at: [number, number], extra: object = {}) => ({ side: 'top' as const, key, at, ...extra });
const movedFire = (k: RowKey) => [5, 4, 3, 2, 1].map((b) => baseFireDice(S(k), b, 2, 1));

describe('the twelve Expansion #1 rows (§15.1)', () => {
  // key: blocks, move, melee plus, moved plus, fire [range, standing, moving] | null, retreat, flags, sabre, tags, reroll, immune
  const TABLE: Record<string, [number, readonly { max: number; battle: boolean }[], number, number, [number, number, number] | null, number, number, boolean, string[], boolean, boolean]> = {
    'FR/LNC': [4, [mv(3, true)], 0, 0, null, 1, 0, true, [], true, false],
    'FR/GLC': [4, [mv(3, true)], 0, 0, null, 1, 2, true, ['guard'], false, false],
    'FR/SWI': [5, LINE, 0, 0, [2, 0, 0], 1, 0, true, [], false, false],
    'SP/LN': [4, LINE, 0, -1, [2, 0, -1], 2, 0, true, [], false, false],
    'SP/LT': [5, LIGHT, 0, -1, [2, 0, 0], 2, 0, true, ['light'], false, false],
    'SP/GR': [4, LINE, 1, 0, [2, 0, 0], 2, 1, true, ['grenadier'], false, false],
    'SP/ML': [4, LINE, 0, -1, [2, 0, -1], 3, 0, false, [], false, false],
    'SP/SWI': [5, LINE, 0, 0, [2, 0, 0], 1, 0, true, [], false, false],
    'SP/LC': [3, [mv(3, true)], 0, 0, null, 2, 0, true, [], false, false],
    'SP/HC': [3, [mv(2, true)], 1, 0, null, 2, 0, true, ['heavy'], false, false],
    'SP/CU': [3, [mv(2, true)], 1, 0, null, 2, 1, true, ['heavy'], false, true],
  };
  it('every new row matches the §15.1 table', () => {
    for (const [k, [blocks, move, plus, movedPlus, fire, retreat, flags, sabre, tags, reroll, immune]] of Object.entries(TABLE)) {
      const st = S(k as RowKey);
      expect(st.blocks, k).toBe(blocks);
      expect(st.move, k).toEqual(move);
      expect(st.melee, k).toEqual({ kind: 'blocks', plus, vsInfantry: 0, movedPlus });
      if (fire) expect(st.fire, k).toEqual({ kind: 'musket', range: fire[0], standing: fire[1], moving: fire[2], round: 'down' });
      else expect(st.fire, k).toEqual({ kind: 'none' });
      expect([st.retreat.first, st.retreat.then], k).toEqual([retreat, retreat]);
      expect(st.flagIgnore, k).toBe(flags);
      expect(st.sabreHits, k).toBe(sabre);
      expect(st.tags, k).toEqual(tags);
      expect(st.rerollsFlags, k).toBe(reroll);
      expect(st.immuneToFlagReroll, k).toBe(immune);
      expect(st.expansion, k).toBe('exp1');
    }
    expect(S('SP/FA')).toEqual({ ...S('FR/FA'), key: 'SP/FA', expansion: 'exp1' });
    for (const k of NEW) {
      expect(S(k).ignoresInfantryFireHits, k).toBe(k === 'SP/CU' ? 1 : 0);
      expect(S(k).battleAfterMoveMinBlocks, k).toBe(1);
    }
    expect(S('SP/LT').move).toEqual(LIGHT);
    expect(S('SP/CU').ignoresInfantryFireHits).toBe(1);
  });
  it('FR/CU is immune to the lancers\' re-roll; every other base row is not; the 12 new keys are in UNIT_KEYS (S12)', () => {
    expect(S('FR/CU').immuneToFlagReroll).toBe(true);
    for (const k of Object.keys(UNIT_STATS) as RowKey[]) {
      if (!NEW.includes(k)) { expect(S(k).rerollsFlags, k).toBe(false); expect(S(k).immuneToFlagReroll, k).toBe(k === 'FR/CU'); expect(S(k).expansion, k).toBe('base'); }
    }
    for (const k of NEW) expect(S(k)).toBeDefined();
  });
});

describe('Spanish moving fire (S1–S4, S7)', () => {
  it('LN and ML: 1 die at 4 blocks, none at 3 or fewer; standing fire is b', () => {
    for (const k of ['SP/LN', 'SP/ML'] as const) {
      expect(movedFire(k)).toEqual([1, 1, 0, 0, 0]);  // 5 blocks (a scenario override) 1; 4 blocks 1; 3 or fewer none
      expect([5, 4, 3, 2, 1].map((b) => baseFireDice(S(k), b, 2, 0))).toEqual([5, 4, 3, 2, 1]);
    }
  });
  it('LT 2/2/1/1/0 and GR 2/1/1/0 (no −1)', () => {
    expect(movedFire('SP/LT')).toEqual([2, 2, 1, 1, 0]);
    expect(movedFire('SP/GR')).toEqual([2, 2, 1, 1, 0]);
    expect(baseFireDice(S('SP/GR'), 4, 2, 0)).toBe(4);
    expect(baseFireDice(S('SP/LT'), 5, 2, 0)).toBe(5);
  });
});

describe('Swiss (S11, S14)', () => {
  it('move and fire half rounded down; FR/SWI gets no French line die', () => {
    expect(baseFireDice(S('FR/SWI'), 5, 2, 1)).toBe(2);
    expect(baseFireDice(S('SP/SWI'), 5, 2, 1)).toBe(2);
    expect(baseFireDice(S('SP/SWI'), 4, 2, 1)).toBe(2);
    expect(baseFireDice(S('SP/SWI'), 3, 2, 1)).toBe(1);
    const s = build({ units: [bot('FR/SWI', [5, 6]), top('BR/LN', [4, 6])] });
    expect(baseMeleeDice(s, u(s, 'u1')!, u(s, 'u2')!, 0)).toBe(5);
    expect(baseMeleeDice(s, u(s, 'u1')!, u(s, 'u2')!, 1)).toBe(5);
  });
});

describe('Spanish melee after moving (S1–S5)', () => {
  it('LN, LT, ML b−1; GR b+1 always; cavalry b or b+1', () => {
    const s = build({ units: [bot('SP/LN', [5, 6]), bot('SP/LT', [5, 7]), bot('SP/ML', [5, 4]), bot('SP/GR', [5, 2]), bot('SP/LC', [5, 0]), bot('SP/HC', [5, 8]), bot('SP/CU', [5, 10]), top('BR/HC', [4, 6])] });
    const foe = u(s, 'u8')!;
    const dice = (id: string, moved: number) => baseMeleeDice(s, u(s, id)!, foe, moved);
    expect([dice('u1', 0), dice('u1', 1)]).toEqual([4, 3]);
    expect([dice('u2', 0), dice('u2', 1)]).toEqual([5, 4]);
    expect([dice('u3', 0), dice('u3', 1)]).toEqual([4, 3]);
    expect([dice('u4', 0), dice('u4', 1)]).toEqual([5, 5]);
    expect([dice('u5', 0), dice('u5', 1)]).toEqual([3, 3]);
    expect([dice('u6', 0), dice('u6', 1)]).toEqual([4, 4]);
    expect([dice('u7', 0), dice('u7', 1)]).toEqual([4, 4]);
    expect(baseMeleeDice(s, u(s, 'u1')!, foe, 2)).toBe(3);
  });
  it('a moved 1-block SP/LN, SP/LT and SP/ML have exactly 0 base melee dice (S7)', () => {
    const s = build({ units: [bot('SP/LN', [5, 6], { blocks: 1 }), bot('SP/LT', [5, 7], { blocks: 1 }), bot('SP/ML', [5, 4], { blocks: 1 }), top('BR/HC', [4, 6])] });
    for (const id of ['u1', 'u2', 'u3']) { expect(baseMeleeDice(s, u(s, id)!, u(s, 'u4')!, 1)).toBe(0); expect(baseMeleeDice(s, u(s, id)!, u(s, 'u4')!, 0)).toBe(1); }
  });
});

/** A bottom SP/LN u1 at (6,6) with 1 block moves to (5,6) next to the top FR/LN u2 at (4,6) under `card`. */
function moved1(card: 'probeC' | 'attackC'): GameDriver {
  const s = build({ units: [bot('SP/LN', [6, 6], { blocks: 1 }), top('FR/LN', [4, 6])] });
  const d = play(s, card, ['u1']);
  must(d, { kind: 'move', piece: 'u1', to: H(5, 6) });
  return d;
}

describe('S7: a moved 1-block unit', () => {
  it('has 0 dice but may melee with a card die (Leadership with its leader: melee +1)', () => {
    const s = build({ units: [bot('SP/LN', [5, 6], { blocks: 1 }), top('FR/LN', [4, 6])], leaders: [{ side: 'bottom', at: [5, 6] }] });
    const d = play(s, 'leadership', ['u1', leaderId(s, 0)]);
    expect(d.pending?.kind).toBe('move');
    expect(meleeDice(d.state, u(d, 'u1')!, u(d, 'u2')!, { role: 'attack', moved: 1, declared: true })).toBe(1);
    expect(meleeDice(d.state, u(d, 'u1')!, u(d, 'u2')!, { role: 'attack', moved: 0 })).toBe(2);
    expect(meleeDice(d.state, u(d, 'u1')!, u(d, 'u2')!, { role: 'attack', moved: 1 })).toBe(1);
  });
  it('offers the melee after a real move when Leadership adds the die', () => {
    const s = build({ units: [bot('SP/LN', [6, 6], { blocks: 1 }), top('FR/LN', [4, 6])], leaders: [{ side: 'bottom', at: [6, 6] }] });
    const d = play(s, 'leadership', ['u1', leaderId(s, 0)]);
    must(d, { kind: 'move', piece: 'u1', to: H(5, 6) });
    endMoves(d);
    expect(battleTargets(d.state, 'u1')).toEqual([{ hex: H(4, 6), kind: 'melee', dice: 1 }]);
  });
  it('under Probe the moved unit has 0 melee dice and no target', () => {
    const s = build({ units: [bot('SP/LN', [5, 6], { blocks: 1 }), top('FR/LN', [4, 6])] });
    const d = play(s, 'probeC', ['u1']);
    expect(meleeDice(d.state, u(d, 'u1')!, u(d, 'u2')!, { role: 'attack', moved: 1 })).toBe(0);
    expect(battleTargets(d.state, 'u1').filter((t) => t.kind === 'melee')).toHaveLength(1);  // standing: it may attack
    const m = moved1('probeC');
    endMoves(m);
    expect(battleTargets(m.state, 'u1')).toEqual([]);
  });
  it('under Probe a Combined Arms gun can join: the melee is offered and combinedArms is required (S7, R41)', () => {
    const s = build({ units: [bot('SP/LN', [6, 6], { blocks: 1 }), top('FR/LN', [4, 6]), bot('SP/FA', [6, 5])] });
    const d = play(s, 'probeC', ['u1', 'u3']);
    must(d, { kind: 'move', piece: 'u1', to: H(5, 6) });
    endMoves(d);
    expect(battleTargets(d.state, 'u1')).toEqual([{ hex: H(4, 6), kind: 'melee', dice: 0 }]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(d.pending).toMatchObject({ kind: 'combinedArms', unit: 'u1', options: ['u3'], required: true });
  });
  it('cannot fire after moving, and no card creates the shot (R15)', () => {
    const s = build({ units: [bot('SP/LN', [6, 6], { blocks: 1 }), top('FR/LN', [4, 6])], leaders: [{ side: 'bottom', at: [6, 6] }] });
    const d = play(s, 'leadership', ['u1', leaderId(s, 0)]);
    expect(fireDice(d.state, u(d, 'u1')!, H(4, 6), { role: 'attack', moved: 1 })).toBe(0);
    expect(fireDice(d.state, u(d, 'u1')!, H(4, 6), { role: 'attack', moved: 0 })).toBe(2);
    const t = build({ units: [bot('SP/LN', [6, 6], { blocks: 3 }), top('FR/LN', [4, 6])], leaders: [{ side: 'bottom', at: [6, 6] }] });
    const e = play(t, 'leadership', ['u1', leaderId(t, 0)]);
    expect(fireDice(e.state, u(e, 'u1')!, H(4, 6), { role: 'attack', moved: 1 })).toBe(0);
  });
});

describe('S8: standing values', () => {
  it('dice functions: battle back, First Strike and escape use standing dice', () => {
    const s = build({ units: [bot('FR/LN', [5, 6]), top('SP/LN', [4, 6], { blocks: 3 })], leaders: [{ side: 'top', at: [3, 6] }] });
    const sp = u(s, 'u2')!;
    expect(meleeDice(s, sp, u(s, 'u1')!, { role: 'back', moved: 0 })).toBe(3);
    expect(meleeDice(s, sp, u(s, 'u1')!, { role: 'firstStrike', moved: 0 })).toBe(3);
    const t = build({ units: [bot('SP/LN', [5, 6], { blocks: 3 })], leaders: [{ side: 'top', at: [2, 6] }] });
    expect(escapeDice(t, u(t, 'u1')!)).toBe(3);
  });
  it('rallied and unsquared units have not moved: ordered piece moved 0', () => {
    const s = build({ units: [bot('SP/LN', [5, 6], { square: 1, blocks: 1 }), top('FR/LN', [4, 6])] });
    const d = play(s, 'attackC', ['u1']);
    expect(d.pending).toMatchObject({ kind: 'leaveSquare', unit: 'u1' });
    must(d, { kind: 'yesno', yes: true });
    expect(d.state.turn.ordered.u1.moved).toBe(0);
    // standing fire: 1 block fires 1 die (a moving 1-block unit would fire none)
    expect(fireDice(d.state, u(d, 'u1')!, H(3, 6), { role: 'attack', moved: d.state.turn.ordered.u1.moved })).toBe(1);
    const t = build({ units: [bot('SP/LN', [6, 6], { blocks: 4 }), top('FR/LN', [4, 6])] });
    const e = play(t, 'attackC', ['u1']);
    expect(fireDice(e.state, u(e, 'u1')!, H(4, 6), { role: 'attack', moved: e.state.turn.ordered.u1.moved })).toBe(4);
  });
  it('a Rally-placed and a Short-Supply-placed unit have moved 0 and full standing dice', () => {
    const s = build({ units: [bot('SP/LN', [6, 6], { blocks: 2 }), top('FR/LN', [4, 6])] });
    forceDice(['infantry', 'infantry', 'flag', 'flag', 'flag']);
    const d = play(s, 'rally');
    must(d, { kind: 'assign', ids: ['u1', 'u1', null, null, null] });
    const op = d.state.turn.ordered.u1;
    expect(op.moved).toBe(0);
    expect(u(d, 'u1')!.blocks).toBe(4);
    expect(fireDice(d.state, u(d, 'u1')!, H(4, 6), { role: 'attack', moved: op.moved })).toBe(4);
    const t = build({ units: [bot('SP/LN', [6, 6]), top('FR/LN', [4, 6])] });
    const e = play(t, 'shortSupply');
    expect(e.pending).toMatchObject({ kind: 'shortSupplyTarget' });
    must(e, { kind: 'choose', index: 0 });
    const hex = (e.pending as { options: number[] }).options[0];
    must(e, { kind: 'hex', hex });
    const placed = u(e, 'u1')!;
    expect(placed.hex).toBe(hex);
    expect(e.state.turn.ordered.u1?.moved ?? 0).toBe(0);
    expect(baseFireDice(S('SP/LN'), placed.blocks, 2, e.state.turn.ordered.u1?.moved ?? 0)).toBe(4);
  });
});

describe('FR/LN against Spanish and Swiss infantry (S14)', () => {
  it('rolls +1 against every Spanish and Swiss infantry unit and not against cavalry or guns', () => {
    const s = build({ units: [bot('FR/LN', [5, 6]), top('SP/LN', [4, 6]), top('SP/SWI', [4, 7]), top('SP/LC', [4, 5]), top('SP/FA', [5, 7])] });
    const a = u(s, 'u1')!;
    expect([2, 3, 4, 5].map((i) => baseMeleeDice(s, a, u(s, `u${i}`)!, 0))).toEqual([5, 5, 4, 4]);
  });
});

describe('SP/CU (S5)', () => {
  it('ignores 1 hit of infantry fire and 1 flag', () => {
    const s = build({ units: [bot('BR/LN', [6, 6]), top('SP/CU', [4, 6])] });
    const d = toBattle(s, 'attackC', ['u1']);
    ev(d);
    forceDice([...n('cavalry', 2), ...n('sabre', 20)]);
    attack(d, 'u1', H(4, 6));
    expect(u(d, 'u2')!.blocks).toBe(2);   // 2 hits, 1 ignored → 1 block lost of 3
    const t = build({ units: [bot('BR/LN', [6, 6]), top('SP/CU', [4, 6])] });
    const e = toBattle(t, 'attackC', ['u1']);
    ev(e);
    forceDice([...n('flag', 1), ...n('sabre', 20)]);
    attack(e, 'u1', H(4, 6));
    const p = e.pending as Decision | null;
    expect(p?.kind === 'ignoreFlags' ? p.max : null).toBe(1);
  });
});

describe('retreat distances (S9)', () => {
  /** Bottom BR/LN u1 at (6,6) fires at the top unit u2 at (4,6) of `p`; the dice come out `faces` then misses. */
  function fireAt(p: Pos, faces: DieFace[], at = 4): GameDriver {
    const units = [bot('BR/LN', [at + 2, 6]), ...(p.units ?? [])];
    const d = toBattle(build({ ...p, units }), 'attackC', ['u1']);
    ev(d);
    forceDice([...faces, ...n('sabre', 12)]);
    attack(d, 'u1', H(at, 6));
    return d;
  }
  const flags = (k: number): DieFace[] => n('flag', k);
  const asked = (p: Pos, k: number, at = 4) => {
    const d = fireAt(p, flags(k), at);
    if (d.pending?.kind === 'ignoreFlags') must(d, { kind: 'ignoreFlags', count: 0 });
    return d;
  };
  it('a Spanish infantry unit retreats 2 hexes per flag; militia 3; artillery and Swiss 1', () => {
    const len = (key: RowKey) => {
      const d = asked({ units: [top(key, [4, 6])] }, 1);
      return d.pending?.kind === 'retreat' ? new Set(d.pending.options.map((o) => o.path.length)) : null;
    };
    expect(len('SP/LN')).toEqual(new Set([2]));
    expect(len('SP/ML')).toEqual(new Set([3]));
    expect(len('SP/FA')).toEqual(new Set([1]));
    expect(len('SP/SWI')).toEqual(new Set([1]));
    expect(len('FR/SWI')).toEqual(new Set([1]));
  });
  it('a blocked Spanish retreat costs 1 block per hex short', () => {
    const s = build({ units: [top('SP/LN', [0, 6])] });
    const opts = retreatOptions(s, u(s, 'u1')!, 2);
    expect(opts).toEqual([{ path: [], end: H(0, 6), losses: 2, attach: null }]);
    const s1 = build({ units: [top('SP/LN', [1, 6])] });
    const one = retreatOptions(s1, u(s1, 'u1')!, 2);   // one hex of the two exists: it costs 1 block
    expect(one.every((o) => o.path.length === 1 && o.losses === 1)).toBe(true);
    const d = asked({ units: [top('SP/LN', [0, 6])] }, 1, 0);
    expect(u(d, 'u2')!.blocks).toBe(2);   // on the baseline: 2 hexes short, 2 blocks
  });
  it('a retreat that runs out of hexes behind friendly units costs 1 block per hex short (R74)', () => {
    const closed2 = [4, 5, 6, 7, 8].map((c) => top('FR/LN', [2, c]));   // the first rear hex is free, the second is blocked
    const s = build({ units: [top('SP/LN', [4, 6]), ...closed2] });
    const o = retreatOptions(s, u(s, 'u1')!, 2);
    expect(o.length).toBeGreaterThan(0);
    expect(o.every((x) => x.path.length === 1 && x.losses === 1)).toBe(true);
    const shut = build({ units: [top('SP/ML', [4, 6]), top('FR/LN', [3, 5]), top('FR/LN', [3, 6])] });   // no rear hex at all
    const m = retreatOptions(shut, u(shut, 'u1')!, 3);
    expect(m.every((x) => x.path.length === 0 && x.losses === 3)).toBe(true);
    const d = asked({ units: [top('SP/ML', [4, 6]), top('FR/LN', [3, 5]), top('FR/LN', [3, 6])] }, 1);
    expect(u(d, 'u2')!.blocks).toBe(1);
  });
  it('in square a Spanish unit loses 2 blocks per flag, militia 3, Swiss 1, and does not move (R33)', () => {
    // row 3 has free hexes behind it, so an unsquared unit would simply retreat; the square must lose blocks instead
    const after = (key: RowKey, k: number) => {
      const d = fireAt({ units: [top(key, [3, 6], { square: 1 })] }, flags(k), 3);
      if (d.pending?.kind === 'ignoreFlags') must(d, { kind: 'ignoreFlags', count: 0 });
      return u(d, 'u2');
    };
    const ln = after('SP/LN', 1);
    expect(ln!.blocks).toBe(2);
    expect(ln!.hex).toBe(H(3, 6));
    expect(after('SP/LN', 2)).toBeUndefined();   // 4 blocks lost: eliminated
    const ml = after('SP/ML', 1);
    expect(ml!.blocks).toBe(1);
    expect(ml!.hex).toBe(H(3, 6));
    const sw = after('SP/SWI', 1);
    expect(sw!.blocks).toBe(4);
    expect(sw!.hex).toBe(H(3, 6));
  });
});

describe('cavalry (S5, S13)', () => {
  it('Spanish cavalry Retire and Reform is exactly 2 hexes', () => {
    const d = toBattle(build({ units: [bot('FR/LN', [5, 6]), top('SP/LC', [4, 6])] }), 'attackC', ['u1']);
    ev(d);
    forceDice(n('sabre', 10));
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    if (d.pending?.kind === 'combinedArms') must(d, { kind: 'select', ids: [] });
    expect(d.pending).toMatchObject({ kind: 'defend', options: ['stand', 'retireReform'] });
    forceDice([...n('cavalry', 1), ...n('sabre', 10)]);
    must(d, { kind: 'defend', choice: 'retireReform' });
    const p = d.pending;
    expect(p?.kind).toBe('retreat');
    if (p?.kind === 'retreat') expect(new Set(p.options.map((o) => o.path.length))).toEqual(new Set([2]));
  });
  it('FR/GLC rolls +2 under Cavalry Charge as Guard cavalry (R60)', () => {
    const s = build({ units: [bot('FR/GLC', [5, 6]), bot('FR/LC', [5, 7]), top('BR/LN', [4, 6]), top('BR/LN', [4, 7])] });
    const d = play(s, 'cavalryCharge', ['u1', 'u2']);
    expect(meleeDice(d.state, u(d, 'u1')!, u(d, 'u3')!, { role: 'attack', moved: 0 })).toBe(4 + 2);
    expect(meleeDice(d.state, u(d, 'u2')!, u(d, 'u4')!, { role: 'attack', moved: 0 })).toBe(4 + 1);
  });
});
