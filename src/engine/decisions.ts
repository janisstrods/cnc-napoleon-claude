// Decisions: the flow is a generator (`Gen`) that yields a Decision and receives an Answer. `ask` yields one until a
// legal answer comes back; `answerError` is the one validator of every answer, dispatching to the validators of
// options.ts, orders.ts and tacticRules.ts.
import { validateBattle, validateMove, type Found } from './options';
import { validateOrders } from './orders';
import { validateElan, validateRally } from './tacticRules';
import type { Answer, Decision, FlowCtx, GameState } from './types';

export type Gen<T = void> = Generator<Decision, T, Answer>;

/** Yield decision `d` until a legal answer comes back; each refusal is reported to `ctx.invalid`. */
export function* ask(s: GameState, ctx: FlowCtx, d: Decision, found?: Found): Gen<Answer> {
  for (;;) {
    const a = yield d;
    const err = answerError(s, d, a, found);
    if (!err) return a;
    ctx.invalid?.(err);
  }
}

const choosesOneOf = (a: Answer, n: number): boolean => a.kind === 'choose' && Number.isInteger(a.index) && a.index >= 0 && a.index < n;

/**
 * Why answer `a` to decision `d` is refused in state `s` (the message the UI shows), or null when it is legal. `ask`
 * re-asks with it, and the AI's legality check is `answerError(...) === null`. `found` receives the move or battle target
 * a legal answer picked.
 */
export function answerError(s: GameState, d: Decision, a: Answer | null | undefined, found?: Found): string | null {
  if (!a) return 'No answer.';
  switch (d.kind) {
    case 'playCard':
      return a.kind === 'playCard' && s.players[d.side].hand.includes(a.card) ? null : 'Play a card from your hand.';
    case 'orders':
      if (a.kind !== 'orders') return 'Choose the units to order.';
      if (a.single && !d.single) return 'That card has no single option.';
      return validateOrders(s, d.side, d.card, a.pieces, !!a.single);
    case 'leaveSquare':
    case 'advance':
      return a.kind === 'yesno' ? null : 'Answer yes or no.';
    case 'move':
      return validateMove(s, a, found);
    case 'battle':
      return validateBattle(s, a, found);
    case 'combinedArms':
      if (a.kind !== 'select' || new Set(a.ids).size !== a.ids.length || !a.ids.every((id) => d.options.includes(id))) return 'Choose artillery from the list.';
      return d.required && a.ids.length === 0 ? 'This unit has no dice of its own; at least one gun must join.' : null;
    case 'defend':
      return a.kind === 'defend' && d.options.includes(a.choice) ? null : 'Choose how to defend.';
    case 'ignoreFlags':
      return a.kind === 'ignoreFlags' && Number.isInteger(a.count) && a.count >= 0 && a.count <= d.max ? null : `Ignore between 0 and ${d.max} flags.`;
    case 'retreat':
      return choosesOneOf(a, d.options.length) ? null : 'Choose a destination.';
    case 'leaderRetreat':
      return choosesOneOf(a, d.options.length) ? null : 'Choose a retreat for the leader.';
    case 'breakthroughExtra':
      return a.kind === 'hex' && (a.hex === null ? !d.required : d.options.includes(a.hex)) ? null : 'Choose a hex.';
    case 'bonusMelee':
      return a.kind === 'hex' && (a.hex === null || d.targets.includes(a.hex)) ? null : 'Choose a target or decline.';
    case 'elan':
      return a.kind === 'assign' ? (a.ids.length === d.faces.length ? validateElan(s, d.side, d.faces, a.ids) : 'Assign every die.') : 'Assign the Élan dice.';
    case 'rally':
      return a.kind === 'assign' ? (a.ids.length === d.faces.length ? validateRally(s, d.side, d.faces, a.ids) : 'Assign every die.') : 'Assign the Rally dice.';
    case 'scoutKeep':
      return choosesOneOf(a, d.cards.length) ? null : 'Choose the card to keep.';
    case 'shortSupplyTarget':
      return choosesOneOf(a, d.options.length) ? null : 'Choose a unit.';
    case 'shortSupplyHex':
      return a.kind === 'hex' && a.hex !== null && d.options.includes(a.hex) ? null : 'Choose a hex.';
    case 'guerrilla':
      return a.kind === 'yesno' ? null : 'Answer yes or no.';
    case 'moveFirst':
      return a.kind === 'playCard' && d.options.includes(a.card) ? null : 'Choose one of the cards offered.';
  }
}
