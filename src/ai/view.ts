// The hidden-information boundary (Plan 5, ruling 1). This is the ONLY AI file that may touch `deck`, `hand`, `squareTrack`,
// `rng` or `rngCalls`, or call `cloneState` (tests/ai/hidden-scan.test.ts enforces it). Everything else asks this module.
//
// What a side may see: its own hand and own square-track cards, both hand sizes, the discard pile, `lastCard`, and the
// square counters on units (`unit.square`, public). It never sees the opponent's hand, the opponent's track cards, the deck
// order or the game's random generator. The "unseen pool" is therefore built as the complement of what is seen.
import { CARD_LIST, GameDriver, cardKind, cloneState, other, type CardKind, type GameState, type Side } from '../engine';
import type { Rng } from './rand';

/** Clones made by `blindClone` / `assumeOppHand` (the only states the AI may simulate on). */
const blind = new WeakSet<GameState>();

/** Clones that `determinize` produced (the only ones on which the sampled opponent hand may be read). */
const determinised = new WeakSet<GameState>();

/** My own hand. */
export function myHand(s: GameState, me: Side): readonly number[] {
  return s.players[me].hand;
}

/** My own square-track cards (slot i holds the card of the square with counter i + 1). */
export function myTrack(s: GameState, me: Side): readonly (number | null)[] {
  return s.players[me].squareTrack;
}

/** Cards in `side`'s hand (public). */
export function handSize(s: GameState, side: Side): number {
  return s.players[side].hand.length;
}

/** Filled square-track slots of `side`, counted from the square counters on its units (public), not from the track. */
export function trackFilled(s: GameState, side: Side): number {
  return filledSlots(s, side).length;
}

/** Track slot indices (0-3) that `side`'s units hold squares in. */
function filledSlots(s: GameState, side: Side): number[] {
  const slots: number[] = [];
  for (const u of s.units) if (u.side === side && u.square !== undefined) slots.push(u.square - 1);
  return slots.sort((a, b) => a - b);
}

/** Cards the AI cannot see: every card except my hand, my track, the discard and the card in play; sorted ascending. */
export function unseenCards(s: GameState, me: Side): number[] {
  const seen = new Set<number>(s.players[me].hand);
  for (const c of s.players[me].squareTrack) if (c !== null) seen.add(c);
  for (const c of s.discard) seen.add(c);
  if (s.turn.card !== null) seen.add(s.turn.card);
  const out: number[] = [];
  for (let i = 0; i < CARD_LIST.length; i++) if (!seen.has(i)) out.push(i);
  return out;
}

/** Unseen cards of `kind`. */
export function unseenOf(s: GameState, me: Side, kind: CardKind): number {
  let n = 0;
  for (const c of unseenCards(s, me)) if (cardKind(c) === kind) n++;
  return n;
}

/** P(the opponent holds at least one `kind`): a hand of `handSize` cards drawn from the unseen pool without replacement. */
export function oppHoldsP(s: GameState, me: Side, kind: CardKind): number {
  const pool = unseenCards(s, me).length;
  const k = unseenOf(s, me, kind);
  const n = handSize(s, other(me));
  if (k === 0 || n === 0) return 0;
  let none = 1; // C(pool-k, n) / C(pool, n)
  for (let i = 0; i < n; i++) {
    const rest = pool - k - i;
    if (rest <= 0) return 1;
    none *= rest / (pool - i);
  }
  return 1 - none;
}

/** Deal `order` into the opponent's hand, then its filled track slots, then the deck (the rest). Sizes and slots are kept. */
function deal(c: GameState, opp: Side, order: readonly number[], slots: readonly number[], n: number): void {
  const p = c.players[opp];
  p.hand = order.slice(0, n);
  const track: (number | null)[] = p.squareTrack.map(() => null);
  slots.forEach((slot, i) => {
    track[slot] = order[n + i];
  });
  p.squareTrack = track;
  c.deck = order.slice(n + slots.length);
}

/**
 * A clone with everything hidden rebuilt canonically: the opponent's hand, its filled track slots and the deck are dealt
 * from the sorted unseen pool (same sizes, same slots); `rng` is fixed. Every AI clone starts here.
 */
export function blindClone(s: GameState, me: Side): GameState {
  const opp = other(me);
  const c = cloneState(s);
  const pool = unseenCards(s, me);
  const slots = filledSlots(s, opp);
  const n = handSize(s, opp);
  // the pool, the opponent's hand, its filled slots and the deck must account for every unseen card
  if (pool.length !== s.deck.length + n + slots.length) {
    throw new Error(`blindClone: unseen pool ${pool.length} != deck ${s.deck.length} + hand ${n} + filled slots ${slots.length}`);
  }
  deal(c, opp, pool, slots, n);
  c.rng = 1;
  c.rngCalls = 0;
  blind.add(c);
  return c;
}

/**
 * A blind clone in which the opponent's hand holds exactly one `kind` when `holds` (if any is unseen) or none of it. The
 * remaining cards stay in canonical order. For engine option queries only; build once per root decision.
 */
export function assumeOppHand(s: GameState, me: Side, kind: CardKind, holds: boolean): GameState {
  const opp = other(me);
  const c = blindClone(s, me);
  const pool = unseenCards(s, me);
  const ofKind = pool.filter((id) => cardKind(id) === kind);
  const rest = pool.filter((id) => cardKind(id) !== kind);
  const n = handSize(s, opp);
  const hand = holds && ofKind.length > 0 && n > 0 ? [ofKind[0], ...rest.slice(0, n - 1)] : rest.slice(0, n);
  const used = new Set(hand);
  const order = [...hand, ...pool.filter((id) => !used.has(id))];
  deal(c, opp, order, filledSlots(s, opp), n);
  return c;
}

/**
 * Sample the hidden cards in place (on a blind clone): sort the unseen pool, shuffle it with `rand`, deal the opponent's
 * hand, its filled track slots and the deck. The result depends only on which cards are unseen. Then the clone gets a
 * fresh game-RNG state from `rand`.
 */
export function determinize(s: GameState, me: Side, rand: Rng): void {
  if (!blind.has(s)) throw new Error('determinize needs a clone made by blindClone');
  const opp = other(me);
  const pool = unseenCards(s, me);
  rand.shuffle(pool);
  deal(s, opp, pool, filledSlots(s, opp), handSize(s, opp));
  s.rng = rand.u32();
  s.rngCalls = 0;
  determinised.add(s);
}

/** Does the sampled opponent hand of a determinised clone hold a `kind`? Throws on any other state. */
export function sampledOppHolds(s: GameState, me: Side, kind: CardKind): boolean {
  if (!determinised.has(s)) throw new Error('sampledOppHolds is only legal on a clone that determinize produced');
  return s.players[other(me)].hand.some((c) => cardKind(c) === kind);
}

/** A driver on a blind clone (the GameDriver constructor copies the state, so it must never see a real one). */
export function driverOn(s: GameState): GameDriver {
  if (!blind.has(s)) throw new Error('driverOn needs a clone made by blindClone');
  return new GameDriver(s);
}
