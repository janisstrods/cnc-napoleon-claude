// The hidden-information scan (Plan 5, ruling 1): only src/ai/view.ts may touch the deck, hands, square tracks and the game
// RNG, or clone a state. Every other AI file is read as text and checked.
import { describe, expect, it } from 'vitest';

const FIELDS = 'deck|hand|squareTrack|rng|rngCalls';
const PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'dot access', re: new RegExp(`\\.(${FIELDS})\\b`) },
  { name: 'bracket access', re: new RegExp(`\\[\\s*['"\`](${FIELDS})['"\`]\\s*\\]`) },
  { name: 'destructuring', re: new RegExp(`\\{[^}]*\\b(${FIELDS})\\b[^}]*\\}\\s*=`) },
  { name: 'cloneState', re: /\bcloneState\b/ },
];

/** Offending lines of a source text as `line N: <pattern name>`. */
function violations(src: string): string[] {
  const out: string[] = [];
  src.split('\n').forEach((line, i) => {
    for (const p of PATTERNS) if (p.re.test(line)) out.push(`line ${i + 1}: ${p.name}: ${line.trim()}`);
  });
  return out;
}

const files = import.meta.glob('../../src/ai/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('hidden information', () => {
  it('only view.ts touches deck, hand, squareTrack, rng, rngCalls or cloneState', () => {
    const names = Object.keys(files).filter((f) => !f.endsWith('/view.ts'));
    expect(names.length).toBeGreaterThan(3);
    const found = names.flatMap((f) => violations(files[f]).map((v) => `${f.replace('../../', '')} ${v}`));
    expect(found).toEqual([]);
  });

  it('the scan catches dot, bracket and destructuring access and cloneState', () => {
    expect(violations('const x = s.players.top.hand;')).toHaveLength(1);
    expect(violations("const x = p['squareTrack'];")).toHaveLength(1);
    expect(violations('const { deck, discard } = s;')).toHaveLength(1);
    expect(violations('const c = cloneState(s);')).toHaveLength(1);
    expect(violations('const ok = s.discard.length + s.turn.card + hands + deckSize;')).toEqual([]);
  });
});
