import { describe, expect, it } from 'vitest';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ARM_OF, CODE_NAMES, codeOf } from '../../../src/engine/codes';
import { FIGURE_BANDS, SLOTS, type Formation } from '../../../src/art/nap/slots';
import { ART_KEYS, ART_NATIONS, type ArtKey } from '../../../src/art/nap/keys';
import { ArmGlyph } from '../../../src/art/nap/badge';
import { MEDALLION_SCALE, NAP_LEADER_ATTACH_OFFSET, NapLeaderToken, NapUnitIcon } from '../../../src/art/nap';
import FigureGallery from '../../../src/dev/FigureGallery';
import { balanced, count, placed, svg, token } from './helpers';

const BAD = /NaN|undefined|Infinity/;
const GUARDS = ['FR/YG', 'FR/OG', 'FR/GHC', 'FR/GLC', 'FR/GA', 'BR/GG', 'BR/GHC'];
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

  it('the Guard units, and only they, stand on a gold-rimmed base and carry the gold badge rim; no staff marker is drawn', () => {
    for (const k of ART_KEYS) for (const facing of ['left', 'right'] as const) {
      const out = token(k, { facing });
      expect(out, k).not.toContain('data-guard');
      if (GUARDS.includes(k)) {
        expect(count(out, 'data-base-rim="gold"'), k).toBe(1);
        expect(out, k).toContain('data-rim="gold"');
      } else {
        expect(out, k).not.toContain('data-base-rim');
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

  it('draws no specks: every round detail of a figure is at least 1.2 units across, eyes and nostrils apart', () => {
    const bad: string[] = [];
    let seen = 0;
    for (const k of ART_KEYS) {
      const out = token(k, { blocks: 4 });
      for (const m of out.matchAll(/<circle[^>]*?r="([\d.]+)"[^>]*?fill="([^"]+)"/g)) if (++seen && Number(m[1]) < 0.6 && m[2] !== '#1d140e') bad.push(`${k}: ${m[0]}`);
    }
    expect(seen).toBeGreaterThan(500);
    expect([...new Set(bad)]).toEqual([]);
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

describe('inside the hex', () => {
  // A point is inside the pointy-top hex of radius 50, inset by `d`, if it clears the vertical edges (apothem 43.30) and the
  // slanted ones (normal (1/2, sqrt 3/2), same apothem).
  const AP = 50 * Math.sqrt(3) / 2;
  const inside = (x: number, y: number, d: number) => Math.abs(x) <= AP - d && Math.abs(x) / 2 + (Math.abs(y) * Math.sqrt(3)) / 2 <= AP - d;

  it('the measured profiles are there', () => {
    for (const [k, bands] of Object.entries(FIGURE_BANDS)) expect(bands.length, k).toBeGreaterThan(10);
  });

  it('every figure stays at least 1 unit inside the hex, both facings, every strength (weapons, plumes and pennons included)', () => {
    const hits: string[] = [];
    for (const k of ART_KEYS) for (const max of [3, 4]) for (let n = 1; n <= max; n++) for (const facing of ['left', 'right'] as const) {
      for (const [key, tx, ty, sx, sy] of placed(k, token(k, { blocks: n, maxBlocks: max, facing }))) {
        for (const [t, b, l, r] of FIGURE_BANDS[key]) for (const [x, y] of [[l, t], [r, t], [l, b], [r, b]]) {
          const X = tx + x * sx, Y = ty + y * sy;
          if (!inside(X, Y, 1)) hits.push(`${k} ${n}/${max} ${facing} ${key} at (${X.toFixed(1)}, ${Y.toFixed(1)})`);
        }
      }
    }
    expect([...new Set(hits)].slice(0, 20)).toEqual([]);
  });

  it('formations are centred and mirror with the facing', () => {
    for (const k of ['FR/LN', 'BR/RI', 'FR/HC', 'FR/FA', 'BR/HA'] as ArtKey[]) for (const n of [4, 3, 2]) {
      const r = placed(k, token(k, { blocks: n, facing: 'right' }));
      const l = placed(k, token(k, { blocks: n, facing: 'left' }));
      expect(l.map(([key, x, y, sx, sy]) => [key, -x + 0, y, -sx + 0, sy]), `${k} ${n}`).toEqual(r);
    }
    for (const f of ['close', 'loose', 'horse'] as Formation[]) {
      const xs = SLOTS[f][4].map((s) => s.x);
      // within 4 of the centre: the cavalry's back rank stands half a file left, its horses' heads reaching right
      expect(Math.abs((Math.min(...xs) + Math.max(...xs)) / 2), f).toBeLessThanOrEqual(4);
      expect(SLOTS[f][1][0].x, f).toBe(0);
    }
  });

  it('front-rank figures stand far enough apart to read as separate men and horses', () => {
    for (const f of ['close', 'loose'] as Formation[]) expect(SLOTS[f][2][1].x - SLOTS[f][2][0].x, f).toBeGreaterThanOrEqual(24);
    expect(SLOTS.horse[2][1].x - SLOTS.horse[2][0].x).toBeGreaterThanOrEqual(26);
  });
});

describe('the attached medallion', () => {
  it('sits on the badge\'s left end at 0.875 scale, clear of the code and the pips', () => {
    expect(NAP_LEADER_ATTACH_OFFSET).toEqual({ x: -23.5, y: 27 });
    expect(MEDALLION_SCALE).toBe(0.875);
    const med = svg(h(NapLeaderToken, { nation: 'FR', facing: 'right', attached: true }));
    expect(med).toContain(`scale(${MEDALLION_SCALE})`);
    const outer = Math.max(...[...med.matchAll(/<circle[^>]*? r="([\d.]+)"[^>]*?stroke-width="([\d.]+)"/g)].map((m) => Number(m[1]) + Number(m[2]) / 2));
    const right = NAP_LEADER_ATTACH_OFFSET.x + outer * MEDALLION_SCALE;
    for (const k of ['FR/LN', 'FR/LNC', 'BR/HA'] as ArtKey[]) {
      const code = /<text x="([-\d.]+)"/.exec(badge(token(k)));
      expect(code, k).not.toBeNull();
      expect(right, k).toBeLessThan(Number(code![1]));
    }
    // and within the badge's height band, so it reads as a seal on the badge rather than a disc on the figures
    expect(NAP_LEADER_ATTACH_OFFSET.y - outer * MEDALLION_SCALE).toBeGreaterThan(14);
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

describe('five-block badges', () => {
  it('the leftmost pip clears the code text', () => {
    for (const key of ['BR/LT', 'BR/GG'] as const) {
      const m = token(key, { blocks: 5, maxBlocks: 5 });
      const xs = [...m.matchAll(/data-pip="(?:on|off)" cx="([-\d.]+)"/g)].map((x) => Number(x[1]));
      expect(xs.length).toBe(5);
      expect(Math.min(...xs) - 1.95).toBeGreaterThan(1.3 + 0.3); // the code text ends at about x = 1.3
    }
  });
});
