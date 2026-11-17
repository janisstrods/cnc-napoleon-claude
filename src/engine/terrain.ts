// Terrain tables (RR §4.1–§4.4) and the table-driven terrain queries. T3 fills the stubs at the end.
// Imports only codes, types, hex, rng, expansions, units.
import type { Arm } from './codes';
import { directionTo, areAdjacent } from './hex';
import type { UnitStats } from './units';
import type { GameState, HexId, TerrainType, Unit } from './types';

export interface ArmValues { infantry: number; cavalry: number; artillery: number }
export interface Reductions { fire: ArmValues; melee: ArmValues }       // values ≤ 0
export interface TerrainStats {
  name: string; impassable: boolean; closedTo: readonly Arm[]; stopsOnEntry: boolean;
  noBattleAfterEntering: 'all' | 'notLight' | null; noMeleeInto: boolean;
  into: Reductions; out: Reductions; hill: boolean; blocksSight: boolean; squareAllowed: boolean; cancelsCavalryCharge: boolean;
}
export interface WorksStats { into: Reductions; out: Reductions; flagIgnore: ArmValues }

const AV = (infantry: number, cavalry: number, artillery: number): ArmValues => ({ infantry, cavalry, artillery });
/** Fire reductions are written "infantry / artillery" in RR §4.2 (cavalry never fires). */
const FIRE = (i: number, a: number): ArmValues => AV(i, 0, a);
const ZERO = (): ArmValues => AV(0, 0, 0);
const NO_RED = (): Reductions => ({ fire: ZERO(), melee: ZERO() });
const RED = (fire: ArmValues, melee: ArmValues): Reductions => ({ fire, melee });

function stats(name: string, x: Partial<TerrainStats> = {}): TerrainStats {
  return {
    name, impassable: false, closedTo: [], stopsOnEntry: false, noBattleAfterEntering: null, noMeleeInto: false,
    into: NO_RED(), out: NO_RED(), hill: false, blocksSight: false, squareAllowed: true, cancelsCavalryCharge: false, ...x,
  };
}

const TOWN = stats('Town', {
  stopsOnEntry: true, noBattleAfterEntering: 'all', into: RED(FIRE(-2, -1), AV(-2, -3, -1)), out: RED(FIRE(0, -1), AV(0, -3, -1)),
  blocksSight: true, squareAllowed: false, cancelsCavalryCharge: true,
});
const FORD = stats('Fordable river', {
  stopsOnEntry: true, into: RED(FIRE(0, 0), AV(-1, -1, -1)), out: RED(FIRE(-1, -1), AV(-1, -1, -1)),
});

export const TERRAIN_STATS: Readonly<Record<TerrainType, TerrainStats>> = {
  plain: stats('Open ground'),
  hill: stats('Hill', { hill: true }),
  forest: stats('Forest', {
    stopsOnEntry: true, noBattleAfterEntering: 'notLight', into: RED(FIRE(-1, -1), AV(-1, -2, -1)), out: RED(FIRE(0, -1), AV(0, -2, -1)),
    blocksSight: true,
  }),
  rugged: stats('Rugged hill', { impassable: true, blocksSight: true, squareAllowed: false }),
  town: TOWN,
  windmill: { ...TOWN, name: 'Windmill' },
  fortress: { ...TOWN, name: 'Fortress' },
  river: stats('River', { impassable: true, noMeleeInto: true, squareAllowed: false }),
  ford: FORD,
  fordNoStop: { ...FORD, stopsOnEntry: false },
  brook: stats('Brook', { stopsOnEntry: true }),
  bridge: stats('Bridge'),
  sandQuarry: stats('Sand quarry', {
    closedTo: ['artillery'], stopsOnEntry: true, into: RED(FIRE(-1, -1), AV(0, -2, 0)), out: RED(FIRE(0, 0), AV(0, -2, 0)),
  }),
  void: stats('Off board', { impassable: true, blocksSight: true, squareAllowed: false }),
};

export const WORKS: WorksStats = {
  into: RED(FIRE(-1, 0), AV(-1, -2, 0)),
  out: RED(FIRE(0, 0), AV(0, -2, 0)),
  flagIgnore: AV(1, 0, 1),
};

export const HILL_RELATION: Readonly<Record<'uphill' | 'downhill' | 'hillToHill', Reductions>> = {
  uphill: RED(FIRE(-1, 0), AV(-1, -1, 0)),
  downhill: RED(FIRE(0, 0), AV(0, -1, 0)),
  hillToHill: RED(FIRE(-1, 0), AV(0, 0, 0)),
};

/** Derived: TERRAIN_STATS[t].name (kept so src/ui/terrain compiles mid-branch). */
export const TERRAIN_NAMES: Readonly<Record<TerrainType, string>> = Object.fromEntries(
  Object.entries(TERRAIN_STATS).map(([t, v]) => [t, v.name]),
) as Record<TerrainType, string>;

export function terrainAt(s: Pick<GameState, 'terrain'>, h: HexId): TerrainType {
  return s.terrain[h] ?? 'void';
}
export function isHill(s: Pick<GameState, 'terrain'>, h: HexId): boolean {
  return TERRAIN_STATS[terrainAt(s, h)].hill;
}
export function worksMask(s: Pick<GameState, 'works'>, h: HexId): number {
  return s.works[h] ?? 0;
}
/** a, b adjacent and a works side lies between them (on a's side facing b, or b's side facing a). */
export function crossesWorks(s: GameState, a: HexId, b: HexId): boolean {
  if (!areAdjacent(a, b)) return false;
  return (worksMask(s, a) & (1 << directionTo(a, b))) !== 0 || (worksMask(s, b) & (1 << directionTo(b, a))) !== 0;
}
/** null = leader: !impassable; else also !closedTo the arm. */
export function passableFor(s: GameState, h: HexId, arm: Arm | null): boolean {
  const t = TERRAIN_STATS[terrainAt(s, h)];
  if (t.impassable) return false;
  return arm === null || !t.closedTo.includes(arm);
}
/** `to`'s stopsOnEntry, or a works side lies between `from` and `to`. */
export function stopsOnEntry(s: GameState, from: HexId, to: HexId): boolean {
  return TERRAIN_STATS[terrainAt(s, to)].stopsOnEntry || crossesWorks(s, from, to);
}
/** 'all', or 'notLight' and the unit has no 'light' tag. */
export function noBattleAfterEntering(s: GameState, h: HexId, st: UnitStats): boolean {
  const r = TERRAIN_STATS[terrainAt(s, h)].noBattleAfterEntering;
  return r === 'all' || (r === 'notLight' && !st.tags.includes('light'));
}

// Stubs, filled by T3.
/** Stub: `other` is adjacent to `worksHex` across one of its works sides (RR §4.4's wedge comes with T3). */
export function worksAcross(s: GameState, worksHex: HexId, other: HexId): boolean {
  return areAdjacent(worksHex, other) && (worksMask(s, worksHex) & (1 << directionTo(worksHex, other))) !== 0;
}
/** Stub: 0. */
export function terrainReduction(_s: GameState, _battler: Unit, _kind: 'fire' | 'melee', _from: HexId, _to: HexId): number { return 0; }
/** Stub: 0. */
export function worksFlagIgnore(_s: GameState, _target: Unit, _attackerHex: HexId): number { return 0; }
/** Stub: false. */
export function worksForbidSquare(_s: GameState, _target: Unit, _attackerHex: HexId): boolean { return false; }
