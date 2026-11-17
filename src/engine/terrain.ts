// Terrain tables (RR §4.1–§4.4) and the table-driven terrain queries. T3 fills the stubs at the end.
// Imports only codes, types, hex, rng, expansions, units.
import type { Arm } from './codes';
import { directionTo, areAdjacent, colOf, rowOf } from './hex';
import { statsOf, type UnitStats } from './units';
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

// Battle queries (RR §4.2–§4.4).
/** Unit vectors of the six hexsides (E, NE, NW, W, SW, SE) in the odd-r layout (x = c + half a hex on odd rows, y = r·√3/2). */
const SIDE_VECTORS: readonly (readonly [number, number])[] = [[1, 0], [0.5, -Math.sqrt(3) / 2], [-0.5, -Math.sqrt(3) / 2], [-1, 0], [-0.5, Math.sqrt(3) / 2], [0.5, Math.sqrt(3) / 2]];
const centre = (h: HexId): [number, number] => [colOf(h) + (rowOf(h) % 2 === 1 ? 0.5 : 0), (rowOf(h) * Math.sqrt(3)) / 2];

/**
 * `other` lies in the closed 60° wedge of one of `worksHex`'s works sides: the angle between that side's direction and the
 * line from the works hex's centre to `other` is at most 30° ([Interp R46]).
 */
export function worksAcross(s: GameState, worksHex: HexId, other: HexId): boolean {
  const mask = worksMask(s, worksHex);
  if (mask === 0 || worksHex === other) return false;
  const [dx, dy] = centre(worksHex);
  const [ax, ay] = centre(other);
  const vx = ax - dx;
  const vy = ay - dy;
  for (let i = 0; i < 6; i++) {
    if ((mask & (1 << i)) === 0) continue;
    const [sx, sy] = SIDE_VECTORS[i];
    const angle = Math.atan2(Math.abs(sx * vy - sy * vx), sx * vx + sy * vy);
    if (angle <= Math.PI / 6 + 1e-9) return true;
  }
  return false;
}

/** The hill relation of a battle from the battler's hex to the target's hex (RR §4.2), null when neither is a hill. */
export function hillRelation(s: GameState, from: HexId, to: HexId): 'uphill' | 'downhill' | 'hillToHill' | null {
  const f = isHill(s, from);
  const t = isHill(s, to);
  if (f && t) return 'hillToHill';
  if (t) return 'uphill';
  if (f) return 'downhill';
  return null;
}

/**
 * Terrain reduction (≤ 0) of `battler` battling from `from` to `to`: out of `from` + into `to` + the hill relation, each for
 * the battler's arm (R3). A works hex gives its works values only across a works side, and then they replace the hill
 * relation (R45, R79); otherwise only its base terrain counts.
 */
export function terrainReduction(s: GameState, battler: Unit, kind: 'fire' | 'melee', from: HexId, to: HexId): number {
  const arm = statsOf(s, battler).arm;
  const worksOut = worksAcross(s, from, to);
  const worksIn = worksAcross(s, to, from);
  const out = (worksOut ? WORKS.out : TERRAIN_STATS[terrainAt(s, from)].out)[kind][arm];
  const into = (worksIn ? WORKS.into : TERRAIN_STATS[terrainAt(s, to)].into)[kind][arm];
  const rel = (worksOut && isHill(s, from)) || (worksIn && isHill(s, to)) ? null : hillRelation(s, from, to);
  return out + into + (rel ? HILL_RELATION[rel][kind][arm] : 0);
}

/** Flags the target ignores because of works between it and the attacker (infantry and artillery, across a works side). */
export function worksFlagIgnore(s: GameState, target: Unit, attackerHex: HexId): number {
  return worksAcross(s, target.hex, attackerHex) ? WORKS.flagIgnore[statsOf(s, target).arm] : 0;
}

/** No square across a works side (R70). */
export function worksForbidSquare(s: GameState, target: Unit, attackerHex: HexId): boolean {
  return worksAcross(s, target.hex, attackerHex);
}
