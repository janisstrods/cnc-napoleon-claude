import { describe, expect, it } from 'vitest';
import { convertBattle, formatScenario, unsupportedFeatures, type BattleMeta, type RawBattle } from '../../scripts/scenarios/convert';
import { catalogueEntry } from '../../src/scenarios/catalogue';

const files = import.meta.glob<RawBattle>('../../design/data/*.json', { eager: true, import: 'default' });
const RAW: Record<string, RawBattle> = {};
for (const [p, j] of Object.entries(files)) RAW[/(\d+)\.json$/.exec(p)![1]] = j;

const meta = (over: Partial<BattleMeta> = {}): BattleMeta => ({
  top: { army: 'Anglo-Portuguese', nation: 'BR', commander: 'Wellesley', cards: 6 },
  bottom: { army: 'French', nation: 'FR', commander: 'Delaborde', cards: 5 },
  first: 'top', banners: 5, rivers: 'none', leaderNames: { '(unnamed)': 'Brennier' }, ...over,
});
const e = (id: string) => catalogueEntry(id)!;
const synth = (over: Partial<RawBattle> & Record<string, unknown> = {}): RawBattle => ({
  id: '002', terrain: [], units: [{ r: 2, c: 2, side: 'top', key: 'BR/LN' }, { r: 6, c: 2, side: 'bottom', key: 'FR/LN' }],
  leaders: [{ r: 2, c: 2, side: 'top', name: 'A' }, { r: 6, c: 2, side: 'bottom', name: 'B' }], objectives: [], ...over,
});

describe('convertBattle', () => {
  it('keeps terrain, units and leaders in file order and drops grid, notes, riverPieces, objective notes and art', () => {
    const j = convertBattle(RAW['002'], meta(), e('002'));
    expect(j.units.map((u) => [u.r, u.c, u.key])).toEqual(RAW['002'].units.map((u) => [u.r, u.c, u.key]));
    expect(Object.keys(j)).toEqual(['id', 'name', 'year', 'top', 'bottom', 'first', 'banners', 'terrain', 'units', 'leaders']);
    expect(j.terrain.some((t) => 'art' in t)).toBe(false);
  });

  it('name and year come from the catalogue; a 1xx id gets expansion exp1', () => {
    const j = convertBattle(RAW['002'], meta(), e('002'));
    expect(j.name).toBe('Roliça (French Second Position)');
    expect(j.year).toBe('1808');
    expect('expansion' in j).toBe(false);
    const x = convertBattle(synth({ id: '199' }), meta(), { id: '199', name: 'Test', date: '1 May 1811', box: 'exp1' });
    expect(x.expansion).toBe('exp1');
    expect(x.year).toBe('1811');
  });

  it('renames leaders by leaderNames; a bracketed name left unrenamed throws', () => {
    const j = convertBattle(RAW['002'], meta(), e('002'));
    expect(j.leaders.filter((l) => l.side === 'bottom').map((l) => l.name)).toEqual(['Delaborde', 'Brennier']);
    expect(() => convertBattle(RAW['002'], meta({ leaderNames: undefined }), e('002'))).toThrow(/leader name "\(unnamed\)".*\(002\)/);
  });

  it('squares attach to the unit on the hex; a square on an empty hex throws', () => {
    const squares = [{ r: 3, c: 8, slot: 1 as const }, { r: 3, c: 9, slot: 2 as const }];
    const j = convertBattle(RAW['012'], meta({ squares, leaderNames: undefined }), e('012'));
    const sq = j.units.filter((u) => u.square !== undefined);
    expect(sq.map((u) => [u.r, u.c, u.square])).toEqual([[3, 8, 1], [3, 9, 2]]);
    expect(() => convertBattle(RAW['012'], meta({ squares: [{ r: 0, c: 0, slot: 1 }], leaderNames: undefined }), e('012'))).toThrow(/no unit at \(\d,\d+\) for square 1/);
  });

  it('objective hexes must match the map', () => {
    const obj = (a: number): BattleMeta['objectives'] => [
      { kind: 'tempHex', side: 'top', hex: [8, a] }, { kind: 'tempHex', side: 'top', hex: [8, 11] },
    ];
    const m = (a: number) => meta({ rivers: 'fordable', objectives: obj(a) });
    expect(convertBattle(RAW['001'], m(2), e('001')).objectives).toHaveLength(2);
    let msg = '';
    try { convertBattle(RAW['001'], m(3), e('001')); } catch (err) { msg = (err as Error).message; }
    expect(msg).toMatch(/8,2.*unclaimed/);
    expect(msg).toMatch(/8,3.*not on the map/);
    expect(msg).toMatch(/\(001\)$/);
    // group and exit hexes count; killWeight has no hex
    const raw = synth({ objectives: [{ r: 8, c: 2, note: 'a' }, { r: 8, c: 3, note: 'b' }, { r: 0, c: 4, note: 'c' }] });
    const ok = meta({ objectives: [
      { kind: 'tempGroup', side: 'top', hexes: [[8, 2], [8, 3]], banners: 1 },
      { kind: 'exit', side: 'bottom', hex: [0, 4] },
      { kind: 'killWeight', side: 'top', enemyArm: 'infantry', first: 1, later: 1 },
    ] });
    expect(convertBattle(raw, ok, e('002')).objectives).toHaveLength(3);
  });

  it('river rule and river hexes agree', () => {
    const river = synth({ terrain: [{ r: 4, c: 0, t: 'river' }] });
    expect(() => convertBattle(river, meta({ rivers: 'none' }), e('002'))).toThrow(/river hexes but rivers is none \(002\)/);
    expect(() => convertBattle(synth(), meta({ rivers: 'fordable' }), e('002'))).toThrow(/no river hex \(002\)/);
    expect(convertBattle(river, meta({ rivers: 'brook' }), e('002')).rivers).toBe('brook');
  });

  it('refuses Expansion #1 data, naming every unsupported feature (Plan 7)', () => {
    expect(unsupportedFeatures(RAW['101'])).toContain('unit type SP/LN ×' + RAW['101'].units.filter((u) => u.key === 'SP/LN').length);
    expect(() => convertBattle(RAW['101'], meta(), e('101'))).toThrow(/^101: not yet supported \(Plan 7\): .*unit type SP\//);
    expect(unsupportedFeatures(synth({ terrain: [{ r: 1, c: 1, t: 'walledFarm' }] }))).toContain('terrain walledFarm ×1');
    expect(unsupportedFeatures(synth({ guerrilla: [] }))).toContain('field guerrilla');
    expect(unsupportedFeatures(synth({ units: [{ r: 1, c: 1, side: 'bottom', key: 'FR/LNC' }] }))).toContain('unit type FR/LNC ×1');
    expect(unsupportedFeatures(synth({ terrain: [{ r: 1, c: 1, t: 'hill', redoubt: true } as never] }))).toContain('terrain key redoubt ×1');
    expect(unsupportedFeatures(synth({ units: [{ r: 1, c: 1, side: 'top', key: 'BR/LN', blocks: 2 } as never] }))).toContain('unit key blocks ×1');
    expect(unsupportedFeatures(synth({ leaders: [{ r: 1, c: 1, side: 'top', name: 'X', nation: 'SP' } as never] }))).toContain('leader key nation ×1');
    expect(unsupportedFeatures(synth({ objectives: [{ r: 1, c: 1, note: 'n', side: 'top' } as never] }))).toContain('objective key side ×1');
    expect(unsupportedFeatures(synth({ terrain: [{ r: 1, c: 1, t: 'river', crossing: 'raft' }] }))).toContain('crossing raft');
    expect(unsupportedFeatures(RAW['002'])).toEqual([]);
  });

  it('validates the result with createGame', () => {
    expect(() => convertBattle(RAW['002'], meta({ banners: 0 }), e('002'))).toThrow(/banners must be at least 1 \(002\)/);
  });

  it('refuses an id that differs from the catalogue entry', () => {
    expect(() => convertBattle(RAW['002'], meta(), e('001'))).toThrow(/\(002\)/);
  });
});

describe('formatScenario', () => {
  it('formats one item per line, fixed key order, trailing newline, and round-trips', () => {
    const text = formatScenario(convertBattle(RAW['002'], meta(), e('002')));
    expect(text.endsWith('}\n')).toBe(true);
    expect(text.split('\n')[1]).toBe('  "id": "002",');
    expect(formatScenario(JSON.parse(text))).toBe(text);

    const m1 = meta({ rivers: 'fordable', objectives: [{ kind: 'tempHex', side: 'top', hex: [8, 2] }, { kind: 'tempHex', side: 'top', hex: [8, 11] }] });
    const j = convertBattle(RAW['001'], m1, e('001'));
    const t1 = formatScenario(j);
    const parsed = JSON.parse(t1);
    expect(Object.keys(parsed).slice(-6)).toEqual(['banners', 'rivers', 'terrain', 'units', 'leaders', 'objectives']);
    expect(t1.split('\n').filter((l) => l.startsWith('    {')).length).toBe(j.terrain.length + j.units.length + j.leaders.length + (j.objectives?.length ?? 0));
    expect(formatScenario(parsed)).toBe(t1);
  });
});

describe('convertBattle (Task 2 carry)', () => {
  it('two squares on one hex throw', () => {
    const squares = [{ r: 3, c: 8, slot: 1 as const }, { r: 3, c: 8, slot: 2 as const }];
    expect(() => convertBattle(RAW['012'], meta({ squares, leaderNames: undefined }), e('012'))).toThrow(/two squares on hex \(3,8\) \(012\)/);
  });

  it('the output shares no object with the meta', () => {
    const m = meta({ rivers: 'fordable', objectives: [{ kind: 'tempHex', side: 'top', hex: [8, 2] }, { kind: 'tempHex', side: 'top', hex: [8, 11] }] });
    const j = convertBattle(RAW['001'], m, e('001'));
    expect(j.top).toEqual(m.top); expect(j.top).not.toBe(m.top);
    expect(j.objectives).toEqual(m.objectives); expect(j.objectives).not.toBe(m.objectives);
  });
});
