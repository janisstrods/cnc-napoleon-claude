// The battle log's wording: one line for every kind of engine event (`eventLog`), and the dice tray's title and summary of
// a roll. Pure: it reads the states before and after the event and says what happened, nothing is hidden that the table
// would not see (a card is named only when it has been shown).
import {
  CARD_DEFS, OFF_BOARD, UNIT_STATS, cardKind, other, pieceById,
  type DieFace, type GameEvent, type GameState, type Leader, type RollPurpose, type Side, type Unit,
} from '../../engine';
import type { LogLine } from './controller';

const plural = (n: number, w: string, many = `${w}s`) => `${n} ${n === 1 ? w : many}`;

type Piece = Leader | Unit;
const find = (id: string, ...states: GameState[]): Piece | undefined => {
  for (const s of states) {
    const p = pieceById(s, id);
    if (p) return p;
  }
  return undefined;
};

/** "British Line Infantry", a leader's name ("Leader" when he has none), or "unit"/"Leader" for a piece not found. */
function nameOf(id: string, ...states: GameState[]): string {
  const p = find(id, ...states);
  if (!p) return id.startsWith('L') ? 'Leader' : 'unit';
  return 'key' in p ? `${states[0].players[p.side].army} ${UNIT_STATS[p.key].name}` : p.name || 'Leader';
}

const VERB: Record<Exclude<RollPurpose, 'elan' | 'rally'>, string> = {
  fire: 'fires on', melee: 'attacks', battleBack: 'battles back against', firstStrike: 'strikes first at', bonus: 'attacks again, into',
  squareFirst: 'in square, strikes first at', retireReform: 'retires and reforms against', leaderCheck: 'threatens',
  escape: 'tries to catch', guerrilla: 'rolls against the Guerrilla Action of',
};

/** Title of a roll in the dice tray. */
export function rollTitle(p: RollPurpose, by: string | null, against: string | null, s: GameState, reroll = false): string {
  return rollTitleOf(p, by, against, s) + (reroll ? ' — flags re-rolled' : '');
}

function rollTitleOf(p: RollPurpose, by: string | null, against: string | null, s: GameState): string {
  const a = by ? nameOf(by, s) : '';
  const t = against ? nameOf(against, s) : '';
  switch (p) {
    case 'fire': return `${a} fires`;
    case 'melee': return `${a} attacks`;
    case 'bonus': return `${a} — bonus melee`;
    case 'battleBack': return `${a} battles back`;
    case 'firstStrike': return `${a} — First Strike`;
    case 'squareFirst': return `${a || t} — square strikes first`;
    case 'retireReform': return `${a || t} — Retire and Reform`;
    case 'leaderCheck': return `${t || a} — leader casualty check`;
    case 'escape': return `${t || a} tries to escape`;
    case 'elan': return 'Élan';
    case 'rally': return 'Rally';
    case 'guerrilla': return 'Guerrilla Action';
  }
}

/** Subtitle of a roll in the dice tray. */
export function rollSummary(p: RollPurpose, faces: DieFace[], scoring: boolean[]): string {
  if (p === 'elan' || p === 'rally') {
    const n = (f: DieFace) => faces.filter((x) => x === f).length;
    const parts = (['infantry', 'cavalry', 'artillery', 'flag', 'sabre'] as DieFace[]).filter(n).map((f) => (f === 'flag' || f === 'sabre' ? plural(n(f), f) : `${n(f)} ${f}`));
    return parts.join(', ') || 'No dice';
  }
  if (p === 'escape') return faces.includes('sabre') ? 'The leader is hit!' : 'The leader is safe';
  if (p === 'guerrilla') return faces.includes('sabre') ? 'Sabre: the card stands' : 'No sabre: the card is lost';
  if (p === 'leaderCheck') return `${plural(faces.filter((f) => f === 'sabre').length, 'sabre')} rolled`;
  const hits = scoring.filter(Boolean).length;
  const flags = faces.filter((f) => f === 'flag').length;
  const parts = [`${hits} ${hits === 1 ? 'hit' : 'hits'}`];
  if (flags && p !== 'retireReform') parts.push(plural(flags, 'flag'));
  const text = parts.join(', ');
  return p === 'retireReform' ? `${text} (cavalry symbols only)` : text;
}

/**
 * The log line of event `e` (`before`/`after`: the states either side of it), or null for what stays silent: the human's own
 * routine move, a retreat of no hexes, and the human's own orders.
 */
export function eventLog(e: GameEvent, before: GameState, after: GameState, human: Side): Omit<LogLine, 'id'> | null {
  const army = (side: Side) => after.players[side].army;
  const who = (id: string) => nameOf(id, after, before);
  // an objective's text carries the id of the unit that scored it (the engine fills in `{unit}`): say what the unit was
  const named = (text: string) => text.replace(/[.\s]+$/, '').replace(/\b[uL]\d+\b/g, (id) => {
    const p = find(id, after, before);
    return !p ? 'unit' : 'key' in p ? UNIT_STATS[p.key].name : p.name || 'Leader';
  });
  const sideOf = (id: string) => find(id, after, before)?.side;
  const hexes = (path: number[]) => Math.max(0, path.filter((h) => h >= 0).length - 1);
  const line = (text: string, kind: LogLine['kind'], side?: Side): Omit<LogLine, 'id'> => ({ text, kind, ...(side ? { side } : {}) });
  switch (e.t) {
    case 'turnStart':
      return line(`Turn ${e.turn} — ${army(e.side)}${e.side === human ? ' (you)' : ''}`, 'turn', e.side);
    case 'cardPlayed': {
      const eff = e.effective !== null && e.effective !== e.kind ? ` → ${CARD_DEFS[e.effective].title}` : '';
      return line(`${after.players[e.side].commander} plays ${CARD_DEFS[e.kind].title}${eff}.`, 'card', e.side);
    }
    case 'ordered':
      if (e.side === human) return null;
      return line(e.ids.length === 0 ? 'No units could be ordered.' : `${after.players[e.side].commander} orders ${plural(e.ids.length, 'unit')}.`, 'info', e.side);
    case 'move': {
      if (e.path[e.path.length - 1] === OFF_BOARD) return line(`${who(e.id)} leaves the battlefield.`, 'result', sideOf(e.id));
      if (sideOf(e.id) === human) return null;
      return line(`${who(e.id)} moves ${plural(hexes(e.path), 'hex', 'hexes')}.`, 'info', sideOf(e.id));
    }
    case 'retreat': {
      const n = hexes(e.path);
      return n > 0 ? line(`${who(e.id)} retreats ${plural(n, 'hex', 'hexes')}.`, 'result', sideOf(e.id)) : null;
    }
    case 'retire':
      return line(`${who(e.id)} retires and reforms ${plural(hexes(e.path), 'hex', 'hexes')}.`, 'result', sideOf(e.id));
    case 'leaderRetreat':
      return line(e.offBoard ? `${who(e.id)} leaves the battlefield.` : `${who(e.id)} falls back.`, 'result', sideOf(e.id));
    case 'advance':
      return line(`${who(e.id)} advances.`, 'result', sideOf(e.id));
    case 'combat': {
      const guns = e.artillery?.length ? ` and ${plural(e.artillery.length, 'gun')}` : '';
      const dice = `(${plural(e.dice, 'die', 'dice')}${guns})`;
      const a = who(e.attacker);
      if (e.purpose === 'elan' || e.purpose === 'rally') {
        return line(`${a} rolls for ${e.purpose === 'elan' ? 'Élan' : 'Rally'} ${dice}.`, 'combat', sideOf(e.attacker));
      }
      // the attacker rolls against a defender who is falling back: say who retires
      if (e.purpose === 'retireReform') return line(`${a} attacks ${who(e.target)} ${dice}; the defender retires and reforms.`, 'combat', sideOf(e.attacker));
      return line(`${a} ${VERB[e.purpose]} ${who(e.target)} ${dice}.`, 'combat', sideOf(e.attacker));
    }
    case 'roll': {
      const by = e.by ?? e.against;
      const summary = rollSummary(e.purpose, e.faces, e.scoring);
      // a roll that no combat line announced says what it is for; the short arrow follows an attack's own line
      const alone = e.purpose === 'elan' || e.purpose === 'rally' || e.purpose === 'leaderCheck' || e.purpose === 'escape';
      const tail = (e.purpose === 'escape' ? summary.charAt(0).toLowerCase() + summary.slice(1) : summary).replace(/[.!]$/, '');
      // the lancers' second roll is one event for the whole attack: it cannot say which die came from whom
      const again = e.reroll ? `re-rolled flags${e.from && e.from.length > 1 ? ' (with guns)' : ''}: ` : '';
      const text = e.purpose === 'guerrilla' ? `${rollTitle(e.purpose, null, null, before)} — ${summary}.`
        : alone ? `${rollTitle(e.purpose, e.by, e.against, before)}: ${tail}.` : `→ ${again}${summary}.`;
      return line(text, 'combat', by ? sideOf(by) : undefined);
    }
    case 'damage':
      return line(`${who(e.id)} loses ${plural(e.amount, 'block')} (${e.reason}).`, 'result', sideOf(e.id));
    case 'eliminated':
      return line(`${who(e.id)} is eliminated.`, 'result', sideOf(e.id));
    case 'removed':
      return line(e.reason === 'broken' ? `${who(e.id)} leaves the field.` : `${who(e.id)} removed from the field (${e.reason}).`, 'result', sideOf(e.id));
    case 'leaderKilled':
      return line(`${who(e.id)} is slain.`, 'result', sideOf(e.id));
    case 'leaderSafe':
      return line(`${who(e.id)} is safe.`, 'result', sideOf(e.id));
    case 'leaderLeft':
      return line(`${who(e.id)} leaves the field.`, 'result', sideOf(e.id));
    case 'flags': {
      const text = e.ignored > 0 ? `${who(e.id)} ignores ${plural(e.ignored, 'flag')}.` : `${plural(e.flags, 'flag')} against ${who(e.id)}.`;
      return line(e.bounce ? `${text} It cannot fall back: it is bounced.` : text, 'result', sideOf(e.id));
    }
    case 'attach':
      return line(`${who(e.leader)} joins ${who(e.unit)}.`, 'info', sideOf(e.leader));
    case 'squareFormed':
      return line(`${who(e.id)} forms square (counter ${e.slot}).`, 'result', sideOf(e.id));
    case 'squareLeft':
      return line(`${who(e.id)} leaves the square (counter ${e.slot}).`, 'info', sideOf(e.id));
    case 'cardReturned':
      return line(`A card returns to the ${army(e.side)} hand from the square track.`, 'card', e.side);
    case 'rallied':
      return line(`${who(e.id)} rallies ${plural(e.blocks, 'block')}.`, 'result', sideOf(e.id));
    case 'shortSupply':
      return line(`${who(e.id)} is moved by Short Supply.`, 'result', sideOf(e.id));
    case 'banner':
      return line(`The ${army(e.side)} army gains a Victory Banner (${e.total}/${after.bannersToWin}) — ${named(e.reason)}.`, 'banner', e.side);
    case 'held':
      return line(`The ${army(e.side)} army now holds ${plural(e.held, 'banner')} (${e.total}/${after.bannersToWin}) — ${named(e.reason)}.`, 'banner', e.side);
    case 'draw':
      return line(`The ${army(e.side)} army draws a card.`, 'info', e.side);
    case 'scoutDrew':
      return line(`The ${army(e.side)} army draws two cards and keeps one.`, 'info', e.side);
    case 'discarded':
      // a Scout's second card is discarded face up (RR §12.4): named for either side
      // and so is a card taken from a shrinking hand (106)
      return line(`The ${army(e.side)} army discards ${CARD_DEFS[cardKind(e.card)].title}, face up.`, 'card', e.side);
    case 'reshuffle':
      return line('The command deck is reshuffled.', 'info');
    case 'log':
      // the engine's own casualty notes repeat the worded `eliminated` / `leaderKilled` lines (with raw ids)
      if (/ is (eliminated|killed) \(/.test(e.text) || / leaves the field \(broken\)\.$/.test(e.text)) return null;
      return line(e.text, 'info', e.side);
    case 'victory':
      return line(`Victory: ${e.winner === 'draw' ? 'Draw' : army(e.winner)} — ${named(e.reason)}.`, 'victory');
    case 'guerrilla': {
      // `e.side` is the guerrilla side; the card at stake is its opponent's
      if (e.what === 'gained') return line(`The ${army(e.side)} army gains a Guerrilla counter (${e.held} held).`, 'info', e.side);
      return line(
        e.what === 'cancelled' ? `Guerrillas cut the ${army(other(e.side))} orders: the card is lost.` : `The guerrillas strike, but the ${army(other(e.side))} card stands (sabre).`,
        'result', e.side,
      );
    }
    case 'moveFirst': {
      const pick = (side: Side) => (e.picks[side] === null ? 'no card' : `${CARD_DEFS[cardKind(e.picks[side])].title} (${e.values[side]})`);
      const pick2 = (side: Side) => `${army(side)}: ${pick(side)}`;
      return line(`Opening cards: ${pick2('top')}; ${pick2('bottom')}. The ${army(e.first)} army moves first.`, 'card', e.first);
    }
  }
}
