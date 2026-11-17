// Helpers shared by the art tests: an element rendered to SVG markup, and every unit row with its full strength.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { UNIT_KEYS, type RowKey } from '../../src/engine/codes';
import { UNIT_STATS } from '../../src/engine/units';

/** An element rendered inside an <svg> as static markup. */
export const svg = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(h('svg', null, el));

/** Every unit row, in the engine's table order. */
export const ALL_KEYS: readonly RowKey[] = UNIT_KEYS;

/** Each unit row's full strength in blocks. */
export const MAX = Object.fromEntries(UNIT_KEYS.map((k) => [k, UNIT_STATS[k].blocks])) as Record<RowKey, number>;
