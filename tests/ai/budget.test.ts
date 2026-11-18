import { describe, expect, it } from 'vitest';
import { makeBudget } from '../../src/ai/budget';
import { failOnAiErrors } from './no-ai-errors';

failOnAiErrors();

const explode = (): number => {
  throw new Error('clock');
};

describe('Budget', () => {
  it('a deterministic budget never calls its clock', () => {
    // no clock at all, and a clock that is given but has no deadline (ms null): neither is ever read
    for (const b of [makeBudget(50, null, null), makeBudget(50, null, explode)]) {
      expect(b.deadline).toBeNull();
      for (let i = 0; i < 49; i++) {
        b.charge();
        expect(b.spent()).toBe(false);
      }
      b.charge();
      expect(b.spent()).toBe(true);
    }
    // a budget with neither a node count nor a clock reading to fear: charge(n) counts n nodes
    const c = makeBudget(10, null, null);
    c.charge(4);
    c.charge(6);
    expect(c.nodes).toBe(10);
    expect(c.spent()).toBe(true);
  });

  it('spent() after maxNodes charges; with a clock, after the deadline, reading the clock at most every 16 charges', () => {
    const b = makeBudget(100, null, null);
    expect(b.maxNodes).toBe(100);
    for (let i = 0; i < 99; i++) b.charge();
    expect(b.spent()).toBe(false);
    b.charge();
    expect(b.spent()).toBe(true);

    let now = 1000;
    let reads = 0;
    const clock = (): number => {
      reads++;
      return now;
    };
    const t = makeBudget(1e9, 50, clock);
    expect(t.deadline).toBe(1050);
    expect(t.spent()).toBe(false);
    now = 2000; // past the deadline, but the clock is looked at only every 16 charges
    for (let i = 0; i < 15; i++) t.charge();
    expect(t.spent()).toBe(false);
    t.charge();
    expect(t.spent()).toBe(true);
    // and once past the deadline it stays spent without more reads
    const before = reads;
    for (let i = 0; i < 40; i++) {
      t.charge();
      expect(t.spent()).toBe(true);
    }
    expect(reads).toBe(before);

    // 320 charges with the deadline never reached: at most one read per 16 charges (and the first look)
    reads = 0;
    now = 0;
    const u = makeBudget(1e9, 1e9, clock);
    const construct = reads;
    for (let i = 0; i < 320; i++) {
      u.charge();
      u.spent();
    }
    expect(reads - construct).toBeLessThanOrEqual(21);
    expect(u.spent()).toBe(false);
  });
});
