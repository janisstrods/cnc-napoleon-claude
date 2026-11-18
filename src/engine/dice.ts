// Dice counts and hit scoring (RR §2.2–§2.6, §3): type bonuses, moving-fire halving, artillery rows, card dice, square caps.
import type { Arm } from './codes';
import { distance } from './hex';
import { cardDice } from './cards';
import { TERRAIN_STATS, terrainAt, terrainReduction } from './terrain';
import { rollDice } from './rng';
import type { DieFace, FlowCtx, GameEvent, GameState, HexId, Leader, RollPurpose, Unit } from './types';
import { statsOf, type UnitStats } from './units';

export type StrikeRole = 'attack' | 'bonus' | 'back' | 'firstStrike' | 'squareFirst' | 'escape';
export interface DiceCtx { role: StrikeRole; moved: number; declared?: boolean }
export interface Scored { hits: number; flags: number; scoring: boolean[] }

/** Base fire dice of a unit with `blocks` at `distance` after moving `moved` hexes (RR §2.5, §2.6; R5, R15, R73). */
export function baseFireDice(st: UnitStats, blocks: number, distance: number, moved: number): number {
  const f = st.fire;
  if (f.kind === 'none') return 0;
  if (distance > f.range || distance < 1) return 0;
  if (f.kind === 'musket') {
    if (moved === 0) return blocks + f.standing;
    const half = f.round === 'up' ? Math.ceil(blocks / 2) : Math.floor(blocks / 2);
    return Math.max(0, half + f.moving);  // 0 stays 0 for a row with no moving die; a light row keeps its die even at 0 halves (PT/LT, 1 block → 1); a −1 row never goes below 0 (S1, S7)
  }
  const row = moved === 0 ? f.standing : moved === 1 ? f.moved : null;
  if (!row) return 0;
  return row[blocks >= 2 ? 'full' : 'one'][distance - 1] ?? 0;
}

/** Do the card's dice apply to `u` in this role (an ordered unit of the active side whose card mods are on)? */
function cardApplies(s: GameState, u: Unit): boolean {
  return u.side === s.active && !!s.turn.ordered[u.id]?.cardMods;
}

/** Fire dice of `u` at the unit on `targetHex` (0 when it cannot fire there; RR §3.2). */
export function fireDice(s: GameState, u: Unit, targetHex: HexId, ctx: DiceCtx): number {
  const st = statsOf(s, u);
  let n = baseFireDice(st, u.blocks, distance(u.hex, targetHex), ctx.moved);
  if (n <= 0) return 0;
  if (ctx.role === 'attack' && cardApplies(s, u)) n += cardDice(s.turn.mods.fire, st);
  if (u.square) n = Math.min(n, 1);
  return Math.max(0, n + terrainReduction(s, u, 'fire', u.hex, targetHex));
}

const isUnit = (t: Unit | Leader): t is Unit => 'key' in t;

/** Base melee dice of `u` against a unit or lone leader (before cards, caps and terrain; RR §2.2–§2.4). */
export function baseMeleeDice(s: GameState, u: Unit, target: Unit | Leader, moved: number): number {
  const st = statsOf(s, u);
  const m = st.melee;
  if (m.kind === 'artillery') return baseFireDice(st, u.blocks, 1, moved);
  const vs = isUnit(target) && statsOf(s, target).arm === 'infantry' ? m.vsInfantry : 0;
  return Math.max(0, u.blocks + m.plus + vs + (moved > 0 ? m.movedPlus : 0));
}

/** Melee dice of `u` against `target` (cards, caps and terrain applied, floor 0; RR §3.2). */
export function meleeDice(s: GameState, u: Unit, target: Unit | Leader, ctx: DiceCtx): number {
  const st = statsOf(s, u);
  let n = baseMeleeDice(s, u, target, ctx.moved);
  if (n <= 0 && ctx.declared && st.melee.kind === 'artillery' && st.fire.kind === 'artillery' && st.fire.moved && ctx.moved > 0) n = baseMeleeDice(s, u, target, 0);  // R12
  if (n <= 0 && st.melee.kind === 'artillery') return 0;  // a blocks-rule unit may start from 0 base dice: cards add to it (S7)
  if (ctx.role === 'attack' || (ctx.role === 'bonus' && s.turn.mods.bonusMelee)) {
    if (cardApplies(s, u)) {
      const lost = s.turn.mods.lostInTown
        && (TERRAIN_STATS[terrainAt(s, u.hex)].cancelsCavalryCharge || TERRAIN_STATS[terrainAt(s, target.hex)].cancelsCavalryCharge);
      if (!lost) n += cardDice(s.turn.mods.melee, st);
    }
  }
  const targetSquare = isUnit(target) && !!target.square;
  if (u.square || (st.arm === 'cavalry' && targetSquare)) n = Math.min(n, 1);
  if (ctx.role === 'escape') return Math.max(0, n);
  return Math.max(0, n + terrainReduction(s, u, 'melee', u.hex, target.hex));
}

/** Dice an enemy unit rolls against a leader escaping through its hex (no terrain, no cards; RR §3.3). */
export function escapeDice(s: GameState, u: Unit): number {
  const leader: Leader = { id: '', side: u.side === 'top' ? 'bottom' : 'top', name: '', hex: u.hex };
  return meleeDice(s, u, leader, { role: 'escape', moved: 0 });
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

/**
 * Does the melee unit `by` re-roll the flags of its roll at `target` (S12)? A lancer does in an attack, a bonus melee and
 * its own First Strike; never in a battle back, a square's first strike or an escape roll, and never against a unit whose
 * row is immune (a cuirassier). A lone leader is no unit, so nothing shields him.
 */
export function flagRerollApplies(s: GameState, by: Unit, target: Unit | Leader, role: StrikeRole): boolean {
  if (!statsOf(s, by).rerollsFlags) return false;
  if (role !== 'attack' && role !== 'bonus' && role !== 'firstStrike') return false;
  return !(isUnit(target) && statsOf(s, target).immuneToFlagReroll);
}

/**
 * Re-roll every flag die of `faces` once (S12), emit the re-roll as a second `roll` event with `reroll: true` and score it
 * like the first. Returns the re-rolled faces and their score (add them to the first roll's); null when no die shows a flag.
 */
export function rerollFlags(
  s: GameState, ctx: FlowCtx, purpose: RollPurpose, faces: readonly DieFace[], kind: 'fire' | 'melee' | 'retireReform', by: UnitStats, target: Arm,
  who: { by: string | null; against: string | null },
): (Scored & { faces: DieFace[] }) | null {
  const flags = faces.filter((f) => f === 'flag').length;
  if (!flags) return null;
  const again = rollDice(s, flags);
  const sc = scoreRoll(again, kind, by, target);
  // `reroll` joins the roll event with the engine contract (Task 2); the cast keeps this file free of types.ts until it merges
  ctx.emit({ t: 'roll', purpose, faces: again, scoring: sc.scoring, by: who.by, against: who.against, reroll: true } as GameEvent);
  return { ...sc, faces: again };
}
