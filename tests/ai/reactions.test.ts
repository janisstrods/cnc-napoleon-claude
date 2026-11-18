// The defender's reaction model (src/ai/reactions.ts) and the melee estimate built on it: squares, Retire and Reform, take
// ground and breakthrough, and the Task 3 carry-overs (leaders near victory, stranded leaders, militia retreats). Every
// sanctioned approximation is cross-checked against seeded engine resolutions (within 3 standard errors).
import { describe, expect, it, vi } from 'vitest';
import {
  CARD_LIST, distance, forceDice, meleeDice, neighbours, rearHexes, unitById,
  type Decision, type DefendChoice, type GameDriver, type GameEvent, type GameState, type HexId, type MeleeCtx, type Unit,
} from '../../src/engine';
import { defendOptions } from '../../src/engine/reactions';
import * as view from '../../src/ai/view';
import { occOf } from '../../src/ai/board';
import { NEUTRAL_W, CARD_VALUE } from '../../src/ai/values';
import {
  leaderAloneRisk, leaderCheckP, loneLeaderEstimate, makeEstCtx, meleeBranch, meleeEstimate, squareFirstEstimate, takeGround,
  type EstCtx,
} from '../../src/ai/estimate';
import { bestGuns, defendValue, reactionOutcomes, squareCost } from '../../src/ai/reactions';
import { H, attack, build, must, n, toBattle, type Pos } from '../rules/helpers';
import { engineTrials, sampleEngine } from './helpers';
import { failOnAiErrors } from './no-ai-errors';

failOnAiErrors();

type Units = NonNullable<Pos['units']>;
const top = (key: Units[number]['key'], at: [number, number], extra: object = {}) => ({ side: 'top' as const, key, at, ...extra });
const bot = (key: Units[number]['key'], at: [number, number], extra: object = {}) => ({ side: 'bottom' as const, key, at, ...extra });
/** Top (the French) attacks with u1 from the battle decision; `prep` adjusts the driver's state. */
const kit = (units: Units, extra: Pos = {}, prep?: (s: GameState) => void) => (seed: number): GameDriver => {
  void seed;
  const d = toBattle(build({ first: 'top', ...extra, units }), 'attackC', ['u1']);
  prep?.(d.state);
  return d;
};
const unit = (s: GameState, id: string): Unit => unitById(s, id)!;
const at = (h: HexId): [number, number] => [Math.floor(h / 13), h % 13];
const mOf = (s: GameState, attacker: string, hex: HexId, role: 'attack' | 'bonus' = 'attack'): MeleeCtx => ({
  attacker, target: occOf(s).unit[hex]!.id, targetHex: hex, role, artillery: [], reaction: null, declaredMoved: 0,
});
const ctx = (s: GameState, viewer: 'top' | 'bottom' = 'top'): EstCtx => makeEstCtx(s, viewer, NEUTRAL_W);
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

  it('the interface is frozen: bestGuns returns no guns until Task 4b, and First Strike is never the cheaper defence', () => {
    const s = kit([top('FR/LN', [3, 6]), bot('BR/LN', [4, 6])])(1).state;
    expect(bestGuns(s, unit(s, 'u1'), H(4, 6), ctx(s))).toEqual([]);
    const m = mOf(s, 'u1', H(4, 6));
    const fsO = meleeBranch(s, unit(s, 'u1'), unit(s, 'u2'), m, 'firstStrike', ctx(s));
    const st = meleeBranch(s, unit(s, 'u1'), unit(s, 'u2'), m, 'stand', ctx(s));
    expect(fsO.ev).toBeGreaterThan(st.ev); // the card is spent and (until 4b) strikes nothing
  });
});

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
