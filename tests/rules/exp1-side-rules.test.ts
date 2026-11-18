// Rules: RR §15.8, §16.1, §16.6 (design/rules-reference.md); design/exp1-rulings.md S30, S33, S46
import { describe, expect, it } from 'vitest';
import { GameDriver, bannerTotal, createGame, forceDice, gainBanner, type FlowCtx, type GameEvent, type GameState, type Side } from '../../src/engine';
import { damage } from '../../src/engine/casualties';
import { SCENARIOS } from '../../src/scenarios';
import { H, build, duel, endTurn, ev, endMoves, must, n, passTurn, play, violations, type Pos } from './helpers';

const bot = (key: 'FR/SWI' | 'FR/LN' | 'BR/LN', at: [number, number], extra: object = {}) => ({ side: 'bottom' as const, key, at, ...extra });
const top = (key: 'FR/SWI' | 'FR/LN' | 'BR/LN', at: [number, number], extra: object = {}) => ({ side: 'top' as const, key, at, ...extra });

const BREAK: Pos['sideRules'] = [{ kind: 'breakOnLosses', side: 'bottom', keys: ['FR/SWI'], losses: 2 }];
const SHRINK: Pos['sideRules'] = [{ kind: 'handShrink', side: 'top', floor: 3 }];

/** A context that records events. */
function recorder(): { ctx: FlowCtx; events: GameEvent[] } {
  const events: GameEvent[] = [];
  return { ctx: { emit: (e) => events.push(e) }, events };
}

/** Four bottom FR/SWI (u1..u4) and one bottom FR/LN (u5) on row 8; one top unit far away (u6). */
function swissBattle(extra: Pos = {}): GameState {
  return build({
    sideRules: BREAK,
    units: [...[0, 1, 2, 3].map((c) => bot('FR/SWI', [8, c])), bot('FR/LN', [8, 8]), top('BR/LN', [0, 6])],
    ...extra,
  });
}

const ids = (s: GameState) => s.units.map((x) => x.id);
const removedEvents = (es: GameEvent[]) => es.filter((e) => e.t === 'removed');

describe('101: the Swiss break (S30)', () => {
  it('101: the second FR/SWI lost removes the others at once, for no banner (S30)', () => {
    const s = swissBattle();
    const { ctx, events } = recorder();
    damage(s, ctx, s.units[0], 5, 'test');
    expect(ids(s)).toEqual(['u2', 'u3', 'u4', 'u5', 'u6']); // one loss: nobody leaves
    expect(removedEvents(events)).toHaveLength(0);
    expect(s.players.top.banners).toBe(1);
    damage(s, ctx, s.units[0], 5, 'test');
    expect(ids(s)).toEqual(['u5', 'u6']);
    expect(s.players.top.banners).toBe(2); // two eliminations, not four
    expect(removedEvents(events)).toEqual([{ t: 'removed', id: 'u3', reason: 'broken' }, { t: 'removed', id: 'u4', reason: 'broken' }]);
    expect(events.filter((e) => e.t === 'eliminated')).toHaveLength(2);
    expect(events.filter((e) => e.t === 'banner')).toHaveLength(2);
    expect(events.filter((e) => e.t === 'leaderKilled' || e.t === 'leaderSafe')).toHaveLength(0);
    // the break is spent: other units are untouched and score as usual
    damage(s, ctx, s.units[0], 5, 'test');
    expect(ids(s)).toEqual(['u6']);
    expect(s.players.top.banners).toBe(3);
  });

  it('101: a removed unit in square returns its card; its attached leader stays alone (S30)', () => {
    const s = swissBattle({
      leaders: [{ side: 'bottom', at: [8, 3] }],
      units: [bot('FR/SWI', [8, 0]), bot('FR/SWI', [8, 1]), bot('FR/SWI', [8, 2]), bot('FR/SWI', [8, 3], { square: 1 }), top('BR/LN', [0, 6])],
    });
    const hand = s.players.bottom.hand.length;
    const card = s.players.bottom.squareTrack[0];
    expect(card).not.toBeNull();
    const { ctx, events } = recorder();
    damage(s, ctx, s.units[0], 5, 'test');
    damage(s, ctx, s.units[0], 5, 'test');
    expect(ids(s)).toEqual(['u5']);
    expect(events).toContainEqual({ t: 'squareLeft', id: 'u4', slot: 1 });
    expect(events).toContainEqual({ t: 'cardReturned', side: 'bottom', slot: 1 });
    expect(s.players.bottom.squareTrack[0]).toBeNull();
    expect(s.players.bottom.hand).toHaveLength(hand + 1);
    expect(s.players.bottom.hand).toContain(card);
    expect(s.leaders.map((l) => [l.side, l.hex])).toEqual([['bottom', H(8, 3)]]); // alone in the hex, not killed
    expect(removedEvents(events)).toHaveLength(2);
    expect(violations(s, true)).toEqual([]);
  });

  it('101: the second loss by a battle back on the enemy turn removes them mid-turn; the melee goes on cleanly', () => {
    // the Swiss side moves first. One FR/SWI is already lost; the 1-block u2 attacks and the battle back kills it.
    const { attack: ad, back: bd } = duel('FR/SWI', 'FR/LN');
    expect(ad).toBeGreaterThan(0);
    const s = build({
      sideRules: BREAK,
      units: [bot('FR/SWI', [8, 0]), bot('FR/SWI', [5, 6], { blocks: 1 }), bot('FR/SWI', [8, 2]), bot('FR/SWI', [8, 3]), top('FR/LN', [4, 6]), top('FR/LN', [0, 0])],
    });
    damage(s, { emit: () => undefined }, s.units[0], 5, 'earlier');
    const d = play(s, 'forward', ['u2', 'u3', 'u4']);
    endMoves(d);
    expect(d.pending?.kind).toBe('battle');
    ev(d);
    forceDice([...n('cavalry', ad!), ...n('infantry', bd!)]);
    must(d, { kind: 'attack', unit: 'u2', target: H(4, 6) });
    if (d.pending?.kind === 'defend') must(d, { kind: 'defend', choice: 'stand' });
    const es = ev(d);
    expect(es.filter((e) => e.t === 'eliminated')).toEqual([{ t: 'eliminated', id: 'u2' }]);
    expect(removedEvents(es)).toEqual([{ t: 'removed', id: 'u3', reason: 'broken' }, { t: 'removed', id: 'u4', reason: 'broken' }]);
    expect(d.state.units.filter((x) => x.key === 'FR/SWI')).toHaveLength(0);
    for (const gone of ['u2', 'u3', 'u4']) expect(d.state.turn.ordered[gone]).toBeUndefined();
    expect(d.state.winner).toBeNull();
    // the turn goes on: the removed units are not offered, and the game reaches the next card decision
    expect(d.pending?.kind).not.toBe('battle'); // nothing left that can battle
    endTurn(d);
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
    expect(violations(d.state, true)).toEqual([]);
  });

  it('101: a victory reached by the second elimination is decided before the removal (S30, R64)', () => {
    const s = swissBattle({ banners: 2 });
    const { ctx, events } = recorder();
    damage(s, ctx, s.units[0], 5, 'test');
    damage(s, ctx, s.units[0], 5, 'test');
    expect(s.winner).toBe('top');
    expect(removedEvents(events)).toHaveLength(0);
    expect(ids(s)).toEqual(['u3', 'u4', 'u5', 'u6']); // the others are still on the board
  });

  it("101: the other side's Swiss have no such rule", () => {
    const s = build({
      sideRules: BREAK,
      units: [top('FR/SWI', [0, 0]), top('FR/SWI', [0, 1]), top('FR/SWI', [0, 2]), bot('FR/SWI', [8, 0]), bot('FR/SWI', [8, 1]), bot('FR/LN', [8, 8])],
    });
    const { ctx, events } = recorder();
    damage(s, ctx, s.units[0], 5, 'test');
    damage(s, ctx, s.units[0], 5, 'test');
    expect(ids(s)).toEqual(['u3', 'u4', 'u5', 'u6']);
    expect(removedEvents(events)).toHaveLength(0);
  });

  it('101 (real battle): the second FR/SWI lost removes the other two; Schramm stays alone', () => {
    const info = SCENARIOS.find((x) => x.id === '101')!;
    const s = createGame(info.setup, 11);
    const swiss = s.units.filter((x) => x.side === 'bottom' && x.key === 'FR/SWI');
    expect(swiss).toHaveLength(4);
    const { ctx, events } = recorder();
    damage(s, ctx, swiss[0], 5, 'test');
    damage(s, ctx, swiss[1], 5, 'test');
    expect(s.units.filter((x) => x.key === 'FR/SWI' && x.side === 'bottom')).toHaveLength(0);
    expect(s.units.filter((x) => x.key === 'SP/SWI')).toHaveLength(2);
    expect(bannerTotal(s, 'top')).toBe(2);
    expect(removedEvents(events)).toHaveLength(2);
    const schramm = s.leaders.find((l) => l.name === 'Schramm');
    expect(schramm?.hex).toBe(H(6, 4));
    expect(s.units.some((x) => x.hex === H(6, 4))).toBe(false);
  });
});

/** `side` gains `times` events of `each` permanent banners. */
function gains(s: GameState, ctx: FlowCtx, times: number, each = 1, side: Side = 'bottom'): void {
  for (let i = 0; i < times; i++) gainBanner(s, ctx, side, each, 'test');
}

const shrinkBattle = (seed = 4242, extra: Pos = {}): GameState =>
  build({ sideRules: SHRINK, topCards: 6, bottomCards: 5, banners: 99, first: 'top', units: [top('BR/LN', [0, 6]), bot('FR/LN', [8, 6])], ...extra }, seed);

describe('106: the shrinking hand (S33, S46)', () => {
  it('106: each enemy banner costs one random held card until the hand size is 3 (S33)', () => {
    const s = shrinkBattle();
    const before = [...s.players.top.hand];
    const { ctx, events } = recorder();
    gains(s, ctx, 3);
    const gone = events.filter((e) => e.t === 'discarded');
    expect(gone).toHaveLength(3);
    expect(s.special.handSize.top).toBe(3);
    expect(s.players.top.hand).toHaveLength(3);
    for (const e of gone) {
      expect(e).toMatchObject({ side: 'top' });
      const card = (e as { card: number }).card;
      expect(before).toContain(card);
      expect(s.players.top.hand).not.toContain(card);
      expect(s.discard).toContain(card);
    }
    gains(s, ctx, 1);
    expect(events.filter((e) => e.t === 'discarded')).toHaveLength(3);
    expect(s.special.handSize.top).toBe(3);
    expect(s.players.top.hand).toHaveLength(3);
    expect(s.special.handSize.bottom).toBe(5);
    expect(s.players.bottom.hand).toHaveLength(5);
  });

  it("106: the shrinking side's own banners lose nothing", () => {
    const s = shrinkBattle();
    const { ctx, events } = recorder();
    gains(s, ctx, 3, 1, 'top');
    expect(events.filter((e) => e.t === 'discarded')).toHaveLength(0);
    expect(s.special.handSize.top).toBe(6);
  });

  it('106: two banners in one event cost two cards (S33)', () => {
    const s = shrinkBattle();
    const { ctx, events } = recorder();
    gains(s, ctx, 1, 2);
    expect(events.filter((e) => e.t === 'discarded')).toHaveLength(2);
    expect(s.special.handSize.top).toBe(4);
    expect(s.players.top.hand).toHaveLength(4);
    gains(s, ctx, 1, 2); // 4 -> 3: only one more card, whatever the event is worth
    expect(events.filter((e) => e.t === 'discarded')).toHaveLength(3);
    expect(s.special.handSize.top).toBe(3);
  });

  it('106: square-track cards are never taken; the normal draw keeps the reduced size (S33)', () => {
    const s = shrinkBattle(4242, {
      units: [top('BR/LN', [0, 6], { square: 1 }), top('BR/LN', [0, 2], { square: 2 }), top('BR/LN', [0, 9]), bot('FR/LN', [8, 6])],
    });
    const track = s.players.top.squareTrack.filter((c) => c !== null);
    expect(track).toHaveLength(2);
    expect(s.players.top.hand).toHaveLength(4);
    const { ctx, events } = recorder();
    gains(s, ctx, 3);
    expect(s.players.top.squareTrack.filter((c) => c !== null)).toEqual(track);
    expect(events.filter((e) => e.t === 'discarded')).toHaveLength(3);
    for (const e of events) if (e.t === 'discarded') expect(track).not.toContain(e.card);
    expect(s.players.top.hand).toHaveLength(1); // 3 less the 2 on the track: a hand of 1 only stops new squares (R26)
    expect(s.special.handSize.top).toBe(3);
    // the draws keep the size: top plays its card, draws, and holds the same again
    const d = new GameDriver(shrinkBattle());
    gains(d.state, ctx, 3);
    passTurn(d);
    expect(d.state.players.top.hand).toHaveLength(3);
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'bottom' });
    passTurn(d);
    expect(d.state.players.top.hand).toHaveLength(3);
    expect(violations(d.state, true)).toEqual([]);
  });

  it('106: a hand that falls to 1 with two squares only stops new squares (S33, R26)', () => {
    const s = shrinkBattle(4242, { units: [top('BR/LN', [0, 6], { square: 1 }), top('BR/LN', [0, 2], { square: 2 }), bot('FR/LN', [8, 6])] });
    gains(s, recorder().ctx, 5);
    expect(s.special.handSize.top).toBe(3);
    expect(s.players.top.hand).toHaveLength(1);
    expect(s.units.filter((x) => x.side === 'top' && x.square !== undefined)).toHaveLength(2); // the two squares stand
    expect(violations(s, true)).toEqual([]);
  });

  it('106: the random card is seeded: the same seed takes the same card', () => {
    const taken = (seed: number): number[] => {
      const s = shrinkBattle(seed);
      const { ctx, events } = recorder();
      gains(s, ctx, 3);
      return events.flatMap((e) => (e.t === 'discarded' ? [e.card] : []));
    };
    expect(taken(7)).toEqual(taken(7));
    expect(taken(8)).toEqual(taken(8));
    const all = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((x) => taken(x).join(','));
    expect(new Set(all).size).toBeGreaterThan(1);
  });

  it('106: a banner while no card is held takes its card right after the next draw (S46)', () => {
    // top holds 3 squares (a hand of 1): the hand size is 4. It plays its last card, so nothing is held when the banner falls.
    const s = shrinkBattle(4242, {
      topCards: 4,
      units: [top('BR/LN', [0, 6], { square: 1 }), top('BR/LN', [0, 2], { square: 2 }), top('BR/LN', [0, 9], { square: 3 }), bot('FR/LN', [8, 6])],
    });
    s.special.handSize.top = 4;
    expect(s.players.top.hand).toHaveLength(1);
    const d = play(s, 'probeC', ['u1']);
    endMoves(d);
    expect(d.state.players.top.hand).toHaveLength(0);
    const { ctx, events } = recorder();
    gains(d.state, ctx, 1);
    expect(events.filter((e) => e.t === 'discarded')).toHaveLength(0); // nothing held to take
    expect(d.state.special.handSize.top).toBe(3);
    ev(d);
    endTurn(d);
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'bottom' });
    const es = ev(d);
    expect(es.filter((e) => e.t === 'draw' && e.side === 'top')).toHaveLength(1);
    const taken = es.filter((e) => e.t === 'discarded' && e.side === 'top');
    expect(taken).toHaveLength(1); // the drawn card goes at once: 0 + 1 + 3 squares > 3
    expect(d.state.players.top.hand).toHaveLength(0);
    expect(d.state.players.top.squareTrack.filter((c) => c !== null)).toHaveLength(3);
    expect(violations(d.state, true)).toEqual([]);
  });

  it('106 (real battle): three French banners cost three Spanish cards; a fourth costs none', () => {
    const info = SCENARIOS.find((x) => x.id === '106')!;
    const s = createGame(info.setup, 5);
    expect(s.special.handSize).toEqual({ top: 6, bottom: 5 });
    const squares = s.players.top.squareTrack.filter((c) => c !== null).length;
    const held = s.players.top.hand.length;
    expect(held + squares).toBe(6);
    const { ctx, events } = recorder();
    gains(s, ctx, 3);
    expect(events.filter((e) => e.t === 'discarded')).toHaveLength(3);
    expect(s.special.handSize.top).toBe(3);
    expect(s.players.top.hand).toHaveLength(held - 3);
    gains(s, ctx, 1);
    expect(events.filter((e) => e.t === 'discarded')).toHaveLength(3);
    expect(s.players.bottom.hand).toHaveLength(5);
    expect(bannerTotal(s, 'bottom')).toBe(4);
  });
});
