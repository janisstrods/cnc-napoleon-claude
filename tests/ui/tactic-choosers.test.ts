// Plan 4 Task 4: the Élan and Rally dice choosers, the Scout keep and Short Supply on the board.
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CARD_DEFS, answerError, cardKind, shortSupplyTargets, type Decision, type DieFace, type GameState } from '../../src/engine';
import type { GameController, ViewState } from '../../src/ui/game/controller';
import { assignClick, assignClickRefusal, assignError, assignOptions, suggestAssign, type ElanOrRally } from '../../src/ui/game/assign';
import { promptSpec } from '../../src/ui/game/promptSpec';
import { gamePrompt } from '../../src/ui/game/prompts';
import { boardMarks, type UiSel } from '../../src/ui/game/uiModel';
import { build, H, leaderId } from '../rules/helpers';

const SEL: UiSel = { selCard: null, hoverCard: null, orderSel: [], selPiece: null, hoverHex: null, assign: null };
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);
const elan = (s: GameState, faces: DieFace[]): ElanOrRally => ({ kind: 'elan', side: 'bottom', faces });
const rally = (faces: DieFace[]): ElanOrRally => ({ kind: 'rally', side: 'bottom', faces });

// u1 BR/LN, u2 BR/HC, u3 BR/HA, u4 BR/LN (full), u5 FR/LN; one lone leader
const s: GameState = build({
  units: [
    { side: 'bottom', key: 'BR/LN', at: [6, 6], blocks: 2 },
    { side: 'bottom', key: 'BR/HC', at: [6, 7], blocks: 2 },
    { side: 'bottom', key: 'BR/HA', at: [7, 5], blocks: 2 },
    { side: 'bottom', key: 'BR/LN', at: [7, 7] },
    { side: 'top', key: 'FR/LN', at: [2, 6] },
  ],
  leaders: [{ side: 'bottom', at: [8, 4] }],
});
const LEADER = leaderId(s, 0);

describe('Élan and Rally choosers', () => {
  it('Élan: an arm die lists units of that arm, a flag every piece, a sabre nothing', () => {
    const d = elan(s, ['infantry', 'artillery', 'flag', 'sabre', 'cavalry']);
    expect(ids(assignOptions(s, d, 0))).toEqual(['u1', 'u4']);
    expect(ids(assignOptions(s, d, 1))).toEqual(['u3']); // horse artillery is artillery
    expect(ids(assignOptions(s, d, 2))).toEqual(['u1', 'u2', 'u3', 'u4', LEADER]);
    expect(assignOptions(s, d, 3)).toEqual([]);
    expect(ids(assignOptions(s, d, 4))).toEqual(['u2']);
    expect(assignOptions(s, d, 0)[0].label).toMatch(/^Line Infantry \(2\/4\) — [a-z/]+(, (rear|forward))?$/);
  });

  it('Rally lists only weakened units of the arm', () => {
    expect(ids(assignOptions(s, rally(['infantry']), 0))).toEqual(['u1']);
    expect(ids(assignOptions(s, rally(['cavalry']), 0))).toEqual(['u2']);
    expect(assignOptions(s, rally(['flag']), 0)).toEqual([]);
    expect(assignOptions(s, rally(['sabre']), 0)).toEqual([]);
  });

  it('the suggestion is legal and Confirm answers it', () => {
    for (const d of [elan(s, ['infantry', 'infantry', 'flag', 'sabre']), rally(['infantry', 'cavalry', 'artillery'])]) {
      const ids2 = suggestAssign(s, d);
      expect(answerError(s, d, { kind: 'assign', ids: ids2 })).toBeNull();
      expect(ids2.some((x) => x !== null)).toBe(true);
      const first = promptSpec(s, d).actions[0];
      expect(first).toEqual({ key: 'suggested', label: 'Confirm', answer: { kind: 'assign', ids: ids2 } });
      expect(promptSpec(s, d).actions.at(-1)!.answer).toBe('auto');
    }
  });

  it('dice that can do nothing stay null and never block Confirm', () => {
    const sabres = elan(s, ['sabre', 'sabre']);
    expect(suggestAssign(s, sabres)).toEqual([null, null]);
    expect(assignError(s, sabres, [null, null])).toBeNull();
    const full = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [6, 6] }] });
    const r = rally(['infantry', 'cavalry']);
    expect(suggestAssign(full, r)).toEqual([null, null]);
    expect(assignError(full, r, [null, null])).toBeNull();
    expect(answerError(full, r, { kind: 'assign', ids: [null, null] })).toBeNull();
  });

  it('a board click fills the armed die only with one of its options; a stale armed die is ignored', () => {
    const d = elan(s, ['infantry', 'cavalry']);
    const start: (string | null)[] = [null, null];
    expect(assignClick(s, d, { die: 0, ids: start }, 'u1')).toEqual(['u1', null]);
    expect(assignClick(s, d, { die: 0, ids: start }, 'u2')).toBe(start); // a cavalry unit for an infantry die
    expect(assignClick(s, d, { die: 5, ids: start }, 'u1')).toBe(start);
    expect(assignClick(s, d, { die: null, ids: start }, 'u1')).toBe(start);
    expect(assignClick(s, d, { die: 0, ids: ['u1', null] }, 'u1')).toEqual([null, null]); // a second click lifts it
  });

  it('a second click on the same piece for another die is refused when the validator refuses it', () => {
    const e = elan(s, ['flag', 'flag']);
    const one: (string | null)[] = ['u1', null];
    expect(assignClick(s, e, { die: 1, ids: one }, 'u1')).toBe(one);
    expect(assignClickRefusal(s, e, { die: 1, ids: one }, 'u1')).toBe('Each piece takes one order.');
    // Rally: two infantry symbols on a unit one block short of full strength
    const t = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [6, 6], blocks: 3 }] });
    const r = rally(['infantry', 'infantry']);
    const first: (string | null)[] = ['u1', null];
    expect(assignClick(t, r, { die: 1, ids: first }, 'u1')).toBe(first);
    const msg = assignClickRefusal(t, r, { die: 1, ids: first }, 'u1')!;
    expect(msg).toBe('British Line Infantry cannot exceed its starting strength.');
    expect(msg).not.toMatch(/u1|BR\/LN/);
    expect(assignError(t, r, ['u1', 'u1'])).toBe(msg);
  });
});

const ctx = (d: Decision, human: 'top' | 'bottom', st: GameState = s) => {
  const noop = () => {};
  const view = { pending: d, over: null, fatal: false, generalThinking: false, undo: null, display: st } as unknown as ViewState;
  return { controller: {} as GameController, view, s: st, human, ai: human === 'top' ? 'bottom' as const : 'top' as const, ui: SEL, setUi: noop, answer: noop, onExit: noop };
};

describe('Scout and Short Supply', () => {
  it('Scout cards are shown only to their owner', () => {
    const hand = s.players.bottom.hand;
    const d: Decision = { kind: 'scoutKeep', side: 'bottom', cards: [hand[0], hand[1]] };
    const titles = d.cards.map((c) => CARD_DEFS[cardKind(c)].title);
    const mine = gamePrompt(ctx(d, 'bottom'))!;
    const html = renderToStaticMarkup(createElement(Fragment, null, mine.extra, ...mine.buttons));
    for (const t of titles) expect(html).toContain(t);
    expect(mine.text).toBe('You drew two cards: keep one; the other is discarded face up.');
    const theirs = gamePrompt(ctx(d, 'top'));
    expect(theirs).toBeNull();
    expect(JSON.stringify(theirs)).not.toContain(titles[0]);
  });

  it('Short Supply marks every target, both sides, and the hex chooser its options', () => {
    const d: Decision = { kind: 'shortSupplyTarget', side: 'bottom', options: shortSupplyTargets(s, 'bottom') };
    const m = boardMarks(s, d, SEL, 'bottom');
    expect(d.options.length).toBe(5);
    for (const id of d.options) {
      const h = s.units.find((u) => u.id === id)!.hex;
      expect(m.badges.get(h), id).toBe('Supply');
      expect(m.highlights.get(h), id).toBe('option');
    }
    expect(new Set(d.options.map((id) => s.units.find((u) => u.id === id)!.side))).toEqual(new Set(['top', 'bottom']));
    expect(promptSpec(s, d).text).toBe("Choose any unit not in square, yours or the enemy's: its owner lifts it back to its own baseline.");
    const hexes = [H(8, 4), H(8, 5)];
    const hd: Decision = { kind: 'shortSupplyHex', side: 'bottom', unit: 'u1', options: hexes };
    const hm = boardMarks(s, hd, SEL, 'bottom');
    for (const h of hexes) expect(hm.highlights.get(h)).toBe('option');
    expect(promptSpec(s, hd).text).toBe('Place British Line Infantry on a hex of its own baseline (the row in front when the baseline is full).');
  });

  it('Élan and Rally mark the armed die\'s options on the board', () => {
    const d = elan(s, ['infantry', 'cavalry']);
    const m = boardMarks(s, d, { ...SEL, assign: { die: 1, ids: ['u1', null] } }, 'bottom');
    expect(m.highlights.get(s.units.find((u) => u.id === 'u2')!.hex)).toBe('option');
    expect(m.highlights.get(s.units.find((u) => u.id === 'u1')!.hex)).toBe('selected');
    expect(m.highlights.has(s.units.find((u) => u.id === 'u4')!.hex)).toBe(false);
  });
});
