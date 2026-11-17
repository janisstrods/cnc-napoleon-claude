// Dice counts and hit scoring (RR §3). Skeleton: dice equal the blocks (artillery from its standing row, fire range from
// the row), no type bonus, card dice, cap or halving; terrain reductions are already applied (→ T2).
import type { Arm } from './codes';
import { distance } from './hex';
import { terrainReduction } from './terrain';
import type { DieFace, GameState, HexId, Leader, Unit } from './types';
import { statsOf, type UnitStats } from './units';

export type StrikeRole = 'attack' | 'bonus' | 'back' | 'firstStrike' | 'squareFirst' | 'escape';
export interface DiceCtx { role: StrikeRole; moved: number; declared?: boolean }
export interface Scored { hits: number; flags: number; scoring: boolean[] }

/** Base fire dice of a unit with `blocks` at `distance` after moving `moved` hexes. Skeleton: see the file header. */
export function baseFireDice(st: UnitStats, blocks: number, distance: number, _moved: number): number {
  const f = st.fire;
  if (f.kind === 'none') return 0;
  if (distance > f.range || distance < 1) return 0;
  if (f.kind === 'musket') return blocks + f.standing;
  return f.standing[blocks >= 2 ? 'full' : 'one'][distance - 1] ?? 0;
}

/** Fire dice of `u` at the unit on `targetHex` (0 when it cannot fire there). */
export function fireDice(s: GameState, u: Unit, targetHex: HexId, ctx: DiceCtx): number {
  const base = baseFireDice(statsOf(s, u), u.blocks, distance(u.hex, targetHex), ctx.moved);
  if (base <= 0) return 0;
  return Math.max(0, base + terrainReduction(s, u, 'fire', u.hex, targetHex));
}

function baseMelee(st: UnitStats, blocks: number, moved: number): number {
  return st.melee.kind === 'artillery' ? baseFireDice(st, blocks, 1, moved) : blocks;
}

/** Base melee dice of `u` against a unit or lone leader (before terrain). */
export function baseMeleeDice(s: GameState, u: Unit, _target: Unit | Leader, moved: number): number {
  return baseMelee(statsOf(s, u), u.blocks, moved);
}

/** Melee dice of `u` against `target` (terrain applied, floor 0). */
export function meleeDice(s: GameState, u: Unit, target: Unit | Leader, ctx: DiceCtx): number {
  const base = baseMeleeDice(s, u, target, ctx.moved);
  if (ctx.role === 'escape') return Math.max(0, base);
  return Math.max(0, base + terrainReduction(s, u, 'melee', u.hex, target.hex));
}

/** Dice an enemy unit rolls against a leader escaping through its hex (no terrain, no cards; RR §3.3). */
export function escapeDice(s: GameState, u: Unit): number {
  return Math.max(0, baseMelee(statsOf(s, u), u.blocks, 0));
}

/** Score a roll: hits by matching arm (and sabres in melee when `by` scores them), and flags. */
export function scoreRoll(faces: readonly DieFace[], kind: 'fire' | 'melee' | 'retireReform', by: UnitStats, target: Arm): Scored {
  let hits = 0;
  let flags = 0;
  const scoring = faces.map((f) => {
    let hit = false;
    if (kind === 'retireReform') hit = f === 'cavalry';
    else if (kind === 'fire') hit = f === target;
    else hit = f === target || (f === 'sabre' && by.sabreHits);
    if (hit) hits++;
    if (f === 'flag' && kind !== 'retireReform') flags++;
    return hit;
  });
  return { hits, flags, scoring };
}

/** Does any die show a sabre (kills a lone leader)? */
export function sabreKills(faces: readonly DieFace[]): boolean {
  return faces.includes('sabre');
}
