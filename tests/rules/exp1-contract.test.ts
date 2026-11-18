// Rules: RR §15.5, §15.7, §15.8 (design/rules-reference.md)
// RR §15/§16 (design/rules-reference.md): written from design/exp1-rulings.md (S15–S21, S28, S30–S38, S43–S46) and the Task 2 brief.
// The Expansion #1 contract: the new objective kinds, side rules, decisions and setup state. No flow asks the new
// decisions yet; these tests pin the data, the pure queries, the setup checks and the answer checks.
import { describe, expect, it } from 'vitest';
import {
  CARD_LIST, GUERRILLA_COUNTERS, answerError, bannerTotal, breakRule, cloneState, follyActive, formSquare, guerrillaHeld,
  guerrillaPool, guerrillaSide, handShrinkRule, newTurn, randomAnswer, squareCapReached,
  type Answer, type Decision, type FlowCtx, type GameState,
} from '../../src/engine';
import { scenarioFromJson, type ScenarioJson } from '../../src/scenarios';
import { lcg } from '../support/rng';
import { build, setupOf, violations, type Pos } from './helpers';

const quiet: FlowCtx = { emit: () => {} };
const throwsWith = (p: Pos, prefix: string): void => {
  expect(() => build(p)).toThrow(prefix);
  expect(() => build(p)).toThrow(/\(qa\)$/);
};

describe('Expansion #1 setup (RR §15.5, §15.8)', () => {
  it('a guerrilla rule gives its side counters; the pool is the rest of six', () => {
    const s = build({ sideRules: [{ kind: 'guerrilla', side: 'top', counters: 1 }] });
    expect(GUERRILLA_COUNTERS).toBe(6);
    expect(s.players.top.resources.guerrilla).toBe(1);
    expect('guerrilla' in s.players.bottom.resources).toBe(false);
    expect(guerrillaSide(s)).toBe('top');
    expect(guerrillaHeld(s)).toBe(1);
    expect(guerrillaPool(s)).toBe(5);
    const z = build({ sideRules: [{ kind: 'guerrilla', side: 'bottom', counters: 0 }] });
    expect(z.players.bottom.resources.guerrilla).toBe(0);
    expect([guerrillaSide(z), guerrillaHeld(z), guerrillaPool(z)]).toEqual(['bottom', 0, 6]);
    const none = build({});
    expect([guerrillaSide(none), guerrillaHeld(none), guerrillaPool(none)]).toEqual([null, 0, 0]);
    expect(none.players.top.resources).toEqual({});
    expect(none.players.bottom.resources).toEqual({});
  });

  it('majority startHeld is held at setup and counts in the banner total', () => {
    const p = (startHeld?: boolean): Pos => ({
      units: [{ side: 'top', key: 'FR/LN', at: [2, 2] }, { side: 'top', key: 'FR/LN', at: [2, 3] }, { side: 'bottom', key: 'BR/LN', at: [2, 4] }],
      objectives: [{ kind: 'majority', side: 'top', hexes: [[2, 2], [2, 3], [2, 4]], ...(startHeld === undefined ? {} : { startHeld }) }],
    });
    const s = build(p(true));
    const o = s.scenario.objectives[0];
    expect(o).toMatchObject({ kind: 'majority', side: 'top', banners: 1, startHeld: true });
    expect(s.special.objState[0].held).toBe(true);
    expect(bannerTotal(s, 'top')).toBe(1);
    expect(bannerTotal(s, 'bottom')).toBe(0);
    const n = build(p());
    expect(n.scenario.objectives[0]).toMatchObject({ startHeld: false });
    expect(n.special.objState[0].held).toBe(false);
    expect(bannerTotal(n, 'top')).toBe(0);
  });

  it('a majority that starts held without a majority throws', () => {
    // a tie (one against one) is no majority; a lone leader never counts (R65)
    throwsWith({
      units: [{ side: 'top', key: 'FR/LN', at: [2, 2] }, { side: 'bottom', key: 'BR/LN', at: [2, 3] }],
      objectives: [{ kind: 'majority', side: 'top', hexes: [[2, 2], [2, 3]], startHeld: true }],
    }, 'majority objective starts held by top without a majority');
    throwsWith({
      leaders: [{ side: 'bottom', at: [2, 2] }],
      objectives: [{ kind: 'majority', side: 'bottom', hexes: [[2, 2], [2, 3]], startHeld: true }],
    }, 'majority objective starts held by bottom without a majority');
  });

  it('suddenDeath resolves need from the enemy units of its keys', () => {
    const s = build({
      units: [
        { side: 'top', key: 'FR/FA', at: [1, 2] }, { side: 'top', key: 'FR/FA', at: [1, 4] }, { side: 'top', key: 'FR/HA', at: [1, 6] },
        { side: 'top', key: 'FR/LN', at: [1, 8] }, { side: 'bottom', key: 'BR/FA', at: [7, 2] },
      ],
      objectives: [{ kind: 'suddenDeath', side: 'bottom', keys: ['FR/FA', 'FR/HA'] }],
    });
    expect(s.scenario.objectives[0]).toMatchObject({ kind: 'suddenDeath', side: 'bottom', keys: ['FR/FA', 'FR/HA'], need: 3 });
    expect(typeof (s.scenario.objectives[0] as { text: string }).text).toBe('string');
    throwsWith({
      units: [{ side: 'bottom', key: 'BR/FA', at: [7, 2] }],
      objectives: [{ kind: 'suddenDeath', side: 'bottom', keys: ['BR/FA'] }],
    }, 'suddenDeath: no enemy unit of BR/FA');
  });

  it("breakOnLosses resolves start from the side's units of its keys", () => {
    const s = build({
      units: [
        { side: 'top', key: 'FR/LN', at: [1, 2] }, { side: 'top', key: 'FR/LN', at: [1, 4] }, { side: 'top', key: 'FR/LT', at: [1, 6] },
        { side: 'bottom', key: 'BR/LN', at: [7, 2] }, { side: 'bottom', key: 'FR/LN', at: [7, 4] },   // an enemy unit of the key never counts
      ],
      sideRules: [{ kind: 'breakOnLosses', side: 'top', keys: ['FR/LN'], losses: 2 }],
    });
    expect(s.scenario.sideRules[0]).toEqual({ kind: 'breakOnLosses', side: 'top', keys: ['FR/LN'], losses: 2, start: 2 });
    expect(breakRule(s, 'top')).toEqual(s.scenario.sideRules[0]);
    expect(breakRule(s, 'bottom')).toBeUndefined();
    throwsWith({ sideRules: [{ kind: 'breakOnLosses', side: 'top', keys: ['XX/LN' as 'FR/LN'], losses: 2 }] }, 'breakOnLosses: unknown unit key');
  });

  it('exitEdge, tempAny, handShrink, squareCap, cavalryChargeFolly validate', () => {
    const ok = build({
      objectives: [
        { kind: 'exitEdge', side: 'bottom', row: 0, free: 3 },
        { kind: 'exitEdge', side: 'top', row: 8 },
        { kind: 'tempAny', side: 'top', hexes: [[4, 2], [4, 3]] },
        { kind: 'tempAny', side: 'bottom', hexes: [[4, 6], [4, 7]], timing: 'turnStart' },
      ],
      sideRules: [{ kind: 'handShrink', side: 'bottom', floor: 3 }, { kind: 'squareCap', side: 'bottom', units: 2 }, { kind: 'cavalryChargeFolly', side: 'bottom' }],
    });
    expect(ok.scenario.objectives[0]).toMatchObject({ kind: 'exitEdge', side: 'bottom', row: 0, free: 3, banners: 1 });
    expect(ok.scenario.objectives[1]).toMatchObject({ kind: 'exitEdge', row: 8, free: 0, banners: 1 });
    expect(ok.scenario.objectives[2]).toMatchObject({ kind: 'tempAny', timing: 'turnStart', banners: 1 });
    expect(ok.scenario.objectives[3]).toMatchObject({ kind: 'tempAny', side: 'bottom', timing: 'turnStart' });
    expect(handShrinkRule(ok, 'bottom')).toEqual({ kind: 'handShrink', side: 'bottom', floor: 3 });
    expect(handShrinkRule(ok, 'top')).toBeUndefined();

    throwsWith({ objectives: [{ kind: 'exitEdge', side: 'bottom', row: 3 as 0 }] }, 'exitEdge row must be 0 or 8');
    throwsWith({ objectives: [{ kind: 'tempAny', side: 'top', hexes: [[4, 2]] }] }, 'tempAny objective needs at least 2 hexes');
    throwsWith({ objectives: [{ kind: 'majority', side: 'top', hexes: [[4, 2]] }] }, 'majority objective needs at least 2 hexes');
    throwsWith({ sideRules: [{ kind: 'handShrink', side: 'bottom', floor: 0 }] }, 'handShrink floor must be 1..cards');
    throwsWith({ sideRules: [{ kind: 'handShrink', side: 'bottom', floor: 6 }] }, 'handShrink floor must be 1..cards');
    throwsWith({ sideRules: [{ kind: 'squareCap', side: 'bottom', units: 0 }] }, 'squareCap units must be 1..4');
    throwsWith({ sideRules: [{ kind: 'cavalryChargeFolly', side: 'left' as 'top' }] }, 'side rule with unknown side');
    throwsWith({ sideRules: [{ kind: 'guerrilla', side: 'top', counters: 7 }] }, 'guerrilla counters must be 0..6');
    throwsWith({ sideRules: [{ kind: 'guerrilla', side: 'top', counters: -1 }] }, 'guerrilla counters must be 0..6');
    throwsWith({ sideRules: [{ kind: 'guerrilla', side: 'top', counters: 1.5 }] }, 'guerrilla counters must be 0..6');
    throwsWith({ sideRules: [{ kind: 'guerrilla', side: 'top', counters: 1 }, { kind: 'guerrilla', side: 'bottom', counters: 1 }] }, 'two guerrilla rules');
    throwsWith({ moveFirst: 'yes' as 'reveal' }, "moveFirst must be 'reveal'");
  });

  it('moveFirst sets special.moveFirst with no picks; without it special.moveFirst is null', () => {
    const s = build({ moveFirst: 'reveal', first: 'top' });
    expect(s.scenario.moveFirst).toBe(true);
    expect(s.special.moveFirst).toEqual({ done: false, picks: { top: null, bottom: null }, committed: { top: null, bottom: null } });
    expect(s.first).toBe('top');
    const n = build({});
    expect(n.scenario.moveFirst).toBe(false);
    expect(n.special.moveFirst).toBeNull();
  });

  it('handSize starts at the hand size; squared lists the units that start in square', () => {
    const s = build({
      topCards: 4, bottomCards: 6,
      units: [{ side: 'top', key: 'FR/LN', at: [2, 2] }, { side: 'bottom', key: 'BR/LN', at: [6, 2], square: 2 }, { side: 'bottom', key: 'BR/LN', at: [6, 4] }],
    });
    expect(s.special.handSize).toEqual({ top: 4, bottom: 6 });
    expect(s.special.squared).toEqual({ top: [], bottom: ['u2'] });
    expect(newTurn(1).guerrilla).toBe('none');
    expect(s.turn.guerrilla).toBe('none');
  });

  it('the hand-size invariant reads special.handSize (a shrinking hand, S33)', () => {
    const s = build({});
    expect(violations(s, true)).toEqual([]);
    s.special.handSize.bottom = 4;
    expect(violations(s, true)).toEqual(['bottom holds 5 cards']);
    s.discard.push(s.players.bottom.hand.pop()!);
    expect(violations(s, true)).toEqual([]);
  });
});

describe('square bookkeeping (RR §15.7, S34, S38)', () => {
  const squarePos: Pos = { cards: 4, units: [{ side: 'bottom', key: 'BR/LN', at: [6, 2] }, { side: 'bottom', key: 'BR/LN', at: [6, 4] }] };

  it('formSquare records the unit once and never takes the committed card', () => {
    let tookCommittedLater = false;
    for (let seed = 0; seed < 50; seed++) {
      const s = build({ ...squarePos, moveFirst: 'reveal' }, seed);
      const hand = [...s.players.bottom.hand];
      expect(hand).toHaveLength(4);
      const b = hand[1];
      s.special.moveFirst!.committed.bottom = b;
      const u = s.units[0];
      formSquare(s, quiet, u);
      expect(s.players.bottom.squareTrack[0], `seed ${seed}`).not.toBe(b);
      expect(s.players.bottom.hand).toContain(b);
      // after the side's first turn the record no longer binds
      const t = build({ ...squarePos, moveFirst: 'reveal' }, seed);
      t.special.moveFirst!.committed.bottom = t.players.bottom.hand[1];
      t.special.turnsDone.bottom = 1;
      formSquare(t, quiet, t.units[0]);
      if (t.players.bottom.squareTrack[0] === t.special.moveFirst!.committed.bottom) tookCommittedLater = true;
    }
    expect(tookCommittedLater).toBe(true);

    const s = build(squarePos);
    const u = s.units[0];
    formSquare(s, quiet, u);
    expect(s.special.squared.bottom).toEqual(['u1']);
    // leave the square by hand (the card back to the hand), then form it again
    s.players.bottom.hand.push(s.players.bottom.squareTrack[0]!);
    s.players.bottom.squareTrack[0] = null;
    delete u.square;
    formSquare(s, quiet, u);
    expect(s.special.squared.bottom).toEqual(['u1']);
    formSquare(s, quiet, s.units[1]);
    expect(s.special.squared.bottom).toEqual(['u1', 'u2']);
  });

  it('formSquare without Move First draws exactly as before (one random index over the whole hand)', () => {
    const a = build(squarePos, 77);
    const b = build({ ...squarePos, moveFirst: 'reveal' }, 77);
    formSquare(a, quiet, a.units[0]);
    formSquare(b, quiet, b.units[0]);
    expect(b.players.bottom.squareTrack).toEqual(a.players.bottom.squareTrack);
    expect([b.rng, b.rngCalls]).toEqual([a.rng, a.rngCalls]);
  });

  it('squareCapReached and follyActive read their rules', () => {
    const units: Pos['units'] = [1, 2, 3].map((c) => ({ side: 'top' as const, key: 'FR/LN' as const, at: [2, c * 2] as [number, number] }));
    const s = build({ units, sideRules: [{ kind: 'squareCap', side: 'top', units: 2 }] });
    const [u1, u2, u3] = s.units;
    expect(squareCapReached(s, u3)).toBe(false);
    s.special.squared.top = ['u1'];
    expect(squareCapReached(s, u3)).toBe(false);
    s.special.squared.top = ['u1', 'u2'];
    expect(squareCapReached(s, u3)).toBe(true);
    expect(squareCapReached(s, u1)).toBe(false);
    expect(squareCapReached(s, u2)).toBe(false);
    const free = build({ units });
    free.special.squared.top = ['u1', 'u2', 'u3'];
    expect(squareCapReached(free, free.units[2])).toBe(false);

    const f = build({ first: 'bottom', sideRules: [{ kind: 'cavalryChargeFolly', side: 'top' }] });
    f.turn.effective = 'cavalryCharge';
    expect(follyActive(f, 'top')).toBe(true);
    expect(follyActive(f, 'bottom')).toBe(false);
    f.turn.guerrilla = 'stood';
    expect(follyActive(f, 'top')).toBe(true);
    f.turn.guerrilla = 'cancelled';
    expect(follyActive(f, 'top')).toBe(false);
    f.turn.guerrilla = 'none';
    f.turn.effective = 'attackC';
    expect(follyActive(f, 'top')).toBe(false);
    f.turn.effective = 'cavalryCharge';
    f.active = 'top';
    expect(follyActive(f, 'top')).toBe(false);
    const g = build({ first: 'bottom' });
    g.turn.effective = 'cavalryCharge';
    expect(follyActive(g, 'top')).toBe(false);
  });

  it('cloneState copies squared, handSize, moveFirst and holders', () => {
    const s = build({
      moveFirst: 'reveal',
      units: [{ side: 'top', key: 'FR/LN', at: [4, 2] }],
      objectives: [{ kind: 'tempAny', side: 'top', hexes: [[4, 2], [4, 3]] }],
    });
    s.special.squared.top = ['u1'];
    s.special.objState[0].holders = ['u1'];
    const c = cloneState(s);
    expect(c.special).toEqual(s.special);
    c.special.squared.top.push('u9');
    c.special.squared.bottom.push('u8');
    c.special.handSize.top = 1;
    c.special.moveFirst!.done = true;
    c.special.moveFirst!.picks.top = 3;
    c.special.moveFirst!.committed.bottom = 4;
    c.special.objState[0].holders!.push('u7');
    c.turn.guerrilla = 'cancelled';
    expect(s.special.squared).toEqual({ top: ['u1'], bottom: [] });
    expect(s.special.handSize).toEqual({ top: 5, bottom: 5 });
    expect(s.special.moveFirst).toEqual({ done: false, picks: { top: null, bottom: null }, committed: { top: null, bottom: null } });
    expect(s.special.objState[0].holders).toEqual(['u1']);
    expect(s.turn.guerrilla).toBe('none');
    // a state without Move First or holders clones to the same shape
    const n = build({ objectives: [{ kind: 'tempAny', side: 'top', hexes: [[4, 2], [4, 3]] }] });
    const nc = cloneState(n);
    expect(nc.special.moveFirst).toBeNull();
    expect('holders' in nc.special.objState[0]).toBe(false);
  });
});

describe('the two new decisions (RR §15.5, S38, S45)', () => {
  it('answerError and randomAnswer cover guerrilla and moveFirst', () => {
    const s: GameState = build({ sideRules: [{ kind: 'guerrilla', side: 'top', counters: 1 }], moveFirst: 'reveal' });
    const g: Decision = { kind: 'guerrilla', side: 'top', mode: 'spend', card: 'attackC', held: 1, pool: 5 };
    expect(answerError(s, g, { kind: 'yesno', yes: true })).toBeNull();
    expect(answerError(s, g, { kind: 'yesno', yes: false })).toBeNull();
    const refusedG: Answer[] = [{ kind: 'endMove' }, { kind: 'playCard', card: s.players.top.hand[0] }, { kind: 'choose', index: 0 }];
    for (const a of refusedG) expect(answerError(s, g, a), JSON.stringify(a)).toEqual(expect.any(String));
    expect(answerError(s, g, null)).toEqual(expect.any(String));
    const scout: Decision = { kind: 'guerrilla', side: 'top', mode: 'scout', card: null, held: 1, pool: 5 };
    expect(answerError(s, scout, { kind: 'yesno', yes: true })).toBeNull();

    const hand = s.players.bottom.hand;
    const m: Decision = { kind: 'moveFirst', side: 'bottom', options: [hand[0], hand[1]] };
    expect(answerError(s, m, { kind: 'playCard', card: hand[0] })).toBeNull();
    expect(answerError(s, m, { kind: 'playCard', card: hand[1] })).toBeNull();
    const outside = CARD_LIST.findIndex((_, i) => i !== hand[0] && i !== hand[1]);
    const refusedM: Answer[] = [{ kind: 'playCard', card: hand[2] }, { kind: 'playCard', card: outside }, { kind: 'yesno', yes: true }, { kind: 'endMove' }];
    for (const a of refusedM) expect(answerError(s, m, a), JSON.stringify(a)).toEqual(expect.any(String));

    const rnd = lcg(11);
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      for (const d of [g, scout, m]) {
        const a = randomAnswer(s, d, rnd);
        expect(answerError(s, d, a), JSON.stringify(a)).toBeNull();
        seen.add(JSON.stringify(a));
      }
    }
    expect(seen).toContain(JSON.stringify({ kind: 'yesno', yes: true }));
    expect(seen).toContain(JSON.stringify({ kind: 'yesno', yes: false }));
    expect(seen).toContain(JSON.stringify({ kind: 'playCard', card: hand[0] }));
    expect(seen).toContain(JSON.stringify({ kind: 'playCard', card: hand[1] }));
    // a side with no eligible card is never asked (S43): a moveFirst without options is a flow error
    expect(() => randomAnswer(s, { kind: 'moveFirst', side: 'bottom', options: [] }, rnd)).toThrow(/moveFirst with no options/);
  });
});

describe('the scenario loader (RR §15.8)', () => {
  it('the loader keeps moveFirst', () => {
    const json = (extra: Partial<ScenarioJson>): ScenarioJson => ({ ...setupOf({}), year: '1813', ...extra });
    expect(scenarioFromJson(json({ moveFirst: 'reveal' })).setup.moveFirst).toBe('reveal');
    expect('moveFirst' in scenarioFromJson(json({})).setup).toBe(false);
  });
});
