// Placeholder leader tokens: a disc in the nation's colour with a name ribbon (a lone leader) or without (one attached to a
// unit). Plan 6B Task 7 replaces the body with the Napoleonic art (src/art/nap); the props stay.
import { memo } from 'react';
import type { Nation } from '../engine/codes';
import { blockColors } from './palettes';

/** Where an attached leader's medallion sits relative to its unit's hex centre (as the art track's frame). */
export const LEADER_ATTACH_OFFSET: { x: number; y: number } = { x: 29, y: -28 };

export interface LeaderTokenProps {
  name: string;
  nation: Nation;
  attached: boolean;
  dimmed?: boolean;
}

const OUTLINE = '#1d140e';

function LeaderTokenImpl({ name, nation, attached, dimmed }: LeaderTokenProps) {
  const side = blockColors(nation);
  const r = attached ? 12 : 20;
  const width = Math.max(40, Math.min(92, 7 * name.length + 12));
  return (
    <g data-leader={name} opacity={dimmed ? 0.55 : 1}>
      <circle cx={1} cy={2} r={r + 1} fill="#000" opacity={0.3} />
      <circle r={r} fill={side.edge} stroke={OUTLINE} strokeWidth={1} />
      <circle r={r - 3} fill={side.banner} stroke={side.edgeLight} strokeWidth={0.8} />
      {/* a bicorne, as a plain crescent */}
      <path d={`M${-r * 0.55} ${r * 0.05} Q0 ${-r * 0.75} ${r * 0.55} ${r * 0.05} Q0 ${-r * 0.2} ${-r * 0.55} ${r * 0.05} Z`} fill="#17110c" />
      {!attached && (
        <g>
          <rect x={-width / 2} y={r - 4} width={width} height={14} rx={3} fill="#17110c" fillOpacity={0.93} stroke="#6b5638" strokeWidth={0.7} />
          <text y={r + 6.4} textAnchor="middle" fontFamily='"IM Fell English SC", "IM Fell English", Georgia, serif' fontWeight={700} fontSize={9} fill="#fbf1d6">
            {name}
          </text>
        </g>
      )}
    </g>
  );
}

const LeaderMemo = memo(LeaderTokenImpl);

export function LeaderToken(p: LeaderTokenProps): JSX.Element {
  return <LeaderMemo {...p} />;
}
