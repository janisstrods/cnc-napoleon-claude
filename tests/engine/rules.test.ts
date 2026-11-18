import { beforeEach, describe, expect, it } from 'vitest';
import { GameDriver, answerError, cloneState, createGame, distance, forceDice, neighbours, randomAnswer, rearHexes, retreatOptions, sectionsOf, type Answer, type Decision } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { mulberry32 } from '../support/rng';
import { duel } from '../rules/helpers';
import { H, drive, dropFirstStrike, must, replaceFirstCard, state } from './helpers';

beforeEach(() => forceDice([]));

describe('hex grid', () => {
  it('neighbours and distance', () => {
    expect(neighbours(H(0, 0)).sort()).toEqual([H(0, 1), H(1, 0)].sort());
    expect(neighbours(H(4, 6))).toHaveLength(6);
    expect(neighbours(H(1, 11))).toHaveLength(5);
    expect(distance(H(0, 0), H(0, 12))).toBe(12);
    expect(distance(H(0, 0), H(8, 0))).toBe(8);
    expect(distance(H(4, 4), H(3, 4))).toBe(1);
    expect(distance(H(4, 4), H(3, 3))).toBe(1);
    expect(distance(H(3, 3), H(4, 4))).toBe(1);
  });
  it('sections from each side, dotted-line hexes in two sections', () => {
    expect(sectionsOf(H(0, 4), 'bottom')).toEqual(['left', 'center']);
    expect(sectionsOf(H(1, 3), 'bottom')).toEqual(['left']);
    expect(sectionsOf(H(1, 4), 'bottom')).toEqual(['center']);
    expect(sectionsOf(H(2, 8), 'bottom')).toEqual(['center', 'right']);
    expect(sectionsOf(H(0, 0), 'top')).toEqual(['right']);
    expect(sectionsOf(H(0, 12), 'top')).toEqual(['left']);
  });
  it('rear hexes toward own side', () => {
    expect(rearHexes(H(4, 4), 'bottom').sort()).toEqual([H(5, 3), H(5, 4)].sort());
    expect(rearHexes(H(4, 4), 'top').sort()).toEqual([H(3, 3), H(3, 4)].sort());
    expect(rearHexes(H(8, 4), 'bottom')).toEqual([]);
    expect(rearHexes(H(4, 0), 'bottom')).toEqual([H(5, 0)]);
  });
});

describe('the skeleton', () => {
  it('plays the drill battle to a finish', () => {
    const d = new GameDriver(createGame(scenarioById('000').setup, 99));
    const rnd = mulberry32(5);
    for (let i = 0; i < 4000 && d.pending; i++) must(d, randomAnswer(d.state, d.pending, rnd));
    expect(d.state.winner === 'top' || d.state.winner === 'bottom').toBe(true);
  });
  it('melee: the attacker rolls its blocks, the surviving defender battles back', () => {
    const r = duel('BR/LN', 'FR/LN');
    expect(r.attack).toBe(4);
    expect(r.back).toBeGreaterThan(0); // exact battle-back dice are T2's and T6a's tests
  });
});

const TWO = { units: [{ side: 'bottom' as const, key: 'BR/LN' as const, at: [6, 4] as [number, number] }, { side: 'bottom' as const, key: 'BR/LN' as const, at: [6, 6] as [number, number] }, { side: 'top' as const, key: 'FR/LN' as const, at: [2, 4] as [number, number] }] };

describe('replay and undo', () => {
  it('replay reproduces the same state', () => {
    const d = new GameDriver(createGame(scenarioById('000').setup, 3));
    const rnd = mulberry32(8);
    for (let i = 0; i < 60 && d.pending; i++) must(d, randomAnswer(d.state, d.pending, rnd));
    const r = GameDriver.replay(d.initial, d.answers);
    expect(r.state).toEqual(d.state);
    expect(r.pending).toEqual(d.pending);
  });
  it('undo removes a move', () => {
    const s = state(TWO);
    const card = replaceFirstCard(s, 'bottom', 'probeC');
    const d = drive(s);
    must(d, { kind: 'playCard', card });
    must(d, { kind: 'orders', pieces: ['u1', 'u2'] });
    must(d, { kind: 'move', piece: 'u1', to: H(5, 4) });
    expect(d.canUndo()).toBe(true);
    const u = d.undo();
    expect(u.state.units[0].hex).toBe(H(6, 4));
    expect(u.pending!.kind).toBe('move');
  });
  it('cannot undo once the turn has passed to the other side', () => {
    const s = state(TWO);
    const card = replaceFirstCard(s, 'bottom', 'probeC');
    const d = drive(s);
    must(d, { kind: 'playCard', card });
    must(d, { kind: 'orders', pieces: ['u1'] });
    must(d, { kind: 'move', piece: 'u1', to: H(5, 4) });
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
    expect(d.canUndo()).toBe(false);
  });
  it('the card goes back with the orders it gave until a unit moves; the moves are taken back first', () => {
    const s = state(TWO);
    const card = replaceFirstCard(s, 'bottom', 'probeC');
    const d = drive(s);
    const before = cloneState(d.state);
    expect(d.undoStep()).toBeNull();
    must(d, { kind: 'playCard', card });
    must(d, { kind: 'orders', pieces: ['u1', 'u2'] });
    expect(d.pending).toMatchObject({ kind: 'move', side: 'bottom' });
    expect(d.undoStep()).toBe('card');
    const u = d.undo();
    expect(u.pending).toEqual({ kind: 'playCard', side: 'bottom' });
    expect(u.state).toEqual(before);
    expect(u.state.players.bottom.hand).toContain(card);
    must(d, { kind: 'move', piece: 'u1', to: H(5, 4) });
    expect(d.undoStep()).toBe('move');
    const back = d.undo();
    expect(back.state.units[0].hex).toBe(H(6, 4));
    expect(back.undoStep()).toBe('card');
    const none = back.undo();
    expect(none.pending).toEqual({ kind: 'playCard', side: 'bottom' });
    expect(none.state.turn.ordered).toEqual({});
  });
  it('a card is taken back while its units are being ordered', () => {
    const s = state(TWO);
    const card = replaceFirstCard(s, 'bottom', 'probeC');
    const d = drive(s);
    const before = cloneState(d.state);
    must(d, { kind: 'playCard', card });
    expect(d.pending).toMatchObject({ kind: 'orders', card: 'probeC' });
    expect(d.undoStep()).toBe('card');
    const u = d.undo();
    expect(u.pending).toEqual({ kind: 'playCard', side: 'bottom' });
    expect(u.state).toEqual(before);
  });
  it('a card is not taken back once movement has ended', () => {
    const s = state({ units: [{ side: 'bottom', key: 'BR/LN', at: [6, 4] }, { side: 'top', key: 'FR/LN', at: [5, 4] }] });
    dropFirstStrike(s);
    const card = replaceFirstCard(s, 'bottom', 'probeC');
    const d = drive(s);
    must(d, { kind: 'playCard', card });
    must(d, { kind: 'orders', pieces: ['u1'] });
    must(d, { kind: 'endMove' });
    expect(d.pending).toMatchObject({ kind: 'battle', side: 'bottom' });
    expect(d.undoStep()).toBeNull();
  });
});

describe('retreat paths', () => {
  it('a unit with a leader passes a lone friendly leader but may not end on him (R75)', () => {
    const s = state({
      units: [{ side: 'top', key: 'FR/LN', at: [4, 6] }],
      leaders: [{ side: 'top', at: [4, 6] }, { side: 'top', at: [3, 5] }, { side: 'top', at: [3, 6] }],
    });
    expect(retreatOptions(s, s.units[0], 1)).toEqual([{ path: [], end: H(4, 6), losses: 1, attach: null }]);
  });
});

describe('answer validation (answerError)', () => {
  it('refuses a malformed answer with the message the player sees', () => {
    const s = state(TWO);
    expect(answerError(s, { kind: 'playCard', side: 'bottom' }, { kind: 'move' } as unknown as Answer)).toBe('Play a card from your hand.');
    expect(answerError(s, { kind: 'playCard', side: 'bottom' }, null)).toBe('No answer.');
    const stay = { path: [], end: H(4, 2), losses: 1, attach: null };
    const retreat: Decision = { kind: 'retreat', side: 'bottom', unit: 'u1', options: [stay, stay], reason: 'retreat' };
    expect(answerError(s, retreat, { kind: 'choose', index: 1 })).toBeNull();
    expect([2, -1, 0.5].map((index) => answerError(s, retreat, { kind: 'choose', index }))).toEqual(Array(3).fill('Choose a destination.'));
    const defend: Decision = { kind: 'defend', side: 'top', attacker: 'u1', target: 'u3', options: ['stand'], bonus: false, artillery: [] };
    expect(answerError(s, defend, { kind: 'defend', choice: 'stand' })).toBeNull();
    expect(answerError(s, defend, { kind: 'defend', choice: 'firstStrike' })).not.toBeNull();
    const flags: Decision = { kind: 'ignoreFlags', side: 'top', unit: 'u3', flags: 2, max: 1 };
    expect([0, 1].map((count) => answerError(s, flags, { kind: 'ignoreFlags', count }))).toEqual([null, null]);
    expect([2, 0.5].map((count) => answerError(s, flags, { kind: 'ignoreFlags', count }))).toEqual(Array(2).fill('Ignore between 0 and 1 flags.'));
    const extra: Decision = { kind: 'breakthroughExtra', side: 'bottom', unit: 'u1', options: [H(3, 3)], required: true };
    expect(answerError(s, extra, { kind: 'hex', hex: null })).not.toBeNull();
    expect(answerError(s, { ...extra, required: false } as Decision, { kind: 'hex', hex: null })).toBeNull();
    const hexq: Decision = { kind: 'shortSupplyHex', side: 'top', unit: 'u3', options: [H(0, 4)] };
    expect(answerError(s, hexq, { kind: 'hex', hex: null })).not.toBeNull();
  });
});

describe('game state', () => {
  it('cloneState shares terrain, works and scenario and copies the track and the orders', () => {
    const s = createGame(scenarioById('000').setup, 1);
    s.turn.ordered.u1 = { id: 'u1', isLeader: false, startHex: 0, moved: 0, moveDone: false, battled: false, cardMods: true, stopEntered: false, noBattle: false, attachedThisTurn: false, bonusMeleeDone: false, stayInSquare: false };
    const c = cloneState(s);
    expect(c.terrain).toBe(s.terrain);
    expect(c.works).toBe(s.works);
    expect(c.scenario).toBe(s.scenario);
    expect(c.players.top.squareTrack).not.toBe(s.players.top.squareTrack);
    expect(c.players.top.squareTrack).toEqual(s.players.top.squareTrack);
    expect(c.turn.ordered).not.toBe(s.turn.ordered);
    expect(c.turn.ordered.u1).not.toBe(s.turn.ordered.u1);
    expect(c.turn.ordered).toEqual(s.turn.ordered);
  });
});
