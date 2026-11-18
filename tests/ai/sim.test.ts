import { describe, expect, it } from 'vitest';
import { cloneState, createGame, forceDice, turnFlow, type Answer, type Decision, type FlowCtx, type Gen, type GameState } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { makeBudget } from '../../src/ai/budget';
import { policyFor, type Policy as _P } from '../../src/ai/policies';
import { Rng } from '../../src/ai/rand';
import { Stepper, drive, runTurn, safeAnswer } from '../../src/ai/sim';
import { NEUTRAL_W } from '../../src/ai/values';
import { blindClone, determinize, isDeterminised } from '../../src/ai/view';
import { failOnAiErrors } from './no-ai-errors';

failOnAiErrors();
void (null as unknown as _P);

const root = (seed = 7): GameState => createGame(scenarioById('000').setup, seed);
const snapshot = (s: GameState): string => JSON.stringify(s);
const budget = () => makeBudget(1_000_000, null, null);

function policyOf(s: GameState, seed: number) {
  return policyFor({ me: s.active, W: NEUTRAL_W, oppW: NEUTRAL_W, rand: new Rng(seed), mistakeRate: 0 });
}

/** A determinised clone of the root for its active side. */
function sampled(r: GameState, seed: number): GameState {
  const c = blindClone(r, r.active);
  determinize(c, r.active, new Rng(seed));
  return c;
}

describe('runTurn', () => {
  it('plays a whole turn of 000 on a determinised clone and leaves the root state untouched', () => {
    const r = root();
    const before = snapshot(r);
    const c = sampled(r, 11);
    expect(isDeterminised(c)).toBe(true);
    const b = budget();
    const run = runTurn(c, policyOf(c, 5), new Rng(5), b);
    expect(run.done).toBe(true);
    expect(run.steps).toBeGreaterThan(1);
    expect(b.nodes).toBe(1);
    expect(c.turn.phase === 'done' || c.winner !== null).toBe(true);
    expect(c).not.toBe(r);
    expect(snapshot(r)).toBe(before);
  });

  it('refuses a state determinize did not produce', () => {
    const r = root();
    expect(() => runTurn(cloneState(r), policyOf(r, 1), new Rng(1), budget())).toThrow(/determinize/);
    expect(() => runTurn(blindClone(r, r.active), policyOf(r, 1), new Rng(1), budget())).toThrow(/determinize/);
  });

  it('two runs with the same rand seed give the same end state; different seeds may differ', () => {
    const end = (seed: number): string => {
      const r = root();
      const c = sampled(r, seed);
      runTurn(c, policyOf(c, seed), new Rng(seed), budget());
      return snapshot(c);
    };
    expect(end(21)).toBe(end(21));
    const ends = new Set([1, 2, 3, 4, 5, 6].map(end));
    expect(ends.size).toBeGreaterThan(1);
  });

  it('a refused policy answer is followed by safeAnswer and the run still ends', () => {
    const r = root();
    const c = sampled(r, 4);
    const inner = policyOf(c, 4);
    let refused = 0;
    const policy = (s: GameState, d: Decision): Answer => {
      if (refused < 2) {
        refused++;
        return { kind: 'ignoreFlags', count: 99 }; // never legal for any decision here
      }
      return inner(s, d);
    };
    const run = runTurn(c, policy, new Rng(4), budget());
    expect(refused).toBe(2);
    expect(run.done).toBe(true);
  });

  it('a policy that is always refused is rescued by safeAnswer; a step limit stops the run at the next decision', () => {
    const r = root();
    const c = sampled(r, 4);
    const run = drive(c, (ctx) => import_turn(c, ctx), () => ({ kind: 'ignoreFlags', count: 99 }), new Rng(2), 3);
    expect(run.done).toBe(false);
    expect(run.at).not.toBeNull();
    expect(run.steps).toBe(3);
  });

  it('nothing in a run touches forced dice: the simulation refuses to start while any are left', () => {
    const r = root();
    const c = sampled(r, 4);
    forceDice(['infantry', 'flag']);
    try {
      expect(() => runTurn(c, policyOf(c, 1), new Rng(1), budget())).toThrow(/forced dice/);
      expect(() => new Stepper(r, r.active, new Rng(1))).toThrow(/forced dice/);
    } finally {
      forceDice([]);
    }
  });
});

describe('drive', () => {
  it('refuses a state determinize did not produce, like runTurn', () => {
    const r = root();
    const live = cloneState(r);
    expect(() => drive(live, (ctx) => turnFlow(live, ctx), policyOf(r, 1), new Rng(1), 10)).toThrow(/determinize/);
  });

  it('aborts after more than 30 refusals in a row, when the policy and safeAnswer are both refused', () => {
    const r = root();
    const c = sampled(r, 4);
    // an engine that refuses every answer: it reports each one and asks the same decision again
    function* stubborn(ctx: FlowCtx): Gen {
      for (;;) {
        yield { kind: 'playCard', side: c.active };
        ctx.invalid?.('no');
      }
    }
    let answered = 0;
    const run = drive(c, (ctx) => stubborn(ctx), (s, d) => { answered++; return policyOf(s, 1)(s, d); }, new Rng(1), 1000);
    expect(run.done).toBe(false);
    expect(run.at).toBeNull();
    expect(answered).toBe(1); // later answers come from safeAnswer
    expect(run.steps).toBe(31);
  });
});

describe('policyFor across simulations', () => {
  it('one policy answers the same turn alike on identical clones: it carries nothing from one sim into the next', () => {
    const r = root();
    const moves = (policy: ReturnType<typeof policyOf>): number => {
      const c = sampled(r, 9);
      let n = 0;
      runTurn(c, (s, d) => {
        const a = policy(s, d);
        if (d.kind === 'move' && a.kind === 'move') n++;
        return a;
      }, new Rng(9), budget());
      return n;
    };
    const fresh = moves(policyOf(r, 3));
    expect(fresh).toBeGreaterThan(0);
    const shared = policyOf(r, 3);
    expect([moves(shared), moves(shared), moves(shared)]).toEqual([fresh, fresh, fresh]);
  });
});

describe('Stepper', () => {
  it('pauses a turn on a private determinised clone and takes answers one at a time', () => {
    const r = root();
    const before = snapshot(r);
    const st = new Stepper(r, r.active, new Rng(8));
    expect(isDeterminised(st.state)).toBe(true);
    expect(st.state).not.toBe(r);
    expect(st.at?.kind).toBe('playCard');
    // an illegal answer is refused and the same decision stays
    expect(st.answer({ kind: 'endMove' })).toBe(false);
    expect(st.at?.kind).toBe('playCard');
    const run = st.play(policyOf(st.state, 8), new Rng(8), 600, (d) => d.kind === 'move' || d.kind === 'battle');
    expect(['move', 'battle']).toContain(run.at?.kind);
    expect(st.at).toBe(run.at);
    const rest = st.play(policyOf(st.state, 8), new Rng(8));
    expect(rest.done).toBe(true);
    expect(st.done).toBe(true);
    expect(snapshot(r)).toBe(before);
  });
});

describe('safeAnswer', () => {
  it('answers a card decision with a card of the hand', () => {
    const r = root();
    const a = safeAnswer(r, { kind: 'playCard', side: r.active }, new Rng(1), 1);
    expect(a.kind).toBe('playCard');
  });
});

function import_turn(s: GameState, ctx: FlowCtx) {
  return turnFlow(s, ctx);
}
