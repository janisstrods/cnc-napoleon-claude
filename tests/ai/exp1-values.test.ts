// Plan 7C Task 18: the value of the Expansion #1 rows and the Spanish-war commander temperaments.
import { describe, expect, it } from 'vitest';
import { UNIT_KEYS, UNIT_STATS } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { rowValue, MOVED_MELEE_DIE, REROLL_DIE, REROLL_IMMUNE_DIE } from '../../src/ai/values';
import { PERSONALITIES, personalityById, personalityFor } from '../../src/ai/personality';

const full = (k: keyof typeof UNIT_STATS) => rowValue(UNIT_STATS[k], UNIT_STATS[k].blocks);

describe('exp1 row values', () => {
  it('constants are the brief\'s values', () => {
    expect([MOVED_MELEE_DIE, REROLL_DIE, REROLL_IMMUNE_DIE]).toEqual([0.5, 0.25, 0.1]);
  });

  it('values rank SP/ML < SP/LN < FR/LN < SP/GR at full strength', () => {
    expect(full('SP/ML')).toBeLessThan(full('SP/LN'));
    expect(full('SP/LN')).toBeLessThan(full('FR/LN'));
    expect(full('FR/LN')).toBeLessThan(full('SP/GR'));
  });

  it('FR/LNC is worth more than FR/LC; FR/GLC more than FR/LC', () => {
    expect(full('FR/LNC')).toBeGreaterThan(full('FR/LC'));
    expect(full('FR/GLC')).toBeGreaterThan(full('FR/LC'));
  });

  it('a 5-block SP/LT is worth more than a 4-block SP/LN; Swiss more than SP/LN', () => {
    expect(rowValue(UNIT_STATS['SP/LT'], 5)).toBeGreaterThan(rowValue(UNIT_STATS['SP/LN'], 4));
    expect(full('SP/SWI')).toBeGreaterThan(full('SP/LN'));
    expect(full('FR/SWI')).toBeGreaterThan(full('SP/LN'));
  });

  it('a cuirassier immune to lancers is worth a little more than the same row without the trait', () => {
    const cu = UNIT_STATS['SP/CU'];
    expect(rowValue(cu, 3)).toBeGreaterThan(rowValue({ ...cu, immuneToFlagReroll: false }, 3));
  });

  it('every exp1 row has a finite positive value at every block count', () => {
    const rows = UNIT_KEYS.filter((k) => UNIT_STATS[k].expansion === 'exp1');
    expect(rows.length).toBeGreaterThanOrEqual(12);
    for (const k of rows) for (let b = 1; b <= UNIT_STATS[k].blocks; b++) {
      const v = rowValue(UNIT_STATS[k], b);
      expect(Number.isFinite(v) && v > 0, `${k} at ${b}`).toBe(true);
    }
  });
});

describe('Spanish-war temperaments', () => {
  const NAMES: [string, string, 'SP' | 'BR' | 'FR', string][] = [
    ['Castaños', 'Spanish', 'SP', 'castanos'], ['Castanos', 'Spanish', 'SP', 'castanos'], ['Blake', 'Spanish', 'SP', 'blake'],
    ['Cuesta', 'Spanish', 'SP', 'cuesta'], ['Belveder', 'Spanish', 'SP', 'belveder'], ['San Juan', 'Spanish', 'SP', 'san_juan'],
    ['Del Parque', 'Spanish', 'SP', 'del_parque'], ['Freire', 'Spanish', 'SP', 'freire'], ['Areizaga', 'Spanish', 'SP', 'areizaga'],
    ['Aréizaga', 'Spanish', 'SP', 'areizaga'], ['Graham', 'Anglo-Spanish', 'BR', 'graham'], ['Dupont', 'French', 'FR', 'dupont'],
    ['Lefebvre', 'French', 'FR', 'lefebvre'], ['Victor', 'French', 'FR', 'victor'], ['Suchet', 'French', 'FR', 'suchet'],
    ['Kellermann', 'French', 'FR', 'kellermann'], ['Milhaud', 'French', 'FR', 'milhaud'], ['Marchand', 'French', 'FR', 'marchand'],
    ['King Joseph', 'French', 'FR', 'joseph'],
  ];

  it('each 101–118 commander maps to his own temperament; an unknown Spanish name gets the Spanish default', () => {
    for (const [name, army, nation, id] of NAMES) expect(personalityFor(name, army, nation).id, name).toBe(id);
    expect(personalityFor('Nobody', 'Spanish', 'SP').id).toBe('del_parque');
  });

  it('every 101–118 commander resolves to a named temperament, not a nation default', () => {
    // Base-game commanders keep their Plan 5 temperaments; Adam (101's British brigade general) is the one with only his nation's default.
    const NAMED = new Set([...NAMES.map((n) => n[3]), 'wellington', 'beresford', 'soult', 'napoleon']);
    let seen = 0;
    for (let n = 101; n <= 118; n++) {
      const sc = scenarioById(String(n));
      for (const side of ['top', 'bottom'] as const) {
        const c = sc.setup[side];
        const p = personalityFor(c.commander, c.army, c.nation);
        seen++;
        if (c.commander === 'Adam') { expect(p.id).toBe('hill'); continue; }
        expect(NAMED.has(p.id), `${n} ${side}: ${c.commander}`).toBe(true);
      }
    }
    expect(seen).toBe(36);
  });

  it('the new temperaments are well formed, British-spelt and distinct in character', () => {
    for (const [, , , id] of NAMES) {
      const p = personalityById(id);
      expect(p.id).toBe(id);
      expect(p.epithet.length).toBeGreaterThan(0);
      expect(p.epithet.length).toBeLessThanOrEqual(90);
      expect(p.epithet).not.toMatch(/maneuver|defense|color|gray|armor/i);
    }
    const ids = PERSONALITIES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    const g = (id: string) => personalityById(id);
    expect(g('castanos').caution).toBeGreaterThan(g('areizaga').caution);
    expect(g('areizaga').aggression).toBeGreaterThan(g('del_parque').aggression);
    expect(g('freire').dash).toBeGreaterThan(g('del_parque').dash);
    expect(g('kellermann').dash).toBeGreaterThan(g('suchet').dash);
    expect(g('joseph').aggression).toBeLessThan(g('suchet').aggression);
  });
});
