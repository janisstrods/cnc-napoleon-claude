// Rules: RR §2.2–§2.6, §4.1–§4.2, §12.1–§12.2, §14 (design/rules-reference.md)
import { describe, expect, it } from 'vitest';
import { ARM_OF, UNIT_KEYS, isRowKey, isUnitKey, type RowKey } from '../../src/engine/codes';
import { CARD_DEFS, CARD_LIST, cardDice, mirrorKind } from '../../src/engine/cards';
import { TERRAIN_STATS, WORKS } from '../../src/engine/terrain';
import type { CardKind } from '../../src/engine/types';
import { UNIT_STATS, retreatDistance } from '../../src/engine/units';

const S = (k: RowKey) => UNIT_STATS[k];
/** The base game's rows (Expansion #1's twelve are checked in tests/rules/exp1-units.test.ts). */
const BASE = UNIT_KEYS.filter((k) => UNIT_STATS[k].expansion === 'base');

describe('unit, terrain and card tables', () => {
  it('BASE are the 34 rows of RR §2, exactly the keys the 15 battles use', () => {
    expect(BASE).toHaveLength(34);
    const battles = import.meta.glob<{ units: { key: string }[] }>('../../design/data/0??.json', { eager: true, import: 'default' });   // base battles only; 1xx files are Spanish
    expect(Object.keys(battles)).toHaveLength(15);
    const used = new Set(Object.values(battles).flatMap((b) => b.units.map((x) => x.key)));
    expect([...used].sort()).toEqual([...BASE].sort());
    expect(UNIT_KEYS).toHaveLength(34 + 12); expect(isRowKey('FR/LNC')).toBe(true); expect(isRowKey('BR/YG')).toBe(false); expect(isUnitKey('BR/YG')).toBe(true);
  });
  it('blocks (RR §2.2–§2.4)', () => {
    expect(BASE.filter((k) => S(k).blocks === 5)).toEqual(['BR/LT', 'BR/GG']);
    expect(BASE.filter((k) => S(k).blocks === 3)).toEqual(['FR/FA', 'FR/HA', 'FR/GA', 'BR/RI', 'BR/LC', 'BR/HC', 'BR/GHC',
      'BR/FA', 'BR/HA', 'PT/LT', 'PT/LC', 'PT/HC', 'PT/FA', 'AL/LT', 'AL/LC', 'AL/FA']);
  });
  it('retreat per flag: AL/LN 2, every ML 3, others 1 (R10)', () => {
    expect(BASE.filter((k) => S(k).retreat.first !== 1)).toEqual(['FR/ML', 'PT/ML', 'AL/LN', 'AL/ML']);
    expect(retreatDistance(S('AL/LN'), 2)).toBe(4); expect(retreatDistance(S('FR/ML'), 2)).toBe(6); expect(retreatDistance(S('FR/LN'), 0)).toBe(0);
  });
  it('flags ignored: GR, YG, CU 1; OG, GG, GHC, GA 2 (RR §10.2)', () => {
    expect(BASE.filter((k) => S(k).flagIgnore === 1)).toEqual(['FR/GR', 'FR/YG', 'FR/CU', 'BR/GR']);
    expect(BASE.filter((k) => S(k).flagIgnore === 2)).toEqual(['FR/OG', 'FR/GHC', 'FR/GA', 'BR/GG', 'BR/GHC']);
  });
  it('every base melee row has movedPlus 0; SWI is an infantry code with rows in Expansion #1', () => {
    for (const k of BASE) { const m = S(k).melee; if (m.kind === 'blocks') expect(m.movedPlus).toBe(0); }
    expect(ARM_OF.SWI).toBe('infantry'); expect(isUnitKey('SP/SWI')).toBe(true); expect(isRowKey('SP/SWI')).toBe(true);
  });
  it('ML and RI score no sabre hits; only FR/CU ignores an infantry fire hit', () => {
    expect(BASE.filter((k) => !S(k).sabreHits)).toEqual(['FR/ML', 'BR/RI', 'PT/ML', 'AL/ML']);
    expect(BASE.filter((k) => S(k).ignoresInfantryFireHits)).toEqual(['FR/CU']);
  });
  it('moving fire rounds up for FR and BR rows, down for PT and AL rows (R5)', () => {
    for (const k of BASE) { const f = S(k).fire; if (f.kind === 'musket') expect(f.round).toBe(['PT', 'AL'].includes(k.slice(0, 2)) ? 'down' : 'up'); }
  });
  it('every row has the arm of its code, a name, and the base box', () => {
    for (const k of BASE) {
      expect(S(k).arm).toBe(ARM_OF[k.split('/')[1] as keyof typeof ARM_OF]);
      expect(S(k).expansion).toBe('base'); expect(S(k).name).not.toBe('');
    }
    expect(S('FR/LN').melee).toEqual({ kind: 'blocks', plus: 0, vsInfantry: 1, movedPlus: 0 });
    expect(S('BR/RI').fire).toEqual({ kind: 'musket', range: 3, standing: 1, moving: 1, round: 'up' });
    expect(S('FR/HA').battleAfterMoveMinBlocks).toBe(2); expect(S('BR/HA').battleAfterMoveMinBlocks).toBe(2);
    expect(S('FR/HA').tags).toEqual(['horseArtillery']); expect(S('FR/YG').tags).toEqual(['light', 'guard']);
  });
  it('terrain rows (RR §4.2)', () => {
    expect(TERRAIN_STATS.town.into.melee).toEqual({ infantry: -2, cavalry: -3, artillery: -1 });
    expect(TERRAIN_STATS.windmill.into).toEqual(TERRAIN_STATS.town.into); expect(TERRAIN_STATS.fortress.out).toEqual(TERRAIN_STATS.town.out);
    expect(TERRAIN_STATS.sandQuarry.into.fire.infantry).toBe(-1); expect(TERRAIN_STATS.sandQuarry.into.melee.infantry).toBe(0); // R71
    expect(TERRAIN_STATS.ford.out.fire).toEqual({ infantry: -1, cavalry: 0, artillery: -1 });
    expect(TERRAIN_STATS.fordNoStop.stopsOnEntry).toBe(false); expect(TERRAIN_STATS.brook.stopsOnEntry).toBe(true);
    expect(TERRAIN_STATS.brook.into.melee).toEqual({ infantry: 0, cavalry: 0, artillery: 0 });
    expect(TERRAIN_STATS.town.squareAllowed).toBe(false); expect(TERRAIN_STATS.ford.squareAllowed).toBe(true); // R69
    expect(WORKS.into.melee).toEqual({ infantry: -1, cavalry: -2, artillery: 0 }); expect(WORKS.flagIgnore.cavalry).toBe(0);
  });
  it('terrain flags: forest, rugged, river and sand quarry', () => {
    expect(TERRAIN_STATS.forest.noBattleAfterEntering).toBe('notLight'); expect(TERRAIN_STATS.town.noBattleAfterEntering).toBe('all');
    expect(TERRAIN_STATS.rugged.impassable).toBe(true); expect(TERRAIN_STATS.river.noMeleeInto).toBe(true);
    expect(TERRAIN_STATS.sandQuarry.closedTo).toEqual(['artillery']); expect(TERRAIN_STATS.hill.hill).toBe(true);
    expect(TERRAIN_STATS.town.cancelsCavalryCharge).toBe(true); expect(TERRAIN_STATS.forest.cancelsCavalryCharge).toBe(false);
  });
  it('the deck has 70 cards: 48 section, 22 tactic, with the RR §12 counts', () => {
    expect(CARD_LIST).toHaveLength(70);
    expect(CARD_LIST.filter((k) => CARD_DEFS[k].group === 'section')).toHaveLength(48);
    const count = (k: CardKind) => CARD_LIST.filter((x) => x === k).length;
    expect([count('probeL'), count('probeC'), count('probeR'), count('attackC'), count('scoutR'), count('assaultC')]).toEqual([4, 6, 4, 6, 2, 2]);
    expect([count('cavalryCharge'), count('elan'), count('firstStrike'), count('rally'), count('shortSupply'), count('coldSteel')]).toEqual([3, 1, 2, 1, 1, 1]);
    expect(mirrorKind('probeL')).toBe('probeR'); expect(mirrorKind('forward')).toBe('forward');
    expect(mirrorKind('assaultR')).toBe('assaultL'); expect(mirrorKind('elan')).toBe('elan');
  });
  it('card ids follow the CardKind union order', () => {
    expect(Object.keys(CARD_DEFS)).toHaveLength(29);
    expect(CARD_LIST[0]).toBe('scoutL'); expect(CARD_LIST[69]).toBe('shortSupply');
    for (const [k, d] of Object.entries(CARD_DEFS)) expect(d.kind).toBe(k);
  });
  it('card dice by arm and tag', () => {
    const cc = CARD_DEFS.cavalryCharge.mods.melee;
    expect([cardDice(cc, S('BR/HC')), cardDice(cc, S('BR/GHC')), cardDice(cc, S('BR/HA'))]).toEqual([1, 2, 0]);
    expect(cardDice(CARD_DEFS.bombard.mods.fire, S('FR/GA'))).toBe(3);
    expect(cardDice(CARD_DEFS.bayonetCharge.mods.melee, S('BR/GG'))).toBe(1); expect(cardDice(CARD_DEFS.bayonetCharge.mods.melee, S('BR/LN'))).toBe(0);
    expect(cardDice(null, S('BR/LN'))).toBe(0);
  });
});
