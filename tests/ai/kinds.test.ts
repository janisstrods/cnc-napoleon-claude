// One hand-built decision per decision kind (18): the policy's answer is legal, on the live state and on a determinised clone, and so is
// the simulation's safe answer.
import { describe, expect, it } from 'vitest';
import {
  GameDriver, answerError, forceDice, shortSupplyTargets, type Decision, type DieFace, type GameState, type Side,
} from '../../src/engine';
import { Rng } from '../../src/ai/rand';
import { policyFor, type PolicyCtx } from '../../src/ai/policies';
import { safeAnswer } from '../../src/ai/sim';
import { NEUTRAL_W } from '../../src/ai/values';
import { blindClone, determinize, isDeterminised } from '../../src/ai/view';
import { H, attack, build, endMoves, must, n, play, toBattle, type Pos } from '../rules/helpers';
import { failOnAiErrors } from './no-ai-errors';

failOnAiErrors();

type Units = NonNullable<Pos['units']>;
const top = (key: Units[number]['key'], at: [number, number], extra: object = {}) => ({ side: 'top' as const, key, at, ...extra });
const bot = (key: Units[number]['key'], at: [number, number], extra: object = {}) => ({ side: 'bottom' as const, key, at, ...extra });
const PAD = n('artillery', 40);

/** The 20 kinds of `Decision['kind']`, written out (the compiler checks the list is complete and exact): 18 base kinds and the 2 expansion kinds. */
const KINDS = [
  'playCard', 'orders', 'leaveSquare', 'move', 'battle', 'combinedArms', 'defend', 'ignoreFlags', 'retreat', 'leaderRetreat', 'advance',
  'breakthroughExtra', 'bonusMelee', 'elan', 'rally', 'scoutKeep', 'shortSupplyTarget', 'shortSupplyHex', 'guerrilla', 'moveFirst',
] as const satisfies readonly Decision['kind'][];
type Missing = Exclude<Decision['kind'], (typeof KINDS)[number]>;
const complete: Missing extends never ? true : false = true;

const win = (atk: 'BR/LN' | 'BR/HC', extra: Pos = {}, pieces = ['u1']): GameDriver => {
  const s = build({ ...extra, units: [bot(atk, [5, 6]), top('FR/LN', [4, 6], { blocks: 1 }), ...(extra.units ?? [])] });
  const d = toBattle(s, 'attackC', pieces);
  forceDice([...n('infantry', 4), ...PAD]);
  attack(d, 'u1', H(4, 6));
  return d;
};

/** Each decision reached the way a game reaches it. */
/** The expansion kinds are hand-built (their flows need expansion scenarios); their policies are pinned in exp1-cards.test.ts (Plan 7C Task 19). */
type Expansion = 'guerrilla' | 'moveFirst';
const reach: Record<Exclude<Decision['kind'], Expansion>, () => GameDriver> = {
  playCard: () => new GameDriver(build({ units: [bot('BR/LN', [6, 6]), top('FR/LN', [3, 6])] })),
  orders: () => play(build({ units: [bot('BR/LN', [6, 6]), top('FR/LN', [3, 6])] }), 'attackC'),
  leaveSquare: () => play(build({ units: [bot('BR/LN', [6, 6], { square: 1 }), top('FR/LN', [1, 6])] }), 'attackC', ['u1']),
  move: () => play(build({ units: [bot('BR/LN', [6, 6]), top('FR/LN', [3, 6])] }), 'attackC', ['u1']),
  battle: () => toBattle(build({ units: [bot('BR/LN', [5, 6]), top('FR/LN', [4, 6], { blocks: 1 })] }), 'attackC', ['u1']),
  combinedArms: () => {
    const s = build({ units: [bot('BR/LN', [5, 6]), top('FR/LN', [4, 6]), bot('BR/FA', [5, 5])] });
    const d = toBattle(s, 'assaultC', ['u1', 'u3']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    return d;
  },
  defend: () => {
    const d = toBattle(build({ first: 'top', bottomCards: 4, units: [top('FR/HC', [3, 6]), bot('BR/LN', [4, 6], { blocks: 2 })] }), 'attackC', ['u1']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    return d;
  },
  ignoreFlags: () => {
    // the defender u2 has friends beside and behind it: support lets it ignore a flag
    const d = toBattle(build({ first: 'top', units: [top('FR/LN', [4, 6]), bot('BR/LN', [5, 6]), bot('BR/LN', [6, 6]), bot('BR/LN', [6, 7])] }), 'attackC', ['u1']);
    forceDice(['flag', ...PAD]);
    must(d, { kind: 'attack', unit: 'u1', target: H(5, 6) });
    return d;
  },
  retreat: () => {
    const d = toBattle(build({ units: [bot('BR/LN', [5, 6]), top('FR/LN', [4, 6])] }), 'attackC', ['u1']);
    forceDice(['flag', ...PAD]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    return d;
  },
  leaderRetreat: () => {
    const d = toBattle(build({ leaders: [{ side: 'top', at: [4, 6] }], units: [bot('BR/LN', [5, 6])] }), 'attackC', ['u1']);
    forceDice(['flag', 'flag', ...PAD]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    return d;
  },
  advance: () => win('BR/LN'),
  breakthroughExtra: () => {
    const d = win('BR/HC');
    must(d, { kind: 'yesno', yes: true });
    return d;
  },
  bonusMelee: () => {
    const d = win('BR/HC', { units: [top('FR/LN', [3, 6])] });
    must(d, { kind: 'yesno', yes: true });
    must(d, { kind: 'hex', hex: null });
    return d;
  },
  elan: () => {
    const faces: DieFace[] = ['infantry', 'cavalry', 'artillery', 'flag', 'sabre'];
    forceDice(faces);
    return play(build({ units: [bot('BR/LN', [6, 6]), bot('BR/HC', [6, 2]), bot('BR/FA', [6, 10]), top('FR/LN', [3, 6])] }), 'elan');
  },
  rally: () => {
    forceDice(['infantry', 'cavalry', 'flag', 'sabre', 'infantry']);
    return play(build({ units: [bot('BR/LN', [6, 6], { blocks: 2 }), bot('BR/HC', [6, 2], { blocks: 2 }), top('FR/LN', [3, 6])] }), 'rally');
  },
  scoutKeep: () => {
    const d = play(build({ units: [bot('BR/LN', [6, 6]), top('FR/LN', [3, 6])] }), 'scoutC', ['u1']);
    for (let i = 0; i < 40 && d.pending && d.pending.kind !== 'scoutKeep'; i++) {
      const p = d.pending;
      if (p.kind === 'move') must(d, { kind: 'endMove' });
      else if (p.kind === 'battle') must(d, { kind: 'endBattle' });
      else if (p.kind === 'leaveSquare') must(d, { kind: 'yesno', yes: false });
      else break;
    }
    return d;
  },
  shortSupplyTarget: () => play(build({ units: [bot('BR/LN', [6, 6]), top('FR/LN', [3, 6])] }), 'shortSupply'),
  shortSupplyHex: () => {
    const d = play(build({ units: [bot('BR/LN', [6, 6]), top('FR/LN', [3, 6])] }), 'shortSupply');
    must(d, { kind: 'choose', index: 0 });
    return d;
  },
};

const ctxOf = (me: Side, seed = 5): PolicyCtx => ({ me, W: NEUTRAL_W, oppW: NEUTRAL_W, rand: new Rng(seed), mistakeRate: 0 });

describe('the 20 decision kinds', () => {
  it('are exactly the Decision union, and the test covers each one', () => {
    expect(complete).toBe(true);
    expect(KINDS).toHaveLength(20);
    expect([...Object.keys(reach), 'guerrilla', 'moveFirst'].sort()).toEqual([...KINDS].sort());
  });

  for (const kind of KINDS.filter((k): k is Exclude<typeof k, Expansion> => k !== 'guerrilla' && k !== 'moveFirst')) {
    describe(kind, () => {
      it('is answered legally by the policy, live and on a determinised clone, and by safeAnswer', () => {
        const d = reach[kind]();
        forceDice([]);
        const dec = d.pending;
        expect(dec?.kind).toBe(kind);
        const s: GameState = d.state;
        const me = dec!.side;
        expect(answerError(s, dec!, policyFor(ctxOf(me))(s, dec!))).toBeNull();
        // the same decision on a state `determinize` produced (what a simulation answers on), for either view
        for (const view of ['top', 'bottom'] as const) {
          const c = blindClone(s, view);
          determinize(c, view, new Rng(9));
          expect(isDeterminised(c)).toBe(true);
          expect(answerError(c, dec!, policyFor(ctxOf(view))(c, dec!)), `${kind} seen from ${view}`).toBeNull();
        }
        for (const attempt of [1, 2, 3]) expect(answerError(s, dec!, safeAnswer(s, dec!, new Rng(3), attempt)), `safeAnswer ${attempt}`).toBeNull();
      });
    });
  }

  it('the expansion kinds get legal safe answers from policyFor, live and determinised', () => {
    const s = build({ units: [bot('BR/LN', [6, 6]), top('FR/LN', [3, 6])] });
    const options = s.players.bottom.hand.slice(0, 2);
    const decisions: Decision[] = [
      { kind: 'guerrilla', side: 'bottom', mode: 'spend', card: null, held: 0, pool: 3 },
      { kind: 'moveFirst', side: 'bottom', options },
    ];
    for (const dec of decisions) {
      expect(answerError(s, dec, policyFor(ctxOf('bottom'))(s, dec)), dec.kind).toBeNull();
      const c = blindClone(s, 'bottom');
      determinize(c, 'bottom', new Rng(9));
      expect(answerError(c, dec, policyFor(ctxOf('bottom'))(c, dec)), `${dec.kind} determinised`).toBeNull();
      for (const attempt of [1, 2]) expect(answerError(s, dec, safeAnswer(s, dec, new Rng(3), attempt)), `${dec.kind} safeAnswer ${attempt}`).toBeNull();
    }
  });

  it('short supply offers units of both sides (the hand-built decision lists them)', () => {
    const s = build({ units: [bot('BR/LN', [6, 6]), top('FR/LN', [3, 6])] });
    expect(shortSupplyTargets(s, 'bottom')).toEqual(['u1', 'u2']);
    void endMoves;
  });
});
