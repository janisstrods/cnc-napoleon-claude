// Leader pieces. A stub until Task 6: a medallion when attached, a mounted silhouette on a base when alone.
import { memo } from 'react';
import { OL, OW } from './draw';
import { NATION_LOOKS } from './nations';
import type { ArtNation } from './keys';
import { StubFigure } from './stub';
import { NapBasePlate } from './token';

/** Where an attached leader's medallion sits relative to its unit's hex centre. */
export const NAP_LEADER_ATTACH_OFFSET = { x: 29, y: -28 } as const;

export interface NapLeaderTokenProps {
  nation: ArtNation;
  facing: 'left' | 'right';
  attached: boolean;
  name?: string;
  showName?: boolean;
}

function NapLeaderTokenImpl({ nation, facing, attached, name, showName }: NapLeaderTokenProps) {
  const n = NATION_LOOKS[nation];
  const flip = facing === 'left' ? -1 : 1;
  if (attached) {
    return (
      <g data-leader="attached" data-stub>
        <circle r={12} fill={n.side.edge} stroke={OL} strokeWidth={OW + 0.3} />
        <circle r={8} fill={n.side.banner} />
        <circle cx={0} cy={-1.5} r={3} fill="#e0b48c" stroke={OL} strokeWidth={OW} />
      </g>
    );
  }
  return (
    <g data-leader="alone" data-stub>
      <NapBasePlate side={n.side} />
      <g transform={`translate(${2 * flip} 18) scale(${1.1 * flip} 1.1)`}>
        <StubFigure drawing="horse" n={n} i={0} />
      </g>
      {showName && name ? (
        <g>
          <rect x={-(name.length * 2.2 + 5)} y={26} width={name.length * 4.4 + 10} height={10} rx={2} fill="#17110c" fillOpacity={0.93} />
          <text x={0} y={33.2} textAnchor="middle" textLength={name.length * 4.4} lengthAdjust="spacingAndGlyphs" fontFamily="Cinzel, Georgia, serif" fontWeight={700} fontSize={7} fill="#fbf1d6">{name}</text>
        </g>
      ) : null}
    </g>
  );
}

const LeaderMemo = memo(NapLeaderTokenImpl);

/** A leader piece: attached (a medallion centred on (0,0), to be moved by NAP_LEADER_ATTACH_OFFSET) or alone on its own base. */
export function NapLeaderToken(props: NapLeaderTokenProps): JSX.Element {
  return <LeaderMemo {...props} />;
}
