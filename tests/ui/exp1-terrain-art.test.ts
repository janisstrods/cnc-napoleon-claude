// Plan 7C Task 14: Expansion #1 art - the Walled Farm, 2- and 4-sided field works, the Spanish objective markers
// (tempAny, majority, exitEdge, suddenDeath) and the Guerrilla counter glyph.
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { hexId } from '../../src/engine/hex';
import type { ObjectiveDef, ObjectiveState, TerrainType } from '../../src/engine/types';
import { HEX_R, hexCenter } from '../../src/ui/geometry';
import { Icon } from '../../src/ui/kit/Icon';
import { NAP_GLYPHS } from '../../src/ui/kit/icons/napGlyphs';
import { BoardArt, ObjectiveMarkers, TerrainIcon } from '../../src/ui/terrain';
import { paintFieldWorks } from '../../src/ui/terrain/fieldworks';
import { boardCtx, iconCtx, neighborRC, type Dir } from '../../src/ui/terrain/hexmath';
import { P } from '../../src/ui/terrain/palette';
import * as towns from '../../src/ui/terrain/towns';
import { paintRivers } from '../../src/ui/terrain/water';
import { createGame } from '../../src/engine/setup';
import { scenarioById } from '../../src/scenarios';

const svg = (el: ReactElement | null) => renderToStaticMarkup(createElement('svg', null, el));
const count = (s: string, sub: string) => s.split(sub).length - 1;
const plain = (): TerrainType[] => Array.from({ length: 117 }, () => 'plain' as TerrainType);

/** Every coordinate pair of an SVG path made of M/L commands (the painters' `polyPath` format). */
const coords = (d: string) => [...d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => ({ x: +m[1], y: +m[2] }));
/** The segments of every subpath of an M/L path. */
function segments(d: string) {
  const out: { a: { x: number; y: number }; b: { x: number; y: number } }[] = [];
  for (const sub of d.split('M').filter(Boolean)) {
    const pts = coords('M' + sub);
    for (let i = 0; i + 1 < pts.length; i++) out.push({ a: pts[i], b: pts[i + 1] });
  }
  return out;
}
/** The inner markup of the first <g> whose class attribute starts with `cls`. */
function group(html: string, cls: string): string | null {
  const at = html.indexOf(`<g class="${cls}`);
  if (at < 0) return null;
  let depth = 0;
  const re = /<g\b|<\/g>/g;
  re.lastIndex = at;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    depth += m[0] === '</g>' ? -1 : 1;
    if (depth === 0) return html.slice(at, m.index);
  }
  return null;
}
const strokes = (html: string) => [...html.matchAll(/stroke="([^"]+)"/g)].map((m) => m[1]);
const fills = (html: string) => [...html.matchAll(/fill="([^"]+)"/g)].map((m) => m[1]);

describe('Walled Farm', () => {
  it("walledFarm paints its own art, not the town's", () => {
    const paint = (towns as Record<string, unknown>).paintWalledFarm as ((ctx: ReturnType<typeof iconCtx>) => ReactElement | null) | undefined;
    expect(typeof paint).toBe('function');
    const farm = svg(paint!(iconCtx('walledFarm')));
    expect(farm).toContain('class="walled-farm"');
    // an enclosure wall and a farmhouse (with at most one outbuilding): not a cluster of town houses
    expect(farm).toContain('class="farm-wall"');
    const buildings = count(farm, 'class="farm-building"');
    expect(buildings).toBeGreaterThanOrEqual(1);
    expect(buildings).toBeLessThanOrEqual(3);
    // the town painter (which the board calls) hands it to the farm painter and draws no town houses there
    const viaTowns = svg(towns.paintTowns(iconCtx('walledFarm')));
    expect(viaTowns).toContain('class="walled-farm"');
    expect(viaTowns).not.toContain('class="towns"');
    expect(paint!(iconCtx('town'))).toBeNull();
    expect(svg(towns.paintTowns(iconCtx('town')))).not.toContain('walled-farm');

    // the swatch and the board both draw it
    const icon = renderToStaticMarkup(createElement(TerrainIcon, { t: 'walledFarm', size: 64 }));
    expect(icon).toContain('class="walled-farm"');
    expect(icon).not.toContain('class="towns"');
    expect(renderToStaticMarkup(createElement(TerrainIcon, { t: 'town', size: 64 }))).not.toContain('walled-farm');
    const t = plain();
    t[hexId(4, 6)] = 'walledFarm';
    for (const flipped of [false, true]) {
      const board = renderToStaticMarkup(createElement('svg', null, createElement(BoardArt, { terrain: t, flipped })));
      expect(count(board, 'class="walled-farm"')).toBe(1);
      expect(board).not.toContain('class="towns"');
    }
  });
});

describe('2- and 4-sided field works', () => {
  /** Engine direction index (bit of a works mask: E, NE, NW, W, SW, SE) -> painter direction (0 E, 1 SE, ... 5 NE). */
  const ENGINE_TO_DIR: Dir[] = [0, 5, 4, 3, 2, 1];
  const DITCH_OUT = 3.4; // the ditch runs this far outside the protected hexside

  it('2- and 4-sided works draw exactly their sides', () => {
    const masks: [string, number][] = [
      ['SW|SE', (1 << 4) | (1 << 5)],
      ['E|SE|SW|W', (1 << 0) | (1 << 5) | (1 << 4) | (1 << 3)],
    ];
    for (const [name, mask] of masks) {
      for (const flipped of [false, true]) {
        const r = 4;
        const c = 6;
        const works = Array.from({ length: 117 }, () => 0);
        works[hexId(r, c)] = mask;
        const html = svg(paintFieldWorks(boardCtx(plain(), flipped), works));
        const ditch = [...html.matchAll(/<path d="([^"]+)"[^>]*stroke="([^"]+)"/g)].find((m) => m[2] === P.ditch)?.[1];
        expect(ditch, name).toBeTruthy();
        const segs = segments(ditch!);
        const sides = [0, 1, 2, 3, 4, 5].filter((i) => mask & (1 << i));
        // one wall (one ditch segment) per protected side, and nothing on the others
        expect(segs.length, `${name} flipped=${flipped}`).toBe(sides.length);
        const p = hexCenter(r, c, flipped);
        for (const i of sides) {
          const [nr, nc] = neighborRC(r, c, ENGINE_TO_DIR[i]);
          const q = hexCenter(nr, nc, flipped);
          const l = Math.hypot(q.x - p.x, q.y - p.y);
          const want = { x: (p.x + q.x) / 2 + ((q.x - p.x) / l) * DITCH_OUT, y: (p.y + q.y) / 2 + ((q.y - p.y) / l) * DITCH_OUT };
          const near = segs.filter((s) => Math.hypot((s.a.x + s.b.x) / 2 - want.x, (s.a.y + s.b.y) / 2 - want.y) < 1.5);
          expect(near.length, `${name} side ${i} flipped=${flipped}`).toBe(1);
        }
      }
    }
  });
});

describe('river joins of the Spanish battles', () => {
  it("101's fork at (7,0) leaves the board by (8,0) and (8,1) with no loop, and each ford hex has one crossing", () => {
    const g = createGame(scenarioById('101').setup, 1);
    for (const flipped of [false, true]) {
      const html = svg(paintRivers(boardCtx(g.terrain, flipped)));
      const water = [...html.matchAll(/<path d="([^"]+)" fill="([^"]+)"/g)].find((m) => m[2] === P.water)![1];
      // three runs: the upper river into the junction, and one mouth each way off the bottom edge (no (8,0)-(8,1) link)
      expect(water.split('M').filter(Boolean).length, `flipped=${flipped}`).toBe(3);
      const fords = g.terrain.filter((t) => t === 'ford' || t === 'fordNoStop').length;
      const sand = [...html.matchAll(/<path d="([^"]+)" fill="([^"]+)"/g)].find((m) => m[2] === P.sand)![1];
      expect(sand.split('M').filter(Boolean).length, `flipped=${flipped}`).toBe(fords);
    }
  });
});

describe('Spanish objective markers', () => {
  const H = (r: number, c: number) => hexId(r, c);
  const ridge = [H(3, 2), H(3, 3), H(4, 2), H(4, 3)];
  const MAJ: ObjectiveDef[] = [
    { kind: 'majority', side: 'top', hexes: ridge, banners: 1, startHeld: true, text: 'The Spanish hold the ridge.' },
    { kind: 'majority', side: 'bottom', hexes: ridge, banners: 1, startHeld: false, text: 'The French hold the ridge.' },
  ];
  const st = (...held: boolean[]): ObjectiveState[] => held.map((h) => ({ held: h, count: 0 }));
  const markers = (objectives: ObjectiveDef[], objState: ObjectiveState[], flipped = false) =>
    svg(createElement(ObjectiveMarkers, { objectives, objState, flipped, nations: { top: 'SP', bottom: 'FR' } }));

  it('majority outlines change tint with the holder; exitEdge draws a band on its row', () => {
    const none = markers(MAJ, st(false, false));
    const top = markers(MAJ, st(true, false));
    const bottom = markers(MAJ, st(false, true));
    // the contested group (one record per side, same hexes) is outlined once, dotted, with the objective's text
    for (const html of [none, top, bottom]) {
      expect(count(html, '<g class="majority')).toBe(1);
      expect(group(html, 'majority')).toMatch(/stroke-dasharray="[\d.]+ [\d.]+"[^>]*stroke-linecap="round"|stroke-linecap="round"[^>]*stroke-dasharray/);
    }
    expect(none).toContain('<g class="majority"');
    expect(top).toContain('<g class="majority held-top"');
    expect(bottom).toContain('<g class="majority held-bottom"');
    expect(top).toContain('<title>The Spanish hold the ridge.</title>');
    expect(bottom).toContain('<title>The French hold the ridge.</title>');
    const tint = (html: string) => [...strokes(group(html, 'majority')!), ...fills(group(html, 'majority')!)].join(' ');
    expect(new Set([tint(none), tint(top), tint(bottom)]).size).toBe(3);

    // exitEdge: a band along the outer hexsides of row 0 (the top edge; the bottom edge on a flipped board) and an arrow
    const EXIT: ObjectiveDef[] = [{ kind: 'exitEdge', side: 'top', row: 0, free: 3, banners: 1, text: 'Spanish {unit} leaves by the Spanish baseline.' }];
    for (const flipped of [false, true]) {
      const html = markers(EXIT, st(false), flipped);
      const g = group(html, 'exit-edge');
      expect(g, `flipped=${flipped}`).toBeTruthy();
      expect(g).toContain('<title>Spanish {unit} leaves by the Spanish baseline.</title>');
      const band = g!.match(/<path d="([^"]+)"/)![1];
      const pts = coords(band);
      const yRow = hexCenter(0, 0, flipped).y;
      // every point lies between the row's outer corners and its outer tip (and nowhere near row 1)
      for (const p of pts) {
        const out = flipped ? p.y - yRow : yRow - p.y;
        expect(out, `flipped=${flipped} y=${p.y}`).toBeGreaterThan(HEX_R / 2 - 6);
        expect(out, `flipped=${flipped} y=${p.y}`).toBeLessThan(HEX_R + 6);
      }
      // it runs the whole width of the row
      const xs = pts.map((p) => p.x);
      const x0 = hexCenter(0, 0, flipped).x;
      const x12 = hexCenter(0, 12, flipped).x;
      expect(Math.min(...xs)).toBeLessThan(Math.min(x0, x12));
      expect(Math.max(...xs)).toBeGreaterThan(Math.max(x0, x12));
      expect(g).toContain('class="exit-edge-arrow"');
    }
  });

  it('tempAny is drawn like tempGroup; suddenDeath draws nothing on the board', () => {
    const any = markers([{ kind: 'tempAny', side: 'bottom', hexes: [H(4, 9), H(4, 10)], timing: 'turnStart', banners: 1, text: 'The French hold Albuera.' }], st(true));
    expect(any).toContain('<g class="temp-any held-bottom"');
    expect(any).toContain('<title>The French hold Albuera.</title>');
    expect(any).toContain('stroke-dasharray="9 5"');
    const sd = markers([{ kind: 'suddenDeath', side: 'bottom', keys: ['SP/FA'], need: 3, text: 'Every Spanish battery is lost.' }], st(false));
    expect(sd).not.toContain('<path');
    expect(sd).not.toContain('<title>');
  });
});

describe('Guerrilla counter glyph', () => {
  it('the guerrilla glyph renders at 16 and 32 px with a <title>', () => {
    const d = (NAP_GLYPHS as Record<string, string>).guerrilla;
    expect(d).toMatch(/^M[\d .,MLQZACHVmlqzachv-]+$/);
    for (const size of [16, 32]) {
      const html = renderToStaticMarkup(createElement(Icon, { name: 'guerrilla' as never, size, title: 'Guerrilla counter' }));
      expect(html).toContain(`width="${size}"`);
      expect(html).toContain('<title>Guerrilla counter</title>');
      expect(html).toContain(`d="${d}"`);
    }
  });
});
