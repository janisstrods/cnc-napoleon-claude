// The placeholder figures: a simple, deterministic drawing for every unit row and nation for keys without Napoleonic art (SP); the
// art keys are covered by tests/art/nap/wiring.test.ts.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NATIONS, UNIT_KEYS, UNIT_STATS, nationOf } from '../../src/engine';
import { LEADER_ATTACH_OFFSET, LeaderToken } from '../../src/art/leader';
import { blockColors, BASE_TOP } from '../../src/art/palettes';
import { UnitIcon } from '../../src/art/icon';
import { UnitToken, figureKind } from '../../src/art/token';

describe('placeholder figures', () => {
  it('every unit row draws a token, at full and at 1 block, with no NaN; any UnitKey renders', () => {
    for (const k of UNIT_KEYS) {
      for (const b of [UNIT_STATS[k].blocks, 1]) {
        const html = renderToStaticMarkup(createElement(UnitToken, { unitKey: k, nation: nationOf(k), blocks: b, maxBlocks: UNIT_STATS[k].blocks, facing: 'left' }));
        expect(html, k).not.toContain('NaN');
      }
    }
    expect(renderToStaticMarkup(createElement(UnitToken, { unitKey: 'FR/LNC', nation: 'FR', blocks: 4, maxBlocks: 4, facing: 'right' }))).not.toContain('NaN');
  });

  it('draws one figure per remaining block', () => {
    const fig = (blocks: number) => renderToStaticMarkup(createElement(UnitToken, { unitKey: 'SP/LN', nation: 'SP', blocks, maxBlocks: 4, facing: 'right' })).split('data-figure').length - 1;
    expect([1, 2, 3, 4].map(fig)).toEqual([1, 2, 3, 4]);
    const five = (k: 'SP/LT' | 'SP/FA', blocks: number) => renderToStaticMarkup(createElement(UnitToken, { unitKey: k, nation: 'SP', blocks, maxBlocks: 5, facing: 'right' })).split('data-figure').length - 1;
    expect(five('SP/LT', 5)).toBe(5);
    expect(five('SP/FA', 5)).toBe(5);
  });

  it('placeholder figures follow the arm', () => {
    expect(figureKind('BR/RI')).toBe('foot');
    expect(figureKind('FR/CU')).toBe('mounted');
    expect(figureKind('FR/HA')).toBe('machine');
    expect(figureKind('FR/LNC')).toBe('mounted');
  });

  it('block colours by nation keep the side-colour shape', () => {
    for (const n of NATIONS) expect(Object.keys(blockColors(n)).sort()).toEqual(Object.keys(blockColors('FR')).sort());
    expect(blockColors('PT')).toEqual(blockColors('AL'));
    expect(BASE_TOP).toMatch(/^#/);
  });

  it('icons and leaders render', () => {
    for (const k of UNIT_KEYS) expect(renderToStaticMarkup(createElement('svg', null, createElement(UnitIcon, { unitKey: k, size: 40 }))), k).not.toContain('NaN');
    for (const n of NATIONS) {
      for (const attached of [true, false]) {
        const html = renderToStaticMarkup(createElement('svg', null, createElement(LeaderToken, { name: 'Wellington', nation: n, attached })));
        expect(html).not.toContain('NaN');
      }
    }
    expect(LEADER_ATTACH_OFFSET).toEqual({ x: -23.5, y: 27 }); // the Napoleonic art's offset (left end of the badge)
  });
});
