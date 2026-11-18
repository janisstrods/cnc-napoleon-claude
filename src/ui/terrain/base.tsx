// Grassland base, hex grid, section dividers and the map margin (neatline, graticule ticks, army cartouches).
import { BOARD_H, BOARD_MARGIN, BOARD_W, hexCenter } from '../geometry';
import { COLS, ROWS } from '../../engine/types';
import { blobPath } from './field';
import { corner, DIRS, edgeCorners, fmt, neighborRC, screenDir, type PaintCtx } from './hexmath';
import { rng } from './noise';
import { P } from './palette';

/** <defs> content shared by the grass base: gradients and tuft patterns. */
export function grassDefs(id: (s: string) => string): JSX.Element {
  const R = rng(17);
  const tufts = (n: number, size: number, color: string, op: number, seed: number) => {
    const Q = rng(seed);
    let d = '';
    for (let k = 0; k < n; k++) {
      const x = Q() * size;
      const y = Q() * size;
      const h = 3 + Q() * 3;
      d += `M${fmt(x)},${fmt(y)}l${fmt(-1.6 - Q())},${fmt(-h * 0.8)}M${fmt(x)},${fmt(y)}l${fmt((Q() - 0.5) * 0.8)},${fmt(-h)}M${fmt(x)},${fmt(y)}l${fmt(1.6 + Q())},${fmt(-h * 0.75)}`;
    }
    return <path d={d} fill="none" stroke={color} strokeWidth={0.8} strokeLinecap="round" opacity={op} />;
  };
  const dots = (n: number, size: number, color: string, seed: number) => {
    const Q = rng(seed);
    let d = '';
    for (let k = 0; k < n; k++) {
      const x = Q() * size;
      const y = Q() * size;
      d += `M${fmt(x)},${fmt(y)}h1.2`;
    }
    return <path d={d} fill="none" stroke={color} strokeWidth={1.2} strokeLinecap="round" opacity={0.55} />;
  };
  void R;
  return (
    <>
      <linearGradient id={id('grass')} x1="0" y1="0" x2="0.25" y2="1">
        <stop offset="0" stopColor={P.grassTop} />
        <stop offset="0.5" stopColor={P.grass} />
        <stop offset="1" stopColor={P.grassBottom} />
      </linearGradient>
      {(
        [
          ['blotL', P.grassLight, 0.5],
          ['blotD', P.grassDark, 0.3],
          ['blotO', P.grassOchre, 0.5],
        ] as const
      ).map(([k, c, o]) => (
        <radialGradient key={k} id={id(k)}>
          <stop offset="0" stopColor={c} stopOpacity={o} />
          <stop offset="0.55" stopColor={c} stopOpacity={o * 0.55} />
          <stop offset="1" stopColor={c} stopOpacity={0} />
        </radialGradient>
      ))}
      <pattern id={id('tuftA')} width={137} height={137} patternUnits="userSpaceOnUse">
        {tufts(16, 137, P.tuftDark, 0.5, 3)}
        {dots(10, 137, P.tuftDark, 5)}
      </pattern>
      <pattern id={id('tuftB')} width={89} height={89} patternUnits="userSpaceOnUse" patternTransform="rotate(17)">
        {tufts(7, 89, P.tuftLight, 0.55, 8)}
        {dots(5, 89, '#e9dfa6', 9)}
      </pattern>
    </>
  );
}

export function GrassBase({ id }: { id: (s: string) => string }) {
  const R = rng(2024);
  const blots: JSX.Element[] = [];
  const kinds = ['blotL', 'blotD', 'blotO', 'blotL', 'blotD'];
  for (let k = 0; k < 46; k++) {
    const x = BOARD_MARGIN + R() * (BOARD_W - 2 * BOARD_MARGIN);
    const y = BOARD_MARGIN + R() * (BOARD_H - 2 * BOARD_MARGIN);
    const rx = 60 + R() * 140;
    const ry = rx * (0.35 + R() * 0.4);
    const rot = (R() - 0.5) * 50;
    blots.push(
      <ellipse
        key={k}
        cx={fmt(x)}
        cy={fmt(y)}
        rx={fmt(rx)}
        ry={fmt(ry)}
        transform={`rotate(${fmt(rot)} ${fmt(x)} ${fmt(y)})`}
        fill={`url(#${id(kinds[k % kinds.length])})`}
      />,
    );
  }
  // painted brush dabs: small soft strokes of light/dark grass
  let dabL = '';
  let dabD = '';
  for (let k = 0; k < 140; k++) {
    const x = BOARD_MARGIN + R() * (BOARD_W - 2 * BOARD_MARGIN);
    const y = BOARD_MARGIN + R() * (BOARD_H - 2 * BOARD_MARGIN);
    const s = 5 + R() * 9;
    const b = blobPath(x, y, s, s * 0.45, R, 6, 0.3, (R() - 0.5) * 0.8);
    if (k % 2) dabL += b;
    else dabD += b;
  }
  const r = { x: 0, y: 0, width: BOARD_W, height: BOARD_H };
  return (
    <g className="grass">
      <rect {...r} fill={`url(#${id('grass')})`} />
      {blots}
      <path d={dabL} fill={P.grassLight} opacity={0.16} />
      <path d={dabD} fill={P.grassDark} opacity={0.14} />
      <rect {...r} fill={`url(#${id('tuftA')})`} />
      <rect {...r} fill={`url(#${id('tuftB')})`} />
    </g>
  );
}

/** Hex outlines: every shared edge drawn once. */
export function HexGrid({ ctx }: { ctx: PaintCtx }) {
  let d = '';
  for (const h of ctx.hexes) {
    for (const dir of DIRS) {
      const [nr, nc] = neighborRC(h.r, h.c, dir);
      const n = ctx.get(nr, nc);
      if (n && n.id < h.id) continue;
      const [i, j] = edgeCorners(screenDir(dir, ctx.flipped));
      const a = corner(h, i);
      const b = corner(h, j);
      d += `M${fmt(a.x)},${fmt(a.y)}L${fmt(b.x)},${fmt(b.y)}`;
    }
  }
  return (
    <g className="hexgrid" fill="none" strokeLinecap="round">
      <path d={d} stroke="rgba(255,246,214,0.16)" strokeWidth={1.1} transform="translate(0.9 1)" />
      <path d={d} stroke="rgba(42,36,16,0.36)" strokeWidth={1.1} />
    </g>
  );
}

export function SectionDividers({ x1, x2 }: { x1: number; x2: number }) {
  const y0 = BOARD_MARGIN;
  const y1 = BOARD_H - BOARD_MARGIN;
  return (
    <g className="dividers" fill="none" strokeLinecap="round">
      {[x1, x2].map((x, i) => (
        <g key={i}>
          <line x1={x} y1={y0} x2={x} y2={y1} stroke="rgba(38,30,12,0.4)" strokeWidth={3.6} strokeDasharray="5 6" />
          <line x1={x} y1={y0} x2={x} y2={y1} stroke="rgba(255,249,226,0.85)" strokeWidth={1.8} strokeDasharray="5 6" />
        </g>
      ))}
    </g>
  );
}

/** Map-margin inks: the margin is buff paper (the kit's `--kit-leather`), the rules iron-gall ink. */
const MARGIN_PAPER = 'var(--kit-leather, #f3ecd8)';
const CARTOUCHE_PAPER = 'var(--kit-parchment-light, #f6f0de)';
const RULE = '#3b3127';
const RULE_SOFT = 'rgba(59,49,39,0.62)';

/**
 * The board's surround, drawn as the margin of a printed map: buff paper outside the hexes, a neatline (a firm outer
 * rule and a fine inner one), graticule ticks at every hex row and column, ink lozenges where the sections divide, the
 * LEFT / RIGHT captions, and each army's name in a small cartouche.
 */
export function Frame({
  outline,
  x1,
  x2,
  topLabel,
  bottomLabel,
}: {
  outline: string;
  x1: number;
  x2: number;
  topLabel?: string;
  bottomLabel?: string;
}) {
  const W = BOARD_W;
  const H = BOARD_H;
  const m = BOARD_MARGIN;
  const frameD = `M0,0H${fmt(W)}V${fmt(H)}H0Z${outline}`;
  const left = (m + x1) / 2;
  const right = (x2 + W - m) / 2;
  // outer rule, inner rule
  const o = 4;
  const i = 8.5;
  // graticule: a short tick inside the inner rule at every column (even rows) and every row
  let ticks = '';
  for (let c = 0; c < COLS; c++) {
    const x = hexCenter(0, c).x;
    ticks += `M${fmt(x)},${fmt(i)}v5M${fmt(x)},${fmt(H - i)}v-5`;
  }
  for (let r = 0; r < ROWS; r++) {
    const y = hexCenter(r, 0).y;
    ticks += `M${fmt(i)},${fmt(y)}h5M${fmt(W - i)},${fmt(y)}h-5`;
  }
  const capStyle = { fontFamily: "'IM Fell English SC', serif", fontSize: 11, letterSpacing: 4 } as const;
  const caption = (txt: string, x: number, y: number, rot: boolean) => (
    <text
      x={fmt(x)}
      y={fmt(y)}
      textAnchor="middle"
      dominantBaseline="central"
      fill={RULE_SOFT}
      transform={rot ? `rotate(180 ${fmt(x)} ${fmt(y)})` : undefined}
      style={capStyle}
    >
      {txt}
    </text>
  );
  const cartouche = (label: string, cy: number) => {
    const fs = 16;
    const w = Math.max(120, label.length * fs * 0.74 + 40);
    const h = 24;
    const x = W / 2 - w / 2;
    const y = cy - h / 2;
    return (
      <g>
        <rect x={fmt(x)} y={fmt(y)} width={fmt(w)} height={h} fill={CARTOUCHE_PAPER} stroke={RULE} strokeWidth={1.2} />
        <rect x={fmt(x + 2.5)} y={fmt(y + 2.5)} width={fmt(w - 5)} height={h - 5} fill="none" stroke={RULE_SOFT} strokeWidth={0.6} />
        {[x - 7, x + w + 7].map((lx, k) => (
          <path key={k} d={`M${fmt(lx)},${fmt(cy - 3.5)}l3.5,3.5l-3.5,3.5l-3.5,-3.5z`} fill={RULE} />
        ))}
        <text
          x={fmt(W / 2)}
          y={fmt(cy + 0.5)}
          textAnchor="middle"
          dominantBaseline="central"
          fill={P.ink}
          style={{ fontFamily: "'IM Fell English SC', serif", fontSize: fs, letterSpacing: 2.5 }}
        >
          {label.toUpperCase()}
        </text>
      </g>
    );
  };
  const markers = [x1, x2].flatMap((x, k) => [
    <path key={`t${k}`} d={`M${fmt(x)},${fmt(m - 12)}l3,5l-3,5l-3,-5z`} fill={RULE} />,
    <path key={`b${k}`} d={`M${fmt(x)},${fmt(H - m + 2)}l3,5l-3,5l-3,-5z`} fill={RULE} />,
  ]);
  return (
    <g className="frame">
      <path d={frameD} fillRule="evenodd" fill={MARGIN_PAPER} />
      {/* the edge of the field: a fine ink line round the hexes */}
      <path d={outline} fill="none" stroke={RULE_SOFT} strokeWidth={1.1} />
      <rect x={o} y={o} width={W - 2 * o} height={H - 2 * o} fill="none" stroke={RULE} strokeWidth={2} />
      <rect x={i} y={i} width={W - 2 * i} height={H - 2 * i} fill="none" stroke={RULE_SOFT} strokeWidth={0.7} />
      <path d={ticks} stroke={RULE_SOFT} strokeWidth={0.7} />
      {markers}
      {caption('LEFT', left, H - m / 2, false)}
      {caption('RIGHT', right, H - m / 2, false)}
      {caption('LEFT', right, m / 2, true)}
      {caption('RIGHT', left, m / 2, true)}
      {topLabel && cartouche(topLabel, m / 2)}
      {bottomLabel && cartouche(bottomLabel, H - m / 2)}
    </g>
  );
}
