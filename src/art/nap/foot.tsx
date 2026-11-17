// The foot figure: one miniature infantryman, drawn facing right with his feet at (0,0) and about 30 units tall to the crown
// of the head. Data decides everything (the spec's dress, headgear, pose and weapon); nothing here knows a nation.
//
// Layout of a figure, back to front: pack, [far arm], body (legs, coat, facings, lapels, shoulders, belts), musket, [far arm],
// near arm, head. The torso, arms, musket and head share one lean transform (`torsoTransform`) so a stride or a kneel tilts
// the whole upper body about the hips while the legs plant themselves.
import { darken, lighten } from '../color';
import { Hi, Line2, OL, OW, Paint, Shape, dots, makeFig, type Fig } from './draw';
import { Headgear } from './headgear';
import { CLOTH, METAL, type NationLook } from './nations';
import type { Dress, FootPose, FootSpec, Headwear } from './uniform';

export type Stance = 'stand' | 'stride' | 'kneel';
type P = readonly [number, number];

const SHOE = '#17140f';
const HIDE = '#6a4c2e'; // the calfskin pack
// The rolled greatcoat on every pack: campaign grey, whatever the man wears.
const PACK_ROLL = CLOTH.greatcoatGrey;
const SKIRT = 4.6; // y of the greatcoat hem

/** The upper body's lean for a stance: a rotation about the hips, and a drop for the kneel. */
export function torsoTransform(stance: Stance): string | undefined {
  if (stance === 'stride') return 'rotate(5 0 -13)';
  if (stance === 'kneel') return 'translate(0 4.5) rotate(4 0 -13)';
  return undefined;
}

const at = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const pt = (p: P) => `${p[0]} ${p[1]}`;

// ---------------------------------------------------------------------------------------------
// Legs

interface LegGeo { hip: P; knee: P; foot: P }
const LEGS: Record<Stance, { far: LegGeo; near: LegGeo }> = {
  stand: {
    far: { hip: [-1.5, -13], knee: [-1.7, -7], foot: [-2, -1] },
    near: { hip: [1.5, -13], knee: [1.9, -7], foot: [2.5, -1] },
  },
  stride: {
    far: { hip: [-1.4, -13], knee: [-3.4, -7.4], foot: [-5.4, -1] },
    near: { hip: [1.5, -13], knee: [4, -8.2], foot: [5.6, -1] },
  },
  kneel: {
    far: { hip: [-1.5, -8.5], knee: [-3.6, -2], foot: [-8.6, -1.2] },
    near: { hip: [1.5, -8.5], knee: [4.8, -6.4], foot: [3.8, -0.9] },
  },
};

function Leg({ g, dress, near }: { g: LegGeo; dress: Dress; near: boolean }) {
  const cloth = near ? dress.trousers : darken(dress.trousers, 0.2);
  const shin = at(g.knee, g.foot, 0.42);
  const [fx, fy] = g.foot;
  return (
    <g>
      <Line2 d={`M${pt(g.hip)} L${pt(g.knee)} L${pt(g.foot)}`} w={2.6} c={cloth} />
      {dress.gaiters ? <Line2 d={`M${pt(shin)} L${pt(at(g.knee, g.foot, 0.92))}`} w={2.4} c={near ? dress.gaiters : darken(dress.gaiters, 0.2)} ow={0.6} /> : null}
      <Shape d={`M${fx - 1.7} ${fy - 1.3} L${fx + 0.6} ${fy - 1.3} Q${fx + 3.2} ${fy - 0.8} ${fx + 3.2} ${fy + 1} L${fx - 1.8} ${fy + 1} Z`} f={SHOE} sw={0.6} />
    </g>
  );
}

// ---------------------------------------------------------------------------------------------
// Body

function Shoulders({ dress }: { dress: Dress }) {
  const s = dress.shoulders;
  if (!s) return null;
  const piece = (x: number, key: string) => {
    if (s.kind === 'straps') {
      // a flat strap on the shoulder, piped in the facing colour
      const d = `M${x - 1.5} -21.9 L${x + 1.5} -21.6 L${x + 1.4} -20.5 L${x - 1.6} -20.8 Z`;
      return <g key={key}><Shape d={d} f={s.colour} sw={0.5} /><path d={d} fill="none" stroke={dress.facings} strokeWidth={0.45} strokeLinejoin="round" /></g>;
    }
    if (s.kind === 'wings') {
      return <path key={key} d={`M${x - 2.4} -20.6 Q${x - 2.2} -23 ${x} -22.8 Q${x + 2.4} -23 ${x + 2.4} -20.6 Z`} fill={s.colour} stroke={OL} strokeWidth={0.6} strokeLinejoin="round" />;
    }
    return (
      <g key={key}>
        <ellipse cx={x} cy={-21.2} rx={2} ry={1.15} fill={s.colour} stroke={OL} strokeWidth={0.6} />
        <path d={`M${x - 1.8} -20.4 L${x - 1.9} -19.3 M${x - 0.6} -20.1 L${x - 0.6} -18.9 M${x + 0.6} -20.1 L${x + 0.7} -18.9 M${x + 1.8} -20.4 L${x + 2} -19.3`} stroke={darken(s.colour, 0.2)} strokeWidth={0.5} strokeLinecap="round" />
      </g>
    );
  };
  return <>{piece(-2.9, 'far')}{piece(2.6, 'near')}</>;
}

/** The torso: neck, coat (by cut), facings, lapels, shoulders, belts. Drawn in the upright frame; the caller leans it. */
function Torso({ dress, f }: { dress: Dress; f: Fig }) {
  const { coat, cut } = dress;
  const long = cut === 'greatcoat';
  const body =
    long
      ? `M-3.5 -20.6 Q0 -22.2 3.5 -20.6 L3.8 -13 L4.7 -${SKIRT} Q0 -3.3 -4.9 -${SKIRT + 0.2} L-3.9 -13 Z`
      : cut === 'tails'
        ? 'M-3.4 -20.6 Q0 -22.2 3.4 -20.6 L3 -13 L3.4 -9.4 L0.4 -10.6 L-1.4 -9 L-4.5 -9.5 L-3.1 -13 Z'
        : 'M-3.4 -20.6 Q0 -22.2 3.4 -20.6 L3.1 -13 L3.2 -11.6 Q0 -11 -3.4 -11.7 L-3.1 -13 Z';
  const lapel = dress.lapels && !long;
  const edge = dress.lace ?? darken(dress.lapels ?? coat, 0.3);
  return (
    <g>
      <path d="M-0.9 -23.6 L1.6 -23.6 L1.6 -21.6 L-0.9 -21.6 Z" fill={f.skinShade} />
      <Shape d={body} f={coat} />
      <Paint d={long ? 'M-3.5 -20.6 L-3.9 -13 L-4.9 -4.8 L-2.2 -4.4 L-1.6 -13 L-1.6 -20.8 Z' : 'M-3.4 -20.6 L-3.1 -13 L-1.4 -13 L-1.3 -20.9 Z'} f={darken(coat, 0.38)} o={0.5} mx={0} />
      <Hi d={long ? 'M3.3 -20 L3.6 -13 L4.4 -5.6' : 'M3.1 -20 L2.8 -14'} c={lighten(coat, 0.28)} w={0.5} o={0.7} mx={0} />
      {long ? (
        <>
          <path d={`M0.8 -20.8 L1.3 -${SKIRT - 0.3}`} stroke={darken(coat, 0.45)} strokeWidth={0.5} />
          <path d={dots([[-0.1, -19], [-0.1, -16.4], [-0.1, -13.8], [2.2, -19], [2.2, -16.4], [2.2, -13.8]], 0.35)} fill={darken(coat, 0.5)} />
        </>
      ) : (
        <path d={`M-1.4 ${-9.2} L-1.4 -12 M2.4 ${-9.6} L2.3 -12`} stroke={dress.lace ? dress.lace : darken(coat, 0.4)} strokeWidth={0.4} opacity={0.8} />
      )}
      {lapel ? <Shape d="M0.1 -21.2 L3.2 -20.6 L2.9 -13.4 L-0.1 -13.6 Z" f={dress.lapels!} sw={0.5} /> : null}
      {lapel ? <path d="M0.1 -21.2 L-0.1 -13.6 M3.2 -20.6 L2.9 -13.4" fill="none" stroke={edge} strokeWidth={0.45} opacity={0.9} /> : null}
      {dress.lace && !lapel && !long ? <path d="M-2.4 -19 L2.4 -19 M-2.4 -17 L2.4 -17 M-2.6 -15 L2.6 -15" stroke={dress.lace} strokeWidth={0.45} /> : null}
      {/* collar */}
      <Shape d="M-1.7 -22.2 L2 -22.2 L2.3 -20.5 L-1.9 -20.5 Z" f={dress.facings} sw={0.6} />
      {dress.lace ? <path d="M-1.6 -21.9 L1.9 -21.9" stroke={dress.lace} strokeWidth={0.4} /> : null}
      {/* the two cross belts and the plate where they meet */}
      <Line2 d="M-2.2 -20.6 L3 -12.8" w={1.1} c={darken(dress.belts, 0.12)} ow={0.4} />
      <Line2 d="M2.3 -20.6 L-2.9 -12.8" w={1.1} c={dress.belts} ow={0.4} />
      <circle cx={-0.2} cy={-16.7} r={0.95} fill={METAL.brass} stroke={OL} strokeWidth={0.4} />
      {!long ? <Line2 d="M-3.3 -13.2 L3.3 -13.2" w={0.9} c={dress.belts} ow={0.35} /> : null}
      <Shoulders dress={dress} />
    </g>
  );
}

/** Legs, coat with its cut, facings, lapels, shoulders and belts. */
export function FootBody({ dress, f, stance }: { dress: Dress; f: Fig; stance: Stance }) {
  const g = LEGS[stance];
  return (
    <g>
      <Leg g={g.far} dress={dress} near={false} />
      <Leg g={g.near} dress={dress} near />
      <g transform={torsoTransform(stance)}><Torso dress={dress} f={f} /></g>
    </g>
  );
}

// ---------------------------------------------------------------------------------------------
// Arms, musket, head

/** An arm: sleeve in the coat colour (darker for the far arm), a cuff in the facing colour, and the hand. */
export function Sleeve({ from, elbow, hand, dress, f, near }: { from: P; elbow: P; hand: P; dress: Dress; f: Fig; near: boolean }) {
  const col = near ? dress.coat : darken(dress.coat, 0.22);
  const len = Math.hypot(hand[0] - elbow[0], hand[1] - elbow[1]) || 1;
  const u: P = [(hand[0] - elbow[0]) / len, (hand[1] - elbow[1]) / len];
  const c0: P = [hand[0] - u[0] * 2, hand[1] - u[1] * 2];
  const c1: P = [hand[0] - u[0] * 0.6, hand[1] - u[1] * 0.6];
  return (
    <g>
      <Line2 d={`M${pt(from)} L${pt(elbow)} L${pt(hand)}`} w={2.3} c={col} />
      <Hi d={`M${pt(from)} L${pt(elbow)}`} c={lighten(col, 0.22)} w={0.5} o={0.55} mx={from[0]} />
      <Line2 d={`M${pt(c0)} L${pt(c1)}`} w={2.5} c={near ? dress.facings : darken(dress.facings, 0.2)} ow={0.5} />
      <circle cx={hand[0]} cy={hand[1]} r={1.15} fill={near ? f.skin : f.skinShade} stroke={OL} strokeWidth={0.5} />
    </g>
  );
}

/** A musket from butt (`from`) to muzzle (`to`), with its bayonet continuing the line. A rifle is slimmer, with a short sword bayonet. */
export function Musket({ from, to, rifle = false, bayonet = true }: { from: P; to: P; rifle?: boolean; bayonet?: boolean }) {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
  const u: P = [(to[0] - from[0]) / len, (to[1] - from[1]) / len];
  const stockEnd = at(from, to, 0.4);
  const band = at(from, to, 0.62);
  const tip: P = [to[0] + u[0] * (rifle ? 3.8 : 5.2), to[1] + u[1] * (rifle ? 3.8 : 5.2)];
  const nx = -u[1] * 0.5; // a short cross-stroke for the lock-plate / band
  const ny = u[0] * 0.5;
  return (
    <g data-gun={rifle ? 'rifle' : 'musket'}>
      {bayonet ? <Line2 d={`M${pt(to)} L${pt(tip)}`} w={rifle ? 0.75 : 0.6} c={METAL.steel} ow={0.35} /> : null}
      <Line2 d={`M${pt(stockEnd)} L${pt(to)}`} w={rifle ? 0.8 : 0.95} c={METAL.steel} ow={0.45} />
      <Line2 d={`M${pt(from)} L${pt(stockEnd)}`} w={rifle ? 1.3 : 1.55} c={METAL.wood} ow={0.5} />
      <path d={`M${band[0] - nx} ${band[1] - ny} L${band[0] + nx} ${band[1] + ny}`} stroke={METAL.brass} strokeWidth={0.7} strokeLinecap="round" />
    </g>
  );
}

/** The face, and the headgear placed in the head-local frame (origin at the head's centre, radius 2.4), scaled by `s`. */
export function HeadOn({ head, f, x, y, s = 1.1 }: { head: Headwear; f: Fig; x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={-1.5} cy={0.9} rx={1.35} ry={1.6} fill={f.hair} stroke={OL} strokeWidth={0.5} />
      <circle cx={0} cy={0} r={2.4} fill={f.skin} stroke={OL} strokeWidth={OW} />
      <Paint d="M-0.3 -2.38 A2.4 2.4 0 0 0 -0.3 2.38 A1.7 2.4 0 0 1 -0.3 -2.38 Z" f={f.skinShade} o={0.55} mx={0} />
      <circle cx={1.15} cy={-0.1} r={0.32} fill={OL} />
      <circle cx={2.45} cy={0.35} r={0.6} fill={f.skin} />
      <path d="M1.2 1.4 L2 1.4" stroke={f.skinShade} strokeWidth={0.35} strokeLinecap="round" />
      <Headgear head={head} f={f} />
    </g>
  );
}

// ---------------------------------------------------------------------------------------------
// Poses (coordinates in the upright torso frame; the lean transform is applied around all of them)

interface PoseGeo {
  stance: Stance;
  gun: readonly [P, P];
  near: { elbow: P; hand: P };
  far: { elbow: P; hand: P };
  /** The far arm is drawn over the musket (it grips it) rather than behind the body. */
  farOver: boolean;
  head: P;
}

const NEAR_SHOULDER: P = [2.4, -19.9];
const FAR_SHOULDER: P = [-2.4, -19.9];

function geo(pose: FootPose): PoseGeo {
  switch (pose) {
    case 'shoulder': {
      const gun: [P, P] = [[3.9, -12], [4.7, -34.5]];
      return { stance: 'stand', gun, near: { elbow: [4.7, -16.2], hand: [3.9, -12.8] }, far: { elbow: [-5.2, -16.8], hand: [-3.9, -13.2] }, farOver: false, head: [0, 0] };
    }
    case 'port': {
      const gun: [P, P] = [[-3.2, -10.2], [10, -31.8]];
      return { stance: 'stand', gun, near: { elbow: [5.4, -17.6], hand: at(gun[0], gun[1], 0.68) }, far: { elbow: [-3.8, -15.6], hand: at(gun[0], gun[1], 0.3) }, farOver: true, head: [0.2, 0] };
    }
    case 'aim': {
      const gun: [P, P] = [[0.6, -21.4], [9.8, -22.6]];
      return { stance: 'stride', gun, near: { elbow: [-1.4, -18], hand: at(gun[0], gun[1], 0.12) }, far: { elbow: [1.2, -16.6], hand: at(gun[0], gun[1], 0.4) }, farOver: true, head: [1, 0.2] };
    }
    case 'kneelAim': {
      const gun: [P, P] = [[0.6, -21.4], [9.6, -23.8]];
      return { stance: 'kneel', gun, near: { elbow: [-1.4, -18], hand: at(gun[0], gun[1], 0.12) }, far: { elbow: [1.2, -16.4], hand: at(gun[0], gun[1], 0.4) }, farOver: true, head: [1, 0.2] };
    }
    case 'charge': {
      const gun: [P, P] = [[-4.4, -13.6], [8.6, -17.2]];
      return { stance: 'stride', gun, near: { elbow: [4.6, -17.6], hand: at(gun[0], gun[1], 0.55) }, far: { elbow: [-4.4, -17], hand: at(gun[0], gun[1], 0.18) }, farOver: true, head: [0.8, 0] };
    }
  }
}

/** The calfskin pack with its rolled greatcoat on top, behind the shoulders. */
function Pack() {
  return (
    <g>
      <Shape d="M-7.2 -21.4 Q-7.7 -17.4 -6.8 -13.4 L-2.9 -13.6 L-2.7 -21 Z" f={HIDE} sw={0.7} />
      <Paint d="M-7.2 -21.4 Q-7.7 -17.4 -6.8 -13.4 L-5.6 -13.5 L-5.6 -21.2 Z" f={darken(HIDE, 0.4)} o={0.5} mx={-5} />
      <path d="M-6.3 -19.8 L-3.3 -19.8 M-6.3 -16.6 L-3.3 -16.6" stroke={darken(HIDE, 0.45)} strokeWidth={0.45} />
      <Line2 d="M-7.5 -22.6 L-2.7 -22.9" w={2.7} c={PACK_ROLL} ow={0.6} />
      <path d="M-6.4 -24.1 L-6.4 -21.4 M-3.9 -24.2 L-3.9 -21.6" stroke={darken(CLOTH.greatcoatGrey, 0.4)} strokeWidth={0.45} />
    </g>
  );
}

export function FootFigure({ spec, n, i }: { spec: FootSpec; n: NationLook; i: number }) {
  const f = makeFig(n, i);
  const pose = spec.poses[i % 4];
  const g = geo(pose);
  const rifle = spec.weapon === 'rifle';
  const dress = spec.dress;
  const lean = torsoTransform(g.stance);
  // a rifle is shorter in the barrel than a musket
  const gun = <Musket from={g.gun[0]} to={rifle ? at(g.gun[0], g.gun[1], 0.9) : g.gun[1]} rifle={rifle} bayonet />;
  const far = <Sleeve from={FAR_SHOULDER} elbow={g.far.elbow} hand={g.far.hand} dress={dress} f={f} near={false} />;
  return (
    <g data-fig="foot" data-pose={pose}>
      <g transform={lean}>{spec.pack ? <Pack /> : null}</g>
      {g.farOver ? null : <g transform={lean}>{far}</g>}
      <FootBody dress={dress} f={f} stance={g.stance} />
      <g transform={lean}>
        {gun}
        {g.farOver ? far : null}
        <Sleeve from={NEAR_SHOULDER} elbow={g.near.elbow} hand={g.near.hand} dress={dress} f={f} near />
        <HeadOn head={spec.head} f={f} x={0.6 + g.head[0]} y={-26 + g.head[1]} />
      </g>
    </g>
  );
}
