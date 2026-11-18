// The AI's sense for the Spanish expansion's card rules (Plan 7C Task 19): Guerrilla counters (RR §15.5, S15–S21, S45) and
// Vitoria's opening card (RR §15.8, §16.16, S38, S43, S44), and the view's redaction of an unrevealed pick.
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import {
  CARD_LIST, GameDriver, answerError, cardKind, cloneState, createGame, forceDice, moveFirstOptions, moveFirstValue, other, randomAnswer,
  type CardKind, type Decision, type GameState, type Side,
} from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { chooseAnswer, newMemory } from '../../src/ai';
import {
  COUNTER_VALUE, counterValue, guerrillaScoutTake, guerrillaSpend, handFloorPenalty, moveFirstPick, opponentTurnValue, rallyGain, scoutKeepGain,
} from '../../src/ai/cardsense';
import * as ordering from '../../src/ai/ordering';
import { ELAN_SHARE } from '../../src/ai/values';
import { pickCard, policyFor, type PolicyCtx } from '../../src/ai/policies';
import { Rng } from '../../src/ai/rand';
import { NEUTRAL_W, weightsFor } from '../../src/ai/values';
import { blindClone, determinize, oppHoldsP, originToken } from '../../src/ai/view';
import { build, endMoves, giveCard, must, noFirstStrike, type Pos } from '../rules/helpers';
import { aiOptions } from './soak';
import { failOnAiErrors } from './no-ai-errors';

failOnAiErrors();
afterEach(() => forceDice([]));

const W = NEUTRAL_W;
const ctxOf = (me: Side): PolicyCtx => ({ me, W, oppW: W, rand: new Rng(5), mistakeRate: 0 });
const ask = (s: GameState, d: Decision) => policyFor(ctxOf(d.side))(s, d);

type Units = NonNullable<Pos['units']>;
const top = (key: Units[number]['key'], at: [number, number], blocks?: number): Units[number] => ({ side: 'top', key, at, ...(blocks ? { blocks } : {}) });
const bot = (key: Units[number]['key'], at: [number, number], blocks?: number): Units[number] => ({ side: 'bottom', key, at, ...(blocks ? { blocks } : {}) });

/**
 * The QA kit (French top, British bottom) with the guerrilla rule on the bottom side holding `held`: three French units face
 * three worn British units in the centre, and one idle pair stands far apart on the French left (the board's right).
 */
function guerrillaPos(held: number, first: Side = 'top'): Pos {
  return {
    sideRules: [{ kind: 'guerrilla', side: 'bottom', counters: held }],
    first,
    units: [
      top('FR/HC', [4, 5]), top('FR/LN', [4, 6]), top('FR/LN', [4, 7]),
      bot('BR/LN', [5, 5], 1), bot('BR/LN', [5, 6], 1), bot('BR/LN', [5, 7], 1),
      top('FR/LN', [1, 11]), bot('BR/LN', [7, 11]),
    ],
  };
}

function driver(p: Pos): GameDriver {
  const s = build(p);
  noFirstStrike(s);
  return new GameDriver(s);
}

const playKind = (d: GameDriver, kind: CardKind): number => {
  const card = giveCard(d.state, d.state.active, kind);
  must(d, { kind: 'playCard', card });
  return card;
};

describe('Guerrilla: spending a counter (RR §15.5, S17–S19)', () => {
  it('spends a counter against a card that orders a winning melee; keeps it against a Scout', () => {
    // Attack Centre orders the three French units, each next to a one-block British unit
    const a = driver(guerrillaPos(2));
    playKind(a, 'attackC');
    const da = a.pending!;
    expect(da).toMatchObject({ kind: 'guerrilla', side: 'bottom', mode: 'spend', card: 'attackC' });
    const vA = opponentTurnValue(a.state, 'bottom', 'attackC', W);
    expect((5 / 6) * vA).toBeGreaterThanOrEqual(counterValue(a.state, 'bottom'));
    expect(guerrillaSpend(a.state, 'bottom', 'attackC', W)).toBe(true);
    expect(ask(a.state, da)).toEqual({ kind: 'yesno', yes: true });
    // a Scout on the French left orders only the idle unit far from any enemy
    const b = driver(guerrillaPos(2));
    playKind(b, 'scoutL');
    const db = b.pending!;
    expect(db).toMatchObject({ kind: 'guerrilla', side: 'bottom', mode: 'spend', card: 'scoutL' });
    expect((5 / 6) * opponentTurnValue(b.state, 'bottom', 'scoutL', W)).toBeLessThan(counterValue(b.state, 'bottom'));
    expect(ask(b.state, db)).toEqual({ kind: 'yesno', yes: false });
    // the opponent's own First Strike as its turn card, or a Short Supply, never draws a counter
    expect(guerrillaSpend(b.state, 'bottom', 'firstStrike', W)).toBe(false);
    expect(guerrillaSpend(b.state, 'bottom', 'shortSupply', W)).toBe(false);
  });

  it('a counter is worth COUNTER_VALUE, half again for the last one held', () => {
    const s = build(guerrillaPos(3));
    expect(COUNTER_VALUE).toBe(0.3);
    expect(counterValue(s, 'bottom')).toBeCloseTo(0.3, 12);
    s.players.bottom.resources.guerrilla = 1;
    expect(counterValue(s, 'bottom')).toBeCloseTo(0.45, 12);
  });

  it('the spend answer reads no hidden card: the same with the opponent\'s hand and the deck re-dealt', () => {
    const a = driver(guerrillaPos(1));
    playKind(a, 'attackC');
    const d = a.pending!;
    const base = ask(a.state, d);
    const s = a.state;
    const n = s.players.top.hand.length;
    for (let k = 1; k <= 6; k++) {
      // rotate the French hand and the deck together: only cards the British cannot see move
      const pool = [...s.players.top.hand, ...s.deck];
      const r = [...pool.slice(k * 3), ...pool.slice(0, k * 3)];
      s.players.top.hand = r.slice(0, n);
      s.deck = r.slice(n);
      expect(ask(s, d)).toEqual(base);
    }
  });
});

describe('Guerrilla: the spend question inside a simulation', () => {
  it('every sample of a decision values the card alike, and the value is worked out once (S17)', () => {
    const a = driver(guerrillaPos(2));
    playKind(a, 'attackC');
    const root = a.state;
    const spy = vi.spyOn(ordering, 'quickCardScore');
    const vals: number[] = [];
    for (let r = 1; r <= 5; r++) {
      const c = blindClone(root, 'top');
      determinize(c, 'top', new Rng(r));
      vals.push(opponentTurnValue(c, 'bottom', 'attackC', W));
    }
    const calls = spy.mock.calls.length;
    spy.mockRestore();
    expect(new Set(vals).size).toBe(1);
    expect(calls).toBe(1);
    // a fresh root with the same position gets the same value worked out anew (the memo holds only what it would compute)
    const b = driver(guerrillaPos(2));
    playKind(b, 'attackC');
    expect(b.state).not.toBe(root);
    const again = blindClone(b.state, 'top');
    determinize(again, 'top', new Rng(77));
    expect(opponentTurnValue(again, 'bottom', 'attackC', W)).toBe(vals[0]);
  });
});

describe('Guerrilla: gaining a counter with a Scout (S20)', () => {
  const toScoutQuestion = (held: number, extra: Pos = {}): GameDriver => {
    const d = driver({ ...guerrillaPos(held, 'bottom'), ...extra });
    playKind(d, 'scoutC');
    if (d.pending?.kind === 'orders') must(d, { kind: 'orders', pieces: [] });
    endMoves(d);
    expect(d.pending).toMatchObject({ kind: 'guerrilla', side: 'bottom', mode: 'scout' });
    return d;
  };

  it('takes a counter with a Scout when holding none; may decline when holding three', () => {
    const d = toScoutQuestion(0);
    expect(guerrillaScoutTake(d.state, 'bottom', W)).toBe(true);
    expect(ask(d.state, d.pending!)).toEqual({ kind: 'yesno', yes: true });
    // holding one: still below two, taken
    const one = toScoutQuestion(1);
    expect(ask(one.state, one.pending!)).toEqual({ kind: 'yesno', yes: true });

    // holding three, the answer weighs the counter against the Scout's keep-one gain
    const three = toScoutQuestion(3);
    expect(guerrillaScoutTake(three.state, 'bottom', W)).toBe(counterValue(three.state, 'bottom') >= scoutKeepGain(three.state, 'bottom', W));
    // five British units, all engaged, and a hand of six after the Scout: an Élan would order as many as it can
    const big = toScoutQuestion(3, {
      bottomCards: 7,
      units: [
        top('FR/HC', [4, 5]), top('FR/LN', [4, 6]), top('FR/LN', [4, 7]), top('FR/LN', [4, 3]), top('FR/LN', [4, 9]),
        bot('BR/LN', [5, 5], 1), bot('BR/LN', [5, 6], 1), bot('BR/LN', [5, 7], 1), bot('BR/LN', [5, 3]), bot('BR/LN', [5, 9]),
      ],
    });
    const s = big.state;
    // a pool of two unseen cards, a strong Élan and a dead Counter-Attack (nothing to copy yet): keeping the better of two is
    // worth more than a counter
    const strong = weightsFor({ aggression: 0.55, caution: 0.55, cunning: 1, dash: 0.5 });
    const elan = CARD_LIST.indexOf('elan');
    const dead = CARD_LIST.findIndex((k, i) => k === 'counterAttack' && !s.players.bottom.hand.includes(i));
    expect(s.lastCard.top).toBeNull();
    const keep = new Set([...s.players.bottom.hand, elan, dead]);
    s.discard = CARD_LIST.map((_, i) => i).filter((i) => !keep.has(i) && i !== s.turn.card);
    s.players.top.hand = [elan];
    s.deck = [dead];
    expect(scoutKeepGain(s, 'bottom', strong)).toBeGreaterThan(counterValue(s, 'bottom'));
    expect(guerrillaScoutTake(s, 'bottom', strong)).toBe(false);
    // the same pool holding one counter: taken all the same (fewer than two)
    s.players.bottom.resources.guerrilla = 1;
    expect(guerrillaScoutTake(s, 'bottom', strong)).toBe(true);
  });

  it('the Scout gain is the keep value of the better of two cards less that of one, over the unseen cards', () => {
    const d = toScoutQuestion(2);
    const g = scoutKeepGain(d.state, 'bottom', W);
    expect(g).toBeGreaterThan(0);
    expect(g).toBeLessThan(1);
  });
});

describe('Move First: the opening card (RR §15.8, S38, S43, S44)', () => {
  const mfPos = (): Pos => ({
    moveFirst: 'reveal', first: 'top',
    units: [top('FR/HC', [4, 5]), top('FR/LN', [4, 6]), bot('BR/LN', [5, 5], 1), bot('BR/LN', [5, 6], 1), top('FR/LN', [1, 11]), bot('BR/LN', [7, 11])],
  });

  it('the moveFirst pick is legal, eligible and the same with any opponent pick in the state', () => {
    const d = new GameDriver(build(mfPos()));
    const dec = d.pending!;
    expect(dec.kind).toBe('moveFirst');
    if (dec.kind !== 'moveFirst') return;
    const s = d.state;
    const a = ask(s, dec);
    expect(answerError(s, dec, a)).toBeNull();
    expect(a.kind === 'playCard' && moveFirstOptions(s, 'top').includes(a.card)).toBe(true);
    // two states differing only in the opponent's (unrevealed) pick give the same answer
    for (const c of s.players.bottom.hand) {
      const t = blindClone(s, 'bottom'); // any clone: the redaction must hold whatever the field says
      t.special.moveFirst!.picks.bottom = c;
      t.special.moveFirst!.committed.bottom = c;
      expect(ask(t, dec)).toEqual(a);
    }
  });

  it('picks the option with the highest opening value, ties to the lower Move First value', () => {
    const s = build(mfPos());
    const hand = s.players.top.hand;
    const kinds: CardKind[] = ['attackC', 'attackL', 'scoutC', 'rally', 'probeL'];
    const old = hand.splice(0, hand.length, ...kinds.map((k) => CARD_LIST.findIndex((x, i) => x === k && !s.players.bottom.hand.includes(i))));
    s.deck = [...s.deck, ...old].filter((c) => !hand.includes(c));
    const options = moveFirstOptions(s, 'top');
    expect(options.map(cardKind)).toEqual(['attackC', 'attackL', 'scoutC', 'probeL']);
    // Attack Centre orders both engaged units; the left cards order only the idle one
    expect(cardKind(moveFirstPick(s, 'top', options, W))).toBe('attackC');
    // between two cards that order the same unit to the same end, the lower value (Probe 2 below Attack 3)
    const idle = options.filter((c) => cardKind(c) === 'attackL' || cardKind(c) === 'probeL');
    const pick = moveFirstPick(s, 'top', idle, W);
    expect(moveFirstValue(s, 'top', pick)).toBe(Math.min(...idle.map((c) => moveFirstValue(s, 'top', c))));
  });

  it('the view clears an unrevealed opponent pick and keeps a revealed opening card in the sampled hand', () => {
    const d = new GameDriver(build(mfPos()));
    const s = d.state;
    // before the reveal: an opponent pick in the state (never there in a real game) is cleared; one's own pick stays
    s.special.moveFirst!.picks = { top: s.players.top.hand[0], bottom: s.players.bottom.hand[0] };
    s.special.moveFirst!.committed = { top: s.players.top.hand[0], bottom: s.players.bottom.hand[0] };
    const c = blindClone(s, 'top');
    expect(c.special.moveFirst!.picks).toEqual({ top: s.players.top.hand[0], bottom: null });
    expect(c.special.moveFirst!.committed).toEqual({ top: s.players.top.hand[0], bottom: null });
    determinize(c, 'top', new Rng(3));
    expect(c.special.moveFirst!.picks.bottom).toBeNull();
    // the original is untouched
    expect(s.special.moveFirst!.picks.bottom).toBe(s.players.bottom.hand[0]);
  });

  it('after the reveal the opponent\'s committed card stays in its sampled hand until its first turn', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const d = new GameDriver(createGame(scenarioById('116').setup, seed));
      while (d.pending?.kind === 'moveFirst') {
        const opts = d.pending.options;
        must(d, { kind: 'playCard', card: opts[opts.length - 1] });
      }
      const s = d.state;
      for (const me of ['top', 'bottom'] as Side[]) {
        const opp = other(me);
        const k = s.special.moveFirst!.committed[opp];
        if (k === null) continue;
        expect(s.players[opp].hand).toContain(k);
        expect(blindClone(s, me).players[opp].hand).toContain(k);
        for (let r = 1; r <= 8; r++) {
          const c = blindClone(s, me);
          determinize(c, me, new Rng(seed * 100 + r));
          expect(c.players[opp].hand, `seed ${seed} view ${me} sample ${r}`).toContain(k);
          expect(c.players[opp].hand).toHaveLength(s.players[opp].hand.length);
          expect(new Set([...c.players[opp].hand, ...c.deck]).size).toBe(c.players[opp].hand.length + c.deck.length);
        }
      }
    }
  });

  it('the playCard policy plays the committed opening card on the first turn (S38)', () => {
    let tested = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const d = new GameDriver(createGame(scenarioById('116').setup, seed));
      while (d.pending?.kind === 'moveFirst') must(d, { kind: 'playCard', card: d.pending.options[0] });
      const dec = d.pending!;
      if (dec.kind !== 'playCard') continue;
      const k = d.state.special.moveFirst!.committed[dec.side];
      if (k === null) continue;
      expect(pickCard(d.state, dec, W)).toEqual({ kind: 'playCard', card: k });
      expect(ask(d.state, dec)).toEqual({ kind: 'playCard', card: k });
      // and inside a simulation, on a clone seen from the other side (whose sampled hand must hold the card)
      const c = blindClone(d.state, other(dec.side));
      determinize(c, other(dec.side), new Rng(seed));
      expect(pickCard(c, dec, W)).toEqual({ kind: 'playCard', card: k });
      tested++;
    }
    expect(tested).toBeGreaterThan(0);
  });
});

describe('the hand-floor penalty sees the square cap, the Folly and the hand size (S33, S34, S37)', () => {
  // one British line in the open next to French heavy cavalry, with a hand below the three cards a square needs
  const floorPos = (sideRules: Pos['sideRules'] = []): Pos => ({
    sideRules, bottomCards: 2,
    units: [bot('BR/LN', [5, 6]), top('FR/HC', [4, 6]), bot('BR/LN', [7, 1])],
  });

  it('the cap: a unit that may no longer form square is not counted (106)', () => {
    const free = build(floorPos());
    const base = handFloorPenalty(free, 'bottom');
    expect(base).toBeGreaterThan(0);
    const capped = build(floorPos([{ kind: 'squareCap', side: 'bottom', units: 1 }]));
    capped.special.squared.bottom = ['u3'];
    expect(handFloorPenalty(capped, 'bottom')).toBe(0);
    // the unit on the record may square again
    capped.special.squared.bottom = ['u1'];
    expect(handFloorPenalty(capped, 'bottom')).toBeCloseTo(base, 12);
  });

  it('the Folly: no square forms against a Cavalry Charge anyway, so the penalty is smaller (115)', () => {
    const base = handFloorPenalty(build(floorPos()), 'bottom');
    const folly = handFloorPenalty(build(floorPos([{ kind: 'cavalryChargeFolly', side: 'bottom' }])), 'bottom');
    expect(folly).toBeGreaterThan(0);
    expect(folly).toBeLessThan(base);
  });

  it('the hand size: a hand above special.handSize less the track counts as cut to it (S46)', () => {
    const s = build({ ...floorPos(), bottomCards: 3 });
    expect(handFloorPenalty(s, 'bottom')).toBe(0);
    s.special.handSize.bottom = 2;
    expect(handFloorPenalty(s, 'bottom')).toBeGreaterThan(0);
  });
});

describe('every answer for both kinds passes answerError (real battles)', () => {
  it('every answer for both kinds passes answerError', () => {
    const counts = { guerrilla: 0, moveFirst: 0 };
    for (const id of ['103', '106', '116', '117']) {
      for (let seed = 1; seed <= 2; seed++) {
        const d = new GameDriver(createGame(scenarioById(id).setup, seed));
        const mems = { top: newMemory(), bottom: newMemory() };
        const rnd = new Rng(seed * 31 + Number(id));
        for (let i = 0; i < 1500 && d.pending && !d.over; i++) {
          const dec = d.pending;
          let a;
          if (dec.kind === 'guerrilla' || dec.kind === 'moveFirst') {
            a = chooseAnswer(d.state, dec, aiOptions(id, dec.side, { seed, budgetScale: 0.05 }), mems[dec.side]).answer;
            expect(answerError(d.state, dec, a), `${id}/${seed} ${dec.kind}`).toBeNull();
            counts[dec.kind]++;
          } else a = randomAnswer(d.state, dec, () => rnd.next());
          must(d, a);
        }
        expect(mems.top.fallbacks + mems.bottom.fallbacks).toBe(0);
      }
    }
    expect(counts.guerrilla).toBeGreaterThan(0);
    expect(counts.moveFirst).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Review round 1

/** Re-deal what `me` cannot see (the opponent's hand, its filled track slots and the deck) on a copy of `s`, sizes and slots kept. */
function redeal(s: GameState, me: Side, rnd: Rng): GameState {
  const c = cloneState(s);
  const p = c.players[other(me)];
  const slots = p.squareTrack.map((x, i) => (x === null ? -1 : i)).filter((i) => i >= 0);
  const pool = [...p.hand, ...slots.map((i) => p.squareTrack[i]!), ...c.deck];
  rnd.shuffle(pool);
  p.hand = pool.slice(0, p.hand.length);
  slots.forEach((slot, i) => { p.squareTrack[slot] = pool[p.hand.length + i]; });
  c.deck = pool.slice(p.hand.length + slots.length);
  return c;
}

describe('review round 1: hidden information, the memo and the spend point', () => {
  it('real 103 and 117: the spend value and answer are the same with the opponent\'s hand, track and deck re-dealt', () => {
    let checked = 0;
    let differs = 0;
    for (const id of ['103', '117']) {
      for (let seed = 1; seed <= 3; seed++) {
        const d = new GameDriver(createGame(scenarioById(id).setup, seed));
        const rnd = new Rng(seed * 13 + Number(id));
        for (let i = 0; i < 2500 && d.pending && !d.over; i++) {
          const dec = d.pending;
          if (dec.kind === 'guerrilla' && dec.mode === 'spend' && dec.card) {
            const o = aiOptions(id, dec.side, { seed, budgetScale: 0.05 });
            const v = opponentTurnValue(d.state, dec.side, dec.card, W);
            const a = chooseAnswer(d.state, dec, o, newMemory()).answer;
            for (let k = 0; k < 3; k++) {
              const r = redeal(d.state, dec.side, rnd);
              if (JSON.stringify(r.players[other(dec.side)].hand) !== JSON.stringify(d.state.players[other(dec.side)].hand)) differs++;
              expect(opponentTurnValue(r, dec.side, dec.card, W), `${id}/${seed} value`).toBe(v);
              expect(chooseAnswer(r, dec, o, newMemory()).answer, `${id}/${seed} answer`).toEqual(a);
            }
            checked++;
          }
          must(d, randomAnswer(d.state, dec, () => rnd.next()));
        }
      }
    }
    expect(checked).toBeGreaterThan(10);
    expect(differs).toBeGreaterThan(checked);
  });

  it('the memo tells positions apart: the same root after a change gets the value a fresh root computes', () => {
    const value = (s: GameState, r: number): number => {
      const c = blindClone(s, 'top');
      determinize(c, 'top', new Rng(r));
      return opponentTurnValue(c, 'bottom', 'attackC', W);
    };
    const changes: ((s: GameState) => void)[] = [
      (s) => { s.units.find((u) => u.id === 'u4')!.blocks = 3; },             // a British unit's blocks
      (s) => { s.units.find((u) => u.id === 'u2')!.hex = s.units.find((u) => u.id === 'u7')!.hex - 1; }, // a French unit moved
      (s) => { s.players.top.banners = 3; },                                  // the banner count
      (s) => { s.turn.command = s.turn.command - 1; },                        // the turn's Command
    ];
    for (const change of changes) {
      const a = driver(guerrillaPos(2));
      playKind(a, 'attackC');
      const before = value(a.state, 1);
      change(a.state);
      const after = value(a.state, 2);
      const b = driver(guerrillaPos(2));
      playKind(b, 'attackC');
      change(b.state);
      expect(after).toBe(value(b.state, 3));
      void before;
    }
    // at least the blocks change moves the value (so the comparison above can see a stale memo)
    const a = driver(guerrillaPos(2));
    playKind(a, 'attackC');
    const v0 = value(a.state, 1);
    changes[0](a.state);
    expect(value(a.state, 1)).not.toBe(v0);
  });

  it('a whole 103 game: answers on the live state equal answers on a fresh copy of it (no memo carried over)', () => {
    const id = '103';
    const d = new GameDriver(createGame(scenarioById(id).setup, 5));
    const mems = { top: newMemory(), bottom: newMemory() };
    let n = 0;
    while (d.pending && !d.over && d.state.turn.number <= 12) {
      const dec = d.pending;
      const o = aiOptions(id, dec.side, { seed: 5, budgetScale: 0.05 });
      const copyMem = structuredClone(mems[dec.side]);
      const fresh = chooseAnswer(cloneState(d.state), dec, o, copyMem).answer;
      const live = chooseAnswer(d.state, dec, o, mems[dec.side]).answer;
      expect(live, `decision ${n} ${dec.kind}`).toEqual(fresh);
      must(d, live);
      n++;
    }
    expect(n).toBeGreaterThan(40);
  });

  it('the spend value is asked only at the spend point (the card played, nothing ordered yet)', () => {
    const a = driver(guerrillaPos(2));
    playKind(a, 'attackC');
    expect(() => opponentTurnValue(a.state, 'bottom', 'attackC', W)).not.toThrow();
    // not the guerrilla side's question: the active side asking about its own card
    expect(() => opponentTurnValue(a.state, 'top', 'attackC', W)).toThrow(/spend point/);
    must(a, { kind: 'yesno', yes: false });
    // after the orders
    must(a, { kind: 'orders', pieces: ['u1'] });
    const later = cloneState(a.state);
    expect(Object.keys(later.turn.ordered)).toEqual(['u1']);
    expect(() => opponentTurnValue(later, 'bottom', 'attackC', W)).toThrow(/spend point/);
    // the 'nothing ordered' clause on its own: the counter question unanswered (guerrilla 'none') but a piece already ordered
    const orderedOnly = cloneState(later);
    orderedOnly.turn.guerrilla = 'none';
    orderedOnly.turn.phase = 'orders';   // so only the 'nothing ordered' clause can throw
    expect(Object.keys(orderedOnly.turn.ordered).length).toBeGreaterThan(0);
    expect(() => opponentTurnValue(orderedOnly, 'bottom', 'attackC', W)).toThrow(/spend point/);
    // and inside a simulation the same guard holds
    const c = blindClone(later, 'top');
    determinize(c, 'top', new Rng(1));
    expect(() => opponentTurnValue(c, 'bottom', 'attackC', W)).toThrow(/spend point/);
    // before any card
    const fresh = build(guerrillaPos(2));
    expect(() => opponentTurnValue(fresh, 'bottom', 'attackC', W)).toThrow(/spend point/);
  });

  it('originToken is an opaque token per root, never the state', () => {
    const a = build(guerrillaPos(2));
    const b = build(guerrillaPos(2));
    const ca = blindClone(a, 'top');
    const cca = blindClone(ca, 'bottom');
    const tok = originToken(ca);
    expect(tok).not.toBe(a);
    expect(Object.keys(tok)).toEqual([]);
    expect('units' in tok || 'players' in tok).toBe(false);
    expect(Object.isFrozen(tok)).toBe(true);
    expectTypeOf(tok).not.toMatchTypeOf<GameState>();
    expect(originToken(cca)).toBe(tok);
    expect(originToken(a)).toBe(tok);
    expect(originToken(blindClone(b, 'top'))).not.toBe(tok);
  });
});

describe('review round 1: the spend rule\'s numbers (S18)', () => {
  /** The spend question after Attack Centre, with `quickCardScore` stubbed to `v` (held 2: the counter is worth 0.3). */
  const spendWith = (v: number): boolean => {
    const a = driver(guerrillaPos(2));
    playKind(a, 'attackC');
    const spy = vi.spyOn(ordering, 'quickCardScore').mockReturnValue(v);
    try {
      return guerrillaSpend(a.state, 'bottom', 'attackC', W);
    } finally {
      spy.mockRestore();
    }
  };

  it('spends exactly when 5/6 of the card\'s value reaches the counter\'s (>=, and a cancel chance of 5/6)', () => {
    // 5/6 × 0.36 is 0.3 exactly in floating point: the threshold itself spends
    expect((5 / 6) * 0.36).toBe(COUNTER_VALUE);
    expect(spendWith(0.36)).toBe(true);
    // 0.35 reaches 0.3 only without the 5/6
    expect(spendWith(0.35)).toBe(false);
    expect(spendWith(0.5)).toBe(true);
    expect(spendWith(0.2)).toBe(false);
  });

  it('a Rally or an Élan is valued with the turn\'s Command (the played card counted)', () => {
    // Rally: worn French units, a hand of five (Command 5 once the card is played)
    const r = driver({ ...guerrillaPos(2), units: [top('FR/LN', [4, 5], 1), top('FR/LN', [4, 6], 1), top('FR/HC', [4, 7], 1), bot('BR/LN', [6, 6])] });
    playKind(r, 'rally');
    expect(r.pending).toMatchObject({ kind: 'guerrilla', mode: 'spend', card: 'rally' });
    const cmd = r.state.turn.command;
    expect(cmd).toBe(5);
    const rc = blindClone(r.state, 'bottom');
    const rv = opponentTurnValue(r.state, 'bottom', 'rally', W);
    expect(rv).toBeCloseTo(rallyGain(rc, 'top', cmd), 12);
    expect(rv).not.toBeCloseTo(rallyGain(rc, 'top', cmd - 1), 6);
    // Élan: the best round(0.6 × Command) benefits
    const e = driver(guerrillaPos(2));
    playKind(e, 'elan');
    expect(e.pending).toMatchObject({ kind: 'guerrilla', mode: 'spend', card: 'elan' });
    const ec = blindClone(e.state, 'bottom');
    const ben = [...ordering.pieceBenefits(ec, 'top', 'elan', W).values()].sort((x, y) => y - x);
    const top3 = (k: number): number => ben.slice(0, Math.max(1, Math.round(ELAN_SHARE * k))).reduce((s, x) => s + Math.max(0, x), 0);
    const ev = opponentTurnValue(e.state, 'bottom', 'elan', W);
    expect(ev).toBeCloseTo(top3(e.state.turn.command), 9);
    expect(ev).not.toBeCloseTo(top3(e.state.turn.command - 1), 6);
  });
});

describe('review round 1: the revealed opening card in P(First Strike) (S38)', () => {
  it('a known non-First-Strike card in the opponent\'s hand lowers the chance it holds one', () => {
    const d = new GameDriver(createGame(scenarioById('116').setup, 3));
    while (d.pending?.kind === 'moveFirst') must(d, { kind: 'playCard', card: d.pending.options[0] });
    const s = d.state;
    for (const me of ['top', 'bottom'] as Side[]) {
      const opp = other(me);
      if (s.special.moveFirst!.committed[opp] === null) continue;
      const p = oppHoldsP(s, me, 'firstStrike');
      const unbound = cloneState(s);
      unbound.special.moveFirst!.committed[opp] = null;
      expect(p).toBeLessThan(oppHoldsP(unbound, me, 'firstStrike'));
    }
  });
});
