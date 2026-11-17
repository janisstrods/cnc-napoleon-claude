// The base battles 001–015 (RR §14): setup against the manifest (design/survey.md), and each battle's own special rules as data.
import { describe, expect, it } from 'vitest';
import { META } from '../../scripts/scenarios/meta';
import { scenarioById } from '../../src/scenarios';
import { catalogueEntry } from '../../src/scenarios/catalogue';
import { checksums, terrainTally } from './checksum';
import { game, H, range, rc, SIDES, unitCounts } from './helpers';
import { MANIFEST } from './manifest';

type Obj = [string, string, string[]];
const hexesOf = (o: { hex?: number; hexes?: number[] }): string[] => (o.hexes ?? [o.hex!]).map(rc);
const OBJECTIVES: Record<string, Obj[]> = {
  '001': [['tempHex', 'top', ['8,2']], ['tempHex', 'top', ['8,11']]],
  '003': [['tempGroup', 'bottom', ['1,3', '1,4']]],
  '006': [['exit', 'top', ['0,4']]],
  '013': [['tempHex', 'top', ['7,0']], ['tempHex', 'top', ['8,11']]],
  '014': [['tempHex', 'bottom', ['1,5']]],
  '015': [['tempHex', 'bottom', ['3,5']], ['tempHex', 'bottom', ['4,1']], ['tempHex', 'bottom', ['4,12']]],
};

it('the manifest covers 001–015, and META the same ids', () => {
  const ids = range(1, 15).map((i) => i.padStart(3, '0'));
  expect(Object.keys(MANIFEST)).toEqual(ids);
  for (const id of ids) expect(META[id], id).toBeDefined();
});

for (const [id, m] of Object.entries(MANIFEST)) {
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

    it('is a visible base battle', () => {
      expect(info.hidden).toBeUndefined();
      expect(info.expansion).toBe('base');
    });
  });
}

describe('special rules as data (RR §14)', () => {
  it('objectives and side rules are the battle’s own', () => {
    for (const id of Object.keys(MANIFEST)) {
      const obj = game(id).scenario.objectives as unknown as { kind: string; side: string; hex?: number; hexes?: number[] }[];
      const plain = obj.filter((o) => o.kind !== 'killWeight').map((o): Obj => [o.kind, o.side, hexesOf(o)]);
      expect(plain, id).toEqual(OBJECTIVES[id] ?? []);
      if (id !== '012') expect(obj.some((o) => o.kind === 'killWeight'), id).toBe(false);
    }
    const sc = (id: string) => scenarioById(id).setup;
    expect(sc('003').objectives).toMatchObject([{ kind: 'tempGroup', banners: 2 }]);
    expect(sc('006').objectives).toMatchObject([{ kind: 'exit', banners: 1, leadersScore: false, retreatOff: false }]);
    expect(sc('012').objectives).toEqual([{ kind: 'killWeight', side: 'top', enemyArm: 'infantry', first: 1, later: 2 }]);
    for (const id of ['001', '013', '014', '015']) for (const o of sc(id).objectives!) expect(o, id).toMatchObject({ timing: 'turnStart', banners: 1 });
    expect(sc('006').sideRules).toEqual([{ kind: 'flagIgnoreOn', side: 'top', terrain: 'fortress', flags: 1 }]);
    expect(sc('015').sideRules).toEqual([{ kind: 'impetuousCavalry', side: 'top', keys: ['BR/LC', 'BR/HC', 'BR/GHC'] }]);
    for (const id of Object.keys(MANIFEST)) if (id !== '006' && id !== '015') expect(sc(id).sideRules ?? [], id).toEqual([]);
    for (const id of Object.keys(MANIFEST)) expect(sc(id).unitOverrides, id).toBeUndefined();
  });

  it('012 starts two French squares: 2 cards on the track, 4 in hand (§14.12, R85)', () => {
    for (let seed = 1; seed <= 5; seed++) {
      const s = game('012', seed);
      const b = s.players.bottom;
      expect(b.hand.length, `seed ${seed}`).toBe(4);
      expect(b.squareTrack.map((c) => c !== null), `seed ${seed}`).toEqual([true, true, false, false]);
      expect(b.cards).toBe(6);
      const sq = s.units.filter((u) => u.square).map((u) => [u.key, rc(u.hex), u.square]);
      expect(sq).toEqual([['FR/LT', '3,8', 1], ['FR/LT', '3,9', 2]]);
      const all = [...s.deck, ...s.players.top.hand, ...b.hand, ...b.squareTrack.filter((c) => c !== null)] as unknown as (string | number)[];
      expect(all.length).toBe(70);
      expect(new Set(all.map((c) => JSON.stringify(c))).size).toBe(70);
    }
  });

  it('rivers become their rows (§14, R47, R83)', () => {
    expect(game('005').terrain.filter((t) => t === 'brook')).toHaveLength(14);
    expect(game('006').terrain[H(0, 4)]).toBe('bridge');
    expect(MANIFEST['006'].terrain.types.river).toBe(5);
    expect(MANIFEST['011'].terrain.types.fordNoStop).toBe(12);
    const s13 = game('013');
    expect(s13.terrain[H(2, 8)]).toBe('fordNoStop');
    expect(s13.terrain[H(3, 1)]).toBe('bridge'); expect(s13.terrain[H(3, 10)]).toBe('bridge');
    expect(MANIFEST['013'].terrain.types).toMatchObject({ ford: 11, fordNoStop: 1 });
  });
});
