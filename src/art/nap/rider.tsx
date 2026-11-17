// The mounted figure: a horse and its rider. Data decides everything (the spec's dress, headgear, weapon and horse); nothing
// here knows a nation. The rider is drawn in the seat frame (origin at the hip, y negative upwards, facing right) and is the
// same size on a light and a heavy horse: only the horse differs. Shared by the leader (Task 6, weapon 'reins') and the
// horse-artillery drivers (Task 5).
import { darken, lighten } from '../color';
import { Hi, Line2, OL, Paint, Shape, makeFig, type Fig } from './draw';
import { HeadOn, Sleeve } from './foot';
import { HORSE_MOUTH, HORSE_SEAT, Horse } from './horse';
import { METAL, type NationLook } from './nations';
import type { CavalryWeapon, Dress, Headwear, HorseSpec } from './uniform';

type P = readonly [number, number];
const pt = (p: P) => `${p[0]} ${p[1]}`;

const BOOT = '#17140f';
const SPUR = '#bcbcb4';
const NEAR_SHOULDER: P = [2.4, -13.8];
const FAR_SHOULDER: P = [-2.4, -13.6];
const REIN_HAND: P = [4.6, -7.8];

// ---------------------------------------------------------------------------------------------
// Weapons

/** A blade from `hand` to `tip`: straight (a sword, with a brass hilt) or bowed (a sabre, with a steel hilt). */
function Blade({ hand, tip, curved, hilt }: { hand: P; tip: P; curved: boolean; hilt: string }) {
  const len = Math.hypot(tip[0] - hand[0], tip[1] - hand[1]) || 1;
  const u: P = [(tip[0] - hand[0]) / len, (tip[1] - hand[1]) / len];
  const nx = -u[1];
  const ny = u[0];
  const base: P = [hand[0] + u[0] * 1.2, hand[1] + u[1] * 1.2];
  const bow = curved ? 1.6 : 0;
  const ctl: P = [(base[0] + tip[0]) / 2 + nx * bow, (base[1] + tip[1]) / 2 + ny * bow];
  const butt: P = [hand[0] - u[0] * 1.6, hand[1] - u[1] * 1.6];
  return (
    <g>
      <Line2 d={`M${pt(base)} Q${pt(ctl)} ${pt(tip)}`} w={0.95} c={METAL.steel} ow={0.4} />
      <path d={`M${pt(base)} Q${pt(ctl)} ${pt(tip)}`} stroke={lighten(METAL.steel, 0.5)} strokeWidth={0.3} fill="none" opacity={0.8} />
      <Line2 d={`M${pt(butt)} L${pt(base)}`} w={1.3} c="#3a2616" ow={0.35} />
      <path d={`M${base[0] + nx * 1.8} ${base[1] + ny * 1.8} L${base[0] - nx * 1.8} ${base[1] - ny * 1.8}`} stroke={hilt} strokeWidth={0.9} strokeLinecap="round" />
    </g>
  );
}

const LANCE_HAND: P = [6.5, -8.6];
/** The lance slopes forward from the vertical (lowered towards the charge), which also keeps its head and pennon inside the hex. */
const LANCE_SLOPE = 30;
const LANCE_UP = 26; // hand to the foot of the head
const LANCE_DOWN = 13; // hand to the butt

/** The lance, gripped in the near hand and sloped forward; the pennon streams back from just under the head. */
function Lance({ pennon }: { pennon?: readonly [string, string] }) {
  // drawn upright in a frame centred on the hand, then turned forward about the hand
  const ty = -LANCE_UP;
  return (
    <g transform={`translate(${pt(LANCE_HAND)}) rotate(${LANCE_SLOPE})`}>
      <Line2 d={`M0 ${LANCE_DOWN} L0 ${ty}`} w={0.95} c={METAL.wood} ow={0.45} />
      <Shape d={`M-1 ${ty + 0.4} L0 ${ty - 5.2} L1 ${ty + 0.4} Z`} f={METAL.steel} sw={0.5} />
      {pennon ? (
        <g data-part="pennon">
          <Shape d={`M-0.6 ${ty + 1.4} L-9 ${ty + 1.9} L-6.6 ${ty + 4.2} L-0.6 ${ty + 4.2} Z`} f={pennon[0]} sw={0.5} />
          <Shape d={`M-0.6 ${ty + 4.2} L-6.6 ${ty + 4.2} L-9 ${ty + 6.5} L-0.6 ${ty + 7} Z`} f={pennon[1]} sw={0.5} />
        </g>
      ) : null}
    </g>
  );
}

/** Where the weapon arm goes, and the weapon: hand, elbow and the tip of the blade, for each weapon and pose. */
interface Hold { elbow: P; hand: P; tip?: P }
/**
 * Raised blades are drawn at this fraction of the length the poses below are written with: a sword about half a man's height,
 * which keeps the tips of the right-hand riders inside the hex.
 */
const BLADE = 0.85;
const shorten = (h: Hold): Hold => (h.tip ? { ...h, tip: [h.hand[0] + (h.tip[0] - h.hand[0]) * BLADE, h.hand[1] + (h.tip[1] - h.hand[1]) * BLADE] } : h);
function hold(weapon: CavalryWeapon | 'none' | 'reins', pose: 0 | 1 | 2): Hold {
  return shorten(holdAtFullLength(weapon, pose));
}
function holdAtFullLength(weapon: CavalryWeapon | 'none' | 'reins', pose: 0 | 1 | 2): Hold {
  switch (weapon) {
    case 'sabre': {
      const h: Hold[] = [
        { elbow: [5.4, -15.4], hand: [7.2, -19.6], tip: [10.8, -34] },
        { elbow: [5.8, -15], hand: [8, -18.8], tip: [12.6, -32.4] },
        { elbow: [5, -15.8], hand: [6.4, -20.4], tip: [7.8, -35.6] },
      ];
      return h[pose];
    }
    case 'sword': { // raised: blade up and forward; the sloped carry is chosen by the spec through `slope`
      const h: Hold[] = [
        { elbow: [5.6, -15.6], hand: [7, -19.6], tip: [10.6, -38.5] },
        { elbow: [5.8, -15.2], hand: [7.6, -19], tip: [12.2, -36.6] },
        { elbow: [5.2, -15.8], hand: [6.4, -20.4], tip: [8.2, -39.6] },
      ];
      return h[pose];
    }
    case 'lance':
      return { elbow: [5.2, -10.4], hand: LANCE_HAND };
    case 'reins':
      return { elbow: [4.8, -9.4], hand: [REIN_HAND[0] + 1.6, REIN_HAND[1]] };
    case 'none':
      return { elbow: [4.6, -8.4], hand: [3.6, -3.6] };
  }
}

// The sloped sword rests on the shoulder: the blade passes in front of the chest and shows behind the back.
const SLOPE: readonly Hold[] = [
  { elbow: [5.6, -9.4], hand: [6.8, -11.4], tip: [-7.6, -22.4] },
  { elbow: [5.6, -9], hand: [6.8, -11], tip: [-8.2, -20.6] },
  { elbow: [5.6, -9.8], hand: [6.8, -11.8], tip: [-7, -24] },
];

// ---------------------------------------------------------------------------------------------
// Body

function Shoulder({ dress, x }: { dress: Dress; x: number }) {
  const s = dress.shoulders;
  if (!s) return null;
  if (s.kind === 'wings') return <path d={`M${x - 2.4} -13.4 Q${x - 2.2} -15.8 ${x} -15.6 Q${x + 2.4} -15.8 ${x + 2.4} -13.4 Z`} fill={s.colour} stroke={OL} strokeWidth={0.6} strokeLinejoin="round" />;
  if (s.kind === 'straps') return <path d={`M${x - 1.5} -14.7 L${x + 1.5} -14.4 L${x + 1.4} -13.3 L${x - 1.6} -13.6 Z`} fill={s.colour} stroke={dress.facings} strokeWidth={0.5} strokeLinejoin="round" />;
  return (
    <g>
      <ellipse cx={x} cy={-14} rx={2} ry={1.15} fill={s.colour} stroke={OL} strokeWidth={0.6} />
      <path d={`M${x - 1.8} -13.2 L${x - 1.9} -12.1 M${x - 0.6} -12.9 L${x - 0.6} -11.7 M${x + 0.6} -12.9 L${x + 0.7} -11.7 M${x + 1.8} -13.2 L${x + 2} -12.1`} stroke={darken(s.colour, 0.2)} strokeWidth={0.5} strokeLinecap="round" />
    </g>
  );
}

/** The cuirass: a steel breastplate with its ridge and brass rim; it catches the light on the lit side. */
function Cuirass() {
  const steel = METAL.steel;
  return (
    <g data-cuirass="steel">
      <Shape d="M-3.5 -14.6 Q0.2 -16.2 3.7 -14.4 L3.3 -5.2 Q0 -3.2 -3.5 -5.4 Z" f={steel} sw={0.7} />
      <Paint d="M-3.5 -14.6 L-3.5 -5.4 Q-2.2 -4.6 -0.8 -4.3 L-1 -15.4 Z" f={darken(steel, 0.4)} o={0.55} mx={0} />
      <Paint d="M1.2 -15.2 L3.7 -14.4 L3.3 -5.2 Q2.4 -4.4 1.6 -4.1 Z" f={lighten(steel, 0.55)} o={0.9} mx={0} />
      <path d="M0.3 -15.2 L0.1 -4.1" stroke={darken(steel, 0.3)} strokeWidth={0.4} />
      <path d="M-3.5 -5.4 Q0 -3.2 3.3 -5.2" fill="none" stroke={METAL.brass} strokeWidth={0.7} />
      <path d="M-3.5 -14.6 Q0.2 -16.2 3.7 -14.4" fill="none" stroke={METAL.brass} strokeWidth={0.6} />
    </g>
  );
}

/** The torso in the upright frame: coat by cut, facings, lapels, lace, belts, shoulders. */
function Torso({ dress, f }: { dress: Dress; f: Fig }) {
  const { coat, cut } = dress;
  const body = 'M-3.4 -14.2 Q0.2 -15.8 3.6 -14.2 L3.2 -4 L3.7 -0.6 Q0 0 -3.9 -0.6 L-3.4 -4 Z';
  const lace = dress.lace;
  const lapel = dress.lapels;
  return (
    <g>
      {cut === 'tails' ? (
        <g>
          <Shape d="M-3.6 -4 L-9 2.2 L-5.4 2 L-4.4 3.2 L-1 0.6 Z" f={coat} sw={0.6} />
          <path d="M-8.4 2 L-5.4 1.9 L-6.2 -0.4 Z" fill={dress.facings} />
        </g>
      ) : null}
      <path d="M-0.9 -17 L1.6 -17 L1.6 -14.6 L-0.9 -14.6 Z" fill={f.skinShade} />
      <Shape d={body} f={coat} />
      <Paint d="M-3.4 -14.2 L-3.2 -4 L-1.4 -4 L-1.3 -14.6 Z" f={darken(coat, 0.38)} o={0.5} mx={0} />
      <Hi d="M3.2 -13.4 L3 -6" c={lighten(coat, 0.28)} w={0.5} o={0.7} mx={0} />
      {lapel ? <Shape d="M0.2 -14.6 L3.3 -14 L3 -5 L0 -5.2 Z" f={lapel} sw={0.5} /> : null}
      {lapel ? <path d="M0.2 -14.6 L0 -5.2 M3.3 -14 L3 -5" fill="none" stroke={lace ?? darken(lapel, 0.3)} strokeWidth={0.45} opacity={0.9} /> : null}
      {lace && cut === 'dolman' ? (
        <g stroke={lace} strokeLinecap="round" fill="none">
          <path d="M-2.6 -13 L2.8 -12.6 M-2.7 -11 L2.9 -10.6 M-2.8 -9 L2.9 -8.6 M-2.9 -7 L3 -6.6 M-2.9 -5 L3.1 -4.7" strokeWidth={0.55} />
          <path d="M0 -14 L0 -4.6" strokeWidth={0.4} />
        </g>
      ) : null}
      {lace && cut === 'tails' ? (
        // aiguillette: two looped cords from the shoulder
        <g stroke={lace} strokeLinecap="round" fill="none">
          <path d="M-2 -14 Q-3.6 -9.6 -1 -7.2 M-1 -13.6 Q-2.2 -10 0.4 -8" strokeWidth={0.5} />
          <path d="M-0.6 -7.4 L-0.4 -6 M0.6 -8 L0.9 -6.6" strokeWidth={0.6} />
        </g>
      ) : null}
      {lace && cut === 'jacket' ? <path d="M-3.8 -0.9 Q0 -0.3 3.8 -0.9" stroke={lace} strokeWidth={0.5} fill="none" /> : null}
      <Shape d="M-1.7 -15.4 L2 -15.4 L2.3 -13.8 L-1.9 -13.8 Z" f={dress.facings} sw={0.6} />
      {dress.cuirass ? <Cuirass /> : <Line2 d="M-2.6 -14.1 L3.1 -5.4" w={1.1} c={darken(dress.belts, 0.12)} ow={0.4} />}
      <Line2 d="M-3.7 -3.4 L3.6 -3.2" w={1.3} c={dress.sash ?? dress.belts} ow={0.4} />
      <Shoulder dress={dress} x={-2.9} />
      <Shoulder dress={dress} x={2.7} />
    </g>
  );
}

/** A pelisse hanging from the far shoulder behind the back, edged and collared with fur. */
function Pelisse({ colour, fur }: { colour: string; fur: string }) {
  return (
    <g data-part="pelisse">
      <Shape d="M-3 -14.4 L-7.4 -11.6 L-8.2 -2.6 L-3.4 -3.4 Z" f={colour} sw={0.6} />
      <Line2 d="M-3 -14.4 L-7.4 -11.6 L-8.2 -2.6 L-3.4 -3.4" w={1.3} c={fur} ow={0.35} />
      <path d="M-6 -9 L-6.2 -4 M-4.6 -9.6 L-4.8 -4.6" stroke={darken(colour, 0.4)} strokeWidth={0.4} />
    </g>
  );
}

/** The near leg: breeches, a high boot with spur, and the stirrup. */
function RidingLeg({ dress }: { dress: Dress }) {
  return (
    <g>
      <Line2 d="M-0.6 -0.8 L5.2 3.2" w={3.7} c={dress.trousers} ow={0.7} />
      <Line2 d="M5.2 3.2 L3.8 10.8" w={3.1} c={BOOT} ow={0.6} />
      <path d="M3.6 3.2 L6.6 3.4" stroke={lighten(BOOT, 0.3)} strokeWidth={0.5} opacity={0.7} />
      <Line2 d="M3.9 11.4 L6.5 11.8" w={1.9} c={BOOT} ow={0.5} />
      <path d="M1.9 11 L0.6 11.4" stroke={SPUR} strokeWidth={0.7} strokeLinecap="round" />
      <path d="M2.2 12.6 Q4.6 13.8 6.2 12.4" fill="none" stroke={METAL.steelShade} strokeWidth={0.7} strokeLinecap="round" />
    </g>
  );
}

function Scabbard() {
  return (
    <g>
      <Line2 d="M-1.4 -2 L-11.6 6.2" w={1} c={METAL.steelShade} ow={0.4} />
      <Line2 d="M-10.4 5.2 L-12 6.5" w={1.6} c={METAL.brass} ow={0.4} />
    </g>
  );
}

function Carbine() {
  return (
    <g data-carbine="true">
      <Line2 d="M3.4 -1.2 L10 5.6" w={0.9} c={METAL.iron} ow={0.4} />
      <Line2 d="M3.2 -1.4 L6.2 1.7" w={1.7} c={METAL.wood} ow={0.45} />
    </g>
  );
}

// ---------------------------------------------------------------------------------------------

export interface RiderProps {
  dress: Dress;
  head: Headwear;
  weapon: CavalryWeapon | 'none' | 'reins';
  f: Fig;
  pose: 0 | 1 | 2;
  carbine?: boolean;
  pennon?: readonly [string, string];
  /** Where the reins end, in the seat frame (default: the light horse's bit). */
  mouth?: { x: number; y: number };
  /** Sloped sword (blade resting on the shoulder) rather than raised: heavy cavalry's carry. */
  slope?: boolean;
}

/** The rider in the seat frame. The spec says `sword` sloped or raised by `slope`; sabres and swords are drawn from `weapon`. */
export function Rider({ dress, head, weapon, f, pose, carbine, pennon, mouth = HORSE_MOUTH.light, slope }: RiderProps) {
  const sloped = weapon === 'sword' && slope === true;
  const h = sloped ? SLOPE[pose] : hold(weapon, pose);
  const tip = h.tip;
  const rein: P = weapon === 'reins' ? h.hand : REIN_HAND;
  const hilt = weapon === 'sabre' ? METAL.steelShade : METAL.brass;
  const lean = 'rotate(3 0 0)';
  return (
    <g data-rider>
      <Scabbard />
      {carbine ? <Carbine /> : null}
      <Line2 d="M6 8.6 L5.2 10.8" w={2.4} c={darken(BOOT, 0)} ow={0.5} />
      <RidingLeg dress={dress} />
      {dress.pelisse ? <g transform={lean}><Pelisse colour={dress.pelisse.colour} fur={dress.pelisse.fur} /></g> : null}
      <g transform={lean}>
        <Sleeve from={FAR_SHOULDER} elbow={[-0.4, -8.6]} hand={rein} dress={dress} f={f} near={false} />
      </g>
      <path d={`M${pt(rein)} Q${(rein[0] + mouth.x) / 2} ${(rein[1] + mouth.y) / 2 - 3} ${mouth.x} ${mouth.y}`} fill="none" stroke="#33200f" strokeWidth={0.5} strokeLinecap="round" />
      <g transform={lean}>
        <Torso dress={dress} f={f} />
        <g data-weapon={weapon}>
          {weapon === 'lance' ? <Lance pennon={pennon} /> : null}
          {tip ? <Blade hand={h.hand} tip={tip} curved={weapon === 'sabre'} hilt={hilt} /> : null}
        </g>
        <Sleeve from={NEAR_SHOULDER} elbow={h.elbow} hand={h.hand} dress={dress} f={f} near />
        <HeadOn head={head} f={f} x={0.8 + pose * 0.2} y={-19.8} s={1.1} />
      </g>
    </g>
  );
}

// The horse's coat, gait and the rider's pose by figure index: the four files vary a little.
/** The rider is drawn a little under foot-figure size so that the horse reads as the larger body. */
const RIDER_SCALE = 0.9;
const POSES = [1, 0, 2, 0] as const;

export function MountedFigure({ spec, n, i }: { spec: HorseSpec; n: NationLook; i: number }) {
  const f = makeFig(n, i);
  const pose = POSES[i % 4];
  const coat = spec.coats[i % spec.coats.length];
  const seat = HORSE_SEAT[spec.horse];
  return (
    <g data-fig="horse" data-pose={pose} data-coat={coat}>
      <Horse size={spec.horse} coat={coat} pose={pose} shabraque={spec.shabraque} />
      <g transform={`translate(${seat.x} ${seat.y}) scale(${RIDER_SCALE})`}>
        <Rider dress={spec.dress} head={spec.head} weapon={spec.weapon} f={f} pose={pose} carbine={spec.carbine} pennon={spec.pennon} mouth={HORSE_MOUTH[spec.horse]} slope={spec.carry === 'sloped'} />
      </g>
    </g>
  );
}

