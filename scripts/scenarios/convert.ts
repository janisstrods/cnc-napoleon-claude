// design/data/<id>.json (verified, engine-neutral map transcriptions) + a BattleMeta (rules, armies) -> src/scenarios/data/<id>.json.
// Pure: no node imports. build.ts does the file work. The result is validated by createGame before it is returned.
import { isRowKey } from '../../src/engine/codes';
import { createGame, type LeaderSetup, type ObjectiveSetup, type RiverRule, type ScenarioSetup, type SideRuleSetup, type SideSetup,
  type TerrainName, type TerrainSetup, type UnitOverride, type UnitSetup } from '../../src/engine/setup';
import type { Side, SquareSlot } from '../../src/engine/types';
import type { CatalogueEntry } from '../../src/scenarios/catalogue';
import type { ScenarioJson } from '../../src/scenarios';

export interface RawBattle {
  id: string;
  terrain: { r: number; c: number; t: string; on?: string; sides?: string[]; crossing?: string; art?: string }[];
  units: { r: number; c: number; side: string; key: string }[];
  leaders: { r: number; c: number; side: string; name: string }[];
  objectives: { r: number; c: number; note: string }[];
  grid?: unknown; notes?: string[]; riverPieces?: unknown;
}
export interface BattleMeta {
  top: SideSetup; bottom: SideSetup; first: Side; banners: number;
  rivers: RiverRule | 'none';
  objectives?: ObjectiveSetup[]; sideRules?: SideRuleSetup[]; unitOverrides?: UnitOverride[];
  squares?: { r: number; c: number; slot: SquareSlot }[];
  leaderNames?: Record<string, string>;
}

export const RAW_FIELDS: readonly string[] = ['id', 'grid', 'terrain', 'units', 'leaders', 'objectives', 'notes', 'riverPieces'];

// The converter's own list of setup terrain names (not the engine's TERRAIN_TYPES rows, which differ).
const SETUP_TERRAIN = ['plain', 'hill', 'forest', 'rugged', 'town', 'windmill', 'fortress', 'river', 'fieldworks', 'sandQuarry'] as const satisfies readonly TerrainName[];
const _all: Record<TerrainName, true> = { plain: true, hill: true, forest: true, rugged: true, town: true, windmill: true, fortress: true, river: true, fieldworks: true, sandQuarry: true };  // fails to compile if TerrainName gains a name
void _all;

const ITEM_KEYS = {
  terrain: ['r', 'c', 't', 'on', 'sides', 'crossing', 'art'],
  unit: ['r', 'c', 'side', 'key'],
  leader: ['r', 'c', 'side', 'name'],
  objective: ['r', 'c', 'note'],
} as const;

/** Every feature of the raw data the converter cannot carry yet (Expansion #1, Plan 7), sorted; empty when it is all supported. */
export function unsupportedFeatures(raw: RawBattle): string[] {
  const counts = new Map<string, number>();
  const bump = (k: string): void => void counts.set(k, (counts.get(k) ?? 0) + 1);
  for (const k of Object.keys(raw)) if (!RAW_FIELDS.includes(k)) bump(`field ${k}`);
  const items = (name: keyof typeof ITEM_KEYS, list: unknown): void => {
    for (const it of Array.isArray(list) ? (list as Record<string, unknown>[]) : [])
      for (const k of Object.keys(it)) if (!(ITEM_KEYS[name] as readonly string[]).includes(k)) bump(`${name} key ${k}`);
  };
  items('terrain', raw.terrain); items('unit', raw.units); items('leader', raw.leaders); items('objective', raw.objectives);
  for (const u of raw.units ?? []) if (!isRowKey(u.key)) bump(`unit type ${u.key}`);
  for (const t of raw.terrain ?? []) {
    if (!(SETUP_TERRAIN as readonly string[]).includes(t.t)) bump(`terrain ${t.t}`);
    if (t.crossing !== undefined && t.crossing !== 'bridge' && t.crossing !== 'ford') bump(`crossing ${t.crossing}`);
  }
  // 'crossing' is counted once per distinct value, the others per occurrence
  return [...counts].map(([k, n]) => (k.startsWith('field ') || k.startsWith('crossing ') ? k : `${k} ×${n}`)).sort();
}

const hexKey = (r: number, c: number): string => `${r},${c}`;

function metaObjectiveHexes(objs: readonly ObjectiveSetup[]): Set<string> {
  const s = new Set<string>();
  for (const o of objs) {
    if (o.kind === 'tempHex' || o.kind === 'exit') s.add(hexKey(o.hex[0], o.hex[1]));
    else if (o.kind === 'tempGroup') for (const h of o.hexes) s.add(hexKey(h[0], h[1]));
  }
  return s;
}

export function convertBattle(raw: RawBattle, meta: BattleMeta, entry: CatalogueEntry): ScenarioJson {
  const bad = unsupportedFeatures(raw);
  if (bad.length > 0) throw new Error(`${raw.id}: not yet supported (Plan 7): ${bad.join(', ')}`);
  const id = raw.id;
  if (id !== entry.id) throw new Error(`catalogue entry ${entry.id} does not match battle ${id} (${id})`);

  const hasRiver = raw.terrain.some((t) => t.t === 'river');
  if (meta.rivers === 'none' && hasRiver) throw new Error(`the map has river hexes but rivers is none (${id})`);
  if (meta.rivers !== 'none' && !hasRiver) throw new Error(`rivers is ${meta.rivers} but the map has no river hex (${id})`);

  const onMap = new Set(raw.objectives.map((o) => hexKey(o.r, o.c)));
  const claimed = metaObjectiveHexes(meta.objectives ?? []);
  const unclaimed = [...onMap].filter((h) => !claimed.has(h));
  const missing = [...claimed].filter((h) => !onMap.has(h));
  if (unclaimed.length > 0 || missing.length > 0) {
    const parts = [
      ...unclaimed.map((h) => `${h} is marked on the map but unclaimed by meta`),
      ...missing.map((h) => `${h} is in meta but not on the map`),
    ];
    throw new Error(`objective hexes disagree: ${parts.join('; ')} (${id})`);
  }

  const names = meta.leaderNames ?? {};
  const leaders: LeaderSetup[] = raw.leaders.map((l) => {
    const name = names[l.name] ?? l.name;
    if (name.startsWith('(')) throw new Error(`leader name "${name}" at (${l.r},${l.c}) needs a leaderNames entry (${id})`);
    return { side: l.side as Side, name, r: l.r, c: l.c };
  });

  const units: UnitSetup[] = raw.units.map((u) => ({ side: u.side as Side, key: u.key as UnitSetup['key'], r: u.r, c: u.c }));
  for (const sq of meta.squares ?? []) {
    const u = units.find((x) => x.r === sq.r && x.c === sq.c);
    if (!u) throw new Error(`no unit at (${sq.r},${sq.c}) for square ${sq.slot} (${id})`);
    u.square = sq.slot;
  }

  const terrain: TerrainSetup[] = raw.terrain.map((t) => {
    const o: TerrainSetup = { r: t.r, c: t.c, t: t.t as TerrainName };
    if (t.on !== undefined) o.on = t.on as TerrainSetup['on'];
    if (t.sides !== undefined) o.sides = t.sides as TerrainSetup['sides'];
    if (t.crossing !== undefined) o.crossing = t.crossing as TerrainSetup['crossing'];
    return o;
  });

  // Fixed key order of the output file.
  const out: Record<string, unknown> = { id, name: entry.name, year: entry.date.slice(-4) };
  if (entry.box !== 'base') out.expansion = entry.box;
  Object.assign(out, { top: meta.top, bottom: meta.bottom, first: meta.first, banners: meta.banners });
  if (meta.rivers !== 'none') out.rivers = meta.rivers;
  Object.assign(out, {
    terrain,
    units: units.map((u) => ({ side: u.side, key: u.key, r: u.r, c: u.c, ...(u.square !== undefined ? { square: u.square } : {}) })),
    leaders: leaders.map((l) => ({ side: l.side, name: l.name, r: l.r, c: l.c })),
  });
  if (meta.objectives?.length) out.objectives = meta.objectives;
  if (meta.sideRules?.length) out.sideRules = meta.sideRules;
  if (meta.unitOverrides?.length) out.unitOverrides = meta.unitOverrides;
  const json = out as unknown as ScenarioJson;

  const setup: ScenarioSetup = { id, name: json.name, top: json.top, bottom: json.bottom, first: json.first, banners: json.banners, terrain: json.terrain, units: json.units, leaders: json.leaders };
  if (json.rivers !== undefined) setup.rivers = json.rivers;
  if (json.objectives) setup.objectives = json.objectives;
  if (json.sideRules) setup.sideRules = json.sideRules;
  if (json.unitOverrides) setup.unitOverrides = json.unitOverrides;
  createGame(setup, 1);
  return json;
}

const LIST_KEYS = ['terrain', 'units', 'leaders', 'objectives', 'sideRules', 'unitOverrides'];

/** The scenario file text: one line per top-level key, one line per item of the long lists, trailing newline. */
export function formatScenario(j: ScenarioJson): string {
  const lines = Object.entries(j).map(([k, v]) => {
    if (LIST_KEYS.includes(k) && Array.isArray(v)) {
      if (v.length === 0) return `  "${k}": []`;
      return `  "${k}": [\n${v.map((it) => `    ${JSON.stringify(it)}`).join(',\n')}\n  ]`;
    }
    return `  "${k}": ${JSON.stringify(v)}`;
  });
  return `{\n${lines.join(',\n')}\n}\n`;
}
