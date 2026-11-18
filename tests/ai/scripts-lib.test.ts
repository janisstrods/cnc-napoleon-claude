// The scripts' shared helpers (scripts/lib.ts): level and scenario arguments, the Wilson interval, the behaviour counters of
// ai-balance and the markdown report of ai-balance-report.
import { afterEach, describe, expect, it } from 'vitest';
import { OFF_BOARD, bannerTotal, createGame, type DefendChoice, type GameEvent, type Side } from '../../src/engine';
import { SCENARIOS, scenarioById } from '../../src/scenarios';
import {
  type GameRow, balanceReport, countDecision, countEvents, countTurnStart, levelArg, parseLevel, scenarioList, snapshotUnits, wilson, zeroCounters,
} from '../../scripts/lib';
import { build } from '../rules/helpers';

const argv = process.argv;
afterEach(() => { process.argv = argv; });

describe('levelArg', () => {
  it('reads names and numbers, and falls back on the default', () => {
    expect(parseLevel('captain')).toBe('captain');
    expect(parseLevel('colonel')).toBe('colonel');
    expect(parseLevel('marshal')).toBe('marshal');
    expect(parseLevel('0')).toBe('captain');
    expect(parseLevel('1')).toBe('colonel');
    expect(parseLevel('2')).toBe('marshal');
    process.argv = ['node', 'x', '--', '--a', '2'];
    expect(levelArg('a', 'colonel')).toBe('marshal');
    expect(levelArg('b', 'captain')).toBe('captain');
  });

  it('refuses anything else (the old Ancients names included)', () => {
    for (const bad of ['3', '-1', '1.5', 'tribune', 'general', '']) expect(() => parseLevel(bad), bad).toThrow(/level/);
  });
});

describe('scenarioList', () => {
  it('accepts the Spanish battles and refuses unknown ones', () => {
    expect(scenarioList('001,101,118')).toEqual(['001', '101', '118']);
    expect(() => scenarioList('001,999')).toThrow(/999/);
  });
});

describe('wilson', () => {
  it('gives the 95 % interval of a win rate', () => {
    const [lo, hi] = wilson(5, 10);
    expect(lo).toBeCloseTo(0.2366, 3);
    expect(hi).toBeCloseTo(0.7634, 3);
    expect(wilson(0, 0)).toEqual([0, 1]);
    const [l10, h10] = wilson(10, 10);
    expect(l10).toBeCloseTo(0.7225, 3);
    expect(h10).toBe(1);
    expect(wilson(0, 10)[0]).toBe(0);
  });
});

describe('behaviour counters', () => {
  // u1 bottom gun at (7,6), u2 top line at (5,6): two hexes apart
  const kit = (extra: { blocks?: number; targetBlocks?: number } = {}) => {
    const s = build({ units: [
      { side: 'bottom', key: 'BR/FA', at: [7, 6] }, { side: 'top', key: 'FR/LN', at: [5, 6], ...(extra.targetBlocks ? { blocks: extra.targetBlocks } : {}) },
      { side: 'bottom', key: 'BR/LN', at: [6, 6], ...(extra.blocks ? { blocks: extra.blocks } : {}) }, { side: 'top', key: 'FR/LC', at: [1, 6] },
    ], leaders: [{ side: 'top', at: [1, 7] }] });
    return s;
  };
  const events = (s: ReturnType<typeof kit>, es: GameEvent[]) => {
    const c = zeroCounters();
    countEvents(c, s, snapshotUnits(s), es);
    return c;
  };

  it('counts the reactions offered and taken from the decision and its answer', () => {
    const s = kit();
    const defend = (options: DefendChoice[]) => ({ kind: 'defend' as const, side: 'top' as Side, attacker: 'u1', target: 'u2', options, bonus: false, artillery: [] });
    const c = zeroCounters();
    countDecision(c, s, defend(['stand', 'formSquare', 'retireReform']), { kind: 'defend', choice: 'formSquare' });
    countDecision(c, s, defend(['stand', 'retireReform']), { kind: 'defend', choice: 'retireReform' });
    countDecision(c, s, defend(['stand', 'firstStrike']), { kind: 'defend', choice: 'stand' });
    countDecision(c, s, defend(['stand', 'formSquare', 'firstStrike']), { kind: 'defend', choice: 'firstStrike' });
    expect(c).toMatchObject({ squareOffers: 2, squaresFormed: 1, rrOffers: 2, rrUsed: 1, fsOffers: 2, fsPlayed: 1 });
    // other decisions count nothing
    const d = zeroCounters();
    countDecision(d, s, { kind: 'playCard', side: 'top' }, { kind: 'playCard', card: 0 });
    expect(d).toEqual(zeroCounters());
  });

  it('counts Combined Arms combats and gun shots by range', () => {
    const s = kit();
    const c = events(s, [
      { t: 'combat', purpose: 'melee', attacker: 'u3', target: 'u2', dice: 3, artillery: [{ id: 'u1', dice: 2 }] },
      { t: 'combat', purpose: 'melee', attacker: 'u3', target: 'u2', dice: 3 },
      { t: 'combat', purpose: 'melee', attacker: 'u3', target: 'u2', dice: 3, artillery: [] },
      { t: 'combat', purpose: 'fire', attacker: 'u1', target: 'u2', dice: 3 },
      { t: 'combat', purpose: 'fire', attacker: 'u3', target: 'u2', dice: 2 },    // a musket, not a gun
    ]);
    expect(c.combinedArms).toBe(1);
    expect(c.gunShotsByRange).toEqual([0, 1, 0, 0, 0]);
  });

  it('counts worn infantry declaring melee on full-strength infantry', () => {
    // u3 BR/LN at 2 blocks attacks u2 FR/LN at full strength
    expect(events(kit({ blocks: 2 }), [{ t: 'combat', purpose: 'melee', attacker: 'u3', target: 'u2', dice: 2 }]).wornAttacks).toBe(1);
    expect(events(kit({ blocks: 1 }), [{ t: 'combat', purpose: 'melee', attacker: 'u3', target: 'u2', dice: 1 }]).wornAttacks).toBe(1);
    expect(events(kit({ blocks: 3 }), [{ t: 'combat', purpose: 'melee', attacker: 'u3', target: 'u2', dice: 3 }]).wornAttacks).toBe(0);
    expect(events(kit({ blocks: 2, targetBlocks: 3 }), [{ t: 'combat', purpose: 'melee', attacker: 'u3', target: 'u2', dice: 2 }]).wornAttacks).toBe(0);
    expect(events(kit({ blocks: 2 }), [{ t: 'combat', purpose: 'melee', attacker: 'u3', target: 'u4', dice: 2 }]).wornAttacks).toBe(0);   // against cavalry
    expect(events(kit({ blocks: 2 }), [{ t: 'combat', purpose: 'fire', attacker: 'u3', target: 'u2', dice: 2 }]).wornAttacks).toBe(0);     // not a melee
  });

  it('counts leaders lost and units exiting the board', () => {
    const s = kit();
    const c = events(s, [
      { t: 'leaderKilled', id: 'L1' }, { t: 'move', id: 'u3', path: [53, OFF_BOARD] }, { t: 'move', id: 'u3', path: [53, 40] },
    ]);
    expect(c.leadersLost).toBe(1);
    expect(c.exits).toBe(1);
  });

  it('counts the turns that start with a held objective', () => {
    const sc = SCENARIOS.find((x) => (x.setup.objectives ?? []).some((o) => o.kind === 'tempHex' || o.kind === 'tempGroup'))!;
    expect(sc).toBeDefined();
    const s = createGame(sc.setup, 3);
    const c = zeroCounters();
    countTurnStart(c, s, { kind: 'playCard', side: s.active });
    expect(c.heldTurns).toBe(0);
    const i = s.scenario.objectives.findIndex((o) => o.side === s.active && (o.kind === 'tempHex' || o.kind === 'tempGroup'));
    if (i >= 0) {
      s.special.objState[i].held = true;
      expect(bannerTotal(s, s.active)).toBeGreaterThan(s.players[s.active].banners);
      countTurnStart(c, s, { kind: 'playCard', side: s.active });
      expect(c.heldTurns).toBe(1);
    }
    countTurnStart(c, s, { kind: 'orders', side: s.active, card: 'attackC', mirrored: false, single: false });
    expect(c.heldTurns).toBeLessThanOrEqual(1);
  });
});

const row = (over: Partial<GameRow> = {}): GameRow => ({
  sc: '001', aSide: 'bottom', seed: 1, winner: 'bottom', banners: [5, 3], turns: 20, reason: 'x', a: 'colonel', b: 'colonel',
  rejects: 0, fallbacks: 0, nodes: 100, timing: { A: { avg: 1, max: 2 }, B: { avg: 1, max: 2 } }, c: zeroCounters(), ...over,
});

describe('balanceReport', () => {
  it('prints one row per battle with the wins, the Wilson interval, banners, turns and the flag', () => {
    const rows = [row(), row({ seed: 2, aSide: 'top', winner: 'bottom', banners: [6, 2], turns: 30 }), row({ sc: '101', winner: 'top', banners: [1, 6], turns: 10 })];
    const md = balanceReport(rows, 0.85);
    const lines = md.split('\n');
    const b001 = lines.find((l) => l.startsWith('| 001'))!;
    expect(b001).toContain('| 2 |');                      // games
    expect(b001).toContain(`2 (${scenarioById('001').setup.bottom.army})`);                  // bottom wins with the army
    expect(b001).toContain(`0 (${scenarioById('001').setup.top.army})`);
    expect(b001).toContain('100 % [34 %, 100 %]');         // 2 of 2: bottom win rate and its interval
    expect(b001).toContain('5.5-2.5');                     // banners, bottom-top, average
    expect(b001).toContain('25, 30');                      // turns avg, max
    expect(b001).toContain('bottom 100 %');                // flagged at 0.85
    const b101 = lines.find((l) => l.startsWith('| 101'))!;
    expect(b101).toContain('0 % [0 %, 79 %]');
    expect(b101).toContain('top 100 %');
    expect(lines.filter((l) => /^\| \d{3}/.test(l)).length).toBe(2);   // only battles that were played
  });

  it('does not flag a balanced battle and totals the counters', () => {
    const c1 = { ...zeroCounters(), squareOffers: 2, gunShotsByRange: [1, 2, 0, 0, 0] };
    const c2 = { ...zeroCounters(), squareOffers: 3, squaresFormed: 1, gunShotsByRange: [0, 1, 1, 0, 0] };
    const md = balanceReport([row({ c: c1 }), row({ aSide: 'top', winner: 'top', c: c2 })], 0.85);
    const b = md.split('\n').find((l) => l.startsWith('| 001'))!;
    expect(b).not.toMatch(/(bottom|top) \d+ %\s*\|\s*$/);
    expect(md).toContain('squareOffers 5');
    expect(md).toContain('squaresFormed 1');
    expect(md).toContain('gunShotsByRange 1/3/1/0/0');
    expect(md).toMatch(/Games 2/);
    expect(md).toContain('rejects 0');
  });

  it('tells a win by A from a win by B when the levels differ', () => {
    const md = balanceReport([row({ a: 'marshal', b: 'colonel', winner: 'bottom' }), row({ a: 'marshal', b: 'colonel', aSide: 'top', winner: 'bottom' })], 0.85);
    expect(md).toContain('A (marshal) won 1 of 2');
  });
});
