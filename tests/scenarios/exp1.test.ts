// Rules: RR §16 (design/rules-reference.md)
// The Spanish battles 101–118 (Expansion #1): setup against the manifest (design/exp1-survey.md §2.1), and each battle's own rules as data.
import { describe, expect, it } from 'vitest';
import { META } from '../../scripts/scenarios/meta';
import { EXP1_HIDDEN } from '../../scripts/scenarios/meta-exp1';
import { UNIT_STATS } from '../../src/engine/units';
import { scenarioById } from '../../src/scenarios';
import { catalogueEntry } from '../../src/scenarios/catalogue';
import { checksums, terrainTally } from './checksum';
import { game, H, hexesOf as terrainHexes, range, rc, SIDES, unitCounts } from './helpers';
import { MANIFEST_EXP1 } from './manifest-exp1';

const IDS = range(101, 118);

it('the manifest covers 101–118, and META the same ids', () => {
  expect(Object.keys(MANIFEST_EXP1)).toEqual(IDS);
  for (const id of IDS) expect(META[id], id).toBeDefined();
  expect(EXP1_HIDDEN).toBe(true);
});

for (const [id, m] of Object.entries(MANIFEST_EXP1)) {
  describe(id, () => {
    const info = scenarioById(id);
    const s = game(id);

    it('name, year, banners, first, sides and leaders match the manifest', () => {
      expect([info.name, info.year]).toEqual([m.name, m.year]);
      expect(info.name).toBe(catalogueEntry(id)!.name);
      expect([info.setup.banners, info.setup.first]).toEqual([m.banners, m.first]);
      for (const side of SIDES) {
        const { army, nation, commander, cards } = info.setup[side];
        expect({ army, nation, commander, cards }, side).toEqual(m.sides[side]);
        expect(s.leaders.filter((l) => l.side === side).map((l) => l.name), side).toEqual(m.leaders[side]);
      }
    });

    it('units per side and key match the survey (manifest)', () => {
      for (const side of SIDES) expect(unitCounts(s, side), side).toEqual(m.units[side]);
    });

    it('terrain tally and checksums match', () => {
      expect(terrainTally(s)).toEqual(m.terrain);
      expect(checksums(s)).toEqual(m.checksum);
    });

    it('is a hidden Expansion #1 battle until the screens are ready', () => {
      expect(info.expansion).toBe('exp1');
      expect(info.hidden).toBe(true);
    });
  });
}

describe('Expansion #1 rules as data (RR §16)', () => {
  it('every unit starts at its card strength (S41)', () => {
    for (const id of IDS) {
      for (const u of game(id).units) {
        expect(u.blocks, `${id} ${u.key} at ${rc(u.hex)}`).toBe(UNIT_STATS[u.key].blocks);
        expect(u.maxBlocks, `${id} ${u.key} at ${rc(u.hex)}`).toBe(UNIT_STATS[u.key].blocks);
      }
      expect(scenarioById(id).setup.unitOverrides, id).toBeUndefined();
    }
  });

  it('guerrilla counters per battle match S15', () => {
    const want: Record<string, number | undefined> = {};
    for (const id of IDS) want[id] = undefined;
    for (const id of ['103', '104', '105', '106', '107', '108', '109', '110', '111', '117', '118']) want[id] = 1;
    for (const id of ['101', '102', '112', '113', '115']) want[id] = 0;
    for (const id of IDS) {
      const g = (scenarioById(id).setup.sideRules ?? []).filter((r) => r.kind === 'guerrilla');
      if (want[id] === undefined) expect(g, id).toEqual([]);
      else expect(g, id).toEqual([{ kind: 'guerrilla', side: 'top', counters: want[id] }]);
    }
  });

  it('banners, hands, first player and water rule per battle (RR §16 table)', () => {
    const T: Record<string, [number, string, number, number, string | undefined]> = {
      '101': [7, 'bottom', 5, 5, 'fordable'], '102': [6, 'bottom', 4, 5, 'fordable'], '103': [6, 'bottom', 5, 6, 'fordable'],
      '104': [7, 'bottom', 5, 5, 'impassable'], '105': [7, 'bottom', 4, 6, undefined], '106': [6, 'top', 6, 5, 'impassable'],
      '107': [6, 'bottom', 5, 5, 'impassable'], '108': [6, 'top', 5, 5, undefined], '109': [6, 'bottom', 5, 5, 'brook'],
      '110': [8, 'bottom', 6, 6, 'fordable'], '111': [7, 'bottom', 5, 6, undefined], '112': [6, 'bottom', 4, 5, undefined],
      '113': [6, 'bottom', 4, 5, 'impassable'], '114': [7, 'bottom', 6, 5, 'impassable'], '115': [8, 'bottom', 5, 5, 'fordable'],
      '116': [9, 'top', 5, 4, 'impassable'], '117': [8, 'bottom', 5, 5, 'fordable'], '118': [6, 'bottom', 5, 6, 'impassable'],
    };
    for (const id of IDS) {
      const st = scenarioById(id).setup;
      expect([st.banners, st.first, st.top.cards, st.bottom.cards, st.rivers], id).toEqual(T[id]);
      expect(st.bottom.army, id).toBe('French');
      expect(st.bottom.nation, id).toBe('FR');
    }
  });

  it('armies, nations and commanders of the Allied side (plan Decisions table)', () => {
    const want: Record<string, [string, string, string]> = {
      '101': ['Spanish', 'SP', 'Castaños'], '102': ['Spanish', 'SP', 'Blake'], '103': ['Spanish', 'SP', 'Belveder'],
      '104': ['Spanish', 'SP', 'Blake'], '105': ['Spanish', 'SP', 'San Juan'], '106': ['Spanish', 'SP', 'Cuesta'],
      '107': ['Spanish', 'SP', 'Blake'], '108': ['Spanish', 'SP', 'Blake'], '109': ['Anglo-Spanish', 'SP', 'Cuesta'],
      '110': ['Spanish', 'SP', 'Del Parque'], '111': ['Spanish', 'SP', 'Freire'], '112': ['Spanish', 'SP', 'Areizaga'],
      '113': ['Spanish', 'SP', 'Del Parque'], '114': ['Anglo-Spanish', 'BR', 'Graham'], '115': ['Allied', 'BR', 'Beresford'],
      '116': ['Allied', 'BR', 'Wellington'], '117': ['Spanish', 'SP', 'Freire'], '118': ['Anglo-Spanish', 'BR', 'Adam'],
    };
    const fr: Record<string, string> = {
      '101': 'Dupont', '102': 'Lefebvre', '103': 'Soult', '104': 'Victor', '105': 'Napoleon', '106': 'Victor', '107': 'Suchet',
      '108': 'Suchet', '109': 'Victor', '110': 'Marchand', '111': 'Milhaud', '112': 'Soult', '113': 'Kellermann', '114': 'Victor',
      '115': 'Soult', '116': 'King Joseph', '117': 'Soult', '118': 'Suchet',
    };
    for (const id of IDS) {
      const st = scenarioById(id).setup;
      expect([st.top.army, st.top.nation, st.top.commander], id).toEqual(want[id]);
      expect(st.bottom.commander, id).toBe(fr[id]);
    }
  });

  it('objectives and side rules are each battle’s own (RR §16)', () => {
    const sc = (id: string) => scenarioById(id).setup;
    const none = ['101', '103', '104', '106', '107', '108', '109', '110', '111', '112', '116', '118'];
    for (const id of none) expect(sc(id).objectives ?? [], id).toEqual([]);
    expect(sc('102').objectives).toEqual([{ kind: 'exitEdge', side: 'top', row: 0, free: 3, banners: 1, text: 'Spanish {unit} leaves by the Spanish baseline.' }]);
    expect(sc('105').objectives).toEqual([{ kind: 'suddenDeath', side: 'bottom', keys: ['SP/FA'], text: 'Every Spanish battery is lost.' }]);
    expect(sc('113').objectives).toEqual([{ kind: 'tempHex', side: 'bottom', hex: [0, 6], timing: 'turnStart', banners: 1, text: 'The French hold the Tormes bridge.' }]);
    expect(sc('115').objectives).toEqual([{ kind: 'tempAny', side: 'bottom', hexes: [[4, 9], [4, 10]], timing: 'turnStart', banners: 1, text: 'The French hold Albuera.' }]);
    const ridge: [number, number][] = [[2, 3], [3, 1], [3, 2], [3, 3], [4, 2], [4, 3], [4, 4], [5, 2], [5, 3], [5, 4], [6, 3]];
    expect(sc('114').objectives).toEqual([
      { kind: 'majority', side: 'top', hexes: ridge, banners: 1, startHeld: true, text: 'The Anglo-Spanish hold Barrosa Ridge.' },
      { kind: 'majority', side: 'bottom', hexes: ridge, banners: 1, text: 'The French hold Barrosa Ridge.' },
    ]);
    const groups: Record<string, [number, number][]> = {
      left: [[1, 1], [2, 1], [2, 2], [3, 0], [3, 2], [4, 0]],
      centre: [[1, 6], [1, 7], [2, 4], [2, 5], [2, 6], [2, 8], [3, 6]],
      right: [[1, 10], [2, 11], [3, 9], [3, 10], [3, 11], [4, 12]],
    };
    expect(sc('117').objectives).toEqual(Object.entries(groups).flatMap(([name, hexes]) => [
      { kind: 'majority', side: 'top', hexes, banners: 1, startHeld: true, text: `The Spanish hold the ${name} hills.` },
      { kind: 'majority', side: 'bottom', hexes, banners: 1, text: `The French hold the ${name} hills.` },
    ]));

    expect(sc('101').sideRules).toEqual([{ kind: 'guerrilla', side: 'top', counters: 0 }, { kind: 'breakOnLosses', side: 'bottom', keys: ['FR/SWI'], losses: 2 }]);
    expect(sc('106').sideRules).toEqual([{ kind: 'guerrilla', side: 'top', counters: 1 }, { kind: 'handShrink', side: 'top', floor: 3 }, { kind: 'squareCap', side: 'top', units: 2 }]);
    expect(sc('115').sideRules).toEqual([{ kind: 'guerrilla', side: 'top', counters: 0 }, { kind: 'cavalryChargeFolly', side: 'top' }]);
    for (const id of IDS.filter((i) => !['101', '106', '115', '114', '116'].includes(i))) expect(sc(id).sideRules?.length, id).toBe(1);
    for (const id of ['114', '116']) expect(sc(id).sideRules ?? [], id).toEqual([]);
    expect(sc('116').moveFirst).toBe('reveal');
    for (const id of IDS.filter((i) => i !== '116')) expect(sc(id).moveFirst, id).toBeUndefined();
  });

  it('104: the Trueba is impassable and the Shallow Stream fordable (S24)', () => {
    const s = game('104');
    expect(terrainHexes(s, 'river')).toEqual(['0,1', '0,2', '0,3', '0,4', '1,0', '2,0']);
    expect(terrainHexes(s, 'ford')).toEqual(['5,10', '6,11', '7,11', '8,12']);
  });

  it('115: exactly (5,0), (5,1), (5,3), (6,4) are fords that do not stop; the bridge is (5,9) (S42)', () => {
    const s = game('115');
    expect(terrainHexes(s, 'fordNoStop')).toEqual(['5,0', '5,1', '5,3', '6,4']);
    expect(terrainHexes(s, 'bridge')).toEqual(['5,9']);
    expect(s.terrain[H(5, 9)]).toBe('bridge');
    expect(terrainHexes(s, 'ford')).toEqual(['3,11', '4,11', '5,10', '5,2', '5,5', '5,6', '5,7', '5,8', '6,5']);
  });

  it('works hexes and sides (105, 109, 118) and bridges', () => {
    expect(terrainTally(game('105')).works).toEqual({ hexes: 1, sides: 4 });
    expect(terrainTally(game('109')).works).toEqual({ hexes: 2, sides: 6 });
    expect(terrainTally(game('118')).works).toEqual({ hexes: 3, sides: 9 });
    for (const id of IDS) expect(terrainHexes(game(id), 'walledFarm'), id).toEqual([]);
  });
});
