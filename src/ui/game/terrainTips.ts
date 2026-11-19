// Terrain effects for the hex hover tooltip: what each terrain does to movement, combat and line of sight, worded for the
// player from the terrain table (rules-reference §4): `TERRAIN_STATS`, the hill relations and the field works.
import {
  HILL_RELATION, TERRAIN_STATS, WORKS, terrainAt, worksMask,
  type ArmValues, type GameState, type HexId, type Reductions, type TerrainType,
} from '../../engine';
import { worksSidesText } from './uiModel';

/** What an effect line is about: movement, combat, line of sight, or a rule of this battle only. */
export type TipKind = 'move' | 'combat' | 'sight' | 'battle';

/** The label shown before the first line of each kind. */
export const TIP_KIND_LABEL: Record<TipKind, string> = { move: 'Move', combat: 'Combat', sight: 'Sight', battle: 'Battle' };

export interface TipLine {
  kind: TipKind;
  text: string;
}

/**
 * The terrain block of a hex's tooltip: its name, the swatch (`t` and `works` as `TerrainIcon` takes them) and the
 * effect lines, in the order move, combat, sight, battle.
 */
export interface TerrainTip {
  name: string;
  t: TerrainType;
  /** The hex has Field Works: the swatch draws them too. */
  works: boolean;
  lines: TipLine[];
}

const move = (text: string): TipLine => ({ kind: 'move', text });
const combat = (text: string): TipLine => ({ kind: 'combat', text });
const sight = (text: string): TipLine => ({ kind: 'sight', text });

const ARM_WORDS: Record<keyof ArmValues, string> = { infantry: 'infantry', cavalry: 'cavalry', artillery: 'artillery' };

/** "infantry −1, artillery −1" for the non-zero entries of a row, or null. */
function armsText(v: ArmValues): string | null {
  const parts = (Object.keys(ARM_WORDS) as (keyof ArmValues)[]).filter((a) => v[a] !== 0).map((a) => `${ARM_WORDS[a]} ${v[a] < 0 ? '−' : '+'}${Math.abs(v[a])}`);
  return parts.length ? parts.join(', ') : null;
}

/** The dice a reduction takes from fire and melee, worded "Fire into it: infantry −1. Melee into it: …". */
function reductionLines(r: Reductions, dir: 'into' | 'out of'): TipLine[] {
  const fire = armsText(r.fire);
  const melee = armsText(r.melee);
  return [
    ...(fire ? [combat(`Fire ${dir} it: ${fire}`)] : []),
    ...(melee ? [combat(`Melee ${dir} it: ${melee}`)] : []),
  ];
}

const ARM_LIST = (arms: readonly string[]) => arms.join(' and ');

/** The effect lines of terrain type `t` from the table. */
function lines(t: TerrainType): TipLine[] {
  const st = TERRAIN_STATS[t];
  const out: TipLine[] = [];
  if (st.impassable) out.push(move('Impassable'));
  else {
    if (st.stopsOnEntry) out.push(move('Stops every unit and lone leader entering it'));
    if (st.closedTo.length) out.push(move(`Closed to ${ARM_LIST(st.closedTo)}`));
    if (st.noBattleAfterEntering === 'all') out.push(move('A unit that enters it may not battle that turn'));
    if (st.noBattleAfterEntering === 'notLight') out.push(move('After entering it, only light troops may battle that turn'));
  }
  out.push(...reductionLines(st.into, 'into'), ...reductionLines(st.out, 'out of'));
  if (st.noMeleeInto) out.push(combat('No melee into it'));
  if (st.hill) {
    const up = armsText(HILL_RELATION.uphill.melee);
    out.push(combat(`Melee up onto it: ${up ?? 'no change'}; fire up onto it: ${armsText(HILL_RELATION.uphill.fire) ?? 'no change'}`));
  }
  if (!st.squareAllowed && !st.impassable) out.push(combat('No square can be formed here'));
  if (st.cancelsCavalryCharge) out.push(combat('Cancels the card dice of a cavalry charge into or out of it'));
  // A hill blocks through its own rule (sight.ts), not `blocksSight` (RR §8.3).
  out.push(sight(st.hill ? 'Blocks line of sight beyond it, except across one connected hill'
    : st.blocksSight ? 'Blocks line of sight' : 'Does not block line of sight'));
  return out;
}

/** The field works on a hex: the protected hexsides as the viewer sees them, and what they take from a battle. */
function worksLines(mask: number, flipped: boolean): TipLine[] {
  return [
    combat(`Field works along ${worksSidesText(mask, flipped).replace(/^its /, '')}`),
    ...reductionLines(WORKS.into, 'into'),
    ...reductionLines(WORKS.out, 'out of'),
    combat('A unit crossing them stops there; infantry and artillery defending behind them ignore 1 flag'),
  ];
}

/**
 * The terrain block of the tooltip for hex `h`, or null on open ground without works and off the board. `flipped`: the human
 * commands the top army, so the works' sides turn by 180°.
 */
export function terrainTip(s: GameState, h: HexId, flipped: boolean): TerrainTip | null {
  const t = terrainAt(s, h);
  const mask = worksMask(s, h);
  if ((t === 'plain' || t === 'void') && !mask) return null;
  const own = t === 'plain' || t === 'void' ? [] : lines(t);
  const name = t === 'plain' ? 'Field works' : t === 'void' ? 'Off board' : mask ? `${TERRAIN_STATS[t].name} with field works` : TERRAIN_STATS[t].name;
  return { name, t, works: mask !== 0, lines: [...own, ...(mask ? worksLines(mask, flipped) : [])] };
}
