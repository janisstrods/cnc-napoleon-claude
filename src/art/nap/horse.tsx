// The horse, drawn alone: shared by the rider (this task), the leader (Task 6) and the horse-artillery team (Task 5). Parts
// never carry data-fig, so a horse-artillery driver still counts once.
//
// Drawn facing right with the hooves at y = 0 (an original design, in its own coordinates). The heavy horse is the light one
// scaled by HEAVY_SCALE about the hooves. Order, back to front: tail, far legs, body, mane, shabraque (with sheepskin),
// portmanteau and cloak roll, near legs, head furniture.
import { darken, lighten } from '../color';
import { Hi, Line2, OL, Paint, Shape } from './draw';
import { HORSE_COATS } from './nations';
import type { HorseCoatName, HorseSpec } from './uniform';

export type HorseSize = 'light' | 'heavy';
type P = readonly [number, number];

/** The heavy horse is about 12% larger than the light one. */
export const HEAVY_SCALE = 1.12;

const LIGHT_SEAT: P = [-1.2, -18.4];
/** Where the rider's hip sits on the horse, in the horse's frame. The rider is drawn in the frame translated to this point. */
export const HORSE_SEAT: Record<HorseSize, { x: number; y: number }> = {
  light: { x: LIGHT_SEAT[0], y: LIGHT_SEAT[1] },
  heavy: { x: LIGHT_SEAT[0] * HEAVY_SCALE, y: LIGHT_SEAT[1] * HEAVY_SCALE },
};

const MOUTH: P = [18.9, -18.4];
/** The bit, relative to the seat (the frame the rider is drawn in): where the reins end. */
export const HORSE_MOUTH: Record<HorseSize, { x: number; y: number }> = {
  light: { x: MOUTH[0] - LIGHT_SEAT[0], y: MOUTH[1] - LIGHT_SEAT[1] },
  heavy: { x: (MOUTH[0] - LIGHT_SEAT[0]) * HEAVY_SCALE, y: (MOUTH[1] - LIGHT_SEAT[1]) * HEAVY_SCALE },
};

const BODY =
  'M-12.4 -16.2 C-11.5 -18.4 -8 -18.2 -5 -17.6 C-2 -17.2 1 -17.8 4 -19 C6.2 -20 8.2 -23 10.2 -26.2 ' +
  'C11 -27.6 12.6 -28.2 13.8 -27.6 L14.4 -29.4 L15.4 -27.6 C17.2 -26.4 19.2 -22.6 20.2 -19.8 ' +
  'C20.6 -18.4 19.6 -17.6 18.4 -17.8 C17 -18 16 -19 15 -20 C13.4 -20 12.4 -19.4 11.6 -18.2 ' +
  'C10.6 -15.8 10.2 -13 9 -11 C5 -9.6 -1 -9.4 -6 -9.8 C-9 -10 -11.4 -10.8 -12.8 -12.4 C-14.2 -14 -13.6 -15.6 -12.4 -16.2 Z';
const BELLY = 'M9 -11 C5 -9.6 -1 -9.4 -6 -9.8 C-9 -10 -11.4 -10.8 -12.8 -12.4 C-13.4 -13 -13.6 -13.6 -13.4 -14.2 C-10 -12.2 -5 -11.6 0 -11.6 C4 -11.6 7 -12 9.6 -13 C9.6 -12.4 9.4 -11.6 9 -11 Z';
const HAUNCH = 'M-12.4 -16.2 C-14 -15.6 -14.2 -13.6 -12.8 -12.4 C-11.4 -13.4 -10.6 -15 -10.8 -17 Z';
const TAIL = 'M-12.6 -16.4 C-15.8 -15.8 -17 -12 -16.6 -7 C-16 -9.6 -15 -11.4 -13.2 -13.2 Z';
const MANE = 'M4 -19.2 C6.2 -21.8 8.2 -25 10.4 -27.2 C11 -26.4 10.8 -25.6 10.2 -24.8 C8.6 -22.8 7.2 -21 6 -18.6 Z';

type Leg = readonly [P, P, P];
interface Gait { farHind: Leg; farFore: Leg; nearHind: Leg; nearFore: Leg }
const GAITS: readonly Gait[] = [
  { farHind: [[-8.2, -11], [-9.4, -6], [-8.4, -0.8]], farFore: [[6, -11], [7.8, -6.4], [6.8, -0.8]], nearHind: [[-10.6, -11.4], [-12.8, -6], [-11.6, -0.8]], nearFore: [[8, -10.8], [8.6, -5.4], [9.6, -0.8]] },
  { farHind: [[-8.2, -11], [-6.6, -6.6], [-6, -0.8]], farFore: [[6, -11], [10.2, -8.6], [11.6, -4.4]], nearHind: [[-10.6, -11.4], [-13.4, -7], [-14.6, -2.4]], nearFore: [[8, -10.8], [8.4, -5.6], [8, -0.8]] },
  { farHind: [[-8.2, -11], [-10.6, -6.6], [-12.8, -2.6]], farFore: [[6, -11], [8.4, -6], [8.6, -0.8]], nearHind: [[-10.6, -11.4], [-9.2, -6], [-8.4, -0.8]], nearFore: [[8, -10.8], [11.4, -8.2], [13.4, -4.2]] },
];

const HOOF = '#2a1d14';
const path = (l: Leg) => `M${l[0][0]} ${l[0][1]} L${l[1][0]} ${l[1][1]} L${l[2][0]} ${l[2][1]}`;
/** A short, dark hoof continuing the line of the leg to the ground. */
function hoof(l: Leg): string {
  const [x, y] = l[2];
  const [px, py] = l[1];
  const len = Math.hypot(x - px, y - py) || 1;
  return `M${(x - ((x - px) / len) * 1.4).toFixed(2)} ${(y - ((y - py) / len) * 1.4).toFixed(2)} L${x} ${(y + 0.7).toFixed(2)}`;
}

/** The scalloped edge of a sheepskin, as relative curls running right from the current point across `w` units. */
function scallop(w: number, n: number): string {
  const step = (w / n).toFixed(2);
  return ' q' + `${(w / n / 2).toFixed(2)} 1.6 ${step} 0`.repeat(1) + ` q${(w / n / 2).toFixed(2)} 1.6 ${step} 0`.repeat(n - 1);
}

const WOOL = '#e6dfcb';

/** The saddle cloth with a pointed rear and its trim; a light horse's sheepskin lies over it, leaving a border of the cloth. */
function Shabraque({ cloth, trim, sheepskin }: HorseSpec['shabraque']) {
  const edge = 'M3.4 -18.6 L-7 -17.8 L-11 -8.6 L-4 -11.2 L2.8 -10.6 L3.9 -14.4 Z';
  return (
    <g data-part="shabraque">
      <Shape d={edge} f={cloth} sw={0.6} />
      <Paint d="M-7 -17.8 L-11 -8.6 L-8.6 -9.6 L-5.6 -17.6 Z" f={darken(cloth, 0.35)} o={0.55} mx={-3.5} />
      <Hi d="M3.9 -14.4 L2.8 -10.6 L-4 -11.2 L-11 -8.6 L-7 -17.8" c={trim} w={0.7} o={1} />
      {sheepskin ? (
        <g data-part="sheepskin">
          <path d={`M3.8 -18.8 L-7.4 -18 L-10.2 -11.6 L-9.4 -10.6${scallop(12, 6)} L3.4 -14.6 Z`} fill={WOOL} stroke={OL} strokeWidth={0.5} strokeLinejoin="round" />
          <path d="M-6 -16.4 L-5.4 -15.2 M-2.4 -16.8 L-2 -15.6 M1 -16.8 L1.2 -15.6 M-7.6 -13.4 L-6.8 -12.6 M-3.4 -13.4 L-2.8 -12.4 M0.6 -13.4 L0.8 -12.4" stroke={darken(WOOL, 0.3)} strokeWidth={0.4} strokeLinecap="round" />
        </g>
      ) : null}
    </g>
  );
}

/** The rolled cloak across the pommel and the portmanteau behind the cantle. */
function Valise({ cloth, trim }: { cloth: string; trim: string }) {
  const roll = darken(cloth, 0.18);
  return (
    <g data-part="valise">
      <Shape d="M-13 -21.4 L-7.4 -21.8 L-7.2 -17.6 L-12.8 -17.2 Q-13.8 -19.4 -13 -21.4 Z" f={roll} sw={0.6} />
      <path d="M-13 -21.4 L-7.4 -21.8 M-12.9 -17.4 L-7.2 -17.8" stroke={trim} strokeWidth={0.5} fill="none" />
      <path d="M-10.2 -21.7 L-10 -17.5" stroke={darken(roll, 0.4)} strokeWidth={0.5} />
      <Line2 d="M3.8 -22.2 Q5.8 -20.4 5.4 -17.6" w={2.6} c={lighten(roll, 0.12)} ow={0.55} />
    </g>
  );
}

/** Bridle and bit. */
function Bridle() {
  return (
    <g fill="none" stroke="#33200f" strokeWidth={0.55} strokeLinecap="round">
      <path d="M14.2 -27.4 L17.2 -19.2 M15.6 -23.2 L19.9 -21.6 M14 -25.4 L17 -24" />
    </g>
  );
}

export function Horse({ size, coat, pose, shabraque }: { size: HorseSize; coat: HorseCoatName; pose: 0 | 1 | 2; shabraque: HorseSpec['shabraque'] }) {
  const c = HORSE_COATS[coat];
  const g = GAITS[pose % GAITS.length];
  const far = darken(c.coat, 0.24);
  return (
    <g data-horse={size} transform={size === 'heavy' ? `scale(${HEAVY_SCALE})` : undefined}>
      <Shape d={TAIL} f={c.mane} sw={0.6} />
      {([g.farHind, g.farFore] as const).map((l, k) => (
        <g key={k}>
          <Line2 d={path(l)} w={k ? 2.2 : 2.4} c={far} ow={0.7} />
          <Line2 d={hoof(l)} w={2.2} c={HOOF} ow={0.45} />
        </g>
      ))}
      <Shape d={BODY} f={c.coat} sw={0.85} />
      <Paint d={BELLY} f={c.shade} />
      <Paint d={HAUNCH} f={c.shade} o={0.6} />
      <Hi d="M-9.6 -17.6 C-6 -18 -2.6 -17.4 0.6 -17.6 C3 -17.8 4.8 -19 6.2 -21" c={lighten(c.coat, 0.3)} w={0.7} o={0.7} mx={-1} />
      <Hi d="M3.6 -13 C5.2 -14 5.8 -15.4 6 -16.8" c={c.shade} w={0.5} o={0.8} />
      <Shape d={MANE} f={c.mane} sw={0.55} />
      <circle cx={15.4} cy={-24.4} r={0.5} fill={OL} />
      <circle cx={19.6} cy={-18.9} r={0.35} fill={OL} />
      <Shabraque {...shabraque} />
      <Valise cloth={shabraque.cloth} trim={shabraque.trim} />
      {([g.nearHind, g.nearFore] as const).map((l, k) => (
        <g key={k}>
          <Line2 d={path(l)} w={k ? 2.3 : 2.7} c={c.coat} ow={0.75} />
          <Line2 d={hoof(l)} w={2.4} c={HOOF} ow={0.45} />
        </g>
      ))}
      <Bridle />
    </g>
  );
}
