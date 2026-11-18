// Expected value of one battle, from the attacker's side: the engine's dice counts (`fireDice`, `meleeDice`) fed through the
// per-die odds of odds.ts, then the engine's own flag-ignore and retreat queries. No game RNG and no forced dice are
// touched: every number is an exact expectation over the dice, so estimates are pure and repeatable.
//
// A melee goes through the defender's reaction model (reactions.ts): stand, Retire and Reform, form square (Task 4a) or
// First Strike (Task 4b), with the Combined Arms guns the attacker adds (`bestGuns`, carried in `MeleeCtx.artillery` as the
// engine does). The value of following up into a vacated hex (take ground, breakthrough and a cavalry bonus-melee
// prospect) is part of every melee's `ev`.
import {
  artilleryShares, attachedLeader, bannerTotal, breakRule, handShrinkRule, combinedArmsCandidates, escapeDice, fireDice, leaderRetreatOptions, meleeDice, neighbours, noBattleAfterEntering, onBaseline,
  other,
  passableFor, retreatDistance, retreatOptions, squareFirstApplies, statsOf, unitById,
  type DefendChoice, type GameState, type HexId, type Leader, type MeleeCtx, type Side, type StrikeRole, type Unit,
} from '../engine';
// `flagIgnores` is exported by the engine's resolve module but not by its index barrel (reported to the controller).
import { flagIgnores } from '../engine/resolve';
import { occOf, type Occ } from './board';
// meanHandValue reads only the viewer's own hand. cardsense imports evaluate, which imports this module: a cycle that is safe
// because every use of an import below is inside a function, called after all three modules have loaded.
import { meanHandValue } from './cardsense';
import { dieOdds, pAnySabre, rollDist, type DieOdds } from './odds';
import { bestGuns, firstStrikeCost, reactionsFor, squareCost } from './reactions';
import { assumeOppHand, oppHoldsP } from './view';
import { CARD_VALUE, LEADER_VALUE, bannerStep, bannersWorth, unitValue, type Weights } from './values';

/**
 * The opponent's hand assumed with and without a First Strike (blind clones from `assumeOppHand`) and P(it holds one): the
 * only hands with which the engine's defend options are asked for an opponent defender outside a simulation (M-8).
 */
export interface OppHands {
  holdsFS: GameState;
  noFS: GameState;
  pFS: number;
}

interface EstBase {
  occ: Occ;
  W: Weights;
  viewer: Side;
  /**
   * The value of a card of the viewer's own hand, in banners (`meanHandValue`, Rally's expected gain included), worked out once
   * per root decision by `makeEstCtx`. It prices the viewer's own squares only (`squareCost`, `squareHoldCost`): the opponent's
   * hand is never read, so its squares are priced at the mean card (`CARD_VALUE`).
   */
  cardValue: number;
  /** Hexes the attacker moved this turn (the engine's `DiceCtx.moved`). */
  moved: number;
  role: StrikeRole;
  /** Guns already joined to the attacker's first melee: spent, so its bonus-melee prospect may not add them again (R4). */
  spentGuns?: readonly string[];
}

/**
 * What an estimate needs besides the state: the occupancy table, weights, whose view, the attacker's movement and role, and
 * how the opponent's hand is known. Either `determinised` (inside a simulation on a `determinize`d clone: the sampled hand
 * is read) or carrying `oppHands`, built once per root decision by `makeEstCtx`; a context with neither is a type error.
 */
export type EstCtx = EstBase & ({ determinised: true; oppHands?: undefined } | { determinised: false; oppHands: OppHands });

/** The estimate context of one root decision for `me`: the occupancy table and the assumed opponent hands, built once. */
export function makeEstCtx(s: GameState, me: Side, W: Weights): EstCtx {
  return {
    occ: occOf(s), W, viewer: me, cardValue: meanHandValue(s, me, W), moved: 0, role: 'attack', determinised: false,
    oppHands: { holdsFS: assumeOppHand(s, me, 'firstStrike', true), noFS: assumeOppHand(s, me, 'firstStrike', false), pFS: oppHoldsP(s, me, 'firstStrike') },
  };
}

/** The expected result of one battle for the side that makes it. */
export interface Outcome {
  /** Value to the attacker in banners, with the expected battle back subtracted. */
  ev: number;
  /** Expected blocks the target loses to the attacker's roll. */
  expHits: number;
  pElim: number;
  /** The target leaves its hex alive (retreat or Retire and Reform). */
  pRetreat: number;
  /** The target's hex falls empty (eliminated or retreated). */
  pVacate: number;
  /** Value to the defender of the expected battle back, or of a square's first roll (already subtracted from `ev`). */
  backLoss: number;
  /** Expected blocks the attacker loses to the battle back or to a square's first roll. */
  backHits: number;
}

/** Cost of displacing a unit, per hex it retreats (it is out of position and its neighbours move up). */
const DISPLACE = 0.07;
/** A stranded leader who gets back safely is still out of position (Ancients measured ~0.03–0.04). */
const LEADER_SHIFT = 0.035;
/** Value of taking ground into a vacated hex (infantry, or cavalry after a bonus melee). */
const TAKE_GROUND = 0.03;
/** Value of a cavalry breakthrough (the vacated hex and an optional extra hex), before any bonus melee. */
const BREAKTHROUGH = 0.05;

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
 * killed (he can no longer ignore a flag). `bounce`: a square's flags against cavalry, none of which may be ignored.
 * Memoised per flag count in `memo` when one is given (one memo per `bounce` setting).
 */
export function flagOutcome(
  s: GameState, target: Unit, attacker: Unit, flags: number, o: { leaderOk?: boolean; memo?: Map<number, FlagResult>; bounce?: boolean } = {},
): FlagResult {
  const leaderOk = o.leaderOk ?? true;
  const key = flags * 2 + (leaderOk ? 1 : 0);
  const known = o.memo?.get(key);
  if (known) return known;
  // approximates RR §10.3 bounce (engine: applyOutcome with bounce, from squareFightsFirst)
  const accepted = o.bounce ? flags : flags - Math.min(flags, flagIgnores(s, target, attacker, leaderOk));
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

/**
 * The cards a `handShrink` rule of `loser` takes when its enemy gains `n` permanent banners as its k-th next ones onward
 * (one a banner while the hand is above the floor), at `CARD_VALUE` each.
 */
// approximates RR §15.8 handShrink, S33 (engine: shrinkHand)
function shrinkValue(s: GameState, loser: Side, n: number, k = 1): number {
  const r = handShrinkRule(s, loser);
  if (!r) return 0;
  return CARD_VALUE * Math.max(0, Math.min(n, s.special.handSize[loser] - r.floor - (k - 1)));
}

/** The value to `scorer` of its k-th next banner (k = 1: the next one), priced by where its total stands, a hand card it takes included. */
function bannerAt(s: GameState, scorer: Side, k: number): number {
  return bannersWorth(bannerTotal(s, scorer) + k - 1, 1, s.bannersToWin) + shrinkValue(s, other(scorer), 1, k);
}

/**
 * Banners the elimination of `victim` scores for its enemy: 1, or the weight of a `killWeight` objective of the enemy's side
 * against the victim's arm, `first` while its public kill count (`special.objState`) is 0 and `later` afterwards.
 */
// approximates RR §13.2, §13.4, R65 (engine: scoreKill)
export function killBanners(s: GameState, victim: Pick<Unit, 'key' | 'side'>): number {
  const scorer = other(victim.side);
  const arm = statsOf(s, victim).arm;
  let n = 1;
  s.scenario.objectives.forEach((o, i) => {
    if (o.kind === 'killWeight' && o.side === scorer && o.enemyArm === arm) n = (s.special.objState[i]?.count ?? 0) === 0 ? o.first : o.later;
  });
  return n;
}

/** Does eliminating `victim` complete a `suddenDeath` count of its enemy (the `need`-th unit of its keys): an instant win? */
// approximates RR §15.8 suddenDeath, S32 (engine: scoreKill)
export function suddenDeathBy(s: GameState, victim: Pick<Unit, 'key' | 'side'>): boolean {
  const scorer = other(victim.side);
  return s.scenario.objectives.some((o, i) => o.kind === 'suddenDeath' && o.side === scorer && o.keys.includes(victim.key) && (s.special.objState[i]?.count ?? 0) + 1 >= o.need);
}

/** Does eliminating `victim` win the battle for its enemy: its banner target reached, or a sudden-death count completed? */
export function eliminationWins(s: GameState, victim: Pick<Unit, 'key' | 'side'>): boolean {
  return bannerTotal(s, other(victim.side)) + killBanners(s, victim) >= s.bannersToWin || suddenDeathBy(s, victim);
}

/**
 * The worth of the units a `breakOnLosses` rule of the victim's side removes when eliminating `victim` is its `losses`-th loss
 * of the rule's keys: every other unit of those keys still on the board (the removals score no banners, S30). The losses
 * before it carry nothing extra here: the risk terms price them through the remaining units, whose value then rises.
 */
// approximates RR §15.8 breakOnLosses, S30 (engine: breakOnLosses in casualties)
function breakValue(s: GameState, victim: Pick<Unit, 'key' | 'side'> & Partial<Pick<Unit, 'id'>>): number {
  const r = breakRule(s, victim.side);
  if (!r || !r.keys.includes(victim.key)) return 0;
  const alive = s.units.filter((u) => u.side === victim.side && r.keys.includes(u.key));
  if (r.start - alive.length + 1 !== r.losses) return 0;
  let v = 0;
  let skipped = false;
  for (const u of alive) {
    // the victim itself is priced by its blocks elsewhere (without its id, one unit of its key stands in for it)
    if (!skipped && (victim.id === undefined ? u.key === victim.key : u.id === victim.id)) {
      skipped = true;
      continue;
    }
    v += unitValue(s, u);
  }
  return v;
}

/**
 * The value to `scorer` of eliminating `victim`: the banners it scores (`killBanners`) as its k-th next banners onward, a hand
 * card each where a `handShrink` rule takes one, the win itself when it completes a `suddenDeath` count, and the units a
 * `breakOnLosses` rule then removes. The one pricing point of an elimination for the estimates, the planner and the evaluation.
 */
export function bannerValue(s: GameState, scorer: Side, victim: Pick<Unit, 'key' | 'side'> & Partial<Pick<Unit, 'id'>>, k = 1): number {
  const T = s.bannersToWin;
  const n = killBanners(s, victim);
  let v = bannersWorth(bannerTotal(s, scorer) + k - 1, n, T) + shrinkValue(s, victim.side, n, k);
  // the winning banner's step: the value the estimates give a win (a won game is priced by WIN_SCORE in the evaluation)
  if (suddenDeathBy(s, victim)) v = Math.max(v, bannerStep(T, T));
  return v + breakValue(s, victim);
}

/** A leader left alone on his hex: the chance he dies on the way back and whether that way leads off the map. */
export interface LeaderAlone {
  pDie: number;
  offBoard: boolean;
}

/** Ranking of a stranded leader's ways back by their cost to his owner (a banner taken as 1). */
const aloneCost = (a: LeaderAlone): number => a.pDie * (LEADER_VALUE + 1) + (1 - a.pDie) * (a.offBoard ? LEADER_VALUE : LEADER_SHIFT);

/**
 * A leader left alone (his unit eliminated, or he was beaten in melee alone) retreats: from his own baseline he leaves the
 * map; otherwise his owner takes the cheapest of `leaderRetreatOptions` (the engine's query), each enemy unit on the path an
 * escape roll that kills him on a sabre (`escapeDice`), a path that cannot get out at all fatal.
 */
// approximates RR §11.2–§11.4 (engine: leaderLosesUnit)
export function leaderAloneRisk(s: GameState, l: Leader): LeaderAlone {
  if (onBaseline(l.hex, l.side)) return { pDie: 0, offBoard: true };
  let best: LeaderAlone = { pDie: 1, offBoard: false };
  for (const o of leaderRetreatOptions(s, l)) {
    let live = o.eliminated ? 0 : 1;
    for (const id of o.escapes) {
      const e = unitById(s, id);
      if (e) live *= 1 - pAnySabre(escapeDice(s, e));
    }
    const a: LeaderAlone = { pDie: 1 - live, offBoard: o.offBoard };
    if (aloneCost(a) < aloneCost(best)) best = a;
  }
  return best;
}

/** Value to `scorer` of an enemy leader left alone; his death would be its k-th next banner. */
function aloneValue(s: GameState, l: Leader, scorer: Side, k: number): number {
  const a = leaderAloneRisk(s, l);
  return a.pDie * (LEADER_VALUE + bannerAt(s, scorer, k)) + (1 - a.pDie) * (a.offBoard ? LEADER_VALUE : LEADER_SHIFT);
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
 * attached leader's casualty check, and his retreat when he is left alone. `ignore` hits are dropped first (the
 * Cuirassier). `bounce`: none of the flags may be ignored (a square's roll at cavalry). `memo`: the flag results of this victim
 * against this source, which strikes that share the pair may share (`flagOutcome` keys it by flag count and the leader's state).
 */
function strike(
  s: GameState, ec: EstCtx, victim: Unit, source: Unit, dice: number, o: DieOdds, ignore: number, scorer: Side, bounce = false,
  memo: Map<number, FlagResult> = new Map(),
): Strike {
  const out: Strike = { value: 0, expHits: 0, pElim: 0, pRetreat: 0, stay: new Map() };
  const dist = rollDist(dice, o);
  const width = dice + 1;
  const blocks = victim.blocks;
  const leader = attachedLeader(s, victim, ec.occ);
  const banner = bannerAt(s, scorer, 1);
  // the elimination's banners, by the victim's arm and the scenario's kill weights
  const kill = bannerValue(s, scorer, victim);
  // the leader's kill while his unit survives is the next banner
  const leaderLoss = LEADER_VALUE + banner;
  // a winning elimination ends the game before the casualty check (applyOutcome returns on the winner)
  const killN = killBanners(s, victim);
  const elimWins = eliminationWins(s, victim);
  let alone: number | undefined;
  /**
   * The leader's part of his unit's elimination: the check (`checkNow`: 1 die) and, if he survives it, his retreat alone;
   * his death is the banner after the elimination's `killN`.
   */
  const elimLeader = (checkNow: boolean): number => {
    if (!leader || elimWins) return 0;
    const pK = checkNow ? leaderCheckP(true) : 0;
    alone ??= aloneValue(s, leader, scorer, 1 + killN);
    return pK * (LEADER_VALUE + bannerAt(s, scorer, 1 + killN)) + (1 - pK) * alone;
  };
  // the victim's worth at every block count it can have, worked out once per strike (the roll's loops read it per outcome)
  const worths: number[] = [];
  for (let k = 0; k <= blocks; k++) worths.push(unitValue(s, { key: victim.key, blocks: k }));
  const worth = (k: number): number => worths[k];
  const stayAt = (r: number, p: number): void => void out.stay.set(r, (out.stay.get(r) ?? 0) + p);
  for (let h = 0; h <= dice; h++) {
    for (let f = 0; h + f <= dice; f++) {
      const p = dist[h * width + f];
      if (p <= 0) continue;
      // approximates RR §2 ignoresInfantryFireHits (engine: fireAttack)
      const hits = Math.max(0, h - ignore);
      if (hits >= blocks) {
        out.expHits += p * blocks;
        out.value += p * (worth(blocks) + kill + elimLeader(true));
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
        const fo = flagOutcome(s, victim, source, f, { leaderOk, memo, bounce });
        if (fo.lost >= left) {
          // eliminated by a blocked retreat: a leader killed by the hit is gone; otherwise he is checked now if not yet
          out.value += q * (worth(left) + kill + (leaderOk ? elimLeader(!checked) : 0));
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

/** What following up into a vacated hex is worth to the attacker. */
export interface Advance {
  /** The engine would let it enter (take ground or break through). */
  allowed: boolean;
  /** A cavalry unit would then be offered a bonus melee. */
  bonus: boolean;
  /** Value to the attacker, given the hex is vacated (0 when not allowed; never negative: the move is optional). */
  value: number;
}

const NO_ADVANCE: Advance = { allowed: false, bonus: false, value: 0 };

/** A cavalry unit's bonus-melee prospect from a vacated hex: whether a target exists, and the best target's value. */
interface Prospect {
  bonus: boolean;
  best: number;
}

/**
 * Prospects already worked out, per board (`ec.occ` is rebuilt for every position, so a cached prospect never outlives the
 * position it was computed on) and per (attacker, its blocks, vacated hex, hexes moved, guns already spent). One cavalry
 * melee is estimated against several reactions and from several attackers' positions; the prospect is the same each time.
 */
const prospects = new WeakMap<Occ, { W: Weights; known: Map<string, Prospect> }>();

/**
 * The attacker's move into the vacated `hex` after its melee (`ec.role`: 'attack' or 'bonus'), and a cavalry unit's bonus
 * melee from there: no gun, no unit in square, nothing after entering a stop hex this turn, and the hex must be passable for
 * its arm; cavalry after its first melee breaks through and may then attack any adjacent enemy it has dice against (not from
 * terrain that forbids battle after entering, not twice). The prospect is the best bonus target's estimate from the new
 * hex, counted when it clears `W.bonusThreshold` (the AI's own bar for taking one).
 */
// approximates RR §9.7, §9.8 (engine: afterMelee and meleeAttack's afterAndBonus)
// Known gap: impetuous cavalry (R82, RR §14.15, the `impetuousCavalry` side rule) must advance and must take the extra hex
// toward the enemy baseline, so for those units the "optional, never negative" floor is wrong. The forced move's exposure is
// priced by its callers, as a cost on the attack (`impetuousCost`, evaluate.ts): in the threats (Task 5) and in move scoring
// (Task 6b, moves.ts).
export function takeGround(s: GameState, attacker: Unit, hex: HexId, ec: EstCtx): Advance {
  const st = statsOf(s, attacker);
  const op = s.turn.ordered[attacker.id];
  if (st.arm === 'artillery' || attacker.square !== undefined || op?.stopEntered || !passableFor(s, hex, st.arm)) return NO_ADVANCE;
  if (st.arm !== 'cavalry' || ec.role === 'bonus') return { allowed: true, bonus: false, value: TAKE_GROUND };
  let value = BREAKTHROUGH;
  let bonus = false;
  if (!op?.bonusMeleeDone && !noBattleAfterEntering(s, hex, st)) {
    let entry = prospects.get(ec.occ);
    if (!entry || entry.W !== ec.W) prospects.set(ec.occ, (entry = { W: ec.W, known: new Map() }));
    const known = entry.known;
    // the rest of the context shapes the estimates too: whose view, its card value and the assumed First Strike odds
    const key = `${attacker.id}|${attacker.blocks}|${attacker.hex}|${hex}|${ec.moved}|${ec.spentGuns?.join(',') ?? ''}|${ec.viewer}|${ec.cardValue}|${ec.oppHands?.pFS ?? 'd'}`;
    let p = known.get(key);
    if (!p) {
      const moved: Unit = { ...attacker, hex };
      const bec: EstCtx = { ...ec, role: 'bonus' };
      p = { bonus: false, best: -Infinity };
      for (const h of neighbours(hex)) {
        const foe = ec.occ.unit[h] ?? ec.occ.leader[h];
        if (!foe || foe.side === attacker.side) continue;
        // approximates RR §9.6, §9.8 (engine: afterAndBonus): a target the unit has no die against is still offered when a gun could join
        if (meleeDice(s, moved, foe, { role: 'bonus', moved: ec.moved, declared: true }) < 1) {
          const foeUnit = ec.occ.unit[h];
          if (!foeUnit || !combinedArmsCandidates(s, moved, foeUnit, 'bonus').some((g) => !ec.spentGuns?.includes(g))) continue;
        }
        p.bonus = true;
        const o = ec.occ.unit[h] ? meleeEstimate(s, moved, h, bec) : loneLeaderEstimate(s, moved, h, bec);
        p.best = Math.max(p.best, o.ev);
      }
      known.set(key, p);
    }
    bonus = p.bonus;
    if (bonus && p.best > ec.W.bonusThreshold) value += p.best;
  }
  return { allowed: true, bonus, value };
}

/** The square's first roll at the cavalry that attacks it. */
// approximates RR §9.5, §10.3 (engine: squareFightsFirst): the square rolls its melee dice (1 in square) at the cavalry, its
// flags bounce (none may be ignored); the cavalry attacks only if it is still there, and the square never battles back
function squareStrike(s: GameState, ec: EstCtx, cav: Unit, sq: Unit): Strike {
  const dice = meleeDice(s, sq, cav, { role: 'squareFirst', moved: 0 });
  return strike(s, ec, cav, sq, dice, dieOdds('melee', statsOf(s, sq), 'cavalry'), 0, sq.side, true);
}

/** What a square's first roll (`sq`, in square) does to the attacking cavalry `cav`: hits, elimination, bounced back. */
export function squareFirstEstimate(s: GameState, cav: Unit, sq: Unit, ec: EstCtx): { expHits: number; pElim: number; pBounce: number; value: number } {
  const g = squareStrike(s, ec, cav, sq);
  return { expHits: g.expHits, pElim: g.pElim, pBounce: g.pRetreat, value: g.value };
}

/** The defender's First Strike roll at the melee unit that attacks it. */
// approximates RR §12.3 (engine: firstStrikeRoll): the defender rolls its normal melee dice (its terrain, no cards: role
// 'firstStrike') at the melee unit, never at a joining gun (R63); the flags are ordinary (the attacker's own ignores apply).
// The melee unit and its guns then roll only if it is still in its hex, and the defender does not battle back
function firstStrikeStrike(s: GameState, ec: EstCtx, atk: Unit, def: Unit): Strike {
  const dice = meleeDice(s, def, atk, { role: 'firstStrike', moved: 0 });
  return strike(s, ec, atk, def, dice, dieOdds('melee', statsOf(s, def), statsOf(s, atk).arm), 0, def.side);
}

/** What the defender's First Strike (`def`) does to the melee unit `atk`: hits, elimination, driven out of its hex. */
export function firstStrikeEstimate(s: GameState, atk: Unit, def: Unit, ec: EstCtx): { expHits: number; pElim: number; pDriven: number; value: number } {
  const g = firstStrikeStrike(s, ec, atk, def);
  return { expHits: g.expHits, pElim: g.pElim, pDriven: g.pRetreat, value: g.value };
}

/** The dice the Combined Arms guns of `m` add to the melee unit's roll (0 without guns). */
// approximates RR §9.6 (engine: combinedArmsStep and meleeAttack): each joining gun's dice are the engine's own count
// (`artilleryShares`: melee dice when adjacent, range dice otherwise, with its own cards and terrain); they are rolled with
// the melee unit's (recounted) dice and scored by the melee unit's row, and are lost when a square fighting first or a
// First Strike eliminates the melee unit or drives it out of its hex (R40); against Retire and Reform they still roll
function gunDice(s: GameState, m: MeleeCtx): number {
  if (m.artillery.length === 0) return 0;
  let n = 0;
  for (const g of artilleryShares(s, m)) n += g.dice;
  return n;
}

/** Which roll comes before the attacker's: a square's (against cavalry), a First Strike, or none. */
type First = 'square' | 'firstStrike' | null;

/**
 * The defender fights: the attacker's roll (the melee unit's dice plus its guns'), then the battle back at the defender's
 * remaining blocks when it survives in place; or, when `first` strikes before it (a square against cavalry, a First
 * Strike), that roll first, the attacker's roll only from the states in which the melee unit is still in place (its dice
 * recounted for its blocks, its guns' dice lost otherwise), and no battle back.
 */
function combat(s: GameState, ec: EstCtx, attacker: Unit, defender: Unit, m: MeleeCtx, first: First, advance: () => number): Outcome {
  const ast = statsOf(s, attacker);
  const dst = statsOf(s, defender);
  const odds = dieOdds('melee', ast, dst.arm);
  const backOdds = dieOdds('melee', dst, ast.arm);
  const guns = gunDice(s, m);
  let pre: [number, number][] = [[attacker.blocks, 1]];
  let firstLoss = 0;
  let firstHits = 0;
  if (first) {
    const f = first === 'square' ? squareStrike(s, ec, attacker, defender) : firstStrikeStrike(s, ec, attacker, defender);
    firstLoss = f.value;
    firstHits = f.expHits;
    pre = [...f.stay];
  }
  let value = 0, expHits = 0, pElim = 0, pRetreat = 0, backLoss = 0, backHits = 0;
  const byDice = new Map<number, Strike>();
  for (const [r, q] of pre) {
    const a = r === attacker.blocks ? attacker : { ...attacker, blocks: r };
    const own = Math.max(0, meleeDice(s, a, defender, { role: m.role, moved: ec.moved, declared: true }));
    const dice = own + guns;
    // approximates RR §10.3, R30 (engine: meleeAttack's bounce): a square with a die of its own attacking cavalry rolls
    // bounce flags, its guns' flags included, none of which may be ignored
    const bounce = own >= 1 && attacker.square !== undefined && dst.arm === 'cavalry';
    const key = dice * 2 + (bounce ? 1 : 0);
    let g = first ? byDice.get(key) : undefined;
    if (!g) {
      g = strike(s, ec, defender, a, dice, odds, 0, attacker.side, bounce);
      byDice.set(key, g);
    }
    value += q * g.value;
    expHits += q * g.expHits;
    pElim += q * g.pElim;
    pRetreat += q * g.pRetreat;
    if (first) continue; // the square or the First Strike unit already fought: no battle back (R29, R63)
    // every battle back of this melee hits the same attacker from the same defender: one flag memo serves them all
    const backMemo = new Map<number, FlagResult>();
    for (const [remaining, p] of g.stay) {
      // the engine rolls the battle back at the defender's blocks after the hits (and a failed retreat's losses)
      const back = meleeDice(s, { ...defender, blocks: remaining }, a, { role: 'back', moved: 0 });
      if (back <= 0) continue;
      const b = strike(s, ec, a, defender, back, backOdds, 0, defender.side, false, backMemo);
      backLoss += q * p * b.value;
      backHits += q * p * b.expHits;
    }
  }
  const pVacate = pElim + pRetreat;
  const adv = pVacate > 0 ? pVacate * advance() : 0;
  return { ev: value - backLoss - firstLoss + adv, expHits, pElim, pRetreat, pVacate, backLoss: backLoss + firstLoss, backHits: backHits + firstHits };
}

/** Retire and Reform: the attacker's roll at the retiring cavalry, which leaves its hex alive or dead. */
// approximates RR §9.4 (engine: resolveRetireReform): all the attacker's melee dice and its guns' (R40), cavalry symbols
// only (no flags, no Cuirassier ignore); a hit triggers the leader check; every survivor retires 2 hexes, there is no battle
// back, and the vacated hex may be taken either way
function retire(s: GameState, ec: EstCtx, attacker: Unit, defender: Unit, m: MeleeCtx, advance: () => number): Outcome {
  const dice = Math.max(0, meleeDice(s, attacker, defender, { role: m.role, moved: ec.moved, declared: true })) + gunDice(s, m);
  const g = strike(s, ec, defender, attacker, dice, dieOdds('retireReform', statsOf(s, attacker), 'cavalry'), 0, attacker.side);
  const pRetire = 1 - g.pElim;
  return { ev: g.value + pRetire * DISPLACE * 2 + advance(), expHits: g.expHits, pElim: g.pElim, pRetreat: pRetire, pVacate: 1, backLoss: 0, backHits: 0 };
}

/**
 * The outcome of each reaction of `defender` to `attacker`'s melee `m` (with the guns in `m.artillery`), memoised per choice,
 * with the follow-up value shared. The defender's own costs count as the attacker's gain (`ev`): a square's card held back
 * and its immobility, a First Strike card spent.
 */
export function branchesOf(s: GameState, attacker: Unit, defender: Unit, m: MeleeCtx, ec: EstCtx): (c: DefendChoice) => Outcome {
  const rc = ec.role === m.role ? ec : { ...ec, role: m.role };
  let adv: number | undefined;
  const advance = (): number => (adv ??= takeGround(s, attacker, m.targetHex, m.artillery.length ? { ...rc, spentGuns: m.artillery } : rc).value);
  const memo = new Map<DefendChoice, Outcome>();
  return (c) => {
    const known = memo.get(c);
    if (known) return known;
    let o: Outcome;
    if (c === 'retireReform') o = retire(s, rc, attacker, defender, m, advance);
    else if (c === 'formSquare') {
      const sq: Unit = { ...defender, square: 1 };
      const fought = combat(s, rc, attacker, sq, m, 'square', advance);
      // a square destroyed in this melee returns its card at once (removeUnit releases it): the cost is paid only if it survives
      // only the viewer's own hand is known: its cardValue prices its own square, the mean card the opponent's
      const card = defender.side === rc.viewer ? rc.cardValue : undefined;
      o = { ...fought, ev: fought.ev + squareCost(s, defender, rc.occ, card) * (1 - fought.pElim) };
    } else if (c === 'firstStrike') {
      // the engine never offers it against a square that fights first (defendOptions), so the two never stack
      const struck = combat(s, rc, attacker, defender, m, 'firstStrike', advance);
      // the card is spent whatever the roll does
      o = { ...struck, ev: struck.ev + firstStrikeCost(rc.W) };
    } else o = combat(s, rc, attacker, defender, m, squareFirstApplies(s, m) ? 'square' : null, advance);
    memo.set(c, o);
    return o;
  };
}

/** The outcome of one reaction `choice` (`m` the melee); see `branchesOf`. */
export function meleeBranch(s: GameState, attacker: Unit, defender: Unit, m: MeleeCtx, choice: DefendChoice, ec: EstCtx): Outcome {
  return branchesOf(s, attacker, defender, m, ec)(choice);
}

/**
 * Expected result of `attacker` in melee against the unit on `targetHex` (`ec.role`: 'attack' or 'bonus'), with the Combined
 * Arms guns it should add (`bestGuns`), over the defender's reactions (`reactionOutcomes`): the expected battle back, square's
 * roll or First Strike subtracted, the follow-up added.
 */
export function meleeEstimate(s: GameState, attacker: Unit, targetHex: HexId, ec: EstCtx): Outcome {
  if (!ec.occ.unit[targetHex]) return loneLeaderEstimate(s, attacker, targetHex, ec);
  return meleeWithGuns(s, attacker, targetHex, bestGuns(s, attacker, targetHex, ec), ec);
}

/** `meleeEstimate` with the Combined Arms guns given (`guns`, ids of the attacker's artillery) instead of chosen. */
export function meleeWithGuns(s: GameState, attacker: Unit, targetHex: HexId, guns: readonly string[], ec: EstCtx): Outcome {
  const defender = ec.occ.unit[targetHex];
  if (!defender) return loneLeaderEstimate(s, attacker, targetHex, ec); // no Combined Arms against a lone leader (R76)
  const m: MeleeCtx = {
    attacker: attacker.id, target: defender.id, targetHex, role: ec.role === 'bonus' ? 'bonus' : 'attack', artillery: [...guns], reaction: null, declaredMoved: ec.moved,
  };
  const out: Outcome = { ...ZERO };
  for (const r of reactionsFor(s, m, ec, defender, branchesOf(s, attacker, defender, m, ec))) {
    out.ev += r.p * r.o.ev;
    out.expHits += r.p * r.o.expHits;
    out.pElim += r.p * r.o.pElim;
    out.pRetreat += r.p * r.o.pRetreat;
    out.pVacate += r.p * r.o.pVacate;
    out.backLoss += r.p * r.o.backLoss;
    out.backHits += r.p * r.o.backHits;
  }
  return out;
}

/**
 * Melee against a lone leader: any sabre kills him (a banner and his worth); otherwise he retreats alone (his escape risk,
 * `leaderAloneRisk`). No battle back; the hex is vacated either way, so the attacker may follow up.
 */
export function loneLeaderEstimate(s: GameState, attacker: Unit, leaderHex: HexId, ec: EstCtx): Outcome {
  const leader = ec.occ.leader[leaderHex];
  if (!leader) return ZERO;
  const dice = meleeDice(s, attacker, leader, { role: ec.role, moved: ec.moved, declared: true });
  if (dice <= 0) return ZERO;
  const kill = pAnySabre(dice);
  const alone = aloneValue(s, leader, attacker.side, 1);
  const ev = kill * (LEADER_VALUE + bannerAt(s, attacker.side, 1)) + (1 - kill) * alone + takeGround(s, attacker, leaderHex, ec).value;
  return { ev, expHits: kill, pElim: kill, pRetreat: 1 - kill, pVacate: 1, backLoss: 0, backHits: 0 };
}
