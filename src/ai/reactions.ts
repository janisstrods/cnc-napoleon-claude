// The defender's reaction model (RR §9.2, §9.4, §9.5, §12.3): which reaction a defender takes to a melee (stand, Retire
// and Reform, form square, First Strike), what each is worth to it, and which Combined Arms guns an attacker adds.
//
// The options always come from the engine (`defendOptions`), never from a copy of its rules. Some of them read the
// defender's hand (a square needs SQUARE_MIN_HAND cards; First Strike needs the card), so for an opponent defender they are
// asked only on states whose opponent hand is assumed (`EstCtx.oppHands`, blind clones) or sampled (a determinised clone),
// never on the live state (Task 1 review, M-8).
//
// Task 4a freezes this interface. The First Strike branch (its sequence) and `bestGuns` are filled by Task 4b: until then
// First Strike is priced as a card spent for nothing (never chosen) and no gun joins a melee.
import { distance, other, statsOf, unitById, type Decision, type DefendChoice, type GameState, type HexId, type MeleeCtx, type Unit } from '../engine';
// `defendOptions` lives in the engine's reactions module, which its index barrel does not re-export (as with `flagIgnores`).
import { defendOptions } from '../engine/reactions';
import { occOf, type Occ } from './board';
import { branchesOf, type EstCtx, type Outcome } from './estimate';
import { CARD_VALUE, unitValue, type Weights } from './values';

/** One reaction the model expects, its probability and its outcome (from the attacker's side). */
export interface Reaction {
  choice: DefendChoice;
  p: number;
  o: Outcome;
}

/** Turns a square lasts with only the attacking cavalry about: it leaves when ordered with no enemy cavalry adjacent. */
const SQUARE_BASE_TURNS = 1.5;
/** Each further enemy cavalry unit within `SQUARE_THREAT_RANGE` keeps the square formed about one turn longer. */
const SQUARE_TURNS_PER_CAVALRY = 1;
const SQUARE_THREAT_RANGE = 3;
const SQUARE_MAX_TURNS = 6;
/** A hand one card short (Command −1) for one turn: one choice fewer when the card is picked. */
const COMMAND_TURN = 0.03;
/** A unit in square for one turn, as a share of its value: it cannot move and fires and fights with 1 die. */
const IMMOBILE_TURN = 0.06;

/** Expected turns `unit` stays in square: longer with more enemy cavalry near it (the threat that keeps it formed). */
export function squareTurns(s: GameState, unit: Unit, occ: Occ): number {
  let cav = 0;
  for (const e of occ.bySide[other(unit.side)]) if (statsOf(s, e).arm === 'cavalry' && distance(e.hex, unit.hex) <= SQUARE_THREAT_RANGE) cav++;
  return Math.min(SQUARE_MAX_TURNS, SQUARE_BASE_TURNS + SQUARE_TURNS_PER_CAVALRY * Math.max(0, cav - 1));
}

/**
 * The cost to its side of `unit` forming square (R28, RR §5.3): the card goes back to the hand when the square ends, so the
 * cost is temporary: a card unavailable while it lasts (`CARD_VALUE` × turns ÷ 3), the hand one card short (Command −1) for
 * that time, and the unit's immobility.
 */
export function squareCost(s: GameState, unit: Unit, occ: Occ): number {
  const turns = squareTurns(s, unit, occ);
  return turns * (CARD_VALUE / 3 + COMMAND_TURN + IMMOBILE_TURN * unitValue(s, unit));
}

/** The cost of playing First Strike: the card's keep value. */
export function firstStrikeCost(W: Weights): number {
  return CARD_VALUE + W.firstStrikeReserve;
}

/** The position of `s` with the hands (and square tracks) of the assumed clone `hands`: what an engine option query reads. */
function withHands(s: GameState, hands: GameState): GameState {
  return { ...s, players: hands.players };
}

/** The first option with the largest `score` (the engine lists 'stand' first, so a tie stands). */
function argmax(options: readonly DefendChoice[], score: (c: DefendChoice) => number): DefendChoice {
  let best = options[0] ?? 'stand';
  let bestV = -Infinity;
  for (const c of options) {
    const v = score(c);
    if (v > bestV) {
      bestV = v;
      best = c;
    }
  }
  return best;
}

/**
 * The reactions expected of `defender` to the melee `m`, each priced by `branch`:
 * - the AI's own defender (`ec.viewer`): what its defend policy answers, the best of `defendValue` with `squareBias` on a
 *   square, over `defendOptions(s, m)`;
 * - an opponent defender inside a simulation (`ec.determinised`): the worst for the attacker over the options of the
 *   sampled clone itself;
 * - otherwise the worst for the attacker over the options with the assumed hands `ec.oppHands`, holding a First Strike
 *   (weight `pFS`) or not. Without `oppHands` (a context not built by `makeEstCtx`) the opponent is taken to stand.
 */
export function reactionsFor(s: GameState, m: MeleeCtx, ec: EstCtx, defender: Unit, branch: (c: DefendChoice) => Outcome): Reaction[] {
  const one = (c: DefendChoice): Reaction[] => [{ choice: c, p: 1, o: branch(c) }];
  const worst = (options: readonly DefendChoice[]): DefendChoice => argmax(options, (c) => -branch(c).ev);
  if (defender.side === ec.viewer) {
    return one(argmax(defendOptions(s, m), (c) => -branch(c).ev + (c === 'formSquare' ? ec.W.squareBias : 0)));
  }
  if (ec.determinised) return one(worst(defendOptions(s, m)));
  const h = ec.oppHands;
  if (!h) return one('stand');
  const out: Reaction[] = [];
  for (const [hands, p] of [[h.holdsFS, h.pFS], [h.noFS, 1 - h.pFS]] as const) {
    if (p <= 0) continue;
    const c = worst(defendOptions(withHands(s, hands), m));
    const known = out.find((r) => r.choice === c);
    if (known) known.p += p;
    else out.push({ choice: c, p, o: branch(c) });
  }
  return out;
}

/** The reactions expected to the melee `m` (see `reactionsFor`), the probabilities summing to 1. */
export function reactionOutcomes(s: GameState, m: MeleeCtx, ec: EstCtx): Reaction[] {
  const attacker = unitById(s, m.attacker);
  const defender = unitById(s, m.target);
  if (!attacker || !defender) return [];
  return reactionsFor(s, m, ec, defender, branchesOf(s, attacker, defender, m, ec));
}

/**
 * The value of each offered reaction to the defender of `d` (−Infinity for one not offered), from the defender's side:
 * minus the attacker's `ev` of that branch, so a square's cost and a First Strike card count against it.
 */
export function defendValue(s: GameState, d: Extract<Decision, { kind: 'defend' }>, W: Weights): Record<DefendChoice, number> {
  const out: Record<DefendChoice, number> = { stand: -Infinity, retireReform: -Infinity, formSquare: -Infinity, firstStrike: -Infinity };
  const attacker = unitById(s, d.attacker);
  const defender = unitById(s, d.target);
  if (!attacker || !defender) return out;
  const role = d.bonus ? 'bonus' : 'attack';
  const moved = s.turn.ordered[d.attacker]?.moved ?? 0;
  const m: MeleeCtx = { attacker: d.attacker, target: d.target, targetHex: defender.hex, role, artillery: [], reaction: null, declaredMoved: moved };
  const ec: EstCtx = { occ: occOf(s), W, viewer: d.side, moved, role, determinised: false };
  const branch = branchesOf(s, attacker, defender, m, ec);
  for (const c of d.options) out[c] = -branch(c).ev;
  return out;
}

/** The Combined Arms guns `unit` should add to its melee on `target` (Task 4b; none until then). */
export function bestGuns(_s: GameState, _unit: Unit, _target: HexId, _ec: EstCtx): string[] {
  return [];
}
