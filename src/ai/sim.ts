// Simulation harness (Plan 5 Task 7a): drive the engine's own turn generators on determinised clones, answering every decision with a
// policy. The engine decides everything it can (dice, retreats, reactions); the AI only supplies the answers.
//
// A simulation never runs on a real state: the root is cloned with `blindClone` and its hidden cards are sampled with `determinize`
// (view.ts), both before this module sees it (`runTurn` refuses any other state) or inside `Stepper`, which makes its own clone. While the
// engine's dice are forced (`forcedDiceLeft() > 0`, the test hook) nothing is simulated at all: a run would eat them.
import {
  continueTurn, forcedDiceLeft, other, randomAnswer, turnFlow,
  type Answer, type Decision, type FlowCtx, type Gen, type GameState, type Side,
} from '../engine';
import type { Budget } from './budget';
import type { Rng } from './rand';
import { blindClone, determinize, isDeterminised, myHand } from './view';

/** What answers the decisions of a simulated turn: `(state, decision) => answer`. */
export type Policy = (s: GameState, d: Decision) => Answer;

/** How a run ended: `done`, the flow reached its end; else the decision it stopped at (`at`), or null after an abort. */
export interface Run {
  done: boolean;
  at: Decision | null;
  /** Decisions answered by this call. */
  steps: number;
}

/** More refusals than this in a row abort a run (a policy and `safeAnswer` that both fail). */
const MAX_REFUSALS = 30;
/** Decisions a whole turn may take (the longest real turns are well under a hundred). */
const TURN_STEPS = 600;

/** A simulation must never run while the test hook still holds forced dice: it would consume them. */
function noForcedDice(): void {
  if (forcedDiceLeft() > 0) throw new Error('sim: forced dice are pending; a simulation would consume them');
}

/**
 * A safe answer to `d`, used when a policy answer was refused. `attempt` 1 is the plainest answer of each kind (play the first card,
 * order nothing, stand, end the phase); later attempts and any plain answer the engine also refuses are random legal answers
 * (`randomAnswer`, drawn from `rand`).
 */
export function safeAnswer(s: GameState, d: Decision, rand: Rng, attempt: number): Answer {
  if (attempt <= 1) {
    const plain = plainAnswer(s, d);
    if (plain !== null) return plain;
  }
  return randomAnswer(s, d, () => rand.next());
}

function plainAnswer(s: GameState, d: Decision): Answer | null {
  switch (d.kind) {
    case 'playCard': return { kind: 'playCard', card: myHand(s, d.side)[0] };
    case 'orders': return { kind: 'orders', pieces: [] };
    case 'leaveSquare': return { kind: 'yesno', yes: false };
    case 'move': return { kind: 'endMove' };
    case 'battle': return { kind: 'endBattle' };
    case 'combinedArms': return { kind: 'select', ids: d.required ? d.options.slice(0, 1) : [] };
    case 'defend': return { kind: 'defend', choice: 'stand' };
    case 'ignoreFlags': return { kind: 'ignoreFlags', count: d.max };
    case 'retreat':
    case 'leaderRetreat':
    case 'scoutKeep':
    case 'shortSupplyTarget': return { kind: 'choose', index: 0 };
    case 'advance': return { kind: 'yesno', yes: false };
    case 'breakthroughExtra': return { kind: 'hex', hex: d.required ? d.options[0] : null };
    case 'bonusMelee': return { kind: 'hex', hex: null };
    case 'elan':
    case 'rally': return { kind: 'assign', ids: d.faces.map(() => null) };
    case 'shortSupplyHex': return { kind: 'hex', hex: d.options[0] };
    default: return assertNever(d);
  }
}

function assertNever(d: never): never {
  throw new Error(`sim: unhandled decision ${JSON.stringify(d)}`);
}

/**
 * A paused engine generator on the state `s` it mutates, answered one decision at a time. A refused answer leaves the same
 * decision pending. Internal: `drive` and `Stepper` are its two users.
 */
class Session {
  /** The decision the generator waits at; null once it has ended. */
  at: Decision | null = null;
  private refused = false;
  private readonly gen: Gen;

  constructor(flow: (ctx: FlowCtx) => Gen) {
    const ctx: FlowCtx = { emit() { /* a simulation records nothing */ }, invalid: () => { this.refused = true; } };
    this.gen = flow(ctx);
    this.take(this.gen.next());
  }

  get done(): boolean {
    return this.at === null;
  }

  private take(r: IteratorResult<Decision, void>): void {
    this.at = r.done ? null : r.value;
  }

  /** Submit `a`; true when the engine took it, false when it refused (the decision stays). */
  answer(a: Answer): boolean {
    this.refused = false;
    this.take(this.gen.next(a));
    return !this.refused;
  }

  /**
   * Answer decisions with `policy` until the flow ends, `maxSteps` decisions are used up (stops at the next one) or `stop` matches a
   * decision (left unanswered). An answer the engine refuses is followed by `safeAnswer`s; more than `MAX_REFUSALS` refusals in a
   * row abort the run.
   */
  run(s: GameState, policy: Policy, rand: Rng, maxSteps: number, stop?: (d: Decision) => boolean): Run {
    let fails = 0;
    let steps = 0;
    while (this.at !== null) {
      const d = this.at;
      if (stop?.(d) || steps >= maxSteps) return { done: false, at: d, steps };
      const a = fails === 0 ? policy(s, d) : safeAnswer(s, d, rand, fails);
      steps++;
      if (this.answer(a)) fails = 0;
      else if (++fails > MAX_REFUSALS) return { done: false, at: null, steps };
    }
    return { done: true, at: null, steps };
  }
}

/**
 * Answer the decisions of the flow `flow` starts on `s` with `policy` until it ends (see `Session.run`). `s` is mutated; it should be a
 * clone the caller made with `blindClone` and sampled with `determinize`.
 */
export function drive(
  s: GameState, flow: (ctx: FlowCtx) => Gen, policy: Policy, rand: Rng, maxSteps: number, stop?: (d: Decision) => boolean,
): Run {
  noForcedDice();
  return new Session(flow).run(s, policy, rand, maxSteps, stop);
}

/** The flow that carries a turn on from the phase `s` is in: the card step (a turn not yet begun), the movement or the battle. */
function flowFrom(s: GameState): (ctx: FlowCtx) => Gen {
  switch (s.turn.phase) {
    case 'card': return (ctx) => turnFlow(s, ctx);
    case 'move': return (ctx) => continueTurn(s, ctx, 'move');
    case 'battle': return (ctx) => continueTurn(s, ctx, 'battle');
    default: throw new Error(`sim: a turn cannot be resumed in its ${s.turn.phase} phase`);
  }
}

/**
 * Play the whole current turn of `s` (through the draw phase) with `policy`, on a clone the caller has already determinised
 * (`blindClone` then `determinize`; any other state is refused). A turn not yet begun starts with its card; one already in its
 * movement or battle continues exactly where it stands. Charges one node.
 */
export function runTurn(s: GameState, policy: Policy, rand: Rng, budget: Budget): Run {
  if (!isDeterminised(s)) throw new Error('runTurn needs a state that determinize produced (a blind clone with its hidden cards sampled)');
  budget.charge(1);
  return drive(s, flowFrom(s), policy, rand, TURN_STEPS);
}

/**
 * A turn paused at its decisions, on a private clone of `root` (a blind clone with the hidden cards sampled from `rand`). The planner
 * answers a few decisions itself, hands the rest to a policy, and reads the position at any pause. A generator cannot be copied, so
 * trying another line means making another Stepper.
 */
export class Stepper {
  /** The private determinised clone the turn is played on. */
  readonly state: GameState;
  private readonly session: Session;

  /** `from` says where the turn stands in `root`: its start (the card step), its movement or its battle. */
  constructor(root: GameState, me: Side, rand: Rng) {
    noForcedDice();
    const c = blindClone(root, me);
    determinize(c, me, rand);
    this.state = c;
    this.session = new Session(flowFrom(c));
  }

  /** The decision the turn waits at; null once it has ended. */
  get at(): Decision | null {
    return this.session.at;
  }

  get done(): boolean {
    return this.session.done;
  }

  /** Submit an answer: true when the engine took it, false when it refused it (the same decision stays pending). */
  answer(a: Answer): boolean {
    noForcedDice();
    return this.session.answer(a);
  }

  /** Play on with `policy` until the turn ends, `maxSteps` decisions are used up or `stop` matches a decision (see `drive`). */
  play(policy: Policy, rand: Rng, maxSteps = TURN_STEPS, stop?: (d: Decision) => boolean): Run {
    noForcedDice();
    return this.session.run(this.state, policy, rand, maxSteps, stop);
  }

  /** The side whose decision it is (the opponent of the one passed to the constructor during its turn, say). */
  sideAt(): Side | null {
    return this.session.at ? this.session.at.side : null;
  }

  /** The side that does not have the decision (convenience for policies that need both views). */
  otherSide(): Side | null {
    const s = this.sideAt();
    return s === null ? null : other(s);
  }
}
