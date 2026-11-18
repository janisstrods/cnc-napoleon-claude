// Plan 4 Task 11 (carries m-a, m-b, m-c, 6): the GameScreen wiring that the keyboard depends on, pinned by exact source
// lines (the screen is not rendered in a test), and the rules text's label for the keyboard help.
import { describe, expect, it } from 'vitest';

// A variable specifier: the project has no Node type definitions. vitest loads .css as '', so files are read from disk.
const FS = 'node:fs';
const readText = async (p: string): Promise<string> => (await import(FS)).readFileSync(new URL(p, import.meta.url), 'utf8');

describe('GameScreen keyboard wiring', () => {
  it('goes to the board by focusing it and showing the cursor', async () => {
    const src = await readText('../../src/ui/game/GameScreen.tsx');
    expect(src).toContain("document.querySelector<SVGSVGElement>('.board-svg')?.focus();\n      setKbd(true);");
  });

  it('a cursor step also moves the hover, so the tooltip and path preview follow it', async () => {
    const src = await readText('../../src/ui/game/GameScreen.tsx');
    expect(src).toContain("if (step.hover !== undefined) setUi((u) => (u.hoverHex === step.hover ? u : { ...u, hoverHex: step.hover as HexId }));");
  });

  it('the jump to a new decision honours keepFocus and sets the hover at once', async () => {
    const src = await readText('../../src/ui/game/GameScreen.tsx');
    expect(src).toContain('if (jump?.keepFocus) return;');
    expect(src).toContain('if (jump && jump.keepFocus) setUi((u) => (u.hoverHex === jump.cursor ? u : { ...u, hoverHex: jump.cursor }));');
  });

  it('the global Enter skips the board unless the cursor is shown', async () => {
    const src = await readText('../../src/ui/game/GameScreen.tsx');
    expect(src).toContain("if (t instanceof Element && t.closest('.board-svg') && kbdRef.current) return;");
  });

  it('the live region speaks on cursor moves and jumps, not on every label change', async () => {
    const src = await readText('../../src/ui/game/GameScreen.tsx');
    expect(src).toContain('<div className="board-live" role="status" aria-live="polite">{live}</div>');
    expect(src).toContain('setLive(kbd ? labelRef.current : \'\');');
    expect(src).toContain('}, [kbd, cursor]);');
  });
});

describe('the rules text marks the keyboard help as ours', () => {
  it('has a comment above Controls and Keyboard and says so in the header', async () => {
    const src = await readText('../../src/ui/screens/rulesText.ts');
    expect(src.split('\n').slice(0, 6).join('\n')).toContain('UI help, not from the RR');
    expect(src.match(/\/\/ UI help, not from the RR\n\s*\{\n\s*heading: '(Controls|Keyboard)'/g)).toHaveLength(2);
  });
});
