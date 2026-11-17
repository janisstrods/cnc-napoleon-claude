import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '../../src/scenarios/catalogue';
import { TEXTS } from '../../src/scenarios/texts';

const words = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;
const allStrings = (): string[] =>
  Object.values(TEXTS).flatMap((t) => [t.blurb, t.hint, ...(t.specialText ?? [])]);

describe('briefing texts', () => {
  it('every base battle has texts; every entry is a catalogue battle', () => {
    const base = CATALOGUE.filter((b) => b.box === 'base').map((b) => b.id);
    expect(base).toHaveLength(15);
    for (const id of base) expect(TEXTS[id], id).toBeDefined();
    const ids = new Set(CATALOGUE.map((b) => b.id));
    for (const key of Object.keys(TEXTS)) expect(ids.has(key), key).toBe(true);
  });

  it('blurbs are 30–80 words, hints at most 70 characters', () => {
    for (const [id, t] of Object.entries(TEXTS)) {
      const n = words(t.blurb);
      expect(n, `${id} blurb words`).toBeGreaterThanOrEqual(30);
      expect(n, `${id} blurb words`).toBeLessThanOrEqual(80);
      expect(t.hint.length, `${id} hint`).toBeGreaterThan(0);
      expect(t.hint.length, `${id} hint`).toBeLessThanOrEqual(70);
    }
  });

  it('special rules: line counts and key words', () => {
    const counts: Record<string, number> = {
      '001': 2, '002': 0, '003': 2, '004': 1, '005': 2, '006': 5, '007': 1, '008': 0,
      '009': 1, '010': 1, '011': 1, '012': 2, '013': 2, '014': 3, '015': 3,
    };
    for (const [id, n] of Object.entries(counts)) {
      expect(TEXTS[id]?.specialText?.length ?? 0, id).toBe(n);
    }
    const j = (id: string): string => (TEXTS[id]?.specialText ?? []).join(' ');
    expect(j('006')).toContain('bridge');
    expect(j('006')).toContain('Almeida');
    expect(j('006')).toContain('4 cards');
    expect(j('012')).toContain('square');
    expect(j('015')).toContain('impetuous');
  });

  it('British spelling, and no quotation of 15 words or more', () => {
    const us = /\b(center|centers|color|colors|maneuvers?|defense|honor|favor|armor|toward)\b/i;
    for (const s of allStrings()) {
      expect(us.test(s), s).toBe(false);
      for (const m of s.matchAll(/“([^”]*)”|"([^"]*)"/g)) {
        expect(words(m[1] ?? m[2] ?? ''), s).toBeLessThan(15);
      }
    }
  });
});
