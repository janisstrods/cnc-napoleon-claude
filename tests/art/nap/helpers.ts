// Helpers shared by the Napoleonic art tests.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NapMiniature, NapUnitToken } from '../../../src/art/nap/token';
import type { ArtKey } from '../../../src/art/nap/keys';
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
