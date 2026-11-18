import { describe, expect, it } from 'vitest';
import { UNIT_KEYS, UNIT_STATS, type RowKey } from '../../src/engine';
import { NEUTRAL_W, WIN_SCORE, bannerScore, bannerStep, bannersWorth, rowValue, weightsFor } from '../../src/ai/values';
import { PERSONALITIES, personalityById } from '../../src/ai/personality';

const full = (k: RowKey): number => rowValue(UNIT_STATS[k], UNIT_STATS[k].blocks);

describe('values', () => {
  it('rowValue rises with blocks for every row', () => {
    for (const k of UNIT_KEYS) {
      const st = UNIT_STATS[k];
      for (let b = 1; b <= st.blocks; b++) expect(rowValue(st, b), `${k} at ${b}`).toBeGreaterThan(rowValue(st, b - 1));
    }
  });

  it('a worn line loses value faster than its blocks: rowValue(FR/LN, 2) < 0.5 · rowValue(FR/LN, 4)', () => {
    const st = UNIT_STATS['FR/LN'];
    expect(rowValue(st, 2)).toBeLessThan(0.5 * rowValue(st, 4));
    const br = UNIT_STATS['BR/LN'];
    expect(rowValue(br, 2)).toBeLessThan(0.5 * rowValue(br, 4));
  });

  it('Old Guard > Grenadier > Line > Militia at full strength; heavy cavalry > light cavalry; foot artillery at 1 block < at 3', () => {
    expect(full('FR/OG')).toBeGreaterThan(full('FR/GR'));
    expect(full('FR/GR')).toBeGreaterThan(full('FR/LN'));
    expect(full('FR/LN')).toBeGreaterThan(full('FR/ML'));
    expect(full('FR/HC')).toBeGreaterThan(full('FR/LC'));
    expect(full('BR/HC')).toBeGreaterThan(full('BR/LC'));
    expect(rowValue(UNIT_STATS['FR/FA'], 1)).toBeLessThan(rowValue(UNIT_STATS['FR/FA'], 3));
    expect(rowValue(UNIT_STATS['BR/FA'], 1)).toBeLessThan(rowValue(UNIT_STATS['BR/FA'], 3));
  });

  it('bannerStep rises towards victory and the winning banner is worth 6', () => {
    for (let k = 1; k < 6; k++) expect(bannerStep(k + 1, 6)).toBeGreaterThan(bannerStep(k, 6));
    expect(bannerStep(6, 6)).toBe(6);
    expect(bannerStep(9, 6)).toBe(6);
    expect(bannerScore(2, 6)).toBeCloseTo(bannerStep(1, 6) + bannerStep(2, 6));
    expect(bannersWorth(3, 2, 6)).toBeCloseTo(bannerStep(4, 6) + bannerStep(5, 6));
    expect(WIN_SCORE).toBe(100);
  });

  it('weightsFor maps aggression to a lower attack threshold and caution to a higher riskSelf', () => {
    const ney = weightsFor(personalityById('ney'));
    const wel = weightsFor(personalityById('wellington'));
    expect(ney.attackThreshold).toBeLessThan(wel.attackThreshold);
    expect(ney.bonusThreshold).toBeLessThan(wel.bonusThreshold);
    expect(wel.riskSelf).toBeGreaterThan(ney.riskSelf);
    expect(ney.advance).toBeGreaterThan(wel.advance);
    expect(wel.retention).toBeGreaterThan(ney.retention);
    const v = weightsFor(personalityById('veteran'));
    expect(v.riskSelf).toBeCloseTo(0.55 + 0.6 * 0.55);
    expect(NEUTRAL_W).toEqual(v);
    expect(PERSONALITIES.length).toBe(15);
  });
});
