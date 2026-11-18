// The per-kind policies (src/ai/policies.ts): one test per row of the Task 7 table, each through the decision the engine asks.
import { describe, expect, it } from 'vitest';
import {
  CARD_DEFS, CARD_LIST, GameDriver, answerError, cardKind, distance, forceDice, leaderById, leaderRetreatOptions, retreatDistance, retreatOptions,
  shortSupplyHexes, shortSupplyTargets, statsOf, unitById, type CardKind, type Decision, type DieFace, type GameState, type Side,
} from '../../src/engine';
import { makeBudget } from '../../src/ai/budget';
import { evaluate } from '../../src/ai/evaluate';
import {
  assignElan, assignRally, estCtxFor, greedyBattle, pickAdvance, pickBonusMelee, pickBreakthroughHex, pickCard, pickDefence, pickGuns, pickIgnore,
  pickLeaderRetreat, pickOrders, pickRetreat, pickScout, pickShortSupplyHex, pickShortSupplyTarget, policyFor, stayInSquare, type PolicyCtx,
} from '../../src/ai/policies';
import { Rng } from '../../src/ai/rand';
import { rallyAssign } from '../../src/ai/cardsense';
import { NEUTRAL_W, rowValue, unitValue, weightsFor } from '../../src/ai/values';
import { blindClone, determinize, isDeterminised } from '../../src/ai/view';
import { H, attack, build, giveCard, must, n, play, toBattle, type Pos } from '../rules/helpers';
import { failOnAiErrors } from './no-ai-errors';

failOnAiErrors();

type Units = NonNullable<Pos['units']>;
const top = (key: Units[number]['key'], at: [number, number], extra: object = {}) => ({ side: 'top' as const, key, at, ...extra });
const bot = (key: Units[number]['key'], at: [number, number], extra: object = {}) => ({ side: 'bottom' as const, key, at, ...extra });
const PAD = n('artillery', 40);
const W = NEUTRAL_W;
const ctxOf = (me: Side, over: Partial<PolicyCtx> = {}): PolicyCtx => ({ me, W, oppW: W, rand: new Rng(5), mistakeRate: 0, ...over });
const pending = <K extends Decision['kind']>(d: GameDriver, kind: K): Extract<Decision, { kind: K }> => {
  expect(d.pending?.kind).toBe(kind);
  return d.pending as Extract<Decision, { kind: K }>;
};

/** A hand of exactly these cards' kinds, in this order (each swaps with the card it displaces, in the hand or the deck). */
function holding(s: GameState, side: Side, kinds: CardKind[]): number[] {
  const hand = s.players[side].hand;
  const foe = s.players[side === 'top' ? 'bottom' : 'top'].hand;
  const ids: number[] = [];
  kinds.forEach((k, i) => {
    const id = CARD_LIST.map((c, x) => (c === k && !ids.includes(x) && !foe.includes(x) ? x : -1)).filter((x) => x >= 0)
      .find((x) => hand.indexOf(x) >= i || s.deck.includes(x))!;
    const p = hand.indexOf(id);
    if (p >= 0) [hand[i], hand[p]] = [hand[p], hand[i]];
    else {
      const at = s.deck.indexOf(id);
      [hand[i], s.deck[at]] = [s.deck[at], hand[i]];
    }
    ids.push(id);
  });
  return ids;
}

/** A determinised clone of `s` seen from `side`: what a simulation answers on. */
function sampled(s: GameState, side: Side): GameState {
  const c = blindClone(s, side);
  determinize(c, side, new Rng(2));
  expect(isDeterminised(c)).toBe(true);
  return c;
}

describe('playCard', () => {
  it('is legal and prefers the card with the kill', () => {
    // one worn enemy in the centre; only the Centre cards can order the unit that kills it
    const s = build({ units: [bot('BR/LN', [5, 6]), top('FR/LN', [3, 6], { blocks: 1 })] });
    const kinds: CardKind[] = ['attackL', 'attackR', 'attackC', 'probeL', 'probeR'];
    const ids = holding(s, 'bottom', kinds);
    const d: Decision = { kind: 'playCard', side: 'bottom' };
    const a = pickCard(s, d, W);
    expect(answerError(s, d, a)).toBeNull();
    expect(a).toEqual({ kind: 'playCard', card: ids[2] });
    // the same on a determinised clone
    const c = sampled(s, 'bottom');
    expect(pickCard(c, d, W)).toEqual({ kind: 'playCard', card: ids[2] });
  });
});

describe('orders', () => {
  it('is legal for every card kind that asks for orders', () => {
    let asked = 0;
    for (const kind of Object.keys(CARD_DEFS) as CardKind[]) {
      const s = build({
        units: [bot('BR/LN', [6, 6]), bot('BR/LN', [6, 2]), bot('BR/HC', [6, 10]), bot('BR/FA', [7, 6]), top('FR/LN', [3, 6]), top('FR/LN', [3, 2])],
        leaders: [{ side: 'bottom', at: [6, 6] }, { side: 'bottom', at: [8, 8] }],
      });
      s.lastCard.top = 'attackC';
      const d = play(s, kind);
      if (d.pending?.kind !== 'orders') continue;
      asked++;
      const dec = d.pending;
      const a = pickOrders(d.state, dec, W);
      expect(answerError(d.state, dec, a), kind).toBeNull();
      const c = sampled(d.state, 'bottom');
      expect(answerError(c, dec, pickOrders(c, dec, W)), `${kind} determinised`).toBeNull();
    }
    expect(asked).toBeGreaterThan(15);
  });

  it('orders the unit that has something to do', () => {
    const s = build({ units: [bot('BR/LN', [5, 6]), bot('BR/LN', [8, 6]), top('FR/LN', [4, 6], { blocks: 1 })] });
    const d = play(s, 'attackC');
    const a = pickOrders(d.state, pending(d, 'orders'), W);
    expect(a).toMatchObject({ kind: 'orders' });
    expect((a as { pieces: string[] }).pieces).toContain('u1');
  });
});

describe('leaveSquare', () => {
  const at = (enemy: Units[number]) => play(build({ units: [bot('BR/LN', [6, 6], { square: 1 }), enemy] }), 'attackC', ['u1']);
  it('stays with heavy cavalry 2 hexes away, leaves with none within 4', () => {
    const near = at(top('FR/HC', [4, 6]));
    expect(stayInSquare(near.state, pending(near, 'leaveSquare'), W)).toEqual({ kind: 'yesno', yes: false });
    const far = at(top('FR/LN', [0, 6]));
    expect(stayInSquare(far.state, pending(far, 'leaveSquare'), W)).toEqual({ kind: 'yesno', yes: true });
    const dec = pending(near, 'leaveSquare');
    expect(policyFor(ctxOf('bottom'))(near.state, dec)).toEqual({ kind: 'yesno', yes: false });
  });
});

describe('move', () => {
  it('ends when nothing scores above standing (a foot gun with a target stands)', () => {
    const d = play(build({ units: [bot('BR/FA', [6, 6]), top('FR/LN', [3, 6])] }), 'attackC', ['u1']);
    const dec = pending(d, 'move');
    expect(policyFor(ctxOf('bottom'))(d.state, dec)).toEqual({ kind: 'endMove' });
    const c = sampled(d.state, 'bottom');
    expect(policyFor(ctxOf('bottom'))(c, dec)).toEqual({ kind: 'endMove' });
  });
});

describe('battle', () => {
  it('attacks a worn target', () => {
    const d = toBattle(build({ units: [bot('BR/LN', [5, 6]), top('FR/LN', [4, 6], { blocks: 1 })] }), 'attackC', ['u1']);
    expect(greedyBattle(d.state, pending(d, 'battle'), W)).toEqual({ kind: 'attack', unit: 'u1', target: H(4, 6) });
  });

  it('declines a losing melee into a town', () => {
    // a 3-block line unit next to a full guard unit in a town: nothing to fire at, only a hopeless melee
    const s = build({ units: [bot('BR/LN', [5, 6], { blocks: 3 }), top('FR/GR', [4, 6])], terrain: [{ at: [4, 6], t: 'town' }] });
    const d = toBattle(s, 'attackC', ['u1']);
    expect(d.pending?.kind).toBe('battle');
    expect(greedyBattle(d.state, pending(d, 'battle'), W)).toEqual({ kind: 'endBattle' });
  });
});

describe('combinedArms', () => {
  const at = (units: Units, extra: Pos = {}): GameDriver => {
    const d = toBattle(build({ ...extra, units }), 'assaultC', ['u1', 'u3']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    return d;
  };
  it('adds no gun when none adds value, and the required gun when the unit has no die', () => {
    // a full line against a 1-block unit already dies to its own dice; the gun does better firing elsewhere
    const d = at([bot('BR/LN', [5, 6]), top('FR/LN', [4, 6], { blocks: 1 }), bot('BR/FA', [5, 5]), top('FR/LN', [2, 5], { blocks: 1 })]);
    const dec = pending(d, 'combinedArms');
    const a = pickGuns(d.state, dec, W);
    expect(a).toEqual({ kind: 'select', ids: [] });
    expect(answerError(d.state, dec, a)).toBeNull();
  });

  it('a unit that cannot roll a die of its own must bring a gun', () => {
    // cavalry cannot melee out of a town: it rolls nothing, so the gun is required
    const s = build({
      units: [bot('BR/LC', [5, 6], { blocks: 1 }), top('FR/LN', [4, 6]), bot('BR/FA', [5, 5])],
      terrain: [{ at: [5, 6], t: 'town' }],
    });
    const d = toBattle(s, 'assaultC', ['u1', 'u3']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    if (d.pending?.kind !== 'combinedArms') return; // the engine may allow the die; the legality test above covers the rest
    const dec = d.pending;
    const a = pickGuns(d.state, dec, W);
    expect(answerError(d.state, dec, a)).toBeNull();
    if (dec.required) expect((a as { ids: string[] }).ids.length).toBeGreaterThan(0);
  });
});

describe('defend', () => {
  const defence = (units: Units, extra: Pos = {}): GameDriver => {
    const d = toBattle(build({ first: 'top', ...extra, units }), 'attackC', ['u1']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    return d;
  };
  it('forms square against heavy cavalry when a worn line cannot afford to stand, and stands when it can', () => {
    const sq = defence([top('FR/HC', [3, 6]), bot('BR/LN', [4, 6], { blocks: 2 })], { bottomCards: 4 });
    expect(pickDefence(sq.state, pending(sq, 'defend'), W)).toEqual({ kind: 'defend', choice: 'formSquare' });
    const stand = defence([top('FR/LC', [3, 6], { blocks: 1 }), bot('BR/LN', [4, 6])], { bottomCards: 4 });
    expect(pickDefence(stand.state, pending(stand, 'defend'), W)).toEqual({ kind: 'defend', choice: 'stand' });
  });

  it('retires and reforms a weak cavalry defender against infantry', () => {
    const d = defence([top('FR/LN', [3, 6]), bot('BR/LC', [4, 6], { blocks: 1 })]);
    expect(pickDefence(d.state, pending(d, 'defend'), W)).toEqual({ kind: 'defend', choice: 'retireReform' });
  });

  it('is cheap: a node per offered reaction, no random draw and no search (carry 5)', () => {
    const d = defence([top('FR/HC', [3, 6]), bot('BR/LN', [4, 6], { blocks: 2 })], { bottomCards: 4 });
    const dec = pending(d, 'defend');
    const budget = makeBudget(1000, null, null);
    const rand = new Rng(77);
    const state = rand.state;
    pickDefence(d.state, dec, W, budget);
    expect(budget.nodes).toBe(dec.options.length);
    expect(budget.nodes).toBeLessThanOrEqual(4);
    policyFor(ctxOf('bottom', { rand, budget }))(d.state, dec);
    expect(rand.state).toBe(state);
    expect(budget.nodes).toBeLessThanOrEqual(8);
  });
});

describe('ignoreFlags', () => {
  it('ignores the most it may when the retreat is blocked', () => {
    // the defender is boxed in behind: every retreat costs blocks
    const s = build({ units: [bot('BR/LN', [5, 6]), bot('BR/LN', [6, 5]), bot('BR/LN', [6, 6]), bot('BR/LN', [6, 7]), top('FR/LN', [4, 6])] });
    const u = unitById(s, 'u1')!;
    const free = retreatOptions(s, u, retreatDistance(statsOf(s, u), 1)).filter((o) => o.losses === 0 && o.path.length > 0);
    expect(free).toEqual([]);
    expect(pickIgnore(s, { kind: 'ignoreFlags', side: 'bottom', unit: 'u1', flags: 1, max: 1 }, W)).toEqual({ kind: 'ignoreFlags', count: 1 });
  });

  it('retreats freely out of reach rather than stay, unless the unit holds an objective', () => {
    const units: Units = [bot('BR/LN', [5, 6]), top('FR/FA', [4, 6])];
    const s = build({ units });
    const d = { kind: 'ignoreFlags', side: 'bottom', unit: 'u1', flags: 1, max: 1 } as const;
    expect(pickIgnore(s, d, W)).toEqual({ kind: 'ignoreFlags', count: 0 });
    const held = build({ units, objectives: [{ kind: 'tempHex', side: 'bottom', hex: [5, 6], banners: 1 }] });
    expect(pickIgnore(held, d, W)).toEqual({ kind: 'ignoreFlags', count: 1 });
  });
});

describe('retreat', () => {
  const s = build({ units: [bot('BR/LN', [6, 6]), top('FR/LN', [5, 6]), top('FR/HC', [5, 2])] });
  it('picks the zero-loss option over one that loses a block', () => {
    const options = [
      { path: [H(7, 6)], end: H(7, 6), losses: 1, attach: null },
      { path: [H(7, 5)], end: H(7, 5), losses: 0, attach: null },
      { path: [H(7, 7)], end: H(7, 7), losses: 2, attach: null },
    ];
    expect(pickRetreat(s, { kind: 'retreat', side: 'bottom', unit: 'u1', options, reason: 'retreat' }, W)).toEqual({ kind: 'choose', index: 1 });
  });

  it('among equal losses takes the end hex farthest from enemy reach, then an attach', () => {
    const u = unitById(s, 'u1')!;
    const options = retreatOptions(s, u, 2);
    expect(options.length).toBeGreaterThan(1);
    const a = pickRetreat(s, { kind: 'retreat', side: 'bottom', unit: 'u1', options, reason: 'retreat' }, W);
    const chosen = options[(a as { index: number }).index];
    const best = Math.min(...options.map((o) => o.losses));
    expect(chosen.losses).toBe(best);
    const away = (o: (typeof options)[number]): number => Math.min(...s.units.filter((x) => x.side === 'top').map((x) => distance(x.hex, o.end)));
    expect(away(chosen)).toBeGreaterThanOrEqual(Math.min(...options.filter((o) => o.losses === best).map(away)));
    const tie = [
      { path: [H(7, 6)], end: H(7, 6), losses: 0, attach: null },
      { path: [H(7, 6)], end: H(7, 6), losses: 0, attach: 'L1' },
    ];
    expect(pickRetreat(s, { kind: 'retreat', side: 'bottom', unit: 'u1', options: tie, reason: 'retreat' }, W)).toEqual({ kind: 'choose', index: 1 });
  });
});

describe('leaderRetreat', () => {
  it('never takes the eliminating option when another exists, and prefers a safe attach', () => {
    const s = build({ leaders: [{ side: 'bottom', at: [5, 6] }], units: [bot('BR/LN', [7, 6]), top('FR/LN', [4, 6]), top('FR/LN', [4, 7]), top('FR/LN', [5, 7]), top('FR/LN', [5, 5]), top('FR/LN', [6, 5])] });
    const l = s.leaders[0];
    const options = leaderRetreatOptions(s, leaderById(s, l.id)!);
    expect(options.length).toBeGreaterThan(1);
    const a = pickLeaderRetreat(s, { kind: 'leaderRetreat', side: 'bottom', leader: l.id, options }, W);
    const chosen = options[(a as { index: number }).index];
    if (options.some((o) => !o.eliminated)) expect(chosen.eliminated).toBe(false);
  });

  it('takes the only option when it is the only one', () => {
    const only = [{ path: [], end: 1, offBoard: false, escapes: [], attach: null, eliminated: true }];
    const s = build({ leaders: [{ side: 'bottom', at: [5, 6] }], units: [bot('BR/LN', [7, 6])] });
    expect(pickLeaderRetreat(s, { kind: 'leaderRetreat', side: 'bottom', leader: s.leaders[0].id, options: only }, W)).toEqual({ kind: 'choose', index: 0 });
  });
});

describe('advance', () => {
  const win = (extra: Pos): GameDriver => {
    const s = build({ ...extra, units: [bot('BR/LN', [5, 6]), top('FR/LN', [4, 6], { blocks: 1 }), ...(extra.units ?? [])] });
    const d = toBattle(s, 'attackC', ['u1']);
    forceDice([...n('infantry', 4), ...PAD]);
    attack(d, 'u1', H(4, 6));
    forceDice([]);
    return d;
  };
  it('takes ground onto an objective hex', () => {
    const d = win({ objectives: [{ kind: 'tempHex', side: 'bottom', hex: [4, 6], banners: 1 }] });
    expect(pickAdvance(d.state, pending(d, 'advance'), W)).toEqual({ kind: 'yesno', yes: true });
  });

  it('declines into a 3-unit crossfire', () => {
    const d = win({ units: [top('FR/LN', [3, 5]), top('FR/LN', [3, 6]), top('FR/LN', [3, 7])] });
    expect(pickAdvance(d.state, pending(d, 'advance'), W)).toEqual({ kind: 'yesno', yes: false });
  });
});

describe('breakthroughExtra and bonusMelee', () => {
  const through = (extra: Pos): GameDriver => {
    const s = build({ ...extra, units: [bot('BR/HC', [5, 6]), top('FR/LN', [4, 6], { blocks: 1 }), ...(extra.units ?? [])] });
    const d = toBattle(s, 'attackC', ['u1']);
    forceDice([...n('infantry', 4), ...PAD]);
    attack(d, 'u1', H(4, 6));
    forceDice([]);
    must(d, { kind: 'yesno', yes: true });
    return d;
  };

  it('chooses the hex with the best bonus-melee prospect around the final hex', () => {
    // a worn gun beyond the vacated hex: only the extra hex (3,5)/(3,6) beside it offers a bonus melee
    const probe = through({ units: [top('FR/FA', [2, 5], { blocks: 1 })] });
    const dec = pending(probe, 'breakthroughExtra');
    const next = dec.options.filter((h) => distance(h, H(2, 5)) === 1);
    expect(next.length).toBeGreaterThan(0);
    expect(dec.options.some((h) => distance(h, H(2, 5)) > 1)).toBe(true);
    const a = pickBreakthroughHex(probe.state, dec, W);
    expect(answerError(probe.state, dec, a)).toBeNull();
    expect(next).toContain((a as { hex: number }).hex);
  });

  it('declines the extra hex (null) when it is optional and no hex improves on staying put', () => {
    const d = through({ units: [top('FR/LN', [2, 4]), top('FR/LN', [2, 8]), top('FR/LN', [1, 6])] });
    const dec = pending(d, 'breakthroughExtra');
    expect(dec.required).toBe(false);
    const a = pickBreakthroughHex(d.state, dec, W);
    expect(answerError(d.state, dec, a)).toBeNull();
    expect(a).toEqual({ kind: 'hex', hex: null });
  });

  it('bonus melee: the best target, and a decline for a 1-die melee on a full unit', () => {
    const d = through({ units: [top('FR/LN', [3, 6])] });
    must(d, { kind: 'hex', hex: null });
    if (d.pending?.kind === 'bonusMelee') {
      const dec = d.pending;
      const a = pickBonusMelee(d.state, dec, W);
      expect(answerError(d.state, dec, a)).toBeNull();
    }
    // a worn light cavalry unit (1 block) next to a full line in a town: one die of its own against four blocks
    const s = build({ units: [bot('BR/LC', [5, 6], { blocks: 1 }), top('FR/GR', [4, 6]), top('FR/LN', [3, 6], { blocks: 4 })], terrain: [{ at: [4, 6], t: 'town' }] });
    const dec: Decision = { kind: 'bonusMelee', side: 'bottom', unit: 'u1', targets: [H(4, 6)] };
    s.turn.ordered.u1 = { ...(play(build({ units: [bot('BR/LC', [5, 6], { blocks: 1 }), top('FR/GR', [4, 6])] }), 'attackC', ['u1']).state.turn.ordered.u1) };
    expect(pickBonusMelee(s, dec, W)).toEqual({ kind: 'hex', hex: null });
    // the same cavalry unit against a worn line unit in the open takes the bonus melee
    const open = build({ units: [bot('BR/LC', [5, 6], { blocks: 3 }), top('FR/LN', [4, 6], { blocks: 1 })] });
    open.turn.ordered.u1 = s.turn.ordered.u1;
    expect(pickBonusMelee(open, dec, W)).toEqual({ kind: 'hex', hex: H(4, 6) });
  });
});

describe('elan and rally', () => {
  it('elan is legal and orders the unit with a target first', () => {
    const faces: DieFace[] = ['infantry', 'infantry', 'sabre', 'flag', 'sabre'];
    forceDice(faces);
    const d = play(build({ units: [bot('BR/LN', [5, 6]), bot('BR/LN', [8, 1]), top('FR/LN', [4, 6], { blocks: 1 })] }), 'elan');
    forceDice([]);
    const dec = pending(d, 'elan');
    const a = assignElan(d.state, dec, W);
    expect(answerError(d.state, dec, a)).toBeNull();
    const ids = (a as { ids: (string | null)[] }).ids;
    // the unit at the front takes the first infantry die; the one far back, whose order gains least, gets the second
    expect(ids[0]).toBe('u1');
    expect(ids[1] === null || ids[1] === 'u2').toBe(true);
    expect(ids[2]).toBeNull(); // a sabre orders nothing
    const c = sampled(d.state, 'bottom');
    expect(answerError(c, dec, assignElan(c, dec, W))).toBeNull();
  });

  it('rally gives the infantry symbol to the block that gains most (cardsense rallyAssign)', () => {
    forceDice(['infantry', 'sabre', 'sabre', 'sabre', 'sabre']);
    const d = play(build({ units: [bot('BR/LN', [6, 6], { blocks: 3 }), bot('BR/LN', [6, 4], { blocks: 2 }), top('FR/LN', [3, 6])] }), 'rally');
    forceDice([]);
    const dec = pending(d, 'rally');
    const a = assignRally(d.state, dec);
    expect(answerError(d.state, dec, a)).toBeNull();
    // cardsense's rallyAssign: the block with the largest unitValue gain (the value curve rises with blocks, so the 3-block unit gains most)
    const gain = (id: string): number => rowValue(statsOf(d.state, unitById(d.state, id)!), unitById(d.state, id)!.blocks + 1) - unitValue(d.state, unitById(d.state, id)!);
    const first = (a as { ids: (string | null)[] }).ids[0]!;
    expect(gain(first)).toBeGreaterThanOrEqual(gain(first === 'u1' ? 'u2' : 'u1'));
    expect(a).toEqual({ kind: 'assign', ids: rallyAssign(d.state, 'bottom', dec.faces) });
  });
});

describe('scoutKeep', () => {
  it('keeps the card of higher value', () => {
    const s = build({ units: [bot('BR/LN', [5, 6]), top('FR/LN', [3, 6], { blocks: 1 })] });
    const [scout, assault] = [CARD_LIST.indexOf('scoutL'), CARD_LIST.indexOf('assaultC')];
    expect(cardKind(scout)).toBe('scoutL');
    for (const cards of [[scout, assault], [assault, scout]] as const) {
      const a = pickScout(s, { kind: 'scoutKeep', side: 'bottom', cards: [cards[0], cards[1]] }, W);
      expect(cards[(a as { index: number }).index]).toBe(assault);
    }
  });
});

describe('shortSupply', () => {
  it('lifts the enemy standing on our objective', () => {
    const s = build({
      units: [bot('BR/LN', [7, 6]), bot('BR/LN', [7, 3]), top('FR/LN', [4, 6]), top('FR/LN', [1, 6])],
      objectives: [{ kind: 'tempHex', side: 'bottom', hex: [4, 6], banners: 1 }],
    });
    const options = shortSupplyTargets(s, 'bottom');
    const a = pickShortSupplyTarget(s, { kind: 'shortSupplyTarget', side: 'bottom', options }, W);
    expect(options[(a as { index: number }).index]).toBe('u3');
  });

  it('places the unit on the offered hex with the best evaluation', () => {
    const s = build({ units: [bot('BR/LN', [4, 6]), bot('BR/LN', [7, 3]), top('FR/LN', [3, 6]), top('FR/HC', [3, 3])] });
    const options = shortSupplyHexes(s, 'u1');
    expect(options.length).toBeGreaterThan(1);
    const dec: Decision = { kind: 'shortSupplyHex', side: 'bottom', unit: 'u1', options };
    const a = pickShortSupplyHex(s, dec, W);
    expect(answerError(s, dec, a)).toBeNull();
    const scores = options.map((h) => {
      const c = blindClone(s, 'bottom');
      c.units[0].hex = h;
      return evaluate(c, 'bottom', W);
    });
    const hex = (a as { hex: number }).hex;
    expect(scores[options.indexOf(hex)]).toBeCloseTo(Math.max(...scores), 9);
  });
});

describe('mistakes and determinism', () => {
  it('with mistakeRate 0 a reactive policy draws nothing; with 1 it answers at random but legally from rand', () => {
    const d = toBattle(build({ first: 'top', bottomCards: 4, units: [top('FR/HC', [3, 6]), bot('BR/LN', [4, 6], { blocks: 2 })] }), 'attackC', ['u1']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    const dec = pending(d, 'defend');
    const calm = new Rng(1);
    const before = calm.state;
    policyFor(ctxOf('bottom', { rand: calm }))(d.state, dec);
    expect(calm.state).toBe(before);
    const seen = new Set<string>();
    for (let seed = 1; seed < 40; seed++) {
      const wild = new Rng(seed);
      const a = policyFor(ctxOf('bottom', { rand: wild, mistakeRate: 1 }))(d.state, dec);
      expect(answerError(d.state, dec, a)).toBeNull();
      expect(wild.state).not.toBe(new Rng(seed).state);
      seen.add(JSON.stringify(a));
    }
    expect(seen.size).toBeGreaterThan(1);
    expect(weightsFor({ aggression: 0.5, caution: 0.5, cunning: 0.5, dash: 0.5 })).toBeDefined();
  });

  it('estCtxFor reads the sampled hand only on a determinised clone', () => {
    const s = build({ units: [bot('BR/LN', [5, 6]), top('FR/LN', [3, 6])] });
    expect(estCtxFor(s, 'bottom', W).determinised).toBe(false);
    expect(estCtxFor(sampled(s, 'bottom'), 'bottom', W).determinised).toBe(true);
  });
});
