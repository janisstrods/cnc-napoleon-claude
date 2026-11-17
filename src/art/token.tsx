// Placeholder unit tokens: a base plate in the nation's colour, one primitive silhouette per remaining block (a foot
// soldier, a horseman or a gun), and the arm badge. Plan 6B Task 7 replaces the bodies with the Napoleonic art (src/art/nap);
// the props stay. The token is centred on (0,0) of a pointy-top hex of radius 50; its top-right corner is kept clear for an
// attached leader (LEADER_ATTACH_OFFSET).
import { memo } from 'react';
import { ARM_OF, codeOf, type Nation, type UnitKey } from '../engine/codes';
import { ArmGlyph, NapUnitToken, isArtKey } from './nap';
import { BASE_TOP, blockColors, type SideColors } from './palettes';
import { darken } from './color';

export type Kind = 'foot' | 'mounted' | 'machine';

const KIND_OF_ARM = { infantry: 'foot', cavalry: 'mounted', artillery: 'machine' } as const;

/** The silhouette a unit is drawn with, by its arm. */
export function figureKind(k: UnitKey): Kind {
  return KIND_OF_ARM[ARM_OF[codeOf(k)]];
}

export interface UnitTokenProps {
  unitKey: UnitKey;
  nation: Nation;
  blocks: number;
  maxBlocks: number;
  facing: 'left' | 'right';
  dimmed?: boolean;
}

const OUTLINE = '#1d140e';
const CREAM = '#fbf1d6';

/** Where the figure of block `k` stands (feet), by silhouette: a loose diamond of four and a fifth behind, the first block at the front. */
const SLOTS: Record<Kind, readonly (readonly [number, number])[]> = {
  foot: [[6, 8], [-10, 4], [14, -3], [-4, -3], [-23, 0]],
  mounted: [[2, 9], [-12, 3], [13, 0], [-3, -4], [-24, 6]],
  machine: [[4, 8], [-12, 4], [14, -2], [-4, -3], [-24, 3]],
};
const SCALE: Record<Kind, number> = { foot: 0.9, mounted: 0.62, machine: 0.7 };

function Figure({ kind, side }: { kind: Kind; side: SideColors }) {
  const cloth = side.banner;
  switch (kind) {
    case 'foot':
      return (
        <g>
          <ellipse cx={0} cy={0.5} rx={5} ry={1.6} fill="#000" opacity={0.3} />
          <rect x={-3.2} y={-12} width={6.4} height={11.5} rx={2.4} fill={cloth} stroke={OUTLINE} strokeWidth={0.8} />
          <circle cx={0} cy={-15} r={3.2} fill="#d9b08c" stroke={OUTLINE} strokeWidth={0.8} />
          <rect x={-3.4} y={-19.6} width={6.8} height={3.2} rx={1.2} fill={darken(cloth, 0.4)} stroke={OUTLINE} strokeWidth={0.7} />
          <path d="M4 -4 L9 -22" stroke="#4a3020" strokeWidth={1.3} strokeLinecap="round" />
        </g>
      );
    case 'mounted':
      return (
        <g>
          <ellipse cx={0} cy={0.5} rx={13} ry={2} fill="#000" opacity={0.3} />
          <ellipse cx={0} cy={-11} rx={11} ry={5.5} fill="#6b4a2a" stroke={OUTLINE} strokeWidth={0.9} />
          <path d="M8 -13 L13 -21 L17 -19 L12 -9 Z" fill="#6b4a2a" stroke={OUTLINE} strokeWidth={0.8} strokeLinejoin="round" />
          <path d="M-7 -7 L-7 0 M-2 -6 L-2 0 M4 -6 L4 0 M9 -7 L9 0" stroke={OUTLINE} strokeWidth={1.6} strokeLinecap="round" />
          <rect x={-3} y={-25} width={6} height={11} rx={2.4} fill={cloth} stroke={OUTLINE} strokeWidth={0.8} />
          <circle cx={0} cy={-28} r={3} fill="#d9b08c" stroke={OUTLINE} strokeWidth={0.8} />
          <rect x={-3.2} y={-32.4} width={6.4} height={3} rx={1.2} fill={darken(cloth, 0.4)} stroke={OUTLINE} strokeWidth={0.7} />
          <path d="M4 -22 L14 -34" stroke="#cfd3d8" strokeWidth={1.4} strokeLinecap="round" />
        </g>
      );
    case 'machine':
      return (
        <g>
          <ellipse cx={0} cy={0.5} rx={12} ry={2} fill="#000" opacity={0.3} />
          <path d="M-8 -9 L11 -13 L11 -9 L-8 -5 Z" fill="#3d3a38" stroke={OUTLINE} strokeWidth={0.9} strokeLinejoin="round" />
          <path d="M-12 -4 L-3 -8 L-1 -5 L-8 -1 Z" fill="#6b4a2a" stroke={OUTLINE} strokeWidth={0.8} strokeLinejoin="round" />
          <circle cx={-2} cy={-5} r={5.2} fill="#8a6a3c" stroke={OUTLINE} strokeWidth={1} />
          <circle cx={-2} cy={-5} r={1.5} fill={OUTLINE} />
        </g>
      );
  }
}

function UnitTokenImpl({ unitKey, nation, blocks, maxBlocks, facing, dimmed }: UnitTokenProps) {
  if (isArtKey(unitKey)) return <NapUnitToken unitKey={unitKey} blocks={blocks} maxBlocks={maxBlocks} facing={facing} dimmed={dimmed} />;
  const side = blockColors(nation);
  const kind = figureKind(unitKey);
  const slots = SLOTS[kind];
  const sc = SCALE[kind];
  const code = codeOf(unitKey);
  const figures: JSX.Element[] = [];
  // the back rank is removed first: the remaining blocks stand at the front slots
  for (let k = Math.min(blocks, slots.length) - 1; k >= 0; k--) {
    const [x, y] = slots[k];
    figures.push(
      <g key={k} data-figure={kind} transform={`translate(${x} ${y}) scale(${sc})`}>
        <Figure kind={kind} side={side} />
      </g>,
    );
  }
  const pips: JSX.Element[] = [];
  for (let k = 0; k < maxBlocks; k++) {
    const px = 19.4 - (maxBlocks - 1 - k) * 4.6;
    pips.push(
      k < blocks
        ? <circle key={k} cx={px} cy={30.8} r={1.95} fill="#f8e9bd" />
        : <circle key={k} cx={px} cy={30.8} r={1.55} fill="none" stroke="#a8946c" strokeWidth={0.8} />,
    );
  }
  return (
    <g data-unit={unitKey} opacity={dimmed ? 0.55 : 1}>
      <g transform={facing === 'left' ? 'scale(-1 1)' : undefined}>
        <ellipse cx={1.8} cy={16.6} rx={39.2} ry={12.7} fill="#000" opacity={0.26} />
        <ellipse cx={0} cy={14.6} rx={38} ry={11.5} fill={side.edgeShade} stroke={OUTLINE} strokeWidth={0.9} />
        <ellipse cx={0} cy={11} rx={38} ry={11.5} fill={side.edge} stroke={OUTLINE} strokeWidth={0.9} />
        <ellipse cx={0} cy={10.8} rx={35.8} ry={9.6} fill={BASE_TOP} />
        {figures}
      </g>
      <rect x={-23.4} y={24.4} width={46.8} height={12.8} rx={3.4} fill="#17110c" fillOpacity={0.93} stroke="#6b5638" strokeWidth={0.7} />
      <ArmGlyph arm={ARM_OF[code]} x={-17.6} y={30.8} />
      <text x={-11.2} y={34.1} fontFamily='"IM Fell English SC", "IM Fell English", Georgia, serif' fontWeight={700} fontSize={code.length > 2 ? 8 : 9.4} fill={CREAM}>
        {code}
      </text>
      {pips}
    </g>
  );
}

const UnitTokenMemo = memo(UnitTokenImpl);

/** A complete unit as drawn on a hex: base, one figure per remaining block, the badge and the block pips. */
export function UnitToken(p: UnitTokenProps): JSX.Element {
  return <UnitTokenMemo {...p} />;
}
