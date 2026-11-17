// Where each miniature stands on the base, by formation and remaining strength.
import type { FigureSpec } from './uniform';

export interface Slot { x: number; y: number; s: number }
export type Formation = 'close' | 'loose' | 'horse' | 'gun';

const FB = 1.12; // back-rank scale (foot)
const FF = 1.26; // front-rank scale (foot)

// Slots are the same in both facings (only the figure inside is mirrored), and the formation leans left so the top-right
// corner stays clear for an attached leader's medallion (centre (29, -28), radius 12): tests/art/nap/token.test.ts checks it
// against ICON_BOX. Strengths above 4 blocks are undefined until Plan 7.
//
// The full-strength list of each formation, back rank first (draw order). Depleted units drop figures from the back rank
// first, so every strength from 2 to 4 is the tail of this list and a surviving figure keeps its slot; the one-block
// slot is the exception: it is centred (and takes the paint of the last front-rank figure).
const FULL: Record<Formation, readonly [Slot, Slot, Slot, Slot]> = {
  close: [{ x: -27, y: 5, s: FB }, { x: -9, y: 5, s: FB }, { x: -21, y: 18, s: FF }, { x: -6, y: 18, s: FF }],
  loose: [{ x: -29, y: 6.5, s: FB }, { x: -9.5, y: 3.5, s: FB }, { x: -22, y: 18.5, s: FF }, { x: -6.5, y: 16.5, s: FF }],
  horse: [{ x: -27, y: 8, s: 0.87 }, { x: -5, y: 8, s: 0.87 }, { x: -17, y: 20.5, s: 0.96 }, { x: 4, y: 20.5, s: 0.96 }],
  // gun: the front piece (the gun itself) stands front centre; each further piece stands behind, staggered.
  gun: [{ x: -22, y: 5, s: 0.95 }, { x: 20, y: 6, s: 0.95 }, { x: -17, y: 15, s: 1 }, { x: 2, y: 18.5, s: 1.05 }],
};
const SINGLE: Record<Formation, Slot> = {
  close: { x: -6, y: 18, s: FF },
  loose: { x: -6, y: 18, s: FF },
  horse: { x: 0, y: 20.5, s: 0.96 },
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

/**
 * Measured extents of one figure (top, bottom, left, right), stroke included, for centring and scaling icons. The foot box is
 * the union over every French pose (getBBox, Task 2): top = the bearskin plume, left = the pack, right = a levelled bayonet
 * (aim 17.3 before stroke, about 17.7 with it; rounded up).
 */
export const ICON_BOX: Record<FigureSpec['drawing'], readonly [top: number, bottom: number, left: number, right: number]> = {
  foot: [-43.6, 0.4, -8.4, 18.2],
  horse: [-57.8, 1.8, -19.1, 23.3],
  gun: [-22, 0.4, -20, 22],
};

type Rect = readonly [top: number, bottom: number, left: number, right: number];

/**
 * The box as a stepped profile, for the attach-corner test. Levelled weapons (bayonets at aim and charge) reach the full
 * width only below y -24; above that line there are heads, headgear and the port-arms bayonet, which stay inside a narrower column (measured 12.7 before
 * stroke, at the port bayonet tip; heads and headgear reach only about 7.5). A horse figure measures the same way, with its own
 * left edge for the upper band (`left`). A new foot figure, such as the rifles, must keep its
 * wide parts below the step and its head and headgear inside the column (or re-measure both).
 */
export const ICON_STEP: Record<FigureSpec['drawing'], { y: number; right: number; left?: number } | undefined> = {
  foot: { y: -24, right: 13.4 },
  // Horse: below y -33.5 the horse's head and neck (right 23.3, the heavy horse's nose) and its tail (left -19.1). Above it,
  // measured over all 11 keys and four figures (Chrome getPointAtLength samples in each figure's own frame, stroke half-widths
  // added): riders' heads and headgear, raised sabres and swords (the forward-leaning pose reaches right 12.4) and lances, in the
  // narrow column from -8.5 (a mane or plume behind the head) to 12.4 (rounded outward). `left` is that column's own left edge.
  horse: { y: -33.5, right: 12.6, left: -8.7 },
  gun: undefined,
};

/** The rectangles a figure occupies: the whole box, or the two bands of its stepped profile (above and below the step). */
export function iconRects(d: FigureSpec['drawing']): readonly Rect[] {
  const [top, bottom, left, right] = ICON_BOX[d];
  const st = ICON_STEP[d];
  return st ? [[top, st.y, st.left ?? left, st.right], [st.y, bottom, left, right]] : [[top, bottom, left, right]];
}
