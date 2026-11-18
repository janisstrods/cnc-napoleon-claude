// Move First by revealed cards (RR §15.8, S38, S43, S44): before turn 1 each side secretly picks an opening card; the lower
// printed value moves first and each side must play its pick on its first turn. A hook module called from `flow`.
import { cardKind } from './cards';
import { ask, type Gen } from './decisions';
import { SIDES, type CardKind, type FlowCtx, type GameState, type Side } from './types';

/** The printed Move First value of each card kind; 'command' is the picker's Command. Kinds not listed may not be picked. */
export const MOVE_FIRST_VALUE: Readonly<Partial<Record<CardKind, number | 'command'>>> = {
  scoutL: 1, scoutC: 1, scoutR: 1,
  probeL: 2, probeC: 2, probeR: 2,
  attackL: 3, attackC: 3, attackR: 3,
  reconInForce: 3, coordinatedAdvance: 4, flankAttack: 4, forward: 6,
  assaultL: 'command', assaultC: 'command', assaultR: 'command',
  bayonetCharge: 4, bombard: 4, cavalryCharge: 4, fireAndHold: 4, grandManoeuvre: 4,
  shortSupply: 1, forceMarch: 99, coldSteel: 99,
};

/** Value of a side with no pick: above every card (S43). */
const NO_PICK_VALUE = 100;

/** The cards of `side`'s hand it may pick. */
export function moveFirstOptions(s: GameState, side: Side): number[] {
  return s.players[side].hand.filter((c) => MOVE_FIRST_VALUE[cardKind(c)] !== undefined);
}

/** The printed value of `card` for `side`: an Assault counts the cards in the hand at the reveal. */
export function moveFirstValue(s: GameState, side: Side, card: number): number {
  const v = MOVE_FIRST_VALUE[cardKind(card)];
  if (v === undefined) throw new Error(`card ${card} cannot be picked to move first`);
  return v === 'command' ? s.players[side].hand.length : v;
}

/**
 * Ask top, then bottom, for the opening card (a side with none to pick is not asked and picks nothing, S43), then reveal
 * both: the lower value moves first, a tie goes to `s.first`. Runs once, before turn 1.
 */
export function* moveFirstStep(s: GameState, ctx: FlowCtx): Gen {
  const mf = s.special.moveFirst;
  if (!mf || mf.done) return;
  for (const side of SIDES) {
    const options = moveFirstOptions(s, side);
    if (options.length === 0) continue;
    const a = (yield* ask(s, ctx, { kind: 'moveFirst', side, options })) as { card: number };
    mf.picks[side] = a.card;
  }
  const values = {} as Record<Side, number>;
  for (const side of SIDES) {
    const c = mf.picks[side];
    values[side] = c === null ? NO_PICK_VALUE : moveFirstValue(s, side, c);
  }
  const first: Side = values.top === values.bottom ? s.first : values.top < values.bottom ? 'top' : 'bottom';
  s.first = first;
  s.active = first;
  mf.committed = { ...mf.picks };
  mf.done = true;
  ctx.emit({ t: 'moveFirst', picks: { ...mf.picks }, values, first });
}
