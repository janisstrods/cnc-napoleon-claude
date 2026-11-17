// Side colours of the placeholder art: each nation's base edge, standard and banner cloth. Plan 6B Task 7 wires the
// Napoleonic art (src/art/nap) in; until then these are the only colours the board's pieces and banners need.
import type { Nation } from '../engine/codes';
import { darken, lighten } from './color';

/** Cloth colours of a captured banner (the victory banner track). */
export interface BannerCloth {
  main: string;
  light: string;
  dark: string;
}

/** Base-edge, standard and banner-track colours of a nation: the colour that says which side a piece belongs to. */
export interface SideColors {
  edge: string;
  edgeShade: string;
  edgeLight: string;
  banner: string;
  bannerShade: string;
  /** Cloth of this side's standards on the victory banner track (shown when its banners are captured). */
  cloth: BannerCloth;
}

/** The flocked top of the base (the same plate on the same board as the Napoleonic art's). */
export const BASE_TOP = '#6e6a3c';

function side(edge: string, banner: string, cloth: string): SideColors {
  return {
    edge, edgeShade: darken(edge, 0.34), edgeLight: lighten(edge, 0.3), banner, bannerShade: darken(banner, 0.34),
    cloth: { main: cloth, light: lighten(cloth, 0.3), dark: darken(cloth, 0.45) },
  };
}

const BROWN = side('#58300e', '#c08a4a', '#6b4018');

/** France blue, Britain red, Portugal and the Allies brown, Spain yellow. */
export const BLOCK_COLORS: Readonly<Record<Nation, SideColors>> = {
  FR: side('#2c4f9e', '#3f73d8', '#27478b'),
  BR: side('#b02a2a', '#d8453d', '#9b2420'),
  PT: BROWN,
  AL: BROWN,
  SP: side('#d9b21c', '#e8c84a', '#b8940f'),
};

export function blockColors(nation: Nation): SideColors {
  return BLOCK_COLORS[nation];
}
