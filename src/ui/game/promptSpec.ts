// The pure description of the human's prompt for any decision: a title, a line of text, the buttons (each an answer, or
// 'auto' for the general) and the hexes to mark on the board. Every decision kind has one, so the player is never stuck:
// the last button is always "Let the general decide". The bespoke choosers of the game screen (card, orders, move, battle,
// retreat, leader retreat, flags) add their board interaction on top of the title and that button.
import {
  CARD_DEFS, UNIT_STATS, cardKind, hexLabel, pieceHex, statsOf, unitById,
  type Answer, type Decision, type DefendChoice, type GameState, type HexId,
} from '../../engine';
import { suggestAssign } from './assign';

export interface PromptAction { key: string; label: string; answer: Answer | 'auto' }
export interface PromptSpec { title: string; text: string; actions: PromptAction[]; hexes: HexId[] }

export const DECISION_TITLES: Readonly<Record<Decision['kind'], string>> = {
  playCard: 'Choose a command card',
  orders: 'Give your orders',
  leaveSquare: 'Leave the square?',
  move: 'Movement',
  battle: 'Battle',
  combinedArms: 'Combined Arms',
  defend: 'Under attack!',
  ignoreFlags: 'Flags',
  retreat: 'Retreat',
  leaderRetreat: 'Leader retreat',
  advance: 'Advance?',
  breakthroughExtra: 'Breakthrough',
  bonusMelee: 'Bonus melee',
  elan: 'Élan',
  rally: 'Rally',
  scoutKeep: 'Scout: keep a card',
  shortSupplyTarget: 'Short Supply: choose a unit',
  shortSupplyHex: 'Short Supply: choose a hex',
};

/**
 * The title of decision `d`: the table's, except for the refinements that tell the player which rule is at work (take ground
 * or breakthrough, Retire and Reform, a bonus melee against the player's own unit).
 */
export function decisionTitle(d: Decision): string {
  if (d.kind === 'advance') return d.how === 'breakthrough' ? 'Break through?' : 'Take ground?';
  if (d.kind === 'retreat' && d.reason === 'retireReform') return 'Retire and Reform';
  if (d.kind === 'defend' && d.bonus) return `${DECISION_TITLES.defend} (bonus melee)`;
  return DECISION_TITLES[d.kind];
}

/** What a flag not ignored costs the unit (RR §10.1): hexes back by its own row, or blocks for a unit in square. */
export function flagCostText(s: GameState, id: string): string {
  const u = unitById(s, id);
  if (!u) return 'Each flag not ignored moves it back; a hex it cannot take costs a block.';
  if (u.square !== undefined) return 'Each flag not ignored costs a block per hex it would have moved back.';
  const { first, then } = statsOf(s, u).retreat;
  const back = first === then ? `${first} hex${first === 1 ? '' : 'es'}` : `${first}, then ${then} hex${then === 1 ? '' : 'es'}`;
  return `Each flag not ignored moves it back ${back}; a hex it cannot take costs a block.`;
}

export const ELAN_TEXT = 'Give each die to a piece. An arm symbol orders a unit of that arm (horse artillery is artillery); a flag orders any unit or leader. Sabres order nothing. Ordered units roll one extra die in every battle this turn.';
export const RALLY_TEXT = 'Each infantry, cavalry or artillery symbol returns one block to a weakened unit of that arm, anywhere on the field, never above its starting strength. Flags and sabres do nothing. A unit that gains a block is ordered.';

export const AUTO_ACTION: PromptAction = { key: 'auto', label: 'Let the general decide', answer: 'auto' };

const DEFEND_LABELS: Readonly<Record<DefendChoice, string>> = {
  stand: 'Stand', retireReform: 'Retire and Reform', formSquare: 'Form square', firstStrike: 'First Strike',
};

/** "British Line Infantry" for a unit id (the unit as the board last showed it); "unit" when it is not there. */
export function unitLabel(s: GameState, id: string): string {
  const u = unitById(s, id);
  return u ? `${s.players[u.side].army} ${UNIT_STATS[u.key].name}` : 'unit';
}

/** "British Foot Artillery (r3 c4)": the unit and its hex, so identical guns differ. */
function unitHexLabel(s: GameState, id: string): string {
  const h = pieceHex(s, id);
  return h !== undefined && h >= 0 ? `${unitLabel(s, id)} (${hexLabel(h)})` : unitLabel(s, id);
}

const hexesOf = (s: GameState, ids: readonly string[]): HexId[] =>
  ids.map((id) => pieceHex(s, id)).filter((h): h is HexId => h !== undefined && h >= 0);

/** The prompt of decision `d` in state `s`. */
export function promptSpec(s: GameState, d: Decision): PromptSpec {
  const title = decisionTitle(d);
  const actions: PromptAction[] = [];
  let text = '';
  let hexes: HexId[] = [];
  switch (d.kind) {
    case 'playCard':
      text = 'Hover a card to see which troops it can order.';
      break;
    case 'orders':
      text = `${CARD_DEFS[d.card].text} Click your units to order them.`;
      break;
    case 'move':
      text = 'Select an ordered piece, then click a destination.';
      break;
    case 'battle':
      text = 'Select a unit, then its target.';
      break;
    case 'leaveSquare':
      text = `${unitLabel(s, d.unit)} stands in square. Leave it?`;
      actions.push(
        { key: 'yes', label: 'Leave the square', answer: { kind: 'yesno', yes: true } },
        { key: 'no', label: 'Stay in square', answer: { kind: 'yesno', yes: false } },
      );
      break;
    case 'combinedArms': {
      text = `${unitLabel(s, d.unit)} attacks: artillery may join the melee. ${d.required ? 'It has no dice of its own: choose a gun.' : 'Choose a gun, or none.'}`;
      hexes = hexesOf(s, d.options);
      for (const id of d.options) actions.push({ key: id, label: unitHexLabel(s, id), answer: { kind: 'select', ids: [id] } });
      if (d.options.length > 1) actions.push({ key: 'all', label: `Combine all ${d.options.length} guns`, answer: { kind: 'select', ids: [...d.options] } });
      if (!d.required) actions.push({ key: 'none', label: 'No artillery', answer: { kind: 'select', ids: [] } });
      break;
    }
    case 'defend':
      text = `${unitLabel(s, d.attacker)} attacks your ${unitLabel(s, d.target)}${d.bonus ? ' (bonus melee)' : ''}. How do you defend?`;
      for (const o of d.options) actions.push({ key: o, label: DEFEND_LABELS[o], answer: { kind: 'defend', choice: o } });
      break;
    case 'ignoreFlags':
      text = `${d.flags} flag${d.flags === 1 ? '' : 's'} against ${unitLabel(s, d.unit)}: it may ignore up to ${d.max}. ${flagCostText(s, d.unit)}`;
      break;
    case 'retreat':
      text = `Click a hex to choose where ${unitLabel(s, d.unit)} ends up.`;
      break;
    case 'leaderRetreat':
      text = 'Click a hex to choose where the leader goes.';
      break;
    case 'advance':
      text = d.how === 'breakthrough'
        ? `${unitLabel(s, d.unit)} may break through into the emptied hex, then move one more hex.`
        : `${unitLabel(s, d.unit)} may take ground in the hex it emptied.`;
      hexes = [d.hex];
      actions.push(
        { key: 'yes', label: 'Advance', answer: { kind: 'yesno', yes: true } },
        { key: 'no', label: 'Stay', answer: { kind: 'yesno', yes: false } },
      );
      break;
    case 'breakthroughExtra':
      text = `${unitLabel(s, d.unit)} breaks through: click a hex to move on${d.required ? '' : ', or stay'}.`;
      hexes = [...d.options];
      if (!d.required) actions.push({ key: 'decline', label: 'Stay here', answer: { kind: 'hex', hex: null } });
      break;
    case 'bonusMelee':
      text = `${unitLabel(s, d.unit)} may fight a bonus melee: click a target, or decline.`;
      hexes = [...d.targets];
      actions.push({ key: 'decline', label: 'Decline', answer: { kind: 'hex', hex: null } });
      break;
    case 'elan':
    case 'rally':
      text = d.kind === 'elan' ? ELAN_TEXT : RALLY_TEXT;
      actions.push({ key: 'suggested', label: 'Confirm', answer: { kind: 'assign', ids: suggestAssign(s, d) } });
      break;
    case 'scoutKeep':
      text = 'You drew two cards: keep one; the other is discarded face up.';
      d.cards.forEach((c, i) => actions.push({ key: `keep${i}`, label: CARD_DEFS[cardKind(c)].title, answer: { kind: 'choose', index: i } }));
      break;
    case 'shortSupplyTarget':
      text = "Choose any unit not in square, yours or the enemy's: its owner lifts it back to its own baseline.";
      hexes = hexesOf(s, d.options);
      d.options.forEach((id, i) => actions.push({ key: id, label: unitHexLabel(s, id), answer: { kind: 'choose', index: i } }));
      break;
    case 'shortSupplyHex':
      text = `Place ${unitLabel(s, d.unit)} on a hex of its own baseline (the row in front when the baseline is full).`;
      hexes = [...d.options];
      break;
  }
  actions.push(AUTO_ACTION);
  return { title, text, actions, hexes };
}
