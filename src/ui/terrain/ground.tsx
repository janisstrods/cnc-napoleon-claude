// Sand quarries: a pale, sandy patch with a few stones and wheel ruts.
import { isoPath } from './field';
import { fmt, hexBoundaryDist, polyPath, type PaintCtx, type Pt } from './hexmath';
import { rng } from './noise';
import { P } from './palette';
import { regionGrid } from './hills';

export function paintQuarry(ctx: PaintCtx): JSX.Element | null {
  const hs = ctx.hexes.filter((h) => h.t === 'sandQuarry');
  if (!hs.length) return null;
  const g = regionGrid(ctx, 'sandQuarry', 3, 3, 0.4, 13, 51);
  const sand = isoPath(g, 0.5);
  const patches = isoPath(g, 0.8);
  const R = rng(613 + hs[0].id);
  let stones = '';
  let stoneSh = '';
  let stoneHi = '';
  let ruts = '';
  let ripples = '';
  for (const h of hs) {
    for (let k = 0; k < 12; k++) {
      const a = R() * Math.PI * 2;
      const big = k < 4;
      const d = big ? hexBoundaryDist(a) - 9 - R() * 6 : 8 + R() * (hexBoundaryDist(a) - 14);
      const x = h.x + Math.cos(a) * d;
      const y = h.y + Math.sin(a) * d;
      const r = big ? 3.2 + R() * 2.2 : 1.5 + R() * 1.6;
      const pts: Pt[] = [];
      const n = 6;
      const ph = R() * 6;
      for (let m = 0; m < n; m++) {
        const b = ph + (m / n) * Math.PI * 2;
        const rr = r * (0.75 + R() * 0.45);
        pts.push({ x: x + Math.cos(b) * rr, y: y + Math.sin(b) * rr * 0.72 });
      }
      stoneSh += polyPath(pts.map((p) => ({ x: p.x + r * 0.35, y: p.y + r * 0.45 })));
      stones += polyPath(pts);
      stoneHi += `M${fmt(x - r * 0.5)},${fmt(y - r * 0.25)}l${fmt(r * 0.55)},${fmt(-r * 0.3)}`;
    }
    for (let k = 0; k < 3; k++) {
      const a = R() * Math.PI * 2;
      const d = 14 + R() * 16;
      const x = h.x + Math.cos(a) * d;
      const y = h.y + Math.sin(a) * d;
      const b = R() * Math.PI;
      const l = 6 + R() * 6;
      ruts += `M${fmt(x - Math.cos(b) * l)},${fmt(y - Math.sin(b) * l)}q${fmt(Math.cos(b) * l + 2)},${fmt(Math.sin(b) * l - 2)} ${fmt(Math.cos(b) * 2 * l)},${fmt(Math.sin(b) * 2 * l)}`;
    }
    for (let k = 0; k < 5; k++) {
      const x = h.x + (R() - 0.5) * 56;
      const y = h.y + (R() - 0.5) * 48;
      const w = 6 + R() * 6;
      ripples += `M${fmt(x - w)},${fmt(y)}q${fmt(w / 2)},-2 ${fmt(w)},0q${fmt(w / 2)},2 ${fmt(w)},0`;
    }
  }
  return (
    <g className="quarry">
      <path d={sand} fill={P.sand} opacity={0.85} />
      <path d={patches} fill={P.sandDark} opacity={0.3} />
      <path d={ripples} fill="none" stroke={P.sandDark} strokeWidth={1} strokeLinecap="round" opacity={0.55} />
      <path d={ruts} fill="none" stroke={P.bank} strokeWidth={1.1} opacity={0.45} strokeLinecap="round" />
      <path d={stoneSh} fill="rgba(40,32,18,0.3)" />
      <path d={stones} fill={P.stone} stroke={P.stoneDark} strokeWidth={0.7} />
      <path d={stoneHi} fill="none" stroke={P.stoneLight} strokeWidth={0.9} strokeLinecap="round" />
    </g>
  );
}
