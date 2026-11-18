// 1024×768 and 1280×800: the whole hand card shows, the bottom strip has one fixed height so the board never moves, and the
// army panel keeps its own rows in view or shows that it scrolls. jsdom has no layout, so these pin the stylesheet.
import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PromptBar } from '../../src/ui/game/prompts';

const css = (await readFile(new URL('../../src/ui/game/game.css', import.meta.url), 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');
/** The declarations of the first rule whose selector is exactly `sel`. */
function rule(sel: string): string {
  const m = new RegExp(`(?:^|\\})\\s*${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`, 'm').exec(css);
  return m?.[1] ?? '';
}

describe('the game screen at small sizes', () => {
  it('reserves one fixed height for the bottom strip, as a token, so the board does not jump', () => {
    expect(rule('.game-root')).toMatch(/--strip-h:\s*\d+px/);
    expect(rule('.game-root')).toMatch(/grid-template-rows:[^;]*var\(--strip-h\)/);
    expect(rule('.game-root')).not.toMatch(/grid-template-rows:[^;]*auto/);
    expect(rule('.bottom-strip')).toMatch(/height:\s*var\(--strip-h\)/);
  });

  /** The body of the media block whose query is `query`. */
  const media = (query: string): string => {
    const i = css.indexOf(`@media ${query} {`);
    if (i < 0) return '';
    let depth = 0;
    for (let j = css.indexOf('{', i); j < css.length; j++) {
      if (css[j] === '{') depth++;
      if (css[j] === '}' && --depth === 0) return css.slice(css.indexOf('{', i) + 1, j);
    }
    return '';
  };

  it('only small screens get the whole-card hand strip; large ones keep the peek-and-lift hand', () => {
    const small = media('(max-height: 820px), (max-width: 1280px)');
    const h = Number(/--strip-h:\s*(\d+)px/.exec(small)?.[1]);
    expect(h).toBeGreaterThanOrEqual(149 + 6 + 8); // a whole small card (149 px) and the selected card's step up
    expect(small).toMatch(/\.hand-cards\s*\{[^}]*height:\s*auto/);
    // outside the media block the hand is the approved peek: a clipped strip, cards pushed down, lifted on hover and focus
    expect(Number(/--strip-h:\s*(\d+)px/.exec(rule('.game-root'))![1])).toBeLessThan(149);
    expect(rule('.hand-cards')).toMatch(/height:\s*78px/);
    expect(css.replace(media('(max-height: 820px), (max-width: 1280px)'), '')).toMatch(/\.hand-slot\s*\{[^}]*translateY\(74px\)/);
  });

  it('no rule outside the small-screen blocks pushes a hand slot down except the peek', () => {
    const outside = css.replace(media('(max-height: 820px), (max-width: 1280px)'), '');
    const pushes = [...outside.matchAll(/(\.hand-slot[^{]*)\{[^}]*translateY\((-?\d+)px\)/g)].map((m) => [m[1].trim(), Number(m[2])] as const);
    expect(pushes.length).toBeGreaterThan(0);
    for (const [sel, y] of pushes) expect(y, sel).toBeGreaterThanOrEqual(0); // never a lift that leaves the strip
  });

  it('a long hand folds to the width the prompt bar leaves, and the bar may not outgrow the strip', () => {
    expect(css).toMatch(/\.hand-slot \+ \.hand-slot\s*\{[^}]*margin-left:\s*min\(-16px, calc\(\(100vw - \d+px - var\(--n/);
    expect(rule('.prompt-bar')).toMatch(/flex:\s*1 1 0/);
    expect(rule('.bottom-strip')).toMatch(/min-width:\s*0/);
  });

  it('the dice tray is never clipped: no overflow or max-height on its slot, at any size', () => {
    expect(css).not.toMatch(/\.dice-slot[^{]*\{[^}]*(overflow\s*:\s*hidden|max-height)/);
  });

  it('the log keeps 170 px on short screens (CLAUDE.md promises it)', () => {
    expect(rule('.log-panel')).toMatch(/min-height:\s*170px/);
    expect(media('(max-height: 820px)')).not.toMatch(/\.log-panel/);
  });

  it('a hovered or keyboard-focused card comes to the front of the overlapped fan', () => {
    expect(css).toMatch(/\.hand-slot:focus-within[^{]*\{[^}]*z-index/);
    expect(css).toMatch(/\.hand-slot:hover[^{]*\{[^}]*z-index/);
  });

  it('the prompt bar has a steady height and scrolls a long prompt inside itself', () => {
    const bar = rule('.prompt-bar');
    expect(bar).toMatch(/(?:^|[;\s])height:\s*calc\(var\(--strip-h\) - \d+px\)/);
    expect(bar).toMatch(/flex-direction:\s*column/);
    expect(rule('.prompt-body')).toMatch(/overflow-y:\s*auto/);
    expect(rule('.prompt-body')).toMatch(/min-height:\s*0/);
    // the buttons never scroll away and never shrink
    expect(rule('.prompt-buttons')).toMatch(/flex:\s*none/);
    expect(rule('.prompt-buttons')).not.toMatch(/overflow/);
  });

  it('the Scout prompt rises above the strip rather than hide its two whole cards', () => {
    expect(rule('.prompt-bar--rise')).toMatch(/height:\s*auto/);
    expect(rule('.prompt-bar--rise .prompt-body')).toMatch(/overflow-y:\s*visible/);
  });

  it('the buttons sit outside the scrolling body, for a prompt with and without extras', () => {
    const btn = createElement('button', { key: 'b' }, 'Go');
    const html = (prompt: Parameters<typeof PromptBar>[0]['prompt']) => renderToStaticMarkup(createElement(PromptBar, { prompt, error: 'oops' }));
    for (const prompt of [
      { title: 'Flags', text: 'long '.repeat(80), buttons: [btn], hint: 'a hint' },
      { title: 'Scout', text: 'x', buttons: [btn], rise: true, extra: createElement('div', { className: 'scout-cards' }) },
    ]) {
      const out = html(prompt);
      const bodyStart = out.indexOf('class="prompt-body"');
      const buttons = out.indexOf('class="prompt-buttons"');
      expect(bodyStart).toBeGreaterThan(0);
      // the body closes before the buttons open: count the divs between the two openings
      const between = out.slice(bodyStart, buttons);
      expect((between.match(/<div/g) ?? []).length).toBe((between.match(/<\/div>/g) ?? []).length);
      expect(buttons).toBeGreaterThan(bodyStart);
      if (prompt.rise) expect(out).toContain('prompt-bar--rise');
    }
  });

  it('the army panel compacts on short screens and shows a scroll shadow when it still scrolls', () => {
    expect(css).toMatch(/@media \(max-height: 8\d\dpx\)/);
    expect(rule('.army-panel .kit-panel__body')).toMatch(/linear-gradient[\s\S]*local/);
    expect(rule('.army-panel .kit-panel__body')).toMatch(/linear-gradient[\s\S]*scroll/);
  });
});
