// Ordering (Plan 5 Task 6a): how much each piece gains from an order, the candidate order sets of every card, and a quick score
// for what a card could do now.
//
// Everything the card may order comes from the engine (`eligiblePieces`, `orderLimit`, `validateOrders`, `autoOrders`,
// `fallbackActive`, `unitMoves`, `battleTargets`, `effectiveCard`); the AI only ranks. Benefits are measured on a read-only
// view of the position with the card's modifiers and orders applied (`orderView`), so the engine's own dice, moves and battle
// permissions decide what an ordered piece can do. Each piece costs a bounded number of estimates (`KEPT`), so the work is
// linear in the pieces.
import {
  CARD_DEFS, CARD_LIST, NO_MODS, SECTIONS, autoOrders, battleTargets, canFireAt, cardKind, distance, effectiveCard, eligiblePieces, fallbackActive,
  fireDice, isLoneLeader, leaderMoves, leaderUnit, leadersOf, meleeDice, newOrderedPiece, orderLimit, other, sectionsOf, statsOf, unitMoves,
  unitsOf, validateOrders, OFF_BOARD,
  type CardKind, type GameState, type HexId, type Leader, type OrderedPiece, type SectionName, type Side, type Unit,
} from '../engine';
import { commandOf, withCommand } from './cardsense';
import { fireEstimate, loneLeaderEstimate, makeEstCtx, meleeEstimate, bannerValue, type EstCtx, type Outcome } from './estimate';
import { rowValue, unitValue, type Weights } from './values';

/** The most candidates offered for one card. */
export const MAX_CANDIDATES = 8;

export interface OrderCandidate {
  pieces: string[];
  /** La Grande Manoeuvre's "one unit, normal rules" answer. */
  single?: boolean;
  label: string;
  /** The summed benefit of the pieces (ranks the candidates; the planner's search decides between them). */
  benefit?: number;
}

/** Attacks estimated per piece (the best by a dice pre-score) across where it stands and where it may move. */
const KEPT = 3;
/** A benefit below this is no reason to order a piece. */
const EPS = 0.002;
/** An exit the piece may step off the board by, where its side's objectives score exits. */
const EXIT_BENEFIT = 0.5;
/** A lone leader that can join a unit near the enemy, per unit of the unit's health. */
const LEADER_JOIN = 0.06;
const LEADER_JOIN_FRONT = 0.1;
/** A lone leader next to an enemy must move. */
const LEADER_DANGER = 0.15;
/** Pull towards a needed objective hex, per hex nearer, as a share of its banners. */
const OBJ_STEP = 0.03;
/** An attached leader worth detaching (benefit above this) is offered as a piece of its own. */
const DETACH = 0.05;

/** The card a play of `kind` acts as (Counter-Attack copies the opponent's last card, R56), or null when nothing is copied. */
function effectiveOf(s: GameState, me: Side, kind: CardKind): CardKind | null {
  if (kind !== 'counterAttack') return kind;
  return effectiveCard(s, me, COUNTER_ID).kind;
}

/** Any id of the Counter-Attack card (effectiveCard reads only the kind of the id and the opponent's last card). */
const COUNTER_ID = CARD_LIST.indexOf('counterAttack');

/**
 * A read-only view of `s` as the orders of a card of `kind` (null: normal rules, no card) would leave it: the card's
 * modifiers on, every piece it may order recorded as ordered. Never mutate or drive it.
 */
function orderView(s: GameState, me: Side, kind: CardKind | null): GameState {
  const base = withCommand(s, kind && s.turn.phase === 'orders' && s.turn.effective === kind ? s.turn.command : commandOf(s, me));
  const def = kind ? CARD_DEFS[kind] : null;
  const seeded: GameState = {
    ...base, active: me,
    turn: { ...base.turn, command: base.turn.command, effective: kind, mods: def?.mods ?? NO_MODS, ordered: {} },
  };
  const cardMods = kind !== null && !fallbackActive(seeded, me, kind);
  const sk = def?.select.kind;
  const everyone = [...unitsOf(s, me).map((u) => u.id), ...leadersOf(s, me).map((l) => l.id)];
  const ids = kind === null || sk === 'dice' ? everyone : sk === 'none' || sk === 'shortSupply' || sk === 'copy' ? [] : eligiblePieces(seeded, me, kind);
  const ordered: Record<string, OrderedPiece> = {};
  for (const id of ids) ordered[id] = newOrderedPiece(seeded, id, cardMods);
  return { ...seeded, turn: { ...seeded.turn, ordered } };
}

interface Attack {
  at: HexId;
  moved: number;
  hex: HexId;
  kind: 'fire' | 'melee';
  score: number;
}

/** Cheap pre-score of an attack by dice against a target: the share of its blocks the dice take, times what it is worth. */
function preScore(s: GameState, me: Side, target: Unit | Leader | undefined, dice: number): number {
  if (!target) return 0;
  if (!('key' in target)) return 0.3 * Math.min(1, dice / 3);
  const hits = Math.min(target.blocks, dice * 0.4);
  return (hits / target.blocks) * (unitValue(s, target) + bannerValue(s, me, target));
}

/**
 * How much each own piece gains from being ordered by a card of `kind` (`null`: a plain order under normal rules): the best
 * of an attack where it stands, an attack after a move the card allows, and the pull of a move towards the enemy or a needed
 * hex, in banners. Only pieces the card may order appear. `ec` is the estimate context to reuse (one per root decision).
 */
export function pieceBenefits(s: GameState, me: Side, kind: CardKind | null, W: Weights, ec?: EstCtx): Map<string, number> {
  const eff = kind === null ? null : effectiveOf(s, me, kind);
  const out = new Map<string, number>();
  const hasDice = eff !== null && CARD_DEFS[eff].select.kind === 'dice';
  if (kind !== null && (eff === null || (!hasDice && ['none', 'shortSupply', 'copy'].includes(CARD_DEFS[eff].select.kind)))) return out;
  const v = orderView(s, me, eff);
  const ctx = ec ?? makeEstCtx(s, me, W);
  const occ = ctx.occ;
  const enemies = occ.bySide[other(me)];
  const nearest = (h: HexId): number => {
    let d = 99;
    for (const e of enemies) d = Math.min(d, distance(h, e.hex));
    return d;
  };
  const wants: { hex: HexId; banners: number }[] = [];
  for (const o of s.scenario.objectives) {
    if (o.side !== me) continue;
    if (o.kind === 'tempHex' || o.kind === 'exit') wants.push({ hex: o.hex, banners: o.banners });
    else if (o.kind === 'tempGroup') for (const h of o.hexes) wants.push({ hex: h, banners: o.banners / o.hexes.length });
  }
  const pull = (h: HexId): number => {
    let best = 99;
    let b = 0;
    for (const w of wants) {
      const d = distance(h, w.hex);
      if (d < best) {
        best = d;
        b = w.banners;
      }
    }
    return best === 99 ? 0 : -OBJ_STEP * b * best;
  };
  const exits = s.scenario.objectives.some((o) => o.kind === 'exit' && o.side === me);
  const dash = (u: Unit): number => (statsOf(s, u).arm === 'cavalry' ? W.cavalryDash : 1);
  for (const u of unitsOf(s, me)) {
    if (!v.turn.ordered[u.id]) continue;
    const st = statsOf(s, u);
    const d0 = nearest(u.hex);
    const attacks: Attack[] = [];
    // where it stands (the engine's own battle targets under the card)
    for (const t of battleTargets(v, u.id)) {
      const target = ctx.occ.unit[t.hex] ?? ctx.occ.leader[t.hex] ?? undefined;
      attacks.push({ at: u.hex, moved: 0, hex: t.hex, kind: t.kind, score: preScore(s, me, target ?? undefined, t.dice) });
    }
    let advance = 0;
    let exit = 0;
    const moves = unitMoves(v, u.id);
    const gapBase = d0 > 2 ? 1 : 0;
    const pull0 = pull(u.hex);
    for (const t of moves) {
      if (t.hex === OFF_BOARD) {
        if (exits) exit = EXIT_BENEFIT;
        continue;
      }
      const moved = t.path.length - 1;
      const gain = gapBase * W.advance * (d0 - nearest(t.hex)) * dash(u) + (pull(t.hex) - pull0);
      if (gain > advance) advance = gain;
      if (!t.battle) continue;
      const vu: Unit = { ...u, hex: t.hex };
      for (const e of enemies) {
        const d = distance(t.hex, e.hex);
        if (d === 1) {
          const dice = meleeDice(v, vu, e, { role: 'attack', moved, declared: true });
          if (dice >= 1) attacks.push({ at: t.hex, moved, hex: e.hex, kind: 'melee', score: preScore(s, me, e, dice) });
        } else if (d <= (st.fire.kind === 'none' ? 0 : st.fire.range) && canFireAt(v, vu, e.hex, occ)) {
          const dice = fireDice(v, vu, e.hex, { role: 'attack', moved });
          if (dice >= 1) attacks.push({ at: t.hex, moved, hex: e.hex, kind: 'fire', score: 0.9 * preScore(s, me, e, dice) });
        }
      }
      for (const l of s.leaders) {
        if (l.side === me || l.hex < 0 || occ.unit[l.hex] || distance(t.hex, l.hex) !== 1) continue;
        const dice = meleeDice(v, vu, l, { role: 'attack', moved, declared: true });
        if (dice >= 1) attacks.push({ at: t.hex, moved, hex: l.hex, kind: 'melee', score: preScore(s, me, l, dice) });
      }
    }
    attacks.sort((x, y) => y.score - x.score || x.moved - y.moved || x.hex - y.hex);
    let best = Math.max(advance, exit);
    for (const a of attacks.slice(0, KEPT)) {
      const unit: Unit = a.at === u.hex ? u : { ...u, hex: a.at };
      const e: EstCtx = { ...ctx, moved: a.moved, role: 'attack' };
      let o: Outcome;
      if (a.kind === 'fire') o = fireEstimate(v, unit, a.hex, e);
      else o = ctx.occ.unit[a.hex] ? meleeEstimate(v, unit, a.hex, e) : loneLeaderEstimate(v, unit, a.hex, e);
      best = Math.max(best, o.ev * dash(u));
    }
    out.set(u.id, Math.max(0, best));
  }
  for (const l of leadersOf(s, me)) {
    if (!v.turn.ordered[l.id]) continue;
    let b = 0;
    if (isLoneLeader(s, l)) {
      for (const u of unitsOf(s, me)) {
        if (distance(u.hex, l.hex) > 3 || occ.leader[u.hex]) continue;
        const g = (nearest(u.hex) <= 2 ? LEADER_JOIN_FRONT : LEADER_JOIN) * (u.blocks / u.maxBlocks);
        if (g > b) b = g;
      }
      if (nearest(l.hex) <= 1) b += LEADER_DANGER;
      if (exits && s.scenario.objectives.some((o) => o.kind === 'exit' && o.side === me && o.leadersScore) && leaderMoves(v, l.id).some((t) => t.hex === OFF_BOARD)) {
        b = Math.max(b, EXIT_BENEFIT);
      }
    } else {
      // a leader riding with a battered unit near the enemy should move to a healthier one
      const lu = leaderUnit(s, l);
      if (lu && lu.blocks * 2 <= lu.maxBlocks && nearest(lu.hex) <= 3 && unitsOf(s, me).some((u) => u !== lu && u.blocks * 2 > u.maxBlocks && distance(u.hex, l.hex) <= 3 && !occ.leader[u.hex])) b = 0.15;
    }
    out.set(l.id, b);
  }
  return out;
}

const keyOf = (c: OrderCandidate): string => `${c.single ? 's:' : ''}${[...c.pieces].sort().join(',')}`;

/**
 * Candidate order sets for a card, best first, at most `MAX_CANDIDATES` (and `n`): every one passes `validateOrders` (for a
 * Counter-Attack, against the card it copies; with nothing to copy, the empty order). Cards that ask nothing of the orderer (dice,
 * First Strike, Short Supply) and a Cold Steel with its automatic orders give one candidate. The Command is the one a card
 * played now would have (at the orders decision, the turn's own).
 */
export function orderCandidates(s: GameState, me: Side, kind: CardKind, W: Weights, n = MAX_CANDIDATES, ec?: EstCtx): OrderCandidate[] {
  const cap = Math.max(1, Math.min(n, MAX_CANDIDATES));
  const eff = effectiveOf(s, me, kind);
  if (eff === null) return [{ pieces: [], label: 'nothing to copy', benefit: 0 }];
  const def = CARD_DEFS[eff];
  const sel = def.select;
  if (sel.kind === 'dice' || sel.kind === 'none' || sel.kind === 'shortSupply' || sel.kind === 'copy') {
    return [{ pieces: [], label: sel.kind === 'dice' ? 'roll the dice' : 'no orders', benefit: 0 }];
  }
  const v = orderView(s, me, eff);
  if (sel.kind === 'adjacentToEnemy') {
    const auto = autoOrders(v, me, eff) ?? [];
    return [{ pieces: auto, label: 'every unit next to the enemy', benefit: 0 }];
  }
  const ben = pieceBenefits(s, me, eff, W, ec);
  const fb = fallbackActive(v, me, eff);
  const plain = fb ? pieceBenefits(s, me, null, W, ec) : ben;
  const b = (id: string): number => (fb ? plain : ben).get(id) ?? 0;
  const valid = (ids: string[], single = false): boolean => !validateOrders(v, me, eff, ids, single);
  const total = (ids: string[]): number => ids.reduce((a, id) => a + Math.max(0, b(id)), 0);
  const byBen = (ids: readonly string[]): string[] => [...ids].sort((x, y) => b(y) - b(x) || (x < y ? -1 : 1));
  const out: OrderCandidate[] = [];
  const seen = new Set<string>();
  const push = (pieces: string[], label: string, single = false): void => {
    const c: OrderCandidate = { pieces, label: `${def.title}: ${label}`, benefit: total(pieces), ...(single ? { single: true } : {}) };
    const k = keyOf(c);
    if (seen.has(k) || !valid(pieces, single)) return;
    seen.add(k);
    out.push(c);
  };
  const limit = orderLimit(v, me, eff);
  /** Greedy by benefit (zero-benefit pieces too unless `positive`), keeping every prefix valid. */
  const fill = (order: readonly string[], opts: { seed?: string[]; positive?: boolean; max?: number } = {}): string[] => {
    const sel2 = [...(opts.seed ?? [])];
    const room = opts.max ?? limit;
    for (const id of order) {
      if (sel2.length >= room) break;
      if (sel2.includes(id)) continue;
      if (opts.positive && b(id) <= EPS && sel2.length > 0) continue;
      if (valid([...sel2, id])) sel2.push(id);
    }
    return sel2;
  };
  const posOf = (id: string): HexId => {
    const u = s.units.find((x) => x.id === id);
    return u ? u.hex : s.leaders.find((l) => l.id === id)!.hex;
  };
  const elig = eligiblePieces(v, me, eff).filter((id) => {
    const isLeader = s.leaders.some((l) => l.id === id);
    // an attached leader takes a slot only where detaching pays
    return !isLeader || isLoneLeader(s, s.leaders.find((l) => l.id === id)!) || b(id) > DETACH;
  });
  const ranked = byBen(elig);
  switch (sel.kind) {
    case 'sections':
    case 'kinds': {
      push(fill(ranked), 'best');
      if (cap > 1) {
        push(fill(ranked, { positive: true }), 'worthwhile only');
        if (ranked.length) {
          // cluster around the most promising piece
          const top = posOf(ranked[0]);
          push(fill([...elig].sort((x, y) => b(y) - 0.04 * distance(top, posOf(y)) - (b(x) - 0.04 * distance(top, posOf(x))) || (x < y ? -1 : 1))), 'cluster');
          push(fill(ranked.slice(1)), 'without the best');
          push(fill(ranked, { max: 1 }), 'the best alone');
        }
        if (sel.kind === 'sections') {
          for (const sec of SECTIONS) {
            if (!def.sections.includes(sec) && !(sel.counts[sec] ?? 0)) continue;
            const inSec = ranked.filter((id) => sectionsOf(posOf(id), me).includes(sec));
            push(fill([...inSec, ...ranked.filter((id) => !inSec.includes(id))]), `${sec} first`);
          }
        } else {
          for (const k of [2, 3]) if (limit > k) push(fill(ranked, { max: k }), `best ${k}`);
        }
      }
      break;
    }
    case 'sectionAll': {
      // Force March orders every matching unit of one section: one candidate per section that has some
      const matching = fb ? [] : elig.filter((id) => !s.leaders.some((l) => l.id === id));
      if (fb) {
        for (const id of byBen(unitsOf(s, me).map((u) => u.id)).slice(0, 3)) push([id], 'one unit, normal rules');
        break;
      }
      const sets = SECTIONS.map((sec: SectionName) => ({ sec, ids: matching.filter((id) => sectionsOf(posOf(id), me).includes(sec)) }))
        .filter((x) => x.ids.length > 0);
      sets.sort((x, y) => total(y.ids) - total(x.ids));
      for (const x of sets) push(x.ids, `${x.sec} section`);
      break;
    }
    case 'leaders': {
      const leaders = leadersOf(s, me);
      if (fb) {
        for (const id of byBen(unitsOf(s, me).map((u) => u.id)).slice(0, 3)) push([id], 'one unit, normal rules');
        break;
      }
      // every leader is ordered; the units that stay with one are the choice (a unit in square must stay with its leader)
      const ids = leaders.map((l) => l.id);
      const attached = leaders.map((l) => leaderUnit(s, l)).filter((u): u is Unit => !!u);
      const forced = attached.filter((u) => u.square !== undefined).map((u) => u.id);
      const choice = byBen(attached.filter((u) => u.square === undefined).map((u) => u.id));
      push([...ids, ...forced, ...choice], 'every leader with his unit');
      if (cap > 1) {
        push([...ids, ...forced, ...choice.filter((id) => b(id) > EPS)], 'units worth ordering');
        push([...ids, ...forced], 'leaders alone');
        for (let k = 1; k <= Math.min(4, choice.length - 1); k++) push([...ids, ...forced, ...choice.slice(0, k)], `${k} best unit${k > 1 ? 's' : ''}`);
      }
      break;
    }
    case 'grandManoeuvre': {
      const all = eligiblePieces(v, me, eff);
      const rk = byBen(all);
      push(fill(rk), 'best movers');
      if (cap > 1) {
        push(fill(rk, { positive: true }), 'worthwhile movers');
        push(fill(rk, { max: 2 }), 'best two');
        push(fill(rk.filter((id) => !s.leaders.some((l) => l.id === id))), 'units only');
        // the single unit under normal rules (R62), judged by its plain benefit
        const plainB = pieceBenefits(s, me, null, W, ec);
        const units = unitsOf(s, me).map((u) => u.id).sort((x, y) => (plainB.get(y) ?? 0) - (plainB.get(x) ?? 0) || (x < y ? -1 : 1));
        for (const id of units.slice(0, 2)) push([id], 'one unit, normal rules', true);
      } else if (!out.length) {
        const plainB = pieceBenefits(s, me, null, W, ec);
        const top = unitsOf(s, me).map((u) => u.id).sort((x, y) => (plainB.get(y) ?? 0) - (plainB.get(x) ?? 0))[0];
        if (top) push([top], 'one unit, normal rules', true);
      }
      break;
    }
    default:
      break;
  }
  if (!out.length) out.push({ pieces: [], label: `${def.title}: no orders`, benefit: 0 });
  return out.slice(0, cap);
}

/**
 * A quick estimate of what a card could do now (for the fast opponent model and to rank cards): the best candidate's summed
 * benefit; a card that orders nothing scores 0, First Strike (never played on our own turn) -1.
 */
export function quickCardScore(s: GameState, me: Side, card: number, W: Weights, ec?: EstCtx): number {
  const kind = cardKind(card);
  if (kind === 'firstStrike') return -1;
  const eff = effectiveOf(s, me, kind);
  if (eff === null) return 0;
  const sel = CARD_DEFS[eff].select;
  if (sel.kind === 'none') return -1;
  if (sel.kind === 'shortSupply') return 0.05;
  if (sel.kind === 'dice') {
    const ctx = ec ?? makeEstCtx(s, me, W);
    const ben = pieceBenefits(s, me, eff, W, ctx);
    const command = commandOf(s, me);
    if (sel.roll === 'rally') {
      const gains = unitsOf(s, me)
        .filter((u) => u.blocks < u.maxBlocks)
        .map((u) => rowValue(statsOf(s, u), u.blocks + 1) - rowValue(statsOf(s, u), u.blocks))
        .sort((x, y) => y - x);
      return gains.slice(0, Math.ceil(0.5 * command)).reduce((a, g) => a + g, 0);
    }
    // Élan: about 0.6 of a die per Command orders a unit, each fighting with an extra die (the benefits already count it)
    const top = [...ben.values()].sort((x, y) => y - x);
    return top.slice(0, Math.max(1, Math.round(0.6 * command))).reduce((a, x) => a + Math.max(0, x), 0);
  }
  return orderCandidates(s, me, kind, W, 1, ec)[0]?.benefit ?? 0;
}
