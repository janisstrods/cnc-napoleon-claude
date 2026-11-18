// Where each miniature stands on the base, by formation and remaining strength.
import type { FigureSpec, GunPiece } from './uniform';

export type Rect = readonly [top: number, bottom: number, left: number, right: number];

/**
 * A place on the base for a unit facing right; `face: -1` turns the figure to face the other way (a crewman facing his gun),
 * and `back` marks a cavalry back-rank place (its horse is drawn darker, without a portmanteau, so the rank recedes).
 */
export interface Slot { x: number; y: number; s: number; face?: -1; back?: true }
export type Formation = 'close' | 'loose' | 'horse' | 'gun';

const FB = 1.08; // back-rank scale (foot)
const FF = 1.22; // front-rank scale (foot)
const HB = 0.88; // back-rank scale (horse)
const HF = 0.95; // front-rank scale (horse)

// Formations are centred on the base and written for a unit facing right; the token mirrors every slot's x with the facing, so
// a left-facing unit is the mirror image of a right-facing one (its muzzles, bayonets and horses' heads lead, with the room
// behind them). Nothing is reserved for an attached leader: the medallion sits on the badge's left end, below the figures.
// tests/art/nap/token.test.ts checks that every figure stays at least 1 unit inside the hex in both facings, at every strength.
// A five-block unit (the Spanish light infantry and the Swiss) adds one figure further back, in a gap of the back rank
// (FIFTH), so at 4 blocks it stands exactly as a 4-block unit does.
//
// The full-strength list of each formation, back rank first (draw order). Depleted units drop figures from the back rank
// first, so every strength from 2 to 4 is the tail of this list and a surviving figure keeps its slot; the one-block slot is
// the exception: it is centred (and takes the paint of the last front-rank figure). Front ranks are 24 (foot) and 26 (horse)
// apart, so neighbours overlap by a third at most; the back rank is offset from the front by about half that, one figure
// in the gap and one outside it. The hex's pointed top is what binds: the back rank cannot stand higher, nor further out,
// without plumes, bayonets or blades crossing the edge, which is also why the scales are a little under the old 1.26/1.12.
const FULL: Record<Formation, readonly [Slot, Slot, Slot, Slot]> = {
  close: [{ x: -17, y: 10.5, s: FB }, { x: 7, y: 10.5, s: FB }, { x: -6, y: 18.5, s: FF }, { x: 18, y: 18.5, s: FF }],
  loose: [{ x: -19, y: 12, s: FB }, { x: 6, y: 6, s: FB }, { x: -7, y: 18.5, s: FF }, { x: 17, y: 17.5, s: FF }],
  // horse: the back rank stands half a file (13) left of the front, so each back rider's head shows in a gap
  horse: [{ x: -23, y: 12.5, s: 0.85, back: true }, { x: 3, y: 11, s: HB, back: true }, { x: -10, y: 21, s: HF }, { x: 16, y: 21, s: HF }],
  // gun: piece k of a unit stands in slot (max - 1 - k), so at 3 blocks (its strength in play) the gun stands front centre,
  // broadside and whole, with its layer crouched behind the trail; the linstock man stands back by the breech, clear of the
  // recoil, and the rammer out at the muzzle, turned to face it. A fourth block (not in play) adds the man with the cartridge
  // bag behind the trail. A horse-artillery stand's horse holder takes the layer's place by the trail (HOLDER_SLOT).
  gun: [{ x: -9, y: 6, s: 0.9 }, { x: 9, y: 7, s: 0.95 }, { x: 30, y: 11, s: 0.92, face: -1 }, { x: 2, y: 19, s: 1.1 }],
};
/**
 * The fifth figure of a five-block foot unit: drawn first, a little smaller and further back than the back rank, with its head
 * and musket showing in the gap between two heads (close order: between the left front man and the right back man; loose
 * order: between the two left-hand men). It is the first figure lost. Horse and guns have no fifth figure (no such rows).
 */
const FIFTH: Partial<Record<Formation, Slot>> = {
  close: { x: 1, y: 4, s: 1.0 },
  loose: { x: -12, y: 4, s: 1.0 },
};
const SINGLE: Record<Formation, Slot> = {
  close: { x: 0, y: 18.5, s: FF },
  loose: { x: 0, y: 18.5, s: FF },
  horse: { x: 0, y: 21, s: HF },
  gun: { x: 0, y: 18, s: 1.1 }, // the gun alone is centred on the base
};

/**
 * Where a horse-artillery stand's horse holder stands (a mounted gunner, not a block piece: he stays at every strength): by the
 * trail on the side away from the enemy, in the layer's place (a horse-artillery gun has no layer), his horse turned away
 * from the guns. Nothing drawn after him covers the horse or his torso (tests/art/nap/artillery.test.ts). Mirrored with the
 * facing like every slot.
 */
export const HOLDER_SLOT: Slot = { x: -25, y: 10, s: 0.75, face: -1 };

type Strength = 1 | 2 | 3 | 4 | 5;
function table(f: Formation): Record<Strength, readonly Slot[]> {
  const full = FULL[f];
  const fifth = FIFTH[f];
  return { 1: [SINGLE[f]], 2: full.slice(2), 3: full.slice(1), 4: full, 5: fifth ? [fifth, ...full] : full };
}

/** Slots by formation and strength 1..5 (horse and guns stop at 4), listed back rank first. */
export const SLOTS: Record<Formation, Record<Strength, readonly Slot[]>> = {
  close: table('close'), loose: table('loose'), horse: table('horse'), gun: table('gun'),
};

export function formationOf(spec: FigureSpec): Formation {
  if (spec.drawing === 'foot') return spec.order === 'close' ? 'close' : 'loose';
  return spec.drawing === 'horse' ? 'horse' : 'gun';
}

/** The slots of `n` blocks, clamped to 1..5. */
export function slotsFor(f: Formation, n: number): readonly Slot[] {
  return SLOTS[f][Math.max(1, Math.min(5, Math.round(n))) as Strength];
}

/**
 * Where a unit with `n` of `max` blocks stands, as [slot, figure index] pairs: the index picks the figure's paint (and the gun
 * piece), so a figure keeps its look as the unit is depleted. It is the slot's place in the full-strength list, except that a
 * fifth figure (FIFTH) takes index 4 and the other four keep 0..3, so a five-block unit at 4 blocks is drawn as a four-block one.
 */
export function standing(f: Formation, n: number, max: number): readonly (readonly [Slot, number])[] {
  const full = slotsFor(f, max);
  const now = slotsFor(f, Math.min(n, max));
  const extra = full.length > 4 ? full.length - 4 : 0;
  const index = (j: number) => (j < extra ? 4 + j : j - extra);
  return now.map((sl, k) => [sl, index(n >= 2 ? k + (full.length - now.length) : full.length - 1)] as const);
}

/**
 * Measured extents of one figure (top, bottom, left, right), stroke included, for centring and scaling icons: the union of the
 * figure bands below for each drawing (for a gun, its gun piece).
 */
export const ICON_BOX: Record<FigureSpec['drawing'], Rect> = {
  foot: [-44, 2, -11, 16.5],
  horse: [-54, 2, -19, 23.5],
  gun: [-38, 2, -33, 17],
};

/**
 * Which measured profile a placed figure uses: its formation for foot and horse, its piece for a gun unit (`horseGun` for a
 * horse-artillery gun, which has no layer: its horse holder stands there), or the holder.
 */
export type BandKey = 'close' | 'loose' | 'horse' | GunPiece | 'horseGun' | 'holder';

/**
 * The ink of every figure in its own frame (facing right, feet at 0,0), as bands of 2 units from the top down, [top, bottom,
 * left, right], stroke included: measured by rasterising each figure at 4 px per unit and scanning for ink, as the union over
 * every key and all four paint indices of that formation (or gun piece), then rounded outwards to half a unit. Weapons, plumes
 * and pennons are included, so the inside-the-hex test catches a bayonet or a lance tip crossing the hex edge. Re-measure
 * after changing a figure's drawing: with a dev server running, `npx vite-node scripts/art-bands.ts -- --port <port> --write`.
 */
export const FIGURE_BANDS: Record<BandKey, readonly Rect[]> = {
  close: [
    [-44, -42, -2.5, 3], [-42, -40, -3, 5.5], [-40, -38, -3, 6], [-38, -36, -2.5, 13.5], [-36, -34, -3.5, 13.5],
    [-34, -32, -3.5, 12.5], [-32, -30, -4, 11], [-30, -28, -3.5, 10], [-28, -26, -4, 9], [-26, -24, -7.5, 9],
    [-24, -22, -8.5, 16.5], [-22, -20, -8.5, 16.5], [-20, -18, -8, 14.5], [-18, -16, -8, 15], [-16, -14, -8, 10],
    [-14, -12, -7.5, 6.5], [-12, -10, -5.5, 6], [-10, -8, -5.5, 6.5], [-8, -6, -6, 7], [-6, -4, -7, 7.5],
    [-4, -2, -7.5, 8], [-2, 0, -7.5, 9.5], [0, 2, -7.5, 9.5],
  ],
  loose: [
    [-42, -40, 0.5, 5.5], [-40, -38, -0.5, 6], [-38, -36, -2, 13.5], [-36, -34, -3, 13.5], [-34, -32, -3.5, 12.5],
    [-32, -30, -3, 11], [-30, -28, -3, 10], [-28, -26, -4, 9], [-26, -24, -7.5, 9], [-24, -22, -8.5, 16.5],
    [-22, -20, -8.5, 16.5], [-20, -18, -8, 16.5], [-18, -16, -8, 11.5], [-16, -14, -8, 6.5], [-14, -12, -7.5, 7],
    [-12, -10, -7.5, 5.5], [-10, -8, -7.5, 6.5], [-8, -6, -6, 7], [-6, -4, -7, 7.5], [-4, -2, -11, 8],
    [-2, 0, -11, 9.5], [0, 2, -11, 9.5],
  ],
  horse: [
    [-54, -52, -2, 10.5], [-52, -50, -2, 11.5], [-50, -48, -2, 21], [-48, -46, -3.5, 20], [-46, -44, -4, 19.5],
    [-44, -42, -7.5, 18], [-42, -40, -8.5, 16.5], [-40, -38, -9, 15.5], [-38, -36, -7, 14], [-36, -34, -6.5, 13],
    [-34, -32, -6, 17.5], [-32, -30, -8, 19], [-30, -28, -8.5, 20.5], [-28, -26, -9, 21.5], [-26, -24, -15, 23],
    [-24, -22, -15.5, 23.5], [-22, -20, -15.5, 23.5], [-20, -18, -16, 22.5], [-18, -16, -18, 20.5], [-16, -14, -18.5, 12.5],
    [-14, -12, -19, 13], [-12, -10, -19, 15], [-10, -8, -19, 16], [-8, -6, -19, 17], [-6, -4, -18.5, 17.5],
    [-4, -2, -19, 17], [-2, 0, -18.5, 14], [0, 2, -15.5, 13],
  ],
  gun: [
    [-38, -36, -21.5, -18], [-36, -34, -22, -18], [-34, -32, -21.5, -16.5], [-32, -30, -22.5, -13.5], [-30, -28, -23, -13.5],
    [-28, -26, -23.5, -13.5], [-26, -24, -23.5, -14], [-24, -22, -23.5, 1.5], [-22, -20, -23.5, 16.5], [-20, -18, -26, 17],
    [-18, -16, -27, 17], [-16, -14, -27.5, 17], [-14, -12, -30, 11.5], [-12, -10, -26, 11.5], [-10, -8, -26.5, 11.5],
    [-8, -6, -27, 11.5], [-6, -4, -27.5, 11], [-4, -2, -33, 10], [-2, 0, -33, 8.5], [0, 2, -33, 6.5],
  ],
  horseGun: [
    [-22, -20, -6.5, 1], [-20, -18, -9.5, 15], [-18, -16, -11.5, 15.5], [-16, -14, -13, 15.5], [-14, -12, -13.5, 15.5],
    [-12, -10, -12.5, 10.5], [-10, -8, -12, 10.5], [-8, -6, -13, 10.5], [-6, -4, -14, 10], [-4, -2, -15.5, 9.5],
    [-2, 0, -15.5, 8], [0, 2, -15.5, 5.5],
  ],
  rammer: [
    [-44, -42, 1.5, 4], [-42, -40, 0.5, 4.5], [-40, -38, 0.5, 4.5], [-38, -36, 1, 7.5], [-36, -34, -0.5, 9],
    [-34, -32, -1, 9], [-32, -30, -1.5, 8.5], [-30, -28, -1.5, 8], [-28, -26, -1.5, 8], [-26, -24, -1, 9],
    [-24, -22, -5.5, 5.5], [-22, -20, -5.5, 6], [-20, -18, -4.5, 7.5], [-18, -16, -4.5, 8], [-16, -14, -4.5, 8.5],
    [-14, -12, -4.5, 10], [-12, -10, -5.5, 14], [-10, -8, -5.5, 15.5], [-8, -6, -6, 15.5], [-6, -4, -7, 14],
    [-4, -2, -7.5, 8], [-2, 0, -7.5, 9.5], [0, 2, -7.5, 9.5],
  ],
  linstock: [
    [-44, -42, -2, 1], [-42, -40, -2.5, 6.5], [-40, -38, -2.5, 6.5], [-38, -36, -2.5, 7], [-36, -34, -3, 8],
    [-34, -32, -3.5, 7], [-32, -30, -4, 6.5], [-30, -28, -3.5, 6.5], [-28, -26, -3.5, 7], [-26, -24, -3, 6.5],
    [-24, -22, -5, 6], [-22, -20, -5.5, 6], [-20, -18, -7, 7], [-18, -16, -7.5, 7.5], [-16, -14, -7, 7.5],
    [-14, -12, -6.5, 7], [-12, -10, -5.5, 6], [-10, -8, -5, 5.5], [-8, -6, -4, 5.5], [-6, -4, -4, 5.5],
    [-4, -2, -4.5, 5.5], [-2, 0, -4.5, 6], [0, 2, -4.5, 6],
  ],
  ammo: [
    [-44, -42, 1, 4], [-42, -40, 0.5, 4], [-40, -38, 0.5, 4], [-38, -36, 0.5, 7.5], [-36, -34, -1, 8.5],
    [-34, -32, -1.5, 8.5], [-32, -30, -1.5, 8], [-30, -28, -1.5, 7.5], [-28, -26, -1.5, 8], [-26, -24, -1, 8.5],
    [-24, -22, -4.5, 5.5], [-22, -20, -4.5, 9], [-20, -18, -4.5, 9], [-18, -16, -5.5, 9.5], [-16, -14, -7, 10.5],
    [-14, -12, -4.5, 10.5], [-12, -10, -5.5, 10.5], [-10, -8, -5.5, 10.5], [-8, -6, -6, 7], [-6, -4, -7, 7.5],
    [-4, -2, -7.5, 8], [-2, 0, -7.5, 9.5], [0, 2, -7.5, 9.5],
  ],
  holder: [
    [-48, -46, 0.5, 3], [-46, -44, 0, 3.5], [-44, -42, -3, 4.5], [-42, -40, -3, 4.5], [-40, -38, -3, 4.5],
    [-38, -36, -3, 6], [-36, -34, -3, 6], [-34, -32, -4, 3], [-32, -30, -4.5, 4], [-30, -28, -4.5, 16],
    [-28, -26, -5, 17.5], [-26, -24, -4.5, 19], [-24, -22, -9, 20], [-22, -20, -14, 21], [-20, -18, -14, 21],
    [-18, -16, -14.5, 20.5], [-16, -14, -16, 11.5], [-14, -12, -17, 11], [-12, -10, -17, 10], [-10, -8, -17, 10.5],
    [-8, -6, -17, 10.5], [-6, -4, -15, 11], [-4, -2, -14.5, 11.5], [-2, 0, -14, 11.5], [0, 2, -13.5, 11.5],
  ],
};
