// Pure helpers that turn (state, pending decision, local UI selection) into board highlights and badges. The prompts'
// content is in promptSpec.ts, the unit descriptions in unitText.ts, the objective tooltips in objectiveText.ts.
import {
  ALL_HEXES, CARD_DEFS, OFF_BOARD, hexLabel, meleeDice, UNIT_STATS, statsOf, leaderAt, battleReady, battleTargets, effectiveCard, eligiblePieces, inSection,
  leaderUnit, movablePieces, pieceById, pieceHex, pieceMoves, unitAt, unitById,
  type Decision, type GameState, type HexId, type SectionName, type Side, type Unit,
} from '../../engine';
import type { Highlight } from './Board';
import { promptSpec, unitLabel } from './promptSpec';
import { assignOptions, currentAssign } from './assign';

export interface UiSel {
  selCard: number | null;
  hoverCard: number | null;
  orderSel: string[];
  selPiece: string | null;
  hoverHex: HexId | null;
  /** Élan / Rally: the armed die and the piece (or null) given to each die; null until the player touches it. */
  assign: { die: number | null; ids: (string | null)[] } | null;
}

/** Every field of a selection but the hovered hex (the compiler checks that none is missing). */
const SEL_FIELDS: Record<Exclude<keyof UiSel, 'hoverHex'>, true> = {
  selCard: true, hoverCard: true, orderSel: true, selPiece: true, assign: true,
};
const SEL_KEYS = Object.keys(SEL_FIELDS) as (keyof typeof SEL_FIELDS)[];

/**
 * The fields of `ui` other than the hovered hex, in a fixed order: the dependencies of a memo of what follows from the
 * selection alone (`boardMarks`), which a hover then leaves alone.
 */
export function selectionDeps(ui: UiSel): unknown[] {
  return SEL_KEYS.map((k) => ui[k]);
}

/** The board's marks for the selection, whatever hex is hovered; `pathAt` gives the path to preview with a hex hovered. */
export interface BoardMarks {
  highlights: Map<HexId, Highlight>;
  leaderHighlights: Map<string, Highlight>;
  badges: Map<HexId, string>;
  sectionShade: Set<HexId>;
  pathAt: (hover: HexId | null) => HexId[] | null;
}

export interface BoardUi extends Omit<BoardMarks, 'pathAt'> {
  pathPreview: HexId[] | null;
}

function shadeSections(side: Side, secs: SectionName[]): Set<HexId> {
  const out = new Set<HexId>();
  if (!secs.length || secs.length === 3) return out;
  for (const h of ALL_HEXES) if (secs.some((x) => inSection(h, side, x))) out.add(h);
  return out;
}

/** Dice of the battle `attacker` would fight against the hex `hex` (what the engine lists in `battleTargets`), or 0. */
export function attackDice(s: GameState, attacker: Unit, hex: HexId): number {
  return battleTargets(s, attacker.id).find((t) => t.hex === hex)?.dice ?? 0;
}

/**
 * Expected hits of `attacker`'s battle against `hex`: each die hits with a chance of 1/6 per matching face. Infantry has
 * two faces on the die (2/6 against infantry); a melee die also hits on a sabre when the attacker's sabres count.
 */
export function expectedHits(s: GameState, attacker: Unit, hex: HexId): number {
  const t = battleTargets(s, attacker.id).find((x) => x.hex === hex);
  if (!t) return 0;
  // a lone leader falls to the sabre face alone
  if (!unitAt(s, hex) && leaderAt(s, hex)) return t.kind === 'melee' ? t.dice / 6 : 0;
  const target = unitAt(s, hex);
  const faces = (target?.key && UNIT_STATS[target.key].arm === 'infantry' ? 2 : 1) + (t.kind === 'melee' && statsOf(s, attacker).sabreHits ? 1 : 0);
  return (t.dice * faces) / 6;
}

/** The board's marks, with the path preview for the hovered hex `ui.hoverHex`. */
export function boardUi(s: GameState, d: Decision | null, ui: UiSel, human: Side): BoardUi {
  const { pathAt, ...marks } = boardMarks(s, d, ui, human);
  return { ...marks, pathPreview: pathAt(ui.hoverHex) };
}

type D<K extends Decision['kind']> = Extract<Decision, { kind: K }>;

/** One button and one board click of a retreat: the first option (the engine lists the safest first) for an end hex. */
export interface RetreatChoice { index: number; end: HexId; label: string }

/** A unit's retreat options, one per end hex, each named by its hex ("Stay" when the end is the unit's own hex). */
export function retreatChoices(s: GameState, d: D<'retreat'>): RetreatChoice[] {
  const here = pieceHex(s, d.unit) ?? -1;
  const out: RetreatChoice[] = [];
  d.options.forEach((o, i) => {
    if (out.some((c) => c.end === o.end)) return;
    const losses = o.losses ? `, lose ${o.losses} block${o.losses === 1 ? '' : 's'}` : '';
    const join = o.attach ? ', join the leader' : '';
    const label = o.end === here
      ? `Stay${losses}`
      : `To ${hexLabel(o.end)} (${o.path.length} hex${o.path.length === 1 ? '' : 'es'}${losses}${join})`;
    out.push({ index: i, end: o.end, label });
  });
  return out;
}

/** One answer of a leader's retreat: an end hex (the safest way there), leaving the battlefield, or falling. */
export interface LeaderRetreatChoice { index: number; kind: 'hex' | 'off' | 'dead'; end: HexId; escapes: number; attach: string | null; label: string }

const escapeText = (n: number) => `escape past ${n} enemy unit${n === 1 ? '' : 's'}`;

/** A leader's options as the player chooses them: one per end hex, the one with fewest escape rolls; then off-board; then death. */
export function leaderRetreatChoices(s: GameState, d: D<'leaderRetreat'>): LeaderRetreatChoice[] {
  const hexes: LeaderRetreatChoice[] = [];
  const rest: LeaderRetreatChoice[] = [];
  d.options.forEach((o, i) => {
    const n = o.escapes.length;
    if (o.eliminated) {
      if (!rest.some((c) => c.kind === 'dead')) rest.push({ index: i, kind: 'dead', end: o.end, escapes: n, attach: null, label: 'He cannot escape' });
    } else if (o.offBoard) {
      const known = rest.find((c) => c.kind === 'off');
      if (known && known.escapes <= n) return;
      const c: LeaderRetreatChoice = { index: i, kind: 'off', end: o.end, escapes: n, attach: null, label: `Leave the battlefield${n ? ` (${escapeText(n)})` : ''}` };
      if (known) rest[rest.indexOf(known)] = c;
      else rest.push(c);
    } else {
      const known = hexes.find((c) => c.end === o.end);
      if (known && known.escapes <= n) return;
      const join = o.attach ? `, join ${unitLabel(s, o.attach)}` : '';
      const c: LeaderRetreatChoice = { index: i, kind: 'hex', end: o.end, escapes: n, attach: o.attach, label: `To ${hexLabel(o.end)}${join}${n ? ` (${escapeText(n)})` : ''}` };
      if (known) hexes[hexes.indexOf(known)] = c;
      else hexes.push(c);
    }
  });
  rest.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'off' ? -1 : 1));
  return [...hexes, ...rest];
}

/** The dice of the bonus melee against each of its targets, "3 dice" on the target's hex ("0 dice + guns" when only guns may join). */
export function bonusBadges(s: GameState, d: D<'bonusMelee'>): Map<HexId, string> {
  const out = new Map<HexId, string>();
  const u = unitById(s, d.unit);
  if (!u) return out;
  const moved = s.turn.ordered[u.id]?.moved ?? 0;
  for (const h of d.targets) {
    const foe = unitAt(s, h) ?? leaderAt(s, h);
    if (!foe) continue;
    const n = meleeDice(s, u, foe, { role: 'bonus', moved, declared: true });
    out.set(h, n === 0 ? '0 dice + guns' : dice(n));
  }
  return out;
}

const dice = (n: number) => `${n} ${n === 1 ? 'die' : 'dice'}`;

/**
 * The board's marks for the human's pending decision and the selection. The hovered hex is not read: the game screen
 * keeps these while the pointer moves and asks only `pathAt` for the path to preview.
 */
export function boardMarks(s: GameState, d: Decision | null, ui: Omit<UiSel, 'hoverHex'>, human: Side): BoardMarks {
  const highlights = new Map<HexId, Highlight>();
  const leaderHighlights = new Map<string, Highlight>();
  const badges = new Map<HexId, string>();
  let sectionShade = new Set<HexId>();
  let pathAt: BoardMarks['pathAt'] = () => null;
  // a leader with a unit is marked on his own token, any other piece on its hex
  const markPiece = (id: string, h: Highlight) => {
    const p = pieceById(s, id);
    if (!p || p.hex < 0) return;
    if (!('key' in p) && leaderUnit(s, p)) leaderHighlights.set(id, h);
    else highlights.set(p.hex, h);
  };

  if (!d || d.side !== human) {
    return { highlights, leaderHighlights, badges, sectionShade, pathAt };
  }

  switch (d.kind) {
    case 'playCard': {
      const card = ui.hoverCard ?? ui.selCard;
      if (card !== null) {
        const { kind } = effectiveCard(s, human, card);
        if (kind) {
          sectionShade = shadeSections(human, CARD_DEFS[kind].sections);
          for (const id of eligiblePieces(s, human, kind)) markPiece(id, 'eligible');
        }
      }
      break;
    }
    case 'orders': {
      sectionShade = shadeSections(human, CARD_DEFS[d.card].sections);
      for (const id of eligiblePieces(s, human, d.card)) markPiece(id, 'eligible');
      for (const id of ui.orderSel) markPiece(id, 'selected');
      break;
    }
    case 'move': {
      for (const id of movablePieces(s)) {
        markPiece(id, 'mover');
        if (pieceMoves(s, id).some((m) => m.hex === OFF_BOARD)) {
          const h = pieceHex(s, id) ?? -1;
          if (h >= 0) badges.set(h, 'Exit');
        }
      }
      if (ui.selPiece) {
        markPiece(ui.selPiece, 'selected');
        const paths = new Map<HexId, HexId[]>();
        const isLeader = !!pieceById(s, ui.selPiece) && !('key' in pieceById(s, ui.selPiece)!);
        for (const m of pieceMoves(s, ui.selPiece)) {
          if (m.hex < 0) {
            const last = m.path[m.path.length - 2];
            if (last !== undefined && last >= 0) badges.set(last, 'Exit ↑');
            continue;
          }
          highlights.set(m.hex, isLeader || m.battle ? 'move' : 'moveNoBattle');
          paths.set(m.hex, m.path);
        }
        pathAt = (hover) => (hover === null ? null : paths.get(hover) ?? null);
      }
      break;
    }
    case 'battle': {
      for (const id of battleReady(s)) markPiece(id, 'attacker');
      if (ui.selPiece) {
        markPiece(ui.selPiece, 'selected');
        for (const t of battleTargets(s, ui.selPiece)) {
          highlights.set(t.hex, t.kind === 'melee' ? 'targetClose' : 'targetRanged');
          badges.set(t.hex, dice(t.dice));
        }
      }
      break;
    }
    case 'retreat':
    case 'leaderRetreat': {
      const id = d.kind === 'retreat' ? d.unit : d.leader;
      const h = pieceHex(s, id) ?? -1;
      if (h >= 0) highlights.set(h, 'focus');
      // the hex each end names (the first option for it is the safest)
      if (d.kind === 'leaderRetreat') {
        for (const c of leaderRetreatChoices(s, d)) {
          if (c.kind !== 'hex') continue;
          highlights.set(c.end, c.escapes ? 'targetRanged' : 'option');
          if (c.escapes) badges.set(c.end, `Escape ×${c.escapes}`);
        }
      } else {
        for (const o of d.options) if (o.end >= 0 && o.end !== h) highlights.set(o.end, 'option');
      }
      const options: readonly { path: HexId[]; end: HexId; offBoard?: boolean }[] = d.options;
      pathAt = (hover) => {
        const o = hover === null ? undefined : options.find((x) => x.end === hover);
        return o && h >= 0 ? [h, ...o.path] : null;
      };
      break;
    }
    case 'advance':
    case 'breakthroughExtra': {
      // the hex (or hexes) the unit may enter, and the arrow from where it stands now
      const from = pieceHex(s, d.unit) ?? -1;
      if (from >= 0) highlights.set(from, 'focus');
      const to = d.kind === 'advance' ? [d.hex] : d.options;
      for (const h of to) highlights.set(h, 'move');
      pathAt = (hover) => (hover !== null && from >= 0 && to.includes(hover) ? [from, hover] : null);
      break;
    }
    case 'bonusMelee': {
      const from = pieceHex(s, d.unit) ?? -1;
      if (from >= 0) highlights.set(from, 'focus');
      for (const h of d.targets) highlights.set(h, 'targetClose');
      for (const [h, b] of bonusBadges(s, d)) badges.set(h, b);
      break;
    }
    case 'defend':
    case 'ignoreFlags': {
      const target = d.kind === 'defend' ? d.target : d.unit;
      const th = pieceHex(s, target) ?? -1;
      if (th >= 0) highlights.set(th, 'focus');
      if (d.kind === 'defend') {
        const ah = pieceHex(s, d.attacker) ?? -1;
        if (ah >= 0) highlights.set(ah, 'targetClose');
      }
      break;
    }
    case 'elan':
    case 'rally': {
      // the armed die's options, and the pieces the dice are on now
      const cur = currentAssign(s, d, ui.assign);
      if (cur.die !== null) for (const o of assignOptions(s, d, cur.die)) markPiece(o.id, 'option');
      cur.ids.forEach((id, i) => { if (id !== null && i !== cur.die) markPiece(id, 'selected'); });
      // the armed die's own piece stands out from the pieces of the other dice
      const mine = cur.die !== null ? cur.ids[cur.die] : null;
      if (mine) markPiece(mine, 'focus');
      break;
    }
    case 'shortSupplyTarget': {
      // any unit of either side may be lifted: every one carries the badge
      for (const id of d.options) {
        const h = pieceHex(s, id) ?? -1;
        if (h < 0) continue;
        highlights.set(h, 'option');
        badges.set(h, 'Supply');
      }
      break;
    }
    default: {
      // every other decision: the unit it is about, and the hexes its prompt names (what a click on the board answers)
      if ('unit' in d) {
        const h = pieceHex(s, d.unit) ?? -1;
        if (h >= 0) highlights.set(h, 'focus');
      }
      if (d.kind === 'combinedArms') highlights.set(d.target, 'targetClose');
      for (const h of promptSpec(s, d).hexes) highlights.set(h, 'option');
      break;
    }
  }
  return { highlights, leaderHighlights, badges, sectionShade, pathAt };
}

/** Screen words of the hexsides in HEX_DIRS order (E, NE, NW, W, SW, SE) on an unflipped board. */
const SIDE_WORDS = ['right', 'upper-right', 'upper-left', 'left', 'lower-left', 'lower-right'] as const;

/**
 * The protected hexsides of a works as the viewer sees them: "its upper hexsides" (NE + NW), "its left and lower-left
 * hexsides". On a flipped board (the human commands the top army) every side turns by 180°.
 */
export function worksSidesText(mask: number, flipped: boolean): string {
  const on = (screen: number) => (mask & (1 << (flipped ? (screen + 3) % 6 : screen))) !== 0;
  const n = [0, 1, 2, 3, 4, 5].filter(on).length;
  if (n === 0) return 'no hexsides';
  if (n === 6) return 'all its hexsides';
  const parts: string[] = [];
  const pair = (a: number, b: number, word: string) => {
    if (on(a) && on(b)) parts.push(word);
    else if (on(a)) parts.push(SIDE_WORDS[a]);
    else if (on(b)) parts.push(SIDE_WORDS[b]);
  };
  pair(2, 1, 'upper');
  if (on(3)) parts.push('left');
  if (on(0)) parts.push('right');
  pair(4, 5, 'lower');
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
  return `its ${list} hexside${n === 1 ? '' : 's'}`;
}

