// Rules: RR §15.8, §16.16 (design/rules-reference.md)
import { afterEach, describe, expect, it } from 'vitest';
import { CARD_LIST, GameDriver, createGame, forceDice, formSquare, randomAnswer, type CardKind, type GameState, type Side } from '../../src/engine';
import { SCENARIOS } from '../../src/scenarios';
import { mulberry32 } from '../support/rng';
import { build, ev, must, type Pos } from './helpers';

afterEach(() => forceDice([]));

// four cards each that may not be picked (the deck holds 8 of them)
const FILLER: Record<Side, CardKind[]> = {
  top: ['rally', 'elan', 'counterAttack', 'leadership'],
  bottom: ['firstStrike', 'firstStrike', 'leadership', 'counterAttack'],
};

/**
 * Replace both hands by cards of the given kinds (distinct ids); the old hands go to the bottom of the deck. 'rally' stands
 * for any card that cannot be picked: each one becomes the next of the side's four such kinds.
 */
function setHands(s: GameState, kinds: Record<Side, CardKind[]>): Record<Side, number[]> {
  const used: number[] = [];
  const out = {} as Record<Side, number[]>;
  for (const side of ['top', 'bottom'] as Side[]) {
    let filler = 0;
    out[side] = kinds[side].map((k0) => {
      const k = k0 === 'rally' ? FILLER[side][filler++] : k0;
      const id = CARD_LIST.findIndex((c, i) => c === k && !used.includes(i));
      if (id < 0) throw new Error(`no free ${k}`);
      used.push(id);
      return id;
    });
  }
  const old = [...s.players.top.hand, ...s.players.bottom.hand];
  s.deck = s.deck.filter((c) => !used.includes(c));
  s.discard = s.discard.filter((c) => !used.includes(c));
  s.deck.push(...old.filter((c) => !used.includes(c)));
  s.players.top.hand = [...out.top];
  s.players.bottom.hand = [...out.bottom];
  return out;
}

const pos = (first: Side = 'top'): Pos => ({
  moveFirst: 'reveal', first,
  units: [{ side: 'bottom', key: 'BR/LN', at: [5, 6] }, { side: 'top', key: 'FR/LN', at: [4, 6] }],
});

function game(top: CardKind[], bottom: CardKind[], first: Side = 'top'): { d: GameDriver; t: number[]; b: number[] } {
  const s = build(pos(first));
  const { top: t, bottom: b } = setHands(s, { top, bottom });
  return { d: new GameDriver(s), t, b };
}

const pick = (d: GameDriver, card: number): void => must(d, { kind: 'playCard', card });

describe('Move First by revealed cards (S38, S43, S44)', () => {
  it('both sides are asked before turn 1, top first; excluded cards are not options (S38)', () => {
    const { d, t, b } = game(['scoutC', 'rally', 'elan', 'leadership', 'probeC'], ['counterAttack', 'firstStrike', 'attackC', 'forward', 'rally']);
    expect(d.pending).toEqual({ kind: 'moveFirst', side: 'top', options: [t[0], t[4]] });
    pick(d, t[0]);
    expect(d.pending).toEqual({ kind: 'moveFirst', side: 'bottom', options: [b[2], b[3]] });
    pick(d, b[2]);
    expect(d.pending).toMatchObject({ kind: 'playCard' });
  });

  it('the lower printed value moves first; a tie goes to the tie side (S38)', () => {
    let g = game(['scoutC', 'rally', 'rally', 'rally', 'rally'], ['probeC', 'rally', 'rally', 'rally', 'rally'], 'bottom');
    pick(g.d, g.t[0]);
    pick(g.d, g.b[0]);
    expect(g.d.state.active).toBe('top');
    expect(g.d.state.first).toBe('top');
    expect(g.d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
    g = game(['probeC', 'rally', 'rally', 'rally', 'rally'], ['scoutC', 'rally', 'rally', 'rally', 'rally'], 'top');
    pick(g.d, g.t[0]);
    pick(g.d, g.b[0]);
    expect(g.d.state.active).toBe('bottom');
    // Attack (3) against Recon in Force (3): a tie, to `first`
    for (const first of ['top', 'bottom'] as Side[]) {
      const x = game(['attackC', 'rally', 'rally', 'rally', 'rally'], ['reconInForce', 'rally', 'rally', 'rally', 'rally'], first);
      pick(x.d, x.t[0]);
      pick(x.d, x.b[0]);
      expect(x.d.state.active).toBe(first);
    }
  });

  it("Assault counts the picker's Command; Force March and Cold Steel count above every number (S38)", () => {
    // top holds 5 cards: Assault = 5, so Forward (6) loses; bottom's Forward 6 > 5
    let g = game(['assaultC', 'rally', 'rally', 'rally', 'rally'], ['forward', 'rally', 'rally', 'rally', 'rally']);
    pick(g.d, g.t[0]);
    pick(g.d, g.b[0]);
    expect(g.d.state.active).toBe('top');
    const e = ev(g.d).find((x) => x.t === 'moveFirst');
    expect(e).toMatchObject({ t: 'moveFirst', values: { top: 5, bottom: 6 }, first: 'top' });
    // a hand of 4 makes Assault 4: Attack (3) moves first; a hand of 2 makes it 2: a tie with Probe (2) goes to `first`
    g = game(['assaultC', 'rally', 'rally', 'rally'], ['attackC', 'rally', 'rally', 'rally', 'rally']);
    pick(g.d, g.t[0]);
    pick(g.d, g.b[0]);
    expect(g.d.state.active).toBe('bottom');
    for (const first of ['top', 'bottom'] as Side[]) {
      g = game(['assaultC', 'rally'], ['probeC', 'rally', 'rally', 'rally', 'rally'], first);
      pick(g.d, g.t[0]);
      pick(g.d, g.b[0]);
      expect(g.d.state.active).toBe(first);
    }
    // Force March / Cold Steel beat nothing: Forward (6) first
    for (const k of ['forceMarch', 'coldSteel'] as CardKind[]) {
      const x = game([k, 'rally', 'rally', 'rally', 'rally'], ['forward', 'rally', 'rally', 'rally', 'rally'], 'top');
      pick(x.d, x.t[0]);
      pick(x.d, x.b[0]);
      expect(x.d.state.active).toBe('bottom');
      expect(ev(x.d).find((y) => y.t === 'moveFirst')).toMatchObject({ values: { top: 99 } });
    }
  });

  it('each side must play its revealed card on its first turn (S38)', () => {
    const { d, t, b } = game(['scoutC', 'probeC', 'rally', 'rally', 'rally'], ['attackC', 'forward', 'rally', 'rally', 'rally']);
    pick(d, t[0]);
    pick(d, b[0]);
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
    expect(d.answer({ kind: 'playCard', card: t[1] })).toBe(false);
    expect(d.lastError).toMatch(/opening card/);
    expect(d.answer({ kind: 'playCard', card: t[0] })).toBe(true);
    // finish the top turn, then the bottom side's first turn is bound too
    for (let i = 0; i < 40 && d.pending && !(d.pending.kind === 'playCard' && d.pending.side === 'bottom'); i++) {
      const p = d.pending;
      if (p.kind === 'orders') must(d, { kind: 'orders', pieces: [] });
      else if (p.kind === 'move') must(d, { kind: 'endMove' });
      else if (p.kind === 'battle') must(d, { kind: 'endBattle' });
      else if (p.kind === 'scoutKeep') must(d, { kind: 'choose', index: 0 });
      else throw new Error(`unexpected ${p.kind}`);
    }
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'bottom' });
    expect(d.answer({ kind: 'playCard', card: b[1] })).toBe(false);
    expect(d.answer({ kind: 'playCard', card: b[0] })).toBe(true);
  });

  it("the second player's committed card counts for Command and is never taken for a square (S38)", () => {
    const { d, t, b } = game(['scoutC', 'rally', 'rally', 'rally', 'rally'], ['attackC', 'probeC', 'rally', 'rally', 'rally']);
    pick(d, t[0]);
    pick(d, b[1]);   // Probe (2) vs Scout (1): top first, bottom committed to Probe
    expect(d.state.special.moveFirst).toMatchObject({ done: true, picks: { top: t[0], bottom: b[1] }, committed: { top: t[0], bottom: b[1] } });
    expect(d.state.players.bottom.hand).toContain(b[1]);   // still held: counts for Command and the hand limit
    expect(d.state.players.bottom.hand).toHaveLength(5);
    // across many seeds the square never takes it, while it is the side's first turn
    for (let seed = 1; seed <= 25; seed++) {
      const s = build(pos(), seed);
      const h = setHands(s, { top: ['scoutC', 'rally', 'rally', 'rally', 'rally'], bottom: ['attackC', 'probeC', 'rally', 'rally', 'rally'] });
      const g = new GameDriver(s);
      pick(g, h.top[0]);
      pick(g, h.bottom[1]);
      formSquare(g.state, { emit: () => {} }, g.state.units.find((x) => x.id === 'u1')!);
      expect(g.state.players.bottom.squareTrack.filter((c) => c !== null)).toHaveLength(1);
      expect(g.state.players.bottom.squareTrack).not.toContain(h.bottom[1]);
      expect(g.state.players.bottom.hand).toContain(h.bottom[1]);
    }
  });

  it('a side with no eligible card picks nothing and moves second (S43)', () => {
    const none: CardKind[] = ['rally', 'rally', 'rally', 'rally'];   // Rally, Élan, Counter-Attack, Leadership (or First Strike): none may be picked
    // top has none: it is not asked, bottom is; bottom moves first although `first` is top
    let g = game(none, ['forceMarch', 'rally', 'rally', 'rally', 'rally'], 'top');
    expect(g.d.pending).toMatchObject({ kind: 'moveFirst', side: 'bottom' });
    pick(g.d, g.b[0]);
    expect(g.d.state.active).toBe('bottom');
    expect(g.d.state.special.moveFirst).toMatchObject({ picks: { top: null, bottom: g.b[0] }, committed: { top: null } });
    expect(ev(g.d).find((x) => x.t === 'moveFirst')).toMatchObject({ values: { top: 100, bottom: 99 }, first: 'bottom' });
    // top is free to play anything on its first turn after bottom's turn
    // bottom has none: asked only top; top moves first
    g = game(['coldSteel', 'rally', 'rally', 'rally', 'rally'], none, 'bottom');
    expect(g.d.pending).toMatchObject({ kind: 'moveFirst', side: 'top' });
    pick(g.d, g.t[0]);
    expect(g.d.state.active).toBe('top');
    // neither: nobody is asked, the tie side moves first
    for (const first of ['top', 'bottom'] as Side[]) {
      const x = game(none, none, first);
      expect(x.d.pending).toMatchObject({ kind: 'playCard', side: first });
      expect(x.d.state.special.moveFirst).toMatchObject({ done: true, picks: { top: null, bottom: null } });
      expect(x.d.state.active).toBe(first);
    }
  });

  it('the moveFirst event shows both picks only after both are made (S44)', () => {
    const { d, t, b } = game(['scoutC', 'rally', 'rally', 'rally', 'rally'], ['attackC', 'rally', 'rally', 'rally', 'rally']);
    pick(d, t[0]);
    expect(ev(d).filter((x) => x.t === 'moveFirst')).toEqual([]);
    expect(d.state.special.moveFirst).toMatchObject({ done: false });
    pick(d, b[0]);
    expect(ev(d).filter((x) => x.t === 'moveFirst')).toEqual([
      { t: 'moveFirst', picks: { top: t[0], bottom: b[0] }, values: { top: 1, bottom: 3 }, first: 'top' },
    ]);
  });

  it('undo cannot cross the reveal (S44) and replay reproduces the game', () => {
    const { d, t, b } = game(['scoutC', 'probeC', 'rally', 'rally', 'rally'], ['attackC', 'rally', 'rally', 'rally', 'rally']);
    expect(d.canUndo()).toBe(false);
    pick(d, t[0]);
    expect(d.undoStep()).toBeNull();
    pick(d, b[0]);
    expect(d.undoStep()).toBeNull();
    // the first turn's card step can be taken back, but only to just after the reveal
    pick(d, t[0]);
    expect(d.undoStep()).toBe('card');
    const back = d.undo();
    expect(back.answers).toHaveLength(2);
    expect(back.pending).toMatchObject({ kind: 'playCard', side: 'top' });
    expect(back.state.special.moveFirst).toMatchObject({ done: true });
    expect(back.undoStep()).toBeNull();
    expect(back.undo().answers).toHaveLength(1);   // undo with nothing to take back drops only the last answer: the caller must check canUndo
    const r = GameDriver.replay(d.initial, d.answers);
    expect(r.state).toEqual(d.state);
  });

  it('without the rule the battle starts as before', () => {
    const s = build({ first: 'bottom', units: pos().units });
    const d = new GameDriver(s);
    expect(s.special.moveFirst).toBeNull();
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'bottom' });
  });

  it('while the bottom pick is pending, the top pick is not in the state (S44)', () => {
    const { d, t } = game(['scoutC', 'rally', 'rally', 'rally', 'rally'], ['attackC', 'rally', 'rally', 'rally', 'rally']);
    pick(d, t[0]);
    expect(d.pending).toMatchObject({ kind: 'moveFirst', side: 'bottom' });
    expect(d.state.special.moveFirst!.picks).toEqual({ top: null, bottom: null });
  });

  it('with nobody asked, the first card can still be taken back (no reveal barrier)', () => {
    const none: CardKind[] = ['rally', 'rally', 'rally', 'rally'];
    const { d } = game(none, none, 'top');
    const card = d.state.players.top.hand.find((c) => CARD_LIST[c] === 'leadership')!;   // a card that rolls nothing
    pick(d, card);
    expect(d.undoStep()).toBe('card');
    expect(d.undo().pending).toMatchObject({ kind: 'playCard', side: 'top' });
  });

  it('battle 116: random legal play to the end, bound opening cards, replay reproduces it', () => {
    const info = SCENARIOS.find((x) => x.id === '116')!;
    expect(info.setup.moveFirst).toBe('reveal');
    for (const seed of [1, 2, 3, 4, 5]) {
      const d = new GameDriver(createGame(info.setup, seed));
      const rnd = mulberry32(seed);
      let steps = 0;
      let boundSeen = 0;
      while (d.pending && steps < 6000) {
        const p = d.pending;
        if (p.kind === 'playCard') {
          const c = d.state.special.moveFirst!.committed[p.side];
          if (c !== null && d.state.special.turnsDone[p.side] === 0) {
            boundSeen++;
            const wrong = d.state.players[p.side].hand.find((x) => x !== c);
            if (wrong !== undefined) {
              expect(d.answer({ kind: 'playCard', card: wrong })).toBe(false);
              d.lastError = null;
            }
          }
        }
        must(d, randomAnswer(d.state, d.pending, rnd));
        steps++;
      }
      expect(d.state.winner).toBeTruthy();
      expect(boundSeen).toBeGreaterThan(0);
      expect(GameDriver.replay(d.initial, d.answers).state).toEqual(d.state);
    }
  });
});
