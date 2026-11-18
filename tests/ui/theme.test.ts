// The campaign-map theme (Plan 4 Task 10b): tokens, contrast, and the menu ornament.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { theme } from '../../src/ui/kit/theme';
import { MainMenu } from '../../src/ui/screens/Menus';
import { stubStorage, useStubStorageCleanup } from '../support/storage';

const FS = 'node:fs';
const readText = async (p: string): Promise<string> => (await import(FS)).readFileSync(new URL(p, import.meta.url), 'utf8');

useStubStorageCleanup();

/** The custom properties of theme.css's `:root` block, name (without `--`) to value. */
async function rootTokens(): Promise<Map<string, string>> {
  const css = await readText('../../src/ui/kit/theme.css');
  const root = /:root\s*\{([\s\S]*?)\n\}/.exec(css);
  if (!root) throw new Error('theme.css has no :root block');
  const out = new Map<string, string>();
  for (const m of root[1].matchAll(/--([\w-]+):\s*([^;]+);/g)) out.set(m[1], m[2].trim().replace(/\s+/g, ' '));
  return out;
}

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function rgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`not a #rrggbb colour: ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** WCAG 2 contrast ratio of two #rrggbb colours. */
export function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = rgb(hex).map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('theme tokens', () => {
  it('theme.ts mirrors theme.css for every token it exports', async () => {
    const css = await rootTokens();
    const same = (name: string, value: string) => expect(css.get(name), `--${name}`).toBe(value);
    same('kit-font-title', theme.font.title);
    same('kit-font-body', theme.font.body);
    for (const [k, v] of Object.entries(theme.color)) same(`kit-${kebab(k)}`, v);
    for (const [k, v] of Object.entries(theme.dice)) same(`kit-die-${k}`, v);
    for (const [k, v] of Object.entries(theme.radius)) same(`kit-radius-${k}`, `${v}px`);
    same('kit-shadow-soft', theme.shadow.soft);
    same('kit-shadow-lifted', theme.shadow.lifted);
    same('kit-group-section', theme.group.section.main);
    same('kit-group-tactic', theme.group.tactic.main);
  });

  it('has the campaign-map palette: paper, ink, rules and the three national accents', () => {
    for (const k of ['parchment', 'parchmentLight', 'parchmentDark', 'ink', 'inkSoft', 'rule', 'crimson', 'royal', 'spanish', 'gold'] as const) {
      expect(theme.color[k], k).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('every text and background pair meets WCAG AA', () => {
    const c = theme.color;
    // [text, background, minimum, what]
    const pairs: [string, string, number, string][] = [
      [c.ink, c.parchment, 4.5, 'body text on paper'],
      [c.ink, c.parchmentLight, 4.5, 'body text on light paper'],
      [c.ink, c.parchmentDark, 4.5, 'body text on a paper wash'],
      [c.ink, c.leather, 4.5, 'body text on a buff card'],
      [c.ink, c.leatherDark, 4.5, 'body text on a dark buff card'],
      [c.inkSoft, c.parchment, 4.5, 'secondary text on paper'],
      [c.inkSoft, c.parchmentLight, 4.5, 'secondary text on light paper'],
      [c.inkSoft, c.leather, 4.5, 'secondary text on a buff card'],
      [c.crimson, c.parchment, 4.5, 'British-red titles and warnings on paper'],
      [c.crimson, c.leather, 4.5, 'British-red text on a buff card'],
      [c.royal, c.parchment, 4.5, 'French-blue text on paper'],
      [c.royal, c.leather, 4.5, 'French-blue text on a buff card'],
      [c.parchmentLight, c.crimson, 4.5, 'primary button label'],
      [c.parchmentLight, c.royal, 4.5, 'label on a French-blue plate'],
      [c.parchment, c.wood, 4.5, 'text on the ink-blue map margin (tooltips, notices)'],
      [c.parchment, c.woodLight, 4.5, 'text on the lighter map margin'],
      [c.ink, c.felt, 3, 'large text in the dice well'],
    ];
    for (const [fg, bg, min, what] of pairs) {
      expect(contrast(fg, bg), `${what}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(min);
    }
  });

  it('the surfaces are paper and ink, not wood, leather or bronze', async () => {
    const themeCss = await readText('../../src/ui/kit/theme.css');
    const sheets = {
      'screens.css': await readText('../../src/ui/screens/screens.css'),
      'game.css': await readText('../../src/ui/game/game.css'),
      'controls.css': await readText('../../src/ui/kit/controls.css'),
      'dice.css': await readText('../../src/ui/kit/dice.css'),
    };
    // the wood planks and the leather vignette are gone from the surface classes
    expect(themeCss).not.toMatch(/planks|leather vignette/i);
    for (const [name, text] of Object.entries(sheets)) {
      expect(text, name).not.toMatch(/var\(--kit-(woodgrain|bronze-metal|gold-metal|leather-tex)\)/);
      expect(text, name).not.toMatch(/#33200f|#241509|#2a190c/i);
    }
    // the dark tables are paper now
    const paper = (hex: string) => rgb(hex).reduce((a, b) => a + b, 0) / 3 > 190;
    expect(paper(theme.color.parchment)).toBe(true);
    expect(paper(theme.color.leather), 'the default panel is a buff card').toBe(true);
  });
});

describe('the main menu ornament', () => {
  it('is a compass rose in a cartouche, not a laurel wreath with swords', async () => {
    stubStorage();
    const html = renderToStaticMarkup(createElement(MainMenu, { saved: null, onNew: () => {}, onContinue: () => {} }));
    const emblem = /<div class="menu-emblem"[\s\S]*?<\/svg>/.exec(html)?.[0] ?? '';
    expect(emblem).toContain('data-ornament="compass-rose"');
    expect(html).toContain('class="menu-cartouche"');
    const src = await readText('../../src/ui/screens/Menus.tsx');
    expect(src).not.toMatch(/laurels|crossedSwords/);
    const css = await readText('../../src/ui/screens/screens.css');
    expect(css).not.toMatch(/menu-emblem-swords/);
  });
});
