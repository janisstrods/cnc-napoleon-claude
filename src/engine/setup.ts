// Scenario data → game state (RR §1, §14.12). Imports only codes, types, hex, rng, expansions, units, terrain, cards.
import { ARMS, isRowKey, type Arm, type Nation, type RowKey } from './codes';
import { CARD_LIST, NO_MODS } from './cards';
import { HEX_DIRS, hexId, onBoard } from './hex';
import { randInt, shuffle } from './rng';
import { TERRAIN_STATS, passableFor } from './terrain';
import { TERRAIN_TYPES, COLS, ROWS, SIDES, type GameState, type HexDir, type HexId, type Leader, type ObjectiveDef, type ObjectiveState,
  type PlayerState, type Side, type SideRuleDef, type SquareSlot, type TerrainType, type TurnState, type Unit } from './types';
import { UNIT_STATS, type UnitStats } from './units';

export interface SideSetup { army: string; nation: Nation; commander: string; cards: number }
export interface UnitSetup { side: Side; key: RowKey; r: number; c: number; square?: SquareSlot; blocks?: number }  // blocks: starting strength (1..row blocks), which is also maxBlocks
export interface LeaderSetup { side: Side; name: string; r: number; c: number }
export type TerrainName = 'plain' | 'hill' | 'forest' | 'rugged' | 'town' | 'windmill' | 'fortress' | 'river' | 'fieldworks' | 'sandQuarry';
export interface TerrainSetup { r: number; c: number; t: TerrainName; on?: 'plain' | 'hill'; sides?: HexDir[]; crossing?: 'bridge' | 'ford'; art?: string }
export type RiverRule = 'impassable' | 'fordable' | 'fordableNoStop' | 'brook';
export type ObjectiveSetup =
  | { kind: 'tempHex'; side: Side; hex: [number, number]; timing?: 'turnStart'; banners?: number; text?: string }
  | { kind: 'tempGroup'; side: Side; hexes: [number, number][]; timing?: 'turnStart'; banners: number; text?: string }
  | { kind: 'exit'; side: Side; hex: [number, number]; banners?: number; leadersScore?: boolean; retreatOff?: boolean; text?: string }
  | { kind: 'killWeight'; side: Side; enemyArm: Arm; first: number; later: number };
export type SideRuleSetup = SideRuleDef;
export interface UnitOverride { key: RowKey; set: Partial<Pick<UnitStats, 'blocks' | 'move' | 'retreat' | 'flagIgnore' | 'sabreHits'>> }
export interface ScenarioSetup {
  id: string; name: string; top: SideSetup; bottom: SideSetup; first: Side; banners: number;
  terrain: TerrainSetup[]; rivers?: RiverRule; units: UnitSetup[]; leaders: LeaderSetup[];
  objectives?: ObjectiveSetup[]; sideRules?: SideRuleSetup[]; unitOverrides?: UnitOverride[];
}

const TERRAIN_NAMES_SETUP: readonly TerrainName[] = ['plain', 'hill', 'forest', 'rugged', 'town', 'windmill', 'fortress', 'river', 'fieldworks', 'sandQuarry'];
const RIVER_RULES: readonly RiverRule[] = ['impassable', 'fordable', 'fordableNoStop', 'brook'];

const at = (r: number, c: number): string => `(${r},${c})`;

/** Fresh turn state: turn `number`, Phase 1, nothing ordered. */
export function newTurn(number: number): TurnState {
  return {
    number, card: null, effective: null, mirrored: false, phase: 'card', command: 0, ordered: {}, mods: { ...NO_MODS },
    firstStrikes: { top: 0, bottom: 0 }, reshuffle: false, scout: false, retreatEnds: [],
  };
}

// A battle with two different river rules (Spanish 104's two rivers) needs a per-river rule; it is deferred to Plan 7.
/** What a river hex (or a crossing on one) becomes under a river rule (RR §14, §14.13). */
function riverTerrain(rule: RiverRule, crossing: TerrainSetup['crossing']): TerrainType {
  if (crossing === 'bridge') return 'bridge';
  if (crossing === 'ford') return rule === 'impassable' ? 'ford' : rule === 'brook' ? 'brook' : 'fordNoStop';
  return rule === 'impassable' ? 'river' : rule === 'fordable' ? 'ford' : rule === 'fordableNoStop' ? 'fordNoStop' : 'brook';
}

/**
 * The board arrays of a scenario's terrain list: open ground on every board hex (`void` off it), then each entry. Field
 * works become their base terrain plus a mask of works sides. Throws on an entry off the board, a bad name, side or river
 * rule, a works tile without `on` or `sides`, or a crossing on a non-river hex.
 */
export function boardFromTerrain(list: readonly TerrainSetup[], rivers: RiverRule): Pick<GameState, 'terrain' | 'works'> {
  if (!RIVER_RULES.includes(rivers)) throw new Error(`unknown rivers rule ${String(rivers)}`);
  const terrain: TerrainType[] = [];
  const works: number[] = [];
  for (let h = 0; h < ROWS * COLS; h++) {
    terrain.push(onBoard(Math.floor(h / COLS), h % COLS) ? 'plain' : 'void');
    works.push(0);
  }
  for (const e of list) {
    const where = at(e.r, e.c);
    if (!onBoard(e.r, e.c)) throw new Error(`terrain ${String(e.t)} at ${where} is off the board`);
    if (!TERRAIN_NAMES_SETUP.includes(e.t)) throw new Error(`unknown terrain ${String(e.t)} at ${where}`);
    if (e.crossing !== undefined && e.t !== 'river') throw new Error(`crossing on ${e.t} at ${where}: only a river hex has one`);
    if (e.crossing !== undefined && e.crossing !== 'bridge' && e.crossing !== 'ford') throw new Error(`unknown crossing ${String(e.crossing)} at ${where}`);
    const h = hexId(e.r, e.c);
    if (e.t === 'fieldworks') {
      if (e.on !== 'plain' && e.on !== 'hill') throw new Error(`fieldworks at ${where} needs on: 'plain' or 'hill'`);
      if (!Array.isArray(e.sides) || e.sides.length < 1) throw new Error(`fieldworks at ${where} needs at least one works side`);
      let mask = 0;
      for (const d of e.sides) {
        const i = HEX_DIRS.indexOf(d);
        if (i < 0) throw new Error(`fieldworks at ${where}: unknown side ${String(d)}`);
        mask |= 1 << i;
      }
      terrain[h] = e.on;
      works[h] = mask;
    } else if (e.t === 'river') {
      terrain[h] = riverTerrain(rivers, e.crossing);
    } else {
      terrain[h] = e.t;
    }
  }
  return { terrain, works };
}

function validateHexes(hexes: unknown, where: string, min = 1): HexId[] {
  if (!Array.isArray(hexes) || hexes.length < min) throw new Error(`${where} needs at least ${min} hex${min === 1 ? '' : 'es'}`);
  return hexes.map((p: unknown) => {
    const [r, c] = Array.isArray(p) ? (p as number[]) : [NaN, NaN];
    if (!onBoard(r, c)) throw new Error(`${where}: hex ${JSON.stringify(p)} is off the board`);
    return hexId(r, c);
  });
}

function resolveObjective(o: ObjectiveSetup, setup: ScenarioSetup): ObjectiveDef {
  if (!(SIDES as readonly string[]).includes(o.side)) throw new Error(`objective with unknown side ${String(o.side)}`);
  const army = setup[o.side].army;
  switch (o.kind) {
    case 'tempHex': {
      const [hex] = validateHexes([o.hex], 'tempHex objective');
      return { kind: 'tempHex', side: o.side, hex, timing: o.timing ?? 'turnStart', banners: o.banners ?? 1, text: o.text ?? `${army} holds an objective.` };
    }
    case 'tempGroup': {
      const hexes = validateHexes(o.hexes, 'tempGroup objective', 2);
      if (!Number.isFinite(o.banners)) throw new Error(`tempGroup banners ${String(o.banners)} is not a number`);
      return { kind: 'tempGroup', side: o.side, hexes, timing: o.timing ?? 'turnStart', banners: o.banners, text: o.text ?? `${army} holds the objective group.` };
    }
    case 'exit': {
      const [hex] = validateHexes([o.hex], 'exit objective');
      const row = Math.floor(hex / COLS);
      if (row !== 0 && row !== ROWS - 1) throw new Error(`exit objective hex ${at(row, hex % COLS)} is not on row 0 or 8`);
      return {
        kind: 'exit', side: o.side, hex, banners: o.banners ?? 1, leadersScore: o.leadersScore ?? false, retreatOff: o.retreatOff ?? false,
        text: o.text ?? `${army} {unit} exits the battlefield.`,
      };
    }
    case 'killWeight':
      if (!(ARMS as readonly string[]).includes(o.enemyArm)) throw new Error(`killWeight enemyArm ${String(o.enemyArm)} is not an arm`);
      if (!Number.isFinite(o.first) || !Number.isFinite(o.later)) throw new Error('killWeight first and later must be numbers');
      return { kind: 'killWeight', side: o.side, enemyArm: o.enemyArm, first: o.first, later: o.later };
    default:
      throw new Error(`unknown objective kind ${String((o as { kind?: unknown }).kind)}`);
  }
}

function resolveSideRule(r: SideRuleSetup): SideRuleDef {
  if (!(SIDES as readonly string[]).includes(r.side)) throw new Error(`side rule with unknown side ${String(r.side)}`);
  if (r.kind === 'flagIgnoreOn') {
    if (!(TERRAIN_TYPES as readonly string[]).includes(r.terrain)) throw new Error(`flagIgnoreOn: unknown terrain ${String(r.terrain)}`);
    return { kind: 'flagIgnoreOn', side: r.side, terrain: r.terrain, flags: r.flags };
  }
  if (r.kind === 'impetuousCavalry') {
    for (const k of r.keys) {
      if (!isRowKey(k)) throw new Error(`impetuousCavalry: unknown unit key ${String(k)}`);
      if (UNIT_STATS[k].arm !== 'cavalry') throw new Error(`impetuousCavalry: ${k} is not a cavalry row`);
    }
    return { kind: 'impetuousCavalry', side: r.side, keys: [...r.keys] };
  }
  throw new Error(`unknown side rule kind ${String((r as { kind?: unknown }).kind)}`);
}

function buildGame(setup: ScenarioSetup, seed: number): GameState {
  for (const side of SIDES) {
    if (!(Number.isInteger(setup[side].cards) && setup[side].cards >= 1)) throw new Error(`${side} side needs a whole number of cards, at least 1`);
  }
  if (!(setup.banners >= 1)) throw new Error('banners must be at least 1');

  const board = boardFromTerrain(setup.terrain, setup.rivers ?? 'impassable');

  const unitStats: Partial<Record<RowKey, UnitStats>> = {};
  for (const o of setup.unitOverrides ?? []) {
    if (!isRowKey(o.key)) throw new Error(`unitOverrides: unknown unit key ${String(o.key)}`);
    unitStats[o.key] = { ...(unitStats[o.key] ?? UNIT_STATS[o.key]), ...o.set };   // repeated overrides of a key merge
  }
  const rngHolder = { rng: seed >>> 0, rngCalls: 0 };
  const sideRules = (setup.sideRules ?? []).map(resolveSideRule);
  const objectives = (setup.objectives ?? []).map((o) => resolveObjective(o, setup));

  const player = (side: Side): PlayerState => {
    const ss = setup[side];
    return { side, army: ss.army, nation: ss.nation, commander: ss.commander, cards: ss.cards, hand: [], squareTrack: [null, null, null, null], banners: 0, resources: {} };
  };
  const s: GameState = {
    scenarioId: setup.id, terrain: board.terrain, works: board.works, units: [], leaders: [],
    players: { top: player('top'), bottom: player('bottom') },
    deck: [], discard: [], first: setup.first, active: setup.first, turn: newTurn(1), lastCard: { top: null, bottom: null },
    bannersToWin: setup.banners, rng: rngHolder.rng, rngCalls: 0, winner: null, winReason: '',
    scenario: { objectives, sideRules, unitStats, leadersAtStart: { top: 0, bottom: 0 } },
    special: { objState: objectives.map((): ObjectiveState => ({ held: false, count: 0 })), turnsDone: { top: 0, bottom: 0 }, leadersEliminated: { top: 0, bottom: 0 } },
  };
  if (!SIDES.includes(setup.first)) throw new Error(`unknown first side ${String(setup.first)}`);

  // units
  const occupied = new Map<HexId, Unit>();
  const slots: Record<Side, Set<number>> = { top: new Set(), bottom: new Set() };
  setup.units.forEach((u, i) => {
    const where = at(u.r, u.c);
    if (!isRowKey(u.key)) throw new Error(`unknown unit key ${String(u.key)}`);
    if (!SIDES.includes(u.side)) throw new Error(`unit ${u.key} at ${where} has unknown side ${String(u.side)}`);
    if (!onBoard(u.r, u.c)) throw new Error(`unit ${u.key} at ${where} is off the board`);
    const h = hexId(u.r, u.c);
    const row = UNIT_STATS[u.key];
    if (!passableFor(s, h, row.arm)) {
      const t = s.terrain[h];
      throw new Error(`unit ${u.key} at ${where} stands on ${t}, which is impassable to ${row.arm}`);
    }
    if (occupied.has(h)) throw new Error(`two units on ${where}`);
    const max = unitStats[u.key]?.blocks ?? row.blocks;
    if (u.blocks !== undefined && !(Number.isInteger(u.blocks) && u.blocks >= 1 && u.blocks <= max)) {
      throw new Error(`unit ${u.key} at ${where}: blocks ${String(u.blocks)} is outside 1..${max}`);
    }
    if (u.square !== undefined) {
      if (row.arm !== 'infantry') throw new Error(`unit ${u.key} at ${where} cannot start in square: it is not infantry`);
      if (![1, 2, 3, 4].includes(u.square)) throw new Error(`unit ${u.key} at ${where}: square slot ${String(u.square)} is not 1..4`);
      if (!TERRAIN_STATS[s.terrain[h]].squareAllowed) throw new Error(`unit ${u.key} at ${where} cannot start in square on ${s.terrain[h]} (RR §9.5)`);
      if (slots[u.side].has(u.square)) throw new Error(`square slot ${u.square} used twice by the ${u.side} side`);
      slots[u.side].add(u.square);
    }
    const blocks = u.blocks ?? max;
    const unit: Unit = { id: `u${i + 1}`, side: u.side, key: u.key, hex: h, blocks, maxBlocks: blocks };
    if (u.square !== undefined) unit.square = u.square;
    occupied.set(h, unit);
    s.units.push(unit);
  });

  // leaders
  const leaderAt = new Set<HexId>();
  const leadersAtStart: Record<Side, number> = { top: 0, bottom: 0 };
  setup.leaders.forEach((l, i) => {
    const where = at(l.r, l.c);
    if (!SIDES.includes(l.side)) throw new Error(`leader ${l.name} has unknown side ${String(l.side)}`);
    if (!onBoard(l.r, l.c)) throw new Error(`leader ${l.name} at ${where} is off the board`);
    const h = hexId(l.r, l.c);
    if (!passableFor(s, h, null)) throw new Error(`leader ${l.name} at ${where} stands on ${s.terrain[h]}, which is impassable`);
    if (leaderAt.has(h)) throw new Error(`two leaders on ${where}`);
    const there = occupied.get(h);
    if (there && there.side !== l.side) throw new Error(`leader ${l.name} at ${where} stands on an enemy unit`);
    leaderAt.add(h);
    const leader: Leader = { id: `L${setup.units.length + 1 + i}`, side: l.side, name: l.name, hex: h };
    s.leaders.push(leader);
    leadersAtStart[l.side]++;
  });
  s.scenario = { ...s.scenario, leadersAtStart };
  for (const side of SIDES) {
    const squares = slots[side].size;
    if (squares >= setup[side].cards) throw new Error(`${side} side starts ${squares} squares with only ${setup[side].cards} cards: one card must stay in hand`);
  }

  // deck and hands; then the squares that start on the field take a random card of their side's hand (RR §14.12, R85)
  s.deck = shuffle(rngHolder, CARD_LIST.map((_, i) => i));
  for (const side of SIDES) for (let i = 0; i < setup[side].cards; i++) s.players[side].hand.push(s.deck.pop()!);
  for (const u of s.units) {
    if (u.square === undefined) continue;
    const p = s.players[u.side];
    p.squareTrack[u.square - 1] = p.hand.splice(randInt(rngHolder, p.hand.length), 1)[0];
  }
  s.rng = rngHolder.rng;
  s.rngCalls = rngHolder.rngCalls;
  return s;
}

/** Build a game from scenario data. Every error ends with `(${setup.id})`, the original error kept as `cause`. */
export function createGame(setup: ScenarioSetup, seed: number): GameState {
  try {
    return buildGame(setup, seed);
  } catch (e) {
    if (e instanceof Error && !e.message.endsWith(`(${setup.id})`)) throw new Error(`${e.message} (${setup.id})`, { cause: e });
    throw e;
  }
}

/** Deep copy of a game state (plain data). Shares terrain, works and scenario, which never change in play. */
export function cloneState(s: GameState): GameState {
  const ordered: TurnState['ordered'] = {};
  for (const k in s.turn.ordered) ordered[k] = { ...s.turn.ordered[k] };
  const player = (p: PlayerState): PlayerState => ({ ...p, hand: [...p.hand], squareTrack: [...p.squareTrack], resources: { ...p.resources } });
  return {
    ...s,
    units: s.units.map((u) => ({ ...u })),
    leaders: s.leaders.map((l) => ({ ...l })),
    players: { top: player(s.players.top), bottom: player(s.players.bottom) },
    deck: [...s.deck],
    discard: [...s.discard],
    turn: { ...s.turn, ordered, mods: { ...s.turn.mods }, firstStrikes: { ...s.turn.firstStrikes }, retreatEnds: [...s.turn.retreatEnds] },
    lastCard: { ...s.lastCard },
    special: {
      objState: s.special.objState.map((o) => ({ ...o })),
      turnsDone: { ...s.special.turnsDone },
      leadersEliminated: { ...s.special.leadersEliminated },
    },
  };
}
