// Cavalry headgear, in the head-local frame (origin at the head's centre, head radius 2.4, facing right; the front is +x).
// Each root carries data-head={kind}. The foot kinds a horseman also wears (the bearskin, the shako) come from foot.tsx.
// Colours come from the spec (`body`, `mane`, `turban`, `plume`, `cords`); the defaults are the commonest period colours.
import { darken, lighten } from '../../color';
import { Hi, OL, Paint, Shape } from '../draw';
import { METAL } from '../nations';
import type { HorseHeadgear } from '../uniform';
import type { HeadgearRenderer } from './index';

const LEATHER = '#1d1b1a';
const HAIR = '#171412';
const FUR_BROWN = '#54382a';

/** A tuft of hair or feather standing from (x, y), leaning back a little: teardrop with an optional coloured tip (the top). */
function Tuft({ x, y, h, colour, tip }: { x: number; y: number; h: number; colour: string; tip?: string }) {
  const w = 1.1;
  return (
    <g>
      <path d={`M${x - 0.6} ${y} C${x - w - 0.8} ${y - h * 0.4} ${x - w - 0.2} ${y - h * 0.9} ${x - 0.5} ${y - h} C${x + w} ${y - h * 0.8} ${x + w + 0.4} ${y - h * 0.3} ${x + 0.6} ${y} Z`}
        fill={colour} stroke={OL} strokeWidth={0.5} strokeLinejoin="round" />
      {tip ? <path d={`M${x - w - 0.1} ${y - h * 0.74} C${x - w} ${y - h * 0.96} ${x - 0.4} ${y - h * 1.02} ${x - 0.5} ${y - h} C${x + w * 0.7} ${y - h * 0.9} ${x + w + 0.2} ${y - h * 0.7} ${x + w} ${y - h * 0.62} C${x + 0.2} ${y - h * 0.7} ${x - 0.6} ${y - h * 0.72} ${x - w - 0.1} ${y - h * 0.74} Z`} fill={tip} /> : null}
      <Hi d={`M${x + 0.5} ${y - h * 0.15} C${x + 0.8} ${y - h * 0.45} ${x + 0.5} ${y - h * 0.7} ${x - 0.1} ${y - h * 0.9}`} c={lighten(colour, 0.35)} w={0.35} o={0.8} mx={x} />
    </g>
  );
}

/** A horsehair mane streaming from the comb down behind the head: `len` is how far it falls. */
function Mane({ colour, x, y, len }: { colour: string; x: number; y: number; len: number }) {
  return (
    <g>
      <Shape d={`M${x} ${y} Q${x - 3.6} ${y - 0.6} ${x - 4.2} ${y + len * 0.4} Q${x - 4.6} ${y + len * 0.8} ${x - 3.4} ${y + len} Q${x - 2.6} ${y + len * 0.5} ${x - 1.8} ${y + len * 0.2} Q${x - 1} ${y + 0.4} ${x + 0.4} ${y + 0.2} Z`} f={colour} sw={0.55} />
      <Hi d={`M${x - 1.2} ${y + 0.6} Q${x - 2.6} ${y + len * 0.5} ${x - 2.4} ${y + len * 0.85}`} c={lighten(colour, 0.4)} w={0.35} o={0.6} mx={x - 2} />
    </g>
  );
}

// A low black leather helmet with a fur crest along the top and a turban band: the light dragoon's Tarleton.
const Tarleton: HeadgearRenderer = ({ head }) => {
  const c = head.body ?? LEATHER;
  const fur = head.mane ?? HAIR;
  const band = head.turban;
  return (
    <g data-head="tarleton">
      <Shape d="M-2.9 -0.6 Q-3.2 -3.6 -0.6 -4.4 Q2.2 -4.6 3 -2.4 L3.2 -0.8 Z" f={c} />
      {band ? <Shape d="M-2.95 -1.2 L3.15 -1.3 L3.2 -2.6 Q0 -3.2 -3 -2.8 Z" f={band} sw={0.55} /> : null}
      <Shape d="M2.6 -0.7 L4.8 -0.2 L4.6 0.5 L2.7 0.2 Z" f={darken(c, 0.1)} sw={0.55} />
      {/* the fur crest: a ragged ridge front to back */}
      <Shape d="M-3.2 -3.4 Q-3.8 -6 -1.6 -6.3 Q-0.6 -7.6 1 -6.6 Q2.6 -6.4 3.1 -4 Q0.2 -5.2 -3.2 -3.4 Z" f={fur} sw={0.55} />
      <Hi d="M-1.8 -6 L-1.5 -4.8 M0 -6.6 L0.2 -5.2 M1.6 -6 L1.8 -4.8" c={lighten(fur, 0.45)} w={0.4} o={0.75} mx={0} />
      {head.plume ? <Tuft x={-1.4} y={-6.4} h={3} colour={head.plume.colour} tip={head.plume.tip} /> : null}
    </g>
  );
};

/** The skull common to the metal helmets: a dome (the colour `c`) with a turban band at its base and a peak. */
function Skull({ c, band, tall = 5.2 }: { c: string; band?: string; tall?: number }) {
  return (
    <g>
      <Shape d={`M-2.9 -0.8 Q-3.1 ${-tall + 0.6} 0 ${-tall} Q3.1 ${-tall + 0.4} 3.2 -0.9 Z`} f={c} />
      <Paint d={`M-2.9 -0.8 Q-3.1 ${-tall + 0.6} 0 ${-tall} L-0.6 ${-tall + 0.2} L-1.2 -0.8 Z`} f={darken(c, 0.4)} o={0.5} mx={0} />
      <Hi d={`M1.4 ${-tall + 1} Q2.4 ${-tall + 2} 2.6 -2.4`} c={lighten(c, 0.5)} w={0.5} o={0.9} mx={0} />
      {band ? (
        <g>
          <Shape d="M-3 -0.4 L3.3 -0.6 L3.3 -2.6 Q0 -3.4 -3 -2.8 Z" f={band} sw={0.55} />
          <path d="M-2.2 -1.1 L-2 -2.5 M-0.8 -1 L-0.6 -2.8 M0.7 -1 L0.8 -2.9 M2.2 -1.1 L2.3 -2.7" stroke={darken(band, 0.45)} strokeWidth={0.4} strokeLinecap="round" />
        </g>
      ) : null}
      <Shape d="M2.8 -1.2 L4.7 -0.7 L4.4 0.1 L2.9 -0.2 Z" f={LEATHER} sw={0.5} />
    </g>
  );
}

// The dragoon helmet: a brass skull with a brass comb, a brown fur turban and a long black horsehair mane down the back.
const DragoonHelmet: HeadgearRenderer = ({ head }) => {
  const c = head.body ?? METAL.brass;
  return (
    <g data-head="dragoonHelmet">
      <Mane colour={head.mane ?? HAIR} x={-2.2} y={-4.6} len={9.4} />
      <Skull c={c} band={head.turban ?? FUR_BROWN} />
      <Shape d="M2.9 -3.6 Q0.2 -7 -3.5 -4.2 L-3.2 -3.2 Q0 -5.4 2.6 -2.9 Z" f={c} sw={0.55} />
      <Hi d="M2 -4.6 Q0.4 -6.2 -1.6 -5.4" c={lighten(c, 0.5)} w={0.4} o={0.9} mx={0} />
    </g>
  );
};

// The cuirassier helmet: a steel skull and comb, a thin black turban, a scarlet plume and a longer black mane.
const CuirassierHelmet: HeadgearRenderer = ({ head }) => {
  const c = head.body ?? METAL.steel;
  const comb = METAL.brass;
  return (
    <g data-head="cuirassierHelmet">
      <Mane colour={head.mane ?? HAIR} x={-2} y={-5.2} len={11} />
      <Skull c={c} band={head.turban ?? '#201a18'} tall={5.6} />
      <Shape d="M2.9 -3.9 Q0.2 -7.4 -3.5 -4.6 L-3.2 -3.4 Q0 -5.8 2.6 -3.2 Z" f={comb} sw={0.55} />
      {head.plume ? <Tuft x={0} y={-6.4} h={4} colour={head.plume.colour} tip={head.plume.tip} /> : null}
    </g>
  );
};

// A heavy helmet with a tall hair crest from front to back over a gilt or brass skull, and a plume tuft at the front of the crest.
const CrestedHelmet: HeadgearRenderer = ({ head }) => {
  const c = head.body ?? METAL.brass;
  const hair = head.mane ?? HAIR;
  return (
    <g data-head="crestedHelmet">
      <Skull c={c} band={head.turban} tall={4.4} />
      <Shape d="M3.2 -3.4 Q3.8 -8.6 0.2 -9.2 Q-3.6 -9.4 -3.9 -3.2 Q-0.2 -5.6 3.2 -3.4 Z" f={hair} sw={0.55} />
      <Hi d="M2.4 -5 Q2.6 -7.4 0.6 -8.4 M-0.6 -5.2 Q-0.8 -7.4 -2 -8" c={lighten(hair, 0.5)} w={0.4} o={0.75} mx={0} />
      <path d="M-3.6 -3.4 Q-0.2 -5.4 3.2 -3.6" fill="none" stroke={METAL.brassShade} strokeWidth={0.5} />
      {head.plume ? <Tuft x={1.6} y={-8.6} h={3.4} colour={head.plume.colour} tip={head.plume.tip} /> : null}
    </g>
  );
};

// The lancer's czapka: a waisted black skull under a square top that leans forward. `body` is the colour of the top.
const Czapka: HeadgearRenderer = ({ head }) => {
  const top = head.body ?? '#24346e';
  const pipe = head.cords ?? METAL.gold;
  return (
    <g data-head="czapka">
      {head.plume ? <Tuft x={-0.4} y={-10.6} h={head.plume.tall ? 5.6 : 4.2} colour={head.plume.colour} tip={head.plume.tip} /> : null}
      <Shape d="M-2.8 -0.6 L-2.6 -3.4 Q-4 -5.4 -4.3 -8.2 L4.7 -7.4 Q3.7 -5.4 2.9 -3.4 L3.1 -0.6 Z" f={LEATHER} />
      <Paint d="M-2.8 -0.6 L-2.6 -3.4 Q-4 -5.4 -4.3 -8.2 L-2.6 -8.1 L-1.4 -0.6 Z" f="#000" o={0.35} mx={0} />
      {/* the square top, seen edge-on and tilted forward */}
      <Shape d="M-4.3 -8.2 L4.7 -7.4 L5.7 -10.4 L-3.2 -11.2 Z" f={top} sw={0.6} />
      <path d="M-4.3 -8.2 L4.7 -7.4 L5.7 -10.4 M-4.3 -8.2 L-3.2 -11.2" fill="none" stroke={pipe} strokeWidth={0.5} strokeLinejoin="round" />
      <Hi d="M-2 -10.7 L4.2 -10" c={lighten(top, 0.4)} w={0.4} o={0.7} mx={1} />
      <path d="M1.2 -5.8 m-1.2 0 a1.2 1.2 0 1 0 2.4 0 a1.2 1.2 0 1 0 -2.4 0Z" fill={METAL.brass} stroke={OL} strokeWidth={0.4} />
      <path d="M-3.9 -6.4 Q-1 -4.6 2.4 -4.8" fill="none" stroke={pipe} strokeWidth={0.4} opacity={0.9} />
      <Shape d="M2.8 -1 L4.6 -0.5 L4.4 0.2 L2.9 -0.1 Z" f={LEATHER} sw={0.5} />
    </g>
  );
};

export const HORSE_HEADGEAR: Record<HorseHeadgear, HeadgearRenderer> = {
  tarleton: Tarleton,
  dragoonHelmet: DragoonHelmet,
  cuirassierHelmet: CuirassierHelmet,
  crestedHelmet: CrestedHelmet,
  czapka: Czapka,
};
