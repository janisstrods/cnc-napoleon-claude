// The evaluation's speed budget (Plan 5 Task 5): the mean over 1000 calls on the 015 setup (40 units) stays under 2 ms (asserted only with CCN_PERF=1: `npm run test:perf`).
import { expect, it } from 'vitest';
import { createGame } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { evaluate } from '../../src/ai/evaluate';
import { NEUTRAL_W } from '../../src/ai/values';
import { failOnAiErrors } from './no-ai-errors';

failOnAiErrors();

const perf = !!process.env.CCN_PERF;

/** The 015 setup evaluated 1000 times; the mean in ms per call. */
function meanMs(): number {
  const s = createGame(scenarioById('015').setup, 1);
  for (let i = 0; i < 20; i++) evaluate(s, i % 2 ? 'top' : 'bottom', NEUTRAL_W);
  const t0 = performance.now();
  for (let i = 0; i < 1000; i++) evaluate(s, i % 2 ? 'top' : 'bottom', NEUTRAL_W);
  return (performance.now() - t0) / 1000;
}

// always on: the evaluation runs and yields a number (no clock assertion, so a loaded machine cannot fail it)
it('evaluates the 015 setup 1000 times without error, giving a finite mean time', () => {
  expect(Number.isFinite(meanMs())).toBe(true);
}, 120_000);

// the speed budget itself: `npm run test:perf` (CCN_PERF=1), on a quiet machine
it.runIf(perf)('evaluates the 015 setup in under 2 ms on average over 1000 calls', () => {
  const ms = meanMs();
  console.info(`evaluate 015 setup: ${ms.toFixed(3)} ms per call`);
  expect(ms).toBeLessThan(2);
}, 2000);
