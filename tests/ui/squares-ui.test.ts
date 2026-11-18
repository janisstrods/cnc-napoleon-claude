// Plan 4 Task 6: squares on the board and the square tracks, Retire and Reform, the defence choices explained.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CARD_DEFS, cardKind, retireReformOptions, answerError, type Decision, type GameState } from '../../src/engine';
import { Board, SQUARE_COUNTER_OFFSET } from '../../src/ui/game/Board';
import { facingFor, leaderTokenProps } from '../../src/ui/game/boardProps';
import { SquareTrack } from '../../src/ui/game/SquareTrack';
import { commandText } from '../../src/ui/game/squareText';
import { promptSpec } from '../../src/ui/game/promptSpec';
import { HINT_IDLE, gamePrompt } from '../../src/ui/game/prompts';
import { boardMarks, type UiSel } from '../../src/ui/game/uiModel';
import { hexCenterId } from '../../src/ui/geometry';
import { aiPacing, type GameController, type ViewState } from '../../src/ui/game/controller';
import { build } from '../rules/helpers';

const SEL: UiSel = { selCard: null, hoverCard: null, orderSel: [], selPiece: null, hoverHex: null, hoverAction: null, assign: null, gunSel: [] };
const CARD = 57; // a card id; its kind is not a section card of a slot number

describe('the square tracks', () => {
  const s = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [6, 5] }, { side: 'top', key: 'FR/LC', at: [2, 6] }] });

  it('the opponent\'s track shows backs only', () => {
    s.players.top.squareTrack = [CARD, null, null, null];
    const html = renderToStaticMarkup(createElement(SquareTrack, { side: 'top', owner: false, s }));
    expect((html.match(/ kit-cardback /g) ?? []).length).toBe(1);
    for (const def of Object.values(CARD_DEFS)) expect(html).not.toContain(def.title);
    // the id is in no attribute of the markup (the digits of the icons' own path data are not attributes of interest)
    for (const [, name, v] of html.matchAll(/ ([\w-]+)="([^"]*)"/g)) if (name !== 'd') expect(v, name).not.toMatch(new RegExp(`(^|\\D)${CARD}(\\D|$)`));
    expect(html).not.toContain(cardKind(CARD));
  });

  it('card id 0 is a card, not an empty slot', () => {
    const z = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [6, 5] }, { side: 'top', key: 'FR/LC', at: [2, 6] }] });
    z.players.bottom.squareTrack = [null, null, 0, null];
    expect(renderToStaticMarkup(createElement(SquareTrack, { side: 'bottom', owner: false, s: z })).split(' kit-cardback ').length - 1).toBe(1);
    expect(commandText(z, 'bottom')).toContain('1 on the square track');
  });

  it('the owner sees his own track cards', () => {
    s.players.bottom.squareTrack = [CARD, null, null, null];
    const html = renderToStaticMarkup(createElement(SquareTrack, { side: 'bottom', owner: true, s }));
    const title = CARD_DEFS[cardKind(CARD)].title;
    // the thumbnail and its reading-size zoom (shown on hover or focus, hidden from assistive technology)
    expect(html.split(`kit-card__title">${title}<`).length - 1).toBe(2);
    expect(html).toContain('class="sq-zoom" aria-hidden="true"');
    expect(html).toContain(`title="Square 1: ${title}"`);
    expect(html).not.toContain(' kit-cardback ');
    // four numbered slots
    for (const n of [1, 2, 3, 4]) expect(html).toContain(`>${n}<`);
  });
});

describe('Command text', () => {
  it('counts the track', () => {
    const s = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [6, 5] }, { side: 'top', key: 'FR/LC', at: [2, 6] }], cards: 5 });
    s.players.bottom.hand = s.players.bottom.hand.slice(0, 4);
    s.players.bottom.squareTrack = [CARD, null, null, null];
    expect(commandText(s, 'bottom')).toBe('Hand 4 of 5 · 1 on the square track');
    s.players.bottom.squareTrack = [null, null, null, null];
    s.players.bottom.hand = s.players.bottom.hand.concat([3]).slice(0, 5);
    expect(commandText(s, 'bottom')).toBe('Hand 5 of 5');
  });
});

describe('the board', () => {
  const boardHtml = (s: GameState, human: 'top' | 'bottom') => renderToStaticMarkup(createElement(Board, {
    state: s, flipped: human === 'top', humanSide: human, walking: {}, highlights: new Map<number, never>(), leaderHighlights: new Map<string, never>(), badges: new Map<number, string>(),
    sectionShade: new Set<number>(), pathPreview: null, combat: null, flashes: [], orderedIds: new Set<string>(), doneIds: new Set<string>(),
  }));

  it('the square counter sits on its unit on a flipped board', () => {
    const s = build({ units: [{ side: 'top', key: 'FR/LN', at: [2, 6], square: 3 }, { side: 'bottom', key: 'BR/LC', at: [6, 5] }] });
    const { x, y } = hexCenterId(s.units[0].hex, true);
    const dx = SQUARE_COUNTER_OFFSET.x;
    const html = boardHtml(s, 'top');
    expect(html).toContain(`<g class="square-counter" transform="translate(${x + dx}, ${y + SQUARE_COUNTER_OFFSET.y})">`);
    expect(html).toContain('>3</text>');
    expect(html).not.toContain('<title>Square');
    // a different board turn puts the same unit elsewhere
    const up = hexCenterId(s.units[0].hex, false);
    expect(boardHtml(s, 'bottom')).toContain(`translate(${up.x + dx}, ${up.y + SQUARE_COUNTER_OFFSET.y})`);
    // no counter without a square
    s.units[0].square = undefined;
    expect(boardHtml(s, 'top')).not.toContain('square-counter');
  });
});

const ctx = (d: Decision, human: 'top' | 'bottom', st: GameState, ui: UiSel = SEL) => {
  const noop = () => {};
  const view = { pending: d, over: null, fatal: false, generalThinking: false, undo: null, display: st } as unknown as ViewState;
  return { controller: {} as GameController, view, s: st, human, ai: human === 'top' ? 'bottom' as const : 'top' as const, ui, setUi: noop, answer: noop, onExit: noop };
};
const html = (b: JSX.Element[]) => b.map((x) => renderToStaticMarkup(x));

describe('the defence choices', () => {
  const s = build({ units: [{ side: 'bottom', key: 'BR/LC', at: [6, 5] }, { side: 'top', key: 'FR/LN', at: [5, 5] }] });
  const d: Decision = { kind: 'defend', side: 'bottom', attacker: 'u2', target: 'u1', options: ['stand', 'retireReform', 'formSquare', 'firstStrike'], bonus: false, artillery: [] };
  const HINTS = {
    stand: 'Take the attack and battle back if the unit survives in place.',
    retireReform: 'Fall back 2 hexes: only cavalry symbols hit, and there is no battle back.',
    formSquare: 'A random card from your hand goes face down on the square track. Your square rolls first with 1 die; your Command is a card lower until the square is left.',
    firstStrike: 'Play First Strike: your unit battles first; if the attacker stays, it attacks and you do not battle back.',
  };

  it('the defence prompt explains each choice', () => {
    const spec = promptSpec(s, d);
    expect(spec.actions.map((a) => a.label)).toEqual(['Stand', 'Retire and Reform', 'Form square', 'First Strike', 'Let the general decide']);
    expect(spec.actions.map((a) => a.hint)).toEqual([HINTS.stand, HINTS.retireReform, HINTS.formSquare, HINTS.firstStrike, undefined]);
    const buttons = html(gamePrompt(ctx(d, 'bottom', s))!.buttons);
    expect(buttons.length).toBe(5);
    (['stand', 'retireReform', 'formSquare', 'firstStrike'] as const).forEach((k, i) => expect(buttons[i]).toContain(`title="${HINTS[k]}"`));
    expect(buttons[4]).toContain('Let the general decide');
    // the hovered choice's hint is a line under the text
    const hov = gamePrompt(ctx(d, 'bottom', s, { ...SEL, hoverAction: 'firstStrike' }))!;
    expect(hov.hint).toBe(HINTS.firstStrike);
    expect(gamePrompt(ctx(d, 'bottom', s))!.hint).toBe(HINT_IDLE);
    // a decision without hints has no line
    expect(gamePrompt(ctx({ kind: 'leaveSquare', side: 'bottom', unit: 'u1' }, 'bottom', s))!.hint).toBeUndefined();
  });

  it('hovering Retire and Reform previews the 2-hex path', () => {
    const opts = retireReformOptions(s, s.units[0]);
    expect(opts.length).toBeGreaterThan(0);
    const on = boardMarks(s, d, { ...SEL, hoverAction: 'retireReform' }, 'bottom');
    expect(on.pathAt(null)).toEqual([s.units[0].hex, ...opts[0].path]);
    expect(on.pathAt(null)!.length).toBe(3);
    expect(boardMarks(s, d, SEL, 'bottom').pathAt(null)).toBeNull();
    expect(boardMarks(s, d, { ...SEL, hoverAction: 'stand' }, 'bottom').pathAt(null)).toBeNull();
  });

  it('the defend text names the guns that joined', () => {
    const g = build({ units: [{ side: 'bottom', key: 'BR/LC', at: [6, 5] }, { side: 'top', key: 'FR/LN', at: [5, 5] }, { side: 'top', key: 'FR/FA', at: [3, 5] }] });
    const text = (artillery: string[]) => promptSpec(g, { ...d, artillery }).text;
    expect(text([])).toBe('French Line Infantry attacks your British Light Cavalry. How do you defend?');
    expect(text(['u3'])).toContain('with 1 gun joining (French Foot Artillery)');
    expect(text(['u3', 'u3'])).toContain('with 2 guns joining');
  });

  it('the Retire and Reform choice names its hex', () => {
    const r: Decision = { kind: 'retreat', side: 'bottom', unit: 'u1', options: retireReformOptions(s, s.units[0]), reason: 'retireReform' };
    expect(promptSpec(s, r).text).toBe('Click the hex British Light Cavalry retires to.');
    expect(gamePrompt(ctx(r, 'bottom', s))!.text).toBe('Click the hex British Light Cavalry retires to.');
  });
});

describe('the leader token', () => {
  it('a lone leader faces his own side on a flipped board', () => {
    const s = build({ units: [{ side: 'top', key: 'FR/LN', at: [2, 6] }], leaders: [{ side: 'top', at: [1, 1] }] });
    const l = s.leaders[0];
    expect(leaderTokenProps(s, l, false, 'top').facing).toBe(facingFor(l.side, 'top'));
    expect(leaderTokenProps(s, l, false, 'bottom').facing).toBe(facingFor(l.side, 'bottom'));
    // @ts-expect-error a call without humanSide
    leaderTokenProps(s, l, false);
  });
});

describe('leave square', () => {
  it('has its own prompt text and legal answers', () => {
    const s = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [6, 5], square: 2 }, { side: 'top', key: 'FR/LC', at: [2, 6] }] });
    const d: Decision = { kind: 'leaveSquare', side: 'bottom', unit: 'u1' };
    const spec = promptSpec(s, d);
    expect(spec.text).toBe("British Line Infantry stands in square (counter 2). Leave it? Its card returns to your hand; this turn's Command stays as it was.");
    expect(spec.actions.map((a) => a.key)).toEqual(['yes', 'no', 'auto']);
    for (const a of spec.actions) if (a.answer !== 'auto') expect(answerError(s, d, a.answer)).toBeNull();
  });
});

describe('the computer defending', () => {
  it('shows no thinking indicator and one fixed pause at a defend decision', () => {
    const mk = (options: ('stand' | 'retireReform' | 'formSquare' | 'firstStrike')[]): Decision => ({ kind: 'defend', side: 'top', attacker: 'u1', target: 'u2', options, bonus: false, artillery: [] });
    const a = aiPacing(mk(['stand', 'firstStrike']));
    const b = aiPacing(mk(['stand', 'retireReform']));
    expect(a).toEqual(b);
    expect(a.indicator).toBe(false);
    expect(aiPacing({ kind: 'playCard', side: 'top' }).indicator).toBe(true);
  });
});

describe('the game screen', () => {
  it('draws the opponent\'s square track as backs, whoever the human is', async () => {
    const { GameScreen } = await import('../../src/ui/game/GameScreen');
    const { GameController, newSessionConfig } = await import('../../src/ui/game/controller');
    const { SeededOpponent } = await import('./controller-helpers');
    for (const human of ['bottom', 'top'] as const) {
      const c = new GameController({ ...newSessionConfig('012', human, 'captain'), seed: 5 }, new SeededOpponent());
      const ai = human === 'bottom' ? 'top' : 'bottom';
      const shown = c.view.display;
      shown.players[ai].squareTrack = [CARD, null, null, null];
      shown.players[human].squareTrack = [null, null, null, null];
      const html = renderToStaticMarkup(createElement(GameScreen, { controller: c, onExit: () => {} }));
      expect(html).toContain('Square 1: a card face down');
      expect(html).not.toContain(`Square 1: ${CARD_DEFS[cardKind(CARD)].title}`);
      c.dispose();
    }
  });
});
