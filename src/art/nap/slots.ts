// Where each miniature stands on the base, by formation and remaining strength.
import type { FigureSpec } from './uniform';

export interface Slot { x: number; y: number; s: number }
export type Formation = 'close' | 'loose' | 'horse' | 'gun';

const FB = 1.12; // back-rank scale (foot)
const FF = 1.26; // front-rank scale (foot)

// The full-strength list of each formation, back rank first (draw order). Depleted units drop figures from the back rank
// first, so every strength from 2 to 4 is the tail of this list and a surviving figure keeps its slot; the one-block
// slot is the exception: it is centred (and takes the paint of the last front-rank figure).
const FULL: Record<Formation, readonly [Slot, Slot, Slot, Slot]> = {
  close: [{ x: -20, y: 5, s: FB }, { x: 6, y: 5, s: FB }, { x: -8, y: 18, s: FF }, { x: 17, y: 18, s: FF }],
  loose: [{ x: -21, y: 6.5, s: FB }, { x: 7, y: 4, s: FB }, { x: -9, y: 18.5, s: FF }, { x: 16, y: 16.5, s: FF }],
  horse: [{ x: -25, y: 5.5, s: 0.92 }, { x: 0, y: 5.5, s: 0.92 }, { x: -15, y: 18.5, s: 1 }, { x: 15, y: 18.5, s: 1 }],
  // gun: the front piece (the gun itself) stands front centre; each further piece stands behind, staggered.
  gun: [{ x: -22, y: 5, s: 0.95 }, { x: 20, y: 6, s: 0.95 }, { x: -17, y: 15, s: 1 }, { x: 2, y: 18.5, s: 1.05 }],
};
const SINGLE: Record<Formation, Slot> = {
  close: { x: 4, y: 18, s: FF },
  loose: { x: 4, y: 18, s: FF },
  horse: { x: 1, y: 18.5, s: 1.1 },
  gun: FULL.gun[3],
};

function table(f: Formation): Record<1 | 2 | 3 | 4, readonly Slot[]> {
  const full = FULL[f];
  return { 1: [SINGLE[f]], 2: full.slice(2), 3: full.slice(1), 4: full };
}

/** Slots by formation and strength 1..4, listed back rank first. */
export const SLOTS: Record<Formation, Record<1 | 2 | 3 | 4, readonly Slot[]>> = {
  close: table('close'), loose: table('loose'), horse: table('horse'), gun: table('gun'),
};

export function formationOf(spec: FigureSpec): Formation {
  if (spec.drawing === 'foot') return spec.order === 'close' ? 'close' : 'loose';
  return spec.drawing === 'horse' ? 'horse' : 'gun';
}

/** The slots of `n` blocks, clamped to 1..4. */
export function slotsFor(f: Formation, n: number): readonly Slot[] {
  return SLOTS[f][Math.max(1, Math.min(4, Math.round(n))) as 1 | 2 | 3 | 4];
}

/**
 * Where a unit with `n` of `max` blocks stands, as [slot, index in the full-strength list] pairs: the index picks the
 * figure's paint (and the gun piece), so a figure keeps its look as the unit is depleted.
 */
export function standing(f: Formation, n: number, max: number): readonly (readonly [Slot, number])[] {
  const full = slotsFor(f, max);
  const now = slotsFor(f, Math.min(n, max));
  return now.map((sl, k) => [sl, n >= 2 ? k + (full.length - now.length) : full.length - 1] as const);
}

/** Measured extents of one figure (top, bottom, left, right) for centring and scaling icons. Provisional until the families land. */
export const ICON_BOX: Record<FigureSpec['drawing'], readonly [top: number, bottom: number, left: number, right: number]> = {
  foot: [-33, 0.4, -9, 11],
  horse: [-36, 0.4, -19, 20],
  gun: [-22, 0.4, -20, 22],
};
