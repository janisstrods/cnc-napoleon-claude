// Valuation constants and personality-derived weights. One banner ~ 1.0 point.
import { UNIT_STATS, baseFireDice, statsOf, type GameState, type Unit, type UnitStats } from '../engine';
import type { Personality } from './personality';

export const WIN_SCORE = 100;
/** Value of a leader on the board (in banners); Task 5 prices attachment and traits on top of it. */
export const LEADER_VALUE = 0.4;
/** Cap on the value of the winning banner used in risk estimates (they are approximate). */
const WINNING_BANNER = 6;

/** A full-strength French Line unit is worth this many banners of fighting power; every other row is scaled to it. */
const LINE_WORTH = 0.7;
/** Value of one hex of the best movement option, in dice (a hex that forbids battle afterwards counts half). */
const MOVE_DIE = 0.3;
/** Value of one ignored flag, in dice. */
const FLAG_DIE = 0.8;
/** Value of each extra hex a retreat flag costs beyond the first, in dice (militia flee three). */
const RETREAT_DIE = 0.8;
/** A unit that cannot score hits with sabres loses this much in melee, in dice. */
const NO_SABRE_DIE = 0.6;
/** A unit makes one battle a turn, fire or melee: the weaker of the two adds only this share. */
const SECOND_ARM = 0.35;
/** Cavalry melee is worth more than its dice: it breaks through and gets bonus melees. */
const CAVALRY_SHOCK = 1.15;
/** Cavalry and artillery are hard to hit by fire (one face in six), so each block lasts longer. */
const SOFT_TARGET = 1.15;
/** A gun's reach beyond distance 2, in dice per hex. */
const GUN_REACH = 0.3;

/** A live unit is always worth something, however poor its row. */
const MIN_POWER = 0.5;

/** The share of an unwounded unit's staying power that `blocks` blocks still carry: a worn unit dies to the next hit. */
function staying(blocks: number): number {
  return blocks / (blocks + 2);
}

/** Dice of fighting power (unnormalised): the better of fire and melee plus a share of the other, movement, flag resistance, staying power. */
function rawPower(st: UnitStats, blocks: number): number {
  if (blocks <= 0) return 0;
  const range = st.fire.kind === 'none' ? 0 : st.fire.range;
  // Fire needs a distance of 2 or more (distance 1 is melee); the mean runs over 2..range.
  let fire = 0;
  for (let d = 2; d <= range; d++) fire += baseFireDice(st, blocks, d, 0);
  if (range >= 2) fire /= range - 1;
  if (st.fire.kind === 'artillery') fire += GUN_REACH * (range - 2);
  // Melee: one die per block plus the rule's plus (and half the plus against infantry, the likelier target), or the
  // artillery cell, which is the fire row at distance 1.
  let melee = st.melee.kind === 'artillery' ? baseFireDice(st, blocks, 1, 0) : blocks + st.melee.plus + 0.5 * st.melee.vsInfantry;
  if (st.arm === 'cavalry') melee *= CAVALRY_SHOCK;
  const reach = st.move.reduce((m, o) => Math.max(m, o.battle ? o.max : o.max / 2), 0);
  const grit = FLAG_DIE * st.flagIgnore - RETREAT_DIE * (st.retreat.first - 1) - (st.sabreHits ? 0 : NO_SABRE_DIE);
  const power = Math.max(fire, melee) + SECOND_ARM * Math.min(fire, melee) + MOVE_DIE * reach + grit;
  return Math.max(MIN_POWER, power) * staying(blocks) * (st.arm === 'infantry' ? 1 : SOFT_TARGET);
}

const NORM = LINE_WORTH / rawPower(UNIT_STATS['FR/LN'], 4);

/**
 * Fighting power of a unit of this row with `blocks` blocks, in banners. Fire is the mean of the engine's standing dice
 * over every distance in range; melee is the blocks plus the row's bonus (or the artillery cell). A worn infantry unit
 * loses value faster than linearly: its fire dice shrink and the next hit removes it.
 */
export function rowValue(st: UnitStats, blocks: number): number {
  return rawPower(st, blocks) * NORM;
}

export function unitValue(s: Pick<GameState, 'scenario'>, u: Pick<Unit, 'key' | 'blocks'>): number {
  return rowValue(statsOf(s, u), u.blocks);
}

/** The marginal value of the next block this unit loses (its whole worth at one block). */
export function blockValue(s: Pick<GameState, 'scenario'>, u: Pick<Unit, 'key' | 'blocks'>): number {
  const st = statsOf(s, u);
  return rowValue(st, u.blocks) - rowValue(st, u.blocks - 1);
}

/** Value of reaching banner number k (the k-th banner) out of T. */
export function bannerStep(k: number, T: number): number {
  if (k >= T) return WINNING_BANNER;
  const x = k / T;
  return 1 + 0.9 * x * x;
}

/** Value of holding `b` banners out of T: the steps below the winning one (a win is priced by WIN_SCORE). */
export function bannerScore(b: number, T: number): number {
  let v = 0;
  for (let k = 1; k <= b && k < T; k++) v += bannerStep(k, T);
  return v;
}

/** Value of `n` more banners for a side whose banner total is `total` (the steps total + 1 .. total + n). */
export function bannersWorth(total: number, n: number, T: number): number {
  let v = 0;
  for (let k = 1; k <= n; k++) v += bannerStep(total + k, T);
  return v;
}

export interface Weights {
  /** Weight on own expected losses. */
  riskSelf: number;
  /** Weight on threats posed to the enemy. */
  riskEnemy: number;
  /** Pull per hex towards the enemy and objectives. */
  advance: number;
  /** Multiplier on cavalry advance and charge values. */
  cavalryDash: number;
  /** Per supporting neighbour. */
  support: number;
  /** No friend within 2 hexes. */
  isolated: number;
  /** Attached leader on a unit adjacent to the enemy. */
  leaderFront: number;
  /** A gun standing with targets in range and sight. */
  gunPatience: number;
  /** Added to the form-square choice. */
  squareBias: number;
  /** Minimum expected value to declare an attack. */
  attackThreshold: number;
  /** Minimum expected value for a bonus melee or breakthrough. */
  bonusThreshold: number;
  /** Scale on card keep values. */
  retention: number;
  /** Extra keep value of First Strike. */
  firstStrikeReserve: number;
}

export function weightsFor(p: Pick<Personality, 'aggression' | 'caution' | 'cunning' | 'dash'>): Weights {
  const { aggression: a, caution: c, cunning: u, dash: d } = p;
  return {
    riskSelf: 0.55 + 0.6 * c,
    riskEnemy: 0.4 + 0.45 * a,
    advance: 0.006 + 0.03 * a,
    cavalryDash: 1 + 0.3 * d,
    support: 0.025 + 0.035 * c,
    isolated: 0.015 + 0.035 * c,
    leaderFront: 0.035 + 0.03 * a,
    gunPatience: 0.02 + 0.04 * u,
    squareBias: 0.05 * (c - 0.4),
    attackThreshold: 0.04 - 0.1 * a,
    bonusThreshold: 0.02 - 0.08 * a,
    retention: 0.6 + 0.8 * u,
    firstStrikeReserve: 0.1 + 0.2 * c,
  };
}

/** The Veteran's weights: the neutral set. */
export const NEUTRAL_W: Weights = weightsFor({ aggression: 0.55, caution: 0.55, cunning: 0.55, dash: 0.5 });
