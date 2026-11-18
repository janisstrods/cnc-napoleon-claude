import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import indexHtml from '../../index.html?raw';
import credits from '../../CREDITS.md?raw';
import { CARD_ICONS } from '../../src/ui/kit/CardView';
import { iconPath } from '../../src/ui/kit/Icon';
import { ICON_PATHS } from '../../src/ui/kit/icons/paths';
import { NAP_GLYPHS } from '../../src/ui/kit/icons/napGlyphs';
import { CreditsText } from '../../src/ui/screens/Menus';

// The globs give paths only: vitest loads every .css file as '' (even with ?raw), so each file is read from disk.
const ui = import.meta.glob('../../src/ui/**/*.{ts,tsx,css}');
const art = import.meta.glob('../../src/art/*.{ts,tsx}');
const dev = import.meta.glob('../../src/dev/*.tsx');
const menus = import.meta.glob<string>('../../src/ui/screens/Menus.tsx', { eager: true, query: '?raw', import: 'default' });
// A variable specifier: the project has no Node type definitions.
const FS = 'node:fs';
const readText = async (p: string): Promise<string> => (await import(FS)).readFileSync(new URL(p, import.meta.url), 'utf8');

// 'Times New Roman' (font stacks) and "Roman numerals" (SectionMiniMap.tsx:14) are not Ancients words
const ANCIENT = /\b(Ancients?|Carthag\w*|Syracus\w*|(?<!New )Roman(?! numerals)|Rome|Caesar|Spartan?|Spartacus|legions?|Recruit|Tribune|Consul)\b/;

describe('Ancients remnants', () => {
  it('no Ancients words in the UI, kit, top-level art, dev galleries, index.html or CREDITS.md', async () => {
    const paths = [ui, art, dev].flatMap((g) => Object.keys(g)).filter((p) => !p.includes('/src/ui/history/'));
    const files: Record<string, string> = { 'index.html': indexHtml, 'CREDITS.md': credits };
    for (const p of paths) files[p] = await readText(p);
    expect(Object.keys(files).length).toBeGreaterThan(50);
    expect(paths.filter((p) => p.endsWith('.css')).length).toBeGreaterThan(5);
    for (const [p, s] of Object.entries(files)) {
      expect(s.length, p).toBeGreaterThan(0);
      expect(s.match(ANCIENT), p).toBeNull();
    }
  });

  it('the card icons are Napoleonic: no caesar, romanShield, helmet, spartan, sling or bowman glyph', () => {
    const banned = ['caesar', 'romanShield', 'helmet', 'spartan', 'sling', 'bowman'];
    for (const [kind, name] of Object.entries(CARD_ICONS)) {
      expect(banned, kind).not.toContain(name);
      expect(iconPath(name!).length, kind).toBeGreaterThan(0);
    }
    for (const b of banned) expect(Object.keys(ICON_PATHS)).not.toContain(b);
    expect(CARD_ICONS.leadership).toBe('bicorne');
    expect(CARD_ICONS.reconInForce).toBe('spyglass');
    expect(CARD_ICONS.shortSupply).toBe('breadBag');
    expect(Object.keys(NAP_GLYPHS)).toEqual(expect.arrayContaining(['bicorne', 'spyglass', 'breadBag']));
  });

  it('every game-icons glyph left is credited, and every credited icon is used', () => {
    const rows = [...credits.matchAll(/^\| ([^|]+) \| (?:Lorc|Delapouite) \|/gm)].map((m) => m[1].trim());
    const camel = (s: string) => s.toLowerCase().replace(/ (\w)/g, (_, c: string) => c.toUpperCase());
    // the credited name of a glyph is its game-icons name; the table lists them in words
    const credited = rows.map(camel).sort();
    const have = Object.keys(ICON_PATHS).sort();
    expect(credited).toEqual(have);
    expect(credits).not.toMatch(/ancient historians|Greece & Eastern Kingdoms|Barbarians|Civil Wars/);
  });

  it("the title is ours, the trademark is GMT's", () => {
    expect(indexHtml).toContain('<title>Commands &amp; Colours: Napoleonics</title>');
    const html = renderToStaticMarkup(createElement(CreditsText));
    expect(html.split('Commands &amp; Colors: Napoleonics').length - 1).toBe(1);
    expect(html).toContain('Commands &amp; Colors is a trademark of GMT Games LLC');
    // the menu's Credits dialog still shows it
    expect(Object.values(menus)[0]).toMatch(/title="Credits"[^\n]*>\s*<CreditsText \/>/);
  });
});
