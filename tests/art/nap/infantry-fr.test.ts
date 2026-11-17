import { createElement as h } from 'react';
import { describe, expect, it } from 'vitest';
import { FacingRightCtx } from '../../../src/art/nap/draw';
import { FootFigure } from '../../../src/art/nap/foot';
import { NATION_LOOKS } from '../../../src/art/nap/nations';
import { FR_INFANTRY, type ArtKey } from '../../../src/art/nap/keys';
import { FIGURE_SPECS } from '../../../src/art/nap/specs';
import type { FootSpec } from '../../../src/art/nap/uniform';
import { fig, hueClass, shape, svg, token } from './helpers';

const KEYS = FR_INFANTRY;
const spec = (k: ArtKey) => FIGURE_SPECS[k] as FootSpec;
const POSES = ['shoulder', 'port', 'aim', 'kneelAim', 'charge'] as const;

describe('French infantry', () => {
  it('no French infantry key is a stub', () => {
    for (const k of KEYS) {
      expect(FIGURE_SPECS[k].stub, k).toBeUndefined();
      for (let i = 0; i < 4; i++) expect(fig(k, i), `${k} ${i}`).not.toContain('data-stub');
    }
  });

  it('silhouettes differ where a player must tell them apart (colours stripped)', () => {
    const s = (k: ArtKey) => shape([0, 1, 2, 3].map((i) => fig(k, i)).join(''));
    for (const [a, b] of [['FR/LN', 'FR/LT'], ['FR/LN', 'FR/GR'], ['FR/GR', 'FR/OG'], ['FR/LN', 'FR/YG'], ['FR/LN', 'FR/ML']] as const)
      expect(s(a), `${a} vs ${b}`).not.toBe(s(b));
    expect(new Set(KEYS.map((k) => fig(k))).size).toBe(KEYS.length);
  });

  it('wears the right headgear', () => {
    expect(fig('FR/GR')).toContain('data-head="bearskin"');
    expect(fig('FR/OG')).toContain('data-head="bearskinPlate"');
    for (const k of ['FR/LN', 'FR/LT', 'FR/YG'] as const) expect(fig(k), k).toContain('data-head="shako"');
    expect(fig('FR/ML')).toContain('data-head="coveredShako"');
  });

  it('is dressed in the right colours', () => {
    const has = (k: ArtKey, c: string) => expect(fig(k), `${k} ${c}`).toContain(c);
    const ln = spec('FR/LN').dress;
    expect(hueClass(ln.coat)).toBe('blue');
    expect(hueClass(ln.trousers)).toBe('white');
    has('FR/LN', ln.coat); has('FR/LN', ln.trousers);
    const lt = spec('FR/LT').dress;
    expect(hueClass(lt.coat)).toBe('blue');
    expect(hueClass(lt.trousers)).toBe('blue');
    has('FR/LT', lt.coat); has('FR/LT', lt.trousers);
    const ml = spec('FR/ML').dress;
    expect(hueClass(ml.coat)).toBe('grey');
    has('FR/ML', ml.coat);
    for (const k of ['FR/GR', 'FR/OG'] as const) {
      const plume = spec(k).head.plume;
      expect(plume && hueClass(plume.colour), k).toBe('red');
      has(k, plume!.colour);
    }
  });

  it('LT aims on figures 1 and 3 (the right-hand files)', () => {
    expect(fig('FR/LT', 1)).toContain('data-pose="aim"');
    expect(fig('FR/LT', 3)).toContain('data-pose="aim"');
    expect(fig('FR/LT', 0)).toContain('data-pose="port"');
    expect(fig('FR/LT', 2)).toContain('data-pose="port"');
  });

  it('light infantry stand loose', () => {
    const xs = (k: ArtKey) => [...token(k).matchAll(/translate\(([-\d.]+) ([-\d.]+)\)/g)].map((m) => `${m[1]},${m[2]}`).join(' ');
    expect(xs('FR/LT')).not.toBe(xs('FR/LN'));
  });

  it('the line draws four different pompom colours', () => {
    const pompoms = spec('FR/LN').head.pompoms!;
    expect(new Set(pompoms).size).toBe(4);
    for (let i = 0; i < 4; i++) expect(fig('FR/LN', i), `figure ${i}`).toContain(pompoms[i]);
    for (let i = 0; i < 4; i++) for (let j = 0; j < i; j++) expect(fig('FR/LN', i)).not.toBe(fig('FR/LN', j));
  });

  it('the Guard stands on the gold-rimmed base', () => {
    for (const k of ['FR/YG', 'FR/OG'] as const) expect(token(k), k).toContain('data-base-rim="gold"');
    for (const k of ['FR/LN', 'FR/LT', 'FR/GR', 'FR/ML'] as const) expect(token(k), k).not.toContain('data-base-rim');
  });

  it('every pose, weapon and facing draws for every key, with no NaN', () => {
    for (const k of KEYS) {
      const look = NATION_LOOKS.FR;
      for (const pose of POSES) for (const weapon of ['musket', 'rifle'] as const) for (const facing of [true, false]) {
        const s: FootSpec = { ...spec(k), weapon, poses: [pose, pose, pose, pose] };
        for (let i = 0; i < 4; i++) {
          const m = svg(h(FacingRightCtx.Provider, { value: facing }, h(FootFigure, { spec: s, n: look, i })));
          expect(m, `${k} ${pose} ${weapon}`).not.toMatch(/NaN|undefined/);
          expect(m).toContain(`data-pose="${pose}"`);
          expect(m.length, `${k} ${pose}`).toBeGreaterThan(1500);
        }
      }
      for (const facing of ['left', 'right'] as const) {
        const t = token(k, { facing });
        expect(t, `${k} ${facing}`).not.toMatch(/NaN|undefined/);
        expect(t.length).toBeGreaterThan(1500);
      }
    }
  });
});
