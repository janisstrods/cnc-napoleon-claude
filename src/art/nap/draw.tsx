// Drawing primitives of the Napoleonic art (copied from the Ancients' draw.tsx, so this module imports no Ancients art).
//
// Everything is drawn FACING RIGHT in a local frame whose origin is between the figure's feet (wheels, hooves) and y grows
// downwards, so the figure stands in negative y. The token mirrors whole figures for left-facing units. Lit from the upper
// left of the SCREEN: side shading and highlights are authored as if lit from the figure's local right; a figure drawn
// facing right (not mirrored) has those layers mirrored about their own axis (`mx`) so the light stays upper left.
import { createContext, useContext } from 'react';
import { darken } from '../color';
import type { NationLook } from './nations';

export const OL = '#1d140e';
export const OW = 0.8;

/** Per-figure paint variation. */
export interface Fig {
  n: NationLook;
  skin: string;
  skinShade: string;
  hair: string;
  /** 0..3, used for small pose and colour variation. */
  i: number;
}

export function makeFig(n: NationLook, i: number): Fig {
  const skin = n.skin[i % n.skin.length];
  return { n, i, skin, skinShade: darken(skin, 0.28), hair: n.hair[(i * 3 + 1) % n.hair.length] };
}

/** A stroke with a dark outline (two stacked strokes): limbs, shafts, straps. */
export function Line2({ d, w, c, ow = OW, o = OL }: { d: string; w: number; c: string; ow?: number; o?: string }) {
  return (
    <>
      <path d={d} fill="none" stroke={o} strokeWidth={w + ow * 2} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

/** Filled shape with the standard outline. */
export function Shape({ d, f, sw = OW }: { d: string; f: string; sw?: number }) {
  return <path d={d} fill={f} stroke={OL} strokeWidth={sw} strokeLinejoin="round" />;
}

/** True while rendering a figure that faces right on screen (i.e. is not mirrored). */
export const FacingRightCtx = createContext(false);

/** Mirror transform for a side-dependent light/shade layer. `mr` = mirror when facing right. */
function useSideMirror(mx: number | undefined, mr: boolean): string | undefined {
  const fr = useContext(FacingRightCtx);
  if (mx === undefined) return undefined;
  return (mr ? fr : !fr) ? `matrix(-1 0 0 1 ${2 * mx} 0)` : undefined;
}

/** Unoutlined paint layer (shading). */
export function Paint({ d, f, o, mx, mr = true }: { d: string; f: string; o?: number; mx?: number; mr?: boolean }) {
  const t = useSideMirror(mx, mr);
  return <path d={d} fill={f} opacity={o} transform={t} />;
}

/** Thin stroke: highlights, trims, folds. */
export function Hi({ d, c, w = 0.6, o = 0.9, mx, mr = true }: { d: string; c: string; w?: number; o?: number; mx?: number; mr?: boolean }) {
  const t = useSideMirror(mx, mr);
  return <path d={d} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" opacity={o} transform={t} />;
}

/** Small dots as a single path (fewer DOM nodes). */
export function dots(pts: readonly (readonly [number, number])[], r: number): string {
  const d = (2 * r).toFixed(2);
  const rr = r.toFixed(2);
  return pts.map(([x, y]) => `M${(x - r).toFixed(2)} ${y.toFixed(2)}a${rr} ${rr} 0 1 0 ${d} 0a${rr} ${rr} 0 1 0 -${d} 0Z`).join('');
}
