// Headgear of officers and leaders, in the head-local frame (origin at the head's centre, head radius 2.4, facing right; the
// front is +x). The root carries data-head="bicorne" and data-worn.
//
// Seen from the side, a bicorne worn ATHWART (points over the ears, the French, Portuguese and Dutch way) shows its narrow
// end: a tall, peaked cap with the cockade on the visible flank. Worn FORE AND AFT (points to front and back, the British
// general's way) it shows its long edge: a low crescent over the brow and the nape. That difference is what separates the two
// at board scale. Sources differ on which generals wore which; the choice is the brief's.
//
// Spec reading (the Headwear type is fixed, so some fields are reused):
//   cords    the gold lace edging the hat and its button loop (none: plain felt)
//   plume    a coloured feather edging along the top when not `tall`; an upright plume (with `tip`) when `tall`
//   pompoms  the cockade's rings, outermost first
import { darken, lighten } from '../../color';
import { Hi, OL, Paint, Shape } from '../draw';
import type { CommandHeadgear } from '../uniform';
import type { HeadgearRenderer } from './index';

const FELT = '#1f1d1d';

const ATHWART = 'M-3.1 -1.2 Q-3.5 -4.6 -0.4 -6.4 Q0.7 -6.9 1.9 -6.2 Q3.8 -4.4 3.4 -1.4 Q0.2 -2.5 -3.1 -1.2 Z';
const ATHWART_TOP = 'M-3.1 -1.2 Q-3.5 -4.6 -0.4 -6.4 Q0.7 -6.9 1.9 -6.2 Q3.8 -4.4 3.4 -1.4';
const FORE_AFT = 'M-5.6 -0.4 Q-3 -5.4 0.4 -5.4 Q3.4 -5.2 5.8 -0.6 Q3 -2.4 0.3 -2.5 Q-2.8 -2.5 -5.6 -0.4 Z';
const FORE_AFT_TOP = 'M-5.6 -0.4 Q-3 -5.4 0.4 -5.4 Q3.4 -5.2 5.8 -0.6';

/** An upright plume standing from (x, y), leaning back a little, with a coloured tip. */
function Plume({ x, y, h, colour, tip }: { x: number; y: number; h: number; colour: string; tip?: string }) {
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

/** The cockade: concentric rings, outermost first, on the hat's visible flank. */
function Cockade({ colours, x, y }: { colours: readonly string[]; x: number; y: number }) {
  const r0 = colours.length > 2 ? 1.25 : 1.05;
  return (
    <g data-part="cockade">
      {colours.map((c, k) => <circle key={k} cx={x} cy={y} r={r0 * (1 - k / (colours.length + 0.4))} fill={c} stroke={k === 0 ? OL : undefined} strokeWidth={k === 0 ? 0.35 : undefined} />)}
    </g>
  );
}

const Bicorne: HeadgearRenderer = ({ head }) => {
  const felt = head.body ?? FELT;
  const foreAft = head.worn === 'foreAft';
  const lace = head.cords;
  const upright = head.plume?.tall === true;
  const edging = head.plume && !upright ? head.plume.colour : undefined;
  const top = foreAft ? FORE_AFT_TOP : ATHWART_TOP;
  return (
    <g data-head="bicorne" data-worn={foreAft ? 'foreAft' : 'athwart'}>
      {head.plume && upright ? <Plume x={0.4} y={foreAft ? -5.2 : -6.4} h={foreAft ? 4.6 : 4} colour={head.plume.colour} tip={head.plume.tip} /> : null}
      {/* the feather edging stands a little proud of the felt, as a dashed fringe */}
      {edging ? <path d={top} fill="none" stroke={edging} strokeWidth={1.5} strokeDasharray="0.7 0.45" strokeLinecap="round" opacity={0.95} transform="translate(0 -0.3)" /> : null}
      <Shape d={foreAft ? FORE_AFT : ATHWART} f={felt} sw={0.7} />
      <Paint d={foreAft ? 'M-5.6 -0.4 Q-3 -5.4 -0.6 -5.4 L-0.6 -2.5 Q-2.8 -2.5 -5.6 -0.4 Z' : 'M-3.1 -1.2 Q-3.5 -4.6 -0.4 -6.4 L-0.4 -2.2 Q-1.6 -2.2 -3.1 -1.2 Z'} f={darken(felt, 0.4)} o={0.5} mx={0} />
      <Hi d={top} c={lighten(felt, 0.3)} w={0.35} o={0.55} mx={0} />
      {lace ? <path d={top} fill="none" stroke={lace} strokeWidth={0.55} strokeLinecap="round" /> : null}
      {lace ? <path d={foreAft ? 'M3.4 -0.9 Q3.7 -2.6 2.6 -3.6' : 'M2.8 -1.8 Q3.3 -3.6 2.2 -4.8'} fill="none" stroke={lace} strokeWidth={0.4} strokeLinecap="round" /> : null}
      {head.pompoms && head.pompoms.length > 0 ? <Cockade colours={head.pompoms} x={foreAft ? 3.2 : 0.9} y={foreAft ? -2.3 : -3.2} /> : null}
    </g>
  );
};

export const COMMAND_HEADGEAR: Record<CommandHeadgear, HeadgearRenderer> = {
  bicorne: Bicorne,
};
