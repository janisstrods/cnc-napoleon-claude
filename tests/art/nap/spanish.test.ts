// The Expansion #1 miniatures: the Spanish army, the Swiss in French and Spanish service and the Guard light cavalry.
import { createElement as h } from 'react';
import { describe, expect, it } from 'vitest';
import { NapLeaderToken, NapUnitIcon } from '../../../src/art/nap';
import { ribbonLines, ribbonWidth } from '../../../src/art/nap/leader';
import { ART_KEYS, ART_NATIONS, isArtKey, type ArtKey } from '../../../src/art/nap/keys';
import { BASE_TOP, NATION_LOOKS } from '../../../src/art/nap/nations';
import { FIGURE_BANDS } from '../../../src/art/nap/slots';
import { FIGURE_SPECS, LEADER_SPECS } from '../../../src/art/nap/specs';
import { UNIT_STATS } from '../../../src/engine/units';
import { P } from '../../../src/ui/terrain/palette';
import { rgb } from '../../../src/art/color';
import { balanced, count, deltaE, fig, hueClass, placed, shape, svg, token } from './helpers';

const NEW: readonly ArtKey[] = ['SP/LN', 'SP/LT', 'SP/GR', 'SP/ML', 'SP/SWI', 'FR/SWI', 'SP/LC', 'SP/HC', 'SP/CU', 'FR/GLC', 'SP/FA'] as ArtKey[];
const BAD = /NaN|undefined|Infinity/;
const maxOf = (k: ArtKey) => UNIT_STATS[k].blocks;
/** The four figures of a key, concatenated, colours stripped: the drawing alone. */
const outline = (k: ArtKey) => shape([0, 1, 2, 3].map((i) => fig(k, i)).join(''));

// What a base edge is seen against (the list of tests/art/nap/nations.test.ts): the terrain palette's ground fills, the
// flocked top and the hex border.
const GROUND = [
  'grass', 'grassTop', 'grassBottom', 'grassLight', 'grassDark', 'grassOchre', 'tuftDark', 'tuftLight', 'hill',
  'forestFloor', 'leafDark', 'leafMid', 'leafLight', 'leafSun', 'water', 'waterDeep', 'waterDeeper', 'waterEdge', 'waterShallow',
  'bank', 'verge', 'sand', 'sandDark', 'sandWet', 'mud', 'dirt', 'scrub', 'earth', 'earthLight', 'street', 'reed', 'reedDark', 'rock', 'rockMid',
] as const;
const BOARD: Record<string, string> = { baseTop: BASE_TOP, hexBorder: '#6b7a3a' };
for (const name of GROUND) {
  const value = P[name] as string | readonly string[];
  if (Array.isArray(value)) value.forEach((c, i) => (BOARD[`${name}[${i}]`] = c));
  else BOARD[name] = value as string;
}
const lum = (c: string) => { const [r, g, b] = rgb(c); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };

describe('Spanish, Swiss and Guard light cavalry miniatures', () => {
  it('the new keys are art keys, and SP is an art nation', () => {
    for (const k of NEW) expect(isArtKey(k), k).toBe(true);
    expect(ART_NATIONS).toContain('SP');
    for (const k of NEW) expect(ART_KEYS).toContain(k);
  });

  it('every new key renders 1–5 blocks without NaN or stub, both facings', () => {
    for (const k of NEW) {
      expect(FIGURE_SPECS[k].stub, k).toBeUndefined();
      const max = maxOf(k);
      for (let b = 1; b <= Math.min(5, max); b++) for (const facing of ['left', 'right'] as const) for (const dimmed of [false, true]) {
        const out = token(k, { blocks: b, maxBlocks: max, facing, dimmed });
        expect(out, `${k} ${b}/${max} ${facing}`).not.toMatch(BAD);
        expect(out, `${k} ${b}/${max} ${facing}`).not.toContain('data-stub');
        expect(count(out, 'data-fig='), `${k} ${b}/${max} ${facing}`).toBe(b);
      }
      for (let i = 0; i < 4; i++) expect(fig(k, i), `${k} ${i}`).not.toMatch(BAD);
      expect(svg(h(NapUnitIcon, { unitKey: k, size: 40 })), k).not.toMatch(BAD);
    }
  });

  it('shapes differ with colours stripped: SP/LN, SP/LT, SP/GR, SP/ML; SP/LC, SP/HC, SP/CU; FR/SWI vs FR/LN; FR/GLC vs FR/LC', () => {
    const groups: ArtKey[][] = [['SP/LN', 'SP/LT', 'SP/GR', 'SP/ML'], ['SP/LC', 'SP/HC', 'SP/CU']] as ArtKey[][];
    for (const g of groups) expect(new Set(g.map(outline)).size, g.join(' ')).toBe(g.length);
    expect(outline('FR/SWI')).not.toBe(outline('FR/LN'));
    expect(outline('FR/GLC')).not.toBe(outline('FR/LC'));
    // and every new key is told apart by its colours at least
    expect(new Set(NEW.map((k) => fig(k))).size).toBe(NEW.length);
  });

  it('wears what the uniform brief names', () => {
    expect(fig('SP/LN')).toContain('data-head="bicorne"');
    expect(fig('SP/LT')).toContain('data-head="roundHat"');
    expect(fig('SP/ML')).toContain('data-head="roundHat"');
    expect(fig('SP/GR')).toMatch(/data-head="bearskin(Plate)?"/);
    for (const k of ['SP/SWI', 'FR/SWI', 'SP/LC'] as ArtKey[]) expect(fig(k), k).toContain('data-head="shako"');
    expect(fig('SP/HC')).toContain('data-head="bicorne"');
    expect(fig('SP/CU')).toContain('data-cuirass="steel"');
    expect(fig('SP/CU')).toMatch(/data-head="(cuirassierHelmet|crestedHelmet|dragoonHelmet)"/);
    expect(fig('FR/GLC')).toContain('data-head="colpack"');
    expect(FIGURE_SPECS['FR/GLC'].guard).toBe(true);
    const coat = (k: ArtKey) => {
      const s = FIGURE_SPECS[k];
      return s.drawing === 'gun' ? s.crew.dress.coat : s.dress.coat;
    };
    expect(hueClass(coat('SP/LN'))).toBe('white');
    expect(hueClass(coat('SP/GR'))).toBe('white');
    for (const k of ['SP/LT', 'SP/SWI', 'SP/HC', 'SP/FA'] as ArtKey[]) expect(['blue', 'black'], k).toContain(hueClass(coat(k)));
    expect(hueClass(coat('SP/ML'))).toBe('brown');
    expect(hueClass(coat('FR/SWI'))).toBe('red');
    expect(['green', 'blue']).toContain(hueClass(coat('SP/LC')));
    expect(hueClass(coat('FR/GLC'))).toBe('green');
    for (const k of NEW) expect(fig(k), k).toContain(coat(k));
  });

  it('a unit stands on its row\'s nation colour: SP/SWI on the Spanish yellow, FR/SWI on the French blue', () => {
    expect(token('SP/SWI', { blocks: 5, maxBlocks: 5 })).toContain(NATION_LOOKS.SP.side.edge);
    expect(token('FR/SWI', { blocks: 5, maxBlocks: 5 })).toContain(NATION_LOOKS.FR.side.edge);
    expect(token('FR/SWI', { blocks: 5, maxBlocks: 5 })).not.toContain(NATION_LOOKS.SP.side.edge);
  });

  it('a 5-block unit (SP/LT, SP/SWI, FR/SWI) shows 5 figures and keeps slots as it loses blocks', () => {
    /** Each figure's placement by its slot index (the index also picks its paint). */
    const slotsOf = (m: string) => {
      const out: Record<string, string> = {};
      for (const r of m.matchAll(/<g data-slot="(\d)"/g)) out[r[1]] = /transform="([^"]+)"/.exec(balanced(m, r.index!))![1];
      return out;
    };
    for (const k of ['SP/LT', 'SP/SWI', 'FR/SWI'] as ArtKey[]) {
      expect(maxOf(k), k).toBe(5);
      for (const facing of ['left', 'right'] as const) {
        const full = token(k, { blocks: 5, maxBlocks: 5, facing });
        expect(count(full, 'data-fig='), k).toBe(5);
        const at5 = placed(k, full);
        expect(at5.length).toBe(5);
        // five distinct places
        expect(new Set(at5.map(([, x, y]) => `${x},${y}`)).size, k).toBe(5);
        const fullSlots = slotsOf(full);
        expect(Object.keys(fullSlots).length, k).toBe(5);
        for (let b = 4; b >= 2; b--) {
          const now = slotsOf(token(k, { blocks: b, maxBlocks: 5, facing }));
          expect(Object.keys(now).length, `${k} ${b}`).toBe(b);
          // every surviving figure keeps the slot (and so the place and paint) it had at full strength
          for (const [idx, tr] of Object.entries(now)) expect(tr, `${k} ${b} slot ${idx}`).toBe(fullSlots[idx]);
        }
      }
      // at 4 of 5 blocks the unit stands as a 4-block unit does
      expect(placed(k, token(k, { blocks: 4, maxBlocks: 5 }))).toEqual(placed(k, token(k, { blocks: 4, maxBlocks: 4 })));
    }
  });

  it('every figure of a new key stays at least 1 unit inside the hex, at every strength up to 5, both facings', () => {
    const AP = 50 * Math.sqrt(3) / 2;
    const inside = (x: number, y: number, d: number) => Math.abs(x) <= AP - d && Math.abs(x) / 2 + (Math.abs(y) * Math.sqrt(3)) / 2 <= AP - d;
    const hits: string[] = [];
    for (const k of NEW) for (const max of new Set([maxOf(k), 4])) for (let n = 1; n <= max; n++) for (const facing of ['left', 'right'] as const) {
      for (const [key, tx, ty, sx, sy] of placed(k, token(k, { blocks: n, maxBlocks: max, facing }))) {
        for (const [t, b, l, r] of FIGURE_BANDS[key]) for (const [x, y] of [[l, t], [r, t], [l, b], [r, b]]) {
          const X = tx + x * sx, Y = ty + y * sy;
          if (!inside(X, Y, 1)) hits.push(`${k} ${n}/${max} ${facing} ${key} at (${X.toFixed(1)}, ${Y.toFixed(1)})`);
        }
      }
    }
    expect([...new Set(hits)].slice(0, 20)).toEqual([]);
  });

  it('the SP edge colour clears dE 20 against every ground colour', () => {
    const close: string[] = [];
    for (const [name, c] of Object.entries(BOARD)) {
      const de = deltaE(NATION_LOOKS.SP.side.edge, c);
      if (de < 20) close.push(`SP vs ${name}: ${de.toFixed(1)}`);
    }
    expect(close).toEqual([]);
    expect(hueClass(NATION_LOOKS.SP.side.edge)).toBe('yellow');
    for (const n of ['FR', 'BR', 'PT'] as const) expect(deltaE(NATION_LOOKS.SP.side.edge, NATION_LOOKS[n].side.edge), n).toBeGreaterThanOrEqual(40);
    const s = NATION_LOOKS.SP.side;
    expect(lum(s.edgeShade)).toBeLessThan(lum(s.edge));
    expect(lum(s.edge)).toBeLessThan(lum(s.edgeLight));
  });

  it('an SP leader is drawn, with the name ribbon fitting "Castaños" and "San Juan"', () => {
    expect(LEADER_SPECS.SP.stub).toBeUndefined();
    expect(LEADER_SPECS.SP.head.kind).toBe('bicorne');
    expect(hueClass(LEADER_SPECS.SP.dress.sash!)).toBe('red');
    for (const attached of [true, false]) for (const facing of ['left', 'right'] as const) {
      const out = svg(h(NapLeaderToken, { nation: 'SP', facing, attached, name: 'Castaños', showName: !attached }));
      expect(out, `${facing} ${attached}`).not.toMatch(BAD);
      expect(out).not.toContain('data-stub');
      expect(out).toContain('data-head="bicorne"');
    }
    expect(svg(h(NapLeaderToken, { nation: 'SP', facing: 'right', attached: false, name: 'Castaños', showName: true }))).toContain(NATION_LOOKS.SP.side.edge);
    for (const name of ['Castaños', 'San Juan']) {
      expect(ribbonLines(name), name).toEqual([name]);
      expect(ribbonWidth(name), name).toBeGreaterThanOrEqual(name.length * 5.7);
      expect(ribbonWidth(name), name).toBeLessThanOrEqual(80);
      const out = svg(h(NapLeaderToken, { nation: 'SP', facing: 'right', attached: false, name, showName: true }));
      expect(out).toContain(`>${name}<`);
      const m = /<rect data-ribbon[^>]*? width="([\d.]+)"/.exec(out);
      expect(Number(m![1]), name).toBeCloseTo(ribbonWidth(name), 5);
    }
    // the Spanish general differs from every other nation's
    const alone = (n: (typeof ART_NATIONS)[number]) => svg(h(NapLeaderToken, { nation: n, facing: 'right', attached: false }));
    expect(new Set(ART_NATIONS.map(alone)).size).toBe(ART_NATIONS.length);
  });
});
