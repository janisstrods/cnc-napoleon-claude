import { describe, expect, it } from 'vitest';
import { BASE_TOP, CLOTH, NATION_LOOKS } from '../../../src/art/nap/nations';
import { P } from '../../../src/ui/terrain/palette';
import { deltaE, hueClass } from './helpers';
import { rgb } from '../../../src/art/color';

/** What a base edge is seen against: every solid colour of the terrain paint palette and the flocked top. */
const SOLID = /^#[0-9a-f]{6}$/i;
const BOARD: Record<string, string> = { baseTop: BASE_TOP };
for (const [name, value] of Object.entries(P)) {
  if (Array.isArray(value)) value.forEach((c, i) => SOLID.test(c) && (BOARD[`${name}[${i}]`] = c));
  else if (SOLID.test(value)) BOARD[name] = value;
}
const lum = (c: string) => { const [r, g, b] = rgb(c); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };

describe('nation looks', () => {
  it('FR, BR and PT edges and banners differ pairwise by dE >= 40', () => {
    const ns = ['FR', 'BR', 'PT'] as const;
    for (const k of ['edge', 'banner'] as const) {
      for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) {
        expect(deltaE(NATION_LOOKS[ns[a]].side[k], NATION_LOOKS[ns[b]].side[k]), `${ns[a]} ${ns[b]} ${k}`).toBeGreaterThanOrEqual(40);
      }
    }
  });

  it('the Allies stand on the Portuguese colours', () => {
    expect(NATION_LOOKS.AL.side).toEqual(NATION_LOOKS.PT.side);
  });

  it('each edge differs from the board colours by dE >= 20', () => {
    const close: string[] = [];
    for (const n of ['FR', 'BR', 'PT', 'AL'] as const) {
      for (const [name, c] of Object.entries(BOARD)) {
        const de = deltaE(NATION_LOOKS[n].side.edge, c);
        if (de < 20) close.push(`${n} vs ${name}: ${de.toFixed(1)}`);
      }
    }
    expect(close).toEqual([]);
  });

  it('luminance runs edgeShade < edge < edgeLight', () => {
    for (const n of ['FR', 'BR', 'PT'] as const) {
      const s = NATION_LOOKS[n].side;
      expect(lum(s.edgeShade)).toBeLessThan(lum(s.edge));
      expect(lum(s.edge)).toBeLessThan(lum(s.edgeLight));
    }
  });

  it('guard devices', () => {
    expect(['FR', 'BR', 'PT', 'AL'].map((n) => NATION_LOOKS[n as 'FR'].guardDevice)).toEqual(['eagle', 'crown', 'none', 'none']);
  });

  it('cloth swatches read as their names', () => {
    expect(hueClass(CLOTH.frenchBlue)).toBe('blue');
    expect(hueClass(CLOTH.britishRed)).toBe('red');
    for (const k of ['rifleGreen', 'nassauGreen', 'chasseurGreen', 'dragoonGreen'] as const) expect(hueClass(CLOTH[k]), k).toBe('green');
    expect(hueClass(CLOTH.cacadorBrown)).toBe('brown');
    expect(hueClass(CLOTH.brunswickBlack)).toBe('black');
    expect(hueClass(CLOTH.white)).toBe('white');
    expect(hueClass(CLOTH.trouserGrey)).toBe('grey');
    expect(hueClass(CLOTH.greatcoatGrey)).toBe('grey');
  });
});
