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
  CARD_DEFS, DIE_SIDES, SQUARE_MIN_HAND, TERRAIN_STATS, cardKind, distance, eligiblePieces, fallbackActive, greedyAssign, mirrorKind, orderLimit, other,
  statsOf, terrainAt, unitsOf, validateRally, worksForbidSquare,
  type CardKind, type DieFace, type GameState, type Side, type Unit,
} from '../engine';
import { occOf, type Occ } from './board';
import { bannerValue } from './estimate';
import { reachOf } from './evaluate';
import { handSize, myHand, myTrack } from './view';
import { CARD_VALUE, ELAN_SHARE, rowValue, unitValue, type Weights } from './values';

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

/** P(a die shows each of: infantry, cavalry, artillery, anything else) (RR §12.2; the engine's `DIE_SIDES`). */
const FACE_P = DIE_SIDES.reduce<[number, number, number, number]>((p, f) => {
  p[f === 'infantry' ? 0 : f === 'cavalry' ? 1 : f === 'artillery' ? 2 : 3] += 1 / DIE_SIDES.length;
  return p;
}, [0, 0, 0, 0]);

/** The faces of one Rally roll with these counts (the "other" faces are sabres: they rally nothing). */
function facesOf(i: number, c: number, a: number, o: number): DieFace[] {
  return [...Array<DieFace>(i).fill('infantry'), ...Array<DieFace>(c).fill('cavalry'), ...Array<DieFace>(a).fill('artillery'), ...Array<DieFace>(o).fill('sabre')];
}

/** A typical attack on a unit in reach: four dice, each a hit with probability one third (a stand-in for the real mix). */
const ELIM_DICE = 4;
const ELIM_HIT = 1 / 3;

/** P(a typical attack takes `blocks` blocks or more), the public elimination proxy of a unit with that many blocks. */
function elimP(blocks: number): number {
  if (blocks <= 0) return 1;
  let p = 0;
  for (let k = blocks; k <= ELIM_DICE; k++) {
    let ways = 1;
    for (let i = 0; i < k; i++) ways = (ways * (ELIM_DICE - i)) / (i + 1);
    p += ways * ELIM_HIT ** k * (1 - ELIM_HIT) ** (ELIM_DICE - k);
  }
  return p;
}

/**
 * The own wounded units an enemy could attack next turn (adjacent now, or within its reach): only those risk elimination, and only
 * wounded units can be rallied (a unit at full strength is never asked about, so its reach walk is skipped).
 */
function threatenedUnits(s: GameState, me: Side): Set<string> {
  const occ = occOf(s);
  const out = new Set<string>();
  for (const u of occ.bySide[me]) {
    if (u.blocks >= u.maxBlocks) continue;
    for (const e of occ.bySide[other(me)]) {
      const d = distance(e.hex, u.hex);
      if (d <= 1 || (d <= RALLY_FAR && reachOf(s, occ, e, u.hex) >= d)) {
        out.add(u.id);
        break;
      }
    }
  }
  return out;
}

/** Beyond this distance no enemy is worth the reach walk. */
const RALLY_FAR = 6;

/**
 * What the block a unit of `blocks` blocks gains is worth: the rise in its fighting value, plus, when an enemy can reach it, the
 * chance of its elimination that the block removes times the banner that elimination would score (the evaluation prices
 * banner risk itself; this is the same chance, kept public, so the dice go where a unit is about to die).
 */
function blockKey(s: GameState, me: Side, u: Unit, blocks: number, threatened: boolean): number {
  const st = statsOf(s, u);
  let v = rowValue(st, blocks + 1) - rowValue(st, blocks);
  if (threatened) v += bannerValue(s, other(me), u) * (elimP(blocks) - elimP(blocks + 1));
  return v;
}

/**
 * The assignment a Rally roll `faces` gets from us: each arm face takes, in turn, the own wounded unit of that arm whose next
 * block is worth most (`blockKey`: fighting value plus, for a unit an enemy can reach, the banner risk the block removes; ties by
 * id) that the engine's `validateRally` still allows (never above the starting blocks, R54). A unit's next block counts the
 * blocks already given it by earlier dice. `greedyAssign` is the engine's own. Deterministic.
 */
export function rallyAssign(s: GameState, me: Side, faces: readonly DieFace[]): (string | null)[] {
  return assignWith(s, me, faces, threatenedUnits(s, me));
}

function assignWith(s: GameState, me: Side, faces: readonly DieFace[], threat: ReadonlySet<string>): (string | null)[] {
  const wounded = unitsOf(s, me).filter((u) => u.blocks < u.maxBlocks);
  const given = new Map<string, number>();
  const plan = faces.map((face) => {
    const open = wounded.filter((u) => statsOf(s, u).arm === face && u.blocks + (given.get(u.id) ?? 0) < u.maxBlocks);
    const key = new Map(open.map((u) => [u.id, blockKey(s, me, u, u.blocks + (given.get(u.id) ?? 0), threat.has(u.id))]));
    const order = open.map((u) => u.id).sort((x, y) => key.get(y)! - key.get(x)! || (x < y ? -1 : 1));
    if (order.length) given.set(order[0], (given.get(order[0]) ?? 0) + 1);
    return order;
  });
  return greedyAssign(faces.length, (i) => plan[i], (trial) => validateRally(s, me, faces, trial));
}

/**
 * The expected value, in banners, of a Rally rolled with `command` dice: the exact expectation over the face counts (a
 * multinomial over `DIE_SIDES`, at most C(command + 3, 3) cases), each case assigned by `rallyAssign` and priced by the
 * blocks it returns (`blockKey`, the same price `rallyAssign` ranks by, so the card is valued as it is played). No random draw.
 */
export function rallyGain(s: GameState, me: Side, command: number): number {
  const n = Math.max(0, Math.floor(command));
  if (!unitsOf(s, me).some((u) => u.blocks < u.maxBlocks)) return 0;
  const fact = (k: number): number => (k <= 1 ? 1 : k * fact(k - 1));
  const threat = threatenedUnits(s, me);
  let total = 0;
  for (let i = 0; i <= n; i++) {
    for (let c = 0; c + i <= n; c++) {
      for (let a = 0; a + c + i <= n; a++) {
        const o = n - i - c - a;
        const p = (fact(n) / (fact(i) * fact(c) * fact(a) * fact(o))) * FACE_P[0] ** i * FACE_P[1] ** c * FACE_P[2] ** a * FACE_P[3] ** o;
        if (i + c + a === 0) continue;
        const faces = facesOf(i, c, a, o);
        const ids = assignWith(s, me, faces, threat);
        const gain = new Map<string, number>();
        for (const id of ids) if (id !== null) gain.set(id, (gain.get(id) ?? 0) + 1);
        let v = 0;
        for (const [id, k] of gain) {
          const u = s.units.find((x) => x.id === id)!;
          for (let j = 0; j < k; j++) v += blockKey(s, me, u, u.blocks + j, threat.has(id));
        }
        total += p * v;
      }
    }
  }
  return total;
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
function kindValue(s: GameState, me: Side, kind: CardKind, W: Weights, copied: boolean, occ: Occ): number {
  const def = CARD_DEFS[kind];
  const command = commandOf(s, me);
  switch (def.select.kind) {
    case 'copy': {
      // Counter-Attack plays a (mirrored) copy of the opponent's last card (R56): it is worth that copy (engine: effectiveCard)
      const last = s.lastCard[other(me)];
      if (!last || copied) return COPY_NONE;
      const copy = mirrorKind(last);
      return CARD_DEFS[copy].select.kind === 'copy' ? COPY_NONE : kindValue(s, me, copy, W, true, occ);
    }
    case 'none':
      return enemiesReach(s, me, occ) ? BASE[kind] + W.firstStrikeReserve : FIRST_STRIKE_IDLE;
    case 'shortSupply':
      return unitsOf(s, me).length ? BASE[kind] : EMPTY;
    case 'dice': {
      if (def.select.roll === 'rally') {
        const units = unitsOf(s, me);
        if (!units.length) return EMPTY;
        const gain = rallyGain(s, me, command);
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
        if (u) ws.push(engagement(s, occ, u)); // a leader takes a slot but adds no fighting power
      }
      ws.sort((x, y) => y - x);
      const used = ws.slice(0, Math.max(1, limit)).reduce((a, x) => a + x, 0);
      // approximates the value of La Grande Manoeuvre and Force March (their orders are movement and a whole section, not
      // counted per fighting unit): left to Task 11's calibration
      const fill = Math.min(FILL_CAP, used / nominalOrders(kind));
      return Math.max(EMPTY, BASE[kind] * fill * (fallbackActive(view, me, kind) ? FALLBACK : 1));
    }
  }
}

/**
 * The value, in banners, of keeping `card` (an id in our hand, or one just drawn by a Scout) for a later turn. A mean card is
 * about `CARD_VALUE`. Reads our own units and public facts only.
 */
export function keepValue(s: GameState, me: Side, card: number, W: Weights, occ: Occ = occOf(s)): number {
  return kindValue(s, me, cardKind(card), W, false, occ) * W.retention;
}

/**
 * The mean keep value of the cards in `me`'s own hand (`CARD_VALUE` when it is empty). Only for the viewer's own side: the
 * opponent's hand is never read.
 */
export function meanHandValue(s: GameState, me: Side, W: Weights): number {
  const hand = myHand(s, me);
  if (!hand.length) return CARD_VALUE;
  let sum = 0;
  const occ = occOf(s);
  for (const c of hand) sum += keepValue(s, me, c, W, occ);
  return sum / hand.length;
}

/** Which of two Scout cards to keep: the higher keep value (the first on a tie). */
export function scoutKeepIndex(s: GameState, me: Side, cards: readonly [number, number], W: Weights): 0 | 1 {
  const occ = occOf(s);
  return keepValue(s, me, cards[1], W, occ) > keepValue(s, me, cards[0], W, occ) ? 1 : 0;
}

/**
 * The cost of a hand at `SQUARE_MIN_HAND − 1` or fewer cards (after `drop` more leave it: a square formed, a First Strike
 * played) while enemy cavalry can reach our infantry in the open: a square needs `SQUARE_MIN_HAND` cards (R26), so each
 * threatened unit loses what a square would save. Zero with a longer hand, or with no cavalry threat.
 */
// approximates RR §5.3, R26 (engine: canFormSquare; its conditions are applied here except the attacker's role)
export function handFloorPenalty(s: GameState, me: Side, drop = 0): number {
  if (handSize(s, me) - drop >= SQUARE_MIN_HAND) return 0;
  const occ = occOf(s);
  const track = myTrack(s, me);
  const slotFree = track.some((c) => c === null || c === undefined);
  const threatened: number[] = [];
  for (const u of occ.bySide[me]) {
    if (statsOf(s, u).arm !== 'infantry' || u.square !== undefined) continue;
    // the engine's square conditions that do not depend on the hand: a free track slot, terrain, works (R26)
    if (!slotFree || !TERRAIN_STATS[terrainAt(s, u.hex)].squareAllowed) continue;
    for (const e of occ.bySide[other(me)]) {
      if (statsOf(s, e).arm !== 'cavalry' || worksForbidSquare(s, u, e.hex)) continue;
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
