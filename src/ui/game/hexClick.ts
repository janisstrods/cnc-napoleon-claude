// What a click on a hex (or a leader's medallion) does for the human's pending decision, as a pure function: the answer it
// gives, or the selection it changes. The mouse and the keyboard (Enter on the cursor hex) both go through here, so every
// legality rule stays in one place.
import {
  battleReady, battleTargets, eligiblePieces, leaderAt, movablePieces, pieceMoves, unitAt,
  type Answer, type Decision, type GameState, type HexId, type Side,
} from '../../engine';
import { assignClick, assignClickRefusal, assignOptions, currentAssign, nextDie, type ElanOrRally } from './assign';
import { leaderRetreatChoices, retreatChoices, toggleGun, type UiSel } from './uiModel';

export interface ClickResult {
  /** The answer to give the engine. */
  answer?: Answer;
  /** The new selection. */
  ui?: UiSel;
  /** A refused assignment click's reason (null clears it); absent leaves the shown reason alone. */
  refusal?: { text: string; assign: UiSel['assign'] } | null;
}

const NONE: ClickResult = {};

/** The orders selection with piece `id` toggled. */
function toggleOrder(d: Decision, ui: UiSel, id: string): ClickResult {
  if (d.kind !== 'orders') return NONE;
  const sel = ui.orderSel.includes(id) ? ui.orderSel.filter((x) => x !== id) : [...ui.orderSel, id];
  return { ui: { ...ui, orderSel: sel } };
}

/** A click on piece `id` for the armed Élan / Rally die: filled when legal, else the validator's reason is shown. */
function clickAssign(s: GameState, d: ElanOrRally, ui: UiSel, id: string): ClickResult {
  const cur = currentAssign(s, d, ui.assign);
  const ids = assignClick(s, d, cur, id);
  const why = ids === cur.ids ? assignClickRefusal(s, d, cur, id) : null;
  const refusal = why ? { text: why, assign: ui.assign } : null;
  if (ids === cur.ids) return { refusal };
  const placed = cur.die !== null && ids[cur.die] !== null;
  return { refusal, ui: { ...ui, assign: { die: placed && cur.die !== null ? nextDie(s, d, cur.die, ids) : cur.die, ids } } };
}

/** A click on hex `h` while decision `d` (the human's) is pending. */
export function hexClick(s: GameState, d: Decision | null, ui: UiSel, h: HexId, human: Side): ClickResult {
  if (!d || d.side !== human) return NONE;
  const u = unitAt(s, h);
  const l = leaderAt(s, h);
  switch (d.kind) {
    case 'orders': {
      const elig = new Set(eligiblePieces(s, human, d.card));
      let id: string | null = null;
      if (u && u.side === human && elig.has(u.id)) id = u.id;
      else if (l && l.side === human && elig.has(l.id)) id = l.id;
      return id ? toggleOrder(d, ui, id) : NONE;
    }
    case 'move': {
      if (ui.selPiece) {
        const m = pieceMoves(s, ui.selPiece).find((x) => x.hex === h);
        if (m) return { answer: { kind: 'move', piece: ui.selPiece, to: h } };
      }
      const movers = new Set(movablePieces(s));
      if (u && movers.has(u.id)) return { ui: { ...ui, selPiece: u.id } };
      if (l && movers.has(l.id)) return { ui: { ...ui, selPiece: l.id } };
      return { ui: { ...ui, selPiece: null } };
    }
    case 'battle': {
      if (ui.selPiece) {
        const t = battleTargets(s, ui.selPiece).find((x) => x.hex === h);
        if (t) return { answer: { kind: 'attack', unit: ui.selPiece, target: h } };
      }
      const ready = new Set(battleReady(s));
      return { ui: { ...ui, selPiece: u && ready.has(u.id) ? u.id : null } };
    }
    case 'retreat': {
      const c = retreatChoices(s, d).find((x) => x.end === h);
      return c ? { answer: { kind: 'choose', index: c.index } } : NONE;
    }
    case 'leaderRetreat': {
      // the safest way to the hex clicked
      const c = leaderRetreatChoices(s, d).find((x) => x.kind === 'hex' && x.end === h);
      return c ? { answer: { kind: 'choose', index: c.index } } : NONE;
    }
    case 'advance':
      return h === d.hex ? { answer: { kind: 'yesno', yes: true } } : NONE;
    case 'breakthroughExtra':
      return d.options.includes(h) ? { answer: { kind: 'hex', hex: h } } : NONE;
    case 'bonusMelee':
      return d.targets.includes(h) ? { answer: { kind: 'hex', hex: h } } : NONE;
    case 'shortSupplyHex':
      return d.options.includes(h) ? { answer: { kind: 'hex', hex: h } } : NONE;
    case 'shortSupplyTarget': {
      const i = u ? d.options.indexOf(u.id) : -1;
      return i >= 0 ? { answer: { kind: 'choose', index: i } } : NONE;
    }
    case 'elan':
    case 'rally': {
      // the armed die takes the clicked unit, or the leader standing with it when the unit is no option of that die
      const cur = currentAssign(s, d, ui.assign);
      const id = [u?.id, l?.id].find((x): x is string => !!x && assignClick(s, d, cur, x) !== cur.ids) ?? u?.id ?? l?.id;
      return id ? clickAssign(s, d, ui, id) : NONE;
    }
    case 'combinedArms':
      // a click on a listed gun adds it to the melee or takes it out; the prompt's button attacks
      return u && d.options.includes(u.id) ? { ui: { ...ui, gunSel: toggleGun(ui.gunSel, u.id, d.options) } } : NONE;
    default:
      return NONE;
  }
}

/** A click on leader `id`'s medallion: `handled` false when it falls through to the hex under it. */
export function leaderClick(s: GameState, d: Decision | null, ui: UiSel, id: string, human: Side): ClickResult & { handled: boolean } {
  if (!d || d.side !== human) return { handled: false };
  if (d.kind === 'orders') {
    if (!eligiblePieces(s, human, d.card).includes(id)) return { handled: false };
    return { ...toggleOrder(d, ui, id), handled: true };
  }
  if (d.kind === 'move') {
    if (!movablePieces(s).includes(id)) return { handled: false };
    return { ui: { ...ui, selPiece: id }, handled: true };
  }
  if (d.kind === 'elan' || d.kind === 'rally') {
    // a leader token takes the click only when the armed die may order him; else it falls through to his unit
    const die = currentAssign(s, d, ui.assign).die;
    if (die === null || !assignOptions(s, d, die).some((o) => o.id === id)) return { handled: false };
    return { ...clickAssign(s, d, ui, id), handled: true };
  }
  return { handled: false };
}
