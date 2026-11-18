// The engine never branches on a nation or army name: only codes.ts and units.ts hold nation codes as literals.
import { describe, expect, it } from 'vitest';

const SOURCES = import.meta.glob('../../src/engine/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const ALLOWED = new Set(['codes.ts', 'units.ts']);
/** expansions.ts holds the boxes' product names as data ("The Spanish Army"): exempt from the word check only. */
const WORDS_OK = new Set(['expansions.ts']);

describe('no nation names in the engine', () => {
  const files = Object.keys(SOURCES).map((p) => p.split('/').pop()!).filter((f) => !ALLOWED.has(f));
  it('scans the engine modules', () => {
    expect(files.length).toBeGreaterThan(20);
  });
  for (const f of files) {
    it(f, () => {
      const text = SOURCES[`../../src/engine/${f}`];
      expect(text.match(/['"`](FR|BR|PT|AL|SP)(\/|['"`])/g) ?? []).toEqual([]);
      if (!WORDS_OK.has(f)) expect(text.match(/\b(French|British|Portuguese|Allied|Spanish)\b/g) ?? []).toEqual([]);
    });
  }
});
