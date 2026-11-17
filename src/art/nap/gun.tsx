// One piece of a gun unit: the gun itself with the gunner laying it, a rammer, a linstock man, or a man with a cartridge bag.
// A horse-artillery stand (the spec has `holder`) also shows a mounted gunner holding his horse (HorseHolderFigure, drawn by
// the token at the rear of the base at every strength). Data decides everything (the spec's crew dress and headgear,
// carriage colour and barrel metal); nothing here knows a nation.
//
// Every piece is drawn facing right with its feet (wheels, hooves) at (0,0). The gun is seen from the side and a little from
// above: the far wheel and trail sit up and to the left of the near ones. Order, back to front: far wheel, far trail, barrel,
// near trail, axle block, the gunner crouched behind the trail end with his handspike in it (No. 1 laid the gun from there,
// sighting along the barrel), near wheel (a ring with spokes, so the barrel shows through it).
// The horse-artillery gun (the spec has a holder) is drawn 10% smaller; its carriage colour is the spec's lighter one.
import type { ReactNode } from 'react';
import { darken, lighten } from '../color';
import { Hi, Line2, OL, Paint, Shape, makeFig, type Fig } from './draw';
import { FootBody, HeadOn, Sleeve, torsoTransform, type Stance } from './foot';
import { HORSE_MOUTH, HORSE_SEAT, Horse } from './horse';
import { METAL, type NationLook } from './nations';
import { Rider } from './rider';
import type { Dress, GunPiece, GunSpec } from './uniform';

type P = readonly [number, number];
const pt = (p: P) => `${p[0]} ${p[1]}`;
const circlePath = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

/** The gun is drawn larger than life against its crew (a wheel is about half a man) so that it reads at board scale. */
export const GUN_SCALE = 1.12;
/** The horse-artillery gun is drawn a tenth smaller than the foot gun. */
export const HORSE_GUN_SCALE = 0.9;
/** The horse holder's rider, in the horse's frame (the cavalry's rider scale). */
const HOLDER_RIDER_SCALE = 0.9;

const WHEEL_R = 8.6;
const WOOL = '#e6dfcb';
const LEATHER = '#5a3a22';

// ---------------------------------------------------------------------------------------------
// The gun

function Wheel({ cx, cy, r, rim, far }: { cx: number; cy: number; r: number; rim: string; far: boolean }) {
  const spokes = Array.from({ length: 10 }, (_, k) => {
    const a = (k * Math.PI) / 5 + 0.3;
    return `M${cx} ${cy}L${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join('');
  return (
    <g data-part="wheel">
      <Line2 d={circlePath(cx, cy, r)} w={1.7} c={rim} ow={0.7} />
      <path d={spokes} fill="none" stroke={darken(rim, far ? 0.7 : 0.55)} strokeWidth={0.75} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={1.7} fill={darken(rim, far ? 0.55 : 0.35)} stroke={OL} strokeWidth={0.6} />
    </g>
  );
}

function Barrel({ metal }: { metal: 'bronze' | 'iron' }) {
  const body = metal === 'bronze' ? METAL.bronze : METAL.iron;
  const shade = metal === 'bronze' ? METAL.bronzeShade : METAL.ironShade;
  const hl = lighten(body, 0.45);
  // in the barrel's own frame: breech at x -8, muzzle at 17.6; the group tilts the muzzle up a little
  return (
    <g data-part="barrel" transform="translate(-3 -14) rotate(-6)">
      <Shape d="M-7.6 -2.5 L2 -2.3 L14 -1.7 L14.3 -2.4 L17.4 -2.4 L17.6 2.4 L14.3 2.4 L14 1.7 L2 2.3 L-7.6 2.5 Z" f={body} sw={0.8} />
      <Paint d="M-7.6 0.4 L2 0.4 L14 0.3 L14.3 0.4 L17.6 0.4 L17.6 2.4 L14.3 2.4 L14 1.7 L2 2.3 L-7.6 2.5 Z" f={shade} o={0.55} />
      <Hi d="M-6.4 -1.6 L1.6 -1.5 L13 -1 M14.8 -1.8 L17 -1.8" c={hl} w={0.6} o={0.9} />
      <path d="M2.2 -2.3 L2.2 2.3 M-4.6 -2.5 L-4.6 2.5 M14.2 -1.7 L14.2 1.7" stroke={shade} strokeWidth={0.55} />
      <circle cx={-8.4} cy={0} r={1.35} fill={body} stroke={OL} strokeWidth={0.6} />
      <circle cx={0.4} cy={-2.5} r={0.9} fill={METAL.brass} stroke={OL} strokeWidth={0.4} />
      <ellipse cx={17.5} cy={0} rx={0.55} ry={1.7} fill={darken(shade, 0.6)} />
    </g>
  );
}

/** The field gun: wheels, split trail, axle block and barrel; `layer` (the gunner) is drawn behind the near wheel. */
function GunCarriage({ carriage, barrel, layer }: { carriage: string; barrel: 'bronze' | 'iron'; layer?: ReactNode }) {
  const far = darken(carriage, 0.3);
  return (
    <g data-part="gun">
      <Wheel cx={-2.6} cy={-11.2} r={WHEEL_R - 0.8} rim={far} far />
      <Line2 d="M2.7 -14.4 L-7.8 -12.2 L-12 -3.4" w={2.4} c={far} ow={0.6} />
      <Barrel metal={barrel} />
      <Line2 d="M4.5 -12.4 L-6 -10 L-13 -0.8" w={3.3} c={carriage} ow={0.7} />
      <Hi d="M3.6 -13.9 L-5.8 -11.7 L-12 -2.6" c={lighten(carriage, 0.35)} w={0.5} o={0.7} />
      <Shape d="M-13.6 -2 L-11.2 0.2 L-14.2 0.9 Z" f={METAL.iron} sw={0.5} />
      <Shape d="M-2.6 -13.2 L4.4 -13 L4.6 -6.6 L-2.4 -6.4 Z" f={darken(carriage, 0.12)} sw={0.6} />
      {layer}
      <Wheel cx={0} cy={-WHEEL_R} r={WHEEL_R} rim={carriage} far={false} />
    </g>
  );
}

// ---------------------------------------------------------------------------------------------
// Crew

interface CrewPose {
  stance: Stance;
  near: { elbow: P; hand: P };
  far: { elbow: P; hand: P };
  /** The far arm is drawn over the prop (it grips it) rather than behind the body. */
  farOver: boolean;
  head: P;
}

const NEAR_SHOULDER: P = [2.4, -19.9];
const FAR_SHOULDER: P = [-2.4, -19.9];

const CREW_POSE: Record<GunPiece, CrewPose> = {
  // crouched at the trail end, both hands on the handspike
  gun: { stance: 'kneel', near: { elbow: [6, -16.8], hand: [8.4, -13.8] }, far: { elbow: [3, -16.6], hand: [7.2, -12] }, farOver: true, head: [1.2, 0.8] },
  // driving the rammer forward and down into the muzzle
  rammer: { stance: 'stride', near: { elbow: [5.4, -17.6], hand: [6.5, -13.9] }, far: { elbow: [-2.8, -16.4], hand: [0.6, -17.8] }, farOver: true, head: [1, 0.4] },
  // upright with the linstock in the near hand, the far hand on the hip
  linstock: { stance: 'stand', near: { elbow: [5.2, -16.6], hand: [4.4, -13.4] }, far: { elbow: [-5.2, -16.8], hand: [-3.9, -13.2] }, farOver: false, head: [0.2, 0] },
  // carrying a cartridge bag against the hip
  ammo: { stance: 'stride', near: { elbow: [6.6, -14.4], hand: [8.8, -10.8] }, far: { elbow: [1.6, -14], hand: [4.2, -9.8] }, farOver: false, head: [0.8, 0.2] },
};

const RAMMER_BUTT: P = [-5, -21.5];
const RAMMER_TIP: P = [11, -11];

function Rammer() {
  const len = Math.hypot(RAMMER_TIP[0] - RAMMER_BUTT[0], RAMMER_TIP[1] - RAMMER_BUTT[1]);
  const u: P = [(RAMMER_TIP[0] - RAMMER_BUTT[0]) / len, (RAMMER_TIP[1] - RAMMER_BUTT[1]) / len];
  const end: P = [RAMMER_TIP[0] + u[0] * 3.6, RAMMER_TIP[1] + u[1] * 3.6];
  return (
    <g data-prop="rammer">
      <Line2 d={`M${pt(RAMMER_BUTT)} L${pt(RAMMER_TIP)}`} w={1.1} c={METAL.wood} ow={0.45} />
      <Line2 d={`M${pt(RAMMER_TIP)} L${pt(end)}`} w={2.7} c={WOOL} ow={0.5} />
      <path d={`M${RAMMER_TIP[0] + u[0] * 1.8 - u[1] * 1.3} ${RAMMER_TIP[1] + u[1] * 1.8 + u[0] * 1.3} L${RAMMER_TIP[0] + u[0] * 1.8 + u[1] * 1.3} ${RAMMER_TIP[1] + u[1] * 1.8 - u[0] * 1.3}`} stroke={darken(WOOL, 0.35)} strokeWidth={0.4} />
    </g>
  );
}

function Linstock() {
  return (
    <g data-prop="linstock">
      <Line2 d="M4.2 -4 L5.4 -33" w={0.95} c={METAL.wood} ow={0.45} />
      <path d="M3.6 -34.8 Q5.4 -32.4 7.2 -34.8" fill="none" stroke={METAL.brass} strokeWidth={0.8} strokeLinecap="round" />
      <circle cx={5.5} cy={-35.8} r={0.95} fill="#e8741c" stroke={OL} strokeWidth={0.3} />
      <path d="M5.6 -37 Q4.4 -38.6 5.8 -40" fill="none" stroke="#b9b6ae" strokeWidth={0.5} strokeLinecap="round" opacity={0.8} />
    </g>
  );
}

function CartridgeBag() {
  return (
    <g data-prop="cartridge">
      <Line2 d="M3.4 -16.6 L-1.4 -20.8" w={0.9} c={darken(CLOTHBUFF, 0.1)} ow={0.35} />
      <Shape d="M5.4 -16.8 L5.8 -20.8 L7.8 -20.6 L8 -16.4 Z" f={CLOTHBUFF} sw={0.5} />
      <Shape d="M2.4 -17.2 L9.8 -16.4 L10 -9.2 L2.8 -8.6 Z" f={LEATHER} sw={0.7} />
      <path d="M2.5 -15.4 L9.9 -14.6" stroke={darken(LEATHER, 0.45)} strokeWidth={0.5} />
      <circle cx={6.2} cy={-13.4} r={0.7} fill={METAL.brass} stroke={OL} strokeWidth={0.3} />
    </g>
  );
}
const CLOTHBUFF = '#d9c08a';

function Prop({ piece }: { piece: GunPiece }) {
  if (piece === 'rammer') return <Rammer />;
  if (piece === 'linstock') return <Linstock />;
  if (piece === 'ammo') return <CartridgeBag />;
  return null;
}

/** A crewman in the pose of his piece. The gunner of the gun piece also gets the handspike, planted at the trail end. */
function Crewman({ dress, head, f, piece }: { dress: Dress; head: GunSpec['crew']['head']; f: Fig; piece: GunPiece }) {
  const g = CREW_POSE[piece];
  const lean = torsoTransform(g.stance);
  const far = <Sleeve from={FAR_SHOULDER} elbow={g.far.elbow} hand={g.far.hand} dress={dress} f={f} near={false} />;
  return (
    <g data-crew={piece}>
      {piece === 'gun' ? <Line2 d="M3 -1.2 L9.2 -10" w={0.95} c={METAL.wood} ow={0.45} /> : null}
      {g.farOver ? null : <g transform={lean}>{far}</g>}
      <FootBody dress={dress} f={f} stance={g.stance} />
      <g transform={lean}>
        <Prop piece={piece} />
        {g.farOver ? far : null}
        <Sleeve from={NEAR_SHOULDER} elbow={g.near.elbow} hand={g.near.hand} dress={dress} f={f} near />
        <HeadOn head={head} f={f} x={0.6 + g.head[0]} y={-26 + g.head[1]} />
      </g>
    </g>
  );
}

// ---------------------------------------------------------------------------------------------
// The horse holder

/**
 * A horse-artillery gunner mounted on his own horse at a halt, reins in hand: the stand's horse cue, drawn facing right in the
 * horse's frame (hooves at 0,0). The paint is fixed (he is not one of the block pieces), so he is the same at every strength.
 */
export function HorseHolderFigure({ spec, n }: { spec: GunSpec; n: NationLook }) {
  const f = makeFig(n, 1);
  const crew = spec.crew;
  const seat = HORSE_SEAT.light;
  return (
    <g data-holder-figure>
      <Horse size="light" coat="bay" pose={0} shabraque={{ cloth: darken(crew.dress.coat, 0.1), trim: crew.dress.facings }} />
      <g transform={`translate(${seat.x} ${seat.y}) scale(${HOLDER_RIDER_SCALE})`}>
        <Rider dress={crew.dress} head={crew.head} weapon="reins" f={f} pose={0} mouth={HORSE_MOUTH.light} />
      </g>
    </g>
  );
}

// ---------------------------------------------------------------------------------------------

export function GunPieceFigure({ spec, n, i, piece }: { spec: GunSpec; n: NationLook; i: number; piece: GunPiece }) {
  const f = makeFig(n, i);
  let body: ReactNode;
  if (piece === 'gun') {
    const s = Math.round(GUN_SCALE * (spec.holder === true ? HORSE_GUN_SCALE : 1) * 1000) / 1000;
    // the gunner crouches behind the trail end (x -13 in the gun's frame), his handspike planted in it; he is drawn in the
    // gun's scaled frame, so undo the scale for him
    const layer = (
      <g transform={`scale(${Math.round((1 / s) * 1000) / 1000}) translate(${-13 * s - LAYER_BACK} 0)`}>
        <Crewman dress={spec.crew.dress} head={spec.crew.head} f={f} piece="gun" />
      </g>
    );
    body = <g transform={`scale(${s})`}><GunCarriage carriage={spec.carriage} barrel={spec.barrel} layer={layer} /></g>;
  } else body = <Crewman dress={spec.crew.dress} head={spec.crew.head} f={f} piece={piece} />;
  return <g data-fig="gun" data-piece={piece}>{body}</g>;
}

/** How far behind the trail end the gunner crouches, in crew units: his hands reach forward to the handspike in the trail. */
const LAYER_BACK = 7.5;
