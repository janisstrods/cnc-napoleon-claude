// Colours of the Napoleonic art: each nation's base edge and skin tones, the horse coats, the metals and the named cloth
// swatches every spec draws from. A spec file may add a local swatch (with a comment) but must not edit CLOTH.
import { darken, lighten } from '../color';
import type { ArtNation } from './keys';
import type { HorseCoatName } from './uniform';

export interface SideColours { edge: string; edgeShade: string; edgeLight: string; banner: string }
export interface NationLook {
  side: SideColours;
  skin: readonly string[];
  hair: readonly string[];
  guardDevice: 'eagle' | 'crown' | 'none';
}

/** The flocked top of the base (the Ancients' value: the same plate on the same board). */
export const BASE_TOP = '#6e6a3c';

const side = (edge: string, banner: string): SideColours => ({ edge, edgeShade: darken(edge, 0.34), edgeLight: lighten(edge, 0.3), banner });

// Blue blocks for France, red for Britain, brown for Portugal; the Allies stand on the Portuguese brown (the scenario
// booklet's instruction for 014-015).
const FR_SIDE = side('#2c4f9e', '#3f73d8');
const BR_SIDE = side('#b02a2a', '#d8453d');
// The booklet's brown reads as a tawny amber here: every darker chocolate sits within dE 20 of the board's wood and roof
// colours (palisade, hull, roofShade), which the nations test forbids; #a47200 is the nearest brown that clears them.
const PT_SIDE = side('#a47200', '#d2a55a');

const SKIN = ['#e0b48c', '#d4a077', '#c98f66', '#e6c09a'] as const;
const HAIR = ['#3a2616', '#5a3a1e', '#1f1710', '#7a5a30', '#4a3020'] as const;

export const NATION_LOOKS: Record<ArtNation, NationLook> = {
  FR: { side: FR_SIDE, skin: SKIN, hair: HAIR, guardDevice: 'eagle' },
  BR: { side: BR_SIDE, skin: SKIN, hair: HAIR, guardDevice: 'crown' },
  PT: { side: PT_SIDE, skin: SKIN, hair: HAIR, guardDevice: 'none' },
  AL: { side: PT_SIDE, skin: SKIN, hair: HAIR, guardDevice: 'none' },
};

export const HORSE_COATS: Record<HorseCoatName, { coat: string; shade: string; mane: string }> = {
  bay: { coat: '#8a4f2a', shade: '#5e3318', mane: '#2a1a10' },
  chestnut: { coat: '#a2582a', shade: '#733c1a', mane: '#5a3014' },
  black: { coat: '#2a2724', shade: '#161412', mane: '#14110f' },
  grey: { coat: '#b4b2ac', shade: '#8a8882', mane: '#d6d4cc' },
  brown: { coat: '#6a4a30', shade: '#46301e', mane: '#2e2016' },
  dun: { coat: '#b89a68', shade: '#8a7046', mane: '#5a4a30' },
};

export const METAL = {
  brass: '#c9a23a', brassShade: '#8e6e1c',
  steel: '#a9b0b6', steelShade: '#6c747c',
  gold: '#e3bd4c', goldShade: '#a07e22',
  bronze: '#9a6a2e', bronzeShade: '#664318',
  iron: '#4a4d52', ironShade: '#2a2c30',
  leather: '#5a3a22', wood: '#7a5634', outline: '#1d140e',
} as const;

export const CLOTH = {
  frenchBlue: '#24346e', britishRed: '#b3242a', rifleGreen: '#26392a', portugueseBlue: '#1d2a4a', cacadorBrown: '#6b4a2b',
  dutchBlue: '#26335e', nassauGreen: '#2f4a2c', brunswickBlack: '#1e1e22', chasseurGreen: '#2c4a32', dragoonGreen: '#2f5236',
  white: '#ece6d6', buff: '#d9c08a', trouserGrey: '#7d7f84', greatcoatGrey: '#8a8780', sky: '#7fa6cf',
  scarlet: '#c8202a', yellow: '#d8b13a', orange: '#e07b22', crimson: '#9c1c33', black: '#1b1a1a',
} as const;
