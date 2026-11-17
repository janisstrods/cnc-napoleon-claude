// Which pieces a card may order (RR §6, §12): the section cards (counts per section) and the tactic cards (kinds, a whole
// section, leaders, La Grande Manoeuvre, Cold Steel's automatic orders) with the R57 fallback.
import { CARD_DEFS } from './cards';
import { sectionsOf } from './hex';
import { enemyUnitAdjacent, isLeaderId, leaderById, pieceById, pieceHex, unitById, unitsOf } from './query';
import { matches, statsOf } from './units';
import { OFF_BOARD, SECTIONS, type CardKind, type GameState, type OrderedPiece, type SectionName, type SelectRule, type Side, type Unit } from './types';

type Counts = Partial<Record<SectionName, number>>;

/** The per-section counts of a `sections` card (`'command'` = `turn.command`), or null for another kind of select. */
function sectionCounts(s: GameState, kind: CardKind): Counts | null {
  const sel = CARD_DEFS[kind].select;
  if (sel.kind !== 'sections') return null;
  const out: Counts = {};
  for (const [k, v] of Object.entries(sel.counts)) out[k as SectionName] = v === 'command' ? s.turn.command : v;
  return out;
}

function ownPieceHex(s: GameState, side: Side, id: string): number | null {
  const p = pieceById(s, id);
  return p && p.side === side && p.hex >= 0 ? p.hex : null;
}

/** Own units of the card's `match` on the board (`kinds` and `sectionAll` only). */
function matchingUnits(s: GameState, side: Side, sel: SelectRule): Unit[] {
  if (sel.kind !== 'kinds' && sel.kind !== 'sectionAll') return [];
  return unitsOf(s, side).filter((u) => matches(statsOf(s, u), sel.match));
}

/** The units of a card of `kinds` or `sectionAll` that could be ordered (not adjacent to an enemy where the card says so). */
function kindsEligible(s: GameState, side: Side, sel: SelectRule): Unit[] {
  const all = matchingUnits(s, side, sel);
  return sel.kind === 'kinds' && sel.notAdjacentToEnemy ? all.filter((u) => !enemyUnitAdjacent(s, u.hex, side)) : all;
}

/** The pieces that could be ordered by this card (an attached leader only where the card lets him detach). */
export function eligiblePieces(s: GameState, side: Side, kind: CardKind): string[] {
  const sel = CARD_DEFS[kind].select;
  const ids = [...s.units, ...s.leaders].filter((p) => p.side === side && p.hex >= 0).map((p) => p.id);
  const units = unitsOf(s, side).map((u) => u.id);
  switch (sel.kind) {
    case 'sections': {
      const counts = sectionCounts(s, kind)!;
      const detach = CARD_DEFS[kind].detach;
      return ids.filter((id) => (detach || !isLeaderId(id) || !attachedUnitOf(s, id)) && sectionsOf(pieceHex(s, id)!, side).some((sec) => (counts[sec] ?? 0) > 0));
    }
    case 'kinds':
    case 'sectionAll':
      return fallbackActive(s, side, kind) ? units : kindsEligible(s, side, sel).map((u) => u.id);
    case 'adjacentToEnemy':
      return autoOrders(s, side, kind) ?? [];
    case 'leaders': {
      if (fallbackActive(s, side, kind)) return units;
      return ids.filter((id) => isLeaderId(id) || attachedLeaderOf(s, id));
    }
    case 'grandManoeuvre':
      return ids.filter((id) => !squareOrLeaderOfSquare(s, id));
    default:
      return ids.filter((id) => !isLeaderId(id) || !attachedUnitOf(s, id));
  }
}

/** The own leader attached to unit `id`, or undefined. */
function attachedLeaderOf(s: GameState, id: string): string | undefined {
  const u = unitById(s, id);
  return u && u.hex >= 0 ? s.leaders.find((l) => l.side === u.side && l.hex === u.hex)?.id : undefined;
}

/** A unit in square, or a leader attached to one (La Grande Manoeuvre's group excludes both). */
function squareOrLeaderOfSquare(s: GameState, id: string): boolean {
  if (isLeaderId(id)) {
    const l = leaderById(s, id)!;
    return s.units.some((u) => u.side === l.side && u.hex === l.hex && u.square !== undefined);
  }
  return unitById(s, id)?.square !== undefined;
}

function attachedUnitOf(s: GameState, leaderId: string): boolean {
  const l = leaderById(s, leaderId);
  return !!l && s.units.some((u) => u.side === l.side && u.hex === l.hex);
}

/** The most pieces the card orders. */
export function orderLimit(s: GameState, _side: Side, kind: CardKind): number {
  const counts = sectionCounts(s, kind);
  if (counts) return Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
  const sel = CARD_DEFS[kind].select;
  switch (sel.kind) {
    case 'none': case 'copy': case 'shortSupply': case 'dice': return 0;
    case 'kinds': return fallbackActive(s, _side, kind) ? 1 : sel.max;
    case 'grandManoeuvre': return sel.max;
    case 'sectionAll': return fallbackActive(s, _side, kind) ? 1 : Math.max(0, ...SECTIONS.map((sec) => sectionUnits(s, _side, sel, sec).length));
    case 'leaders': return fallbackActive(s, _side, kind) ? 1 : eligiblePieces(s, _side, kind).length;
    case 'adjacentToEnemy': return autoOrders(s, _side, kind)?.length ?? 0;
    default: return 1;
  }
}

/** The matching units of one section (a dotted-line unit is in both of its sections). */
function sectionUnits(s: GameState, side: Side, sel: SelectRule, sec: SectionName): Unit[] {
  return matchingUnits(s, side, sel).filter((u) => sectionsOf(u.hex, side).includes(sec));
}

/** Can the pieces (each with its sections) fill the sections' slots? A matching by augmenting paths. */
function matchable(pieces: SectionName[][], counts: Counts): boolean {
  const slots: SectionName[] = [];
  for (const sec of SECTIONS) for (let i = 0; i < (counts[sec] ?? 0); i++) slots.push(sec);
  const owner: (number | null)[] = slots.map(() => null);
  const tryPiece = (p: number, seen: Set<number>): boolean => {
    for (let k = 0; k < slots.length; k++) {
      if (seen.has(k) || !pieces[p].includes(slots[k])) continue;
      seen.add(k);
      if (owner[k] === null || tryPiece(owner[k]!, seen)) {
        owner[k] = p;
        return true;
      }
    }
    return false;
  };
  return pieces.every((_, p) => tryPiece(p, new Set()));
}

/** Why this order is refused, or null. `single` is La Grande Manoeuvre's "1 unit, normal rules". */
export function validateOrders(s: GameState, side: Side, kind: CardKind, pieces: readonly string[], single = false): string | null {
  if (new Set(pieces).size !== pieces.length) return 'Each piece takes one order.';
  for (const id of pieces) if (ownPieceHex(s, side, id) === null) return 'Order only your own units and leaders.';
  const counts = sectionCounts(s, kind);
  if (!counts) return validateTactic(s, side, kind, pieces, single);
  if (single) return 'That card has no single option.';
  const secs: SectionName[][] = [];
  for (const id of pieces) {
    if (isLeaderId(id)) {
      const l = leaderById(s, id)!;
      const unit = s.units.find((u) => u.side === l.side && u.hex === l.hex);
      if (unit) {
        if (!CARD_DEFS[kind].detach) return 'The leader cannot detach.';
        // a leader attached to a unit in square may only be ordered together with that unit (R32)
        if (unit.square !== undefined && !pieces.includes(unit.id)) return 'A leader cannot detach from a square.';
      }
    }
    secs.push(sectionsOf(ownPieceHex(s, side, id)!, side));
  }
  if (pieces.length > orderLimit(s, side, kind)) return 'Too many orders.';
  return matchable(secs, counts) ? null : 'Those pieces do not fit the card’s sections.';
}

/** The orders a card gives without asking, or null when the player chooses: Cold Steel orders every unit next to an enemy unit (R61). */
export function autoOrders(s: GameState, side: Side, kind: CardKind): string[] | null {
  if (CARD_DEFS[kind].select.kind !== 'adjacentToEnemy') return null;
  return unitsOf(s, side).filter((u) => enemyUnitAdjacent(s, u.hex, side)).map((u) => u.id);
}

/**
 * Is this card a fallback: a `kinds`, `sectionAll` or `leaders` card with no matching piece of the side on the board
 * (an ineligible one still counts, [Interp R57])? Then it orders one unit that uses only its normal rules.
 */
export function fallbackActive(s: GameState, side: Side, kind: CardKind): boolean {
  const sel = CARD_DEFS[kind].select;
  if (sel.kind === 'kinds' || sel.kind === 'sectionAll') return matchingUnits(s, side, sel).length === 0;
  if (sel.kind === 'leaders') return !s.leaders.some((l) => l.side === side && l.hex >= 0);
  return false;
}

/** The fallback's order: exactly one unit when the side has any (never a lone leader), else nothing. */
function validateFallback(s: GameState, side: Side, pieces: readonly string[]): string | null {
  if (pieces.some(isLeaderId)) return 'Order one unit, not a leader.';
  const need = unitsOf(s, side).length > 0 ? 1 : 0;
  return pieces.length === need ? null : 'You have none of those units: order exactly one unit of your choice.';
}

/** The tactic cards' order rules (RR §12.2, R57–R62). */
function validateTactic(s: GameState, side: Side, kind: CardKind, pieces: readonly string[], single: boolean): string | null {
  const sel = CARD_DEFS[kind].select;
  if (single && sel.kind !== 'grandManoeuvre') return 'That card has no single option.';
  switch (sel.kind) {
    case 'kinds': {
      if (fallbackActive(s, side, kind)) return validateFallback(s, side, pieces);
      if (pieces.length > sel.max) return `That card orders up to ${sel.max} units.`;
      const ok = new Set(kindsEligible(s, side, sel).map((u) => u.id));
      return pieces.every((id) => ok.has(id)) ? null : sel.notAdjacentToEnemy ? 'Order only matching units not next to an enemy unit.' : 'Order only matching units.';
    }
    case 'sectionAll': {
      if (fallbackActive(s, side, kind)) return validateFallback(s, side, pieces);
      const want = (sec: SectionName) => sectionUnits(s, side, sel, sec).map((u) => u.id);
      const given = new Set(pieces);
      const ok = SECTIONS.some((sec) => { const w = want(sec); return w.length > 0 && w.length === given.size && w.every((id) => given.has(id)); });
      return ok ? null : 'Order all the matching units of one section.';
    }
    case 'adjacentToEnemy': {
      const auto = autoOrders(s, side, kind)!;
      return auto.length === pieces.length && auto.every((id) => pieces.includes(id)) ? null : 'Every unit next to an enemy unit is ordered.';
    }
    case 'leaders': {
      if (fallbackActive(s, side, kind)) return validateFallback(s, side, pieces);
      const leaders = s.leaders.filter((l) => l.side === side && l.hex >= 0);
      for (const l of leaders) if (!pieces.includes(l.id)) return 'Every leader is ordered.';
      for (const id of pieces) {
        if (isLeaderId(id)) continue;
        const lid = attachedLeaderOf(s, id);
        if (!lid || !pieces.includes(lid)) return 'Order only units that stay with a leader.';
      }
      for (const l of leaders) {
        const sq = s.units.find((u) => u.side === side && u.hex === l.hex && u.square !== undefined);
        if (sq && !pieces.includes(sq.id)) return 'A leader cannot detach from a square.';
      }
      return null;
    }
    case 'grandManoeuvre': {
      if (single) {
        const u = pieces.length === 1 ? unitById(s, pieces[0]) : undefined;
        return u ? null : 'Order exactly one unit.';
      }
      if (pieces.length > sel.max) return `That card orders up to ${sel.max} units or leaders.`;
      return pieces.some((id) => squareOrLeaderOfSquare(s, id)) ? 'A unit in square cannot take part (nor a leader from it).' : null;
    }
    default:
      if (pieces.length > orderLimit(s, side, kind)) return 'That card orders one unit.';
      if (pieces.length === 1 && isLeaderId(pieces[0]) && attachedUnitOf(s, pieces[0])) return 'Only a lone leader may be ordered.';
      return null;
  }
}

/** The order state of piece `id` just ordered: it starts where it stands and has not moved or battled. */
export function newOrderedPiece(s: GameState, id: string, cardMods: boolean): OrderedPiece {
  return {
    id, isLeader: isLeaderId(id), startHex: pieceHex(s, id) ?? OFF_BOARD, moved: 0, moveDone: false, battled: false, cardMods,
    stopEntered: false, noBattle: false, attachedThisTurn: false, bonusMeleeDone: false, stayInSquare: false,
  };
}

function shuffled<T>(xs: readonly T[], rnd: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A legal random answer for the card as the rules stand (every tactic select has its own sampler; the sections' is greedy). */
export function sampleOrders(s: GameState, side: Side, kind: CardKind, rnd: () => number): { pieces: string[]; single?: boolean } {
  const sel = CARD_DEFS[kind].select;
  const units = unitsOf(s, side);
  const oneUnit = (): { pieces: string[] } => ({ pieces: units.length ? [units[Math.floor(rnd() * units.length)].id] : [] });
  switch (sel.kind) {
    case 'kinds': {
      if (fallbackActive(s, side, kind)) return oneUnit();
      const pool = shuffled(kindsEligible(s, side, sel), rnd);
      const n = pool.length === 0 ? 0 : 1 + Math.floor(rnd() * Math.min(sel.max, pool.length));
      return { pieces: pool.slice(0, n).map((u) => u.id) };
    }
    case 'sectionAll': {
      if (fallbackActive(s, side, kind)) return oneUnit();
      const secs = SECTIONS.filter((sec) => sectionUnits(s, side, sel, sec).length > 0);
      return { pieces: sectionUnits(s, side, sel, secs[Math.floor(rnd() * secs.length)]).map((u) => u.id) };
    }
    case 'adjacentToEnemy':
      return { pieces: autoOrders(s, side, kind) ?? [] };
    case 'leaders': {
      if (fallbackActive(s, side, kind)) return oneUnit();
      const pieces: string[] = s.leaders.filter((l) => l.side === side && l.hex >= 0).map((l) => l.id);
      for (const u of shuffled(units, rnd)) {
        const lid = attachedLeaderOf(s, u.id);
        const keep = u.square !== undefined || rnd() < 0.5;
        if (lid && keep) pieces.push(u.id);
      }
      return { pieces };
    }
    case 'grandManoeuvre': {
      if (units.length > 0 && rnd() < 0.25) return { ...oneUnit(), single: true };
      return { pieces: shuffled(eligiblePieces(s, side, kind), rnd).slice(0, 1 + Math.floor(rnd() * sel.max)) };
    }
    default:
      break;
  }
  const elig = shuffled(eligiblePieces(s, side, kind), rnd);
  const detach = CARD_DEFS[kind].detach;
  let chosen: string[] = [];
  for (const id of elig) {
    // a leader attached to a unit detaches only now and then, so random play explores both
    if (detach && isLeaderId(id) && attachedUnitOf(s, id) && rnd() >= 0.25) continue;
    const trial = [...chosen, id];
    if (!validateOrders(s, side, kind, trial)) chosen = trial;
  }
  return { pieces: chosen };
}
