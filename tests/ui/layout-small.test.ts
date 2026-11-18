// 1024×768 and 1280×800: the whole hand card shows, the bottom strip has one fixed height so the board never moves, and the
// army panel keeps its own rows in view or shows that it scrolls. jsdom has no layout, so these pin the stylesheet.
import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

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

  it('the strip is tall enough for a whole small card (149 px) and the selected card\'s step up', () => {
    const h = Number(/--strip-h:\s*(\d+)px/.exec(rule('.game-root'))![1]);
    expect(h).toBeGreaterThanOrEqual(149 + 6 + 8);
  });

  it('the hand is not pushed below the strip edge, and has no fixed clipping height', () => {
    expect(css).not.toMatch(/\.hand-slot[^{]*\{[^}]*translateY\(\d{2,}px\)/);
    expect(rule('.hand-cards')).not.toMatch(/(?:^|[;\s])height:/);
  });

  it('a hovered or keyboard-focused card comes to the front of the overlapped fan', () => {
    expect(css).toMatch(/\.hand-slot:focus-within[^{]*\{[^}]*z-index/);
    expect(css).toMatch(/\.hand-slot:hover[^{]*\{[^}]*z-index/);
  });

  it('the prompt bar has a steady height and scrolls a long prompt inside itself', () => {
    const bar = rule('.prompt-bar');
    expect(bar).toMatch(/(?:^|[;\s])height:\s*\d+px/);
    expect(bar).not.toMatch(/min-height:\s*[1-9]\d{2}/);
    expect(bar).toMatch(/overflow-y:\s*auto/);
  });

  it('the army panel compacts on short screens and shows a scroll shadow when it still scrolls', () => {
    expect(css).toMatch(/@media \(max-height: 8\d\dpx\)/);
    expect(rule('.army-panel .kit-panel__body')).toMatch(/linear-gradient[\s\S]*local/);
    expect(rule('.army-panel .kit-panel__body')).toMatch(/linear-gradient[\s\S]*scroll/);
  });
});
