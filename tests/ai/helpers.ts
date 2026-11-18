// Shared plumbing for the AI suites (tests/ai): deterministic options for the stub AI.
import { PERSONALITIES, type AiOptions } from '../../src/ai';
import { forceDice, type Answer, type Decision, type GameDriver, type GameEvent, type Side } from '../../src/engine';
import { ev, must } from '../rules/helpers';

/** Options for a reproducible AI decision. */
export function detOpts(side: Side, seed: number, over: Partial<AiOptions> = {}): AiOptions {
  return { side, difficulty: 'colonel', personality: PERSONALITIES[0], seed, budgetScale: 0.1, deterministic: true, ...over };
}

// ---------------------------------------------------------------------------------------------------------------------
// Engine sampling for the probability-model cross-checks (Plan 5 Task 3)
/** What `engineTrials` measures over many seeded engine resolutions of one declared attack. */
export interface Trials {
  n: number;
  /** Blocks the target lost to the attacker's roll (fire or melee), mean and standard deviation. */
  meanHits: number;
  sdHits: number;
  pElim: number;
  /** The target left its hex and survived. */
  pRetreat: number;
  /** Blocks the attacker lost to the battle back, mean and standard deviation. */
  meanBack: number;
  sdBack: number;
  /** Fraction of trials in which a leader was killed. */
  leaderKilled: number;
}

/**
 * The plainest answer the cross-checks give the engine: ignore every flag allowed, retreat by the cheapest option (fewest
 * blocks lost, then the shortest path: the tie-break of the AI's `flagOutcome`), a stranded leader by the fewest escape
 * rolls on the board (never off it when he can stay).
 */
export function answerFor(d: GameDriver): Answer | null {
  const p = d.pending;
  if (!p) return null;
  switch (p.kind) {
    case 'ignoreFlags': return { kind: 'ignoreFlags', count: p.max };
    case 'retreat': {
      let best = 0;
      p.options.forEach((o, i) => {
        const b = p.options[best];
        if (o.losses < b.losses || (o.losses === b.losses && o.path.length < b.path.length)) best = i;
      });
      return { kind: 'choose', index: best };
    }
    case 'leaderRetreat': {
      const cost = (o: (typeof p.options)[number]): number => (o.eliminated ? 100 : 0) + o.escapes.length * 2 + (o.offBoard ? 1 : 0);
      let best = 0;
      p.options.forEach((o, i) => {
        if (cost(o) < cost(p.options[best])) best = i;
      });
      return { kind: 'choose', index: best };
    }
    case 'advance':
    case 'leaveSquare': return { kind: 'yesno', yes: false };
    case 'bonusMelee': return { kind: 'hex', hex: null };
    case 'breakthroughExtra': return { kind: 'hex', hex: p.required ? p.options[0] : null };
    case 'defend': return { kind: 'defend', choice: 'stand' };
    case 'combinedArms': return { kind: 'select', ids: [] };
    default: return null;
  }
}

/**
 * Resolve one attack on `n` positions `make(seed)` (a driver at the battle decision) with the game generator seeded `1..n`.
 * `act` declares the attack (the kit's `attack(d, unit, hex, o)`). Retreats take the cheapest option, flags are ignored
 * as far as allowed. The measurements come from the state and the events.
 */
export function engineTrials(make: (seed: number) => GameDriver, act: (d: GameDriver) => void, n: number, forced?: (d: GameDriver) => void): Trials {
  let hits = 0, hits2 = 0, back = 0, back2 = 0, elim = 0, retreat = 0, leader = 0;
  for (let seed = 1; seed <= n; seed++) {
    const d = make(seed);
    d.state.rng = seed;
    forceDice([]);
    ev(d);
    forced?.(d);
    act(d);
    for (let a = answerFor(d); a; a = answerFor(d)) must(d, a);
    forceDice([]);
    const es: GameEvent[] = ev(d);
    const combat = es.find((e) => e.t === 'combat');
    if (!combat || combat.t !== 'combat') throw new Error('engineTrials: the attack produced no combat event');
    const { attacker, target } = combat;
    let h = 0, b = 0;
    for (const e of es) {
      if (e.t === 'damage' && e.id === target && (e.reason === 'fire' || e.reason === 'melee')) h += e.amount;
      if (e.t === 'damage' && e.id === attacker && e.reason === 'battle back') b += e.amount;
    }
    const eliminated = es.some((e) => e.t === 'eliminated' && e.id === target);
    hits += h; hits2 += h * h; back += b; back2 += b * b;
    if (eliminated) elim++;
    else if (es.some((e) => e.t === 'retreat' && e.id === target)) retreat++;
    if (es.some((e) => e.t === 'leaderKilled')) leader++;
  }
  const sd = (s: number, s2: number) => Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2));
  return { n, meanHits: hits / n, sdHits: sd(hits, hits2), pElim: elim / n, pRetreat: retreat / n, meanBack: back / n, sdBack: sd(back, back2), leaderKilled: leader / n };
}

/**
 * One seeded engine resolution per seed `1..n` of a position `make(seed)` at the battle decision: `act` declares the attack,
 * then `answer` (falling back on `answerFor`) answers every decision that follows. `see` gets the events and the decisions
 * met after `act`.
 */
export function sampleEngine(
  make: (seed: number) => GameDriver, act: (d: GameDriver) => void, n: number,
  see: (es: GameEvent[], met: Decision[], d: GameDriver) => void,
  o: { forced?: (d: GameDriver) => void; answer?: (d: GameDriver) => Answer | null | undefined } = {},
): void {
  for (let seed = 1; seed <= n; seed++) {
    const d = make(seed);
    d.state.rng = seed;
    forceDice([]);
    ev(d);
    o.forced?.(d);
    act(d);
    const met: Decision[] = [];
    for (;;) {
      const p = d.pending;
      if (!p) break;
      const a = o.answer?.(d) ?? answerFor(d);
      if (!a) break;
      met.push(p);
      must(d, a);
    }
    forceDice([]);
    see(ev(d), met, d);
  }
}
