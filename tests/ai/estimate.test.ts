import { describe, expect, it } from 'vitest';
import {
  fireDice, forceDice, forcedDiceLeft, meleeDice, neighbours, rearHexes, unitById,
  type GameDriver, type GameState, type Unit,
} from '../../src/engine';
import { occOf } from '../../src/ai/board';
import { NEUTRAL_W } from '../../src/ai/values';
import { flagOutcome, fireEstimate, leaderCheckP, loneLeaderEstimate, makeEstCtx, meleeEstimate, type EstCtx, type Outcome } from '../../src/ai/estimate';
import { H, attack, build, n, toBattle, type Pos } from '../rules/helpers';
import { engineTrials, type Trials } from './helpers';
import { failOnAiErrors } from './no-ai-errors';

failOnAiErrors();

type Units = NonNullable<Pos['units']>;
const kit = (units: Units, extra: Pos = {}) => (seed: number): GameDriver => {
  void seed;
  return toBattle(build({ first: 'top', ...extra, units }), 'attackC', ['u1']);
};
/**
 * The attacker's estimate context, told the defender holds no First Strike: the kit's positions strip it from both hands
 * (tests/rules/helpers `play`), so the engine's defender always stands and the model must price the same reaction.
 */
const ctxOf = (s: GameState): EstCtx => {
  const ec = makeEstCtx(s, s.active, NEUTRAL_W);
  return ec.determinised ? ec : { ...ec, oppHands: { ...ec.oppHands, pFS: 0 } };
};
const unit = (s: GameState, id: string): Unit => unitById(s, id)!;

const TRIALS = 4000;
const se = (p: number, k = TRIALS) => Math.sqrt(Math.max(p * (1 - p), 1e-4) / k);
const near = (label: string, model: number, seen: number, sigma: number): void => {
  if (import.meta.env.VITE_AI_VERBOSE) console.info(`${label}: model ${model.toFixed(4)} engine ${seen.toFixed(4)} (SE ${sigma.toFixed(4)}, z ${((model - seen) / sigma).toFixed(2)})`);
  expect(Math.abs(model - seen), `${label}: model ${model.toFixed(4)} vs engine ${seen.toFixed(4)} (3 SE = ${(3 * sigma).toFixed(4)})`).toBeLessThanOrEqual(3 * sigma);
};

/** Model against the engine over `TRIALS` resolutions of u1 attacking the unit on `hex`. */
function agree(label: string, units: Units, hex: number, how: 'fire' | 'melee', extra: Pos = {}, k = TRIALS): { o: Outcome; t: Trials } {
  const make = kit(units, extra);
  const s = make(1).state;
  const ec = ctxOf(s);
  const o = how === 'fire' ? fireEstimate(s, unit(s, 'u1'), hex, ec) : meleeEstimate(s, unit(s, 'u1'), hex, ec);
  const t = engineTrials(make, (d) => attack(d, 'u1', hex), k);
  near(`${label} hits`, o.expHits, t.meanHits, Math.max(t.sdHits, 0.2) / Math.sqrt(k));
  near(`${label} pElim`, o.pElim, t.pElim, se(o.pElim, k));
  near(`${label} pRetreat`, o.pRetreat, t.pRetreat, se(o.pRetreat, k));
  if (how === 'melee') near(`${label} back`, o.backHits, t.meanBack, Math.max(t.sdBack, 0.2) / Math.sqrt(k));
  else expect(t.meanBack).toBe(0);
  return { o, t };
}

const top = (key: Units[number]['key'], at: [number, number], extra: object = {}) => ({ side: 'top' as const, key, at, ...extra });
const bot = (key: Units[number]['key'], at: [number, number], extra: object = {}) => ({ side: 'bottom' as const, key, at, ...extra });

describe('estimate against the engine', () => {
  it('fire estimate agrees with 4000 engine resolutions within 3 standard errors', () => {
    agree('FR/LN at range 2', [top('FR/LN', [2, 6]), bot('BR/LN', [4, 6])], H(4, 6), 'fire');
    agree('FR/FA at range 3', [top('FR/FA', [1, 6]), bot('BR/LN', [4, 6])], H(4, 6), 'fire');
  });

  it('melee estimate (with battle back) agrees with the engine', () => {
    const a = agree('FR/LN vs BR/LN', [top('FR/LN', [3, 6]), bot('BR/LN', [4, 6])], H(4, 6), 'melee');
    expect(a.o.backHits).toBeGreaterThan(0);
    const b = agree('FR/GR vs PT/LN in a town', [top('FR/GR', [3, 6]), bot('PT/LN', [4, 6])], H(4, 6), 'melee', { terrain: [{ at: [4, 6], t: 'town' }] });
    const open = agree('FR/GR vs PT/LN in the open', [top('FR/GR', [3, 6]), bot('PT/LN', [4, 6])], H(4, 6), 'melee', {}, 1000);
    expect(b.o.expHits).toBeLessThan(open.o.expHits);
  });

  it('the Cuirassier hit-ignore matches the engine', () => {
    const units = [top('BR/LN', [2, 6]), bot('FR/CU', [4, 6])];
    const { o } = agree('infantry fire at CU', units, H(4, 6), 'fire');
    const s = kit(units)(1).state;
    const dice = fireDice(s, unit(s, 'u1'), H(4, 6), { role: 'attack', moved: 0 });
    // without the ignore the mean would be dice · 1/6 (the cavalry face only); the ignore takes visibly more off
    expect(o.expHits).toBeLessThan(dice / 6 - 0.1);
  });
});

describe('flags and retreats', () => {
  it('a blocked retreat turns flags into losses', () => {
    const s = build({ first: 'top', units: [top('FR/LN', [7, 6]), bot('BR/LN', [8, 6])] });
    const baseline = flagOutcome(s, unit(s, 'u2'), unit(s, 'u1'), 1);
    expect(baseline).toMatchObject({ lost: 1, vacates: false });

    const front = H(5, 6);
    const rear = rearHexes(front, 'bottom');
    const friends: Units = rear.map((h, i) => bot('BR/LN', [Math.floor(h / 13), h % 13], { id: `f${i}` }));
    const boxed = build({ first: 'top', units: [top('FR/LN', [4, 6]), bot('BR/LN', [5, 6]), ...friends] });
    // the friends behind also support it (one flag ignored), so two flags leave one accepted
    const stuck = flagOutcome(boxed, unit(boxed, 'u2'), unit(boxed, 'u1'), 2);
    expect(stuck.lost).toBeGreaterThan(0);
    expect(stuck.vacates).toBe(false);

    const free = build({ first: 'top', units: [top('FR/LN', [4, 6]), bot('BR/LN', [5, 6])] });
    expect(flagOutcome(free, unit(free, 'u2'), unit(free, 'u1'), 1)).toMatchObject({ lost: 0, vacates: true });
    // the estimate prices it, and the engine agrees on the baseline defender
    const edge = [top('FR/LN', [7, 6]), bot('BR/LN', [8, 6])];
    const { o: a } = agree('defender on its baseline', edge, H(8, 6), 'melee');
    const sf = kit([top('FR/LN', [4, 6]), bot('BR/LN', [5, 6])])(1).state;
    const b = meleeEstimate(sf, unit(sf, 'u1'), H(5, 6), ctxOf(sf));
    expect(a.pElim).toBeGreaterThan(b.pElim);
    expect(a.pRetreat).toBe(0);
    expect(b.pRetreat).toBeGreaterThan(0);
  });

  it('flag ignores from support and a leader lower pRetreat', () => {
    const target = H(4, 6);
    const attackerHex = H(3, 6);
    const rear = new Set(rearHexes(target, 'bottom'));
    const sides = neighbours(target).filter((h) => h !== attackerHex && !rear.has(h)).slice(0, 2);
    const at = (h: number): [number, number] => [Math.floor(h / 13), h % 13];
    const lone: Units = [top('FR/LN', [3, 6]), bot('BR/LN', at(target))];
    const backed: Units = [...lone, ...sides.map((h) => bot('BR/LN', at(h)))];
    const sLone = kit(lone)(1).state;
    const sBack = kit(backed)(1).state;
    const eLone = meleeEstimate(sLone, unit(sLone, 'u1'), target, ctxOf(sLone));
    const eBack = meleeEstimate(sBack, unit(sBack, 'u1'), target, ctxOf(sBack));
    expect(eBack.pRetreat).toBeLessThan(eLone.pRetreat);
    expect(flagOutcome(sBack, unit(sBack, 'u2'), unit(sBack, 'u1'), 1)).toMatchObject({ lost: 0, vacates: false }); // supportCount 2 → engine flagIgnores 1
    const withLeader = kit(lone, { leaders: [{ side: 'bottom', at: at(target) }] })(1).state;
    const eLead = meleeEstimate(withLeader, unit(withLeader, 'u1'), target, ctxOf(withLeader));
    expect(eLead.pRetreat).toBeLessThan(eLone.pRetreat);
    // and the engine agrees on the supported case
    const t = engineTrials(kit(backed), (d) => attack(d, 'u1', target), TRIALS);
    near('supported pRetreat', eBack.pRetreat, t.pRetreat, se(eBack.pRetreat));
  });
});

describe('leaders', () => {
  it('leaderCheckP matches engine sampling of leaderCasualtyCheck', () => {
    const units: Units = [top('FR/LN', [3, 6]), bot('BR/LN', [4, 6])];
    const withLeader = (blocks: number) => kit([units[0], bot('BR/LN', [4, 6], { blocks })], { leaders: [{ side: 'bottom', at: [4, 6] }] });
    const run = (blocks: number, hits: number, k: number): number => {
      const make = withLeader(blocks);
      return engineTrials(make, (d) => attack(d, 'u1', H(4, 6)), k, (d) => {
        const dice = meleeDice(d.state, unit(d.state, 'u1'), unit(d.state, 'u2'), { role: 'attack', moved: 0, declared: true });
        forceDice([...n('infantry', hits), ...n('cavalry', dice - hits)]); // the queue runs out; the checks use the game RNG
      }).leaderKilled;
    };
    const k = 3000;
    const survive = run(4, 1, k);
    near('leader after a hit', leaderCheckP(false), survive, se(leaderCheckP(false), k));
    const eliminated = run(2, 2, k);
    near('leader after an elimination', leaderCheckP(true), eliminated, se(leaderCheckP(true), k));
  });

  it('a lone leader dies to any sabre: loneLeaderEstimate follows the engine dice', () => {
    const s = kit([top('FR/LN', [3, 6])], { leaders: [{ side: 'bottom', at: [4, 6] }] })(1).state;
    const o = loneLeaderEstimate(s, unit(s, 'u1'), H(4, 6), ctxOf(s));
    const dice = meleeDice(s, unit(s, 'u1'), s.leaders[0], { role: 'attack', moved: 0, declared: true });
    expect(o.pElim).toBeCloseTo(1 - (5 / 6) ** dice, 10);
    expect(o.pVacate).toBeCloseTo(1, 10);
    expect(o.ev).toBeGreaterThan(0);
  });
});

describe('value', () => {
  it('a worn attacker (1 block) has lower ev than at full strength against the same target', () => {
    const evOf = (blocks: number): number => {
      const s = kit([top('FR/LN', [3, 6], { blocks }), bot('BR/LN', [4, 6])])(1).state;
      return meleeEstimate(s, unit(s, 'u1'), H(4, 6), ctxOf(s)).ev;
    };
    expect(evOf(1)).toBeLessThan(evOf(4));
  });

  it('ev is the damage dealt less the expected battle back', () => {
    const s = kit([top('FR/LN', [3, 6]), bot('BR/LN', [4, 6])])(1).state;
    const o = meleeEstimate(s, unit(s, 'u1'), H(4, 6), ctxOf(s));
    expect(o.backLoss).toBeGreaterThan(0);
    expect(o.pVacate).toBeCloseTo(o.pElim + o.pRetreat, 10);
    expect(o.ev).toBeGreaterThan(-o.backLoss);
  });

  it('estimates never consume game RNG or forced dice', () => {
    const s = kit([top('FR/LN', [3, 6]), bot('BR/LN', [4, 6])], { leaders: [{ side: 'bottom', at: [4, 6] }] })(1).state;
    forceDice(n('infantry', 5));
    const calls = s.rngCalls;
    const ec = ctxOf(s);
    meleeEstimate(s, unit(s, 'u1'), H(4, 6), ec);
    fireEstimate(s, unit(s, 'u1'), H(4, 6), ec);
    flagOutcome(s, unit(s, 'u2'), unit(s, 'u1'), 2);
    expect(s.rngCalls).toBe(calls);
    expect(forcedDiceLeft()).toBe(5);
    forceDice([]);
  });
});
