import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../../src/scenarios';
import { PERSONALITIES, personalityById, personalityFor } from '../../src/ai/personality';

const BASE_COMMANDERS: [string, 'BR' | 'FR', string][] = [
  ['Wellesley', 'BR', 'wellington'], ['Wellington', 'BR', 'wellington'], ['Moore', 'BR', 'moore'], ['Craufurd', 'BR', 'craufurd'],
  ['Bock', 'BR', 'bock'], ['Hill', 'BR', 'hill'], ['Delaborde', 'FR', 'reynier'], ['Junot', 'FR', 'junot'], ['Soult', 'FR', 'soult'],
  ['King Joseph', 'FR', 'joseph'], ['Ney', 'FR', 'ney'], ['Massena', 'FR', 'massena'], ['Marmont', 'FR', 'marmont'],
  ['Foy', 'FR', 'reynier'], ['Clausel', 'FR', 'reynier'], ['Napoleon', 'FR', 'napoleon'],
];

describe('personalities', () => {
  it('every base-game commander gets the planned temperament', () => {
    for (const [name, nation, id] of BASE_COMMANDERS) {
      expect(personalityFor(name, nation === 'FR' ? 'French' : 'British', nation).id, name).toBe(id);
    }
    expect(personalityFor('Picton', 'British', 'BR').id).toBe('picton');
    expect(personalityFor('Beresford', 'Anglo-Portuguese', 'BR').id).toBe('beresford');
    expect(personalityFor('Masséna', 'French', 'FR').id).toBe('massena');
    expect(personalityFor('Crauford', 'British', 'BR').id).toBe('craufurd');
    expect(personalityFor('Reynier', 'French', 'FR').id).toBe('reynier');
    expect(personalityFor('Nobody', 'Portuguese', 'PT').id).toBe('hill');
    expect(personalityFor('Nobody', 'Allied', 'AL').id).toBe('hill');
    expect(personalityFor('Hillary', 'French', 'FR').id).toBe('reynier');  // \bhill\b needs the whole word
  });

  it('every commander named in the scenario data resolves to a Napoleonic temperament, never the fallback by accident', () => {
    const seen = new Set<string>();
    for (const sc of SCENARIOS) for (const side of ['top', 'bottom'] as const) {
      const x = sc.setup[side];
      seen.add(`${x.commander}|${x.army}|${x.nation}`);
    }
    expect(seen.size).toBeGreaterThan(10);
    for (const key of seen) {
      const [c, a, n] = key.split('|');
      expect(personalityFor(c, a, n === 'undefined' ? undefined : (n as 'BR' | 'FR')).id, key).not.toBe('veteran');
    }
  });

  it('without a nation, the army name chooses the default', () => {
    expect(personalityFor('Foy', 'French').id).toBe('reynier');
    expect(personalityFor('Nobody', 'British').id).toBe('hill');
    expect(personalityFor('Nobody', 'Anglo-Portuguese').id).toBe('hill');
  });

  it('ids are unique, every value is in 0..1, epithets ≤ 90 characters, no Ancients name remains', () => {
    const ids = PERSONALITIES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of PERSONALITIES) {
      for (const v of [p.aggression, p.caution, p.cunning, p.dash, p.chatter]) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
      expect(p.epithet.length, p.id).toBeLessThanOrEqual(90);
      expect(p.epithet.length).toBeGreaterThan(0);
      expect(`${p.id} ${p.name} ${p.epithet}`).not.toMatch(/hannibal|scipio|fox|lion|shield|bull|strategist|fabius|varro|marcellus|nero/i);
    }
    expect(ids).toContain('veteran');
  });

  it('personalityById falls back to the Veteran', () => {
    expect(personalityById('nonsense').id).toBe('veteran');
    expect(personalityById('fox').id).toBe('veteran');
    expect(personalityById('ney').id).toBe('ney');
  });
});
