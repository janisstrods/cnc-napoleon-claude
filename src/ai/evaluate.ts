// Static evaluation of a position from one side's view (Plan 5 Task 5). Units: 1.0 ≈ one banner; a won game is ±WIN_SCORE.
// It reads public information only (positions, banners, hand sizes, the discard, unit square counters) plus the viewer's own
// hand; the opponent's cards are known only as the unseen pool (view.ts).
//
// Terms (each positive = good for `me`; `evalTerms` returns them by name and `evaluate` is their sum):
// - banners: banner steps of each side; a held temporary objective counts at the chance its holder is not driven off first
//   (a held majority at the chance it is not tied); the hand a `handShrink` rule has left, at `CARD_VALUE` a card;
// - objectives: temporary objectives not yet held (capture at the next turn start, or an approach pull, blocked by an enemy
//   unit standing on the hex; any one hex of a `tempAny` group; enough hexes to pass the enemy's count on a `majority`
//   group) and exits (a pull towards the exit hex, or off a baseline row once its free exits are used or the unit is at
//   risk); kill weights, sudden death, break-on-losses and hand shrink are priced in estimate.ts (`bannerValue`);
// - material: unit values by row and blocks, leaders, and a worn unit's banner at stake;
// - riskMine / riskTheirs: the expected net loss from the other side's next attacks, distance-based reach as Ancients'
//   `threatsAgainst`, each attack valued by the estimates and the reaction model (estimate.ts, reactions.ts);
// - squares: the held-back card, Command and immobility of every unit in square (reactions.ts `squareHoldCost`);
// - guns, formation, leaders, advance: guns with targets, support and isolation, leaders at the front and alone, and the
//   pull of each unit towards the enemy or a needed objective.
import {
  ALL_HEXES, CARD_DEFS, attachedLeader, bannerTotal, handShrinkRule, canFireAt, cardKind, distance, enemyUnitAdjacent, fireDice, impetuous,
  matches, meleeDice, mirrorKind, neighbours, noBattleAfterEntering, other, passableFor, rowOf, sectionsOf, statsOf,
  stopsOnEntry, supportCount,
  type CardKind, type GameState, type HexId, type Leader, type SectionName, type Side, type Unit, type UnitStats,
} from '../engine';
import { friendsWithin, nearestEnemyDist, occOf, type Occ } from './board';
import { dieOdds, pAnySabre } from './odds';
import { bannerValue, fireEstimate, loneLeaderEstimate, makeEstCtx, meleeEstimate, type EstCtx, type Outcome } from './estimate';
import { squareHoldCost } from './reactions';
import { asNextTurn, handSize, isDeterminised, myHand, myTrack, trackFilled, unseenCards } from './view';
import { CARD_VALUE, ELAN_SHARE, LEADER_VALUE, WIN_SCORE, bannerScore, bannersWorth, unitValue, type Weights } from './values';

/** The threats of the side that does not act next count at this share (the other side moves, or strikes, first). */
const LATER = 0.6;
/** Move-then-melee attacks estimated per attacker (the best by a dice pre-score): in contact already, and otherwise. */
const REACH_KEPT_IN_CONTACT = 1;
const REACH_KEPT = 2;
/** Weight of each kind of attack before the order odds: next to the target, fire from where it stands, move then melee. */
const BASE: Readonly<Record<AttackKind, number>> = { melee: 1, fire: 0.9, reach: 0.7 };
/** Units a card orders in one section, about: more attackers than this in a section share the orders. */
const ORDERS_PER_SECTION = 3;
/** Risk cap above a victim's value and banners (displacement, follow-ups). */
const CAP_EXTRA = 0.15;
/** A temporary objective occupied but not yet held is captured at the next turn start: this share of its banners, kept. */
const CAPTURE_SHARE = 0.85;
/** Approach pull towards a needed objective hex: the share of its banners at distance 0, falling to 0 at `OBJ_RANGE`. */
const OBJ_PULL = 0.25;
const OBJ_RANGE = 8;
/** An enemy unit standing on the needed hex leaves this share of the pull until it is beaten off in melee. */
const OBJ_BLOCKED = 0.3;
/** A needed hex a unit of the needing side can enter next turn: a capture at the turn start after, if it then holds out. */
const HOLD_DISCOUNT = 0.5;
/** The same for a hex its units can only reach in two turns (the holder may come back first). */
const TWO_TURNS = 0.5;
/** One hex of a group held while others are still free counts this share of the group's capture. */
const GROUP_PARTIAL = 0.5;
/**
 * A majority already on a group is worth at least this share of its banners, the most a hex the side can enter next turn scores
 * (`CAPTURE_SHARE` × `HOLD_DISCOUNT`): an enemy able to tie it next turn leaves the side no worse off than one step away.
 */
const MAJORITY_FLOOR = CAPTURE_SHARE * HOLD_DISCOUNT;
/**
 * Exit pull of a unit: this share of what stepping off gains (the exit's banners less the unit's value), at the exit hex,
 * falling to 0 at `EXIT_RANGE` hexes. Below 1, so stepping off always beats standing on the exit hex; a worn unit, worth
 * little, is pulled hardest.
 */
const EXIT_SHARE = 0.6;
const EXIT_RANGE = 8;
/**
 * A free exit off a baseline row (`exitEdge`, before its banners start): this share of a scoring exit's banners, spread over the
 * free exits. Below a sound unit's worth, so a safe unit does not step off for it; a unit whose expected loss where it stands
 * exceeds what it is worth does (stepping off is removal, not elimination: the enemy scores nothing).
 */
const EDGE_PROGRESS = 0.5;
/** A unit at 1 block carries this share of the banner its elimination would give (one hit away). */
const WORN_STAKE = 0.08;
/** A lone leader with no friendly unit next to him. */
const LONELY_LEADER = 0.03;
/** R82: an impetuous cavalry unit must advance and take the extra hex: a fixed cost plus its exposure there. */
const IMPETUOUS_BASE = 0.03;
const IMPETUOUS_PER_ENEMY = 0.1;

type AttackKind = 'melee' | 'fire' | 'reach';
/** What a card must let a unit do: one of the attacks, or just move (to enter a needed hex). */
type OrderKind = AttackKind | 'move';

// ---------------------------------------------------------------------------------------------------------------------
// Reach (distance-based, as Ancients' `reachOf`)

/** The allowance after which `e` may still battle: its first battle option (0 in square, or below its battle-after-move blocks). */
function battleAllowance(st: UnitStats, e: Unit): number {
  if (e.square !== undefined) return 0;
  const opt = st.move.find((o) => o.battle);
  if (!opt || e.blocks < st.battleAfterMoveMinBlocks) return 0;
  return opt.max;
}

/** The most hexes `e` may move next turn, battle or not (0 in square). */
function moveAllowance(st: UnitStats, e: Unit): number {
  return e.square !== undefined ? 0 : Math.max(0, ...st.move.map((o) => o.max));
}

interface Walk {
  /** `to` is reached by a shortest path after which `e` may still battle there. */
  ok: boolean;
  /** Every such path enters `to` stopping (a stop hex, works, a lone own leader): no breakthrough after it this turn. */
  stopped: boolean;
  /** The furthest step along a shortest path towards `to` after which `e` may still battle (`n` when `ok`). */
  steps: number;
}

/**
 * The shortest approaches of `e` towards `to` within `max` hexes: paths of steps that each bring it one hex nearer, through
 * hexes free of units, passable for its arm, without an enemy leader (or an own one when it has a leader); entering a stop
 * hex or a lone own leader ends a path, and a hex that forbids battle after entering is no battle position. Longer detours
 * are not searched (the approximation `reachOf` declares). With `battle` false it only asks whether `e` can stand on `to`
 * (no battle afterwards needed), the unit on `to` taken as gone.
 */
function approachWalk(s: GameState, occ: Occ, e: Unit, st: UnitStats, to: HexId, max: number, battle = true): Walk {
  const n = distance(e.hex, to);
  const lim = Math.min(n, max);
  const out: Walk = { ok: false, stopped: true, steps: 0 };
  if (lim <= 0) return out;
  const hasLeader = !!attachedLeader(s, e, occ);
  const expanded = new Set<HexId>();
  const go = (h: HexId, i: number): void => {
    for (const x of neighbours(h)) {
      if (distance(x, to) !== n - i - 1 || !passableFor(s, x, st.arm)) continue;
      // a move onto the needed hex itself (`battle` false) takes its holder as driven off first
      const into = !battle && x === to;
      if (occ.unit[x] && !into) continue;
      const l = into ? undefined : occ.leader[x];
      if (l && (l.side !== e.side || hasLeader)) continue;
      const stop = stopsOnEntry(s, h, x) || !!l;
      if (!battle || !noBattleAfterEntering(s, x, st)) {
        out.steps = Math.max(out.steps, i + 1);
        if (x === to) {
          out.ok = true;
          out.stopped &&= stop;
        }
      }
      if (stop || i + 1 >= lim || expanded.has(x)) continue;
      expanded.add(x);
      go(x, i + 1);
    }
  };
  go(e.hex, 0);
  return out;
}

/**
 * The distance at which `e` threatens a melee next turn: its battle allowance plus 1 for the adjacency, cut by stop-on-entry
 * terrain, pieces and battle-barring terrain on the shortest approach (towards `toward`; without it the furthest hex in
 * its allowance that a shortest approach reaches).
 */
// approximates RR §7 (engine: unitMoves)
export function reachOf(s: GameState, occ: Occ, e: Unit, toward?: HexId): number {
  const st = statsOf(s, e);
  const a = battleAllowance(st, e);
  if (a <= 0) return 1;
  if (toward !== undefined) return toward === e.hex ? 1 : approachWalk(s, occ, e, st, toward, a).steps + 1;
  let best = 0;
  for (let h = 0; h < occ.unit.length && best < a; h++) {
    const d = distance(e.hex, h);
    if (s.terrain[h] === undefined || d < 1 || d > a || d <= best) continue;
    if (approachWalk(s, occ, e, st, h, a).ok) best = d;
  }
  return best + 1;
}

interface Approach {
  /** The attacker standing on the approach hex. */
  unit: Unit;
  walk: Walk;
  /** Its melee dice from there. */
  dice: number;
}

/** The best hex next to `target` that `e` can reach by a shortest approach and attack from (most dice, then fewest steps). */
function approach(s: GameState, occ: Occ, e: Unit, st: UnitStats, target: Unit | Leader, a: number): Approach | null {
  let best: Approach | null = null;
  for (const nb of neighbours(target.hex)) {
    const d = distance(e.hex, nb);
    if (d < 1 || d > a || occ.unit[nb] || !passableFor(s, nb, st.arm) || noBattleAfterEntering(s, nb, st)) continue;
    const walk = approachWalk(s, occ, e, st, nb, a);
    if (!walk.ok) continue;
    const unit: Unit = { ...e, hex: nb };
    const dice = meleeDice(s, unit, target, { role: 'attack', moved: d, declared: true });
    if (dice < 1) continue;
    if (!best || dice > best.dice || (dice === best.dice && d < best.walk.steps) || (dice === best.dice && d === best.walk.steps && best.walk.stopped && !walk.stopped)) best = { unit, walk, dice };
  }
  return best;
}

/**
 * The hexes an impetuous cavalry unit (R82, RR §14.15) ends in after its initial melee vacates `vacated`: it must enter it,
 * then one more hex in the next row towards the enemy baseline (free, passable, not its original hex), unless the vacated
 * hex stops movement or no such hex exists. Several when its owner may choose.
 */
// approximates RR §14.15, R82 (engine: afterMelee, impetuous branch)
export function impetuousEnd(s: GameState, occ: Occ, attacker: Unit, vacated: HexId): HexId[] {
  if (stopsOnEntry(s, attacker.hex, vacated)) return [vacated];
  const row = rowOf(vacated) + (attacker.side === 'top' ? 1 : -1);
  const out = neighbours(vacated)
    .filter((h) => rowOf(h) === row && h !== attacker.hex && !occ.unit[h] && !occ.leader[h] && passableFor(s, h, 'cavalry'))
    .sort((x, y) => x - y);
  return out.length ? out : [vacated];
}

/** The forced advance's cost to an impetuous attacker: a fixed part plus its exposure to the enemy units next to where it ends. */
export function impetuousCost(s: GameState, occ: Occ, attacker: Unit, victim: Unit | Leader, o: Outcome): number {
  let exposed = Infinity;
  for (const h of impetuousEnd(s, occ, attacker, victim.hex)) {
    let n = 0;
    for (const x of neighbours(h)) {
      const f = occ.unit[x];
      if (f && f.side !== attacker.side && f !== victim) n++;
    }
    exposed = Math.min(exposed, n);
  }
  return o.pVacate * (IMPETUOUS_BASE + IMPETUOUS_PER_ENEMY * unitValue(s, attacker) * Math.min(3, exposed));
}

// ---------------------------------------------------------------------------------------------------------------------
// Order odds: may a side order this unit next turn?

/** Does a card of `kind` order unit `u` (the engine's eligiblePieces for one unit, the fallback aside)? `nextTurn`: Command ≥ 1. */
// approximates RR §6, §12.2 (engine: eligiblePieces)
function orders(s: GameState, kind: CardKind, u: Unit, occ: Occ, nextTurn: boolean): boolean {
  const sel = CARD_DEFS[kind].select;
  switch (sel.kind) {
    case 'sections':
      return sectionsOf(u.hex, u.side).some((sec: SectionName) => {
        const c = sel.counts[sec];
        return c === 'command' ? nextTurn || s.turn.command > 0 : (c ?? 0) > 0;
      });
    case 'kinds':
      return matches(statsOf(s, u), sel.match) && !(sel.notAdjacentToEnemy && enemyUnitAdjacent(s, u.hex, u.side, occ));
    case 'sectionAll':
      return matches(statsOf(s, u), sel.match);
    case 'adjacentToEnemy':
      return enemyUnitAdjacent(s, u.hex, u.side, occ);
    case 'leaders':
      return !!attachedLeader(s, u, occ);
    default:
      return true;
  }
}

/** Does a card of `kind` order unit `u` now (exported for the engine cross-check against `eligiblePieces`)? */
export function cardOrders(s: GameState, kind: CardKind, u: Unit, occ: Occ): boolean {
  return orders(s, kind, u, occ, false);
}

/** The share (0..1) of a card of `kind` that lets `u` make an attack of this kind, or move, next turn (its select and its modifiers). */
function cardArms(s: GameState, kind: CardKind, u: Unit, occ: Occ, type: OrderKind): number {
  let k = kind;
  if (CARD_DEFS[k].select.kind === 'copy') {
    // Counter-Attack copies the holder's opponent's last card, mirrored (engine: effectiveCard)
    const last = s.lastCard[other(u.side)];
    if (!last) return 0;
    k = mirrorKind(last);
    if (CARD_DEFS[k].select.kind === 'copy') return 0;
  }
  const def = CARD_DEFS[k];
  const sel = def.select;
  if (sel.kind === 'none' || sel.kind === 'shortSupply') return 0;
  if (sel.kind === 'dice') return sel.roll === 'elan' ? ELAN_SHARE : 0;
  if (!orders(s, k, u, occ, true)) return 0;
  const m = def.mods;
  if (type === 'move') return m.noMove ? 0 : 1;
  if (type === 'fire' ? m.noFire : m.noMelee) return 0;
  if (type === 'reach' && m.noMove) return 0;
  // La Grande Manoeuvre: moves without fighting, so no battle at all
  if (m.move && m.move !== 'forceMarch' && !m.move.options.some((o) => o.battle) && (!m.move.only || matches(statsOf(s, u), m.move.only))) return 0;
  return 1;
}

/** P(at least one success in `n` draws without replacement from `N` cards of which `k` are successes; `k` may be fractional). */
function atLeastOne(N: number, k: number, n: number): number {
  if (k <= 0 || n <= 0) return 0;
  let none = 1;
  for (let i = 0; i < n; i++) {
    const rest = N - k - i;
    if (rest <= 0) return 1;
    none *= rest / (N - i);
  }
  return 1 - none;
}

type OrderOdds = (e: Unit, type: OrderKind) => number;

/**
 * P(`side` holds a card next turn that lets unit `e` make an attack of this kind (or move): from the viewer's own hand for its own
 * units, from the unseen pool and the opponent's hand size for the opponent's (a hand drawn without replacement).
 */
function orderOdds(s: GameState, me: Side, side: Side, occ: Occ, pool: readonly number[]): OrderOdds {
  if (side === me) {
    const hand = myHand(s, me).map(cardKind);
    return (e, type) => {
      let none = 1;
      for (const k of hand) none *= 1 - cardArms(s, k, e, occ, type);
      return 1 - none;
    };
  }
  const counts = new Map<CardKind, number>();
  for (const c of pool) {
    const k = cardKind(c);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const n = handSize(s, side);
  return (e, type) => {
    let k = 0;
    for (const [kind, c] of counts) k += c * cardArms(s, kind, e, occ, type);
    return atLeastOne(pool.length, k, n);
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Threats

interface Cand {
  victim: number;
  type: AttackKind;
  ev: number;
  pVacate: number;
}

interface Threats {
  /** Expected net loss of the victims' side, unweighted by the risk weights. */
  total: number;
  /** P(the unit on a hex is driven off it: eliminated or retreated), by hex (victims only). */
  pVac: Map<HexId, number>;
  /** The same by melee only (a melee winner may take the hex the same turn; a unit driven off by fire leaves it empty). */
  pVacMelee: Map<HexId, number>;
  /** The expected loss of the unit on a hex (its share of `total`), by hex (victims only). */
  loss: Map<HexId, number>;
}

/** Leaders of `side` on the board without a unit of their own side on their hex. */
function loneLeaders(occ: Occ, s: GameState, side: Side): Leader[] {
  return s.leaders.filter((l) => l.side === side && l.hex >= 0 && occ.unit[l.hex]?.side !== side);
}

/**
 * The threats of `A`'s units against the other side's units and lone leaders: each attacker's attacks next turn (melee next to
 * the target, fire where it stands, or a move then a melee within its reach), valued by the estimates with the reaction model;
 * an attack with no gain is not made. Each attacker makes at most one attack, spread over its targets by value (the shares
 * of ev² sum to 1), weighted by the attack's kind and the odds that its side can order it. Each victim's losses combine as
 * independent chances against a cap (its value and banners), so many attackers cannot take more than it has.
 */
function threats(s: GameState, ec: EstCtx, A: Side, odds: OrderOdds, dash: number): Threats {
  const V = other(A);
  const occ = ec.occ;
  const victims = occ.bySide[V];
  const lone = loneLeaders(occ, s, V);
  const base: EstCtx = ec.moved === 0 && ec.role === 'attack' ? ec : { ...ec, moved: 0, role: 'attack' };
  const per: { e: Unit; cands: Cand[] }[] = [];
  for (const e of occ.bySide[A]) {
    const st = statsOf(s, e);
    const a = battleAllowance(st, e);
    const range = st.fire.kind === 'none' ? 0 : st.fire.range;
    const far = Math.max(range, a + 1);
    const imp = st.arm === 'cavalry' && impetuous(s, e);
    let adjEnemy: boolean | undefined;
    const cands: Cand[] = [];
    const add = (victim: number, type: AttackKind, o: Outcome, from: Unit, target: Unit | Leader, walk?: Walk): void => {
      let ev = o.ev;
      if (imp && type !== 'fire' && !walk?.stopped) ev -= impetuousCost(s, occ, from, target, o);
      if (st.arm === 'cavalry') ev *= dash;
      if (ev > 0) cands.push({ victim, type, ev, pVacate: o.pVacate });
    };
    // move-then-melee attacks are proposed first and only the most promising are estimated (cheap dice pre-score)
    const reach: { victim: number; target: Unit | Leader; ap: Approach; score: number }[] = [];
    for (let j = 0; j < victims.length; j++) {
      const u = victims[j];
      const d = distance(e.hex, u.hex);
      if (d > far) continue;
      if (d === 1) {
        if (meleeDice(s, e, u, { role: 'attack', moved: 0, declared: true }) < 1) continue;
        add(j, 'melee', meleeEstimate(s, e, u.hex, base), e, u);
      } else if (d <= range && !(adjEnemy ??= enemyUnitAdjacent(s, e.hex, A, occ)) && canFireAt(s, e, u.hex, occ)) {
        add(j, 'fire', fireEstimate(s, e, u.hex, base), e, u);
      } else if (d - 1 <= a) {
        const ap = approach(s, occ, e, st, u, a);
        if (ap) {
          const hits = Math.min(u.blocks, ap.dice * dieOdds('melee', st, statsOf(s, u).arm).hit);
          reach.push({ victim: j, target: u, ap, score: (hits / u.blocks) * (unitValue(s, u) + bannerValue(s, A, u)) });
        }
      }
    }
    for (let k = 0; k < lone.length; k++) {
      const l = lone[k];
      const d = distance(e.hex, l.hex);
      if (d > a + 1) continue;
      if (d === 1) {
        if (meleeDice(s, e, l, { role: 'attack', moved: 0, declared: true }) < 1) continue;
        add(victims.length + k, 'melee', loneLeaderEstimate(s, e, l.hex, base), e, l);
      } else {
        const ap = approach(s, occ, e, st, l, a);
        if (ap) reach.push({ victim: victims.length + k, target: l, ap, score: pAnySabre(ap.dice) * (LEADER_VALUE + 1) });
      }
    }
    if (reach.length) {
      // a unit already in contact usually fights where it stands: one move-then-melee option is kept for it, else two
      const keep = cands.some((c) => c.type === 'melee') ? REACH_KEPT_IN_CONTACT : REACH_KEPT;
      reach.sort((x, y) => y.score - x.score || x.victim - y.victim);
      for (const r of reach.slice(0, keep)) {
        const rec: EstCtx = { ...base, moved: r.ap.walk.steps };
        const o = r.victim < victims.length ? meleeEstimate(s, r.ap.unit, r.target.hex, rec) : loneLeaderEstimate(s, r.ap.unit, r.target.hex, rec);
        add(r.victim, 'reach', o, r.ap.unit, r.target, r.ap.walk);
      }
    }
    if (cands.length) per.push({ e, cands });
  }
  // attackers per section share the orders of one card
  const bySection = new Map<SectionName, number>();
  const secs = per.map(({ e }) => sectionsOf(e.hex, A));
  for (const list of secs) for (const sec of list) bySection.set(sec, (bySection.get(sec) ?? 0) + 1);
  const T = s.bannersToWin;
  const nextBanner = bannersWorth(bannerTotal(s, A), 1, T);
  const nv = victims.length + lone.length;
  const cap = new Float64Array(nv);
  for (let j = 0; j < victims.length; j++) {
    const u = victims[j];
    cap[j] = unitValue(s, u) + bannerValue(s, A, u) + (attachedLeader(s, u, occ) ? LEADER_VALUE + nextBanner : 0) + CAP_EXTRA;
  }
  for (let k = 0; k < lone.length; k++) cap[victims.length + k] = LEADER_VALUE + nextBanner + CAP_EXTRA;
  const keepRisk = new Float64Array(nv).fill(1);
  const keepHex = new Float64Array(nv).fill(1);
  const keepMelee = new Float64Array(nv).fill(1);
  per.forEach(({ e, cands }, i) => {
    let f = 0;
    for (const sec of secs[i]) f = Math.max(f, Math.min(1, ORDERS_PER_SECTION / (bySection.get(sec) ?? 1)));
    let sum2 = 0;
    for (const c of cands) sum2 += c.ev * c.ev;
    const p: Partial<Record<AttackKind, number>> = {};
    for (const c of cands) {
      const order = (p[c.type] ??= odds(e, c.type));
      const w = BASE[c.type] * order * f * ((c.ev * c.ev) / sum2);
      if (w <= 0) continue;
      keepRisk[c.victim] *= 1 - Math.min(1, (w * c.ev) / cap[c.victim]);
      keepHex[c.victim] *= 1 - w * c.pVacate;
      if (c.type !== 'fire') keepMelee[c.victim] *= 1 - w * c.pVacate;
    }
  });
  let total = 0;
  const pVac = new Map<HexId, number>();
  const pVacMelee = new Map<HexId, number>();
  const loss = new Map<HexId, number>();
  for (let j = 0; j < nv; j++) {
    const l = cap[j] * (1 - keepRisk[j]);
    total += l;
    if (j < victims.length) {
      pVac.set(victims[j].hex, 1 - keepHex[j]);
      pVacMelee.set(victims[j].hex, 1 - keepMelee[j]);
      loss.set(victims[j].hex, l);
    }
  }
  return { total, pVac, pVacMelee, loss };
}

// ---------------------------------------------------------------------------------------------------------------------
// Banners and objectives

type HeldState = { held: boolean; holders?: readonly string[] };

/** The hexes of a board row (an `exitEdge` objective's baseline), worked out once per row. */
const ROW_HEXES: HexId[][] = [];
const rowHexes = (row: number): readonly HexId[] => (ROW_HEXES[row] ??= ALL_HEXES.filter((h) => rowOf(h) === row));

/** How many hexes of `hexes` hold a unit of `side` (lone leaders never count, R65). */
function countOn(occ: Occ, side: Side, hexes: readonly HexId[]): number {
  let n = 0;
  for (const h of hexes) if (occ.unit[h]?.side === side) n++;
  return n;
}

/** P(at least `k` of independent events with chances `ps` happen). */
function atLeast(ps: readonly number[], k: number): number {
  if (k <= 0) return 1;
  if (k > ps.length) return 0;
  // dp[j]: P(exactly j events so far) for j < k; `done` collects the chance of k or more
  const dp = new Float64Array(k);
  dp[0] = 1;
  let done = 0;
  for (const p of ps) {
    done += dp[k - 1] * p;
    for (let j = k - 1; j > 0; j--) dp[j] = dp[j] * (1 - p) + dp[j - 1] * p;
    dp[0] *= 1 - p;
  }
  return done;
}

/**
 * P(`side` loses its majority of `hexes` (its count `margin` above the enemy's) before its next turn start): as many of these as
 * the margin happen: one of its units on the group is driven off (`pVac`), or an enemy unit enters a free hex of the group next
 * turn (the best one-turn `enterOdds` over the free hexes; one entry counted). A tie loses it (S36).
 */
// approximates RR §15.8 majority, S36 (engine: updateHeld)
function majorityLoss(occ: Occ, side: Side, hexes: readonly HexId[], margin: number, pVac: Map<HexId, number>, enterOf: EnterOf): number {
  const ps: number[] = [];
  for (const h of hexes) if (occ.unit[h]?.side === side) ps.push(pVac.get(h) ?? 0);
  if (ps.length + 1 < margin) return 0;
  let enter = 0;
  for (const h of hexes) if (!occ.unit[h] && enter < 1) enter = Math.max(enter, enterOf(other(side), h, true));
  ps.push(enter);
  return atLeast(ps, margin);
}

/** The hexes of a held `tempAny` group on which one of its holders stands (any unit of its side there when none is recorded). */
function holderHexes(occ: Occ, side: Side, hexes: readonly HexId[], st: HeldState): HexId[] {
  return hexes.filter((h) => {
    const u = occ.unit[h];
    return !!u && u.side === side && (!st.holders || st.holders.includes(u.id));
  });
}

/**
 * `side`'s banners: permanent ones, then each held temporary objective at the chance it is kept: a hex or group while none of
 * its holders is driven off; a `tempAny` group while one of its holders stays (S35); a `majority` group while it is not tied
 * (`majorityLoss`, S36). A `handShrink` rule's hand counts `CARD_VALUE` a card, so each banner that shrinks it costs one.
 */
function sideBanners(s: GameState, occ: Occ, side: Side, threatsOn: (side: Side) => Threats, enterOf: EnterOf): number {
  const T = s.bannersToWin;
  const pVac = threatsOn(side).pVac;
  let k = s.players[side].banners;
  let v = bannerScore(k, T);
  s.scenario.objectives.forEach((o, i) => {
    const st = s.special.objState[i];
    if (o.side !== side || !st?.held) return;
    let keep = 1;
    if (o.kind === 'tempHex' || o.kind === 'tempGroup') {
      for (const h of o.kind === 'tempGroup' ? o.hexes : [o.hex]) keep *= 1 - (pVac.get(h) ?? 0);
    } else if (o.kind === 'tempAny') {
      let gone = 1;
      for (const h of holderHexes(occ, side, o.hexes, st)) gone *= pVac.get(h) ?? 0;
      keep = 1 - gone;
    } else if (o.kind === 'majority') {
      const margin = countOn(occ, side, o.hexes) - countOn(occ, other(side), o.hexes);
      keep = margin > 0 ? 1 - majorityLoss(occ, side, o.hexes, margin, pVac, enterOf) : 0;
    } else return;
    v += keep * bannersWorth(k, o.banners, T);
    k += o.banners;
  });
  // approximates RR §15.8 handShrink, S33 (engine: shrinkHand)
  if (handShrinkRule(s, side)) v += CARD_VALUE * s.special.handSize[side];
  return v;
}

/**
 * Hexes `side` still needs or holds by its own objectives: temporary objective hexes and groups (`tempAny` and `majority`
 * groups included), exit hexes, and the hexes of an `exitEdge` row once its free exits are used.
 */
export function objectiveHexes(s: GameState, side: Side): HexId[] {
  const out: HexId[] = [];
  s.scenario.objectives.forEach((o, i) => {
    if (o.side !== side) return;
    if (o.kind === 'tempHex' || o.kind === 'exit') out.push(o.hex);
    else if (o.kind === 'tempGroup' || o.kind === 'tempAny' || o.kind === 'majority') out.push(...o.hexes);
    else if (o.kind === 'exitEdge' && (s.special.objState[i]?.count ?? 0) >= o.free) out.push(...rowHexes(o.row));
  });
  return out;
}

/**
 * The chance that `side` puts a unit on hex `h` next turn: the best order odds (a card that moves it) of its units that can
 * enter `h` by a shortest walk within their full allowance (battle or not), the unit now on `h` taken as gone; and the same
 * counting, at `TWO_TURNS`, those within two allowances (a shortest walk, a stop hex still ending it): [next turn, two turns].
 */
function enterOdds(s: GameState, occ: Occ, side: Side, h: HexId, odds: OrderOdds): [number, number] {
  let one = 0;
  let two = 0;
  for (const u of occ.bySide[side]) {
    const st = statsOf(s, u);
    const a = moveAllowance(st, u);
    const d = distance(u.hex, h);
    if (d < 1 || d > 2 * a) continue;
    if (d <= a) {
      if (one >= 1 || !approachWalk(s, occ, u, st, h, a, false).ok) continue;
      one = Math.max(one, odds(u, 'move'));
    } else {
      if (TWO_TURNS <= Math.max(one, two) || !approachWalk(s, occ, u, st, h, 2 * a, false).ok) continue;
      two = Math.max(two, TWO_TURNS * odds(u, 'move'));
    }
  }
  return [one, Math.max(one, two)];
}

/** `enterOdds` of a side for a hex, next turn only (`oneTurn`) or within two; each side and hex worked out once per evaluation. */
type EnterOf = (side: Side, h: HexId, oneTurn?: boolean) => number;

function enterOddsOf(s: GameState, occ: Occ, oddsOf: (side: Side) => OrderOdds): EnterOf {
  const known = new Map<number, [number, number]>();
  return (side, h, oneTurn = false) => {
    const key = h * 2 + (side === 'top' ? 0 : 1);
    let e = known.get(key);
    if (!e) known.set(key, (e = enterOdds(s, occ, side, h, oddsOf(side))));
    return oneTurn ? e[0] : e[1];
  };
}

/**
 * Objectives not yet held and exits, from `me`'s side (`threatsOn(side)`: the threats against `side`'s units).
 * The side that needs a temporary objective scores a capture at its next turn start when it occupies every hex (kept at the
 * chance it is not driven off). Each hex it does not hold scores the better of two: the turn-start capture potential when one
 * of its units can enter the hex next turn (`enterOdds`; on an enemy-held hex only once that holder is driven off), or an
 * approach pull of its nearest unit, cut while an enemy unit stands on the hex (more so the safer that unit is). So a
 * defender standing on a hex the enemy needs keeps it closed. A `tempAny` group needs one hex: a unit on any of them is a
 * capture, else the best hex's score counts. A `majority` group with a count above the enemy's is a capture kept unless it is
 * tied first (`majorityLoss`); below or level, the best hexes it lacks, as many as passing the enemy's count takes, score as
 * above. Exits pull every unit that may step off by them (and lone leaders where leaders score) by a share of what stepping off
 * gains; an `exitEdge` row pulls by its row distance once its free exits are used, and before that only a unit whose expected
 * loss where it stands is more than it is worth (each free exit used counts `EDGE_PROGRESS`).
 */
function objectiveTerm(s: GameState, occ: Occ, me: Side, threatsOn: (side: Side) => Threats, enterOf: EnterOf): number {
  const T = s.bannersToWin;
  let v = 0;
  s.scenario.objectives.forEach((o, i) => {
    const X = o.side;
    const sign = X === me ? 1 : -1;
    const st = s.special.objState[i];
    if (o.kind === 'tempHex' || o.kind === 'tempGroup' || o.kind === 'tempAny' || o.kind === 'majority') {
      if (st?.held) return;
      const hexes = o.kind === 'tempHex' ? [o.hex] : o.hexes;
      const worth = bannersWorth(bannerTotal(s, X), o.banners, T);
      const mine = threatsOn(X).pVac;
      // an enemy unit on the hex must be beaten in melee for the needing side to take the hex
      const theirs = threatsOn(other(X)).pVacMelee;
      const on = (h: HexId): boolean => occ.unit[h]?.side === X;
      /** A hex the side does not hold: the better of the capture after entering it next turn and the approach pull. */
      const approachOf = (h: HexId): number => {
        let d = 99;
        for (const u of occ.bySide[X]) if (!hexes.includes(u.hex) && passableFor(s, h, statsOf(s, u).arm)) d = Math.min(d, distance(u.hex, h));
        const blocked = occ.unit[h] ? theirs.get(h) ?? 0 : 1;
        let pull = (OBJ_PULL * Math.max(0, OBJ_RANGE - d)) / OBJ_RANGE;
        if (occ.unit[h]) pull *= OBJ_BLOCKED + (1 - OBJ_BLOCKED) * blocked;
        const potential = CAPTURE_SHARE * HOLD_DISCOUNT * blocked * enterOf(X, h);
        return Math.max(pull, potential);
      };
      if (o.kind === 'tempAny') {
        const held = hexes.filter(on);
        if (held.length) {
          let gone = 1;
          for (const h of held) gone *= mine.get(h) ?? 0;
          v += sign * CAPTURE_SHARE * (1 - gone) * worth;
          return;
        }
        let best = 0;
        for (const h of hexes) best = Math.max(best, approachOf(h));
        v += sign * worth * best;
        return;
      }
      if (o.kind === 'majority') {
        const m = countOn(occ, X, hexes);
        const e = countOn(occ, other(X), hexes);
        if (m > e) {
          v += sign * Math.max(MAJORITY_FLOOR, CAPTURE_SHARE * (1 - majorityLoss(occ, X, hexes, m - e, mine, enterOf))) * worth;
          return;
        }
        const need = e - m + 1;
        const scores = hexes.filter((h) => !on(h)).map(approachOf).sort((a, b) => b - a);
        let sum = 0;
        for (let j = 0; j < Math.min(need, scores.length); j++) sum += scores[j];
        v += (sign * worth * sum) / need;
        return;
      }
      if (hexes.every(on)) {
        let keep = 1;
        for (const h of hexes) keep *= 1 - (mine.get(h) ?? 0);
        v += sign * CAPTURE_SHARE * keep * worth;
        return;
      }
      let sum = 0;
      for (const h of hexes) sum += on(h) ? GROUP_PARTIAL * CAPTURE_SHARE * (1 - (mine.get(h) ?? 0)) : approachOf(h);
      v += (sign * worth * sum) / hexes.length;
    } else if (o.kind === 'exit') {
      const worth = bannersWorth(bannerTotal(s, X), o.banners, T);
      const pull = (gain: number, h: HexId): number => (EXIT_SHARE * Math.max(0, gain) * Math.max(0, EXIT_RANGE - distance(h, o.hex))) / EXIT_RANGE;
      let r = 0;
      for (const u of occ.bySide[X]) r += pull(worth - unitValue(s, u), u.hex);
      if (o.leadersScore) for (const l of loneLeaders(occ, s, X)) r += pull(worth - LEADER_VALUE, l.hex);
      v += sign * r;
    } else if (o.kind === 'exitEdge') {
      // approximates RR §15.8 exitEdge, S31 (engine: exitPiece): units only, the first `free` exits score nothing
      const worth = bannersWorth(bannerTotal(s, X), o.banners, T);
      const used = st?.count ?? 0;
      const open = used >= o.free;
      const progress = (EDGE_PROGRESS * worth) / Math.max(1, o.free);
      const loss = threatsOn(X).loss;
      let r = progress * Math.min(used, o.free);
      for (const u of occ.bySide[X]) {
        const value = unitValue(s, u);
        const gain = open ? worth - value : progress + (loss.get(u.hex) ?? 0) - value;
        if (gain > 0) r += (EXIT_SHARE * gain * Math.max(0, EXIT_RANGE - Math.abs(rowOf(u.hex) - o.row))) / EXIT_RANGE;
      }
      v += sign * r;
    }
    // killWeight, suddenDeath: priced where eliminations are valued (estimate.ts bannerValue), in the risk terms and the worn stake
  });
  return v;
}

// ---------------------------------------------------------------------------------------------------------------------
// Material, squares and position

function material(s: GameState, occ: Occ, me: Side): number {
  let v = 0;
  for (const side of [me, other(me)] as const) {
    const sign = side === me ? 1 : -1;
    for (const u of occ.bySide[side]) {
      let x = unitValue(s, u);
      if (u.blocks === 1) x -= WORN_STAKE * bannerValue(s, other(side), u);
      v += sign * x;
    }
  }
  for (const l of s.leaders) if (l.hex >= 0) v += (l.side === me ? 1 : -1) * LEADER_VALUE;
  return v;
}

/**
 * The standing cost of every unit in square (cavalry-independent, `squareHoldCost`): mine against, the enemy's for me. Only my
 * own squares are priced with `cardValue` (my hand's mean keep value, worked out once per root); the enemy's, whose hand is
 * hidden, at the mean card.
 */
function squares(s: GameState, occ: Occ, me: Side, cardValue: number): number {
  let v = 0;
  for (const side of [me, other(me)] as const) {
    for (const u of occ.bySide[side]) if (u.square !== undefined) v += side === me ? -squareHoldCost(s, u, cardValue) : squareHoldCost(s, u);
  }
  return v;
}

/** Best fire dice of a gun standing where it is (0 when it is next to an enemy unit or has no target in range and sight). */
function gunDice(s: GameState, occ: Occ, g: Unit, range: number): number {
  if (enemyUnitAdjacent(s, g.hex, g.side, occ)) return 0;
  let best = 0;
  for (const e of occ.bySide[other(g.side)]) {
    if (distance(g.hex, e.hex) > range || !canFireAt(s, g, e.hex, occ)) continue;
    best = Math.max(best, fireDice(s, g, e.hex, { role: 'back', moved: 0 }));
  }
  return best;
}

interface Position {
  guns: number;
  formation: number;
  leaders: number;
}

function position(s: GameState, occ: Occ, side: Side, W: Weights): Position {
  const out: Position = { guns: 0, formation: 0, leaders: 0 };
  const near = new Map<Unit, number>();
  for (const u of occ.bySide[side]) {
    const st = statsOf(s, u);
    const d = nearestEnemyDist(s, occ, u);
    near.set(u, d);
    if (st.arm === 'artillery' && st.fire.kind === 'artillery') out.guns += W.gunPatience * Math.min(1, gunDice(s, occ, u, st.fire.range) / 3);
    // bolster morale (RR §10.2): two adjacent friendly pieces let a unit ignore a flag; fewer give nothing
    if (d <= 3 && supportCount(s, u, occ) >= 2) out.formation += W.support;
    if (d <= 4 && friendsWithin(s, occ, u, 2) === 0) out.formation -= W.isolated;
  }
  for (const l of s.leaders) {
    if (l.side !== side || l.hex < 0) continue;
    const host = occ.unit[l.hex];
    if (host && host.side === side) {
      const d = near.get(host) ?? 99;
      const health = host.blocks / host.maxBlocks;
      if (d <= 1) out.leaders += W.leaderFront * health;
      else if (d === 2) out.leaders += 0.5 * W.leaderFront * health;
    } else if (!neighbours(l.hex).some((h) => occ.unit[h]?.side === side)) out.leaders -= LONELY_LEADER;
  }
  return out;
}

/**
 * The advance pull of `side`'s units: each sound unit (not worn, not in square) is pulled towards the nearest enemy unit,
 * down to the distance at which it fights (its musket or rifle range, 3 for a gun, contact for cavalry), or onto a hex its
 * side needs, whichever is nearer; cavalry by `cavalryDash`. Independent of caution, so a cautious side still closes in.
 */
function advance(s: GameState, occ: Occ, side: Side, W: Weights): number {
  if (occ.bySide[other(side)].length === 0) return 0;
  const targets = objectiveHexes(s, side);
  let gaps = 0;
  for (const u of occ.bySide[side]) {
    if (u.blocks <= 1 || u.square !== undefined) continue;
    const st = statsOf(s, u);
    const fight = st.fire.kind === 'musket' ? st.fire.range : st.fire.kind === 'artillery' ? 3 : 1;
    let dObj = 99;
    for (const h of targets) if (h === u.hex || occ.unit[h]?.side !== side) dObj = Math.min(dObj, distance(u.hex, h));
    const gap = Math.min(8, Math.max(0, nearestEnemyDist(s, occ, u) - fight), dObj);
    gaps += gap * (st.arm === 'cavalry' ? W.cavalryDash : 1);
  }
  return -W.advance * gaps;
}

// ---------------------------------------------------------------------------------------------------------------------
// Entry points

/** Root estimate contexts built without one from the caller, per state and viewer, keyed by the public card signature. */
const rootCtx = new WeakMap<GameState, Map<string, EstCtx>>();

/**
 * Everything the root context depends on: what the assumed opponent hands depend on (the unseen pool and the hand and track
 * sizes) and the board, which the viewer's `cardValue` reads (its cards' worth depends on where the units stand): a state
 * mutated in place with its cards unchanged must not reuse a context made for another board.
 */
function cardSignature(s: GameState, me: Side): string {
  let board = '';
  for (const u of s.units) board += `${u.hex}.${u.blocks}.${u.square ?? 0};`;
  for (const l of s.leaders) board += `${l.hex};`;
  const top = handSize(s, 'top');
  const bottom = handSize(s, 'bottom');
  return `${me}|${top},${bottom}|${trackFilled(s, 'top')},${trackFilled(s, 'bottom')}|${s.discard.length},${s.discard[s.discard.length - 1]}|`
    + `${s.turn.card}|${myHand(s, me).join(',')}|${myTrack(s, me).join(',')}|${board}`;
}

/** The estimate context for evaluating `s` for `me`: the caller's root context (its hands kept), else one built and cached. */
function contextFor(s: GameState, me: Side, W: Weights, occ: Occ, ec?: EstCtx): EstCtx {
  if (ec) {
    if (ec.viewer !== me) throw new Error(`evaluate: the estimate context is ${ec.viewer}'s, not ${me}'s`);
    if (ec.determinised && !isDeterminised(s)) throw new Error('evaluate: a determinised estimate context needs a state that determinize produced');
    return { ...ec, occ, W, moved: 0, role: 'attack' };
  }
  let byKey = rootCtx.get(s);
  if (!byKey) rootCtx.set(s, (byKey = new Map()));
  const key = cardSignature(s, me);
  let made = byKey.get(key);
  // cardValue is priced under the weights it was made with
  if (!made || made.W !== W) {
    if (byKey.size > 8) byKey.clear();
    byKey.set(key, (made = makeEstCtx(s, me, W)));
  }
  return { ...made, occ, W, moved: 0, role: 'attack' };
}

/**
 * The root estimate context of `s` for `me`: the same one `evaluate` builds without a caller's context. It is cached on the state
 * object, keyed by the public card signature, the board (units, blocks, squares, leaders) and the weights, so a state mutated in
 * place never gets a stale `cardValue`; its board is that of `s`. For callers that evaluate many positions made from `s` (move scoring).
 */
export function rootContextOf(s: GameState, me: Side, W: Weights): EstCtx {
  return contextFor(s, me, W, occOf(s));
}

/** The side whose turn comes next: the active side before its card is played, the other side after. */
function nextToAct(s: GameState): Side {
  return s.turn.phase === 'card' ? s.active : other(s.active);
}

function terms(s0: GameState, me: Side, W: Weights, ec?: EstCtx): Record<string, number> {
  const opp = other(me);
  // this turn's orders (dice, moved-fire rows, battle permissions) are gone by the next turn: evaluate as it will find them
  const s = asNextTurn(s0);
  const occ = occOf(s);
  const root = contextFor(s0, me, W, occ, ec);
  const pool = unseenCards(s, me);
  // the enemy's attacks on my units, and mine on theirs (my cavalry's by `cavalryDash`)
  const oddsOpp = orderOdds(s, me, opp, occ, pool);
  const oddsMe = orderOdds(s, me, me, occ, pool);
  const onMe = threats(s, root, opp, oddsOpp, 1);
  const onThem = threats(s, root, me, oddsMe, W.cavalryDash);
  const threatsOn = (side: Side): Threats => (side === me ? onMe : onThem);
  const enterOf = enterOddsOf(s, occ, (side) => (side === me ? oddsMe : oddsOpp));
  const next = nextToAct(s);
  const mine = position(s, occ, me, W);
  const theirs = position(s, occ, opp, W);
  return {
    banners: sideBanners(s, occ, me, threatsOn, enterOf) - sideBanners(s, occ, opp, threatsOn, enterOf),
    objectives: objectiveTerm(s, occ, me, threatsOn, enterOf),
    material: material(s, occ, me),
    riskMine: -W.riskSelf * (next === opp ? 1 : LATER) * onMe.total,
    riskTheirs: W.riskEnemy * (next === me ? 1 : LATER) * onThem.total,
    squares: squares(s, occ, me, root.cardValue),
    guns: mine.guns - theirs.guns,
    formation: mine.formation - theirs.formation,
    leaders: mine.leaders - theirs.leaders,
    advance: advance(s, occ, me, W),
  };
}

/**
 * The evaluation of `s` for `me` with weights `W`: +WIN_SCORE / −WIN_SCORE once a side has won, 0 for a draw (the engine
 * never produces one), else the sum of `evalTerms`. `ec`: the root decision's estimate context (`makeEstCtx` for `me`, or a
 * determinised one inside a simulation); without it one is built and cached per state object.
 */
export function evaluate(s: GameState, me: Side, W: Weights, ec?: EstCtx): number {
  if (s.winner) return s.winner === 'draw' ? 0 : s.winner === me ? WIN_SCORE : -WIN_SCORE;
  const t = terms(s, me, W, ec);
  let v = 0;
  for (const k in t) v += t[k];
  return v;
}

/** The named terms of the evaluation (already weighted; `evaluate` is their sum), for `ai-review` and the tests. */
export function evalTerms(s: GameState, me: Side, W: Weights, ec?: EstCtx): Record<string, number> {
  return terms(s, me, W, ec);
}
