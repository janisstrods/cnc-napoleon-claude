// Unit tooltip and rules-reference lines: generated from UNIT_STATS (RR §2), and the rules reference's tabs on the new tables.
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { UNIT_KEYS, UNIT_STATS, type Leader, type RowKey, type Unit } from '../../src/engine';
import { unitCardLines, unitName, unitSummary } from '../../src/ui/game/unitText';
import { RulesReference, Units } from '../../src/ui/screens/RulesReference';

const unit = (key: RowKey, extra: Partial<Unit> = {}): Unit =>
  ({ id: 'u1', side: 'top', key, hex: 0, blocks: UNIT_STATS[key].blocks, maxBlocks: UNIT_STATS[key].blocks, ...extra }) as Unit;
const joined = (key: RowKey) => unitSummary(unit(key)).join('\n');

describe('unitSummary', () => {
  it('French line infantry: +1 die against infantry in melee', () => {
    expect(joined('FR/LN')).toContain('+1 against infantry');
    expect(unitSummary(unit('FR/LN'))[0]).toBe('Move 1 · Retreat 1 hex per flag');
  });

  it('British Rifles: range 3 and sabres do not hit', () => {
    const text = joined('BR/RI');
    expect(text).toContain('range 3');
    expect(text).toContain('sabres do not hit');
    expect(text).toContain('Move 1, or 2 without battle');
  });

  it('allied line infantry retreat 2 hexes per flag', () => {
    expect(unitSummary(unit('AL/LN'))[0]).toContain('Retreat 2 hexes per flag');
  });

  it('guns have no musket line: foot guns do not fire after moving, horse artillery does', () => {
    expect(joined('FR/FA')).toContain('(not after moving)');
    expect(joined('FR/FA')).toContain('Melee: as artillery');
    expect(joined('BR/HA')).not.toContain('not after moving');
    expect(joined('BR/HA')).toContain('Horse artillery');
  });

  it('flags ignored and a unit that fires nothing', () => {
    expect(joined('BR/GG')).toContain('ignores 2 flags');
    expect(unitSummary(unit('FR/HC')).some((l) => l.startsWith('Fire:'))).toBe(false);
  });

  it('every row has summary and card lines, and a leader has no traits', () => {
    for (const k of UNIT_KEYS) {
      expect(unitSummary(unit(k)).length, k).toBeGreaterThanOrEqual(2);
      const [stats, notes] = unitCardLines(k);
      expect(stats, k).toContain(`${UNIT_STATS[k].blocks} blocks`);
      expect(notes, k).toMatch(/\.$/);
      expect(unitName(k), k).toBe(UNIT_STATS[k].name);
    }
  });
});

describe('the rules reference', () => {
  it('the Units tab lists all 34 rows, one card each, named from the table', () => {
    expect(UNIT_KEYS).toHaveLength(35 - 1);
    const html = renderToStaticMarkup(createElement(Units));
    expect(html.split('class="unit-card"').length - 1).toBe(34);
    for (const k of UNIT_KEYS) expect(html, k).toContain(`${UNIT_STATS[k].name}`);
    expect(html).toContain('<svg');
  });

  it('opens on the basics, with a tab for each general topic and none for a box', () => {
    const html = renderToStaticMarkup(createElement(RulesReference));
    const tabs = [...html.matchAll(/<nav class="rules-tabs">([\s\S]*?)<\/nav>/g)][0][1];
    expect([...tabs.matchAll(/<button[^>]*>([^<]*)<\/button>/g)].map((m) => m[1])).toEqual(['Basics', 'Units', 'Combat', 'Terrain', 'Cards']);
    expect(html).toContain('Victory Banners');
    expect(html).not.toMatch(/Greece|Barbarians|Roman|legion/i);
  });
});
