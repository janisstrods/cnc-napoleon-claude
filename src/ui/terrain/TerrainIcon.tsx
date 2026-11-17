// Small single-hex terrain swatch for tooltips and the legend (same painters as the board).
import { useId, useMemo } from 'react';
import type { TerrainType } from '../../engine/types';
import { hexPoints } from '../geometry';
import { paintQuarry } from './ground';
import { iconCtx } from './hexmath';
import { paintHills, paintRugged } from './hills';
import { paintFieldWorks } from './fieldworks';
import { P } from './palette';
import { paintTowns } from './towns';
import { paintForests } from './vegetation';
import { paintRivers } from './water';

const cache = new Map<string, JSX.Element | null>();

/** The swatch shows works protecting the hex's two lower sides (SW + SE, the bits of a `sides: ['SW', 'SE']` work). */
const ICON_WORKS = (1 << 4) | (1 << 5);

const TUFTS = (
  <path
    d="M-22,-14l-2,-5M-22,-14l0,-6M-22,-14l2,-5M14,-22l-2,-5M14,-22l0,-6M14,-22l2,-5M-6,8l-2,-5M-6,8l0,-6M-6,8l2,-5M24,14l-2,-5M24,14l0,-6M24,14l2,-5M-18,26l-2,-5M-18,26l0,-6M-18,26l2,-5M6,32l-2,-5M6,32l0,-6M6,32l2,-5"
    fill="none"
    stroke={P.tuftDark}
    strokeWidth={1.4}
    strokeLinecap="round"
    opacity={0.7}
  />
);

function terrainArt(t: TerrainType): JSX.Element | null {
  const ctx = iconCtx(t);
  switch (t) {
    case 'hill':
      return <g transform="scale(0.82)">{paintHills(ctx, undefined, 1.9)}</g>;
    case 'rugged':
      return <g transform="scale(0.82)">{paintRugged(ctx, undefined, 1.9)}</g>;
    case 'forest':
      return paintForests(ctx);
    case 'town':
    case 'windmill':
    case 'fortress':
      return <g transform="scale(0.92)">{paintTowns(ctx)}</g>;
    case 'river':
    case 'ford':
    case 'fordNoStop':
    case 'brook':
    case 'bridge':
      return paintRivers(ctx);
    case 'sandQuarry':
      return paintQuarry(ctx);
    case 'plain':
      return TUFTS;
    default:
      return null;
  }
}

function iconArt(t: TerrainType, works: boolean): JSX.Element | null {
  const key = `${t}:${works ? 1 : 0}`;
  if (cache.has(key)) return cache.get(key)!;
  const own = terrainArt(t);
  // shrunk a little so the ditch outside the hexsides stays inside the swatch
  const field = works ? <g transform="scale(0.86)">{paintFieldWorks(iconCtx(t), [ICON_WORKS], { openEdges: false })}</g> : null;
  const el = own || field ? <>{own}{field}</> : null;
  cache.set(key, el);
  return el;
}

const HEX_PTS = hexPoints(0, 0);

/**
 * A painted hex swatch of terrain `t`, `size` pixels square. `works`: the hex also has Field Works along its two lower
 * sides.
 */
export function TerrainIcon({ t, works = false, size }: { t: TerrainType; works?: boolean; size: number }): JSX.Element {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const art = useMemo(() => iconArt(t, works), [t, works]);
  const clip = `ti${uid}`;
  return (
    <svg width={size} height={size} viewBox="-52 -52 104 104" style={{ display: 'inline-block', verticalAlign: 'middle' }} aria-hidden>
      <defs>
        <clipPath id={clip}>
          <polygon points={HEX_PTS} />
        </clipPath>
      </defs>
      {t === 'void' ? (
        <polygon points={HEX_PTS} fill="#3d2b1d" opacity={0.6} />
      ) : (
        <>
          <polygon points={HEX_PTS} fill={P.grass} />
          <g clipPath={`url(#${clip})`}>{art}</g>
        </>
      )}
      <polygon points={HEX_PTS} fill="none" stroke="rgba(42,36,16,0.65)" strokeWidth={2.5} />
    </svg>
  );
}
