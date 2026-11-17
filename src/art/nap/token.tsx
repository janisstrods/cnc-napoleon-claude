// Napoleonic unit token: base plate, one miniature per remaining block, the Guard marker and the arm badge, centred on
// (0,0) of a pointy-top hex of radius 50 (HEX_R). The top-right corner is kept clear for an attached leader.
import { memo } from 'react';
import { darken } from '../color';
import { UnitBadge } from './badge';
import { FacingRightCtx, OL } from './draw';
import { FootFigure } from './foot';
import { GunPieceFigure } from './gun';
import { artNationOf, type ArtKey } from './keys';
import { BASE_TOP, NATION_LOOKS, METAL, type SideColours } from './nations';
import { MountedFigure } from './rider';
import { ICON_BOX, formationOf, standing } from './slots';
import { FIGURE_SPECS } from './specs';
import type { GunPiece } from './uniform';

export interface NapUnitTokenProps {
  unitKey: ArtKey;
  blocks: number;
  maxBlocks: number;
  facing: 'left' | 'right';
  dimmed?: boolean;
}

/** One miniature of a unit in its local frame (facing right, feet at 0,0); `piece` picks a gun unit's piece (default: the gun). */
export function NapMiniature({ unitKey, i, piece }: { unitKey: ArtKey; i: number; piece?: GunPiece }) {
  const spec = FIGURE_SPECS[unitKey];
  const n = NATION_LOOKS[artNationOf(unitKey)];
  if (spec.drawing === 'foot') return <FootFigure spec={spec} n={n} i={i} />;
  if (spec.drawing === 'horse') return <MountedFigure spec={spec} n={n} i={i} />;
  return <GunPieceFigure spec={spec} n={n} i={i} piece={piece ?? spec.pieces[0]} />;
}

// ---------------------------------------------------------------------------------------------
// Base plate

// Flock / grass tufts on the base top, as fractions of (rx, ry) from the centre.
const TUFTS: [number, number, number][] = [
  [-0.78, -0.05, 1], [-0.52, 0.55, 0.8], [-0.12, 0.72, 1.1], [0.36, 0.62, 0.9], [0.74, 0.18, 1],
  [0.6, -0.48, 0.8], [0.08, -0.7, 0.9], [-0.46, -0.6, 1],
];

/** Several small ellipses as one path (fewer DOM nodes). */
function blobs(list: [number, number, number][], irx: number, iry: number, ox: number, oy: number, rx: number, ry: number): string {
  return list
    .map(([fx, fy, s]) => {
      const x = fx * irx + ox - rx * s;
      const y = fy * iry + oy;
      return `M${x.toFixed(2)} ${y.toFixed(2)}a${(rx * s).toFixed(2)} ${(ry * s).toFixed(2)} 0 1 0 ${(2 * rx * s).toFixed(2)} 0a${(rx * s).toFixed(2)} ${(ry * s).toFixed(2)} 0 1 0 ${(-2 * rx * s).toFixed(2)} 0Z`;
    })
    .join('');
}

export function NapBasePlate({ side, rx = 38, ry = 11.5, cy = 11 }: { side: SideColours; rx?: number; ry?: number; cy?: number }) {
  const irx = rx - 2.2;
  const iry = ry - 1.9;
  return (
    <g>
      <ellipse cx={1.8} cy={cy + 5.6} rx={rx + 1.2} ry={ry + 1.2} fill="#000" opacity={0.26} />
      <ellipse cx={0} cy={cy + 3.6} rx={rx} ry={ry} fill={side.edgeShade} stroke={OL} strokeWidth={0.9} />
      <path d={`M${-rx} ${cy} A ${rx} ${ry} 0 0 0 ${rx} ${cy} L ${rx} ${cy + 2.4} A ${rx} ${ry} 0 0 1 ${-rx} ${cy + 2.4} Z`} fill={side.edge} />
      <path d={`M${-rx + 3} ${cy + 4.6} A ${rx} ${ry} 0 0 0 ${-rx * 0.35} ${cy + ry + 2.6}`} fill="none" stroke={side.edgeLight} strokeWidth={0.9} opacity={0.75} />
      <ellipse cx={0} cy={cy} rx={rx} ry={ry} fill={side.edge} stroke={OL} strokeWidth={0.9} />
      <ellipse cx={0} cy={cy - 0.2} rx={irx} ry={iry} fill={BASE_TOP} />
      <ellipse cx={-irx * 0.18} cy={cy - iry * 0.22} rx={irx * 0.72} ry={iry * 0.62} fill="#d8cf8a" opacity={0.13} />
      <path d={blobs(TUFTS, irx, iry, 0, cy - 0.2, 2.2, 0.9)} fill={darken(BASE_TOP, 0.3)} opacity={0.75} />
      <path d={blobs(TUFTS, irx, iry, -0.5, cy - 0.6, 1.3, 0.55)} fill="#a6a25a" opacity={0.85} />
      <path d={`M${-rx + 4} ${cy - 3.5} A ${irx} ${iry} 0 0 1 ${rx - 8} ${cy - 5.6}`} fill="none" stroke={side.edgeLight} strokeWidth={0.8} opacity={0.8} />
    </g>
  );
}

// ---------------------------------------------------------------------------------------------
// Guard marker: a gilt staff planted at the back left of the base, topped with an eagle or a crown.

export function GuardMarker({ device }: { device: 'eagle' | 'crown' }) {
  return (
    <g data-guard={device} transform="translate(-27.5 8) scale(0.88)">
      <ellipse cx={1} cy={0.6} rx={3} ry={1.1} fill="#000" opacity={0.3} />
      <path d="M0 0.4 L0 -34" stroke={OL} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M0 0 L0 -34" stroke={METAL.gold} strokeWidth={1.3} />
      {device === 'eagle' ? (
        <g transform="translate(0 -35)" fill={METAL.gold} stroke={OL} strokeWidth={0.5} strokeLinejoin="round">
          <path d="M0 -1 C-2 -3.4 -5.4 -3.6 -7 -2 C-5.4 -2 -4.4 -1.2 -4 0 C-3 -0.4 -2 -0.2 -1.4 0.4 Z M0 -1 C2 -3.4 5.4 -3.6 7 -2 C5.4 -2 4.4 -1.2 4 0 C3 -0.4 2 -0.2 1.4 0.4 Z" />
          <ellipse cx={0} cy={-1.8} rx={1.5} ry={2.4} />
          <circle cx={0.7} cy={-5} r={1.1} />
          <path d="M1.6 -5.3 L3 -4.8 L1.6 -4.3 Z" />
        </g>
      ) : (
        <g transform="translate(0 -35)" fill={METAL.gold} stroke={OL} strokeWidth={0.5} strokeLinejoin="round">
          <path d="M-3.8 0 L-4.4 -5 L-2.2 -3 L0 -6 L2.2 -3 L4.4 -5 L3.8 0 Z" />
          <circle cx={0} cy={-6.8} r={0.9} />
        </g>
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------------------------

function UnitTokenImpl({ unitKey, blocks, maxBlocks, facing, dimmed }: NapUnitTokenProps) {
  const spec = FIGURE_SPECS[unitKey];
  const look = NATION_LOOKS[artNationOf(unitKey)];
  const n = Math.max(0, Math.min(blocks, maxBlocks));
  const formation = formationOf(spec);
  const placed = n > 0 ? standing(formation, n, maxBlocks) : [];
  const flip = facing === 'left' ? -1 : 1;
  const guard = spec.guard === true;
  const device = look.guardDevice;
  return (
    <g data-nap>
      <g opacity={dimmed ? 0.6 : undefined} style={dimmed ? { filter: 'saturate(0.3) brightness(0.95)' } : undefined}>
        <NapBasePlate side={look.side} />
        {guard && device !== 'none' ? <GuardMarker device={device} /> : null}
        <FacingRightCtx.Provider value={facing === 'right'}>
          {placed.map(([sl, idx]) => (
            <g key={idx} data-slot={idx}>
              <ellipse cx={sl.x * flip + 1.6} cy={sl.y + 0.4} rx={(formation === 'close' || formation === 'loose' ? 7.5 : 15) * sl.s} ry={2.2 * sl.s} fill="#1a1208" opacity={0.42} />
              <g transform={`translate(${sl.x * flip} ${sl.y}) scale(${sl.s * flip} ${sl.s})`}>
                <NapMiniature unitKey={unitKey} i={idx} piece={spec.drawing === 'gun' ? spec.pieces[maxBlocks - 1 - idx] ?? spec.pieces[0] : undefined} />
              </g>
            </g>
          ))}
        </FacingRightCtx.Provider>
      </g>
      <g opacity={dimmed ? 0.8 : undefined}>
        <UnitBadge unitKey={unitKey} blocks={n} maxBlocks={maxBlocks} guard={guard} />
      </g>
    </g>
  );
}

const UnitTokenMemo = memo(UnitTokenImpl);

/** A complete unit as drawn on a hex: base, one miniature per remaining block (back rank removed first), badge and pips. */
export function NapUnitToken(props: NapUnitTokenProps): JSX.Element {
  return <UnitTokenMemo {...props} />;
}

/** One representative miniature (facing right), centred on (0,0) and scaled to fit a `size` x `size` box. */
export function NapUnitIcon({ unitKey, size }: { unitKey: ArtKey; size: number }) {
  const spec = FIGURE_SPECS[unitKey];
  const [top, bottom, left, right] = ICON_BOX[spec.drawing];
  const s = size / Math.max(bottom - top, right - left);
  return (
    <g transform={`scale(${s}) translate(${-(left + right) / 2} ${-(top + bottom) / 2})`}>
      <ellipse cx={1.2} cy={0.6} rx={spec.drawing === 'foot' ? 7.5 : 15} ry={2.1} fill="#1a1208" opacity={0.35} />
      <FacingRightCtx.Provider value>
        <NapMiniature unitKey={unitKey} i={2} />
      </FacingRightCtx.Provider>
    </g>
  );
}
