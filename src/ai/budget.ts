// The node budget of one decision (Plan 5, ruling 2). A node is one evaluation, one scored move target, one simulated turn or one
// battle rollout; plan building, move scoring, simulations and rollouts all charge the same `Budget`, so a decision's work is
// bounded alike on a fast and a slow machine. In deterministic mode it holds no clock and is limited by its node count alone;
// otherwise it also has a deadline, looked at only every `CLOCK_EVERY` charges (a clock read costs more than an evaluation step).

/** Charges between two readings of the clock. */
const CLOCK_EVERY = 16;

export interface Budget {
  nodes: number;
  maxNodes: number;
  /** The clock time after which the budget is spent; null when there is no clock or no time limit. */
  deadline: number | null;
  clock: (() => number) | null;
  /** Count `n` nodes of work. */
  charge(n?: number): void;
  /** Has the work done reached `maxNodes`, or (with a clock) the deadline? */
  spent(): boolean;
}

/**
 * A budget of `maxNodes` nodes and, when `clock` and `ms` are both given, a deadline `ms` after now. With `clock === null`
 * (deterministic mode), or no time limit (`ms === null`), the clock is never called.
 */
export function makeBudget(maxNodes: number, ms: number | null, clock: (() => number) | null): Budget {
  const deadline = clock !== null && ms !== null ? clock() + ms : null;
  let checkedAt = -Infinity;
  let late = false;
  const b: Budget = {
    nodes: 0,
    maxNodes,
    deadline,
    clock,
    charge(n = 1) {
      b.nodes += n;
    },
    spent() {
      if (b.nodes >= b.maxNodes || late) return true;
      if (b.deadline !== null && b.clock !== null && b.nodes - checkedAt >= CLOCK_EVERY) {
        checkedAt = b.nodes;
        late = b.clock() >= b.deadline;
      }
      return late;
    },
  };
  return b;
}
