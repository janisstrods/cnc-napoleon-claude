// Card sense (Plan 5 Task 6a): what it is worth to keep a card in hand for a later turn, how a hand is managed, which of two
// Scout cards to keep, and the cost of a hand too short to form a square.
//
// A card's keep value is its base value (the value of using it in full) scaled by how many of our units the engine says it
// could order (`eligiblePieces`, `orderLimit`: no copy of the rules) and by Command. It reads only our own hand and public
// facts (positions, `lastCard`, hand sizes through view.ts); never the opponent's hand, track or the deck.
//
// Command here is the Command a card played now would have: the hand, the played card included, never counting square-track
// cards (R28, RR §5.3). Cards on the track are not in the hand, so the hand size is the number.
import {
  CARD_DEFS, SQUARE_MIN_HAND, cardKind, distance, eligiblePieces, fallbackActive, mirrorKind, orderLimit, other, statsOf, unitsOf,
  type CardKind, type GameState, type Side, type Unit,
} from '../engine';
import { occOf, type Occ } from './board';
import { reachOf } from './evaluate';
import { handSize, myHand } from './view';
import { CARD_VALUE, rowValue, unitValue, type Weights } from './values';

/** The Command a card played from `me`'s hand now would have (R28): the hand, including that card; track cards excluded. */
export function commandOf(s: GameState, me: Side): number {
  return handSize(s, me);
}

/**
 * `s` with the Command a card played now would have (for the engine's order queries, which read `turn.command`): the state
 * itself when it already says so. A read-only view; never mutate or drive it.
 */
export function withCommand(s: GameState, command: number): GameState {
  return s.turn.command === command ? s : { ...s, turn: { ...s.turn, command } };
}

/** The value of using each card in full, in banners (the strong cards sit at the top). */
const BASE: Readonly<Record<CardKind, number>> = {
  scoutL: 0.1, scoutC: 0.1, scoutR: 0.1,
  probeL: 0.2, probeC: 0.2, probeR: 0.2,
  attackL: 0.3, attackC: 0.3, attackR: 0.3,
  assaultL: 0.5, assaultC: 0.5, assaultR: 0.5,
  coordinatedAdvance: 0.28, flankAttack: 0.26, forward: 0.38, reconInForce: 0.16,
  bayonetCharge: 0.34, bombard: 0.42, cavalryCharge: 0.42, counterAttack: 0, elan: 0.5, fireAndHold: 0.26, firstStrike: 0.1,
  forceMarch: 0.26, coldSteel: 0.38, leadership: 0.4, grandManoeuvre: 0.38, rally: 0.4, shortSupply: 0.1,
};

/** What a card that orders nothing (First Strike, or a Counter-Attack copying one) is worth as an order card. */
const NO_ORDERS = 0.02;
/** A card with no unit of ours it could order (its section is empty, or no unit matches). */
const EMPTY = 0.02;
/** A fallback card (nothing matches: one unit, normal rules) keeps this share of its value. */
const FALLBACK = 0.5;
/** Command scales Assault, Élan and Rally up to this multiple of their nominal use (a Command of 4). */
const FILL_CAP = 1.5;
/** Command a card's nominal use assumes. */
const REF_COMMAND = 4;
/** Élan orders a unit when a die shows its arm or a flag: about this share of Command dice (evaluate.ts ELAN_SHARE). */
const ELAN_SHARE = 0.6;
/** Units this near an enemy are engaged: an order is worth its full value there, less further back. */
const ENGAGED = 4;
const NEAR = 7;
/** Counter-Attack with nothing to copy yet (the opponent has not played). */
const COPY_NONE = 0.04;
/** First Strike's keep value with no enemy able to reach our units. */
const FIRST_STRIKE_IDLE = 0.03;
/** The share of a threatened infantry unit's value that a square saves against cavalry. */
const SQUARE_SAVES = 0.3;
/** Infantry units counted in the hand-floor penalty. */
const FLOOR_UNITS = 3;
/** The occupancy of this position, kept per state so a hand's cards share it. */
const occMemo = new WeakMap<GameState, Occ>();
function occFor(s: GameState): Occ {
  let o = occMemo.get(s);
  if (!o) occMemo.set(s, (o = occOf(s)));
  return o;
}

/** How much one of our units counts as an order target: engaged units fully, far back ones less. */
function engagement(s: GameState, occ: Occ, u: Unit): number {
  let d = 99;
  for (const e of occ.bySide[other(u.side)]) d = Math.min(d, distance(u.hex, e.hex));
  return d <= ENGAGED ? 1 : d <= NEAR ? 0.6 : 0.3;
}

/** The orders a card of `kind` nominally gives (what its base value assumes). */
function nominalOrders(kind: CardKind): number {
  const sel = CARD_DEFS[kind].select;
  switch (sel.kind) {
    case 'sections': return Object.values(sel.counts).reduce<number>((a, c) => a + (c === 'command' ? REF_COMMAND : (c ?? 0)), 0);
    case 'kinds': return sel.max;
    case 'grandManoeuvre': return sel.max;
    case 'sectionAll': return 4;
    case 'adjacentToEnemy': return 3;
    case 'leaders': return 3;
    default: return 1;
  }
}

/** Wounded units that a Rally could mend, and the value gained by mending the best `n` of them by one block. */
// approximates RR §12.2 Rally (engine: canRally; the dice decide which arms, so the best wounded units stand in)
function rallyGain(s: GameState, me: Side, n: number): number {
  const gains: number[] = [];
  for (const u of unitsOf(s, me)) {
    if (u.blocks >= u.maxBlocks) continue;
    const st = statsOf(s, u);
    gains.push(rowValue(st, u.blocks + 1) - rowValue(st, u.blocks));
  }
  gains.sort((x, y) => y - x);
  return gains.slice(0, Math.max(0, Math.ceil(n))).reduce((a, g) => a + g, 0);
}

/** Can an enemy unit reach ours (its nearest of ours within its reach for a battle next turn)? */
function enemiesReach(s: GameState, me: Side, occ: Occ): boolean {
  const mine = occ.bySide[me];
  if (!mine.length) return false;
  for (const e of occ.bySide[other(me)]) {
    let near = mine[0];
    let nd = Infinity;
    for (const u of mine) {
      const d = distance(e.hex, u.hex);
      if (d < nd) {
        nd = d;
        near = u;
      }
    }
    if (nd <= 1 || reachOf(s, occ, e, near.hex) >= nd) return true;
  }
  return false;
}

/** The value, before the personality's retention weight, of holding a card of `kind` (`copied`: already a Counter-Attack's copy). */
function kindValue(s: GameState, me: Side, kind: CardKind, W: Weights, copied: boolean): number {
  const def = CARD_DEFS[kind];
  const occ = occFor(s);
  const command = commandOf(s, me);
  switch (def.select.kind) {
    case 'copy': {
      // Counter-Attack plays a (mirrored) copy of the opponent's last card (R56): it is worth that copy (engine: effectiveCard)
      const last = s.lastCard[other(me)];
      if (!last || copied) return COPY_NONE;
      const copy = mirrorKind(last);
      return CARD_DEFS[copy].select.kind === 'copy' ? COPY_NONE : kindValue(s, me, copy, W, true);
    }
    case 'none':
      return enemiesReach(s, me, occ) ? BASE[kind] + W.firstStrikeReserve : FIRST_STRIKE_IDLE;
    case 'shortSupply':
      return unitsOf(s, me).length ? BASE[kind] : EMPTY;
    case 'dice': {
      if (def.select.roll === 'rally') {
        const units = unitsOf(s, me);
        if (!units.length) return EMPTY;
        const gain = rallyGain(s, me, ELAN_SHARE * command);
        return gain <= 0 ? EMPTY : Math.min(FILL_CAP * BASE.rally, EMPTY + 0.4 * BASE.rally + gain);
      }
      // Élan: Command dice, each ordering about ELAN_SHARE of a unit, who then fight with an extra die
      const units = unitsOf(s, me);
      if (!units.length) return EMPTY;
      const n = Math.min(units.length, ELAN_SHARE * command);
      let w = 0;
      for (const u of units) w += engagement(s, occ, u);
      const eff = (n * w) / units.length;
      return Math.max(EMPTY, BASE[kind] * Math.min(FILL_CAP, eff / (ELAN_SHARE * REF_COMMAND)));
    }
    default: {
      const view = withCommand(s, command);
      const ids = eligiblePieces(view, me, kind);
      if (!ids.length) return EMPTY;
      const limit = orderLimit(view, me, kind);
      // each order counts by where the unit stands; the best `limit` of them are used
      const ws: number[] = [];
      for (const id of ids) {
        const u = s.units.find((x) => x.id === id);
        ws.push(u ? engagement(s, occ, u) : 0.25);
      }
      ws.sort((x, y) => y - x);
      const used = ws.slice(0, Math.max(1, limit)).reduce((a, x) => a + x, 0);
      const fill = Math.min(FILL_CAP, used / nominalOrders(kind));
      return Math.max(EMPTY, BASE[kind] * fill * (fallbackActive(view, me, kind) ? FALLBACK : 1));
    }
  }
}

/**
 * The value, in banners, of keeping `card` (an id in our hand, or one just drawn by a Scout) for a later turn. A mean card is
 * about `CARD_VALUE`. Reads our own units and public facts only.
 */
export function keepValue(s: GameState, me: Side, card: number, W: Weights): number {
  return kindValue(s, me, cardKind(card), W, false) * W.retention;
}

/** The mean keep value of the cards in our hand (`CARD_VALUE` when the hand is empty). */
export function meanHandValue(s: GameState, me: Side, W: Weights): number {
  const hand = myHand(s, me);
  if (!hand.length) return CARD_VALUE;
  let sum = 0;
  for (const c of hand) sum += keepValue(s, me, c, W);
  return sum / hand.length;
}

/** Which of two Scout cards to keep: the higher keep value (the first on a tie). */
export function scoutKeepIndex(s: GameState, me: Side, cards: readonly [number, number], W: Weights): 0 | 1 {
  return keepValue(s, me, cards[1], W) > keepValue(s, me, cards[0], W) ? 1 : 0;
}

/**
 * The cost of a hand at `SQUARE_MIN_HAND − 1` or fewer cards (after `drop` more leave it: a square formed, a First Strike
 * played) while enemy cavalry can reach our infantry in the open: a square needs `SQUARE_MIN_HAND` cards (R26), so each
 * threatened unit loses what a square would save. Zero with a longer hand, or with no cavalry threat.
 */
// approximates RR §5.3, R26 (engine: canFormSquare: terrain and the track's free slot are not weighed)
export function handFloorPenalty(s: GameState, me: Side, drop = 0): number {
  if (handSize(s, me) - drop >= SQUARE_MIN_HAND) return 0;
  const occ = occFor(s);
  const threatened: number[] = [];
  for (const u of occ.bySide[me]) {
    if (statsOf(s, u).arm !== 'infantry' || u.square !== undefined) continue;
    for (const e of occ.bySide[other(me)]) {
      if (statsOf(s, e).arm !== 'cavalry') continue;
      const d = distance(e.hex, u.hex);
      if (d <= 1 || reachOf(s, occ, e, u.hex) >= d) {
        threatened.push(unitValue(s, u));
        break;
      }
    }
  }
  threatened.sort((x, y) => y - x);
  return SQUARE_SAVES * threatened.slice(0, FLOOR_UNITS).reduce((a, v) => a + v, 0);
}
