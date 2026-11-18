// A whole AI-vs-AI battle for the soaks (tests/ai/*.slow.test.ts). One helper, so Plan 7C Task 21 can add the Spanish battles
// 101-118 to the same suites by listing their ids: `playBattle('103', { seed: 1, budgetScale: 0.25, maxTurn: 150 })`.
import { GameDriver, createGame, type Answer, type Decision, type GameEvent, type Side } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { DIFFICULTIES, chooseAnswer, isLegal, newMemory, personalityFor, type AiMemory, type AiOptions } from '../../src/ai';
import { must } from '../rules/helpers';

export interface SoakOpts {
  /** The game's seed; the AIs are seeded from it (plus `aiSeed`). */
  seed: number;
  /** AI seed offset (a different value gives the AIs different draws on the same game). */
  aiSeed?: number;
  /** Level (0 captain, 1 colonel, 2 marshal) of each side; both 0 unless given. */
  levels?: Partial<Record<Side, 0 | 1 | 2>>;
  budgetScale: number;
  /** Play stops once the turn number passes this (default 150), or when the game ends. */
  maxTurn?: number;
  /** Keep every answer and event as text (the determinism suites compare them). */
  record?: boolean;
  /** Called with every decision before it is answered (e.g. to count kinds). */
  seen?: (d: Decision, state: GameDriver['state']) => void;
}

export interface SoakResult {
  d: GameDriver;
  mems: Record<Side, AiMemory>;
  decisions: number;
  /** Every answer as JSON text, in order (only with `record`). */
  answers: string[];
  /** Every engine event as JSON text, in order (only with `record`). */
  events: string[];
  /** Every `say` line spoken, in order. */
  says: string[];
}

/** The options of `side`'s AI in battle `id`: the commander's own temperament, deterministic, the given level and scale. */
export function aiOptions(id: string, side: Side, o: SoakOpts): AiOptions {
  const c = scenarioById(id).setup[side];
  return {
    side, difficulty: DIFFICULTIES[o.levels?.[side] ?? 0], personality: personalityFor(c.commander, c.army, c.nation),
    seed: (o.seed * 7 + (side === 'top' ? 1 : 2) + (o.aiSeed ?? 0)) >>> 0, budgetScale: o.budgetScale, deterministic: true,
  };
}

/** Play battle `id` with the AI on both sides; every answer is checked legal before it is given. */
export function playBattle(id: string, o: SoakOpts): SoakResult {
  const d = new GameDriver(createGame(scenarioById(id).setup, o.seed));
  const mems: Record<Side, AiMemory> = { top: newMemory(), bottom: newMemory() };
  const opts: Record<Side, AiOptions> = { top: aiOptions(id, 'top', o), bottom: aiOptions(id, 'bottom', o) };
  const out: SoakResult = { d, mems, decisions: 0, answers: [], events: [], says: [] };
  const maxTurn = o.maxTurn ?? 150;
  while (!d.over && d.state.turn.number <= maxTurn && out.decisions < 40000) {
    const dec = d.pending!;
    o.seen?.(dec, d.state);
    const r = chooseAnswer(d.state, dec, opts[dec.side], mems[dec.side]);
    if (!isLegal(d.state, dec, r.answer)) throw new Error(`${id}: illegal ${dec.kind} answer ${JSON.stringify(r.answer)}`);
    if (r.say !== undefined) out.says.push(r.say);
    must(d, r.answer as Answer);
    out.decisions++;
    if (o.record) {
      out.answers.push(JSON.stringify(r.answer));
      for (const q of d.drainEvents()) out.events.push(JSON.stringify(q.e satisfies GameEvent));
    } else d.drainEvents();
  }
  return out;
}
