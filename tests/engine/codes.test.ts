import { describe, expect, it } from 'vitest';
import { ARM_OF, CODE_NAMES, UNIT_CODES, codeOf, isUnitKey, nationOf } from '../../src/engine/codes';
import { CATALOGUE, catalogueEntry } from '../../src/scenarios/catalogue';

describe('Napoleonics vocabulary', () => {
  it('maps every code to an arm', () => {
    expect(ARM_OF.LN).toBe('infantry'); expect(ARM_OF.CU).toBe('cavalry'); expect(ARM_OF.GA).toBe('artillery');
    expect(UNIT_CODES.every((c) => ARM_OF[c] && CODE_NAMES[c])).toBe(true);
  });
  it('splits and checks unit keys', () => {
    expect(nationOf('BR/RI')).toBe('BR'); expect(codeOf('FR/GHC')).toBe('GHC');
    expect(isUnitKey('PT/LN')).toBe(true); expect(isUnitKey('PT/XX')).toBe(false); expect(isUnitKey('LN')).toBe(false);
  });
  it('catalogues 15 base and 18 Spanish battles with unique ids', () => {
    expect(CATALOGUE.filter((b) => b.box === 'base').map((b) => b.id)).toEqual(
      Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(3, '0')));
    expect(CATALOGUE.filter((b) => b.box === 'exp1')).toHaveLength(18);
    expect(new Set(CATALOGUE.map((b) => b.id)).size).toBe(33);
    expect(catalogueEntry('015')?.name).toBe('Waterloo');
  });
});
