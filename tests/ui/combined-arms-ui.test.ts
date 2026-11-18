// Plan 4 Task 7: the Combined Arms board chooser: guns toggled on the board, badges with each gun's dice.
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { answerError, battleTargets, type Decision, type GameEvent, type GameState } from '../../src/engine';
import type { GameController, ViewState } from '../../src/ui/game/controller';
import { gamePrompt } from '../../src/ui/game/prompts';
import { boardMarks, gunDice, toggleGun, type UiSel } from '../../src/ui/game/uiModel';
import { H, build, ev, forceDice, must, n, toBattle, type Pos } from '../rules/helpers';

const SEL: UiSel = { selCard: null, hoverCard: null, orderSel: [], selPiece: null, hoverHex: null, hoverAction: null, assign: null, gunSel: [] };
type Unit1 = NonNullable<Pos['units']>[number];
const bot = (key: Unit1['key'], at: [number, number], extra: object = {}): Unit1 => ({ side: 'bottom', key, at, ...extra }) as Unit1;
const top = (key: Unit1['key'], at: [number, number], extra: object = {}): Unit1 => ({ side: 'top', key, at, ...extra }) as Unit1;

// u1 BR/LN (5,6) attacks u2 FR/LN (4,6); u3 a gun at range 2, u4 a gun adjacent to the target
const P: Pos = { units: [bot('BR/LN', [5, 6]), top('FR/LN', [4, 6]), bot('BR/FA', [6, 5]), bot('BR/FA', [4, 5])] };
const declare = (p: Pos = P, pieces = ['u1', 'u3', 'u4']) => {
  const d = toBattle(build(p), 'attackC', pieces);
  must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
  return d;
};

const prompt = (s: GameState, d: Decision, ui: UiSel = SEL) => {
  const view = { pending: d, over: false, fatal: false, generalThinking: false, undo: null } as unknown as ViewState;
  const controller = { answer: () => {}, autoAnswer: async () => {} } as unknown as GameController;
  const answered: unknown[] = [];
  const p = gamePrompt({ controller, view, s, human: 'bottom', ai: 'top', ui, setUi: () => {}, answer: (a) => answered.push(a), onExit: () => {} })!;
  return { p, answered, html: renderToStaticMarkup(createElement(Fragment, null, p.buttons)) };
};

describe('Combined Arms board chooser', () => {
  it('clicking guns toggles them; non-candidates are ignored', () => {
    const opts = ['u3', 'u4'];
    expect(toggleGun([], 'u3', opts)).toEqual(['u3']);
    expect(toggleGun(['u3'], 'u3', opts)).toEqual([]);
    expect(toggleGun(['u3'], 'u4', opts)).toEqual(['u3', 'u4']);
    expect(toggleGun(['u3'], 'u9', opts)).toEqual(['u3']);
  });

  it('the attack button answers exactly the chosen candidates', () => {
    const dr = declare();
    const d = dr.pending as Extract<Decision, { kind: 'combinedArms' }>;
    expect(d.options).toEqual(['u3', 'u4']);
    const s = dr.state;
    const { p, html } = prompt(s, d, { ...SEL, gunSel: ['u3', 'uX'] });
    expect(html).toContain('Attack with 1 gun');
    expect(html).toContain('All 2 guns');
    expect(p.text).toBe('British Line Infantry attacks French Line Infantry. Click guns to add or remove them, then attack.');
    expect(p.rise).toBe(true); // the toggles and the dice line must not hide below the fold of the steady bar
    const clicked: unknown[] = [];
    const view = { pending: d, over: false, fatal: false, generalThinking: false, undo: null } as unknown as ViewState;
    const q = gamePrompt({ controller: {} as GameController, view, s, human: 'bottom', ai: 'top', ui: { ...SEL, gunSel: ['u3', 'uX'] }, setUi: () => {}, answer: (a) => clicked.push(a), onExit: () => {} })!;
    const attackBtn = q.buttons.find((b) => String(b.key) === 'attack')!;
    (attackBtn.props as { onClick: () => void }).onClick();
    expect(clicked).toEqual([{ kind: 'select', ids: ['u3'] }]);
    expect(answerError(s, d, clicked[0] as never)).toBeNull();
    const none = prompt(s, d).html;
    expect(none).toContain('Attack without artillery');
  });

  it('gun badges match the dice the engine rolls', () => {
    const dr = declare();
    const d = dr.pending as Extract<Decision, { kind: 'combinedArms' }>;
    const s = dr.state;
    const marks = boardMarks(s, d, { ...SEL, gunSel: ['u3'] }, 'bottom');
    const hexOf = (id: string) => s.units.find((u) => u.id === id)!.hex;
    const before = gunDice(s, 'u3', H(4, 6));
    expect(before).toBeGreaterThan(0);
    expect(marks.badges.get(hexOf('u3'))).toBe(`${before} ${before === 1 ? 'die' : 'dice'}`);
    expect(marks.badges.get(hexOf('u4'))).toBe(`${gunDice(s, 'u4', H(4, 6))} dice`);
    expect(marks.highlights.get(hexOf('u3'))).toBe('selected');
    expect(marks.highlights.get(hexOf('u4'))).toBe('option');
    expect(marks.highlights.get(H(4, 6))).toBe('targetClose');
    ev(dr);
    forceDice(n('artillery', 60));
    must(dr, { kind: 'select', ids: ['u3'] });
    const c = ev(dr).filter((e): e is Extract<GameEvent, { t: 'combat' }> => e.t === 'combat').find((e) => e.purpose === 'melee')!;
    expect(c.artillery?.[0]).toMatchObject({ id: 'u3', dice: before });
  });

  it('a new decision clears the gun selection', () => {
    const dr = declare();
    const d = dr.pending as Extract<Decision, { kind: 'combinedArms' }>;
    const s = dr.state;
    const ui = { ...SEL, gunSel: ['u9'] };
    const marks = boardMarks(s, d, ui, 'bottom');
    expect([...marks.highlights.values()]).not.toContain('selected');
    const q = prompt(s, d, ui);
    expect(q.html).toContain('Attack without artillery');
    const attackBtn = q.p.buttons.find((b) => String(b.key) === 'attack')!;
    const got: unknown[] = [];
    const view = { pending: d, over: false, fatal: false, generalThinking: false, undo: null } as unknown as ViewState;
    const r = gamePrompt({ controller: {} as GameController, view, s, human: 'bottom', ai: 'top', ui, setUi: () => {}, answer: (a) => got.push(a), onExit: () => {} })!;
    (r.buttons.find((b) => String(b.key) === 'attack')!.props as { onClick: () => void }).onClick();
    expect(got).toEqual([{ kind: 'select', ids: [] }]);
    expect(attackBtn).toBeTruthy();
  });

  it('a required decision has no empty attack: at least one gun must join', () => {
    // a battery attacking nothing of its own: a cavalry unit against a square has 0 dice? use a decision crafted as required
    const dr = declare();
    const d = { ...(dr.pending as Extract<Decision, { kind: 'combinedArms' }>), required: true };
    const s = dr.state;
    const empty = prompt(s, d);
    expect(empty.html).not.toContain('without artillery');
    const btnAttack = empty.p.buttons.find((b) => String(b.key) === 'attack')!;
    expect((btnAttack.props as { disabled?: boolean }).disabled).toBe(true);
    expect(answerError(s, d, { kind: 'select', ids: [] })).not.toBeNull();
    const one = prompt(s, d, { ...SEL, gunSel: ['u4'] });
    expect((one.p.buttons.find((b) => String(b.key) === 'attack')!.props as { disabled?: boolean }).disabled).toBeFalsy();
  });

  it('a melee target with candidate guns shows "<n> dice + guns" in the battle', () => {
    const s = build(P);
    const dr = toBattle(s, 'attackC', ['u1', 'u3', 'u4']);
    const st = dr.state;
    const hex = H(4, 6);
    const dice = battleTargets(st, 'u1').find((t) => t.hex === hex)!.dice;
    const marks = boardMarks(st, dr.pending, { ...SEL, selPiece: 'u1' }, 'bottom');
    expect(marks.badges.get(hex)).toBe(`${dice} ${dice === 1 ? 'die' : 'dice'} + guns`);
    // without guns the badge stays plain
    const lone = toBattle(build({ units: [bot('BR/LN', [5, 6]), top('FR/LN', [4, 6])] }), 'attackC', ['u1']);
    expect(boardMarks(lone.state, lone.pending, { ...SEL, selPiece: 'u1' }, 'bottom').badges.get(hex)).toBe(`${dice} ${dice === 1 ? 'die' : 'dice'}`);
  });
});
