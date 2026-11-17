import { createElement as h } from 'react';
import { describe, expect, it } from 'vitest';
import { makeFig } from '../../../src/art/nap/draw';
import { Headgear } from '../../../src/art/nap/headgear';
import { NapLeaderToken, ribbonWidth } from '../../../src/art/nap/leader';
import { ART_NATIONS, type ArtNation } from '../../../src/art/nap/keys';
import { NATION_LOOKS } from '../../../src/art/nap/nations';
import { LEADER_SPECS } from '../../../src/art/nap/specs/leaders';
import { hueClass, shape, svg } from './helpers';

const BAD = /NaN|undefined|Infinity/;
const leader = (nation: ArtNation, attached: boolean, facing: 'left' | 'right' = 'right', name = 'Kellermann', showName = !attached) =>
  svg(h(NapLeaderToken, { nation, facing, attached, name, showName }));
const hat = (nation: ArtNation) => svg(h(Headgear, { head: LEADER_SPECS[nation].head, f: makeFig(NATION_LOOKS[nation], 0) }));

describe('leaders', () => {
  it('no spec is a stub and no token carries data-stub', () => {
    for (const n of ART_NATIONS) {
      expect(LEADER_SPECS[n].stub, n).toBeUndefined();
      for (const facing of ['left', 'right'] as const) for (const attached of [true, false]) expect(leader(n, attached, facing), `${n} ${facing} ${attached}`).not.toContain('data-stub');
    }
  });

  it('the four alone tokens differ, and so do the four attached tokens', () => {
    expect(new Set(ART_NATIONS.map((n) => leader(n, false))).size).toBe(4);
    expect(new Set(ART_NATIONS.map((n) => leader(n, true))).size).toBe(4);
  });

  it('every colour of a flag appears in the alone token; the kinds are as decided', () => {
    for (const n of ART_NATIONS) for (const c of LEADER_SPECS[n].flag.colours) expect(leader(n, false), `${n} ${c}`).toContain(c);
    expect(leader('BR', false)).toContain('data-flag="union"');
    expect(LEADER_SPECS.FR.flag.kind).toBe('vertical');
    expect(LEADER_SPECS.AL.flag.kind).toBe('horizontal');
    for (const n of ART_NATIONS) expect(leader(n, false)).toContain(`data-flag="${LEADER_SPECS[n].flag.kind}"`);
  });

  it('the Allied sash is orange', () => {
    expect(hueClass(LEADER_SPECS.AL.dress.sash!)).toBe('orange');
  });

  it('everyone wears the bicorne; the British one is worn fore and aft', () => {
    for (const n of ART_NATIONS) {
      expect(LEADER_SPECS[n].head.kind).toBe('bicorne');
      expect(leader(n, true), n).toContain('data-head="bicorne"');
      expect(leader(n, false), n).toContain('data-head="bicorne"');
    }
    expect(LEADER_SPECS.BR.head.worn).toBe('foreAft');
    expect(LEADER_SPECS.FR.head.worn ?? 'athwart').toBe('athwart');
    expect(shape(hat('BR'))).not.toBe(shape(hat('FR')));
  });

  it('the medallion is small: every circle of an attached token has a radius of 11.5 or less', () => {
    for (const n of ART_NATIONS) for (const facing of ['left', 'right'] as const) {
      const radii = [...leader(n, true, facing).matchAll(/<circle[^>]*? r="([\d.]+)"/g)].map((m) => Number(m[1]));
      expect(radii.length).toBeGreaterThan(2);
      for (const r of radii) expect(r, `${n} ${facing}`).toBeLessThanOrEqual(11.5);
    }
  });

  it('long names fit the ribbon, and the rendered ribbon is as wide as ribbonWidth says', () => {
    expect(ribbonWidth('Prince of Orange')).toBeGreaterThanOrEqual('Prince of Orange'.length * 5.7);
    expect(ribbonWidth('Ney')).toBeGreaterThanOrEqual(22);
    for (const name of ['Ney', 'Kellermann', 'Prince of Orange']) {
      const out = leader('BR', false, 'right', name, true);
      const m = /<rect data-ribbon[^>]*? width="([\d.]+)"/.exec(out);
      expect(m, name).not.toBeNull();
      expect(Number(m![1])).toBeCloseTo(ribbonWidth(name), 5);
      expect(out).toContain(`>${name}<`);
    }
  });

  it('with showName false, or no name, no ribbon text is drawn', () => {
    expect(leader('FR', false, 'right', 'Kellermann', false)).not.toMatch(/Kellermann|data-ribbon|<text/);
    expect(svg(h(NapLeaderToken, { nation: 'FR', facing: 'right', attached: false, showName: true }))).not.toMatch(/data-ribbon|<text/);
  });

  it('the alone token stands on its side colour, and the Allies on the Portuguese brown', () => {
    for (const n of ART_NATIONS) expect(leader(n, false), n).toContain(NATION_LOOKS[n].side.edge);
    expect(NATION_LOOKS.AL.side.edge).toBe(NATION_LOOKS.PT.side.edge);
  });

  it('renders both facings without junk', () => {
    for (const n of ART_NATIONS) for (const facing of ['left', 'right'] as const) for (const attached of [true, false]) {
      expect(leader(n, attached, facing, 'Prince of Orange'), `${n} ${facing} ${attached}`).not.toMatch(BAD);
    }
  });
});
