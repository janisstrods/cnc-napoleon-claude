// Foot headgear, in the head-local frame (origin at the head's centre, head radius 2.4, facing right; the front is +x).
// Each root carries data-head={kind}.
import { darken, lighten } from '../../color';
import { OL, Hi, Paint, Shape, dots } from '../draw';
import { METAL } from '../nations';
import type { FootHeadgear, Headwear } from '../uniform';
import type { HeadgearRenderer } from './index';

const FELT = '#1f1d1d';
const FUR = '#26211f';
const metalOf = (plate: Headwear['plate']) => (plate === 'white' ? '#d8d4c4' : METAL.brass);

/** The pompom of this figure (company colours cycle by figure index), or a plain one. */
function pompomOf(head: Headwear, i: number): string | undefined {
  return head.pompoms && head.pompoms.length > 0 ? head.pompoms[i % head.pompoms.length] : undefined;
}

/** A plume standing up from (x, y): a soft teardrop, with a coloured tip if there is one. */
function Plume({ x, y, h, colour, tip }: { x: number; y: number; h: number; colour: string; tip?: string }) {
  const w = 1.15;
  return (
    <g>
      <path d={`M${x - 0.5} ${y} C${x - w - 0.6} ${y - h * 0.4} ${x - w} ${y - h * 0.9} ${x + 0.1} ${y - h} C${x + w + 0.6} ${y - h * 0.8} ${x + w + 0.5} ${y - h * 0.3} ${x + 0.5} ${y} Z`}
        fill={colour} stroke={OL} strokeWidth={0.5} strokeLinejoin="round" />
      {tip ? <path d={`M${x - w * 0.8} ${y - h * 0.76} C${x - w * 0.5} ${y - h * 1.0} ${x + 0.2} ${y - h * 1.04} ${x + w * 0.9} ${y - h * 0.74} C${x + 0.4} ${y - h * 0.7} ${x - 0.4} ${y - h * 0.72} ${x - w * 0.8} ${y - h * 0.76} Z`} fill={tip} /> : null}
      <Hi d={`M${x + 0.5} ${y - h * 0.15} C${x + 0.8} ${y - h * 0.45} ${x + 0.6} ${y - h * 0.7} ${x + 0.1} ${y - h * 0.9}`} c={lighten(colour, 0.35)} w={0.35} o={0.8} mx={x} />
    </g>
  );
}

/** Cords: a festoon across the front and two hanging ends (raquettes). */
function Cords({ colour, y0, y1, x0 = -2.7, x1 = 2.9 }: { colour: string; y0: number; y1: number; x0?: number; x1?: number }) {
  return (
    <g fill="none" stroke={colour} strokeLinecap="round">
      <path d={`M${x0} ${y0} Q${(x0 + x1) / 2} ${y1 + 1.4} ${x1} ${y0 + 0.1}`} strokeWidth={0.55} />
      <path d={`M${x1 - 0.3} ${y0 + 0.1} L${x1 - 0.6} ${y1 + 1.8} M${x1 - 1.1} ${y0 + 0.3} L${x1 - 1.4} ${y1 + 2.3}`} strokeWidth={0.5} />
    </g>
  );
}

const Shako: HeadgearRenderer = ({ head, f }) => {
  const c = head.body ?? FELT;
  const pom = pompomOf(head, f.i);
  const brass = metalOf(head.plate);
  return (
    <g data-head="shako">
      {head.plume ? <Plume x={0.6} y={-6.1} h={head.plume.tall ? 7.2 : 4.6} colour={head.plume.colour} tip={head.plume.tip} /> : null}
      {/* the bell-topped body: narrow at the brow, flaring to the crown */}
      <Shape d="M-2.7 -0.5 L-3.1 -5.9 Q0 -7 3.3 -5.9 L2.8 -0.5 Z" f={c} />
      <Paint d="M-2.7 -0.5 L-3.1 -5.9 L-1.6 -6.2 L-1.3 -0.5 Z" f={darken(c, 0.4)} o={0.5} mx={0} />
      <path d="M-3.1 -5.9 Q0 -6.9 3.3 -5.9" fill="none" stroke={lighten(c, 0.3)} strokeWidth={0.5} />
      {/* peak */}
      <Shape d="M2.5 -0.9 L4.9 -0.4 L4.6 0.4 L2.6 0.1 Z" f={darken(c, 0.15)} />
      {head.cords ? <Cords colour={head.cords} y0={-5.2} y1={-3.2} /> : null}
      {head.plate === 'skull' ? (
        // the death's-head of the Brunswick corps: a small white skull over crossed bones, on the front of the shako
        <g data-plate="skull">
          <path d="M0.3 -2.4 L2.6 -1.6 M2.6 -2.4 L0.3 -1.6" stroke="#e8e4d4" strokeWidth={0.45} strokeLinecap="round" />
          <path d="M0.6 -3.4 Q0.6 -4.9 1.45 -4.9 Q2.3 -4.9 2.3 -3.4 L2.1 -2.9 L0.8 -2.9 Z" fill="#e8e4d4" stroke={OL} strokeWidth={0.3} />
          <path d="M0.95 -3.9 L1.15 -3.9 M1.75 -3.9 L1.95 -3.9" stroke={OL} strokeWidth={0.4} strokeLinecap="round" />
        </g>
      ) : head.plate !== 'none' ? (
        <g>
          <Shape d="M0.2 -4.7 L2.6 -4.7 L2.5 -1.7 Q1.4 -1.1 0.3 -1.7 Z" f={brass} sw={0.5} />
          <Hi d="M0.8 -4.2 L0.8 -2.4" c={lighten(brass, 0.5)} w={0.4} mx={1.4} />
        </g>
      ) : null}
      {pom && !head.plume ? <><circle cx={0.7} cy={-7.1} r={1.5} fill={pom} stroke={OL} strokeWidth={0.5} /><circle cx={0.2} cy={-7.6} r={0.5} fill={lighten(pom, 0.5)} opacity={0.8} /></> : null}
    </g>
  );
};

// A bearskin: a tall, slightly forward-leaning fur cap. Its plume stands at the left (the back, in a right-facing view).
function bearskinOf(kind: 'bearskin' | 'bearskinPlate'): HeadgearRenderer {
  return function Bearskin({ head }) {
    const fur = head.body ?? FUR;
    const plate = kind === 'bearskinPlate' ? metalOf(head.plate) : undefined;
    return (
      <g data-head={kind}>
        {head.plume ? <Plume x={-1.4} y={-10.6} h={head.plume.tall ? 4.8 : 3.4} colour={head.plume.colour} tip={head.plume.tip} /> : null}
        <Shape d="M-3.2 -0.8 L-3 -8.4 Q0.4 -11.8 4.3 -8.8 L3.3 -1.3 Z" f={fur} />
        <Paint d="M-3.2 -0.8 L-3 -8.4 Q-1.6 -10 -0.8 -10.3 L-0.9 -1 Z" f={darken(fur, 0.5)} o={0.6} mx={0} />
        {/* fur: short strokes on the lit side */}
        <Hi d="M1.4 -9.4 L1.7 -7.8 M2.8 -8.4 L3 -6.8 M0.2 -10.2 L0.6 -8.6 M1.2 -6.4 L1.5 -4.8 M2.4 -5.6 L2.6 -4 M0.6 -3.8 L0.8 -2.4" c={lighten(fur, 0.35)} w={0.45} o={0.85} mx={1} />
        {/* the back of the cap: the red bag, a hint of it below the crown */}
        <path d="M-3.1 -8 L-4 -4.4 L-3 -4 Z" fill={head.plume?.colour ?? '#8a2a2a'} opacity={0.9} />
        {head.cords ? <Cords colour={head.cords} y0={-3.8} y1={-2.2} x0={-3} x1={3.3} /> : null}
        {plate ? (
          <g>
            <Shape d="M0.5 -6 Q2.2 -6.7 3.6 -5.6 L3.1 -1.9 Q1.9 -1.3 0.7 -1.9 Z" f={plate} sw={0.5} />
            <path d="M2.1 -3.7 L1.2 -3.1 L1.5 -4.2 L2.4 -4.4 Z" fill={METAL.brassShade} />
            <Hi d="M1.2 -5 L1.1 -2" c={lighten(plate, 0.5)} w={0.4} mx={1.8} />
          </g>
        ) : null}
      </g>
    );
  };
}

// The oilcloth-covered shako of the campaign dress: a plain black cylinder, no plate, no plume.
const CoveredShako: HeadgearRenderer = ({ head, f }) => {
  const c = head.body ?? '#16181a';
  const pom = pompomOf(head, f.i);
  return (
    <g data-head="coveredShako">
      <Shape d="M-2.7 -0.5 L-2.9 -5.4 Q0 -6 2.9 -5.4 L2.8 -0.5 Z" f={c} />
      <Paint d="M-2.7 -0.5 L-2.9 -5.4 L-1.5 -5.7 L-1.3 -0.5 Z" f="#000" o={0.35} mx={0} />
      <path d="M-2.9 -5.4 Q0 -6 2.9 -5.4" fill="none" stroke={lighten(c, 0.45)} strokeWidth={0.5} opacity={0.7} />
      <path d={dots([[-0.8, -2.6], [1, -3.8]], 0.25)} fill={lighten(c, 0.5)} opacity={0.35} />
      <Shape d="M2.5 -0.9 L4.6 -0.4 L4.4 0.3 L2.6 0.1 Z" f={darken(c, 0.1)} />
      {pom ? <circle cx={0.3} cy={-6.4} r={1.4} fill={pom} stroke={OL} strokeWidth={0.5} /> : null}
    </g>
  );
};

// The 1800 "stovepipe" shako (the Belgic pattern is not drawn): a straight-sided felt cylinder with a peak, a front plate,
// and a short tuft at the top front; a tall plume if the spec asks for one. The badge is data-driven, as Headwear has no badge
// field: plate 'brass' is a plain oval plate, but with a tall plume (the grenadiers) it carries a grenade; plate 'white' is the
// light company's bugle-horn; 'none' has no badge (the rifles).
const Stovepipe: HeadgearRenderer = ({ head }) => {
  const c = head.body ?? FELT;
  const brass = metalOf(head.plate);
  const tuft = head.plume;
  return (
    <g data-head="stovepipe">
      {tuft ? <Plume x={1.1} y={-7.4} h={tuft.tall ? 7.6 : 3.4} colour={tuft.colour} tip={tuft.tip} /> : null}
      <Shape d="M-2.6 -0.5 L-2.7 -7.6 Q0.3 -8.2 3.1 -7.6 L2.9 -0.5 Z" f={c} />
      <Paint d="M-2.6 -0.5 L-2.7 -7.6 L-1.3 -7.9 L-1.2 -0.5 Z" f={darken(c, 0.4)} o={0.5} mx={0} />
      <path d="M-2.7 -7.6 Q0.3 -8.2 3.1 -7.6" fill="none" stroke={lighten(c, 0.3)} strokeWidth={0.5} />
      <path d="M-2.65 -1.5 L2.95 -1.5" stroke={lighten(c, 0.2)} strokeWidth={0.4} opacity={0.7} />
      {/* peak */}
      <Shape d="M2.4 -0.9 L4.6 -0.5 L4.4 0.3 L2.5 0.1 Z" f={darken(c, 0.15)} />
      {head.plate === 'white' ? (
        <g>
          {/* a bugle-horn: a loop with a flared mouth */}
          <path d="M0.3 -4.2 Q0.1 -6.4 1.6 -6.4 Q3 -6.4 2.6 -4.4 L2.9 -3.6 L1.4 -3.9 Q1.1 -3.5 0.3 -4.2 Z" fill={brass} stroke={OL} strokeWidth={0.45} strokeLinejoin="round" />
        </g>
      ) : head.plate !== 'none' ? (
        <g>
          <Shape d="M0.2 -6.2 L2.7 -6.2 L2.7 -2.3 Q1.5 -1.7 0.2 -2.3 Z" f={brass} sw={0.5} />
          {head.plume?.tall ? <path d="M1.45 -5.6 a0.7 0.7 0 1 0 0.01 0 M1.45 -4.9 L1.45 -3.1 M0.7 -4 L2.2 -4" fill="none" stroke={darken(brass, 0.5)} strokeWidth={0.4} /> : <Hi d="M0.8 -5.6 L0.8 -2.8" c={lighten(brass, 0.5)} w={0.4} mx={1.4} />}
        </g>
      ) : null}
    </g>
  );
};

// The Portuguese barretina: a felt cap with a tall false front that rises well above the crown, a plate low on the front, and a
// plume at the top.
const Barretina: HeadgearRenderer = ({ head }) => {
  const c = head.body ?? FELT;
  const brass = metalOf(head.plate);
  const panel = lighten(c, 0.2); // a lighter tone than the cap, so the false front reads against it and the sky
  return (
    <g data-head="barretina">
      {/* the plume stands at the side of the front, behind the false front's rim */}
      {head.plume ? <Plume x={-0.9} y={-6.6} h={head.plume.tall ? 6 : 4.2} colour={head.plume.colour} tip={head.plume.tip} /> : null}
      {/* the cylinder, then the false front rising from its front edge to a rounded peak */}
      <Shape d="M-2.7 -0.5 L-2.8 -5.4 Q0 -6.2 2.9 -5.4 L2.8 -0.5 Z" f={c} />
      <Shape d="M-0.9 -5.6 L-0.8 -9.3 Q1.3 -10.2 3.3 -9 L3.1 -1.1 L-0.6 -1.1 Z" f={panel} />
      <Paint d="M-2.7 -0.5 L-2.8 -5.4 L-1.5 -5.7 L-1.3 -0.5 Z" f={darken(c, 0.4)} o={0.5} mx={0} />
      {/* a light metal edge along the top and the front of the false front */}
      <path d="M-0.8 -9.3 Q1.3 -10.2 3.3 -9 L3.1 -1.4" fill="none" stroke={brass} strokeWidth={0.7} strokeLinecap="round" strokeLinejoin="round" />
      <Shape d="M2.4 -0.9 L4.6 -0.5 L4.4 0.3 L2.5 0.1 Z" f={darken(c, 0.15)} />
      {head.cords ? <Cords colour={head.cords} y0={-5.4} y1={-3.4} /> : null}
      {head.plate !== 'none' ? (
        <g>
          <Shape d="M0.2 -8.3 L2.8 -8.3 L2.7 -4.2 Q1.5 -3.6 0.3 -4.2 Z" f={brass} sw={0.5} />
          <Hi d="M0.8 -7.7 L0.8 -5" c={lighten(brass, 0.5)} w={0.4} mx={1.4} />
        </g>
      ) : null}
    </g>
  );
};

// The militia round hat: a low crown, a brim turned up on the right (the side the cockade sits), and a cockade. The cockade
// takes its colour from the first pompom entry (a plain red one if there is none).
const RoundHat: HeadgearRenderer = ({ head }) => {
  const c = head.body ?? '#2a2622';
  const cockade = head.pompoms && head.pompoms.length > 0 ? head.pompoms[0] : '#b3242a';
  return (
    <g data-head="roundHat">
      {/* the brim, wider than the head and turned up at the front */}
      <Shape d="M-3.7 -1.3 Q0 -2.1 3.4 -1.9 L4.2 -3 L4.6 -1.2 Q0.3 0.2 -3.8 -0.2 Z" f={darken(c, 0.1)} />
      <Shape d="M-2.5 -1.7 L-2.4 -4.4 Q0.2 -5 2.6 -4.4 L2.8 -1.8 Q0 -1.2 -2.5 -1.7 Z" f={c} />
      <Paint d="M-2.5 -1.7 L-2.4 -4.4 L-1.2 -4.6 L-1.1 -1.5 Z" f={darken(c, 0.4)} o={0.5} mx={0} />
      <path d="M-2.4 -2.4 Q0 -1.8 2.7 -2.4" fill="none" stroke={lighten(c, 0.35)} strokeWidth={0.4} opacity={0.8} />
      <circle cx={3.1} cy={-2.5} r={0.95} fill={cockade} stroke={OL} strokeWidth={0.45} />
      <circle cx={3.1} cy={-2.5} r={0.4} fill={lighten(cockade, 0.5)} />
    </g>
  );
};

export const FOOT_HEADGEAR: Record<FootHeadgear, HeadgearRenderer> = {
  shako: Shako,
  bearskin: bearskinOf('bearskin'),
  bearskinPlate: bearskinOf('bearskinPlate'),
  coveredShako: CoveredShako,
  stovepipe: Stovepipe,
  barretina: Barretina,
  roundHat: RoundHat,
};
