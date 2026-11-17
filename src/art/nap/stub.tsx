// StubFigure: a plain silhouette in the nation's edge colour, so every key draws something while the families are written.
// Its root carries data-fig (like every figure) and data-stub.
import { OL, OW, type Fig } from './draw';
import { makeFig } from './draw';
import type { NationLook } from './nations';
import type { FigureSpec, GunPiece } from './uniform';

function Foot({ f }: { f: Fig }) {
  const c = f.n.side.edge;
  return (
    <>
      <path d="M-4 0 L-4.4 -13 Q-4.6 -21 -2.6 -24 L2.6 -24 Q4.6 -21 4.4 -13 L4 0 Z" fill={c} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
      <path d="M1.6 -23 L4.4 -13 L4 0 L1.4 0 Z" fill={f.n.side.edgeShade} opacity={0.6} />
      <circle cx={0} cy={-27.2} r={2.6} fill={f.skin} stroke={OL} strokeWidth={OW} />
      <path d="M-2.6 -29 L2.6 -29 L2.4 -33 L-2.4 -33 Z" fill={f.n.side.edgeShade} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
      <path d="M4 -10 L6.4 -31" stroke={OL} strokeWidth={1.4} strokeLinecap="round" />
    </>
  );
}

function Horse({ f }: { f: Fig }) {
  const c = f.n.side.edge;
  return (
    <>
      <path d="M-11 -10 L-11 -1 M-6 -10 L-6 -1 M6 -10 L6 -1 M11 -10 L11 -1" stroke={OL} strokeWidth={2.6} strokeLinecap="round" />
      <ellipse cx={0} cy={-15} rx={14} ry={6} fill={c} stroke={OL} strokeWidth={OW} />
      <path d="M10 -17 L15 -27 L21 -24 L19 -17 Z" fill={c} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
      <path d="M-3 -19 L-3.4 -29 L3 -29 L3.4 -19 Z" fill={f.n.side.edgeLight} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
      <circle cx={0} cy={-32} r={2.6} fill={f.skin} stroke={OL} strokeWidth={OW} />
      <path d="M-2.6 -34 L2.6 -34 L2.4 -37.5 L-2.4 -37.5 Z" fill={f.n.side.edgeShade} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
    </>
  );
}

function Gun({ f }: { f: Fig }) {
  const c = f.n.side.edge;
  return (
    <>
      <path d="M-4 -8 L-17 -1" stroke={OL} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M-3 -9 L19 -13" stroke={OL} strokeWidth={4.4} strokeLinecap="round" />
      <path d="M-3 -9 L19 -13" stroke={c} strokeWidth={2.6} strokeLinecap="round" />
      <circle cx={0} cy={-7} r={7} fill={f.n.side.edgeShade} stroke={OL} strokeWidth={OW} />
      <circle cx={0} cy={-7} r={1.6} fill={c} />
    </>
  );
}

/** A crew member: a short silhouette. */
function Crew({ f }: { f: Fig }) {
  return (
    <>
      <path d="M-3.4 0 L-3.6 -10 Q-3.8 -16 -2.2 -18 L2.2 -18 Q3.8 -16 3.6 -10 L3.4 0 Z" fill={f.n.side.edge} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
      <circle cx={0} cy={-21} r={2.4} fill={f.skin} stroke={OL} strokeWidth={OW} />
    </>
  );
}

export function StubFigure({ drawing, n, i, piece }: { drawing: FigureSpec['drawing']; n: NationLook; i: number; piece?: GunPiece }) {
  const f = makeFig(n, i);
  return (
    <g data-fig={drawing} data-piece={piece} data-stub>
      {drawing === 'foot' ? <Foot f={f} /> : drawing === 'horse' ? <Horse f={f} /> : piece === 'gun' || piece === undefined ? <Gun f={f} /> : <Crew f={f} />}
    </g>
  );
}
