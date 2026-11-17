import { createElement as h } from 'react';
import { describe, expect, it } from 'vitest';
import { FacingRightCtx } from '../../../src/art/nap/draw';
import { FootFigure } from '../../../src/art/nap/foot';
import { NATION_LOOKS } from '../../../src/art/nap/nations';
import { ALLIED_INFANTRY, type ArtKey } from '../../../src/art/nap/keys';
import { FIGURE_SPECS } from '../../../src/art/nap/specs';
import type { FootSpec } from '../../../src/art/nap/uniform';
import { fig, hueClass, shape, svg, token } from './helpers';

const KEYS = ALLIED_INFANTRY;
const spec = (k: ArtKey) => FIGURE_SPECS[k] as FootSpec;
const four = (k: ArtKey) => [0, 1, 2, 3].map((i) => fig(k, i)).join('');
const outline = (k: ArtKey) => shape(four(k));

describe('British, Portuguese and Allied infantry', () => {
  it('has 11 keys and none is a stub', () => {
    expect(KEYS.length).toBe(11);
    for (const k of KEYS) {
      expect(FIGURE_SPECS[k].stub, k).toBeUndefined();
      for (let i = 0; i < 4; i++) expect(fig(k, i), `${k} ${i}`).not.toContain('data-stub');
    }
  });

  it('silhouettes differ where a player must tell them apart (colours stripped)', () => {
    for (const [a, b] of [
      ['BR/LN', 'BR/RI'], ['BR/LN', 'BR/LT'], ['BR/LN', 'BR/GR'], ['BR/LN', 'FR/LN'],
      ['PT/LN', 'FR/LN'], ['PT/LN', 'PT/ML'], ['PT/LN', 'PT/LT'], ['AL/LN', 'AL/ML'],
    ] as const) expect(outline(a), `${a} vs ${b}`).not.toBe(outline(b));
    expect(new Set(KEYS.map((k) => fig(k))).size).toBe(KEYS.length);
  });

  it('wears the right headgear', () => {
    for (const k of ['BR/LN', 'BR/LT', 'BR/RI', 'BR/GR', 'BR/GG'] as const) expect(fig(k), k).toContain('data-head="stovepipe"');
    for (const k of ['PT/LN', 'PT/LT'] as const) expect(fig(k), k).toContain('data-head="barretina"');
    expect(fig('PT/ML')).toContain('data-head="roundHat"');
    for (const k of ['AL/LN', 'AL/LT', 'AL/ML'] as const) expect(fig(k), k).toContain('data-head="shako"');
  });

  it('is dressed in the right colours', () => {
    const coat = (k: ArtKey, cls: string) => {
      const c = spec(k).dress.coat;
      expect(hueClass(c), `${k} coat`).toBe(cls);
      expect(fig(k), `${k} markup`).toContain(c);
    };
    for (const k of ['BR/LN', 'BR/LT', 'BR/GR', 'BR/GG'] as const) coat(k, 'red');
    coat('BR/RI', 'green');
    coat('PT/LN', 'blue');
    coat('PT/LT', 'brown');
    coat('AL/LN', 'blue');
    coat('AL/LT', 'green');
    const gg = spec('BR/GG').dress.facings;
    expect(hueClass(gg)).toBe('blue');
    expect(fig('BR/GG')).toContain(gg);
    const pom = spec('AL/LN').head.pompoms![0];
    expect(hueClass(pom)).toBe('orange');
    expect(fig('AL/LN')).toContain(pom);
  });

  it('the rifles kneel and carry a different weapon from the line musket', () => {
    expect(fig('BR/RI', 0)).toContain('data-pose="kneelAim"');
    expect(spec('BR/RI').weapon).toBe('rifle');
    expect(spec('BR/LN').weapon).toBe('musket');
    // the same pose for both, then the length of the wooden stock path (butt to stock end, 0.4 of the weapon's length)
    const stock = (k: ArtKey) => {
      const s: FootSpec = { ...spec(k), poses: ['aim', 'aim', 'aim', 'aim'] };
      const m = svg(h(FootFigure, { spec: s, n: NATION_LOOKS.BR, i: 0 }));
      const d = m.match(/<path d="M([-\d.]+) ([-\d.]+) L([-\d.]+) ([-\d.]+)" fill="none" stroke="#7a5634"/);
      expect(d, k).not.toBeNull();
      const [x0, y0, x1, y1] = d!.slice(1).map(Number);
      return Math.hypot(x1 - x0, y1 - y0);
    };
    expect(stock('BR/RI')).toBeLessThan(stock('BR/LN') * 0.95);
  });

  it('light infantry stand loose and the line close', () => {
    const xs = (k: ArtKey) => [...token(k).matchAll(/translate\(([-\d.]+) ([-\d.]+)\)/g)].map((m) => `${m[1]},${m[2]}`).join(' ');
    expect(xs('BR/LT')).not.toBe(xs('BR/LN'));
    expect(spec('BR/LN').order).toBe('close');
    expect(spec('BR/RI').order).toBe('loose');
  });

  it('only the Foot Guards carry a marker', () => {
    expect(token('BR/GG')).toContain('data-guard="crown"');
    for (const k of KEYS.filter((x) => x !== 'BR/GG')) expect(token(k), k).not.toContain('data-guard');
  });

  it('every pose and facing draws, with no NaN', () => {
    for (const k of KEYS) for (const pose of ['shoulder', 'port', 'aim', 'kneelAim', 'charge'] as const) for (const facing of [true, false]) {
      const s: FootSpec = { ...spec(k), poses: [pose, pose, pose, pose] };
      for (let i = 0; i < 4; i++) {
        const m = svg(h(FacingRightCtx.Provider, { value: facing }, h(FootFigure, { spec: s, n: NATION_LOOKS[k.slice(0, 2) as 'BR'], i })));
        expect(m, `${k} ${pose}`).not.toMatch(/NaN|undefined/);
        expect(m).toContain(`data-pose="${pose}"`);
      }
    }
  });
});
