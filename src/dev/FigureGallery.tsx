// Dev gallery for the Napoleonic miniatures.
//   #/gallery/figures                      every section: Infantry, Cavalry, Artillery, Leaders
//   #/gallery/figures/<filter>             infantry | cavalry | artillery | leaders, or a comma list of keys (FR-LN,BR-LN)
//   #/gallery/figures/single/<KEY>         one key's four figures (or four gun pieces) at x6, e.g. single/FR-LN
//   #/gallery/figures/board                two facing lines of hexes at board scale, with an attached leader per side
//   #/gallery/figures/bands                measures every figure's ink profile (FIGURE_BANDS) and prints it as JSON in
//                                          <pre id="bands">; scripts/art-bands.ts reads it and rewrites src/art/nap/slots.ts
// Each section has a board-scale row (x0.75) on grass, the same row on the darkest terrain colour, and a large row (x2.5).
import { createElement, useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { ARM_OF, CODE_NAMES, NATION_NAMES, codeOf, nationOf } from '../engine/codes';
import { HEX_R, HEX_W, ROW_H, hexPoints } from '../ui/geometry';
import { P } from '../ui/terrain/palette';
import {
  ART_KEYS, ART_NATIONS, NAP_LEADER_ATTACH_OFFSET, NapLeaderToken, NapUnitToken, isArtKey, type ArtKey, type ArtNation,
} from '../art/nap';
import { FacingRightCtx } from '../art/nap/draw';
import { NapMiniature } from '../art/nap/token';
import { HorseHolderFigure } from '../art/nap/gun';
import { artNationOf } from '../art/nap/keys';
import { NATION_LOOKS } from '../art/nap/nations';
import { ICON_BOX, type BandKey } from '../art/nap/slots';
import { FIGURE_SPECS } from '../art/nap/specs';

const BOARD = 0.75;
const LARGE = 2.5;
const SINGLE = 6;
const GRASS = P.grass;
const GRASS_EDGE = '#6b7a3a';

/** The darkest solid colour of the terrain palette, by luminance. */
const DARKEST = (() => {
  const solid = Object.values(P).flat().filter((c): c is string => /^#[0-9a-f]{6}$/i.test(c));
  const lum = (c: string) => 0.2126 * parseInt(c.slice(1, 3), 16) + 0.7152 * parseInt(c.slice(3, 5), 16) + 0.0722 * parseInt(c.slice(5, 7), 16);
  return solid.reduce((a, b) => (lum(b) < lum(a) ? b : a));
})();

/** Blocks at full strength: artillery has 3 in play, everything else 4. */
const maxOf = (k: ArtKey) => (ARM_OF[codeOf(k)] === 'artillery' ? 3 : 4);
type Filter = { keys: ArtKey[]; leaders: boolean; sections: ('infantry' | 'cavalry' | 'artillery')[] };

function parse(route: string): { mode: 'board' } | { mode: 'bands' } | { mode: 'single'; key: ArtKey | null } | ({ mode: 'list' } & Filter) {
  const rest = route.replace(/^#?\/?gallery\/figures\/?/, '');
  if (rest === 'board') return { mode: 'board' };
  if (rest === 'bands') return { mode: 'bands' };
  if (rest.startsWith('single/')) {
    const k = rest.slice(7).replace('-', '/');
    return { mode: 'single', key: isArtKey(k) ? k : null };
  }
  const all: Filter = { keys: [...ART_KEYS], leaders: true, sections: ['infantry', 'cavalry', 'artillery'] };
  if (rest === '') return { mode: 'list', ...all };
  if (rest === 'leaders') return { mode: 'list', keys: [], leaders: true, sections: [] };
  if (rest === 'infantry' || rest === 'cavalry' || rest === 'artillery') return { mode: 'list', keys: [...ART_KEYS], leaders: false, sections: [rest] };
  const keys = rest.split(',').map((s) => s.replace('-', '/')).filter(isArtKey);
  return { mode: 'list', keys, leaders: false, sections: ['infantry', 'cavalry', 'artillery'] };
}

const page = { background: '#2a2620', color: '#e9dcc0', minHeight: '100vh', padding: '16px 24px', fontFamily: 'Georgia, serif' } as const;

function Hex({ x, y, fill, children }: { x: number; y: number; fill: string; children?: ReactNode }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <polygon points={hexPoints(0, 0, HEX_R)} fill={fill} stroke={GRASS_EDGE} strokeWidth={1.2} />
      {children}
    </g>
  );
}

/** A strip of hexes at the given scale; `cells` are drawn one hex wide each. */
function Strip({ scale, cells }: { scale: number; cells: { fill: string; node: ReactNode }[] }) {
  const w = cells.length * HEX_W + 4;
  const h = 2 * HEX_R + 4;
  return (
    <svg width={w * scale} height={h * scale} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {cells.map((c, k) => <Hex key={k} x={2 + HEX_W / 2 + k * HEX_W} y={2 + HEX_R} fill={c.fill}>{c.node}</Hex>)}
    </svg>
  );
}

const tokenCells = (k: ArtKey, bg: string) => [
  { fill: bg, node: <NapUnitToken unitKey={k} blocks={maxOf(k)} maxBlocks={maxOf(k)} facing="right" /> },
  { fill: bg, node: <NapUnitToken unitKey={k} blocks={2} maxBlocks={maxOf(k)} facing="left" /> },
  { fill: bg, node: <NapUnitToken unitKey={k} blocks={maxOf(k)} maxBlocks={maxOf(k)} facing="right" dimmed /> },
];

const caption = (k: ArtKey) => `${k} · ${CODE_NAMES[codeOf(k)]}`;

function Heading({ children }: { children: ReactNode }) {
  return <h2 style={{ margin: '28px 0 8px', fontSize: 20, letterSpacing: '.12em', textTransform: 'uppercase', color: '#f0d690' }}>{children}</h2>;
}
const SubHead = ({ children }: { children: ReactNode }) => <div style={{ margin: '12px 0 4px', fontSize: 12, letterSpacing: '.1em', color: '#bfa776' }}>{children}</div>;
const wrap = { display: 'flex', flexWrap: 'wrap', gap: 6 } as const;

function KeySection({ title, keys }: { title: string; keys: ArtKey[] }) {
  if (keys.length === 0) return null;
  return (
    <section>
      <Heading>{title}</Heading>
      <SubHead>board scale (x0.75), grass: full strength facing right, 2 blocks facing left, dimmed</SubHead>
      <div style={wrap}>{keys.map((k) => <Strip key={k} scale={BOARD} cells={tokenCells(k, GRASS)} />)}</div>
      <SubHead>board scale (x0.75), darkest terrain colour</SubHead>
      <div style={wrap}>{keys.map((k) => <Strip key={k} scale={BOARD} cells={tokenCells(k, DARKEST)} />)}</div>
      <SubHead>large (x2.5)</SubHead>
      <div style={{ ...wrap, gap: 16 }}>
        {keys.map((k) => (
          <figure key={k} style={{ margin: 0 }}>
            <Strip scale={LARGE} cells={[{ fill: GRASS, node: <NapUnitToken unitKey={k} blocks={maxOf(k)} maxBlocks={maxOf(k)} facing="right" /> }]} />
            <figcaption style={{ fontSize: 13, textAlign: 'center' }}>{caption(k)}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

const LEADER_NAMES: Record<ArtNation, string> = { FR: 'Kellermann', BR: 'Prince of Orange', PT: 'Beresford', AL: 'Brunswick' };

function LeaderSection() {
  // each nation: the general alone on his base, then attached to a line battalion (the medallion on the badge's left end)
  const pair = (bg: string, n: ArtNation, facing: 'left' | 'right') => [
    { fill: bg, node: <NapLeaderToken nation={n} facing={facing} attached={false} name={LEADER_NAMES[n]} showName /> },
    {
      fill: bg,
      node: (
        <>
          <NapUnitToken unitKey={`${n}/LN` as ArtKey} blocks={4} maxBlocks={4} facing={facing} />
          <g transform={`translate(${NAP_LEADER_ATTACH_OFFSET.x} ${NAP_LEADER_ATTACH_OFFSET.y})`}><NapLeaderToken nation={n} facing={facing} attached /></g>
        </>
      ),
    },
  ];
  const cells = (bg: string) => ART_NATIONS.flatMap((n, k) => pair(bg, n, k % 2 ? 'left' : 'right'));
  return (
    <section>
      <Heading>Leaders</Heading>
      <SubHead>board scale (x0.75), grass</SubHead>
      <Strip scale={BOARD} cells={cells(GRASS)} />
      <SubHead>board scale (x0.75), darkest terrain colour</SubHead>
      <Strip scale={BOARD} cells={cells(DARKEST)} />
      <SubHead>large (x2.5)</SubHead>
      <div style={{ ...wrap, gap: 16 }}>
        {ART_NATIONS.map((n) => (
          <figure key={n} style={{ margin: 0 }}>
            <Strip scale={LARGE} cells={pair(GRASS, n, 'right')} />
            <figcaption style={{ fontSize: 13, textAlign: 'center' }}>{`${NATION_NAMES[n]} leader`}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Single({ k }: { k: ArtKey | null }) {
  if (!k) return <div style={page}>Unknown key. Try #/gallery/figures/single/FR-LN</div>;
  const spec = FIGURE_SPECS[k];
  const [top, bottom, left, right] = ICON_BOX[spec.drawing];
  const m = 6;
  const w = right - left + 2 * m;
  const h = bottom - top + 2 * m;
  return (
    <div style={page}>
      <Heading>{caption(k)}</Heading>
      <div style={{ ...wrap, gap: 16 }}>
        {[0, 1, 2, 3].map((i) => (
          <figure key={i} style={{ margin: 0 }}>
            <svg width={w * SINGLE} height={h * SINGLE} viewBox={`${left - m} ${top - m} ${w} ${h}`} style={{ background: GRASS, display: 'block' }}>
              <FacingRightCtx.Provider value>
                <NapMiniature unitKey={k} i={i} piece={spec.drawing === 'gun' ? spec.pieces[i] : undefined} />
              </FacingRightCtx.Provider>
            </svg>
            <figcaption style={{ fontSize: 13, textAlign: 'center' }}>{spec.drawing === 'gun' ? `piece ${spec.pieces[i]}` : `figure ${i}`}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

const LINE_RIGHT: ArtKey[] = ['FR/LN', 'FR/LT', 'FR/GR', 'FR/CU', 'FR/FA', 'FR/OG'];
const LINE_LEFT: ArtKey[] = ['BR/LN', 'BR/RI', 'PT/LN', 'AL/LT', 'BR/HC', 'PT/FA'];

function Board() {
  const rows: { keys: ArtKey[]; facing: 'left' | 'right'; nation: ArtNation }[] = [
    { keys: LINE_RIGHT, facing: 'right', nation: 'FR' },
    { keys: LINE_LEFT, facing: 'left', nation: 'BR' },
  ];
  const w = 7 * HEX_W + 8;
  const h = ROW_H + 2 * HEX_R + 8;
  return (
    <div style={page}>
      <Heading>Board lines (x0.75)</Heading>
      <svg width={w * BOARD} height={h * BOARD} viewBox={`0 0 ${w} ${h}`}>
        {rows.map((r, row) => r.keys.map((k, c) => {
          const x = 4 + HEX_W / 2 + c * HEX_W + (row ? HEX_W / 2 : 0);
          const y = 4 + HEX_R + row * ROW_H;
          return (
            <Hex key={k} x={x} y={y} fill={(c + row) % 3 === 2 ? DARKEST : GRASS}>
              <NapUnitToken unitKey={k} blocks={c % 2 ? maxOf(k) - 1 : maxOf(k)} maxBlocks={maxOf(k)} facing={r.facing} />
              {c === 0 ? <g transform={`translate(${NAP_LEADER_ATTACH_OFFSET.x} ${NAP_LEADER_ATTACH_OFFSET.y})`}><NapLeaderToken nation={nationOf(k) as ArtNation} facing={r.facing} attached /></g> : null}
            </Hex>
          );
        }))}
      </svg>
      <div style={{ fontSize: 13, marginTop: 8 }}>French lines face right; British, Portuguese and Allied units face left.</div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Ink profiles (FIGURE_BANDS): each figure rasterised at 4 px per unit in its own frame (facing right, feet at 0,0), scanned
// for ink in 2-unit bands, and the union taken over every key and paint index of a band key, rounded out to half a unit.

const PX = 4, X0 = -70, X1 = 70, Y0 = -80, Y1 = 20, BAND = 2;
type Band = [number, number, number, number];

/** The figures each band key is measured over. */
function bandFigures(): Record<BandKey, ReactElement[]> {
  const out = { close: [], loose: [], horse: [], gun: [], horseGun: [], rammer: [], linstock: [], ammo: [], holder: [] } as Record<BandKey, ReactElement[]>;
  for (const k of ART_KEYS) {
    const s = FIGURE_SPECS[k];
    for (let i = 0; i < 4; i++) {
      if (s.drawing === 'foot') out[s.order === 'close' ? 'close' : 'loose'].push(<NapMiniature unitKey={k} i={i} />);
      else if (s.drawing === 'horse') out.horse.push(<NapMiniature unitKey={k} i={i} />);
      else {
        for (const p of new Set(s.pieces)) out[p === 'gun' ? (s.holder ? 'horseGun' : 'gun') : p].push(<NapMiniature unitKey={k} i={i} piece={p} />);
        if (s.holder && i === 0) out.holder.push(<HorseHolderFigure spec={s} n={NATION_LOOKS[artNationOf(k)]} />);
      }
    }
  }
  return out;
}

async function inkBands(el: ReactElement, toMarkup: (e: ReactElement) => string): Promise<Map<number, [number, number]>> {
  const w = (X1 - X0) * PX, h = (Y1 - Y0) * PX;
  const svg = toMarkup(createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', width: w, height: h, viewBox: `${X0} ${Y0} ${X1 - X0} ${Y1 - Y0}` }, <FacingRightCtx.Provider value>{el}</FacingRightCtx.Provider>));
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await img.decode();
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, w, h).data;
  const bands = new Map<number, [number, number]>();
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    if (d[(py * w + px) * 4 + 3] < 8) continue;
    const b = Math.floor((Y0 + py / PX) / BAND) * BAND;
    const l = X0 + px / PX, r = l + 1 / PX;
    const cur = bands.get(b);
    if (cur) { cur[0] = Math.min(cur[0], l); cur[1] = Math.max(cur[1], r); } else bands.set(b, [l, r]);
  }
  return bands;
}

async function measureBands(): Promise<Record<string, Band[]>> {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const res: Record<string, Band[]> = {};
  for (const [key, els] of Object.entries(bandFigures())) {
    const u = new Map<number, [number, number]>();
    for (const el of els) for (const [b, [l, r]] of await inkBands(el, renderToStaticMarkup)) {
      const cur = u.get(b);
      if (cur) { cur[0] = Math.min(cur[0], l); cur[1] = Math.max(cur[1], r); } else u.set(b, [l, r]);
    }
    res[key] = [...u.entries()].sort((a, b) => a[0] - b[0]).map(([b, [l, r]]) => [b, b + BAND, Math.floor(l * 2) / 2, Math.ceil(r * 2) / 2]);
  }
  return res;
}

function Bands() {
  const [out, setOut] = useState('measuring');
  useEffect(() => {
    measureBands().then((r) => setOut(JSON.stringify(r)), (e) => setOut(`ERROR ${String(e)}`));
  }, []);
  return <pre id="bands" style={{ ...page, whiteSpace: 'pre-wrap' }}>{out}</pre>;
}

export default function FigureGallery({ route }: { route: string }) {
  const r = parse(route);
  if (r.mode === 'board') return <Board />;
  if (r.mode === 'bands') return <Bands />;
  if (r.mode === 'single') return <Single k={r.key} />;
  const arm = (a: string) => r.keys.filter((k) => ARM_OF[codeOf(k)] === a);
  return (
    <div style={page}>
      {r.sections.includes('infantry') ? <KeySection title="Infantry" keys={arm('infantry')} /> : null}
      {r.sections.includes('cavalry') ? <KeySection title="Cavalry" keys={arm('cavalry')} /> : null}
      {r.sections.includes('artillery') ? <KeySection title="Artillery" keys={arm('artillery')} /> : null}
      {r.leaders ? <LeaderSection /> : null}
    </div>
  );
}
