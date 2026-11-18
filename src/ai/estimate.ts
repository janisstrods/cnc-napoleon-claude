// Expected value of one battle, from the attacker's side: the engine's dice counts (`fireDice`, `meleeDice`) fed through the
// per-die odds of odds.ts, then the engine's own flag-ignore and retreat queries. No game RNG and no forced dice are
// touched: every number is an exact expectation over the dice, so estimates are pure and repeatable.
//
// A melee goes through the defender's reaction model (reactions.ts): stand, Retire and Reform, or form square (Task 4a);
// First Strike and Combined Arms guns arrive in Task 4b through the same calls. The value of following up into a vacated
// hex (take ground, breakthrough and a cavalry bonus-melee prospect) is part of every melee's `ev`.
import {
  attachedLeader, bannerTotal, escapeDice, fireDice, leaderRetreatOptions, meleeDice, neighbours, noBattleAfterEntering, onBaseline,
  passableFor, retreatDistance, retreatOptions, squareFirstApplies, statsOf, unitById,
  type DefendChoice, type GameState, type HexId, type Leader, type MeleeCtx, type Side, type StrikeRole, type Unit,
} from '../engine';
// `flagIgnores` is exported by the engine's resolve module but not by its index barrel (reported to the controller).
import { flagIgnores } from '../engine/resolve';
import { occOf, type Occ } from './board';
import { dieOdds, pAnySabre, rollDist, type DieOdds } from './odds';
import { bestGuns, firstStrikeCost, reactionsFor, squareCost } from './reactions';
import { assumeOppHand, oppHoldsP } from './view';
import { LEADER_VALUE, bannersWorth, unitValue, type Weights } from './values';

/** What an estimate needs besides the state: the occupancy table, weights, whose view, the attacker's movement and role. */
export interface EstCtx {
  occ: Occ;
  W: Weights;
  viewer: Side;
  /** Hexes the attacker moved this turn (the engine's `DiceCtx.moved`). */
  moved: number;
  role: StrikeRole;
  /** True inside a simulation on a `determinize`d clone: the opponent's sampled hand is read, not weighted by odds. */
  determinised: boolean;
  /**
   * The opponent's hand assumed with and without a First Strike (blind clones from `assumeOppHand`) and P(it holds one):
   * the only states on which the engine's defend options are asked for an opponent defender outside a simulation (M-8).
   * Built once per root decision by `makeEstCtx`.
   */
  oppHands?: { holdsFS: GameState; noFS: GameState; pFS: number };
}

/** The estimate context of one root decision for `me`: the occupancy table and the assumed opponent hands, built once. */
export function makeEstCtx(s: GameState, me: Side, W: Weights): EstCtx {
  return {
    occ: occOf(s), W, viewer: me, moved: 0, role: 'attack', determinised: false,
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

/** The value to `scorer` of its k-th next banner (k = 1: the next one), priced by where its total stands. */
function bannerAt(s: GameState, scorer: Side, k: number): number {
  return bannersWorth(bannerTotal(s, scorer) + k - 1, 1, s.bannersToWin);
}

/** Does `scorer`'s k-th next banner win the game? */
function winsWith(s: GameState, scorer: Side, k: number): boolean {
  return bannerTotal(s, scorer) + k >= s.bannersToWin;
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
 * Cuirassier). `bounce`: none of the flags may be ignored (a square's roll at cavalry).
 */
function strike(s: GameState, ec: EstCtx, victim: Unit, source: Unit, dice: number, o: DieOdds, ignore: number, scorer: Side, bounce = false): Strike {
  const out: Strike = { value: 0, expHits: 0, pElim: 0, pRetreat: 0, stay: new Map() };
  const dist = rollDist(dice, o);
  const width = dice + 1;
  const blocks = victim.blocks;
  const leader = attachedLeader(s, victim, ec.occ);
  const banner = bannerAt(s, scorer, 1);
  // the leader's kill while his unit survives is the next banner
  const leaderLoss = LEADER_VALUE + banner;
  // a winning elimination ends the game before the casualty check (applyOutcome returns on the winner)
  const elimWins = winsWith(s, scorer, 1);
  let alone: number | undefined;
  /** The leader's part of his unit's elimination: the check (`checkNow`: 1 die) and, if he survives it, his retreat alone. */
  const elimLeader = (checkNow: boolean): number => {
    if (!leader || elimWins) return 0;
    const pK = checkNow ? leaderCheckP(true) : 0;
    alone ??= aloneValue(s, leader, scorer, 2);
    return pK * (LEADER_VALUE + bannerAt(s, scorer, 2)) + (1 - pK) * alone;
  };
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
        out.value += p * (worth(blocks) + banner + elimLeader(true));
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
          out.value += q * (worth(left) + banner + (leaderOk ? elimLeader(!checked) : 0));
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

/**
 * The attacker's move into the vacated `hex` after its melee (`ec.role`: 'attack' or 'bonus'), and a cavalry unit's bonus
 * melee from there: no gun, no unit in square, nothing after entering a stop hex this turn, and the hex must be passable for
 * its arm; cavalry after its first melee breaks through and may then attack any adjacent enemy it has dice against (not from
 * terrain that forbids battle after entering, not twice). The prospect is the best bonus target's estimate from the new
 * hex, counted when it clears `W.bonusThreshold` (the AI's own bar for taking one).
 */
// approximates RR §9.7, §9.8 (engine: afterMelee and meleeAttack's afterAndBonus)
export function takeGround(s: GameState, attacker: Unit, hex: HexId, ec: EstCtx): Advance {
  const st = statsOf(s, attacker);
  const op = s.turn.ordered[attacker.id];
  if (st.arm === 'artillery' || attacker.square !== undefined || op?.stopEntered || !passableFor(s, hex, st.arm)) return NO_ADVANCE;
  if (st.arm !== 'cavalry' || ec.role === 'bonus') return { allowed: true, bonus: false, value: TAKE_GROUND };
  let value = BREAKTHROUGH;
  let bonus = false;
  if (!op?.bonusMeleeDone && !noBattleAfterEntering(s, hex, st)) {
    const moved: Unit = { ...attacker, hex };
    const bec: EstCtx = { ...ec, role: 'bonus' };
    let best = -Infinity;
    for (const h of neighbours(hex)) {
      const foe = ec.occ.unit[h] ?? ec.occ.leader[h];
      if (!foe || foe.side === attacker.side) continue;
      if (meleeDice(s, moved, foe, { role: 'bonus', moved: ec.moved, declared: true }) < 1) continue;
      bonus = true;
      const o = ec.occ.unit[h] ? meleeEstimate(s, moved, h, bec) : loneLeaderEstimate(s, moved, h, bec);
      best = Math.max(best, o.ev);
    }
    if (bonus && best > ec.W.bonusThreshold) value += best;
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

/**
 * The defender stands (in square when `squareFirst`): the attacker's roll, then the battle back at the defender's remaining
 * blocks when it survives in place, or, against a square, the square's first roll and no battle back.
 */
function combat(s: GameState, ec: EstCtx, attacker: Unit, defender: Unit, m: MeleeCtx, squareFirst: boolean, advance: () => number): Outcome {
  const ast = statsOf(s, attacker);
  const dst = statsOf(s, defender);
  const odds = dieOdds('melee', ast, dst.arm);
  const backOdds = dieOdds('melee', dst, ast.arm);
  let pre: [number, number][] = [[attacker.blocks, 1]];
  let firstLoss = 0;
  let firstHits = 0;
  if (squareFirst) {
    const f = squareStrike(s, ec, attacker, defender);
    firstLoss = f.value;
    firstHits = f.expHits;
    pre = [...f.stay];
  }
  let value = 0, expHits = 0, pElim = 0, pRetreat = 0, backLoss = 0, backHits = 0;
  const byDice = new Map<number, Strike>();
  for (const [r, q] of pre) {
    const a = r === attacker.blocks ? attacker : { ...attacker, blocks: r };
    const dice = Math.max(0, meleeDice(s, a, defender, { role: m.role, moved: ec.moved, declared: true }));
    let g = squareFirst ? byDice.get(dice) : undefined;
    if (!g) {
      g = strike(s, ec, defender, a, dice, odds, 0, attacker.side);
      byDice.set(dice, g);
    }
    value += q * g.value;
    expHits += q * g.expHits;
    pElim += q * g.pElim;
    pRetreat += q * g.pRetreat;
    if (squareFirst) continue; // the square already struck first: no battle back (R29)
    for (const [remaining, p] of g.stay) {
      // the engine rolls the battle back at the defender's blocks after the hits (and a failed retreat's losses)
      const back = meleeDice(s, { ...defender, blocks: remaining }, a, { role: 'back', moved: 0 });
      if (back <= 0) continue;
      const b = strike(s, ec, a, defender, back, backOdds, 0, defender.side);
      backLoss += q * p * b.value;
      backHits += q * p * b.expHits;
    }
  }
  const pVacate = pElim + pRetreat;
  const adv = pVacate > 0 ? pVacate * advance() : 0;
  return { ev: value - backLoss - firstLoss + adv, expHits, pElim, pRetreat, pVacate, backLoss: backLoss + firstLoss, backHits: backHits + firstHits };
}

/** Retire and Reform: the attacker's roll at the retiring cavalry, which leaves its hex alive or dead. */
// approximates RR §9.4 (engine: resolveRetireReform): all the attacker's melee dice, cavalry symbols only (no flags, no
// Cuirassier ignore); a hit triggers the leader check; every survivor retires 2 hexes, there is no battle back, and the
// vacated hex may be taken either way
function retire(s: GameState, ec: EstCtx, attacker: Unit, defender: Unit, m: MeleeCtx, advance: () => number): Outcome {
  const dice = Math.max(0, meleeDice(s, attacker, defender, { role: m.role, moved: ec.moved, declared: true }));
  const g = strike(s, ec, defender, attacker, dice, dieOdds('retireReform', statsOf(s, attacker), 'cavalry'), 0, attacker.side);
  const pRetire = 1 - g.pElim;
  return { ev: g.value + pRetire * DISPLACE * 2 + advance(), expHits: g.expHits, pElim: g.pElim, pRetreat: pRetire, pVacate: 1, backLoss: 0, backHits: 0 };
}

/**
 * The outcome of each reaction of `defender` to `attacker`'s melee `m`, memoised per choice, with the follow-up value shared.
 * The defender's own costs count as the attacker's gain (`ev`): a square's card held back and its immobility, a First
 * Strike card spent.
 */
export function branchesOf(s: GameState, attacker: Unit, defender: Unit, m: MeleeCtx, ec: EstCtx): (c: DefendChoice) => Outcome {
  const rc = ec.role === m.role ? ec : { ...ec, role: m.role };
  let adv: number | undefined;
  const advance = (): number => (adv ??= takeGround(s, attacker, m.targetHex, rc).value);
  const memo = new Map<DefendChoice, Outcome>();
  return (c) => {
    const known = memo.get(c);
    if (known) return known;
    let o: Outcome;
    if (c === 'retireReform') o = retire(s, rc, attacker, defender, m, advance);
    else if (c === 'formSquare') {
      const sq: Unit = { ...defender, square: 1 };
      const fought = combat(s, rc, attacker, sq, m, true, advance);
      o = { ...fought, ev: fought.ev + squareCost(s, defender, rc.occ) };
    } else {
      const stood = combat(s, rc, attacker, defender, m, squareFirstApplies(s, m), advance);
      // First Strike (Task 4b fills its sequence): until then the card is spent and strikes nothing
      o = c === 'firstStrike' ? { ...stood, ev: stood.ev + firstStrikeCost(rc.W) } : stood;
    }
    memo.set(c, o);
    return o;
  };
}

/** The outcome of one reaction `choice` (`m` the melee); see `branchesOf`. */
export function meleeBranch(s: GameState, attacker: Unit, defender: Unit, m: MeleeCtx, choice: DefendChoice, ec: EstCtx): Outcome {
  return branchesOf(s, attacker, defender, m, ec)(choice);
}

/**
 * Expected result of `attacker` in melee against the unit on `targetHex` (`ec.role`: 'attack' or 'bonus'), over the
 * defender's reactions (`reactionOutcomes`): the expected battle back or square's roll subtracted, the follow-up added.
 */
export function meleeEstimate(s: GameState, attacker: Unit, targetHex: HexId, ec: EstCtx): Outcome {
  const defender = ec.occ.unit[targetHex];
  if (!defender) return loneLeaderEstimate(s, attacker, targetHex, ec);
  const m: MeleeCtx = {
    attacker: attacker.id, target: defender.id, targetHex, role: ec.role === 'bonus' ? 'bonus' : 'attack', artillery: [], reaction: null, declaredMoved: ec.moved,
  };
  m.artillery = bestGuns(s, attacker, targetHex, ec);
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
