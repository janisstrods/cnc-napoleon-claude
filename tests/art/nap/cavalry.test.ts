import { createElement as h } from 'react';
import { describe, expect, it } from 'vitest';
import { makeFig } from '../../../src/art/nap/draw';
import { HORSE_SEAT, Horse } from '../../../src/art/nap/horse';
import { CAVALRY, type ArtKey, type CavalryKey } from '../../../src/art/nap/keys';
import { NATION_LOOKS } from '../../../src/art/nap/nations';
import { Rider } from '../../../src/art/nap/rider';
import { FIGURE_SPECS } from '../../../src/art/nap/specs';
import type { HorseSpec } from '../../../src/art/nap/uniform';
import { count, fig, hueClass, shape, svg, token } from './helpers';

const spec = (k: ArtKey) => FIGURE_SPECS[k] as HorseSpec;
/** The four figures of a key, concatenated, colours stripped: the drawing alone. */
const s = (k: ArtKey) => shape([0, 1, 2, 3].map((i) => fig(k, i)).join(''));
const all = (k: ArtKey) => [0, 1, 2, 3].map((i) => fig(k, i)).join('');

describe('cavalry', () => {
  it('no cavalry key is a stub', () => {
    for (const k of CAVALRY) {
      expect(FIGURE_SPECS[k].stub, k).toBeUndefined();
      for (let i = 0; i < 4; i++) expect(fig(k, i), `${k} ${i}`).not.toContain('data-stub');
    }
  });

  it('silhouettes differ where a player must tell them apart (colours stripped)', () => {
    for (const [a, b] of [['FR/LC', 'FR/HC'], ['FR/HC', 'FR/CU'], ['FR/CU', 'FR/GHC'], ['FR/LNC', 'FR/LC'], ['BR/LC', 'BR/HC'], ['PT/LC', 'PT/HC'], ['AL/LC', 'FR/LC']] as const)
      expect(s(a), `${a} vs ${b}`).not.toBe(s(b));
    expect(new Set(CAVALRY.map((k) => fig(k))).size).toBe(CAVALRY.length);
  });

  it('wears the headgear its spec names', () => {
    for (const k of CAVALRY) for (let i = 0; i < 4; i++) expect(fig(k, i), `${k} ${i}`).toContain(`data-head="${spec(k).head.kind}"`);
    expect(fig('FR/GHC')).toContain('data-head="bearskin"');
    expect(fig('FR/LC')).toContain('data-head="shako"');
    expect(fig('AL/LC')).toContain('data-head="shako"');
  });

  it('the Brunswick hussars wear the death\'s-head, not a brass plate', () => {
    expect(fig('AL/LC')).toContain('data-plate="skull"');
    expect(fig('FR/LC')).not.toContain('data-plate="skull"');
  });

  it('only the cuirassiers wear a cuirass', () => {
    expect(fig('FR/CU')).toContain('data-cuirass');
    for (const k of CAVALRY.filter((x) => x !== 'FR/CU')) expect(all(k), k).not.toContain('data-cuirass');
  });

  it('the lancers carry a lance with a red-over-white pennon, and nobody else does', () => {
    const lnc = spec('FR/LNC');
    expect(fig('FR/LNC')).toContain('data-weapon="lance"');
    expect(lnc.pennon).toBeDefined();
    expect(hueClass(lnc.pennon![0])).toBe('red');
    expect(hueClass(lnc.pennon![1])).toBe('white');
    for (const c of lnc.pennon!) expect(fig('FR/LNC')).toContain(c);
    for (const k of CAVALRY.filter((x) => x !== 'FR/LNC')) expect(fig(k), k).not.toContain('data-weapon="lance"');
  });

  it('carries sabres, raised or sloped swords as the table says', () => {
    for (const k of ['FR/LC', 'BR/LC', 'PT/LC', 'AL/LC'] as const) expect(fig(k), k).toContain('data-weapon="sabre"');
    for (const k of ['FR/HC', 'FR/CU', 'FR/GHC', 'BR/HC', 'BR/GHC', 'PT/HC'] as const) expect(fig(k), k).toContain('data-weapon="sword"');
    // the sloped carry differs from the raised one in the drawing
    const slope = spec('FR/HC');
    expect(slope.carry).toBe('sloped');
    expect(spec('FR/CU').carry).toBe('raised');
    expect(spec('BR/HC').carry).toBe('sloped');
    expect(spec('BR/GHC').carry).toBe('raised');
    expect(spec('FR/GHC').carry).toBe('sloped');
    expect(fig('FR/HC')).toContain('data-carbine');
    for (const k of CAVALRY.filter((x) => x !== 'FR/HC')) expect(all(k), k).not.toContain('data-carbine');
  });

  it('heavy keys ride heavy horses and light keys light ones, and the heavy horse is taller', () => {
    for (const k of CAVALRY) expect(fig(k), k).toContain(`data-horse="${spec(k).horse}"`);
    for (const k of ['FR/HC', 'FR/CU', 'FR/GHC', 'BR/HC', 'BR/GHC', 'PT/HC'] as const) expect(spec(k).horse, k).toBe('heavy');
    for (const k of ['FR/LC', 'FR/LNC', 'BR/LC', 'PT/LC', 'AL/LC'] as const) expect(spec(k).horse, k).toBe('light');
    expect(HORSE_SEAT.heavy.y).toBeLessThan(HORSE_SEAT.light.y);
    const sh = { cloth: '#224488', trim: '#ffffff' };
    const light = svg(h(Horse, { size: 'light', coat: 'bay', pose: 0, shabraque: sh }));
    const heavy = svg(h(Horse, { size: 'heavy', coat: 'bay', pose: 0, shabraque: sh }));
    expect(light).toContain('data-horse="light"');
    expect(heavy).toContain('data-horse="heavy"');
    expect(heavy).toMatch(/data-horse="heavy" transform="scale\(1\.1/);
    expect(light).not.toContain('transform="scale(');
  });

  it('is dressed in the right colours', () => {
    const has = (k: ArtKey, c: string) => expect(all(k), `${k} ${c}`).toContain(c);
    for (const k of ['FR/LC', 'FR/HC'] as const) { expect(hueClass(spec(k).dress.coat), k).toBe('green'); has(k, spec(k).dress.coat); }
    expect(hueClass(spec('FR/CU').dress.coat)).toBe('blue');
    has('FR/CU', spec('FR/CU').dress.coat);
    for (const k of ['BR/HC', 'BR/GHC'] as const) { expect(hueClass(spec(k).dress.coat), k).toBe('red'); has(k, spec(k).dress.coat); }
    expect(hueClass(spec('BR/LC').dress.coat)).toBe('blue');
    has('BR/LC', spec('BR/LC').dress.coat);
    const al = spec('AL/LC').dress;
    expect(hueClass(al.coat)).toBe('black');
    expect(al.pelisse && hueClass(al.pelisse.colour)).toBe('black');
    has('AL/LC', al.coat);
    has('AL/LC', al.pelisse!.colour);
    expect(all('AL/LC')).toContain('data-part="pelisse"');
    const cu = spec('FR/CU').head.plume;
    expect(cu && hueClass(cu.colour)).toBe('red');
  });

  it('marks the Guard', () => {
    expect(token('FR/GHC')).toContain('data-guard="eagle"');
    expect(token('BR/GHC')).toContain('data-guard="crown"');
    for (const k of CAVALRY.filter((x) => x !== 'FR/GHC' && x !== 'BR/GHC')) expect(token(k), k).not.toContain('data-guard');
  });

  it('renders every key at 1..4 blocks, both facings, one figure per block, without NaN', () => {
    for (const k of CAVALRY) for (let blocks = 1; blocks <= 4; blocks++) for (const facing of ['left', 'right'] as const) {
      const m = token(k as CavalryKey, { blocks, maxBlocks: 4, facing });
      expect(m, `${k} ${blocks} ${facing}`).not.toMatch(/NaN|undefined/);
      expect(count(m, 'data-fig='), `${k} ${blocks} ${facing}`).toBe(blocks);
    }
  });

  it('a rider also draws as a leader or a driver (reins, no weapon)', () => {
    const f = makeFig(NATION_LOOKS.FR, 0);
    for (const weapon of ['reins', 'none'] as const) {
      const m = svg(h(Rider, { dress: spec('FR/CU').dress, head: spec('FR/CU').head, weapon, f, pose: 0 }));
      expect(m, weapon).toContain(`data-weapon="${weapon}"`);
      expect(m, weapon).not.toMatch(/NaN|undefined/);
    }
  });

  it('a depleted unit keeps its figures in their slots and their coats', () => {
    const coat = (m: string) => [...m.matchAll(/data-coat="(\w+)"/g)].map((x) => x[1]);
    const full = coat(token('FR/LC', { blocks: 4 }));
    expect(coat(token('FR/LC', { blocks: 2 }))).toEqual(full.slice(2));
  });
});
