import { describe, expect, it } from 'vitest';
import { OFF_BOARD, UNIT_STATS, answerError, cloneState, fireDice, newOrderedPiece, distance, unitById, unitMoves, type Answer, type GameDriver, type GameState, type HexId } from '../../src/engine';
import type { MoveTarget } from '../../src/engine/movement';
import { occOf } from '../../src/ai/board';
import { evaluate } from '../../src/ai/evaluate';
import { fireEstimate, makeEstCtx, takeGround } from '../../src/ai/estimate';
import { makeBudget } from '../../src/ai/budget';
import { greedyMoveStep, scoreTarget, type MoveCtx } from '../../src/ai/moves';
import { Rng } from '../../src/ai/rand';
import { NEUTRAL_W, weightsFor } from '../../src/ai/values';
import { H, build, giveCard, leaderId, must, play, type Pos } from '../rules/helpers';
import { failOnAiErrors } from './no-ai-errors';

failOnAiErrors();

type Units = NonNullable<Pos['units']>;
const top = (key: Units[number]['key'], at: [number, number], extra: object = {}) => ({ side: 'top' as const, key, at, ...extra });
const bot = (key: Units[number]['key'], at: [number, number], extra: object = {}) => ({ side: 'bottom' as const, key, at, ...extra });

/** The move decision of `bottom` with `pieces` ordered by `card`. */
function atMove(p: Pos, card: Parameters<typeof play>[1] = 'attackC', pieces = ['u1']): GameDriver {
  const d = play(build({ first: 'bottom', ...p }), card, pieces);
  while (d.pending?.kind === 'leaveSquare') must(d, { kind: 'yesno', yes: false });
  if (d.pending?.kind !== 'move') throw new Error(`no move decision: ${d.pending?.kind}`);
  return d;
}

function mcOf(s: GameState, over: Partial<MoveCtx> = {}): MoveCtx {
  return { me: 'bottom', W: NEUTRAL_W, occ: occOf(s), style: 'base', rand: new Rng(7), budget: makeBudget(1_000_000, null, null), ...over };
}

/** The target "stay where it stands": a path of one hex, as the planner offers it. */
function stay(s: GameState, id: string): MoveTarget {
  const u = unitById(s, id)!;
  return { hex: u.hex, path: [u.hex], stops: false, battle: true, attach: null };
}

/** Where the piece ends up after the greedy step's answer. */
function endHex(s: GameState, id: string, a: Answer): HexId {
  return a.kind === 'move' && a.piece === id ? a.to : unitById(s, id)!.hex;
}

const snapshot = (s: GameState): string => JSON.stringify([s.units, s.leaders, s.turn, s.players, s.deck, s.rng, s.rngCalls, s.discard]);

describe('scoreTarget', () => {
  it('a foot gun with a target in range stands (scoreTarget of its own hex beats the 1-hex no-battle move)', () => {
    const d = atMove({ units: [bot('BR/FA', [6, 6]), top('FR/LN', [3, 6])] });
    const s = d.state;
    const own = scoreTarget(s, 'u1', stay(s, 'u1'), mcOf(s));
    const steps = unitMoves(s, 'u1').filter((m) => !m.battle);
    expect(steps.length).toBeGreaterThan(0);
    for (const m of steps) expect(scoreTarget(s, 'u1', m, mcOf(s)), `step to ${m.hex}`).toBeLessThan(own);
    // and the greedy step leaves it standing
    expect(greedyMoveStep(s, mcOf(s)).kind).toBe('endMove');
  });

  it('a line unit at range 3 of a worn enemy steps to range 2 and fires when the halved dice still pay', () => {
    const d = atMove({ units: [bot('BR/LN', [6, 6]), top('FR/LN', [3, 6], { blocks: 1 })] });
    const s = d.state;
    const target = H(3, 6);
    expect(distance(H(6, 6), target)).toBe(3);
    const a = greedyMoveStep(s, mcOf(s));
    expect(a.kind).toBe('move');
    const to = endHex(s, 'u1', a);
    expect(distance(to, target)).toBe(2);
    // the step beats standing, and a sound enemy line (the dice no longer pay) does not draw it forward
    const mc = mcOf(s);
    const step = unitMoves(s, 'u1').find((m) => m.hex === to)!;
    expect(scoreTarget(s, 'u1', step, mc)).toBeGreaterThan(scoreTarget(s, 'u1', stay(s, 'u1'), mc));
    const flat = atMove({ units: [bot('BR/LN', [6, 6]), top('FR/LN', [3, 6])] }).state;
    const stepFlat = unitMoves(flat, 'u1').find((m) => m.hex === to)!;
    const gain = scoreTarget(s, 'u1', step, mc) - scoreTarget(s, 'u1', stay(s, 'u1'), mc);
    const gainFlat = scoreTarget(flat, 'u1', stepFlat, mcOf(flat)) - scoreTarget(flat, 'u1', stay(flat, 'u1'), mcOf(flat));
    expect(gain).toBeGreaterThan(gainFlat);
  });

  it('a square has no move targets and greedyMoveStep ends the move', () => {
    const s = build({ first: 'bottom', units: [bot('BR/LN', [6, 6], { square: 1 }), top('FR/HC', [3, 6])] });
    s.turn.ordered.u1 = newOrderedPiece(s, 'u1', false);
    expect(unitMoves(s, 'u1')).toEqual([]);
    expect(greedyMoveStep(s, mcOf(s))).toEqual({ kind: 'endMove' });
  });

  it('the safe style keeps a worn unit out of enemy melee reach; the bold style closes', () => {
    const p: Pos = { units: [bot('BR/LN', [6, 6], { blocks: 2 }), bot('BR/LN', [8, 2]), top('FR/LN', [3, 6], { blocks: 2 })] };
    const s = atMove(p).state;
    const enemy = H(3, 6);
    const safe = endHex(s, 'u1', greedyMoveStep(s, mcOf(s, { style: 'safe' })));
    const bold = endHex(s, 'u1', greedyMoveStep(s, mcOf(s, { style: 'bold' })));
    // line infantry moves 1 and fights: its melee reach is 2 hexes
    expect(distance(safe, enemy)).toBeGreaterThanOrEqual(3);
    expect(distance(bold, enemy)).toBeLessThanOrEqual(2);
  });

  it('the hold style prefers standing to the base style; the noisy style follows its generator', () => {
    const s = atMove({ units: [bot('BR/LN', [6, 6]), top('FR/LN', [3, 6])] }).state;
    const st = stay(s, 'u1');
    expect(scoreTarget(s, 'u1', st, mcOf(s, { style: 'hold' }))).toBeGreaterThan(scoreTarget(s, 'u1', st, mcOf(s)));
    const noisy = (seed: number): number => scoreTarget(s, 'u1', st, mcOf(s, { style: 'noisy', rand: new Rng(seed) }));
    expect(noisy(5)).toBe(noisy(5));
    expect(noisy(5)).not.toBe(noisy(6));
  });

  it('scoring charges one node per target and stops evaluating once the budget is spent (still legal)', () => {
    const d = atMove({ units: [bot('BR/LN', [6, 6]), top('FR/LN', [3, 6])] });
    const s = d.state;
    const moves = unitMoves(s, 'u1');
    expect(moves.length).toBeGreaterThan(3);
    const mc = mcOf(s);
    for (const m of moves.slice(0, 3)) scoreTarget(s, 'u1', m, mc);
    expect(mc.budget.nodes).toBe(3);
    const small = mcOf(s, { budget: makeBudget(4, null, null) });
    const a = greedyMoveStep(s, small);
    expect(small.budget.nodes).toBe(4);
    expect(answerError(s, d.pending!, a)).toBeNull();
    // spent from the start: nothing is evaluated, the unit still takes the target nearest its goal (towards the enemy)
    const none = mcOf(s, { budget: makeBudget(0, null, null) });
    const b = greedyMoveStep(s, none);
    expect(none.budget.nodes).toBe(0);
    expect(answerError(s, d.pending!, b)).toBeNull();
    expect(b.kind).toBe('move');
    expect(distance(endHex(s, 'u1', b), H(3, 6))).toBeLessThan(distance(H(6, 6), H(3, 6)));
  });

  it('scoring a move never changes the root state or its rngCalls', () => {
    const d = atMove({ units: [bot('BR/LN', [6, 6]), bot('BR/FA', [7, 5]), top('FR/LN', [3, 6]), top('FR/LC', [2, 3])], leaders: [{ side: 'bottom', at: [6, 6] }] }, 'forward', ['u1', 'u2']);
    const s = d.state;
    const before = snapshot(s);
    const calls = s.rngCalls;
    const mc = mcOf(s);
    for (const id of ['u1', 'u2']) for (const m of unitMoves(s, id)) scoreTarget(s, id, m, mc);
    greedyMoveStep(s, mc);
    expect(snapshot(s)).toBe(before);
    expect(s.rngCalls).toBe(calls);
  });
});

describe('greedyMoveStep: the Napoleonic moves', () => {
  it("light cavalry's 3-hex move flanks onto a worn gun", () => {
    const d = atMove({ units: [bot('BR/LC', [7, 2]), top('FR/FA', [3, 2], { blocks: 1 }), top('FR/LN', [3, 8])] }, 'attackL');
    const s = d.state;
    const a = greedyMoveStep(s, mcOf(s));
    expect(a.kind).toBe('move');
    const to = endHex(s, 'u1', a);
    expect(distance(to, H(3, 2))).toBe(1);
    expect(distance(H(7, 2), to)).toBe(3);
  });

  it("Bayonet Charge's 2 hexes put the infantry into melee with a worn line", () => {
    const d = atMove({ units: [bot('BR/LN', [7, 6]), top('FR/LN', [4, 6], { blocks: 1 }), top('FR/LN', [1, 6])] }, 'bayonetCharge');
    const s = d.state;
    const a = greedyMoveStep(s, mcOf(s));
    expect(a.kind).toBe('move');
    const to = endHex(s, 'u1', a);
    expect(distance(to, H(4, 6))).toBe(1);
    expect(distance(H(7, 6), to)).toBe(2);
  });

  it("La Grande Manoeuvre's 4 hexes (no battle) go to an objective hex", () => {
    const d = atMove({ objectives: [{ kind: 'tempHex', side: 'bottom', hex: [4, 6], banners: 1 }], units: [bot('BR/LN', [8, 6]), top('FR/LN', [0, 6])] }, 'grandManoeuvre');
    const s = d.state;
    const a = greedyMoveStep(s, mcOf(s));
    expect(a).toEqual({ kind: 'move', piece: 'u1', to: H(4, 6) });
  });

  it("La Grande Manoeuvre's 4 hexes take a worn unit out of danger", () => {
    const d = atMove({ units: [bot('BR/LN', [5, 6], { blocks: 1 }), top('FR/LC', [3, 5]), top('FR/LN', [3, 7])] }, 'grandManoeuvre');
    const s = d.state;
    const a = greedyMoveStep(s, mcOf(s, { style: 'safe' }));
    expect(a.kind).toBe('move');
    const to = endHex(s, 'u1', a);
    // light cavalry threatens 3 hexes of movement and the adjacency: out of its reach
    expect(distance(to, H(3, 5))).toBeGreaterThanOrEqual(5);
  });

  it('an exit step by an exit objective is scored as a win and taken', () => {
    const d = atMove({ objectives: [{ kind: 'exit', side: 'bottom', hex: [0, 6], banners: 1 }], units: [bot('BR/LN', [0, 6]), top('FR/LN', [5, 6])], banners: 1 });
    const s = d.state;
    const exit = unitMoves(s, 'u1').find((m) => m.hex === OFF_BOARD);
    expect(exit).toBeDefined();
    const mc = mcOf(s);
    expect(scoreTarget(s, 'u1', exit!, mc)).toBeGreaterThan(50);
    expect(greedyMoveStep(s, mc)).toEqual({ kind: 'move', piece: 'u1', to: OFF_BOARD });
  });

  it('R82: an impetuous cavalry unit scores lower for its forced advance next to the enemy', () => {
    const units: Units = [
      bot('BR/HC', [7, 6]), top('FR/LN', [4, 6], { blocks: 1 }),
      top('FR/LN', [3, 5]), top('FR/LN', [3, 7]), top('FR/LN', [4, 4]), top('FR/LN', [4, 8]),
    ];
    const rules: Pos['sideRules'] = [{ kind: 'impetuousCavalry', side: 'bottom', keys: ['BR/HC'] }];
    const calm = atMove({ units }).state;
    const wild = atMove({ units, sideRules: rules }).state;
    const hit = (s: GameState): MoveTarget => unitMoves(s, 'u1').find((m) => m.battle && !m.stops && distance(m.hex, H(4, 6)) === 1)!;
    expect(hit(calm)).toBeDefined();
    expect(hit(wild).hex).toBe(hit(calm).hex);
    expect(scoreTarget(wild, 'u1', hit(wild), mcOf(wild))).toBeLessThan(scoreTarget(calm, 'u1', hit(calm), mcOf(calm)) - 0.05);
  });
});

describe('review round 1', () => {
  it('1: the root context follows the board: a state mutated in place evaluates as its clone does', () => {
    const s = build({
      units: [bot('BR/LN', [8, 1], { square: 1 }), bot('BR/LN', [8, 6]), bot('BR/LN', [8, 8]), bot('BR/HC', [8, 10]), bot('BR/FA', [8, 4]), top('FR/LN', [1, 6]), top('FR/LN', [1, 3])],
      first: 'bottom',
    });
    for (const k of ['attackC', 'assaultC', 'forward', 'bayonetCharge'] as const) giveCard(s, 'bottom', k);
    evaluate(s, 'bottom', NEUTRAL_W); // makes and caches the root context for this board
    // the same cards, a different board: the units close with the enemy
    s.units[1].hex = H(2, 6);
    s.units[2].hex = H(2, 7);
    s.units[3].hex = H(2, 5);
    s.units[4].hex = H(3, 6);
    expect(evaluate(s, 'bottom', NEUTRAL_W)).toBe(evaluate(cloneState(s), 'bottom', NEUTRAL_W));
    expect(makeEstCtx(s, 'bottom', NEUTRAL_W).cardValue).not.toBeNaN();
  });

  it('c: contextFor checks its weights: two weight sets on one state, in either order, each match a fresh copy', () => {
    const s = build({
      units: [bot('BR/LN', [6, 6]), bot('BR/HC', [7, 3]), bot('BR/FA', [7, 8]), top('FR/LN', [3, 6]), top('FR/HC', [2, 3])],
      first: 'bottom',
    });
    const W2 = weightsFor({ aggression: 0.9, caution: 0.1, cunning: 0.2, dash: 0.9 });
    expect(W2.riskSelf).not.toBe(NEUTRAL_W.riskSelf);
    const fresh = (W: typeof NEUTRAL_W): number => evaluate(cloneState(s), 'bottom', W);
    const a1 = evaluate(s, 'bottom', NEUTRAL_W);
    const b1 = evaluate(s, 'bottom', W2);
    const a2 = evaluate(s, 'bottom', NEUTRAL_W); // back to the first set on the same state object
    const b2 = evaluate(s, 'bottom', W2);
    expect(a1).toBe(fresh(NEUTRAL_W));
    expect(b1).toBe(fresh(W2));
    expect(a2).toBe(a1);
    expect(b2).toBe(b1);
    expect(b1).not.toBe(a1);
  });

  it('2a: a move that fires counts the halved dice of moving fire (step 1 hex, fire at 1 hex moved)', () => {
    const s = atMove({ units: [bot('BR/LN', [6, 6]), top('FR/LN', [3, 6])] }).state;
    const step = unitMoves(s, 'u1').find((m) => m.battle && distance(m.hex, H(3, 6)) === 2)!;
    const mc = mcOf(s);
    const c = cloneState(s);
    const base = scoreTarget(s, 'u1', step, mcOf(s, { style: 'base' }));
    // the attack part of the score is 0.85 x the fire estimate at the dice for 1 hex moved, not the standing dice
    const noAttack = scoreTarget(s, 'u1', { ...step, battle: false }, mc);
    const rec = (moved: number): number => {
      const cc = cloneState(c);
      const u = cc.units[0];
      cc.turn.ordered.u1.moved = moved;
      u.hex = step.hex;
      const ec = { ...makeEstCtx(cc, 'bottom', NEUTRAL_W), occ: occOf(cc), moved };
      return fireEstimate(cc, u, H(3, 6), ec).ev;
    };
    expect(fireDice(s, { ...s.units[0], hex: step.hex }, H(3, 6), { role: 'attack', moved: 1 })).toBeLessThan(fireDice(s, { ...s.units[0], hex: step.hex }, H(3, 6), { role: 'attack', moved: 0 }));
    expect(rec(1)).toBeLessThan(rec(0));
    expect(base - noAttack).toBeCloseTo(0.85 * rec(1), 6);
  });

  it('2b: the safe style closes less than the base style', () => {
    const p: Pos = { units: [bot('BR/LN', [6, 6], { blocks: 3 }), bot('BR/LN', [8, 2]), top('FR/LN', [3, 6], { blocks: 2 })] };
    const s = atMove(p).state;
    const enemy = H(3, 6);
    const safe = distance(endHex(s, 'u1', greedyMoveStep(s, mcOf(s, { style: 'safe' }))), enemy);
    const base = distance(endHex(s, 'u1', greedyMoveStep(s, mcOf(s, { style: 'base' }))), enemy);
    expect(safe).toBeGreaterThan(base);
  });

  it('3: a MoveCtx reused in the next turn forgets the pieces decided in the last', () => {
    const p: Pos = { units: [bot('BR/FA', [6, 6]), top('FR/LN', [3, 6])] };
    const s1 = atMove(p).state;
    const mc = mcOf(s1);
    expect(greedyMoveStep(s1, mc).kind).toBe('endMove'); // the gun stands: decided
    expect(mc.decided!.has('u1')).toBe(true);
    const spent = mc.budget.nodes;
    expect(spent).toBeGreaterThan(0);
    const s2 = cloneState(s1);
    s2.turn.number += 1;
    greedyMoveStep(s2, mc);
    // the pieces decided last turn were looked at again (targets scored afresh), not skipped as decided
    expect(mc.budget.nodes).toBeGreaterThan(spent);
    // a new turn: u1 was looked at afresh (it is decided again, after a clear)
    expect(mc.decidedFor).toBe(`${s2.turn.number}|${s2.active}|${s2.turn.card}`);
    expect([...mc.decided!]).toEqual(['u1']);
  });

  it('6: a lone leader next to the enemy is scored and steps away', () => {
    const p: Pos = { units: [bot('BR/LN', [7, 6]), top('FR/LN', [3, 6])], leaders: [{ side: 'bottom', at: [4, 6] }] };
    const id = leaderId(build({ first: 'bottom', ...p }), 0);
    const s = atMove(p, 'attackC', [id]).state;
    expect(unitMoves(s, id)).toEqual([]);
    const mc = mcOf(s);
    const a = greedyMoveStep(s, mc);
    expect(a.kind).toBe('move');
    expect(a.kind === 'move' && a.piece).toBe(id);
    expect(distance(a.kind === 'move' ? a.to : H(4, 6), H(3, 6))).toBeGreaterThan(1);
    expect(mc.budget.nodes).toBeGreaterThan(1);
  });

  it('7: the bonus prospect is memoised per (attacker, blocks, vacated hex, hexes moved): different keys, different prospects', () => {
    const s = build({ units: [bot('BR/LC', [6, 6]), top('FR/LN', [5, 6], { blocks: 1 }), top('FR/LN', [4, 5]), top('FR/LN', [4, 7])], first: 'bottom' });
    // in the base game a unit that moved rolls as many melee dice as one that did not, so `moved` could not change a prospect;
    // here the row loses a die after moving (the Spanish rule, `movedPlus` −1), so the hexes moved really change the value
    const row = UNIT_STATS['BR/LC'];
    s.scenario = { ...s.scenario, unitStats: { ...s.scenario.unitStats, 'BR/LC': { ...row, melee: { kind: 'blocks', plus: 0, vsInfantry: 0, movedPlus: -1 } } } };
    const ec = makeEstCtx(s, 'bottom', NEUTRAL_W);
    const adv = (moved: number, atk = s.units[0]) => takeGround(s, atk, H(5, 6), { ...ec, moved });
    const a0 = adv(0).value;
    const a2 = adv(2).value; // same occ, another `moved`: the bonus melee's dice differ (moved hexes), not a cached copy
    expect(adv(0).value).toBe(a0);
    expect(adv(2).value).toBe(a2);
    expect(a2).not.toBe(a0); // `moved` is part of the prospect key: the two really are different values
    const worn = { ...s.units[0], blocks: 1 };
    expect(adv(0, worn).value).not.toBe(a0);
  });
});
