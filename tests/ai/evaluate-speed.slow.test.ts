// The evaluation's speed budget (Plan 5 Task 5): the mean over 1000 calls on the 015 setup (40 units) stays under 2 ms (asserted only with CCN_PERF=1: `npm run test:perf`).
// In `npm test` only a short run (20 evaluations) checks that the values are finite.
import { expect, it } from 'vitest';
import { createGame } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { evaluate } from '../../src/ai/evaluate';
import { NEUTRAL_W } from '../../src/ai/values';
import { failOnAiErrors } from './no-ai-errors';

failOnAiErrors();

const perf = !!process.env.CCN_PERF;

/** Calls timed by the speed budget, and calls of the always-on check. */
const EVALS = 1000;
const QUICK = 20;

/** The 015 setup evaluated `n` times from both sides (after `warm` warm-up calls): every value, and the mean time in ms per call. */
function run(n: number, warm: number): { values: number[]; ms: number } {
  const s = createGame(scenarioById('015').setup, 1);
  for (let i = 0; i < warm; i++) evaluate(s, i % 2 ? 'top' : 'bottom', NEUTRAL_W);
  const values: number[] = [];
  const t0 = performance.now();
  for (let i = 0; i < n; i++) values.push(evaluate(s, i % 2 ? 'top' : 'bottom', NEUTRAL_W));
  return { values, ms: (performance.now() - t0) / n };
}

// always on: a short run without error and with finite values (no clock assertion, so a loaded machine cannot fail it)
it(`evaluates the 015 setup ${QUICK} times without error, every value finite`, () => {
  const { values } = run(QUICK, 0);
  expect(values).toHaveLength(QUICK);
  expect(values.every((v) => Number.isFinite(v))).toBe(true);
}, 120_000);

// the speed budget itself: `npm run test:perf` (CCN_PERF=1), on a quiet machine
it.runIf(perf)('evaluates the 015 setup in under 2 ms on average over 1000 calls', () => {
  const { ms } = run(EVALS, 20);
  console.info(`evaluate 015 setup: ${ms.toFixed(3)} ms per call`);
  expect(ms).toBeLessThan(2);
}, 2000);
