// Battle objective markers (RR §13): a board layer drawn above the terrain and below the units, in the colours of the nation
// of the side each objective belongs to. A temporary hex (`tempHex`) gets a nation-coloured outline and a small standard
// (raised while the side holds it), a temporary group (`tempGroup`) a dashed outline round the hex set (filled in the
// holder's colour while held), and an exit hexes arrows on their outer board edge (a gold medallion where leaders score
// too). Kill-weight objectives (`killWeight`) have no place on the board. Expansion #1 adds `tempAny` (drawn as a
// temporary group), `majority` (a dotted outline round the group in the holder's colour, unfilled so it never reads as terrain; the two
// records of a contested group draw one outline), `exitEdge` (a band along the outer hexsides of its row with one arrow off
// the board) and `suddenDeath` (nothing on the board: its text is in the panel). Everything is placed in screen space from
// the hexes, so the markers turn with a flipped board; the arrows themselves stay upright.
import { blockColors, type SideColors } from '../../art';
import { colOf, hexId, onBoard, rowOf } from '../../engine/hex';
import type { Nation } from '../../engine/codes';
import { COLS, ROWS, type HexId, type ObjectiveDef, type ObjectiveState, type Side } from '../../engine/types';
import { HEX_R, hexCenter, hexCenterId } from '../geometry';
import { corner, DIRS, edgeCorners, fmt, hexOutline, neighborRC, polyPath, screenDir, type Pt } from './hexmath';

export interface ObjectiveMarkersProps {
  /** `GameState.scenario.objectives`. */
  objectives: readonly ObjectiveDef[];
  /** `GameState.special.objState` (same order): whether a temporary objective is held. */
  objState: readonly ObjectiveState[];
  /** Board rotated 180 degrees (as BoardArt). */
  flipped: boolean;
  /** Nation of each side (`GameState.players[side].nation`): the colour of its markers. */
  nations: Record<Side, Nation>;
}

const INK = '#1d140c';
const GOLD = '#e9c25a';
/** The dots of an unheld majority group: map paper. */
const PAPER = 'rgba(250,240,214,0.95)';

const colors = (nations: Record<Side, Nation>, side: Side): SideColors => blockColors(nations[side]);

/** Outline (one subpath per loop) of the union of `hexes`: every hexside whose neighbour is not in the set. */
function areaOutline(hexes: readonly HexId[], flipped: boolean): string {
  const set = new Set(hexes);
  const cells = [...set].map((h) => ({ r: rowOf(h), c: colOf(h), ...hexCenterId(h, flipped) }));
  return hexOutline(cells, (r, c) => onBoard(r, c) && set.has(hexId(r, c)), flipped);
}

/** A small standard (a square banner hung from a crossbar), raised while held, else drawn hollow. */
function Standard({ base, c, held }: { base: Pt; c: SideColors; held: boolean }) {
  const { x, y } = base;
  const top = y - 25;
  return (
    <g className={held ? 'standard held' : 'standard'} transform={`translate(${fmt(x)} ${fmt(y)}) scale(1.2) translate(${fmt(-x)} ${fmt(-y)})`}>
      <ellipse cx={fmt(x + 1.5)} cy={fmt(y + 0.8)} rx={5} ry={1.8} fill="rgba(20,14,6,0.4)" />
      <path d={`M${fmt(x)},${fmt(y)}V${fmt(top)}M${fmt(x - 7)},${fmt(top + 3)}H${fmt(x + 7)}`} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <path d={`M${fmt(x)},${fmt(y)}V${fmt(top)}M${fmt(x - 7)},${fmt(top + 3)}H${fmt(x + 7)}`} stroke="#a77d45" strokeWidth={1.5} strokeLinecap="round" />
      <path
        d={`M${fmt(x - 6)},${fmt(top + 3.5)}h12v11l-6,3.5l-6,-3.5z`}
        fill={held ? c.banner : 'rgba(250,240,214,0.55)'}
        stroke={held ? INK : c.bannerShade}
        strokeWidth={held ? 1.1 : 1.4}
        strokeLinejoin="round"
      />
      <path d={`M${fmt(x - 6)},${fmt(top + 3.5)}h12v11l-6,3.5l-6,-3.5z`} fill="none" stroke={c.edge} strokeWidth={1} strokeLinejoin="round" opacity={held ? 0 : 0.9} />
      {held && <circle cx={fmt(x)} cy={fmt(top + 9)} r={2.2} fill={GOLD} stroke={INK} strokeWidth={0.6} />}
      <circle cx={fmt(x)} cy={fmt(top - 1)} r={2} fill={GOLD} stroke={INK} strokeWidth={0.8} />
    </g>
  );
}

/** Screen direction (unit vector) out of the board across the outer edge of edge hex `h`: off the top or bottom row first. */
function outward(h: HexId, flipped: boolean): Pt {
  const r = rowOf(h);
  const c = colOf(h);
  const p = hexCenter(r, c, flipped);
  let x = 0;
  let y = 0;
  for (const d of DIRS) {
    const [nr, nc] = neighborRC(r, c, d);
    if (onBoard(nr, nc)) continue;
    // a hex of the top or bottom row (corners too) exits over that row's edge
    if ((r === 0 && nr >= 0) || (r === ROWS - 1 && nr < ROWS)) continue;
    const q = hexCenter(nr, nc, flipped);
    x += q.x - p.x;
    y += q.y - p.y;
  }
  const l = Math.hypot(x, y) || 1;
  return { x: x / l, y: y / l };
}

/** A broad chevron arrow centred on hex centre `p`, just inside its outer edge (clear of the unit's name plate), pointing along `u`. */
function chevron(p: Pt, u: Pt, c: SideColors) {
  const n = { x: -u.y, y: u.x };
  const at = (a: number, s: number): Pt => ({ x: p.x + u.x * a + n.x * s, y: p.y + u.y * a + n.y * s });
  const d = polyPath([at(48, 0), at(35, 13.5), at(35, 6), at(25, 6), at(25, -6), at(35, -6), at(35, -13.5)]);
  return {
    at,
    el: (
      <>
        <path d={d} fill="rgba(20,14,6,0.4)" transform="translate(1.2 1.8)" />
        <path d={d} fill={c.edge} stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
        <path d={`M${fmt(at(44.5, 0).x)},${fmt(at(44.5, 0).y)}L${fmt(at(36.5, 9).x)},${fmt(at(36.5, 9).y)}`} stroke={c.edgeLight} strokeWidth={1.4} strokeLinecap="round" opacity={0.9} />
      </>
    ),
  };
}

/** A run of outer hexsides in the side's colour (the exit markers' edge). */
function EdgeBand({ d, c }: { d: string; c: SideColors }) {
  return (
    <>
      <path d={d} fill="none" stroke={INK} strokeWidth={6.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
      <path d={d} fill="none" stroke={c.edge} strokeWidth={4.2} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={c.edgeLight} strokeWidth={1.2} strokeLinecap="round" strokeDasharray="2 5" opacity={0.9} />
    </>
  );
}

/**
 * Exit marker of edge hex `h`: its outer hexsides drawn in the side's colour and an arrow pointing off the board. `leaders`:
 * leaders score too (`leadersScore`): a gold medallion on the arrow's shaft.
 */
function ExitArrow({ h, flipped, c, leaders = false, text }: { h: HexId; flipped: boolean; c: SideColors; leaders?: boolean; text: string }) {
  const r = rowOf(h);
  const col = colOf(h);
  const p = hexCenter(r, col, flipped);
  const u = outward(h, flipped);
  let sides = '';
  for (const d of DIRS) {
    const [nr, nc] = neighborRC(r, col, d);
    if (onBoard(nr, nc)) continue;
    const q = hexCenter(nr, nc, flipped);
    // only the hexsides facing the exit direction
    if ((q.x - p.x) * u.x + (q.y - p.y) * u.y < 10) continue;
    const [i, j] = edgeCorners(screenDir(d, flipped));
    const a = corner(p, i, HEX_R - 2.5);
    const b = corner(p, j, HEX_R - 2.5);
    sides += `M${fmt(a.x)},${fmt(a.y)}L${fmt(b.x)},${fmt(b.y)}`;
  }
  const { at, el } = chevron(p, u, c);
  return (
    <g className="exit">
      <title>{text}</title>
      <EdgeBand d={sides} c={c} />
      {el}
      {leaders && (
        <g className="exit-leaders">
          <circle cx={fmt(at(33, 0).x)} cy={fmt(at(33, 0).y)} r={5.6} fill={GOLD} stroke={INK} strokeWidth={1.2} />
          <circle cx={fmt(at(33, 0).x)} cy={fmt(at(33, 0).y)} r={2.6} fill="none" stroke={INK} strokeWidth={1} opacity={0.7} />
        </g>
      )}
    </g>
  );
}

/**
 * Exit-edge marker of board row `row` (0 or 8): a band along the row's outer hexsides (the board's top or bottom edge on
 * screen) in the side's colour, and one arrow off the board in the middle of the row.
 */
function ExitEdge({ row, flipped, c, text }: { row: number; flipped: boolean; c: SideColors; text: string }) {
  const cols = Array.from({ length: COLS }, (_, k) => k).filter((k) => onBoard(row, k));
  const centres = cols.map((k) => hexCenter(row, k, flipped)).sort((a, b) => a.x - b.x);
  const top = centres[0].y < hexCenter(ROWS - 1 - row, 0, flipped).y;
  // the outer corners, left to right: upper-left and top of each hex (lower-left and bottom on the lower edge), then the
  // last hex's far corner; pulled in a little so the band sits on the field, not the frame
  const [k0, k1, kEnd] = top ? [5, 0, 1] : [4, 3, 2];
  const inset = top ? 2.5 : -2.5;
  const pts: Pt[] = [];
  for (const p of centres) pts.push(corner(p, k0), corner(p, k1));
  pts.push(corner(centres[centres.length - 1], kEnd));
  const d = polyPath(pts.map((q) => ({ x: q.x, y: q.y + inset })), false);
  const mid = centres[Math.floor(centres.length / 2)];
  const { el } = chevron(mid, { x: 0, y: top ? -1 : 1 }, c);
  return (
    <g className="exit-edge">
      <title>{text}</title>
      <EdgeBand d={d} c={c} />
      <g className="exit-edge-arrow">{el}</g>
    </g>
  );
}

/** The objective markers of a battle (nothing when it has none to show). */
export function ObjectiveMarkers({ objectives, objState, flipped, nations }: ObjectiveMarkersProps): JSX.Element | null {
  if (!objectives.length) return null;
  const areas: JSX.Element[] = [];
  const rings: JSX.Element[] = [];
  const posts: { y: number; el: JSX.Element }[] = [];
  const arrows: JSX.Element[] = [];
  const groups = new Map<string, number[]>();

  objectives.forEach((o, i) => {
    const held = objState[i]?.held ?? false;
    switch (o.kind) {
      case 'tempGroup':
      case 'tempAny': {
        const c = colors(nations, o.side);
        const d = areaOutline(o.hexes, flipped);
        const cls = o.kind === 'tempGroup' ? 'temp-group' : 'temp-any';
        areas.push(
          <g key={`g${i}`} className={held ? `${cls} held-${o.side}` : cls} fill="none" strokeLinejoin="round">
            <title>{o.text}</title>
            {held && <path d={d} fill={c.edge} opacity={0.12} />}
            <path d={d} stroke={INK} strokeWidth={5.4} opacity={0.5} />
            <path d={d} stroke="rgba(250,240,214,0.9)" strokeWidth={3.4} />
            <path d={d} stroke={c.edge} strokeWidth={3.4} strokeDasharray="9 5" />
          </g>,
        );
        break;
      }
      case 'tempHex': {
        const c = colors(nations, o.side);
        const p = hexCenterId(o.hex, flipped);
        const ring = Array.from({ length: 6 }, (_, k) => corner(p, k, HEX_R - 4.5));
        const d = polyPath(ring);
        rings.push(
          <g key={`h${i}`} className="temp-hex" fill="none" strokeLinejoin="round">
            <title>{o.text}</title>
            <path d={d} stroke={INK} strokeWidth={5.6} opacity={0.5} />
            <path d={d} stroke={c.edge} strokeWidth={3.4} />
            <path d={d} stroke={c.edgeLight} strokeWidth={1} opacity={0.8} strokeDasharray="2 6" />
          </g>,
        );
        posts.push({ y: p.y, el: <Standard key={`hs${i}`} base={{ x: p.x - 27, y: p.y - 6 }} c={c} held={held} /> });
        break;
      }
      case 'exit':
        arrows.push(<ExitArrow key={`e${i}`} h={o.hex} flipped={flipped} c={colors(nations, o.side)} leaders={o.leadersScore} text={o.text} />);
        break;
      case 'majority': {
        // one outline per hex set: a contested group is one record per side over the same hexes
        const key = [...o.hexes].sort((a, b) => a - b).join(',');
        const g = groups.get(key);
        if (g) g.push(i);
        else groups.set(key, [i]);
        break;
      }
      case 'exitEdge':
        arrows.push(<ExitEdge key={`x${i}`} row={o.row} flipped={flipped} c={colors(nations, o.side)} text={o.text} />);
        break;
      case 'killWeight':
      case 'suddenDeath':
        break;
    }
  });

  for (const [key, idx] of groups) {
    const defs = idx.map((i) => objectives[i] as Extract<ObjectiveDef, { kind: 'majority' }>);
    const holder = idx.find((i) => objState[i]?.held);
    const side = holder === undefined ? null : objectives[holder].side;
    const c = side ? colors(nations, side) : null;
    const d = areaOutline(defs[0].hexes, flipped);
    // the held record's text; while nobody holds the group, every record's text
    const text = holder === undefined ? [...new Set(defs.map((o) => o.text))].join('\n') : defs[idx.indexOf(holder)].text;
    areas.push(
      <g key={`m${key}`} className={side ? `majority held-${side}` : 'majority'} fill="none" strokeLinejoin="round">
        <title>{text}</title>
        <path d={d} stroke={INK} strokeWidth={5.4} strokeLinecap="round" strokeDasharray="0.1 7" opacity={0.55} />
        <path d={d} stroke={c ? c.edge : PAPER} strokeWidth={3.6} strokeLinecap="round" strokeDasharray="0.1 7" />
      </g>,
    );
  }

  return (
    <g className="objective-markers" pointerEvents="none">
      {areas}
      {rings}
      {arrows}
      {posts.sort((a, b) => a.y - b.y).map((q) => q.el)}
    </g>
  );
}
