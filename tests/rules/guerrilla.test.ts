// Rules: RR §15.5 (design/rules-reference.md)
import { afterEach, describe, expect, it } from 'vitest';
import { GameDriver, forceDice, forcedDiceLeft, type CardKind, type Decision, type GameEvent, type Side } from '../../src/engine';
import { H, build, endMoves, endTurn, ev, giveCard, miss, must, noFirstStrike, passTurn, rolls, type Pos } from './helpers';

afterEach(() => forceDice([]));

const otherSide = (x: Side): Side => (x === 'top' ? 'bottom' : 'top');

/**
 * A battle whose guerrilla side is `g` holding `counters`; its opponent moves first unless `first` says otherwise. One
 * infantry unit of each side faces the other in the centre (u1 bottom at (5,6), u2 top at (4,6)), and a second pair
 * stands apart on the left (u3 bottom at (6,1), u4 top at (2,1)), so every section card has something to order.
 */
function pos(g: Side, counters: number, extra: Pos = {}): Pos {
  return {
    sideRules: [{ kind: 'guerrilla', side: g, counters }],
    first: otherSide(g),
    units: [
      { side: 'bottom', key: 'BR/LN', at: [5, 6] },
      { side: 'top', key: 'FR/LN', at: [4, 6] },
      { side: 'bottom', key: 'BR/LN', at: [6, 1] },
      { side: 'top', key: 'FR/LN', at: [2, 1] },
    ],
    ...extra,
  };
}

/** A driver on a fresh battle with no First Strike in either hand. */
function start(p: Pos): GameDriver {
  const s = build(p);
  noFirstStrike(s);
  return new GameDriver(s);
}

/** The active side plays a card of `kind` (put into its hand) and returns its id. */
function playKind(d: GameDriver, kind: CardKind): number {
  const card = giveCard(d.state, d.state.active, kind);
  must(d, { kind: 'playCard', card });
  return card;
}

const yes = (d: GameDriver): void => must(d, { kind: 'yesno', yes: true });
const no = (d: GameDriver): void => must(d, { kind: 'yesno', yes: false });

/** Every decision kind asked while `f` runs (the pending one before each answer, and the one left at the end). */
function asked(d: GameDriver, f: () => void): Decision['kind'][] {
  const seen: Decision['kind'][] = [];
  const answer = d.answer.bind(d);
  d.answer = (a) => {
    if (d.pending) seen.push(d.pending.kind);
    return answer(a);
  };
  try {
    f();
  } finally {
    d.answer = answer;
  }
  if (d.pending) seen.push(d.pending.kind);
  return seen;
}

const guerrillaEvents = (es: GameEvent[]): Extract<GameEvent, { t: 'guerrilla' }>[] =>
  es.filter((e): e is Extract<GameEvent, { t: 'guerrilla' }> => e.t === 'guerrilla');

describe('Guerrilla Action: spending a counter (S15–S19, S45)', () => {
  it('no counter, no rule or on its own turn: no guerrilla question (S15, S45)', () => {
    // no counter held
    const a = start(pos('bottom', 0));
    playKind(a, 'attackC');
    expect(a.pending).toMatchObject({ kind: 'orders', side: 'top' });
    // no rule at all
    const b = start({ ...pos('bottom', 1), sideRules: [] });
    playKind(b, 'attackC');
    expect(b.pending).toMatchObject({ kind: 'orders', side: 'top' });
    // the guerrilla side's own turn
    const c = start({ ...pos('bottom', 1), first: 'bottom' });
    playKind(c, 'attackC');
    expect(c.pending).toMatchObject({ kind: 'orders', side: 'bottom' });
  });

  it('the question names the opponent\'s card, held and pool', () => {
    const d = start(pos('bottom', 1));
    playKind(d, 'attackC');
    expect(d.pending).toMatchObject({ kind: 'guerrilla', side: 'bottom', mode: 'spend', card: 'attackC', held: 1, pool: 5 });
    // the guerrilla rule on the other side works the same way
    const t = start(pos('top', 2));
    playKind(t, 'probeL');
    expect(t.pending).toMatchObject({ kind: 'guerrilla', side: 'top', mode: 'spend', card: 'probeL', held: 2, pool: 4 });
  });

  it('declining keeps the counter and the card is carried out', () => {
    const d = start(pos('bottom', 1));
    playKind(d, 'attackC');
    ev(d);
    no(d);
    expect(d.state.players.bottom.resources.guerrilla).toBe(1);
    expect(d.state.turn.guerrilla).toBe('none');
    expect(d.pending).toMatchObject({ kind: 'orders', side: 'top', card: 'attackC' });
    const e = ev(d);
    expect(rolls(e, 'guerrilla')).toEqual([]);
    expect(guerrillaEvents(e)).toEqual([]);
  });

  it('a sabre: the counter goes to the pool and the card stands (S18)', () => {
    const d = start(pos('top', 1));
    playKind(d, 'attackC');
    ev(d);
    forceDice(['sabre']);
    yes(d);
    expect(forcedDiceLeft()).toBe(0);
    const e = ev(d);
    expect(rolls(e, 'guerrilla')).toEqual([['sabre']]);
    expect(e.find((x) => x.t === 'roll' && x.purpose === 'guerrilla')).toMatchObject({ scoring: [true], by: null, against: null });
    expect(guerrillaEvents(e)).toEqual([{ t: 'guerrilla', side: 'top', what: 'stood', held: 0, pool: 6 }]);
    expect(d.state.players.top.resources.guerrilla).toBe(0);
    expect(d.state.turn.guerrilla).toBe('stood');
    expect(d.pending).toMatchObject({ kind: 'orders', side: 'bottom', card: 'attackC' });
    must(d, { kind: 'orders', pieces: ['u1'] });
    expect(Object.keys(d.state.turn.ordered)).toEqual(['u1']);
    expect(ev(d).some((x) => x.t === 'ordered')).toBe(true);
  });

  it('no sabre: the card is discarded, nothing is ordered, one card is drawn and the turn ends (S19)', () => {
    const d = start(pos('bottom', 1));
    const before = d.state.players.top.hand.length;
    const card = playKind(d, 'attackC');
    forceDice(['infantry']);
    yes(d);
    const e = ev(d);
    expect(rolls(e, 'guerrilla')).toEqual([['infantry']]);
    expect(guerrillaEvents(e)).toEqual([{ t: 'guerrilla', side: 'bottom', what: 'cancelled', held: 0, pool: 6 }]);
    expect(e.some((x) => x.t === 'ordered')).toBe(false);
    expect(e.filter((x) => x.t === 'draw')).toEqual([{ t: 'draw', side: 'top' }]);
    expect(e.some((x) => x.t === 'scoutDrew')).toBe(false);
    const s = d.state;
    expect(s.discard).toContain(card);
    expect(s.players.top.hand).not.toContain(card);
    expect(s.players.top.hand.length).toBe(before);
    expect(s.players.bottom.resources.guerrilla).toBe(0);
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'bottom' });
    expect(s.lastCard.top).toBe('attackC');
  });

  it('a cancelled Scout draws one card, not two (S19)', () => {
    const d = start(pos('bottom', 1));
    const before = d.state.players.top.hand.length;
    playKind(d, 'scoutC');
    ev(d);
    forceDice(['flag']);
    yes(d);
    const e = ev(d);
    expect(e.filter((x) => x.t === 'draw')).toEqual([{ t: 'draw', side: 'top' }]);
    expect(e.some((x) => x.t === 'scoutDrew' || x.t === 'discarded')).toBe(false);
    expect(d.state.players.top.hand.length).toBe(before);
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'bottom' });
  });

  it('a cancelled Élan still reshuffles; no dice are rolled for it (S19, R53)', () => {
    const d = start(pos('bottom', 1));
    const card = playKind(d, 'elan');
    ev(d);
    forceDice(['cavalry']);
    yes(d);
    const e = ev(d);
    expect(rolls(e, 'guerrilla')).toEqual([['cavalry']]);
    expect(rolls(e, 'elan')).toEqual([]);
    expect(e.some((x) => x.t === 'reshuffle')).toBe(true);
    // the Élan went into the deck with the discard pile before the draw
    expect(d.state.discard).toEqual([]);
    expect(d.state.players.top.hand.includes(card) || d.state.deck.includes(card)).toBe(true);
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'bottom' });
  });

  it('a cancelled Rally rolls nothing; a cancelled Short Supply moves nothing (S19)', () => {
    const r = start(pos('bottom', 1, { units: [{ side: 'top', key: 'FR/LN', at: [4, 6], blocks: 2 }, { side: 'bottom', key: 'BR/LN', at: [6, 6] }] }));
    playKind(r, 'rally');
    ev(r);
    forceDice(['artillery']);
    yes(r);
    let e = ev(r);
    expect(rolls(e, 'rally')).toEqual([]);
    expect(e.some((x) => x.t === 'rallied')).toBe(false);
    expect(r.state.units.find((x) => x.id === 'u1')!.blocks).toBe(2);
    expect(r.pending).toMatchObject({ kind: 'playCard', side: 'bottom' });

    const q = start(pos('bottom', 1));
    const hexes = q.state.units.map((x) => x.hex);
    playKind(q, 'shortSupply');
    ev(q);
    forceDice(['infantry']);
    yes(q);
    e = ev(q);
    expect(e.some((x) => x.t === 'shortSupply')).toBe(false);
    expect(q.state.units.map((x) => x.hex)).toEqual(hexes);
    expect(q.pending).toMatchObject({ kind: 'playCard', side: 'bottom' });
  });

  it('Counter-Attack next turn copies the cancelled card (S21, R56)', () => {
    const d = start(pos('bottom', 1));
    playKind(d, 'attackL');
    forceDice(['infantry']);
    yes(d);
    expect(guerrillaEvents(ev(d))).toMatchObject([{ what: 'cancelled' }]);
    expect(d.state.lastCard.top).toBe('attackL');
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'bottom' });
    ev(d);
    playKind(d, 'counterAttack');
    // a Section card is mirrored (R56); read the event, as a copy that orders nothing ends the turn at once
    expect(ev(d).find((x) => x.t === 'cardPlayed')).toMatchObject({ side: 'bottom', kind: 'counterAttack', effective: 'attackR' });
  });

  it('the opponent\'s Counter-Attack may itself be cancelled (S21)', () => {
    const d = start({ ...pos('bottom', 1), first: 'bottom' });
    passTurn(d, 'probeC');
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
    playKind(d, 'counterAttack');
    expect(d.pending).toMatchObject({ kind: 'guerrilla', side: 'bottom', mode: 'spend', card: 'probeC' });
    forceDice(['infantry']);
    yes(d);
    expect(guerrillaEvents(ev(d))).toMatchObject([{ what: 'cancelled' }]);
    // the copied card counts as the card the opponent played
    expect(d.state.lastCard.top).toBe('probeC');
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'bottom' });
  });

  it('only one attempt per turn (S17)', () => {
    // declined: no second question in that turn
    const a = start(pos('bottom', 2));
    playKind(a, 'attackC');
    no(a);
    const kindsA = asked(a, () => {
      must(a, { kind: 'orders', pieces: ['u2'] });
      endTurn(a);
    });
    expect(kindsA).not.toContain('guerrilla');
    expect(a.pending).toMatchObject({ kind: 'playCard', side: 'bottom' });
    // stood: still two counters' worth of chances, but no second question
    const b = start(pos('bottom', 2));
    playKind(b, 'attackC');
    forceDice(['sabre']);
    yes(b);
    expect(b.state.players.bottom.resources.guerrilla).toBe(1);
    const kindsB = asked(b, () => {
      must(b, { kind: 'orders', pieces: ['u2'] });
      endTurn(b);
    });
    expect(kindsB).not.toContain('guerrilla');
  });

  it('every card qualifies: a First Strike the opponent plays as its turn card is asked about (S17)', () => {
    const s = build(pos('bottom', 1));
    const d = new GameDriver(s);
    playKind(d, 'firstStrike');
    expect(d.pending).toMatchObject({ kind: 'guerrilla', mode: 'spend', card: 'firstStrike' });
  });

  it('a reactive First Strike on the guerrilla side\'s turn is never asked about (S17)', () => {
    const s = build({ ...pos('bottom', 1), first: 'bottom' });
    noFirstStrike(s);
    giveCard(s, 'top', 'firstStrike');
    const d = new GameDriver(s);
    const kinds = asked(d, () => {
      playKind(d, 'attackC');
      must(d, { kind: 'orders', pieces: ['u1'] });
      endMoves(d);
      forceDice(Array(30).fill(miss('BR/LN', 'FR/LN')));
      must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
      must(d, { kind: 'defend', choice: 'firstStrike' });
      endTurn(d);
    });
    expect(kinds).toContain('defend');
    expect(kinds).not.toContain('guerrilla');
    expect(d.state.players.bottom.resources.guerrilla).toBe(1);
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
  });

  it('turn.guerrilla says the card was cancelled for the rest of that turn (S37 hook)', () => {
    const s = build(pos('bottom', 1));
    noFirstStrike(s);
    const card = giveCard(s, 'top', 'cavalryCharge');
    const d = new GameDriver(s, { snapshots: true });
    must(d, { kind: 'playCard', card });
    forceDice(['artillery']);
    yes(d);
    // the turn ends with the cancellation, so read the state as each event was emitted
    const seen = d.drainEvents().filter((q) => q.e.t === 'guerrilla' || q.e.t === 'draw')
      .map((q) => `${q.e.t}:${q.state!.turn.guerrilla}:${q.state!.turn.effective}`);
    expect(seen).toEqual(['guerrilla:cancelled:cavalryCharge', 'draw:cancelled:cavalryCharge']);
    expect(d.state.lastCard.top).toBe('cavalryCharge');
  });
});

describe('Guerrilla Action: gaining counters with Scout (S20, S45)', () => {
  it('Scout: may take a counter and draw one card instead of two (S20)', () => {
    const d = start({ ...pos('bottom', 0), first: 'bottom' });
    const before = d.state.players.bottom.hand.length;
    playKind(d, 'scoutL');
    must(d, { kind: 'orders', pieces: [] });
    ev(d);
    expect(d.pending).toMatchObject({ kind: 'guerrilla', side: 'bottom', mode: 'scout', held: 0, pool: 6 });
    yes(d);
    const e = ev(d);
    expect(guerrillaEvents(e)).toEqual([{ t: 'guerrilla', side: 'bottom', what: 'gained', held: 1, pool: 5 }]);
    expect(e.filter((x) => x.t === 'draw')).toEqual([{ t: 'draw', side: 'bottom' }]);
    expect(e.some((x) => x.t === 'scoutDrew')).toBe(false);
    expect(d.state.players.bottom.resources.guerrilla).toBe(1);
    expect(d.state.players.bottom.hand.length).toBe(before);
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
  });

  it('Scout: declining draws two and keeps one', () => {
    const d = start({ ...pos('top', 1), first: 'top' });
    playKind(d, 'scoutL');
    if (d.pending?.kind === 'orders') must(d, { kind: 'orders', pieces: [] });
    expect(d.pending).toMatchObject({ kind: 'guerrilla', side: 'top', mode: 'scout', held: 1, pool: 5 });
    no(d);
    expect(d.pending).toMatchObject({ kind: 'scoutKeep', side: 'top' });
    expect(d.state.players.top.resources.guerrilla).toBe(1);
  });

  it('Scout with an empty pool asks nothing and draws normally (S20)', () => {
    const d = start({ ...pos('bottom', 6), first: 'bottom' });
    playKind(d, 'scoutC');
    must(d, { kind: 'orders', pieces: [] });
    expect(d.pending).toMatchObject({ kind: 'scoutKeep', side: 'bottom' });
    expect(d.state.players.bottom.resources.guerrilla).toBe(6);
  });

  it('a Counter-Attack that becomes Scout may take a counter (S20)', () => {
    const d = start(pos('bottom', 0));
    passTurn(d, 'scoutR');
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'bottom' });
    playKind(d, 'counterAttack');
    expect(d.state.turn.effective).toBe('scoutL');
    if (d.pending?.kind === 'orders') must(d, { kind: 'orders', pieces: [] });
    expect(d.pending).toMatchObject({ kind: 'guerrilla', side: 'bottom', mode: 'scout' });
    yes(d);
    expect(d.state.players.bottom.resources.guerrilla).toBe(1);
  });

  it('the opponent never gains counters with Scout (S15)', () => {
    const d = start(pos('bottom', 0));
    playKind(d, 'scoutC');
    must(d, { kind: 'orders', pieces: [] });
    expect(d.pending).toMatchObject({ kind: 'scoutKeep', side: 'top' });
    expect('guerrilla' in d.state.players.top.resources).toBe(false);
    expect(d.state.players.bottom.resources.guerrilla).toBe(0);
  });

  it('the opponent\'s First Strike replacement is drawn before the Scout question (R51, S45)', () => {
    const s = build({ ...pos('bottom', 0), first: 'bottom' });
    noFirstStrike(s);
    giveCard(s, 'top', 'firstStrike');
    const d = new GameDriver(s);
    playKind(d, 'scoutC');
    must(d, { kind: 'orders', pieces: ['u1'] });
    endMoves(d);
    forceDice(Array(30).fill(miss('BR/LN', 'FR/LN')));
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    must(d, { kind: 'defend', choice: 'firstStrike' });
    for (let i = 0; i < 20 && d.pending && d.pending.kind !== 'guerrilla'; i++) {
      if (d.pending.kind === 'battle') must(d, { kind: 'endBattle' });
      else break;
    }
    const e = ev(d);
    expect(d.pending).toMatchObject({ kind: 'guerrilla', side: 'bottom', mode: 'scout' });
    expect(e.filter((x) => x.t === 'draw')).toEqual([{ t: 'draw', side: 'top' }]);
  });
});

describe('Guerrilla Action: undo and replay (Review Focus 4)', () => {
  /** A driver whose hands already hold the cards the test plays (undo and replay start from the initial state). */
  function dealt(p: Pos, cards: Partial<Record<Side, CardKind[]>>): { d: GameDriver; ids: Record<string, number> } {
    const s = build(p);
    noFirstStrike(s);
    const ids: Record<string, number> = {};
    for (const side of ['top', 'bottom'] as Side[]) for (const k of cards[side] ?? []) ids[`${side}:${k}`] = giveCard(s, side, k);
    return { d: new GameDriver(s), ids };
  }

  it('undo stops at the Guerrilla roll', () => {
    // a card that stood: its player is asked for orders, but cannot take the card back
    const { d: a, ids: ia } = dealt(pos('bottom', 1), { top: ['attackC'] });
    must(a, { kind: 'playCard', card: ia['top:attackC'] });
    expect(a.undoStep()).toBeNull();
    forceDice(['sabre']);
    yes(a);
    expect(a.pending).toMatchObject({ kind: 'orders', side: 'top' });
    expect(a.undoStep()).toBeNull();
    must(a, { kind: 'orders', pieces: ['u2'] });
    expect(a.undoStep()).toBeNull();
    // a cancelled card: the guerrilla side's next card can be taken back, never past the roll
    const { d: b, ids: ib } = dealt(pos('bottom', 1), { top: ['attackC'], bottom: ['probeC'] });
    must(b, { kind: 'playCard', card: ib['top:attackC'] });
    forceDice(['infantry']);
    yes(b);
    expect(b.undoStep()).toBeNull();
    must(b, { kind: 'playCard', card: ib['bottom:probeC'] });
    expect(b.undoStep()).toBe('card');
    forceDice(['infantry']);   // the rebuild replays the answers, so it rolls the same (forced) die again
    const back = b.undo();
    expect(back.pending).toMatchObject({ kind: 'playCard', side: 'bottom' });
    expect(back.state.players.bottom.resources.guerrilla).toBe(0);
    expect(back.state.lastCard.top).toBe('attackC');
    expect(back.undoStep()).toBeNull();
  });

  it('replaying the saved answers reproduces the game', () => {
    const { d, ids } = dealt(pos('bottom', 1), { top: ['attackC'], bottom: ['scoutC'] });
    must(d, { kind: 'playCard', card: ids['top:attackC'] });
    yes(d);   // a seeded die, not a forced one
    endTurn(d);
    must(d, { kind: 'playCard', card: ids['bottom:scoutC'] });
    if (d.pending?.kind === 'orders') must(d, { kind: 'orders', pieces: [] });
    expect(d.pending).toMatchObject({ kind: 'guerrilla', mode: 'scout' });
    yes(d);
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
    const r = GameDriver.replay(d.initial, d.answers);
    expect(r.state).toEqual(d.state);
    expect(r.pending).toEqual(d.pending);
  });
});
