// The public tokens (src/art) draw the Napoleonic art for every art key and art-nation leader, and the placeholder for the rest.
import { describe, expect, it } from 'vitest';
import { createElement as h } from 'react';
import { LeaderToken, UnitIcon, UnitToken } from '../../../src/art';
import { NapLeaderToken, NapUnitIcon, NapUnitToken, ART_KEYS, ART_NATIONS, artNationOf } from '../../../src/art/nap';
import { FIGURE_SPECS, LEADER_SPECS } from '../../../src/art/nap/specs';
import { UNIT_KEYS, nationOf, type UnitKey } from '../../../src/engine/codes';
import { svg } from './helpers';

/** UNIT_KEYS rows of an art nation that deliberately keep the placeholder. Each carries its reason. A new row fails the coverage test until decided. */
const PLACEHOLDER_OK: readonly UnitKey[] = [];

describe('public tokens delegate to the Napoleonic art', () => {
  for (const key of ART_KEYS) {
    for (const blocks of [4, 2]) {
      for (const facing of ['left', 'right'] as const) {
        it(`UnitToken ${key} ${blocks}/4 ${facing} is NapUnitToken`, () => {
          const a = svg(h(UnitToken, { unitKey: key, nation: artNationOf(key), blocks, maxBlocks: 4, facing }));
          const b = svg(h(NapUnitToken, { unitKey: key, blocks, maxBlocks: 4, facing }));
          expect(a).toBe(b);
          expect(a).toContain('data-nap');
        });
      }
    }
  }

  it('an SP key keeps the placeholder figures', () => {
    const m = svg(h(UnitToken, { unitKey: 'SP/LN', nation: 'SP', blocks: 3, maxBlocks: 4, facing: 'right' }));
    expect(m).not.toContain('data-nap');
    expect(m.split('data-figure=').length - 1).toBe(3);
  });

  for (const nation of ART_NATIONS) {
    for (const attached of [true, false]) {
      it(`LeaderToken ${nation} ${attached ? 'attached' : 'alone'} is NapLeaderToken`, () => {
        const a = svg(h(LeaderToken, { name: 'Picton', nation, attached }));
        const b = svg(h(NapLeaderToken, { nation, facing: 'right', attached, name: 'Picton', showName: !attached }));
        expect(a).toBe(b);
        expect(a).not.toContain('data-leader="Picton"'); // the placeholder's marker
      });
    }
  }

  it('an SP leader keeps the placeholder', () => {
    expect(svg(h(LeaderToken, { name: 'Castaños', nation: 'SP', attached: false }))).toContain('data-leader="Castaños"');
  });

  it('UnitIcon for an art key is NapUnitIcon', () => {
    for (const key of ART_KEYS) expect(svg(h(UnitIcon, { unitKey: key, size: 40 }))).toBe(svg(h(NapUnitIcon, { unitKey: key, size: 40 })));
  });

  it('every art nation of UNIT_KEYS is covered by art or listed as placeholder-OK', () => {
    const artNations: readonly string[] = ART_NATIONS;
    const missing = UNIT_KEYS.filter((k) => artNations.includes(nationOf(k)) && !(ART_KEYS as readonly string[]).includes(k)).sort();
    expect(missing).toEqual([...PLACEHOLDER_OK].sort());
  });

  it('nothing in the art is a stub', () => {
    for (const key of ART_KEYS) for (let b = 1; b <= 4; b++) expect(svg(h(NapUnitToken, { unitKey: key, blocks: b, maxBlocks: 4, facing: 'right' }))).not.toContain('data-stub');
    for (const nation of ART_NATIONS) for (const attached of [true, false]) expect(svg(h(NapLeaderToken, { nation, facing: 'right', attached, name: 'X', showName: true }))).not.toContain('data-stub');
    for (const s of Object.values(FIGURE_SPECS)) expect(JSON.stringify(s)).not.toContain('"stub"');
    for (const s of Object.values(LEADER_SPECS)) expect(JSON.stringify(s)).not.toContain('"stub"');
  });
});
