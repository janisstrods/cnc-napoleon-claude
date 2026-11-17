// Shared plumbing for the AI suites (tests/ai): deterministic options for the stub AI.
import { PERSONALITIES, type AiOptions } from '../../src/ai';
import type { Side } from '../../src/engine';

/** Options for a reproducible AI decision. */
export function detOpts(side: Side, seed: number, over: Partial<AiOptions> = {}): AiOptions {
  return { side, difficulty: 'tribune', personality: PERSONALITIES[0], seed, budgetScale: 0.1, deterministic: true, ...over };
}
