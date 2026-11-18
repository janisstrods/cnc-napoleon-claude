// The scripts' shared helpers (scripts/lib.ts): level and scenario arguments, the Wilson interval, the behaviour counters of
// ai-balance and the markdown report of ai-balance-report.
import { afterEach, describe, expect, it } from 'vitest';
import { OFF_BOARD, bannerTotal, createGame, type DefendChoice, type GameEvent, type Side } from '../../src/engine';
import { SCENARIOS, scenarioById } from '../../src/scenarios';
import {
  type GameRow, balanceReport, countDecision, countEvents, countTurnStart, jobSeed, levelArg, mirrored, parseLevel, scenarioList, shardJobs, snapshotUnits, wilson, zeroCounters,
} from '../../scripts/lib';
import { H, build, toBattle } from '../rules/helpers';

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

  it('counts the Guerrilla spend and Scout questions and the yes answers', () => {
    const s = kit();
    const g = (mode: 'spend' | 'scout') => ({ kind: 'guerrilla' as const, side: 'top' as Side, mode, card: null, held: 1, pool: 2 });
    const c = zeroCounters();
    countDecision(c, s, g('spend'), { kind: 'yesno', yes: true });
    countDecision(c, s, g('spend'), { kind: 'yesno', yes: false });
    countDecision(c, s, g('scout'), { kind: 'yesno', yes: true });
    expect(c).toMatchObject({ guerrillaOffers: 2, guerrillaSpent: 1, scoutOffers: 1, scoutTaken: 1 });
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

  // a real battle decision: bottom u1 at (5,6) beside top u2 at (4,6)
  const atBattle = (u1: 'BR/LN' | 'BR/LC', blocks: number | undefined, targetKey: 'FR/LN' | 'FR/LC', targetBlocks?: number) => {
    const s = build({ units: [
      { side: 'bottom', key: u1, at: [5, 6], ...(blocks ? { blocks } : {}) }, { side: 'top', key: targetKey, at: [4, 6], ...(targetBlocks ? { blocks: targetBlocks } : {}) },
    ] });
    const d = toBattle(s, 'attackC', ['u1']);
    expect(d.pending?.kind).toBe('battle');
    return d;
  };
  const declare = (d: ReturnType<typeof atBattle>) => {
    const c = zeroCounters();
    countDecision(c, d.state, d.pending!, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    return c;
  };

  it('counts infantry melees and the worn ones from the battle decision', () => {
    expect(declare(atBattle('BR/LN', 2, 'FR/LN'))).toMatchObject({ infantryMelees: 1, wornAttacks: 1 });
    expect(declare(atBattle('BR/LN', 1, 'FR/LN'))).toMatchObject({ infantryMelees: 1, wornAttacks: 1 });
    expect(declare(atBattle('BR/LN', 3, 'FR/LN'))).toMatchObject({ infantryMelees: 1, wornAttacks: 0 });
    expect(declare(atBattle('BR/LN', 2, 'FR/LN', 3))).toMatchObject({ infantryMelees: 1, wornAttacks: 0 });   // target wounded
    expect(declare(atBattle('BR/LN', 2, 'FR/LC'))).toMatchObject({ infantryMelees: 1, wornAttacks: 0 });     // against cavalry
    expect(declare(atBattle('BR/LC', undefined, 'FR/LN'))).toMatchObject({ infantryMelees: 0, wornAttacks: 0 }); // a cavalry melee
  });

  it('does not count ending the battle, nor a musket shot at range', () => {
    const d = atBattle('BR/LN', 2, 'FR/LN');
    const c = zeroCounters();
    countDecision(c, d.state, d.pending!, { kind: 'endBattle' });
    const far = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [6, 6], blocks: 2 }, { side: 'top', key: 'FR/LN', at: [4, 6] }] });
    const df = toBattle(far, 'attackC', ['u1']);
    expect(df.pending?.kind).toBe('battle');
    countDecision(c, df.state, df.pending!, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(c.infantryMelees).toBe(0);
    expect(c.wornAttacks).toBe(0);
  });

  it('counts a bonus melee from its decision, and not a declined one', () => {
    const s = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [5, 6], blocks: 2 }, { side: 'top', key: 'FR/LN', at: [4, 6] }] });
    const dec = { kind: 'bonusMelee' as const, side: 'bottom' as Side, unit: 'u1', targets: [H(4, 6)] };
    const c = zeroCounters();
    countDecision(c, s, dec, { kind: 'hex', hex: H(4, 6) });
    expect(c).toMatchObject({ infantryMelees: 1, wornAttacks: 1 });
    const n = zeroCounters();
    countDecision(n, s, dec, { kind: 'hex', hex: null });
    expect(n.infantryMelees).toBe(0);
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
  rejects: 0, fallbacks: 0, sims: 100, timing: { A: { avg: 1, max: 2 }, B: { avg: 1, max: 2 } }, c: zeroCounters(), ...over,
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

  it('counts a draw or a turn-cap finish as neither side winning, and gives the win rate of A with its interval', () => {
    const md = balanceReport([row({ winner: 'draw' }), row({ aSide: 'top', winner: 'none' }), row({ seed: 3, winner: 'bottom' }), row({ seed: 4, aSide: 'top', winner: 'bottom' })], 0.85);
    expect(md).toContain('A (colonel) won 1 of 4 (25 %, 95 % Wilson [5 %, 70 %]), B won 1');
  });

  it('reports the worn-attack share of the infantry melees', () => {
    const md = balanceReport([row({ c: { ...zeroCounters(), infantryMelees: 20, wornAttacks: 3 } })], 0.85);
    expect(md).toContain('wornAttacks 3 of 20 infantry melees (15 %)');
  });

  it('drops a row repeated across files, with a warning', () => {
    const r = row();
    const md = balanceReport([r, { ...r }, row({ seed: 2, aSide: 'top' })], 0.85);
    expect(md).toContain('WARNING: 1 duplicate row');
    expect(md).toContain('Games 2;');
  });

  it('tells a win by A from a win by B when the levels differ', () => {
    const md = balanceReport([row({ a: 'marshal', b: 'colonel', winner: 'bottom' }), row({ a: 'marshal', b: 'colonel', aSide: 'top', winner: 'bottom' })], 0.85);
    expect(md).toContain('A (marshal) won 1 of 2 (50 %');
  });
});

describe('jobs and seeds', () => {
  it('a paired game has one game seed for both sides, distinct across game numbers and battles', () => {
    process.argv = ['node', 'x'];
    const jobs = shardJobs(['001', '002', '101'], 3);
    const seeds = new Map<string, Set<number>>();
    for (const j of jobs) seeds.set(`${j.sc}/${j.g}`, (seeds.get(`${j.sc}/${j.g}`) ?? new Set()).add(jobSeed(j, 0)));
    expect(seeds.size).toBe(9);
    for (const s of seeds.values()) expect(s.size).toBe(1);
    expect(new Set([...seeds.values()].map((s) => [...s][0])).size).toBe(9);
    expect(jobSeed({ sc: '001', aSide: 'top', g: 0 }, 0)).toBe(jobSeed({ sc: '001', aSide: 'bottom', g: 0 }, 0));
    expect(jobSeed({ sc: '001', g: 0, aSide: 'top' }, 5)).not.toBe(jobSeed({ sc: '001', g: 0, aSide: 'top' }, 0));
  });

  it('a mirrored pair (the same AI on both sides) plays its swapped game on a seed of its own', () => {
    const bottom = jobSeed({ sc: '001', aSide: 'bottom', g: 2 }, 0, true);
    const top = jobSeed({ sc: '001', aSide: 'top', g: 2 }, 0, true);
    expect(bottom).toBe(jobSeed({ sc: '001', aSide: 'bottom', g: 2 }, 0));
    expect(top).toBe(bottom + 7);
    // every seed of a mirrored set is distinct: 2 sides × games × battles (the Spanish ids included), up to game + offset 58 (P-1)
    process.argv = ['node', 'x'];
    const ids = ['001', '002', '015', '101', '118'];
    const jobs = shardJobs(ids, 59);
    const seeds = jobs.map((j) => jobSeed(j, 0, true));
    expect(new Set(seeds).size).toBe(2 * 59 * ids.length);
    // and none meets a seed of an unmirrored run on the same battles (a mirrored top game is 7 off its pair's bottom seed)
    const plain = new Set(jobs.map((j) => jobSeed(j, 0)));
    for (const j of jobs) if (j.aSide === 'top') expect(plain.has(jobSeed(j, 0, true))).toBe(false);
    // past game + offset 58 a mirrored seed reaches the next battle's block
    expect(jobSeed({ sc: '001', aSide: 'top', g: 59 }, 0, true)).toBeGreaterThanOrEqual(2000);
  });

  it('mirrored(): the same level and scale on both sides, never a random side (the ai-balance and ai-match call sites)', () => {
    expect(mirrored('colonel', 'colonel', 0.5, 0.5)).toBe(true);
    expect(mirrored('colonel', 'colonel', 0.35, 0.5)).toBe(false);
    expect(mirrored('marshal', 'colonel', 0.25, 0.25)).toBe(false);
    expect(mirrored('captain', 'random', 1, 1)).toBe(false);
  });

  it('every shard count keeps a pair together and covers each job once', () => {
    for (const n of [1, 2, 3, 4, 5]) {
      const all: string[] = [];
      for (let i = 0; i < n; i++) {
        process.argv = ['node', 'x', '--shard', `${i}/${n}`];
        const jobs = shardJobs(['001', '002', '003'], 2);
        const games = new Map<string, number>();
        for (const j of jobs) games.set(`${j.sc}/${j.g}`, (games.get(`${j.sc}/${j.g}`) ?? 0) + 1);
        for (const k of games.values()) expect(k, `${i}/${n}`).toBe(2);
        all.push(...jobs.map((j) => `${j.sc}/${j.g}/${j.aSide}`));
      }
      expect(all.length).toBe(12);
      expect(new Set(all).size).toBe(12);
    }
  });

  it('refuses a malformed --shard', () => {
    for (const bad of ['4/4', '-1/2', '1', 'a/b', '0/0', '1/2/3']) {
      process.argv = ['node', 'x', '--shard', bad];
      expect(() => shardJobs(['001'], 1), bad).toThrow(/shard/);
    }
  });
});
