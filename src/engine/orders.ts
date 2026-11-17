// Which pieces a card may order (RR §6, §12). Skeleton: `sections` rules with counts; every other select is 0–1 unit or
// lone leader anywhere (→ T11 for the sections' details, T12a for the tactic cards).
import { CARD_DEFS } from './cards';
import { sectionsOf } from './hex';
import { isLeaderId, leaderById, pieceById, pieceHex } from './query';
import { OFF_BOARD, SECTIONS, type CardKind, type GameState, type OrderedPiece, type SectionName, type Side } from './types';

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

/** The pieces that could be ordered by this card (an attached leader only where the card lets him detach). */
export function eligiblePieces(s: GameState, side: Side, kind: CardKind): string[] {
  const ids = [...s.units, ...s.leaders].filter((p) => p.side === side && p.hex >= 0).map((p) => p.id);
  const counts = sectionCounts(s, kind);
  if (!counts) return ids.filter((id) => !isLeaderId(id) || !attachedUnitOf(s, id));
  const detach = CARD_DEFS[kind].detach;
  return ids.filter((id) => (detach || !isLeaderId(id) || !attachedUnitOf(s, id)) && sectionsOf(pieceHex(s, id)!, side).some((sec) => (counts[sec] ?? 0) > 0));
}

function attachedUnitOf(s: GameState, leaderId: string): boolean {
  const l = leaderById(s, leaderId);
  return !!l && s.units.some((u) => u.side === l.side && u.hex === l.hex);
}

/** The most pieces the card orders. */
export function orderLimit(s: GameState, _side: Side, kind: CardKind): number {
  const counts = sectionCounts(s, kind);
  if (counts) return Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
  const k = CARD_DEFS[kind].select.kind;
  return k === 'none' || k === 'copy' || k === 'shortSupply' ? 0 : 1;
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
  if (!counts) {
    if (single && kind !== 'grandManoeuvre') return 'That card has no single option.';
    if (pieces.length > orderLimit(s, side, kind)) return 'That card orders one unit.';
    if (pieces.length === 1 && isLeaderId(pieces[0]) && attachedUnitOf(s, pieces[0])) return 'Only a lone leader may be ordered.';
    return null;
  }
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

/** The orders a card gives without asking, or null when the player chooses. Stub: null (→ T12a). */
export function autoOrders(_s: GameState, _side: Side, _kind: CardKind): string[] | null {
  return null;
}

/** Is this card a fallback (no unit of the kind it names): its order uses only normal rules? Stub: false (→ T12a). */
export function fallbackActive(_s: GameState, _side: Side, _kind: CardKind): boolean {
  return false;
}

/** The order state of piece `id` just ordered: it starts where it stands and has not moved or battled. */
export function newOrderedPiece(s: GameState, id: string, cardMods: boolean): OrderedPiece {
  return {
    id, isLeader: isLeaderId(id), startHex: pieceHex(s, id) ?? OFF_BOARD, moved: 0, moveDone: false, battled: false, cardMods,
    stopEntered: false, noBattle: false, attachedThisTurn: false, bonusMeleeDone: false, stayInSquare: false,
  };
}

/**
 * A legal random answer for the card as the rules stand: greedy over shuffled eligible pieces, checked with `validateOrders`
 * (T12a refines it for exact sets).
 */
export function sampleOrders(s: GameState, side: Side, kind: CardKind, rnd: () => number): { pieces: string[]; single?: boolean } {
  const elig = eligiblePieces(s, side, kind);
  for (let i = elig.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [elig[i], elig[j]] = [elig[j], elig[i]];
  }
  const detach = CARD_DEFS[kind].detach;
  let sel: string[] = [];
  for (const id of elig) {
    // a leader attached to a unit detaches only now and then, so random play explores both
    if (detach && isLeaderId(id) && attachedUnitOf(s, id) && rnd() >= 0.25) continue;
    const trial = [...sel, id];
    if (!validateOrders(s, side, kind, trial)) sel = trial;
  }
  return { pieces: sel };
}
