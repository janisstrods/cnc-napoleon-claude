import { describe, expect, it } from 'vitest';
import { ARM_OF, codeOf, isUnitKey } from '../../../src/engine/codes';
import { ART_KEYS, ART_NATIONS, isArtKey } from '../../../src/art/nap/keys';
import { FIGURE_SPECS, LEADER_SPECS } from '../../../src/art/nap/specs';

describe('the art keys', () => {
  it('are survey §2.1 plus FR/LNC, nothing else', () => {
    expect([...ART_KEYS].sort()).toEqual([
      'AL/FA', 'AL/LC', 'AL/LN', 'AL/LT', 'AL/ML', 'BR/FA', 'BR/GG', 'BR/GHC', 'BR/GR', 'BR/HA', 'BR/HC', 'BR/LC', 'BR/LN', 'BR/LT', 'BR/RI',
      'FR/CU', 'FR/FA', 'FR/GA', 'FR/GHC', 'FR/GR', 'FR/HA', 'FR/HC', 'FR/LC', 'FR/LN', 'FR/LNC', 'FR/LT', 'FR/ML', 'FR/OG', 'FR/YG',
      'PT/FA', 'PT/HC', 'PT/LC', 'PT/LN', 'PT/LT', 'PT/ML',
    ]);
    expect(new Set(ART_KEYS).size).toBe(35);
  });

  it('are all unit keys', () => {
    for (const k of ART_KEYS) expect(isUnitKey(k)).toBe(true);
  });

  it('name the four art nations', () => {
    expect([...ART_NATIONS]).toEqual(['FR', 'BR', 'PT', 'AL']);
    expect(isArtKey('SP/LN')).toBe(false);
    expect(isArtKey('FR/XX')).toBe(false);
    expect(isArtKey('FR/LN')).toBe(true);
  });

  it('have a spec whose drawing follows the arm', () => {
    const DRAWING = { infantry: 'foot', cavalry: 'horse', artillery: 'gun' } as const;
    for (const k of ART_KEYS) expect(FIGURE_SPECS[k].drawing).toBe(DRAWING[ARM_OF[codeOf(k)]]);
  });

  it('have a leader spec per art nation', () => {
    expect(Object.keys(LEADER_SPECS).sort()).toEqual(['AL', 'BR', 'FR', 'PT']);
  });
});
