// Computer opponent stub for Commands & Colors: Napoleonics (Plan 2B T1c-3a). It plays legal moves with its own seeded
// random generator so that the game UI has an opponent; the real AI is a later plan. It reads only what its own side may
// see: never the opponent's hand, the square track or the deck.
import { answerError, battleTargets, CARD_DEFS, randomAnswer } from '../engine';
import type { Answer, CardKind, Decision, GameState, Side } from '../engine';
import { PERSONALITIES, personalityById, personalityFor, type Personality } from './personality';
import { Rng, entropySeed } from './rand';

export type Difficulty = 'recruit' | 'tribune' | 'consul'; // renamed in Plan 4
export type { Personality };
export { PERSONALITIES, personalityById, personalityFor };

export interface AiOptions {
  side: Side;
  difficulty: Difficulty;
  personality: Personality;
  seed?: number;
  /** Scales thinking time (unused by the stub). */
  budgetScale?: number;
  deterministic?: boolean;
}

export interface AiMemory {
  /** State of the AI's private generator (0: not yet seeded). */
  rngState: number;
  /** Answers replaced by the random fallback (each is also reported with console.error); must stay 0 in tests. */
  fallbacks?: number;
  last: { kind: Decision['kind']; ms: number } | null;
}

export function newMemory(): AiMemory {
  return { rngState: 0, fallbacks: 0, last: null };
}

const now = (): number => (globalThis.performance ? globalThis.performance.now() : Date.now());

/** Would the engine accept answer `a` to decision `d` (its one validator, `answerError`)? */
export function isLegal(s: GameState, d: Decision, a: Answer): boolean {
  return answerError(s, d, a) === null;
}

/** The stub's policy; the caller checks the answer and falls back to a random one. */
function decide(s: GameState, d: Decision, rng: Rng): Answer {
  switch (d.kind) {
    case 'battle': {
      const ids = Object.keys(s.turn.ordered).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
      for (const id of ids) {
        const targets = battleTargets(s, id);
        if (targets.length) return { kind: 'attack', unit: id, target: rng.pick(targets).hex };
      }
      return { kind: 'endBattle' };
    }
    case 'ignoreFlags':
      return { kind: 'ignoreFlags', count: d.max };
    case 'advance':
      return { kind: 'yesno', yes: true };
    default:
      return randomAnswer(s, d, () => rng.next());
  }
}

/** Choose an answer for `decision` (decision.side === opts.side). Always returns a legal answer when one exists. */
export function chooseAnswer(state: GameState, decision: Decision, opts: AiOptions, mem: AiMemory): { answer: Answer; say?: string } {
  const t0 = now();
  if (!mem.rngState) mem.rngState = (opts.seed ?? entropySeed()) >>> 0 || 1;
  const rng = new Rng(mem.rngState);
  let answer: Answer;
  try {
    answer = decide(state, decision, rng);
    if (!isLegal(state, decision, answer)) {
      if (typeof console !== 'undefined') console.error('AI error: illegal answer replaced by a fallback', decision.kind, JSON.stringify(answer));
      mem.fallbacks = (mem.fallbacks ?? 0) + 1;
      answer = randomAnswer(state, decision, () => rng.next());
    }
  } catch (e) {
    if (typeof console !== 'undefined') console.error('AI error', e);
    mem.fallbacks = (mem.fallbacks ?? 0) + 1;
    answer = randomAnswer(state, decision, () => rng.next());
  }
  mem.rngState = rng.state;
  mem.last = { kind: decision.kind, ms: now() - t0 };
  return { answer };
}

/** Card title helper for logs. */
export function cardTitle(kind: CardKind): string {
  return CARD_DEFS[kind].title;
}
