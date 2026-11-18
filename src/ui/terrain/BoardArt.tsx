// The painted battlefield: map margin, grassland, terrain features, hex grid and section dividers.
import { memo, useId, useMemo } from 'react';
import type { TerrainType } from '../../engine/types';
import { BOARD_H, BOARD_W, hexCenter } from '../geometry';
import { Frame, grassDefs, GrassBase, HexGrid, SectionDividers } from './base';
import { paintFieldWorks } from './fieldworks';
import { paintQuarry } from './ground';
import { boardCtx, fieldOutline } from './hexmath';
import { paintHills, paintRugged } from './hills';
import { paintTowns } from './towns';
import { paintForests } from './vegetation';
import { paintRivers } from './water';

export interface BoardArtProps {
  /** Length 117 (index r*13+c): `GameState.terrain`; 'plain' for open ground, 'void' for off-board slots. */
  terrain: readonly TerrainType[];
  /** Field Works hexsides of each hex (`GameState.works`: bit i = direction E, NE, NW, W, SW, SE); absent = none. */
  works?: readonly number[];
  /** Board rotated 180 degrees. */
  flipped: boolean;
  /** Army name written on the frame at the top edge (already resolved for `flipped`). */
  topLabel?: string;
  /** Army name written on the frame at the bottom edge. */
  bottomLabel?: string;
}

const NO_WORKS: readonly number[] = [];

function BoardArtImpl({
  terrain,
  works = NO_WORKS,
  flipped,
  topLabel,
  bottomLabel,
}: BoardArtProps): JSX.Element {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const id = (s: string) => `ba${uid}-${s}`;
  const tKey = terrain.join(',');
  const wKey = works.join(',');

  const art = useMemo(() => {
    const ctx = boardCtx(terrain, flipped);
    return {
      outline: fieldOutline(ctx),
      grid: <HexGrid ctx={ctx} />,
      features: (
        <>
          {paintQuarry(ctx)}
          {paintHills(ctx, `url(#${id('tuftA')})`, 1)}
          {paintRugged(ctx, `url(#${id('tuftA')})`, 1)}
          {paintRivers(ctx)}
          {paintTowns(ctx)}
          {paintFieldWorks(ctx, works)}
          {paintForests(ctx)}
        </>
      ),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tKey, wKey, flipped, uid]);

  const x1 = hexCenter(0, 4, flipped).x;
  const x2 = hexCenter(0, 8, flipped).x;
  const xa = Math.min(x1, x2);
  const xb = Math.max(x1, x2);
  return (
    <g className="board-art">
      <defs>
        {grassDefs(id)}
        <clipPath id={id('field')}>
          <rect x={0} y={0} width={BOARD_W} height={BOARD_H} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id('field')})`}>
        <GrassBase id={id} />
        {art.features}
        {art.grid}
        <SectionDividers x1={xa} x2={xb} />
      </g>
      <Frame outline={art.outline} x1={xa} x2={xb} topLabel={topLabel} bottomLabel={bottomLabel} />
    </g>
  );
}

function sameArr<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Do two sets of board-art props draw the same board? Arrays are compared by content, so a fresh copy of the same terrain
 * does not redraw the board.
 */
export function boardArtPropsEqual(a: BoardArtProps, b: BoardArtProps): boolean {
  return (
    a.flipped === b.flipped &&
    a.topLabel === b.topLabel &&
    a.bottomLabel === b.bottomLabel &&
    sameArr(a.terrain, b.terrain) &&
    sameArr(a.works ?? NO_WORKS, b.works ?? NO_WORKS)
  );
}

/** Static board art; re-renders only when the terrain, the works, the orientation or the labels change. */
export const BoardArt = memo(BoardArtImpl, boardArtPropsEqual);
