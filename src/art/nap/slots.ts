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
  close: [{ x: -27, y: 5, s: FB }, { x: -9, y: 5, s: FB }, { x: -18.5, y: 18, s: FF }, { x: -3.5, y: 18, s: FF }],
  loose: [{ x: -29, y: 6.5, s: FB }, { x: -9.5, y: 3.5, s: FB }, { x: -19.5, y: 18.5, s: FF }, { x: -3.5, y: 16.5, s: FF }],
  horse: [{ x: -26, y: 7, s: 0.88 }, { x: -4, y: 7, s: 0.88 }, { x: -15, y: 20.5, s: 0.96 }, { x: 15, y: 20.5, s: 0.96 }],
  // gun: the front piece (the gun itself) stands front centre; each further piece stands behind, staggered.
  gun: [{ x: -22, y: 5, s: 0.95 }, { x: 20, y: 6, s: 0.95 }, { x: -17, y: 15, s: 1 }, { x: 2, y: 18.5, s: 1.05 }],
};
const SINGLE: Record<Formation, Slot> = {
  close: { x: -4, y: 18, s: FF },
  loose: { x: -4, y: 18, s: FF },
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
 * the union over every foot figure, French, British, Portuguese and Allied (Task 3), measured by rasterising each figure
 * (every key, all four paint indices) at 4 px per unit and scanning for ink, so stroke is included and rotated groups are not
 * over-inflated: top = the grenadier plumes (-43.25), left = the kneeling far foot of the caçadores and rifles (-10.75), bottom =
 * the shoe (1.25), right = a levelled bayonet (16.5). Each is rounded up a little.
 */
export const ICON_BOX: Record<FigureSpec['drawing'], readonly [top: number, bottom: number, left: number, right: number]> = {
  foot: [-43.6, 1.3, -10.8, 16.6],
  horse: [-38, 0.4, -19, 20],
  gun: [-22, 0.4, -20, 22],
};

type Rect = readonly [top: number, bottom: number, left: number, right: number];

/**
 * The box as a stepped profile, for the attach-corner test. Levelled weapons (bayonets at aim and charge) reach the full
 * width only below y -24; above that line there are heads, headgear and the port-arms bayonet, which stay inside a narrower column (measured 13.5 with stroke at the port bayonet tip, the same for
 * every foot figure; heads and headgear reach only about 8.8, the rifles' kneeling aim 7). A new foot figure, such as the rifles, must keep its
 * wide parts below the step and its head and headgear inside the column (or re-measure both).
 */
export const ICON_STEP: Record<FigureSpec['drawing'], { y: number; right: number } | undefined> = { foot: { y: -24, right: 13.5 }, horse: undefined, gun: undefined };

/** The rectangles a figure occupies: the whole box, or the two bands of its stepped profile (above and below the step). */
export function iconRects(d: FigureSpec['drawing']): readonly Rect[] {
  const [top, bottom, left, right] = ICON_BOX[d];
  const st = ICON_STEP[d];
  return st ? [[top, st.y, left, st.right], [st.y, bottom, left, right]] : [[top, bottom, left, right]];
}
