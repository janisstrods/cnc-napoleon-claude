// Rules: RR §1, §4.1, §14, §14.12–§14.13 (design/rules-reference.md)
// Scenario data is validated when a game is built: unknown ids and impossible positions throw, and the error names the
// scenario. Setup also builds the board, the deck and the hands.
import { describe, expect, it } from 'vitest';
import { hexId } from '../../src/engine/hex';
import { UNIT_STATS, statsOf } from '../../src/engine/units';
import {
  boardFromTerrain, cloneState, createGame, newTurn,
  type ObjectiveSetup, type RiverRule, type ScenarioSetup, type SideRuleSetup, type TerrainSetup, type UnitSetup,
} from '../../src/engine/setup';
import { SCENARIOS } from '../../src/scenarios';

const base: ScenarioSetup = {
  id: 'test', name: 'Test',
  top: { army: 'British', nation: 'BR', commander: 'Hill', cards: 5 },
  bottom: { army: 'French', nation: 'FR', commander: 'Reynier', cards: 5 },
  first: 'bottom', banners: 4, terrain: [],
  units: [{ side: 'top', key: 'BR/LN', r: 2, c: 6 }, { side: 'bottom', key: 'FR/LN', r: 6, c: 6 }],
  leaders: [{ side: 'bottom', name: 'Reynier', r: 6, c: 6 }],
};
const withTerrain = (terrain: TerrainSetup[], extra: Partial<ScenarioSetup> = {}): ScenarioSetup => ({ ...base, terrain, ...extra });
const withUnits = (units: UnitSetup[], extra: Partial<ScenarioSetup> = {}): ScenarioSetup => ({ ...base, units, leaders: [], ...extra });
const withObjectives = (objectives: unknown[]): ScenarioSetup => ({ ...base, objectives: objectives as ObjectiveSetup[] });
const withSideRules = (sideRules: unknown[]): ScenarioSetup => ({ ...base, sideRules: sideRules as SideRuleSetup[] });
const fails = (st: ScenarioSetup, re: RegExp = /\(test\)$/) => expect(() => createGame(st, 1)).toThrow(re);

describe('setup builds the board', () => {
  it('the reference position and every shipped scenario build', () => {
    expect(() => createGame(base, 1)).not.toThrow();
    expect(SCENARIOS.map((sc) => sc.id)).toEqual(['000', ...Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(3, '0')), ...Array.from({ length: 18 }, (_, i) => String(101 + i))]);
    for (const sc of SCENARIOS) expect(() => createGame(sc.setup, 1), sc.id).not.toThrow();
  });
  it('rivers: each rule and crossing becomes its terrain row (RR §14)', () => {
    const board = (rule: RiverRule | undefined) => {
      const s = createGame(withTerrain([
        { r: 4, c: 0, t: 'river' }, { r: 4, c: 1, t: 'river', crossing: 'ford' }, { r: 4, c: 2, t: 'river', crossing: 'bridge' },
      ], rule ? { rivers: rule } : {}), 1);
      return { river: s.terrain[hexId(4, 0)], ford: s.terrain[hexId(4, 1)], bridge: s.terrain[hexId(4, 2)] };
    };
    expect(board('fordable')).toEqual({ river: 'ford', ford: 'fordNoStop', bridge: 'bridge' });
    expect(board('impassable')).toEqual({ river: 'river', ford: 'ford', bridge: 'bridge' });
    expect(board('fordableNoStop')).toEqual({ river: 'fordNoStop', ford: 'fordNoStop', bridge: 'bridge' });
    expect(board('brook')).toEqual({ river: 'brook', ford: 'brook', bridge: 'bridge' });
    expect(board(undefined).river).toBe('river');
  });
  it('the board is plain on board hexes and void off them', () => {
    const s = createGame(base, 1);
    expect(s.terrain).toHaveLength(9 * 13);
    expect(s.terrain[hexId(0, 0)]).toBe('plain'); expect(s.terrain[hexId(1, 12)]).toBe('void');
  });
  it('field works: base terrain from `on`, sides as a mask', () => {
    const s = createGame(withTerrain([{ r: 2, c: 0, t: 'fieldworks', on: 'hill', sides: ['SW', 'SE', 'E'] }]), 1);
    expect(s.terrain[hexId(2, 0)]).toBe('hill'); expect(s.works[hexId(2, 0)]).toBe((1 << 4) | (1 << 5) | (1 << 0));
    expect(boardFromTerrain([{ r: 2, c: 0, t: 'fieldworks', on: 'plain', sides: ['W'] }], 'impassable').works[hexId(2, 0)]).toBe(1 << 3);
  });
  it('a works side facing off the board is allowed (005)', () => {
    expect(() => createGame(withTerrain([{ r: 0, c: 3, t: 'fieldworks', on: 'plain', sides: ['NE', 'NW'] }]), 1)).not.toThrow();
  });
});

describe('setup deals the cards and places the pieces', () => {
  it('ids: units u1…un in data order, then leaders continue the counter', () => {
    const s = createGame(base, 1);
    expect(s.units.map((u) => u.id)).toEqual(['u1', 'u2']); expect(s.leaders.map((l) => l.id)).toEqual(['L3']);
    expect(s.scenario.leadersAtStart).toEqual({ top: 0, bottom: 1 });
  });
  it('the deck holds the 70 cards once; hands are dealt from it; the turn is the first one', () => {
    const s = createGame(base, 3);
    expect(s.players.top.hand).toHaveLength(5); expect(s.players.bottom.hand).toHaveLength(5);
    expect(new Set([...s.deck, ...s.players.top.hand, ...s.players.bottom.hand]).size).toBe(70);
    expect(s.deck).toHaveLength(60); expect(s.active).toBe('bottom'); expect(s.turn).toEqual(newTurn(1));
    expect(s.lastCard).toEqual({ top: null, bottom: null }); expect(s.players.top.squareTrack).toEqual([null, null, null, null]);
    expect(createGame(base, 3).deck).toEqual(s.deck); expect(createGame(base, 4).deck).not.toEqual(s.deck);
  });
  it('squares at setup take random cards onto the track (R85)', () => {
    const s = createGame(withUnits([{ side: 'bottom', key: 'FR/LT', r: 3, c: 8, square: 1 }, { side: 'bottom', key: 'FR/LT', r: 3, c: 9, square: 2 }],
      { bottom: { ...base.bottom, cards: 6 } }), 7);
    expect(s.players.bottom.hand).toHaveLength(4); expect(s.players.bottom.squareTrack.filter((c) => c !== null)).toHaveLength(2);
    expect(s.units.map((u) => u.square)).toEqual([1, 2]);
    expect(new Set([...s.deck, ...s.players.top.hand, ...s.players.bottom.hand, ...s.players.bottom.squareTrack.filter((c) => c !== null)]).size).toBe(70);
  });
  it('a starting strength below the row sets blocks and maxBlocks; resources start empty', () => {
    const s = createGame({ ...base, units: [{ side: 'top', key: 'BR/LN', r: 1, c: 1, blocks: 2 }] }, 1);
    expect([s.units[0].blocks, s.units[0].maxBlocks]).toEqual([2, 2]); expect(s.players.top.resources).toEqual({});
    expect(() => createGame({ ...base, units: [{ side: 'top', key: 'BR/LN', r: 1, c: 1, blocks: 5 }] }, 1)).toThrow(/\(test\)$/);
  });
  it('no nation check: a French unit may stand with the British side', () => {
    expect(() => createGame({ ...base, units: [{ side: 'top', key: 'FR/LN', r: 1, c: 1 }] }, 1)).not.toThrow();   // base.top.nation is 'BR'
  });
  it('unit overrides change the row for that key only', () => {
    const s = createGame({ ...base, units: [{ side: 'top', key: 'AL/LN', r: 1, c: 1 }], unitOverrides: [{ key: 'AL/LN', set: { retreat: { first: 1, then: 1 } } }] }, 1);
    expect(statsOf(s, s.units[0]).retreat.first).toBe(1); expect(UNIT_STATS['AL/LN'].retreat.first).toBe(2);
    expect(statsOf(s, { key: 'FR/LN' })).toBe(UNIT_STATS['FR/LN']);
  });
  it('objectives resolve with their defaults', () => {
    const s = createGame(withObjectives([
      { kind: 'tempHex', side: 'top', hex: [2, 3] },
      { kind: 'tempGroup', side: 'bottom', hexes: [[6, 1], [6, 2]], banners: 2 },
      { kind: 'exit', side: 'bottom', hex: [0, 4] },
      { kind: 'killWeight', side: 'top', enemyArm: 'artillery', first: 2, later: 1 },
    ]), 1);
    expect(s.scenario.objectives).toEqual([
      { kind: 'tempHex', side: 'top', hex: hexId(2, 3), timing: 'turnStart', banners: 1, text: 'British holds an objective.' },
      { kind: 'tempGroup', side: 'bottom', hexes: [hexId(6, 1), hexId(6, 2)], timing: 'turnStart', banners: 2, text: 'French holds the objective group.' },
      { kind: 'exit', side: 'bottom', hex: hexId(0, 4), banners: 1, leadersScore: false, retreatOff: false, text: 'French {unit} exits the battlefield.' },
      { kind: 'killWeight', side: 'top', enemyArm: 'artillery', first: 2, later: 1 },
    ]);
    expect(s.special.objState).toEqual([{ held: false, count: 0 }, { held: false, count: 0 }, { held: false, count: 0 }, { held: false, count: 0 }]);
  });
  it('cloneState copies the track, resources, First Strikes and retreat ends, and shares the board and scenario', () => {
    const s = createGame(withUnits([{ side: 'bottom', key: 'FR/LT', r: 3, c: 8, square: 1 }]), 5);
    const c = cloneState(s);
    expect(c).toEqual(s); expect(c.terrain).toBe(s.terrain); expect(c.works).toBe(s.works); expect(c.scenario).toBe(s.scenario);
    expect(c.players.bottom.squareTrack).not.toBe(s.players.bottom.squareTrack); expect(c.players.top.resources).not.toBe(s.players.top.resources);
    expect(c.turn.firstStrikes).not.toBe(s.turn.firstStrikes); expect(c.turn.retreatEnds).not.toBe(s.turn.retreatEnds);
    c.players.bottom.squareTrack[1] = 9; c.turn.retreatEnds.push(1); c.units[0].hex = 0;
    expect(s.players.bottom.squareTrack[1]).toBeNull(); expect(s.turn.retreatEnds).toEqual([]); expect(s.units[0].hex).not.toBe(0);
  });
});

describe('setup rejects impossible data and names the scenario', () => {
  it('a unit on a river hex', () => fails(withUnits([{ side: 'top', key: 'BR/LN', r: 4, c: 0 }], { terrain: [{ r: 4, c: 0, t: 'river' }] }), /impassable.*\(test\)$/));
  it('artillery on a sand quarry', () => fails(withUnits([{ side: 'top', key: 'BR/FA', r: 4, c: 0 }], { terrain: [{ r: 4, c: 0, t: 'sandQuarry' }] }), /sandQuarry.*impassable to artillery.*\(test\)$/));
  it('infantry on a sand quarry is fine', () => expect(() => createGame(withUnits([{ side: 'top', key: 'BR/LN', r: 4, c: 0 }], { terrain: [{ r: 4, c: 0, t: 'sandQuarry' }] }), 1)).not.toThrow());
  it('an unknown unit key', () => fails(withUnits([{ side: 'top', key: 'BR/XX' as never, r: 1, c: 1 }]), /unknown unit key.*\(test\)$/));
  it('a unit key with no row', () => fails(withUnits([{ side: 'top', key: 'PT/GR' as never, r: 1, c: 1 }]), /unknown unit key PT\/GR.*\(test\)$/));
  it('a unit off the board', () => fails(withUnits([{ side: 'top', key: 'BR/LN', r: 1, c: 12 }]), /off the board.*\(test\)$/));
  it('a leader off the board', () => fails({ ...base, leaders: [{ side: 'top', name: 'X', r: 9, c: 0 }] }, /off the board.*\(test\)$/));
  it('two units on one hex', () => fails(withUnits([{ side: 'top', key: 'BR/LN', r: 1, c: 1 }, { side: 'top', key: 'BR/LT', r: 1, c: 1 }]), /two units.*\(test\)$/));
  it('two leaders on one hex', () => fails({ ...base, leaders: [{ side: 'bottom', name: 'A', r: 6, c: 6 }, { side: 'bottom', name: 'B', r: 6, c: 6 }] }, /two leaders.*\(test\)$/));
  it('a leader on an enemy unit', () => fails({ ...base, leaders: [{ side: 'top', name: 'A', r: 6, c: 6 }] }, /enemy unit.*\(test\)$/));
  it('a leader on a river hex', () => fails({ ...base, terrain: [{ r: 5, c: 5, t: 'river' }], leaders: [{ side: 'top', name: 'A', r: 5, c: 5 }] }, /leader A.*impassable.*\(test\)$/));
  it('square on a non-infantry unit', () => fails(withUnits([{ side: 'top', key: 'BR/HC', r: 1, c: 1, square: 1 }]), /not infantry.*\(test\)$/));
  it('a square slot used twice by one side', () => fails(withUnits([{ side: 'top', key: 'BR/LN', r: 1, c: 1, square: 2 }, { side: 'top', key: 'BR/LT', r: 1, c: 2, square: 2 }]), /used twice.*\(test\)$/));
  it('the same square slot for the two sides is fine', () => expect(() => createGame(withUnits([{ side: 'top', key: 'BR/LN', r: 1, c: 1, square: 2 }, { side: 'bottom', key: 'FR/LN', r: 5, c: 1, square: 2 }]), 1)).not.toThrow());
  it('fieldworks without `on`', () => fails(withTerrain([{ r: 2, c: 0, t: 'fieldworks', sides: ['E'] }]), /needs on.*\(test\)$/));
  it('fieldworks without sides', () => fails(withTerrain([{ r: 2, c: 0, t: 'fieldworks', on: 'plain' }]), /at least one works side.*\(test\)$/));
  it('fieldworks with an empty side list', () => fails(withTerrain([{ r: 2, c: 0, t: 'fieldworks', on: 'plain', sides: [] }]), /at least one works side.*\(test\)$/));
  it('an unknown HexDir', () => fails(withTerrain([{ r: 2, c: 0, t: 'fieldworks', on: 'plain', sides: ['UP' as never] }]), /unknown side.*\(test\)$/));
  it('an unknown rivers rule', () => fails(withTerrain([], { rivers: 'swimmable' as never }), /rivers.*\(test\)$/));
  it('a crossing on a non-river hex', () => fails(withTerrain([{ r: 2, c: 0, t: 'hill', crossing: 'bridge' }]), /crossing on hill.*\(test\)$/));
  it('a terrain entry off the board', () => fails(withTerrain([{ r: 1, c: 12, t: 'hill' }]), /off the board.*\(test\)$/));
  it('an unknown terrain name', () => fails(withTerrain([{ r: 1, c: 1, t: 'swamp' as never }]), /unknown terrain swamp.*\(test\)$/));
  it('objective hexes off the board', () => fails(withObjectives([{ kind: 'tempHex', side: 'top', hex: [1, 12] }]), /off the board.*\(test\)$/));
  it('a tempGroup with fewer than 2 hexes', () => fails(withObjectives([{ kind: 'tempGroup', side: 'top', hexes: [[2, 2]], banners: 1 }]), /at least 2 hexes.*\(test\)$/));
  it('an exit hex not on row 0 or 8', () => fails(withObjectives([{ kind: 'exit', side: 'top', hex: [4, 4] }]), /row 0 or 8.*\(test\)$/));
  it('an exit hex on row 8 is fine', () => expect(() => createGame(withObjectives([{ kind: 'exit', side: 'top', hex: [8, 4] }]), 1)).not.toThrow());
  it('killWeight with an enemyArm that is no Arm', () => fails(withObjectives([{ kind: 'killWeight', side: 'top', enemyArm: 'navy', first: 1, later: 1 }]), /not an arm.*\(test\)$/));
  it('an objective with an unknown side', () => fails(withObjectives([{ kind: 'tempHex', side: 'left', hex: [2, 2] }]), /unknown side left.*\(test\)$/));
  it('a side rule with a side that is not a Side', () => fails(withSideRules([{ kind: 'flagIgnoreOn', side: 'middle', terrain: 'fortress', flags: 1 }]), /unknown side middle.*\(test\)$/));
  it('an impetuousCavalry key that is not a cavalry row', () => fails(withSideRules([{ kind: 'impetuousCavalry', side: 'top', keys: ['BR/LN'] }]), /not a cavalry row.*\(test\)$/));
  it('an impetuousCavalry key with no row', () => fails(withSideRules([{ kind: 'impetuousCavalry', side: 'top', keys: ['PT/GR'] }]), /unknown unit key PT\/GR.*\(test\)$/));
  it('an impetuousCavalry cavalry row is fine', () => expect(() => createGame(withSideRules([{ kind: 'impetuousCavalry', side: 'top', keys: ['BR/HC', 'BR/LC'] }]), 1)).not.toThrow());
  it('a flagIgnoreOn side rule resolves', () => expect(createGame(withSideRules([{ kind: 'flagIgnoreOn', side: 'top', terrain: 'fortress', flags: 1 }]), 1).scenario.sideRules).toEqual([{ kind: 'flagIgnoreOn', side: 'top', terrain: 'fortress', flags: 1 }]));
  it('an override of an unknown key', () => fails({ ...base, unitOverrides: [{ key: 'PT/GR' as never, set: { blocks: 3 } }] }, /unitOverrides: unknown unit key.*\(test\)$/));
  it('blocks below 1', () => fails({ ...base, units: [{ side: 'top', key: 'BR/LN', r: 1, c: 1, blocks: 0 }] }, /blocks 0 is outside 1\.\.4.*\(test\)$/));
  it('blocks above the row', () => fails({ ...base, units: [{ side: 'top', key: 'BR/FA', r: 1, c: 1, blocks: 4 }] }, /blocks 4 is outside 1\.\.3.*\(test\)$/));
  it('cards below 1', () => fails({ ...base, top: { ...base.top, cards: 0 } }, /whole number of cards.*\(test\)$/));
  it('banners below 1', () => fails({ ...base, banners: 0 }, /banners must be at least 1.*\(test\)$/));
  it('cards that are not a whole number', () => fails({ ...base, top: { ...base.top, cards: 2.5 } }, /whole number of cards.*\(test\)$/));
  it('squares as many as the cards leave no card in hand', () =>
    fails(withUnits([{ side: 'top', key: 'BR/LN', r: 1, c: 1, square: 1 }, { side: 'top', key: 'BR/LT', r: 1, c: 2, square: 2 }], { top: { ...base.top, cards: 2 } }), /2 squares with only 2 cards.*\(test\)$/));
  it('one square less than the cards is fine', () =>
    expect(() => createGame(withUnits([{ side: 'top', key: 'BR/LN', r: 1, c: 1, square: 1 }, { side: 'top', key: 'BR/LT', r: 1, c: 2, square: 2 }], { top: { ...base.top, cards: 3 } }), 1)).not.toThrow());
  it('an unknown first side', () => fails({ ...base, first: 'middle' as never }, /unknown first side middle.*\(test\)$/));
  it('a square slot outside 1..4', () => fails(withUnits([{ side: 'top', key: 'BR/LN', r: 1, c: 1, square: 5 as never }]), /square slot 5 is not 1\.\.4.*\(test\)$/));
  it('a starting square on a hex where squares are not allowed (RR §9.5)', () => {
    fails(withUnits([{ side: 'top', key: 'BR/LN', r: 2, c: 9, square: 1 }], { terrain: [{ r: 2, c: 9, t: 'town' }] }), /cannot start in square on town.*\(test\)$/);
    expect(() => createGame(withUnits([{ side: 'top', key: 'BR/LN', r: 2, c: 9, square: 1 }], { terrain: [{ r: 2, c: 9, t: 'forest' }] }), 1)).not.toThrow();
  });
  it('a tempGroup whose banners is not a number', () => fails(withObjectives([{ kind: 'tempGroup', side: 'top', hexes: [[2, 2], [2, 3]], banners: '2' }]), /banners.*not a number.*\(test\)$/));
  it('a killWeight whose first or later is not a number', () => fails(withObjectives([{ kind: 'killWeight', side: 'top', enemyArm: 'cavalry', first: 1, later: undefined }]), /first and later must be numbers.*\(test\)$/));
  it('repeated overrides of one key merge', () => {
    const s = createGame({ ...base, units: [{ side: 'top', key: 'AL/LN', r: 1, c: 1 }], unitOverrides: [{ key: 'AL/LN', set: { blocks: 3 } }, { key: 'AL/LN', set: { flagIgnore: 1 } }] }, 1);
    expect([statsOf(s, s.units[0]).blocks, statsOf(s, s.units[0]).flagIgnore]).toEqual([3, 1]);
  });
  it('leaders are counted once per side', () => expect(createGame({ ...base, leaders: [{ side: 'top', name: 'A', r: 2, c: 6 }, { side: 'top', name: 'B', r: 3, c: 3 }, { side: 'bottom', name: 'C', r: 6, c: 6 }] }, 1).scenario.leadersAtStart).toEqual({ top: 2, bottom: 1 }));
  it('the original error stays as the cause', () => {
    try { createGame({ ...base, banners: 0 }, 1); expect.unreachable(); } catch (e) { expect((e as Error).cause).toBeInstanceOf(Error); }
  });
});
