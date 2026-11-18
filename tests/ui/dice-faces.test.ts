import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DIE_FACES } from '../../src/engine/rng';
import { DiceTray, DieView, FACE_LABEL } from '../../src/ui/kit/Dice';

// A variable specifier: the project has no Node type definitions. vitest loads .css as '', so files are read from disk.
const FS = 'node:fs';
const readText = async (p: string): Promise<string> => (await import(FS)).readFileSync(new URL(p, import.meta.url), 'utf8');

// the gradient ids differ per render, so strip them before comparing the drawing
const drawing = (html: string) => html.replace(/id="[^"]*"|url\(#[^)]*\)/g, '');

describe('Napoleonic die faces', () => {
  it('each of the five faces draws its own glyph', () => {
    const marks = DIE_FACES.map((face) => drawing(renderToStaticMarkup(createElement(DieView, { face }))));
    expect(new Set(marks).size).toBe(DIE_FACES.length);
  });

  it('faces are named Infantry, Cavalry, Artillery, Flag, Sabre', () => {
    expect(FACE_LABEL).toEqual({ infantry: 'Infantry', cavalry: 'Cavalry', artillery: 'Artillery', flag: 'Flag', sabre: 'Sabre' });
    for (const face of DIE_FACES) {
      const html = renderToStaticMarkup(createElement(DieView, { face }));
      expect(html).toContain('role="img"');
      expect(html).toContain(`aria-label="${FACE_LABEL[face]}"`);
    }
  });

  it('no Ancients die shapes or tokens remain', async () => {
    const dice = await readText('../../src/ui/kit/Dice.tsx');
    expect(dice).not.toMatch(/circle\)|triangle|square\)|Placeholder/);
    expect(dice).not.toContain('crossedSwords');
    const theme = await readText('../../src/ui/kit/theme.css');
    expect(theme).not.toMatch(/die-(light|medium|heavy)/);
    expect(theme).toMatch(/--kit-die-infantry/);
    const screens = await readText('../../src/ui/screens/screens.css');
    expect(screens).not.toMatch(/\.cls-(light|medium|heavy)/);
    for (const arm of ['infantry', 'cavalry', 'artillery']) expect(screens).toContain(`.cls-${arm}`);
    const credits = await readText('../../CREDITS.md');
    expect(credits).toContain('infantry, cavalry, artillery, flag and sabre die faces');
    expect(credits).not.toContain('Swords die face');
  });

  it('the tray marks hits and flags', () => {
    const html = renderToStaticMarkup(
      createElement(DiceTray, { faces: ['infantry', 'flag', 'sabre'], scoring: [true, false, false] }),
    );
    const count = (c: string) => html.split(`kit-die ${c}`).length - 1;
    expect(count('is-hit')).toBe(1);
    expect(count('is-flag')).toBe(1);
    expect(count('is-miss')).toBe(1);
  });
});
