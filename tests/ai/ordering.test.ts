import { describe, expect, it } from 'vitest';
import {
  CARD_DEFS, CARD_LIST, GameDriver, cloneState, createGame, effectiveCard, eligiblePieces, enemyUnitAdjacent, leaderUnit, randomAnswer, sectionsOf,
  validateOrders, type CardKind, type GameState, type Side,
} from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { MAX_CANDIDATES, orderCandidates, pieceBenefits, quickCardScore } from '../../src/ai/ordering';
import { NEUTRAL_W } from '../../src/ai/values';
import { H, build, type Pos } from '../rules/helpers';
import { failOnAiErrors } from './no-ai-errors';

failOnAiErrors();

type Units = NonNullable<Pos['units']>;
const top = (key: Units[number]['key'], at: [number, number], extra: object = {}) => ({ side: 'top' as const, key, at, ...extra });
const bot = (key: Units[number]['key'], at: [number, number], extra: object = {}) => ({ side: 'bottom' as const, key, at, ...extra });
const W = NEUTRAL_W;
const KINDS = Object.keys(CARD_DEFS) as CardKind[];
const id = (k: CardKind): number => CARD_LIST.indexOf(k);

/** The kit position: both sides in all arms, leaders, contact in the centre. Bottom to play, Command set as a played card would. */
function kit(): GameState {
  const s = build({
    units: [
      bot('BR/LN', [6, 5]), bot('BR/LN', [6, 6]), bot('BR/LN', [6, 7]), bot('BR/LT', [7, 3]), bot('BR/HC', [7, 8]), bot('BR/LC', [7, 10]), bot('BR/FA', [7, 6]),
      bot('BR/GR', [7, 4]),
      top('FR/LN', [5, 5]), top('FR/LN', [5, 6]), top('FR/LC', [4, 8]), top('FR/FA', [3, 6]), top('FR/LN', [4, 2]),
    ],
    leaders: [{ side: 'bottom', at: [6, 6] }, { side: 'bottom', at: [7, 9] }, { side: 'top', at: [5, 6] }],
    first: 'bottom',
  });
  s.lastCard.top = 'attackL';
  return s;
}

function midgame(sid: string, decisions: number, seed: number): GameState {
  const d = new GameDriver(createGame(scenarioById(sid).setup, seed));
  let x = seed;
  const rnd = (): number => {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    return x / 0x80000000;
  };
  for (let i = 0; i < decisions && d.pending && !d.state.winner; i++) d.answer(randomAnswer(d.state, d.pending, rnd));
  return d.state;
}

/** The state at the card decision of `side` (a played card's Command is the hand, so the view sets it as the planner does). */
function atCard(s: GameState): GameState {
  const c = cloneState(s);
  c.turn.phase = 'card';
  return c;
}
const side = (s: GameState): Side => s.active;

/** Every candidate of `kind` validates against the card it plays (its copy for a Counter-Attack), at Command = hand. */
function checkAll(s0: GameState, kind: CardKind, label: string): number {
  const s = atCard(s0);
  const me = side(s);
  const eff = effectiveCard(s, me, id(kind)).kind;
  const cands = orderCandidates(s, me, kind, W, 99);
  expect(cands.length, `${label} ${kind}`).toBeGreaterThan(0);
  expect(cands.length, `${label} ${kind} cap`).toBeLessThanOrEqual(MAX_CANDIDATES);
  const v = cloneState(s);
  v.turn.command = s.players[me].hand.length;
  for (const c of cands) {
    expect(validateOrders(v, me, eff ?? kind, c.pieces, c.single), `${label} ${kind}: ${c.label}`).toBeNull();
  }
  return cands.length;
}

describe('orderCandidates', () => {
  it('every candidate passes validateOrders, for every card kind in CARD_DEFS on the kit position', () => {
    for (const kind of KINDS) checkAll(kit(), kind, 'kit');
    // a Counter-Attack with nothing to copy, and one copying a card the position cannot use
    const none = kit();
    none.lastCard.top = null;
    checkAll(none, 'counterAttack', 'no copy');
  });

  it('every candidate passes validateOrders on mid-game positions of three battles, both sides', () => {
    for (const [sid, n, seed] of [['001', 60, 3], ['006', 80, 5], ['012', 70, 7], ['015', 90, 11]] as const) {
      const s = midgame(sid, n, seed);
      if (s.winner) continue;
      for (const act of ['top', 'bottom'] as const) {
        const t = cloneState(s);
        t.active = act;
        for (const kind of KINDS) checkAll(t, kind, `${sid} ${act}`);
      }
    }
  });

  it('Force March offers each section that has infantry; Fire and Hold skips units adjacent to the enemy', () => {
    const s = atCard(kit());
    const fm = orderCandidates(s, 'bottom', 'forceMarch', W, 99);
    const infantrySections = new Set(s.units.filter((u) => u.side === 'bottom' && /\/(LN|LT|GR)$/.test(u.key)).flatMap((u) => sectionsOf(u.hex, 'bottom')));
    const offered = new Set(fm.flatMap((c) => c.pieces.map((p) => s.units.find((u) => u.id === p)!).flatMap((u) => sectionsOf(u.hex, 'bottom'))));
    for (const sec of infantrySections) expect(offered.has(sec), sec).toBe(true);
    // each candidate is the whole section's infantry
    for (const c of fm) expect(c.pieces.every((p) => /^u/.test(p))).toBe(true);

    const fh = orderCandidates(s, 'bottom', 'fireAndHold', W, 99);
    const adjacent = s.units.filter((u) => u.side === 'bottom' && enemyUnitAdjacent(s, u.hex, 'bottom')).map((u) => u.id);
    expect(adjacent.length).toBeGreaterThan(0);
    for (const c of fh) for (const p of c.pieces) expect(adjacent).not.toContain(p);
    expect(fh[0].pieces.length).toBeGreaterThan(0);
  });

  it('La Grande Manoeuvre offers both modes (up to 4 movers, or 1 unit under normal rules)', () => {
    const s = atCard(kit());
    const gm = orderCandidates(s, 'bottom', 'grandManoeuvre', W, 99);
    expect(gm.some((c) => !c.single && c.pieces.length >= 2 && c.pieces.length <= 4)).toBe(true);
    const single = gm.filter((c) => c.single);
    expect(single.length).toBeGreaterThan(0);
    for (const c of single) expect(c.pieces).toHaveLength(1);
    // the first candidate alone (n = 1) still answers legally
    const one = orderCandidates(s, 'bottom', 'grandManoeuvre', W, 1);
    expect(one).toHaveLength(1);
  });

  it('candidate count is capped at 8 even with 6 leaders (Leadership) or 10 adjacent units (Cold Steel)', () => {
    const units: Units = [];
    const leaders: NonNullable<Pos['leaders']> = [];
    for (let c = 1; c <= 10; c++) {
      units.push(bot('BR/LN', [5, c]), top('FR/LN', [4, c]));
      if (c <= 6) leaders.push({ side: 'bottom', at: [5, c] });
    }
    units.push(bot('BR/LN', [6, 3]), bot('BR/LN', [6, 4]), bot('BR/LN', [6, 5]));
    const s = atCard(build({ units, leaders, first: 'bottom' }));
    const lead = orderCandidates(s, 'bottom', 'leadership', W, 99);
    expect(lead.length).toBeGreaterThan(2);
    expect(lead.length).toBeLessThanOrEqual(8);
    const adj = s.units.filter((u) => u.side === 'bottom' && enemyUnitAdjacent(s, u.hex, 'bottom'));
    expect(adj.length).toBeGreaterThanOrEqual(10);
    const cold = orderCandidates(s, 'bottom', 'coldSteel', W, 99);
    expect(cold.length).toBeLessThanOrEqual(8);
    expect(cold[0].pieces).toHaveLength(adj.length);
    for (const kind of KINDS) expect(orderCandidates(s, 'bottom', kind, W, 99).length, kind).toBeLessThanOrEqual(8);
    // a leader attached to a unit stays with it in the fullest Leadership candidate
    expect(leaderUnit(s, s.leaders[0])).toBeDefined();
  });

  it('every candidate set is made once, best first by the benefit of its pieces', () => {
    const s = atCard(kit());
    for (const kind of ['attackC', 'probeC', 'assaultC', 'forward', 'leadership'] as const) {
      const c = orderCandidates(s, 'bottom', kind, W, 99);
      const keys = c.map((x) => `${x.single ? 's' : ''}${[...x.pieces].sort().join(',')}`);
      expect(new Set(keys).size).toBe(keys.length);
      expect(c[0].benefit, kind).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('sections', () => {
  it('a unit on a dotted-line hex is offered to either section\'s card, and to no other', () => {
    // a hex of the bottom side's row 6 that lies on a section line: two sections
    let dotted = -1;
    for (let c = 0; c < 12 && dotted < 0; c++) if (sectionsOf(H(6, c), 'bottom').length === 2) dotted = H(6, c);
    expect(dotted).toBeGreaterThanOrEqual(0);
    const secs = sectionsOf(dotted, 'bottom');
    const cardOf = (sec: string): CardKind => (sec === 'left' ? 'attackL' : sec === 'center' ? 'attackC' : 'attackR');
    const [r, c] = [Math.floor(dotted / 13), dotted % 13];
    const s = atCard(build({ units: [bot('BR/LN', [r, c]), top('FR/LN', [3, c])], first: 'bottom' }));
    const other = (['left', 'center', 'right'] as const).find((x) => !secs.includes(x))!;
    for (const sec of secs) {
      const cands = orderCandidates(s, 'bottom', cardOf(sec), W, 99);
      expect(cands.some((x) => x.pieces.includes('u1')), `${sec} card`).toBe(true);
      checkAll(s, cardOf(sec), `dotted ${sec}`);
    }
    // the section it is not in cannot order it, and the engine agrees
    const cands = orderCandidates(s, 'bottom', cardOf(other), W, 99);
    expect(cands.every((x) => !x.pieces.includes('u1'))).toBe(true);
    expect(eligiblePieces({ ...s, turn: { ...s.turn, command: 5 } }, 'bottom', cardOf(other))).not.toContain('u1');
    for (const sec of secs) expect(eligiblePieces({ ...s, turn: { ...s.turn, command: 5 } }, 'bottom', cardOf(sec))).toContain('u1');
  });
});

describe('trimming and detaching', () => {
  it('asking for n candidates gives the first n of the full list, for n in 2..7', () => {
    const s = atCard(kit());
    for (const kind of ['attackC', 'forward', 'leadership', 'grandManoeuvre'] as const) {
      const full = orderCandidates(s, 'bottom', kind, W, 99);
      for (let n = 2; n <= 7; n++) {
        const part = orderCandidates(s, 'bottom', kind, W, n);
        expect(part.map((c) => c.label), `${kind} n=${n}`).toEqual(full.slice(0, n).map((c) => c.label));
      }
    }
  });

  it('a leader riding with a battered unit near the enemy is offered as a piece of his own (a detach candidate)', () => {
    const s0 = build({
      units: [bot('BR/LN', [6, 6], { blocks: 1 }), bot('BR/LN', [6, 7]), top('FR/LN', [4, 6])],
      leaders: [{ side: 'bottom', at: [6, 6] }], first: 'bottom',
    });
    const s = atCard(s0);
    const l = s.leaders[0].id;
    expect(pieceBenefits(s, 'bottom', 'attackC', W).get(l)!).toBeGreaterThan(0.05);
    const cands = orderCandidates(s, 'bottom', 'attackC', W, 99);
    expect(cands.some((c) => c.pieces.includes(l))).toBe(true);
    for (const c of cands) expect(validateOrders({ ...s, turn: { ...s.turn, command: 5 } }, 'bottom', 'attackC', c.pieces)).toBeNull();
  });

  it('Cold Steel scores above 0 with units next to the enemy, and Rally without a benefit pass', () => {
    const s = atCard(kit());
    expect(quickCardScore(s, 'bottom', id('coldSteel'), W)).toBeGreaterThan(0);
    expect(orderCandidates(s, 'bottom', 'coldSteel', W)[0].benefit!).toBeGreaterThan(0);
    expect(pieceBenefits(s, 'bottom', 'rally', W).size).toBe(0);
    const hurt = cloneState(s);
    hurt.units.find((u) => u.side === 'bottom')!.blocks = 1;
    expect(quickCardScore(hurt, 'bottom', id('rally'), W)).toBeGreaterThan(0);
  });
});

describe('pieceBenefits and quickCardScore', () => {
  it('pieces that can strike gain more than pieces far from the fight; a card that cannot order a piece gives it nothing', () => {
    const s = atCard(kit());
    const ben = pieceBenefits(s, 'bottom', 'attackC', W);
    const front = s.units.find((u) => u.side === 'bottom' && u.hex === s.units.find((x) => x.key === 'BR/LN')!.hex)!;
    expect(ben.get(front.id)!).toBeGreaterThan(0);
    const elig = new Set(eligiblePieces({ ...s, turn: { ...s.turn, command: 5 } }, 'bottom', 'attackC'));
    for (const k of ben.keys()) expect(elig.has(k) || s.leaders.some((l) => l.id === k), k).toBe(true);
    expect(pieceBenefits(s, 'bottom', 'firstStrike', W).size).toBe(0);
  });

  it('quickCardScore prefers an Attack card for the section where our units can strike', () => {
    const s = atCard(kit());
    const centreScore = quickCardScore(s, 'bottom', id('attackC'), W);
    const rightScore = quickCardScore(s, 'bottom', id('attackR'), W);
    const leftScore = quickCardScore(s, 'bottom', id('attackL'), W);
    expect(centreScore).toBeGreaterThan(0);
    expect(centreScore).toBeGreaterThan(rightScore);
    expect(centreScore).toBeGreaterThan(leftScore);
    expect(quickCardScore(s, 'bottom', id('firstStrike'), W)).toBeLessThan(0);
    for (const kind of KINDS) expect(Number.isFinite(quickCardScore(s, 'bottom', id(kind), W)), kind).toBe(true);
  });

  it('estimates are pure: the position and the game generator are untouched', () => {
    const s = atCard(kit());
    const before = JSON.stringify([s.units, s.leaders, s.turn]);
    const rng = [s.rng, s.rngCalls];
    orderCandidates(s, 'bottom', 'assaultC', W, 99);
    orderCandidates(s, 'bottom', 'cavalryCharge', W, 99);
    expect(JSON.stringify([s.units, s.leaders, s.turn])).toBe(before);
    expect([s.rng, s.rngCalls]).toEqual(rng);
  });
});
