// Text of the squares: a side's Command line (hand, cards, the square track) and the tooltip of a unit in square.
import { handShrinkRule, type GameState, type Side, type Unit } from '../../engine';

/** How many cards of `side` lie face down on its square track (a count: the opponent's cards are never named). */
export function trackCount(s: GameState, side: Side): number {
  return s.players[side].squareTrack.filter((c) => c !== null && c !== undefined).length;
}

/** "Hand 4 of 5 · 1 on the square track" (the track part is left out at 0). Counts only, so it is as true of the enemy as of the player. */
export function commandText(s: GameState, side: Side): string {
  const p = s.players[side];
  const n = trackCount(s, side);
  return `Hand ${p.hand.length} of ${s.special.handSize[side]}${n ? ` · ${n} on the square track` : ''}`;
}

/** The note on the hand line of a side whose hand shrinks (106): when and how far; undefined for any other side. */
export function handShrinkNote(s: GameState, side: Side): string | undefined {
  const r = handShrinkRule(s, side);
  return r ? `The hand falls by one with each banner lost, down to ${r.floor}.` : undefined;
}

/** Tooltip lines of a unit in square; none for any other unit. */
export function squareLines(_s: GameState, u: Unit): string[] {
  if (u.square === undefined) return [];
  return [`In square (counter ${u.square}): rolls at most 1 die; cannot move, take ground or break through; fights first against cavalry.`];
}
