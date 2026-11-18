// Plan 4 Task 10d: the command cards in the campaign-map style (engraved card stock, ink roundels, an engraved back).
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CARD_DEFS } from '../../src/engine/cards';
import type { CardKind } from '../../src/engine/types';
import { CARD_ICONS, CardBack, CardView, type CardSize } from '../../src/ui/kit/CardView';
import { SectionMiniMap } from '../../src/ui/kit/SectionMiniMap';
import { GROUP_COLORS, theme } from '../../src/ui/kit/theme';

const FS = 'node:fs';
const readText = async (p: string): Promise<string> => (await import(FS)).readFileSync(new URL(p, import.meta.url), 'utf8');

/** WCAG 2 contrast ratio of two #rrggbb colours (as in theme.test.ts). */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    const [r, g, bl] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const KINDS = Object.keys(CARD_DEFS) as CardKind[];
const SIZES: CardSize[] = ['sm', 'md', 'lg'];

/**
 * The bronze-and-laurel vocabulary of the old cards, as class names and ids in the markup (the glyphs' path data
 * carries no names), and the gold gradient's stops.
 */
const OLD = /laurel|bronze|gold|medallion|kit-card__rays|kit-card__corner/i;
const GOLD_FILLS = ['#fff0bf', '#e6c06a', '#b38532', '#8a6020', '#f7da84', '#c79a4b', '#ecc979'];

const face = (kind: CardKind, size: CardSize = 'md', mirrored = false) =>
  renderToStaticMarkup(createElement(CardView, { kind, size, mirrored }));

describe('the card faces', () => {
  it('no card face has bronze, laurel or gold classes, or gold fills, in any size', () => {
    for (const kind of KINDS) {
      for (const size of SIZES) {
        for (const mirrored of [false, true]) {
          const html = face(kind, size, mirrored);
          expect(html, `${kind} ${size}`).not.toMatch(OLD);
          for (const g of GOLD_FILLS) expect(html.toLowerCase(), `${kind} ${size} ${g}`).not.toContain(g);
        }
      }
    }
  });

  it('La Grande Manoeuvre\'s laurel crown is the one laurel glyph left: an accepted period motif (Napoleonic, not the Roman wreath)', () => {
    expect(CARD_ICONS.grandManoeuvre).toBe('laurelCrown');
    const laurel = Object.entries(CARD_ICONS).filter(([, g]) => /laurel/i.test(g!)).map(([k]) => k);
    expect(laurel).toEqual(['grandManoeuvre']);
  });

  it('Coordinated Advance has no icon entry: it is a section card, which shows the mini-map', () => {
    expect(CARD_DEFS.coordinatedAdvance.group).toBe('section');
    expect(CARD_ICONS).not.toHaveProperty('coordinatedAdvance');
  });

  it('keeps everything the card shows: title, text, group label and the orders per section', () => {
    for (const kind of KINDS) {
      const def = CARD_DEFS[kind];
      const html = face(kind, 'lg');
      expect(html, kind).toContain(`kit-card__title">${def.title.replace(/'/g, '&#x27;')}<`);
      expect(html, kind).toContain(`aria-label="${def.title.replace(/'/g, '&#x27;')}. `);
      expect(html, kind).toContain(`<span>${GROUP_COLORS[def.group].label}</span>`);
      expect(html, kind).toContain(`kit-card--${def.group}`);
      if (def.detach) expect(html, kind).toContain('kit-card__detach');
    }
    // a section card prints its orders in Roman numerals; Probe Centre gives two in the centre
    expect(face('probeC')).toMatch(/>II<\/text>/);
  });

  it('a tactic card shows its symbol in an ink-engraved roundel; a section card shows the mini-map', () => {
    for (const kind of KINDS) {
      const html = face(kind);
      if (CARD_DEFS[kind].group === 'tactic') {
        expect(html, kind).toContain('data-device="engraved-roundel"');
        expect(html, kind).toMatch(/class="kit-roundel__hatch"/);
      } else {
        expect(html, kind).toContain('kit-card__minimap');
        expect(html, kind).not.toContain('engraved-roundel');
      }
    }
  });

  it('section and tactic cards carry their own colour band, and its title reads on it (AA)', async () => {
    const css = await readText('../../src/ui/kit/cards.css');
    expect(css).toMatch(/\.kit-card__header\s*\{[^}]*background:\s*var\(--g-main\)/);
    for (const [group, g] of Object.entries(GROUP_COLORS)) {
      expect(contrast(theme.color.parchmentLight, g.main), `title on the ${group} band`).toBeGreaterThanOrEqual(4.5);
      // the footer label (the group's name) is printed in the group colour on the card's paper
      expect(contrast(g.main, theme.color.parchment), `${group} label on paper`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('the card back', () => {
  const back = (size: CardSize) => renderToStaticMarkup(createElement(CardBack, { size }));

  it('is an original engraved design in ink on buff: a cartouche with crossed sabres in a guilloche, no laurel, no gold', () => {
    for (const size of SIZES) {
      const html = back(size);
      expect(html).not.toMatch(OLD);
      for (const g of GOLD_FILLS) expect(html.toLowerCase()).not.toContain(g);
      expect(html).toContain('data-device="cartouche"');
      expect(html).toContain('class="kit-cardback__guilloche"');
      expect(html).toContain('class="kit-cardback__sabres"');
      expect(html).toContain('aria-label="Command card (face down)"');
    }
  });

  it('names no card (the back hides its face)', () => {
    const html = back('md');
    for (const def of Object.values(CARD_DEFS)) expect(html).not.toContain(def.title);
  });
});

describe('the card sheet', () => {
  it('cards.css uses tokens, not metal: no metallic gradients, no leather, no colour literals', async () => {
    const css = await readText('../../src/ui/kit/cards.css');
    expect(css).not.toMatch(/var\(--kit-(bronze-metal|gold-metal|leather-tex|grain)\)/);
    expect(css).not.toMatch(OLD);
    expect(css.match(/#[0-9a-f]{3,8}\b/gi), 'hex colours in cards.css').toBeNull();
    // the card colours are the kit's ink and paper
    expect(css).toContain('var(--kit-ink)');
    expect(css).toContain('var(--kit-parchment-light)');
  });

  it('CardView.tsx draws no gold gradient and names no laurel icon for the back', async () => {
    const src = await readText('../../src/ui/kit/CardView.tsx');
    expect(src).not.toMatch(/GOLD|gradient=|laurels"|kit-cardback__laurels/);
  });

  it('the section mini-map is flat ink on paper: no glossy white sheen and no on-dark variant', async () => {
    const svg = renderToStaticMarkup(createElement(SectionMiniMap, { sections: ['left'], counts: { left: 2 }, size: 100 }));
    expect(svg).not.toMatch(/stop-color="#fff"/i);
    const src = await readText('../../src/ui/kit/SectionMiniMap.tsx');
    expect(src).not.toMatch(/onDark/);
    const gallery = await readText('../../src/dev/KitGallery.tsx');
    expect(gallery).not.toMatch(/onDark/);
  });
});
