// Plan 4 Task 10: the campaign-map theme (title font), accessibility basics and the carried review items.
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import pkg from '../../package.json?raw';
import credits from '../../CREDITS.md?raw';
import mainTsx from '../../src/main.tsx?raw';
import rulesTextSrc from '../../src/ui/screens/rulesText.ts?raw';
import { answerError, eligiblePieces, shortSupplyTargets, type Answer, type Decision, type GameEvent, type GameState } from '../../src/engine';
import { ObjectiveMarkers } from '../../src/ui/terrain/objectives';
import { DiceTray, DieView, FACE_LABEL } from '../../src/ui/kit/Dice';
import { dialogTab, focusWrap, type DialogItem } from '../../src/ui/kit/controls';
import controlsSrc from '../../src/ui/kit/controls.tsx?raw';
import gameScreenSrc from '../../src/ui/game/GameScreen.tsx?raw';
import { SquareTrack } from '../../src/ui/game/SquareTrack';
import { theme } from '../../src/ui/kit/theme';
import { LogPanel } from '../../src/ui/game/panels';
import { PromptBar, focusNewDecision, focusPromptTarget, gamePrompt } from '../../src/ui/game/prompts';
import { devRouteConfig, initialSpeed, type GameController, type ViewState } from '../../src/ui/game/controller';
import { boardMarks, escapeSelection, gunDice, wantsPromptFocus, type UiSel } from '../../src/ui/game/uiModel';
import { RULES_TEXT } from '../../src/ui/screens/rulesText';
import { MUTED_KEY } from '../../src/ui/sound';
import { storageKey } from '../../src/ui/storage';
import { H, build, ev, forceDice, must, n, toBattle, type Pos } from '../rules/helpers';

const SEL: UiSel = { selCard: null, hoverCard: null, orderSel: [], selPiece: null, hoverHex: null, hoverAction: null, assign: null, gunSel: [] };
const noop = () => {};
// A variable specifier: the project has no Node type definitions. vitest loads .css as '', so the file is read from disk.
const FS = 'node:fs';
const readText = async (p: string): Promise<string> => (await import(FS)).readFileSync(new URL(p, import.meta.url), 'utf8');

describe('announcements and names', () => {
  it('the prompt bar announces, the log is a log', () => {
    const prompt = { title: 'Movement', text: 'Select a piece.', buttons: [] };
    const bar = renderToStaticMarkup(createElement(PromptBar, { prompt, error: null }));
    expect(bar).toContain('role="status"');
    expect(bar).toContain('aria-live="polite"');
    expect(bar).toContain('Movement');
    // the live region exists while there is no prompt too, so that the next one is announced
    const idle = renderToStaticMarkup(createElement(PromptBar, { prompt: null, error: null }));
    expect(idle).toContain('role="status"');
    expect(idle).toContain('aria-live="polite"');
    const log = renderToStaticMarkup(createElement(LogPanel, { log: [{ id: 1, kind: 'info', text: 'Turn 1', side: null }] as never, human: 'bottom' }));
    expect(log).toContain('role="log"');
  });

  it('dice and the tray have accessible names', () => {
    for (const face of ['infantry', 'cavalry', 'artillery', 'flag', 'sabre'] as const) {
      expect(renderToStaticMarkup(createElement(DieView, { face }))).toContain(`aria-label="${FACE_LABEL[face]}"`);
    }
    const tray = renderToStaticMarkup(createElement(DiceTray, { faces: ['infantry', 'flag'], scoring: [true, false] }));
    expect(tray).toContain('aria-label="1 hit, 1 flag"');
  });

  it('objective markers carry their text', () => {
    const html = renderToStaticMarkup(createElement('svg', null, createElement(ObjectiveMarkers, {
      objectives: [{ kind: 'tempHex', side: 'bottom', hex: H(4, 6), timing: 'turnStart', banners: 1, text: 'Vimiero' }],
      objState: [{ held: false, count: 0 }],
      flipped: false,
      nations: { top: 'FR', bottom: 'BR' },
    })));
    expect(html).toContain('<title>Vimiero</title>');
  });
});

describe('motion, sound and focus', () => {
  it('reduced motion speeds the animations unless the player chose a speed', () => {
    expect(initialSpeed(null, true)).toBe(4);
    expect(initialSpeed('1', true)).toBe(1);
    expect(initialSpeed('0.6', true)).toBe(0.6);
    expect(initialSpeed(null, false)).toBe(1);
    expect(initialSpeed('2', false)).toBe(2);
    expect(initialSpeed('junk', true)).toBe(4);
  });

  describe('the silent-browser flag', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.resetModules();
    });
    it('is ccn-muted, and with it stored no sound is made', async () => {
      expect(MUTED_KEY).toBe(storageKey('muted'));
      expect(MUTED_KEY).toBe('ccn-muted');
      let made = 0;
      class FakeAudio { constructor() { made++; } }
      vi.stubGlobal('window', { AudioContext: FakeAudio });
      vi.stubGlobal('localStorage', { getItem: (k: string) => (k === MUTED_KEY ? '1' : null), setItem: noop, removeItem: noop });
      vi.resetModules();
      const { sfx, isMuted } = await import('../../src/ui/sound');
      expect(isMuted()).toBe(true);
      sfx.dice(3);
      sfx.hit();
      expect(made).toBe(0);
      // the same stub unmuted does reach the audio context (the test can fail)
      vi.stubGlobal('localStorage', { getItem: () => null, setItem: noop, removeItem: noop });
      vi.resetModules();
      const loud = await import('../../src/ui/sound');
      expect(loud.isMuted()).toBe(false);
      try { loud.sfx.hit(); } catch { /* the fake context is not a real one */ }
      expect(made).toBe(1);
    });
  });

  it('focus moves to a new human decision for keyboard players only', () => {
    const d: Decision = { kind: 'move', side: 'bottom' } as Decision;
    expect(wantsPromptFocus(d, 'bottom', false)).toBe(true);
    expect(wantsPromptFocus(d, 'bottom', true)).toBe(false); // the pointer is over the board
    expect(wantsPromptFocus(d, 'top', false)).toBe(false); // the computer's decision
    expect(wantsPromptFocus(null, 'bottom', false)).toBe(false);
  });
});

describe('dialog focus', () => {
  it('Tab wraps round inside a dialog', () => {
    expect(focusWrap(2, 3, false)).toBe(0);
    expect(focusWrap(0, 3, true)).toBe(2);
    expect(focusWrap(1, 3, false)).toBe(2);
    expect(focusWrap(1, 3, true)).toBe(0);
    expect(focusWrap(-1, 3, false)).toBe(0);
    expect(focusWrap(-1, 3, true)).toBe(2);
    expect(focusWrap(0, 0, false)).toBe(-1);
  });
});

describe('the title font', () => {
  it('is IM Fell English SC and Cinzel is gone', async () => {
    const themeCss = await readText('../../src/ui/kit/theme.css');
    expect(theme.font.title.startsWith("'IM Fell English SC'")).toBe(true);
    expect(themeCss).toMatch(/--kit-font-title:\s*'IM Fell English SC'/);
    expect(mainTsx).toContain('@fontsource/im-fell-english-sc');
    for (const [name, text] of [['package.json', pkg], ['main.tsx', mainTsx], ['CREDITS.md', credits], ['theme.css', themeCss]] as const) {
      expect(text.toLowerCase(), name).not.toContain('cinzel');
    }
    expect(pkg).toContain('@fontsource/im-fell-english-sc');
    expect(credits).toContain('IM Fell English SC');
  });
});

// ---------------------------------------------------------------------------------------------------- carries

type Unit1 = NonNullable<Pos['units']>[number];
const bot = (key: Unit1['key'], at: [number, number], extra: object = {}): Unit1 => ({ side: 'bottom', key, at, ...extra }) as Unit1;
const top = (key: Unit1['key'], at: [number, number], extra: object = {}): Unit1 => ({ side: 'top', key, at, ...extra }) as Unit1;
const ctx = (s: GameState, d: Decision, ui: UiSel = SEL, answer: (a: Answer) => void = noop) => {
  const view = { pending: d, over: null, fatal: false, generalThinking: false, undo: null, display: s } as unknown as ViewState;
  return { controller: {} as GameController, view, s, human: 'bottom' as const, ai: 'top' as const, ui, setUi: noop, answer, onExit: noop };
};
const markup = (...els: unknown[]) => renderToStaticMarkup(createElement(Fragment, null, ...(els as never[])));

describe('Short Supply by keyboard (Task 4 review)', () => {
  const s = build({ units: [bot('BR/LN', [6, 6]), bot('BR/HC', [6, 7]), top('FR/LN', [2, 6])] });
  it('the unit chooser is a list with one entry per unit, and every entry is a legal answer', () => {
    const d: Decision = { kind: 'shortSupplyTarget', side: 'bottom', options: shortSupplyTargets(s, 'bottom') };
    const p = gamePrompt(ctx(s, d))!;
    const html = markup(p.extra);
    expect(html).toContain('<select');
    expect((html.match(/<option/g) ?? []).length).toBe(d.options.length);
    const choices = (p.extra as { props: { choices: { answer: Answer }[] } }).props.choices;
    expect(choices).toHaveLength(d.options.length);
    for (const c of choices) expect(answerError(s, d, c.answer)).toBeNull();
    expect(p.buttons.map((b) => String(b.key))).toEqual(['auto']);
  });
  it('the hex chooser is a list of its hexes too', () => {
    const hexes = [H(8, 4), H(8, 5)];
    const d: Decision = { kind: 'shortSupplyHex', side: 'bottom', unit: 'u1', options: hexes };
    const p = gamePrompt(ctx(s, d))!;
    expect((markup(p.extra).match(/<option/g) ?? []).length).toBe(2);
    expect(p.buttons.map((b) => String(b.key))).toEqual(['auto']);
  });
});

describe('Combined Arms by keyboard (Task 7 review)', () => {
  const P: Pos = { units: [bot('BR/LN', [5, 6]), top('FR/LN', [4, 6]), bot('BR/FA', [6, 5]), bot('BR/FA', [4, 5])] };
  const declare = (p: Pos = P, pieces = ['u1', 'u3', 'u4']) => {
    const dr = toBattle(build(p), 'attackC', pieces);
    must(dr, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    return dr;
  };
  type CA = Extract<Decision, { kind: 'combinedArms' }>;

  it('Escape clears the gun selection as well as the piece and card', () => {
    const dr = declare();
    const d = dr.pending as CA;
    const cleared = escapeSelection(dr.state, d, 'bottom', { ...SEL, selPiece: 'u1', selCard: 3, gunSel: ['u3'] });
    expect(cleared).toMatchObject({ selPiece: null, selCard: null, gunSel: [] });
  });

  it('every gun has its own toggle button, pressed when chosen', () => {
    const dr = declare();
    const d = dr.pending as CA;
    const off = markup(gamePrompt(ctx(dr.state, d))!.extra);
    expect((off.match(/aria-pressed="false"/g) ?? []).length).toBe(2);
    const on = markup(gamePrompt(ctx(dr.state, d, { ...SEL, gunSel: ['u3'] }))!.extra);
    expect((on.match(/aria-pressed="true"/g) ?? []).length).toBe(1);
    expect(on).toContain('British Foot Artillery');
  });

  it('with every gun chosen the "All" button is not offered twice', () => {
    const dr = declare();
    const d = dr.pending as CA;
    const all = markup(gamePrompt(ctx(dr.state, d, { ...SEL, gunSel: ['u3', 'u4'] }))!.buttons);
    expect(all).toContain('Attack with 2 guns');
    expect(all).not.toContain('All 2 guns');
    expect(markup(gamePrompt(ctx(dr.state, d, { ...SEL, gunSel: ['u3'] }))!.buttons)).toContain('All 2 guns');
  });

  it('a required decision with one gun has a button that picks it', () => {
    const dr = declare({ units: [bot('BR/LN', [5, 6]), top('FR/LN', [4, 6]), bot('BR/FA', [4, 5])] }, ['u1', 'u3']);
    const d = { ...(dr.pending as CA), required: true };
    expect(d.options).toEqual(['u3']);
    const got: Answer[] = [];
    const p = gamePrompt(ctx(dr.state, d, SEL, (a) => got.push(a)))!;
    const attack = p.buttons.find((b) => String(b.key) === 'attack')!;
    expect((attack.props as { disabled?: boolean }).disabled).toBeFalsy();
    (attack.props as { onClick: () => void }).onClick();
    expect(got).toEqual([{ kind: 'select', ids: ['u3'] }]);
    expect(answerError(dr.state, d, got[0])).toBeNull();
  });

  it('the target shows the attacker\'s own dice and the total with the chosen guns', () => {
    const dr = declare();
    const d = dr.pending as CA;
    const s = dr.state;
    const g3 = gunDice(s, 'u3', H(4, 6));
    const g4 = gunDice(s, 'u4', H(4, 6));
    const own = (marks: ReturnType<typeof boardMarks>) => marks.badges.get(H(4, 6));
    const none = boardMarks(s, d, SEL, 'bottom');
    const m = boardMarks(s, d, { ...SEL, gunSel: ['u3', 'u4'] }, 'bottom');
    const mine = /^(\d+) \+ 0 = \1 dice$/.exec(own(none) ?? '');
    expect(mine, own(none)).not.toBeNull();
    const ownDice = Number(mine![1]);
    expect(own(m)).toBe(`${ownDice} + ${g3 + g4} = ${ownDice + g3 + g4} dice`);
    expect(gamePrompt(ctx(s, d, { ...SEL, gunSel: ['u3'] }))!.hint).toBe(`${ownDice} + ${g3} = ${ownDice + g3} dice`);
  });

  it('a bonus melee gun badge is the dice the combat event reports', () => {
    const s = build({ units: [bot('BR/HC', [5, 6]), top('FR/LN', [4, 6], { blocks: 1 }), bot('BR/FA', [3, 5]), top('FR/LN', [2, 6])] });
    const dr = toBattle(s, 'attackC', ['u1', 'u3']);
    forceDice([...n('infantry', 10), ...n('artillery', 60)]);
    must(dr, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    must(dr, { kind: 'select', ids: [] });
    must(dr, { kind: 'defend', choice: 'stand' });
    must(dr, { kind: 'yesno', yes: true });
    must(dr, { kind: 'hex', hex: H(3, 6) });
    must(dr, { kind: 'hex', hex: H(2, 6) });
    const d = dr.pending as CA;
    expect(d).toMatchObject({ kind: 'combinedArms', target: H(2, 6), options: ['u3'] });
    const shown = boardMarks(dr.state, d, { ...SEL, gunSel: ['u3'] }, 'bottom').badges.get(dr.state.units.find((u) => u.id === 'u3')!.hex);
    ev(dr);
    must(dr, { kind: 'select', ids: ['u3'] });
    if (dr.pending?.kind === 'defend') must(dr, { kind: 'defend', choice: 'stand' });
    const combats = ev(dr).filter((e): e is Extract<GameEvent, { t: 'combat' }> => e.t === 'combat');
    const dice = combats.find((c) => c.artillery?.[0]?.id === 'u3')!.artillery![0].dice;
    expect(shown).toBe(`${dice} ${dice === 1 ? 'die' : 'dice'}`);
  });

  it('the bonus-melee target badge words guns like the battle badge', () => {
    const s = build({ units: [bot('BR/HC', [5, 6]), top('FR/LN', [4, 6], { blocks: 1 }), bot('BR/FA', [3, 5]), top('FR/LN', [2, 6])] });
    const dr = toBattle(s, 'attackC', ['u1', 'u3']);
    forceDice([...n('infantry', 10), ...n('artillery', 60)]);
    must(dr, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    must(dr, { kind: 'select', ids: [] });
    must(dr, { kind: 'defend', choice: 'stand' });
    must(dr, { kind: 'yesno', yes: true });
    must(dr, { kind: 'hex', hex: H(3, 6) });
    const badge = boardMarks(dr.state, dr.pending, SEL, 'bottom').badges.get(H(2, 6));
    expect(badge).toMatch(/^\d+ dice? \+ guns$/);
  });
});

describe('text and routes (carries 6 to 8)', () => {
  it('the flag-ignoring line says "as many as its type allows"', () => {
    const text = Object.values(RULES_TEXT).flat().flatMap((x) => x.paragraphs).join('\n');
    expect(text).toContain('as many as its type allows (shown on its card)');
    expect(text).not.toContain('one for as many flags');
  });
  it('the rifle range is read by narrowing, not by a cast', () => {
    expect(rulesTextSrc).not.toMatch(/as \{ range: number \}/);
    expect(rulesTextSrc).toContain("kind !== 'musket'");
  });
  it('the dev route is anchored at its end', () => {
    expect(devRouteConfig('#/play/000/top/colonel')).not.toBeNull();
    expect(devRouteConfig('#/play/000/top/colonel/123')?.seed).toBe(123);
    expect(devRouteConfig('#/play/000/top/colonel/123?cards=elan')?.devCards).toEqual(['elan']);
    expect(devRouteConfig('#/play/000/top/colonel?cards=elan')?.devCards).toEqual(['elan']);
    expect(devRouteConfig('#/play/000/top/colonelx')).toBeNull();
    expect(devRouteConfig('#/play/000/top/colonel/12x')).toBeNull();
    expect(devRouteConfig('#/play/000/top/colonel/1/2')).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------- fix round 1

const fakeItem = (name: string, attrs: Record<string, string> = {}): DialogItem & { name: string; focused: number; attrs: Record<string, string> } => {
  const it = { name, focused: 0, attrs: { ...attrs }, focus() { it.focused++; }, hasAttribute: (k: string) => k in it.attrs, setAttribute: (k: string, v: string) => { it.attrs[k] = v; } };
  return it;
};

describe('dialog Tab (review 1)', () => {
  const close = fakeItem('close', { tabindex: '0' });
  const body = fakeItem('body');
  const ok = fakeItem('ok', { tabindex: '0' });
  const root = { querySelectorAll: (sel: string) => (sel === '*' ? [close, body, ok] : [close, ...(body.hasAttribute('tabindex') ? [body] : []), ok]) };
  const key = (shiftKey: boolean) => { const e = { shiftKey, prevented: 0, preventDefault() { e.prevented++; } }; return e; };
  it('a scroll container joins the tab cycle, so the keyboard can scroll it', () => {
    const e = key(false);
    dialogTab(e, root, close, (el) => el === body);
    expect(body.attrs.tabindex).toBe('0');
    expect(e.prevented).toBe(0); // from the first control it moves on natively, to the body
  });
  it('focus wraps only where it would leave the dialog', () => {
    const last = key(false);
    dialogTab(last, root, ok, (el) => el === body);
    expect(last.prevented).toBe(1);
    expect(close.focused).toBe(1);
    const first = key(true);
    dialogTab(first, root, close, (el) => el === body);
    expect(first.prevented).toBe(1);
    expect(ok.focused).toBe(1);
    const mid = key(false);
    dialogTab(mid, root, body, (el) => el === body);
    expect(mid.prevented).toBe(0);
  });
  it('the Modal runs that handler on Tab, and focuses a data-autofocus control first', () => {
    expect(controlsSrc).toMatch(/e\.key === 'Tab' && box\.current\) dialogTab\(e, box\.current, document\.activeElement\)/);
    expect(controlsSrc).toContain("querySelector<HTMLElement>('[data-autofocus]')");
    expect(gameScreenSrc).toMatch(/data-autofocus[^\n]*Keep fighting/);
  });
});

describe('where a new decision puts the focus (review 1)', () => {
  const rootWith = (present: Record<string, string>) => {
    const log: string[] = [];
    return { log, querySelector: (sel: string) => { const k = Object.keys(present).find((x) => sel.includes(x)); return k ? { focus: () => log.push(present[k]) } : null; } };
  };
  it('primary, else the chooser list, else the first ordinary button, else the bar', () => {
    // each target's element is the one that has focus() called, and only that one (m1: the fake root's log)
    const run = (present: Record<string, string>) => { const r = rootWith(present); return { got: focusPromptTarget(r), log: r.log }; };
    expect(run({ 'kit-btn--primary': 'p', 'prompt-pick': 'l', ':not(:disabled):not([data-nofocus])': 'b', 'prompt-bar': 'bar' })).toEqual({ got: 'primary', log: ['p'] });
    expect(run({ 'prompt-pick': 'l', 'kit-btn:not': 'b', 'prompt-bar': 'bar' })).toEqual({ got: 'pick', log: ['l'] });
    expect(run({ 'kit-btn:not': 'b', 'prompt-bar': 'bar' })).toEqual({ got: 'button', log: ['b'] });
    expect(run({ 'prompt-bar': 'bar' })).toEqual({ got: 'bar', log: ['bar'] });
    expect(run({})).toEqual({ got: null, log: [] });
  });
  it('never the general\'s or Undo button: both carry data-nofocus, and every query skips it', () => {
    const d: Decision = { kind: 'playCard', side: 'bottom' };
    const s = build({ units: [bot('BR/LN', [6, 6]), top('FR/LN', [2, 6])] });
    const p = gamePrompt({ ...ctx(s, d), view: { pending: d, over: null, fatal: false, generalThinking: false, undo: 'move', display: s } as unknown as ViewState })!;
    const html = markup(p.buttons);
    expect((html.match(/data-nofocus="true"/g) ?? []).length).toBe(2);
    const src = focusPromptTarget.toString();
    expect(src.match(/\[data-nofocus\]/g)?.length).toBeGreaterThanOrEqual(2);
  });
  it('the game screen calls it, and Escape goes through escapeSelection', () => {
    expect(gameScreenSrc).toContain('focusNewDecision(');
    expect(gameScreenSrc).toContain('escapeSelection(s, d, human, u)');
    expect(gameScreenSrc).not.toContain('die: null');
  });
});

describe('names and live regions (review 1)', () => {
  it('only the prompt text is a live region, not the bar with its buttons', () => {
    const prompt = { title: 'Movement', text: 'Select a piece.', buttons: [createElement('button', { key: 'x' }, 'End')], hint: 'hint' };
    const bar = renderToStaticMarkup(createElement(PromptBar, { prompt, error: null }));
    expect(bar).toMatch(/^<div class="prompt-bar[^"]*" tabindex="-1">/);
    const live = /<div class="prompt-text" role="status" aria-live="polite">(.*?)<\/div><\/div>/.exec(bar)!;
    expect(live[1]).toContain('Movement');
    expect(live[1]).not.toContain('End');
    expect(live[1]).not.toContain('hint');
  });
  it('an exit marker carries its text', () => {
    const html = renderToStaticMarkup(createElement('svg', null, createElement(ObjectiveMarkers, {
      objectives: [{ kind: 'exit', side: 'bottom', hex: H(0, 3), banners: 1, leadersScore: false, retreatOff: false, text: 'Leave by the north road' }],
      objState: [{ held: false, count: 0 }], flipped: false, nations: { top: 'FR', bottom: 'BR' },
    })));
    expect(html).toContain('<title>Leave by the north road</title>');
  });
  it('the owner square slots are named images', () => {
    const s = build({ units: [bot('BR/LN', [6, 6]), top('FR/LN', [2, 6])] });
    s.players.bottom.squareTrack = [s.players.bottom.hand[0], null, null, null];
    const html = renderToStaticMarkup(createElement(SquareTrack, { side: 'bottom', owner: true, s }));
    expect((html.match(/role="img" aria-label="Square \d/g) ?? []).length).toBe(4);
  });
  it('the Combined Arms own-dice badge is the dice the combat event reports', () => {
    const P2: Pos = { units: [bot('BR/LN', [5, 6]), top('FR/LN', [4, 6]), bot('BR/FA', [4, 5])] };
    const dr = toBattle(build(P2), 'attackC', ['u1', 'u3']);
    must(dr, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    const d = dr.pending as Extract<Decision, { kind: 'combinedArms' }>;
    const badge = boardMarks(dr.state, d, { ...SEL, gunSel: ['u3'] }, 'bottom').badges.get(H(4, 6));
    forceDice(n('artillery', 60));
    ev(dr);
    must(dr, { kind: 'select', ids: ['u3'] });
    if (dr.pending?.kind === 'defend') must(dr, { kind: 'defend', choice: 'stand' });
    const c = ev(dr).filter((e): e is Extract<GameEvent, { t: 'combat' }> => e.t === 'combat').find((e) => e.purpose === 'melee')!;
    const guns = c.artillery!.reduce((x, g) => x + g.dice, 0);
    expect(badge).toBe(`${c.dice} + ${guns} = ${c.dice + guns} dice`);
  });
  it('the rifle range throws rather than answering 0 if the row stops being a musket', () => {
    expect(rulesTextSrc).toMatch(/kind !== 'musket'\) throw new Error/);
  });
  it('Cinzel is gone from the whole UI and index.html', async () => {
    const fs = await import(FS);
    const walk = (dir: URL): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e: { name: string; isDirectory(): boolean }) =>
      e.isDirectory() ? walk(new URL(`${e.name}/`, dir)) : [fs.readFileSync(new URL(e.name, dir), 'utf8')]);
    const files: string[] = [...walk(new URL('../../src/ui/', import.meta.url)), await readText('../../index.html')];
    expect(files.length).toBeGreaterThan(50);
    expect(files.filter((f) => /cinzel/i.test(f))).toEqual([]);
  });
});

describe('a new decision takes the focus only for the keyboard player (m2)', () => {
  const mine: Decision = { kind: 'playCard', side: 'bottom' };
  const theirs: Decision = { kind: 'playCard', side: 'top' };
  /** A fake document: what `querySelector` finds, what has focus, whether a dialog is open. */
  const fakeDoc = (o: { modal?: boolean; active?: { tagName: string } | null } = {}) => {
    const log: string[] = [];
    const doc = {
      log,
      activeElement: o.active ?? null,
      querySelector: (sel: string) => (sel === '.kit-modal' ? (o.modal ? { focus: () => undefined } : null) : { focus: () => log.push(sel) }),
    };
    return doc;
  };
  it('focuses the prompt for a human decision with the pointer off the board', () => {
    const doc = fakeDoc();
    expect(focusNewDecision(mine, 'bottom', false, doc)).toBe('primary');
    expect(doc.log).toHaveLength(1);
  });
  it('never for the computer\'s decision, or for none', () => {
    const doc = fakeDoc();
    expect(focusNewDecision(theirs, 'bottom', false, doc)).toBeNull();
    expect(focusNewDecision(null, 'bottom', false, doc)).toBeNull();
    expect(doc.log).toEqual([]);
  });
  it('never with the pointer over the board', () => {
    const doc = fakeDoc();
    expect(focusNewDecision(mine, 'bottom', true, doc)).toBeNull();
    expect(doc.log).toEqual([]);
  });
  it('never over a dialog, or while a select or text field has the focus', () => {
    for (const doc of [fakeDoc({ modal: true }), fakeDoc({ active: { tagName: 'SELECT' } }), fakeDoc({ active: { tagName: 'INPUT' } })]) {
      expect(focusNewDecision(mine, 'bottom', false, doc)).toBeNull();
      expect(doc.log).toEqual([]);
    }
  });
  it('the game screen calls it with the pointer state, in place of its own inline guard', () => {
    expect(gameScreenSrc).toContain('focusNewDecision(d, human, overBoard.current, document)');
  });
});

describe('phase-ending and skip buttons never take the focus (m3)', () => {
  const noFocusLabels = (d: Decision, s: GameState, ui: Partial<UiSel> = {}): string[] => {
    const p = gamePrompt({ ...ctx(s, d), ui: { ...SEL, ...ui } as UiSel, view: { pending: d, over: null, fatal: false, generalThinking: false, undo: null, display: s } as unknown as ViewState })!;
    const out: string[] = [];
    for (const b of p.buttons) {
      const html = markup([b]);
      if (html.includes('data-nofocus="true"')) out.push(/<span class="kit-btn__label">(.*?)<\/span>/.exec(html)![1]);
    }
    return out;
  };
  const s = build({ units: [bot('BR/LN', [6, 6]), top('FR/LN', [2, 6])] });
  it('Order nothing, End movement, End battles', () => {
    expect(noFocusLabels({ kind: 'orders', side: 'bottom', card: 'probeC' } as Decision, s)).toContain('Order nothing');
    expect(noFocusLabels({ kind: 'move', side: 'bottom' } as Decision, s)).toContain('End movement');
    expect(noFocusLabels({ kind: 'battle', side: 'bottom' } as Decision, s)).toContain('End battles');
  });
  it('Confirm N orders (the primary action) stays focusable', () => {
    const ids = eligiblePieces(s, 'bottom', 'probeC');
    expect(noFocusLabels({ kind: 'orders', side: 'bottom', card: 'probeC' } as Decision, s, { orderSel: ids.slice(0, 1) })).not.toContain('Confirm 1 order');
  });
  it('the decline and no-artillery actions of the generic prompts', () => {
    const bonus = { kind: 'bonusMelee', side: 'bottom', unit: 'u1', targets: [H(5, 6)] } as unknown as Decision;
    expect(noFocusLabels(bonus, s)).toContain('Decline');
    const stay = { kind: 'breakthroughExtra', side: 'bottom', unit: 'u1', options: [H(5, 6)], required: false } as unknown as Decision;
    expect(noFocusLabels(stay, s)).toContain('Stay here');
  });
});
