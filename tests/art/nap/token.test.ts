import { describe, expect, it } from 'vitest';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ARM_OF, CODE_NAMES, codeOf } from '../../../src/engine/codes';
import { SLOTS, TEAM_BANDS, iconRects, type Formation } from '../../../src/art/nap/slots';
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

describe('the attach corner', () => {
  // An attached leader's medallion: centre (29, -28), radius 12 (a little over the drawn 12 for the outline).
  const CX = 29, CY = -28, R = 12;
  const drawing: Record<Formation, 'foot' | 'horse' | 'gun'> = { close: 'foot', loose: 'foot', horse: 'horse', gun: 'gun' };
  it('stays clear of every figure box at every strength, in both facings', () => {
    const hits: string[] = [];
    for (const f of Object.keys(SLOTS) as Formation[]) {
      for (const n of [1, 2, 3, 4] as const) for (const flip of [1, -1]) for (const sl of SLOTS[f][n]) for (const [top, bottom, left, right] of iconRects(drawing[f])) {
        const x0 = sl.x + (flip > 0 ? left : -right) * sl.s;
        const x1 = sl.x + (flip > 0 ? right : -left) * sl.s;
        const y0 = sl.y + top * sl.s;
        const y1 = sl.y + bottom * sl.s;
        const d = Math.hypot(Math.max(x0 - CX, 0, CX - x1), Math.max(y0 - CY, 0, CY - y1));
        if (d < R) hits.push(`${f} n${n} flip${flip} slot(${sl.x},${sl.y},${sl.s}) d=${d.toFixed(1)}`);
      }
    }
    expect(hits).toEqual([]);
  });
});

describe('the attach corner and the Guard marker', () => {
  // The marker is a staff with a device on top, placed at translate(-31 * flip, 14) and scaled by 0.66 (see GuardMarker); read the
  // placement from the markup so a nudge in token.tsx is what this checks. The device box is the eagle's, which is the larger.
  const CX = 29, CY = -28, R = 12;
  it('keeps the marker clear of the leader medallion in both facings', () => {
    for (const k of ['FR/OG', 'BR/GG'] as const) for (const facing of ['right', 'left'] as const) {
      const out = token(k, { facing });
      const m = /data-guard="[a-z]+" transform="translate\(([-\d.]+) ([-\d.]+)\) scale\(([\d.]+)\)"/.exec(out);
      expect(m, `${k} ${facing}`).not.toBeNull();
      const [tx, ty, sc] = [Number(m![1]), Number(m![2]), Number(m![3])];
      const boxes: [number, number, number, number][] = [[-1.5, 1, -34.5, 0], [-7.5, 7.5, -42.7, -34]]; // shaft; device
      for (const [x0, x1, y0, y1] of boxes) {
        const bx0 = tx + x0 * sc, bx1 = tx + x1 * sc, by0 = ty + y0 * sc, by1 = ty + y1 * sc;
        const d = Math.hypot(Math.max(bx0 - CX, 0, CX - bx1), Math.max(by0 - CY, 0, CY - by1));
        expect(d, `${k} ${facing}`).toBeGreaterThanOrEqual(R);
      }
    }
  });
});

describe('the attach corner and the horse-artillery team', () => {
  // The team's placement is read from the markup (translate and a facing-signed scale on the group after the team's shadow), so a
  // nudge in token.tsx is what this checks; its extent is TEAM_BANDS (measured in the figure's own frame, stroke included).
  const CX = 29, CY = -28, R = 12;
  it('keeps the team clear of the leader medallion in both facings', () => {
    for (const k of ['FR/HA', 'BR/HA'] as const) for (const facing of ['right', 'left'] as const) for (const b of [4, 1]) {
      const out = token(k, { facing, blocks: b });
      const m = /<g data-team-slot[^>]*>.*?<g transform="translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+) ([\d.]+)\)"><g data-team/.exec(out);
      expect(m, `${k} ${facing}`).not.toBeNull();
      const [tx, ty, sx, sy] = m!.slice(1).map(Number);
      expect(Math.sign(sx), `${k} ${facing}`).toBe(facing === 'right' ? 1 : -1);
      for (const [t, bt, l, r] of TEAM_BANDS) {
        const x0 = tx + Math.min(l * sx, r * sx), x1 = tx + Math.max(l * sx, r * sx);
        const d = Math.hypot(Math.max(x0 - CX, 0, CX - x1), Math.max(ty + t * sy - CY, 0, CY - (ty + bt * sy)));
        expect(d, `${k} ${facing} band ${t}`).toBeGreaterThanOrEqual(R);
      }
    }
  });
  it('draws no team for a foot gun or any other arm', () => {
    for (const k of ['FR/FA', 'FR/GA', 'BR/FA', 'FR/LN', 'FR/HC']) expect(token(k as ArtKey)).not.toContain('data-team');
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
