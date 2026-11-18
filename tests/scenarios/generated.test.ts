// The generated battle files (src/scenarios/data/001–015) are exactly what scripts/scenarios/build.ts makes from design/data and META.
import { describe, expect, it } from 'vitest';
import { convertBattle, formatScenario, unsupportedFeatures, type RawBattle } from '../../scripts/scenarios/convert';
import { META } from '../../scripts/scenarios/meta';
import { catalogueEntry } from '../../src/scenarios/catalogue';
import { range } from './helpers';

const raws = import.meta.glob<RawBattle>('../../design/data/*.json', { eager: true, import: 'default' });
const RAW: Record<string, RawBattle> = {};
for (const [p, j] of Object.entries(raws)) RAW[/(\d+)\.json$/.exec(p)![1]] = j;
const FILES = import.meta.glob('../../src/scenarios/data/*.json', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

describe('generated scenario files', () => {
  it('every generated battle file equals a fresh conversion, byte for byte', () => {
    for (const id of Object.keys(META)) {
      const want = formatScenario(convertBattle(RAW[id], META[id], catalogueEntry(id)!));
      expect(FILES[`../../src/scenarios/data/${id}.json`], `${id}: run npx vite-node scripts/scenarios/build.ts (never hand-edit src/scenarios/data; edit design/data or scripts/scenarios/meta-base.ts)`).toBe(want);
    }
  });

  it('every scenario file but the drill 000 has a META entry, and the reverse; 001–015 are all in META', () => {
    const fileIds = Object.keys(FILES).map((p) => /(\d+)\.json$/.exec(p)![1]).filter((id) => id !== '000').sort();
    expect(fileIds).toEqual(Object.keys(META).sort());
    for (const id of range(1, 15)) expect(META[id.padStart(3, '0')], id).toBeDefined();
  });

  it('converting twice gives equal output (no shared state in META)', () => {
    for (const id of Object.keys(META)) {
      const a = convertBattle(RAW[id], META[id], catalogueEntry(id)!);
      const b = convertBattle(RAW[id], META[id], catalogueEntry(id)!);
      expect(b, id).toEqual(a);
      expect(formatScenario(b)).toBe(formatScenario(a));
    }
  });

  it('unsupportedFeatures is sorted, and empty for every base battle', () => {
    for (const id of Object.keys(META)) expect(unsupportedFeatures(RAW[id]), id).toEqual([]);
    const f = unsupportedFeatures({ id: '002', terrain: [{ r: 1, c: 1, t: 'marsh' }, { r: 1, c: 2, t: 'abatis' }], units: [{ r: 1, c: 1, side: 'top', key: 'SP/LN' }], leaders: [], objectives: [], guerrilla: [] } as unknown as RawBattle);
    expect(f).toEqual([...f].sort());
    expect(f.length).toBeGreaterThan(2);
  });
});
