// Helpers shared by the Napoleonic art tests.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NapMiniature, NapUnitToken } from '../../../src/art/nap/token';
import type { ArtKey } from '../../../src/art/nap/keys';
import { FIGURE_SPECS } from '../../../src/art/nap/specs';
import type { BandKey } from '../../../src/art/nap/slots';
import { rgb } from '../../../src/art/color';
export { deltaE } from '../delta-e';

/** An element rendered inside an <svg> as static markup. */
export const svg = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(h('svg', null, el));

/** A render with its colours stripped: what differs is the drawing, not the paint. */
export const shape = (s: string) => s.replace(/#[0-9a-f]{6}/gi, '');

export const fig = (key: ArtKey, i = 0) => svg(h(NapMiniature, { unitKey: key, i }));

export const token = (
  key: ArtKey,
  { blocks = 4, maxBlocks = 4, facing = 'right', dimmed = false }: { blocks?: number; maxBlocks?: number; facing?: 'left' | 'right'; dimmed?: boolean } = {},
) => svg(h(NapUnitToken, { unitKey: key, blocks, maxBlocks, facing, dimmed }));

/** How many times an attribute (e.g. `data-fig=`) occurs in the markup. */
export const count = (markup: string, attr: string) => markup.split(attr).length - 1;

export type HueClass = 'black' | 'white' | 'grey' | 'red' | 'orange' | 'brown' | 'yellow' | 'green' | 'blue' | 'purple';

export function hueClass(hex: string): HueClass {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let hh = 0;
  if (d !== 0) {
    if (max === r) hh = ((g - b) / d) % 6;
    else if (max === g) hh = (b - r) / d + 2;
    else hh = (r - g) / d + 4;
    hh *= 60;
    if (hh < 0) hh += 360;
  }
  if (l < 0.17) return 'black';
  if (s < 0.14) return l > 0.8 ? 'white' : 'grey';
  if (l > 0.85) return 'white';
  if (hh < 15 || hh >= 345) return 'red';
  if (hh < 45) return l < 0.42 ? 'brown' : 'orange';
  if (hh < 70) return l < 0.4 ? 'brown' : 'yellow';
  if (hh < 170) return 'green';
  if (hh < 265) return 'blue';
  return 'purple';
}

/** The element starting at `from`, up to its balanced closing tag. */
export function balanced(m: string, from: number): string {
  let depth = 0;
  const re = /<g[\s>]|<\/g>/g;
  re.lastIndex = from;
  for (let r = re.exec(m); r; r = re.exec(m)) {
    depth += r[0] === '</g>' ? -1 : 1;
    if (depth === 0) return m.slice(from, r.index + 4);
  }
  return '';
}
/** Every placed figure of a token as [band key, translate x, translate y, scale x, scale y], read from the markup. */
export function placed(k: ArtKey, out: string): [BandKey, number, number, number, number][] {
  const spec = FIGURE_SPECS[k];
  const res: [BandKey, number, number, number, number][] = [];
  const tr = /<g transform="translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+) ([-\d.]+)\)">/;
  for (const r of out.matchAll(/<g data-slot="\d"/g)) {
    const g = balanced(out, r.index!);
    const m = tr.exec(g);
    if (!m) throw new Error(`no placement in ${k}`);
    const piece = /data-piece="(\w+)"/.exec(g)?.[1];
    const gunKey = (p: string): BandKey => (p === 'gun' && spec.drawing === 'gun' && spec.holder ? 'horseGun' : (p as BandKey));
    const key: BandKey = spec.drawing === 'gun' ? gunKey(piece!) : spec.drawing === 'horse' ? 'horse' : spec.order === 'close' ? 'close' : 'loose';
    res.push([key, ...(m!.slice(1).map(Number) as [number, number, number, number])]);
  }
  const hold = out.indexOf('<g data-holder="true"');
  if (hold >= 0) {
    const m = tr.exec(balanced(out, hold));
    if (!m) throw new Error(`no placement in ${k}`);
    res.push(['holder', ...(m!.slice(1).map(Number) as [number, number, number, number])]);
  }
  return res;
}

