// Towns, windmills and fortresses (RR §4.1): one painter for the three rows. A town is a cluster of plastered, tile-roofed
// houses on trodden streets, filling the hex but for a margin; a windmill has fewer houses and a tower mill with sails; a
// fortress is a town inside a low stone wall with a tower at each corner. A Walled Farm (Expansion #1, a Town by the rules)
// has its own painter: one farmhouse and a barn in a walled yard with a gate, so it never reads as a town. Seen from the
// board's lower edge and lit from the upper left, like the hills.
import { blobPath } from './field';
import { corner, fmt, polyPath, type HexInfo, type PaintCtx, type Pt } from './hexmath';
import { rng } from './noise';
import { P } from './palette';

const isTown = (h: HexInfo) => h.t === 'town' || h.t === 'windmill' || h.t === 'fortress';

interface House {
  front: string;
  side: string;
  roofLit: string;
  roofShade: string;
  door: string;
  sh: string;
}

/** A house seen from the board's lower edge: plastered front, a tiled roof (ridge left to right, lit half and shaded half). */
function house(c: Pt, wdt: number, dep: number, ht: number, R: () => number): House {
  const x0 = c.x - wdt / 2;
  const x1 = c.x + wdt / 2;
  const yb = c.y + dep / 2;
  const yt = yb - ht;
  const ridge = yt - dep * 0.55;
  const back = yt - dep * 0.25;
  return {
    sh: polyPath([{ x: x0 + 2, y: yb + 1 }, { x: x1 + 4, y: yb + 1 }, { x: x1 + 4, y: yb - dep * 0.6 }, { x: x0 + 6, y: yb - dep * 0.6 }]),
    front: polyPath([{ x: x0, y: yb }, { x: x1, y: yb }, { x: x1, y: yt }, { x: x0, y: yt }]),
    side: polyPath([{ x: x1 - wdt * 0.18, y: yb }, { x: x1, y: yb }, { x: x1, y: yt }, { x: x1 - wdt * 0.18, y: yt }]),
    roofShade: polyPath([{ x: x0 - 1, y: yt + 0.6 }, { x: x1 + 1, y: yt + 0.6 }, { x: x1 - 1, y: ridge }, { x: x0 + 1, y: ridge }]),
    roofLit: polyPath([{ x: x0 + 1, y: ridge }, { x: x1 - 1, y: ridge }, { x: x1 - 2, y: back - 2 }, { x: x0 + 2, y: back - 2 }]),
    door: R() < 0.6 ? `M${fmt(x0 + wdt * (0.25 + R() * 0.4))},${fmt(yb)}v${fmt(-ht * 0.55)}` : '',
  };
}

function HouseView({ hs }: { hs: House }) {
  return (
    <g>
      <path d={hs.sh} fill="rgba(30,24,14,0.28)" />
      <path d={hs.front} fill={P.plaster} stroke={P.wallDark} strokeWidth={0.6} />
      <path d={hs.side} fill={P.plasterShade} />
      {hs.door && <path d={hs.door} stroke="#5a4428" strokeWidth={1.6} />}
      <path d={hs.roofShade} fill={P.roofShade} stroke={P.wallDark} strokeWidth={0.6} strokeLinejoin="round" />
      <path d={hs.roofLit} fill={P.roof} stroke={P.wallDark} strokeWidth={0.6} strokeLinejoin="round" />
      <path d={hs.roofLit} fill="none" stroke={P.roofLight} strokeWidth={0.6} opacity={0.8} transform="translate(-0.3 -0.4)" />
    </g>
  );
}

/** A tower mill: a tapering tower under a cap, four sails on the front. */
function Windmill({ at }: { at: Pt }) {
  const { x, y } = at;
  const hub = { x, y: y - 22 };
  const sail = (a: number): string => {
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const nx = -dy;
    const ny = dx;
    const p = (l: number, w: number): string => `${fmt(hub.x + dx * l + nx * w)},${fmt(hub.y + dy * l + ny * w)}`;
    return `M${p(4, 0)}L${p(26, 0)}L${p(26, 5.5)}L${p(9, 5.5)}z`;
  };
  return (
    <g>
      <ellipse cx={fmt(x + 3)} cy={fmt(y + 1)} rx={12} ry={3.4} fill="rgba(30,24,14,0.3)" />
      <path d={`M${fmt(x - 8)},${fmt(y)}L${fmt(x - 5)},${fmt(y - 21)}L${fmt(x + 5)},${fmt(y - 21)}L${fmt(x + 8)},${fmt(y)}z`} fill={P.plaster} stroke={P.wallDark} strokeWidth={0.8} strokeLinejoin="round" />
      <path d={`M${fmt(x + 2)},${fmt(y)}L${fmt(x + 3)},${fmt(y - 21)}L${fmt(x + 5)},${fmt(y - 21)}L${fmt(x + 8)},${fmt(y)}z`} fill={P.plasterShade} />
      <path d={`M${fmt(x - 6.5)},${fmt(y - 20.5)}L${fmt(x)},${fmt(y - 28)}L${fmt(x + 6.5)},${fmt(y - 20.5)}z`} fill={P.roof} stroke={P.wallDark} strokeWidth={0.8} strokeLinejoin="round" />
      {[0.5, 2.07, 3.64, 5.21].map((a) => (
        <path key={a} d={sail(a)} fill={P.canvas} stroke={P.wallDark} strokeWidth={0.8} strokeLinejoin="round" />
      ))}
      <circle cx={fmt(hub.x)} cy={fmt(hub.y)} r={2.2} fill={P.woodDark} />
    </g>
  );
}

/** A low stone wall round the hex with a round tower on each corner. */
function FortWall({ h }: { h: HexInfo }) {
  const ring = Array.from({ length: 6 }, (_, k) => corner(h, k, 36));
  const d = polyPath(ring);
  const towers = [...ring].sort((a, b) => a.y - b.y);
  return (
    <g>
      <path d={d} fill="none" stroke="rgba(30,24,14,0.35)" strokeWidth={8} strokeLinejoin="round" transform="translate(1.2 2)" />
      <path d={d} fill="none" stroke={P.wallDark} strokeWidth={7} strokeLinejoin="round" />
      <path d={d} fill="none" stroke={P.wallFace} strokeWidth={5.4} strokeLinejoin="round" />
      <path d={d} fill="none" stroke={P.wallTop} strokeWidth={2.2} strokeLinejoin="round" strokeDasharray="3 2" />
      {towers.map((t, i) => (
        <g key={i}>
          <circle cx={fmt(t.x)} cy={fmt(t.y)} r={5.6} fill={P.wallFace} stroke={P.wallDark} strokeWidth={1} />
          <circle cx={fmt(t.x - 0.8)} cy={fmt(t.y - 0.8)} r={3.4} fill={P.wallTop} stroke={P.wallShade} strokeWidth={0.6} />
        </g>
      ))}
    </g>
  );
}

/** The houses of one hex, on a staggered grid with some lanes left open, back to front. */
function townHex(h: HexInfo, ctx: PaintCtx): JSX.Element {
  const R = rng(3031 + h.id * 7 + (ctx.flipped ? 1 : 0));
  const reach = h.t === 'fortress' ? 24 : 30;
  const spots: { c: Pt; w: number; d: number; h: number }[] = [];
  for (let dy = -reach; dy <= reach + 2; dy += 10) {
    const row = Math.round((dy + reach) / 10);
    for (let dx = -reach - 4 + (row % 2 ? 6.5 : 0); dx <= reach + 4; dx += 13) {
      if (R() < (h.t === 'windmill' ? 0.55 : 0.14)) continue;
      // keep each house inside the hexagon, clear of the windmill's spot
      if (Math.hypot(dx, dy) > reach + 4) continue;
      if (h.t === 'windmill' && Math.hypot(dx - 8, dy - 10) < 16) continue;
      spots.push({ c: { x: h.x + dx + (R() - 0.5) * 2.5, y: h.y + dy + (R() - 0.5) * 2 }, w: 9 + R() * 4, d: 6 + R() * 2, h: 4 + R() * 2.5 });
    }
  }
  spots.sort((a, b) => a.c.y - b.c.y);
  const ground = polyPath(Array.from({ length: 6 }, (_, k) => corner(h, k, 38)));
  return (
    <g key={h.id}>
      <path d={ground} fill={P.street} stroke={P.street} strokeWidth={6} strokeLinejoin="round" opacity={0.9} />
      {h.t === 'fortress' && <FortWall h={h} />}
      {spots.map((s, k) => (
        <HouseView key={k} hs={house(s.c, s.w, s.d, s.h, R)} />
      ))}
      {h.t === 'windmill' && <Windmill at={{ x: h.x + 8, y: h.y + 10 }} />}
    </g>
  );
}

/** Every town, windmill and fortress hex of `ctx`, then every Walled Farm (`paintWalledFarm`) in its own layer. */
export function paintTowns(ctx: PaintCtx): JSX.Element | null {
  const hs = ctx.hexes.filter(isTown);
  const farms = paintWalledFarm(ctx);
  if (!hs.length) return farms;
  const towns = <g className="towns">{hs.map((h) => townHex(h, ctx))}</g>;
  return farms ? <>{towns}{farms}</> : towns;
}

/** A thatched or tiled roof for a farm building (`thatch`: the barn's straw roof instead of tiles). */
const FARM_ROOF = { tile: { lit: P.roof, shade: P.roofShade, light: P.roofLight }, thatch: { lit: '#a88a4a', shade: '#7a6236', light: '#c9ad6a' } };

function FarmBuilding({ hs, thatch = false }: { hs: House; thatch?: boolean }) {
  const r = FARM_ROOF[thatch ? 'thatch' : 'tile'];
  return (
    <g className="farm-building">
      <path d={hs.sh} fill="rgba(30,24,14,0.28)" />
      <path d={hs.front} fill={P.plaster} stroke={P.wallDark} strokeWidth={0.6} />
      <path d={hs.side} fill={P.plasterShade} />
      {hs.door && <path d={hs.door} stroke="#5a4428" strokeWidth={1.8} />}
      <path d={hs.roofShade} fill={r.shade} stroke={P.wallDark} strokeWidth={0.6} strokeLinejoin="round" />
      <path d={hs.roofLit} fill={r.lit} stroke={P.wallDark} strokeWidth={0.6} strokeLinejoin="round" />
      <path d={hs.roofLit} fill="none" stroke={r.light} strokeWidth={0.6} opacity={0.8} transform="translate(-0.3 -0.4)" />
    </g>
  );
}

/**
 * A walled farm: a low rubble wall round a yard of trodden earth (a gate in the front wall), a long farmhouse against the
 * back wall, a thatched barn to one side and a single tree in the yard. Three shapes and a wall: nothing like the town's
 * crowd of roofs.
 */
function farmHex(h: HexInfo, ctx: PaintCtx): JSX.Element {
  const R = rng(5077 + h.id * 11 + (ctx.flipped ? 1 : 0));
  const j = () => (R() - 0.5) * 3;
  const at = (x: number, y: number): Pt => ({ x: h.x + x, y: h.y + y });
  // the enclosure, a slightly skewed quadrilateral; corners clockwise from the back left
  const ring = [at(-29 + j(), -23 + j()), at(28 + j(), -25 + j()), at(30 + j(), 23 + j()), at(-28 + j(), 25 + j())];
  // the gate: a gap in the front wall (from ring[2] to ring[3]), left of centre
  const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const g0 = lerp(ring[2], ring[3], 0.5);
  const g1 = lerp(ring[2], ring[3], 0.72);
  const wall = polyPath([g0, ring[2], ring[1], ring[0], ring[3], g1], false);
  const yard = polyPath(ring);
  const houseHs = house(at(-4, -9), 36, 12, 9, R);
  const barnHs = house(at(16, 11), 18, 12, 8, R);
  const tree = at(-17, 10);
  const T = rng(911 + h.id);
  const wallStroke = (stroke: string, w: number, extra: Record<string, unknown> = {}) => (
    <path d={wall} fill="none" stroke={stroke} strokeWidth={w} strokeLinejoin="round" strokeLinecap="butt" {...extra} />
  );
  return (
    <g key={h.id}>
      <path d={yard} fill={P.street} stroke={P.street} strokeWidth={3} strokeLinejoin="round" opacity={0.6} />
      <g className="farm-wall">
        {wallStroke('rgba(30,24,14,0.32)', 5.5, { transform: 'translate(1.1 1.8)' })}
        {wallStroke(P.wallDark, 4.6)}
        {wallStroke(P.wallFace, 3.2)}
        {wallStroke(P.wallTop, 1.1, { transform: 'translate(-0.4 -0.6)', opacity: 0.9 })}
        {[g0, g1].map((p, k) => (
          <rect key={k} x={fmt(p.x - 2.4)} y={fmt(p.y - 3.4)} width={4.8} height={4.8} fill={P.wallFace} stroke={P.wallDark} strokeWidth={0.9} />
        ))}
      </g>
      <FarmBuilding hs={houseHs} />
      <FarmBuilding hs={barnHs} thatch />
      <ellipse cx={fmt(tree.x + 2.5)} cy={fmt(tree.y + 3)} rx={7} ry={4.6} fill={P.treeShadow} />
      <path d={blobPath(tree.x, tree.y, 6.6, 6.2, T, 8, 0.14)} fill={P.leafDark} />
      <path d={blobPath(tree.x - 1.2, tree.y - 1.4, 4.6, 4.2, T, 7, 0.16)} fill={P.leafMid} />
      <path d={blobPath(tree.x - 2.3, tree.y - 2.6, 2.2, 2, T, 6, 0.2)} fill={P.leafLight} opacity={0.9} />
    </g>
  );
}

/** Every Walled Farm hex of `ctx`. */
export function paintWalledFarm(ctx: PaintCtx): JSX.Element | null {
  const hs = ctx.hexes.filter((h) => h.t === 'walledFarm');
  if (!hs.length) return null;
  return <g className="walled-farm">{hs.map((h) => farmHex(h, ctx))}</g>;
}
