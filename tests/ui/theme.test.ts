// The campaign-map theme (Plan 4 Task 10b): tokens, contrast, and the menu ornament.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NATIONS } from '../../src/engine/codes';
import { NATION_COLOUR, nationInk, theme } from '../../src/ui/kit/theme';
import { MainMenu } from '../../src/ui/screens/Menus';
import { Frame } from '../../src/ui/terrain/base';
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
    for (const k of ['parchment', 'parchmentLight', 'parchmentDark', 'ink', 'inkSoft', 'rule', 'green', 'crimson', 'royal', 'spanish', 'gold'] as const) {
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
      [c.inkSoft, c.felt, 4.5, '"no dice yet" text in the dice well'],
      [c.green, c.leather, 4.5, 'a finished dice order on a buff card'],
      [c.green, c.parchment, 4.5, 'green on paper'],
      [c.green, c.parchmentLight, 4.5, 'green on light paper'],
    ];
    for (const [fg, bg, min, what] of pairs) {
      expect(contrast(fg, bg), `${what}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(min);
    }
  });

  it('ruled accents stand out from the paper (non-text contrast, 3:1)', () => {
    const c = theme.color;
    expect(contrast(c.spanish, c.parchmentLight), 'Spanish-yellow tab underline on its tab').toBeGreaterThanOrEqual(3);
    expect(contrast(c.spanish, c.parchment), 'Spanish yellow on paper').toBeGreaterThanOrEqual(3);
  });

  it('the board margin\'s LEFT / RIGHT captions are AA on the buff margin', () => {
    const svg = renderToStaticMarkup(createElement('svg', null, createElement(Frame, { outline: '', x1: 300, x2: 700 })));
    const captions = [...svg.matchAll(/<text[^>]*fill="([^"]+)"[^>]*>(LEFT|RIGHT)<\/text>/g)];
    expect(captions).toHaveLength(4);
    for (const [, fill] of captions) expect(contrast(fill, theme.color.leather), `caption ${fill} on the margin`).toBeGreaterThanOrEqual(4.5);
  });

  it('game.css names your side\'s green by its token', async () => {
    const game = await readText('../../src/ui/game/game.css');
    expect(game).not.toMatch(/#2f5d2a/i);
    expect(game).toContain('var(--kit-green)');
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

describe('nation colours for both sides (Task 10d)', () => {
  it('the side colour of each nation is its nation token, Spain included', () => {
    expect(nationInk('FR')).toBe('var(--kit-royal)');
    expect(nationInk('BR')).toBe('var(--kit-crimson)');
    expect(nationInk('PT')).toBe('var(--kit-portuguese)');
    expect(nationInk('AL')).toBe('var(--kit-allied)');
    expect(nationInk('SP')).toBe('var(--kit-spanish-ink)');
    for (const n of NATIONS) expect(nationInk(n), n).toBe(`var(--kit-${kebab(NATION_COLOUR[n])})`);
  });

  it('every nation colour is AA as text on paper and on buff, and 3:1 as a mark on the dice well', () => {
    const c = theme.color;
    for (const n of NATIONS) {
      const ink = c[NATION_COLOUR[n]];
      for (const [bg, name] of [[c.parchment, 'paper'], [c.parchmentLight, 'light paper'], [c.leather, 'buff'], [c.leatherDark, 'dark buff']] as const) {
        expect(contrast(ink, bg), `${n} ${ink} on ${name}`).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrast(ink, c.felt), `${n} mark on the well`).toBeGreaterThanOrEqual(3);
    }
  });

  it('the game screen colours each side by its nation, not green for you and red for the enemy', async () => {
    const game = await readText('../../src/ui/game/game.css');
    const rule = (sel: string) => new RegExp(`${sel.replace(/\./g, '\\.')}\\s*\\{([^}]*)\\}`).exec(game)?.[1] ?? '';
    for (const sel of ['.side-me', '.army-name.me', '.log-me', '.log-banner.log-me']) {
      expect(rule(sel), sel).toContain('var(--side-me)');
      expect(rule(sel), sel).not.toMatch(/green|crimson/);
    }
    for (const sel of ['.side-them', '.army-name.them', '.log-them', '.log-banner.log-them']) {
      expect(rule(sel), sel).toContain('var(--side-them)');
      expect(rule(sel), sel).not.toMatch(/green|crimson/);
    }
  });

  it('the rendered game screen sets each side\'s colour from its nation, and your chip says "(you)"', async () => {
    stubStorage();
    const { GameScreen } = await import('../../src/ui/game/GameScreen');
    const { GameController, newSessionConfig } = await import('../../src/ui/game/controller');
    const { SeededOpponent } = await import('./controller-helpers');
    // [battle, human side, your colour, the enemy's colour]: 001 French v Anglo-Portuguese, 105 French v Spanish
    const cases = [
      ['001', 'bottom', 'royal', 'crimson'],
      ['001', 'top', 'crimson', 'royal'],
      ['105', 'top', 'spanish-ink', 'royal'],
    ] as const;
    for (const [id, human, me, them] of cases) {
      const c = new GameController({ ...newSessionConfig(id, human, 'captain'), seed: 5 }, new SeededOpponent());
      const html = renderToStaticMarkup(createElement(GameScreen, { controller: c, onExit: () => {} }));
      const root = /<div class="game-root" style="([^"]*)"/.exec(html)?.[1] ?? '';
      expect(root, `${id} ${human}`).toContain(`--side-me:var(--kit-${me})`);
      expect(root, `${id} ${human}`).toContain(`--side-them:var(--kit-${them})`);
      const mine = c.view.display.active === human;
      const chipHtml = /<span class="side-chip side-(?:me|them)">(?:(?!<\/span>).)*(?:<span class="you"> \(you\)<\/span>)?<\/span>/.exec(html)?.[0] ?? '';
      expect(chipHtml, `${id} ${human} chip`).not.toBe('');
      expect(chipHtml, `${id} ${human}`).toContain(`side-chip side-${mine ? 'me' : 'them'}`);
      expect(chipHtml.includes('(you)'), `${id} ${human} (you)`).toBe(mine);
      expect(chipHtml).toContain(c.view.display.players[c.view.display.active].army);
      c.dispose();
    }
  });
});

describe('carried from the Task 10b review', () => {
  it('no green alpha literals and no victory-dialog ink literals in game.css', async () => {
    const game = await readText('../../src/ui/game/game.css');
    expect(game).not.toMatch(/rgba\(47,\s*93,\s*42/);
    expect(game).not.toMatch(/#6a1512|#5a4630|#4a3820/i);
  });

  it('the tooltip has no gold tones and the square counter no bronze ring: ink and paper', async () => {
    const game = await readText('../../src/ui/game/game.css');
    expect(game).not.toMatch(/#f3dc9a|#f6d27a|#e2bd72|#f6e7b6|#2a2318/i);
    // a paper disc with an ink ring, so it stands apart from the dark arm badge
    expect(game).toMatch(/\.square-counter circle\s*\{[^}]*fill:\s*var\(--kit-parchment-light\)[^}]*stroke:\s*var\(--kit-ink\)/);
    expect(game).toMatch(/\.square-counter text\s*\{[^}]*fill:\s*var\(--kit-ink\)/);
  });

  it('a won side is shown in ink and weight where the side is not known, never in British red for everyone', async () => {
    const game = await readText('../../src/ui/game/game.css');
    const controls = await readText('../../src/ui/kit/controls.css');
    const rule = (css: string, sel: string) => new RegExp(`${sel.replace(/[.()]/g, (c) => `\\${c}`)}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
    for (const sel of ['.victory-row.is-winner .victory-army, .victory-row.is-winner .victory-count', '.match-table .match-outcome.is-won', '.match-n.is-ahead', '.log-victory']) {
      expect(rule(game, sel), sel).not.toBe('');
      expect(rule(game, sel), sel).not.toMatch(/crimson/);
    }
    for (const sel of ['.kit-banners.is-near .kit-banners__count', '.kit-banners.is-won']) {
      expect(rule(controls, sel), sel).not.toBe('');
      expect(rule(controls, sel), sel).not.toMatch(/crimson|163, 38, 42/);
    }
  });

  it('a hit die is ringed in red ink, not a gold glow', async () => {
    const dice = await readText('../../src/ui/kit/dice.css');
    const hit = /\.kit-die\.is-hit \.kit-die__body\s*\{([^}]*)\}/.exec(dice)?.[1] ?? '';
    expect(hit).toContain('var(--kit-crimson)');
    expect(hit).not.toMatch(/#f8d878|250, 205, 80|150, 100, 20/);
  });

  it('the kit gallery: its tooltip line is light on the ink slip, its mini-maps are on paper, its red is the token', async () => {
    const gallery = await readText('../../src/dev/KitGallery.tsx');
    const line = /<i style=\{\{ color: '([^']+)' \}\}>vs British Line Infantry/.exec(gallery);
    expect(line, 'tooltip line').not.toBeNull();
    expect(line![1]).toMatch(/var\(--kit-parchment/);
    expect(gallery).not.toMatch(/onDark/);
    expect(gallery).not.toMatch(/#6a1512|106,\s*21,\s*18/i);
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
