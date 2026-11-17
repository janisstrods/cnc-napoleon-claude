// AI worker handling, plus the illegal-answer fallback, on the stub AI and the drill battle 000. Cheap and deterministic.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameDriver, createGame, forceDice, type Decision } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { chooseAnswer, isLegal, newMemory, personalityById } from '../../src/ai';
import { detOpts } from './helpers';
import { failOnAiErrors } from './no-ai-errors';

afterEach(() => {
  forceDice([]);
  vi.useRealTimers();
});

failOnAiErrors();

describe('AiClient worker handling', () => {
  it('answers a timed-out request in-thread, replaces the stuck worker, and gives up on workers after two timeouts', async () => {
    const posted: { id: number; worker: number }[] = [];
    const terminated: number[] = [];
    let made = 0;
    class HungWorker {
      onmessage: ((ev: { data: unknown }) => void) | null = null;
      onerror: ((ev: unknown) => void) | null = null;
      onmessageerror: (() => void) | null = null;
      readonly n = ++made;
      postMessage(m: { id?: number; type: string }) {
        if (m.type === 'decide') posted.push({ id: m.id!, worker: this.n });
      }
      terminate() {
        terminated.push(this.n);
      }
    }
    const saved = (globalThis as { Worker?: unknown }).Worker;
    (globalThis as { Worker?: unknown }).Worker = HungWorker;
    vi.useFakeTimers();
    try {
      const { AiClient } = await import('../../src/ai/client');
      const sc = scenarioById('000');
      const d = new GameDriver(createGame(sc.setup, 8));
      const c = new AiClient({ side: d.pending!.side, difficulty: 'recruit', personality: personalityById('fox'), seed: 1, budgetScale: 0.1 });
      expect(c.usingWorker).toBe(true);
      for (let i = 0; i < 2; i++) {
        const p = c.decide(d.state, d.pending!);
        await vi.advanceTimersByTimeAsync(20001);
        const r = await p;
        expect(isLegal(d.state, d.pending!, r.answer)).toBe(true);
      }
      // each request went to a different worker exactly once; both stuck workers were terminated
      expect(posted.map((x) => x.worker)).toEqual([1, 2]);
      expect(terminated).toEqual([1, 2]);
      expect(c.usingWorker).toBe(false);
      const p3 = c.decide(d.state, d.pending!);
      await vi.advanceTimersByTimeAsync(1);
      expect(isLegal(d.state, d.pending!, (await p3).answer)).toBe(true);
      expect(posted.length).toBe(2);
      c.dispose();
    } finally {
      (globalThis as { Worker?: unknown }).Worker = saved;
    }
  });

  it('waits a little longer after a page freeze instead of abandoning the worker, and never computes after dispose', async () => {
    let worker: { onmessage: ((ev: { data: unknown }) => void) | null; last?: { id: number } } | null = null;
    class SlowWorker {
      onmessage: ((ev: { data: unknown }) => void) | null = null;
      onerror: ((ev: unknown) => void) | null = null;
      onmessageerror: (() => void) | null = null;
      last?: { id: number };
      constructor() {
        worker = this;
      }
      postMessage(m: { id?: number; type: string }) {
        if (m.type === 'decide') this.last = { id: m.id! };
      }
      terminate() {}
    }
    const saved = (globalThis as { Worker?: unknown }).Worker;
    (globalThis as { Worker?: unknown }).Worker = SlowWorker;
    vi.useFakeTimers();
    try {
      const { AiClient } = await import('../../src/ai/client');
      const sc = scenarioById('000');
      const d = new GameDriver(createGame(sc.setup, 8));
      const c = new AiClient({ side: d.pending!.side, difficulty: 'recruit', personality: personalityById('fox'), seed: 1, budgetScale: 0.1 });
      const p = c.decide(d.state, d.pending!);
      // the page freezes for 40 s; on resume the overdue timer fires late and grants a grace period
      vi.setSystemTime(Date.now() + 40000);
      await vi.advanceTimersByTimeAsync(20001);
      const marker = { kind: 'endMove' } as const;
      worker!.onmessage?.({ data: { id: worker!.last!.id, answer: marker } });
      expect((await p).answer).toEqual(marker);
      expect(c.usingWorker).toBe(true);
      // dispose while a request is pending: the promise rejects and nothing is computed in-thread
      const p2 = c.decide(d.state, d.pending!);
      c.dispose();
      await expect(p2).rejects.toThrow();
    } finally {
      (globalThis as { Worker?: unknown }).Worker = saved;
    }
  });
});


describe('an AI answer replaced by the fallback', () => {
  it('is counted in the memory and reported with console.error (so failOnAiErrors fails on it)', () => {
    // a retreat with no destination to offer: the AI's answer cannot be legal, so the fallback answers instead
    const s = createGame(scenarioById('000').setup, 1);
    const d: Decision = { kind: 'retreat', side: s.active, unit: s.units[0].id, options: [], reason: 'retreat' };
    const mem = newMemory();
    expect(mem.fallbacks).toBe(0);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      chooseAnswer(s, d, detOpts(s.active, 1), mem);
      expect(mem.fallbacks).toBe(1);
      expect(err.mock.calls.map((c) => String(c[0]))).toEqual(['AI error: illegal answer replaced by a fallback']);
    } finally {
      err.mockClear(); // the reported error is this test's subject, not a hidden AI failure
    }
  });
});
