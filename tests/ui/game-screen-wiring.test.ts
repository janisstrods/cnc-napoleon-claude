// Plan 4 Task 11 (carries m-a, m-b, m-c, 6): the GameScreen wiring that the keyboard depends on, pinned by exact source
// lines (the screen is not rendered in a test), and the rules text's label for the keyboard help.
import { describe, expect, it } from 'vitest';
import type { GameController, ViewState } from '../../src/ui/game/controller';
import { gamePrompt } from '../../src/ui/game/prompts';
import type { UiSel } from '../../src/ui/game/uiModel';
import { build, leaderId } from '../rules/helpers';

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
    const hover = 'if (jump && jump.keepFocus && kbdRef.current) setUi((u) => (u.hoverHex === jump.cursor ? u : { ...u, hoverHex: jump.cursor }));';
    const keep = 'if (jump?.keepFocus) return;';
    expect(src).toContain(hover);
    expect(src).toContain(keep);
    // the hover is set before the effect returns for a kept focus, and only for the keyboard (a mouse player has no cursor hover)
    expect(src.indexOf(hover)).toBeLessThan(src.indexOf(keep));
  });

  it('the global Enter skips the board unless the cursor is shown', async () => {
    const src = await readText('../../src/ui/game/GameScreen.tsx');
    expect(src).toContain("if (t instanceof Element && t.closest('.board-svg') && kbdRef.current) return;");
  });

  it('the live region speaks on cursor moves and jumps, not on every label change', async () => {
    const src = await readText('../../src/ui/game/GameScreen.tsx');
    expect(src).toContain('<div className="board-live" role="status" aria-live="polite">{live}</div>');
    expect(src).toContain('labelRef.current = cursorLabel;');
    expect(src).toContain('const t = setTimeout(() => setLive(labelRef.current), 30);');
    expect(src).toContain('}, [kbd, cursor, liveTick]);');
    // a jump onto the hex the cursor is already on speaks too
    expect(src).toContain('setLiveTick((n) => n + 1);');
  });
});

describe('the rules text marks the keyboard help as ours', () => {
  it('has a comment above Controls and Keyboard and says so in the header', async () => {
    const src = await readText('../../src/ui/screens/rulesText.ts');
    expect(src.split('\n').slice(0, 6).join('\n')).toContain('UI help, not from the RR');
    expect(src.match(/\/\/ UI help, not from the RR\n\s*\{\n\s*heading: '(Controls|Keyboard)'/g)).toHaveLength(2);
  });
});

describe('the move prompt', () => {
  const st = build({
    units: [{ side: 'bottom', key: 'BR/LN', at: [6, 5] }, { side: 'top', key: 'FR/LN', at: [2, 6] }],
    leaders: [{ side: 'bottom', at: [7, 7], name: 'Wellesley' }],
  });
  const promptText = (sel: string) => {
    const noop = () => {};
    const view = { pending: { kind: 'move', side: 'bottom' }, over: null, fatal: false, generalThinking: false, undo: null, display: st } as unknown as ViewState;
    const ui: UiSel = { selCard: null, hoverCard: null, orderSel: [], selPiece: sel, hoverHex: null, hoverAction: null, assign: null, gunSel: [] };
    const p = gamePrompt({ controller: {} as GameController, view, s: st, human: 'bottom', ai: 'top', ui, setUi: noop, answer: noop, onExit: noop });
    return p!.text;
  };
  it('explains the battle colours for a unit but not for a leader, who never battles', () => {
    expect(promptText('u1')).toContain('green = may battle after moving');
    const text = promptText(leaderId(st, 0));
    expect(text).toContain('Wellesley');
    expect(text).not.toContain('battle');
  });
});
