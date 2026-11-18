// The AI and the Expansion #1 objectives and battle rules (Plan 7C Task 20; RR §15.8, §16): pulls towards tempAny, majority and
// exitEdge objectives, the held-banner threat of a majority, and the banner value of an elimination under suddenDeath,
// breakOnLosses and handShrink. Positions are the real battles' setups with a few units moved or removed.
import { describe, expect, it } from 'vitest';
import {
  GameDriver, OFF_BOARD, bannerTotal, cloneState, createGame, distance, rowOf, hexId, neighbours, sectionsOf, type Answer, type CardKind, type GameState, type HexId, type Side,
} from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { occOf } from '../../src/ai/board';
import { evalTerms, objectiveHexes } from '../../src/ai/evaluate';
import { bannerValue, eliminationWins, fireEstimate, loneLeaderEstimate, makeEstCtx } from '../../src/ai/estimate';
import { makeBudget } from '../../src/ai/budget';
import { greedyMoveStep, type MoveCtx } from '../../src/ai/moves';
import { pieceBenefits } from '../../src/ai/ordering';
import { Rng } from '../../src/ai/rand';
import { CARD_VALUE, NEUTRAL_W, bannerStep, bannerScore, bannersWorth, unitValue } from '../../src/ai/values';
import { build, giveCard, must, noFirstStrike } from '../rules/helpers';
import { failOnAiErrors } from './no-ai-errors';

failOnAiErrors();

const W = NEUTRAL_W;
const H = (r: number, c: number): HexId => hexId(r, c);

/** Battle `id` at its setup (seed 1). */
const real = (id: string): GameState => createGame(scenarioById(id).setup, 1);

/** Keep only the units `ids` (and the leaders standing with them), each moved to its hex when one is given. */
function keep(s: GameState, ids: Record<string, HexId | null>): GameState {
  const was = new Map(s.units.map((u) => [u.id, u.hex]));
  s.units = s.units.filter((u) => u.id in ids);
  s.leaders = s.leaders.filter((l) => s.units.some((u) => was.get(u.id) === l.hex && u.side === l.side));
  for (const u of s.units) {
    const to = ids[u.id];
    if (to === null || to === undefined) continue;
    for (const l of s.leaders) if (l.hex === u.hex && l.side === u.side) l.hex = to;
    u.hex = to;
  }
  return s;
}

/** `side`'s move decision with `id` ordered by the Attack card of its section. */
function atMove(s: GameState, side: Side, id: string): GameDriver {
  s.active = side;
  noFirstStrike(s);
  const u = s.units.find((x) => x.id === id)!;
  const sec = sectionsOf(u.hex, side)[0];
  const kind = (`attack${sec === 'left' ? 'L' : sec === 'center' ? 'C' : 'R'}`) as CardKind;
  const card = giveCard(s, side, kind);
  const d = new GameDriver(s);
  must(d, { kind: 'playCard', card });
  if (d.pending?.kind === 'orders') must(d, { kind: 'orders', pieces: [id] });
  while (d.pending?.kind === 'leaveSquare') must(d, { kind: 'yesno', yes: false });
  if (d.pending?.kind !== 'move') throw new Error(`no move decision: ${d.pending?.kind}`);
  return d;
}

const mcOf = (s: GameState, me: Side): MoveCtx => ({ me, W, occ: occOf(s), style: 'base', rand: new Rng(7), budget: makeBudget(1_000_000, null, null) });

/** Where `id` ends after the greedy move step (OFF_BOARD when it steps off). */
function moveOf(s: GameState, me: Side, id: string): HexId {
  const a: Answer = greedyMoveStep(s, mcOf(s, me));
  return a.kind === 'move' && a.piece === id ? a.to : s.units.find((u) => u.id === id)!.hex;
}

const nearestEnemy = (s: GameState, side: Side, h: HexId): number =>
  Math.min(99, ...s.units.filter((u) => u.side !== side).map((u) => distance(u.hex, h)));

describe('the carry from Task 5: the evaluation sees the Expansion #1 objectives', () => {
  it('117: the three Spanish banners held at the start count in the banners term; their hills are objective hexes', () => {
    const s = real('117');
    expect(s.special.objState.filter((x) => x.held)).toHaveLength(3);
    const T = s.bannersToWin;
    // each held group counts at the chance it is kept: well above two banner steps, at most three
    const banners = evalTerms(s, 'top', W).banners;
    expect(banners).toBeGreaterThan(0.8 * bannerScore(3, T));
    expect(banners).toBeLessThanOrEqual(bannerScore(3, T) + 1e-9);
    expect(evalTerms(s, 'bottom', W).banners).toBeCloseTo(-banners, 9);
    const groups = s.scenario.objectives.flatMap((o) => (o.kind === 'majority' && o.side === 'top' ? o.hexes : []));
    expect(groups).toHaveLength(19);
    expect(new Set(objectiveHexes(s, 'top'))).toEqual(new Set(groups));
  });

  it('115: both Albuera hexes are French objective hexes; a held Albuera counts as a banner for the French', () => {
    const s = real('115');
    expect(new Set(objectiveHexes(s, 'bottom'))).toEqual(new Set([H(4, 9), H(4, 10)]));
    const base = evalTerms(s, 'bottom', W).banners;
    const held = real('115');
    const fr = held.units.find((u) => u.id === 'u27')!;
    fr.hex = H(4, 10);
    held.special.objState[0] = { held: true, count: 0, holders: ['u27'] };
    const diff = evalTerms(held, 'bottom', W).banners - base;
    expect(diff).toBeGreaterThan(0.5 * bannerStep(1, held.bannersToWin));
    expect(diff).toBeLessThanOrEqual(bannerStep(1, held.bannersToWin) + 1e-9);
  });

  it('102: the Spanish baseline becomes an objective once the three free exits are used', () => {
    const s = real('102');
    expect(objectiveHexes(s, 'top')).toEqual([]);
    s.special.objState[0].count = 3;
    const row0 = objectiveHexes(s, 'top');
    expect(row0.length).toBeGreaterThanOrEqual(12);
    expect(row0.every((h) => rowOf(h) === 0)).toBe(true);
  });
});

describe('suddenDeath (105)', () => {
  it('105: the French value the last Spanish gun as the win; the Spanish keep their last gun out of reach', () => {
    const s = real('105');
    const T = s.bannersToWin;
    const gun = (x: GameState, id: string) => x.units.find((u) => u.id === id)!;
    // three guns left: the first is an ordinary banner
    expect(bannerValue(s, 'bottom', gun(s, 'u17'))).toBeCloseTo(bannerStep(1, T), 9);
    // the last gun is the win
    const last = real('105');
    last.units = last.units.filter((u) => u.id !== 'u4' && u.id !== 'u11');
    last.special.objState[0].count = 2;
    expect(bannerValue(last, 'bottom', gun(last, 'u17'))).toBeGreaterThanOrEqual(bannerStep(T, T));
    // another Spanish unit is still one banner
    expect(bannerValue(last, 'bottom', gun(last, 'u8'))).toBeCloseTo(bannerStep(1, T), 9);

    // the last gun, two hexes from French line infantry in the open, falls back out of their reach
    const at = H(4, 6);
    const make = (lastGun: boolean): GameState => {
      const x = keep(real('105'), { u4: H(0, 0), u11: H(0, 12), u17: at, u8: H(1, 1), u21: H(6, 6), u22: H(6, 7), u31: H(8, 10) });
      if (lastGun) {
        x.units = x.units.filter((u) => u.id !== 'u4' && u.id !== 'u11');
        x.special.objState[0].count = 2;
      }
      return atMove(x, 'top', 'u17').state;
    };
    const lastS = make(true);
    expect(nearestEnemy(lastS, 'top', at)).toBe(2);
    const to = moveOf(lastS, 'top', 'u17');
    expect(nearestEnemy(lastS, 'top', to)).toBeGreaterThanOrEqual(3);
    // with three guns left the same gun stands and fires
    const first = make(false);
    expect(moveOf(first, 'top', 'u17')).toBe(at);
    // the threat to the last gun weighs more in the Spanish evaluation than the threat to the first
    const drop = (x: GameState): number => evalTerms(cloneUnitTo(x, 'u17', to), 'top', W).riskMine - evalTerms(x, 'top', W).riskMine;
    expect(drop(lastS)).toBeGreaterThan(1.4 * drop(first));
  });
});

/** A copy of `s` with unit `id` on `hex`. */
function cloneUnitTo(s: GameState, id: string, hex: HexId): GameState {
  const c = cloneState(s);
  c.units.find((u) => u.id === id)!.hex = hex;
  return c;
}

describe('majority (114, 117)', () => {
  const ridge = (s: GameState): HexId[] => {
    const o = s.scenario.objectives[0];
    if (o.kind !== 'majority') throw new Error('114: no majority');
    return [...o.hexes];
  };

  it('114: a unit moves onto the ridge to break a tie; an empty ridge hex next to the enemy draws a defender', () => {
    // a tie, one hex each: neither side holds the ridge; a French line next to it steps on
    const tie = keep(real('114'), { u16: null, u1: null, u19: H(5, 4), u18: H(6, 2) });
    tie.special.objState[0].held = false;
    const s = atMove(tie, 'bottom', 'u18').state;
    expect(ridge(s)).toContain(H(5, 4));
    const to = moveOf(s, 'bottom', 'u18');
    expect(ridge(s)).toContain(to);

    // the British hold the ridge by one hex; a French line stands next to the empty (5,2): a British unit moves onto the ridge
    const held = keep(real('114'), { u16: null, u15: H(4, 1), u1: null, u18: H(6, 2) });
    expect(held.special.objState[0].held).toBe(true);
    const h = atMove(held, 'top', 'u15').state;
    expect(neighbours(H(6, 2))).toContain(H(5, 2));
    const toH = moveOf(h, 'top', 'u15');
    expect(ridge(h)).toContain(toH);
    // the defender raises the chance the held banner is kept
    expect(evalTerms(cloneUnitTo(h, 'u15', toH), 'top', W).banners).toBeGreaterThan(evalTerms(h, 'top', W).banners);
  });

  it('a held majority with a margin of one is worth less than with a margin of two when the enemy can enter', () => {
    const one = keep(real('114'), { u16: null, u1: null, u18: H(6, 2) });
    const two = keep(real('114'), { u16: null, u15: null, u1: null, u18: H(6, 2) });
    expect(evalTerms(two, 'top', W).banners).toBeGreaterThan(evalTerms(one, 'top', W).banners);
  });
});

describe('exitEdge (102)', () => {
  it('102: a Spanish unit on the baseline exits once three have gone, not before unless in danger', () => {
    const make = (exits: number, danger: boolean): GameState => {
      const units: Record<string, HexId | null> = { u2: H(0, 6), u1: H(2, 2), u16: H(6, 10), u23: H(7, 5) };
      if (danger) Object.assign(units, { u24: H(0, 5), u25: H(1, 5), u26: H(1, 6) });
      const x = keep(real('102'), units);
      x.special.objState[0].count = exits;
      if (danger) x.units.find((u) => u.id === 'u2')!.blocks = 1;
      return atMove(x, 'top', 'u2').state;
    };
    expect(moveOf(make(3, false), 'top', 'u2')).toBe(OFF_BOARD);
    expect(moveOf(make(0, false), 'top', 'u2')).not.toBe(OFF_BOARD);
    expect(moveOf(make(0, true), 'top', 'u2')).toBe(OFF_BOARD);
    // once the free exits are used, a Spanish unit two rows off its baseline heads for it rather than for the French
    const x = keep(real('102'), { u2: H(2, 6), u1: H(2, 2), u16: H(6, 10), u23: H(7, 5) });
    x.special.objState[0].count = 3;
    const s = atMove(x, 'top', 'u2').state;
    const to = moveOf(s, 'top', 'u2');
    expect(to === OFF_BOARD || rowOf(to) < 2).toBe(true);
  });
});

describe('tempAny (115)', () => {
  it('115: the French move onto Albuera before their turn ends to hold it next turn', () => {
    // the British light infantry holds (4,9); a French line on the bridge takes the free Albuera hex (4,10)
    const x = keep(real('115'), { u7: null, u27: H(5, 9), u11: null, u1: null });
    const s = atMove(x, 'bottom', 'u27').state;
    expect(moveOf(s, 'bottom', 'u27')).toBe(H(4, 10));
    // with Albuera empty and the British off to the west, French light cavalry two hexes away rides onto it
    const y = keep(real('115'), { u33: H(6, 9), u11: null, u13: null });
    const t = atMove(y, 'bottom', 'u33').state;
    expect([H(4, 9), H(4, 10)]).toContain(moveOf(t, 'bottom', 'u33'));
  });
});

describe('breakOnLosses (101) and handShrink (106)', () => {
  it('101: the second Swiss loss is worth more to the Spanish than the first', () => {
    const s = real('101');
    const swiss = (x: GameState, id: string) => x.units.find((u) => u.id === id)!;
    const first = bannerValue(s, 'top', swiss(s, 'u17'));
    expect(first).toBeCloseTo(bannerStep(1, s.bannersToWin), 9);
    const after = real('101');
    after.units = after.units.filter((u) => u.id !== 'u18');
    after.players.top.banners = 1;
    const second = bannerValue(after, 'top', swiss(after, 'u17'));
    // the second loss removes the other two Swiss: their worth comes with it
    const removed = unitValue(after, swiss(after, 'u19')) + unitValue(after, swiss(after, 'u20'));
    expect(second - bannerStep(2, after.bannersToWin)).toBeCloseTo(removed, 9);
    expect(second).toBeGreaterThan(first + 1);
    // a French line is an ordinary banner either way; the Spanish Swiss have no such rule
    expect(bannerValue(after, 'top', swiss(after, 'u22'))).toBeCloseTo(bannerStep(2, after.bannersToWin), 9);
    expect(bannerValue(after, 'bottom', swiss(after, 'u8'))).toBeCloseTo(bannerStep(1, after.bannersToWin), 9);
  });

  it('106: a French banner costs the Allies one CARD_VALUE while their hand is above the floor', () => {
    const s = real('106');
    const ally = s.units.find((u) => u.side === 'top')!;
    const T = s.bannersToWin;
    expect(bannerValue(s, 'bottom', ally)).toBeCloseTo(bannerStep(1, T) + CARD_VALUE, 9);
    s.special.handSize.top = 3;
    expect(bannerValue(s, 'bottom', ally)).toBeCloseTo(bannerStep(1, T), 9);
    // the evaluation counts the hand the rule has left: one card fewer is one CARD_VALUE less for the Allies
    const full = real('106');
    const shrunk = real('106');
    shrunk.special.handSize.top = 5;
    shrunk.discard.push(shrunk.players.top.hand.pop()!);
    expect(evalTerms(full, 'top', W).banners - evalTerms(shrunk, 'top', W).banners).toBeCloseTo(CARD_VALUE, 9);
  });
});

describe('ordering: what an order gains under the new objectives', () => {
  it('102: stepping off the baseline is a reason to order a unit once the free exits are used, not before', () => {
    const make = (exits: number): GameState => {
      const x = keep(real('102'), { u2: H(0, 6), u1: H(2, 2), u16: H(6, 10), u23: H(7, 5) });
      x.special.objState[0].count = exits;
      return x;
    };
    const open = pieceBenefits(make(3), 'top', 'attackC', W).get('u2') ?? 0;
    const shut = pieceBenefits(make(0), 'top', 'attackC', W).get('u2') ?? 0;
    expect(open).toBeGreaterThanOrEqual(0.5);
    expect(shut).toBeLessThan(open);
  });

  it('115: a French unit that can step onto Albuera gains more from an order than without the objective', () => {
    const make = (objective: boolean): GameState => {
      const x = keep(real('115'), { u33: H(6, 9), u11: null, u13: null });
      if (!objective) x.scenario = { ...x.scenario, objectives: [] };
      return x;
    };
    expect(pieceBenefits(make(true), 'bottom', 'attackR', W).get('u33') ?? 0).toBeGreaterThan(pieceBenefits(make(false), 'bottom', 'attackR', W).get('u33') ?? 0);
  });
});

describe('review round 1: the pieces of the new pricing, one by one', () => {
  const ridgeOf = (s: GameState): readonly HexId[] => {
    const o = s.scenario.objectives[0];
    if (o.kind !== 'majority') throw new Error('114: no majority');
    return o.hexes;
  };

  it('114: an enemy unit already on the ridge is no entry: a 2 v 1 ridge out of reach is all but kept', () => {
    // the British hold (2,3) and (3,1); a lone French line on (6,3), next to the free (5,2) and (5,3), is out of their reach
    const on = keep(real('114'), { u1: H(2, 3), u2: H(3, 1), u18: H(6, 3) });
    expect(ridgeOf(on)).toContain(H(6, 3));
    expect(on.special.objState[0].held).toBe(true);
    expect(evalTerms(on, 'top', W).riskMine).toBeCloseTo(0, 12);
    const off = keep(real('114'), { u1: H(2, 3), u2: H(3, 1), u18: H(8, 10) });
    const step = bannerStep(1, on.bannersToWin);
    // its steps within the ridge leave the count where it is: the held banner is all but kept
    expect(evalTerms(on, 'top', W).banners).toBeGreaterThan(evalTerms(off, 'top', W).banners - 0.05 * step);
    // nor do they bring the French nearer the majority: no other French unit, so no capture potential on the free hexes
    expect(evalTerms(on, 'bottom', W).objectives).toBeLessThan(0.05 * step);
  });

  it('114: behind by two, the French need two hexes: the second-best hex counts as much as the best', () => {
    // a French line at (7,3) touches one ridge hex, (6,3); a British unit on the ridge means the French need two hexes
    const need2 = keep(real('114'), { u16: null, u18: H(7, 3) });
    const need1 = keep(real('114'), { u16: H(1, 0), u18: H(7, 3) });
    expect(need2.special.objState[0].held).toBe(true);
    const a = evalTerms(need2, 'bottom', W).objectives;
    const b = evalTerms(need1, 'bottom', W).objectives;
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(0.9 * b);
    // exactly (best + second best) / 2 of the free hexes' scores, the British majority's own term aside (Task 11: the 7C T20 carry).
    // A hex's score is what a one-hex objective there scores (same banners, so the same worth): `approachOf` sees the same board.
    const [topMaj, botMaj] = need2.scenario.objectives;
    if (botMaj.kind !== 'majority') throw new Error('114: no majority');
    const only = (objectives: typeof need2.scenario.objectives, objState: typeof need2.special.objState): number => {
      const x = cloneState(need2);
      x.scenario = { ...x.scenario, objectives };
      x.special.objState = objState;
      return evalTerms(x, 'bottom', W).objectives;
    };
    const british = only([topMaj], [need2.special.objState[0]]);
    const free = botMaj.hexes.filter((h) => need2.units.every((u) => u.hex !== h || u.side !== 'bottom'));
    const scores = free.map((h) => only([{ kind: 'tempHex', side: 'bottom', hex: h, timing: 'turnStart', banners: botMaj.banners, text: '' }], [{ held: false, count: 0 }]));
    scores.sort((x, y) => y - x);
    expect(scores[1]).toBeGreaterThan(0);
    expect(a).toBeCloseTo(british + (scores[0] + scores[1]) / 2, 9);
  });

  it('114: ordering pulls a French unit towards a ridge it is behind on', () => {
    const make = (objective: boolean): GameState => {
      const x = keep(real('114'), { u16: null, u18: H(7, 3), u19: H(8, 10) });
      if (!objective) x.scenario = { ...x.scenario, objectives: [] };
      return x;
    };
    expect(sectionsOf(H(7, 3), 'bottom')).toContain('left');
    const left = 'attackL' as CardKind;
    expect(pieceBenefits(make(true), 'bottom', left, W).get('u18') ?? 0).toBeGreaterThan(pieceBenefits(make(false), 'bottom', left, W).get('u18') ?? 0);
  });

  it('115: a held Albuera is kept by its recorded holders only (S35), not by a unit that came later', () => {
    // the worn holder on (4,10) has a British line next to it; a sound French unit that arrived on (4,9) since is no holder
    const make = (holders: string[]): GameState => {
      const x = keep(real('115'), { u27: H(4, 10), u26: H(4, 9), u1: H(3, 10), u11: null });
      x.units.find((u) => u.id === 'u27')!.blocks = 1;
      x.special.objState[0] = { held: true, count: 0, holders };
      return x;
    };
    const one = evalTerms(make(['u27']), 'bottom', W).banners;
    const both = evalTerms(make(['u27', 'u26']), 'bottom', W).banners;
    expect(one).toBeLessThan(both - 1e-6);
  });

  it('115: a French unit on Albuera before the turn start counts at the chance it stays', () => {
    const make = (british: HexId): GameState => {
      const x = keep(real('115'), { u27: H(4, 10), u1: british, u11: null });
      x.units.find((u) => u.id === 'u27')!.blocks = 1;
      return x;
    };
    const threatened = make(H(3, 10));
    const safe = make(H(0, 0));
    expect(evalTerms(threatened, 'bottom', W).objectives).toBeLessThan(evalTerms(safe, 'bottom', W).objectives - 1e-6);
  });

  it('115: any one Albuera hex is enough: the group scores its best hex, not the mean of its hexes', () => {
    const base = keep(real('115'), { u33: H(6, 10), u11: null });
    const o = base.scenario.objectives[0];
    if (o.kind !== 'tempAny') throw new Error('115: no tempAny');
    const withHexes = (hexes: HexId[]): GameState => {
      const x = cloneState(base);
      x.scenario = { ...x.scenario, objectives: [{ ...o, hexes }] };
      return x;
    };
    const asHex = cloneState(base);
    asHex.scenario = { ...asHex.scenario, objectives: [{ kind: 'tempHex', side: 'bottom', hex: H(4, 10), timing: 'turnStart', banners: 1, text: o.text }] };
    const far = evalTerms(withHexes([H(4, 10), H(0, 0)]), 'bottom', W).objectives;
    expect(far).toBeGreaterThan(0);
    expect(far).toBeCloseTo(evalTerms(asHex, 'bottom', W).objectives, 9);
  });

  it('102: a battered unit at risk is pulled towards its baseline before the free exits are used; a safe one is not', () => {
    const make = (danger: boolean, blocks: number): GameState => {
      const units: Record<string, HexId | null> = { u2: H(1, 6), u16: H(6, 10) };
      if (danger) Object.assign(units, { u24: H(1, 5), u25: H(2, 6), u26: H(1, 7) });
      const x = keep(real('102'), units);
      x.units.find((u) => u.id === 'u2')!.blocks = blocks;
      return x;
    };
    // its expected loss where it stands is what pulls it: far more than a worn unit out of danger gets from the free exit alone
    const danger = evalTerms(make(true, 1), 'top', W).objectives;
    const wornSafe = evalTerms(make(false, 1), 'top', W).objectives;
    expect(danger).toBeGreaterThan(10 * wornSafe);
    expect(danger).toBeGreaterThan(0.3);
    expect(evalTerms(make(false, 4), 'top', W).objectives).toBe(0);
  });

  it('106: killing a lone Allied leader takes a hand card too, while the hand is above the floor', () => {
    const s = build({
      first: 'bottom', topCards: 6, sideRules: [{ kind: 'handShrink', side: 'top', floor: 3 }],
      units: [{ side: 'bottom', key: 'BR/LN', at: [4, 6] }, { side: 'top', key: 'FR/LN', at: [0, 0] }],
      leaders: [{ side: 'top', at: [3, 6] }],
    });
    const atk = s.units[0];
    const lh = H(3, 6);
    const full = loneLeaderEstimate(s, atk, lh, makeEstCtx(s, 'bottom', W)).ev;
    s.special.handSize.top = 3;
    const floor = loneLeaderEstimate(s, atk, lh, makeEstCtx(s, 'bottom', W)).ev;
    expect(full - floor).toBeGreaterThan(0.01);
    expect(full - floor).toBeLessThanOrEqual(CARD_VALUE + 1e-9);
  });

  it('105: eliminating the last gun wins at once, so its leader\'s casualty check is not priced on top', () => {
    const make = (last: boolean, leader: boolean): GameState => {
      const units = [{ side: 'top' as const, key: 'FR/FA' as const, at: [3, 6] as [number, number] }, { side: 'bottom' as const, key: 'BR/LN' as const, at: [5, 6] as [number, number] }];
      if (!last) units.push({ side: 'top', key: 'FR/FA', at: [0, 0] });
      const s = build({
        first: 'bottom', objectives: [{ kind: 'suddenDeath', side: 'bottom', keys: ['FR/FA'] }], units,
        leaders: leader ? [{ side: 'top', at: [3, 6] }] : [],
      });
      s.units[0].blocks = 1;
      return s;
    };
    expect(eliminationWins(make(true, false), make(true, false).units[0])).toBe(true);
    expect(eliminationWins(make(false, false), make(false, false).units[0])).toBe(false);
    const fire = (s: GameState): number => fireEstimate(s, s.units[1], H(3, 6), makeEstCtx(s, 'bottom', W)).ev;
    // the leader's casualty check adds to the shot's value, but not after a winning elimination (the game is over); with the
    // last gun the leader is worth less to the shot than with the first (he even lowers the chance of the win a little)
    const lastGain = fire(make(true, true)) - fire(make(true, false));
    const firstGain = fire(make(false, true)) - fire(make(false, false));
    expect(firstGain).toBeGreaterThan(0.1);
    expect(lastGain).toBeLessThan(firstGain - 0.1);
  });
});

describe('tempGroup: a unit already on the group (Task 11 carry from Plan 7C T20)', () => {
  it('003: a French unit on one Vimiero hex is no entry for the other: only the held hex scores', () => {
    // the lone French line stands on (1,3); the British unit is far off, so (1,3) is safe and no other French unit can come
    const s = keep(real('003'), { u18: H(1, 3), u1: H(8, 12) });
    const o = s.scenario.objectives[0];
    expect(o.kind === 'tempGroup' && o.hexes).toEqual([H(1, 3), H(1, 4)]);
    const worth = bannersWorth(bannerTotal(s, 'bottom'), 2, s.bannersToWin);
    // GROUP_PARTIAL × CAPTURE_SHARE for the held hex, nothing for (1,4): stepping across leaves (1,3) free
    expect(evalTerms(s, 'bottom', W).objectives).toBeCloseTo((worth * 0.5 * 0.85) / 2, 9);
  });
});
