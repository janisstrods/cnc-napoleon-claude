// Expected value of one battle, from the attacker's side: the engine's dice counts (`fireDice`, `meleeDice`) fed through the
// per-die odds of odds.ts, then the engine's own flag-ignore and retreat queries. No game RNG and no forced dice are
// touched: every number is an exact expectation over the dice, so estimates are pure and repeatable.
//
// Stand-only until Task 4a: the defender never retires, forms square or strikes first, and no gun adds dice.
import {
  attachedLeader, bannerTotal, fireDice, meleeDice, retreatDistance, retreatOptions, statsOf,
  type GameState, type HexId, type Side, type StrikeRole, type Unit,
} from '../engine';
// `flagIgnores` is exported by the engine's resolve module but not by its index barrel (reported to the controller).
import { flagIgnores } from '../engine/resolve';
import type { Occ } from './board';
import { dieOdds, pAnySabre, rollDist, type DieOdds } from './odds';
import { LEADER_VALUE, bannersWorth, unitValue, type Weights } from './values';

/** What an estimate needs besides the state: the occupancy table, weights, whose view, the attacker's movement and role. */
export interface EstCtx {
  occ: Occ;
  W: Weights;
  viewer: Side;
  /** Hexes the attacker moved this turn (the engine's `DiceCtx.moved`). */
  moved: number;
  role: StrikeRole;
  /** True inside a simulation on a `determinize`d clone: the opponent's sampled hand is read, not weighted by odds (Task 4a). */
  determinised: boolean;
}

/** The expected result of one battle for the side that makes it. */
export interface Outcome {
  /** Value to the attacker in banners, with the expected battle back subtracted. */
  ev: number;
  /** Expected blocks the target loses to the attacker's roll. */
  expHits: number;
  pElim: number;
  /** The target leaves its hex alive. */
  pRetreat: number;
  /** The target's hex falls empty (eliminated or retreated). */
  pVacate: number;
  /** Value to the defender of the expected battle back (already subtracted from `ev`). */
  backLoss: number;
  /** Expected blocks the attacker loses to the battle back. */
  backHits: number;
}

/** Cost of displacing a unit, per hex it retreats (it is out of position and its neighbours move up). */
const DISPLACE = 0.07;

const ZERO: Outcome = { ev: 0, expHits: 0, pElim: 0, pRetreat: 0, pVacate: 0, backLoss: 0, backHits: 0 };

export interface FlagResult {
  /** Blocks lost to a blocked retreat (RR §10.1: a loss per hex short). */
  lost: number;
  vacates: boolean;
  /** Hexes the unit retreats (0 when it stays). */
  hexes: number;
}

/**
 * What `flags` retreat flags do to `target`: it ignores as many as `flagIgnores` allows (the engine's query), then picks the
 * cheapest `retreatOptions` option (fewest blocks lost, then the shortest path). `leaderOk` is false when its leader was just
 * killed (he can no longer ignore a flag). Memoised per flag count in `memo` when one is given.
 */
export function flagOutcome(
  s: GameState, target: Unit, attacker: Unit, flags: number, o: { leaderOk?: boolean; memo?: Map<number, FlagResult> } = {},
): FlagResult {
  const leaderOk = o.leaderOk ?? true;
  const key = flags * 2 + (leaderOk ? 1 : 0);
  const known = o.memo?.get(key);
  if (known) return known;
  const accepted = flags - Math.min(flags, flagIgnores(s, target, attacker, leaderOk));
  let out: FlagResult = { lost: 0, vacates: false, hexes: 0 };
  if (accepted > 0) {
    const dist = retreatDistance(statsOf(s, target), accepted);
    if (target.square !== undefined) out = { lost: dist, vacates: false, hexes: 0 };
    else {
      const best = retreatOptions(s, target, dist).reduce((a, b) => (b.losses < a.losses || (b.losses === a.losses && b.path.length < a.path.length) ? b : a));
      out = { lost: best.losses, vacates: best.path.length > 0, hexes: best.path.length };
    }
  }
  o.memo?.set(key, out);
  return out;
}

/**
 * P(the attached leader dies in the casualty check after his unit took a hit): 2 dice and 2 sabres when the unit survives,
 * 1 die and a sabre when it was eliminated.
 */
// approximates RR §3.4 (engine: leaderCasualtyCheck)
export function leaderCheckP(eliminated: boolean): number {
  const sabre = pAnySabre(1);
  return eliminated ? sabre : sabre * sabre;
}

/** Banners the scorer of a kill gains, priced by where its total stands (`bannersWorth`). */
function bannerValue(s: GameState, scorer: Side): number {
  return bannersWorth(bannerTotal(s, scorer), 1, s.bannersToWin);
}

interface Strike {
  /** Value to `scorer` of the damage, banners and displacement. */
  value: number;
  expHits: number;
  pElim: number;
  pRetreat: number;
  /** P(the victim ends alive in place) by its remaining blocks (it then battles back). */
  stay: Map<number, number>;
}

/**
 * One roll of `dice` dice at `victim` by `source`: the value to `scorer` of the blocks lost (the unit's value falls with its
 * blocks), the elimination's banner, the flag result (blocks lost to a blocked retreat, `DISPLACE` per hex retreated) and the
 * attached leader's casualty check. `ignore` hits are dropped first (the Cuirassier).
 */
function strike(s: GameState, ec: EstCtx, victim: Unit, source: Unit, dice: number, o: DieOdds, ignore: number, scorer: Side): Strike {
  const out: Strike = { value: 0, expHits: 0, pElim: 0, pRetreat: 0, stay: new Map() };
  const dist = rollDist(dice, o);
  const width = dice + 1;
  const blocks = victim.blocks;
  const leader = attachedLeader(s, victim, ec.occ);
  const banner = bannerValue(s, scorer);
  const leaderLoss = LEADER_VALUE + banner;
  const worth = (k: number): number => unitValue(s, { key: victim.key, blocks: k });
  const memo = new Map<number, FlagResult>();
  const stayAt = (r: number, p: number): void => void out.stay.set(r, (out.stay.get(r) ?? 0) + p);
  for (let h = 0; h <= dice; h++) {
    for (let f = 0; h + f <= dice; f++) {
      const p = dist[h * width + f];
      if (p <= 0) continue;
      // approximates RR §2 ignoresInfantryFireHits (engine: fireAttack)
      const hits = Math.max(0, h - ignore);
      if (hits >= blocks) {
        out.expHits += p * blocks;
        out.value += p * (worth(blocks) + banner + (leader ? leaderCheckP(true) * leaderLoss : 0));
        out.pElim += p;
        continue;
      }
      out.expHits += p * hits;
      const left = blocks - hits;
      const checked = hits > 0;
      let base = worth(blocks) - worth(left);
      const killP = leader && checked ? leaderCheckP(false) : 0;
      if (killP > 0) base += killP * leaderLoss;
      out.value += p * base;
      for (const [bp, leaderOk] of killP > 0 ? [[killP, false], [1 - killP, true]] as const : [[1, true]] as const) {
        const q = p * bp;
        if (f === 0) {
          stayAt(left, q);
          continue;
        }
        const fo = flagOutcome(s, victim, source, f, { leaderOk, memo });
        if (fo.lost >= left) {
          out.value += q * (worth(left) + banner + (leader && !checked ? leaderCheckP(true) * leaderLoss : 0));
          out.pElim += q;
          continue;
        }
        let v = worth(left) - worth(left - fo.lost);
        if (fo.lost > 0 && leader && !checked) v += leaderCheckP(false) * leaderLoss;
        if (fo.vacates) {
          v += DISPLACE * fo.hexes;
          out.pRetreat += q;
        } else stayAt(left - fo.lost, q);
        out.value += q * v;
      }
    }
  }
  return out;
}

/** Expected result of `firer` firing at the unit on `targetHex` (no battle back). */
export function fireEstimate(s: GameState, firer: Unit, targetHex: HexId, ec: EstCtx): Outcome {
  const target = ec.occ.unit[targetHex];
  if (!target) return ZERO;
  const dice = fireDice(s, firer, targetHex, { role: 'attack', moved: ec.moved });
  if (dice <= 0) return ZERO;
  const fst = statsOf(s, firer);
  const tst = statsOf(s, target);
  const ignore = fst.arm === 'infantry' ? tst.ignoresInfantryFireHits : 0;
  const g = strike(s, ec, target, firer, dice, dieOdds('fire', fst, tst.arm), ignore, firer.side);
  return { ev: g.value, expHits: g.expHits, pElim: g.pElim, pRetreat: g.pRetreat, pVacate: g.pElim + g.pRetreat, backLoss: 0, backHits: 0 };
}

/**
 * Expected result of `attacker` in melee against the unit on `targetHex`, the expected battle back subtracted: the defender
 * rolls its `'back'` dice, at its remaining blocks, when it survives in place. Until Task 4a it always stands.
 */
export function meleeEstimate(s: GameState, attacker: Unit, targetHex: HexId, ec: EstCtx): Outcome {
  const defender = ec.occ.unit[targetHex];
  if (!defender) return loneLeaderEstimate(s, attacker, targetHex, ec);
  const ast = statsOf(s, attacker);
  const dst = statsOf(s, defender);
  const dice = meleeDice(s, attacker, defender, { role: ec.role, moved: ec.moved, declared: true });
  const g = strike(s, ec, defender, attacker, Math.max(0, dice), dieOdds('melee', ast, dst.arm), 0, attacker.side);
  let backLoss = 0;
  let backHits = 0;
  const backOdds = dieOdds('melee', dst, ast.arm);
  for (const [remaining, p] of g.stay) {
    // the engine rolls the battle back at the defender's blocks after the hits (and a failed retreat's losses)
    const back = meleeDice(s, { ...defender, blocks: remaining }, attacker, { role: 'back', moved: 0 });
    if (back <= 0) continue;
    const b = strike(s, ec, attacker, defender, back, backOdds, 0, defender.side);
    backLoss += p * b.value;
    backHits += p * b.expHits;
  }
  return { ev: g.value - backLoss, expHits: g.expHits, pElim: g.pElim, pRetreat: g.pRetreat, pVacate: g.pElim + g.pRetreat, backLoss, backHits };
}

/** Melee against a lone leader: any sabre kills him (a banner and his worth), otherwise he retreats; no battle back. */
export function loneLeaderEstimate(s: GameState, attacker: Unit, leaderHex: HexId, ec: EstCtx): Outcome {
  const leader = ec.occ.leader[leaderHex];
  if (!leader) return ZERO;
  const dice = meleeDice(s, attacker, leader, { role: ec.role, moved: ec.moved, declared: true });
  if (dice <= 0) return ZERO;
  const kill = pAnySabre(dice);
  return { ev: kill * (LEADER_VALUE + bannerValue(s, attacker.side)), expHits: kill, pElim: kill, pRetreat: 1 - kill, pVacate: 1, backLoss: 0, backHits: 0 };
}
