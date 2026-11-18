// The rules tests cover the whole rules reference: every RR section is cited in the header line of some test file.
import { describe, expect, it } from 'vitest';
import rr from '../../design/rules-reference.md?raw';

const raw = <T>(m: T) => m as Record<string, string>;
const RULES_FILES = raw(import.meta.glob('../rules/*.test.ts', { query: '?raw', import: 'default', eager: true }));
const ENGINE_FILES = raw(import.meta.glob('./*.test.ts', { query: '?raw', import: 'default', eager: true }));
const SCENARIO_FILES = raw(import.meta.glob('../scenarios/*.test.ts', { query: '?raw', import: 'default', eager: true }));

/** Sections to cover: every `### n.m` heading for n = 1–13 and 15–16, `§1`, `§14` and `§16` (cited bare) and `§14.1`–`§14.15`. */
function requiredSections(): string[] {
  const out = new Set<string>(['1', '14', '16']);
  for (const m of rr.matchAll(/^### (\d+)\.(\d+)\b/gm)) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 16) out.add(`${n}.${m[2]}`);
  }
  return [...out];
}

/** The sections a header line cites. A bare `§n` covers only §1, §14 and §16; a range `§a.b–§a.c` covers every number between. */
function cited(header: string): string[] {
  const out: string[] = [];
  const re = /§(\d+)(?:\.(\d+))?(?:\s*[–-]\s*§(\d+)\.(\d+))?/g;
  for (const m of header.matchAll(re)) {
    const [, n, sub, n2, sub2] = m;
    if (sub === undefined) {
      if (n === '1' || n === '14' || n === '16') out.push(n);
      continue;
    }
    const last = n2 === n && sub2 !== undefined ? Number(sub2) : Number(sub);
    for (let k = Number(sub); k <= last; k++) out.push(`${n}.${k}`);
  }
  return out;
}

function headerOf(text: string): string | null {
  return text.split('\n').slice(0, 3).find((l) => l.startsWith('// Rules:')) ?? null;
}

describe('RR coverage', () => {
  const required = requiredSections();

  it('finds the sections', () => {
    expect(required).toContain('2.7');
    expect(required).toContain('13.4');
    expect(required).toContain('14.15');
    expect(required.filter((r) => r.startsWith('14.'))).toHaveLength(15);
    expect(required).toContain('15.8');
    expect(required).toContain('16.18');
    expect(required).toContain('16');
    expect(required.filter((r) => r.startsWith('16.'))).toHaveLength(18);
  });

  it('expands ranges and counts a bare § only for §1, §14 and §16', () => {
    expect(cited('// Rules: RR §2.1–§2.3, §5.2, §1, §9 (x)').sort()).toEqual(['1', '2.1', '2.2', '2.3', '5.2']);
    expect(cited('// Rules: RR §16, §15.7 (x)').sort()).toEqual(['15.7', '16']);
  });

  it('every section is cited by a header of a tests/rules, tests/engine or tests/scenarios file', () => {
    const files = [...Object.values(RULES_FILES), ...Object.values(ENGINE_FILES), ...Object.values(SCENARIO_FILES)];
    expect(files.length).toBeGreaterThan(20);
    const covered = new Set(files.flatMap((f) => cited(headerOf(f) ?? '')));
    const missing = required.filter((r) => !covered.has(r));
    expect(missing.map((r) => `§${r}`), 'RR sections that no test file header cites').toEqual([]);
  });

  it('every tests/rules file has a header line', () => {
    expect(Object.entries(RULES_FILES).filter(([, text]) => !headerOf(text)).map(([f]) => f)).toEqual([]);
  });
});
