import { describe, expect, it } from 'vitest';
import { OFF_BOARD, answerError, newOrderedPiece, distance, unitById, unitMoves, type Answer, type GameDriver, type GameState, type HexId } from '../../src/engine';
import type { MoveTarget } from '../../src/engine/movement';
import { occOf } from '../../src/ai/board';
import { makeBudget } from '../../src/ai/budget';
import { greedyMoveStep, scoreTarget, type MoveCtx } from '../../src/ai/moves';
import { Rng } from '../../src/ai/rand';
import { NEUTRAL_W } from '../../src/ai/values';
import { H, build, must, play, type Pos } from '../rules/helpers';
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

  it('a lone leader and an exit step are scored too (a leader move, an exit by an exit objective)', () => {
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
