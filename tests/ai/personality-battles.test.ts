// Every base battle's commanders resolve to the temperament of Task 2's table (personality.test.ts), never the Veteran fallback.
import { describe, expect, it } from 'vitest';
import { scenarioById } from '../../src/scenarios';
import { PERSONALITIES, personalityFor } from '../../src/ai/personality';
import { failOnAiErrors } from './no-ai-errors';

failOnAiErrors();

/** Battle -> [top, bottom] temperament ids (a commander without one of his own gets his nation's default: Reynier's or Hill's). */
const TABLE: Record<string, [string, string]> = {
  '001': ['wellington', 'reynier'], '002': ['wellington', 'reynier'], '003': ['wellington', 'junot'], '004': ['moore', 'soult'],
  '005': ['wellington', 'reynier'], '006': ['craufurd', 'ney'], '007': ['wellington', 'massena'], '008': ['wellington', 'massena'],
  '009': ['wellington', 'ney'], '010': ['wellington', 'marmont'], '011': ['wellington', 'marmont'], '012': ['bock', 'reynier'],
  '013': ['hill', 'reynier'], '014': ['wellington', 'ney'], '015': ['wellington', 'napoleon'],
};

describe('the temperament of each base-battle commander', () => {
  for (const [id, [top, bottom]] of Object.entries(TABLE)) {
    it(`${id}: top ${top}, bottom ${bottom}, neither the Veteran`, () => {
      const setup = scenarioById(id).setup;
      for (const [side, want] of [['top', top], ['bottom', bottom]] as const) {
        const c = setup[side];
        const p = personalityFor(c.commander, c.army, c.nation);
        expect(p.id, `${id} ${side}: ${c.commander}`).toBe(want);
        expect(p.id).not.toBe('veteran');
        expect(PERSONALITIES).toContain(p);
      }
    });
  }

  it('the table covers every base battle 001-015', () => {
    expect(Object.keys(TABLE)).toEqual(Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(3, '0')));
  });
});
