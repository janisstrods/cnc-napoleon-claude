// Pure helpers of the Élan and Rally choosers: which pieces each die may take, the general's suggestion, the validator's
// message in the player's words, and what a click on the board does to the assignment.
import {
  ROWS, UNIT_STATS, hexLabel, greedyAssign, pieceById, pieceHex, rowOf, sectionsOf, statsOf, validateElan, validateRally,
  type Decision, type DieFace, type GameState, type SectionName, type Unit,
} from '../../engine';
import { unitLabel } from './promptSpec';
import type { UiSel } from './uiModel';

export type ElanOrRally = Extract<Decision, { kind: 'elan' | 'rally' }>;
export type AssignSel = NonNullable<UiSel['assign']>;
export interface AssignOption { id: string; label: string }

const SECTION_WORD: Record<SectionName, string> = { left: 'left', center: 'centre', right: 'right' };

/** "centre, forward": the section(s) of a hex and how far it lies from the owner's baseline. */
function where(s: GameState, side: Unit['side'], hex: number): string {
  const secs = sectionsOf(hex, side).map((x) => SECTION_WORD[x]);
  const r = rowOf(hex);
  const depth = side === 'bottom' ? ROWS - 1 - r : r;
  return `${secs.join('/')}${depth === 0 ? ', rear' : depth >= 3 ? ', forward' : ''}`;
}

const unitOption = (s: GameState, u: Unit): AssignOption => ({
  id: u.id, label: `${UNIT_STATS[u.key].name} (${u.blocks}/${u.maxBlocks}) — ${where(s, u.side, u.hex)}`,
});

/** Identical labels (two full-strength lines on the same flank) get their hex, so the list is never ambiguous. */
function distinct(s: GameState, opts: AssignOption[]): AssignOption[] {
  const count = new Map<string, number>();
  for (const o of opts) count.set(o.label, (count.get(o.label) ?? 0) + 1);
  return opts.map((o) => {
    const h = pieceHex(s, o.id);
    return (count.get(o.label) ?? 0) > 1 && h !== undefined && h >= 0 ? { ...o, label: `${o.label} (${hexLabel(h)})` } : o;
  });
}

/** The pieces die `i` of `d` may be given to (empty: the die can do nothing). */
export function assignOptions(s: GameState, d: ElanOrRally, i: number): AssignOption[] {
  return distinct(s, rawOptions(s, d, i));
}

function rawOptions(s: GameState, d: ElanOrRally, i: number): AssignOption[] {
  const face: DieFace | undefined = d.faces[i];
  if (face === undefined || face === 'sabre') return [];
  const mine = s.units.filter((u) => u.side === d.side && u.hex >= 0);
  if (d.kind === 'rally') {
    if (face === 'flag') return [];
    return mine.filter((u) => u.blocks < u.maxBlocks && statsOf(s, u).arm === face).map((u) => unitOption(s, u));
  }
  if (face === 'flag') {
    const leaders = s.leaders.filter((l) => l.side === d.side && l.hex >= 0)
      .map((l) => ({ id: l.id, label: `Leader ${l.name || ''}`.trim() + ` — ${where(s, l.side, l.hex)}` }));
    return [...mine.map((u) => unitOption(s, u)), ...leaders];
  }
  return mine.filter((u) => statsOf(s, u).arm === face).map((u) => unitOption(s, u));
}

const validate = (s: GameState, d: ElanOrRally, ids: readonly (string | null)[]): string | null =>
  d.kind === 'elan' ? validateElan(s, d.side, d.faces, ids) : validateRally(s, d.side, d.faces, ids);

/** The general's choice: each die on the first piece of its list that keeps the assignment legal, else unused. */
export function suggestAssign(s: GameState, d: ElanOrRally): (string | null)[] {
  return greedyAssign(d.faces.length, (i) => assignOptions(s, d, i).map((o) => o.id), (trial) => validate(s, d, trial));
}

/** Why `ids` is refused, in the player's words (the engine's wording names unit keys), or null when it is legal. */
export function assignError(s: GameState, d: ElanOrRally, ids: readonly (string | null)[]): string | null {
  const msg = validate(s, d, ids);
  if (msg === null) return null;
  let out = msg;
  const own = (u: Unit) => (u.side === d.side ? 0 : 1);
  for (const u of [...s.units].sort((a, b) => own(a) - own(b))) {
    out = out.split(u.key).join(unitLabel(s, u.id));
    out = out.replace(new RegExp(`\\b${u.id}\\b`, 'g'), unitLabel(s, u.id));
  }
  return out;
}

/** The assignment on show: the stored one, else the general's suggestion with the first die that can act armed. */
export function currentAssign(s: GameState, d: ElanOrRally, sel: UiSel['assign']): AssignSel {
  if (sel) return sel;
  const firstDie = d.faces.findIndex((_, i) => assignOptions(s, d, i).length > 0);
  return { die: firstDie >= 0 ? firstDie : null, ids: suggestAssign(s, d) };
}

/** The assignment after a click on `pieceId` with `sel.die` armed; unchanged unless the piece is one of that die's options and the result is legal. */
export function assignClick(s: GameState, d: ElanOrRally, sel: AssignSel, pieceId: string): (string | null)[] {
  const { die, ids } = sel;
  if (die === null || die < 0 || die >= d.faces.length) return ids;
  if (!assignOptions(s, d, die).some((o) => o.id === pieceId)) return ids;
  const trial = ids.map((x, i) => (i === die ? (x === pieceId ? null : pieceId) : x));
  return assignError(s, d, trial) ? ids : trial;
}

/** The die to arm after `die` took a piece: the next one that can act and has none yet, else the same die. */
export function nextDie(s: GameState, d: ElanOrRally, die: number, ids: readonly (string | null)[]): number {
  for (let k = 1; k < d.faces.length; k++) {
    const i = (die + k) % d.faces.length;
    if (ids[i] === null && assignOptions(s, d, i).length > 0) return i;
  }
  return die;
}

/** The refusal behind an `assignClick` that left the ids as they were (null when the click was accepted or meant nothing). */
export function assignClickRefusal(s: GameState, d: ElanOrRally, sel: AssignSel, pieceId: string): string | null {
  const { die, ids } = sel;
  if (die === null || die < 0 || die >= d.faces.length) return null;
  if (!assignOptions(s, d, die).some((o) => o.id === pieceId)) return null;
  return assignError(s, d, ids.map((x, i) => (i === die ? pieceId : x)));
}

/** The pieces named in `ids` (for the board's marks), skipping what is not on the board. */
export const assignedPieces = (s: GameState, ids: readonly (string | null)[]): string[] =>
  ids.filter((x): x is string => x !== null && !!pieceById(s, x));
