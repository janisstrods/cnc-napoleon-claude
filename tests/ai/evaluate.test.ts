import { describe, expect, it } from 'vitest';
import {
  CARD_DEFS, CARD_LIST, GameDriver, NO_MODS, cloneState, createGame, distance, eligiblePieces, fallbackActive, forceDice, forcedDiceLeft, neighbours,
  newOrderedPiece, other, randomAnswer, sectionsOf, statsOf, unitMoves, OFF_BOARD, type CardKind, type GameState, type HexId, type Side, type Unit,
} from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { occOf } from '../../src/ai/board';
import { cardOrders, evalTerms, evaluate, impetuousEnd, reachOf } from '../../src/ai/evaluate';
import { bannerValue, killBanners, makeEstCtx, meleeEstimate } from '../../src/ai/estimate';
import { personalityById } from '../../src/ai/personality';
import { NEUTRAL_W, WIN_SCORE, bannerStep, unitValue, weightsFor, type Weights } from '../../src/ai/values';
import { H, attack, build, ev, must, toBattle, type Pos } from '../rules/helpers';
import { answerFor } from './helpers';
import { failOnAiErrors } from './no-ai-errors';

failOnAiErrors();

type Units = NonNullable<Pos['units']>;
const top = (key: Units[number]['key'], at: [number, number], extra: object = {}) => ({ side: 'top' as const, key, at, ...extra });
const bot = (key: Units[number]['key'], at: [number, number], extra: object = {}) => ({ side: 'bottom' as const, key, at, ...extra });
const W = NEUTRAL_W;
const WELLINGTON: Weights = weightsFor(personalityById('wellington'));

/** A seeded random-play position of battle `id` after `decisions` engine decisions. */
function midgame(id: string, decisions: number, seed: number): GameState {
  const d = new GameDriver(createGame(scenarioById(id).setup, seed));
  let x = seed;
  const rnd = (): number => {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    return x / 0x80000000;
  };
  for (let i = 0; i < decisions && d.pending && !d.state.winner; i++) d.answer(randomAnswer(d.state, d.pending, rnd));
  return d.state;
}

/** A copy of `s` with `id` moved to `hex` (its attached leader with it). */
function moved(s: GameState, id: string, hex: HexId): GameState {
  const c = cloneState(s);
  const u = c.units.find((x) => x.id === id)!;
  for (const l of c.leaders) if (l.side === u.side && l.hex === u.hex) l.hex = hex;
  u.hex = hex;
  return c;
}

describe('evaluate: wins, material and banners', () => {
  it('a won game is +WIN_SCORE for the winner and -WIN_SCORE for the loser; a draw winner scores 0', () => {
    const s = build({ units: [top('FR/LN', [2, 6]), bot('BR/LN', [6, 6])] });
    s.winner = 'top';
    expect(evaluate(s, 'top', W)).toBe(WIN_SCORE);
    expect(evaluate(s, 'bottom', W)).toBe(-WIN_SCORE);
    s.winner = 'draw';
    expect(evaluate(s, 'top', W)).toBe(0);
    expect(evaluate(s, 'bottom', W)).toBe(0);
  });

  it('losing a block lowers the evaluation; losing the last block of a unit lowers it by more than a banner step', () => {
    const s = build({ banners: 6, units: [top('FR/LN', [0, 1]), bot('BR/LN', [8, 11]), bot('BR/LN', [8, 1])] });
    const base = evaluate(s, 'bottom', W);
    const hurt = cloneState(s);
    hurt.units[1].blocks = 3;
    expect(evaluate(hurt, 'bottom', W)).toBeLessThan(base);
    const worn = cloneState(s);
    worn.units[1].blocks = 1;
    const wornV = evaluate(worn, 'bottom', W);
    expect(wornV).toBeLessThan(evaluate(hurt, 'bottom', W));
    // the last block: the unit is removed and the enemy scores its banner
    const dead = cloneState(worn);
    dead.units.splice(1, 1);
    dead.players.top.banners += 1;
    expect(wornV - evaluate(dead, 'bottom', W)).toBeGreaterThan(bannerStep(1, 6));
  });

  it('holding a temporary objective hex at turn start is worth almost its banner; an enemy unit adjacent lowers it', () => {
    const P: Pos = { banners: 6, objectives: [{ kind: 'tempHex', side: 'bottom', hex: [4, 6], banners: 1 }], units: [top('FR/LN', [0, 1]), bot('BR/LN', [4, 6])] };
    const held = build(P);
    held.special.objState[0].held = true;
    const away = build({ ...P, units: [top('FR/LN', [0, 1]), bot('BR/LN', [8, 6])] });
    const step = bannerStep(1, 6);
    const diff = evaluate(held, 'bottom', W) - evaluate(away, 'bottom', W);
    expect(diff).toBeGreaterThan(0.75 * step);
    expect(diff).toBeLessThan(1.1 * step);
    // the holder's banner and its unit are now threatened by an adjacent enemy
    const threatened = build({ ...P, units: [top('FR/LN', [3, 6]), bot('BR/LN', [4, 6])] });
    threatened.special.objState[0].held = true;
    const t = evalTerms(threatened, 'bottom', W);
    const h = evalTerms(held, 'bottom', W);
    expect(t.banners).toBeLessThan(h.banners);
    expect(evaluate(threatened, 'bottom', W)).toBeLessThan(evaluate(held, 'bottom', W));
    // the side that needs the hex gains from the same threat
    expect(evaluate(threatened, 'top', W)).toBeGreaterThan(evaluate(held, 'top', W));
  });
});

describe('evaluate: threats, squares and position', () => {
  it('infantry next to enemy cavalry is riskier with a hand of 2 than a hand of 4', () => {
    const units = [top('FR/HC', [3, 6]), bot('BR/LN', [4, 6])];
    const four = build({ first: 'top', bottomCards: 4, units });
    const two = build({ first: 'top', bottomCards: 2, units });
    const r4 = evalTerms(four, 'bottom', W).riskMine;
    const r2 = evalTerms(two, 'bottom', W).riskMine;
    expect(r4).toBeLessThan(0);
    expect(r2).toBeLessThan(r4 - 0.02);
  });

  it('a gun at range 2 with sight is worth more than the same gun at range 5 or masked', () => {
    const mask: Pos = { terrain: [{ at: [2, 6], t: 'forest' }, { at: [2, 7], t: 'forest' }] };
    const gun = (r: number, extra: Pos = {}) => build({ ...extra, units: [top('FR/LN', [1, 6]), bot('BR/FA', [r, 6])] });
    const g2 = evalTerms(gun(3), 'bottom', W).guns;
    const g5 = evalTerms(gun(6), 'bottom', W).guns;
    const masked = evalTerms(gun(3, mask), 'bottom', W).guns;
    expect(g2).toBeGreaterThan(g5);
    expect(g5).toBeGreaterThan(masked);
    expect(masked).toBe(0);
    // out of the infantry's reach, a gun at range 3 beats the same gun at range 5, and beats it masked by a forest
    const r3 = evaluate(gun(4), 'bottom', W);
    expect(r3).toBeGreaterThan(evaluate(gun(6), 'bottom', W));
    expect(evalTerms(gun(4, mask), 'bottom', W).guns).toBe(0);
    expect(r3).toBeGreaterThan(evaluate(gun(4, mask), 'bottom', W));
  });

  it('a worn unit (1 block) in the front line is a liability; pulling it back raises the evaluation', () => {
    const front = build({ units: [top('FR/LN', [3, 6]), bot('BR/LN', [4, 6], { blocks: 1 }), bot('BR/LN', [5, 9])] });
    const back = moved(front, 'u2', H(7, 6));
    expect(evalTerms(front, 'bottom', W).riskMine).toBeLessThan(evalTerms(back, 'bottom', W).riskMine);
    expect(evaluate(back, 'bottom', W)).toBeGreaterThan(evaluate(front, 'bottom', W));
  });

  it('infantry facing an enemy is safer in a town than in the open (the threat model reads the engine dice)', () => {
    const units = [top('FR/LN', [3, 6]), bot('BR/LN', [4, 6])];
    const open = evalTerms(build({ units }), 'bottom', W).riskMine;
    const town = evalTerms(build({ units, terrain: [{ at: [4, 6], t: 'town' }] }), 'bottom', W).riskMine;
    expect(town).toBeGreaterThan(open);
  });

  it('an attack that loses more to the battle back than it gains is no threat', () => {
    const s = build({ units: [top('FR/LN', [3, 6], { blocks: 1 }), bot('BR/GR', [4, 6])] });
    const t = evalTerms(s, 'bottom', W);
    expect(Math.abs(t.riskMine)).toBe(0);
    expect(t.riskTheirs).toBeGreaterThan(0);
  });

  it('many attackers cannot take more from a unit than its value and its banners', () => {
    const ring = neighbours(H(4, 6)).slice(0, 4).map((h) => top('FR/GR', [Math.floor(h / 13), h % 13]));
    const s = build({ first: 'bottom', units: [bot('BR/LN', [4, 6], { blocks: 1 }), ...ring] });
    const victim = s.units[0];
    const cap = unitValue(s, victim) + bannerValue(s, 'top', victim) + 0.2;
    const risk = -evalTerms(s, 'bottom', W).riskMine;
    expect(risk).toBeGreaterThan(0.5 * W.riskSelf);
    expect(risk).toBeLessThanOrEqual(W.riskSelf * cap);
  });

  it('own units in square cost their side a held-back card and Command; the enemy squares count for us', () => {
    const units = [top('FR/LN', [1, 2]), bot('BR/LN', [7, 6])];
    const plain = build({ units });
    const sq = build({ units: [top('FR/LN', [1, 2]), bot('BR/LN', [7, 6], { square: 1 })] });
    expect(evalTerms(sq, 'bottom', W).squares).toBeLessThan(evalTerms(plain, 'bottom', W).squares);
    expect(evalTerms(sq, 'top', W).squares).toBeGreaterThan(evalTerms(plain, 'top', W).squares);
  });
});

describe('evaluate: hidden information and purity', () => {
  it('the evaluation is unchanged when the opponent hand, track cards, deck order and rng are re-dealt', () => {
    for (const [id, n, seed] of [['008', 160, 3], ['015', 220, 5], ['012', 90, 9]] as const) {
      const s = midgame(id, n, seed);
      const me: Side = s.active;
      const opp = other(me);
      const base = evaluate(s, me, W);
      const baseTerms = evalTerms(s, me, W);
      let x = 99 + seed;
      const rnd = (): number => {
        x = (x * 69069 + 1) >>> 0;
        return x / 4294967296;
      };
      for (let k = 0; k < 4; k++) {
        const c = cloneState(s);
        const p = c.players[opp];
        const filled = p.squareTrack.map((card, i) => (card === null ? -1 : i)).filter((i) => i >= 0);
        const pool = [...p.hand, ...filled.map((i) => p.squareTrack[i]!), ...c.deck];
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(rnd() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        p.hand = pool.slice(0, p.hand.length);
        filled.forEach((slot, i) => (p.squareTrack[slot] = pool[p.hand.length + i]));
        c.deck = pool.slice(p.hand.length + filled.length);
        c.rng = (rnd() * 4294967296) >>> 0;
        c.rngCalls = k * 7;
        expect(evaluate(c, me, W), `${id} variant ${k}`).toBe(base);
        expect(evalTerms(c, me, W)).toEqual(baseTerms);
      }
    }
  });

  it('evaluate never consumes game RNG', () => {
    const s = midgame('008', 160, 3);
    const rng = s.rng;
    const calls = s.rngCalls;
    forceDice([]);
    for (const side of ['top', 'bottom'] as const) {
      evaluate(s, side, W);
      evalTerms(s, side, W);
    }
    expect(s.rng).toBe(rng);
    expect(s.rngCalls).toBe(calls);
    expect(forcedDiceLeft()).toBe(0);
  });

  it('accepts a root estimate context (makeEstCtx) and gives the same value as without one', () => {
    const s = midgame('008', 160, 3);
    const me = s.active;
    expect(evaluate(s, me, W, makeEstCtx(s, me, W))).toBeCloseTo(evaluate(s, me, W), 12);
  });
});

describe('evaluate: pulls and stand-offs', () => {
  /** A unit of `side` and a free neighbouring hex nearer the enemy, out of every enemy unit's reach and range. */
  function safeStep(s: GameState, side: Side): { id: string; to: HexId } {
    const occ = occOf(s);
    const enemies = occ.bySide[other(side)];
    const nearest = (h: HexId): number => Math.min(...enemies.map((e) => distance(h, e.hex)));
    const fireRange = (e: Unit): number => {
      const f = statsOf(s, e).fire;
      return f.kind === 'none' ? 0 : f.range;
    };
    const outOfReach = (h: HexId): boolean => enemies.every((e) => distance(h, e.hex) > Math.max(reachOf(s, occ, e), fireRange(e)));
    for (const u of occ.bySide[side]) {
      if (u.blocks < 2) continue;
      for (const h of neighbours(u.hex)) {
        if (occ.unit[h] || occ.leader[h] || (s.terrain[h] !== 'plain' && s.terrain[h] !== 'hill')) continue;
        if (nearest(h) < nearest(u.hex) && outOfReach(h) && outOfReach(u.hex)) return { id: u.id, to: h };
      }
    }
    throw new Error('no safe step found');
  }

  it('advance pull breaks a stand-off (012): on the 012 setup, one step towards the enemy outside its reach scores higher than standing', () => {
    const s = createGame(scenarioById('012').setup, 1);
    for (const side of ['top', 'bottom'] as const) {
      const { id, to } = safeStep(s, side);
      expect(evaluate(moved(s, id, to), side, W), `${side} ${id} -> ${to}`).toBeGreaterThan(evaluate(s, side, W));
    }
  });

  it('a cautious commander on the side that must attack is not passive: Wellington steps forward outside reach (010, 011)', () => {
    for (const id of ['010', '011']) {
      const s = createGame(scenarioById(id).setup, 1);
      const { id: uid, to } = safeStep(s, 'top');
      expect(evaluate(moved(s, uid, to), 'top', WELLINGTON), `${id} ${uid}`).toBeGreaterThan(evaluate(s, 'top', WELLINGTON));
    }
  });

  it('an exit objective pulls its side units towards the exit hex', () => {
    const P: Pos = { objectives: [{ kind: 'exit', side: 'top', hex: [0, 4], banners: 1 }], units: [top('FR/LN', [3, 4]), bot('BR/LN', [8, 11])] };
    const far = build(P);
    const near = moved(far, 'u1', H(2, 4));
    const nearer = moved(far, 'u1', H(1, 4));
    expect(evalTerms(near, 'top', W).objectives).toBeGreaterThan(evalTerms(far, 'top', W).objectives);
    expect(evaluate(near, 'top', W)).toBeGreaterThan(evaluate(far, 'top', W));
    expect(evaluate(nearer, 'top', W)).toBeGreaterThan(evaluate(near, 'top', W));
    // the other side wants the opposite
    expect(evaluate(near, 'bottom', W)).toBeLessThan(evaluate(far, 'bottom', W));
  });

  it('001: the British (top) are drawn towards the objective hexes on the French baseline', () => {
    const s = createGame(scenarioById('001').setup, 1);
    const targets = s.scenario.objectives.flatMap((o) => (o.kind === 'tempHex' ? [o.hex] : []));
    const occ = occOf(s);
    const d = (h: HexId): number => Math.min(...targets.map((t) => distance(h, t)));
    let best: { u: Unit; h: HexId } | null = null;
    for (const u of occ.bySide.top) {
      for (const h of neighbours(u.hex)) {
        if (occ.unit[h] || occ.leader[h] || d(h) >= d(u.hex)) continue;
        if (!best || d(h) < d(best.h)) best = { u, h };
      }
    }
    expect(best).not.toBeNull();
    const after = moved(s, best!.u.id, best!.h);
    expect(evalTerms(after, 'top', W).objectives).toBeGreaterThan(evalTerms(s, 'top', W).objectives);
    expect(evalTerms(after, 'bottom', W).objectives).toBeLessThan(evalTerms(s, 'bottom', W).objectives);
  });

  it('015: the Allies value standing on the farms the French need (Hougoumont, La Haye Sainte, Papelotte)', () => {
    const s = createGame(scenarioById('015').setup, 1);
    const occ = occOf(s);
    let checked = 0;
    for (const o of s.scenario.objectives) {
      if (o.kind !== 'tempHex') continue;
      const holder = occ.unit[o.hex];
      if (!holder || holder.side !== 'top') continue;
      const off = neighbours(o.hex).find((h) => !occ.unit[h] && !occ.leader[h] && s.terrain[h] !== 'river');
      if (off === undefined) continue;
      const after = moved(s, holder.id, off);
      expect(evalTerms(after, 'top', W).objectives, `hex ${o.hex}`).toBeLessThan(evalTerms(s, 'top', W).objectives);
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe('evaluate: approximations cross-checked against the engine', () => {
  /** Order `u` under no card modifiers on `s` (a test copy), so `unitMoves` uses its own allowance. */
  function orderPlain(s: GameState, u: Unit): void {
    s.turn.mods = NO_MODS;
    s.turn.ordered = { [u.id]: newOrderedPiece(s, u.id, false) };
  }

  it('reachOf agrees with unitMoves: over every unit of 5 battle setups, the hexes from which unitMoves can battle lie within reachOf in ≥ 95 %, and reachOf overstates by ≤ 1 hex', () => {
    let hexes = 0;
    let within = 0;
    let units = 0;
    let worstOver = -99;
    for (const id of ['001', '005', '008', '012', '015']) {
      const base = createGame(scenarioById(id).setup, 1);
      for (const u0 of base.units) {
        const s = cloneState(base);
        const u = s.units.find((x) => x.id === u0.id)!;
        orderPlain(s, u);
        const occ = occOf(s);
        const battleAt = unitMoves(s, u.id).filter((m) => m.battle && m.hex !== OFF_BOARD).map((m) => m.hex);
        const far = Math.max(0, ...battleAt.map((h) => distance(u.hex, h)));
        for (const h of battleAt) {
          hexes++;
          if (distance(u.hex, h) + 1 <= reachOf(s, occ, u, h)) within++;
        }
        units++;
        worstOver = Math.max(worstOver, reachOf(s, occ, u) - 1 - far);
      }
    }
    expect(units).toBeGreaterThan(100);
    expect(within / hexes).toBeGreaterThanOrEqual(0.95);
    expect(worstOver).toBeLessThanOrEqual(1);
    // a unit in square cannot move: it reaches only its neighbours
    const sq = build({ units: [bot('BR/LN', [5, 6], { square: 1 })] });
    expect(reachOf(sq, occOf(sq), sq.units[0])).toBe(1);
  });

  it('reachOf is cut by stop-on-entry and battle-barring terrain on the approach (and unitMoves agrees)', () => {
    const ring = (t: 'sandQuarry' | 'forest') => build({ units: [bot('BR/LC', [5, 6])], terrain: neighbours(H(5, 6)).map((h) => ({ at: [Math.floor(h / 13), h % 13] as [number, number], t })) });
    const open = build({ units: [bot('BR/LC', [5, 6])] });
    expect(reachOf(open, occOf(open), open.units[0])).toBe(4);
    const quarry = ring('sandQuarry');
    expect(reachOf(quarry, occOf(quarry), quarry.units[0])).toBe(2);
    const forest = ring('forest');
    expect(reachOf(forest, occOf(forest), forest.units[0])).toBe(1);
    for (const s of [quarry, forest]) {
      orderPlain(s, s.units[0]);
      const far = Math.max(0, ...unitMoves(s, 'u1').filter((m) => m.battle).map((m) => distance(H(5, 6), m.hex)));
      expect(reachOf(s, occOf(s), s.units[0])).toBe(far + 1);
    }
  });

  it('a threat is weighted by the odds that the enemy holds a card ordering its section (unseen pool, hand size)', () => {
    const s = build({ first: 'bottom', units: [top('FR/LN', [4, 1]), bot('BR/LN', [5, 1])] });
    const attacker = s.units[0];
    const before = evalTerms(s, 'bottom', W).riskMine;
    // every unseen section card that orders the attacker's section goes to the (public) discard pile
    const secs = sectionsOf(attacker.hex, 'top');
    const covers = (id: number): boolean => {
      const sel = CARD_DEFS[CARD_LIST[id]].select;
      return sel.kind === 'sections' && secs.some((sec) => sel.counts[sec] !== undefined);
    };
    const c = cloneState(s);
    const moving = c.deck.filter(covers);
    c.deck = c.deck.filter((id) => !covers(id));
    c.discard.push(...moving);
    const after = evalTerms(c, 'bottom', W).riskMine;
    expect(before).toBeLessThan(0);
    expect(after).toBeGreaterThan(before + 0.02);
  });

  it('the cards a threat counts on order the same units as the engine (eligiblePieces) on 5 setups', () => {
    let n = 0;
    let agree = 0;
    for (const id of ['001', '005', '010', '012', '015']) {
      const s = createGame(scenarioById(id).setup, 1);
      const occ = occOf(s);
      for (const kind of Object.keys(CARD_DEFS) as CardKind[]) {
        const sel = CARD_DEFS[kind].select.kind;
        if (!['sections', 'kinds', 'sectionAll', 'adjacentToEnemy', 'leaders'].includes(sel)) continue;
        for (const side of ['top', 'bottom'] as const) {
          if (fallbackActive(s, side, kind)) continue;
          const eng = new Set(eligiblePieces(s, side, kind));
          for (const u of occ.bySide[side]) {
            n++;
            if (cardOrders(s, kind, u, occ) === eng.has(u.id)) agree++;
          }
        }
      }
    }
    expect(n).toBeGreaterThan(1000);
    expect(agree).toBe(n);
  });

  it('killWeight: the banners an elimination scores agree with the engine (scoreKill), first and later', () => {
    const P: Pos = {
      first: 'top', banners: 9, objectives: [{ kind: 'killWeight', side: 'top', enemyArm: 'infantry', first: 1, later: 2 }],
      units: [top('FR/HC', [3, 6]), bot('BR/LN', [4, 6], { blocks: 1 }), bot('BR/LC', [6, 2], { blocks: 1 })],
    };
    for (const [count, victim] of [[0, 'u2'], [1, 'u2'], [0, 'u3'], [1, 'u3']] as const) {
      const s = build(P);
      s.special.objState[0].count = count;
      const v = s.units.find((x) => x.id === victim)!;
      if (victim === 'u3') v.hex = H(4, 6);
      if (victim === 'u3') s.units.find((x) => x.id === 'u2')!.hex = H(7, 11);
      const predicted = killBanners(s, v);
      const d = toBattle(s, 'attackC', ['u1']);
      ev(d);
      forceDice(Array(12).fill(victim === 'u2' ? 'infantry' : 'cavalry'));
      attack(d, 'u1', H(4, 6));
      for (let a = answerFor(d); a; a = answerFor(d)) must(d, a);
      forceDice([]);
      expect(d.state.units.some((x) => x.id === victim), `${victim} eliminated`).toBe(false);
      expect(d.state.players.top.banners, `count ${count}, ${victim}`).toBe(predicted);
    }
    const s = build(P);
    const victim = s.units[1];
    expect(killBanners(s, victim)).toBe(1);
    s.special.objState[0].count = 1;
    expect(killBanners(s, victim)).toBe(2);
    expect(bannerValue(s, 'top', victim)).toBeGreaterThan(1.9);
  });

  it('killWeight raises the threat on the weighted arm (012: the later infantry kills score 2)', () => {
    const P: Pos = {
      first: 'top', banners: 9, objectives: [{ kind: 'killWeight', side: 'top', enemyArm: 'infantry', first: 1, later: 2 }],
      units: [top('FR/HC', [3, 6]), bot('BR/LN', [4, 6], { blocks: 1 })],
    };
    const first = build(P);
    const later = build(P);
    later.special.objState[0].count = 1;
    const ev0 = meleeEstimate(first, first.units[0], H(4, 6), makeEstCtx(first, 'top', W)).ev;
    const ev1 = meleeEstimate(later, later.units[0], H(4, 6), makeEstCtx(later, 'top', W)).ev;
    expect(ev1).toBeGreaterThan(ev0 + 0.3);
    expect(evalTerms(later, 'top', W).riskTheirs).toBeGreaterThan(evalTerms(first, 'top', W).riskTheirs);
  });

  it('R82: an impetuous cavalry unit is forced into the hex impetuousEnd predicts, and its threat is priced lower for the exposure', () => {
    const rules: Pos['sideRules'] = [{ kind: 'impetuousCavalry', side: 'bottom', keys: ['BR/HC'] }];
    const units = [bot('BR/HC', [5, 6]), top('FR/LN', [4, 6], { blocks: 1 }), top('FR/LN', [2, 9]), top('FR/LN', [2, 3])];
    const s = build({ first: 'bottom', sideRules: rules, units });
    const ends = impetuousEnd(s, occOf(s), s.units[0], H(4, 6));
    expect(ends.length).toBeGreaterThan(0);
    const d = toBattle(build({ first: 'bottom', sideRules: rules, units }), 'attackC', ['u1']);
    ev(d);
    forceDice(Array(12).fill('infantry'));
    attack(d, 'u1', H(4, 6));
    const met: string[] = [];
    for (let a = answerFor(d); a; a = answerFor(d)) {
      met.push(d.pending!.kind);
      must(d, a);
    }
    forceDice([]);
    expect(met).not.toContain('advance');
    expect(ends).toContain(d.state.units.find((x) => x.id === 'u1')!.hex);
    // the same attack by a cavalry unit that is not impetuous is worth more to its side
    const calm = build({ first: 'bottom', units });
    expect(evalTerms(s, 'bottom', W).riskTheirs).toBeLessThan(evalTerms(calm, 'bottom', W).riskTheirs);
  });
});

describe('evaluate: review round 1', () => {
  it('I-1: a defender holding a hex the enemy needs beats stepping back by ≥ 0.3 when an enemy can enter it next turn', () => {
    const P: Pos = { objectives: [{ kind: 'tempHex', side: 'top', hex: [4, 6], banners: 1 }], units: [top('FR/LT', [2, 6]), bot('BR/LN', [4, 6])] };
    const hold = build(P);
    const back = moved(hold, 'u2', H(5, 6));
    expect(evaluate(hold, 'bottom', W) - evaluate(back, 'bottom', W)).toBeGreaterThanOrEqual(0.3);
    // the needing side sees the same: the free hex it can enter next turn is worth a share of its banner
    expect(evalTerms(back, 'top', W).objectives - evalTerms(hold, 'top', W).objectives).toBeGreaterThanOrEqual(0.3);
  });

  it('I-1: 015, the Allied total evaluation drops when a farm holder steps off', () => {
    const s = createGame(scenarioById('015').setup, 1);
    const occ = occOf(s);
    let checked = 0;
    for (const o of s.scenario.objectives) {
      if (o.kind !== 'tempHex') continue;
      const holder = occ.unit[o.hex];
      if (!holder || holder.side !== 'top') continue;
      for (const off of neighbours(o.hex)) {
        if (occ.unit[off] || occ.leader[off] || s.terrain[off] === 'river') continue;
        expect(evaluate(moved(s, holder.id, off), 'top', W), `hex ${o.hex} -> ${off}`).toBeLessThan(evaluate(s, 'top', W));
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('I-2: this turn\'s orders do not leak into the evaluation (a gun that moved this turn still has its targets)', () => {
    const s = build({ first: 'bottom', units: [bot('BR/FA', [5, 6]), top('FR/LN', [2, 6])] });
    const plain = evalTerms(s, 'bottom', W);
    const mid = cloneState(s);
    mid.turn.phase = 'battle';
    mid.turn.mods = CARD_DEFS.bombard.mods;
    mid.turn.ordered = { u1: { ...newOrderedPiece(mid, 'u1', true), moved: 1, moveDone: true } };
    const t = evalTerms(mid, 'bottom', W);
    expect(plain.guns).toBeGreaterThan(0);
    expect(t.guns).toBe(plain.guns);
    expect(t.riskTheirs).toBeGreaterThan(0);
    // the turn's end ('done', the side that played still active, its orders still recorded) equals the normalised state
    const done = cloneState(mid);
    done.turn.phase = 'done';
    const norm = cloneState(done);
    norm.turn.ordered = {};
    norm.turn.mods = NO_MODS;
    expect(evaluate(done, 'bottom', W)).toBe(evaluate(norm, 'bottom', W));
    expect(evaluate(done, 'top', W)).toBe(evaluate(norm, 'top', W));
  });

  it('I-3: parking a second cavalry unit near an enemy square does not raise the squares term', () => {
    const P: Pos = { units: [top('FR/LN', [3, 6], { square: 1 }), bot('BR/LC', [6, 6]), bot('BR/HC', [8, 1])] };
    const before = build(P);
    const after = moved(before, 'u3', H(5, 8));
    expect(distance(H(5, 8), H(3, 6))).toBeLessThanOrEqual(3);
    expect(evalTerms(before, 'bottom', W).squares).toBeGreaterThan(0);
    expect(evalTerms(after, 'bottom', W).squares).toBeLessThanOrEqual(evalTerms(before, 'bottom', W).squares);
  });

  it('M-4: a context marked determinised is refused on a state that determinize did not produce', () => {
    const s = build({ units: [top('FR/LN', [2, 6]), bot('BR/LN', [6, 6])] });
    const fake = { ...makeEstCtx(s, 'bottom', W), determinised: true as const, oppHands: undefined };
    expect(() => evaluate(s, 'bottom', W, fake)).toThrow(/determinis/);
  });

  it('M-1: a sound unit on the exit hex gains by stepping off (the pull never outweighs the banner)', () => {
    const P: Pos = { banners: 6, objectives: [{ kind: 'exit', side: 'top', hex: [0, 4], banners: 1 }], units: [top('FR/LN', [0, 4]), bot('BR/LN', [8, 11])] };
    const on = build(P);
    const off = cloneState(on);
    off.units.splice(0, 1);
    off.players.top.banners += 1;
    expect(evaluate(off, 'top', W)).toBeGreaterThan(evaluate(on, 'top', W) + 0.1);
  });
});

describe('evaluate: timing', () => {
  it('logs the mean evaluation time over 200 calls on a 30-unit position', () => {
    const s = midgame('008', 160, 3);
    const me = s.active;
    const units = s.units.filter((u) => u.hex >= 0).length;
    for (let i = 0; i < 10; i++) evaluate(s, me, W);
    const t0 = performance.now();
    for (let i = 0; i < 200; i++) evaluate(s, me, W);
    const ms = (performance.now() - t0) / 200;
    console.info(`evaluate: ${ms.toFixed(3)} ms per call on a ${units}-unit position (008, 160 random decisions)`);
    expect(units).toBeGreaterThanOrEqual(25);
  });
});
