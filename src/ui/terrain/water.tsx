// Rivers with their crossings: a ford (stepping stones on a sand bar), a brook (a narrow stream) and a bridge (a plank deck).
import { DIRS, fmt, isWater, neighborRC, polyPath, RI, type Dir, type HexInfo, type PaintCtx, type Pt } from './hexmath';
import { fbm, rng } from './noise';
import { P } from './palette';
import { add, len, mul, sub, unit } from './vec';

type PortKind = 'hex' | 'off' | 'end';
interface Port {
  d: Dir;
  kind: PortKind;
}

interface Key {
  p: Pt;
  t: Pt; // unit tangent (direction of travel)
  hex: number; // owning hex id for the segment that ENDS at this key
  end?: boolean; // dead end of a river inside the board
}

/**
 * Where the river leaves hex h: every neighbouring water hex, plus (for a river end) the
 * board edge it flows off - preferring the edge straight ahead - or an in-board dead end.
 */
function portsOf(ctx: PaintCtx, h: HexInfo): Port[] {
  const links: Port[] = [];
  const off: Dir[] = [];
  for (const d of DIRS) {
    const [r, c] = neighborRC(h.r, h.c, d);
    const n = ctx.get(r, c);
    if (!n) off.push(d);
    else if (isWater(n.t)) links.push({ d, kind: 'hex' });
  }
  if (links.length >= 2) return links;
  if (links.length === 1) {
    const opp = ((links[0].d + 3) % 6) as Dir;
    if (off.length) {
      const dist = (d: Dir) => Math.min(Math.abs(d - opp), 6 - Math.abs(d - opp));
      const best = [...off].sort((a, b) => dist(a) - dist(b))[0];
      return [links[0], { d: best, kind: 'off' }];
    }
    return [links[0], { d: opp, kind: 'end' }];
  }
  const [a, b] = ctx.lonePorts ?? ([3, 0] as [Dir, Dir]);
  return [
    { d: a, kind: off.includes(a) ? 'off' : 'end' },
    { d: b, kind: off.includes(b) ? 'off' : 'end' },
  ];
}

interface RiverGeom {
  chains: Key[][];
}

function traceRivers(ctx: PaintCtx): RiverGeom {
  const rivers = ctx.hexes.filter((h) => isWater(h.t));
  const ports = new Map<number, Port[]>();
  for (const h of rivers) ports.set(h.id, portsOf(ctx, h));
  const nb = (h: HexInfo, d: Dir) => {
    const [r, c] = neighborRC(h.r, h.c, d);
    return ctx.get(r, c);
  };
  const center = (h: HexInfo): Pt => ({ x: h.x, y: h.y });
  const mid = (h: HexInfo, d: Dir): Pt => {
    const [r, c] = neighborRC(h.r, h.c, d);
    const o = ctx.center(r, c);
    return { x: (h.x + o.x) / 2, y: (h.y + o.y) / 2 };
  };
  const out = (h: HexInfo, d: Dir): Pt => unit(sub(mid(h, d), center(h)));
  const visited = new Set<string>();
  const vkey = (id: number, d: Dir) => `${id}:${d}`;
  const chains: Key[][] = [];

  const isTerminal = (p: Port) => p.kind !== 'hex';
  const isJunction = (h: HexInfo) => (ports.get(h.id)?.length ?? 0) >= 3;

  // walk from hex h leaving through port `p`, with keys already containing the start.
  const walk = (start: HexInfo, p: Port, keys: Key[]) => {
    let h = start;
    let port = p;
    for (let guard = 0; guard < 200; guard++) {
      visited.add(vkey(h.id, port.d));
      const m = mid(h, port.d);
      const u = out(h, port.d);
      keys.push({ p: m, t: u, hex: h.id });
      if (port.kind === 'off') {
        keys.push({ p: add(m, mul(u, ctx.ext)), t: u, hex: h.id });
        return;
      }
      if (port.kind === 'end') {
        keys[keys.length - 1].end = true;
        return;
      }
      const n = nb(h, port.d);
      if (!n) return;
      const back = ((port.d + 3) % 6) as Dir;
      visited.add(vkey(n.id, back));
      const np = ports.get(n.id) ?? [];
      if (np.length >= 3) {
        keys.push({ p: center(n), t: u, hex: n.id });
        return;
      }
      const next = np.find((q) => q.d !== back);
      if (!next) {
        keys.push({ p: center(n), t: u, hex: n.id });
        return;
      }
      const t = unit(sub(mid(n, next.d), mid(n, back)));
      keys.push({ p: center(n), t, hex: n.id });
      if (visited.has(vkey(n.id, next.d))) return;
      h = n;
      port = next;
    }
  };

  // 1) chains starting at terminal ports
  for (const h of rivers) {
    const ps = ports.get(h.id)!;
    if (isJunction(h)) continue;
    for (const tp of ps) {
      if (!isTerminal(tp) || visited.has(vkey(h.id, tp.d))) continue;
      const other = ps.find((q) => q !== tp)!;
      visited.add(vkey(h.id, tp.d));
      const u = out(h, tp.d);
      const m = mid(h, tp.d);
      const keys: Key[] = [];
      const inward = mul(u, -1);
      if (tp.kind === 'off') keys.push({ p: add(m, mul(u, ctx.ext)), t: inward, hex: h.id });
      keys.push({ p: m, t: inward, hex: h.id, end: tp.kind === 'end' });
      keys.push({ p: center(h), t: unit(sub(mid(h, other.d), m)), hex: h.id });
      if (visited.has(vkey(h.id, other.d))) continue;
      walk(h, other, keys);
      chains.push(keys);
    }
  }
  // 2) chains leaving junctions
  for (const h of rivers) {
    if (!isJunction(h)) continue;
    for (const p of ports.get(h.id)!) {
      if (visited.has(vkey(h.id, p.d))) continue;
      const keys: Key[] = [{ p: center(h), t: out(h, p.d), hex: h.id }];
      walk(h, p, keys);
      chains.push(keys);
    }
  }
  // 3) closed loops (rare): start anywhere unvisited
  for (const h of rivers) {
    for (const p of ports.get(h.id)!) {
      if (visited.has(vkey(h.id, p.d))) continue;
      const other = ports.get(h.id)!.find((q) => q !== p)!;
      const keys: Key[] = [{ p: center(h), t: unit(sub(mid(h, p.d), mid(h, other.d))), hex: h.id }];
      walk(h, p, keys);
      chains.push(keys);
    }
  }
  return { chains };
}

interface Sample {
  p: Pt;
  n: Pt; // unit normal (left)
  hw: number; // half width
  hex: number;
  cap?: boolean; // round cap here (dead end)
}

/**
 * Densely sample a chain of keys with cubic Hermite segments, plus a gentle meander: every
 * segment bows sideways by an amount proportional to its length with alternating sign, which
 * keeps the curve tangent-continuous while still passing through every key point.
 */
function sampleChain(keys: Key[], hwAt: (p: Pt) => number, meander: number, sign0: number): Sample[] {
  const pts: { p: Pt; hex: number }[] = [];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    const L = len(sub(b.p, a.p));
    const k = L * 0.42;
    const c1 = add(a.p, mul(a.t, k));
    const c2 = sub(b.p, mul(b.t, k));
    const n = Math.max(4, Math.ceil(L / 4));
    const amp = (i % 2 === 0 ? 1 : -1) * sign0 * meander * L;
    for (let s = i === 0 ? 0 : 1; s <= n; s++) {
      const t = s / n;
      const mt = 1 - t;
      const x = mt * mt * mt * a.p.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t * t * t * b.p.x;
      const y = mt * mt * mt * a.p.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t * t * t * b.p.y;
      const dx = 3 * mt * mt * (c1.x - a.p.x) + 6 * mt * t * (c2.x - c1.x) + 3 * t * t * (b.p.x - c2.x);
      const dy = 3 * mt * mt * (c1.y - a.p.y) + 6 * mt * t * (c2.y - c1.y) + 3 * t * t * (b.p.y - c2.y);
      const tl = Math.hypot(dx, dy) || 1;
      const off = amp * Math.sin(Math.PI * t);
      // a sample exactly on a key belongs to both segments; tag it with the segment's hex
      pts.push({ p: { x: x - (dy / tl) * off, y: y + (dx / tl) * off }, hex: b.hex });
    }
  }
  const out: Sample[] = [];
  const arc: number[] = [0];
  for (let i = 1; i < pts.length; i++) arc.push(arc[i - 1] + len(sub(pts[i].p, pts[i - 1].p)));
  const total = arc[arc.length - 1];
  const startEnd = !!keys[0].end;
  const endEnd = !!keys[keys.length - 1].end;
  const taper = (d: number) => {
    const t = Math.max(0, Math.min(1, d / 30));
    return 0.5 + 0.5 * t * t * (3 - 2 * t);
  };
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)].p;
    const b = pts[Math.min(pts.length - 1, i + 1)].p;
    const t = unit(sub(b, a));
    let hw = hwAt(pts[i].p);
    if (startEnd) hw *= taper(arc[i]);
    if (endEnd) hw *= taper(total - arc[i]);
    out.push({ p: pts[i].p, n: { x: -t.y, y: t.x }, hw, hex: pts[i].hex });
  }
  if (out.length) {
    if (startEnd) out[0].cap = true;
    if (endEnd) out[out.length - 1].cap = true;
  }
  return out;
}

function ribbon(s: Sample[], extra: number, scale = 1): string {
  if (s.length < 2) return '';
  const w = (q: Sample) => Math.max(0.5, q.hw * scale + extra);
  const left = s.map((q) => add(q.p, mul(q.n, w(q))));
  const right = s.map((q) => sub(q.p, mul(q.n, w(q)))).reverse();
  const cap = (q: Sample, dir: 1 | -1): Pt[] => {
    const t = { x: q.n.y, y: -q.n.x };
    const out: Pt[] = [];
    for (let k = 1; k < 8; k++) {
      const th = (k / 8) * Math.PI;
      const c = dir === 1 ? Math.cos(th) : -Math.cos(th);
      out.push(add(q.p, add(mul(q.n, w(q) * c), mul(t, dir * w(q) * Math.sin(th)))));
    }
    return out;
  };
  const first = s[0];
  const last = s[s.length - 1];
  return polyPath([...left, ...(last.cap ? cap(last, 1) : []), ...right, ...(first.cap ? cap(first, -1) : [])]);
}

/** Samples of a chain that belong to hex `id` (including the boundary samples on both ends). */
function hexRun(s: Sample[], id: number): Sample[][] {
  const runs: Sample[][] = [];
  let cur: Sample[] | null = null;
  for (let i = 0; i < s.length; i++) {
    if (s[i].hex === id) {
      if (!cur) {
        cur = [];
        if (i > 0) cur.push(s[i - 1]);
      }
      cur.push(s[i]);
    } else if (cur) {
      runs.push(cur);
      cur = null;
    }
  }
  if (cur) runs.push(cur);
  return runs;
}

/**
 * Rivers with their crossings. A ford has stepping stones on a sand bar across the stream (`ford` and `fordNoStop`), a brook
 * is a narrow, shallow stream, a bridge a plank deck across the river.
 */
export function paintRivers(ctx: PaintCtx): JSX.Element | null {
  const rivers = ctx.hexes.filter((h) => isWater(h.t));
  if (!rivers.length) return null;
  const { chains } = traceRivers(ctx);
  const fords = rivers.filter((h) => h.ford);
  const bridges = rivers.filter((h) => h.t === 'bridge');
  const brooks = new Set(rivers.filter((h) => h.t === 'brook').map((h) => h.id));
  const baseHW = 13.5;
  const hwAt = (p: Pt) => {
    let w = baseHW * (0.86 + 0.32 * fbm(p.x / 45, p.y / 45, 7));
    for (const f of fords) {
      const d = Math.hypot(p.x - f.x, p.y - f.y) / RI;
      if (d < 1) w += 5.5 * (1 - d * d) * (1 - d * d);
    }
    // a brook is half as wide as the river, tapering in over the hex's own boundary
    for (const h of rivers) {
      if (!brooks.has(h.id)) continue;
      const d = Math.hypot(p.x - h.x, p.y - h.y) / RI;
      if (d < 1) w -= w * 0.48 * (1 - d * d);
    }
    return w;
  };
  const samples = chains.map((c, i) => sampleChain(c, hwAt, 0.085, i % 2 ? -1 : 1));
  const all = (extra: number, scale = 1) => samples.map((s) => ribbon(s, extra, scale)).join('');

  // glints: short strokes parallel to the flow, offset from the centre line
  let glints = '';
  samples.forEach((s, ci) => {
    const R = rng(911 + ci * 31);
    for (let i = 4; i < s.length - 6; i += 7 + Math.floor(R() * 5)) {
      const q = s[i];
      const hx = rivers.find((h) => h.id === q.hex);
      if (hx?.ford || hx?.t === 'bridge') continue;
      const side = R() < 0.5 ? -1 : 1;
      const o = q.hw * (0.25 + R() * 0.35) * side;
      const a = add(q.p, mul(q.n, o));
      const b = s[Math.min(s.length - 1, i + 2 + Math.floor(R() * 2))];
      const bb = add(b.p, mul(b.n, o));
      glints += `M${fmt(a.x)},${fmt(a.y)}L${fmt(bb.x)},${fmt(bb.y)}`;
    }
  });

  // fords
  let fordBank = '';
  let fordWater = '';
  let fordSand = '';
  let stones = '';
  let stoneHi = '';
  let ripples = '';
  for (const f of fords) {
    for (const s of samples) {
      for (const run of hexRun(s, f.id)) {
        fordBank += ribbon(run, 3.5);
        fordWater += ribbon(run, 0);
        // the sample closest to the hex centre carries the crossing
        let best = run[0];
        for (const q of run) if (Math.hypot(q.p.x - f.x, q.p.y - f.y) < Math.hypot(best.p.x - f.x, best.p.y - f.y)) best = q;
        const R = rng(1000 + f.id * 7);
        const tng = { x: best.n.y, y: -best.n.x };
        const w = best.hw;
        // sand bar across the flow
        const bar: Pt[] = [];
        const nb = 10;
        for (let k = 0; k < nb; k++) {
          const a = (k / nb) * Math.PI * 2;
          const along = Math.cos(a) * (w + 3);
          const across = Math.sin(a) * (6.5 + R() * 1.5);
          bar.push(add(best.p, add(mul(best.n, along), mul(tng, across))));
        }
        fordSand += polyPath(bar);
        // stepping stones
        const nst = 5;
        for (let k = 0; k < nst; k++) {
          const along = -w * 0.8 + (k / (nst - 1)) * w * 1.6;
          const jig = (k % 2 === 0 ? 1.6 : -1.6) + (R() - 0.5) * 1.5;
          const c = add(best.p, add(mul(best.n, along), mul(tng, jig)));
          const rx = 3.1 + R() * 1.0;
          const ry = 2.5 + R() * 0.8;
          const st: Pt[] = [];
          for (let m = 0; m < 7; m++) {
            const a = (m / 7) * Math.PI * 2 + R() * 0.3;
            st.push({ x: c.x + Math.cos(a) * rx * (0.85 + R() * 0.3), y: c.y + Math.sin(a) * ry * (0.85 + R() * 0.3) });
          }
          stones += polyPath(st);
          stoneHi += `M${fmt(c.x - rx * 0.45)},${fmt(c.y - ry * 0.35)}l${fmt(rx * 0.6)},${fmt(-ry * 0.2)}`;
        }
        // ripples up/downstream of the crossing
        for (const dir of [-1, 1]) {
          for (let k = 0; k < 2; k++) {
            const off = (10 + k * 6) * dir;
            const ctr = add(best.p, mul(tng, off));
            const half = w * (0.55 - k * 0.15);
            const a = add(ctr, mul(best.n, -half));
            const b = add(ctr, mul(best.n, half));
            const cc = add(ctr, mul(tng, 2.5 * dir));
            ripples += `M${fmt(a.x)},${fmt(a.y)}Q${fmt(cc.x)},${fmt(cc.y)} ${fmt(b.x)},${fmt(b.y)}`;
          }
        }
      }
    }
  }

  // bridges: a plank deck across the flow, with rails
  let deckShadow = '';
  let deck = '';
  let planks = '';
  let rails = '';
  for (const b of bridges) {
    for (const s of samples) {
      for (const run of hexRun(s, b.id)) {
        let best = run[0];
        for (const q of run) if (Math.hypot(q.p.x - b.x, q.p.y - b.y) < Math.hypot(best.p.x - b.x, best.p.y - b.y)) best = q;
        const tng = { x: best.n.y, y: -best.n.x };
        const half = best.hw + 7;
        const hl = 6.5; // half the deck's length along the flow
        const corner4 = (a: number, t: number): Pt => add(best.p, add(mul(best.n, a), mul(tng, t)));
        const quad = (a: number, t: number) => polyPath([corner4(-a, -t), corner4(a, -t), corner4(a, t), corner4(-a, t)]);
        deckShadow += polyPath([corner4(-half + 1.5, -hl + 2.5), corner4(half + 1.5, -hl + 2.5), corner4(half + 1.5, hl + 2.5), corner4(-half + 1.5, hl + 2.5)]);
        deck += quad(half, hl);
        for (let k = -half + 3; k < half - 1; k += 3.4) planks += `M${fmt(corner4(k, -hl).x)},${fmt(corner4(k, -hl).y)}L${fmt(corner4(k, hl).x)},${fmt(corner4(k, hl).y)}`;
        for (const t of [-hl, hl]) rails += `M${fmt(corner4(-half, t).x)},${fmt(corner4(-half, t).y)}L${fmt(corner4(half, t).x)},${fmt(corner4(half, t).y)}`;
      }
    }
  }

  const layers = (
    <>
      <path d={all(10)} fill={P.verge} opacity={0.32} />
      <path d={all(4.2)} fill={P.bank} opacity={0.8} />
      <path d={all(0)} fill={P.water} />
      <path d={all(-1.4)} fill="none" stroke={P.waterEdge} strokeWidth={1.4} opacity={0.6} />
      <path d={all(0, 0.48)} fill={P.waterDeep} opacity={0.85} />
      <path d={all(0, 0.2)} fill={P.waterDeeper} opacity={0.6} />
      {fords.length > 0 && (
        <g className="fords">
          <path d={fordBank} fill={P.sandDark} />
          <path d={fordWater} fill={P.waterShallow} />
          <path d={fordWater} fill="none" stroke={P.waterShallowEdge} strokeWidth={2} opacity={0.8} />
          <path d={fordSand} fill={P.sand} opacity={0.92} />
          <path d={ripples} fill="none" stroke="rgba(240,248,245,0.7)" strokeWidth={1.1} strokeLinecap="round" />
          <path d={stones} fill={P.stone} stroke={P.stoneDark} strokeWidth={0.9} />
          <path d={stoneHi} fill="none" stroke={P.stoneLight} strokeWidth={1} strokeLinecap="round" />
        </g>
      )}
      <path d={glints} fill="none" stroke={P.glint} strokeWidth={1.3} strokeLinecap="round" />
      {bridges.length > 0 && (
        <g className="bridges">
          <path d={deckShadow} fill="rgba(16,30,40,0.38)" />
          <path d={deck} fill={P.woodLight} stroke={P.woodDark} strokeWidth={1.1} strokeLinejoin="round" />
          <path d={planks} fill="none" stroke={P.woodDark} strokeWidth={0.7} opacity={0.7} />
          <path d={rails} fill="none" stroke={P.woodDark} strokeWidth={2.2} strokeLinecap="round" />
          <path d={rails} fill="none" stroke={P.palisadeLight} strokeWidth={0.9} strokeLinecap="round" />
        </g>
      )}
    </>
  );
  return <g className="rivers">{layers}</g>;
}
