// The player's battle record (Triumphs): results per battle, side and opponent level, the medals they earn, the totals,
// storage, export and import, and the controller recording a finished battle once.
import { describe, expect, it, vi } from 'vitest';
import { GameDriver, other, randomAnswer, type Side } from '../../src/engine';
import { GameController, initialState, newSessionConfig } from '../../src/ui/game/controller';
import {
  addResult, beatenLevels, exportRecord, importRecord, loadRecord, mergeRecords, outcomeFor, parseRecord, recordFinished,
  recordTotals, saveRecord, sideStanding, sideTally, type BattleRecord,
} from '../../src/ui/record';
import { mulberry32 } from '../support/rng';
import { stubStorage, useStubStorageCleanup } from '../support/storage';
import { SeededOpponent, useFakeClock } from './controller-helpers';

useStubStorageCleanup();

describe('battle record', () => {
  it('counts results per battle, side and level, without changing the record it was given', () => {
    const empty: BattleRecord = {};
    const one = addResult(empty, '001', 'bottom', 'colonel', 'won');
    const two = addResult(one, '001', 'bottom', 'colonel', 'lost');
    expect(empty).toEqual({});
    expect(one['001'].bottom!.colonel).toEqual({ won: 1, lost: 0, draw: 0 });
    expect(two['001'].bottom!.colonel).toEqual({ won: 1, lost: 1, draw: 0 });
    expect(two['001'].top).toBeUndefined();
    const three = addResult(addResult(two, '001', 'bottom', 'marshal', 'draw'), '001', 'top', 'captain', 'lost');
    expect(sideTally(three, '001', 'bottom')).toEqual({ won: 1, lost: 1, draw: 1 });
    expect(sideTally(three, '001', 'top')).toEqual({ won: 0, lost: 1, draw: 0 });
    expect(sideTally(three, '002', 'top')).toEqual({ won: 0, lost: 0, draw: 0 });
  });

  it('a side’s medal is the hardest level beaten from it', () => {
    let r: BattleRecord = {};
    expect(sideStanding(r, '007', 'top')).toBe('none');
    r = addResult(r, '007', 'top', 'marshal', 'lost');
    expect(sideStanding(r, '007', 'top')).toBe('fought');
    r = addResult(r, '007', 'top', 'captain', 'draw');
    expect(sideStanding(r, '007', 'top')).toBe('fought');
    r = addResult(r, '007', 'top', 'captain', 'won');
    expect(sideStanding(r, '007', 'top')).toBe('bronze');
    r = addResult(r, '007', 'top', 'marshal', 'won');
    expect(sideStanding(r, '007', 'top')).toBe('gold');
    r = addResult(r, '007', 'top', 'colonel', 'won');
    expect(sideStanding(r, '007', 'top')).toBe('gold');
    expect(beatenLevels(r, '007', 'top')).toEqual(['captain', 'colonel', 'marshal']);
    expect(sideStanding(r, '007', 'bottom')).toBe('none');
  });

  it('the outcome is the human’s', () => {
    expect(outcomeFor('top', 'top')).toBe('won');
    expect(outcomeFor('top', 'bottom')).toBe('lost');
    expect(outcomeFor('bottom', 'draw')).toBe('draw');
  });

  it('totals count each side once, by its best medal, and every battle fought from either side', () => {
    let r: BattleRecord = {};
    r = addResult(r, '001', 'bottom', 'captain', 'won');
    r = addResult(r, '001', 'bottom', 'marshal', 'won');
    r = addResult(r, '001', 'top', 'colonel', 'won');
    r = addResult(r, '002', 'top', 'colonel', 'lost');
    r = addResult(r, '101', 'top', 'captain', 'won');
    // the record is plain data keyed by battle id, so the ids need not be shipped battles
    const base = Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(3, '0'));
    expect(recordTotals(r, base)).toEqual({ gold: 1, silver: 1, bronze: 0, fought: 2, battles: 15, sides: 30 });
    expect(recordTotals(r, [...base, '101'])).toEqual({
      gold: 1, silver: 1, bronze: 1, fought: 3, battles: 16, sides: 32,
    });
  });

  it('merging takes the larger count of each, so merging the same record again changes nothing', () => {
    let a: BattleRecord = {};
    a = addResult(a, '001', 'bottom', 'captain', 'won');
    a = addResult(a, '001', 'bottom', 'captain', 'won');
    let b: BattleRecord = {};
    b = addResult(b, '001', 'bottom', 'captain', 'lost');
    b = addResult(b, '001', 'bottom', 'captain', 'won');
    b = addResult(b, '205', 'top', 'marshal', 'won');
    const m = mergeRecords(a, b);
    expect(m['001'].bottom!.captain).toEqual({ won: 2, lost: 1, draw: 0 });
    expect(m['205'].top!.marshal).toEqual({ won: 1, lost: 0, draw: 0 });
    expect(mergeRecords(m, b)).toEqual(m);
    expect(mergeRecords(m, a)).toEqual(m);
  });

  it('parsing keeps what is well formed and drops the rest', () => {
    expect(parseRecord(null)).toBeNull();
    expect(parseRecord('x')).toBeNull();
    expect(parseRecord([])).toBeNull();
    const r = parseRecord({
      '001': { bottom: { colonel: { won: 2, lost: 1.5, draw: -3 }, emperor: { won: 9 } }, middle: { captain: { won: 1 } } },
      '999': { top: { marshal: { won: 1 } } },
      abc: { top: { marshal: { won: 1 } } },
      '002': 'nonsense',
      '003': { top: { captain: { won: 0, lost: 0, draw: 0 } } },
    });
    expect(r).toEqual({
      '001': { bottom: { colonel: { won: 2, lost: 0, draw: 0 } } },
      '999': { top: { marshal: { won: 1, lost: 0, draw: 0 } } },
    });
  });

  it('is kept in storage, and is empty without it', () => {
    expect(loadRecord()).toEqual({}); // no localStorage at all
    saveRecord(addResult({}, '001', 'top', 'marshal', 'won')); // dropped
    const m = stubStorage();
    expect(loadRecord()).toEqual({});
    const r = addResult({}, '108', 'bottom', 'colonel', 'won');
    saveRecord(r);
    expect(JSON.parse(m.get('ccn-record-v1')!)).toEqual({ version: 1, battles: r });
    expect(loadRecord()).toEqual(r);
    m.set('ccn-record-v1', '{not json');
    expect(loadRecord()).toEqual({});
    m.set('ccn-record-v1', JSON.stringify({ version: 2, battles: r }));
    expect(loadRecord()).toEqual({});
  });

  it('recording a finished battle reports a medal only when it improves the side’s', () => {
    stubStorage();
    expect(recordFinished('015', 'top', 'colonel', 'lost')).toBeNull();
    expect(recordFinished('015', 'top', 'colonel', 'won')).toBe('silver');
    expect(recordFinished('015', 'top', 'colonel', 'won')).toBeNull();
    expect(recordFinished('015', 'top', 'captain', 'won')).toBeNull();
    expect(recordFinished('015', 'top', 'marshal', 'draw')).toBeNull();
    expect(recordFinished('015', 'top', 'marshal', 'won')).toBe('gold');
    expect(recordFinished('015', 'bottom', 'captain', 'won')).toBe('bronze');
    expect(sideTally(loadRecord(), '015', 'top')).toEqual({ won: 4, lost: 1, draw: 1 });
  });

  it('exports to a dated file and imports it back; other files are refused', () => {
    const r = addResult(addResult({}, '301', 'top', 'marshal', 'won'), '012', 'bottom', 'captain', 'lost');
    const file = exportRecord(r, new Date(2026, 9, 11, 12));
    expect(file.name).toBe('ccn-triumphs-2026-10-11.json');
    const parsed = JSON.parse(file.text);
    expect(parsed.game).toBe('ccn-triumphs');
    expect(parsed.version).toBe(1);
    expect(importRecord(file.text)).toEqual(r);
    expect(importRecord('{"version":1,"battles":{}}')).toBeNull();
    expect(importRecord(JSON.stringify({ version: 1, engine: 2, config: {}, answers: [] }))).toBeNull();
    expect(importRecord('not json')).toBeNull();
    expect(importRecord(JSON.stringify({ game: 'ccn-triumphs', version: 1, battles: {} }))).toEqual({});
  });
});

describe('recording a battle when it ends', () => {
  useFakeClock();

  /** The answers of a battle played to the end by random legal moves on both sides, and its winner. */
  function finishedGame(scenarioId: string, seed: number) {
    const cfg = newSessionConfig(scenarioId, 'bottom', 'marshal');
    cfg.seed = seed;
    const d = new GameDriver(initialState(cfg));
    const rnd = mulberry32(seed);
    for (let i = 0; !d.over && i < 20000; i++) d.answer(randomAnswer(d.state, d.pending!, rnd));
    expect(d.over).toBe(true);
    expect(d.state.winner).not.toBe('draw');
    return { seed, answers: d.answers, winner: d.state.winner as Side };
  }

  /** A controller resuming that battle from its last answer, with the human on `side`, run until it shows the end. */
  async function replayEnd(game: ReturnType<typeof finishedGame>, side: Side) {
    const cfg = newSessionConfig('000', side, 'marshal');
    cfg.seed = game.seed;
    const c = new GameController(cfg, new SeededOpponent(), game.answers);
    for (let i = 0; i < 400 && !c.view.over; i++) {
      c.hurry();
      await vi.advanceTimersByTimeAsync(50);
    }
    expect(c.view.over?.winner).toBe(game.winner);
    return c;
  }

  it('records a won battle once, with its new medal', async () => {
    const storage = stubStorage();
    const game = finishedGame('000', 12);
    const c = await replayEnd(game, game.winner);
    expect(sideTally(loadRecord(), '000', game.winner)).toEqual({ won: 1, lost: 0, draw: 0 });
    expect(c.view.over?.newMedal).toBe('gold');
    // the loop running again after the end records nothing more, and keeps the medal shown
    (c as unknown as { run(): void }).run();
    await vi.advanceTimersByTimeAsync(500);
    expect(sideTally(loadRecord(), '000', game.winner)).toEqual({ won: 1, lost: 0, draw: 0 });
    expect(c.view.over?.newMedal).toBe('gold');
    c.dispose();
    expect(storage.has('ccn-autosave-v1')).toBe(false);
  });

  it('records a lost battle, with no medal', async () => {
    stubStorage();
    const game = finishedGame('000', 12);
    const loser = other(game.winner);
    const c = await replayEnd(game, loser);
    expect(sideTally(loadRecord(), '000', loser)).toEqual({ won: 0, lost: 1, draw: 0 });
    expect(sideStanding(loadRecord(), '000', loser)).toBe('fought');
    expect(c.view.over?.newMedal).toBeUndefined();
    c.dispose();
  });
});
