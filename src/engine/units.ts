// Unit table (RR §2.2–§2.6): one row per UnitKey that exists in the base game. Nation-specific numbers (moving-fire
// rounding, retreat, flags) are row data; the engine never branches on a nation. Imports only codes, types, expansions.
import { ARM_OF, CODE_NAMES, codeOf, type Arm, type RowKey } from './codes';
import type { Expansion } from './expansions';
import type { GameState, MoveOption, Unit, UnitMatch, UnitTag } from './types';

export interface ArtilleryRow { full: readonly number[]; one: readonly number[] }  // dice at distance 1..5 (index d-1): 3 or 2 blocks / 1 block
export type MeleeRule = { kind: 'blocks'; plus: number; vsInfantry: number; movedPlus: number } | { kind: 'artillery' };  // movedPlus: added after moving (0 in the base game; Spanish −1 later)
export type FireRule =
  | { kind: 'none' }
  | { kind: 'musket'; range: number; standing: number; moving: number; round: 'up' | 'down' }  // b+standing; ⌈b/2⌉ or ⌊b/2⌋ + moving
  | { kind: 'artillery'; range: number; standing: ArtilleryRow; moved: ArtilleryRow | null };  // moved: after 1 hex
export interface UnitStats {
  key: RowKey; name: string; arm: Arm; tags: readonly UnitTag[]; expansion: Expansion; blocks: number;
  move: readonly MoveOption[]; battleAfterMoveMinBlocks: number; melee: MeleeRule; fire: FireRule;
  retreat: { first: number; then: number }; flagIgnore: number; sabreHits: boolean; ignoresInfantryFireHits: number;
}

const LINE: readonly MoveOption[] = [{ max: 1, battle: true }];
const LIGHT: readonly MoveOption[] = [{ max: 1, battle: true }, { max: 2, battle: false }];
const LIGHT_CAV: readonly MoveOption[] = [{ max: 3, battle: true }];
const HEAVY_CAV: readonly MoveOption[] = [{ max: 2, battle: true }];
const FOOT_GUNS: readonly MoveOption[] = [{ max: 0, battle: true }, { max: 1, battle: false }];
const HORSE_GUNS: readonly MoveOption[] = [{ max: 1, battle: true }, { max: 2, battle: false }];

const FA: FireRule = { kind: 'artillery', range: 5, standing: { full: [4, 3, 2, 1, 1], one: [3, 2, 1, 1, 0] }, moved: null };
const GA: FireRule = { kind: 'artillery', range: 5, standing: { full: [5, 3, 2, 1, 1], one: [4, 2, 1, 1, 0] }, moved: null };
const HA: FireRule = {
  kind: 'artillery', range: 4,
  standing: { full: [3, 2, 1, 1, 0], one: [2, 1, 1, 0, 0] },
  moved: { full: [3, 2, 1, 0, 0], one: [0, 0, 0, 0, 0] },
};
const NONE: FireRule = { kind: 'none' };

interface RowSpec {
  blocks: number; move: readonly MoveOption[]; melee?: number | 'artillery'; vsInfantry?: number; fire: FireRule | [number, number, number];
  retreat?: number; flags?: number; sabre?: boolean; tags?: UnitTag[]; minBlocks?: number; ignoresInfantryFireHits?: number;
}

function row(key: RowKey, x: RowSpec): UnitStats {
  const code = codeOf(key);
  const nation = key.slice(0, 2);
  const fire: FireRule = Array.isArray(x.fire)
    ? { kind: 'musket', range: x.fire[0], standing: x.fire[1], moving: x.fire[2], round: nation === 'PT' || nation === 'AL' ? 'down' : 'up' }
    : x.fire;
  const n = x.retreat ?? 1;
  return {
    key, name: CODE_NAMES[code], arm: ARM_OF[code], tags: x.tags ?? [], expansion: 'base', blocks: x.blocks, move: x.move,
    battleAfterMoveMinBlocks: x.minBlocks ?? 1,
    melee: x.melee === 'artillery' ? { kind: 'artillery' } : { kind: 'blocks', plus: x.melee ?? 0, vsInfantry: x.vsInfantry ?? 0, movedPlus: 0 },
    fire, retreat: { first: n, then: n }, flagIgnore: x.flags ?? 0, sabreHits: x.sabre ?? true,
    ignoresInfantryFireHits: x.ignoresInfantryFireHits ?? 0,
  };
}

export const UNIT_STATS: Readonly<Record<RowKey, UnitStats>> = {
  'FR/LN': row('FR/LN', { blocks: 4, move: LINE, vsInfantry: 1, fire: [2, 0, 0] }),
  'FR/LT': row('FR/LT', { blocks: 4, move: LIGHT, fire: [2, 1, 1], tags: ['light'] }),
  'FR/GR': row('FR/GR', { blocks: 4, move: LINE, melee: 1, fire: [2, 0, 0], flags: 1, tags: ['grenadier'] }),
  'FR/YG': row('FR/YG', { blocks: 4, move: LIGHT, melee: 1, fire: [2, 1, 1], flags: 1, tags: ['light', 'guard'] }),
  'FR/OG': row('FR/OG', { blocks: 4, move: LINE, melee: 2, fire: [2, 1, 1], flags: 2, tags: ['guard'] }),
  'FR/ML': row('FR/ML', { blocks: 4, move: LINE, fire: [2, 0, 0], retreat: 3, sabre: false }),
  'FR/LC': row('FR/LC', { blocks: 4, move: LIGHT_CAV, fire: NONE }),
  'FR/HC': row('FR/HC', { blocks: 4, move: HEAVY_CAV, melee: 1, fire: NONE, tags: ['heavy'] }),
  'FR/CU': row('FR/CU', { blocks: 4, move: HEAVY_CAV, melee: 1, fire: NONE, flags: 1, tags: ['heavy'], ignoresInfantryFireHits: 1 }),
  'FR/GHC': row('FR/GHC', { blocks: 4, move: HEAVY_CAV, melee: 1, fire: NONE, flags: 2, tags: ['heavy', 'guard'] }),
  'FR/FA': row('FR/FA', { blocks: 3, move: FOOT_GUNS, melee: 'artillery', fire: FA }),
  'FR/HA': row('FR/HA', { blocks: 3, move: HORSE_GUNS, melee: 'artillery', fire: HA, tags: ['horseArtillery'], minBlocks: 2 }),
  'FR/GA': row('FR/GA', { blocks: 3, move: FOOT_GUNS, melee: 'artillery', fire: GA, flags: 2, tags: ['guard'] }),
  'BR/LN': row('BR/LN', { blocks: 4, move: LINE, fire: [2, 1, 0] }),
  'BR/LT': row('BR/LT', { blocks: 5, move: LIGHT, fire: [2, 1, 1], tags: ['light'] }),
  'BR/RI': row('BR/RI', { blocks: 3, move: LIGHT, fire: [3, 1, 1], sabre: false, tags: ['light'] }),
  'BR/GR': row('BR/GR', { blocks: 4, move: LINE, melee: 1, fire: [2, 1, 1], flags: 1, tags: ['grenadier'] }),
  'BR/GG': row('BR/GG', { blocks: 5, move: LINE, melee: 1, fire: [2, 1, 1], flags: 2, tags: ['guard'] }),
  'BR/LC': row('BR/LC', { blocks: 3, move: LIGHT_CAV, fire: NONE }),
  'BR/HC': row('BR/HC', { blocks: 3, move: HEAVY_CAV, melee: 1, fire: NONE, tags: ['heavy'] }),
  'BR/GHC': row('BR/GHC', { blocks: 3, move: HEAVY_CAV, melee: 1, fire: NONE, flags: 2, tags: ['heavy', 'guard'] }),
  'BR/FA': row('BR/FA', { blocks: 3, move: FOOT_GUNS, melee: 'artillery', fire: FA }),
  'BR/HA': row('BR/HA', { blocks: 3, move: HORSE_GUNS, melee: 'artillery', fire: HA, tags: ['horseArtillery'], minBlocks: 2 }),
  'PT/LN': row('PT/LN', { blocks: 4, move: LINE, fire: [2, 0, 0] }),
  'PT/LT': row('PT/LT', { blocks: 3, move: LIGHT, fire: [2, 1, 1], tags: ['light'] }),
  'PT/ML': row('PT/ML', { blocks: 4, move: LINE, fire: [2, 0, 0], retreat: 3, sabre: false }),
  'PT/LC': row('PT/LC', { blocks: 3, move: LIGHT_CAV, fire: NONE }),
  'PT/HC': row('PT/HC', { blocks: 3, move: HEAVY_CAV, melee: 1, fire: NONE, tags: ['heavy'] }),
  'PT/FA': row('PT/FA', { blocks: 3, move: FOOT_GUNS, melee: 'artillery', fire: FA }),
  'AL/LN': row('AL/LN', { blocks: 4, move: LINE, fire: [2, 0, 0], retreat: 2 }),
  'AL/LT': row('AL/LT', { blocks: 3, move: LIGHT, fire: [2, 1, 1], tags: ['light'] }),
  'AL/ML': row('AL/ML', { blocks: 4, move: LINE, fire: [2, 0, 0], retreat: 3, sabre: false }),
  'AL/LC': row('AL/LC', { blocks: 3, move: LIGHT_CAV, fire: NONE }),
  'AL/FA': row('AL/FA', { blocks: 3, move: FOOT_GUNS, melee: 'artillery', fire: FA }),
};

/** A leader moves 3 hexes (RR §2.5). */
export const LEADER_MOVE = 3;

/** The stats of a unit in this game: the scenario's override of its row, else the table row. */
export function statsOf(s: Pick<GameState, 'scenario'>, u: Pick<Unit, 'key'>): UnitStats {
  return s.scenario.unitStats[u.key] ?? UNIT_STATS[u.key];
}

/** Retreat distance for `flags` retreat flags: 0 → 0; else first + (flags − 1) × then. */
export function retreatDistance(st: UnitStats, flags: number): number {
  return flags <= 0 ? 0 : st.retreat.first + (flags - 1) * st.retreat.then;
}

/** A unit matches when its arm is in `m.arms` OR one of its tags is in `m.tags`; an empty match matches nothing. */
export function matches(st: UnitStats, m: UnitMatch): boolean {
  return !!m.arms?.includes(st.arm) || !!m.tags?.some((t) => st.tags.includes(t));
}
