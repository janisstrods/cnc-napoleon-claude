// Leader pieces: a portrait medallion when attached to a unit, and a mounted general with a small national flag on his own base
// when alone. Data decides everything (the LeaderSpec's dress, headgear, horse and flag); nothing here knows a nation.
import { memo, useId, type ReactNode } from 'react';
import { darken, lighten } from '../color';
import { FacingRightCtx, Hi, Line2, OL, OW, Paint, Shape, makeFig } from './draw';
import { HeadOn } from './foot';
import { HORSE_MOUTH, HORSE_SEAT, Horse } from './horse';
import type { ArtNation } from './keys';
import { METAL, NATION_LOOKS, type NationLook } from './nations';
import { Rider } from './rider';
import { LEADER_SPECS } from './specs/leaders';
import { NapBasePlate } from './token';
import type { FlagSpec, LeaderSpec } from './uniform';

/** Where an attached leader's medallion sits relative to its unit's hex centre. */
export const NAP_LEADER_ATTACH_OFFSET = { x: 29, y: -28 } as const;

export interface NapLeaderTokenProps {
  nation: ArtNation;
  facing: 'left' | 'right';
  attached: boolean;
  name?: string;
  showName?: boolean;
}

// ---------------------------------------------------------------------------------------------
// The flag

type P = readonly [number, number];

/** A flag of `w` x `h` with its hoist at (x, y), streaming forward (+x) with a slight wave; drawn from the spec. */
function Flag({ flag, x, y, w, h }: { flag: FlagSpec; x: number; y: number; w: number; h: number }) {
  // (u, v) in the flag's own unit square -> the waved flag plane.
  const m = (u: number, v: number): P => [x + u * w, y + v * h + Math.sin(u * 4.4) * 0.9 * u];
  /** A polygon in (u, v), its edges cut into short runs so that the wave bends them. */
  const poly = (uv: readonly P[], fill: string) => {
    const pts: string[] = [];
    uv.forEach(([u0, v0], k) => {
      const [u1, v1] = uv[(k + 1) % uv.length];
      for (let s = 0; s < 4; s++) {
        const [px, py] = m(u0 + ((u1 - u0) * s) / 4, v0 + ((v1 - v0) * s) / 4);
        pts.push(`${px.toFixed(2)} ${py.toFixed(2)}`);
      }
    });
    return <path d={`M${pts.join(' L')} Z`} fill={fill} />;
  };
  const box = (u0: number, v0: number, u1: number, v1: number, fill: string) => poly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], fill);
  const c = flag.colours;
  const cut = c.length;
  let body: ReactNode;
  if (flag.kind === 'union') {
    const [cross, white, field] = c;
    body = (
      <>
        {box(0, 0, 1, 1, field)}
        {poly([[0, 0], [0.15, 0], [1, 1], [0.85, 1]], white)}
        {poly([[1, 0], [0.85, 0], [0, 1], [0.15, 1]], white)}
        {box(0.36, 0, 0.64, 1, white)}
        {box(0, 0.28, 1, 0.72, white)}
        {box(0.43, 0, 0.57, 1, cross)}
        {box(0, 0.4, 1, 0.6, cross)}
      </>
    );
  } else if (flag.kind === 'vertical') {
    body = c.map((col, k) => <g key={k}>{box(k / cut, 0, (k + 1) / cut, 1, col)}</g>);
  } else {
    body = c.map((col, k) => <g key={k}>{box(0, k / cut, 1, (k + 1) / cut, col)}</g>);
  }
  const outline = `M${m(0, 0).join(' ')} L${m(0.5, 0).join(' ')} L${m(1, 0).join(' ')} L${m(1, 1).join(' ')} L${m(0.5, 1).join(' ')} L${m(0, 1).join(' ')} Z`;
  return (
    <g data-flag={flag.kind}>
      {body}
      <path d={outline} fill="none" stroke={OL} strokeWidth={0.7} strokeLinejoin="round" />
      <path d={`M${m(0.1, 0.5).join(' ')} Q${m(0.5, 0.6).join(' ')} ${m(0.95, 0.5).join(' ')}`} fill="none" stroke="#000" strokeWidth={0.5} opacity={0.12} />
    </g>
  );
}

// ---------------------------------------------------------------------------------------------
// The mounted general

// The staff is held in the near hand beside the reins (the Rider's 'reins' pose); the seat frame, y negative upwards.
// The bridle hand again is drawn over the staff so that the fist closes round it.
const REIN_X = 6.2;
const REIN_Y = -7.8;
const STAFF_BASE: P = [6.2, -4];
const STAFF_TOP: P = [7.4, -37];
const FLAG_W = 18;
const FLAG_H = 12;

/** A mounted general at a walk, in the local frame (hooves at y = 0, facing right), with a staff and flag in the bridle hand. */
export function MountedGeneral({ spec, n }: { spec: LeaderSpec; n: NationLook }) {
  const f = makeFig(n, 0);
  const seat = HORSE_SEAT.light;
  // Horse furniture matches the coat and is laced in gold.
  const shabraque = { cloth: spec.dress.coat, trim: METAL.gold };
  return (
    <g data-general>
      <ellipse cx={1.6} cy={0.5} rx={15} ry={2.2} fill="#1a1208" opacity={0.42} />
      <Horse size="light" coat={spec.horse} pose={0} shabraque={shabraque} />
      <g transform={`translate(${seat.x} ${seat.y}) scale(0.9)`}>
        <Rider dress={spec.dress} head={spec.head} weapon="reins" f={f} pose={0} mouth={HORSE_MOUTH.light} />
        <Line2 d={`M${STAFF_BASE.join(' ')} L${STAFF_TOP.join(' ')}`} w={0.9} c={METAL.wood} ow={0.45} />
        <circle cx={STAFF_TOP[0]} cy={STAFF_TOP[1] - 0.6} r={1} fill={METAL.gold} stroke={OL} strokeWidth={0.4} />
        <Flag flag={spec.flag} x={STAFF_TOP[0] + 0.4} y={STAFF_TOP[1] + 0.6} w={FLAG_W} h={FLAG_H} />
        <circle cx={REIN_X} cy={REIN_Y} r={1.2} fill={f.skin} stroke={OL} strokeWidth={0.5} />
      </g>
    </g>
  );
}

// ---------------------------------------------------------------------------------------------
// The portrait medallion

const PARCHMENT = '#cbbf96';

/** The bust, drawn in a disc of radius 7.8 centred on (0,0): coat, collar, embroidery, sash, epaulettes, face and bicorne. */
export function LeaderBust({ spec, n }: { spec: LeaderSpec; n: NationLook }) {
  const f = makeFig(n, 0);
  const { dress } = spec;
  const gold = dress.lace ?? METAL.gold;
  const clip = useId();
  return (
    <g data-bust>
      <defs><clipPath id={clip}><circle r={7.8} /></clipPath></defs>
      <circle r={7.8} fill={PARCHMENT} />
      <g clipPath={`url(#${clip})`}>
        <Shape d="M-10 12 L-9 5.2 Q-5 3.2 -2.2 3 L2.2 3 Q5 3.2 9 5.2 L10 12 Z" f={dress.coat} sw={0.6} />
        <Paint d="M-10 12 L-9 5.2 Q-5 3.2 -2.2 3 L-1.5 3 L-2 12 Z" f={darken(dress.coat, 0.4)} o={0.5} mx={0} />
        {dress.sash ? <path d="M-9 4.6 L9.5 9.6" stroke={dress.sash} strokeWidth={2.2} /> : null}
        <Shape d="M-3.4 3.4 L-2.2 1.8 L2.4 1.8 L3.6 3.4 L3.2 5.2 L-3.2 5.2 Z" f={dress.facings} sw={0.5} />
        <path d="M-3.1 6.2 Q0 7.4 3.1 6.2 M-2.6 7.6 Q0 8.6 2.6 7.6" fill="none" stroke={gold} strokeWidth={0.6} strokeLinecap="round" />
        <path d="M-3.4 3.4 L-3.2 5.2 L3.2 5.2 L3.6 3.4" fill="none" stroke={gold} strokeWidth={0.5} />
      </g>
      {dress.shoulders ? (
        <g fill={dress.shoulders.colour} stroke={OL} strokeWidth={0.5}>
          <ellipse cx={-6.8} cy={5.2} rx={1.9} ry={1.1} />
          <ellipse cx={6.8} cy={5.2} rx={1.9} ry={1.1} />
        </g>
      ) : null}
      <HeadOn head={spec.head} f={f} x={0.4} y={0.4} s={1.15} />
    </g>
  );
}

/** The attached medallion: gold rim, a ring in the nation's banner colour, and the bust; radius 11 (the rim's outline reaches 12). */
function Medallion({ spec, n }: { spec: LeaderSpec; n: NationLook }) {
  return (
    <g>
      <circle r={10.9} fill={METAL.gold} stroke={OL} strokeWidth={OW + 0.3} />
      <circle r={9.2} fill={n.side.banner} stroke={darken(METAL.gold, 0.4)} strokeWidth={0.5} />
      <LeaderBust spec={spec} n={n} />
      <Hi d="M-6.4 -6.6 A9 9 0 0 1 -1 -9" c={lighten(n.side.banner, 0.5)} w={0.7} o={0.6} />
    </g>
  );
}

// ---------------------------------------------------------------------------------------------
// The name ribbon

/** The ribbon's lines: a name of more than 13 characters wraps at the space nearest its middle. */
export function ribbonLines(name: string): string[] {
  if (name.length <= 13) return [name];
  const mid = name.length / 2;
  let best = -1;
  for (let k = 0; k < name.length; k++) if (name[k] === ' ' && (best < 0 || Math.abs(k - mid) < Math.abs(best - mid))) best = k;
  return best < 0 ? [name] : [name.slice(0, best), name.slice(best + 1)];
}

const LINE_H = 8.5;
/** The ribbon's width: about 5.7 units a letter at 7 pt on the longest line, a little padding, never under 22, capped at 80. */
export function ribbonWidth(name: string): number {
  return Math.min(80, Math.max(22, Math.max(...ribbonLines(name).map((l) => l.length)) * 5.7 + 4));
}

export function NameRibbon({ name, y }: { name: string; y: number }) {
  const w = ribbonWidth(name);
  const lines = ribbonLines(name);
  const h = lines.length * LINE_H + 1.5;
  return (
    <g data-ribbon-group>
      <rect data-ribbon x={-w / 2} y={y} width={w} height={h} rx={2} fill="#17110c" fillOpacity={0.93} />
      {lines.map((l, k) => (
        <text key={k} x={0} y={y + 7 + k * LINE_H} textAnchor="middle" textLength={Math.min(w - 6, l.length * 5.7)} lengthAdjust="spacingAndGlyphs" fontFamily="Cinzel, Georgia, serif" fontWeight={700} fontSize={7} fill="#fbf1d6">{l}</text>
      ))}
    </g>
  );
}

// ---------------------------------------------------------------------------------------------

function NapLeaderTokenImpl({ nation, facing, attached, name, showName }: NapLeaderTokenProps) {
  const n = NATION_LOOKS[nation];
  const spec = LEADER_SPECS[nation];
  const flip = facing === 'left' ? -1 : 1;
  if (attached) {
    return (
      <g data-leader="attached">
        {/* the medallion is never mirrored, so it is always lit from the upper left: value true in both facings */}
        <FacingRightCtx.Provider value>
          <Medallion spec={spec} n={n} />
        </FacingRightCtx.Provider>
      </g>
    );
  }
  return (
    <g data-leader="alone">
      <NapBasePlate side={n.side} rx={31} ry={10} cy={14} />
      <FacingRightCtx.Provider value={facing === 'right'}>
        <g transform={`translate(${-3 * flip} 20.5) scale(${1.05 * flip} 1.05)`}>
          <MountedGeneral spec={spec} n={n} />
        </g>
      </FacingRightCtx.Provider>
      {showName && name ? <NameRibbon name={name} y={24} /> : null}
    </g>
  );
}

const LeaderMemo = memo(NapLeaderTokenImpl);

/** A leader piece: attached (a medallion centred on (0,0), to be moved by NAP_LEADER_ATTACH_OFFSET) or alone on its own base. */
export function NapLeaderToken(props: NapLeaderTokenProps): JSX.Element {
  return <LeaderMemo {...props} />;
}
