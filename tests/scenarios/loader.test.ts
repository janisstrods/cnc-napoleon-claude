// The scenario loader (src/scenarios/index.ts): every field of the scenario JSON reaches ScenarioSetup unchanged and as
// a copy, other top-level fields are ignored, and setup errors name the scenario they come from.
import { describe, expect, it } from 'vitest';
import { hexId } from '../../src/engine/hex';
import { createGame } from '../../src/engine/setup';
import { scenarioById, scenarioFromJson, scenariosFromFiles, type ScenarioJson } from '../../src/scenarios';

/** A synthetic Expansion #1 scenario using every field the loader must pass through. */
const RAW: ScenarioJson = {
  id: '199', name: 'Loader test', year: '1812', expansion: 'exp1',
  top: { army: 'Spanish', nation: 'SP', commander: 'Castaños', cards: 6 },
  bottom: { army: 'French', nation: 'FR', commander: 'Dupont', cards: 4 },
  first: 'top', banners: 8, rivers: 'brook',
  terrain: [
    { r: 4, c: 3, t: 'river' }, { r: 4, c: 4, t: 'river', crossing: 'ford' }, { r: 4, c: 5, t: 'river', crossing: 'bridge' },
    { r: 2, c: 2, t: 'fieldworks', on: 'hill', sides: ['W', 'SW'], art: 'redoubt' }, { r: 5, c: 5, t: 'sandQuarry' },
  ],
  units: [
    { side: 'top', key: 'AL/LN', r: 1, c: 5, blocks: 3 }, { side: 'top', key: 'PT/HC', r: 1, c: 6 },
    { side: 'bottom', key: 'FR/LT', r: 6, c: 6, square: 2 }, { side: 'bottom', key: 'FR/GHC', r: 6, c: 7 },
  ],
  leaders: [{ side: 'top', name: 'Castaños', r: 1, c: 5 }],
  objectives: [
    { kind: 'tempHex', side: 'top', hex: [2, 2], banners: 2, text: 'The redoubt falls!' },
    { kind: 'exit', side: 'bottom', hex: [0, 1], leadersScore: true },
    { kind: 'killWeight', side: 'top', enemyArm: 'cavalry', first: 2, later: 1 },
  ],
  sideRules: [{ kind: 'impetuousCavalry', side: 'bottom', keys: ['FR/GHC'] }],
  unitOverrides: [{ key: 'AL/LN', set: { retreat: { first: 1, then: 1 }, move: [{ max: 2, battle: true }] } }],
};

describe('scenario loader', () => {
  it('passes the setup fields through unchanged, as copies', () => {
    const raw: ScenarioJson = JSON.parse(JSON.stringify(RAW));
    const { setup, expansion, year } = scenarioFromJson(raw);
    expect([expansion, year]).toEqual(['exp1', '1812']);
    for (const k of ['top', 'bottom', 'terrain', 'units', 'leaders', 'objectives', 'sideRules', 'unitOverrides'] as const) {
      expect(setup[k], k).toEqual(raw[k]); expect(setup[k], k).not.toBe(raw[k]);
    }
    expect([setup.first, setup.banners, setup.rivers]).toEqual(['top', 8, 'brook']);
    setup.terrain[3].sides!.push('E'); setup.objectives![1] = { kind: 'exit', side: 'top', hex: [8, 0] };
    expect(raw.terrain[3].sides).toEqual(['W', 'SW']); expect(raw.objectives![1]).toEqual(RAW.objectives![1]);
  });

  it('builds a playable game from the loaded setup', () => {
    const s = createGame(scenarioFromJson(RAW).setup, 1);
    expect(s.terrain[hexId(4, 3)]).toBe('brook'); expect(s.terrain[hexId(4, 4)]).toBe('brook'); expect(s.terrain[hexId(4, 5)]).toBe('bridge');
    expect(s.terrain[hexId(2, 2)]).toBe('hill'); expect(s.works[hexId(2, 2)]).toBe((1 << 3) | (1 << 4));
    expect(s.units.map((u) => [u.key, u.blocks, u.square])).toEqual([['AL/LN', 3, undefined], ['PT/HC', 3, undefined], ['FR/LT', 4, 2], ['FR/GHC', 4, undefined]]);
    expect(s.scenario.unitStats['AL/LN']?.retreat).toEqual({ first: 1, then: 1 });
    expect(s.scenario.objectives).toHaveLength(3); expect(s.scenario.sideRules).toHaveLength(1);
    expect(s.players.bottom.squareTrack.filter((c) => c !== null)).toHaveLength(1);
  });

  it('leaves out the optional fields a file does not have', () => {
    const { setup, hidden } = scenarioFromJson({ ...RAW, rivers: undefined, objectives: undefined, sideRules: undefined, unitOverrides: undefined });
    expect(Object.keys(setup).sort()).toEqual(['banners', 'bottom', 'first', 'id', 'leaders', 'name', 'terrain', 'top', 'units']);
    expect(hidden).toBeUndefined();
  });

  it('ignores grid, notes and any other top-level field', () => {
    const { setup } = scenarioFromJson({ ...RAW, grid: 'x', notes: ['n'], rosterCheck: {} } as unknown as ScenarioJson);
    expect(setup).not.toHaveProperty('grid'); expect(setup).not.toHaveProperty('notes'); expect(setup).not.toHaveProperty('rosterCheck');
    expect(setup).not.toHaveProperty('year'); expect(setup).not.toHaveProperty('expansion');
  });

  it('the base box is the default; hidden is kept', () => {
    const info = scenarioFromJson({ ...RAW, expansion: undefined, hidden: true });
    expect([info.expansion, info.hidden]).toEqual(['base', true]);
  });

  it('the drill battle 000 is hidden, base, with 5 units per side and 2 leaders', () => {
    const d = scenarioById('000');
    expect([d.hidden, d.expansion]).toEqual([true, 'base']);
    expect(d.setup.units.filter((u) => u.side === 'top')).toHaveLength(5); expect(d.setup.units.filter((u) => u.side === 'bottom')).toHaveLength(5);
    expect(d.setup.leaders).toHaveLength(2);
  });
});

describe('setup errors name the scenario', () => {
  it('an error from setup ends with the scenario id and keeps the original as cause', () => {
    const st = scenarioFromJson(RAW).setup;
    st.units[0].r = 9;
    let thrown: unknown;
    try { createGame(st, 1); } catch (e) { thrown = e; }
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toMatch(/off the board \(199\)$/);
    expect(((thrown as Error).cause as Error).message).not.toMatch(/\(199\)$/);
  });
});

describe('malformed scenario files', () => {
  it('a file that breaks the loader throws an Error naming the file and the scenario', () => {
    const broken = { ...RAW, id: '198', terrain: undefined } as unknown as ScenarioJson;
    let thrown: unknown;
    try { scenariosFromFiles({ './data/199.json': RAW, './data/198.json': broken }); } catch (e) { thrown = e; }
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toMatch(/^scenario file \.\/data\/198\.json \(198\): /);
  });

  it('a file with no top-level shape at all still names the file', () => {
    expect(() => scenariosFromFiles({ './data/nothing.json': null as unknown as ScenarioJson })).toThrow(/^scenario file \.\/data\/nothing\.json: /);
  });

  it('an unknown expansion names the file and the scenario once', () => {
    expect(() => scenariosFromFiles({ './data/199.json': { ...RAW, expansion: 'exp9' as ScenarioJson['expansion'] } }))
      .toThrow('scenario file ./data/199.json: unknown expansion exp9 (199)');
  });

  it('well-formed files build as before, sorted by id', () => {
    const list = scenariosFromFiles({ './b.json': { ...RAW, id: '199' }, './a.json': { ...RAW, id: '198' } });
    expect(list.map((x) => x.id)).toEqual(['198', '199']);
  });
});

describe('the scenario files through the loader: every key reaches the setup, as a copy', () => {
  const FILES = Object.values(import.meta.glob<ScenarioJson>('../../src/scenarios/data/*.json', { eager: true, import: 'default' }))
    .sort((a, b) => a.id.localeCompare(b.id));
  type Path = (string | number)[];
  const isNode = (v: unknown): v is object => typeof v === 'object' && v !== null;
  /** The value of a file key in the built scenario: year, box and `hidden` are in the info, everything else in its setup. */
  const target = (info: ReturnType<typeof scenarioFromJson>, key: string): unknown =>
    key === 'year' || key === 'expansion' || key === 'hidden' ? info[key] : (info.setup as unknown as Record<string, unknown>)[key];

  /**
   * Walk a file value and the loaded value side by side: every key and list entry of the file must be in the setup with the
   * same value, and no object or list of the setup may be the file's own. Returns the problems found.
   */
  function compare(file: unknown, loaded: unknown, path: Path, problems: string[]) {
    const at = path.join('.');
    if (!isNode(file)) {
      if (loaded !== file) problems.push(`${at}: ${JSON.stringify(file)} became ${JSON.stringify(loaded)}`);
      return;
    }
    if (!isNode(loaded)) return void problems.push(`${at}: dropped (${JSON.stringify(loaded)})`);
    if (loaded === file) problems.push(`${at}: shared with the file, not copied`);
    if (Array.isArray(file)) {
      if (!Array.isArray(loaded) || loaded.length !== file.length) return void problems.push(`${at}: list changed`);
      file.forEach((v, i) => compare(v, loaded[i], [...path, i], problems));
      return;
    }
    for (const [k, v] of Object.entries(file)) {
      if (!Object.prototype.hasOwnProperty.call(loaded, k)) problems.push(`${at}.${k}: dropped`);
      else compare(v, (loaded as Record<string, unknown>)[k], [...path, k], problems);
    }
  }

  it('the files are 000 to 015 and 101 to 118, only the drill 000 is hidden, only 1xx name a box, and SCENARIOS holds each as built', () => {
    const spanish = Array.from({ length: 18 }, (_, i) => String(101 + i));
    expect(FILES.map((j) => j.id)).toEqual(['000', ...Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(3, '0')), ...spanish]);
    expect(FILES.filter((j) => j.hidden).map((j) => j.id)).toEqual(['000']);
    expect(FILES.filter((j) => j.expansion !== undefined).map((j) => j.id)).toEqual(spanish);
    for (const j of FILES) expect(scenarioById(j.id), j.id).toEqual(scenarioFromJson(j));
  });

  it('every key of the file reaches the loaded setup unchanged and as a copy', () => {
    for (const j of FILES) {
      const info = scenarioFromJson(j);
      const problems: string[] = [];
      for (const [k, v] of Object.entries(j)) {
        if (k === 'id' || k === 'name') expect([k, info[k]]).toEqual([k, v]);
        // the roster check and notes some files carry are ignored by the loader
        if (k === 'grid' || k === 'notes') continue;
        compare(v, target(info, k), [j.id, k], problems);
      }
      expect(problems, j.id).toEqual([]);
    }
  });

  it('the walk notices a dropped or shared field', () => {
    const j = JSON.parse(JSON.stringify(FILES[0])) as ScenarioJson;
    const info = scenarioFromJson(j);
    delete (info.setup.units[0] as { r?: number }).r;
    info.setup.leaders[0] = j.leaders[0] as never;
    const problems: string[] = [];
    for (const [k, v] of Object.entries(j)) compare(v, target(info, k), [j.id, k], problems);
    expect(problems).toEqual(['000.units.0.r: dropped', '000.leaders.0: shared with the file, not copied']);
  });
});
