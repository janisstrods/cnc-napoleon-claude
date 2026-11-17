import { describe, expect, it } from 'vitest';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ARM_OF, CODE_NAMES, codeOf } from '../../../src/engine/codes';
import { ART_KEYS, ART_NATIONS, type ArtKey } from '../../../src/art/nap/keys';
import { ArmGlyph } from '../../../src/art/nap/badge';
import { NapLeaderToken, NapUnitIcon } from '../../../src/art/nap';
import FigureGallery from '../../../src/dev/FigureGallery';
import { count, svg, token } from './helpers';

const BAD = /NaN|undefined|Infinity/;
const GUARDS = ['FR/YG', 'FR/OG', 'FR/GHC', 'FR/GA', 'BR/GG', 'BR/GHC'];
/** The element starting at `from`, up to its balanced closing tag. */
function balanced(m: string, from: number): string {
  let depth = 0;
  const re = /<g[\s>]|<\/g>/g;
  re.lastIndex = from;
  for (let r = re.exec(m); r; r = re.exec(m)) {
    depth += r[0] === '</g>' ? -1 : 1;
    if (depth === 0) return m.slice(from, r.index + 4);
  }
  return '';
}
const badge = (m: string) => (m.indexOf('<g data-badge') < 0 ? '' : balanced(m, m.indexOf('<g data-badge')));
/** The figure groups of a token by data-slot value. */
function slotGroups(m: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of m.matchAll(/<g data-slot="(\d)"/g)) out[r[1]] = balanced(m, r.index!);
  return out;
}

describe('NapUnitToken', () => {
  it('renders every key at every strength, facing and dimming without junk, one figure per block', () => {
    for (const k of ART_KEYS) for (const max of [3, 4]) for (let b = 0; b <= max; b++) for (const facing of ['left', 'right'] as const) for (const dimmed of [false, true]) {
      const out = token(k, { blocks: b, maxBlocks: max, facing, dimmed });
      expect(out, `${k} ${b}/${max} ${facing}`).not.toMatch(BAD);
      expect(count(out, 'data-fig='), `${k} ${b}/${max}`).toBe(b);
      expect(out).toContain('data-nap');
    }
  });

  it('the badge shows the arm, the code and the pips', () => {
    for (const k of ART_KEYS) for (let b = 0; b <= 4; b++) {
      const out = token(k, { blocks: b });
      expect(out).toContain(`data-arm="${ARM_OF[codeOf(k)]}"`);
      expect(badge(out)).toContain(`>${codeOf(k)}<`);
      expect(count(out, 'data-pip="on"')).toBe(b);
      expect(count(out, 'data-pip="off"')).toBe(4 - b);
    }
  });

  it('the badge is identical in both facings', () => {
    for (const k of ART_KEYS) {
      const l = badge(token(k, { facing: 'left', blocks: 3 }));
      expect(l).not.toBe('');
      expect(l).toBe(badge(token(k, { facing: 'right', blocks: 3 })));
    }
  });

  it('the three arm glyphs differ', () => {
    const g = (arm: 'infantry' | 'cavalry' | 'artillery') => svg(h(ArmGlyph, { arm, x: 0, y: 0 }));
    expect(new Set([g('infantry'), g('cavalry'), g('artillery')]).size).toBe(3);
  });

  it('the Guard units, and only they, carry the marker and the gold rim', () => {
    for (const k of ART_KEYS) {
      const out = token(k);
      if (GUARDS.includes(k)) {
        expect(out, k).toContain(`data-guard="${k.startsWith('FR') ? 'eagle' : 'crown'}"`);
        expect(out, k).toContain('data-rim="gold"');
      } else {
        expect(out, k).not.toContain('data-guard');
        expect(out, k).not.toContain('data-rim');
      }
    }
  });

  it('a depleted unit keeps its front figures in their slots', () => {
    for (const k of ['FR/LN', 'FR/CU', 'BR/RI', 'FR/FA'] as ArtKey[]) {
      const full = slotGroups(token(k, { blocks: 4 }));
      const two = slotGroups(token(k, { blocks: 2 }));
      expect(Object.keys(two).sort(), k).toEqual(['2', '3']);
      for (const s of ['2', '3']) {
        expect(full[s], `${k} slot ${s}`).toBeTruthy();
        expect(full[s], `${k} slot ${s}`).toBe(two[s]);
      }
    }
  });

  it('icons render at both sizes', () => {
    for (const k of ART_KEYS) for (const size of [24, 64]) expect(svg(h(NapUnitIcon, { unitKey: k, size }))).not.toMatch(BAD);
  });

  it('leaders render for each nation, both facings, attached or alone', () => {
    for (const nation of ART_NATIONS) for (const facing of ['left', 'right'] as const) for (const attached of [true, false]) {
      expect(svg(h(NapLeaderToken, { nation, facing, attached, name: 'Kellermann', showName: !attached }))).not.toMatch(BAD);
    }
  });
});

describe('FigureGallery', () => {
  const page = (route: string) => renderToStaticMarkup(h(FigureGallery, { route }));
  it('captions every key', () => {
    const out = page('#/gallery/figures');
    for (const k of ART_KEYS) expect(out).toContain(`${k} · ${CODE_NAMES[codeOf(k)]}`);
  });
  it('filters by key list', () => {
    const out = page('#/gallery/figures/FR-LN,BR-LN');
    expect(out).toContain('FR/LN · Line Infantry');
    expect(out).toContain('BR/LN · Line Infantry');
    expect(out).not.toContain('FR/LT ·');
    expect(count(out, ' · Line Infantry')).toBe(2);
  });
  it('has single and board routes', () => {
    expect(page('#/gallery/figures/single/FR-LN')).not.toMatch(BAD);
    expect(page('#/gallery/figures/board')).not.toMatch(BAD);
  });
});
