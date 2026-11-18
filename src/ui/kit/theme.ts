import type { Nation } from '../../engine/codes';
import type { CardGroup } from '../../engine/types';
import { blockColors, type BannerCloth } from '../../art/palettes';

export type { BannerCloth };

/** Cloth colour of the banners an army captured: it comes from the army's nation (`BLOCK_COLORS` in art/palettes). */
export function bannerCloth(nation: Nation): BannerCloth {
  return blockColors(nation).cloth;
}

/** Colour coding of the two card groups. */
export const GROUP_COLORS: Record<CardGroup, { main: string; light: string; dark: string; label: string }> = {
  section: { main: '#6f6526', light: '#a89b48', dark: '#3b350e', label: 'Section' },
  tactic: { main: '#55235f', light: '#8a539c', dark: '#2d1035', label: 'Tactic' },
};

/** The colour token of each nation's side (army name, side chip, log mark): a key of `theme.color`. */
export const NATION_COLOUR = {
  FR: 'royal',
  BR: 'crimson',
  PT: 'portuguese',
  AL: 'allied',
  SP: 'spanishInk',
} as const satisfies Record<Nation, string>;

/** The CSS colour of a nation's side, as a `--kit-*` custom property. */
export function nationInk(nation: Nation): string {
  return `var(--kit-${NATION_COLOUR[nation].replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)})`;
}

/** Design tokens. The same values are exposed as CSS custom properties in theme.css (`--kit-*`). */
export const theme = {
  font: {
    title: "'IM Fell English SC', 'Times New Roman', serif",
    body: "'EB Garamond', Garamond, 'Times New Roman', serif",
  },
  /** Campaign-map palette. Kept names: wood = the ink-blue margin plate, leather = buff card, bronze = sepia rule. */
  color: {
    wood: '#1e2532',
    woodDark: '#141a24',
    woodLight: '#2c3646',
    leather: '#f3ecd8',
    leatherDark: '#e3d8bb',
    leatherLight: '#f8f4e7',
    parchment: '#ece3c8',
    parchmentLight: '#f6f0de',
    parchmentDark: '#d9ccaa',
    ink: '#221c16',
    inkSoft: '#594a39',
    rule: '#3b3127',
    /** a finished dice order (the sides are coloured by nation: `nationInk`) */
    green: '#2f5d2a',
    bronze: '#8a6f48',
    bronzeLight: '#b59c74',
    bronzeDark: '#5c4a31',
    gold: '#e8c45a',
    crimson: '#a3262a',
    royal: '#1f3f8a',
    spanish: '#a67a12',
    /** Spanish yellow deepened for text (the plain yellow is a 3:1 mark, not a text colour) */
    spanishInk: '#735409',
    /** Portugal and the Allies are brown, as on their pieces (art/palettes) */
    portuguese: '#6b4018',
    allied: '#5e3a17',
    purple: '#55235f',
    olive: '#6b6a2a',
    felt: '#ddd2b4',
    hit: '#f0c94e',
    flag: '#e3801f',
  },
  dice: {
    infantry: '#2f8a3a',
    cavalry: '#2453a6',
    artillery: '#b3261e',
    ivory: '#f6efdc',
  },
  group: GROUP_COLORS,
  radius: { sm: 4, md: 8, lg: 14 },
  shadow: {
    soft: '0 1px 3px rgba(34, 28, 22, .22)',
    lifted: '0 10px 24px rgba(34, 28, 22, .28), 0 2px 6px rgba(34, 28, 22, .18)',
    glow: '0 0 0 2px #e8c45a, 0 0 18px 4px rgba(240, 200, 90, .55)',
  },
} as const;

export type Theme = typeof theme;
