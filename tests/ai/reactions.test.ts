// The defender's reaction model (src/ai/reactions.ts) and the melee estimate built on it: squares, Retire and Reform, take
// ground and breakthrough, First Strike and Combined Arms guns, and the Task 3 carry-overs (leaders near victory, stranded
// leaders, militia retreats). Every sanctioned approximation is cross-checked against seeded engine resolutions (within 3
// standard errors).
import { describe, expect, it, vi } from 'vitest';
import {
  CARD_LIST, artilleryShares, battleTargets, distance, forceDice, meleeDice, neighbours, rearHexes, statsOf, unitById,
  type Decision, type DefendChoice, type GameDriver, type GameEvent, type GameState, type HexId, type MeleeCtx, type Unit,
} from '../../src/engine';
import * as engineReactions from '../../src/engine/reactions';
import { defendOptions } from '../../src/engine/reactions';
import * as view from '../../src/ai/view';
import { occOf } from '../../src/ai/board';
import { dieOdds } from '../../src/ai/odds';
import { NEUTRAL_W, CARD_VALUE } from '../../src/ai/values';
import { meanHandValue } from '../../src/ai/cardsense';
import { evalTerms } from '../../src/ai/evaluate';
import { squareHoldCost } from '../../src/ai/reactions';
import {
  fireEstimate, firstStrikeEstimate, leaderAloneRisk, leaderCheckP, loneLeaderEstimate, makeEstCtx, meleeBranch, meleeEstimate,
  meleeWithGuns, squareFirstEstimate, takeGround, type EstCtx,
} from '../../src/ai/estimate';
import { Rng } from '../../src/ai/rand';
import { bestGuns, defendValue, firstStrikeCost, reactionOutcomes, squareCost } from '../../src/ai/reactions';
import { H, attack, build, giveCard, must, n, toBattle, type Pos } from '../rules/helpers';
import { engineTrials, sampleEngine } from './helpers';
import { failOnAiErrors } from './no-ai-errors';

failOnAiErrors();

type Units = NonNullable<Pos['units']>;
const top = (key: Units[number]['key'], at: [number, number], extra: object = {}) => ({ side: 'top' as const, key, at, ...extra });
const bot = (key: Units[number]['key'], at: [number, number], extra: object = {}) => ({ side: 'bottom' as const, key, at, ...extra });
/**
 * Top (the French) attacks with u1 from the battle decision (`first: 'bottom'` in `extra` for the British), `pieces` ordered;
 * `prep` adjusts the driver's state. The kit strips First Strike from both hands (`play`); `prep` may give it back.
 */
const kit = (units: Units, extra: Pos = {}, prep?: (s: GameState) => void, pieces = ['u1']) => (seed: number): GameDriver => {
  void seed;
  const d = toBattle(build({ first: 'top', ...extra, units }), 'attackC', pieces);
  while (d.pending?.kind === 'leaveSquare') must(d, { kind: 'yesno', yes: false }); // an ordered square stays formed
  prep?.(d.state);
  return d;
};
const unit = (s: GameState, id: string): Unit => unitById(s, id)!;
const at = (h: HexId): [number, number] => [Math.floor(h / 13), h % 13];
const mOf = (s: GameState, attacker: string, hex: HexId, role: 'attack' | 'bonus' = 'attack', artillery: string[] = []): MeleeCtx => ({
  attacker, target: occOf(s).unit[hex]!.id, targetHex: hex, role, artillery, reaction: null, declaredMoved: 0,
});
/**
 * The estimate context of `viewer`, told the opponent holds no First Strike: the kit's positions strip it from both hands
 * (tests/rules/helpers `play`), so the engine's defender reacts without it and the cross-checks compare like with like.
 * Tests of the First Strike prior itself use `makeEstCtx` directly.
 */
const ctx = (s: GameState, viewer: 'top' | 'bottom' = 'top'): EstCtx => {
  const ec = makeEstCtx(s, viewer, NEUTRAL_W);
  return ec.determinised ? ec : { ...ec, oppHands: { ...ec.oppHands, pFS: 0 } };
};
const choices = (s: GameState, viewer: 'top' | 'bottom', hex = H(4, 6)): DefendChoice[] => reactionOutcomes(s, mOf(s, 'u1', hex), ctx(s, viewer)).map((r) => r.choice);

const TRIALS = 4000;
const se = (p: number, k = TRIALS) => Math.sqrt(Math.max(p * (1 - p), 1e-4) / k);
const seMean = (sd: number, k = TRIALS) => Math.max(sd, 0.2) / Math.sqrt(k);
const near = (label: string, model: number, seen: number, sigma: number): void => {
  if (import.meta.env.VITE_AI_VERBOSE) console.info(`${label}: model ${model.toFixed(4)} engine ${seen.toFixed(4)} (SE ${sigma.toFixed(4)}, z ${((model - seen) / sigma).toFixed(2)})`);
  expect(Math.abs(model - seen), `${label}: model ${model.toFixed(4)} vs engine ${seen.toFixed(4)} (3 SE = ${(3 * sigma).toFixed(4)})`).toBeLessThanOrEqual(3 * sigma);
};

/** Mean and standard deviation of a per-trial measurement. */
class Tally {
  private s = 0;
  private s2 = 0;
  private k = 0;
  add(x: number): void {
    this.s += x;
    this.s2 += x * x;
    this.k++;
  }
  get mean(): number {
    return this.s / this.k;
  }
  get sd(): number {
    return Math.sqrt(Math.max(0, this.s2 / this.k - this.mean ** 2));
  }
}
const damageOf = (es: GameEvent[], id: string, reason: string): number =>
  es.reduce((a, e) => a + (e.t === 'damage' && e.id === id && e.reason === reason ? e.amount : 0), 0);
const happened = (es: GameEvent[], t: GameEvent['t'], id: string): number => (es.some((e) => e.t === t && 'id' in e && e.id === id) ? 1 : 0);
/** Declare the attack and stop at the defend decision (no answer given). */
const toDefend = (d: GameDriver, hex = H(4, 6)): Extract<Decision, { kind: 'defend' }> => {
  must(d, { kind: 'attack', unit: 'u1', target: hex });
  if (d.pending?.kind === 'combinedArms') must(d, { kind: 'select', ids: [] });
  expect(d.pending?.kind).toBe('defend');
  return d.pending as Extract<Decision, { kind: 'defend' }>;
};

describe('squares', () => {
  it("square odds follow the engine's own conditions", () => {
    const cavOn = (extra: Pos): GameState => kit([top('FR/HC', [3, 6]), bot('BR/LN', [4, 6])], extra)(1).state;
    const s4 = cavOn({ bottomCards: 4 });
    const s2 = cavOn({ bottomCards: 2 });
    const town = cavOn({ bottomCards: 4, terrain: [{ at: [4, 6], t: 'town' }] });
    // the engine's own answer (a test may ask it on the live state)
    expect(defendOptions(s4, mOf(s4, 'u1', H(4, 6)))).toContain('formSquare');
    expect(defendOptions(s2, mOf(s2, 'u1', H(4, 6)))).not.toContain('formSquare');
    expect(defendOptions(town, mOf(town, 'u1', H(4, 6)))).not.toContain('formSquare');
    // the opponent model follows it: square with 4 cards, none with 2 cards or in a town
    expect(choices(s4, 'top')).toEqual(['formSquare']);
    expect(choices(s2, 'top')).toEqual(['stand']);
    expect(choices(town, 'top')).toEqual(['stand']);
    // the cavalry sees a soft target when no square can be formed
    const evOf = (s: GameState): number => meleeEstimate(s, unit(s, 'u1'), H(4, 6), ctx(s)).ev;
    expect(evOf(s2)).toBeGreaterThan(evOf(s4) + 0.1);
    // and an AI infantry defender never counts on a square it cannot form
    expect(choices(s4, 'bottom')).toEqual(['formSquare']);
    expect(choices(s2, 'bottom')).toEqual(['stand']);
  });

  it('against a square, cavalry ev drops (1 die, square fires first, bounce flags) and agrees with the engine', () => {
    const cases: { label: string; units: Units; hex: HexId }[] = [
      { label: 'FR/HC vs BR/LN square (open)', units: [top('FR/HC', [3, 6]), bot('BR/LN', [4, 6])], hex: H(4, 6) },
      // on its own baseline the bounced cavalry cannot retreat: each flag costs it a block
      // supported cavalry would ignore a flag (two friends adjacent): a square's flags bounce it all the same
      { label: 'FR/HC vs BR/LN square (supported cavalry)', units: [top('FR/HC', [3, 6]), bot('BR/LN', [4, 6]), top('FR/LN', [3, 5]), top('FR/LN', [3, 7])], hex: H(4, 6) },
      { label: 'FR/HC vs BR/LN square (cavalry on its baseline)', units: [top('FR/HC', [0, 6], { blocks: 2 }), bot('BR/LN', [1, 6], { blocks: 2 })], hex: H(1, 6) },
    ];
    for (const c of cases) {
      const make = kit(c.units, { bottomCards: 4 });
      const s = make(1).state;
      const ec = ctx(s);
      const m = mOf(s, 'u1', c.hex);
      const stand = meleeBranch(s, unit(s, 'u1'), unit(s, 'u2'), m, 'stand', ec);
      const square = meleeBranch(s, unit(s, 'u1'), unit(s, 'u2'), m, 'formSquare', ec);
      expect(square.expHits).toBeLessThan(stand.expHits);
      expect(square.ev).toBeLessThan(stand.ev);
      // the cavalry rolls 1 die against the square
      const sq: Unit = { ...unit(s, 'u2'), square: 1 };
      expect(meleeDice(s, unit(s, 'u1'), sq, { role: 'attack', moved: 0, declared: true })).toBe(1);

      const first = squareFirstEstimate(s, unit(s, 'u1'), sq, ec);
      const hits = new Tally();
      const sqHits = new Tally();
      let elim = 0, bounce = 0, cavDead = 0, back = 0;
      sampleEngine(make, (d) => attack(d, 'u1', c.hex, { defend: 'formSquare' }), TRIALS, (es) => {
        hits.add(damageOf(es, 'u2', 'melee'));
        sqHits.add(damageOf(es, 'u1', 'square'));
        elim += happened(es, 'eliminated', 'u2');
        bounce += happened(es, 'retreat', 'u1');
        cavDead += happened(es, 'eliminated', 'u1');
        back += damageOf(es, 'u1', 'battle back');
      });
      near(`${c.label} hits`, square.expHits, hits.mean, seMean(hits.sd));
      near(`${c.label} pElim`, square.pElim, elim / TRIALS, se(square.pElim));
      near(`${c.label} square-first hits`, first.expHits, sqHits.mean, seMean(sqHits.sd));
      near(`${c.label} square-first bounce`, first.pBounce, bounce / TRIALS, se(first.pBounce));
      near(`${c.label} square-first eliminates`, first.pElim, cavDead / TRIALS, se(first.pElim));
      expect(square.backHits).toBeCloseTo(first.expHits, 10); // the square's roll is its only strike back
      expect(back).toBe(0); // no battle back after a square fought first (R29)
    }
  });

  it('an infantry defender forms square against heavy cavalry when standing costs more than a card held back', () => {
    const d = kit([top('FR/HC', [3, 6]), bot('BR/LN', [4, 6], { blocks: 2 })], { bottomCards: 4 })(1);
    const v = defendValue(d.state, toDefend(d), NEUTRAL_W);
    expect(v.formSquare).toBeGreaterThan(v.stand);
    expect(v.retireReform).toBe(-Infinity);
    expect(v.firstStrike).toBe(-Infinity);
    // a sound line against a worn light cavalry unit keeps its card and stands
    const d2 = kit([top('FR/LC', [3, 6], { blocks: 1 }), bot('BR/LN', [4, 6])], { bottomCards: 4 })(1);
    const v2 = defendValue(d2.state, toDefend(d2), NEUTRAL_W);
    expect(v2.stand).toBeGreaterThan(v2.formSquare);
    // the two differ by the combat and the square's cost (a card held back is the larger share of it)
    const s = d.state;
    const cost = squareCost(s, unit(s, 'u2'), occOf(s));
    expect(cost).toBeGreaterThan(CARD_VALUE / 3);
    expect(-v.stand).toBeGreaterThan(cost); // standing's expected loss exceeds the square's whole cost
  });

  it('a square that is destroyed returns its card at once: the cost is scaled by the chance it survives', () => {
    const units = (sq?: number): Units => [top('FR/HC', [3, 6]), bot('BR/LN', [4, 6], { blocks: 1, ...(sq ? { square: sq } : {}) })];
    const s1 = kit(units(), { bottomCards: 4 })(1).state;
    const s2 = kit(units(1), { bottomCards: 4 })(1).state;
    const formed = meleeBranch(s1, unit(s1, 'u1'), unit(s1, 'u2'), mOf(s1, 'u1', H(4, 6)), 'formSquare', ctx(s1));
    const already = meleeBranch(s2, unit(s2, 'u1'), unit(s2, 'u2'), mOf(s2, 'u1', H(4, 6)), 'stand', ctx(s2));
    expect(formed.pElim).toBeGreaterThan(0.2);
    expect(formed.pElim).toBeCloseTo(already.pElim, 12);
    expect(formed.ev - already.ev).toBeCloseTo(squareCost(s1, unit(s1, 'u2'), occOf(s1)) * (1 - formed.pElim), 10);
  });

  it('the square cost is temporary: lower when the cavalry threat will pass soon than with enemy cavalry massed nearby', () => {
    const base: Units = [top('FR/HC', [3, 6]), bot('BR/LN', [4, 6])];
    const massed: Units = [...base, top('FR/HC', [2, 4]), top('FR/LC', [2, 8]), top('FR/HC', [3, 3])];
    const sLone = kit(base, { bottomCards: 4 })(1).state;
    const sMass = kit(massed, { bottomCards: 4 })(1).state;
    for (const id of ['u3', 'u4', 'u5']) {
      const dd = distance(unit(sMass, id).hex, H(4, 6));
      expect(dd).toBeGreaterThan(1);
      expect(dd).toBeLessThanOrEqual(3);
    }
    const lone = squareCost(sLone, unit(sLone, 'u2'), occOf(sLone));
    const mass = squareCost(sMass, unit(sMass, 'u2'), occOf(sMass));
    expect(mass).toBeGreaterThan(lone * 1.5);
    const vLone = defendValue(sLone, toDefend(kit(base, { bottomCards: 4 })(1)), NEUTRAL_W);
    const vMass = defendValue(sMass, toDefend(kit(massed, { bottomCards: 4 })(1)), NEUTRAL_W);
    expect(vMass.formSquare).toBeLessThan(vLone.formSquare);
    expect(vMass.stand).toBeCloseTo(vLone.stand, 6); // standing is unaffected: only the square's duration changed
  });
});

describe('Retire and Reform', () => {
  it('a weak cavalry defender prefers Retire and Reform against infantry, and the R&R roll agrees with the engine', () => {
    const units: Units = [top('FR/LN', [3, 6]), bot('BR/LC', [4, 6], { blocks: 1 })];
    const d = kit(units)(1);
    const dec = toDefend(d);
    expect(dec.options).toEqual(['stand', 'retireReform']);
    const v = defendValue(d.state, dec, NEUTRAL_W);
    expect(v.retireReform).toBeGreaterThan(v.stand);
    // the opponent model expects it too
    expect(choices(kit(units)(1).state, 'top')).toEqual(['retireReform']);

    // the roll: all the attacker's dice, cavalry symbols only, no flags, no battle back; the hex is vacated either way
    for (const c of [
      { label: 'R&R 1 block', units },
      { label: 'R&R 2 blocks with a leader', units: [top('FR/LN', [3, 6]), bot('BR/LC', [4, 6], { blocks: 2 })], extra: { leaders: [{ side: 'bottom' as const, at: [4, 6] as [number, number] }] } },
    ]) {
      const make = kit(c.units, c.extra ?? {});
      const s = make(1).state;
      const o = meleeBranch(s, unit(s, 'u1'), unit(s, 'u2'), mOf(s, 'u1', H(4, 6)), 'retireReform', ctx(s));
      const hits = new Tally();
      let elim = 0, retired = 0, back = 0, offered = 0;
      sampleEngine(make, (dd) => attack(dd, 'u1', H(4, 6), { defend: 'retireReform' }), TRIALS, (es, met) => {
        hits.add(damageOf(es, 'u2', 'retire and reform'));
        elim += happened(es, 'eliminated', 'u2');
        retired += happened(es, 'retire', 'u2');
        back += damageOf(es, 'u1', 'battle back');
        offered += met.some((x) => x.kind === 'advance') ? 1 : 0;
      });
      near(`${c.label} hits`, o.expHits, hits.mean, seMean(hits.sd));
      near(`${c.label} pElim`, o.pElim, elim / TRIALS, se(o.pElim));
      near(`${c.label} retires`, o.pRetreat, retired / TRIALS, se(o.pRetreat));
      expect(o.pVacate).toBe(1);
      expect(back).toBe(0);
      expect(o.backHits).toBe(0);
      expect(offered).toBe(TRIALS); // the vacated hex is still taken
    }
  });
});

describe('take ground and breakthrough', () => {
  it('take ground and breakthrough are valued only where the engine allows them (afterMelee cross-check)', () => {
    const forest = { terrain: [{ at: [4, 6] as [number, number], t: 'forest' as const }] };
    const cases: { label: string; units: Units; extra?: Pos; prep?: (s: GameState) => void; allowed: boolean; bonus: boolean }[] = [
      { label: 'line takes ground', units: [top('FR/LN', [3, 6]), bot('BR/LN', [4, 6], { blocks: 2 })], allowed: true, bonus: false },
      { label: 'a gun never advances', units: [top('FR/FA', [3, 6]), bot('BR/LN', [4, 6], { blocks: 1 })], allowed: false, bonus: false },
      { label: 'not after entering a stop hex', units: [top('FR/LN', [3, 6]), bot('BR/LN', [4, 6], { blocks: 2 })], prep: (s) => void (s.turn.ordered.u1.stopEntered = true), allowed: false, bonus: false },
      { label: 'an infantry unit in square never advances', units: [top('FR/LN', [3, 6], { square: 1 }), bot('BR/LN', [4, 6], { blocks: 1 })], allowed: false, bonus: false },
      { label: 'cavalry breaks through to a bonus melee', units: [top('FR/HC', [3, 6]), bot('BR/LN', [4, 6], { blocks: 2 }), bot('BR/LN', [4, 7])], extra: { bottomCards: 2 }, allowed: true, bonus: true },
      { label: 'heavy cavalry in a forest: no bonus melee', units: [top('FR/HC', [3, 6]), bot('BR/LN', [4, 6], { blocks: 2 }), bot('BR/LN', [4, 7])], extra: { bottomCards: 2, ...forest }, allowed: true, bonus: false },
    ];
    for (const c of cases) {
      const make = kit(c.units, c.extra ?? {}, c.prep);
      const s = make(1).state;
      const ec = ctx(s);
      const tg = takeGround(s, unit(s, 'u1'), H(4, 6), ec);
      expect(tg.allowed, c.label).toBe(c.allowed);
      expect(tg.bonus, c.label).toBe(c.bonus);
      expect(tg.value > 0, c.label).toBe(c.allowed);
      const o = meleeEstimate(s, unit(s, 'u1'), H(4, 6), ec);
      let offered = 0, bonus = 0, vacated = 0;
      sampleEngine(make, (d) => attack(d, 'u1', H(4, 6)), TRIALS, (es, met) => {
        offered += met.some((x) => x.kind === 'advance') ? 1 : 0;
        bonus += met.some((x) => x.kind === 'bonusMelee') ? 1 : 0;
        vacated += happened(es, 'eliminated', 'u2') || happened(es, 'retreat', 'u2') ? 1 : 0;
      }, { answer: (d) => (d.pending?.kind === 'advance' ? { kind: 'yesno', yes: true } : undefined) });
      expect(vacated, c.label).toBeGreaterThan(TRIALS / 10);
      const pAdv = c.allowed ? o.pVacate : 0;
      near(`${c.label}: advance offered`, pAdv, offered / TRIALS, se(pAdv));
      const pBonus = c.bonus ? o.pVacate : 0;
      near(`${c.label}: bonus melee offered`, pBonus, bonus / TRIALS, se(pBonus));
    }
    // the estimate carries the value: the same attack is worth pVacate × the advance more when the attacker may follow up
    const free = kit(cases[0].units)(1).state;
    const stuck = kit(cases[0].units, {}, cases[0 + 2].prep)(1).state;
    const oFree = meleeEstimate(free, unit(free, 'u1'), H(4, 6), ctx(free));
    const oStuck = meleeEstimate(stuck, unit(stuck, 'u1'), H(4, 6), ctx(stuck));
    expect(oFree.ev - oStuck.ev).toBeCloseTo(oFree.pVacate * takeGround(free, unit(free, 'u1'), H(4, 6), ctx(free)).value, 10);
  });
});

describe('the assumed opponent hands', () => {
  it('makeEstCtx builds the assumed opponent hands once: 50 estimates, 2 assumeOppHand calls', () => {
    const s = kit([top('FR/HC', [3, 6]), bot('BR/LN', [4, 6]), bot('BR/LN', [4, 7])], { bottomCards: 4 })(1).state;
    const spy = vi.spyOn(view, 'assumeOppHand');
    try {
      const ec = makeEstCtx(s, 'top', NEUTRAL_W);
      for (let i = 0; i < 50; i++) meleeEstimate(s, unit(s, 'u1'), i % 2 ? H(4, 6) : H(4, 7), { ...ec, moved: i % 3 });
      expect(spy).toHaveBeenCalledTimes(2);
      expect(ec.oppHands?.pFS).toBeCloseTo(view.oppHoldsP(s, 'top', 'firstStrike'), 12);
    } finally {
      spy.mockRestore();
    }
  });

  it('the opponent reaction model never reads the real hand', () => {
    const make = kit([top('FR/HC', [3, 6]), bot('BR/LN', [4, 6]), bot('BR/LC', [4, 8], { blocks: 1 }), top('FR/LN', [3, 8])], { bottomCards: 4 });
    const s = make(1).state;
    const results = (): number[] => {
      const ec = makeEstCtx(s, 'top', NEUTRAL_W);
      return [meleeEstimate(s, unit(s, 'u1'), H(4, 6), ec).ev, meleeEstimate(s, unit(s, 'u4'), H(4, 8), ec).ev];
    };
    const before = results();
    // re-deal the defender's real hand from the same unseen pool: a First Strike in, the rest from the deck
    const p = s.players.bottom;
    const fs = s.deck.findIndex((c) => CARD_LIST[c] === 'firstStrike');
    expect(fs).toBeGreaterThanOrEqual(0);
    const old = [...p.hand];
    const fresh = [s.deck[fs], ...s.deck.filter((c, i) => i !== fs && CARD_LIST[c] !== 'firstStrike').slice(0, old.length - 1)];
    s.deck = [...s.deck.filter((c) => !fresh.includes(c)), ...old];
    p.hand = fresh;
    expect(results()).toEqual(before);
  });

  it('engine defend options for an opponent defender are asked only on the assumed hands, never on the real ones (M-8)', () => {
    // an infantry defender (square-eligible) and an R&R-eligible cavalry defender; the bottom player's real hand holds a
    // First Strike, so the live state would offer it
    const s = kit([top('FR/HC', [3, 6]), bot('BR/LN', [4, 6]), bot('BR/LC', [4, 8], { blocks: 1 }), top('FR/LN', [3, 8])], { bottomCards: 4 })(1).state;
    const p = s.players.bottom;
    const fs = s.deck.findIndex((c) => CARD_LIST[c] === 'firstStrike');
    [p.hand[0], s.deck[fs]] = [s.deck[fs], p.hand[0]];
    expect(defendOptions(s, mOf(s, 'u4', H(4, 8)))).toEqual(['stand', 'retireReform', 'firstStrike']);
    const ec = makeEstCtx(s, 'top', NEUTRAL_W);
    expect(ec.oppHands!.pFS).toBeGreaterThan(0);
    expect(ec.oppHands!.pFS).toBeLessThan(1);
    const spy = vi.spyOn(engineReactions, 'defendOptions');
    try {
      meleeEstimate(s, unit(s, 'u1'), H(4, 6), ec);
      meleeEstimate(s, unit(s, 'u4'), H(4, 8), ec);
      reactionOutcomes(s, mOf(s, 'u4', H(4, 8)), ec);
      const asked = spy.mock.calls.filter(([st, m]) => unitById(st, m.target)?.side === 'bottom');
      expect(asked.length).toBeGreaterThanOrEqual(4);
      for (const [st] of asked) {
        expect(st.players).not.toBe(s.players);
        expect(st.deck).not.toBe(s.deck);
      }
      const targets = new Set(asked.map(([, m]) => m.target));
      expect(targets).toEqual(new Set(['u2', 'u3']));
      // both assumed hands are asked, for each defender
      for (const id of ['u2', 'u3']) {
        const mine = asked.filter(([, m]) => m.target === id).map(([st]) => st.players);
        expect(mine).toContain(ec.oppHands!.holdsFS.players);
        expect(mine).toContain(ec.oppHands!.noFS.players);
      }
    } finally {
      spy.mockRestore();
    }
  });

  it('a context that is neither determinised nor built with the assumed hands is refused, not silently "stand"', () => {
    const s = kit([top('FR/HC', [3, 6]), bot('BR/LN', [4, 6])], { bottomCards: 4 })(1).state;
    // @ts-expect-error: a non-determinised context must carry oppHands (EstCtx is a union)
    const bad: EstCtx = { occ: occOf(s), W: NEUTRAL_W, viewer: 'top', moved: 0, role: 'attack', determinised: false };
    expect(() => meleeEstimate(s, unit(s, 'u1'), H(4, 6), bad)).toThrow(/oppHands/);
  });
});

/** What a defender's first roll (a square's or a First Strike) and the attacker's roll after it did, over engine trials. */
interface FirstTally {
  firstHits: Tally;
  driven: number;
  atkDead: number;
  hits: Tally;
  defDead: number;
  back: number;
  /** Trials in which the melee unit was driven off or destroyed by the first roll and yet the attacker's roll was made. */
  rolledAfterOff: number;
}
const firstTally = (): FirstTally => ({ firstHits: new Tally(), driven: 0, atkDead: 0, hits: new Tally(), defDead: 0, back: 0, rolledAfterOff: 0 });
/** Tally one trial: `reason` is the first roll's damage reason ('square' or 'first strike'). */
const tallyFirst = (t: FirstTally, es: GameEvent[], reason: string): void => {
  t.firstHits.add(damageOf(es, 'u1', reason));
  const off = happened(es, 'retreat', 'u1') || happened(es, 'eliminated', 'u1');
  t.driven += happened(es, 'retreat', 'u1');
  t.atkDead += happened(es, 'eliminated', 'u1');
  t.hits.add(damageOf(es, 'u2', 'melee'));
  t.defDead += happened(es, 'eliminated', 'u2');
  t.back += damageOf(es, 'u1', 'battle back');
  if (off && es.some((e) => e.t === 'combat' && (e.purpose === 'melee' || e.purpose === 'bonus'))) t.rolledAfterOff++;
};

describe('First Strike', () => {
  it('a strong infantry defender holding First Strike prefers it against a weak attacker, and the sequence agrees with the engine', () => {
    // FR/GR 4 blocks (top, holding First Strike) attacked by BR/LC 2 blocks: stand, square and First Strike are offered
    const gr: Units = [bot('BR/LC', [5, 6], { blocks: 2 }), top('FR/GR', [4, 6])];
    const holdFS = (s: GameState): void => void giveCard(s, 'top', 'firstStrike');
    const d = kit(gr, { first: 'bottom' }, holdFS)(1);
    const dec = toDefend(d);
    expect(dec.options).toEqual(['stand', 'formSquare', 'firstStrike']);
    const v = defendValue(d.state, dec, NEUTRAL_W);
    expect(v.firstStrike).toBeGreaterThan(v.stand);
    expect(v.firstStrike).toBeGreaterThan(v.formSquare);
    // the card counts against it: without its cost First Strike would win by more
    expect(firstStrikeCost(NEUTRAL_W)).toBeGreaterThan(0);

    // the sequence: the defender's roll first (normal dice, terrain, no cards), the attacker's recounted roll only if it is
    // still in place, no battle back. A second case leaves the attacker in place more often (the recount matters).
    for (const c of [
      { label: 'FS: FR/GR 4 vs BR/LC 2', units: gr },
      { label: 'FS: FR/LN 2 vs BR/LN 4', units: [bot('BR/LN', [5, 6]), top('FR/LN', [4, 6], { blocks: 2 })] as Units },
      { label: 'FS: FR/LN 3 in a forest vs BR/HC 4', units: [bot('BR/HC', [5, 6]), top('FR/LN', [4, 6], { blocks: 3 })] as Units, extra: { terrain: [{ at: [4, 6] as [number, number], t: 'forest' as const }] } },
    ]) {
      const make = kit(c.units, { first: 'bottom', ...(c.extra ?? {}) }, holdFS);
      const s = make(1).state;
      const ec = ctx(s, 'bottom');
      const o = meleeBranch(s, unit(s, 'u1'), unit(s, 'u2'), mOf(s, 'u1', H(4, 6)), 'firstStrike', ec);
      const f = firstStrikeEstimate(s, unit(s, 'u1'), unit(s, 'u2'), ec);
      const t = firstTally();
      sampleEngine(make, (dd) => attack(dd, 'u1', H(4, 6), { defend: 'firstStrike' }), TRIALS, (es) => tallyFirst(t, es, 'first strike'));
      near(`${c.label}: first-strike hits`, f.expHits, t.firstHits.mean, seMean(t.firstHits.sd));
      near(`${c.label}: attacker driven off`, f.pDriven, t.driven / TRIALS, se(f.pDriven));
      near(`${c.label}: attacker destroyed`, f.pElim, t.atkDead / TRIALS, se(f.pElim));
      near(`${c.label}: attacker's hits after it`, o.expHits, t.hits.mean, seMean(t.hits.sd));
      near(`${c.label}: defender destroyed`, o.pElim, t.defDead / TRIALS, se(o.pElim));
      expect(o.backHits).toBeCloseTo(f.expHits, 10); // its first roll is the defender's only strike
      expect(t.back).toBe(0); // no battle back after a First Strike (R63)
      expect(t.rolledAfterOff).toBe(0);
    }
  });

  it('the opponent First Strike risk scales with oppHoldsP outside simulations and follows the sampled hand inside them (determinised: true)', () => {
    // FR/LN 2 blocks attacks BR/GR 4 blocks: a defender holding the card strikes first (the worst for the attacker)
    const units: Units = [top('FR/LN', [3, 6], { blocks: 2 }), bot('BR/GR', [4, 6])];
    const branches = (s: GameState, ec: EstCtx) => {
      const m = mOf(s, 'u1', H(4, 6));
      return { stand: meleeBranch(s, unit(s, 'u1'), unit(s, 'u2'), m, 'stand', ec).ev, fs: meleeBranch(s, unit(s, 'u1'), unit(s, 'u2'), m, 'firstStrike', ec).ev };
    };
    let lastP = 0;
    let lastEv = Infinity;
    for (const cards of [1, 3, 6]) {
      const s = kit(units, { bottomCards: cards })(1).state;
      const ec = makeEstCtx(s, 'top', NEUTRAL_W);
      const b = branches(s, ec);
      expect(b.fs).toBeLessThan(b.stand - 0.1);
      const p = ec.oppHands!.pFS;
      expect(p).toBeCloseTo(view.oppHoldsP(s, 'top', 'firstStrike'), 12);
      expect(p).toBeGreaterThan(lastP);
      const e = meleeEstimate(s, unit(s, 'u1'), H(4, 6), ec).ev;
      expect(e).toBeCloseTo(p * b.fs + (1 - p) * b.stand, 10);
      expect(e).toBeLessThan(lastEv);
      lastP = p;
      lastEv = e;
    }
    // inside a simulation the sampled hand decides: First Strike exactly when the determinised clone holds the card
    const s = kit(units, { bottomCards: 6 })(1).state;
    let held = 0;
    let not = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const c = view.blindClone(s, 'top');
      view.determinize(c, 'top', new Rng(seed));
      const ec: EstCtx = { occ: occOf(c), W: NEUTRAL_W, viewer: 'top', cardValue: CARD_VALUE, moved: 0, role: 'attack', determinised: true };
      const holds = view.sampledOppHolds(c, 'top', 'firstStrike');
      const b = branches(c, ec);
      expect(meleeEstimate(c, unit(c, 'u1'), H(4, 6), ec).ev).toBeCloseTo(holds ? b.fs : b.stand, 12);
      if (holds) held++;
      else not++;
    }
    expect(held).toBeGreaterThan(0);
    expect(not).toBeGreaterThan(0);
  });

  it('the AI defender prices its reactions against the guns the defend decision says joined (M-8: d.artillery)', () => {
    // BR/LN attacks FR/LN (top, holding First Strike) with its gun BR/FA at range 2
    const units: Units = [bot('BR/LN', [5, 6]), top('FR/LN', [4, 6]), bot('BR/FA', [6, 5])];
    const make = kit(units, { first: 'bottom' }, (s) => void giveCard(s, 'top', 'firstStrike'), ['u1', 'u3']);
    /** The defend decision after `before` (e.g. the gun fires first) and the attack with `guns`. */
    const toDec = (guns: string[] | null, before?: (d: GameDriver) => void) => {
      const d = make(1);
      before?.(d);
      must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
      if (guns) must(d, { kind: 'select', ids: guns });
      expect(d.pending?.kind).toBe('defend');
      return { s: d.state, dec: d.pending as Extract<Decision, { kind: 'defend' }> };
    };
    const values = (s: GameState, guns: string[]) => {
      const ec: EstCtx = { ...makeEstCtx(s, 'top', NEUTRAL_W), moved: 0, role: 'attack' };
      return (c: DefendChoice): number => meleeBranch(s, unit(s, 'u1'), unit(s, 'u2'), mOf(s, 'u1', H(4, 6), 'attack', guns), c, ec).ev;
    };
    const cases: { label: string; guns: string[] | null; before?: (d: GameDriver) => void; priced: string[]; spent: boolean }[] = [
      { label: 'the gun joined', guns: ['u3'], priced: ['u3'], spent: true },
      { label: 'the gun was declined', guns: [], priced: [], spent: false },
      // the gun fired at the target first (every die misses), so it cannot join: no combinedArms decision at all
      { label: 'the gun fired earlier', guns: null, before: (d) => { forceDice(n('artillery', 3)); must(d, { kind: 'attack', unit: 'u3', target: H(4, 6) }); forceDice([]); }, priced: [], spent: true },
    ];
    for (const c of cases) {
      const { s, dec } = toDec(c.guns, c.before);
      expect(dec.artillery, c.label).toEqual(c.priced);
      // a joined gun and one that fired earlier are both spent: only the decision tells them apart
      expect(s.turn.ordered.u3.battled, c.label).toBe(c.spent);
      const v = defendValue(s, dec, NEUTRAL_W);
      const priced = values(s, c.priced);
      const withGun = values(s, ['u3']);
      for (const choice of ['stand', 'firstStrike'] as const) {
        expect(v[choice], `${c.label}: ${choice}`).toBeCloseTo(-priced(choice), 10);
        // the gun is worth pricing correctly: it moves each value by more than 0.1
        if (c.priced.length === 0) expect(withGun(choice), `${c.label}: ${choice}`).toBeGreaterThan(priced(choice) + 0.1);
      }
    }
  });
});

describe('Combined Arms', () => {
  // BR/LN (5,6) attacks FR/LN (4,6); BR/FA (6,5) is 2 hexes from the target with a clear line (3 range dice)
  const base: Units = [bot('BR/LN', [5, 6]), top('FR/LN', [4, 6]), bot('BR/FA', [6, 5])];
  const gunKit = (units: Units, extra: Pos = {}, prep?: (s: GameState) => void) => kit(units, { first: 'bottom', ...extra }, prep, ['u1', 'u3']);
  /** The gun's best battle of its own (fire at any target in range), the value it gives up by joining. */
  const shotOf = (s: GameState, ec: EstCtx): number => Math.max(0, ...battleTargetsOf(s, 'u3').map((h) => fireEstimate(s, unit(s, 'u3'), h, ec).ev));

  it('Combined Arms: bestGuns adds a gun only when it raises ev net of its own shot, and the dice agree with the engine', () => {
    const cases: { label: string; units: Units; extra?: Pos; join: boolean; required: boolean }[] = [
      { label: 'the target is the gun\'s only one', units: base, join: true, required: false },
      // a worn FR/LN at (4,4) in the gun's range: its own shot there (likely a banner) is worth more than the melee gains
      { label: 'a better target of its own', units: [...base, top('FR/LN', [4, 4], { blocks: 1 })], join: false, required: false },
      // a 1-block BR/LC attacking into a town has no dice of its own: the engine requires a gun, so it joins at a loss
      {
        label: 'no dice of its own (required)', units: [bot('BR/LC', [5, 6], { blocks: 1 }), top('FR/LN', [4, 6]), bot('BR/FA', [6, 5]), top('FR/LN', [4, 4], { blocks: 1 })],
        extra: { terrain: [{ at: [4, 6], t: 'town' }] }, join: true, required: true,
      },
    ];
    for (const c of cases) {
      const make = gunKit(c.units, c.extra);
      const s = make(1).state;
      const ec = ctx(s, 'bottom');
      const own = meleeDice(s, unit(s, 'u1'), unit(s, 'u2'), { role: 'attack', moved: 0, declared: true });
      expect(own < 1, c.label).toBe(c.required);
      const gain = meleeWithGuns(s, unit(s, 'u1'), H(4, 6), ['u3'], ec).ev - meleeWithGuns(s, unit(s, 'u1'), H(4, 6), [], ec).ev;
      const shot = shotOf(s, ec);
      expect(gain > shot, `${c.label}: gain ${gain.toFixed(3)} vs own shot ${shot.toFixed(3)}`).toBe(c.join && !c.required);
      expect(bestGuns(s, unit(s, 'u1'), H(4, 6), ec), c.label).toEqual(c.join ? ['u3'] : []);
      // meleeEstimate carries the chosen guns
      expect(meleeEstimate(s, unit(s, 'u1'), H(4, 6), ec).ev).toBeCloseTo(meleeWithGuns(s, unit(s, 'u1'), H(4, 6), c.join ? ['u3'] : [], ec).ev, 12);
      if (!c.join) continue;

      // the dice: the melee unit's and the gun's, rolled together and scored by the melee unit's row (engine cross-check)
      const o = meleeWithGuns(s, unit(s, 'u1'), H(4, 6), ['u3'], ec);
      const t = engineTrials(make, (d) => attack(d, 'u1', H(4, 6), { guns: ['u3'] }), TRIALS);
      near(`${c.label}: hits`, o.expHits, t.meanHits, seMean(t.sdHits));
      near(`${c.label}: pElim`, o.pElim, t.pElim, se(o.pElim));
      near(`${c.label}: pRetreat`, o.pRetreat, t.pRetreat, se(o.pRetreat));
      near(`${c.label}: back`, o.backHits, t.meanBack, seMean(t.sdBack));
    }

    // against Retire and Reform the gun's dice still roll, cavalry symbols only (R34, R40)
    const rr = gunKit([bot('BR/LN', [5, 6]), top('FR/LC', [4, 6], { blocks: 3 }), bot('BR/FA', [6, 5])]);
    const s = rr(1).state;
    const ec = ctx(s, 'bottom');
    const o = meleeBranch(s, unit(s, 'u1'), unit(s, 'u2'), mOf(s, 'u1', H(4, 6), 'attack', ['u3']), 'retireReform', ec);
    const alone = meleeBranch(s, unit(s, 'u1'), unit(s, 'u2'), mOf(s, 'u1', H(4, 6)), 'retireReform', ec);
    expect(o.expHits).toBeGreaterThan(alone.expHits + 0.3);
    const hits = new Tally();
    let elim = 0;
    sampleEngine(rr, (d) => attack(d, 'u1', H(4, 6), { guns: ['u3'], defend: 'retireReform' }), TRIALS, (es) => {
      hits.add(damageOf(es, 'u2', 'retire and reform'));
      elim += happened(es, 'eliminated', 'u2');
    });
    near('R&R with the gun: hits', o.expHits, hits.mean, seMean(hits.sd));
    near('R&R with the gun: pElim', o.pElim, elim / TRIALS, se(o.pElim));
  });

  it('Combined Arms dice are lost when a square fighting first bounces the cavalry (engine cross-check)', () => {
    // BR/HC attacks FR/LN, which forms square; the gun's 3 dice roll only if the cavalry is still in its hex. A second case:
    // a worn BR/LN with the gun, struck first by FR/GR's First Strike.
    for (const c of [
      { label: 'square bounces the cavalry', units: [bot('BR/HC', [5, 6]), top('FR/LN', [4, 6]), bot('BR/FA', [6, 5])] as Units, choice: 'formSquare' as const, reason: 'square', extra: { topCards: 5 } as Pos },
      { label: 'First Strike drives the melee unit off', units: [bot('BR/LN', [5, 6], { blocks: 2 }), top('FR/GR', [4, 6]), bot('BR/FA', [6, 5])] as Units, choice: 'firstStrike' as const, reason: 'first strike', prep: (s: GameState) => void giveCard(s, 'top', 'firstStrike') },
    ]) {
      const make = gunKit(c.units, c.extra ?? {}, c.prep);
      const s = make(1).state;
      const ec = ctx(s, 'bottom');
      const o = meleeBranch(s, unit(s, 'u1'), unit(s, 'u2'), mOf(s, 'u1', H(4, 6), 'attack', ['u3']), c.choice, ec);
      const noGun = meleeBranch(s, unit(s, 'u1'), unit(s, 'u2'), mOf(s, 'u1', H(4, 6)), c.choice, ec);
      const t = firstTally();
      sampleEngine(make, (dd) => attack(dd, 'u1', H(4, 6), { guns: ['u3'], defend: c.choice }), TRIALS, (es) => tallyFirst(t, es, c.reason));
      const off = (t.driven + t.atkDead) / TRIALS;
      expect(off, c.label).toBeGreaterThan(0.12); // the melee unit is often driven off: the lost dice matter
      expect(t.rolledAfterOff, c.label).toBe(0); // and then nobody rolls, the gun included (R40)
      near(`${c.label}: hits with the gun`, o.expHits, t.hits.mean, seMean(t.hits.sd));
      near(`${c.label}: defender destroyed`, o.pElim, t.defDead / TRIALS, se(o.pElim));
      // the guns' dice joined only the in-place states: rolling them always would overstate the hits by many SE
      const always = meleeWithGunsAlways(s, ec, c.choice);
      expect(always - o.expHits, c.label).toBeGreaterThan(6 * seMean(t.hits.sd));
      expect(o.expHits).toBeGreaterThan(noGun.expHits);
      expect(o.backHits).toBeCloseTo(noGun.backHits, 12); // the first roll is aimed at the melee unit only
    }
  });
});

describe('Combined Arms: spent guns and bounce flags', () => {
  it('a gun joined to the first melee is spent: the bonus-melee prospect does not add it again (M-3)', () => {
    // BR/HC with BR/FA (2,4) attacks a worn FR/LN; after breaking through, FR/LN (4,7) is a bonus target the gun could join
    const units: Units = [bot('BR/HC', [5, 6]), top('FR/LN', [4, 6], { blocks: 2 }), bot('BR/FA', [2, 4]), top('FR/LN', [4, 7])];
    const make = (prep?: (s: GameState) => void) => kit(units, { first: 'bottom', topCards: 2 }, prep, ['u1', 'u3']);
    const s = make()(1).state;
    const ec = ctx(s, 'bottom');
    const moved: Unit = { ...unit(s, 'u1'), hex: H(4, 6) };
    expect(bestGuns(s, moved, H(4, 7), { ...ec, role: 'bonus' })).toEqual(['u3']);
    expect(bestGuns(s, moved, H(4, 7), { ...ec, role: 'bonus', spentGuns: ['u3'] })).toEqual([]);
    const spent = takeGround(s, unit(s, 'u1'), H(4, 6), { ...ec, spentGuns: ['u3'] }).value;
    expect(spent).toBeLessThan(takeGround(s, unit(s, 'u1'), H(4, 6), ec).value - 0.1);
    // a melee with the gun prices its follow-up with the gun spent (the stuck attacker has no follow-up at all)
    const stuck = make((st) => void (st.turn.ordered.u1.stopEntered = true))(1).state;
    const free = meleeBranch(s, unit(s, 'u1'), unit(s, 'u2'), mOf(s, 'u1', H(4, 6), 'attack', ['u3']), 'stand', ec);
    const held = meleeBranch(stuck, unit(stuck, 'u1'), unit(stuck, 'u2'), mOf(stuck, 'u1', H(4, 6), 'attack', ['u3']), 'stand', ctx(stuck, 'bottom'));
    expect(free.ev - held.ev).toBeCloseTo(free.pVacate * spent, 10);
  });

  it("a square attacking cavalry rolls bounce flags, its gun's flags included (R30, engine cross-check)", () => {
    // BR/LN in square with BR/FA attacks FR/LC, which two friends support (it could ignore an ordinary flag)
    const units: Units = [bot('BR/LN', [5, 6], { square: 1 }), top('FR/LC', [4, 6], { blocks: 3 }), bot('BR/FA', [6, 5]), top('FR/LN', [4, 5]), top('FR/LN', [4, 7])];
    const make = kit(units, { first: 'bottom' }, undefined, ['u1', 'u3']);
    const s = make(1).state;
    const ec = ctx(s, 'bottom');
    for (const guns of [[], ['u3']]) {
      const o = meleeBranch(s, unit(s, 'u1'), unit(s, 'u2'), mOf(s, 'u1', H(4, 6), 'attack', guns), 'stand', ec);
      const t = engineTrials(make, (d) => attack(d, 'u1', H(4, 6), { guns }), TRIALS);
      const label = `square attacks cavalry${guns.length ? ' with a gun' : ''}`;
      near(`${label}: hits`, o.expHits, t.meanHits, seMean(t.sdHits));
      near(`${label}: pRetreat`, o.pRetreat, t.pRetreat, se(o.pRetreat));
      near(`${label}: pElim`, o.pElim, t.pElim, se(o.pElim));
      near(`${label}: back`, o.backHits, t.meanBack, seMean(t.sdBack));
      expect(o.pRetreat, label).toBeGreaterThan(0.1);
    }
  });
});

/** The engine's targets of the gun `id` (its fire hexes). */
const battleTargetsOf = (s: GameState, id: string): HexId[] => battleTargets(s, id).map((t) => t.hex);

/**
 * The naive count the lost-dice rule forbids: the gun's expected hits added to every trial, as if its dice rolled even after
 * the melee unit was driven off (its odds are the melee unit's, R41).
 */
function meleeWithGunsAlways(s: GameState, ec: EstCtx, choice: DefendChoice): number {
  const noGun = meleeBranch(s, unit(s, 'u1'), unit(s, 'u2'), mOf(s, 'u1', H(4, 6)), choice, ec);
  const target: Unit = choice === 'formSquare' ? { ...unit(s, 'u2'), square: 1 } : unit(s, 'u2');
  const gun = artilleryShares(s, mOf(s, 'u1', H(4, 6), 'attack', ['u3'])).reduce((a, g) => a + g.dice, 0);
  const odds = dieOdds('melee', statsOf(s, unit(s, 'u1')), statsOf(s, target).arm);
  return noGun.expHits + gun * odds.hit;
}

describe('Task 3 carry-overs', () => {
  it('near victory the leader term is dropped when the elimination wins (the engine stops before the casualty check)', () => {
    const units: Units = [top('FR/LN', [3, 6]), bot('BR/LN', [4, 6], { blocks: 1 })];
    const lead = { leaders: [{ side: 'bottom' as const, at: [4, 6] as [number, number] }] };
    const evOf = (extra: Pos): number => {
      const s = kit(units, extra)(1).state;
      return meleeEstimate(s, unit(s, 'u1'), H(4, 6), ctx(s)).ev;
    };
    const far = evOf(lead) - evOf({});
    const nearWin = evOf({ ...lead, banners: 1 }) - evOf({ banners: 1 });
    expect(far).toBeGreaterThan(0);
    expect(nearWin).toBeLessThan(far - 0.05);
    // the engine: with the winning elimination forced, no leader is ever killed
    const make = kit(units, { ...lead, banners: 1 });
    const t = engineTrials(make, (d) => attack(d, 'u1', H(4, 6)), 500, (d) => forceDice(n('infantry', 5)));
    expect(t.pElim).toBe(1);
    expect(t.leaderKilled).toBe(0);
  });

  it('a stranded leader (his unit eliminated, or a lone leader beaten in melee) risks his escape rolls (engine cross-check)', () => {
    // the bottom leader's two rear hexes hold French units: every way out is an escape through one of them
    const target = H(4, 6);
    const rear = rearHexes(target, 'bottom');
    expect(rear).toHaveLength(2);
    const blockers: Units = rear.map((h) => top('FR/LN', at(h)));
    const lone = kit([top('FR/LN', [3, 6]), ...blockers], { leaders: [{ side: 'bottom', at: [4, 6] }] });
    const s = lone(1).state;
    const risk = leaderAloneRisk(s, s.leaders[0]);
    expect(risk.offBoard).toBe(false);
    const dice = meleeDice(s, unit(s, 'u1'), s.leaders[0], { role: 'attack', moved: 0, declared: true });
    const t = engineTrials(lone, (d) => attack(d, 'u1', target), TRIALS, () => forceDice(n('infantry', dice)));
    near('lone leader escapes', risk.pDie, t.leaderKilled, se(risk.pDie));
    // loneLeaderEstimate prices the escape: a trapped leader is worth more to attack than one with a free way back
    const free = kit([top('FR/LN', [3, 6])], { leaders: [{ side: 'bottom', at: [4, 6] }] })(1).state;
    expect(loneLeaderEstimate(s, unit(s, 'u1'), target, ctx(s)).ev).toBeGreaterThan(loneLeaderEstimate(free, unit(free, 'u1'), target, ctx(free)).ev + 0.1);

    // his unit eliminated: the casualty check (1 die), then the same escape
    const withUnit = kit([top('FR/LN', [3, 6]), ...blockers, bot('BR/LN', [4, 6], { blocks: 1 })], { leaders: [{ side: 'bottom', at: [4, 6] }] });
    const s2 = withUnit(1).state;
    const r2 = leaderAloneRisk(s2, s2.leaders[0]);
    const model = leaderCheckP(true) + (1 - leaderCheckP(true)) * r2.pDie;
    const d2 = meleeDice(s2, unit(s2, 'u1'), unit(s2, 'u4'), { role: 'attack', moved: 0, declared: true });
    const t2 = engineTrials(withUnit, (d) => attack(d, 'u1', target), TRIALS, () => forceDice(n('infantry', d2)));
    expect(t2.pElim).toBe(1);
    near('leader after his unit is eliminated', model, t2.leaderKilled, se(model));
  });

  it('militia retreat 3 hexes per flag: the estimate agrees with the engine in the open and near the baseline', () => {
    for (const c of [
      { label: 'militia in the open', units: [top('FR/LN', [3, 6]), bot('PT/ML', [4, 6])], hex: H(4, 6) },
      { label: 'militia a row from its baseline', units: [top('FR/LN', [6, 6]), bot('PT/ML', [7, 6])], hex: H(7, 6) },
    ] as { label: string; units: Units; hex: HexId }[]) {
      const make = kit(c.units);
      const s = make(1).state;
      const o = meleeEstimate(s, unit(s, 'u1'), c.hex, ctx(s));
      const t = engineTrials(make, (d) => attack(d, 'u1', c.hex), TRIALS);
      near(`${c.label} hits`, o.expHits, t.meanHits, seMean(t.sdHits));
      near(`${c.label} pElim`, o.pElim, t.pElim, se(o.pElim));
      near(`${c.label} pRetreat`, o.pRetreat, t.pRetreat, se(o.pRetreat));
      near(`${c.label} back`, o.backHits, t.meanBack, seMean(t.sdBack));
    }
  });

  it('neighbours of the target are what the bonus prospect reads', () => {
    // a guard on the helper: the bonus-melee case above relies on (4,7) touching (4,6)
    expect(neighbours(H(4, 6))).toContain(H(4, 7));
  });
});

describe('the viewer\'s own hand prices its squares (Task 6b carry)', () => {
  it('makeEstCtx computes cardValue once per root: the mean keep value of the viewer\'s own hand', () => {
    const s = kit([top('FR/HC', [3, 6]), bot('BR/LN', [4, 6])])(1).state;
    for (const viewer of ['top', 'bottom'] as const) {
      const ec = makeEstCtx(s, viewer, NEUTRAL_W);
      expect(ec.cardValue).toBeCloseTo(meanHandValue(s, viewer, NEUTRAL_W), 12);
    }
    // 50 estimates read it, none recompute it
    const ec = makeEstCtx(s, 'bottom', NEUTRAL_W);
    const spy = vi.spyOn(view, 'myHand');
    for (let i = 0; i < 50; i++) meleeEstimate(s, unit(s, 'u1'), H(4, 6), ec);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('a square the viewer would form costs its card at cardValue; an enemy square stays at CARD_VALUE (its hand is never read)', () => {
    const s = kit([top('FR/HC', [3, 6]), bot('BR/LN', [4, 6])], { bottomCards: 4 })(1).state;
    const m = mOf(s, 'u1', H(4, 6));
    const evOf = (viewer: 'top' | 'bottom', cardValue: number): number => meleeBranch(s, unit(s, 'u1'), unit(s, 'u2'), m, 'formSquare', { ...ctx(s, viewer), cardValue }).ev;
    // the defender (bottom) is the viewer: its card is worth what the viewer's hand says
    const mine = evOf('bottom', 0.9) - evOf('bottom', 0.1);
    expect(mine).toBeCloseTo(squareCost(s, unit(s, 'u2'), occOf(s), 0.9) - squareCost(s, unit(s, 'u2'), occOf(s), 0.1), 10);
    expect(Math.abs(mine)).toBeGreaterThan(0.05);
    // the viewer is the attacker: the defender's cost ignores cardValue
    expect(evOf('top', 0.9)).toBeCloseTo(evOf('top', 0.1), 12);
  });

  it('the evaluation prices only the viewer\'s own squares with cardValue', () => {
    const s = build({ units: [top('FR/LN', [1, 2], { square: 1 }), bot('BR/LN', [7, 6], { square: 1 })] });
    const base = makeEstCtx(s, 'bottom', NEUTRAL_W);
    const dear = { ...base, cardValue: 0.9 };
    const cheap = { ...base, cardValue: 0.1 };
    const a = evalTerms(s, 'bottom', NEUTRAL_W, dear).squares;
    const b = evalTerms(s, 'bottom', NEUTRAL_W, cheap).squares;
    // mine (bottom) is dearer, the enemy's (top) unchanged: the term falls by exactly my square's difference
    expect(b - a).toBeCloseTo(squareHoldCost(s, unit(s, 'u2'), 0.9) - squareHoldCost(s, unit(s, 'u2'), 0.1), 10);
    // from the other side's view the same square is the enemy's and ignores that viewer's cardValue
    const topBase = makeEstCtx(s, 'top', NEUTRAL_W);
    const t1 = evalTerms(s, 'top', NEUTRAL_W, { ...topBase, cardValue: 0.9 }).squares;
    const t2 = evalTerms(s, 'top', NEUTRAL_W, { ...topBase, cardValue: 0.1 }).squares;
    expect(t2 - t1).toBeCloseTo(squareHoldCost(s, unit(s, 'u1'), 0.9) - squareHoldCost(s, unit(s, 'u1'), 0.1), 10);
  });
});
