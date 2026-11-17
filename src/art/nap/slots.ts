// Where each miniature stands on the base, by formation and remaining strength.
import type { FigureSpec, GunPiece } from './uniform';

type Rect = readonly [top: number, bottom: number, left: number, right: number];

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
  horse: [{ x: -27, y: 8, s: 0.87 }, { x: -5, y: 8, s: 0.87 }, { x: -17, y: 20.5, s: 0.96 }, { x: 4, y: 20.5, s: 0.96 }],
  // gun: the front piece (the gun itself, with its gunner at the trail) stands front centre. The crew stand behind it, in a
  // staggered line, listed back to front by y (the token draws in list order). The real constraint binds the gun piece only:
  // mirrored for a left-facing unit its gunner's head swings right, so the gun slot stays at x -4 or less. Crew pieces have
  // narrow head columns (right about 9), so they could stand further right, but token.test.ts checks every slot against the
  // gun box, which keeps x -2 or less at these heights. Piece k of a unit stands in slot (max - 1 - k) of the full list, so
  // the same pieces keep the same places as it is depleted.
  gun: [{ x: -32, y: 12, s: 0.95 }, { x: -11, y: 13, s: 0.95 }, { x: -2, y: 15, s: 0.98 }, { x: -4, y: 18, s: 1 }],
};
/** The horse-artillery limber team, behind the gun (drawn by the token before the pieces, at every strength). */
export const TEAM_SLOT: Slot = { x: -12, y: -6, s: 0.75 };
/**
 * The horse-artillery team in its own frame (facing right, hooves and wheels at y 0), as bands of 2 units from the top down,
 * [top, bottom, left, right], stroke included: measured by rasterising GunTeamFigure at 4 px per unit for FR/HA and BR/HA
 * (the union), then rounded outwards. The team is wide, with a tall rider and horse heads at the right and a low limber at
 * the left, so a single box or step would not do; tests/art/nap/artillery.test.ts checks every band against the attach
 * corner in both facings.
 */
export const TEAM_BANDS: readonly Rect[] = [
  [-43.8, -42, 0.0, 3.0],
  [-42, -40, -1.5, 3.0],
  [-40, -38, -3.0, 4.0],
  [-38, -36, -3.0, 4.0],
  [-36, -34, -2.5, 5.5],
  [-34, -32, -2.5, 20.0],
  [-32, -30, -4.0, 21.5],
  [-30, -28, -4.5, 23.0],
  [-28, -26, -4.5, 24.5],
  [-26, -24, -8.5, 25.5],
  [-24, -22, -38.0, 26.0],
  [-22, -20, -37.5, 26.0],
  [-20, -18, -37.0, 24.5],
  [-18, -16, -38.5, 20.5],
  [-16, -14, -39.5, 15.5],
  [-14, -12, -40.0, 18.0],
  [-12, -10, -40.0, 19.0],
  [-10, -8, -40.0, 20.0],
  [-8, -6, -39.5, 20.5],
  [-6, -4, -38.5, 20.5],
  [-4, -2, -37.0, 15.5],
  [-2, 0, -36.0, 15.0],
  [0, 1.8, -33.5, 10.0],
];
const SINGLE: Record<Formation, Slot> = {
  close: { x: -4, y: 18, s: FF },
  loose: { x: -4, y: 18, s: FF },
  horse: { x: 0, y: 20.5, s: 0.96 },
  gun: { x: -4, y: 17, s: 1 }, // the gun alone is centred on the base
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
  horse: [-57.8, 1.8, -19.1, 23.3],
  // gun: the gun piece (a gunner kneeling at the trail, the larger-than-life gun), measured over all 7 keys and 4 paint indices
  // like the foot box: top = the Guard gunner's bearskin plume (-38), left = the kneeling far foot (-27.5), right = the muzzle (16).
  gun: [-38.2, 2.1, -27.7, 16.2],
};

/**
 * The box as a stepped profile, for the attach-corner test. Levelled weapons (bayonets at aim and charge) reach the full
 * width only below y -24; above that line there are heads, headgear and the port-arms bayonet, which stay inside a narrower column (measured 13.5 with stroke at the port bayonet tip, the same for
 * every foot figure; heads and headgear reach only about 8.8, the rifles' kneeling aim 7). A horse figure measures the same way, with its own
 * left edge for the upper band (`left`). A new foot figure, such as the rifles, must keep its
 * wide parts below the step and its head and headgear inside the column (or re-measure both).
 */
export const ICON_STEP: Record<FigureSpec['drawing'], { y: number; right: number; left?: number } | undefined> = {
  foot: { y: -24, right: 13.5 },
  // Horse: below y -33.5 the horse's head and neck (right 23.3, the heavy horse's nose) and its tail (left -19.1). Above it,
  // measured over all 11 keys and four figures (Chrome getPointAtLength samples in each figure's own frame, stroke half-widths
  // added): riders' heads and headgear, raised sabres and swords (the forward-leaning pose reaches right 12.4) and lances, in the
  // narrow column from -8.5 (a mane or plume behind the head) to 12.4 (rounded outward). `left` is that column's own left edge.
  horse: { y: -33.5, right: 12.6, left: -8.7 },
  // Gun: below y -22 the whole piece (the gunner's far foot to the muzzle); above it only the gunner's head and headgear, a
  // column from -18.3 to -8 (measured by rasterising, stroke included). Mirrored for a left-facing unit it swings to the
  // right, so the gun slot stays at x -4 or less.
  gun: { y: -22, right: -7.8, left: -18.5 },
};

/**
 * Every piece of a gun unit measured the same way (rasterised at 4 px per unit, all 7 keys and four paint indices, stroke
 * included): the box, and the step above which it is narrower. Only the gun piece is the icon (ICON_BOX.gun); the others stand
 * in the back slots, and tests/art/nap/artillery.test.ts checks each against the attach corner where it is placed.
 */
export const GUN_PIECE_BOX: Record<GunPiece, { box: Rect; step: { y: number; right: number; left: number } }> = {
  gun: { box: ICON_BOX.gun, step: ICON_STEP.gun as { y: number; right: number; left: number } },
  rammer: { box: [-43.2, 1.4, -9.7, 19.2], step: { y: -20, right: 8.9, left: -4.7 } },
  linstock: { box: [-43.4, 1.4, -7.4, 7.9], step: { y: -23, right: 7.9, left: -5.5 } },
  ammo: { box: [-43.2, 1.4, -7.7, 10.9], step: { y: -20, right: 8.9, left: -4.7 } },
};

/** The rectangles a figure occupies: the whole box, or the two bands of its stepped profile (above and below the step). */
export function iconRects(d: FigureSpec['drawing']): readonly Rect[] {
  const [top, bottom, left, right] = ICON_BOX[d];
  const st = ICON_STEP[d];
  return st ? [[top, st.y, st.left ?? left, st.right], [st.y, bottom, left, right]] : [[top, bottom, left, right]];
}
