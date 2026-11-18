// The defender's reaction model (RR §9.2, §9.4, §9.5, §12.3): which reaction a defender takes to a melee (stand, Retire
// and Reform, form square, First Strike), what each is worth to it, and which Combined Arms guns an attacker adds.
//
// The options always come from the engine (`defendOptions`), never from a copy of its rules. Some of them read the
// defender's hand (a square needs SQUARE_MIN_HAND cards; First Strike needs the card), so for an opponent defender they are
// asked only on states whose opponent hand is assumed (`EstCtx.oppHands`, blind clones) or sampled (a determinised clone),
// never on the live state (Task 1 review, M-8).
//
// Task 4a froze this interface; Task 4b filled the First Strike branch (its sequence lives in estimate.ts, `branchesOf`) and
// `bestGuns`, the Combined Arms guns an attacker adds.
import {
  battleTargets, combinedArmsCandidates, distance, meleeDice, other, statsOf, unitById,
  type Decision, type DefendChoice, type GameState, type HexId, type MeleeCtx, type Unit,
} from '../engine';
// `defendOptions` lives in the engine's reactions module, which its index barrel does not re-export (as with `flagIgnores`).
import { defendOptions } from '../engine/reactions';
import type { Occ } from './board';
import { branchesOf, fireEstimate, makeEstCtx, meleeEstimate, meleeWithGuns, type EstCtx, type Outcome } from './estimate';
import { withAssumedHands } from './view';
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

/**
 * The cost of playing First Strike: the card's keep value (a mean card, `CARD_VALUE`, plus `W.firstStrikeReserve`) less the
 * replacement its owner draws at the end of that turn (R63, R78), a card of mean value: unlike a square's card, it leaves
 * the hand no shorter by the defender's next turn, so only the premium of holding First Strike is lost.
 */
export function firstStrikeCost(W: Weights): number {
  const keep = CARD_VALUE + W.firstStrikeReserve;
  return keep - CARD_VALUE;
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
 * - otherwise the worst for the attacker over the options asked on the position with the assumed hands `ec.oppHands`
 *   (`withAssumedHands`), holding a First Strike (weight `pFS`) or not. Those hands are assumed once at the root decision
 *   and reused for every estimate of the turn being planned, also on positions after the AI's own moves. That is an
 *   approximation: the opponent's hand does change during our turn (a square formed puts a card on its track and shrinks
 *   the hand, which can take away a later square; a First Strike played leaves the hand until the draw phase), and the
 *   assumed hands do not follow it; `pFS` is also not lowered after a First Strike is seen played this turn.
 */
export function reactionsFor(s: GameState, m: MeleeCtx, ec: EstCtx, defender: Unit, branch: (c: DefendChoice) => Outcome): Reaction[] {
  const one = (c: DefendChoice): Reaction[] => [{ choice: c, p: 1, o: branch(c) }];
  const worst = (options: readonly DefendChoice[]): DefendChoice => argmax(options, (c) => -branch(c).ev);
  if (defender.side === ec.viewer) {
    return one(argmax(defendOptions(s, m), (c) => -branch(c).ev + (c === 'formSquare' ? ec.W.squareBias : 0)));
  }
  if (ec.determinised) return one(worst(defendOptions(s, m)));
  const h = ec.oppHands;
  // EstCtx makes this a type error; a context cast past it must not quietly assume the opponent stands
  if (!h) throw new Error('reactionsFor: an opponent defender outside a simulation needs oppHands (build the context with makeEstCtx)');
  const out: Reaction[] = [];
  for (const [hands, p] of [[h.holdsFS, h.pFS], [h.noFS, 1 - h.pFS]] as const) {
    if (p <= 0) continue;
    const c = worst(defendOptions(withAssumedHands(s, hands), m));
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
 * minus the attacker's `ev` of that branch, so a square's cost and a First Strike card count against it. The `defend`
 * decision does not say which Combined Arms guns joined, so they are taken as `bestGuns` would have chosen them at the
 * declaration (`declaredGuns`; the eligible guns are public, ruling M-8).
 */
export function defendValue(s: GameState, d: Extract<Decision, { kind: 'defend' }>, W: Weights): Record<DefendChoice, number> {
  const out: Record<DefendChoice, number> = { stand: -Infinity, retireReform: -Infinity, formSquare: -Infinity, firstStrike: -Infinity };
  const attacker = unitById(s, d.attacker);
  const defender = unitById(s, d.target);
  if (!attacker || !defender) return out;
  const role = d.bonus ? 'bonus' : 'attack';
  const moved = s.turn.ordered[d.attacker]?.moved ?? 0;
  // the defender's own context (its side is the viewer, so the attacker's reactions in a bonus prospect are its own units')
  const ec: EstCtx = { ...makeEstCtx(s, d.side, W), moved, role };
  const artillery = declaredGuns(s, d, attacker, defender, ec);
  const m: MeleeCtx = { attacker: d.attacker, target: d.target, targetHex: defender.hex, role, artillery, reaction: null, declaredMoved: moved };
  const branch = branchesOf(s, attacker, defender, m, ec);
  for (const c of d.options) out[c] = -branch(c).ev;
  return out;
}

/**
 * The value to its side of gun `g`'s best battle of its own this turn (0 when it has none): what it gives up by joining a
 * Combined Arms attack, since a joining gun has made its one battle (R4).
 */
function ownShot(s: GameState, g: Unit, ec: EstCtx): number {
  const gec: EstCtx = { ...ec, moved: s.turn.ordered[g.id]?.moved ?? 0, role: 'attack' };
  let best = 0;
  for (const t of battleTargets(s, g.id)) {
    const o = t.kind === 'fire' ? fireEstimate(s, g, t.hex, gec) : meleeEstimate(s, g, t.hex, gec);
    best = Math.max(best, o.ev);
  }
  return best;
}

/**
 * Greedy Combined Arms choice: add the candidate gun (the engine's `combinedArmsCandidates`, asked on `pool`) that raises the
 * melee's value to the attacker (`evOf`, given the guns) most net of the gun's own shot (asked on `pool` too), while that
 * gain is positive. When the melee unit has no dice of its own the engine requires a gun (R15), so the best one joins even
 * at a loss.
 */
function chooseGuns(s: GameState, pool: GameState, unit: Unit, target: HexId, ec: EstCtx, evOf: (guns: string[]) => number): string[] {
  const foe = ec.occ.unit[target];
  if (!foe) return []; // no Combined Arms against a lone leader (R76)
  const role = ec.role === 'bonus' ? 'bonus' : 'attack';
  const options = combinedArmsCandidates(pool, unit, foe, role);
  if (options.length === 0) return [];
  // approximates RR §9.6, R15 (engine: combinedArmsStep's `required`): no dice of its own, so at least one gun must join
  const required = meleeDice(s, unit, foe, { role, moved: ec.moved, declared: true }) < 1;
  const chosen: string[] = [];
  let base = evOf(chosen);
  const shot = new Map<string, number>();
  for (;;) {
    let pick: string | null = null;
    let pickGain = -Infinity;
    let pickEv = 0;
    for (const id of options) {
      if (chosen.includes(id)) continue;
      const g = unitById(pool, id);
      if (!g) continue;
      if (!shot.has(id)) shot.set(id, ownShot(pool, g, ec));
      const e = evOf([...chosen, id]);
      const gain = e - base - shot.get(id)!;
      if (gain > pickGain) {
        pick = id;
        pickGain = gain;
        pickEv = e;
      }
    }
    if (pick === null || (pickGain <= 0 && !(required && chosen.length === 0))) break;
    chosen.push(pick);
    base = pickEv;
  }
  return chosen;
}

/** The Combined Arms guns `unit` should add to its melee on `target`: each one only while it raises `ev` net of its own shot. */
export function bestGuns(s: GameState, unit: Unit, target: HexId, ec: EstCtx): string[] {
  return chooseGuns(s, s, unit, target, ec, (guns) => meleeWithGuns(s, unit, target, guns, ec).ev);
}

/**
 * The guns the attacker of the declared melee `d` is taken to have joined (for `defendValue`, `ec` the defender's context):
 * `bestGuns` as at the declaration (ruling M-8). Two things differ from asking `bestGuns` on the defend decision's state:
 * - the engine has already marked the joined guns as having battled (combinedArmsStep), so the candidates and their own
 *   shots are asked on a view of the turn in which the attacker's ordered guns have not battled;
 * - the attacker chose without seeing the defender's hand, so each gun set is valued against the defender's reactions
 *   other than First Strike (the worst for the attacker of them), not against the defender's actual choice.
 */
// approximates RR §9.6 (engine: combinedArmsStep, whose choice the defend decision does not carry): a gun that battled
// earlier in the turn is also taken as free, so it may be counted as joining when it could not; the attacker's chance of
// meeting a First Strike (about 0.1–0.2) is left out of its choice
function declaredGuns(s: GameState, d: Extract<Decision, { kind: 'defend' }>, unit: Unit, defender: Unit, ec: EstCtx): string[] {
  const ordered = { ...s.turn.ordered };
  for (const [id, op] of Object.entries(ordered)) {
    const g = op.battled && !op.isLeader ? unitById(s, id) : undefined;
    if (g && g.side === unit.side && statsOf(s, g).arm === 'artillery') ordered[id] = { ...op, battled: false };
  }
  // a turn-only view (players, deck and RNG are those of `s`): only for the engine's gun queries, never mutated or driven
  const asDeclared: GameState = { ...s, turn: { ...s.turn, ordered } };
  const seen = d.options.filter((c) => c !== 'firstStrike');
  const role = d.bonus ? 'bonus' : 'attack';
  const evOf = (artillery: string[]): number => {
    const m: MeleeCtx = { attacker: unit.id, target: defender.id, targetHex: defender.hex, role, artillery, reaction: null, declaredMoved: ec.moved };
    const branch = branchesOf(s, unit, defender, m, ec);
    return Math.min(...seen.map((c) => branch(c).ev));
  };
  return chooseGuns(s, asDeclared, unit, defender.hex, ec, evOf);
}
